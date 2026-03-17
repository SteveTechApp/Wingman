import type {
  ComparisonIntelligence,
  CompetitorComparisonRecord,
} from "@/services/competitorComparisonService";
import {
  getComparisonRecords,
  lookupAndCompare,
  mergeComparisonRecords,
} from "@/services/competitorComparisonService";
import {
  buildComparisonOptions,
  suggestedWyrestormSkusForRecords,
  type CompetitorCompareOption,
  type CompetitorCompareOptionSource,
} from "@/services/competitorCompareFit";
import {
  getManualCompetitorComparisonRecords,
  toManualComparisonRecord,
} from "@/services/manualCompetitorComparisonStore";

export type CompetitorCompareCandidate = {
  id: string;
  comparison: CompetitorComparisonRecord;
  searchScore: number;
  searchConfidence: "High" | "Medium" | "Low";
  exactSku: boolean;
  sourceLabel: string;
  sourceType: CompetitorCompareOptionSource;
  searchReasons: string[];
  options: CompetitorCompareOption[];
  primaryOption?: CompetitorCompareOption;
};

export type CompetitorCompareSearchResult = {
  brand: string;
  query: string;
  status: "idle" | "no-match" | "ambiguous" | "resolved";
  summary: string;
  candidates: CompetitorCompareCandidate[];
  bestCandidate?: CompetitorCompareCandidate;
  suggestedWyrestormSkus: string[];
  clarifyingQuestions: string[];
  salesAdvice: string[];
};

export type CompetitorCompareLiveResult = {
  query: string;
  record?: CompetitorComparisonRecord;
  candidate?: CompetitorCompareCandidate;
  intelligence?: ComparisonIntelligence;
  warnings: string[];
  sourceLabel: string;
  sourceUrl?: string;
  salesAdvice: string[];
};

type ScoredRecord = {
  record: CompetitorComparisonRecord;
  score: number;
  exactSku: boolean;
  reasons: string[];
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

function toSearchConfidence(
  score: number,
  exactSku: boolean,
): "High" | "Medium" | "Low" {
  if (exactSku || score >= 240) return "High";
  if (score >= 140) return "Medium";
  return "Low";
}

function comparisonId(record: CompetitorComparisonRecord): string {
  return `${normalizeId(record.brand)}::${normalizeSku(record.competitorSku)}`;
}

function sourceTypeForRecord(
  record: CompetitorComparisonRecord,
): CompetitorCompareOptionSource {
  if (record.provenance?.source === "manual") return "manual";
  if (record.provenance?.mode === "lookup") return "lookup";
  return "curated";
}

function mergedRecords(): CompetitorComparisonRecord[] {
  const manual = getManualCompetitorComparisonRecords().map((record) =>
    toManualComparisonRecord(record),
  );
  return mergeComparisonRecords(manual, getComparisonRecords());
}

function scoreRecord(
  record: CompetitorComparisonRecord,
  brand: string,
  query: string,
): ScoredRecord | null {
  const normalizedBrand = normalizeId(brand);
  const normalizedQuery = normalizeId(query);
  const queryUpper = normalizeSku(query);
  const queryLower = tidy(query).toLowerCase();
  if (!normalizedBrand || normalizedQuery.length < 2) return null;
  if (normalizeId(record.brand) !== normalizedBrand) return null;

  const reasons: string[] = [`${record.brand} brand match.`];
  let score = 25;
  let exactSku = false;

  const competitorSku = normalizeSku(record.competitorSku);
  const competitorSkuCompact = normalizeId(record.competitorSku);
  if (competitorSku === queryUpper || competitorSkuCompact === normalizedQuery) {
    score += 260;
    exactSku = true;
    reasons.push("Exact competitor SKU match.");
  } else if (competitorSkuCompact.startsWith(normalizedQuery)) {
    score += 210;
    reasons.push("Competitor SKU starts with the typed entry.");
  } else if (competitorSkuCompact.includes(normalizedQuery)) {
    score += 165;
    reasons.push("Competitor SKU contains the typed entry.");
  }

  const competitorName = tidy(record.competitorName).toLowerCase();
  if (competitorName && competitorName.includes(queryLower)) {
    score += 70;
    reasons.push("Competitor name matches the typed entry.");
  }

  const metadataBlob = [
    record.category,
    record.summary,
    record.rationale,
    ...(record.features ?? []),
    ...(record.notes ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (metadataBlob.includes(queryLower)) {
    score += 32;
    reasons.push("Category or summary text supports the match.");
  }

  const minimum = normalizedQuery.length <= 4 && !exactSku ? 90 : 60;
  if (score < minimum) return null;

  return {
    record,
    score,
    exactSku,
    reasons: dedupeStrings(reasons, 5),
  };
}

function clarifyingQuestions(candidates: CompetitorCompareCandidate[]): string[] {
  if (candidates.length < 2) return [];

  const skus = candidates
    .slice(0, 3)
    .map((candidate) => normalizeSku(candidate.comparison.competitorSku));
  const out: string[] = [];

  if (
    skus.some((sku) => sku.endsWith("-TX")) &&
    skus.some((sku) => sku.endsWith("-RX"))
  ) {
    out.push(
      "Confirm whether the customer means the TX/encoder side or the RX/decoder side.",
    );
  }

  const categories = Array.from(
    new Set(candidates.slice(0, 3).map((candidate) => candidate.comparison.category)),
  );
  if (categories.length > 1) {
    out.push(
      "Confirm the product type before quoting: switcher, matrix, extender, or AVoIP endpoint.",
    );
  }

  return dedupeStrings(out, 4);
}

function salesAdvice(
  status: CompetitorCompareSearchResult["status"],
  candidates: CompetitorCompareCandidate[],
): string[] {
  if (candidates.length === 0) {
    return [
      "Ask for one more identifier such as the full SKU, product URL, or product family.",
      "If the customer only has a partial SKU, confirm whether it is TX/RX, encoder/decoder, or switcher/matrix.",
      "Use live verification once the target competitor SKU is narrowed down.",
    ];
  }

  const best = candidates[0];
  const primary = best.primaryOption;
  const out = [
    "Search confidence tells you how sure Wingman is about the competitor SKU identification before live verification.",
    primary
      ? `Lead with ${primary.wyrestormSku} as the ${primary.label.toLowerCase()} for ${best.comparison.competitorSku}.`
      : `Lead with ${best.comparison.wyrestormSku} as the nearest WyreStorm fit for ${best.comparison.competitorSku}.`,
  ];

  if (primary?.salesStory?.length) out.push(...primary.salesStory);
  else if (best.comparison.rationale) out.push(best.comparison.rationale);

  if (status === "ambiguous") {
    out.push(
      "Treat the shortlist as guidance until the competitor SKU is confirmed with the customer.",
    );
  }

  if (primary?.cautions?.[0]) out.push(primary.cautions[0]);
  else if (best.comparison.notes?.[0]) out.push(best.comparison.notes[0]);

  return dedupeStrings(out, 6);
}

export function buildCandidateFromComparisonRecord(
  record: CompetitorComparisonRecord,
  options: {
    searchScore?: number;
    exactSku?: boolean;
    sourceType?: CompetitorCompareOptionSource;
    sourceLabel?: string;
    searchReasons?: string[];
  } = {},
): CompetitorCompareCandidate {
  const sourceType = options.sourceType || sourceTypeForRecord(record);
  const fitOptions = buildComparisonOptions(record, sourceType);
  const primaryOption = fitOptions[0];

  return {
    id: comparisonId(record),
    comparison: record,
    searchScore: Number(options.searchScore) || 100,
    searchConfidence: toSearchConfidence(
      Number(options.searchScore) || 100,
      Boolean(options.exactSku),
    ),
    exactSku: Boolean(options.exactSku),
    sourceLabel: options.sourceLabel || record.provenance?.label || "Comparison dataset",
    sourceType,
    searchReasons:
      options.searchReasons && options.searchReasons.length > 0
        ? options.searchReasons
        : ["Comparison record is available for this competitor SKU."],
    options: fitOptions,
    primaryOption,
  };
}

export function searchCompetitorComparisons(
  brand: string,
  query: string,
): CompetitorCompareSearchResult {
  const cleanBrand = tidy(brand);
  const cleanQuery = tidy(query);
  if (!cleanBrand || normalizeId(cleanQuery).length < 2) {
    return {
      brand: cleanBrand,
      query: cleanQuery,
      status: "idle",
      summary:
        "Start typing a competitor SKU or model to shortlist likely WyreStorm fits.",
      candidates: [],
      suggestedWyrestormSkus: [],
      clarifyingQuestions: [],
      salesAdvice: [
        "Use at least two characters from the competitor SKU or model to begin searching.",
      ],
    };
  }

  const candidates = mergedRecords()
    .map((record) => scoreRecord(record, cleanBrand, cleanQuery))
    .filter((item): item is ScoredRecord => item != null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.record.competitorSku.localeCompare(right.record.competitorSku),
    )
    .slice(0, 6)
    .map((item) =>
      buildCandidateFromComparisonRecord(item.record, {
        searchScore: item.score,
        exactSku: item.exactSku,
        sourceType: sourceTypeForRecord(item.record),
        sourceLabel: item.record.provenance?.label || "Comparison dataset",
        searchReasons: item.reasons,
      }),
    );

  if (candidates.length === 0) {
    return {
      brand: cleanBrand,
      query: cleanQuery,
      status: "no-match",
      summary: "No local comparison match found yet. Add more detail or verify live.",
      candidates: [],
      suggestedWyrestormSkus: [],
      clarifyingQuestions: ["Ask for the full SKU, product page URL, or product family."],
      salesAdvice: salesAdvice("no-match", []),
    };
  }

  const top = candidates[0];
  const ambiguous =
    candidates.length > 1 &&
    !top.exactSku &&
    (top.searchConfidence !== "High" ||
      top.searchScore - candidates[1].searchScore <= 30);
  const status: CompetitorCompareSearchResult["status"] = ambiguous
    ? "ambiguous"
    : "resolved";
  const suggestedWyrestormSkus = suggestedWyrestormSkusForRecords(
    candidates.map((candidate) => ({
      comparison: candidate.comparison,
      sourceType: candidate.sourceType,
    })),
    6,
  );

  return {
    brand: cleanBrand,
    query: cleanQuery,
    status,
    summary:
      status === "ambiguous"
        ? `Multiple competitor matches fit "${cleanQuery}". Confirm the exact SKU before sharing a final replacement.`
        : `Nearest local match: ${top.comparison.competitorSku} -> ${top.primaryOption?.wyrestormSku || top.comparison.wyrestormSku}.`,
    candidates,
    bestCandidate: top,
    suggestedWyrestormSkus,
    clarifyingQuestions: clarifyingQuestions(candidates),
    salesAdvice: salesAdvice(status, candidates),
  };
}

export async function verifyCompetitorComparisonLive(
  brand: string,
  competitorSkuOrQuery: string,
): Promise<CompetitorCompareLiveResult> {
  const query = [tidy(brand), tidy(competitorSkuOrQuery)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const result = await lookupAndCompare(query);
  const record = result.records[0];
  const candidate = record
    ? buildCandidateFromComparisonRecord(record, {
        searchScore: 300,
        exactSku: true,
        sourceType: "lookup",
        sourceLabel: record.provenance?.label || result.lookup.provenance.label,
        searchReasons: [
          "Live verification returned a competitor comparison record.",
        ],
      })
    : undefined;

  return {
    query,
    record,
    candidate,
    intelligence: record?.intelligence,
    warnings: dedupeStrings(result.lookup.warnings, 6),
    sourceLabel: record?.provenance?.label || result.lookup.provenance.label,
    sourceUrl: record?.provenance?.sourceUrl || result.lookup.provenance.sourceUrl,
    salesAdvice: salesAdvice("resolved", candidate ? [candidate] : []),
  };
}
