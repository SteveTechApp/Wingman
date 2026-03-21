export type CatalogItem = {
  sku: string;
  name: string;
  summary?: string;
  sourceUrl?: string;
};

export const catalog: CatalogItem[] = [];