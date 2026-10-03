import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const filesToScan = [
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/__tests__/compareWorkflowRendered.test.tsx"
];

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

const compareText = fs.readFileSync(path.join(root, "src/wingman2/pages/ComparePageNew.tsx"), "utf8");

for (const phrase of requiredSafePhrases) {
  if (!compareText.includes(phrase)) {
    failures.push(`ComparePageNew.tsx should use safe wording such as "${phrase}" when connector evidence is not proven.`);
  }
}

if (/KDS-EN6[\s\S]{0,500}USB-C/i.test(compareText)) {
  failures.push("KDS-EN6 appears near USB-C in ComparePageNew.tsx. Do not mention USB-C for KDS-EN6 unless verified by source data.");
}

if (/USB-C[\s\S]{0,500}KDS-EN6/i.test(compareText)) {
  failures.push("USB-C appears near KDS-EN6 in ComparePageNew.tsx. Do not mention USB-C for KDS-EN6 unless verified by source data.");
}

if (failures.length > 0) {
  console.error("[compare-evidence-led-wording] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[compare-evidence-led-wording] Verified compare copy does not invent USB-C/connector claims.");