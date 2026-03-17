import competitorCatalog from "@/data/catalog/competitorCatalog";

export type LocalCompetitorLookupMatch = {
  brand: string;
  sku: string;
  name?: string;
  family?: string;
  category?: string;
  wyrestormSku?: string;
  wyrestormName?: string;
  score: number;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalize(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function containsNormalized(haystack: unknown, needle: unknown): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  return Boolean(h && n && h.includes(n));
}

function scoreRow(row: any, brand: string, sku: string): number {
  const rowBrand = tidy(row.brand || row.manufacturer || row.vendor);
  const rowSku = tidy(row.sku || row.model || row.partNumber);
  const rowName = tidy(row.name || row.productName || row.title);

  let score = 0;

  if (normalize(rowBrand) === normalize(brand)) score += 50;
  if (containsNormalized(rowBrand, brand)) score += 20;

  if (normalize(rowSku) === normalize(sku)) score += 120;
  if (containsNormalized(rowSku, sku)) score += 70;

  if (containsNormalized(rowName, sku)) score += 25;

  return score;
}

function toMatch(row: any, score: number): LocalCompetitorLookupMatch {
  return {
    brand: tidy(row.brand || row.manufacturer || row.vendor || "Unknown"),
    sku: tidy(row.sku || row.model || row.partNumber || ""),
    name: tidy(row.name || row.productName || row.title) || undefined,
    family: tidy(row.family || row.series) || undefined,
    category: tidy(row.category || row.type) || undefined,
    wyrestormSku: tidy(
      row.wyrestormSku ||
      row.wyreStormSku ||
      row.wyrestormEquivalentSku ||
      row.matchSku ||
      row.recommendedSku
    ) || undefined,
    wyrestormName: tidy(
      row.wyrestormName ||
      row.wyreStormName ||
      row.wyrestormEquivalentName ||
      row.matchName ||
      row.recommendedName
    ) || undefined,
    score,
  };
}

export function lookupCompetitorLocally(brand: string, sku: string): LocalCompetitorLookupMatch[] {
  const rows = Array.isArray(competitorCatalog) ? competitorCatalog : [];
  const scored = rows
    .map((row) => ({ row, score: scoreRow(row, brand, sku) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => toMatch(item.row, item.score));

  return scored;
}
