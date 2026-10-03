#!/usr/bin/env node
/**
 * Print the paste-ready production-like-load manifest row from a load-test
 * run's JSON sidecar (docs/release-evidence/load-test-<level>-<date>.json).
 *
 * The strict-clean run already prints this row once (buildManifestRowTemplate);
 * this helper re-prints it later without re-running the measurement, e.g. when
 * the reviewer of record fills approver.name and edits the manifest. Refuses
 * sidecars from runs that did not meet all budgets - a red run can never be
 * turned into a manifest row, even retroactively.
 *
 * Usage: node tools/load-test-paste-row.mjs [sidecar.json]
 *   (default: the newest docs/release-evidence/load-test-*.json)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifestRowTemplate } from "./load-test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(root, "docs", "release-evidence");
const MANIFEST = path.join(root, "docs", "release-evidence", "release-evidence-manifest.json");

function newestSidecar() {
  const files = fs
    .readdirSync(evidenceDir)
    .filter((name) => /^load-test-.*\.json$/.test(name))
    .map((name) => ({ name, full: path.join(evidenceDir, name), mtime: fs.statSync(path.join(evidenceDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.full ?? null;
}

function recordedBudgets() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const row = (manifest.criteria ?? []).find((criterion) => criterion.id === "production-like-load");
  return row?.budgets ?? null;
}

function main() {
  const sidecarPath = process.argv[2] ? path.resolve(process.argv[2]) : newestSidecar();
  if (!sidecarPath || !fs.existsSync(sidecarPath)) {
    console.error("[paste-row] no load-test sidecar found (docs/release-evidence/load-test-*.json). Run the strict harness first.");
    process.exit(1);
  }
  const sidecar = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
  if (sidecar.criterionId !== "production-like-load") {
    console.error(`[paste-row] ${path.basename(sidecarPath)} is for criterion '${sidecar.criterionId}', not production-like-load.`);
    process.exit(1);
  }
  if (sidecar.allBudgetsMet !== true) {
    console.error(`[paste-row] ${path.basename(sidecarPath)} records allBudgetsMet=false - a red run has no manifest row.`);
    process.exit(1);
  }
  const budgets = recordedBudgets();
  if (budgets) {
    const { metrics } = sidecar;
    if (
      metrics.p95Ms > budgets.maxP95Ms ||
      metrics.p99Ms > budgets.maxP99Ms ||
      metrics.errorRate > budgets.maxErrorRate
    ) {
      console.error("[paste-row] sidecar metrics exceed the manifest's recorded budgets - refusing to print a pass row.");
      process.exit(1);
    }
  }
  console.log(buildManifestRowTemplate({
    criterionId: "production-like-load",
    artifactPath: `docs/release-evidence/${path.basename(sidecarPath).replace(/\.json$/, ".md")}`,
    measuredAtIso: sidecar.measuredAt,
    metrics: { aggregate: sidecar.metrics },
  }));
}

main();
