import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const pagePath = path.join(ROOT, "src", "wingman2", "pages", "ComparePageNew.tsx");
const cssPath = path.join(ROOT, "src", "wingman2", "styles", "wingman-style-stack.css");

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
const css = read(cssPath);

if (page.includes("Find WyreStorm Alternatives")) {
  fail("Compare page still contains the large Find WyreStorm Alternatives button text.");
}

const requiredPageMarkers = [
  "handleSkuSelect",
  "runKnownProfileCompare(",
  "data-wingman-compare-auto-advance=\"true\"",
  "setWorkflowStep(\"options\")",
  "Viable product choices",
  "Typed entries can still use Enter",
  "onSubmit={handleSubmit}"
];

for (const marker of requiredPageMarkers) {
  if (!page.includes(marker)) {
    fail(`ComparePageNew missing marker: ${marker}`);
  }
}

if (!css.includes(".wm-compare-auto-advance-note")) {
  fail("CSS missing auto-advance note styling.");
}

const handleStart = page.indexOf("const handleSkuSelect = useCallback");
const handleEnd = page.indexOf("const handleSubmit = useCallback", handleStart);

if (handleStart < 0 || handleEnd < 0) {
  fail("Could not isolate handleSkuSelect before handleSubmit.");
}

if (handleStart >= 0 && handleEnd > handleStart) {
  const handler = page.slice(handleStart, handleEnd);

  if (!handler.includes("runKnownProfileCompare(")) {
    fail("handleSkuSelect does not run compare directly.");
  }

  if (!handler.includes("setState(\"results\")")) {
    fail("handleSkuSelect does not advance to results.");
  }

  if (!handler.includes("setWorkflowStep(\"options\")")) {
    fail("handleSkuSelect does not advance workflow to options.");
  }
}

if (failures.length > 0) {
  console.error("[compare-sku-auto-advance] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[compare-sku-auto-advance] Verified competitor SKU selection auto-advances to WyreStorm options and the large submit button is removed.");
