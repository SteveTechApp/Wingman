import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const cssPath = resolve(repoRoot, "src/wingman2/styles/wingman-style-stack.css");
const cachePath = resolve(repoRoot, "src/wingman2/lib/productIntelligenceIndexCache.ts");
const comparePath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx");

function fail(message) {
  console.error(`[wingman-hard-repair-guard] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

assert(existsSync(cssPath), "Missing wingman-style-stack.css");
assert(existsSync(cachePath), "Missing productIntelligenceIndexCache.ts");
assert(existsSync(comparePath), "Missing ComparePageNew.tsx");

const cssBytes = statSync(cssPath).size;
const cssMb = cssBytes / 1024 / 1024;
assert(cssMb < 20, `wingman-style-stack.css is still too large (${cssMb.toFixed(2)} MB).`);

const compareSource = readFileSync(comparePath, "utf8");
const importMatches = compareSource.match(/import\s*\{\s*loadProductIntelligenceIndex\s*\}\s*from\s*["']\.\.\/lib\/productIntelligenceIndexCache["'];/g) ?? [];

assert(importMatches.length === 1, `Expected exactly one loadProductIntelligenceIndex import, found ${importMatches.length}.`);
assert(compareSource.includes("loadProductIntelligenceIndex()"), "ComparePageNew is not using cached product-index loader.");

console.log(`[wingman-hard-repair-guard] CSS size ${cssMb.toFixed(2)} MB`);
console.log("[wingman-hard-repair-guard] Hard repair guard passed.");