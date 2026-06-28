import { collectSkus, markdownTable, normaliseSku, readJsonIfExists, writeText } from "./product-update-utils.mjs";

const normalised = readJsonIfExists("generated/product-intelligence/wyrestorm-catalogue-normalized.json", { records: [] });
const currentIndex = readJsonIfExists("public/product-intelligence-index.json", null);

const imported = normalised.records ?? [];
const indexedSkus = currentIndex ? collectSkus(currentIndex) : new Set();
const importedBySku = new Map(imported.map((record) => [normaliseSku(record.sku), record]));

const addRows = imported
  .filter((record) => record.recommendationCapable && !indexedSkus.has(normaliseSku(record.sku)))
  .map((record) => ({ SKU: record.sku, Product: record.productName, Family: record.family, Action: "Review before adding" }));

const reviewRows = imported
  .filter((record) => !record.recommendationCapable)
  .map((record) => ({ SKU: record.sku, Product: record.productName, Lifecycle: record.lifecycleStatus, Missing: record.missingFields.join(", ") || "-" }));

const archiveRows = Array.from(indexedSkus)
  .filter((sku) => {
    const record = importedBySku.get(sku);
    return record && (record.lifecycleStatus !== "active" || record.doNotSpec);
  })
  .map((sku) => {
    const record = importedBySku.get(sku);
    return { SKU: sku, Product: record.productName, Lifecycle: record.lifecycleStatus, Action: "Archive or block as lead recommendation" };
  });

writeText("docs/product-intelligence-update-reconciliation.md", `
# Product intelligence update reconciliation

Generated: ${new Date().toISOString()}

- Imported WyreStorm records: ${imported.length}
- Currently indexed SKUs found: ${indexedSkus.size}
- Add candidates: ${addRows.length}
- Review candidates: ${reviewRows.length}
- Archive candidates: ${archiveRows.length}

## Add candidates

${markdownTable(["SKU", "Product", "Family", "Action"], addRows.length ? addRows : [{ SKU: "-", Product: "-", Family: "-", Action: "-" }])}

## Review candidates

${markdownTable(["SKU", "Product", "Lifecycle", "Missing"], reviewRows.length ? reviewRows : [{ SKU: "-", Product: "-", Lifecycle: "-", Missing: "-" }])}

## Archive candidates

${markdownTable(["SKU", "Product", "Lifecycle", "Action"], archiveRows.length ? archiveRows : [{ SKU: "-", Product: "-", Lifecycle: "-", Action: "-" }])}
`);

console.log("[product-update:reconcile] Complete");
