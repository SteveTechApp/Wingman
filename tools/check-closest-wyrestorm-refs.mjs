#!/usr/bin/env node
// Fails CI when a competitor row's closest_wyrestorm_sku_or_family reference
// points at anything other than a CURRENT, ACTIVE WyreStorm product.
//
// The field is a curated "WyreStorm equivalent" hint shown on battle cards.
// It may hold an exact SKU ("EX-100-G2"), a family reference ("NHD-500" ->
// NHD-500-TX/RX), a compound list ("SW-0401-H2 / SW-510-TX"), or prose
// stating no equivalent exists. Every SKU-like token in the field must
// resolve to a lifecycle_status=active SKU (or an active family prefix).
// A token naming a discontinued/review/do-not-spec product, or a SKU that
// does not exist in the lifecycle table at all, is a dangling reference:
// the battle card would tell a salesperson a WyreStorm equivalent that
// cannot be quoted.
//
// This is the permanent guard for the class of bug repaired in
// 56c5a54d (18 dangling refs) and found again in the 2026-09-01 audit
// (EX-100-H2, SW-130-TX, MX-0808-SCL, NHD-100/NHD-500 and others): the
// repair script fixed the rows it looked at; this check makes sure no new
// dangling reference can land.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const competitorDirectory = path.join(root, "data-sources", "competitors");
const lifecyclePath = path.join(root, "data-sources", "wyrestorm", "lifecycle.csv");

function parseCsv(relativePath) {
  const text = readFileSync(path.join(root, relativePath), "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0]
    .split(",")
    .map((cell) => cell.trim().replace(/^"|"$/g, ""));
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
    .replace(/\s+/g, "-");
}

const lifecycle = parseCsv("data-sources/wyrestorm/lifecycle.csv");
const lifecycleBySku = new Map();
for (const row of lifecycle) lifecycleBySku.set(normaliseSku(row.sku), row);
const activeSkus = new Set(
  [...lifecycleBySku.values()]
    .filter((row) => (row.lifecycle_status || "").toLowerCase() === "active")
    .map((row) => normaliseSku(row.sku)),
);

// Prose-only references that deliberately state there is no WyreStorm
// equivalent must not be token-scanned.
const NO_EQUIVALENT = /does not sell|no wyrestorm equivalent|no room-scheduling|no automation|no confirmed single-box|not a programmable processor|wyrestorm has no|no programmable|no equivalent|not a room|no direct|not a product|n\/a/i;

// SKU-shaped tokens inside prose that are not WyreStorm SKUs.
const NOT_SKU_TOKENS = new Set(["USB-C", "USB3", "HDMI", "HDBaseT", "RS-232", "AVoIP", "PoE", "LAN"]);

const skuTokenPattern = /[A-Z]{2,8}(?:-[A-Z0-9]{1,8})+/g;

const problems = [];
const files = readdirSync(competitorDirectory)
  .filter((file) => file.endsWith(".csv"))
  .sort((a, b) => a.localeCompare(b));

for (const file of files) {
  const rows = parseCsv(`data-sources/competitors/${file}`);
  for (const row of rows) {
    const reference = row.closest_wyrestorm_sku_or_family || "";
    if (!reference || reference === "not-applicable" || NO_EQUIVALENT.test(reference)) continue;

    const tokens = [...new Set(reference.match(skuTokenPattern) || [])].filter(
      (token) => !NOT_SKU_TOKENS.has(token) && !/^USB/.test(token),
    );
    for (const token of tokens) {
      const sku = normaliseSku(token);
      const record = lifecycleBySku.get(sku);
      const activeFamily = [...activeSkus].some((active) => active.startsWith(`${sku}-`));

      if (record && (record.lifecycle_status || "").toLowerCase() !== "active") {
        problems.push(
          `${file}: "${reference}" -> "${token}" is ${record.lifecycle_status} (not active)`,
        );
      } else if (!record && !activeFamily) {
        problems.push(`${file}: "${reference}" -> "${token}" does not match any WyreStorm SKU or active family`);
      }
    }
  }
}

if (problems.length) {
  console.error(`[closest-wyrestorm-refs] ${problems.length} dangling reference(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    "\nEvery SKU in closest_wyrestorm_sku_or_family must be lifecycle_status=active\n" +
      "(or an active family prefix). Repair the reference to the current product\n" +
      "before committing.",
  );
  process.exit(1);
}

console.log(`[closest-wyrestorm-refs] All closest_wyrestorm_sku_or_family references resolve to active WyreStorm products (${files.length} competitor files).`);
