import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const profilePath = resolve(repoRoot, "src/wingman2/lib/knownWyrestormMatrixProfiles.ts");
const compareHydrationPath = resolve(repoRoot, "src/wingman2/lib/knownWyrestormCompareProfiles.ts");
const compareProfilePath = resolve(repoRoot, "src/wingman2/lib/knownCompareProfiles.ts");

function fail(message) {
  console.error(`[known-wyrestorm-matrix-profiles] ${message}`);
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

assert(existsSync(profilePath), "Missing src/wingman2/lib/knownWyrestormMatrixProfiles.ts");
assert(existsSync(compareHydrationPath), "Missing src/wingman2/lib/knownWyrestormCompareProfiles.ts");
assert(existsSync(compareProfilePath), "Missing src/wingman2/lib/knownCompareProfiles.ts");

const profile = readFileSync(profilePath, "utf8");
const compareHydration = readFileSync(compareHydrationPath, "utf8");
const compareProfile = readFileSync(compareProfilePath, "utf8");

assertIncludes(profile, "MXV-0808-H2A", "known WyreStorm profiles");
assertIncludes(profile, "MXV-0808-70-H2A", "known WyreStorm profiles");
assertIncludes(profile, "MX-0808-KIT", "known WyreStorm profiles");
assertIncludes(compareHydration, "MX-0808-H2A-MK2", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "MX-0808-SCL", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "MX-0812-SCL", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "EXP-MX-0402-H2", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "MXV-0404-H2A-KIT-V2", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "MXV-0404-H2A-KIT", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "MX-0404-KIT", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "MX-0404-HDMI", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "MX-0404-SCL", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "matrixSize: \"4x4\"", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "mirroredOutputCount: 4", "known WyreStorm compare hydration profiles");
assertIncludes(compareHydration, "Mirrored HDMI is not a fifth routed matrix output", "known WyreStorm compare hydration profiles");
assertIncludes(profile, "enrichWyrestormProductWithKnownMatrixProfile", "known WyreStorm profiles");
assertIncludes(profile, "known-wyrestorm-profile", "known WyreStorm profiles");

assertIncludes(compareProfile, "enrichWyrestormProductWithKnownMatrixProfile", "knownCompareProfiles");
assertIncludes(compareProfile, "findProduct(products, candidate.sku)", "knownCompareProfiles");

console.log("[known-wyrestorm-matrix-profiles] Known WyreStorm matrix profile checks passed.");
