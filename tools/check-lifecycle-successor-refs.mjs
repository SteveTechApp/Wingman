#!/usr/bin/env node
// Fails CI when a lifecycle.csv successor reference points at anything other
// than a CURRENT, ACTIVE WyreStorm SKU.
//
// The successor column records "this (discontinued/review) SKU is replaced by
// <successor>" so data pipelines and remap logic can steer a quoting rep from
// an EoL product onto its replacement. A successor that names a
// discontinued/do-not-spec SKU, a SKU missing from the lifecycle table
// entirely, or the row's own SKU is a dangling remap: it would quietly send a
// rep to a product that cannot be quoted. This is the permanent guard for
// that class (the NETWORKHDTOUCHTM -> NHD-TOUCH row carried exactly such a
// remap until 2026-09-02: NHD-TOUCH is itself on the discontinued list).
//
// Mirrors tools/check-closest-wyrestorm-refs.mjs, which applies the same
// "reference must resolve to an active product" rule to competitor rows.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export function parseLifecycleCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const rows = [];
  for (const line of lines.slice(1)) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else current += char;
    }
    values.push(current);
    const row = {};
    header.forEach((name, index) => {
      row[name] = (values[index] ?? "").replace(/^"|"$/g, "").trim();
    });
    rows.push(row);
  }
  return rows;
}

export function normaliseSku(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "-");
}

/**
 * Returns a human-readable problem list for the successor references in the
 * given lifecycle rows. Empty array = every remap resolves to an active SKU.
 */
export function collectSuccessorProblems(rows) {
  const bySku = new Map();
  for (const row of rows) bySku.set(normaliseSku(row.sku), row);

  const problems = [];
  for (const row of rows) {
    const successor = (row.successor || "").trim();
    if (!successor) continue;

    const sourceSku = normaliseSku(row.sku);
    const targetSku = normaliseSku(successor);
    const sourceStatus = (row.lifecycle_status || "").toLowerCase();
    const target = bySku.get(targetSku);

    if (sourceStatus === "active") {
      problems.push(
        `lifecycle: "${row.sku}" is active but names successor "${successor}" - a current product cannot be superseded by another SKU.`,
      );
    }
    if (targetSku === sourceSku) {
      problems.push(`lifecycle: "${row.sku}" names itself as its own successor.`);
      continue;
    }
    if (!target) {
      problems.push(
        `lifecycle: successor "${successor}" of "${row.sku}" does not resolve to any lifecycle row. A remap to an unknown SKU never attaches to a product.`,
      );
      continue;
    }
    if ((target.lifecycle_status || "").toLowerCase() !== "active") {
      problems.push(
        `lifecycle: successor "${successor}" of "${row.sku}" is lifecycle "${target.lifecycle_status}" - a remap must point at an active, quotable product.`,
      );
    }
  }
  return problems;
}

export function checkLifecycleSuccessorRefs(csvPath) {
  const rows = parseLifecycleCsv(readFileSync(csvPath, "utf8"));
  const problems = collectSuccessorProblems(rows);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[lifecycle-successor-refs] ${problem}`);
    process.exitCode = 1;
    return problems;
  }
  const withSuccessor = rows.filter((row) => (row.successor || "").trim()).length;
  console.log(`[lifecycle-successor-refs] OK: ${withSuccessor} successor remap(s) all resolve to active SKUs.`);
  return problems;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  checkLifecycleSuccessorRefs(path.join(root, "data-sources", "wyrestorm", "lifecycle.csv"));
}
