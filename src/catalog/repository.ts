import rawCatalog from "@/data/catalog/wyrestorm-catalog.phase1.json";
import { enrichCatalogProduct } from "./enrich";
import { rankCatalogMatches } from "./match";
import { filterCatalog, normalizeCatalogProduct } from "./normalize";
import type {
  CatalogFilters,
  CatalogMatchRequest,
  CatalogMatchResult,
  CatalogProduct
} from "./types";

const CATALOG: CatalogProduct[] = (Array.isArray(rawCatalog) ? rawCatalog : [])
  .map((x) => normalizeCatalogProduct(x as CatalogProduct))
  .map((x) => enrichCatalogProduct(x));

export function getCatalogProducts(): CatalogProduct[] {
  return [...CATALOG];
}

export function findCatalogProductBySku(sku: string): CatalogProduct | undefined {
  const key = String(sku || "").trim().toUpperCase();
  return CATALOG.find((p) => p.sku === key);
}

export function queryCatalogProducts(filters?: CatalogFilters): CatalogProduct[] {
  let rows = filterCatalog(CATALOG, filters);

  if (filters?.feature && filters.feature !== "All") {
    const feature = String(filters.feature).trim().toLowerCase();
    rows = rows.filter((p) => (p.normalizedTags || []).includes(feature));
  }

  return rows;
}

export function getCatalogFamilies(): string[] {
  return [...new Set(CATALOG.map((p) => p.family).filter(Boolean))].sort();
}

export function getCatalogCategories(): string[] {
  return [...new Set(CATALOG.map((p) => p.category).filter(Boolean))].sort();
}

export function getCatalogFeatures(): string[] {
  return [...new Set(CATALOG.flatMap((p) => p.normalizedTags || []).filter(Boolean))].sort();
}

export function matchCatalogProducts(request?: CatalogMatchRequest): CatalogMatchResult[] {
  return rankCatalogMatches(CATALOG, request);
}