import {
  areProductTypesCompatible,
  classifyCatalogProduct,
  enrichCatalogProduct,
  findCatalogProductBySku,
  getCatalogProducts,
  normalizeCatalogProduct,
  type CatalogPortCount,
  type CatalogProduct,
} from "@/catalog";
import { explainWyreStormAdvantage } from "@/competitor/positioning";
import {
  getCompetitorProducts,
  type CompetitorProduct,
} from "@/competitor/repository";
import type { CompetitorComparisonRecord } from "@/services/competitorComparisonService";
import {
  buildAvSignalProfile,
  evaluateAvCompatibility,
} from "@/services/avLogicEngine";
import type {
  CompareConfidence,
  DiscoveryProductFamily,
} from "@/features/projects/projectStore";

export type CompetitorCompareOptionSource = "manual" | "curated" | "lookup";

export type CompetitorCompareMatrixStatus =
  | "better"
  | "match"
  | "gap"
  | "review";

export type CompetitorCompareMatrixRow = {
  id: string;
  label: string;
  competitorValue: string;
  wyrestormValue: string;
  status: CompetitorCompareMatrixStatus;
  note?: string;
};

export type CompetitorCompareDecisionStatus = "pass" | "warn" | "fail";

export type CompetitorCompareCoverageLevel =
  | "exact"
  | "covers"
  | "partial"
  | "missing"
  | "unknown";

export type CompetitorComparePortDeltaState =
  | "match"
  | "extra"
  | "short"
  | "unknown";

export type CompetitorComparePortDelta = {
  type: string;
  competitorCount: number;
  wyrestormCount: number;
  state: CompetitorComparePortDeltaState;
};

export type CompetitorCompareIoBreakdown = {
  competitorInputTotal: number;
  wyrestormInputTotal: number;
  competitorOutputTotal: number;
  wyrestormOutputTotal: number;
  inputCoveragePercent: number;
  outputCoveragePercent: number;
  ioCoveragePercent: number;
  inputParity: CompetitorCompareCoverageLevel;
  outputParity: CompetitorCompareCoverageLevel;
  overallParity: CompetitorCompareCoverageLevel;
  inputs: CompetitorComparePortDelta[];
  outputs: CompetitorComparePortDelta[];
  summary: string;
};

export type CompetitorCompareDecisionStep = {
  id: string;
  title: string;
  weight: number;
  status: CompetitorCompareDecisionStatus;
  summary: string;
  detail?: string;
};

export type CompetitorCompareMatchMethod =
  | "direct-replacement"
  | "covers-brief"
  | "functional-alternative"
  | "manual-review";

export type CompetitorCompareMatchBasis = {
  method: CompetitorCompareMatchMethod;
  classAlignment: boolean;
  transportAlignment: boolean;
  inputParity: CompetitorCompareCoverageLevel;
  outputParity: CompetitorCompareCoverageLevel;
  ioCoveragePercent: number;
  workflowCoveragePercent: number;
  specCoveragePercent: number;
  blockerCount: number;
  blockers: string[];
  warningCount: number;
  summary: string;
};

export type CompetitorCompareHighlights = {
  matches: string[];
  gaps: string[];
  extras: string[];
  reviews: string[];
};

export type CompetitorCompareOption = {
  id: string;
  label: string;
  wyrestormSku: string;
  wyrestormName?: string;
  wyrestormCategory: string;
  fitScore: number;
  fitConfidence: CompareConfidence;
  reasons: string[];
  cautions: string[];
  positioningSummary: string;
  positioningReasons: string[];
  salesStory: string[];
  matrix: CompetitorCompareMatrixRow[];
  decisionWorkflow: CompetitorCompareDecisionStep[];
  ioBreakdown: CompetitorCompareIoBreakdown;
  matchBasis: CompetitorCompareMatchBasis;
  highlights: CompetitorCompareHighlights;
  sourceType: CompetitorCompareOptionSource;
};

type RankedCandidate = {
  product: CatalogProduct;
  score: number;
  reasons: string[];
  notes: string[];
  ioSummary: string;
  matrix: CompetitorCompareMatrixRow[];
  decisionWorkflow: CompetitorCompareDecisionStep[];
  ioBreakdown: CompetitorCompareIoBreakdown;
  matchBasis: CompetitorCompareMatchBasis;
  highlights: CompetitorCompareHighlights;
};

type PortSetAnalysis = {
  deltas: CompetitorComparePortDelta[];
  competitorTotal: number;
  wyrestormTotal: number;
  matchedTotal: number;
  coverage: number;
  level: CompetitorCompareCoverageLevel;
  exact: boolean;
  coversAll: boolean;
  shortfalls: string[];
  extras: string[];
};

type RequirementCoverage = {
  label: string;
  relevant: boolean;
  ratio: number;
  matched: string[];
  missing: string[];
  better?: boolean;
  summary: string;
};

const MINIMUM_AUTOMATIC_MATCH_SCORE = 60;

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeId(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function normalizeSku(value: unknown): string {
  return tidy(value).toUpperCase();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function dedupeStrings(values: unknown[], limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function scoreToConfidence(score: number): CompareConfidence {
  if (score >= 75) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function formatWyrestormCategory(product: CatalogProduct): string {
  return [product.family, product.category, product.subcategory]
    .map((value) => tidy(value))
    .filter(Boolean)
    .join(" / ");
}

function normalizeFamilies(value: unknown): DiscoveryProductFamily[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DiscoveryProductFamily => typeof item === "string");
}

function inferRecommendedFamilies(product: CatalogProduct): DiscoveryProductFamily[] {
  const families = new Set<DiscoveryProductFamily>();
  const classification = classifyCatalogProduct(product);
  const textBlob = [
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.transport,
    ...(product.features ?? []),
  ].join(" ").toLowerCase();

  if (
    classification.group === "uc" ||
    classification.primaryType.startsWith("uc-") ||
    textBlob.includes("apollo")
  ) {
    families.add("Apollo");
  }
  if (classification.group === "extender" || textBlob.includes("hdbaset")) {
    families.add("HDBaseT");
  }
  if (
    classification.group === "avoip" ||
    textBlob.includes("avoip") ||
    textBlob.includes("networkhd")
  ) {
    families.add("AVoIP");
  }
  if (classification.group === "matrix" || textBlob.includes("matrix")) {
    families.add("Matrix");
  }
  if (
    classification.primaryType.includes("usb") ||
    (classification.group === "extender" && textBlob.includes("usb")) ||
    textBlob.includes("usb extension")
  ) {
    families.add("USB Extension");
  }
  if (
    classification.group === "videowall" ||
    textBlob.includes("video wall") ||
    textBlob.includes("videowall")
  ) {
    families.add("Video Wall");
  }

  return Array.from(families);
}

function familyHintScore(
  product: CatalogProduct,
  families: DiscoveryProductFamily[],
): number {
  if (families.length === 0) return 0;
  const text = normalizeId(
    [
      product.family,
      product.category,
      product.subcategory,
      product.summary,
      ...(product.features ?? []),
    ].join(" "),
  );

  return families.reduce((score, family) => {
    const token = normalizeId(family);
    if (!token) return score;
    if (normalizeId(product.family) === token) return score + 4;
    if (text.includes(token)) return score + 2;
    return score;
  }, 0);
}

const WORKFLOW_PORT_TYPES = new Set([
  "wirelesspresentation",
  "wirelessconference",
  "wirelesscasting",
  "usbhost",
  "usbdevice",
  "usbperipheral",
  "usbhub",
]);

function isWorkflowPortType(value: unknown): boolean {
  return WORKFLOW_PORT_TYPES.has(normalizeId(value));
}

function asPortMap(ports?: CatalogPortCount[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const port of ports ?? []) {
    const type = normalizeId(port.type);
    if (!type) continue;
    map.set(type, (map.get(type) ?? 0) + Math.max(0, Number(port.count) || 0));
  }
  return map;
}

function asComparablePortMap(ports?: CatalogPortCount[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const port of ports ?? []) {
    const type = normalizeId(port.type);
    if (!type || isWorkflowPortType(type)) continue;
    map.set(type, (map.get(type) ?? 0) + Math.max(0, Number(port.count) || 0));
  }
  return map;
}

function workflowPortLabels(ports?: CatalogPortCount[]): string[] {
  return dedupeStrings(
    (ports ?? [])
      .filter((port) => isWorkflowPortType(port.type))
      .map((port) => prettyPortType(port.type)),
    4,
  );
}

function joinNotes(parts: Array<string | undefined>): string | undefined {
  const values = parts.map((part) => tidy(part)).filter(Boolean);
  return values.length > 0 ? values.join(" ") : undefined;
}

function workflowPortNote(ports?: CatalogPortCount[]): string | undefined {
  const labels = workflowPortLabels(ports);
  if (labels.length === 0) return undefined;
  return `${labels.join(", ")} are scored under workflow features rather than physical I/O parity.`;
}

function totalCount(map: Map<string, number>): number {
  let total = 0;
  for (const value of map.values()) total += value;
  return total;
}

function percentFromRatio(value: number): number {
  return Math.round(clamp01(value) * 100);
}

function prettyPortType(value: string): string {
  const text = tidy(value);
  return text ? text.toUpperCase() : "Unknown";
}

function formatPortDeltaCounts(delta: CompetitorComparePortDelta): string {
  return `${prettyPortType(delta.type)} ${delta.wyrestormCount}/${delta.competitorCount}`;
}

function levelForPortAnalysis(analysis: PortSetAnalysis): CompetitorCompareCoverageLevel {
  if (analysis.competitorTotal === 0) return "unknown";
  if (analysis.coversAll && analysis.exact) return "exact";
  if (analysis.coversAll) return "covers";
  if (analysis.matchedTotal <= 0) return "missing";
  return "partial";
}

function combineCoverageLevels(
  inputLevel: CompetitorCompareCoverageLevel,
  outputLevel: CompetitorCompareCoverageLevel,
): CompetitorCompareCoverageLevel {
  const levels = [inputLevel, outputLevel];
  const knownLevels = levels.filter((level) => level !== "unknown");
  if (knownLevels.length === 0) return "unknown";
  if (knownLevels.some((level) => level === "missing")) return "missing";
  if (knownLevels.some((level) => level === "partial")) return "partial";
  if (knownLevels.every((level) => level === "exact")) return "exact";
  return "covers";
}

function describePortAnalysis(label: string, analysis: PortSetAnalysis): string {
  if (analysis.level === "unknown") {
    return `${label} requirements are not captured on the competitor record.`;
  }
  if (analysis.level === "exact") {
    return `Exact ${label.toLowerCase()} parity.`;
  }
  if (analysis.level === "covers") {
    if (analysis.extras.length > 0) {
      return `${label} are fully covered with extra ${analysis.extras
        .slice(0, 2)
        .join(", ")}.`;
    }
    return `${label} are fully covered.`;
  }
  if (analysis.level === "partial") {
    return `${label} shortfall on ${analysis.shortfalls.slice(0, 2).join(", ")}.`;
  }
  return `${label} do not cover the competitor requirement.`;
}

function analyzePortSet(
  competitorPorts: CatalogPortCount[] | undefined,
  wyrestormPorts: CatalogPortCount[] | undefined,
): PortSetAnalysis {
  const competitorMap = asComparablePortMap(competitorPorts);
  const wyrestormMap = asComparablePortMap(wyrestormPorts);
  const keys = Array.from(
    new Set([...competitorMap.keys(), ...wyrestormMap.keys()]),
  ).sort();

  const deltas: CompetitorComparePortDelta[] = [];
  const shortfalls: string[] = [];
  const extras: string[] = [];
  let matchedTotal = 0;
  let exact = true;
  let coversAll = true;

  for (const type of keys) {
    const competitorCount = competitorMap.get(type) ?? 0;
    const wyrestormCount = wyrestormMap.get(type) ?? 0;
    matchedTotal += Math.min(competitorCount, wyrestormCount);

    let state: CompetitorComparePortDeltaState = "unknown";
    if (competitorCount > 0 && wyrestormCount === competitorCount) {
      state = "match";
    } else if (competitorCount > 0 && wyrestormCount > competitorCount) {
      state = "extra";
      exact = false;
      extras.push(formatPortDeltaCounts({ type, competitorCount, wyrestormCount, state }));
    } else if (competitorCount > 0 && wyrestormCount > 0) {
      state = "short";
      exact = false;
      coversAll = false;
      shortfalls.push(formatPortDeltaCounts({ type, competitorCount, wyrestormCount, state }));
    } else if (competitorCount > 0) {
      state = "short";
      exact = false;
      coversAll = false;
      shortfalls.push(formatPortDeltaCounts({ type, competitorCount, wyrestormCount, state }));
    } else if (wyrestormCount > 0) {
      state = "extra";
      exact = false;
      extras.push(formatPortDeltaCounts({ type, competitorCount, wyrestormCount, state }));
    }

    deltas.push({
      type,
      competitorCount,
      wyrestormCount,
      state,
    });
  }

  const competitorTotal = totalCount(competitorMap);
  const coverage =
    competitorTotal > 0 ? clamp01(matchedTotal / competitorTotal) : 0;

  const analysis: PortSetAnalysis = {
    deltas,
    competitorTotal,
    wyrestormTotal: totalCount(wyrestormMap),
    matchedTotal,
    coverage,
    level: "unknown",
    exact,
    coversAll,
    shortfalls,
    extras,
  };
  analysis.level = levelForPortAnalysis(analysis);
  return analysis;
}

function analyzeFlagRequirement<T extends object>(
  label: string,
  competitorProfile: T | undefined,
  wyrestormProfile: T | undefined,
  definitions: ReadonlyArray<{ key: keyof T; label: string }>,
): RequirementCoverage {
  const needed = enabledCapabilityLabels(competitorProfile, definitions);
  if (needed.length === 0) {
    return {
      label,
      relevant: false,
      ratio: 0,
      matched: [],
      missing: [],
      summary: `${label} is not captured on the competitor record.`,
    };
  }

  const available = enabledCapabilityLabels(wyrestormProfile, definitions);
  const availableSet = new Set(available.map((value) => normalizeId(value)));
  const matched = needed.filter((value) => availableSet.has(normalizeId(value)));
  const missing = needed.filter((value) => !availableSet.has(normalizeId(value)));
  const ratio = clamp01(matched.length / needed.length);

  let summary = `${label} coverage ${percentFromRatio(ratio)}%.`;
  if (missing.length > 0) {
    summary = `${label} gap: ${missing.slice(0, 3).join(", ")}.`;
  } else if (available.length > matched.length) {
    summary = `${label} covers the requirement with extra capability.`;
  }

  return {
    label,
    relevant: true,
    ratio,
    matched,
    missing,
    better: available.length > matched.length && missing.length === 0,
    summary,
  };
}

function analyzeListRequirement(
  label: string,
  competitorValues: string[] | undefined,
  wyrestormValues: string[] | undefined,
): RequirementCoverage {
  const needed = dedupeStrings(competitorValues ?? [], 12);
  if (needed.length === 0) {
    return {
      label,
      relevant: false,
      ratio: 0,
      matched: [],
      missing: [],
      summary: `${label} is not captured on the competitor record.`,
    };
  }

  const available = dedupeStrings(wyrestormValues ?? [], 12);
  const availableSet = new Set(available.map((value) => normalizeId(value)));
  const matched = needed.filter((value) => availableSet.has(normalizeId(value)));
  const missing = needed.filter((value) => !availableSet.has(normalizeId(value)));
  const ratio = clamp01(matched.length / needed.length);

  return {
    label,
    relevant: true,
    ratio,
    matched,
    missing,
    better: missing.length === 0 && available.length > matched.length,
    summary:
      missing.length > 0
        ? `${label} gap: ${missing.slice(0, 3).join(", ")}.`
        : `${label} overlap ${percentFromRatio(ratio)}%.`,
  };
}

function analyzeNumericRequirement(
  label: string,
  competitorValue: number | undefined,
  wyrestormValue: number | undefined,
  unit = "",
): RequirementCoverage {
  const needed = Number(competitorValue) || 0;
  if (needed <= 0) {
    return {
      label,
      relevant: false,
      ratio: 0,
      matched: [],
      missing: [],
      summary: `${label} is not captured on the competitor record.`,
    };
  }

  const available = Number(wyrestormValue) || 0;
  const ratio = clamp01(available / needed);
  const suffix = unit ? ` ${unit}` : "";

  if (available >= needed) {
    return {
      label,
      relevant: true,
      ratio: 1,
      matched: [`${available}${suffix}`],
      missing: [],
      better: available > needed,
      summary: `${label} aligns at ${available}${suffix}.`,
    };
  }

  return {
    label,
    relevant: true,
    ratio,
    matched: available > 0 ? [`${available}${suffix}`] : [],
    missing: [`${needed}${suffix} required`],
    summary:
      available > 0
        ? `${label} is below the competitor baseline (${available}${suffix} vs ${needed}${suffix}).`
        : `${label} is missing (${needed}${suffix} required).`,
  };
}

function analyzeRankedRequirement(
  label: string,
  competitorRank: number,
  wyrestormRank: number,
  competitorValue: string | undefined,
  wyrestormValue: string | undefined,
): RequirementCoverage {
  if (competitorRank <= 0) {
    return {
      label,
      relevant: false,
      ratio: 0,
      matched: [],
      missing: [],
      summary: `${label} is not captured on the competitor record.`,
    };
  }

  if (wyrestormRank >= competitorRank && wyrestormRank > 0) {
    return {
      label,
      relevant: true,
      ratio: 1,
      matched: [tidy(wyrestormValue) || "supported"],
      missing: [],
      better: wyrestormRank > competitorRank,
      summary: `${label} aligns (${tidy(wyrestormValue) || "supported"}).`,
    };
  }

  const ratio =
    wyrestormRank > 0 ? clamp01(wyrestormRank / competitorRank) : 0;
  return {
    label,
    relevant: true,
    ratio,
    matched: wyrestormRank > 0 ? [tidy(wyrestormValue) || "supported"] : [],
    missing: [tidy(competitorValue) || "required"],
    summary:
      wyrestormRank > 0
        ? `${label} trails the competitor baseline (${tidy(wyrestormValue) || "unknown"} vs ${tidy(competitorValue) || "required"}).`
        : `${label} is missing (${tidy(competitorValue) || "required"}).`,
  };
}

function analyzeBooleanRequirement(
  label: string,
  competitorValue: boolean | undefined,
  wyrestormValue: boolean | undefined,
): RequirementCoverage {
  if (!competitorValue) {
    return {
      label,
      relevant: false,
      ratio: 0,
      matched: [],
      missing: [],
      summary: `${label} is not captured on the competitor record.`,
    };
  }

  return {
    label,
    relevant: true,
    ratio: wyrestormValue ? 1 : 0,
    matched: wyrestormValue ? [label] : [],
    missing: wyrestormValue ? [] : [label],
    summary: wyrestormValue
      ? `${label} is covered.`
      : `${label} is missing.`,
  };
}

function averageRelevant(
  items: RequirementCoverage[],
  fallback = 0.6,
): number {
  const relevant = items.filter((item) => item.relevant);
  if (relevant.length === 0) return fallback;
  return clamp01(
    relevant.reduce((total, item) => total + item.ratio, 0) / relevant.length,
  );
}

function pickRequirementIssues(
  items: RequirementCoverage[],
  limit = 3,
): string[] {
  return items
    .filter((item) => item.relevant && item.missing.length > 0)
    .map((item) => item.summary)
    .slice(0, limit);
}

function statusForCoverageLevel(
  level: CompetitorCompareCoverageLevel,
): CompetitorCompareDecisionStatus {
  switch (level) {
    case "exact":
    case "covers":
      return "pass";
    case "partial":
    case "unknown":
      return "warn";
    default:
      return "fail";
  }
}

function statusForCoverageRatio(
  ratio: number,
  hasRelevantRequirements: boolean,
): CompetitorCompareDecisionStatus {
  if (!hasRelevantRequirements) return "warn";
  if (ratio >= 0.98) return "pass";
  if (ratio >= 0.45) return "warn";
  return "fail";
}

function scorePortCoverage(
  competitorMap: Map<string, number>,
  wyrestormMap: Map<string, number>,
  label: string,
  reasons: string[],
  notes: string[],
): number {
  const competitorTotal = totalCount(competitorMap);
  if (competitorTotal === 0) {
    notes.push(`${label} I/O is missing on the competitor record.`);
    return 0.15;
  }

  let matchedTotal = 0;
  let gapCount = 0;

  for (const [type, needed] of competitorMap.entries()) {
    const available = wyrestormMap.get(type) ?? 0;
    matchedTotal += Math.min(needed, available);

    if (available >= needed) {
      reasons.push(`${label} ${type.toUpperCase()} coverage (${available}/${needed}).`);
    } else {
      notes.push(`${label} ${type.toUpperCase()} shortfall (${available}/${needed}).`);
      gapCount += 1;
    }
  }

  const coverage = clamp01(matchedTotal / Math.max(1, competitorTotal));
  if (gapCount === 0) return coverage;
  return coverage * Math.max(0.4, 1 - gapCount * 0.12);
}

function overlapRatio(left: string[], right: string[]): number {
  const leftSet = new Set(left.map((value) => normalizeId(value)).filter(Boolean));
  const rightSet = new Set(right.map((value) => normalizeId(value)).filter(Boolean));
  if (leftSet.size === 0) return 0;

  let overlap = 0;
  leftSet.forEach((value) => {
    if (rightSet.has(value)) overlap += 1;
  });
  return clamp01(overlap / leftSet.size);
}

function parseResolutionRank(value?: string): number {
  const normalized = tidy(value).toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("8k")) return 5;
  if (normalized.includes("4k60") && normalized.includes("444")) return 4;
  if (normalized.includes("4k60")) return 3;
  if (normalized.includes("4k30") || normalized.includes("4k")) return 2;
  if (normalized.includes("1080")) return 1;
  return 0;
}

function parseBandwidth(value?: number): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function parseHdmiRank(value?: string): number {
  const normalized = tidy(value).toLowerCase();
  if (!normalized) return 0;
  if (normalized.startsWith("2.1")) return 4;
  if (normalized.startsWith("2.0b")) return 3;
  if (normalized.startsWith("2.0")) return 2;
  if (normalized.startsWith("1.4")) return 1;
  return 0;
}

function parseLatencyRank(value?: string): number {
  const normalized = tidy(value).toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("zero")) return 4;
  if (normalized.includes("subframe") || normalized.includes("sub-frame")) return 3;
  if (normalized.includes("low")) return 2;
  if (normalized.includes("standard")) return 1;
  return 0;
}

const WIRELESS_FLAG_DEFS = [
  { key: "airplay", label: "AirPlay" },
  { key: "miracast", label: "Miracast" },
  { key: "googleCast", label: "Google Cast" },
  { key: "wirelessPresentation", label: "Wireless presentation" },
  { key: "wirelessConference", label: "Wireless conference" },
  { key: "mst", label: "MST" },
  { key: "byod", label: "BYOD" },
  { key: "byom", label: "BYOM" },
] as const;

const USB_FLAG_DEFS = [
  { key: "passthrough", label: "USB passthrough" },
  { key: "usbCVideoInput", label: "USB-C video input" },
  { key: "kvmSupport", label: "KVM" },
  { key: "cameraSharing", label: "Camera sharing" },
  { key: "peripheralSwitching", label: "Peripheral switching" },
] as const;

const VIDEO_FLAG_DEFS = [
  { key: "scaling", label: "Scaling" },
  { key: "downscaling", label: "Downscaling" },
  { key: "upscaling", label: "Upscaling" },
  { key: "multiview", label: "Multiview" },
  { key: "seamlessSwitching", label: "Seamless switching" },
  { key: "dolbyVision", label: "Dolby Vision" },
] as const;

const INTEGRATION_FLAG_DEFS = [
  { key: "rs232", label: "RS-232" },
  { key: "ir", label: "IR" },
  { key: "lanControl", label: "LAN control" },
  { key: "webUi", label: "Web UI" },
  { key: "api", label: "API" },
  { key: "cec", label: "CEC" },
  { key: "poe", label: "PoE" },
  { key: "poePd", label: "PoE PD" },
] as const;

function enabledCapabilityLabels<T extends object>(
  profile: T | undefined,
  definitions: ReadonlyArray<{ key: keyof T; label: string }>,
): string[] {
  if (!profile) return [];
  return definitions
    .filter((definition) => Boolean(profile[definition.key]))
    .map((definition) => definition.label);
}

function scoreCapabilityFlags<T extends object>(
  label: string,
  competitorProfile: T | undefined,
  wyrestormProfile: T | undefined,
  definitions: ReadonlyArray<{ key: keyof T; label: string }>,
  maxPoints: number,
  reasons: string[],
  notes: string[],
): number {
  const needed = enabledCapabilityLabels(competitorProfile, definitions);
  if (needed.length === 0) return 0;
  const available = new Set(enabledCapabilityLabels(wyrestormProfile, definitions).map((value) => normalizeId(value)));
  const matched = needed.filter((value) => available.has(normalizeId(value)));
  const coverage = clamp01(matched.length / needed.length);
  const score = Math.round(coverage * maxPoints);

  if (matched.length > 0) reasons.push(`${label} coverage ${Math.round(coverage * 100)}%.`);

  const missing = needed.filter((value) => !available.has(normalizeId(value)));
  if (missing.length > 0) notes.push(`${label} gap: ${missing.slice(0, 3).join(", ")}.`);

  return score;
}

function scoreNumericRequirement(
  label: string,
  competitorValue: number | undefined,
  wyrestormValue: number | undefined,
  maxPoints: number,
  reasons: string[],
  notes: string[],
  unit = "",
): number {
  const needed = Number(competitorValue) || 0;
  if (needed <= 0) return 0;
  const available = Number(wyrestormValue) || 0;
  const suffix = unit ? ` ${unit}` : "";

  if (available >= needed) {
    reasons.push(`${label} aligns (${available}${suffix}).`);
    return maxPoints;
  }

  if (available > 0) {
    notes.push(`${label} below competitor baseline (${available}${suffix} vs ${needed}${suffix}).`);
    return Math.max(0, Math.round((available / needed) * maxPoints));
  }

  notes.push(`${label} is missing (${needed}${suffix} required).`);
  return 0;
}

function parseHdcpRank(value?: string): number {
  const normalized = tidy(value).toLowerCase();
  if (!normalized) return 0;
  if (normalized.startsWith("2.3")) return 4;
  if (normalized.startsWith("2.2")) return 3;
  if (normalized.startsWith("2.1")) return 2;
  if (normalized.startsWith("1.4")) return 1;
  return 0;
}

function parseNetworkSpeedRank(value?: string): number {
  const normalized = tidy(value).toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("10g")) return 3;
  if (normalized.includes("2.5g")) return 2;
  if (normalized.includes("1g")) return 1;
  return 0;
}

function parseHdbasetClassRank(value?: string): number {
  const normalized = tidy(value).toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("class a")) return 2;
  if (normalized.includes("class b")) return 1;
  return 0;
}

function scoreRankedRequirement(
  label: string,
  competitorRank: number,
  wyrestormRank: number,
  competitorValue: string | undefined,
  wyrestormValue: string | undefined,
  maxPoints: number,
  reasons: string[],
  notes: string[],
): number {
  if (competitorRank <= 0) return 0;
  if (wyrestormRank >= competitorRank) {
    reasons.push(`${label} aligns (${tidy(wyrestormValue) || "supported"}).`);
    return maxPoints;
  }
  if (wyrestormRank > 0) {
    notes.push(`${label} below competitor baseline (${tidy(wyrestormValue) || "unknown"} vs ${tidy(competitorValue) || "required"}).`);
    return Math.max(0, maxPoints - 1);
  }
  notes.push(`${label} is missing (competitor: ${tidy(competitorValue) || "specified"}).`);
  return 0;
}

function tagsFor(product: CatalogProduct): Set<string> {
  const tags = new Set<string>();
  const values = [
    product.family,
    product.category,
    product.subcategory,
    product.transport,
    product.summary,
    product.video?.maxResolution,
    product.video?.hdmi,
    Number.isFinite(product.video?.bandwidthGbps)
      ? `${product.video?.bandwidthGbps}gbps`
      : "",
    product.latency,
    ...(product.features ?? []),
    ...(product.control ?? []),
    ...(product.audio ?? []),
    ...((product.inputs ?? []).map((port) => port.type)),
    ...((product.outputs ?? []).map((port) => port.type)),
    ...(product.normalizedTags ?? []),
  ];

  for (const value of values) {
    const token = normalizeId(value);
    if (!token) continue;
    tags.add(token);
  }

  return tags;
}

function formatCapabilityFlags<T extends object>(
  profile: T | undefined,
  definitions: ReadonlyArray<{ key: keyof T; label: string }>,
): string {
  const values = enabledCapabilityLabels(profile, definitions);
  return values.length > 0 ? values.join(", ") : "-";
}

function statusForCapabilityFlags<T extends object>(
  competitorProfile: T | undefined,
  wyrestormProfile: T | undefined,
  definitions: ReadonlyArray<{ key: keyof T; label: string }>,
  missingLabel: string,
): { status: CompetitorCompareMatrixStatus; note?: string } {
  const needed = enabledCapabilityLabels(competitorProfile, definitions);
  const available = new Set(enabledCapabilityLabels(wyrestormProfile, definitions).map((value) => normalizeId(value)));

  if (needed.length === 0) {
    return { status: "review", note: `${missingLabel} is not required by the captured competitor profile.` };
  }

  const matched = needed.filter((value) => available.has(normalizeId(value)));
  const missing = needed.filter((value) => !available.has(normalizeId(value)));

  if (matched.length === needed.length && available.size > matched.length) {
    return { status: "better" };
  }
  if (matched.length === needed.length) {
    return { status: "match" };
  }
  if (matched.length > 0) {
    return { status: "review", note: `${missingLabel} gap: ${missing.slice(0, 3).join(", ")}.` };
  }
  return { status: "gap", note: `${missingLabel} is not covered.` };
}

function formatNumericCapability(value?: number, unit = ""): string {
  const numeric = Number(value) || 0;
  if (numeric <= 0) return "-";
  return unit ? `${numeric} ${unit}` : String(numeric);
}

function statusForNumericCapability(
  competitorValue: number | undefined,
  wyrestormValue: number | undefined,
  label: string,
): { status: CompetitorCompareMatrixStatus; note?: string } {
  const needed = Number(competitorValue) || 0;
  const available = Number(wyrestormValue) || 0;
  if (needed <= 0) return { status: "review", note: `${label} is not required by the captured competitor profile.` };
  if (available > needed) return { status: "better" };
  if (available === needed) return { status: "match" };
  if (available > 0) return { status: "review", note: `${label} is close but below the competitor count.` };
  return { status: "gap", note: `${label} is missing.` };
}

function formatTransportDetail(product: CatalogProduct): string {
  const parts = [
    tidy(product.distance?.hdbasetClass),
    tidy(product.distance?.networkSpeed),
    tidy(product.distance?.codec),
    tidy(product.video?.hdcpVersion) ? `HDCP ${tidy(product.video?.hdcpVersion)}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

function statusForTransportDetail(
  competitor: CatalogProduct,
  wyrestorm: CatalogProduct,
): { status: CompetitorCompareMatrixStatus; note?: string } {
  const competitorHdcp = parseHdcpRank(competitor.video?.hdcpVersion);
  const wyrestormHdcp = parseHdcpRank(wyrestorm.video?.hdcpVersion);
  const competitorNetwork = parseNetworkSpeedRank(competitor.distance?.networkSpeed);
  const wyrestormNetwork = parseNetworkSpeedRank(wyrestorm.distance?.networkSpeed);
  const competitorHdbaset = parseHdbasetClassRank(competitor.distance?.hdbasetClass);
  const wyrestormHdbaset = parseHdbasetClassRank(wyrestorm.distance?.hdbasetClass);

  const requiredCount = [competitorHdcp, competitorNetwork, competitorHdbaset].filter((value) => value > 0).length;
  if (requiredCount === 0) {
    return { status: "review", note: "No deeper transport-class requirement is captured on the competitor record." };
  }

  const metCount = [
    competitorHdcp > 0 ? wyrestormHdcp >= competitorHdcp : true,
    competitorNetwork > 0 ? wyrestormNetwork >= competitorNetwork : true,
    competitorHdbaset > 0 ? wyrestormHdbaset >= competitorHdbaset : true,
  ].filter(Boolean).length;

  if (metCount === requiredCount && [wyrestormHdcp > competitorHdcp, wyrestormNetwork > competitorNetwork, wyrestormHdbaset > competitorHdbaset].some(Boolean)) {
    return { status: "better" };
  }
  if (metCount === requiredCount) return { status: "match" };
  if (metCount > 0) return { status: "review", note: "Some transport-class details align, but not all." };
  return { status: "gap", note: "Transport-class detail trails the captured competitor baseline." };
}

function formatPorts(ports?: CatalogPortCount[]): string {
  const values = (ports ?? [])
    .map((port) => {
      const type = tidy(port.type);
      const count = Math.max(0, Number(port.count) || 0);
      if (!type) return "";
      return `${type} x${count || 1}`;
    })
    .filter(Boolean);
  return values.length > 0 ? values.join(", ") : "-";
}

function formatComparablePorts(ports?: CatalogPortCount[]): string {
  const values = (ports ?? [])
    .filter((port) => !isWorkflowPortType(port.type))
    .map((port) => {
      const type = tidy(port.type);
      const count = Math.max(0, Number(port.count) || 0);
      if (!type) return "";
      return `${type} x${count || 1}`;
    })
    .filter(Boolean);
  return values.length > 0 ? values.join(", ") : "-";
}

function formatVideo(product: CatalogProduct): string {
  const parts = [
    tidy(product.video?.maxResolution),
    tidy(product.video?.hdmi) ? `HDMI ${tidy(product.video?.hdmi)}` : "",
    Number.isFinite(product.video?.bandwidthGbps)
      ? `${product.video?.bandwidthGbps} Gbps`
      : "",
    product.video?.hdr ? "HDR" : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

function formatControl(control?: string[]): string {
  const values = dedupeStrings(control ?? [], 6);
  return values.length > 0 ? values.join(", ") : "-";
}

function formatDistance(product: CatalogProduct): string {
  return Number.isFinite(product.distance?.meters)
    ? `${product.distance?.meters}m`
    : "-";
}

function statusForPortCoverage(
  competitor: CatalogPortCount[] | undefined,
  wyrestorm: CatalogPortCount[] | undefined,
): { status: CompetitorCompareMatrixStatus; note?: string } {
  const competitorMap = asComparablePortMap(competitor);
  const wyrestormMap = asComparablePortMap(wyrestorm);
  const competitorTotal = totalCount(competitorMap);
  const workflowNote = joinNotes([
    workflowPortNote(competitor),
    workflowPortNote(wyrestorm),
  ]);
  if (competitorTotal === 0) {
    return {
      status: "review",
      note:
        workflowNote || "Competitor physical I/O is not fully captured.",
    };
  }

  let matched = 0;
  let shortfalls = 0;
  let coversAll = true;
  for (const [type, needed] of competitorMap.entries()) {
    const available = wyrestormMap.get(type) ?? 0;
    matched += Math.min(needed, available);
    if (available < needed) {
      shortfalls += 1;
      coversAll = false;
    }
  }

  const coverage = matched / Math.max(1, competitorTotal);
  if (coversAll && totalCount(wyrestormMap) > competitorTotal) {
    return {
      status: "better",
      note: joinNotes([
        "WyreStorm offers additional visible I/O beyond the captured competitor profile.",
        workflowNote,
      ]),
    };
  }
  if (coverage >= 1 && shortfalls === 0) {
    return { status: "match", note: workflowNote };
  }
  if (coverage >= 0.75) {
    return {
      status: "review",
      note: joinNotes(["Some I/O is close but not exact.", workflowNote]),
    };
  }
  return {
    status: "gap",
    note: joinNotes([
      "Visible I/O shortfall against the competitor profile.",
      workflowNote,
    ]),
  };
}

function statusForVideo(
  competitor: CatalogProduct,
  wyrestorm: CatalogProduct,
): { status: CompetitorCompareMatrixStatus; note?: string } {
  const compRes = parseResolutionRank(competitor.video?.maxResolution);
  const wrRes = parseResolutionRank(wyrestorm.video?.maxResolution);
  const compBandwidth = parseBandwidth(competitor.video?.bandwidthGbps);
  const wrBandwidth = parseBandwidth(wyrestorm.video?.bandwidthGbps);

  if (compRes === 0 && compBandwidth === 0) {
    return { status: "review", note: "Competitor video ceiling is not fully captured." };
  }
  if (
    (wrRes > compRes && wrBandwidth >= compBandwidth) ||
    (wrBandwidth > compBandwidth && wrRes >= compRes)
  ) {
    return { status: "better" };
  }
  if (wrRes >= compRes && wrBandwidth >= compBandwidth) return { status: "match" };
  if (wrRes === 0 && wrBandwidth === 0) return { status: "review", note: "WyreStorm video ceiling is incomplete." };
  return { status: "gap", note: "WyreStorm video ceiling trails the captured competitor baseline." };
}

function statusForControl(
  competitor: CatalogProduct,
  wyrestorm: CatalogProduct,
): { status: CompetitorCompareMatrixStatus; note?: string } {
  const left = new Set((competitor.control ?? []).map((value) => normalizeId(value)).filter(Boolean));
  const right = new Set((wyrestorm.control ?? []).map((value) => normalizeId(value)).filter(Boolean));

  if (left.size === 0 && right.size === 0) {
    return { status: "review", note: "Control interfaces are not fully documented." };
  }

  let overlap = 0;
  left.forEach((value) => {
    if (right.has(value)) overlap += 1;
  });

  if (left.size > 0 && overlap === left.size && right.size > left.size) {
    return { status: "better" };
  }
  if (left.size > 0 && overlap === left.size && right.size >= left.size) {
    return { status: "match" };
  }
  if (right.size > left.size && overlap >= Math.max(1, left.size - 1)) {
    return { status: "better" };
  }
  if (overlap > 0) {
    return { status: "review", note: "Some control paths align, but not all." };
  }
  return { status: "gap", note: "Control interfaces differ from the captured competitor profile." };
}

function statusForDistance(
  competitor: CatalogProduct,
  wyrestorm: CatalogProduct,
): { status: CompetitorCompareMatrixStatus; note?: string } {
  const comp = Number(competitor.distance?.meters || 0);
  const wr = Number(wyrestorm.distance?.meters || 0);
  if (comp <= 0) return { status: "review", note: "Competitor distance is not captured." };
  if (wr <= 0) return { status: "review", note: "WyreStorm distance is not captured." };
  if (wr > comp) return { status: "better" };
  if (wr === comp) return { status: "match" };
  if (wr >= comp * 0.8) return { status: "review", note: "Distance is close but below the competitor number." };
  return { status: "gap", note: "WyreStorm distance trails the captured competitor number." };
}

function matrixRowSummary(row: CompetitorCompareMatrixRow): string {
  if (row.note) return row.note;
  if (row.status === "better") {
    return `${row.label} is stronger on the WyreStorm side.`;
  }
  if (row.status === "match") {
    return `${row.label} aligns.`;
  }
  if (row.status === "gap") {
    return row.note || `${row.label} trails the competitor baseline.`;
  }
  return row.note || `${row.label} needs manual review.`;
}

function productTextBlob(product: CatalogProduct): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.technology,
    product.topology,
    product.role,
    product.directionality,
    product.outputBehavior,
    product.transport,
    product.notes,
    ...(product.features ?? []),
    ...(product.audio ?? []),
    ...(product.control ?? []),
    ...(product.normalizedTags ?? []),
    ...(product.matchKeywords ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function displayPortType(value: string): string {
  const normalized = normalizeId(value);
  if (normalized === "usbc") return "USB-C";
  if (normalized === "displayport" || normalized === "dp") return "DisplayPort";
  if (normalized === "rj45" || normalized === "ethernet" || normalized === "lan") return "RJ45";
  if (normalized === "hdbaset") return "HDBaseT";
  if (normalized === "mic" || normalized === "mics") return "Mic";
  return prettyPortType(value);
}

function orderedPortTypes(values: Iterable<string>): string[] {
  const priority = ["hdmi", "usbc", "displayport", "hdbaset", "rj45", "usb", "audio", "mic"];
  const out = Array.from(
    new Set(Array.from(values).map((value) => normalizeId(value)).filter(Boolean)),
  );

  return out.sort((left, right) => {
    const leftPriority = priority.indexOf(left);
    const rightPriority = priority.indexOf(right);
    if (leftPriority >= 0 || rightPriority >= 0) {
      if (leftPriority < 0) return 1;
      if (rightPriority < 0) return -1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    }
    return displayPortType(left).localeCompare(displayPortType(right));
  });
}

function numericCellValue(value: number): string {
  return String(Math.max(0, Math.round(Number(value) || 0)));
}

function yesNoCellValue(value: boolean): string {
  return value ? "Yes" : "No";
}

function countPhrase(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function numericMatrixRow(input: {
  id: string;
  label: string;
  competitorValue: number;
  wyrestormValue: number;
  thingLabel: string;
  zeroNote?: string;
}): CompetitorCompareMatrixRow {
  const competitorValue = Math.max(0, Math.round(Number(input.competitorValue) || 0));
  const wyrestormValue = Math.max(0, Math.round(Number(input.wyrestormValue) || 0));

  if (competitorValue <= 0 && wyrestormValue <= 0) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: "0",
      wyrestormValue: "0",
      status: "review",
      note: input.zeroNote || `${input.label} is not fully captured on either product.`,
    };
  }

  if (competitorValue <= 0) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: "0",
      wyrestormValue: numericCellValue(wyrestormValue),
      status: "better",
      note: `WyreStorm shows ${countPhrase(wyrestormValue, input.thingLabel)} while the competitor baseline shows none.`,
    };
  }

  if (wyrestormValue > competitorValue) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: numericCellValue(competitorValue),
      wyrestormValue: numericCellValue(wyrestormValue),
      status: "better",
      note: `WyreStorm adds ${countPhrase(wyrestormValue - competitorValue, input.thingLabel)} beyond the competitor baseline.`,
    };
  }

  if (wyrestormValue === competitorValue) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: numericCellValue(competitorValue),
      wyrestormValue: numericCellValue(wyrestormValue),
      status: "match",
      note: `${input.label} count is aligned.`,
    };
  }

  if (wyrestormValue > 0) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: numericCellValue(competitorValue),
      wyrestormValue: numericCellValue(wyrestormValue),
      status: "gap",
      note: `WyreStorm is short by ${countPhrase(competitorValue - wyrestormValue, input.thingLabel)} against the competitor baseline.`,
    };
  }

  return {
    id: input.id,
    label: input.label,
    competitorValue: numericCellValue(competitorValue),
    wyrestormValue: "0",
    status: "gap",
    note: `${input.label} is missing on the WyreStorm option.`,
  };
}

function booleanMatrixRow(input: {
  id: string;
  label: string;
  competitorValue: boolean;
  wyrestormValue: boolean;
  betterNote?: string;
  gapNote?: string;
}): CompetitorCompareMatrixRow {
  if (!input.competitorValue && !input.wyrestormValue) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: "No",
      wyrestormValue: "No",
      status: "review",
      note: `${input.label} is not captured on either product.`,
    };
  }

  if (!input.competitorValue && input.wyrestormValue) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: "No",
      wyrestormValue: "Yes",
      status: "better",
      note: input.betterNote || `WyreStorm adds ${input.label.toLowerCase()}.`,
    };
  }

  if (input.competitorValue && input.wyrestormValue) {
    return {
      id: input.id,
      label: input.label,
      competitorValue: "Yes",
      wyrestormValue: "Yes",
      status: "match",
      note: `${input.label} is available on both products.`,
    };
  }

  return {
    id: input.id,
    label: input.label,
    competitorValue: "Yes",
    wyrestormValue: "No",
    status: "gap",
    note:
      input.gapNote ||
      `${input.label} is present on the competitor product but not on this WyreStorm option.`,
  };
}

function hasWirelessPresentation(product: CatalogProduct): boolean {
  const text = productTextBlob(product);
  return Boolean(
    product.wireless?.wirelessPresentation ||
      product.wireless?.airplay ||
      product.wireless?.miracast ||
      /\bwireless presentation\b|airplay|miracast/.test(text),
  );
}

function hasWirelessConference(product: CatalogProduct): boolean {
  const text = productTextBlob(product);
  return Boolean(
    product.wireless?.wirelessConference ||
      product.wireless?.byod ||
      product.wireless?.byom ||
      /\bwireless conference\b|\bbyod\b|\bbyom\b/.test(text),
  );
}

function hasMst(product: CatalogProduct): boolean {
  return Boolean(product.wireless?.mst || /\bmst\b/.test(productTextBlob(product)));
}

function hasMultiview(product: CatalogProduct): boolean {
  return Boolean(
    product.video?.multiview || /\bmultiview\b|\bdual[- ]view\b|\bquad view\b/.test(productTextBlob(product)),
  );
}

function hasScaling(product: CatalogProduct): boolean {
  const text = productTextBlob(product);
  return Boolean(
    product.video?.scaling ||
      product.video?.downscaling ||
      product.video?.upscaling ||
      /\bscal(?:e|ing|er)\b|\bdown-?scal(?:e|ing)\b|\bup-?scal(?:e|ing)\b/.test(text),
  );
}

function hasVideoWallFeature(product: CatalogProduct): boolean {
  const text = productTextBlob(product);
  return Boolean(
    classifyCatalogProduct(product).group === "videowall" ||
      /\bvideo wall\b|\bvideowall\b/.test(text),
  );
}

function hasBuiltInMicrophones(product: CatalogProduct): boolean {
  return /\bmicrophones?\b|\bspeakerphone\b|\b\d+xmics?\b|\bomni-direction\b/.test(productTextBlob(product));
}

function hasBuiltInSpeakers(product: CatalogProduct): boolean {
  return /\bspeakers?\b|\bsoundbar\b|\bspeakerphone\b/.test(productTextBlob(product));
}

function buildIoBreakdown(
  inputAnalysis: PortSetAnalysis,
  outputAnalysis: PortSetAnalysis,
): CompetitorCompareIoBreakdown {
  const coverageValues = [inputAnalysis, outputAnalysis]
    .filter((analysis) => analysis.competitorTotal > 0)
    .map((analysis) => analysis.coverage);
  const ioCoverage =
    coverageValues.length > 0
      ? clamp01(
          coverageValues.reduce((total, value) => total + value, 0) /
            coverageValues.length,
        )
      : 0.6;
  const overallParity = combineCoverageLevels(
    inputAnalysis.level,
    outputAnalysis.level,
  );

  return {
    competitorInputTotal: inputAnalysis.competitorTotal,
    wyrestormInputTotal: inputAnalysis.wyrestormTotal,
    competitorOutputTotal: outputAnalysis.competitorTotal,
    wyrestormOutputTotal: outputAnalysis.wyrestormTotal,
    inputCoveragePercent: percentFromRatio(inputAnalysis.coverage),
    outputCoveragePercent: percentFromRatio(outputAnalysis.coverage),
    ioCoveragePercent: percentFromRatio(ioCoverage),
    inputParity: inputAnalysis.level,
    outputParity: outputAnalysis.level,
    overallParity,
    inputs: inputAnalysis.deltas,
    outputs: outputAnalysis.deltas,
    summary: dedupeStrings(
      [
        describePortAnalysis("Inputs", inputAnalysis),
        describePortAnalysis("Outputs", outputAnalysis),
      ],
      2,
    ).join(" "),
  };
}

function chooseMatchMethod(input: {
  classAlignment: boolean;
  transportCoverage: number;
  inputLevel: CompetitorCompareCoverageLevel;
  outputLevel: CompetitorCompareCoverageLevel;
  ioCoverage: number;
  workflowCoverage: number;
  specCoverage: number;
  warningCount: number;
}): CompetitorCompareMatchMethod {
  const coversInputs =
    input.inputLevel === "exact" || input.inputLevel === "covers";
  const coversOutputs =
    input.outputLevel === "exact" || input.outputLevel === "covers";
  const inputKnown = input.inputLevel !== "unknown";
  const outputKnown = input.outputLevel !== "unknown";
  const inputSufficient = coversInputs || !inputKnown;
  const outputSufficient = coversOutputs || !outputKnown;

  if (
    !input.classAlignment ||
    (inputKnown && outputKnown && input.ioCoverage < 0.35)
  ) {
    return "manual-review";
  }

  if (!inputSufficient || !outputSufficient) {
    return input.ioCoverage >= 0.55 ||
      (input.transportCoverage >= 0.65 &&
        input.workflowCoverage >= 0.6 &&
        input.specCoverage >= 0.45)
      ? "functional-alternative"
      : "manual-review";
  }

  if (
    input.inputLevel === "exact" &&
    input.outputLevel === "exact" &&
    input.transportCoverage >= 0.98 &&
    input.workflowCoverage >= 0.72 &&
    input.specCoverage >= 0.65 &&
    input.warningCount === 0
  ) {
    return "direct-replacement";
  }

  if (
    input.transportCoverage >= 0.6 &&
    input.workflowCoverage >= 0.5 &&
    input.specCoverage >= 0.45
  ) {
    return "covers-brief";
  }

  return "functional-alternative";
}

function matchBasisSummary(
  method: CompetitorCompareMatchMethod,
  ioBreakdown: CompetitorCompareIoBreakdown,
  workflowCoverage: number,
  specCoverage: number,
): string {
  switch (method) {
    case "direct-replacement":
      return `Direct replacement: exact I/O parity with aligned transport, workflow, and spec headroom.`;
    case "covers-brief":
      return `Covers the brief: required I/O is covered and the main workflow fit is intact.`;
    case "functional-alternative":
      return `Functional alternative: some parity exists, but at least one area needs a closer review before quoting.`;
    default:
      return `Manual review recommended: captured parity is not strong enough yet for a confident replacement call.`;
  }
}

function buildHighlights(
  matrix: CompetitorCompareMatrixRow[],
  ioBreakdown: CompetitorCompareIoBreakdown,
): CompetitorCompareHighlights {
  const matches = matrix
    .filter((row) => row.status === "match")
    .map((row) => matrixRowSummary(row))
    .slice(0, 4);
  const extras = dedupeStrings(
    [
      ...matrix
        .filter((row) => row.status === "better")
        .map((row) => matrixRowSummary(row)),
      ...(ioBreakdown.inputParity === "covers"
        ? ["Inputs are covered with additional visible WyreStorm I/O."]
        : []),
      ...(ioBreakdown.outputParity === "covers"
        ? ["Outputs are covered with additional visible WyreStorm I/O."]
        : []),
    ],
    4,
  );
  const gaps = dedupeStrings(
    [
      ...matrix
        .filter((row) => row.status === "gap")
        .map((row) => matrixRowSummary(row)),
      ...(ioBreakdown.inputParity === "partial" ||
      ioBreakdown.inputParity === "missing"
        ? [describePortAnalysis("Inputs", analyzePortSet(
            ioBreakdown.inputs.map((delta) => ({
              type: delta.type,
              count: delta.competitorCount,
            })),
            ioBreakdown.inputs.map((delta) => ({
              type: delta.type,
              count: delta.wyrestormCount,
            })),
          ))]
        : []),
      ...(ioBreakdown.outputParity === "partial" ||
      ioBreakdown.outputParity === "missing"
        ? [describePortAnalysis("Outputs", analyzePortSet(
            ioBreakdown.outputs.map((delta) => ({
              type: delta.type,
              count: delta.competitorCount,
            })),
            ioBreakdown.outputs.map((delta) => ({
              type: delta.type,
              count: delta.wyrestormCount,
            })),
          ))]
        : []),
    ],
    4,
  );
  const reviews = matrix
    .filter((row) => row.status === "review")
    .map((row) => matrixRowSummary(row))
    .slice(0, 4);

  return { matches, gaps, extras, reviews };
}

function comparisonMatrix(
  competitor: CatalogProduct,
  wyrestorm: CatalogProduct,
): CompetitorCompareMatrixRow[] {
  const competitorType = classifyCatalogProduct(competitor);
  const wyrestormType = classifyCatalogProduct(wyrestorm);
  const competitorInputs = asComparablePortMap(competitor.inputs);
  const wyrestormInputs = asComparablePortMap(wyrestorm.inputs);
  const competitorOutputs = asComparablePortMap(competitor.outputs);
  const wyrestormOutputs = asComparablePortMap(wyrestorm.outputs);
  const inputTypes = orderedPortTypes([
    ...competitorInputs.keys(),
    ...wyrestormInputs.keys(),
  ]);
  const outputTypes = orderedPortTypes([
    ...competitorOutputs.keys(),
    ...wyrestormOutputs.keys(),
  ]);

  const roleStatus: CompetitorCompareMatrixStatus =
    competitorType.primaryType === wyrestormType.primaryType
      ? "match"
      : areProductTypesCompatible(competitorType, wyrestormType)
        ? "review"
        : "gap";

  const transportStatus: CompetitorCompareMatrixStatus =
    normalizeId(competitor.transport) &&
    normalizeId(competitor.transport) === normalizeId(wyrestorm.transport)
      ? "match"
      : normalizeId(competitor.transport) && normalizeId(wyrestorm.transport)
        ? "gap"
        : "review";

  const rows: CompetitorCompareMatrixRow[] = [
    {
      id: "primary-role",
      label: "Primary role",
      competitorValue: competitorType.label,
      wyrestormValue: wyrestormType.label,
      status: roleStatus,
      note:
        roleStatus === "match"
          ? `Both products are positioned as ${competitorType.label.toLowerCase()}.`
          : roleStatus === "review"
            ? `Primary role is close, but the competitor is a ${competitorType.label.toLowerCase()} while the WyreStorm option is a ${wyrestormType.label.toLowerCase()}.`
            : `Primary role differs: the competitor is a ${competitorType.label.toLowerCase()} while the WyreStorm option is a ${wyrestormType.label.toLowerCase()}.`,
    },
    {
      id: "transport",
      label: "Transport",
      competitorValue: tidy(competitor.transport) || "-",
      wyrestormValue: tidy(wyrestorm.transport) || "-",
      status: transportStatus,
      note:
        transportStatus === "match"
          ? `Both products use ${tidy(competitor.transport) || "the same transport"}.`
          : transportStatus === "gap"
            ? `Transport path differs: competitor uses ${tidy(competitor.transport) || "unknown"} while WyreStorm uses ${tidy(wyrestorm.transport) || "unknown"}.`
            : "Transport details need a closer check before final sign-off.",
    },
    numericMatrixRow({
      id: "inputs",
      label: "Inputs",
      competitorValue: totalCount(competitorInputs),
      wyrestormValue: totalCount(wyrestormInputs),
      thingLabel: "visible physical input",
      zeroNote: "Visible physical input counts are not fully captured on either product.",
    }),
    numericMatrixRow({
      id: "outputs",
      label: "Outputs",
      competitorValue: totalCount(competitorOutputs),
      wyrestormValue: totalCount(wyrestormOutputs),
      thingLabel: "visible physical output",
      zeroNote: "Visible physical output counts are not fully captured on either product.",
    }),
  ];

  inputTypes.forEach((type) => {
    rows.push(
      numericMatrixRow({
        id: `input:${type}`,
        label: `${displayPortType(type)} In`,
        competitorValue: competitorInputs.get(type) ?? 0,
        wyrestormValue: wyrestormInputs.get(type) ?? 0,
        thingLabel: `${displayPortType(type)} input`,
      }),
    );
  });

  outputTypes.forEach((type) => {
    rows.push(
      numericMatrixRow({
        id: `output:${type}`,
        label: `${displayPortType(type)} Out`,
        competitorValue: competitorOutputs.get(type) ?? 0,
        wyrestormValue: wyrestormOutputs.get(type) ?? 0,
        thingLabel: `${displayPortType(type)} output`,
      }),
    );
  });

  const competitorWirelessPresentation = hasWirelessPresentation(competitor);
  const wyrestormWirelessPresentation = hasWirelessPresentation(wyrestorm);
  if (competitorWirelessPresentation || wyrestormWirelessPresentation) {
    rows.push(
      booleanMatrixRow({
        id: "wireless-presentation",
        label: "Wireless Present",
        competitorValue: competitorWirelessPresentation,
        wyrestormValue: wyrestormWirelessPresentation,
      }),
    );
  }

  const competitorWirelessConference = hasWirelessConference(competitor);
  const wyrestormWirelessConference = hasWirelessConference(wyrestorm);
  if (competitorWirelessConference || wyrestormWirelessConference) {
    rows.push(
      booleanMatrixRow({
        id: "wireless-conference",
        label: "Wireless Conf",
        competitorValue: competitorWirelessConference,
        wyrestormValue: wyrestormWirelessConference,
      }),
    );
  }

  const competitorUsbHostPorts = Number(competitor.usb?.hostPorts) || 0;
  const wyrestormUsbHostPorts = Number(wyrestorm.usb?.hostPorts) || 0;
  if (competitorUsbHostPorts > 0 || wyrestormUsbHostPorts > 0) {
    rows.push(
      numericMatrixRow({
        id: "usb-host-ports",
        label: "USB Host",
        competitorValue: competitorUsbHostPorts,
        wyrestormValue: wyrestormUsbHostPorts,
        thingLabel: "USB host port",
      }),
    );
  }

  const competitorUsbDevicePorts = Number(competitor.usb?.devicePorts) || 0;
  const wyrestormUsbDevicePorts = Number(wyrestorm.usb?.devicePorts) || 0;
  if (competitorUsbDevicePorts > 0 || wyrestormUsbDevicePorts > 0) {
    rows.push(
      numericMatrixRow({
        id: "usb-device-ports",
        label: "USB Device",
        competitorValue: competitorUsbDevicePorts,
        wyrestormValue: wyrestormUsbDevicePorts,
        thingLabel: "USB device port",
      }),
    );
  }

  const competitorMst = hasMst(competitor);
  const wyrestormMst = hasMst(wyrestorm);
  if (competitorMst || wyrestormMst) {
    rows.push(
      booleanMatrixRow({
        id: "mst",
        label: "MST",
        competitorValue: competitorMst,
        wyrestormValue: wyrestormMst,
      }),
    );
  }

  const competitorMultiview = hasMultiview(competitor);
  const wyrestormMultiview = hasMultiview(wyrestorm);
  if (competitorMultiview || wyrestormMultiview) {
    rows.push(
      booleanMatrixRow({
        id: "multiview",
        label: "Multiview",
        competitorValue: competitorMultiview,
        wyrestormValue: wyrestormMultiview,
      }),
    );
  }

  const competitorScaling = hasScaling(competitor);
  const wyrestormScaling = hasScaling(wyrestorm);
  if (competitorScaling || wyrestormScaling) {
    rows.push(
      booleanMatrixRow({
        id: "scaling",
        label: "Scaling",
        competitorValue: competitorScaling,
        wyrestormValue: wyrestormScaling,
      }),
    );
  }

  const competitorVideoWall = hasVideoWallFeature(competitor);
  const wyrestormVideoWall = hasVideoWallFeature(wyrestorm);
  if (competitorVideoWall || wyrestormVideoWall) {
    rows.push(
      booleanMatrixRow({
        id: "video-wall",
        label: "Video Wall",
        competitorValue: competitorVideoWall,
        wyrestormValue: wyrestormVideoWall,
      }),
    );
  }

  const competitorMicrophones = hasBuiltInMicrophones(competitor);
  const wyrestormMicrophones = hasBuiltInMicrophones(wyrestorm);
  if (competitorMicrophones || wyrestormMicrophones) {
    rows.push(
      booleanMatrixRow({
        id: "microphones",
        label: "Microphones",
        competitorValue: competitorMicrophones,
        wyrestormValue: wyrestormMicrophones,
      }),
    );
  }

  const competitorSpeakers = hasBuiltInSpeakers(competitor);
  const wyrestormSpeakers = hasBuiltInSpeakers(wyrestorm);
  if (competitorSpeakers || wyrestormSpeakers) {
    rows.push(
      booleanMatrixRow({
        id: "speakers",
        label: "Speakers",
        competitorValue: competitorSpeakers,
        wyrestormValue: wyrestormSpeakers,
      }),
    );
  }

  return rows;
}

function buildSalesStory(
  label: string,
  competitorSku: string,
  wyrestormSku: string,
  reasons: string[],
  cautions: string[],
  positioningReasons: string[],
): string[] {
  const lines = [
    `Lead with ${wyrestormSku} as the ${label.toLowerCase()} for ${competitorSku}.`,
  ];

  if (reasons[0]) {
    lines.push(`Anchor the recommendation on ${reasons[0].replace(/\.$/, "").toLowerCase()}.`);
  }
  if (positioningReasons[0]) {
    lines.push(`For differentiation, call out ${positioningReasons[0].replace(/\.$/, "").toLowerCase()}.`);
  }
  if (cautions[0]) {
    lines.push(`Flag the watch-out early: ${cautions[0]}`);
  }

  return dedupeStrings(lines, 4);
}

function competitorMap(): Map<string, CompetitorProduct> {
  return new Map(
    getCompetitorProducts().map((product) => [
      `${normalizeId(product.brand)}::${normalizeSku(product.sku)}`,
      product,
    ]),
  );
}

function pseudoCompetitorFromRecord(record: CompetitorComparisonRecord): CompetitorProduct {
  const product = enrichCatalogProduct(
    normalizeCatalogProduct({
      sku: normalizeSku(record.competitorSku),
      name: tidy(record.competitorName) || normalizeSku(record.competitorSku),
      family: tidy(record.category) || "Unknown",
      category: tidy(record.category) || "Uncategorized",
      subcategory: tidy(record.category) || undefined,
      status: "active",
      summary: tidy(record.summary) || `${record.brand} ${record.competitorSku} reference record.`,
      features: record.features ?? [],
      notes: Array.isArray(record.notes) ? record.notes.join(" ") : undefined,
    }),
  );

  return {
    ...product,
    brand: tidy(record.brand) || "Unknown",
  };
}

function resolveCompetitor(record: CompetitorComparisonRecord): CompetitorProduct {
  const key = `${normalizeId(record.brand)}::${normalizeSku(record.competitorSku)}`;
  return competitorMap().get(key) || pseudoCompetitorFromRecord(record);
}

function computeCandidateScore(
  competitor: CompetitorProduct,
  wyrestorm: CatalogProduct,
): RankedCandidate {
  const competitorType = classifyCatalogProduct(competitor);
  const wyrestormType = classifyCatalogProduct(wyrestorm);
  const matrix = comparisonMatrix(competitor, wyrestorm);
  const inputAnalysis = analyzePortSet(competitor.inputs, wyrestorm.inputs);
  const outputAnalysis = analyzePortSet(competitor.outputs, wyrestorm.outputs);
  const ioBreakdown = buildIoBreakdown(inputAnalysis, outputAnalysis);

  const rejectCandidate = (
    rejectionReason: string,
    blockers: string[],
  ): RankedCandidate => {
    const decisionWorkflow: CompetitorCompareDecisionStep[] = [
      {
        id: "role",
        title: "Product role",
        weight: 15,
        status: "fail",
        summary: rejectionReason,
        detail: blockers[0],
      },
      {
        id: "transport",
        title: "Transport",
        weight: 15,
        status: "warn",
        summary: "Comparison stopped before a valid transport match could be established.",
      },
      {
        id: "inputs",
        title: "Inputs",
        weight: 20,
        status: statusForCoverageLevel(ioBreakdown.inputParity),
        summary: describePortAnalysis("Inputs", inputAnalysis),
      },
      {
        id: "outputs",
        title: "Outputs",
        weight: 15,
        status: statusForCoverageLevel(ioBreakdown.outputParity),
        summary: describePortAnalysis("Outputs", outputAnalysis),
      },
      {
        id: "workflow",
        title: "Workflow fit",
        weight: 20,
        status: "warn",
        summary: "Workflow fit was not scored because the base comparison was rejected.",
      },
      {
        id: "specs",
        title: "Spec headroom",
        weight: 15,
        status: "warn",
        summary: "Spec headroom was not scored because the base comparison was rejected.",
      },
    ];
    const matchBasis: CompetitorCompareMatchBasis = {
      method: "manual-review",
      classAlignment: false,
      transportAlignment: false,
      inputParity: ioBreakdown.inputParity,
      outputParity: ioBreakdown.outputParity,
      ioCoveragePercent: ioBreakdown.ioCoveragePercent,
      workflowCoveragePercent: 0,
      specCoveragePercent: 0,
      blockerCount: blockers.length,
      blockers,
      warningCount: 0,
      summary:
        blockers[0] ||
        "Manual review recommended because the product roles do not align cleanly.",
    };

    return {
      product: wyrestorm,
      score: 0,
      reasons: [rejectionReason],
      notes: blockers.slice(0, 6),
      ioSummary: `I/O coverage ${ioBreakdown.ioCoveragePercent}%`,
      matrix,
      decisionWorkflow,
      ioBreakdown,
      matchBasis,
      highlights: buildHighlights(matrix, ioBreakdown),
    };
  };

  if (areProductTypesCompatible(competitorType, wyrestormType)) {
    // Continue: scoring is driven by visible workflow steps below.
  } else {
    return rejectCandidate("Product role mismatch.", [
      `Rejected because ${wyrestorm.sku} is ${wyrestormType.label}, not ${competitorType.label}.`,
    ]);
  }

  const avAssessment = evaluateAvCompatibility(
    buildAvSignalProfile(competitor),
    buildAvSignalProfile(wyrestorm),
  );

  if (!avAssessment.compatible) {
    return rejectCandidate("AV transport or endpoint role mismatch.", avAssessment.blockers);
  }

  const competitorTags = tagsFor(competitor);
  const wyrestormTags = tagsFor(wyrestorm);
  let overlap = 0;
  competitorTags.forEach((tag) => {
    if (wyrestormTags.has(tag)) overlap += 1;
  });
  const featureCoverage = clamp01(overlap / Math.max(1, competitorTags.size));

  const competitorTransport = normalizeId(competitor.transport);
  const wyrestormTransport = normalizeId(wyrestorm.transport);
  let transportCoverage = 0.6;
  let transportStatus: CompetitorCompareDecisionStatus = "warn";
  let transportSummary =
    "Transport is not fully captured on the competitor record.";
  let transportDetail: string | undefined;

  if (competitorTransport && wyrestormTransport) {
    if (competitorTransport === wyrestormTransport) {
      transportCoverage = 1;
      transportStatus = "pass";
      transportSummary = `Transport aligns on ${wyrestorm.transport}.`;
      transportDetail = avAssessment.reasons[0];
    } else {
      transportCoverage = 0;
      transportStatus = "fail";
      transportSummary = `Transport differs (${competitor.transport || "unknown"} vs ${wyrestorm.transport || "unknown"}).`;
      transportDetail = "Transport mismatch should not be quoted as like-for-like.";
    }
  } else if (competitorTransport) {
    transportCoverage = 0.55;
    transportSummary = `Competitor transport is ${competitor.transport}, but WyreStorm transport is not fully captured.`;
  } else if (wyrestormTransport) {
    transportCoverage = 0.62;
    transportSummary = `Competitor transport is not fully captured; candidate transport is ${wyrestorm.transport}.`;
  }

  const wirelessAnalysis = analyzeFlagRequirement(
    "Collaboration feature set",
    competitor.wireless,
    wyrestorm.wireless,
    WIRELESS_FLAG_DEFS,
  );
  const usbAnalysis = analyzeFlagRequirement(
    "USB workflow",
    competitor.usb,
    wyrestorm.usb,
    USB_FLAG_DEFS,
  );
  const videoWorkflowAnalysis = analyzeFlagRequirement(
    "Advanced video workflow",
    competitor.video,
    wyrestorm.video,
    VIDEO_FLAG_DEFS,
  );
  const integrationAnalysis = analyzeFlagRequirement(
    "Integration feature set",
    competitor.integration,
    wyrestorm.integration,
    INTEGRATION_FLAG_DEFS,
  );
  const usbHostAnalysis = analyzeNumericRequirement(
    "USB host port count",
    competitor.usb?.hostPorts,
    wyrestorm.usb?.hostPorts,
  );
  const usbDeviceAnalysis = analyzeNumericRequirement(
    "USB device port count",
    competitor.usb?.devicePorts,
    wyrestorm.usb?.devicePorts,
  );
  const usbChargingAnalysis = analyzeNumericRequirement(
    "USB-C charging",
    competitor.usb?.usbCChargingWatts,
    wyrestorm.usb?.usbCChargingWatts,
    "W",
  );
  const relayAnalysis = analyzeNumericRequirement(
    "Relay count",
    competitor.integration?.relayCount,
    wyrestorm.integration?.relayCount,
  );
  const gpioAnalysis = analyzeNumericRequirement(
    "GPIO count",
    competitor.integration?.gpioCount,
    wyrestorm.integration?.gpioCount,
  );
  const controlAnalysis = analyzeListRequirement(
    "Control interfaces",
    competitor.control,
    wyrestorm.control,
  );
  const audioAnalysis = analyzeListRequirement(
    "Audio interfaces",
    competitor.audio,
    wyrestorm.audio,
  );

  const workflowAnalyses = [
    wirelessAnalysis,
    usbAnalysis,
    videoWorkflowAnalysis,
    integrationAnalysis,
    usbHostAnalysis,
    usbDeviceAnalysis,
    usbChargingAnalysis,
    relayAnalysis,
    gpioAnalysis,
    controlAnalysis,
    audioAnalysis,
  ];
  const workflowCoverage = averageRelevant(workflowAnalyses, Math.max(0.55, featureCoverage));
  const workflowIssues = dedupeStrings(
    [...pickRequirementIssues(workflowAnalyses, 4), ...avAssessment.warnings],
    4,
  );
  const workflowStatus = avAssessment.warnings.length
    ? "warn"
    : statusForCoverageRatio(
        workflowCoverage,
        workflowAnalyses.some((item) => item.relevant),
      );
  const workflowSummary = workflowAnalyses.some((item) => item.relevant)
    ? `Workflow coverage ${percentFromRatio(workflowCoverage)}% across the captured collaboration, USB, control, and integration requirements.`
    : "Workflow-specific requirements are not fully captured on the competitor record.";

  const resolutionAnalysis = analyzeRankedRequirement(
    "Video ceiling",
    parseResolutionRank(competitor.video?.maxResolution),
    parseResolutionRank(wyrestorm.video?.maxResolution),
    competitor.video?.maxResolution,
    wyrestorm.video?.maxResolution,
  );
  const bandwidthAnalysis = analyzeNumericRequirement(
    "Bandwidth class",
    competitor.video?.bandwidthGbps,
    wyrestorm.video?.bandwidthGbps,
    "Gbps",
  );
  const hdrAnalysis = analyzeBooleanRequirement(
    "HDR",
    competitor.video?.hdr,
    wyrestorm.video?.hdr,
  );
  const hdmiAnalysis = analyzeRankedRequirement(
    "HDMI generation",
    parseHdmiRank(competitor.video?.hdmi),
    parseHdmiRank(wyrestorm.video?.hdmi),
    competitor.video?.hdmi,
    wyrestorm.video?.hdmi,
  );
  const hdcpAnalysis = analyzeRankedRequirement(
    "HDCP generation",
    parseHdcpRank(competitor.video?.hdcpVersion),
    parseHdcpRank(wyrestorm.video?.hdcpVersion),
    competitor.video?.hdcpVersion,
    wyrestorm.video?.hdcpVersion,
  );
  const networkAnalysis = analyzeRankedRequirement(
    "AVoIP network speed",
    parseNetworkSpeedRank(competitor.distance?.networkSpeed),
    parseNetworkSpeedRank(wyrestorm.distance?.networkSpeed),
    competitor.distance?.networkSpeed,
    wyrestorm.distance?.networkSpeed,
  );
  const hdbasetAnalysis = analyzeRankedRequirement(
    "HDBaseT class",
    parseHdbasetClassRank(competitor.distance?.hdbasetClass),
    parseHdbasetClassRank(wyrestorm.distance?.hdbasetClass),
    competitor.distance?.hdbasetClass,
    wyrestorm.distance?.hdbasetClass,
  );
  const distanceAnalysis = analyzeNumericRequirement(
    "Distance",
    competitor.distance?.meters,
    wyrestorm.distance?.meters,
    "m",
  );
  const latencyAnalysis = analyzeRankedRequirement(
    "Latency class",
    parseLatencyRank(competitor.latency),
    parseLatencyRank(wyrestorm.latency),
    competitor.latency,
    wyrestorm.latency,
  );

  const specAnalyses = [
    resolutionAnalysis,
    bandwidthAnalysis,
    hdrAnalysis,
    hdmiAnalysis,
    hdcpAnalysis,
    networkAnalysis,
    hdbasetAnalysis,
    distanceAnalysis,
    latencyAnalysis,
  ];
  const specCoverage = averageRelevant(specAnalyses, 0.6);
  const specIssues = pickRequirementIssues(specAnalyses, 4);
  const specStatus = statusForCoverageRatio(
    specCoverage,
    specAnalyses.some((item) => item.relevant),
  );
  const specSummary = specAnalyses.some((item) => item.relevant)
    ? `Spec headroom ${percentFromRatio(specCoverage)}% against the captured video, distance, and transport-detail baseline.`
    : "Spec ceiling is not fully captured on the competitor record.";

  const classAlignment = true;
  const matchMethod = chooseMatchMethod({
    classAlignment,
    transportCoverage,
    inputLevel: ioBreakdown.inputParity,
    outputLevel: ioBreakdown.outputParity,
    ioCoverage: ioBreakdown.ioCoveragePercent / 100,
    workflowCoverage,
    specCoverage,
    warningCount: avAssessment.warnings.length,
  });

  let score = 0;
  score += 18;
  score += Math.round(14 * transportCoverage);
  score += Math.round(36 * (ioBreakdown.ioCoveragePercent / 100));
  score += Math.round(16 * workflowCoverage);
  score += Math.round(12 * specCoverage);
  score += Math.round(featureCoverage * 4);

  if (ioBreakdown.inputParity === "exact") score += 2;
  if (ioBreakdown.outputParity === "exact") score += 2;
  if (ioBreakdown.inputParity === "covers") score += 1;
  if (ioBreakdown.outputParity === "covers") score += 1;
  score -= Math.min(9, avAssessment.warnings.length * 3);

  if (matchMethod === "direct-replacement") {
    score = Math.max(score, 86);
  } else if (matchMethod === "covers-brief") {
    score = Math.max(score, 75);
  } else if (matchMethod === "functional-alternative") {
    score = Math.max(score, 60);
    score = Math.min(score, 84);
  } else {
    score = Math.min(score, 69);
  }

  const bounded = Math.max(0, Math.min(100, score));
  const decisionWorkflow: CompetitorCompareDecisionStep[] = [
    {
      id: "role",
      title: "Product role",
      weight: 15,
      status: "pass",
      summary: `${competitorType.label} compared against ${wyrestormType.label}.`,
      detail:
        normalizeId(competitor.category) === normalizeId(wyrestorm.category) &&
        tidy(competitor.category)
          ? `Category aligns on ${wyrestorm.category}.`
          : `Type gate passed even though category naming differs.`,
    },
    {
      id: "transport",
      title: "Transport",
      weight: 15,
      status: transportStatus,
      summary: transportSummary,
      detail: transportDetail,
    },
    {
      id: "inputs",
      title: "Inputs",
      weight: 20,
      status: statusForCoverageLevel(ioBreakdown.inputParity),
      summary: describePortAnalysis("Inputs", inputAnalysis),
      detail:
        inputAnalysis.shortfalls.length > 0
          ? `Shortfall: ${inputAnalysis.shortfalls.slice(0, 3).join(", ")}.`
          : inputAnalysis.extras.length > 0
            ? `Extras: ${inputAnalysis.extras.slice(0, 3).join(", ")}.`
            : undefined,
    },
    {
      id: "outputs",
      title: "Outputs",
      weight: 15,
      status: statusForCoverageLevel(ioBreakdown.outputParity),
      summary: describePortAnalysis("Outputs", outputAnalysis),
      detail:
        outputAnalysis.shortfalls.length > 0
          ? `Shortfall: ${outputAnalysis.shortfalls.slice(0, 3).join(", ")}.`
          : outputAnalysis.extras.length > 0
            ? `Extras: ${outputAnalysis.extras.slice(0, 3).join(", ")}.`
            : undefined,
    },
    {
      id: "workflow",
      title: "Workflow fit",
      weight: 20,
      status: workflowStatus,
      summary: workflowSummary,
      detail: workflowIssues[0],
    },
    {
      id: "specs",
      title: "Spec headroom",
      weight: 15,
      status: specStatus,
      summary: specSummary,
      detail: specIssues[0],
    },
  ];

  const matchBasis: CompetitorCompareMatchBasis = {
    method: matchMethod,
    classAlignment,
    transportAlignment: transportStatus === "pass",
    inputParity: ioBreakdown.inputParity,
    outputParity: ioBreakdown.outputParity,
    ioCoveragePercent: ioBreakdown.ioCoveragePercent,
    workflowCoveragePercent: percentFromRatio(workflowCoverage),
    specCoveragePercent: percentFromRatio(specCoverage),
    blockerCount: avAssessment.blockers.length,
    blockers: avAssessment.blockers,
    warningCount: avAssessment.warnings.length,
    summary: matchBasisSummary(
      matchMethod,
      ioBreakdown,
      workflowCoverage,
      specCoverage,
    ),
  };

  const reasons = dedupeStrings(
    [
      decisionWorkflow[0].summary,
      decisionWorkflow[1].status === "pass" ? decisionWorkflow[1].summary : "",
      decisionWorkflow[2].status === "pass" ? decisionWorkflow[2].summary : "",
      decisionWorkflow[3].status === "pass" ? decisionWorkflow[3].summary : "",
      workflowCoverage >= 0.65 ? decisionWorkflow[4].summary : "",
      specCoverage >= 0.65 ? decisionWorkflow[5].summary : "",
      `Feature overlap ${percentFromRatio(featureCoverage)}%.`,
      ...avAssessment.reasons,
    ],
    6,
  );
  const notes = dedupeStrings(
    [
      ...decisionWorkflow
        .filter((step) => step.status !== "pass")
        .flatMap((step) => [step.summary, step.detail ?? ""]),
      ...avAssessment.warnings,
    ],
    6,
  );

  return {
    product: wyrestorm,
    score: bounded,
    reasons,
    notes,
    ioSummary: `I/O coverage ${ioBreakdown.ioCoveragePercent}%`,
    matrix,
    decisionWorkflow,
    ioBreakdown,
    matchBasis,
    highlights: buildHighlights(matrix, ioBreakdown),
  };
}

function rankWyrestormCandidates(competitor: CompetitorProduct): RankedCandidate[] {
  const catalog = getCatalogProducts();
  const competitorType = classifyCatalogProduct(competitor);

  return catalog
    .filter((product) =>
      areProductTypesCompatible(competitorType, classifyCatalogProduct(product)),
    )
    .map((product) => computeCandidateScore(competitor, product))
    .filter(
      (candidate) =>
        candidate.score >= MINIMUM_AUTOMATIC_MATCH_SCORE &&
        candidate.matchBasis.method !== "manual-review",
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.product.sku.localeCompare(right.product.sku),
    );
}

function reviewWyrestormCandidates(competitor: CompetitorProduct): RankedCandidate[] {
  const catalog = getCatalogProducts();
  const competitorType = classifyCatalogProduct(competitor);

  return catalog
    .filter((product) =>
      areProductTypesCompatible(competitorType, classifyCatalogProduct(product)),
    )
    .map((product) => computeCandidateScore(competitor, product))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.product.sku.localeCompare(right.product.sku),
    );
}

function familyHintCandidates(
  record: CompetitorComparisonRecord,
  competitor: CompetitorProduct,
): RankedCandidate[] {
  const families = normalizeFamilies(record.recommendedFamilies);
  if (families.length === 0) return [];

  return getCatalogProducts()
    .map((product) => {
      const hintScore = familyHintScore(product, families);
      if (hintScore <= 0) return null;

      const base = computeCandidateScore(competitor, product);
      if (!base.matchBasis.classAlignment) {
        return null;
      }
      const floor = 34 + hintScore * 4;
      return {
        ...base,
        score: Math.max(base.score, floor),
        reasons: dedupeStrings(
          [
            `Family-direction hint aligns with ${product.family || product.category}.`,
            ...base.reasons,
          ],
          6,
        ),
        notes: dedupeStrings(
          [
            ...base.notes,
            `This candidate comes from the stored ${families.join(", ")} direction and still needs a detailed parity check.`,
          ],
          6,
        ),
        matchBasis: {
          ...base.matchBasis,
          method: "manual-review",
          summary: `Closest ${product.family || product.category} family option from the stored comparison direction. Verify detailed parity before quoting.`,
        },
      };
    })
    .filter((candidate): candidate is RankedCandidate => Boolean(candidate))
    .sort(
      (left, right) =>
        right.score - left.score || left.product.sku.localeCompare(right.product.sku),
    )
    .slice(0, 6);
}

function labelForRankedCandidate(
  candidate: RankedCandidate,
  index: number,
): string {
  if (index > 0 && candidate.matchBasis.method === "direct-replacement") {
    return "Also consider";
  }

  switch (candidate.matchBasis.method) {
    case "direct-replacement":
      return "Direct replacement";
    case "covers-brief":
      return "Covers the brief";
    case "functional-alternative":
      return "Functional alternative";
    default:
      return index === 0 ? "Closest available" : "Also review";
  }
}

function optionId(
  record: CompetitorComparisonRecord,
  wyrestormSku: string,
): string {
  return `${normalizeId(record.brand)}::${normalizeSku(record.competitorSku)}::${normalizeSku(wyrestormSku)}`;
}

function buildOption(
  record: CompetitorComparisonRecord,
  competitor: CompetitorProduct,
  candidate: RankedCandidate,
  label: string,
  sourceType: CompetitorCompareOptionSource,
): CompetitorCompareOption {
  const wyrestorm = candidate.product;
  const positioning = explainWyreStormAdvantage(wyrestorm, competitor);
  return {
    id: optionId(record, wyrestorm.sku),
    label,
    wyrestormSku: wyrestorm.sku,
    wyrestormName: tidy(wyrestorm.name) || undefined,
    wyrestormCategory: formatWyrestormCategory(wyrestorm),
    fitScore: candidate.score,
    fitConfidence: scoreToConfidence(candidate.score),
    reasons: candidate.reasons,
    cautions: candidate.notes,
    positioningSummary: positioning.summary,
    positioningReasons: positioning.reasons.slice(0, 4),
    salesStory: buildSalesStory(
      label,
      record.competitorSku,
      wyrestorm.sku,
      candidate.reasons,
      candidate.notes,
      positioning.reasons,
    ),
    matrix: candidate.matrix,
    decisionWorkflow: candidate.decisionWorkflow,
    ioBreakdown: candidate.ioBreakdown,
    matchBasis: candidate.matchBasis,
    highlights: candidate.highlights,
    sourceType,
  };
}

function fallbackOption(
  record: CompetitorComparisonRecord,
  sourceType: CompetitorCompareOptionSource,
): CompetitorCompareOption {
  const product = findCatalogProductBySku(record.wyrestormSku);
  const competitor = resolveCompetitor(record);
  if (product) {
    const ranked = computeCandidateScore(competitor, product);
    return buildOption(
      record,
      competitor,
      {
        ...ranked,
        score:
          Number(record.matchScore) ||
          ranked.score ||
          (record.confidence === "High"
            ? 82
            : record.confidence === "Medium"
              ? 62
              : 38),
        reasons: dedupeStrings(
          [
            tidy(record.rationale),
            `${product.sku} is the currently stored WyreStorm mapping.`,
            ...ranked.reasons,
          ],
          6,
        ),
        notes: dedupeStrings(
          [...(record.notes ?? []), ...ranked.notes],
          6,
        ),
      },
      sourceType === "manual" ? "Saved fallback" : "Current mapping",
      sourceType,
    );
  }

  return {
    id: optionId(record, record.wyrestormSku),
    label: sourceType === "manual" ? "Saved fallback" : "Current mapping",
    wyrestormSku: record.wyrestormSku,
    wyrestormName: record.wyrestormName,
    wyrestormCategory: record.wyrestormCategory || "Manual / unverified",
    fitScore: Number(record.matchScore) || 34,
    fitConfidence: record.confidence || "Low",
    reasons: dedupeStrings([tidy(record.rationale) || "Stored comparison mapping."], 3),
    cautions: dedupeStrings(record.notes ?? [], 4),
    positioningSummary:
      "Position carefully and verify the exact WyreStorm SKU before customer commitment.",
    positioningReasons: [],
    salesStory: dedupeStrings(
      [
        `Use ${record.wyrestormSku} as a manual fallback only after confirming the exact competitor SKU.`,
        record.notes?.[0],
      ],
      3,
    ),
    matrix: [
      {
        id: "category",
        label: "Category",
        competitorValue: record.category || "Unknown",
        wyrestormValue: record.wyrestormCategory || "Manual / unverified",
        status: "review",
        note: "Stored mapping needs a verified catalog comparison matrix.",
      },
    ],
    decisionWorkflow: [
      {
        id: "role",
        title: "Product role",
        weight: 15,
        status: "warn",
        summary: "Stored mapping exists, but the live comparison data is incomplete.",
        detail: "Verify the competitor SKU and the WyreStorm SKU before treating this as a like-for-like result.",
      },
    ],
    ioBreakdown: {
      competitorInputTotal: 0,
      wyrestormInputTotal: 0,
      competitorOutputTotal: 0,
      wyrestormOutputTotal: 0,
      inputCoveragePercent: 0,
      outputCoveragePercent: 0,
      ioCoveragePercent: 0,
      inputParity: "unknown",
      outputParity: "unknown",
      overallParity: "unknown",
      inputs: [],
      outputs: [],
      summary: "Competitor I/O is not captured on this stored mapping.",
    },
    matchBasis: {
      method: "manual-review",
      classAlignment: false,
      transportAlignment: false,
      inputParity: "unknown",
      outputParity: "unknown",
      ioCoveragePercent: 0,
      workflowCoveragePercent: 0,
      specCoveragePercent: 0,
      blockerCount: 1,
      blockers: ["Stored mapping needs a verified catalog comparison before it can be trusted."],
      warningCount: 1,
      summary:
        "Stored fallback only. Verify the SKU pair before presenting this as a valid replacement.",
    },
    highlights: {
      matches: [],
      gaps: ["Stored mapping needs a verified catalog comparison matrix."],
      extras: [],
      reviews: ["Competitor data is incomplete, so this result is a manual fallback only."],
    },
    sourceType,
  };
}

export function buildComparisonOptions(
  record: CompetitorComparisonRecord,
  sourceType: CompetitorCompareOptionSource,
): CompetitorCompareOption[] {
  const competitor = resolveCompetitor(record);
  const ranked = rankWyrestormCandidates(competitor);
  const reviewRanked = reviewWyrestormCandidates(competitor);
  const familyRanked = familyHintCandidates(record, competitor);
  const out: CompetitorCompareOption[] = [];
  const seen = new Set<string>();

  const pushOption = (option: CompetitorCompareOption) => {
    const key = normalizeSku(option.wyrestormSku);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(option);
  };

  if (sourceType === "manual") {
    pushOption(fallbackOption(record, sourceType));
  }

  ranked.slice(0, 4).forEach((candidate, index) => {
    pushOption(
      buildOption(
        record,
        competitor,
        candidate,
        labelForRankedCandidate(candidate, index),
        sourceType === "lookup" ? "lookup" : "curated",
      ),
    );
  });

  if (out.length < 3) {
    familyRanked.forEach((candidate, index) => {
      if (out.length >= 3) return;
      pushOption(
        buildOption(
          record,
          competitor,
          candidate,
          index === 0 ? "Closest family option" : "Family fallback",
          sourceType === "lookup" ? "lookup" : "curated",
        ),
      );
    });
  }

  if (out.length < 3) {
    reviewRanked
      .filter((candidate) => candidate.matchBasis.method === "manual-review")
      .forEach((candidate, index) => {
        if (out.length >= 3) return;
        pushOption(
          buildOption(
            record,
            competitor,
            candidate,
            labelForRankedCandidate(candidate, ranked.length + familyRanked.length + index),
            sourceType === "lookup" ? "lookup" : "curated",
          ),
        );
      });
  }

  if (out.length === 0) {
    pushOption(fallbackOption(record, sourceType));
  } else if (
    sourceType !== "manual" &&
    normalizeSku(record.wyrestormSku) &&
    !seen.has(normalizeSku(record.wyrestormSku))
  ) {
    pushOption(fallbackOption(record, sourceType));
  }

  return out.slice(0, 4);
}

export function suggestedWyrestormSkusForRecords(
  records: Array<{
    comparison: CompetitorComparisonRecord;
    sourceType: CompetitorCompareOptionSource;
  }>,
  limit = 6,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of records) {
    for (const option of buildComparisonOptions(item.comparison, item.sourceType)) {
      const sku = normalizeSku(option.wyrestormSku);
      if (!sku || seen.has(sku)) continue;
      seen.add(sku);
      out.push(sku);
      if (out.length >= limit) return out;
    }
  }

  return out;
}

export function recommendedFamiliesForComparison(
  record: CompetitorComparisonRecord,
): DiscoveryProductFamily[] {
  const product = findCatalogProductBySku(record.wyrestormSku);
  if (product) return inferRecommendedFamilies(product);
  return normalizeFamilies(record.recommendedFamilies);
}
