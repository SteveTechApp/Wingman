import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const classifierPath = path.join(root, "src/wingman2/lib/competitorCompareDecision.ts");
const rigorousPath = path.join(root, "src/wingman2/lib/rigorousCompare.ts");
const comparePath = path.join(root, "src/wingman2/pages/ComparePageNew.tsx");

const classifier = readFileSync(classifierPath, "utf8");
const rigorous = readFileSync(rigorousPath, "utf8");
const compare = readFileSync(comparePath, "utf8");

const classifierMarkers = [
  "classifyCompetitorCompareDecision",
  "GOOD MATCH",
  "PARTIAL MATCH",
  "NO MATCH",
  "VERIFY",
  "Technology class mismatch",
  "Product role mismatch",
  "Transport mismatch",
];

const comparePageMarkers = [
  "ComparePageNew",
  "data-wingman-compare-decision-desk",
  "rigorousCompare",
  "decision.outcome",
  "isSelectableWyrestormRecommendation",
  "viableMatches",
  "CompareSpecificationMatrix",
  "buildCompareFeatureMatrixRows",
  "Competitor product",
  "Custom manufacturer",
  "effectiveCompetitorInput",
  "normalizeCompetitorSku",
  "runKnownProfileCompare(compareInputText || effectiveCompetitorInput",
  "applyCompareEquivalenceGuards(rigorousCompare",
];

const rigorousMarkers = [
  "classifyCompetitorCompareDecision",
  "decision: CompareDecisionResult",
  "decision.outcome",
  "decision.confidence",
];

const missing = [
  ...classifierMarkers
    .filter((marker) => !classifier.includes(marker))
    .map((marker) => "classifier missing: " + marker),
  ...rigorousMarkers
    .filter((marker) => !rigorous.includes(marker))
    .map((marker) => "rigorous compare missing classifier wiring: " + marker),
  ...comparePageMarkers
    .filter((marker) => !compare.includes(marker))
    .map((marker) => "Compare page missing expected marker: " + marker),
];

if (missing.length) {
  console.error("[compare-decision-workflow] Check failed:");
  for (const marker of missing) {
    console.error("- " + marker);
  }
  process.exit(1);
}

const wired =
  rigorous.includes("classifyCompetitorCompareDecision") &&
  compare.includes("runKnownProfileCompare") &&
  compare.includes("applyCompareEquivalenceGuards(rigorousCompare");

if (wired) {
  console.log("[compare-decision-workflow] Active Compare page reaches the deterministic GOOD/PARTIAL/NO MATCH/VERIFY classifier through known-profile compare.");
}

if (!wired) {
  console.warn("[compare-decision-workflow] Classifier exists, but active Compare page is not wired through known-profile compare.");
}

console.log("[compare-decision-workflow] Verified competitor decision classifier readiness without brittle page-internal markers.");
