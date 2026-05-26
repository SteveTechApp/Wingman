import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targets = [
  "data/wyrestorm-product-intelligence.json",
  "data/product-intelligence-db.json",
].filter((relativePath) => fs.existsSync(path.join(root, relativePath)));

const removedSkus = new Set(["APO-DG1"]);
const exactEolSkus = new Set([
  "APO-100-UC",
  "APO-200-UC",
  "APO-210-UC",
]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function skuOf(product) {
  return clean(product?.sku ?? product?.SKU ?? product?.model ?? product?.id).toUpperCase();
}

function isEolSku(sku) {
  if (exactEolSkus.has(sku)) return true;
  if (/^NHD-(200|300|400)(\b|-|_)/.test(sku)) return true;
  return false;
}

function addUnique(array, value) {
  const next = Array.isArray(array) ? [...array] : [];
  const text = clean(value);

  if (!text) return next;

  if (!next.some((item) => clean(item).toLowerCase() === text.toLowerCase())) {
    next.push(text);
  }

  return next;
}

function updateFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));

  if (!Array.isArray(data)) {
    console.warn(`[lifecycle] Skipping non-array file: ${relativePath}`);
    return { changed: 0, removed: 0, eol: 0, total: 0 };
  }

  let removed = 0;
  let eol = 0;
  let changed = 0;

  const nextData = [];

  for (const product of data) {
    const sku = skuOf(product);

    if (removedSkus.has(sku)) {
      removed += 1;
      changed += 1;
      continue;
    }

    const before = JSON.stringify(product);

    if (isEolSku(sku)) {
      const eolNote = "Lifecycle confirmed EOL.";

      product.activeSku = "EOL";
      product.lifecycleStatus = "EOL";
      product.catalogVisibility = product.catalogVisibility || "request-only";
      product.manualReviewNotes = clean(product.manualReviewNotes)
        ? clean(product.manualReviewNotes).includes(eolNote)
          ? clean(product.manualReviewNotes)
          : `${clean(product.manualReviewNotes)}; ${eolNote}`
        : eolNote;

      product.searchTerms = addUnique(product.searchTerms, "EOL");
      product.tags = addUnique(product.tags, "EOL");

      eol += 1;
    }

    const after = JSON.stringify(product);

    if (before !== after) {
      changed += 1;
    }

    nextData.push(product);
  }

  fs.writeFileSync(fullPath, JSON.stringify(nextData, null, 2) + "\n", "utf8");

  return { changed, removed, eol, total: nextData.length };
}

if (targets.length === 0) {
  console.error("[lifecycle] No product intelligence JSON files found.");
  process.exit(1);
}

for (const target of targets) {
  const result = updateFile(target);

  console.log(`[lifecycle] ${target}`);
  console.log(`  Products after cleanup: ${result.total}`);
  console.log(`  Products removed: ${result.removed}`);
  console.log(`  Products marked EOL: ${result.eol}`);
  console.log(`  Products changed: ${result.changed}`);
}
