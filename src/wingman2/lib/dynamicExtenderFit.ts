// Dynamic, structured, two-stage fit scoring for the "extender" compare intent.
//
// Stage 1 (shortlist): hard gate -- candidate's reach must cover the competitor's
// required distance, and if the competitor needs KVM/USB host switching the candidate
// must show that evidence too. Anything that fails is dropped from the shortlist.
//
// Stage 2 (refinement): within the shortlist, score on how close the reach and USB/KVM
// match is, and return the short final candidate list.

import {
  type ComparisonRow,
  type LooseRecord,
  buildStructuredText,
  countRow,
  deriveDistanceMeters,
  flagFromText,
  flagRow,
  isLifecycleUsable,
  isPrimaryHardware,
  USB_PATTERN,
} from "./structuredFitCommon";

export interface ExtenderFitProfile {
  distanceMeters: number | null;
  needsUsb: boolean;
  needsKvm: boolean;
}

export interface ExtenderFitResult {
  eligibility: "direct" | "alternative" | "related";
  fitPenalty: number;
  reasons: string[];
  rows: ComparisonRow[];
}

export interface ExtenderCandidate {
  product: LooseRecord;
  sku: string;
  profile: ExtenderFitProfile;
  fit: ExtenderFitResult;
}

const KVM_PATTERN = /\bkvm\b/i;

function isExtenderFamily(product: LooseRecord): boolean {
  const sku = String(product.sku ?? "");
  const text = String(product.family ?? product.hardwareType ?? "");
  return /^EX-|^EXF-|^EX\d/i.test(sku) || /extend/i.test(text);
}

export function deriveExtenderFitProfile(record: LooseRecord, extraText = ""): ExtenderFitProfile {
  const text = buildStructuredText(record, extraText);
  return {
    distanceMeters: deriveDistanceMeters(text),
    needsUsb: flagFromText(text, USB_PATTERN),
    needsKvm: flagFromText(text, KVM_PATTERN),
  };
}

/** Stage 1: can this candidate physically reach the required distance and do KVM if needed? */
function passesStructuralGate(competitor: ExtenderFitProfile, candidate: ExtenderFitProfile): boolean {
  if (competitor.distanceMeters && candidate.distanceMeters && candidate.distanceMeters < competitor.distanceMeters) return false;
  if (competitor.needsKvm && !candidate.needsKvm) return false;
  return true;
}

export function scoreExtenderFit(competitor: ExtenderFitProfile, candidate: ExtenderFitProfile): ExtenderFitResult {
  let fitPenalty = 0;
  const reasons: string[] = [];
  let downgradeToRelated = false;

  if (competitor.distanceMeters && candidate.distanceMeters) {
    if (candidate.distanceMeters < competitor.distanceMeters) {
      fitPenalty += 120;
      downgradeToRelated = true;
      reasons.push(`Candidate's ${candidate.distanceMeters}m reach is short of the competitor's ${competitor.distanceMeters}m requirement.`);
    } else if (candidate.distanceMeters <= competitor.distanceMeters * 1.3) {
      fitPenalty -= 20;
      reasons.push(`Reach (${candidate.distanceMeters}m) closely matches the competitor's ${competitor.distanceMeters}m requirement.`);
    } else {
      fitPenalty += 5;
      reasons.push(`Candidate reaches further (${candidate.distanceMeters}m) than the ${competitor.distanceMeters}m requirement -- fine, just not distance-matched.`);
    }
  }

  if (competitor.needsKvm && !candidate.needsKvm) {
    fitPenalty += 80;
    downgradeToRelated = true;
    reasons.push("Competitor is a KVM extender; this candidate has no KVM/USB host-switching evidence.");
  } else if (competitor.needsKvm && candidate.needsKvm) {
    fitPenalty -= 20;
    reasons.push("Both support KVM/USB host switching.");
  }

  if (competitor.needsUsb && !candidate.needsUsb) {
    fitPenalty += 50;
    reasons.push("Competitor extends USB; this candidate shows no USB extension evidence.");
  } else if (competitor.needsUsb && candidate.needsUsb) {
    fitPenalty -= 10;
  }

  const eligibility: ExtenderFitResult["eligibility"] = downgradeToRelated ? "related" : "direct";

  if (reasons.length === 0) {
    reasons.push("Point-to-point extender candidate for the competitor's transport path.");
  }

  const rows: ComparisonRow[] = [
    countRow("Reach", competitor.distanceMeters, candidate.distanceMeters, "m"),
    flagRow("KVM / USB host switching", competitor.needsKvm, candidate.needsKvm),
    flagRow("USB extension", competitor.needsUsb, candidate.needsUsb),
  ];

  return { eligibility, fitPenalty, reasons, rows };
}

export function findDynamicExtenderCandidates(
  products: LooseRecord[],
  competitorProfile: ExtenderFitProfile,
  finalLimit = 3,
  shortlistSize = 12,
): ExtenderCandidate[] {
  const eligible: Array<{ product: LooseRecord; sku: string; profile: ExtenderFitProfile }> = [];

  for (const product of products) {
    const sku = String(product.sku ?? "").trim();
    if (!sku) continue;
    if (!isExtenderFamily(product)) continue;
    if (!isLifecycleUsable(product)) continue;
    if (!isPrimaryHardware(product)) continue;

    const profile = deriveExtenderFitProfile(product);
    eligible.push({ product, sku, profile });
  }

  const passingGate = eligible.filter((c) => passesStructuralGate(competitorProfile, c.profile));
  const coversRequirement = passingGate.length > 0;

  const shortlistSource = coversRequirement
    ? passingGate
    : [...eligible].sort((a, b) => (b.profile.distanceMeters ?? 0) - (a.profile.distanceMeters ?? 0));

  const shortlist = shortlistSource.slice(0, shortlistSize);

  const scored: ExtenderCandidate[] = shortlist.map(({ product, sku, profile }) => {
    const fit = scoreExtenderFit(competitorProfile, profile);
    if (!coversRequirement) {
      fit.eligibility = "related";
      fit.reasons = [
        "No WyreStorm extender in the current catalog fully covers this reach/KVM requirement -- closest available shown.",
        ...fit.reasons,
      ];
    }
    return { product, sku, profile, fit };
  });

  scored.sort((a, b) => a.fit.fitPenalty - b.fit.fitPenalty);

  return scored.slice(0, finalLimit);
}
