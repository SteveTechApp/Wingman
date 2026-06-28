import {
  markdownTable,
  readJsonIfExists,
  readTextIfExists,
  stableGeneratedNotice,
  writeText
} from "./product-update-utils.mjs";

const normalised = readJsonIfExists("generated/product-intelligence/wyrestorm-catalogue-normalized.json", { records: [] });

const storyText = [
  readTextIfExists("src/wingman2/data/productStories.ts"),
  readTextIfExists("src/wingman2/data/productPositioningCards.ts"),
  readTextIfExists("src/wingman2/data/productSalesKnowledge.ts")
].join("\n");

const storyEligible = (normalised.records ?? [])
  .filter((record) => record.recommendationCapable)
  .filter((record) => !/cable|accessory|rack|power/i.test(`${record.productType} ${record.role}`));

const missingRows = storyEligible
  .filter((record) => !storyText.includes(record.sku))
  .map((record) => ({
    SKU: record.sku,
    Product: record.productName,
    Family: record.family,
    Action: "Create or review story before recommendation-active use"
  }));

writeText("docs/product-intelligence-story-review.md", `
# Product intelligence story review

Generated: ${stableGeneratedNotice}

- Recommendation-capable records checked: ${storyEligible.length}
- Missing story references: ${missingRows.length}

${markdownTable(["SKU", "Product", "Family", "Action"], missingRows.length ? missingRows : [{ SKU: "-", Product: "-", Family: "-", Action: "-" }])}
`);

console.log("[product-update:audit-stories] Complete");
