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
  sourceType: CompetitorCompareOptionSource;
};

type RankedCandidate = {
  product: CatalogProduct;
  score: number;
  reasons: string[];
  notes: string[];
  ioSummary: string;
};

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
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
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
  const families: DiscoveryProductFamily[] = [];
  const textBlob = [
    product.family,
    product.category,
    product.subcategory,
    product.transport,
    ...(product.features ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    textBlob.includes("apollo") ||
    textBlob.includes("presentation") ||
    textBlob.includes("byod")
  ) {
    families.push("Apollo");
  }
  if (textBlob.includes("hdbaset")) families.push("HDBaseT");
  if (
    textBlob.includes("avoip") ||
    textBlob.includes("networkhd") ||
    textBlob.includes("ip")
  ) {
    families.push("AVoIP");
  }
  if (textBlob.includes("matrix")) families.push("Matrix");
  if (textBlob.includes("usb")) families.push("USB Extension");
  if (textBlob.includes("video wall")) families.push("Video Wall");

  const deduped = Array.from(new Set(families));
  return deduped.length > 0 ? deduped : ["Apollo"];
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
  if (competitorTotal === 0) return 0.7;

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
  const competitorMap = asPortMap(competitor);
  const wyrestormMap = asPortMap(wyrestorm);
  const competitorTotal = totalCount(competitorMap);
  if (competitorTotal === 0) return { status: "review", note: "Competitor I/O not fully captured." };

  let matched = 0;
  let shortfalls = 0;
  for (const [type, needed] of competitorMap.entries()) {
    const available = wyrestormMap.get(type) ?? 0;
    matched += Math.min(needed, available);
    if (available < needed) shortfalls += 1;
  }

  const coverage = matched / Math.max(1, competitorTotal);
  if (coverage >= 1 && shortfalls === 0) return { status: "match" };
  if (coverage >= 1.15) return { status: "better" };
  if (coverage >= 0.75) return { status: "review", note: "Some I/O is close but not exact." };
  return { status: "gap", note: "Visible I/O shortfall against the competitor profile." };
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
  if (wrRes >= compRes && wrBandwidth >= compBandwidth) return { status: "match" };
  if (wrRes > compRes || wrBandwidth > compBandwidth) return { status: "better" };
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

function comparisonMatrix(
  competitor: CatalogProduct,
  wyrestorm: CatalogProduct,
): CompetitorCompareMatrixRow[] {
  const inputStatus = statusForPortCoverage(competitor.inputs, wyrestorm.inputs);
  const outputStatus = statusForPortCoverage(competitor.outputs, wyrestorm.outputs);
  const videoStatus = statusForVideo(competitor, wyrestorm);
  const controlStatus = statusForControl(competitor, wyrestorm);
  const distanceStatus = statusForDistance(competitor, wyrestorm);

  const transportStatus: CompetitorCompareMatrixStatus =
    normalizeId(competitor.transport) && normalizeId(competitor.transport) === normalizeId(wyrestorm.transport)
      ? "match"
      : normalizeId(wyrestorm.transport)
      ? "gap"
      : "review";

  return [
    {
      id: "category",
      label: "Category",
      competitorValue: tidy(competitor.category) || "Unknown",
      wyrestormValue: tidy(wyrestorm.category) || "Unknown",
      status:
        areProductTypesCompatible(
          classifyCatalogProduct(competitor),
          classifyCatalogProduct(wyrestorm),
        )
          ? "match"
          : "gap",
      note: tidy(competitor.subcategory) || tidy(wyrestorm.subcategory) || undefined,
    },
    {
      id: "transport",
      label: "Transport",
      competitorValue: tidy(competitor.transport) || "-",
      wyrestormValue: tidy(wyrestorm.transport) || "-",
      status: transportStatus,
      note:
        transportStatus === "gap"
          ? "Transport path differs and should be checked before quoting."
          : undefined,
    },
    {
      id: "inputs",
      label: "Inputs",
      competitorValue: formatPorts(competitor.inputs),
      wyrestormValue: formatPorts(wyrestorm.inputs),
      status: inputStatus.status,
      note: inputStatus.note,
    },
    {
      id: "outputs",
      label: "Outputs",
      competitorValue: formatPorts(competitor.outputs),
      wyrestormValue: formatPorts(wyrestorm.outputs),
      status: outputStatus.status,
      note: outputStatus.note,
    },
    {
      id: "video",
      label: "Video",
      competitorValue: formatVideo(competitor),
      wyrestormValue: formatVideo(wyrestorm),
      status: videoStatus.status,
      note: videoStatus.note,
    },
    {
      id: "control",
      label: "Control",
      competitorValue: formatControl(competitor.control),
      wyrestormValue: formatControl(wyrestorm.control),
      status: controlStatus.status,
      note: controlStatus.note,
    },
    {
      id: "distance",
      label: "Distance",
      competitorValue: formatDistance(competitor),
      wyrestormValue: formatDistance(wyrestorm),
      status: distanceStatus.status,
      note: distanceStatus.note,
    },
  ];
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
  const reasons: string[] = [];
  const notes: string[] = [];
  let score = 0;
  const competitorType = classifyCatalogProduct(competitor);
  const wyrestormType = classifyCatalogProduct(wyrestorm);

  if (areProductTypesCompatible(competitorType, wyrestormType)) {
    score += 24;
    reasons.push(`Type alignment (${wyrestormType.label}).`);
  } else {
    return {
      product: wyrestorm,
      score: 0,
      reasons: ["Type mismatch"],
      notes: [
        `Rejected because ${wyrestorm.sku} is ${wyrestormType.label}, not ${competitorType.label}.`,
      ],
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

  if (
    normalizeId(competitor.family) === normalizeId(wyrestorm.family) &&
    tidy(competitor.family)
  ) {
    score += 20;
    reasons.push(`Family alignment (${wyrestorm.family}).`);
  }

  if (
    normalizeId(competitor.category) === normalizeId(wyrestorm.category) &&
    tidy(competitor.category)
  ) {
    score += 12;
    reasons.push(`Category alignment (${wyrestorm.category}).`);
  }

  if (
    normalizeId(competitor.transport) &&
    normalizeId(competitor.transport) === normalizeId(wyrestorm.transport)
  ) {
    score += 8;
    reasons.push(`Transport alignment (${wyrestorm.transport}).`);
  }

  const competitorTags = tagsFor(competitor);
  const wyrestormTags = tagsFor(wyrestorm);
  let overlap = 0;
  competitorTags.forEach((tag) => {
    if (wyrestormTags.has(tag)) overlap += 1;
  });

  const featureCoverage = clamp01(overlap / Math.max(1, competitorTags.size));
  score += Math.round(featureCoverage * 30);
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
  score += Math.round(ioCoverage * 20);

  const competitorResolution = parseResolutionRank(competitor.video?.maxResolution);
  const wyrestormResolution = parseResolutionRank(wyrestorm.video?.maxResolution);
  if (competitorResolution > 0 && wyrestormResolution > 0) {
    if (wyrestormResolution >= competitorResolution) {
      score += 10;
      reasons.push(
        `Video ceiling aligns (${wyrestorm.video?.maxResolution || "N/A"}).`,
      );
    } else {
      const penalty = Math.min(
        8,
        Math.max(2, competitorResolution - wyrestormResolution),
      );
      score += 10 - penalty;
      notes.push(
        `Video ceiling below competitor baseline (${wyrestorm.video?.maxResolution || "N/A"}).`,
      );
    }
  } else {
    score += 5;
    notes.push("Video specs incomplete; confidence reduced.");
  }

  if (competitor.video?.hdr && wyrestorm.video?.hdr) {
    score += 4;
    reasons.push("HDR support aligns.");
  } else if (competitor.video?.hdr && !wyrestorm.video?.hdr) {
    notes.push("Competitor lists HDR but candidate does not.");
  }

  const competitorBandwidth = parseBandwidth(competitor.video?.bandwidthGbps);
  const wyrestormBandwidth = parseBandwidth(wyrestorm.video?.bandwidthGbps);
  if (competitorBandwidth > 0 && wyrestormBandwidth > 0) {
    if (wyrestormBandwidth >= competitorBandwidth) {
      score += 6;
      reasons.push(`Bandwidth class aligns (${wyrestormBandwidth} Gbps).`);
    } else {
      notes.push(
        `Bandwidth below competitor baseline (${wyrestormBandwidth} vs ${competitorBandwidth} Gbps).`,
      );
    }
  }

  const competitorHdmi = parseHdmiRank(competitor.video?.hdmi);
  const wyrestormHdmi = parseHdmiRank(wyrestorm.video?.hdmi);
  if (competitorHdmi > 0 && wyrestormHdmi > 0) {
    if (wyrestormHdmi >= competitorHdmi) {
      score += 4;
      reasons.push(`HDMI generation aligns (${wyrestorm.video?.hdmi || "N/A"}).`);
    } else {
      notes.push(
        `HDMI generation below competitor baseline (${wyrestorm.video?.hdmi || "N/A"}).`,
      );
    }
  }

  const competitorLatency = parseLatencyRank(competitor.latency);
  const wyrestormLatency = parseLatencyRank(wyrestorm.latency);
  if (competitorLatency > 0 && wyrestormLatency > 0) {
    if (wyrestormLatency >= competitorLatency) {
      score += 4;
      reasons.push(`Latency class aligns (${wyrestorm.latency}).`);
    } else {
      notes.push(
        `Latency class trails competitor baseline (${wyrestorm.latency || "N/A"}).`,
      );
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

function rankWyrestormCandidates(competitor: CompetitorProduct): RankedCandidate[] {
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

function optionId(
  record: CompetitorComparisonRecord,
  wyrestormSku: string,
): string {
  return `${normalizeId(record.brand)}::${normalizeSku(record.competitorSku)}::${normalizeSku(wyrestormSku)}`;
}

function buildOption(
  record: CompetitorComparisonRecord,
  competitor: CompetitorProduct,
  wyrestorm: CatalogProduct,
  label: string,
  score: number,
  reasons: string[],
  cautions: string[],
  sourceType: CompetitorCompareOptionSource,
): CompetitorCompareOption {
  const positioning = explainWyreStormAdvantage(wyrestorm, competitor);
  return {
    id: optionId(record, wyrestorm.sku),
    label,
    wyrestormSku: wyrestorm.sku,
    wyrestormName: tidy(wyrestorm.name) || undefined,
    wyrestormCategory: formatWyrestormCategory(wyrestorm),
    fitScore: score,
    fitConfidence: scoreToConfidence(score),
    reasons,
    cautions,
    positioningSummary: positioning.summary,
    positioningReasons: positioning.reasons.slice(0, 4),
    salesStory: buildSalesStory(
      label,
      record.competitorSku,
      wyrestorm.sku,
      reasons,
      cautions,
      positioning.reasons,
    ),
    matrix: comparisonMatrix(competitor, wyrestorm),
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
    return buildOption(
      record,
      competitor,
      product,
      sourceType === "manual" ? "Saved fallback" : "Current mapping",
      Number(record.matchScore) || (record.confidence === "High" ? 82 : record.confidence === "Medium" ? 62 : 38),
      dedupeStrings(
        [
          tidy(record.rationale),
          `${product.sku} is the currently stored WyreStorm mapping.`,
        ],
        4,
      ),
      dedupeStrings(record.notes ?? [], 4),
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
    sourceType,
  };
}

export function buildComparisonOptions(
  record: CompetitorComparisonRecord,
  sourceType: CompetitorCompareOptionSource,
): CompetitorCompareOption[] {
  const competitor = resolveCompetitor(record);
  const ranked = rankWyrestormCandidates(competitor);
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

  const rankedLabels = ["Best fit", "Closest parity", "Alternate path"];
  ranked.slice(0, 4).forEach((candidate, index) => {
    pushOption(
      buildOption(
        record,
        competitor,
        candidate.product,
        rankedLabels[Math.min(index, rankedLabels.length - 1)],
        candidate.score,
        candidate.reasons,
        dedupeStrings(candidate.notes, 4),
        sourceType === "lookup" ? "lookup" : "curated",
      ),
    );
  });

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
