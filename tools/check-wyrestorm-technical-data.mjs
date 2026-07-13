import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const profilePath = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const productPath = path.join(root, "data-sources", "wyrestorm", "products.csv");

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows.filter((item) => item.some((value) => value !== ""));
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), String(values[index] ?? "").trim()])),
  );
}

function normaliseSku(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

if (!fs.existsSync(profilePath)) fail(`Missing governed technical profile source: ${profilePath}`);
if (!fs.existsSync(productPath)) fail(`Missing WyreStorm product source: ${productPath}`);

const payload = readJson(profilePath);
if (!Number.isInteger(payload.version) || payload.version < 1) fail("Technical profile version must be a positive integer.");
if (!Array.isArray(payload.profiles)) fail("Technical profile payload must contain a profiles array.");

const requiredProfileFields = [
  "sku",
  "status",
  "productClass",
  "role",
  "productType",
  "transport",
  "ports",
  "dependencies",
  "checks",
  "warnings",
  "evidence",
];

const seen = new Set();
const errors = [];

for (const [index, profile] of payload.profiles.entries()) {
  const prefix = `profiles[${index}]`;
  const sku = normaliseSku(profile?.sku);

  for (const field of requiredProfileFields) {
    if (!(field in (profile ?? {}))) errors.push(`${prefix} is missing ${field}.`);
  }

  if (!sku) errors.push(`${prefix} has an empty SKU.`);
  if (seen.has(sku)) errors.push(`Duplicate governed technical profile for ${sku}.`);
  seen.add(sku);

  if (!["verified", "verified-with-warning", "review-required"].includes(profile?.status)) {
    errors.push(`${sku || prefix} has invalid status ${profile?.status}.`);
  }

  if (!nonEmptyArray(profile?.transport)) errors.push(`${sku || prefix} must define transport.`);
  if (!Array.isArray(profile?.ports)) errors.push(`${sku || prefix} ports must be an array.`);
  if (!Array.isArray(profile?.dependencies)) errors.push(`${sku || prefix} dependencies must be an array.`);
  if (!nonEmptyArray(profile?.evidence)) errors.push(`${sku || prefix} must have at least one evidence record.`);

  for (const evidence of profile?.evidence ?? []) {
    if (!String(evidence?.sourceUrl ?? "").startsWith("https://")) {
      errors.push(`${sku || prefix} evidence must contain an HTTPS source URL.`);
    }
    if (!String(evidence?.reviewedOn ?? "").match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(`${sku || prefix} evidence reviewedOn must use YYYY-MM-DD.`);
    }
    if (!String(evidence?.reviewer ?? "").trim()) {
      errors.push(`${sku || prefix} evidence reviewer is required.`);
    }
  }

  if (profile?.status !== "review-required") {
    if (!String(profile?.maxResolution ?? "").trim() && ["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"].includes(profile?.productClass)) {
      errors.push(`${sku || prefix} verified video profile must define maxResolution.`);
    }
    if (!nonEmptyArray(profile?.dependencies) && profile?.productClass === "AVOIP") {
      errors.push(`${sku || prefix} verified AVoIP profile must define dependencies.`);
    }
  }
}

const priority = ["NHD-120-RX", "NHD-120-TX", "NHD-124-TX", "NHD-150-RX"];
for (const sku of priority) {
  if (!seen.has(sku)) errors.push(`Priority technical profile missing: ${sku}.`);
}

if (errors.length) {
  console.error("[technical-data] Failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const products = parseCsv(fs.readFileSync(productPath, "utf8"));
const activeLeadProducts = products.filter((product) => {
  const lifecycle = String(product.lifecycle_status ?? "").toLowerCase();
  const doNotSpec = String(product.do_not_spec ?? "").toLowerCase() === "true";
  const role = String(product.role ?? "").toLowerCase();

  return lifecycle === "active" &&
    !doNotSpec &&
    !["cable", "accessory", "rack-mount", "power-accessory", "software-app"].includes(role);
});

const missing = activeLeadProducts
  .map((product) => normaliseSku(product.sku))
  .filter(Boolean)
  .filter((sku) => !seen.has(sku));

console.log(
  `[technical-data] Validated ${payload.profiles.length} governed profiles. ` +
    `${activeLeadProducts.length - missing.length}/${activeLeadProducts.length} active lead SKUs have exact governed profiles.`,
);

if (missing.length) {
  console.log(`[technical-data] Review backlog (${missing.length}): ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? ", ..." : ""}`);
}

if (strict && missing.length) {
  console.error("[technical-data] Strict coverage failed: active lead SKUs remain without exact governed profiles.");
  process.exit(1);
}
