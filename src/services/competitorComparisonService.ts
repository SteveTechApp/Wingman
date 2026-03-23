import { compareStructuredCompetitor } from "@/competitor/fit";
import {
  buildStructuredFitMap,
  sanitizeCompetitorForMatching,
} from "@/competitor/matchingSupport";
import compareSeed from "@/data/catalog/competitorCompareSeed";
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
import { getCompetitorProducts, type CompetitorProduct } from "@/competitor/repository";
import type {
  CompareConfidence,
  DiscoveryProductFamily,
  ProjectCompareRecord,
} from "@/features/projects/projectStore";
import {
  lookupCompetitorProduct,
  type CompetitorLookupProvenance,
  type CompetitorLookupRecord,
  type CompetitorLookupResult,
} from "@/services/competitor/lookupService";
import { getLiveProductDataToken } from "@/services/liveProductDataStore";
import {
  assessComparisonIntelligence,
  type ComparisonIntelligenceAssessment,
  type IntelligenceSupportAction,
} from "@/services/productIntelligenceAdvisor";
import {
  buildAvSignalProfile,
  evaluateAvCompatibility,
} from "@/services/avLogicEngine";
import { inferCompetitorKnowledgeProfile } from "../competitor/brandKnowledge";
import { inferComparisonDomain, inferComparisonUseCase } from "@/competitor/fit/comparisonRules";
import {
  buildEvidenceContextLines,
  buildProductEvidenceDigest,
  type ProductEvidenceDigest,
} from "@/services/liveProductEvidenceService";
import type { ComparisonDomain, ComparisonUseCase } from "@/competitor/fit/types";

export type ComparisonProvenance = {
  mode: "curated" | "lookup";
  source: string;
  label: string;
  fetchedAt: string;
  cacheHit?: boolean;
  sourceUrl?: string;
};

export type ComparisonIntelligence = {
  score: number;
  confidence: CompareConfidence;
  escalationRequired: boolean;
  escalationReasons: string[];
  recommendations: string[];
  supportActions: IntelligenceSupportAction[];
  warnings: string[];
  summary: string;
  evidenceContext: string[];
  competitorEvidence?: ProductEvidenceDigest;
  wyrestormEvidence?: ProductEvidenceDigest;
  fetchedAt: string;
  competitorStatus?: string;
  wyrestormStatus?: string;
};

export type CompetitorComparisonRecord = {
  brand: string;
  competitorSku: string;
  competitorName?: string;
  category: string;
  comparisonDomain?: ComparisonDomain;
  comparisonUseCase?: ComparisonUseCase;
  summary: string;
  features: string[];
  ioComparison?: string;
  wyrestormSku: string;
  wyrestormName?: string;
  wyrestormCategory: string;
  wyrestormVerified?: boolean;
  confidence: CompareConfidence;
  matchScore?: number;
  rationale: string;
  recommendedFamilies: DiscoveryProductFamily[];
  notes: string[];
  provenance?: ComparisonProvenance;
  intelligence?: ComparisonIntelligence;
};

export type LookupAndCompareResult = {
  lookup: CompetitorLookupResult;
  records: CompetitorComparisonRecord[];
};

type RankedCandidate = {
  product: CatalogProduct;
  score: number;
  reasons: string[];
  notes: string[];
  ioSummary: string;
};

type SeedRecord = {
  brand?: string;
  competitorSku?: string;
  category?: string;
  summary?: string;
  features?: string[];
  wyrestormSku?: string;
  wyrestormCategory?: string;
  confidence?: CompareConfidence;
  rationale?: string;
  recommendedFamilies?: DiscoveryProductFamily[];
  notes?: string[];
};

const MINIMUM_AUTOMATIC_MATCH_SCORE = 75;
const MINIMUM_STRUCTURED_AUTOMATIC_SCORE = 45;

let cachedCuratedRecords: CompetitorComparisonRecord[] | null = null;
let cachedCuratedRecordsToken = "";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeId(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function normalizeSku(value: unknown): string {
  return tidy(value).toUpperCase();
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

function formatWyrestormCategory(product: CatalogProduct): string {
  return [product.family, product.category, product.subcategory]
    .map((value) => tidy(value))
    .filter(Boolean)
    .join(" / ");
}

function resolveWyrestormReference(input?: {
  sku?: string;
  category?: string;
}): {
  sku: string;
  name?: string;
  category: string;
  verified: boolean;
  notes: string[];
} {
  const sku = normalizeSku(input?.sku);
  const catalogProduct = sku ? findCatalogProductBySku(sku) : undefined;

  if (catalogProduct) {
    return {
      sku: catalogProduct.sku,
      name: tidy(catalogProduct.name) || undefined,
      category: formatWyrestormCategory(catalogProduct),
      verified: true,
      notes: [],
    };
  }

  const hintedReference = tidy(input?.sku) || tidy(input?.category);
  return {
    sku: "Manual review required",
    name: undefined,
    category: "Unverified / manual review",
    verified: false,
    notes: hintedReference
      ? [`Stored comparison reference "${hintedReference}" is not a verified WyreStorm catalog SKU.`]
      : ["No verified WyreStorm catalog SKU is currently confirmed for this comparison."],
  };
}

function toRecordId(brand: string, sku: string): string {
  return `${normalizeId(brand)}::${normalizeSku(sku)}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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

function totalCount(map: Map<string, number>): number {
  let total = 0;
  for (const value of map.values()) total += value;
  return total;
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

  if (matched.length > 0) {
    reasons.push(`${label} coverage ${Math.round(coverage * 100)}%.`);
  }

  const missing = needed.filter((value) => !available.has(normalizeId(value)));
  if (missing.length > 0) {
    notes.push(`${label} gap: ${missing.slice(0, 3).join(", ")}.`);
  }

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
    Number.isFinite(product.video?.bandwidthGbps) ? `${product.video?.bandwidthGbps}gbps` : "",
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

function formatCompetitorCategory(product: CatalogProduct): string {
  return [product.category, product.subcategory]
    .map((value) => tidy(value))
    .filter(Boolean)
    .join(" / ") || "Uncategorized";
}

function inferComparisonDomainForProduct(product: CatalogProduct): ComparisonDomain {
  const textBlob = [
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    ...(product.features ?? []),
    ...(product.control ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (/\bvideo wall\b|\bvideowall\b|\bwall processor\b|\bwall feed\b/.test(textBlob)) return "VIDEO_WALL";
  if (/\bmatrix\b|\bmodular matrix\b|\bmatrix switch\b|\bmatrix switching\b/.test(textBlob)) return "MATRIX";
  if (/\bextender\b|\bpoint to point\b|\bhdbaset\b|\btps\b|\btpx\b/.test(textBlob)) return "EXTENDER";
  if (/\bcontrol\b|\bcontroller\b|\bmanagement\b/.test(textBlob)) return "CONTROL";
  if (/\bpresentation switcher\b|\bcollaboration\b|\bbyod\b|\bbyom\b|\bucx\b|\bdmps\b|\bhd-ps\b|\bomni\b|\bome\b/.test(textBlob)) {
    return "PRESENTATION";
  }
  if (/\bnvx\b|\bnav\b|\bubex\b|\bvinx\b|\bnetworkhd\b|\bavoip\b|\bsdvoe\b|\bencoder\b|\bdecoder\b/.test(textBlob)) {
    return "AVOIP";
  }
  return "UNKNOWN";
}

function inferComparisonUseCaseForProduct(product: CatalogProduct, domain: ComparisonDomain): ComparisonUseCase {
  const textBlob = [
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    ...(product.features ?? []),
    ...(product.control ?? []),
    ...(product.audio ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (/\bmultiview\b|\bmulti-view\b|\bwindowing\b/.test(textBlob)) return "MULTIVIEW";
  if (/\bvideo wall\b|\bvideowall\b|\bwall processor\b|\bwall feed\b/.test(textBlob)) return "WALL_PROCESSING";
  if (/\bcollaboration\b|\bbyod\b|\bbyom\b|\busb-c\b|\bwireless presentation\b|\bhuddle\b/.test(textBlob)) return "COLLABORATION";
  if (/\bextension\b|\bextender\b|\bpoint to point\b|\blong reach\b/.test(textBlob)) return "EXTENSION";
  if (domain === "MATRIX") return "ROUTING";
  if (domain === "AVOIP") return "DISTRIBUTION";
  if (domain === "EXTENDER") return "EXTENSION";
  if (domain === "VIDEO_WALL") return "WALL_PROCESSING";
  if (domain === "CONTROL") return "CONTROL";
  return "UNKNOWN";
}

function scoreToConfidence(score: number): CompareConfidence {
  if (score >= 75) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function structuredLaneAdjustment(score: number): number {
  if (score >= 85) return 8;
  if (score >= 70) return 4;
  if (score >= 55) return 1;
  return -6;
}

function computeCandidateScore(competitor: CatalogProduct, wyrestorm: CatalogProduct): RankedCandidate {
  const reasons: string[] = [];
  const notes: string[] = [];
  let score = 0;
  const competitorType = classifyCatalogProduct(competitor);
  const wyrestormType = classifyCatalogProduct(wyrestorm);

  if (areProductTypesCompatible(competitorType, wyrestormType)) {
    score += 12;
    reasons.push(`Type alignment (${wyrestormType.label}).`);
  } else {
    return {
      product: wyrestorm,
      score: 0,
      reasons: ["Type mismatch"],
      notes: [`Rejected because ${wyrestorm.sku} is ${wyrestormType.label}, not ${competitorType.label}.`],
      ioSummary: "I/O coverage 0%",
    };
  }

  const avAssessment = evaluateAvCompatibility(
    buildAvSignalProfile(competitor),
    buildAvSignalProfile(wyrestorm),
  );

  if (!avAssessment.compatible) {
    return {
      product: wyrestorm,
      score: 0,
      reasons: ["AV rule mismatch"],
      notes: avAssessment.blockers,
      ioSummary: "I/O coverage 0%",
    };
  }

  score += avAssessment.scoreDelta;
  reasons.push(...avAssessment.reasons);
  notes.push(...avAssessment.warnings);

  if (normalizeId(competitor.family) === normalizeId(wyrestorm.family) && tidy(competitor.family)) {
    score += 6;
    reasons.push(`Family alignment (${wyrestorm.family}).`);
  }

  if (normalizeId(competitor.category) === normalizeId(wyrestorm.category) && tidy(competitor.category)) {
    score += 4;
    reasons.push(`Category alignment (${wyrestorm.category}).`);
  }

  if (normalizeId(competitor.transport) && normalizeId(competitor.transport) === normalizeId(wyrestorm.transport)) {
    score += 16;
    reasons.push(`Transport alignment (${wyrestorm.transport}).`);
  } else if (normalizeId(competitor.transport)) {
    notes.push(`Transport differs (${competitor.transport || "unknown"} vs ${wyrestorm.transport || "unknown"}).`);
  }

  const competitorTags = tagsFor(competitor);
  const wyrestormTags = tagsFor(wyrestorm);
  let overlap = 0;
  competitorTags.forEach((tag) => {
    if (wyrestormTags.has(tag)) overlap += 1;
  });

  const featureCoverage = clamp01(overlap / Math.max(1, competitorTags.size));
  score += Math.round(featureCoverage * 8);
  reasons.push(`Feature overlap ${Math.round(featureCoverage * 100)}%.`);

  const inputCoverage = scorePortCoverage(
    asPortMap(competitor.inputs),
    asPortMap(wyrestorm.inputs),
    "Input",
    reasons,
    notes,
  );
  const outputCoverage = scorePortCoverage(
    asPortMap(competitor.outputs),
    asPortMap(wyrestorm.outputs),
    "Output",
    reasons,
    notes,
  );

  const ioCoverage = clamp01((inputCoverage + outputCoverage) / 2);
  score += Math.round(ioCoverage * 36);

  score += scoreCapabilityFlags(
    "Wireless / collaboration",
    competitor.wireless,
    wyrestorm.wireless,
    WIRELESS_FLAG_DEFS,
    4,
    reasons,
    notes,
  );
  score += scoreCapabilityFlags(
    "USB workflow",
    competitor.usb,
    wyrestorm.usb,
    USB_FLAG_DEFS,
    4,
    reasons,
    notes,
  );
  score += scoreCapabilityFlags(
    "Advanced video workflow",
    competitor.video,
    wyrestorm.video,
    VIDEO_FLAG_DEFS,
    3,
    reasons,
    notes,
  );
  score += scoreCapabilityFlags(
    "Integration depth",
    competitor.integration,
    wyrestorm.integration,
    INTEGRATION_FLAG_DEFS,
    3,
    reasons,
    notes,
  );
  score += scoreNumericRequirement(
    "USB host ports",
    competitor.usb?.hostPorts,
    wyrestorm.usb?.hostPorts,
    2,
    reasons,
    notes,
  );
  score += scoreNumericRequirement(
    "USB device ports",
    competitor.usb?.devicePorts,
    wyrestorm.usb?.devicePorts,
    2,
    reasons,
    notes,
  );
  score += scoreNumericRequirement(
    "USB-C charging",
    competitor.usb?.usbCChargingWatts,
    wyrestorm.usb?.usbCChargingWatts,
    2,
    reasons,
    notes,
    "W",
  );
  score += scoreNumericRequirement(
    "Relay count",
    competitor.integration?.relayCount,
    wyrestorm.integration?.relayCount,
    1,
    reasons,
    notes,
  );
  score += scoreNumericRequirement(
    "GPIO count",
    competitor.integration?.gpioCount,
    wyrestorm.integration?.gpioCount,
    1,
    reasons,
    notes,
  );

  const controlCoverage = overlapRatio(competitor.control ?? [], wyrestorm.control ?? []);
  if ((competitor.control ?? []).length > 0) {
    score += Math.round(controlCoverage * 6);
    if (controlCoverage > 0) {
      reasons.push(`Control overlap ${Math.round(controlCoverage * 100)}%.`);
    } else {
      notes.push("Control interfaces do not clearly align.");
    }
  }

  const audioCoverage = overlapRatio(competitor.audio ?? [], wyrestorm.audio ?? []);
  if ((competitor.audio ?? []).length > 0) {
    score += Math.round(audioCoverage * 4);
    if (audioCoverage > 0) {
      reasons.push(`Audio feature overlap ${Math.round(audioCoverage * 100)}%.`);
    } else {
      notes.push("Audio connectivity does not clearly align.");
    }
  }

  const compRes = parseResolutionRank(competitor.video?.maxResolution);
  const wrRes = parseResolutionRank(wyrestorm.video?.maxResolution);
  if (compRes > 0 && wrRes > 0) {
    if (wrRes >= compRes) {
      score += 6;
      reasons.push(`Video ceiling aligns (${wyrestorm.video?.maxResolution || "N/A"}).`);
    } else {
      const penalty = Math.min(5, Math.max(2, compRes - wrRes));
      score += 6 - penalty;
      notes.push(`Video ceiling below competitor baseline (${wyrestorm.video?.maxResolution || "N/A"}).`);
    }
  } else {
    notes.push("Video specs incomplete; no score credit awarded.");
  }

  if (competitor.video?.hdr && wyrestorm.video?.hdr) {
    score += 2;
    reasons.push("HDR support aligns.");
  } else if (competitor.video?.hdr && !wyrestorm.video?.hdr) {
    notes.push("Competitor lists HDR but candidate does not.");
  }

  const compBandwidth = parseBandwidth(competitor.video?.bandwidthGbps);
  const wrBandwidth = parseBandwidth(wyrestorm.video?.bandwidthGbps);
  if (compBandwidth > 0 && wrBandwidth > 0) {
    if (wrBandwidth >= compBandwidth) {
      score += 3;
      reasons.push(`Bandwidth class aligns (${wrBandwidth} Gbps).`);
    } else {
      notes.push(`Bandwidth below competitor baseline (${wrBandwidth} vs ${compBandwidth} Gbps).`);
    }
  }

  const compHdmi = parseHdmiRank(competitor.video?.hdmi);
  const wrHdmi = parseHdmiRank(wyrestorm.video?.hdmi);
  if (compHdmi > 0 && wrHdmi > 0) {
    if (wrHdmi >= compHdmi) {
      score += 3;
      reasons.push(`HDMI generation aligns (${wyrestorm.video?.hdmi || "N/A"}).`);
    } else {
      notes.push(`HDMI generation below competitor baseline (${wyrestorm.video?.hdmi || "N/A"}).`);
    }
  }

  score += scoreRankedRequirement(
    "HDCP generation",
    parseHdcpRank(competitor.video?.hdcpVersion),
    parseHdcpRank(wyrestorm.video?.hdcpVersion),
    competitor.video?.hdcpVersion,
    wyrestorm.video?.hdcpVersion,
    2,
    reasons,
    notes,
  );
  score += scoreRankedRequirement(
    "AVoIP network speed",
    parseNetworkSpeedRank(competitor.distance?.networkSpeed),
    parseNetworkSpeedRank(wyrestorm.distance?.networkSpeed),
    competitor.distance?.networkSpeed,
    wyrestorm.distance?.networkSpeed,
    2,
    reasons,
    notes,
  );
  score += scoreRankedRequirement(
    "HDBaseT class",
    parseHdbasetClassRank(competitor.distance?.hdbasetClass),
    parseHdbasetClassRank(wyrestorm.distance?.hdbasetClass),
    competitor.distance?.hdbasetClass,
    wyrestorm.distance?.hdbasetClass,
    2,
    reasons,
    notes,
  );

  const compLatency = parseLatencyRank(competitor.latency);
  const wrLatency = parseLatencyRank(wyrestorm.latency);
  if (compLatency > 0 && wrLatency > 0) {
    if (wrLatency >= compLatency) {
      score += 2;
      reasons.push(`Latency class aligns (${wyrestorm.latency}).`);
    } else {
      notes.push(`Latency class trails competitor baseline (${wyrestorm.latency || "N/A"}).`);
    }
  }

  const bounded = Math.max(0, Math.min(100, score));
  return {
    product: wyrestorm,
    score: bounded,
    reasons: reasons.slice(0, 6),
    notes: notes.slice(0, 6),
    ioSummary: `I/O coverage ${Math.round(ioCoverage * 100)}%`,
  };
}

function rankWyrestormCandidates(competitor: CatalogProduct): RankedCandidate[] {
  const sanitizedCompetitor = sanitizeCompetitorForMatching(competitor);
  const catalog = getCatalogProducts();
  const competitorType = classifyCatalogProduct(sanitizedCompetitor);
  const structuredFits = buildStructuredFitMap(sanitizedCompetitor, catalog);
  return catalog
    .filter((product) => areProductTypesCompatible(competitorType, classifyCatalogProduct(product)))
    .map((product) => {
      const structured = structuredFits.get(product.sku);
      if (!structured || structured.score < MINIMUM_STRUCTURED_AUTOMATIC_SCORE) return null;

      const candidate = computeCandidateScore(sanitizedCompetitor, product);
      return {
        ...candidate,
        score: Math.max(
          0,
          Math.min(100, candidate.score + structuredLaneAdjustment(structured.score)),
        ),
        reasons:
          structured.score >= 70
            ? candidate.reasons
            : dedupeStrings(
                [
                  ...candidate.reasons,
                  "Structured comparison lane is only a fallback fit.",
                ],
                6,
              ),
        notes:
          structured.score < 70
            ? dedupeStrings([...candidate.notes, ...structured.reasons.slice(0, 2)], 6)
            : candidate.notes,
      };
    })
    .filter((candidate): candidate is RankedCandidate => Boolean(candidate))
    .filter((candidate) => candidate.score >= MINIMUM_AUTOMATIC_MATCH_SCORE)
    .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku));
}

function toComparisonProvenance(
  mode: "curated" | "lookup",
  provenance: CompetitorLookupProvenance | { source: string; label: string; fetchedAt?: string; sourceUrl?: string },
): ComparisonProvenance {
  return {
    mode,
    source: provenance.source,
    label: provenance.label,
    fetchedAt: provenance.fetchedAt ?? new Date().toISOString(),
    cacheHit: "cacheHit" in provenance ? provenance.cacheHit : undefined,
    sourceUrl: provenance.sourceUrl,
  };
}

function fallbackSeedRecord(product: CompetitorProduct): CompetitorComparisonRecord | null {
  const records = (Array.isArray(compareSeed) ? compareSeed : []) as SeedRecord[];
  const match = records.find((item) => {
    const sameSku = normalizeSku(item.competitorSku) === normalizeSku(product.sku);
    const sameBrand = normalizeId(item.brand) === normalizeId(product.brand);
    return sameSku && sameBrand;
  });

  if (!match) return null;
  const knowledge = inferCompetitorKnowledgeProfile(product);
  const comparisonDomain = knowledge.comparisonDomain ?? inferComparisonDomainForProduct(product);
  const comparisonUseCase =
    knowledge.comparisonUseCase ?? inferComparisonUseCaseForProduct(product, comparisonDomain);

  const resolvedWyrestorm = resolveWyrestormReference({
    sku: match.wyrestormSku,
    category: match.wyrestormCategory,
  });
  const structuredSuggestions = structuredSuggestionSkus(product, 3);
  const structuredLead = structuredSuggestions[0];
  const selectedWyrestorm = resolvedWyrestorm.verified
    ? resolvedWyrestorm
    : structuredLead
      ? {
          sku: structuredLead.sku,
          name: tidy(structuredLead.name) || undefined,
          category: formatWyrestormCategory(structuredLead),
          verified: false,
          notes: [
            ...resolvedWyrestorm.notes,
            `Seed mapping pointed to "${tidy(match.wyrestormSku)}", so ${structuredLead.sku} is being used as the closest structured starting point until a verified replacement is curated.`,
          ],
        }
      : resolvedWyrestorm;

  return {
    brand: tidy(match.brand) || tidy(product.brand) || "Unknown",
    competitorSku: normalizeSku(match.competitorSku || product.sku),
    competitorName: tidy(product.name) || undefined,
    category: tidy(match.category) || tidy(product.category) || "Uncategorized",
    comparisonDomain,
    comparisonUseCase,
    summary: tidy(match.summary) || tidy(product.summary) || knowledge.summary || "Seed comparison record.",
    features: Array.isArray(match.features) ? match.features.map((item) => tidy(item)).filter(Boolean) : [],
    wyrestormSku: selectedWyrestorm.sku,
    wyrestormName: selectedWyrestorm.name,
    wyrestormCategory: selectedWyrestorm.category,
    wyrestormVerified: selectedWyrestorm.verified,
    confidence: selectedWyrestorm.verified ? match.confidence || "Low" : "Low",
    rationale: selectedWyrestorm.verified
      ? tidy(match.rationale) || knowledge.summary || "Seed fallback used because deterministic candidate scoring returned no result."
      : structuredLead
        ? `Seed comparison captured the product direction but not a verified WyreStorm SKU. ${structuredLead.sku} is the closest structured starting point and should be validated in the comparison matrix before sharing a replacement.`
        : "Seed comparison captured this competitor, but it does not yet point to a verified WyreStorm catalog SKU. Manual mapping is required before sharing a replacement.",
    recommendedFamilies: Array.isArray(match.recommendedFamilies)
      ? match.recommendedFamilies
      : structuredLead
        ? inferRecommendedFamilies(structuredLead)
        : knowledge.recommendedFamilies,
    notes: Array.from(
      new Set([
        ...knowledge.caveats,
        ...selectedWyrestorm.notes,
        ...(structuredSuggestions.length > 0
          ? [
              `Closest structured suggestions: ${structuredSuggestions
                .map((candidate) => candidate.sku)
                .join(", ")}.`,
            ]
          : []),
        ...(Array.isArray(match.notes) ? match.notes.map((item) => tidy(item)).filter(Boolean) : []),
      ]),
    ),
    provenance: toComparisonProvenance("curated", {
      source: "seed",
      label: "Seed comparison dataset",
      sourceUrl: product.sourceUrl,
    }),
  };
}

function toComparisonRecord(
  competitor: CompetitorProduct,
  candidate: RankedCandidate,
  provenance: ComparisonProvenance,
): CompetitorComparisonRecord {
  const matchSummary = candidate.reasons.length > 0 ? candidate.reasons.join(" ") : "Deterministic compatibility scoring.";
  const knowledge = inferCompetitorKnowledgeProfile(competitor);
  const comparisonDomain = knowledge.comparisonDomain ?? inferComparisonDomainForProduct(competitor);
  const comparisonUseCase =
    knowledge.comparisonUseCase ?? inferComparisonUseCaseForProduct(competitor, comparisonDomain);

  return {
    brand: tidy(competitor.brand) || "Unknown",
    competitorSku: normalizeSku(competitor.sku),
    competitorName: tidy(competitor.name) || undefined,
    category: formatCompetitorCategory(competitor),
    comparisonDomain,
    comparisonUseCase,
    summary:
      tidy(competitor.summary) ||
      `${tidy(competitor.name) || normalizeSku(competitor.sku)} competitor reference for deterministic match scoring. ${knowledge.summary}`,
    features: Array.isArray(competitor.features) ? competitor.features.map((item) => tidy(item)).filter(Boolean) : [],
    ioComparison: candidate.ioSummary,
    wyrestormSku: candidate.product.sku,
    wyrestormName: tidy(candidate.product.name) || undefined,
    wyrestormCategory: formatWyrestormCategory(candidate.product),
    wyrestormVerified: true,
    confidence: scoreToConfidence(candidate.score),
    matchScore: candidate.score,
    rationale: `Closest verified WyreStorm fit: ${candidate.product.sku} (${candidate.product.name}). ${matchSummary} ${knowledge.summary}`,
    recommendedFamilies: inferRecommendedFamilies(candidate.product),
    notes: [
      ...knowledge.caveats,
      ...candidate.notes,
      `Validate against latest official datasheets for ${normalizeSku(competitor.sku)} and ${candidate.product.sku}.`,
    ],
    provenance,
  };
}

function structuredSuggestionSkus(
  competitor: CompetitorProduct,
  limit = 3,
): CatalogProduct[] {
  const sanitizedCompetitor = sanitizeCompetitorForMatching(competitor);
  const ranked = structuredFitRank(
    {
      sku: sanitizedCompetitor.sku,
      name: sanitizedCompetitor.name,
      summary: sanitizedCompetitor.summary,
      category: sanitizedCompetitor.category,
      technology: sanitizedCompetitor.technology,
      features: sanitizedCompetitor.features,
    },
    getCatalogProducts().map((candidate) => ({
      sku: candidate.sku,
      name: candidate.name,
      summary: candidate.summary,
      category: candidate.category,
      technology: candidate.technology,
      features: candidate.features,
    })),
  );

  return ranked
    .slice(0, limit)
    .map((item) => findCatalogProductBySku(item.sku))
    .filter((item): item is CatalogProduct => Boolean(item));
}

function manualReviewRecord(
  competitor: CompetitorProduct,
  provenance: ComparisonProvenance,
  reason: string,
): CompetitorComparisonRecord {
  const knowledge = inferCompetitorKnowledgeProfile(competitor);
  const comparisonDomain =
    knowledge.comparisonDomain ?? inferComparisonDomainForProduct(competitor);
  const comparisonUseCase =
    knowledge.comparisonUseCase ??
    inferComparisonUseCaseForProduct(competitor, comparisonDomain);
  const structuredSuggestions = structuredSuggestionSkus(competitor, 3);
  const structuredLead = structuredSuggestions[0];

  return {
    brand: tidy(competitor.brand) || "Unknown",
    competitorSku: normalizeSku(competitor.sku),
    competitorName: tidy(competitor.name) || undefined,
    category: formatCompetitorCategory(competitor),
    comparisonDomain,
    comparisonUseCase,
    summary:
      tidy(competitor.summary) ||
      `${tidy(competitor.name) || normalizeSku(competitor.sku)} is searchable, but the automatic compare library needs a manual review for the final replacement call.`,
    features: Array.isArray(competitor.features)
      ? competitor.features.map((item) => tidy(item)).filter(Boolean)
      : [],
    ioComparison: "Closest available options require manual review.",
    wyrestormSku: structuredLead?.sku || "Manual review required",
    wyrestormName: tidy(structuredLead?.name) || undefined,
    wyrestormCategory: structuredLead
      ? formatWyrestormCategory(structuredLead)
      : "Unverified / manual review",
    wyrestormVerified: false,
    confidence: "Low",
    rationale: structuredLead
      ? `No deterministic candidate cleared the automatic threshold. ${structuredLead.sku} is the closest structured starting point and should be checked in the comparison matrix before being presented as a replacement.`
      : "No deterministic candidate cleared the automatic threshold. Use the comparison matrix and manual review before presenting a replacement.",
    recommendedFamilies: structuredLead
      ? inferRecommendedFamilies(structuredLead)
      : knowledge.recommendedFamilies,
    notes: Array.from(
      new Set([
        reason,
        ...knowledge.caveats,
        structuredSuggestions.length > 0
          ? `Closest structured suggestions: ${structuredSuggestions
              .map((product) => product.sku)
              .join(", ")}.`
          : "No structured fallback suggestions were available from the current catalog.",
        "Review competitor inputs, outputs, transport, and workflow details before confirming the final WyreStorm SKU.",
      ]),
    ).slice(0, 10),
    provenance,
  };
}

function toIntelligence(assessment: ComparisonIntelligenceAssessment): ComparisonIntelligence {
  return {
    score: assessment.score,
    confidence: assessment.confidence,
    escalationRequired: assessment.escalationRequired,
    escalationReasons: assessment.escalationReasons,
    recommendations: assessment.recommendations,
    supportActions: assessment.supportActions,
    warnings: assessment.warnings,
    summary: assessment.summary,
    evidenceContext: assessment.evidenceContext,
    fetchedAt: assessment.fetchedAt,
    competitorStatus: assessment.competitorRecord?.status,
    wyrestormStatus: assessment.wyrestormRecord?.status,
  };
}

async function withIntelligenceAssessment(
  record: CompetitorComparisonRecord,
  input: {
    query: string;
    baselineScore: number;
    evidenceContext?: string[];
    competitorEvidence?: ProductEvidenceDigest;
    wyrestormEvidence?: ProductEvidenceDigest;
  },
): Promise<CompetitorComparisonRecord> {
  try {
    const assessment = await assessComparisonIntelligence({
      competitorBrand: record.brand,
      competitorSku: record.competitorSku,
      wyrestormSku: record.wyrestormVerified === false ? undefined : record.wyrestormSku,
      query: input.query,
      baselineScore: input.baselineScore,
      evidenceContext: input.evidenceContext,
    });

    const intelligence = toIntelligence(assessment);
    return {
      ...record,
      confidence: assessment.confidence,
      matchScore: assessment.score,
      notes: Array.from(new Set([...record.notes, intelligence.summary, ...intelligence.escalationReasons])).slice(0, 10),
      intelligence: {
        ...intelligence,
        competitorEvidence: input.competitorEvidence,
        wyrestormEvidence: input.wyrestormEvidence,
      },
    };
  } catch {
    return {
      ...record,
      notes: Array.from(new Set([...record.notes, "Product intelligence assessment unavailable; using deterministic score only."])).slice(0, 10),
    };
  }
}

function toLookupProduct(record: CompetitorLookupRecord): CompetitorProduct {
  const classification = classifyCatalogProduct({
    sku: record.sku,
    family: record.family,
    name: record.name,
    category: record.category,
    summary: record.summary,
    transport: record.transport as CatalogProduct["transport"],
    features: record.features,
    audio: record.audio,
    control: record.control,
  });
  const product: CatalogProduct = {
    sku: normalizeSku(record.sku),
    name: tidy(record.name) || normalizeSku(record.sku),
    family: tidy(record.family) || "Unknown",
    category: classification.category || tidy(record.category) || tidy(record.family) || "Uncategorized",
    subcategory: classification.label,
    status: "active",
    summary: tidy(record.summary),
    inputs: Array.isArray(record.inputs) ? record.inputs : [],
    outputs: Array.isArray(record.outputs) ? record.outputs : [],
    control: Array.isArray(record.control) ? record.control.map((item) => tidy(item)).filter(Boolean) : [],
    audio: Array.isArray(record.audio) ? record.audio.map((item) => tidy(item)).filter(Boolean) : [],
    video: record.video,
    transport: tidy(record.transport) as CatalogProduct["transport"],
    distance: typeof record.distanceMeters === "number" ? { meters: record.distanceMeters } : undefined,
    features: Array.isArray(record.features) ? record.features.map((item) => tidy(item)).filter(Boolean) : [],
    notes: record.sourceUrl ? `Source: ${record.sourceUrl}` : undefined,
  };

  const normalized = normalizeCatalogProduct(product);
  const enriched = enrichCatalogProduct(normalized);
  return {
    ...enriched,
    brand: tidy(record.brand) || "Unknown",
  };
}

function buildCuratedRecords(): CompetitorComparisonRecord[] {
  const competitorProducts = getCompetitorProducts();
  const records: CompetitorComparisonRecord[] = [];

  for (const competitor of competitorProducts) {
    const candidates = rankWyrestormCandidates(competitor);
    const best = candidates[0];

    if (best) {
      records.push(
        toComparisonRecord(
          competitor,
          best,
          toComparisonProvenance("curated", {
            source: "catalog",
            label: "Curated competitor catalog",
            fetchedAt: new Date().toISOString(),
            sourceUrl: competitor.sourceUrl,
          }),
        ),
      );
      continue;
    }

    const fallback = fallbackSeedRecord(competitor);
    if (fallback) {
      records.push(fallback);
      continue;
    }

    records.push(
      manualReviewRecord(
        competitor,
        toComparisonProvenance("curated", {
          source: "catalog",
          label: "Curated competitor catalog",
          fetchedAt: new Date().toISOString(),
          sourceUrl: competitor.sourceUrl,
        }),
        "No deterministic match cleared the automatic threshold for the curated competitor record.",
      ),
    );
  }

  // Include seed-only entries that are not represented in curated catalog.
  const seedRows = (Array.isArray(compareSeed) ? compareSeed : []) as SeedRecord[];
  for (const row of seedRows) {
    const brand = tidy(row.brand) || "Unknown";
    const sku = normalizeSku(row.competitorSku);
    if (!sku) continue;
    const id = toRecordId(brand, sku);
    if (records.some((item) => toRecordId(item.brand, item.competitorSku) === id)) continue;

    const resolvedWyrestorm = resolveWyrestormReference({
      sku: row.wyrestormSku,
      category: row.wyrestormCategory,
    });

    records.push({
      brand,
      competitorSku: sku,
      category: tidy(row.category) || "Uncategorized",
      summary: tidy(row.summary) || "Seed comparison record.",
      features: Array.isArray(row.features) ? row.features.map((item) => tidy(item)).filter(Boolean) : [],
      wyrestormSku: resolvedWyrestorm.sku,
      wyrestormName: resolvedWyrestorm.name,
      wyrestormCategory: resolvedWyrestorm.category,
      wyrestormVerified: resolvedWyrestorm.verified,
      confidence: resolvedWyrestorm.verified ? row.confidence || "Low" : "Low",
      rationale: resolvedWyrestorm.verified
        ? tidy(row.rationale) || "Imported from comparison seed."
        : "Imported seed record does not yet point to a verified WyreStorm catalog SKU. Manual review is required before sharing a replacement.",
      recommendedFamilies: Array.isArray(row.recommendedFamilies) ? row.recommendedFamilies : ["Apollo"],
      notes: Array.from(
        new Set([
          ...resolvedWyrestorm.notes,
          ...(Array.isArray(row.notes) ? row.notes.map((item) => tidy(item)).filter(Boolean) : []),
        ]),
      ),
      provenance: toComparisonProvenance("curated", {
        source: "seed",
        label: "Seed comparison dataset",
        fetchedAt: new Date().toISOString(),
      }),
    });
  }

  return records.sort(
    (a, b) => a.brand.localeCompare(b.brand) || a.competitorSku.localeCompare(b.competitorSku),
  );
}

function toSearchString(item: CompetitorComparisonRecord): string {
  return [
    item.brand,
    item.competitorSku,
    item.competitorName,
    item.category,
    item.summary,
    item.wyrestormSku,
    item.wyrestormName,
    item.wyrestormCategory,
    item.rationale,
    item.provenance?.label,
    item.ioComparison,
    ...(item.features ?? []),
    ...(item.notes ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function mergeComparisonRecords(
  latest: CompetitorComparisonRecord[],
  existing: CompetitorComparisonRecord[],
): CompetitorComparisonRecord[] {
  const out: CompetitorComparisonRecord[] = [];
  const seen = new Set<string>();

  const push = (item: CompetitorComparisonRecord) => {
    const id = toRecordId(item.brand, item.competitorSku);
    if (seen.has(id)) return;
    seen.add(id);
    out.push(item);
  };

  latest.forEach(push);
  existing.forEach(push);
  return out;
}

export function getComparisonRecords(): CompetitorComparisonRecord[] {
  const token = getLiveProductDataToken();
  if (!cachedCuratedRecords || cachedCuratedRecordsToken !== token) {
    cachedCuratedRecords = buildCuratedRecords();
    cachedCuratedRecordsToken = token;
  }
  return [...cachedCuratedRecords];
}

export function matchesComparisonRecord(item: CompetitorComparisonRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return toSearchString(item).includes(q);
}

export function searchComparisonRecords(
  records: CompetitorComparisonRecord[],
  query: string,
): CompetitorComparisonRecord[] {
  return records.filter((item) => matchesComparisonRecord(item, query));
}

export function findComparisonRecordById(
  records: CompetitorComparisonRecord[],
  id: string,
): CompetitorComparisonRecord | null {
  const key = normalizeId(id);
  return records.find((item) => normalizeId(toRecordId(item.brand, item.competitorSku)) === key) ?? null;
}

export function findComparisonRecord(
  records: CompetitorComparisonRecord[],
  competitorSku: string,
): CompetitorComparisonRecord | null {
  const sku = normalizeSku(competitorSku);
  return records.find((item) => normalizeSku(item.competitorSku) === sku) ?? null;
}

export async function lookupAndCompare(query: string): Promise<LookupAndCompareResult> {
  const lookup = await lookupCompetitorProduct(query);
  if (!lookup.record) return { lookup, records: [] };

  const competitor = toLookupProduct(lookup.record);
  const candidates = rankWyrestormCandidates(competitor);
  const best = candidates[0];

  if (!best) {
    const competitorEvidence = buildProductEvidenceDigest({
      vendorType: "competitor",
      brand: competitor.brand,
      sku: competitor.sku,
      name: competitor.name,
      sourceUrl: competitor.sourceUrl,
      summary: competitor.summary,
      inputs: competitor.inputs,
      outputs: competitor.outputs,
      features: competitor.features,
      control: competitor.control,
      transport: competitor.transport,
      audio: competitor.audio,
      video: competitor.video,
    });
    const evidenceContext = buildEvidenceContextLines(competitorEvidence, null);

    const fallback = manualReviewRecord(
      competitor,
      toComparisonProvenance("lookup", lookup.provenance),
      "Live lookup captured the competitor SKU, but no deterministic candidate cleared the automatic threshold.",
    );
    const assessedFallback = await withIntelligenceAssessment(fallback, {
      query,
      baselineScore: 24,
      evidenceContext,
      competitorEvidence,
    });
    const fallbackWithWarnings =
      lookup.warnings.length > 0
        ? {
            ...assessedFallback,
            notes: Array.from(new Set([...assessedFallback.notes, ...lookup.warnings])).slice(0, 10),
          }
        : assessedFallback;
    return { lookup, records: [fallbackWithWarnings] };
  }

  const record = toComparisonRecord(competitor, best, toComparisonProvenance("lookup", lookup.provenance));
  const competitorEvidence = buildProductEvidenceDigest({
    vendorType: "competitor",
    brand: competitor.brand,
    sku: competitor.sku,
    name: competitor.name,
    sourceUrl: competitor.sourceUrl,
    summary: competitor.summary,
    inputs: competitor.inputs,
    outputs: competitor.outputs,
    features: competitor.features,
    control: competitor.control,
    transport: competitor.transport,
    audio: competitor.audio,
    video: competitor.video,
  });
  const wyrestormEvidence = buildProductEvidenceDigest({
    vendorType: "wyrestorm",
    brand: "WyreStorm",
    sku: best.product.sku,
    name: best.product.name,
    sourceUrl: best.product.sourceUrl,
    summary: best.product.summary,
    inputs: best.product.inputs,
    outputs: best.product.outputs,
    features: best.product.features,
    control: best.product.control,
    transport: best.product.transport,
    audio: best.product.audio,
    video: best.product.video,
  });
  const evidenceContext = buildEvidenceContextLines(competitorEvidence, wyrestormEvidence);

  const assessed = await withIntelligenceAssessment(record, {
    query,
    baselineScore: best.score,
    evidenceContext,
    competitorEvidence,
    wyrestormEvidence,
  });
  const recordWithWarnings =
    lookup.warnings.length > 0
      ? {
          ...assessed,
          notes: Array.from(new Set([...assessed.notes, ...lookup.warnings])).slice(0, 10),
        }
      : assessed;
  return { lookup, records: [recordWithWarnings] };
}

export function toProjectCompareRecord(item: CompetitorComparisonRecord): ProjectCompareRecord {
  return {
    brand: item.brand,
    competitorSku: item.competitorSku,
    category: item.category,
    summary: item.summary,
    features: item.features,
    wyrestormSku: item.wyrestormSku,
    wyrestormName: item.wyrestormName,
    wyrestormCategory: item.wyrestormCategory,
    wyrestormVerified: item.wyrestormVerified,
    confidence: item.confidence,
    rationale: item.rationale,
    recommendedFamilies: item.recommendedFamilies,
    notes: item.notes,
    createdAt: new Date().toISOString(),
  };
}

const competitorComparisonService = {
  getComparisonRecords,
  mergeComparisonRecords,
  matchesComparisonRecord,
  searchComparisonRecords,
  findComparisonRecordById,
  findComparisonRecord,
  lookupAndCompare,
  toProjectCompareRecord,
};

export default competitorComparisonService;


function structuredFitRank(
  competitor: {
    sku: string;
    name?: string;
    summary?: string;
    description?: string;
    category?: string;
    technology?: string;
    features?: string[];
  },
  candidates: Array<{
    sku: string;
    name?: string;
    summary?: string;
    description?: string;
    category?: string;
    technology?: string;
    features?: string[];
  }>
) {
  return compareStructuredCompetitor(competitor, candidates);
}
