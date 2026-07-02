import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const profilePath = resolve(repoRoot, "src/wingman2/lib/knownCompareProfiles.ts");
const compareWrapperPath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx");
const compareAdvancedPath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.advanced.tsx");

function fail(message) {
  console.error(`[known-compare-profiles] ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

assert(existsSync(profilePath), "Missing src/wingman2/lib/knownCompareProfiles.ts");
assert(existsSync(compareWrapperPath), "Missing src/wingman2/pages/ComparePageNew.tsx");
assert(existsSync(compareAdvancedPath), "Missing src/wingman2/pages/ComparePageNew.advanced.tsx");

const profile = readFileSync(profilePath, "utf8");
const compareWrapper = readFileSync(compareWrapperPath, "utf8");
const compareAdvanced = readFileSync(compareAdvancedPath, "utf8");
const compareSplitSource = `${compareWrapper}\n\n${compareAdvanced}`;

assertIncludes(profile, "blockedCandidatePatterns", "known profiles");
assertIncludes(profile, "applyKnownCompareProfileOverrides", "known profiles");
assertIncludes(profile, "enrichCompareInputWithKnownProfile", "known profiles");

assertIncludes(compareSplitSource, "runKnownProfileCompare", "split Compare implementation");
assertIncludes(compareSplitSource, "applyKnownCompareProfileOverrides", "split Compare implementation");
assertIncludes(compareSplitSource, "enrichCompareInputWithKnownProfile", "split Compare implementation");
assertIncludes(
  compareSplitSource,
  "applyKnownCompareProfileOverrides(baseResult, products, inputText, brand)",
  "split Compare implementation",
);
assertIncludes(
  compareSplitSource,
  "runKnownProfileCompare(compareInputText || effectiveCompetitorInput",
  "split Compare implementation",
);
assertIncludes(
  compareSplitSource,
  "runKnownProfileCompare(retryInput",
  "split Compare implementation",
);

assertIncludes(compareWrapper, "ComparePageNew.advanced", "Compare wrapper");

console.log("[known-compare-profiles] Known compare profile checks passed for split Compare wrapper and advanced implementation.");
