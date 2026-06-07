import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const mediaPath = path.join(repoRoot, "public", "product-media-index.json");

if (!fs.existsSync(mediaPath)) {
  console.error("[product-media] Missing public/product-media-index.json. Run npm run data:product-media-index.");
  process.exit(1);
}

const media = JSON.parse(fs.readFileSync(mediaPath, "utf8"));
const products = Array.isArray(media.products) ? media.products : [];
const withFront = products.filter((product) => product.front?.url).length;
const withRear = products.filter((product) => product.rear?.url).length;
const withSource = products.filter((product) => product.officialProductUrl || product.front?.sourceUrl || product.rear?.sourceUrl).length;
const requiredSkus = ["NHD-0401-MV", "MX-1007-HYB", "APO-210-UC", "NHD-600-TRX"];
const missingRequired = requiredSkus.filter((sku) => !media.lookup?.[sku]);

if (products.length < 150) {
  console.error(`[product-media] Expected at least 150 media records, found ${products.length}.`);
  process.exit(1);
}

if (withFront < 80) {
  console.error(`[product-media] Expected at least 80 products with a front/primary image, found ${withFront}.`);
  process.exit(1);
}

if (withRear < 20) {
  console.error(`[product-media] Expected at least 20 products with a rear/connector image, found ${withRear}.`);
  process.exit(1);
}

if (withSource < 150) {
  console.error(`[product-media] Expected at least 150 records with official source URLs, found ${withSource}.`);
  process.exit(1);
}

if (missingRequired.length > 0) {
  console.error(`[product-media] Missing required SKU media records: ${missingRequired.join(", ")}`);
  process.exit(1);
}

console.log(`[product-media] OK: ${products.length} records, ${withFront} front/primary images, ${withRear} rear/connector images.`);
