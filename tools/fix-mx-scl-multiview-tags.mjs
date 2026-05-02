import fs from "node:fs";

const sourcePath = "./data/wyrestorm-product-intelligence.json";
const raw = fs.readFileSync(sourcePath, "utf8");
const data = JSON.parse(raw);

const multiviewTerms = [
  "Multiview",
  "Multi-view",
  "multi-window",
  "multiple sources on one output",
  "picture-by-picture",
  "PBP",
  "scaling",
  "seamless scaling",
  "presentation switching"
];

const updatedSkus = [];

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

function addTermsToArrayProperty(object, propertyName, terms) {
  const current = asArray(object[propertyName]);
  const lower = new Set(current.map((item) => String(item).toLowerCase()));

  for (const term of terms) {
    if (lower.has(term.toLowerCase())) {
      continue;
    }

    current.push(term);
    lower.add(term.toLowerCase());
  }

  object[propertyName] = current;
}

function appendTermsToStringProperty(object, propertyName, terms) {
  const current = typeof object[propertyName] === "string" ? object[propertyName] : "";
  const lower = current.toLowerCase();
  const missing = terms.filter((term) => !lower.includes(term.toLowerCase()));

  if (missing.length === 0) {
    return;
  }

  const separator = current.trim() ? " " : "";
  object[propertyName] = `${current}${separator}${missing.join(" ")}`.trim();
}

function getSku(object) {
  const candidates = [
    object.sku,
    object.SKU,
    object.model,
    object.modelNumber,
    object.partNumber,
    object.name,
    object.title
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const match = candidate.match(/\bMX-[A-Z0-9-]*SCL[A-Z0-9-]*\b/i);

    if (match) {
      return match[0].toUpperCase();
    }
  }

  return "";
}

function patchProduct(object) {
  const sku = getSku(object);

  if (!sku) {
    return;
  }

  addTermsToArrayProperty(object, "features", multiviewTerms);
  addTermsToArrayProperty(object, "featureTags", multiviewTerms);
  addTermsToArrayProperty(object, "tags", multiviewTerms);
  addTermsToArrayProperty(object, "capabilities", multiviewTerms);
  addTermsToArrayProperty(object, "searchTerms", multiviewTerms);
  addTermsToArrayProperty(object, "keywords", multiviewTerms);

  appendTermsToStringProperty(object, "description", [
    "Supports multiview presentation layouts from multiple inputs on a single output."
  ]);

  appendTermsToStringProperty(object, "finderText", multiviewTerms);
  appendTermsToStringProperty(object, "searchableText", multiviewTerms);

  if (!updatedSkus.includes(sku)) {
    updatedSkus.push(sku);
  }
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
for (const sku of updatedSkus.sort()) {
  console.log(`- ${sku}`);
}

if (updatedSkus.length === 0) {
  console.warn("[mx-scl-multiview] No MX-*-SCL products found. Check SKU naming in product data.");
}