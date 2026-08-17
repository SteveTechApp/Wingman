// Dynamic, structured, two-stage fit scoring for the "matrix" / "hdbaset-matrix" compare
// intent.
//
// Stage 1 (shortlist): a hard structural gate -- can this candidate physically do the
// job? Routed output count must cover what the competitor needs, and if the competitor
// reaches over HDBaseT the candidate must too. Anything that fails this gate is dropped
// from the shortlist entirely (not just penalised), because no amount of extra features
// makes an undersized or wrong-transport matrix a usable lead.
//
// Stage 2 (refinement): within the shortlist, score on how CLOSE the fit is -- output/
// input count proximity, HDBaseT transport match, scaling -- and return only the short
// final list of best-fit candidates.
//
// If literally nothing in the catalog passes the Stage 1 gate (e.g. the competitor needs
// a bigger routed matrix than WyreStorm currently offers), Stage 1 falls back to the
// closest available candidates so the comparison still returns something -- but those are
// always capped at "related", never "direct" or "alternative", because they genuinely
// can't cover the requirement.

import {
  type ComparisonRow,
  type LooseRecord,
  countRow,
  deriveIoCounts,
  flagFromText,
  flagRow,
  buildStructuredText,
  isLifecycleUsable,
  isPrimaryHardware,
  productFamilyKey,
  SCALING_PATTERN,
  HDBASET_EXTENSION_PATTERN,
} from "./structuredFitCommon";

export interface MatrixFitProfile {
  inputCount: number | null;
  outputCount: number | null;
  prefersHdBaseT: boolean;
  hasScaling: boolean;
}

export interface MatrixFitResult {
  eligibility: "direct" | "alternative" | "related";
  fitPenalty: number;
  reasons: string[];
  rows: ComparisonRow[];
}

/** Builds the side-by-side "features and I/O" comparison chart rows for this intent. */
function buildComparisonRows(competitor: MatrixFitProfile, candidate: MatrixFitProfile): ComparisonRow[] {
  return [
    countRow("Inputs", competitor.inputCount, candidate.inputCount),
    countRow("Routed outputs", competitor.outputCount, candidate.outputCount),
    flagRow("HDBaseT extension", competitor.prefersHdBaseT, candidate.prefersHdBaseT),
    flagRow("Scaling", competitor.hasScaling, candidate.hasScaling),
  ];
}

export interface MatrixCandidate {
  product: LooseRecord;
  sku: string;
  profile: MatrixFitProfile;
  fit: MatrixFitResult;
}

const RELEVANT_MATRIX_FAMILIES = new Set(
  ["Matrix", "HDBaseT Matrix", "Seamless Matrix"].map((value) => value.toLowerCase()),
);

export function deriveMatrixFitProfile(record: LooseRecord, extraText = ""): MatrixFitProfile {
  const { inputCount, outputCount } = deriveIoCounts(record);
  const text = buildStructuredText(record, extraText);
  const tp: LooseRecord = record.technicalProfile ?? {};

  const prefersHdBaseT = Boolean(tp.hdbaset?.present) || flagFromText(text, HDBASET_EXTENSION_PATTERN);
  const hasScaling = (Array.isArray(tp.processing) && tp.processing.some((p: unknown) => /scal/i.test(String(p)))) || flagFromText(text, SCALING_PATTERN);

  return { inputCount, outputCount, prefersHdBaseT, hasScaling };
}

/** Stage 1: can this candidate physically cover the competitor's routed I/O and transport? */
function passesStructuralGate(competitor: MatrixFitProfile, candidate: MatrixFitProfile): boolean {
  if (!candidate.outputCount) return false;
  if (competitor.outputCount && candidate.outputCount < competitor.outputCount) return false;
  if (competitor.prefersHdBaseT && !candidate.prefersHdBaseT) return false;
  return true;
}

/** Stage 2: how close a fit is this candidate, given it already passed the structural gate? */
export function scoreMatrixFit(competitor: MatrixFitProfile, candidate: MatrixFitProfile): MatrixFitResult {
  let fitPenalty = 0;
  const reasons: string[] = [];
  let capAtAlternative = false;
  let downgradeToRelated = false;

  if (competitor.outputCount && candidate.outputCount) {
    const ratio = candidate.outputCount / competitor.outputCount;

    if (ratio < 1) {
      fitPenalty += 200;
      downgradeToRelated = true;
      reasons.push(`${candidate.outputCount} routed outputs cannot cover the competitor's ${competitor.outputCount}-output requirement.`);
    } else if (ratio === 1) {
      fitPenalty -= 40;
      reasons.push(`Exact routed output match (${candidate.outputCount}x${candidate.inputCount ?? "?"}) for the competitor's ${competitor.outputCount}-output requirement.`);
    } else if (ratio <= 1.5) {
      fitPenalty -= 10;
      reasons.push(`Nearest larger routed matrix (${candidate.outputCount} outputs) since WyreStorm has no exact ${competitor.outputCount}-output size -- same matrix architecture, just more headroom.`);
    } else if (ratio <= 2) {
      fitPenalty += 15;
      reasons.push(`${candidate.outputCount} routed outputs is noticeably larger than the competitor's ${competitor.outputCount} -- confirm the extra headroom is commercially useful.`);
    } else {
      fitPenalty += 40;
      capAtAlternative = true;
      reasons.push(`${candidate.outputCount} routed outputs is oversized for a ${competitor.outputCount}-output competitor -- offer as an architecture upgrade, not a size-matched swap.`);
    }
  }

  if (competitor.inputCount && candidate.inputCount) {
    if (candidate.inputCount < competitor.inputCount) {
      fitPenalty += 60;
      reasons.push(`${candidate.inputCount} inputs is below the competitor's ${competitor.inputCount}-input requirement.`);
    } else if (candidate.inputCount === competitor.inputCount) {
      fitPenalty -= 15;
    }
  }

  if (competitor.prefersHdBaseT && !candidate.prefersHdBaseT) {
    fitPenalty += 70;
    downgradeToRelated = true;
    reasons.push("Competitor extends over HDBaseT; this candidate is local HDMI only and cannot reach a remote zone.");
  } else if (!competitor.prefersHdBaseT && candidate.prefersHdBaseT) {
    fitPenalty += 5;
    reasons.push("Candidate is an HDBaseT-based matrix; competitor only needs local HDMI switching -- extra install complexity if distance isn't required.");
  } else if (competitor.prefersHdBaseT && candidate.prefersHdBaseT) {
    fitPenalty -= 15;
    reasons.push("Both are HDBaseT-based matrices -- compatible install path.");
  }

  if (competitor.hasScaling && !candidate.hasScaling) {
    fitPenalty += 30;
    reasons.push("Competitor advertises built-in scaling; no scaling evidence found on this candidate.");
  }

  let eligibility: MatrixFitResult["eligibility"] = "direct";
  if (downgradeToRelated) {
    eligibility = "related";
  } else if (capAtAlternative) {
    eligibility = "alternative";
  }

  if (reasons.length === 0) {
    reasons.push("Matrix/switching candidate with compatible routed I/O direction.");
  }

  return { eligibility, fitPenalty, reasons, rows: buildComparisonRows(competitor, candidate) };
}

/**
 * Stage 1 + Stage 2 combined: builds the structural shortlist from the live catalog, then
 * ranks it on fit closeness and returns the short final candidate list. `shortlistSize`
 * controls how many pass through to Stage 2 scoring; `finalLimit` controls how many make
 * it into the returned result.
 */
export function findDynamicMatrixCandidates(
  products: LooseRecord[],
  competitorProfile: MatrixFitProfile,
  finalLimit = 3,
  shortlistSize = 12,
): MatrixCandidate[] {
  const eligible: Array<{ product: LooseRecord; sku: string; profile: MatrixFitProfile }> = [];

  for (const product of products) {
    const sku = String(product.sku ?? "").trim();
    if (!sku) continue;
    if (!RELEVANT_MATRIX_FAMILIES.has(productFamilyKey(product))) continue;
    if (!isLifecycleUsable(product)) continue;
    if (!isPrimaryHardware(product)) continue;

    const profile = deriveMatrixFitProfile(product);
    if (!profile.outputCount) continue; // can't score a matrix candidate with no known size

    eligible.push({ product, sku, profile });
  }

  const passingGate = eligible.filter((c) => passesStructuralGate(competitorProfile, c.profile));
  const coversRequirement = passingGate.length > 0;

  // Fallback: nothing in the catalog covers the requirement -- surface the closest
  // available sizes instead of returning nothing, but they'll be capped at "related" below.
  const shortlistSource = coversRequirement
    ? passingGate
    : [...eligible].sort((a, b) => (b.profile.outputCount ?? 0) - (a.profile.outputCount ?? 0));

  const shortlist = shortlistSource.slice(0, shortlistSize);

  const scored: MatrixCandidate[] = shortlist.map(({ product, sku, profile }) => {
    const fit = scoreMatrixFit(competitorProfile, profile);
    if (!coversRequirement) {
      fit.eligibility = "related";
      fit.reasons = [
        `No WyreStorm matrix in the current catalog covers the full ${competitorProfile.outputCount ?? "?"}-output requirement -- ${profile.outputCount} routed outputs is the closest available.`,
        ...fit.reasons,
      ];
    }
    return { product, sku, profile, fit };
  });

  scored.sort((a, b) => a.fit.fitPenalty - b.fit.fitPenalty);

  return scored.slice(0, finalLimit);
}
