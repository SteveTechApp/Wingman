import fs from "node:fs";
import { readCsv } from "./product-update-utils.mjs";

const required = [
  "data-sources/wyrestorm/products.csv",
  "data-sources/wyrestorm/lifecycle.csv",
  "data-sources/wyrestorm/enrichment.json",
  "tools/build-product-data-sources.mjs",
  "data/catalog/product-data-manifest.generated.json",
];

console.log("[product-data-doctor] Authoritative product data status");
for (const file of required) {
  console.log(`- ${fs.existsSync(file) ? "present" : "missing"} ${file}`);
}

const competitorFiles = fs.existsSync("data-sources/competitors")
  ? fs.readdirSync("data-sources/competitors").filter((file) => file.endsWith(".csv")).sort()
  : [];
const products = fs.existsSync(required[0]) ? readCsv(required[0]) : [];
const lifecycle = fs.existsSync(required[1]) ? readCsv(required[1]) : [];
const competitors = competitorFiles.flatMap((file) => readCsv(`data-sources/competitors/${file}`));
const stagedCompetitors = fs.existsSync("data-sources/incoming/competitors")
  ? fs.readdirSync("data-sources/incoming/competitors").filter((file) => file.endsWith(".csv")).sort()
  : [];
const stagedWyrestorm = [
  "data-sources/incoming/wyrestorm-products.csv",
  "data-sources/incoming/wyrestorm-lifecycle.csv",
].filter((file) => fs.existsSync(file));

console.log(`\n- WyreStorm products: ${products.length}`);
console.log(`- WyreStorm lifecycle rows: ${lifecycle.length}`);
console.log(`- Competitor manufacturers: ${competitorFiles.length}`);
console.log(`- Competitor products: ${competitors.length}`);
console.log(`- Approved competitor profiles: ${competitors.filter((row) => row.approval_status === "approved").length}`);
console.log(`- Staged WyreStorm files: ${stagedWyrestorm.length}`);
console.log(`- Staged competitor manufacturers: ${stagedCompetitors.length}`);

console.log("\nRecommended next action");
if (required.some((file) => !fs.existsSync(file))) {
  console.log("- Restore or migrate the missing authoritative source file.");
} else if (stagedWyrestorm.length || stagedCompetitors.length) {
  console.log("- Run npm run product-update:check-incoming, review the result, then promote.");
} else {
  console.log("- Edit data-sources directly or stage reviewed replacements under data-sources/incoming.");
  console.log("- Run npm run data:sources:build after changes.");
}
