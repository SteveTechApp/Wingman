import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const expectations = [
  ["data/wingman-canonical-product-store.json", "NHD-0401-MV", /multiview/i],
  ["data/wingman-canonical-product-store.json", "SW-0204-VW", /video wall processor/i],
  ["data/wingman-canonical-product-store.json", "SW-0206-VW", /video wall processor/i],
  ["data/wingman-canonical-product-store.json", "NHD-128-NDI-TRX", /av-over-ip|ndi bridge|networkhd/i],
  ["public/product-call-card-products.json", "EXP-MX-0402-H2", /matrix/i],
  ["data/wingman-canonical-product-store.json", "EXP-SP-0102-8K", /splitter|distribution|signal management/i],
  ["public/product-call-card-products.json", "EXP-SP-0102-8K", /splitter|distribution|signal management/i],
  ["public/product-call-card-products.json", "EXP-SP-0102-H2", /splitter|distribution|signal management/i],
  ["public/product-call-card-products.json", "EXP-SP-0104-H2", /splitter|distribution|signal management/i],
  ["public/product-call-card-products.json", "EXP-SW-0201-8K", /switcher|presentation/i],
  ["public/product-call-card-products.json", "EXP-SW-0401-8K", /switcher|presentation/i],
  ["public/product-call-card-products.json", "EXP-SW-0401-H2", /switcher|presentation/i],
];

function skuKey(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function findRecords(value, targetSku, records = []) {
  if (!value || typeof value !== "object") return records;

  if (Array.isArray(value)) {
    for (const item of value) findRecords(item, targetSku, records);
    return records;
  }

  const sku = value.sku ?? value.SKU ?? value.model ?? value.partNumber ?? value.productSku ?? value.code;

  if (skuKey(sku) === skuKey(targetSku)) {
    records.push(value);
  }

  for (const item of Object.values(value)) {
    if (!item || typeof item !== "object") continue;
    findRecords(item, targetSku, records);
  }

  return records;
}

function classText(record) {
  const classification = record.productClassification ?? {};
  return [
    classification.primaryCategory,
    classification.category,
    classification.subCategory,
    classification.productType,
    classification.systemRole,
    record.productClass,
    record.category,
    record.productType,
    record.type,
    record.family,
    record.role,
    record.domain,
    record.transport,
  ].filter(Boolean).join(" ");
}

const failures = [];

for (const [file, sku, expected] of expectations) {
  const fullPath = path.join(root, file);

  if (!fs.existsSync(fullPath)) {
    failures.push(`${sku} | ${file} | file missing`);
    continue;
  }

  const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const records = findRecords(parsed, sku);

  if (records.length === 0) {
    failures.push(`${sku} | ${file} | record missing`);
    continue;
  }

  for (const record of records) {
    const text = classText(record);

    if (expected.test(text)) {
      continue;
    }

    failures.push(`${sku} | ${file} | expected ${expected} in classification text, got: ${text}`);
  }
}

if (failures.length > 0) {
  console.error("[focused-classification-check] Failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[focused-classification-check] Passed");
