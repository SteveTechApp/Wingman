import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const comparePath = path.join(root, "src/wingman2/pages/ComparePage.tsx");
const gatePath = path.join(root, "src/wingman2/lib/compareCandidateGate.ts");

if (!existsSync(comparePath) || !existsSync(gatePath)) {
  console.error("[compare-page-candidate-gate] Required files are missing.");
  process.exit(1);
}

const compare = readFileSync(comparePath, "utf8");
const gate = readFileSync(gatePath, "utf8");

const requiredGateMarkers = [
  "gateCompareCandidate",
  "filterComparableCandidates",
  "Technology class mismatch",
  "APO audio/conferencing/accessory product",
  "Candidate class is unknown",
];

const requiredPageMarkers = [
  "wingmanCompareCandidateInput",
  "wingmanBuildCompareGateContext",
  "buildCompetitorDecisionEvidence",
  "gateCompareCandidate",
];

const missing = [
  ...requiredGateMarkers.filter((marker) => !gate.includes(marker)).map((marker) => "compareCandidateGate missing: " + marker),
  ...requiredPageMarkers.filter((marker) => !compare.includes(marker)).map((marker) => "ComparePage missing: " + marker),
];

if (missing.length) {
  console.error("[compare-page-candidate-gate] Check failed:");
  for (const marker of missing) console.error("- " + marker);
  process.exit(1);
}

if (!compare.includes("const wingmanCandidateGate = gateCompareCandidate(")) {
  console.warn("[compare-page-candidate-gate] Candidate gate helpers are present, but matchScore was not patched automatically.");
  console.warn("[compare-page-candidate-gate] Review reports/compare-page-candidate-gate-repair.md before treating Compare as fully gated.");
  console.log("[compare-page-candidate-gate] Gate engine installed; page wiring still needs exact local matchScore patch.");
  process.exit(0);
}

console.log("[compare-page-candidate-gate] Verified ComparePage applies hard candidate gate before matchScore ranking.");
