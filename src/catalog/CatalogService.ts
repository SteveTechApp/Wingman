import { PRODUCT_DATABASE } from "@/data/productDatabase";
import type { Product } from "./types";

export function listAll(): Product[] {
  return PRODUCT_DATABASE as unknown as Product[];
}

export function isSelectable(p: Product): boolean {
  return p.lifecycle !== "eol";
}
