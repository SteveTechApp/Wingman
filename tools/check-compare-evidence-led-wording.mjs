import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const pageEntry = "src/wingman2/pages/ComparePageNew.advanced.tsx";
const compareModuleDir = "src/wingman2/pages/compare";

// The compare page is emptied into `pages/compare/` one rule at a time, so the
// copy this gate is about moves with it. Scan the page plus every non-test
// module it renders from; scanning only the page entry would pass a check whose
// sentence merely changed file, and scanning only the modules would miss the
// copy the page still owns.
const compareSurfaceFiles = [
  pageEntry,
  ...(fs.existsSync(path.join(root, compareModuleDir))
    ? fs
        .readdirSync(path.join(root, compareModuleDir))
        .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
        .sort()
        .map((name) => `${compareModuleDir}/${name}`)
    : []),
];

const filesToScan = [...compareSurfaceFiles, "src/__tests__/compareWorkflowRendered.test.tsx"];

const bannedGenericClaims = [
  "local HDMI or USB-C source",
  "local HDMI / USB-C source",
  "local HDMI/USB-C source",
  "HDMI or USB-C source",
  "HDMI / USB-C source",
  "HDMI/USB-C source",
  "local HDMI or USB-C input",
  "HDMI or USB-C input"
];

const requiredSafePhrases = [
  "local source"
];

const failures = [];

for (const relativeFile of filesToScan) {
  const fullPath = path.join(root, relativeFile);

  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing expected file: ${relativeFile}`);
    continue;
  }

  const text = fs.readFileSync(fullPath, "utf8");

  for (const banned of bannedGenericClaims) {
    if (text.includes(banned)) {
      failures.push(`${relativeFile} contains unsafe unverified connector wording: ${banned}`);
    }
  }
}

const compareText = compareSurfaceFiles
  .filter((relativeFile) => fs.existsSync(path.join(root, relativeFile)))
  .map((relativeFile) => fs.readFileSync(path.join(root, relativeFile), "utf8"))
  .join("\n");

for (const phrase of requiredSafePhrases) {
  if (!compareText.includes(phrase)) {
    failures.push(`The compare surface should use safe wording such as "${phrase}" when connector evidence is not proven.`);
  }
}

for (const relativeFile of compareSurfaceFiles) {
  const fullPath = path.join(root, relativeFile);
  if (!fs.existsSync(fullPath)) continue;
  const text = fs.readFileSync(fullPath, "utf8");

  if (/KDS-EN6[\s\S]{0,500}USB-C/i.test(text)) {
    failures.push(`${relativeFile}: KDS-EN6 appears near USB-C. Do not mention USB-C for KDS-EN6 unless verified by source data.`);
  }

  if (/USB-C[\s\S]{0,500}KDS-EN6/i.test(text)) {
    failures.push(`${relativeFile}: USB-C appears near KDS-EN6. Do not mention USB-C for KDS-EN6 unless verified by source data.`);
  }
}

if (failures.length > 0) {
  console.error("[compare-evidence-led-wording] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[compare-evidence-led-wording] Verified compare copy does not invent USB-C/connector claims.");
