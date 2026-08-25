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

// ── Guard 2: Orphaned display endpoints (receivers with no source endpoints) ──
// If a template has display endpoints (NHD-*-RX, RX*, RX3*) it must also have
// source endpoints (NHD-*-TX, TX*, SW-*TX) or be a transceiver-only design.
const displayEndpointPattern = /^RX3?-|^NHD-\d+-RX$/i;
const sourceEndpointPattern = /^.*TX(-|$)|^NHD-\d+-TX|SW-\d+-TX/i;
const transceiverPattern = /TRX$/i;
// Hybrid matrices with HDBaseT outputs can drive receivers directly
const hybridMatrixPattern = /^MX-\d+-HYB$/i;

const orphanFailures = [];
for (const template of templates) {
  const body = lines.slice(template.start, template.end).join("\n");
  const skus = [...new Set([...body.matchAll(/sku: "([A-Z0-9-]+)"/g)].map((m) => m[1]))]
    .filter((sku) => !sku.startsWith("BY-OTHERS"));

  const displayEndpoints = skus.filter((sku) => displayEndpointPattern.test(sku));
  if (displayEndpoints.length === 0) continue;

  const sourceEndpoints = skus.filter((sku) => sourceEndpointPattern.test(sku));
  const transceivers = skus.filter((sku) => transceiverPattern.test(sku));
  const hybridMatrices = skus.filter((sku) => hybridMatrixPattern.test(sku));

  // If there are transceivers (NHD-600-TRX), they serve as both source and display
  if (transceivers.length > 0) continue;

  // If there are hybrid matrices with HDBaseT outputs, they can drive receivers
  if (hybridMatrices.length > 0) continue;

  if (sourceEndpoints.length === 0) {
    orphanFailures.push(
      `"${template.name}" has display endpoint(s) ${displayEndpoints.join(", ")} ` +
      `but no source endpoint. Every display needs a source to show content. ` +
      `Template SKUs: ${skus.join(", ")}.`
    );
  }
}

if (orphanFailures.length) {
  console.error("\n[template-signal-path] Orphaned display endpoint check failed:");
  for (const entry of orphanFailures) console.error(`  - ${entry}`);
  console.error(
    "\nA room template with display endpoints (receivers/decoders) must also have source " +
    "endpoints (transmitters/encoders) to feed them content."
  );
  process.exit(1);
}

// ── Guard 3: NetworkHD templates must include a controller ──
// Any template using NHD-*-TX, NHD-*-RX, or NHD-*-TRX endpoints must include
// NHD-CTL-PRO-V2 (or a BY-OTHERS controller placeholder).
const nhdEndpointPattern = /^NHD-\d+-(TX|RX|TRX|IW-TX)/i;
const controllerPattern = /CTL-PRO|BY-OTHERS.*control/i;

const controllerFailures = [];
for (const template of templates) {
  const body = lines.slice(template.start, template.end).join("\n");
  const skus = [...new Set([...body.matchAll(/sku: "([A-Z0-9-]+)"/g)].map((m) => m[1]))];

  const nhdEndpoints = skus.filter((sku) => nhdEndpointPattern.test(sku));
  if (nhdEndpoints.length === 0) continue;

  const hasController = skus.some((sku) => controllerPattern.test(sku));
  if (!hasController) {
    controllerFailures.push(
      `"${template.name}" has NetworkHD endpoints (${nhdEndpoints.slice(0, 3).join(", ")}${nhdEndpoints.length > 3 ? "..." : ""}) ` +
      `but no NHD-CTL-PRO-V2 controller or BY-OTHERS control placeholder. ` +
      `NetworkHD systems require a controller for routing and presets.`
    );
  }
}

if (controllerFailures.length) {
  console.error("\n[template-signal-path] NetworkHD controller check failed:");
  for (const entry of controllerFailures) console.error(`  - ${entry}`);
  console.error(
    "\nEvery NetworkHD template must include NHD-CTL-PRO-V2 or a BY-OTHERS control " +
    "placeholder row, because NetworkHD systems require a controller for routing."
  );
  process.exit(1);
}

// ── Guard 4: Source/display ratio warning ──
// If a template has significantly more display endpoints than source endpoints
// and no multiview processor, the design may starve displays of unique content.
// This is a WARNING, not a hard failure — many legitimate designs (signage,
// overflow, retail) intentionally show the same source on multiple displays.
const multiviewPattern = /NHD-150-RX|NHD-0401-MV/i;
const ratioWarnings = [];

for (const template of templates) {
  const body = lines.slice(template.start, template.end).join("\n");

  // Extract SKU+qty pairs (not deduplicated) to count total endpoint quantities
  const bomRows = [...body.matchAll(/sku: "([A-Z0-9-]+)"[\s\S]*?qty: (\d+)/g)].map((m) => ({
    sku: m[1],
    qty: parseInt(m[2], 10),
  })).filter((row) => !row.sku.startsWith("BY-OTHERS"));

  // Skip transceiver-only designs (NHD-600-TRX) — each TRX serves dual roles
  if (bomRows.some((row) => transceiverPattern.test(row.sku))) continue;

  const totalDisplays = bomRows
    .filter((row) => displayEndpointPattern.test(row.sku) && !multiviewPattern.test(row.sku))
    .reduce((sum, row) => sum + row.qty, 0);
  if (totalDisplays === 0) continue;

  const totalSources = bomRows
    .filter((row) => sourceEndpointPattern.test(row.sku))
    .reduce((sum, row) => sum + row.qty, 0);

  const hasMultiview = bomRows.some((row) => multiviewPattern.test(row.sku));

  const ratio = totalSources > 0 ? totalDisplays / totalSources : totalDisplays;

  if (ratio > 2 && !hasMultiview) {
    ratioWarnings.push(
      `"${template.name}" has ${totalDisplays} display endpoint(s) but only ${totalSources} source endpoint(s)` +
      ` (${ratio.toFixed(1)}:1 ratio) with no multiview processor. ` +
      `Most displays will show the same content. If this is intentional (signage/overflow), ` +
      `add a comment in the template's assumptions array.`
    );
  }
}

if (ratioWarnings.length) {
  console.log(`\n[template-signal-path] ${ratioWarnings.length} source/display ratio warning(s):`);
  for (const entry of ratioWarnings) console.log(`  ⚠ ${entry}`);
}

// ── Guard 5: SKUs missing from governed profiles and product catalogue ──
// Every WyreStorm SKU in a template BOM must exist in either the governed
// technical profiles or the product catalogue. A SKU absent from both is a
// phantom — it will resolve to nothing at recommendation time, silently
// downgrade the template to placeholder-quality output, or surface an
// incorrect product in the exported proposal. Accessories and BY-OTHERS rows
// are exempt.
const phantomFailures = [];
for (const template of templates) {
  const body = lines.slice(template.start, template.end).join("\n");
  const skus = [...new Set([...body.matchAll(/sku: "([A-Z0-9-]+)"/g)].map((m) => m[1]))]
    .filter((sku) => !sku.startsWith("BY-OTHERS") && !sku.startsWith("CAB-"));

  const missingSkus = [];
  for (const sku of skus) {
    const inProfile = profiles.has(sku);
    const inCatalogue = products.has(sku);
    if (!inProfile && !inCatalogue) missingSkus.push(sku);
  }

  if (missingSkus.length > 0) {
    phantomFailures.push(
      `"${template.name}" references SKU(s) not found in governed profiles or product catalogue: ` +
      `${missingSkus.join(", ")}. These are phantom entries — they resolve to nothing at ` +
      `recommendation time. Replace with the correct current SKU or remove the row.`
    );
  }
}

if (phantomFailures.length) {
  console.error("\n[template-signal-path] Phantom SKU check failed:");
  for (const entry of phantomFailures) console.error(`  - ${entry}`);
  console.error(
    "\nEvery WyreStorm SKU in a template BOM must exist in the governed technical profiles or " +
    "the product catalogue. SKUs absent from both will silently produce incorrect proposals."
  );
  process.exit(1);
}

console.log(
  `[template-signal-path] Verified HDBaseT signal paths, orphaned displays, controller presence, source/display ratios, and SKU catalogue coverage across ${templates.length} room templates` +
    `${known.length ? ` (${known.length} known incomplete, tracked above)` : ""}` +
    `${ratioWarnings.length ? ` (${ratioWarnings.length} ratio warnings)` : ""}.`,
);
