import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const root = path.resolve(dirname, "..");

const requiredFiles = [
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/lib/competitorCompareDecision.ts",
  "src/wingman2/lib/competitorProductIntelligence.ts",
  "src/wingman2/lib/rigorousCompare.ts",
  "src/wingman2/lib/compareDisplayText.ts",
  "src/wingman2/lib/knownCompareProfiles.ts",
];

const optionalFiles = [
  "src/wingman2/lib/compareSkuNormalization.ts",
  "src/wingman2/lib/compareSkuNormalisation.ts",
];

function fail(message) {
  console.error(`[wingman-engine-routing] ${message}`);
  process.exit(1);
}

function readProjectFile(relativePath) {
  const fullPath = path.resolve(root, relativePath);

  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
  }

  return readFileSync(fullPath, "utf8");
}

function readOptionalProjectFile(relativePath) {
  const fullPath = path.resolve(root, relativePath);

  if (!existsSync(fullPath)) {
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    fail(`${label} missing expected marker: ${marker}`);
  }
}

function assertIncludesAny(content, markers, label) {
  const matched = markers.some((marker) => content.includes(marker));

  if (!matched) {
    fail(`${label} missing one of expected markers: ${markers.join(", ")}`);
  }
}

for (const requiredFile of requiredFiles) {
  readProjectFile(requiredFile);
}

const comparePage = readProjectFile("src/wingman2/pages/ComparePageNew.tsx");
const decisionEngine = readProjectFile("src/wingman2/lib/competitorCompareDecision.ts");
const productIntelligence = readProjectFile("src/wingman2/lib/competitorProductIntelligence.ts");
const rigorousCompare = readProjectFile("src/wingman2/lib/rigorousCompare.ts");
const displayCleaner = readProjectFile("src/wingman2/lib/compareDisplayText.ts");
const knownProfiles = readProjectFile("src/wingman2/lib/knownCompareProfiles.ts");

assertIncludes(comparePage, "runKnownProfileCompare", "ComparePageNew.tsx");
assertIncludes(comparePage, "RigorousCompareResult", "ComparePageNew.tsx");
assertIncludes(comparePage, "as RigorousCompareResult", "ComparePageNew.tsx");

assertIncludesAny(
  decisionEngine,
  [
    "competitorCompareDecision",
    "CompareDecision",
    "decision",
    "recommendation",
    "confidence",
  ],
  "competitorCompareDecision.ts",
);

assertIncludesAny(
  productIntelligence,
  [
    "competitorProductIntelligence",
    "CompetitorProductIntelligence",
    "knownCompetitor",
    "competitor",
    "profile",
  ],
  "competitorProductIntelligence.ts",
);

assertIncludesAny(
  rigorousCompare,
  [
    "rigorousCompare",
    "RigorousCompare",
    "RigorousCompareResult",
    "compare",
  ],
  "rigorousCompare.ts",
);

assertIncludes(displayCleaner, "cleanCompareDisplayText", "compareDisplayText.ts");
assertIncludes(displayCleaner, "cleanCompareDisplayBlock", "compareDisplayText.ts");
assertIncludes(knownProfiles, "C88CS_SAFE_PROFILE_SUMMARY", "knownCompareProfiles.ts");

const skuNormalisationContent = optionalFiles
  .map((relativePath) => readOptionalProjectFile(relativePath))
  .filter(Boolean)
  .join("\n");

if (skuNormalisationContent) {
  const hasSkuMarker =
    skuNormalisationContent.includes("normalizeCompareSku") ||
    skuNormalisationContent.includes("normaliseCompareSku") ||
    skuNormalisationContent.includes("normalizeSku") ||
    skuNormalisationContent.includes("normaliseSku") ||
    skuNormalisationContent.includes("sku");

  if (!hasSkuMarker) {
    fail("Optional compare SKU normalisation file exists but does not expose an expected SKU marker.");
  }
}

console.log("[wingman-engine-routing] Compare engine routing guard passed.");
