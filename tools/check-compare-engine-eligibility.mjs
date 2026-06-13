import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const files = {
  behaviourTest: path.join(ROOT, "src", "wingman2", "lib", "competitorCompareBehaviour.test.ts"),
  specRegistry: path.join(ROOT, "src", "wingman2", "lib", "competitorSpecRegistry.ts"),
  engine: path.join(ROOT, "src", "wingman2", "lib", "compareEligibilityEngine.ts"),
  test: path.join(ROOT, "src", "wingman2", "lib", "compareEligibilityEngine.test.ts"),
  page: path.join(ROOT, "src", "wingman2", "pages", "ComparePageNew.tsx"),
  pkg: path.join(ROOT, "package.json"),
};

const failures = [];

function read(label) {
  const filePath = files[label];

  if (!fs.existsSync(filePath)) {
    failures.push(`Missing ${label}: ${path.relative(ROOT, filePath)}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

const engine = read("engine");
const test = read("test");
const page = read("page");
const pkg = read("pkg");

const engineMarkers = [
  "NHD-150-RX",
  "NHD-0401-MV",
  "SW-0204-VW",
  "SW-0206-VW",
  "invalidLeadReasonForIntent",
  "ensureEligibilityCandidatePool",
  "CompareIntentKind",
  "CompareEligibilityResult",
  "classifyCompareIntent",
  "evaluateProductEligibility",
  "applyCompareEligibilityRanking",
  "video-wall-processor",
  "av-over-ip-decoder",
  "architecture-alternative",
  "Accessory, controller, rack, cable or support item cannot be a lead replacement candidate.",
  "Multiview requires multi-source single-output canvas evidence",
];

const pageMarkers = [
  "applyCompareEligibilityRanking",
  "const curatedResult = applyKnownCompareProfileOverrides",
  "return applyCompareEligibilityRanking(curatedResult, products, inputText) as RigorousCompareResult",
];

const testMarkers = [
  "prevents accessories and controllers from becoming lead replacements",
  "prefers decoder or transceiver candidates",
  "prefers correctly sized matrix candidates",
  "keeps dedicated video wall processors ahead",
];

for (const marker of engineMarkers) {
  if (!engine.includes(marker)) failures.push(`Eligibility engine missing marker: ${marker}`);
}

for (const marker of pageMarkers) {
  if (!page.includes(marker)) failures.push(`Compare page missing marker: ${marker}`);
}

for (const marker of testMarkers) {
  if (!test.includes(marker)) failures.push(`Eligibility test missing marker: ${marker}`);
}


const specRegistry = read("specRegistry");

const specRegistryMarkers = [
  "isFamilyLevelCompetitorSpecInput",
  "familyLevelInput",
  "hasVerifiedFingerprint",
  "hasVerifiedSourceProduct",
  'evidence.tier === "family-rule" || familyLevelInput',
  '"Exact competitor model/SKU"',
  '"Datasheet or product page evidence"'
];

for (const marker of specRegistryMarkers) {
  if (!specRegistry.includes(marker)) failures.push(`Competitor spec registry missing marker: ${marker}`);
}


const behaviourTest = read("behaviourTest");

const behaviourMarkers = [
  "runCompareRuntimePipeline",
  "DMNVX350",
  "DMNVX",
  "NAV D 121",
  "MMX4x2-HDMI",
  "dedicated LCD video wall processor",
  "single output canvas"
];

for (const marker of behaviourMarkers) {
  if (!behaviourTest.includes(marker)) failures.push(`Competitor compare behaviour test missing marker: ${marker}`);
}

if (!pkg.includes("check:compare-engine-eligibility")) {
  failures.push("package.json missing check:compare-engine-eligibility script.");
}

if (failures.length > 0) {
  console.error("[compare-engine-eligibility] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[compare-engine-eligibility] Verified deterministic eligibility layer, Compare page wiring, and behaviour-test coverage.");