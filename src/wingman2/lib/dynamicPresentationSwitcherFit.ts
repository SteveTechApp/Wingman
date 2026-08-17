// Dynamic, structured, two-stage fit scoring for the "presentation-switcher" / "uc-byod" /
// "wireless-casting" compare intents.
//
// Stage 1 (shortlist): a hard structural gate -- can this candidate physically do the
// job? If the competitor is wireless-capable, the candidate must be too (a wired switcher
// is not a usable substitute for a wireless casting requirement). Routed output count
// must cover what the competitor needs. Anything that fails this gate is dropped from the
// shortlist entirely, not just penalised.
//
// Stage 2 (refinement): within the shortlist, score on how CLOSE the fit is -- I/O count
// proximity, feature surplus (USB/AVoIP/Dante/video wall/multiview the competitor didn't
// ask for), built-in amp/scaling/HDBaseT deficits -- and return the short final list.
//
// If nothing passes Stage 1 (e.g. no wireless-capable product in the catalog for a
// wireless competitor), Stage 1 falls back to the closest available candidates so the
// comparison still returns something, capped at "related" since they can't do the job.
//
// See reports/in1808-vs-mx-1007-hyb-element-inventory.md for the worked example that
// this scoring model is built from.

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
  WIRELESS_PATTERN,
  USB_PATTERN,
  AVOIP_PATTERN,
  DANTE_PATTERN,
  BUILT_IN_AMP_PATTERN,
  SCALING_PATTERN,
  VIDEO_WALL_PATTERN,
  MULTIVIEW_PATTERN,
  HDBASET_EXTENSION_PATTERN,
} from "./structuredFitCommon";

export interface PresentationSwitcherFitProfile {
  inputCount: number | null;
  outputCount: number | null;
  hasWireless: boolean;
  hasUSB: boolean;
  hasAvoip: boolean;
  hasDante: boolean;
  hasBuiltInAmp: boolean;
  hasScaling: boolean;
  hasVideoWall: boolean;
  hasMultiview: boolean;
  hasHdbaseTExtension: boolean;
}

export interface PresentationSwitcherFitResult {
  eligibility: "direct" | "alternative" | "related";
  fitPenalty: number;
  reasons: string[];
  rows: ComparisonRow[];
}

/** Builds the side-by-side "features and I/O" comparison chart rows for this intent. */
function buildComparisonRows(
  competitor: PresentationSwitcherFitProfile,
  candidate: PresentationSwitcherFitProfile,
): ComparisonRow[] {
  return [
    countRow("Inputs", competitor.inputCount, candidate.inputCount),
    countRow("Independent outputs", competitor.outputCount, candidate.outputCount),
    flagRow("Wireless casting", competitor.hasWireless, candidate.hasWireless),
    flagRow("USB-C / KVM switching", competitor.hasUSB, candidate.hasUSB),
    flagRow("NetworkHD / AVoIP", competitor.hasAvoip, candidate.hasAvoip),
    flagRow("Dante networked audio", competitor.hasDante, candidate.hasDante),
    flagRow("Built-in amplifier", competitor.hasBuiltInAmp, candidate.hasBuiltInAmp),
    flagRow("Scaling", competitor.hasScaling, candidate.hasScaling),
    flagRow("HDBaseT/DTP extension", competitor.hasHdbaseTExtension, candidate.hasHdbaseTExtension),
    flagRow("Video wall", competitor.hasVideoWall, candidate.hasVideoWall),
    flagRow("Multiview", competitor.hasMultiview, candidate.hasMultiview),
  ];
}

export interface PresentationSwitcherCandidate {
  product: LooseRecord;
  sku: string;
  profile: PresentationSwitcherFitProfile;
  fit: PresentationSwitcherFitResult;
}

const RELEVANT_WYRESTORM_FAMILIES = new Set(
  [
    "HDBaseT Matrix",
    "Presentation Switcher",
    "Matrix",
    "Presentation / Room Core",
    "Seamless Matrix",
    "Unified Comms",
    "Apollo",
  ].map((value) => value.toLowerCase()),
);

/**
 * Derives a structured fit profile for ANY record (competitor or WyreStorm), preferring
 * real structured fields (technicalProfile for WyreStorm records, inputs/outputs/audio/
 * control/features arrays for competitor records) and falling back to text signals only
 * when structured data isn't present.
 */
export function derivePresentationSwitcherFitProfile(record: LooseRecord, extraText = ""): PresentationSwitcherFitProfile {
  const { inputCount, outputCount } = deriveIoCounts(record);
  const tp: LooseRecord = record.technicalProfile ?? {};
  const text = buildStructuredText(record, extraText);

  const hasUSB = Boolean(tp.usb?.present) || flagFromText(text, USB_PATTERN);
  const hasAvoip = Boolean(tp.network?.present && /networkhd/i.test(String(tp.network?.interfaces ?? ""))) || flagFromText(text, AVOIP_PATTERN);
  const hasDante = (Array.isArray(tp.audio?.networkAudio) && tp.audio.networkAudio.length > 0) || flagFromText(text, DANTE_PATTERN);
  const hasBuiltInAmp =
    (Array.isArray(tp.audio?.amplifierPower) && tp.audio.amplifierPower.length > 0) ||
    (Array.isArray(tp.audio?.speaker) && tp.audio.speaker.length > 0) ||
    flagFromText(text, BUILT_IN_AMP_PATTERN);
  const hasScaling = (Array.isArray(tp.processing) && tp.processing.some((p: unknown) => /scal/i.test(String(p)))) || flagFromText(text, SCALING_PATTERN);
  const hasVideoWall = (Array.isArray(tp.processing) && tp.processing.some((p: unknown) => /video\s*wall/i.test(String(p)))) || flagFromText(text, VIDEO_WALL_PATTERN);
  const hasMultiview = (Array.isArray(tp.processing) && tp.processing.some((p: unknown) => /multiview/i.test(String(p)))) || flagFromText(text, MULTIVIEW_PATTERN);
  const hasHdbaseTExtension = Boolean(tp.hdbaset?.present) || flagFromText(text, HDBASET_EXTENSION_PATTERN);
  const hasWireless = flagFromText(text, WIRELESS_PATTERN) || /^SW-?6[24]0L?-?TX-?W|^APO-?DG/i.test(String(record.sku ?? ""));

  return {
    inputCount,
    outputCount,
    hasWireless,
    hasUSB,
    hasAvoip,
    hasDante,
    hasBuiltInAmp,
    hasScaling,
    hasVideoWall,
    hasMultiview,
    hasHdbaseTExtension,
  };
}

/** Stage 1: can this candidate physically do what the competitor is bought for? */
function passesStructuralGate(competitor: PresentationSwitcherFitProfile, candidate: PresentationSwitcherFitProfile): boolean {
  if (competitor.hasWireless && !candidate.hasWireless) return false;
  if (competitor.outputCount && candidate.outputCount && candidate.outputCount < competitor.outputCount) return false;
  return true;
}

/** Stage 2: how close a fit is this candidate, given it already passed the structural gate? */
export function scorePresentationSwitcherFit(
  competitor: PresentationSwitcherFitProfile,
  candidate: PresentationSwitcherFitProfile,
): PresentationSwitcherFitResult {
  let fitPenalty = 0;
  const reasons: string[] = [];
  let capAtAlternative = false;
  let downgradeToRelated = false;

  if (competitor.outputCount && candidate.outputCount) {
    const ratio = candidate.outputCount / competitor.outputCount;

    if (ratio > 2) {
      fitPenalty += 40;
      capAtAlternative = true;
      reasons.push(
        `${candidate.outputCount} routed outputs is oversized for a ${competitor.outputCount}-output competitor -- offer as an architecture upgrade, not a size-matched swap.`,
      );
    } else if (ratio < 0.6) {
      fitPenalty += 150;
      downgradeToRelated = true;
      reasons.push(
        `Only ${candidate.outputCount} routed outputs against a ${competitor.outputCount}-output requirement -- undersized for a direct lead.`,
      );
    } else {
      fitPenalty -= 20;
      reasons.push(`Routed output count (${candidate.outputCount}) is a close match for the competitor's ${competitor.outputCount}.`);
    }
  }

  if (competitor.inputCount && candidate.inputCount) {
    const ratio = candidate.inputCount / competitor.inputCount;
    if (ratio >= 0.75 && ratio <= 1.5) {
      fitPenalty -= 10;
    } else if (ratio < 0.5) {
      fitPenalty += 30;
      reasons.push(`Input count (${candidate.inputCount}) is well below the competitor's ${competitor.inputCount} inputs.`);
    }
  }

  if (competitor.hasWireless && candidate.hasWireless) {
    fitPenalty -= 30;
    reasons.push("Wireless-to-wireless match on the core capability the competitor is being bought for.");
  } else if (competitor.hasWireless && !candidate.hasWireless) {
    fitPenalty += 60;
    downgradeToRelated = true;
    reasons.push("Competitor is wireless-capable; this candidate has no wireless/casting path.");
  } else if (!competitor.hasWireless && candidate.hasWireless) {
    fitPenalty += 15;
    capAtAlternative = true;
    reasons.push("Candidate adds wireless casting the competitor doesn't have -- a capability upgrade, not a like-for-like swap.");
  }

  const surplusFlags: string[] = [];
  if (candidate.hasUSB && !competitor.hasUSB) surplusFlags.push("USB-C/KVM switching");
  if (candidate.hasAvoip && !competitor.hasAvoip) surplusFlags.push("NetworkHD/AVoIP distribution");
  if (candidate.hasDante && !competitor.hasDante) surplusFlags.push("Dante networked audio");
  if (candidate.hasVideoWall && !competitor.hasVideoWall) surplusFlags.push("video wall");
  if (candidate.hasMultiview && !competitor.hasMultiview) surplusFlags.push("multiview");

  if (surplusFlags.length >= 2) {
    capAtAlternative = true;
    reasons.push(`Candidate bundles in ${surplusFlags.join(", ")} that the competitor doesn't offer -- a bigger architecture, not a direct swap.`);
  }

  if (competitor.hasBuiltInAmp && !candidate.hasBuiltInAmp) {
    fitPenalty += 25;
    reasons.push("Competitor has a built-in amplifier option; this candidate does not.");
  }

  if (competitor.hasScaling && !candidate.hasScaling) {
    fitPenalty += 40;
    reasons.push("Competitor advertises built-in scaling; no scaling evidence found on this candidate.");
  }

  if (competitor.hasHdbaseTExtension && !candidate.hasHdbaseTExtension) {
    fitPenalty += 50;
    reasons.push("Competitor extends over HDBaseT/DTP; this candidate has no matching extension path.");
  }

  let eligibility: PresentationSwitcherFitResult["eligibility"] = "direct";
  if (downgradeToRelated) {
    eligibility = "related";
  } else if (capAtAlternative) {
    eligibility = "alternative";
  }

  if (reasons.length === 0) {
    reasons.push("Presentation/switching candidate for meeting-room workflow.");
  }

  return { eligibility, fitPenalty, reasons, rows: buildComparisonRows(competitor, candidate) };
}

/**
 * Stage 1 + Stage 2 combined: builds the structural shortlist from the live catalog
 * (wireless-capability gate + output-count coverage gate), then ranks it on fit closeness
 * and returns the short final candidate list. Also used directly for "wireless-casting",
 * which is the same family scored the same way.
 */
export function findDynamicPresentationSwitcherCandidates(
  products: LooseRecord[],
  competitorProfile: PresentationSwitcherFitProfile,
  finalLimit = 3,
  shortlistSize = 12,
): PresentationSwitcherCandidate[] {
  const eligible: Array<{ product: LooseRecord; sku: string; profile: PresentationSwitcherFitProfile }> = [];

  for (const product of products) {
    const sku = String(product.sku ?? "").trim();
    if (!sku) continue;
    if (!RELEVANT_WYRESTORM_FAMILIES.has(productFamilyKey(product))) continue;
    if (!isLifecycleUsable(product)) continue;
    if (!isPrimaryHardware(product)) continue;

    const profile = derivePresentationSwitcherFitProfile(product);
    eligible.push({ product, sku, profile });
  }

  const passingGate = eligible.filter((c) => passesStructuralGate(competitorProfile, c.profile));
  const coversRequirement = passingGate.length > 0;

  const shortlistSource = coversRequirement
    ? passingGate
    : [...eligible].sort((a, b) => Number(b.profile.hasWireless) - Number(a.profile.hasWireless) || (b.profile.outputCount ?? 0) - (a.profile.outputCount ?? 0));

  const shortlist = shortlistSource.slice(0, shortlistSize);

  const scored: PresentationSwitcherCandidate[] = shortlist.map(({ product, sku, profile }) => {
    const fit = scorePresentationSwitcherFit(competitorProfile, profile);
    if (!coversRequirement) {
      fit.eligibility = "related";
      fit.reasons = [
        "No WyreStorm candidate in the current catalog fully covers this requirement -- closest available shown.",
        ...fit.reasons,
      ];
    }
    return { product, sku, profile, fit };
  });

  scored.sort((a, b) => a.fit.fitPenalty - b.fit.fitPenalty);

  return scored.slice(0, finalLimit);
}
