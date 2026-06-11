import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const pageSource = readFileSync(path.join(root, "src/wingman2/pages/ComparePageNew.tsx"), "utf8");
const controlsSource = readFileSync(path.join(root, "src/wingman2/components/compare/CompareControls.tsx"), "utf8");
const catalogSource = readFileSync(path.join(root, "src/wingman2/lib/competitorProductIntelligence.ts"), "utf8");

const requiredPageMarkers = [
  "COMPETITOR_SKU_SEED_CATALOG",
  "MANUFACTURER_SELECT_OPTIONS",
  "CompareManufacturerCombobox",
  "CompareProductLookupInput",
  "compareSkuKey",
  "function skuOptionsForBrand",
  "function compareSkuSuggestions",
  "COMPETITOR_SKU_SEED_CATALOG[brand]",
  "Object.values(COMPETITOR_SKU_SEED_CATALOG).flat()",
  "key.includes(queryKey) || queryKey.includes(key)",
  "compareSkuSuggestions(competitorInput, resolvedBrand)",
];

const requiredControlsMarkers = [
  "role=\"combobox\"",
  "aria-autocomplete=\"list\"",
  "role=\"listbox\"",
  "aria-label=\"Competitor SKU suggestions\"",
  "visibleSuggestions.map",
  "suggestions.slice(0, 10)",
  "data-wingman-manufacturer-combobox",
  "aria-label=\"Choose competitor manufacturer\"",
];

const requiredCatalogMarkers = [
  "NMX-ENC-N2612S",
  "DM-NVX-360",
  "NAV E 121",
  "HMX44-18G-KIT",
];

const forbiddenPageMarkers = [
  "<datalist",
  "<select",
  "COMPARE_SKU_TYPEAHEAD_DATALIST_ID",
  "list={COMPARE_SKU_TYPEAHEAD_DATALIST_ID}",
  "compareSkuTypeaheadRefreshDatalist",
  "compareSkuTypeaheadSuggestions(manufacturer, model).map",
];

const missing = [
  ...requiredPageMarkers.filter((marker) => !pageSource.includes(marker)).map((marker) => "ComparePageNew missing: " + marker),
  ...requiredControlsMarkers.filter((marker) => !controlsSource.includes(marker)).map((marker) => "CompareControls missing: " + marker),
  ...requiredCatalogMarkers.filter((marker) => !catalogSource.includes(marker)).map((marker) => "competitor catalog missing seed SKU: " + marker),
];

const forbiddenFound = [
  ...forbiddenPageMarkers.filter((marker) => pageSource.includes(marker)).map((marker) => "ComparePageNew still uses stale marker: " + marker),
  ...["<datalist", "<select"].filter((marker) => controlsSource.includes(marker)).map((marker) => "CompareControls still uses native control marker: " + marker),
];

if (missing.length || forbiddenFound.length) {
  console.error("[compare-typeahead-skus] Check failed:");

  for (const marker of missing) {
    console.error("- Missing marker: " + marker);
  }

  for (const marker of forbiddenFound) {
    console.error("- Forbidden marker still present: " + marker);
  }

  process.exit(1);
}

console.log("[compare-typeahead-skus] Verified custom brand-scoped SKU type-ahead without native datalist/select controls.");
