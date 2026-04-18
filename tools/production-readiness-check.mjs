import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const requiredFiles = [
  path.join(projectRoot, "docs", "production-readiness-audit.md"),
  path.join(projectRoot, "data", "catalog", "wyrestormSkuCatalog.2026.json"),
  path.join(projectRoot, "data", "catalog", "wyrestorm-catalog.phase1.json"),
  path.join(projectRoot, "data", "catalog", "competitor-catalog.phase4.json"),
  path.join(projectRoot, "data", "catalog", "competitor-compare.seed.json"),
  path.join(projectRoot, "data", "governance", "wingman-governance.json"),
  path.join(projectRoot, "public", "product-intelligence-index.json"),
];

const errors = [];

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) {
    errors.push(`Missing required runtime file: ${path.relative(projectRoot, filePath)}`);
  }
}

const publicIndexPath = path.join(projectRoot, "public", "product-intelligence-index.json");
if (existsSync(publicIndexPath)) {
  const index = JSON.parse(readFileSync(publicIndexPath, "utf8"));
  const products = Array.isArray(index?.products) ? index.products : [];
  const sources = Array.isArray(index?.meta?.sourceFiles) ? index.meta.sourceFiles : [];

  if (products.length === 0) {
    errors.push("Public product intelligence index is empty.");
  }

  if (sources.length === 0) {
    errors.push("Public product intelligence index does not record any canonical source files.");
  }
}

const catalogFilesSource = readFileSync(
  path.join(projectRoot, "server", "catalog", "files.mjs"),
  "utf8",
);

if (catalogFilesSource.includes('"src", "data"') || catalogFilesSource.includes("SRC_DATA_DIR")) {
  errors.push("server/catalog/files.mjs still references legacy src/data paths.");
}

const storeSource = readFileSync(
  path.join(projectRoot, "server", "wingman-app-store.mjs"),
  "utf8",
);

if (storeSource.includes('"src", "data", "governance"')) {
  errors.push("server/wingman-app-store.mjs still references legacy src/data governance paths.");
}

if (errors.length > 0) {
  console.error("[readiness] Audit failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const index = JSON.parse(readFileSync(publicIndexPath, "utf8"));
console.log(
  `[readiness] Verified canonical runtime data and public product index (${index.products.length} products).`,
);
