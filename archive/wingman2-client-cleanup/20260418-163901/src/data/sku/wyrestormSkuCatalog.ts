import rawCatalog from "@/data/wyrestormSkuCatalog.2026.json";

export type WyreStormSkuCatalogItem = {
  sku: string;
  name: string;
  slug: string;
  family: string;
  type: string;
  description: string;
  searchText: string;
  source: string;
  year: number;
};

export type WyreStormSkuCatalog = {
  source: string;
  year: number;
  items: WyreStormSkuCatalogItem[];
};

export const wyrestormSkuCatalogItems: WyreStormSkuCatalogItem[] = rawCatalog as WyreStormSkuCatalogItem[];

export const WYRESTORM_SKU_CATALOG_SOURCE =
  wyrestormSkuCatalogItems[0]?.source || "2026 Wyrestorm SKU (1).xlsx";

export const WYRESTORM_SKU_CATALOG_YEAR =
  wyrestormSkuCatalogItems[0]?.year || 2026;

export const wyrestormSkuCatalog: WyreStormSkuCatalog = {
  source: WYRESTORM_SKU_CATALOG_SOURCE,
  year: WYRESTORM_SKU_CATALOG_YEAR,
  items: wyrestormSkuCatalogItems,
};

export const wyrestormSkuCatalog2026 = wyrestormSkuCatalogItems;

export default wyrestormSkuCatalog;
