import fs from "node:fs";

const sourcePath = "./data/wyrestorm-product-intelligence.json";
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const updated = new Set();

const tags = [
  "Multiview",
  "Multi-view",
  "multiple sources on one output",
  "multi-window",
  "picture-by-picture",
  "PBP",
  "scaling",
  "video processing",
  "presentation switching",
  "seamless matrix"
];

function jsonText(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function getSku(product) {
  const text = jsonText(product);
  const match = text.match(/\bMX-[A-Z0-9-]*SCL[A-Z0-9-]*\b/i);
  return match ? match[0].toUpperCase() : "";
}

function ensureArray(product, key) {
  if (Array.isArray(product[key])) {
    return product[key];
  }

  if (typeof product[key] === "string" && product[key].trim()) {
    product[key] = [product[key]];
    return product[key];
  }

  product[key] = [];
  return product[key];
}

function addTags(product, key) {
  const arr = ensureArray(product, key);
  const existing = new Set(arr.map((item) => String(item).toLowerCase()));

  for (const tag of tags) {
    if (existing.has(tag.toLowerCase())) {
      continue;
    }

    arr.push(tag);
    existing.add(tag.toLowerCase());
  }
}

function addDescription(product, key) {
  const sentence = "Supports multiview presentation layouts, allowing multiple sources to be shown on a single output where supported by the SCL operating mode.";
  const current = typeof product[key] === "string" ? product[key] : "";

  if (current.toLowerCase().includes("multiview")) {
    return;
  }

  product[key] = `${current}${current.trim() ? " " : ""}${sentence}`.trim();
}

function patchProduct(product) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    return;
  }

  const sku = getSku(product);

  if (!sku) {
    return;
  }

  addTags(product, "features");
  addTags(product, "featureTags");
  addTags(product, "tags");
  addTags(product, "capabilities");
  addTags(product, "searchTerms");
  addTags(product, "keywords");
  addTags(product, "finderTags");

  addDescription(product, "description");
  addDescription(product, "finderText");
  addDescription(product, "searchableText");
  addDescription(product, "notes");

  updated.add(sku);
}

function walk(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item);
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  patchProduct(value);

  for (const child of Object.values(value)) {
    walk(child);
  }
}

walk(data);

fs.writeFileSync(sourcePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log("[mx-scl-multiview] Updated SKUs:");
for (const sku of [...updated].sort()) {
  console.log(`- ${sku}`);
}

if (updated.size === 0) {
  console.warn("[mx-scl-multiview] No MX-*-SCL products found. Finder may use a separate product source.");
}