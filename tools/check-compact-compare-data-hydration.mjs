import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const profilePath = resolve(repoRoot, "src/wingman2/lib/knownWyrestormCompareProfiles.ts");
const compactPath = resolve(repoRoot, "src/wingman2/components/compare/CompactCompareMatrix.tsx");

function fail(message) {
  console.error(`[compact-compare-data-hydration] ${message}`);
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

function assertIncludesOneOf(source, markers, label) {
  assert(markers.some((marker) => source.includes(marker)), `${label} missing any accepted marker: ${markers.join(" | ")}`);
}

assert(existsSync(profilePath), "Missing knownWyrestormCompareProfiles.ts");
assert(existsSync(compactPath), "Missing CompactCompareMatrix.tsx");

const profile = readFileSync(profilePath, "utf8");
const compact = readFileSync(compactPath, "utf8");

assertIncludes(profile, "hydrateWyrestormCompareProfile", "profile hydrator");
assertIncludesOneOf(profile, ["MXV-0808-H2A-MK2", "MXV-0808-H2A-V3"], "profile hydrator");
assertIncludes(profile, "MXV-0808-H2A-70-V3", "profile hydrator");
assertIncludes(profile, "MXV-0808-H2A-KIT", "profile hydrator");
assertIncludes(profile, "MX-0808-KIT-V2", "profile hydrator");
assertIncludes(profile, "MX-0808-H2A-MK2", "profile hydrator");
assertIncludesOneOf(profile, ["MX-0808-SCL-V2", "MX-0808-SCL"], "profile hydrator");
assertIncludes(profile, "MX-0812-SCL", "profile hydrator");
assertIncludes(profile, "EXP-MX-0402-H2", "profile hydrator");
assertIncludes(profile, "mirroredOutputCount: 4", "profile hydrator");
assertIncludes(profile, "routedInputCount: 8", "profile hydrator");
assertIncludes(profile, "routedOutputCount: 8", "profile hydrator");

assertIncludes(compact, "hydrateWyrestormCompareProfile", "CompactCompareMatrix");
assertIncludes(compact, "hydratedProduct", "CompactCompareMatrix");
assertIncludes(compact, "baseProduct", "CompactCompareMatrix");
assertIncludes(compact, "wyrestormRecord", "CompactCompareMatrix");

console.log("[compact-compare-data-hydration] Compact Compare data hydration checks passed.");
