import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const compareWrapperPath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx");
const compareAdvancedPath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.advanced.tsx");

function fail(failures) {
  console.error("[compare-sku-auto-advance] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

function readRequired(filePath, label) {
  if (!existsSync(filePath)) {
    fail([`Missing ${label}: ${filePath}`]);
  }

  return readFileSync(filePath, "utf8");
}

const wrapperSource = readRequired(compareWrapperPath, "ComparePageNew wrapper");
const advancedSource = readRequired(compareAdvancedPath, "ComparePageNew advanced implementation");
const splitSource = `${wrapperSource}\n\n${advancedSource}`;

const failures = [];

const requiredMarkers = [
  "Viable product choices",
  "Typed entries can still use Enter",
  "handleSkuSelect",
  "handleSubmit",
  'data-wingman-compare-auto-advance="true"',
  'setWorkflowStep("options")',
];

for (const marker of requiredMarkers) {
  if (!splitSource.includes(marker)) {
    failures.push(`Split Compare implementation missing marker: ${marker}`);
  }
}

if (!wrapperSource.includes("ComparePageNew.advanced")) {
  failures.push("Compare wrapper should retain the advanced/manual Compare implementation.");
}

const handleSkuSelectIndex = splitSource.indexOf("handleSkuSelect");
const handleSubmitIndex = splitSource.indexOf("handleSubmit");

if (handleSkuSelectIndex < 0 || handleSubmitIndex < 0 || handleSkuSelectIndex > handleSubmitIndex) {
  failures.push("Could not confirm handleSkuSelect is wired before handleSubmit in the split Compare implementation.");
}

if (!advancedSource.includes("handleSkuSelect")) {
  failures.push("Advanced Compare implementation should retain handleSkuSelect.");
}

if (!advancedSource.includes("handleSubmit")) {
  failures.push("Advanced Compare implementation should retain handleSubmit.");
}

if (failures.length > 0) {
  fail(failures);
}

console.log("[compare-sku-auto-advance] Verified split Compare SKU auto-advance markers and manual workflow wiring.");
