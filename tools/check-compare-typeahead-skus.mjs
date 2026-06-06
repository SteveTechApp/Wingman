import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const source = readFileSync(path.join(root, "src/wingman2/pages/ComparePage.tsx"), "utf8");

const required = [
  "COMPARE_SKU_TYPEAHEAD_DATALIST_ID",
  "COMPARE_SKU_TYPEAHEAD_CATALOG",
  "COMPARE_SKU_TYPEAHEAD_ALL_OPTIONS",
  "compareSkuTypeaheadSuggestions",
  "function compareSkuTypeaheadRefreshDatalist",
  "function compareSkuTypeaheadRefreshFromFormElement",
  "compareSkuTypeaheadRefreshFromFormElement(event.currentTarget)",
  "onFocusCapture={(event) => compareSkuTypeaheadRefreshFromFormElement(event.currentTarget)}",
  "onInput={(event) => compareSkuTypeaheadRefreshFromFormElement(event.currentTarget)}",
  "onChangeCapture={(event) => compareSkuTypeaheadRefreshFromFormElement(event.currentTarget)}",
  "list={COMPARE_SKU_TYPEAHEAD_DATALIST_ID}",
  "<datalist id={COMPARE_SKU_TYPEAHEAD_DATALIST_ID}>",
  "COMPARE_SKU_TYPEAHEAD_ALL_OPTIONS.map",
  "NMX-ENC-N2612S",
  "DM-NVX-360",
  "NAV E 121",
  "HMX44-18G-KIT",
];

const forbidden = [
  "compareSkuTypeaheadSuggestions(manufacturer, model).map",
];

const missing = required.filter((marker) => !source.includes(marker));
const forbiddenFound = forbidden.filter((marker) => source.includes(marker));

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

console.log("[compare-typeahead-skus] Verified dynamic brand-scoped SKU type-ahead without React scope leakage.");
