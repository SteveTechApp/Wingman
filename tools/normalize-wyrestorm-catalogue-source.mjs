import fs from "node:fs";
import path from "node:path";
import {
  clean,
  normaliseSku,
  readCsv,
  splitList,
} from "./product-update-utils.mjs";

const catalogueHeaders = [
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
  "reviewer"
];

const defaultInput = "data-sources/incoming/wyrestorm-vendor-export.csv";
const defaultOutput = "data-sources/incoming/wyrestorm-products.csv";

const aliases = {
  sku: ["sku", "model", "model_number", "part_number", "part", "product_code"],
  product_name: ["product_name", "name", "product", "description", "product_description"],
  family: ["family", "series", "product_family", "range"],
  product_type: ["product_type", "type", "category", "product_category"],
  role: ["role", "device_role", "function"],
  lifecycle_status: ["lifecycle_status", "status", "lifecycle", "product_status"],
  do_not_spec: ["do_not_spec", "do_not_recommend", "dns", "blocked"],
  successor: ["successor", "replacement", "replaced_by"],
  inputs: ["inputs", "input", "input_ports"],
  outputs: ["outputs", "output", "output_ports"],
  transport_type: ["transport_type", "transport", "signal_transport", "technology"],
  resolution_bandwidth: ["resolution_bandwidth", "resolution", "bandwidth", "video_support"],
  usb: ["usb", "usb_support"],
  audio: ["audio", "audio_support"],
  control: ["control", "control_support"],
  network_requirement: ["network_requirement", "network", "network_requirements"],
  dependencies: ["dependencies", "requires", "required_accessories"],
  compatible_families: ["compatible_families", "compatible_family", "compatibility"],
  application_fit: ["application_fit", "applications", "use_case", "best_fit"],
  disqualifiers: ["disqualifiers", "limitations", "known_limitations", "not_for"],
  quote_warnings: ["quote_warnings", "quote_warning", "warnings", "sales_notes"],
  evidence_source: ["evidence_source", "source", "datasheet", "reference"],
  last_reviewed: ["last_reviewed", "reviewed", "review_date", "date"],
  reviewer: ["reviewer", "reviewed_by", "owner"]
};

function usage() {
  return [
    "Usage: node tools/normalize-wyrestorm-catalogue-source.mjs [input.csv] [output.csv]",
    `Default input: ${defaultInput}`,
    `Default output: ${defaultOutput}`
  ].join("\n");
}

function canonicalValue(record, header) {
  for (const alias of aliases[header] ?? [header]) {
    const value = clean(record[alias]);
    if (value) return value;
  }
  return "";
}

function normalizeBoolean(value) {
  const normalized = clean(value).toLowerCase();
  if (["true", "yes", "y", "1", "do-not-spec", "do not spec"].includes(normalized)) return "true";
  if (["false", "no", "n", "0"].includes(normalized)) return "false";
  return normalized ? value : "false";
}

function normalizeLifecycle(value) {
  const normalized = clean(value).toLowerCase();
  if (["current", "available", "live"].includes(normalized)) return "active";
  if (["end of life"].includes(normalized)) return "eol";
  return normalized || "review";
}

function csvCell(value) {
  const text = clean(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowToCsv(row) {
  return catalogueHeaders.map((header) => csvCell(row[header])).join(",");
}

const input = process.argv[2] || defaultInput;
const output = process.argv[3] || defaultOutput;

if (["-h", "--help"].includes(input)) {
  console.log(usage());
  process.exit(0);
}

if (!fs.existsSync(input)) {
  console.error(`[normalize-wyrestorm-catalogue] Missing input file: ${input}\n${usage()}`);
  process.exit(1);
}

const records = readCsv(input);
const rowsBySku = new Map();

for (const record of records) {
  const row = Object.fromEntries(catalogueHeaders.map((header) => [header, canonicalValue(record, header)]));
  row.sku = normaliseSku(row.sku);
  if (!row.sku) continue;
  row.lifecycle_status = normalizeLifecycle(row.lifecycle_status);
  row.do_not_spec = normalizeBoolean(row.do_not_spec);
  row.dependencies = splitList(row.dependencies).join("; ");
  row.compatible_families = splitList(row.compatible_families).join("; ");
  rowsBySku.set(row.sku, row);
}

const rows = Array.from(rowsBySku.values()).sort((a, b) => a.sku.localeCompare(b.sku));
const csv = [catalogueHeaders.join(","), ...rows.map(rowToCsv)].join("\n");
const outputPath = path.isAbsolute(output) ? output : path.join(process.cwd(), output);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${csv}\n`, "utf8");

console.log(`[normalize-wyrestorm-catalogue] Normalized ${rows.length} row(s) from ${input} -> ${output}`);
