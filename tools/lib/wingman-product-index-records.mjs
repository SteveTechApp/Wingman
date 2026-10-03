/**
 * Full-record loader for Node-side tools (checks, audits, generators).
 *
 * The browser runtime reads product-intelligence-summary.json and hydrates
 * per-SKU detail files on demand (src/wingman2/lib/productIntelligenceIndexCache.ts);
 * the former single ~10MB public/product-intelligence-index.json is no longer
 * emitted. Node tools that need whole records (technicalProfile,
 * salesLanguage, dataMaintenance, sourceCatalog) reassemble them here from
 * the summary payload plus the per-SKU detail files, falling back to the
 * legacy single-file index when only that exists.
 */
import fs from "node:fs";
import path from "node:path";

function skuKey(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

export function extractProducts(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["products", "records", "items", "catalog", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Object.values(payload ?? {}).find(Array.isArray) ?? [];
}

/**
 * Read every product with its deferred detail fields merged in.
 * Reads: public/product-intelligence-summary.json plus
 * public/product-intelligence-details.json + public/product-intelligence-details/*,
 * or public/product-intelligence-index.json when only the legacy file exists.
 */
export function loadFullProductRecords(projectRoot = process.cwd()) {
  const summaryPath = path.join(projectRoot, "public", "product-intelligence-summary.json");
  const legacyPath = path.join(projectRoot, "public", "product-intelligence-index.json");

  if (!fs.existsSync(summaryPath)) {
    if (fs.existsSync(legacyPath)) {
      return extractProducts(JSON.parse(fs.readFileSync(legacyPath, "utf8")));
    }
    throw new Error(
      "Missing public/product-intelligence-summary.json. Run npm run data:product-intelligence-index.",
    );
  }

  const products = extractProducts(JSON.parse(fs.readFileSync(summaryPath, "utf8")));
  const manifestPath = path.join(projectRoot, "public", "product-intelligence-details.json");
  if (!fs.existsSync(manifestPath)) return products;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const detailFiles = manifest?.products ?? {};

  return products.map((product) => {
    const entry = detailFiles[skuKey(product.sku)];
    if (!entry?.path) return product;
    try {
      const detail = JSON.parse(fs.readFileSync(path.join(projectRoot, "public", entry.path), "utf8"));
      return { ...product, ...detail };
    } catch {
      return product;
    }
  });
}
