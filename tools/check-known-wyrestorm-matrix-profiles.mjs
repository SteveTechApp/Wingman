import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const compareHydrationPath = resolve(repoRoot, "src/wingman2/lib/knownWyrestormCompareProfiles.ts");

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

assert(existsSync(compareHydrationPath), "Missing src/wingman2/lib/knownWyrestormCompareProfiles.ts");

const compareHydration = readFileSync(compareHydrationPath, "utf8");

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

console.log("[known-wyrestorm-matrix-profiles] Known WyreStorm matrix profile checks passed.");
