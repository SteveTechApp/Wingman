import fs from "node:fs";
import path from "node:path";

const indexPath = "public/product-intelligence-index.json";
const reviewDate = new Date().toISOString().slice(0, 10);

const outputFiles = {
  catalogue: "data-imports/incoming/wyrestorm-catalogue-source.csv",
  lifecycle: "data-imports/incoming/wyrestorm-lifecycle-source.csv",
  competitor: "data-imports/incoming/competitor-fingerprints-source.csv",
  notes: "data-imports/incoming/competitor-review-notes-source.csv"
};

const controlledFiles = {
  catalogue: "data-imports/wyrestorm-catalogue-current.csv",
  lifecycle: "data-imports/wyrestorm-lifecycle-current.csv",
  competitor: "data-imports/competitor-fingerprints-current.csv",
  notes: "data-imports/competitor-review-notes.csv"
};

function fail(message) {
  console.error(`[product-update:create-incoming-from-index] ${message}`);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function firstLine(file) {
  return read(file)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")[0]
    ?.trim() ?? "";
}

function parseCsvHeader(header) {
  const fields = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < header.length; i += 1) {
    const char = header[i];
    const next = header[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(value.trim());
      value = "";
      continue;
    }

    value += char;
  }

  fields.push(value.trim());
  return fields.filter(Boolean);
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function writeCsv(file, headers, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","))
  ];

  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
}

function flattenValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join("; ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== "")
      .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join("; ") : item}`)
      .join("; ");
  }

  return value ?? "";
}

function normaliseSku(value) {
  return String(value ?? "").trim().toUpperCase();
}

function collectObjects(value, results = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjects(item, results);
    }

    return results;
  }

  if (value && typeof value === "object") {
    const hasSku =
      typeof value.sku === "string" ||
      typeof value.productSku === "string" ||
      typeof value.model === "string";

    if (hasSku) {
      results.push(value);
    }

    for (const item of Object.values(value)) {
      collectObjects(item, results);
    }
  }

  return results;
}

function pick(record, names) {
  for (const name of names) {
    if (record[name] !== null && record[name] !== undefined && record[name] !== "") {
      return flattenValue(record[name]);
    }
  }

  return "";
}

function isLastReviewedField(key) {
  return key === "last_reviewed" || key === "lastreviewed" || key === "reviewed_date" || key === "date_reviewed";
}

function inferCatalogueValue(header, record, sku) {
  const key = header.toLowerCase();

  if (key === "sku" || key.includes("product_sku") || key.includes("productsku")) {
    return sku;
  }

  if (key.includes("model")) {
    return sku;
  }

  if (isLastReviewedField(key)) {
    return reviewDate;
  }

  if (key === "reviewer") {
    return "Wingman import scaffold";
  }

  if (key.includes("brand") || key.includes("manufacturer")) {
    return "WyreStorm";
  }

  if (key.includes("product") || key.includes("name") || key.includes("title")) {
    return pick(record, ["name", "productName", "title", "label", "displayName"]) || sku;
  }

  if (key.includes("family") || key.includes("series")) {
    return pick(record, ["family", "series", "productFamily", "category"]);
  }

  if (key.includes("category") || key.includes("class") || key.includes("type")) {
    return pick(record, ["category", "class", "type", "role", "productClass"]);
  }

  if (key.includes("role")) {
    return pick(record, ["role", "recommendationRole", "productRole"]);
  }

  if (key.includes("lifecycle") || key === "status") {
    return pick(record, ["lifecycle", "lifecycleStatus", "status"]) || "review";
  }

  if (key.includes("do_not") || key.includes("do-not") || key.includes("donotspec")) {
    return pick(record, ["doNotSpec", "do_not_spec"]) || "false";
  }

  if (key.includes("source") || key.includes("evidence")) {
    return "Existing Wingman product intelligence index";
  }

  if (key.includes("note")) {
    return "Generated starter row from existing governed Wingman index; review before promotion.";
  }

  if (key.includes("input")) {
    return pick(record, ["inputs", "inputCount", "videoInputs"]);
  }

  if (key.includes("output")) {
    return pick(record, ["outputs", "outputCount", "videoOutputs"]);
  }

  if (key.includes("usb")) {
    return pick(record, ["usb", "usbSupport", "usbNotes"]);
  }

  if (key.includes("audio")) {
    return pick(record, ["audio", "audioSupport", "audioNotes"]);
  }

  if (key.includes("control")) {
    return pick(record, ["control", "controlSupport", "controlNotes"]);
  }

  if (key.includes("resolution")) {
    return pick(record, ["resolution", "maxResolution", "video"]);
  }

  if (key.includes("date")) {
    return reviewDate;
  }

  if (key.includes("review")) {
    return "review";
  }

  return pick(record, [header]);
}

function inferLifecycleValue(header, record, sku) {
  const key = header.toLowerCase();

  if (key === "sku" || key.includes("product_sku") || key.includes("productsku") || key.includes("model")) {
    return sku;
  }

  if (isLastReviewedField(key)) {
    return reviewDate;
  }

  if (key === "reviewer") {
    return "Wingman import scaffold";
  }

  if (key.includes("lifecycle") || key === "status") {
    return pick(record, ["lifecycle", "lifecycleStatus", "status"]) || "review";
  }

  if (key.includes("do_not") || key.includes("do-not") || key.includes("donotspec")) {
    return pick(record, ["doNotSpec", "do_not_spec"]) || "false";
  }

  if (key.includes("source") || key.includes("evidence")) {
    return "Existing Wingman product intelligence index";
  }

  if (key.includes("note") || key.includes("reason")) {
    return "Generated starter lifecycle row; confirm lifecycle before promotion.";
  }

  if (key.includes("date")) {
    return reviewDate;
  }

  if (key.includes("review")) {
    return "review";
  }

  return pick(record, [header]);
}

if (!fs.existsSync(indexPath)) {
  fail(`Missing product intelligence index: ${indexPath}. Run npm run build or npm run data:product-intelligence-index first.`);
}

for (const file of Object.values(controlledFiles)) {
  if (!fs.existsSync(file)) {
    fail(`Missing controlled CSV: ${file}`);
  }
}

const catalogueHeaders = parseCsvHeader(firstLine(controlledFiles.catalogue));
const lifecycleHeaders = parseCsvHeader(firstLine(controlledFiles.lifecycle));
const competitorHeaders = parseCsvHeader(firstLine(controlledFiles.competitor));
const notesHeaders = parseCsvHeader(firstLine(controlledFiles.notes));

const index = JSON.parse(read(indexPath));
const records = collectObjects(index);
const bySku = new Map();

for (const record of records) {
  const sku = normaliseSku(record.sku ?? record.productSku ?? record.model);

  if (!sku) {
    continue;
  }

  if (!bySku.has(sku)) {
    bySku.set(sku, record);
  }
}

const sorted = [...bySku.entries()].sort(([a], [b]) => a.localeCompare(b));

const catalogueRows = sorted.map(([sku, record]) => {
  const row = {};

  for (const header of catalogueHeaders) {
    row[header] = inferCatalogueValue(header, record, sku);
  }

  return row;
});

const lifecycleRows = sorted.map(([sku, record]) => {
  const row = {};

  for (const header of lifecycleHeaders) {
    row[header] = inferLifecycleValue(header, record, sku);
  }

  return row;
});

writeCsv(outputFiles.catalogue, catalogueHeaders, catalogueRows);
writeCsv(outputFiles.lifecycle, lifecycleHeaders, lifecycleRows);

/*
  Competitor data should not be invented from WyreStorm data.
  Keep these files header-only until reviewed competitor fingerprints are supplied.
*/
writeCsv(outputFiles.competitor, competitorHeaders, []);
writeCsv(outputFiles.notes, notesHeaders, []);

console.log(`[product-update:create-incoming-from-index] WyreStorm catalogue rows: ${catalogueRows.length}`);
console.log(`[product-update:create-incoming-from-index] WyreStorm lifecycle rows: ${lifecycleRows.length}`);
console.log(`[product-update:create-incoming-from-index] Review date used: ${reviewDate}`);
console.log("[product-update:create-incoming-from-index] Competitor incoming files created as header-only. Populate from reviewed competitor data before promotion.");
