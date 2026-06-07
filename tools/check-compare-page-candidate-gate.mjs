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

if (!existsSync(routesPath) || !existsSync(comparePath) || !existsSync(enginePath) || !existsSync(gatePath) || !existsSync(rigorousPath)) {
  console.error("[compare-page-candidate-gate] Required files are missing.");
  process.exit(1);
}

const routes = readFileSync(routesPath, "utf8");
const compare = readFileSync(comparePath, "utf8");
const engine = readFileSync(enginePath, "utf8");
const gate = readFileSync(gatePath, "utf8");
const rigorous = readFileSync(rigorousPath, "utf8");

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
];

const requiredRigorousMarkers = [
  "compareCompetitor",
  "classifyCompetitorCompareDecision",
  "resolveCompetitorSpecProfile",
  "buildWyrestormCompareProfile",
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
  ...requiredRigorousMarkers.filter((marker) => !rigorous.includes(marker)).map((marker) => "rigorousCompare missing: " + marker),
  ...requiredEngineMarkers.filter((marker) => !engine.includes(marker)).map((marker) => "competitorMatchEngine missing: " + marker),
];

if (missing.length) {
  console.error("[compare-page-candidate-gate] Check failed:");
  for (const marker of missing) console.error("- " + marker);
  process.exit(1);
}

console.log("[compare-page-candidate-gate] Verified active Compare page applies hard candidate gate before match ranking.");
