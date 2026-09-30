import { readFileSync } from "node:fs";
import { join } from "node:path";

import summaryPayload from "../../../../public/product-intelligence-summary.json";
import detailsManifest from "../../../../public/product-intelligence-details.json";

/**
 * Full product records for test fixtures: the summary payload merged with
 * every per-SKU deferred detail file. Mirrors
 * tools/lib/wingman-product-index-records.mjs for the browser-side TS world
 * (vitest cannot import a computed list of JSON files statically, so the
 * manifest keys are read at module init here).
 *
 * Tests that assert spec-derived behaviour (technicalProfile, USB versions,
 * routed I/O) need these full records, not the summary alone.
 */
export function buildFullProductIndexRecords(): Array<Record<string, unknown>> {
  const products = (Array.isArray(summaryPayload) ? summaryPayload : (summaryPayload as { products?: Array<Record<string, unknown>> }).products ?? []);
  const manifest = (detailsManifest as { products?: Record<string, { path?: string }> }).products ?? {};
  return products.map((product) => {
    const key = String(product.sku ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
    const entry = manifest[key];
    if (!entry?.path) return product;
    try {
      const detail = JSON.parse(readFileSync(join(process.cwd(), "public", entry.path), "utf8")) as Record<string, unknown>;
      return { ...product, ...detail };
    } catch {
      return product;
    }
  });
}

export const fullProductIndexRecords: Array<Record<string, unknown>> = buildFullProductIndexRecords();
