#!/usr/bin/env node
// Fails CI when a competitor row's closest_wyrestorm_architecture reference
// names a WyreStorm architecture family that is retired, or an SKU token that
// is not a current active product.
//
// The architecture field is prose ("NetworkHD 500 (premium 1GbE AVoIP)",
// "4x4 HDBaseT matrix"). Generic category words are fine; but a mention of a
// WyreStorm family that no longer sells (e.g. "NetworkHD 400" - all NHD-4xx
// SKUs are discontinued) or an embedded retired SKU token would point a
// salesperson at an architecture Wingman can no longer recommend. This is the
// counterpart of tools/check-closest-wyrestorm-refs.mjs (SKU column) and
// tools/check-lifecycle-successor-refs.mjs (remaps), applied to the
// architecture column.
//
// Current family source of truth: the ProductFamilyPage familyGuides define
// exactly three NetworkHD generations (ids networkhd-100/500/600) plus the
// Apollo range (APO-* SKUs). A generation listed there must also still have
// active SKUs in lifecycle.csv before prose referencing it passes.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const competitorDirectory = path.join(root, "data-sources", "competitors");
const lifecyclePath = path.join(root, "data-sources", "wyrestorm", "lifecycle.csv");

export function parseCsv(text) {
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

// The three current NetworkHD generations, mirroring the ProductFamilyPage
// familyGuides ids. Adding or retiring a generation here is the deliberate
// act of updating this check.
export const CURRENT_NETWORKHD_GENERATIONS = ["100", "500", "600"];
// Each generation must still have at least one active SKU in lifecycle.csv.
// NetworkHD 100 series SKUs are NHD-1xx (NHD-110/120/128/150), so the prefix
// is a 3-digit 1xx family, not a literal "NHD-100-".
const GENERATION_ACTIVE_PREFIX = {
  "100": /^NHD-1\d\d/,
  "500": /^NHD-5\d\d/,
  "600": /^NHD-6\d\d/,
};

const NO_EQUIVALENT = /no direct wyrestorm hardware equivalent|no wyrestorm equivalent|no equivalent/i;
const NOT_SKU_TOKENS = new Set(["USB-C", "USB3", "HDMI", "HDBaseT", "RS-232", "AVoIP", "PoE", "LAN", "TCP-IP"]);
const skuTokenPattern = /[A-Z]{2,8}(?:-[A-Z0-9]{1,8})+/g;
const networkHdGenerationPattern = /NetworkHD[\s-]*(\d+(?:\s*\/\s*\d+)?)/gi;
const apolloMentionPattern = /\bApollo\b/i;

export function loadLifecycleRows(csvText) {
  return parseCsv(csvText);
}

/**
 * Problems for one architecture value given active SKUs + lifecycle rows.
 */
export function collectArchitectureProblems(file, row, activeSkus, lifecycleBySku) {
  const value = (row.closest_wyrestorm_architecture || "").trim();
  if (!value || NO_EQUIVALENT.test(value)) return [];

  const problems = [];

  // 1. NetworkHD generation mentions - every generation must be current and
  //    still backed by active SKUs.
  for (const match of value.matchAll(networkHdGenerationPattern)) {
    const gens = match[1].replace(/\s/g, "").split("/");
    for (const gen of gens) {
      if (!CURRENT_NETWORKHD_GENERATIONS.includes(gen)) {
        problems.push(
          `${file}: "${value}" references NetworkHD ${gen}, which is not a current WyreStorm architecture family ` +
            `(current: ${CURRENT_NETWORKHD_GENERATIONS.join("/")}). Update the reference to the current generation.`,
        );
        continue;
      }
      const prefix = GENERATION_ACTIVE_PREFIX[gen];
      const hasActive = prefix && [...activeSkus].some((sku) => prefix.test(sku));
      if (!hasActive) {
        problems.push(
          `${file}: "${value}" references NetworkHD ${gen}, but no active lifecycle SKU remains for that generation - the family is retired.`,
        );
      }
    }
  }

  // 2. Apollo range mention - the range must still have active SKUs.
  if (apolloMentionPattern.test(value)) {
    const apolloActive = [...activeSkus].some((sku) => sku.startsWith("APO-"));
    if (!apolloActive) {
      problems.push(`${file}: "${value}" references the Apollo range, but no active APO-* SKU remains - the range is retired.`);
    }
  }

  // 3. Embedded SKU tokens (e.g. "EX-100-G2") - must resolve to an active SKU
  //    or an active family prefix, exactly like the SKU-column checker.
  const tokens = [...new Set(value.match(skuTokenPattern) || [])].filter(
    (token) => !NOT_SKU_TOKENS.has(token) && !/^USB/.test(token),
  );
  for (const token of tokens) {
    const sku = normaliseSku(token);
    const record = lifecycleBySku.get(sku);
    const activeFamily = [...activeSkus].some((active) => active.startsWith(`${sku}-`));
    if (record && (record.lifecycle_status || "").toLowerCase() !== "active") {
      problems.push(`${file}: "${value}" -> "${token}" is ${record.lifecycle_status} (not active)`);
    } else if (!record && !activeFamily) {
      problems.push(`${file}: "${value}" -> "${token}" does not match any WyreStorm SKU or active family`);
    }
  }

  return problems;
}

export function checkClosestWyrestormArchRefs() {
  const lifecycle = parseCsv(readFileSync(lifecyclePath, "utf8"));
  const lifecycleBySku = new Map();
  for (const row of lifecycle) lifecycleBySku.set(normaliseSku(row.sku), row);
  const activeSkus = new Set(
    [...lifecycleBySku.values()]
      .filter((row) => (row.lifecycle_status || "").toLowerCase() === "active")
      .map((row) => normaliseSku(row.sku)),
  );

  const files = readdirSync(competitorDirectory)
    .filter((file) => file.endsWith(".csv"))
    .sort((a, b) => a.localeCompare(b));

  const problems = [];
  for (const file of files) {
    const rows = parseCsv(readFileSync(path.join(competitorDirectory, file), "utf8"));
    for (const row of rows) {
      problems.push(...collectArchitectureProblems(file, row, activeSkus, lifecycleBySku));
    }
  }

  if (problems.length) {
    console.error(`[closest-wyrestorm-arch-refs] ${problems.length} retired/invalid architecture reference(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      "\nEvery WyreStorm family or SKU named in closest_wyrestorm_architecture must be a current\n" +
        "architecture with active products. Repair the reference before committing.",
    );
    process.exitCode = 1;
    return problems;
  }
  console.log(`[closest-wyrestorm-arch-refs] All closest_wyrestorm_architecture references name current WyreStorm families (${files.length} competitor files).`);
  return problems;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  checkClosestWyrestormArchRefs();
}
