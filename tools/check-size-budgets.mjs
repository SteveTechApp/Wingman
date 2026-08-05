// Wingman size-budget ratchet.
//
// Measures the largest emitted production JS chunks, total emitted JS/CSS and a
// set of source-file hotspots, then compares them against version-controlled
// limits in tools/wingman-size-budgets.json. It fails when a tracked artefact
// grows beyond its recorded limit (plus a small tolerance), so existing debt is
// allowed to sit while further growth is blocked.
//
// Usage:
//   node tools/check-size-budgets.mjs                 # enforce (CI + verify)
//   node tools/check-size-budgets.mjs --audit         # report only, never fails
//   node tools/check-size-budgets.mjs --update-baseline  # rewrite the limits
//
// The limits only ever get smaller as the refactor progresses. Raising a limit
// is a reviewed exception — see docs/SIZE_BUDGETS.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TRACKED_ENTRIES,
  evaluateBudgets,
  measureEntry,
  formatKb,
  formatDiff,
} from "./lib/wingman-size-budgets.mjs";

const root = process.cwd();
const distAssets = path.join(root, "dist", "assets");
const baselinePath = path.join(root, "tools", "wingman-size-budgets.json");

const audit = process.argv.includes("--audit");
const updateBaseline = process.argv.includes("--update-baseline");

function listAssets(extension) {
  if (!fs.existsSync(distAssets)) {
    return [];
  }
  return fs
    .readdirSync(distAssets, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => ({
      name: entry.name,
      bytes: fs.statSync(path.join(distAssets, entry.name)).size,
    }));
}

function readSourceSizes() {
  const sizes = {};
  for (const entry of TRACKED_ENTRIES) {
    if (entry.kind !== "source") {
      continue;
    }
    const absolute = path.join(root, entry.path);
    if (fs.existsSync(absolute)) {
      sizes[entry.path] = fs.statSync(absolute).size;
    }
  }
  return sizes;
}

function collectData() {
  return {
    jsFiles: listAssets(".js"),
    cssFiles: listAssets(".css"),
    sourceSizes: readSourceSizes(),
  };
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function distIsBuilt() {
  return fs.existsSync(distAssets);
}

function writeBaseline(data, previous) {
  const limits = {};
  for (const entry of TRACKED_ENTRIES) {
    const { bytes } = measureEntry(entry, data);
    if (bytes === null) {
      console.error(`[size-budgets] Cannot measure "${entry.id}" — is the build present? Run: npm run build`);
      process.exit(1);
    }
    limits[entry.id] = bytes;
  }

  const baseline = {
    updatedAt: new Date().toISOString(),
    tolerancePct: previous?.tolerancePct ?? 1,
    rule: "Current measured sizes become the maximum allowed. Future changes must not grow a tracked artefact beyond its limit (plus tolerancePct). Lower limits as the refactor lands; raising one is a reviewed exception (see docs/SIZE_BUDGETS.md).",
    limits,
  };

  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`[size-budgets] Baseline updated: ${path.relative(root, baselinePath)}`);
  for (const entry of TRACKED_ENTRIES) {
    console.log(`  ${entry.id.padEnd(28)} ${formatKb(limits[entry.id])}`);
  }
}

function printReport(evaluation) {
  const { results, tolerancePct } = evaluation;
  console.log(`[size-budgets] Tolerance: ${tolerancePct}% above each recorded limit.`);
  console.log("");
  const idWidth = Math.max(...results.map((row) => row.entry.id.length));
  for (const row of results) {
    const label = row.entry.id.padEnd(idWidth);
    if (row.status === "missing") {
      console.log(`  ? ${label}  ${row.limit === null ? "no baseline limit" : "not measurable (build missing?)"}`);
      continue;
    }
    const marker = row.status === "fail" ? "x" : "ok";
    console.log(
      `  ${marker.padEnd(2)} ${label}  ${formatKb(row.measured).padStart(11)} / limit ${formatKb(row.limit).padStart(11)} (${formatDiff(row.diff)})`,
    );
  }
  console.log("");
}

function main() {
  const data = collectData();

  if (updateBaseline) {
    const previous = loadBaseline();
    writeBaseline(data, previous);
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.error(`[size-budgets] Missing baseline: ${path.relative(root, baselinePath)}`);
    console.error("[size-budgets] Create it with: node tools/check-size-budgets.mjs --update-baseline");
    process.exit(1);
  }

  if (!distIsBuilt() && !audit) {
    console.error("[size-budgets] No dist/ build found. Run `npm run build` before the size check.");
    process.exit(1);
  }

  const evaluation = evaluateBudgets(TRACKED_ENTRIES, data, baseline);
  printReport(evaluation);

  if (evaluation.missingLimits.length > 0) {
    console.error(`[size-budgets] Missing baseline limits for: ${evaluation.missingLimits.join(", ")}`);
    console.error("[size-budgets] Add them with: node tools/check-size-budgets.mjs --update-baseline");
    if (!audit) {
      process.exit(1);
    }
  }

  if (evaluation.failures.length > 0) {
    console.error("[size-budgets] FAILED. These artefacts grew beyond their budget:");
    for (const row of evaluation.failures) {
      console.error(`- ${row.entry.label} (${row.entry.id})`);
      console.error(`    measured ${formatKb(row.measured)}  allowed ${formatKb(row.allowed)}  over by ${formatDiff(row.measured - row.allowed)}`);
      console.error(`    contributing: ${row.matched.join(", ")}`);
      console.error(`    remediation: ${row.entry.remediation}`);
    }
    if (audit) {
      console.error("[size-budgets] (audit mode — not failing the build)");
      return;
    }
    process.exit(1);
  }

  console.log("[size-budgets] OK. No tracked artefact grew beyond its budget.");
}

// Only run when invoked directly, so unit tests can import the helpers.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
