#!/usr/bin/env node
// Permanent guard for the governance-data audit repaired in the 2026-09-01
// session. Validates the three governance reference files against the
// authoritative lifecycle table:
//
//   1. Every governed technical profile SKU must resolve to a lifecycle row
//      (any status - profiles legitimately exist for discontinued products).
//      A profile keyed on a SKU that lifecycle does not know is orphaned
//      data: governedProductTechnicalData.ts looks profiles up by exact
//      normalised SKU, so the spec would never attach to a product.
//   2. wyrestorm-product-role-overrides.json: catalogVisibility "default"
//      is only legal for lifecycle statuses active/review. Marking a
//      discontinued or do-not-spec product default-visible contradicts
//      lifecycle and leaks it into default catalog views.
//   3. wingman-product-role-overrides.json: recommendationEligible true is
//      only legal when the match resolves to an active/review lifecycle row
//      (or a family prefix with at least one active member). A discontinued
//      family must not be recommendable.
//   4. wingman-product-suppression-list.json: a suppressed SKU must not be
//      lifecycle-active (suppressing a current product is a contradiction).
//
// This is the permanent check for the class of bug found in the 2026-09-01
// audit: 36 profile SKUs that did not resolve to lifecycle (EXP-4KUHD-0.5
// vs EXP-4KUHD-05 naming drift, NHD-500-TX-V2 / NHD-500-RX v2 / SYN-TOUCH10
// v3 junk duplicates, NetworkHD Touch trademark corruption, plus 26 real
// products absent from lifecycle), 12 role-override entries contradicting
// lifecycle status, and the SW-740-TX suppression-vs-override conflict.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function parseCsv(relativePath) {
  const text = readFileSync(path.join(root, relativePath), "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
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
    return row;
  });
}

function normaliseSku(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

const lifecycle = parseCsv("data-sources/wyrestorm/lifecycle.csv");
const lifecycleBySku = new Map();
for (const row of lifecycle) lifecycleBySku.set(normaliseSku(row.sku), row);
const lifecycleStatus = (sku) => lifecycleBySku.get(normaliseSku(sku))?.lifecycle_status?.toLowerCase() ?? null;
const isActiveOrReview = (sku) => {
  const status = lifecycleStatus(sku);
  return status === "active" || status === "review";
};

const problems = [];
const fail = (message) => problems.push(message);

// ---------------------------------------------------------------------------
// 1. Technical profile SKUs resolve to lifecycle
// ---------------------------------------------------------------------------
const profiles = readJson("data/governance/wyrestorm-technical-profiles.json");
for (const profile of profiles.profiles) {
  const sku = String(profile.sku ?? "").trim();
  if (!sku) {
    fail(`wyrestorm-technical-profiles: profile with empty sku`);
    continue;
  }
  if (!lifecycleBySku.has(normaliseSku(sku))) {
    fail(`wyrestorm-technical-profiles: profile SKU "${sku}" does not resolve to any lifecycle row. A governed spec keyed on an unknown SKU never attaches to a product.`);
  }
}

// ---------------------------------------------------------------------------
// 2. wyrestorm-product-role-overrides: default visibility only for active/review
// ---------------------------------------------------------------------------
const wyrestormOverrides = readJson("data/wyrestorm-product-role-overrides.json");
for (const [sku, entry] of Object.entries(wyrestormOverrides.exactSkuOverrides ?? {})) {
  if (entry.catalogVisibility === "default" && !isActiveOrReview(sku)) {
    const status = lifecycleStatus(sku) ?? "not-in-lifecycle";
    fail(`wyrestorm-product-role-overrides: "${sku}" is lifecycle "${status}" but catalogVisibility "default" - a non-active product must not be default-visible.`);
  }
}

// ---------------------------------------------------------------------------
// 3. wingman-product-role-overrides: recommendationEligible needs an
//    active/review exact SKU or an active family prefix
// ---------------------------------------------------------------------------
const wingmanOverrides = readJson("data/wingman-product-role-overrides.json");
const allSkuKeys = [...lifecycleBySku.keys()];
for (const rule of wingmanOverrides.rules ?? []) {
  const match = String(rule.match ?? "").trim();
  if (!rule.recommendationEligible || rule.dependencyOnly) continue;
  const exact = lifecycleBySku.has(normaliseSku(match));
  const familyActive = allSkuKeys.some(
    (key) => key.startsWith(normaliseSku(match)) && isActiveOrReview(key),
  );
  const exactIsActive = exact && isActiveOrReview(match);
  if (!exactIsActive && !familyActive) {
    const status = lifecycleStatus(match) ?? "not-in-lifecycle";
    fail(`wingman-product-role-overrides: "${match}" is lifecycle "${status}" with no active family member but recommendationEligible true - a non-recommendable product must not be recommendable.`);
  }
}

// ---------------------------------------------------------------------------
// 4. Suppression list: a suppressed SKU must not be lifecycle-active
// ---------------------------------------------------------------------------
const suppression = readJson("data/wingman-product-suppression-list.json");
for (const entry of suppression.suppressedSkus ?? []) {
  const sku = String(entry.sku ?? "").trim();
  if (lifecycleStatus(sku) === "active") {
    fail(`wingman-product-suppression-list: "${sku}" is suppressed but lifecycle-active - suppressing a current product is a contradiction.`);
  }
}

if (problems.length) {
  console.error("[governance-data] Failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `[governance-data] OK: ${profiles.profiles.length} profiles resolve to lifecycle, ` +
    `${Object.keys(wyrestormOverrides.exactSkuOverrides ?? {}).length} wyrestorm role overrides and ` +
    `${(wingmanOverrides.rules ?? []).length} wingman role overrides consistent with lifecycle, ` +
    `${(suppression.suppressedSkus ?? []).length} suppression entries consistent.`,
);
