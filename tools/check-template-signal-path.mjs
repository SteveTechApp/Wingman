#!/usr/bin/env node
// Checks that each room template's BOM forms a coherent signal path.
//
// The Compare engine already distinguishes an HDMI matrix from an HDBaseT one
// correctly - findKnownWyrestormMatrixProfile resolves MX-0808-SCL to
// outputTypes ["HDMI"] and MXV-0808-H2A-MK2 to ["HDBaseT"]. But roomTemplates.ts
// is hand-authored and nothing cross-checked its BOMs against that model, so a
// template could pair an HDMI-output matrix with an HDBaseT receiver and no
// guard would notice.
//
// That is exactly what happened: "Local Pub - 8x8 Matrix TV Distribution"
// contained MX-0808-SCL (HDMI outputs only, 4K60 rated to 5m of HDMI cable),
// RX-70-4K (an HDBaseT receiver) and nothing else. The receiver had no
// transmitter to pair with, and the remote TVs could not be reached. A proposal
// generated from that template would not build.
//
// Rule enforced: if a template contains an HDBaseT receiver, it must also
// contain something that can drive HDBaseT - a transmitter, or a matrix with
// HDBaseT outputs. Authority is the governed technical profiles where a profile
// exists, falling back to the product catalogue family/type.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Templates whose signal path is known-incomplete and awaiting a design
// decision. Entries must describe the decision needed. This exists so the guard
// blocks NEW breakage while the known gap stays visible on every run; it is not
// a way to make a failing build pass.
//
// Both original entries - "Local Pub - 8x8 Matrix TV Distribution" and
// "Residential Media Room - Local Matrix" - were FIXED rather than frozen:
//   - Local Pub: MX-0808-SCL (HDMI-only seamless matrix) + stray RX-70-4K
//     replaced with MX-0808-KIT-V2, a native HDBaseT matrix kit that ships
//     with 8 receivers.
//   - Residential: the orphaned RX-70-4K receiver replaced with EX-70-H2, a
//     complete HDBaseT extender set (TX + RX).
// The map is now empty. Keep it that way unless a genuinely undecidable design
// gap appears; prefer fixing the template.
const KNOWN_INCOMPLETE = new Map([]);

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { cells.push(current); current = ""; }
      else current += char;
    }
    cells.push(current);
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
}

const products = new Map();
for (const row of parseCsv(readFileSync(path.join(projectRoot, "data-sources", "wyrestorm", "products.csv"), "utf8"))) {
  if (row.sku) products.set(row.sku.toUpperCase(), row);
}

const profiles = new Map();
{
  const payload = JSON.parse(readFileSync(path.join(projectRoot, "data", "governance", "wyrestorm-technical-profiles.json"), "utf8"));
  for (const profile of payload.profiles ?? []) {
    if (profile?.sku) profiles.set(String(profile.sku).toUpperCase(), profile);
  }
}

function profileText(sku) {
  const profile = profiles.get(sku);
  if (!profile) return "";
  return [profile.productClass, profile.role, profile.productType, ...(profile.transport ?? [])].join(" ").toLowerCase();
}

function catalogueText(sku) {
  const row = products.get(sku);
  if (!row) return "";
  return [row.product_name, row.family, row.product_type, row.transport_type].join(" ").toLowerCase();
}

function isHdbasetReceiver(sku) {
  const text = profileText(sku);
  if (text) return text.includes("hdbaset") && /receiver/.test(text);
  // No governed profile: fall back to the catalogue. Deliberately conservative -
  // only an explicit HDBaseT extender/extension entry with an RX-style SKU counts.
  const fallback = catalogueText(sku);
  return /hdbaset|extension|extender/.test(fallback) && /^RX/i.test(sku);
}

function canDriveHdbaset(sku) {
  const text = profileText(sku);
  if (text) {
    // A governed profile that explicitly says HDMI-only must never qualify.
    if (/no hdbaset/.test(text)) return false;
    if (text.includes("hdbaset") && !/receiver/.test(text)) return true;
  }
  const fallback = catalogueText(sku);
  // A native HDBaseT matrix (or matrix kit) has HDBaseT zone outputs.
  if (/hdbaset matrix|hdbaset matrix kit/.test(fallback)) return true;
  // Transmitter-shaped SKUs in an HDBaseT context.
  if (/hdbaset/.test(fallback) && /(^|-)TX(-|$)/i.test(sku)) return true;
  // An HDBaseT extender SET is self-contained (TX + RX). EX-* extension-family
  // SKUs that are not explicitly a standalone receiver provide their own
  // transmit end, so they satisfy - and do not require - a separate source.
  if (/^EX-/i.test(sku) && /extension|extender/.test(fallback) && !/receiver/.test(fallback)) return true;
  return false;
}

// Split roomTemplates.ts into templates by top-level object boundaries.
const source = readFileSync(path.join(projectRoot, "src", "wingman2", "lib", "roomTemplates.ts"), "utf8");
const lines = source.split(/\r?\n/);
const templates = [];
let currentName = null;
let start = 0;

lines.forEach((line, index) => {
  if (/^ {2}\{/.test(line)) {
    if (currentName) templates.push({ name: currentName, start, end: index });
    currentName = null;
    start = index;
  }
  const nameMatch = line.match(/^ {4}name: "([^"]+)"/);
  if (nameMatch && !currentName) currentName = nameMatch[1];
});
if (currentName) templates.push({ name: currentName, start, end: lines.length });

const failures = [];
const known = [];

for (const template of templates) {
  const body = lines.slice(template.start, template.end).join("\n");
  const skus = [...new Set([...body.matchAll(/sku: "([A-Z0-9-]+)"/g)].map((m) => m[1]))]
    .filter((sku) => !sku.startsWith("BY-OTHERS"));

  const receivers = skus.filter(isHdbasetReceiver);
  if (receivers.length === 0) continue;

  const sources = skus.filter(canDriveHdbaset);
  if (sources.length > 0) continue;

  const detail =
    `"${template.name}" contains HDBaseT receiver(s) ${receivers.join(", ")} but nothing that can ` +
    `drive HDBaseT. Template SKUs: ${skus.join(", ")}.`;

  if (KNOWN_INCOMPLETE.has(template.name)) {
    known.push(`${detail}\n      Decision needed: ${KNOWN_INCOMPLETE.get(template.name)}`);
    continue;
  }
  failures.push(detail);
}

if (known.length) {
  console.log(`[template-signal-path] ${known.length} known-incomplete template(s) awaiting a design decision:`);
  for (const entry of known) console.log(`  - ${entry}`);
}

if (failures.length) {
  console.error("\n[template-signal-path] Check failed:");
  for (const entry of failures) console.error(`  - ${entry}`);
  console.error(
    "\nA room template BOM becomes a customer proposal. An HDBaseT receiver needs a transmitter or\n" +
      "a matrix with HDBaseT outputs in the same design. Note that an HDMI matrix - for example\n" +
      "MX-0808-SCL, whose outputs are HDMI only - cannot feed an HDBaseT receiver directly.",
  );
  process.exit(1);
}

console.log(
  `[template-signal-path] Verified HDBaseT signal paths across ${templates.length} room templates` +
    `${known.length ? ` (${known.length} known incomplete, tracked above)` : ""}.`,
);
