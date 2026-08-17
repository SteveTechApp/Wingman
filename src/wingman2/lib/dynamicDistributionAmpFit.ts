// Dynamic, structured, two-stage fit scoring for the "distribution-amplifier" compare
// intent.
//
// Stage 1 (shortlist): hard gate -- candidate's mirrored output count must cover the
// competitor's requirement. Anything undersized is dropped from the shortlist entirely.
//
// Stage 2 (refinement): within the shortlist, score on how close the output count is
// (exact match best, oversized worse) and return the short final candidate list.

import {
  type ComparisonRow,
  type LooseRecord,
  countRow,
  deriveSingleOutputCount,
  isLifecycleUsable,
  isPrimaryHardware,
} from "./structuredFitCommon";

export interface DistributionAmpFitProfile {
  outputCount: number | null;
}

export interface DistributionAmpFitResult {
  eligibility: "direct" | "alternative" | "related";
  fitPenalty: number;
  reasons: string[];
  rows: ComparisonRow[];
}

export interface DistributionAmpCandidate {
  product: LooseRecord;
  sku: string;
  profile: DistributionAmpFitProfile;
  fit: DistributionAmpFitResult;
}

function isDistributionAmpFamily(product: LooseRecord): boolean {
  const sku = String(product.sku ?? "");
  const text = String(product.family ?? "") + " " + String(product.description ?? "") + " " + String(product.summary ?? "");
  return /^SP-|^EXP-SP/i.test(sku) || /\b(splitter|distribution amplifier)\b/i.test(text);
}

export function deriveDistributionAmpFitProfile(record: LooseRecord): DistributionAmpFitProfile {
  return { outputCount: deriveSingleOutputCount(record) };
}

/** Stage 1: can this candidate physically cover the competitor's output count? */
function passesStructuralGate(competitor: DistributionAmpFitProfile, candidate: DistributionAmpFitProfile): boolean {
  if (!candidate.outputCount) return false;
  if (competitor.outputCount && candidate.outputCount < competitor.outputCount) return false;
  return true;
}

export function scoreDistributionAmpFit(
  competitor: DistributionAmpFitProfile,
  candidate: DistributionAmpFitProfile,
): DistributionAmpFitResult {
  let fitPenalty = 0;
  const reasons: string[] = [];
  let capAtAlternative = false;
  let downgradeToRelated = false;

  if (competitor.outputCount && candidate.outputCount) {
    if (candidate.outputCount < competitor.outputCount) {
      fitPenalty += 150;
      downgradeToRelated = true;
      reasons.push(`${candidate.outputCount} mirrored outputs cannot cover the competitor's ${competitor.outputCount}-output requirement.`);
    } else if (candidate.outputCount === competitor.outputCount) {
      fitPenalty -= 30;
      reasons.push(`Exact output match (${candidate.outputCount}) for mirrored HDMI distribution.`);
    } else if (candidate.outputCount <= competitor.outputCount * 2) {
      fitPenalty -= 5;
      reasons.push(`${candidate.outputCount} outputs covers the competitor's ${competitor.outputCount}-output requirement with headroom.`);
    } else {
      fitPenalty += 30;
      capAtAlternative = true;
      reasons.push(`${candidate.outputCount} outputs is oversized for a ${competitor.outputCount}-output requirement.`);
    }
  }

  let eligibility: DistributionAmpFitResult["eligibility"] = "direct";
  if (downgradeToRelated) eligibility = "related";
  else if (capAtAlternative) eligibility = "alternative";

  if (reasons.length === 0) {
    reasons.push("HDMI distribution amplifier candidate with a one-source, mirrored-output topology.");
  }

  return { eligibility, fitPenalty, reasons, rows: [countRow("Mirrored outputs", competitor.outputCount, candidate.outputCount)] };
}

export function findDynamicDistributionAmpCandidates(
  products: LooseRecord[],
  competitorProfile: DistributionAmpFitProfile,
  finalLimit = 3,
  shortlistSize = 10,
): DistributionAmpCandidate[] {
  const eligible: Array<{ product: LooseRecord; sku: string; profile: DistributionAmpFitProfile }> = [];

  for (const product of products) {
    const sku = String(product.sku ?? "").trim();
    if (!sku) continue;
    if (!isDistributionAmpFamily(product)) continue;
    if (!isLifecycleUsable(product)) continue;
    if (!isPrimaryHardware(product)) continue;

    const profile = deriveDistributionAmpFitProfile(product);
    eligible.push({ product, sku, profile });
  }

  const passingGate = eligible.filter((c) => passesStructuralGate(competitorProfile, c.profile));
  const coversRequirement = passingGate.length > 0;

  const shortlistSource = coversRequirement
    ? passingGate
    : [...eligible].sort((a, b) => (b.profile.outputCount ?? 0) - (a.profile.outputCount ?? 0));

  const shortlist = shortlistSource.slice(0, shortlistSize);

  const scored: DistributionAmpCandidate[] = shortlist.map(({ product, sku, profile }) => {
    const fit = scoreDistributionAmpFit(competitorProfile, profile);
    if (!coversRequirement) {
      fit.eligibility = "related";
      fit.reasons = [
        `No WyreStorm distribution amplifier in the current catalog covers the full ${competitorProfile.outputCount ?? "?"}-output requirement -- closest available shown.`,
        ...fit.reasons,
      ];
    }
    return { product, sku, profile, fit };
  });

  scored.sort((a, b) => a.fit.fitPenalty - b.fit.fitPenalty);

  return scored.slice(0, finalLimit);
}
