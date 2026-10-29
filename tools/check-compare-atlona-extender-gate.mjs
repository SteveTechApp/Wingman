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

// The page is emptied into `pages/compare/` one rule at a time, so the copy this
// gate is about moves with it. Scan the page plus every non-test module it
// renders from: scanning only the page entry would pass a check whose copy
// merely changed file.
const compareModuleDir = "src/wingman2/pages/compare";
const compareModules = fs
  .readdirSync(path.join(root, compareModuleDir))
  .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
  .sort()
  .map((name) => compareModuleDir + "/" + name);

const comparePage = read("src/wingman2/pages/ComparePageNew.tsx");
const advancedComparePage = read("src/wingman2/pages/ComparePageNew.advanced.tsx");
const combined = [comparePage, advancedComparePage, ...compareModules.map(read)].join("\n\n");

const requiredMarkers = [
  "AT-OME-EX-KIT",
  "ATOMEEXKIT",
  "HDBaseT extender",
  "ARCHITECTURE ALTERNATIVE",
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
