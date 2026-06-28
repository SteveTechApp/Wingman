import fs from "node:fs";
import path from "node:path";
import { readCsv, writeText } from "./product-update-utils.mjs";

const [activeFile, discontinuedFile, doNotSpecFile, cableFile] = process.argv.slice(2);
if (![activeFile, discontinuedFile, doNotSpecFile, cableFile].every(Boolean)) {
  throw new Error(
    "Usage: node tools/import-wyrestorm-lifecycle-lists.mjs <active.txt> <discontinued.txt> <do-not-spec.txt> <cables.txt>",
  );
}

const lifecyclePath = "data-sources/wyrestorm/lifecycle.csv";
const productsPath = "data-sources/wyrestorm/products.csv";
const lifecycleHeaders = [
  "sku",
  "lifecycle_status",
  "business_status",
  "do_not_spec",
  "successor",
  "reason",
  "evidence_source",
  "last_reviewed",
  "reviewer",
];
const productHeaders = [
  "sku",
  "product_name",
  "family",
  "product_type",
  "role",
  "lifecycle_status",
  "do_not_spec",
  "successor",
  "inputs",
  "outputs",
  "transport_type",
  "resolution_bandwidth",
  "usb",
  "audio",
  "control",
  "network_requirement",
  "dependencies",
  "compatible_families",
  "application_fit",
  "disqualifiers",
  "quote_warnings",
  "evidence_source",
  "last_reviewed",
  "reviewer",
];
const blockedStatuses = new Set(["discontinued", "eol", "do-not-spec", "superseded", "archive"]);
const normalise = (value) => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
const readList = (file) =>
  new Set(
    fs
      .readFileSync(path.resolve(file), "utf8")
      .split(/\r?\n/g)
      .map((line) => normalise(line.trim()))
      .filter(Boolean),
  );
const sources = {
  active: readList(activeFile),
  discontinued: readList(discontinuedFile),
  doNotSpec: readList(doNotSpecFile),
  cable: readList(cableFile),
};

for (const [leftName, left] of Object.entries(sources)) {
  for (const [rightName, right] of Object.entries(sources)) {
    if (leftName >= rightName) continue;
    const overlaps = [...left].filter((key) => right.has(key));
    if (overlaps.length) {
      throw new Error(`Lifecycle input conflict between ${leftName} and ${rightName}: ${overlaps.join(", ")}`);
    }
  }
}

const reviewed = new Date().toISOString().slice(0, 10);
const evidence = [activeFile, discontinuedFile, doNotSpecFile, cableFile]
  .map((file) => path.basename(file))
  .join("; ");
const lifecycleRows = readCsv(lifecyclePath);
const products = readCsv(productsPath);
const lifecycleBySku = new Map(lifecycleRows.map((row) => [normalise(row.sku), row]));

function importedDecision(row) {
  const key = normalise(row.sku);
  if (sources.doNotSpec.has(key)) {
    return { status: "do-not-spec", businessStatus: "do-not-spec", blocked: true, reason: "Listed in the current WyreStorm do-not-spec business list." };
  }
  if (sources.discontinued.has(key)) {
    return { status: "discontinued", businessStatus: "discontinued", blocked: true, reason: "Listed in the current WyreStorm discontinued business list." };
  }
  if (sources.active.has(key)) {
    return { status: "active", businessStatus: "active", blocked: false, reason: "Listed in the current WyreStorm active-SKU business list." };
  }
  if (sources.cable.has(key)) {
    return { status: "active", businessStatus: "cable", blocked: false, reason: "Listed in the current WyreStorm cable/accessory business list." };
  }
  if (blockedStatuses.has(row.lifecycle_status)) {
    return {
      status: row.lifecycle_status,
      businessStatus: row.lifecycle_status === "do-not-spec" ? "do-not-spec" : "discontinued",
      blocked: true,
      reason: row.reason,
    };
  }
  return {
    status: "review",
    businessStatus: "review",
    blocked: false,
    reason: "Absent from the imported business lists; lifecycle requires review.",
  };
}

for (const row of lifecycleRows) {
  const decision = importedDecision(row);
  row.lifecycle_status = decision.status;
  row.business_status = decision.businessStatus;
  row.do_not_spec = String(decision.blocked);
  row.reason = decision.reason;
  row.evidence_source = evidence;
  row.last_reviewed = reviewed;
  row.reviewer = "Wingman lifecycle-list import";
}

for (const product of products) {
  const lifecycle = lifecycleBySku.get(normalise(product.sku));
  if (!lifecycle) throw new Error(`Missing lifecycle row for ${product.sku}.`);
  product.lifecycle_status = lifecycle.lifecycle_status;
  product.do_not_spec = lifecycle.do_not_spec;
  product.successor = lifecycle.successor;
}

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const toCsv = (headers, rows) =>
  [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");

writeText(lifecyclePath, toCsv(lifecycleHeaders, lifecycleRows));
writeText(productsPath, toCsv(productHeaders, products));

const counts = Object.fromEntries(
  ["active", "review", "discontinued", "do-not-spec"].map((status) => [
    status,
    lifecycleRows.filter((row) => row.lifecycle_status === status).length,
  ]),
);
console.log(`[lifecycle-import] Updated ${lifecycleRows.length} lifecycle rows: ${JSON.stringify(counts)}`);
