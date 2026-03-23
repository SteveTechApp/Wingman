import rawCompetitors from "@/data/catalog/competitorCatalog";
import { enrichCatalogProduct } from "@/catalog/enrich";
import { rankCatalogMatches } from "@/catalog/match";
import { filterCatalog, normalizeCatalogProduct } from "@/catalog/normalize";
import { sanitizeCompetitorForMatching } from "@/competitor/matchingSupport";
import type {
  CatalogFilters,
  CatalogMatchRequest,
  CatalogMatchResult,
  CatalogProduct,
} from "@/catalog/types";
import {
  getLiveProductDataRecords,
  getLiveProductDataToken,
  mapProductIntelligenceRecordToCatalogProduct,
} from "@/services/liveProductDataStore";

export type CompetitorProduct = CatalogProduct & {
  brand?: string;
};

const SEEDED_COMPETITORS: CompetitorProduct[] = (Array.isArray(rawCompetitors) ? rawCompetitors : [])
  .map((item) => normalizeCatalogProduct(item as CompetitorProduct))
  .map((item) =>
    sanitizeCompetitorForMatching(
      enrichCatalogProduct(item as CompetitorProduct) as CompetitorProduct,
    ),
  );

let resolvedCompetitorToken = "";
let resolvedCompetitorCache: CompetitorProduct[] = SEEDED_COMPETITORS;

function competitorKey(product: CompetitorProduct): string {
  return `${String(product.brand || "").trim().toLowerCase()}::${product.sku}`;
}

function mergeCompetitorProducts(seed: CompetitorProduct[], live: CompetitorProduct[]): CompetitorProduct[] {
  const merged = new Map<string, CompetitorProduct>();

  for (const product of seed) {
    merged.set(competitorKey(product), product);
  }

  for (const product of live) {
    merged.set(competitorKey(product), product);
  }

  return Array.from(merged.values()).sort((left, right) => {
    const brandCmp = String(left.brand || "").localeCompare(String(right.brand || ""));
    if (brandCmp !== 0) return brandCmp;
    return left.sku.localeCompare(right.sku);
  });
}

function getResolvedCompetitors(): CompetitorProduct[] {
  const token = getLiveProductDataToken();
  if (token === resolvedCompetitorToken) return resolvedCompetitorCache;

  resolvedCompetitorToken = token;
  const liveCompetitors = getLiveProductDataRecords("competitor").map((record) =>
    sanitizeCompetitorForMatching({
      ...mapProductIntelligenceRecordToCatalogProduct(record),
      brand: record.brand,
    }),
  );
  resolvedCompetitorCache = mergeCompetitorProducts(SEEDED_COMPETITORS, liveCompetitors);
  return resolvedCompetitorCache;
}

export function getCompetitorProducts(): CompetitorProduct[] {
  return [...getResolvedCompetitors()];
}

export function getCompetitorBrands(): string[] {
  return [...new Set(getResolvedCompetitors().map((product) => String(product.brand || "").trim()).filter(Boolean))].sort();
}

export function getCompetitorFamilies(): string[] {
  return [...new Set(getResolvedCompetitors().map((product) => product.family).filter(Boolean))].sort();
}

export function getCompetitorCategories(): string[] {
  return [...new Set(getResolvedCompetitors().map((product) => product.category).filter(Boolean))].sort();
}

export function queryCompetitorProducts(
  filters?: CatalogFilters & { brand?: string | "All" }
): CompetitorProduct[] {
  let rows = filterCatalog(
    getResolvedCompetitors() as unknown as CatalogProduct[],
    filters
  ) as CompetitorProduct[];

  if (filters?.brand && filters.brand !== "All") {
    rows = rows.filter((product) => String(product.brand || "").trim() === filters.brand);
  }

  if (filters?.feature && filters.feature !== "All") {
    const feature = String(filters.feature).trim().toLowerCase();
    rows = rows.filter((product) => (product.normalizedTags || []).includes(feature));
  }

  return rows;
}

export function findCompetitorBySku(sku: string): CompetitorProduct | undefined {
  const key = String(sku || "").trim().toUpperCase();
  return getResolvedCompetitors().find((product) => product.sku === key);
}

export function matchCompetitorProducts(
  request?: CatalogMatchRequest
): CatalogMatchResult[] {
  return rankCatalogMatches(getResolvedCompetitors(), request);
}
