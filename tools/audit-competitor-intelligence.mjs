import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const source = readFileSync(path.join(root, "src/wingman2/lib/competitorProductIntelligence.ts"), "utf8");
const competitorCatalog = JSON.parse(readFileSync(path.join(root, "data/catalog/competitor-products.generated.json"), "utf8"));

function extractCatalogue() {
  const byBrand = new Map();
  for (const product of competitorCatalog) {
    const brand = String(product.manufacturer || product.brand || "Unknown");
    const sku = String(product.model || product.sku || "").trim();
    if (!sku) continue;
    if (!byBrand.has(brand)) byBrand.set(brand, { skus: [], roles: [] });
    byBrand.get(brand).skus.push(sku);
    const role = String(product.role || product.product_class || product.productClass || "Unknown").trim();
    if (role) byBrand.get(brand).roles.push(role);
  }
  return [...byBrand.entries()]
    .map(([brand, values]) => {
      const skus = [...new Set(values.skus)].sort();
      const roles = [...new Set(values.roles)].sort();
      const coverageStatus = skus.length >= 8 && roles.length >= 4
        ? "broad"
        : skus.length >= 5 && roles.length >= 3 ? "developing" : "selective";
      return { brand, count: skus.length, roleCount: roles.length, coverageStatus, roles, skus };
    })
    .sort((a, b) => a.brand.localeCompare(b.brand));
}

const brandCounts = extractCatalogue();
const total = brandCounts.reduce((sum, item) => sum + item.count, 0);
const familyRuleBrands = [...source.matchAll(/brand:\s*"([^"]+)"/g)].map((item) => item[1]);
const familyRuleCount = familyRuleBrands.length;

console.log("");
console.log("Competitor intelligence catalogue counts");
console.log("=======================================");

for (const item of brandCounts) {
  console.log(item.brand.padEnd(14) + String(item.count).padStart(3) + "  " + item.coverageStatus.padEnd(10) + " " + item.roleCount + " roles");
}

console.log("---------------------------------------");
console.log("TOTAL".padEnd(14) + String(total).padStart(3));
console.log("");
console.log("Family classification rules: " + familyRuleCount);
console.log("Quality tiers: sku-only, family-rule, fingerprint, verified-profile, approved-compare-profile");

const outputDir = path.join(root, "reports");
mkdirSync(outputDir, { recursive: true });

writeFileSync(path.join(outputDir, "competitor-intelligence-audit.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  brandCounts,
  totalSkuCount: total,
  familyRuleCount,
}, null, 2), "utf8");

writeFileSync(path.join(outputDir, "competitor-intelligence-audit.md"), [
  "# Competitor Intelligence Audit",
  "",
  "Generated: " + new Date().toISOString(),
  "",
  "## Brand counts",
  "",
  ...brandCounts.map((item) => "- " + item.brand + ": " + item.count + " SKUs / " + item.roleCount + " roles / " + item.coverageStatus),
  "",
  "## Coverage policy",
  "",
  "- Broad: at least 8 governed SKUs across at least 4 product roles.",
  "- Developing: at least 5 governed SKUs across at least 3 product roles.",
  "- Selective: below the developing threshold; the UI and sales team must not describe this brand as comprehensive.",
  "",
  "## Selective brands requiring expansion",
  "",
  ...brandCounts.filter((item) => item.coverageStatus === "selective").map((item) => "- " + item.brand + ": " + item.count + " SKUs / " + item.roleCount + " roles"),
  "",
  "## Current status",
  "",
  "- SKU suggestions: " + total,
  "- Family classification rules: " + familyRuleCount,
  "- Quality tiers now supported: sku-only, family-rule, fingerprint, verified-profile, approved-compare-profile",
  "",
].join("\n"), "utf8");

console.log("");
console.log("[competitor-intelligence] Wrote reports/competitor-intelligence-audit.json");
console.log("[competitor-intelligence] Wrote reports/competitor-intelligence-audit.md");
