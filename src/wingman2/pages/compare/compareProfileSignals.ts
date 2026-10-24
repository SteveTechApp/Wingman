import { compareSkuKey } from "./compareProductTaxonomy";
import type { CompetitorProfile } from "./compareTypes";

/**
 * Small predicates a competitor profile answers, read by the competitor fact
 * sheet, the candidate scorer and the candidate builders. They live together so the
 * two layers consult one reading of the same answers.
 */
export function isAtlonaOmeExKitProfile(profile: CompetitorProfile): boolean {
  const compact = [profile.brand, profile.sku, profile.rawText]
    .join(" ")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return compact.includes("ATOMEEXKIT");
}
export function matrixOutputCount(profile: CompetitorProfile): number | undefined {
  return profile.resolvedSpec?.outputCount;
}
export function wantsClassA(profile: CompetitorProfile): boolean {
  return profile.requestedTags.includes("class a")
    || profile.resolvedSpec?.specs?.hdbasetClass === "Class A"
    || /\b70\b/.test(profile.sku)
    || /class a|70m|100m/i.test(profile.rawText);
}
export function matrixReceiverRequirement(profile: CompetitorProfile, classA: boolean): string {
  const outputs = matrixOutputCount(profile);
  const receiverLabel = classA ? "compatible RXV-70 receivers" : "compatible RXV-35 receivers";
  return outputs ? `Quote ${outputs}x ${receiverLabel} separately.` : `Quote compatible ${receiverLabel} separately.`;
}

export function isSpecialistHybridRoomRequirement(profile: CompetitorProfile): boolean {
  const specialistSignals = [
    "large room",
    "dual room",
    "master slave",
    "nhd500",
    "hdbaset3",
    "dsp",
    "amp",
    "mic",
    "audio",
    "hybrid",
  ];

  return specialistSignals.some((signal) => profile.rawText.toLowerCase().includes(signal) || profile.requestedTags.includes(signal));
}

export function isTrueVideoWallRequirement(profile: CompetitorProfile): boolean {
  return profile.productClass === "Video wall"
    || /video[\s-]?wall|lcd wall|2x2|1x4|1x6|bezel/i.test(profile.rawText);
}

export function isWirelessPresentationRequirement(profile: CompetitorProfile): boolean {
  return /wireless|airplay|miracast|casting|cast|guest/i.test(profile.rawText)
    || profile.requestedTags.includes("byod");
}

export function isContainedLocalMatrixRequirement(profile: CompetitorProfile): boolean {
  return profile.productClass === "Matrix"
    && !isHdBaseTMatrix(profile)
    && !isTrueVideoWallRequirement(profile)
    && !profile.requestedTags.includes("avoip");
}

export function matrixInputCount(profile: CompetitorProfile): number | undefined {
  return profile.resolvedSpec?.inputCount;
}

export function matrixSkuSizeKey(sku: string): string {
  const match = compareSkuKey(sku).match(/(?:MXV|MX)(\d{2})(\d{2})/);
  return match ? `${Number(match[1])}x${Number(match[2])}` : "";
}

export function isEighteenGigMatrix(profile: CompetitorProfile): boolean {
  return profile.productClass === "Matrix" && (profile.requestedTags.includes("18g") || profile.requestedTags.includes("4k60") || profile.requestedTags.includes("444"));
}

export function isHdBaseTMatrix(profile: CompetitorProfile): boolean {
  return profile.productClass === "Matrix" && (
    profile.requestedTags.includes("hdbaset")
    || Boolean(profile.resolvedSpec?.features?.hdbtOutput)
    || /\bkit\b/i.test(profile.sku)
  );
}
