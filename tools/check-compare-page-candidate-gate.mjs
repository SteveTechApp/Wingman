import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const pagePath = path.join(ROOT, "src", "wingman2", "pages", "ComparePageNew.tsx");

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${path.relative(ROOT, filePath)}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

const page = read(pagePath);

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
  "data-wingman-compare-auto-advance=\"true\"",
  "setWorkflowStep(\"matrix\")",
  "onSubmit={handleSubmit}"
];

for (const marker of requiredMarkers) {
  if (!page.includes(marker)) {
    fail(`ComparePage missing: ${marker}`);
  }
}

if (page.includes("Find WyreStorm Alternatives")) {
  fail("ComparePage still contains removed blue-button text: Find WyreStorm Alternatives");
}

if (page.includes("disabled={!competitorInput.trim()}")) {
  fail("ComparePage still contains old submit-button disabled marker instead of SKU auto-advance workflow.");
}

const handleStart = page.indexOf("const handleSkuSelect = useCallback");
const handleEnd = page.indexOf("const handleSubmit = useCallback", handleStart);

if (handleStart < 0 || handleEnd < 0) {
  fail("Could not isolate handleSkuSelect before handleSubmit.");
}

if (handleStart >= 0 && handleEnd > handleStart) {
  const handler = page.slice(handleStart, handleEnd);

  const handlerMarkers = [
    "normalizeCompetitorSku(",
    "runKnownProfileCompare(",
    "setState(\"analyzing\")",
    "setState(\"results\")",
    "setWorkflowStep(\"matrix\")"
  ];

  for (const marker of handlerMarkers) {
    if (!handler.includes(marker)) {
      fail(`handleSkuSelect missing auto-advance marker: ${marker}`);
    }
  }
}

const submitStart = page.indexOf("const handleSubmit = useCallback");
const retryStart = page.indexOf("const handleRetryWithSourceUrl", submitStart);

if (submitStart < 0 || retryStart < 0) {
  fail("Could not isolate handleSubmit before live lookup retry.");
}

if (submitStart >= 0 && retryStart > submitStart) {
  const submitHandler = page.slice(submitStart, retryStart);

  if (!submitHandler.includes("runKnownProfileCompare(")) {
    fail("handleSubmit should remain as Enter/manual fallback and still run compare.");
  }

  if (!submitHandler.includes("setWorkflowStep(\"matrix\")")) {
    fail("handleSubmit fallback should still advance workflow to matrix.");
  }
}

const retryStartIndex = page.indexOf("const handleRetryWithSourceUrl");
const resetStart = page.indexOf("const handleReset", retryStartIndex);

if (retryStartIndex < 0 || resetStart < 0) {
  fail("Could not isolate handleRetryWithSourceUrl.");
}

if (retryStartIndex >= 0 && resetStart > retryStartIndex) {
  const retryHandler = page.slice(retryStartIndex, resetStart);

  if (!retryHandler.includes("lookupCompareIntelligence(")) {
    fail("Live lookup retry path missing lookupCompareIntelligence.");
  }

  if (!retryHandler.includes("runKnownProfileCompare(")) {
    fail("Live lookup retry path missing compare rerun.");
  }
}

if (failures.length > 0) {
  console.error("[compare-page-candidate-gate] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log("[compare-page-candidate-gate] Verified active Compare page applies SKU auto-advance, candidate gate, manual Enter fallback, and live lookup retry before match ranking.");