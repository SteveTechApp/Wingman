import { getCatalogProducts } from "./repository";
import type { CatalogProduct } from "./types";

export type CatalogItem = {
  sku: string;
  name: string;
  family: string;
  category: string;
  tags: string[];
  sourcePath: string;
};

export const WORKFLOW_CATALOG_SOURCE = "@/catalog/repository";

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

function dedupe(values: unknown[], limit = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function toCatalogItem(product: CatalogProduct): CatalogItem {
  return {
    sku: product.sku,
    name: firstNonEmpty([product.name, product.summary, product.sku]),
    family: firstNonEmpty([product.family, "General"]),
    category: firstNonEmpty([product.subcategory, product.category, "General"]),
    tags: dedupe([
      ...(product.normalizedTags || []),
      ...(product.features || []),
      ...(product.control || []),
      ...(product.audio || []),
      ...(product.inputs || []).map((port) => port.type),
      ...(product.outputs || []).map((port) => port.type),
      product.transport,
      product.video?.maxResolution,
    ]),
    sourcePath: WORKFLOW_CATALOG_SOURCE,
  };
}

export function getWorkflowCatalogItems(): CatalogItem[] {
  return getCatalogProducts()
    .map(toCatalogItem)
    .filter((item) => item.sku && item.name)
    .sort((left, right) => left.sku.localeCompare(right.sku));
}

export async function loadCatalogItems(): Promise<{ items: CatalogItem[]; sourcePath: string | null }> {
  const items = getWorkflowCatalogItems();

  return {
    items,
    sourcePath: items.length > 0 ? WORKFLOW_CATALOG_SOURCE : null,
  };
}
