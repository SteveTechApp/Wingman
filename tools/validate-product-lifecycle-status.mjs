import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data/wyrestorm-product-intelligence.json");
const csvPath = path.join(root, "reports/wyrestorm-product-intelligence-editable.csv");

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function skuOf(product) {
  return clean(product?.sku ?? product?.SKU ?? product?.model ?? product?.id).toUpperCase();
}

function csv(value) {
  const text = clean(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function list(value) {
  if (!Array.isArray(value)) return "";
  return value.map(clean).filter(Boolean).join("; ");
}

const products = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

if (!Array.isArray(products)) {
  console.error("[lifecycle-validate] Product intelligence file is not an array.");
  process.exit(1);
}

const requiredEol = new Set([
  "APO-100-UC",
  "APO-200-UC",
  "APO-210-UC",
]);

const failures = [];
const lifecycleCounts = new Map();

for (const product of products) {
  const sku = skuOf(product);
  const activeSku = clean(product.activeSku);

  lifecycleCounts.set(activeSku || "(blank)", (lifecycleCounts.get(activeSku || "(blank)") ?? 0) + 1);

  if (!activeSku) failures.push(`${sku}: missing activeSku`);
  if (activeSku !== "Yes" && activeSku !== "EOL") failures.push(`${sku}: invalid activeSku "${activeSku}"`);

  if (/^NHD-(200|300|400)(\b|-|_)/.test(sku) && activeSku !== "EOL") {
    failures.push(`${sku}: expected EOL`);
  }

  if (requiredEol.has(sku) && activeSku !== "EOL") {
    failures.push(`${sku}: expected EOL`);
  }

  if (sku === "APO-DG1") {
    failures.push("APO-DG1 is still present and should be removed.");
  }
}

const columns = [
  "sku",
  "activeSku",
  "name",
  "title",
  "family",
  "role",
  "technologyType",
  "hardwareType",
  "productRole",
  "catalogVisibility",
  "roleCorrectionSource",
  "description",
  "features",
  "featureTags",
  "tags",
  "capabilities",
  "searchTerms",
  "manualReviewNotes"
];

const rows = products.map((product) => ({
  sku: clean(product.sku ?? product.id ?? product.model),
  activeSku: clean(product.activeSku) || "Yes",
  name: clean(product.name),
  title: clean(product.title),
  family: clean(product.family),
  role: clean(product.role),
  technologyType: clean(product.technologyType),
  hardwareType: clean(product.hardwareType),
  productRole: clean(product.productRole),
  catalogVisibility: clean(product.catalogVisibility),
  roleCorrectionSource: clean(product.roleCorrectionSource),
  description: clean(product.description),
  features: list(product.features),
  featureTags: list(product.featureTags),
  tags: list(product.tags),
  capabilities: list(product.capabilities),
  searchTerms: list(product.searchTerms),
  manualReviewNotes: clean(product.manualReviewNotes),
}));

fs.mkdirSync(path.dirname(csvPath), { recursive: true });

fs.writeFileSync(
  csvPath,
  [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csv(row[column])).join(",")),
  ].join("\n") + "\n",
  "utf8",
);

console.log("[lifecycle-validate] Product count:", products.length);
console.log("[lifecycle-validate] activeSku summary:");

for (const [key, count] of [...lifecycleCounts.entries()].sort()) {
  console.log(`- ${key}: ${count}`);
}

console.log("[lifecycle-validate] CSV regenerated: reports/wyrestorm-product-intelligence-editable.csv");

if (failures.length > 0) {
  console.error("[lifecycle-validate] Failed:");
  failures.slice(0, 50).forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("[lifecycle-validate] Passed.");