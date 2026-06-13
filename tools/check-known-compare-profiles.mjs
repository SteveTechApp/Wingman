import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const profilePath = resolve(repoRoot, "src/wingman2/lib/knownCompareProfiles.ts");
const comparePagePath = resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx");

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
assert(existsSync(comparePagePath), "Missing src/wingman2/pages/ComparePageNew.tsx");

const profile = readFileSync(profilePath, "utf8");
const comparePage = readFileSync(comparePagePath, "utf8");

assertIncludes(profile, "C88CS", "known profiles");
assertIncludes(profile, "LIGHTWARE_MMX4X2_PROFILE", "known profiles");
assertIncludes(profile, "MMX4x2-HDMI", "known profiles");
assertIncludes(profile, "Matrix size 4 inputs by 2 outputs", "known profiles");
assertIncludes(profile, "EXP-MX-0402-H2", "known profiles");
assertIncludes(profile, "AVPRO_ACMX44HDBT_PROFILE", "known profiles");
assertIncludes(profile, "AVPRO_ACEX40_MATRIX_INTENT_PROFILE", "known profiles");
assertIncludes(profile, "AC-EX40-444-KIT", "known profiles");
assertIncludes(profile, "AC-MX-44HDBT", "known profiles");
assertIncludes(profile, "Matrix size 4 inputs by 4 outputs", "known profiles");
assertIncludes(profile, "MXV-0404-H2A-KIT-V2", "known profiles");
assertIncludes(profile, "MXV-0808-H2A", "known profiles");
assertIncludes(profile, "MXV-0808-70-H2A", "known profiles");
assertIncludes(profile, "MX-0808-KIT", "known profiles");
assertIncludes(profile, "hdbaset_matrix", "known profiles");
assertIncludes(profile, "blockedCandidatePatterns", "known profiles");
assertIncludes(profile, "applyKnownCompareProfileOverrides", "known profiles");
assertIncludes(profile, "enrichCompareInputWithKnownProfile", "known profiles");
assertIncludes(comparePage, "runKnownProfileCompare", "ComparePageNew");
assertIncludes(comparePage, "applyKnownCompareProfileOverrides", "ComparePageNew");
assertIncludes(comparePage, "enrichCompareInputWithKnownProfile", "ComparePageNew");
assertIncludes(comparePage, "applyKnownCompareProfileOverrides(baseResult, products, inputText, brand)", "ComparePageNew");
assertIncludes(comparePage, "runKnownProfileCompare(compareInputText || effectiveCompetitorInput", "ComparePageNew");
assertIncludes(comparePage, "runKnownProfileCompare(retryInput", "ComparePageNew");

console.log("[known-compare-profiles] Known compare profile checks passed.");
