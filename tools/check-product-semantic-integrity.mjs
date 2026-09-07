#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures = [];

function clean(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}
function lower(v) {
  return clean(v).toLowerCase();
}
function num(v) {
  const text = clean(v);
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
function fail(source, sku, detail) {
  failures.push({ source, sku: clean(sku), detail });
}
function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function payloadArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((v) => v !== "")) rows.push(row);
      row = []; field = "";
    } else field += ch;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((v) => v !== "")) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map(clean);
  return rows.slice(1).map((values) => {
    const out = {};
    headers.forEach((header, index) => out[header] = values[index] ?? "");
    return out;
  });
}
function csv(rel) {
  return parseCsv(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function splitterSize(sku, title) {
  const explicit = `${sku} ${title}`.replaceAll("×", "x").match(/\b1\s*x\s*(\d{1,2})\b/i);
  if (explicit) return { inputs: 1, outputs: Number(explicit[1]) };
  const skuMatch = clean(sku).toUpperCase().match(/^(?:EXP-)?SP-01(\d{2})(?:-|$)/);
  if (skuMatch) return { inputs: 1, outputs: Number(skuMatch[1]) };
  if (/^SP-618$/i.test(clean(sku))) return { inputs: 1, outputs: 8 };
  return null;
}
function isSplitter(sku, title, extra = "") {
  // Topology alone is not product purpose. Presentation switchers and network
  // endpoints can also be one-to-many, so only explicit distribution/splitter
  // identity can enter this fixed-fanout gate.
  return Boolean(splitterSize(sku, title)) ||
    /distribution amplifier|\bhdmi splitter\b|\bsplitter\b|\bduplicator\b|\bdistribution\b/i.test(`${title} ${extra}`);
}

for (const rel of [
  "data-sources/wyrestorm/enrichment.json",
  "data/wingman-canonical-product-store.json",
  "public/product-intelligence-index.json",
  "src/wingman2/lib/__fixtures__/productIntelligenceIndexSample.json",
]) {
  const payload = readJson(rel);
  for (const product of payloadArray(payload)) {
    const sku = clean(product.sku || product.id);
    const title = clean(product.name || product.title || product.summary);
    const ports = Array.isArray(product?.technicalProfile?.io?.ports)
      ? product.technicalProfile.io.ports
      : [];

    for (const port of ports) {
      const count = num(port.count);
      const evidence = clean(port.evidence || port.detail);
      const connector = clean(port.connector);
      const combined = `${connector} ${evidence}`;

      if (count !== null && count > 64) {
        fail(rel, sku, `Impossible port count ${count}: ${combined}`);
      }
      if (/\b\d+\s*x\s+optical(?:\s+zoom)?\b|\boptical\s+zoom\b/i.test(combined) &&
          /sfp|fibre|fiber|optical/i.test(connector)) {
        fail(rel, sku, `Optical zoom parsed as fibre/SFP: ${combined}`);
      }
      if (/(?:ir|bluetooth)\s+remote\b|remote control|remote handset|quick\s*start|user guide|\bmanual\b|wall mount|rack mount|mounting bracket|rack bracket|battery not included/i.test(evidence)) {
        fail(rel, sku, `Accessory remains in io.ports: ${evidence}`);
      }
      if (/5-?pin.*balanced.*audio|balanced.*audio.*5-?pin/i.test(evidence) &&
          /rj-?45|ethernet/i.test(connector)) {
        fail(rel, sku, `Balanced audio terminal block is still Ethernet/RJ45: ${combined}`);
      }
    }

    const size = splitterSize(sku, title);
    if (size && isSplitter(sku, title, `${product.category} ${product.family}`)) {
      const hdmiInput = ports
        .filter((p) => lower(p.direction) === "input" && /\bhdmi\b/i.test(`${p.connector} ${p.evidence}`))
        .reduce((sum, p) => sum + (num(p.count) ?? 0), 0);
      const hdmiOutput = ports
        .filter((p) => lower(p.direction) === "output" && /\bhdmi\b/i.test(`${p.connector} ${p.evidence}`))
        .reduce((sum, p) => sum + (num(p.count) ?? 0), 0);

      if (hdmiInput !== 1 || hdmiOutput !== size.outputs) {
        fail(rel, sku, `Splitter HDMI I/O is ${hdmiInput} in / ${hdmiOutput} out; expected 1 in / ${size.outputs} mirrored out.`);
      }

      const routed =
        num(product.routedOutputCount) ??
        num(product.routedOutputs);
      if (routed !== null && routed !== 0) {
        fail(rel, sku, `Fixed splitter exposes ${routed} independently routed outputs.`);
      }
    }
  }
}

const authority = readJson("data/governance/routed-io-evidence.json");
for (const [sku, entry] of Object.entries(authority)) {
  const size = splitterSize(sku, "");
  const splitter =
    Boolean(size) ||
    entry.outputBehaviour === "mirrored" ||
    entry.topologyType === "one-to-many-mirrored";

  if (!splitter) continue;

  if (num(entry.routedOutputs) !== 0) {
    fail("data/governance/routed-io-evidence.json", sku, "Fixed splitter routedOutputs must be 0.");
  }
  if (entry.outputBehaviour !== "mirrored") {
    fail("data/governance/routed-io-evidence.json", sku, "Fixed splitter outputBehaviour must be mirrored.");
  }
  if (entry.topologyType !== "one-to-many-mirrored") {
    fail("data/governance/routed-io-evidence.json", sku, "Fixed splitter topologyType must be one-to-many-mirrored.");
  }
  const logical = num(entry.logicalOutputs);
  const mirrored = num(entry.mirroredOutputs);
  const physical = num(entry.physicalOutputs);
  if (logical === null || mirrored === null || physical === null ||
      logical !== mirrored || mirrored !== physical) {
    fail(
      "data/governance/routed-io-evidence.json",
      sku,
      `Logical/physical/mirrored fan-out must agree. logical=${logical}, physical=${physical}, mirrored=${mirrored}`,
    );
  }
}

const wsRows = csv("data-sources/wyrestorm/products.csv");
for (const row of wsRows) {
  const size = splitterSize(row.sku, row.product_name);
  if (!size) continue;

  if (!/splitter|distribution/i.test(`${row.family} ${row.product_type} ${row.role}`)) {
    fail("data-sources/wyrestorm/products.csv", row.sku, "Splitter remains generic/unclassified.");
  }
  if (num(row.inputs) !== 1 || num(row.outputs) !== size.outputs) {
    fail(
      "data-sources/wyrestorm/products.csv",
      row.sku,
      `Canonical splitter I/O is ${row.inputs}/${row.outputs}; expected 1/${size.outputs}.`,
    );
  }
}

const competitorDir = path.join(ROOT, "data-sources", "competitors");
for (const fileName of fs.readdirSync(competitorDir).filter((x) => x.endsWith(".csv"))) {
  const rel = `data-sources/competitors/${fileName}`;
  for (const row of csv(rel)) {
    if (!isSplitter(row.model, row.product_name, `${row.product_class} ${row.role} ${row.topology}`)) continue;
    const mirrored = num(row.mirrored_output_count);
    if (mirrored !== null && mirrored > 0 && num(row.routed_output_count) !== 0) {
      fail(rel, row.model, `Fixed distribution product has routed_output_count=${row.routed_output_count}.`);
    }
  }
}

if (failures.length) {
  console.error("");
  console.error("Product semantic integrity gate FAILED");
  for (const item of failures.slice(0, 100)) {
    console.error(`- ${item.source} :: ${item.sku} :: ${item.detail}`);
  }
  if (failures.length > 100) {
    console.error(`... ${failures.length - 100} more failure(s) omitted`);
  }
  process.exit(1);
}

console.log("");
console.log("Product semantic integrity gate PASS");
console.log("Validated:");
console.log("- no impossible physical port counts");
console.log("- no camera zoom represented as optical/fibre I/O");
console.log("- no known box-content accessories in io.ports");
console.log("- balanced terminal audio is not Ethernet");
console.log("- 1xN splitter physical I/O is explicit");
console.log("- fixed distribution fan-out is mirrored, not independently routed");
console.log("- WyreStorm source splitter classification/I-O is explicit");
console.log("- competitor fixed distribution routing semantics are separated");
