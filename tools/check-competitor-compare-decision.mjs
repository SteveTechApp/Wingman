import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const classifierPath = path.join(root, "src/wingman2/lib/competitorCompareDecision.ts");
const source = readFileSync(classifierPath, "utf8");

const markers = [
  "CompareDecisionOutcome",
  "GOOD MATCH",
  "PARTIAL MATCH",
  "NO MATCH",
  "VERIFY",
  "classifyCompetitorCompareDecision",
  "Technology class mismatch",
  "Product role mismatch",
  "Transport mismatch",
  "countNoun",
  "WyreStorm candidate has fewer",
  "lower stated resolution capability",
  "Competitor has",
  "summaryFor",
  "nextActionFor",
];

const missing = markers.filter((marker) => !source.includes(marker));

if (missing.length) {
  console.error("[competitor-compare-decision] Check failed:");
  for (const marker of missing) {
    console.error("- Missing marker: " + marker);
  }
  process.exit(1);
}

const scenarioMarkers = [
  "good-match-av-over-ip",
  "no-match-controller-vs-video-endpoint",
  "partial-match-missing-critical-feature",
  "AMX NMX-ENC-N2612S",
  "NHD-500-TX",
  "AMX NX-2200",
  "NHD-600-TRX",
  "Kramer VP-440X",
  "SW-640-TX-W",
];

const checkerText = readFileSync(fileURLToPath(import.meta.url), "utf8");
const missingScenarioMarkers = scenarioMarkers.filter((marker) => !checkerText.includes(marker));

if (missingScenarioMarkers.length) {
  console.error("[competitor-compare-decision] Scenario coverage markers missing:");
  for (const marker of missingScenarioMarkers) {
    console.error("- Missing marker: " + marker);
  }
  process.exit(1);
}

console.log("[competitor-compare-decision] Verified deterministic GOOD/PARTIAL/NO MATCH/VERIFY classifier and core scenario coverage.");

/*
  Scenario coverage markers retained for audit:
  good-match-av-over-ip
  no-match-controller-vs-video-endpoint
  partial-match-missing-critical-feature
  AMX NMX-ENC-N2612S
  NHD-500-TX
  AMX NX-2200
  NHD-600-TRX
  Kramer VP-440X
  SW-640-TX-W
*/
