import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, "src", "wingman2", "data", "productPositioningCards.ts");
const typePath = path.join(repoRoot, "src", "wingman2", "types", "productPositioning.ts");
const pagePath = path.join(repoRoot, "src", "wingman2", "pages", "ProductCallCardsPage.tsx");

const requiredFiles = [dataPath, typePath, pagePath];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[call-cards] Missing required file: ${path.relative(repoRoot, file)}`);
    process.exit(1);
  }
}

const dataText = fs.readFileSync(dataPath, "utf8");
const topLevelSkus = [...dataText.matchAll(/^\s*\{\s*\r?\n\s*sku:\s*"([^"]+)"/gm)].map((match) => match[1]);

if (topLevelSkus.length < 40) {
  console.error(`[call-cards] Expected at least 40 product positioning cards, found ${topLevelSkus.length}.`);
  process.exit(1);
}

const duplicates = topLevelSkus.filter((sku, index) => topLevelSkus.indexOf(sku) !== index);
if (duplicates.length > 0) {
  console.error(`[call-cards] Duplicate SKU entries found: ${[...new Set(duplicates)].join(", ")}`);
  process.exit(1);
}

const requiredFields = [
  "oneLinePositioning",
  "oneMinuteBrief",
  "openingQuestions",
  "listenForTriggers",
  "disqualifiers",
  "objectionHandling",
  "attachProducts",
  "competitorAngles",
  "followUpWording",
  "reviewGates",
  "dataConfidence",
];

for (const field of requiredFields) {
  if (!dataText.includes(`${field}:`)) {
    console.error(`[call-cards] Required field is missing from data file: ${field}`);
    process.exit(1);
  }
}

const pageText = fs.readFileSync(pagePath, "utf8");
const requiredPageTerms = [
  "Product Call Cards",
  "ProductMediaPanel",
  "Audience",
  "Call mode",
  "Copy follow-up wording",
  "Compare competitor",
  "Create response pack",
];

for (const term of requiredPageTerms) {
  if (!pageText.includes(term)) {
    console.error(`[call-cards] ProductCallCardsPage is missing expected UI term: ${term}`);
    process.exit(1);
  }
}

console.log(`[call-cards] OK: ${topLevelSkus.length} product positioning cards found and required files are present.`);
