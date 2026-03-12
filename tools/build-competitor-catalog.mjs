import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "src", "data", "catalog", "competitors");
const outputFile = path.join(rootDir, "src", "data", "catalog", "competitor-catalog.phase4.json");

function tidy(value) {
  return String(value ?? "").trim();
}

function normalizeSku(value) {
  return tidy(value).toUpperCase();
}

function normalizeId(value) {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateRecord(record, filePath, index) {
  const context = `${path.basename(filePath)}#${index + 1}`;
  const brand = tidy(record.brand);
  const sku = normalizeSku(record.sku);
  const name = tidy(record.name);
  const category = tidy(record.category);
  const status = tidy(record.status);
  const sourceUrl = tidy(record.sourceUrl);

  if (!brand) throw new Error(`${context}: missing brand`);
  if (!sku) throw new Error(`${context}: missing sku`);
  if (!name) throw new Error(`${context}: missing name`);
  if (!category) throw new Error(`${context}: missing category`);
  if (!["active", "draft", "legacy"].includes(status)) {
    throw new Error(`${context}: invalid status "${status}"`);
  }
  if (!sourceUrl) throw new Error(`${context}: missing sourceUrl`);

  return {
    ...record,
    sku,
    name,
    brand,
    family: tidy(record.family) || "Unknown",
    category,
    subcategory: tidy(record.subcategory) || undefined,
    status,
    summary: tidy(record.summary) || `${sku} competitor reference record.`,
    sourceUrl,
    transport: tidy(record.transport) || undefined,
    latency: tidy(record.latency) || undefined,
  };
}

function main() {
  const files = fs.readdirSync(sourceDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No competitor source files found in ${sourceDir}`);
  }

  const rows = [];
  const seen = new Set();

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const parsed = readJson(filePath);
    if (!Array.isArray(parsed)) {
      throw new Error(`${file}: expected an array of competitor records`);
    }

    parsed.forEach((record, index) => {
      const validated = validateRecord(record, filePath, index);
      const key = `${normalizeId(validated.brand)}::${normalizeSku(validated.sku)}`;
      if (seen.has(key)) {
        throw new Error(`${path.basename(filePath)}#${index + 1}: duplicate brand/SKU key ${key}`);
      }
      seen.add(key);
      rows.push(validated);
    });
  }

  rows.sort((left, right) => {
    const brandCmp = left.brand.localeCompare(right.brand);
    if (brandCmp !== 0) return brandCmp;
    const familyCmp = left.family.localeCompare(right.family);
    if (familyCmp !== 0) return familyCmp;
    return left.sku.localeCompare(right.sku);
  });

  fs.writeFileSync(outputFile, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  const counts = rows.reduce((acc, row) => {
    acc[row.brand] = (acc[row.brand] || 0) + 1;
    return acc;
  }, {});

  console.log(`Built competitor catalog with ${rows.length} records.`);
  Object.keys(counts).sort().forEach((brand) => {
    console.log(`- ${brand}: ${counts[brand]}`);
  });
}

main();
