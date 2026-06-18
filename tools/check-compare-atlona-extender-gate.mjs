import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push("Missing file: " + relativePath);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

const comparePage = read("src/wingman2/pages/ComparePageNew.tsx");
const engine = read("src/wingman2/lib/compareEligibilityEngine.ts");
const combined = comparePage + "\n\n" + engine;

const requiredMarkers = [
  "AT-OME-EX-KIT",
  "ATOMEEXKIT",
  "HDBaseT extender",
  "ARCHITECTURE ALTERNATIVE",
  "architecture-alternative",
  "EX-100-KVM",
  "MX-0403-H3-MST"
];

for (const marker of requiredMarkers) {
  if (combined.includes(marker)) {
    continue;
  }

  failures.push("Missing expected compare marker: " + marker);
}

const unsafePatterns = [
  /AT-OME-EX-KIT[\s\S]{0,700}GOOD MATCH[\s\S]{0,700}MX-0403-H3-MST/i,
  /MX-0403-H3-MST[\s\S]{0,700}GOOD MATCH[\s\S]{0,700}AT-OME-EX-KIT/i
];

for (const pattern of unsafePatterns) {
  if (!pattern.test(combined)) {
    continue;
  }

  failures.push("Unsafe GOOD MATCH found between AT-OME-EX-KIT and MX-0403-H3-MST");
}

if (failures.length > 0) {
  console.error("[compare-atlona-extender-gate] Check failed:");

  for (const failure of failures) {
    console.error("- " + failure);
  }

  process.exit(1);
}

console.log("[compare-atlona-extender-gate] Check passed");
