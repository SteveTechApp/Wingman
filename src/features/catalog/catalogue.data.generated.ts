import { getCatalogProducts } from "@/catalog";
import type { CatalogueProduct } from "./catalogue.types";
import { toCatalogueProduct } from "./catalogueProjection";

export function getRealCatalogueProducts(): CatalogueProduct[] {
  return getCatalogProducts().map(toCatalogueProduct);
}

export const realCatalogueProducts: CatalogueProduct[] = getRealCatalogueProducts();
