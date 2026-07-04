import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();

const requiredFiles = [
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/pages/ComparePageNew.advanced.tsx",
  "src/wingman2/lib/knownWyrestormCompareProfiles.ts",
  "src/wingman2/lib/skuAliasResolver.ts",
];

function fail(message) {
  console.error(`[compare-source-repair] ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`[compare-source-repair] warning: ${message}`);
}

const fatalPatterns = [
  [/^\s*mport\b/m, "line starts with mport"],
  [/^\s*functon\b/m, "line starts with functon"],
  [/\bnterface\b/, "nterface"],
  [/\bstrng\b/, "strng"],
  [/\bundefned\b/, "undefned"],
  [/\bcompettor\b/, "compettor"],
  [/\bprofle\b/, "profle"],
  [/\bmatrx\b/, "matrx"],
  [/\bawat\b/, "awat"],
  [/\bnstanceof\b/, "nstanceof"],
  [/\bvod\b/, "vod"],
  [/\.\.\/lb\//, "../lb/"],
  [/Array\.sArray/, "Array.sArray"],
  [/Number\.sFnte/, "Number.sFnte"],
];

for (const file of requiredFiles) {
  const fullPath = resolve(repoRoot, file);

  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${file}`);
  }

  const source = readFileSync(fullPath, "utf8");

  for (const [pattern, label] of fatalPatterns) {
    if (pattern.test(source)) {
      fail(`${file} still contains corrupted source marker: ${label}`);
    }
  }

  if (/[ÂÃÆâ€™â€œâ€]/.test(source)) {
    warn(`${file} still contains mojibake text markers. This is not blocking build/typecheck, but visible UI text should be reviewed.`);
  }
}

const comparePage = readFileSync(resolve(repoRoot, "src/wingman2/pages/ComparePageNew.tsx"), "utf8");

if (!/^\s*import\s/m.test(comparePage)) {
  fail("ComparePageNew.tsx does not contain valid imports.");
}

if (!comparePage.includes("ComparePageNew")) {
  fail("ComparePageNew.tsx does not contain ComparePageNew.");
}

console.log("[compare-source-repair] Source repair guard passed.");