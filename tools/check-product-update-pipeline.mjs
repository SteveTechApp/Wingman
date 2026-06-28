import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "data-imports/README.md",
  "data-imports/wyrestorm-catalogue-current.csv",
  "data-imports/wyrestorm-lifecycle-current.csv",
  "data-imports/competitor-fingerprints-current.csv",
  "data-imports/competitor-review-notes.csv",
  "tools/product-update-utils.mjs",
  "tools/ingest-wyrestorm-catalogue.mjs",
  "tools/ingest-competitor-fingerprints.mjs",
  "tools/reconcile-product-updates.mjs",
  "tools/audit-new-product-stories.mjs",
  "tools/audit-competitor-coverage.mjs",
  "tools/run-product-intelligence-update.mjs"
];

const requiredScripts = [
  "data:ingest-wyrestorm",
  "data:ingest-competitors",
  "product-update:reconcile",
  "product-update:audit-stories",
  "product-update:audit-competitors",
  "product-update:all"
];

const stableOutputs = [
  "docs/product-intelligence-update-reconciliation.md",
  "docs/product-intelligence-story-review.md",
  "docs/competitor-fingerprint-coverage.md",
  "docs/competitor-fingerprint-audit.md",
  "reports/wyrestorm-catalogue-ingest-report.md",
  "generated/product-intelligence/wyrestorm-catalogue-normalized.json",
  "generated/product-intelligence/competitor-fingerprints-normalized.json"
];

function fail(message) {
  console.error(`[product-update-pipeline] ${message}`);
  process.exit(1);
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function fileHash(file) {
  return crypto.createHash("sha256").update(readText(file)).digest("hex");
}

function run(command, args) {
  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;

  const result = spawnSync(executable, args, {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed.`);
  }
}

function hashOutputs() {
  const hashes = new Map();

  for (const file of stableOutputs) {
    if (!fs.existsSync(file)) {
      fail(`Missing generated output: ${file}`);
    }

    hashes.set(file, fileHash(file));
  }

  return hashes;
}

console.log("[product-update-pipeline] Checking required files.");

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));
if (missingFiles.length > 0) {
  fail(`Missing required files:\n- ${missingFiles.join("\n- ")}`);
}

console.log("[product-update-pipeline] Checking package scripts.");

const pkg = JSON.parse(readText("package.json"));
const scripts = pkg.scripts ?? {};
const missingScripts = requiredScripts.filter((script) => !scripts[script]);

if (missingScripts.length > 0) {
  fail(`Missing package scripts:\n- ${missingScripts.join("\n- ")}`);
}

console.log("[product-update-pipeline] Checking runner does not use shell:true.");

const runnerText = readText("tools/run-product-intelligence-update.mjs");

if (/shell:\s*(true|process\.platform)/.test(runnerText)) {
  fail("tools/run-product-intelligence-update.mjs still uses shell:true.");
}

console.log("[product-update-pipeline] Running product update pipeline once.");
run("npm", ["run", "product-update:all"]);
const firstHashes = hashOutputs();

console.log("[product-update-pipeline] Running product update pipeline again for stability check.");
run("npm", ["run", "product-update:all"]);
const secondHashes = hashOutputs();

const changed = [];

for (const file of stableOutputs) {
  if (firstHashes.get(file) !== secondHashes.get(file)) {
    changed.push(file);
  }
}

if (changed.length > 0) {
  fail(`Generated outputs changed between identical runs:\n- ${changed.join("\n- ")}`);
}

console.log("[product-update-pipeline] Product update pipeline guard passed.");
