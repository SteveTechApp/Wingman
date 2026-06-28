import fs from "node:fs";

const controlledSources = [
  "data-imports/wyrestorm-catalogue-current.csv",
  "data-imports/wyrestorm-lifecycle-current.csv",
  "data-imports/competitor-fingerprints-current.csv",
  "data-imports/competitor-review-notes.csv"
];

const incomingSources = [
  "data-imports/incoming/wyrestorm-catalogue-source.csv",
  "data-imports/incoming/wyrestorm-lifecycle-source.csv",
  "data-imports/incoming/competitor-fingerprints-source.csv",
  "data-imports/incoming/competitor-review-notes-source.csv"
];

const requiredScripts = [
  "check:product-update-source-schema",
  "product-update:all",
  "check:product-update-pipeline",
  "product-update:promote-incoming",
  "product-update:test-promote-incoming",
  "product-update:check-incoming",
  "product-update:create-incoming-templates",
  "product-update:ready-for-production"
];

const reports = [
  "docs/product-intelligence-update-reconciliation.md",
  "docs/product-intelligence-story-review.md",
  "docs/competitor-fingerprint-coverage.md",
  "docs/competitor-fingerprint-audit.md",
  "reports/wyrestorm-catalogue-ingest-report.md"
];

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function countCsvRows(file) {
  if (!exists(file)) {
    return null;
  }

  const lines = read(file)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  return Math.max(0, lines.length - 1);
}

function printFileList(title, files) {
  console.log(`\n${title}`);

  for (const file of files) {
    const status = exists(file) ? "present" : "missing";
    const rows = file.endsWith(".csv") && exists(file) ? `, rows: ${countCsvRows(file)}` : "";
    console.log(`- ${status.padEnd(7)} ${file}${rows}`);
  }
}

function packageScripts() {
  if (!exists("package.json")) {
    return {};
  }

  return JSON.parse(read("package.json")).scripts ?? {};
}

function hasSampleData() {
  const catalogueRows = countCsvRows("data-imports/wyrestorm-catalogue-current.csv");
  const competitorRows = countCsvRows("data-imports/competitor-fingerprints-current.csv");

  return catalogueRows !== null && competitorRows !== null && catalogueRows <= 1 && competitorRows <= 1;
}

console.log("[product-update:doctor] Product update status");

printFileList("Controlled source CSVs", controlledSources);
printFileList("Incoming source CSVs", incomingSources);
printFileList("Generated reports", reports);

console.log("\nPackage scripts");

const scripts = packageScripts();
const missingScripts = [];

for (const script of requiredScripts) {
  if (scripts[script]) {
    console.log(`- present ${script}`);
  } else {
    console.log(`- missing ${script}`);
    missingScripts.push(script);
  }
}

const missingControlled = controlledSources.filter((file) => !exists(file));
const presentIncoming = incomingSources.filter((file) => exists(file));
const sampleData = hasSampleData();

console.log("\nSummary");

console.log(missingControlled.length > 0
  ? "- Controlled source CSVs are incomplete."
  : "- Controlled source CSVs are present.");

console.log(missingScripts.length > 0
  ? "- Some product-update helper scripts are missing."
  : "- Product-update helper scripts are present.");

console.log(presentIncoming.length === 0
  ? "- No incoming source CSVs are currently staged."
  : presentIncoming.length === incomingSources.length
    ? "- Incoming source CSVs are staged for preflight/promotion."
    : "- Incoming source CSVs are partially staged.");

console.log(sampleData
  ? "- Controlled source data still appears to be scaffold/sample-level."
  : "- Controlled source data appears to contain real update rows.");

console.log("\nRecommended next action");

if (missingScripts.length > 0 || missingControlled.length > 0) {
  console.log("Repair the missing product-update scripts or source files.");
} else if (presentIncoming.length === incomingSources.length) {
  console.log("Run: npm run product-update:check-incoming");
} else if (presentIncoming.length > 0) {
  console.log("Complete all four incoming source CSVs before preflight.");
} else if (sampleData) {
  console.log("Populate the incoming CSVs from reviewed WyreStorm and competitor source data.");
} else {
  console.log("Run: npm run product-update:ready-for-production");
}
