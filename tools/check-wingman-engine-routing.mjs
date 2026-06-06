import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "src/wingman2/pages/ComparePage.tsx",
  "src/wingman2/lib/competitorCompareDecision.ts",
  "src/wingman2/lib/avDecisionEvidence.ts",
  "src/wingman2/lib/recommendationEvidence.ts",
  "public/product-intelligence-index.json",
];

const missingFiles = requiredFiles.filter((relativePath) => !existsSync(path.join(root, relativePath)));

if (missingFiles.length) {
  console.error("[engine-routing] Missing required files:");
  for (const file of missingFiles) console.error("- " + file);
  process.exit(1);
}

const compare = readFileSync(path.join(root, "src/wingman2/pages/ComparePage.tsx"), "utf8");
const classifier = readFileSync(path.join(root, "src/wingman2/lib/competitorCompareDecision.ts"), "utf8");

const requiredClassifierMarkers = [
  "classifyCompetitorCompareDecision",
  "GOOD MATCH",
  "PARTIAL MATCH",
  "NO MATCH",
  "VERIFY",
  "Technology class mismatch",
  "Product role mismatch",
  "Transport mismatch",
];

const missingClassifierMarkers = requiredClassifierMarkers.filter((marker) => !classifier.includes(marker));

if (missingClassifierMarkers.length) {
  console.error("[engine-routing] Competitor classifier is incomplete:");
  for (const marker of missingClassifierMarkers) console.error("- Missing marker: " + marker);
  process.exit(1);
}

if (!compare.includes("COMPARE_SKU_TYPEAHEAD_CATALOG")) {
  console.error("[engine-routing] ComparePage is missing the competitor SKU type-ahead catalogue.");
  process.exit(1);
}

console.log("[engine-routing] Baseline engine files and competitor classifier are present.");
console.log("[engine-routing] Use npm run audit:engine-routing for the conceptual routing report.");
