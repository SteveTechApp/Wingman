import rawCompetitors from "@/data/catalog/competitor-catalog.phase4.json";
import { enrichCatalogProduct } from "@/catalog/enrich";
import { rankCatalogMatches } from "@/catalog/match";
import { filterCatalog, normalizeCatalogProduct } from "@/catalog/normalize";
import type {
  CatalogFilters,
  CatalogMatchRequest,
  CatalogMatchResult,
  CatalogProduct,
} from "@/catalog/types";

export type CompetitorProduct = CatalogProduct & {
  brand?: string;
};

const COMPETITORS: CompetitorProduct[] = (Array.isArray(rawCompetitors) ? rawCompetitors : [])
  .map((x) => normalizeCatalogProduct(x as CompetitorProduct))
  .map((x) => enrichCatalogProduct(x as CompetitorProduct) as CompetitorProduct);

export function getCompetitorProducts(): CompetitorProduct[] {
  return [...COMPETITORS];
}

export function getCompetitorBrands(): string[] {
  return [...new Set(COMPETITORS.map((p) => String(p.brand || "").trim()).filter(Boolean))].sort();
}

export function getCompetitorFamilies(): string[] {
  return [...new Set(COMPETITORS.map((p) => p.family).filter(Boolean))].sort();
}

export function getCompetitorCategories(): string[] {
  return [...new Set(COMPETITORS.map((p) => p.category).filter(Boolean))].sort();
}

export function queryCompetitorProducts(
  filters?: CatalogFilters & { brand?: string | "All" }
): CompetitorProduct[] {
  let rows = filterCatalog(
    COMPETITORS as unknown as CatalogProduct[],
    filters
  ) as CompetitorProduct[];

  if (filters?.brand && filters.brand !== "All") {
    rows = rows.filter((p) => String(p.brand || "").trim() === filters.brand);
  }

  if (filters?.feature && filters.feature !== "All") {
    const feature = String(filters.feature).trim().toLowerCase();
    rows = rows.filter((p) => (p.normalizedTags || []).includes(feature));
  }

  return rows;
}

export function findCompetitorBySku(sku: string): CompetitorProduct | undefined {
  const key = String(sku || "").trim().toUpperCase();
  return COMPETITORS.find((p) => p.sku === key);
}

export function matchCompetitorProducts(
  request?: CatalogMatchRequest
): CatalogMatchResult[] {
  return rankCatalogMatches(COMPETITORS, request);
}