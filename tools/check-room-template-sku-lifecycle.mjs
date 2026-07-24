#!/usr/bin/env node
// Fails if a room template quotes a discontinued, do-not-spec or unlisted SKU
// into a customer-facing BOM.
//
// Room templates are the most direct path from Wingman to a customer document:
// a template BOM becomes a proposal becomes a quotation. Nothing checked the
// lifecycle status of the SKUs sitting in them, so SYN-TOUCH10 - discontinued
// AND do-not-spec - sat in five templates, and every teaching-space proposal
// generated from them quoted a product WyreStorm no longer sells. It was
// replaced with SYN-TOUCH10-V2 when this guard was written.
//
// Statuses are resolved through the same alias-aware path the app uses, not by
// reading lifecycle.csv directly. That matters: APO-VX20-UC and MX-0808-SCL
// both carry non-definitive "review" placeholder rows in the CSV but resolve to
// active via their canonical -V2 forms. Reading the CSV raw reports them as
// broken when they are fine.
//
// KNOWN_OUTSTANDING freezes the SKUs that were already in templates when this
// guard was added and that need a product-owner decision (no successor is
// listed for any of them). The guard therefore blocks anything NEW immediately,
// while keeping the existing debt visible on every run instead of silent.
// Remove entries as they are resolved; never add to it to make a build pass.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const KNOWN_OUTSTANDING = new Map([
  ["APO-VX20-MNT", "do-not-spec, no successor listed. Mount accessory for the APO-VX20 bar - needs a product-owner decision on the current mounting SKU."],
  ["IDB-300", "do-not-spec, no successor listed. Needs a product-owner decision on the current equivalent."],
  ["NHD-RACK-1U", "discontinued, no successor listed. NHD-000-RACK4 is active and may be the replacement, but that must be confirmed, not assumed."],
]);

const ACCEPTABLE = new Set(["active"]);

function loadLifecycle() {
  const raw = readFileSync(path.join(projectRoot, "data-sources", "wyrestorm", "lifecycle.csv"), "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim());
  const rows = new Map();

  for (const line of lines.slice(1)) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { cells.push(current); current = ""; }
      else current += char;
    }
    cells.push(current);
    const row = Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
    if (row.sku) rows.set(row.sku.toUpperCase(), row);
  }
  return rows;
}

// Mirrors wyrestormSkuBusinessStatus.ts: a non-definitive "review" placeholder
// row must fall through to the canonical alias rather than block.
const DEFINITIVE = new Set(["active", "discontinued", "do-not-spec", "cable"]);

function resolveStatus(sku, lifecycle) {
  const key = sku.toUpperCase();
  const direct = lifecycle.get(key);
  if (direct && DEFINITIVE.has(String(direct.lifecycle_status).toLowerCase())) {
    return String(direct.lifecycle_status).toLowerCase();
  }
  const canonical = lifecycle.get(`${key}-V2`);
  if (canonical && DEFINITIVE.has(String(canonical.lifecycle_status).toLowerCase())) {
    return String(canonical.lifecycle_status).toLowerCase();
  }
  if (direct) return String(direct.lifecycle_status).toLowerCase();
  return "unlisted";
}

const lifecycle = loadLifecycle();
const templateSource = readFileSync(path.join(projectRoot, "src", "wingman2", "lib", "roomTemplates.ts"), "utf8");
const skus = [...new Set([...templateSource.matchAll(/sku:\s*["']([A-Z0-9-]+)["']/g)].map((m) => m[1]))];

const failures = [];
const outstanding = [];

for (const sku of skus) {
  if (sku.startsWith("BY-OTHERS")) continue; // third-party scope placeholders, deliberately not WyreStorm SKUs
  const status = resolveStatus(sku, lifecycle);
  if (ACCEPTABLE.has(status)) continue;

  if (KNOWN_OUTSTANDING.has(sku)) {
    outstanding.push(`${sku} (${status}) - ${KNOWN_OUTSTANDING.get(sku)}`);
    continue;
  }
  failures.push(`${sku} is "${status}" but appears in a customer-facing room template BOM.`);
}

if (outstanding.length) {
  console.log(`[template-sku-lifecycle] ${outstanding.length} known outstanding SKU(s) awaiting a product-owner decision:`);
  for (const entry of outstanding) console.log(`  - ${entry}`);
}

if (failures.length) {
  console.error("\n[template-sku-lifecycle] Check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    "\nA room template BOM becomes a customer proposal. It must not contain a discontinued,\n" +
      "do-not-spec or unlisted SKU. Replace it with the active successor from\n" +
      "data-sources/wyrestorm/lifecycle.csv. Do not add it to KNOWN_OUTSTANDING to pass the build.",
  );
  process.exit(1);
}

console.log(
  `[template-sku-lifecycle] Verified ${skus.length} room template SKUs resolve to active lifecycle status` +
    `${outstanding.length ? ` (${outstanding.length} known outstanding, tracked above)` : ""}.`,
);
