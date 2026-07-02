import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const compareFiles = [
  path.join(root, "src/wingman2/pages/ComparePageNew.tsx"),
  path.join(root, "src/wingman2/pages/ComparePageNew.advanced.tsx"),
];

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

const sources = compareFiles.map((filePath) => ({
  filePath,
  relPath: path.relative(root, filePath).replaceAll("\\", "/"),
  text: readIfExists(filePath),
}));

const combinedSource = sources.map((source) => source.text).join("\n\n");

const requiredMarkers = [
  "CompareProductLookupInput",
  "compareSkuSuggestions",
  "skuOptionsForBrand",
  "brandForCompetitorSku",
  "handleSkuSelect",
  "normalizeCompetitorSku",
  "runKnownProfileCompare(",
  "applyCompareEquivalenceGuards",
  "applyKnownCompareProfileOverrides",
  "lookupCompareIntelligence",
  "shouldRequestLiveLookupUrl",
  'data-wingman-compare-auto-advance="true"',
  'setWorkflowStep("options")',
  "isSelectableWyrestormRecommendation",
  "No suitable WyreStorm match found from the current data",
  "onSubmit={handleSubmit}",
];

const failures = [];

for (const marker of requiredMarkers) {
  if (!combinedSource.includes(marker)) {
    failures.push(`ComparePage split implementation missing: ${marker}`);
  }
}

function hasHandler(source, handlerName) {
  const patterns = [
    `function ${handlerName}`,
    `const ${handlerName}`,
    `let ${handlerName}`,
    `var ${handlerName}`,
    `${handlerName} =`,
    `${handlerName}:`,
  ];

  return patterns.some((pattern) => source.includes(pattern));
}

const handlerSource = combinedSource;

if (!hasHandler(handlerSource, "handleSkuSelect")) {
  failures.push("Could not find handleSkuSelect in split Compare implementation.");
}

if (!hasHandler(handlerSource, "handleSubmit")) {
  failures.push("Could not find handleSubmit in split Compare implementation.");
}

if (!hasHandler(handlerSource, "handleRetryWithSourceUrl")) {
  failures.push("Could not find handleRetryWithSourceUrl in split Compare implementation.");
}

const advancedSource = sources.find((source) => source.relPath.endsWith("ComparePageNew.advanced.tsx"))?.text ?? "";

if (!advancedSource.includes("handleSubmit")) {
  failures.push("Advanced Compare implementation should retain handleSubmit.");
}

if (!advancedSource.includes("handleSkuSelect")) {
  failures.push("Advanced Compare implementation should retain handleSkuSelect.");
}

if (!combinedSource.includes("ComparePageNew.advanced")) {
  failures.push("ComparePageNew.tsx should preserve the advanced/manual Compare route behind the simplified wrapper.");
}

if (failures.length > 0) {
  console.error("[compare-page-candidate-gate] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[compare-page-candidate-gate] OK. Split Compare wrapper and advanced candidate gate markers are retained.");
