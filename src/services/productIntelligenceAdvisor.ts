import type { CompareConfidence } from "@/features/projects/projectStore";
import {
  fetchProductIntelligenceRecords,
  type ProductIntelligenceRecord,
  type ProductVendorType,
} from "@/services/productIntelligenceService";

export type IntelligenceSupportAction = {
  label: string;
  to: string;
};

export type ComparisonIntelligenceAssessment = {
  score: number;
  confidence: CompareConfidence;
  escalationRequired: boolean;
  escalationReasons: string[];
  recommendations: string[];
  supportActions: IntelligenceSupportAction[];
  warnings: string[];
  summary: string;
  evidenceContext: string[];
  fetchedAt: string;
  competitorRecord: ProductIntelligenceRecord | null;
  wyrestormRecord: ProductIntelligenceRecord | null;
};

export type QuestionIntelligenceAssessment = {
  question: string;
  score: number;
  confidence: CompareConfidence;
  escalationRequired: boolean;
  escalationReasons: string[];
  guidance: string[];
  supportActions: IntelligenceSupportAction[];
  warnings: string[];
  records: ProductIntelligenceRecord[];
  available: boolean;
  mode: string;
  fetchedAt: string;
};

type LookupRequest = {
  vendorType: ProductVendorType;
  brand?: string;
  sku?: string;
  q?: string;
};

type LookupSnapshot = {
  record: ProductIntelligenceRecord | null;
  warnings: string[];
  available: boolean;
  mode: string;
  fetchedAt: string;
};

type RecordQuality = {
  score: number;
  notes: string[];
};

type CachedLookup = {
  expiresAt: number;
  value: LookupSnapshot;
};

const LOOKUP_CACHE_TTL_MS = 2 * 60 * 1000;
const lookupCache = new Map<string, CachedLookup>();

const DEFAULT_SUPPORT_ACTIONS: IntelligenceSupportAction[] = [
  { label: "Open Product Intelligence", to: "/app/tools/product-intelligence" },
  { label: "Open Lookup Diagnostics", to: "/app/tools/competitor-lookup-diagnostics" },
];

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

function toConfidence(score: number): CompareConfidence {
  if (score >= 74) return "High";
  if (score >= 52) return "Medium";
  return "Low";
}

function statusFactor(record: ProductIntelligenceRecord): number {
  if (record.status === "approved") return 1;
  if (record.status === "draft") return 0.78;
  return 0.42;
}

function sourceFactor(record: ProductIntelligenceRecord): number {
  if (record.sourceType === "live") return 1;
  if (record.sourceType === "catalog") return 0.88;
  if (record.sourceType === "import") return 0.8;
  return 0.7;
}

function freshnessFactor(value?: string): number {
  if (!value) return 0.58;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 0.58;
  const ageDays = Math.max(0, (Date.now() - parsed) / (24 * 60 * 60 * 1000));
  if (ageDays <= 30) return 1;
  if (ageDays <= 90) return 0.86;
  if (ageDays <= 180) return 0.7;
  if (ageDays <= 365) return 0.56;
  return 0.42;
}

function evidenceFactor(record: ProductIntelligenceRecord): number {
  const count = Array.isArray(record.evidence) ? record.evidence.length : 0;
  if (count >= 4) return 1;
  if (count === 3) return 0.93;
  if (count === 2) return 0.84;
  if (count === 1) return 0.72;
  return 0.56;
}

function qualityForRecord(record: ProductIntelligenceRecord | null, label: string): RecordQuality {
  if (!record) {
    return {
      score: 0.44,
      notes: [`${label} intelligence record missing.`],
    };
  }

  const confidence = clamp01(Number(record.confidence) || 0.6);
  const quality =
    confidence * 0.42 +
    statusFactor(record) * 0.2 +
    freshnessFactor(record.lastCapturedAt) * 0.16 +
    evidenceFactor(record) * 0.14 +
    sourceFactor(record) * 0.08;

  const notes: string[] = [];
  if (record.status !== "approved") {
    notes.push(`${label} status is ${record.status}.`);
  }
  if ((record.evidence?.length ?? 0) === 0) {
    notes.push(`${label} has no evidence entries.`);
  }
  if (freshnessFactor(record.lastCapturedAt) < 0.7) {
    notes.push(`${label} record is stale and should be recaptured.`);
  }

  return {
    score: clamp01(quality),
    notes,
  };
}

function lookupCacheKey(input: LookupRequest): string {
  return [
    input.vendorType,
    normalizeId(input.brand),
    normalizeSku(input.sku),
    normalizeId(input.q),
  ].join("|");
}

function bestRecord(records: ProductIntelligenceRecord[], input: LookupRequest): ProductIntelligenceRecord | null {
  if (records.length === 0) return null;
  const sku = normalizeSku(input.sku);
  const brand = normalizeId(input.brand);

  const exactBrandSku = records.find((record) => {
    const sameSku = sku ? normalizeSku(record.sku) === sku : true;
    const sameBrand = brand ? normalizeId(record.brand) === brand : true;
    return sameSku && sameBrand;
  });
  if (exactBrandSku) return exactBrandSku;

  const exactSku = sku ? records.find((record) => normalizeSku(record.sku) === sku) : null;
  if (exactSku) return exactSku;

  return records[0] ?? null;
}

async function lookupRecord(input: LookupRequest): Promise<LookupSnapshot> {
  const cacheKey = lookupCacheKey(input);
  const cached = lookupCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const result = await fetchProductIntelligenceRecords({
    vendorType: input.vendorType,
    brand: input.brand || undefined,
    sku: input.sku || undefined,
    q: input.q || undefined,
    limit: 120,
  });

  const value: LookupSnapshot = {
    record: bestRecord(result.records, input),
    warnings: result.warnings,
    available: result.available,
    mode: result.mode,
    fetchedAt: result.fetchedAt,
  };

  lookupCache.set(cacheKey, {
    expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS,
    value,
  });
  return value;
}

function summaryForAssessment(
  confidence: CompareConfidence,
  score: number,
  escalationRequired: boolean,
  reasons: string[],
): string {
  if (!escalationRequired) {
    return `Confidence ${confidence} (${score}/100). Product intelligence is sufficient for guided customer conversation.`;
  }
  const detail = reasons[0] || "Evidence quality is below acceptance threshold.";
  return `Confidence ${confidence} (${score}/100). Escalation required: ${detail}`;
}

export async function assessComparisonIntelligence(input: {
  competitorBrand: string;
  competitorSku: string;
  wyrestormSku?: string;
  query?: string;
  baselineScore?: number;
  evidenceContext?: string[];
}): Promise<ComparisonIntelligenceAssessment> {
  const [competitorLookup, wyrestormLookup] = await Promise.all([
    lookupRecord({
      vendorType: "competitor",
      brand: input.competitorBrand,
      sku: input.competitorSku,
      q: input.query,
    }),
    input.wyrestormSku
      ? lookupRecord({
          vendorType: "wyrestorm",
          brand: "WyreStorm",
          sku: input.wyrestormSku,
          q: input.wyrestormSku,
        })
      : Promise.resolve({
          record: null,
          warnings: [],
          available: false,
          mode: "not-requested",
          fetchedAt: new Date().toISOString(),
        } satisfies LookupSnapshot),
  ]);

  const competitorQuality = qualityForRecord(competitorLookup.record, "Competitor");
  const wyrestormQuality = qualityForRecord(
    input.wyrestormSku ? wyrestormLookup.record : null,
    "WyreStorm",
  );

  const baseline = clamp01((Number(input.baselineScore) || 58) / 100);
  let pairQuality = competitorQuality.score;
  if (input.wyrestormSku) {
    pairQuality = (competitorQuality.score + wyrestormQuality.score) / 2;
  }

  const evidenceContext = Array.isArray(input.evidenceContext)
    ? input.evidenceContext.map((item) => tidy(item)).filter(Boolean)
    : [];

  let combined = baseline * 0.64 + pairQuality * 0.36;
  if (evidenceContext.length > 0) {
    combined += Math.min(0.04, evidenceContext.length * 0.0075);
  }
  if (!competitorLookup.record) combined = Math.min(combined, 0.49);
  if (input.wyrestormSku && !wyrestormLookup.record) combined = Math.min(combined, 0.54);
  if (competitorLookup.record?.status === "expired" || wyrestormLookup.record?.status === "expired") {
    combined = Math.min(combined, 0.51);
  }

  const score = Math.round(clamp01(combined) * 100);
  const confidence = toConfidence(score);

  const escalationReasons: string[] = [];
  escalationReasons.push(...competitorQuality.notes);
  escalationReasons.push(...wyrestormQuality.notes);
  if (confidence === "Low") {
    escalationReasons.push("Combined evidence confidence is below threshold.");
  }

  const escalationRequired =
    confidence === "Low" ||
    !competitorLookup.record ||
    (Boolean(input.wyrestormSku) && !wyrestormLookup.record) ||
    competitorLookup.record?.status === "expired" ||
    wyrestormLookup.record?.status === "expired";

  const recommendations = escalationRequired
    ? [
        "Validate both SKUs against latest manufacturer datasheets before customer commitment.",
        "Capture additional I/O and positioning evidence in Product Intelligence.",
        "Route uncertain outcomes through support diagnostics before proposal finalization.",
      ]
    : [
        "Proceed with guided comparison and keep evidence links in the project notes.",
        "Re-run lookup if scope changes or a different competitor SKU is introduced.",
      ];

  const warnings = [...competitorLookup.warnings, ...wyrestormLookup.warnings];
  if (evidenceContext.length === 0) {
    warnings.push("No structured live evidence context provided for this comparison.");
  }

  return {
    score,
    confidence,
    escalationRequired,
    escalationReasons: Array.from(new Set(escalationReasons)).slice(0, 6),
    recommendations,
    supportActions: DEFAULT_SUPPORT_ACTIONS,
    warnings,
    summary: summaryForAssessment(confidence, score, escalationRequired, escalationReasons),
    evidenceContext,
    fetchedAt: new Date().toISOString(),
    competitorRecord: competitorLookup.record,
    wyrestormRecord: input.wyrestormSku ? wyrestormLookup.record : null,
  };
}

function qualityRankForQuestion(record: ProductIntelligenceRecord): number {
  const base = clamp01(Number(record.confidence) || 0.6);
  const status = statusFactor(record);
  const evidence = evidenceFactor(record);
  const fresh = freshnessFactor(record.lastCapturedAt);
  return base * 0.45 + status * 0.2 + evidence * 0.18 + fresh * 0.17;
}

export async function assessQuestionIntelligence(question: string): Promise<QuestionIntelligenceAssessment> {
  const query = tidy(question);
  const result = await fetchProductIntelligenceRecords({
    q: query || undefined,
    limit: 12,
  });

  const ranked = [...result.records].sort((a, b) => qualityRankForQuestion(b) - qualityRankForQuestion(a));
  const top = ranked.slice(0, 4);
  const meanQuality =
    top.length > 0
      ? top.reduce((sum, record) => sum + qualityRankForQuestion(record), 0) / top.length
      : 0.46;
  const coverageFactor = clamp01(Math.min(1, top.length / 3));
  const score = Math.round((meanQuality * 0.78 + coverageFactor * 0.22) * 100);
  const confidence = toConfidence(score);

  const escalationReasons: string[] = [];
  if (top.length === 0) escalationReasons.push("No matching product intelligence records found.");
  if (top.some((record) => record.status === "expired")) escalationReasons.push("At least one matched record is expired.");
  if (score < 52) escalationReasons.push("Available evidence is not sufficient for high-confidence guidance.");

  const escalationRequired = escalationReasons.length > 0 || confidence === "Low";

  const guidance =
    top.length > 0
      ? top.slice(0, 3).map((record) => `${record.brand} ${record.sku}: ${record.summary}`)
      : [
          "Provide SKU or product family context to improve retrieval quality.",
          "Use Product Intelligence to capture missing evidence before relying on automated guidance.",
        ];

  return {
    question: query,
    score,
    confidence,
    escalationRequired,
    escalationReasons: Array.from(new Set(escalationReasons)).slice(0, 6),
    guidance,
    supportActions: DEFAULT_SUPPORT_ACTIONS,
    warnings: result.warnings,
    records: top,
    available: result.available,
    mode: result.mode,
    fetchedAt: result.fetchedAt,
  };
}
