import { getLiveProductDataRecords, getLiveProductDataToken, mapProductIntelligenceRecordToCatalogProduct } from "@/services/liveProductDataStore";

import { buildWyrestormSeedCatalogProducts } from "./seedCatalog";
import { rankCatalogMatches } from "./match";
import { filterCatalog } from "./normalize";
import type {
  CatalogFilters,
  CatalogMatchRequest,
  CatalogMatchResult,
  CatalogProduct
} from "./types";

const SEEDED_CATALOG: CatalogProduct[] = buildWyrestormSeedCatalogProducts();

let resolvedCatalogToken = "";
let resolvedCatalogCache: CatalogProduct[] = SEEDED_CATALOG;

function mergeCatalogProducts(seed: CatalogProduct[], live: CatalogProduct[]): CatalogProduct[] {
  const merged = new Map<string, CatalogProduct>();

  for (const product of seed) {
    merged.set(product.sku, product);
  }

  for (const product of live) {
    merged.set(product.sku, product);
  }

  return Array.from(merged.values()).sort((left, right) => left.sku.localeCompare(right.sku));
}

function getResolvedCatalog(): CatalogProduct[] {
  const token = getLiveProductDataToken();
  if (token === resolvedCatalogToken) return resolvedCatalogCache;

  resolvedCatalogToken = token;
  const liveCatalog = getLiveProductDataRecords("wyrestorm").map(mapProductIntelligenceRecordToCatalogProduct);
  resolvedCatalogCache = mergeCatalogProducts(SEEDED_CATALOG, liveCatalog);
  return resolvedCatalogCache;
}

export function getCatalogProducts(): CatalogProduct[] {
  return [...getResolvedCatalog()];
}

export function findCatalogProductBySku(sku: string): CatalogProduct | undefined {
  const key = String(sku || "").trim().toUpperCase();
  return getResolvedCatalog().find((product) => product.sku === key);
}

export function queryCatalogProducts(filters?: CatalogFilters): CatalogProduct[] {
  let rows = filterCatalog(getResolvedCatalog(), filters);

  if (filters?.feature && filters.feature !== "All") {
    const feature = String(filters.feature).trim().toLowerCase();
    rows = rows.filter((product) => (product.normalizedTags || []).includes(feature));
  }

  return rows;
}

export function getCatalogFamilies(): string[] {
  return [...new Set(getResolvedCatalog().map((product) => product.family).filter(Boolean))].sort();
}

export function getCatalogCategories(): string[] {
  return [...new Set(getResolvedCatalog().map((product) => product.category).filter(Boolean))].sort();
}

export function getCatalogFeatures(): string[] {
  return [...new Set(getResolvedCatalog().flatMap((product) => product.normalizedTags || []).filter(Boolean))].sort();
}

export function matchCatalogProducts(request?: CatalogMatchRequest): CatalogMatchResult[] {
  return rankCatalogMatches(getResolvedCatalog(), request);
}
