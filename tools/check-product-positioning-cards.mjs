import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, "src", "wingman2", "data", "productPositioningCards.ts");
const typePath = path.join(repoRoot, "src", "wingman2", "types", "productPositioning.ts");
const pagePath = path.join(repoRoot, "src", "wingman2", "pages", "ProductCallCardsPage.tsx");
const callCardJsonPath = path.join(repoRoot, "public", "product-call-card-products.json");

const requiredFiles = [dataPath, typePath, pagePath, callCardJsonPath];

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
  ["Product Call Cards", "Product discussion"],
  "Product identifier",
  "Scenario checkpoint",
  "Objection helper",
  "Confidence cue",
  "Sales confidence",
  "Create response wording",
  "getBestProductPositioningCardForSku",
];

for (const term of requiredPageTerms) {
  if (Array.isArray(term)) {
    if (!term.some((t) => pageText.includes(t))) {
      console.error(`[call-cards] ProductCallCardsPage is missing expected UI term (need one of: ${term.join(", ")})`);
      process.exit(1);
    }
  } else if (!pageText.includes(term)) {
    console.error(`[call-cards] ProductCallCardsPage is missing expected UI term: ${term}`);
    process.exit(1);
  }
}

console.log(`[call-cards] OK: ${topLevelSkus.length} product positioning cards found and required files are present.`);

const payload = JSON.parse(fs.readFileSync(callCardJsonPath, "utf8"));
const callCardProducts = Array.isArray(payload) ? payload : Array.isArray(payload.products) ? payload.products : [];

if (callCardProducts.length < 100) {
  console.error(`[call-cards] Expected at least 100 call-card product records, found ${callCardProducts.length}.`);
  process.exit(1);
}

const bannedPatterns = [
  /should be discussed around/i,
  /what customer problem is this product being used to solve\?/i,
  /fits [a-z /-]+ applications\./i,
  /validate the customer workflow before adding it to a project/i,
  /focused, single-purpose device/i,
];

const weakRecords = callCardProducts.filter((product) => {
  const haystack = [
    product.description,
    product.fit,
    product.openingLine,
    ...(Array.isArray(product.questions) ? product.questions : []),
  ].join(" ");

  return bannedPatterns.some((pattern) => pattern.test(haystack));
});

if (weakRecords.length > 0) {
  console.error("[call-cards] Found weak generic product helper copy in call-card records.");
  console.error(
    weakRecords
      .slice(0, 12)
      .map((product) => `- ${product.sku}`)
      .join("\n"),
  );
  process.exit(1);
}

console.log(
  `[call-cards] OK: ${callCardProducts.length} call-card product records use practical helper copy without banned filler patterns.`,
);
