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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPublishedTemplates } from "./check-template-realism.mjs";
// The alias-aware status rule lives in one place, shared with the fixture gate:
// a private copy here is how the two would come to disagree about "review"
// placeholder rows that resolve to an active `-V2` form.
import { loadLifecycleRows, resolveSkuStatus } from "./lib/sku-lifecycle.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const KNOWN_OUTSTANDING = new Map([]);

const ACCEPTABLE = new Set(["active"]);

const lifecycle = loadLifecycleRows(projectRoot);
const templates = await loadPublishedTemplates(projectRoot);
const skus = [...new Set(templates.flatMap((template) => template.bom.map((row) => row.sku)))];

const failures = [];
const outstanding = [];

for (const sku of skus) {
  if (sku.startsWith("BY-OTHERS")) continue; // third-party scope placeholders, deliberately not WyreStorm SKUs
  const status = resolveSkuStatus(sku, lifecycle);
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
