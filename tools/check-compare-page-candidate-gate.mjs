import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const routesPath = path.join(root, "src/wingman2/app/routes.tsx");
const comparePath = path.join(root, "src/wingman2/pages/ComparePageNew.tsx");
const enginePath = path.join(root, "src/wingman2/lib/competitorMatchEngine.ts");
const gatePath = path.join(root, "src/wingman2/lib/compareCandidateGate.ts");
const rigorousPath = path.join(root, "src/wingman2/lib/rigorousCompare.ts");
const matrixPath = path.join(root, "src/wingman2/lib/compareFeatureMatrix.ts");
const matrixComponentPath = path.join(root, "src/wingman2/components/compare/CompareSpecificationMatrix.tsx");
const controlsComponentPath = path.join(root, "src/wingman2/components/compare/CompareControls.tsx");

if (
  !existsSync(routesPath) ||
  !existsSync(comparePath) ||
  !existsSync(enginePath) ||
  !existsSync(gatePath) ||
  !existsSync(rigorousPath) ||
  !existsSync(matrixPath) ||
  !existsSync(matrixComponentPath) ||
  !existsSync(controlsComponentPath)
) {
  console.error("[compare-page-candidate-gate] Required files are missing.");
  process.exit(1);
}

const routes = readFileSync(routesPath, "utf8");
const compare = readFileSync(comparePath, "utf8");
const engine = readFileSync(enginePath, "utf8");
const gate = readFileSync(gatePath, "utf8");
const rigorous = readFileSync(rigorousPath, "utf8");
const matrix = readFileSync(matrixPath, "utf8");
const matrixComponent = readFileSync(matrixComponentPath, "utf8");
const controlsComponent = readFileSync(controlsComponentPath, "utf8");

const requiredGateMarkers = [
  "gateCompareCandidate",
  "filterComparableCandidates",
  "Technology class mismatch",
  "APO audio/conferencing/accessory product",
  "Candidate class is unknown",
];

// The active page now routes through rigorousCompare, which applies the hard
// candidate gate (via compareCompetitor) AND converges onto the deterministic
// classifier before ranking.
const requiredPageMarkers = [
  "readIndexedProducts",
  "rigorousCompare",
  "Find WyreStorm Alternatives",
  "CUSTOM_BRAND_VALUE",
  "missing-hyphen and partial SKU interpretation",
  "buildCompareFeatureMatrixRows",
  "CompareSpecificationMatrix",
  "CompareManufacturerCombobox",
  "CompareProductLookupInput",
  "CompetitorProductProfileCard",
  "Source/spec page",
  "!productUrl.trim()",
];

const prohibitedPageMarkers = [
  "<datalist",
  "<select",
  "COMPARE_SKU_DATALIST_ID",
];

const requiredRigorousMarkers = [
  "compareCompetitor",
  "classifyCompetitorCompareDecision",
  "resolveCompetitorSpecProfile",
  "buildWyrestormCompareProfile",
];

const requiredMatrixMarkers = [
  "CompareFeatureMatrixRow",
  "CompareFeatureValueKind",
  "Product class",
  "HDMI inputs",
  "HDMI outputs",
  "USB host ports",
  "USB device ports",
  "Audio inputs",
  "Audio outputs",
  "Control connections",
  "Network / LAN ports",
  "PoE",
  "PoC",
  "PoH",
  "Power supply",
  "status: \"miss\"",
  "status: \"match\"",
  "status: \"partial\"",
];

const requiredMatrixComponentMarkers = [
  "Specification comparison matrix",
  "data-wingman-feature-match-grid",
  "CompareFeatureValueKind",
  "QuantityValue",
  "BooleanValue",
  "competitorLabel",
  "wyrestormLabel",
  "md:grid-cols-[48px_minmax(120px,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(90px,0.45fr)]",
];

const requiredControlsMarkers = [
  "data-wingman-manufacturer-combobox",
  "role=\"listbox\"",
  "aria-label=\"Choose competitor manufacturer\"",
  "bg-[#071522]",
  "CompareProductLookupInput",
  "CompareManufacturerCombobox",
];

const prohibitedMatrixComponentMarkers = [
  "overflow-x-auto",
  "min-w-[760px]",
  "<table",
];

const requiredEngineMarkers = [
  "gateCompareCandidate",
  "gateInputForProduct",
  ".filter((product) => gateCompareCandidate",
  "competitorClass: toGateClass(competitor.technologyClass)",
];

const missing = [
  ...["ComparePageNew"].filter((marker) => !routes.includes(marker)).map((marker) => "routes missing active ComparePageNew route: " + marker),
  ...requiredGateMarkers.filter((marker) => !gate.includes(marker)).map((marker) => "compareCandidateGate missing: " + marker),
  ...requiredPageMarkers.filter((marker) => !compare.includes(marker)).map((marker) => "ComparePage missing: " + marker),
  ...prohibitedPageMarkers.filter((marker) => compare.includes(marker)).map((marker) => "ComparePage still uses native dropdown marker: " + marker),
  ...requiredRigorousMarkers.filter((marker) => !rigorous.includes(marker)).map((marker) => "rigorousCompare missing: " + marker),
  ...requiredMatrixMarkers.filter((marker) => !matrix.includes(marker)).map((marker) => "compareFeatureMatrix missing: " + marker),
  ...requiredMatrixComponentMarkers.filter((marker) => !matrixComponent.includes(marker)).map((marker) => "CompareSpecificationMatrix missing: " + marker),
  ...requiredControlsMarkers.filter((marker) => !controlsComponent.includes(marker)).map((marker) => "CompareControls missing: " + marker),
  ...prohibitedMatrixComponentMarkers.filter((marker) => matrixComponent.includes(marker)).map((marker) => "CompareSpecificationMatrix still uses overflow table marker: " + marker),
  ...requiredEngineMarkers.filter((marker) => !engine.includes(marker)).map((marker) => "competitorMatchEngine missing: " + marker),
];

if (missing.length) {
  console.error("[compare-page-candidate-gate] Check failed:");
  for (const marker of missing) console.error("- " + marker);
  process.exit(1);
}

console.log("[compare-page-candidate-gate] Verified active Compare page applies hard candidate gate before match ranking.");
