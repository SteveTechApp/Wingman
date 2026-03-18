import { competitorDatasetGenerated } from "./dataset.generated";
import { enrichCompetitorRecord, qualityBand } from "./quality";
import { cloneFromBase, normaliseRawRecord } from "./normalise";
import type { CompetitorItem, EnrichmentResult, PartialCompetitorSeed } from "./types";

export function loadCompetitorDataset(): CompetitorItem[] {
  return competitorDatasetGenerated;
}

export function buildIndex(items: CompetitorItem[]): Record<string, CompetitorItem> {
  const map: Record<string, CompetitorItem> = {};
  for (const item of items) {
    const key = `${item.brand}::${item.sku}`.toLowerCase();
    map[key] = item;
  }
  return map;
}

export function importRawRecords(rows: Array<Record<string, unknown>>): CompetitorItem[] {
  return rows.map(normaliseRawRecord);
}

export function createVariant(base: CompetitorItem, overrides: PartialCompetitorSeed): CompetitorItem {
  return cloneFromBase(base, overrides);
}

export function enrichDataset(items: CompetitorItem[]): EnrichmentResult[] {
  return items.map(enrichCompetitorRecord);
}

export function summariseDataset(items: CompetitorItem[]): {
  total: number;
  complete: number;
  usable: number;
  needsEnrichment: number;
  byBrand: Record<string, number>;
} {
  const enriched = enrichDataset(items);

  const byBrand: Record<string, number> = {};
  for (const item of items) {
    byBrand[item.brand] = (byBrand[item.brand] ?? 0) + 1;
  }

  return {
    total: items.length,
    complete: enriched.filter((x) => qualityBand(x.qualityScore) === "complete").length,
    usable: enriched.filter((x) => qualityBand(x.qualityScore) === "usable").length,
    needsEnrichment: enriched.filter((x) => qualityBand(x.qualityScore) === "needs-enrichment").length,
    byBrand
  };
}