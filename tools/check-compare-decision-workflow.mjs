import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const classifierPath = path.join(root, "src/wingman2/lib/competitorCompareDecision.ts");
const rigorousPath = path.join(root, "src/wingman2/lib/rigorousCompare.ts");
const compareWrapperPath = path.join(root, "src/wingman2/pages/ComparePageNew.tsx");
const compareRuntimePath = path.join(root, "src/wingman2/pages/ComparePageNew.advanced.tsx");
const runtimePipelinePath = path.join(root, "src/wingman2/lib/compareRuntimePipeline.ts");

const classifier = readFileSync(classifierPath, "utf8");
const rigorous = readFileSync(rigorousPath, "utf8");
const compareWrapper = readFileSync(compareWrapperPath, "utf8");
const compareRuntime = readFileSync(compareRuntimePath, "utf8");
const runtimePipeline = readFileSync(runtimePipelinePath, "utf8");

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
];

const runtimeChecks = [
  {
    label: "Compare wrapper imports the advanced runtime",
    passes: /import\s+AdvancedComparePage\s+from\s+["']\.\/ComparePageNew\.advanced["']/.test(compareWrapper),
  },
  {
    label: "active Compare runtime imports the governed runtime pipeline",
    passes: /import\s+\{\s*runCompareRuntimePipeline\s*\}\s+from\s+["']\.\.\/lib\/compareRuntimePipeline["']/.test(compareRuntime),
  },
  {
    label: "active Compare runtime imports eligibility ranking",
    passes: /import\s+\{\s*applyCompareEligibilityRanking\s*\}\s+from\s+["']\.\.\/lib\/compareEligibilityEngine["']/.test(compareRuntime),
  },
  {
    label: "active Compare result executes the governed runtime pipeline",
    passes: /const\s+result\s*=\s*runCompareRuntimePipeline\(/.test(compareRuntime),
  },
  {
    label: "runtime pipeline executes rigorousCompare",
    passes: /rigorousCompare\(enrichedInput,/.test(runtimePipeline),
  },
  {
    label: "runtime pipeline executes equivalence guards",
    passes: /applyCompareEquivalenceGuards\(\s*rigorousCompare/.test(runtimePipeline),
  },
  {
    label: "active Compare result executes eligibility ranking",
    passes: /const\s+ranked\s*=\s*applyCompareEligibilityRanking\(/.test(compareRuntime),
  },
  {
    label: "rendered candidates are sourced from the rigorous result",
    passes: /rigorousResult\.matches\s*\.map\(\(match\)\s*=>\s*rigorousMatchToCandidate/.test(compareRuntime),
  },
];

missing.push(
  ...runtimeChecks
    .filter((check) => !check.passes)
    .map((check) => check.label),
);

if (missing.length) {
  console.error("[compare-decision-workflow] Check failed:");
  for (const marker of missing) {
    console.error("- " + marker);
  }
  process.exit(1);
}

const wired =
  rigorous.includes("classifyCompetitorCompareDecision") &&
  runtimeChecks.every((check) => check.passes);

if (wired) {
  console.log("[compare-decision-workflow] Active Compare candidates execute rigorousCompare, deterministic classification and eligibility ranking.");
}

if (!wired) {
  console.warn("[compare-decision-workflow] Classifier exists, but active Compare page is not wired through known-profile compare.");
}

console.log("[compare-decision-workflow] Verified real imports, calls and result-to-render wiring rather than comment markers.");
