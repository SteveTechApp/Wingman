import type {
  CompareConfidence,
  DiscoveryProductFamily,
  ProjectCompareRecord,
} from "@/features/projects/projectStore";

export type CompetitorComparisonRecord = {
  brand: string;
  competitorSku: string;
  category: string;
  summary: string;
  features: string[];
  wyrestormSku: string;
  wyrestormCategory: string;
  confidence: CompareConfidence;
  rationale: string;
  recommendedFamilies: DiscoveryProductFamily[];
  notes: string[];
};

function toSearchString(item: CompetitorComparisonRecord): string {
  return [
    item.brand,
    item.competitorSku,
    item.category,
    item.summary,
    item.wyrestormSku,
    item.wyrestormCategory,
    item.rationale,
    ...(item.features ?? []),
    ...(item.notes ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesComparisonRecord(item: CompetitorComparisonRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return toSearchString(item).includes(q);
}

export function searchComparisonRecords(
  records: CompetitorComparisonRecord[],
  query: string
): CompetitorComparisonRecord[] {
  return records.filter((item) => matchesComparisonRecord(item, query));
}

export function findComparisonRecord(
  records: CompetitorComparisonRecord[],
  competitorSku: string
): CompetitorComparisonRecord | null {
  return records.find((item) => item.competitorSku === competitorSku) ?? null;
}

export function toProjectCompareRecord(item: CompetitorComparisonRecord): ProjectCompareRecord {
  return {
    brand: item.brand,
    competitorSku: item.competitorSku,
    category: item.category,
    summary: item.summary,
    features: item.features,
    wyrestormSku: item.wyrestormSku,
    wyrestormCategory: item.wyrestormCategory,
    confidence: item.confidence,
    rationale: item.rationale,
    recommendedFamilies: item.recommendedFamilies,
    notes: item.notes,
    createdAt: new Date().toISOString(),
  };
}

const competitorComparisonService = {
  matchesComparisonRecord,
  searchComparisonRecords,
  findComparisonRecord,
  toProjectCompareRecord,
};

export default competitorComparisonService;
