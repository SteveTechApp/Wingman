import { getCatalogProducts } from "@/catalog";
import type { CatalogueProduct } from "./catalogue.types";
import { toCatalogueProduct } from "./catalogueProjection";

export const realCatalogueProducts: CatalogueProduct[] = getCatalogProducts().map(toCatalogueProduct);
