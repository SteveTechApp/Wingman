import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const required = [
  "tools/audit-wingman-data-sources.mjs",
  "tools/archive-wingman-stale-data.mjs",
  "public/product-intelligence-index.json",
];

const missing = required.filter((relativePath) => !existsSync(path.join(root, relativePath)));

if (missing.length) {
  console.error("[data-sources] Check failed. Missing:");
  for (const file of missing) console.error("- " + file);
  process.exit(1);
}

const archiveTool = readFileSync(path.join(root, "tools/archive-wingman-stale-data.mjs"), "utf8");
const auditTool = readFileSync(path.join(root, "tools/audit-wingman-data-sources.mjs"), "utf8");

const requiredMarkers = [
  "protectedExactPaths",
  "protectedPrefixes",
  "isProtectedPath",
  "isArchiveAllowedPath",
  "backups/",
  "exports/",
];

const missingMarkers = requiredMarkers.filter((marker) => !archiveTool.includes(marker) && !auditTool.includes(marker));

if (missingMarkers.length) {
  console.error("[data-sources] Protected archive policy markers missing:");
  for (const marker of missingMarkers) console.error("- " + marker);
  process.exit(1);
}

const index = JSON.parse(readFileSync(path.join(root, "public/product-intelligence-index.json"), "utf8").replace(/^\uFEFF/, ""));
const products = Array.isArray(index)
  ? index
  : Array.isArray(index.products)
    ? index.products
    : Array.isArray(index.entries)
      ? index.entries
      : [];

if (products.length < 100) {
  console.error("[data-sources] Product index looks too small: " + products.length);
  process.exit(1);
}

console.log("[data-sources] Verified protected data-source audit tools and product index baseline.");
