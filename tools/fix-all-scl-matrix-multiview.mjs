import fs from "node:fs";

const sourcePath = "./data/wyrestorm-product-intelligence.json";
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const updated = [];
const skipped = [];

const multiviewTerms = [
  "Multiview",
  "Multi-view",
  "Picture-in-Picture",
  "PIP",
  "Quad view",
  "multi-window",
  "multiple sources on one output",
  "scaling",
  "seamless switching",
  "seamless matrix",
  "video processing"
];

function textOf(value) {
  return String(value ?? "");
}

function objectText(product) {
  return [
    product.sku,
    product.SKU,
    product.id,
    product.model,
    product.modelNumber,
    product.partNumber,
    product.name,
    product.title,
    product.family,
    product.role,
    product.routingClass,
    product.category,
    product.description
  ]
    .map(textOf)
    .join(" ")
    .toLowerCase();
}

function directSku(product) {
  const fields = [
    product.sku,
    product.SKU,
    product.id,
    product.model,
    product.modelNumber,
    product.partNumber
  ];

  for (const field of fields) {
    if (typeof field !== "string") continue;

    const match = field.match(/\b[A-Z0-9]+-[A-Z0-9-]*SCL[A-Z0-9-]*\b/i);

    if (match) {
      return match[0].toUpperCase();
    }
  }

  const nameTitle = `${product.name ?? ""} ${product.title ?? ""}`;
  const match = nameTitle.match(/\b[A-Z0-9]+-[A-Z0-9-]*SCL[A-Z0-9-]*\b/i);

  return match ? match[0].toUpperCase() : "";
}

function isProductShaped(product) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    return false;
  }

  return Boolean(
    product.sku ||
    product.SKU ||
    product.id ||
    product.model ||
    product.modelNumber ||
    product.partNumber ||
    product.name ||
    product.title
  );
}

function isAccessoryOrCard(product) {
  const text = objectText(product);

  return (
    /\b(card|output card|input card|tx-scl|rx-scl|scaling output card|blade|module|accessory|mount|bracket|psu|power supply|cable)\b/i.test(text) &&
    !/\bmatrix\b/i.test(`${product.name ?? ""} ${product.title ?? ""} ${product.family ?? ""} ${product.role ?? ""}`)
  );
}

function isSclMatrix(product) {
  if (!isProductShaped(product)) {
    return false;
  }

  const text = objectText(product);
  const sku = directSku(product);

  const hasScl =
    /\bscl\b/i.test(text) ||
    /-[A-Z0-9-]*SCL[A-Z0-9-]*\b/i.test(sku);

  const isMatrix =
    /\bmatrix\b/i.test(text) ||
    /^MX-/i.test(sku);

  if (!hasScl || !isMatrix) {
    return false;
  }

  if (isAccessoryOrCard(product)) {
    return false;
  }

  return true;
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

function addTerms(product, key) {
  const arr = ensureArray(product, key);
  const existing = new Set(arr.map((item) => String(item).toLowerCase()));

  for (const term of multiviewTerms) {
    if (existing.has(term.toLowerCase())) {
      continue;
    }

    arr.push(term);
    existing.add(term.toLowerCase());
  }
}

function addCleanDescription(product) {
  const sentence =
    "SCL matrix products are multiview-capable, allowing multiple sources to be shown on a single output where supported by the selected SCL layout and operating mode.";

  const current = typeof product.description === "string" ? product.description : "";

  if (current.toLowerCase().includes("multiview-capable")) {
    return;
  }

  product.description = `${current}${current.trim() ? " " : ""}${sentence}`.trim();
}

function patchProduct(product) {
  const sku = directSku(product) || String(product.sku ?? product.id ?? product.name ?? product.title ?? "Unknown SCL Matrix");

  addTerms(product, "features");
  addTerms(product, "featureTags");
  addTerms(product, "tags");
  addTerms(product, "capabilities");
  addTerms(product, "searchTerms");
  addTerms(product, "keywords");
  addTerms(product, "finderTags");

  addCleanDescription(product);

  product.family = product.family || "Matrix Switcher";
  product.role = product.role || "Seamless scaling matrix switcher";
  product.routingClass = product.routingClass || "Seamless Scaling Matrix";
  product.productRole = product.productRole || "primary-hardware";
  product.catalogVisibility = product.catalogVisibility || "default";

  updated.push(sku);
}

function walk(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (isProductShaped(value)) {
    if (isSclMatrix(value)) {
      patchProduct(value);
    } else if (/\bscl\b/i.test(objectText(value))) {
      skipped.push({
        path,
        sku: directSku(value),
        name: value.name || value.title || "",
        reason: "mentions SCL but is not a strict SCL matrix product"
      });
    }
  }

  for (const [key, child] of Object.entries(value)) {
    walk(child, `${path}.${key}`);
  }
}

walk(data);

fs.writeFileSync(sourcePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log("[all-scl-matrix] Updated SCL matrix products:");
for (const sku of [...new Set(updated)].sort()) {
  console.log(`- ${sku}`);
}

if (updated.length === 0) {
  console.warn("[all-scl-matrix] No strict SCL matrix products found.");
}

if (skipped.length > 0) {
  console.log("[all-scl-matrix] Skipped SCL mentions that were not strict matrix products:");
  for (const item of skipped.slice(0, 30)) {
    console.log(`- ${item.sku || "(no sku)"} ${item.name} at ${item.path}`);
  }
}