import { getCatalogProducts } from "./repository";
import type { CatalogProduct } from "./types";

export type BoundCatalogueItem = {
  sku: string;
  family: string;
  title: string;
  note: string;
};

export const BOUND_CATALOGUE_SOURCE = "@/catalog/repository";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(values: unknown[]): string {
  for (const value of values) {
    const text = tidy(value);
    if (text) return text;
  }
  return "";
}

function buildNote(product: CatalogProduct): string {
  const parts = [
    product.summary,
    product.subcategory || product.category,
    product.transport && product.transport !== "Unknown" ? product.transport : "",
  ]
    .map(tidy)
    .filter(Boolean);

  return parts.join(" | ") || "Catalog repository item";
}

function toBoundCatalogueItem(product: CatalogProduct): BoundCatalogueItem {
  return {
    sku: product.sku,
    family: firstNonEmpty([product.family, "General"]),
    title: firstNonEmpty([product.name, product.summary, product.sku]),
    note: buildNote(product),
  };
}

export function getLiveCatalogueItems(): BoundCatalogueItem[] {
  return getCatalogProducts()
    .map(toBoundCatalogueItem)
    .filter((item) => item.sku && item.title)
    .sort((left, right) => left.sku.localeCompare(right.sku));
}

export function getLiveCatalogueFamilies(): string[] {
  return Array.from(new Set(getLiveCatalogueItems().map((item) => item.family))).sort((left, right) =>
    left.localeCompare(right),
  );
}
