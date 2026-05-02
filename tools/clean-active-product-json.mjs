import fs from "node:fs";

const path = "./data/wyrestorm-product-intelligence.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

const markers = [
  "elementor_popups",
  "broken_search_jet_mobile_menu",
  "broken_search_browsers_back_arrow",
  "force_refresh_checkout",
  "jquery-dgwt-wcas",
  "yith_wcan",
  "wp-content/plugins",
  "ajax-search-for-woocommerce",
  "sourceURL=",
  "<script",
  "</script",
  "<link rel=",
  "<style",
  "</style",
  "<!doctype html",
  "<html",
  "<head"
];

let cleaned = 0;

function firstMarkerIndex(text) {
  const lower = text.toLowerCase();
  let cut = -1;

  for (const marker of markers) {
    const index = lower.indexOf(marker.toLowerCase());
    if (index !== -1 && (cut === -1 || index < cut)) {
      cut = index;
    }
  }

  return cut;
}

function cleanString(value) {
  const cut = firstMarkerIndex(value);

  if (cut === -1) {
    return value;
  }

  cleaned++;

  return value
    .slice(0, cut)
    .replace(/corrupted:\s*/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&raquo;/gi, " ")
    .replace(/&#038;/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function walk(value) {
  if (typeof value === "string") {
    return cleanString(value);
  }

  if (Array.isArray(value)) {
    return value
      .map(walk)
      .filter((item) => !(typeof item === "string" && item.trim() === ""));
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = walk(value[key]);
    }
  }

  return value;
}

walk(data);

fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");

console.log(`[clean-active-product-json] Cleaned string fields: ${cleaned}`);

const verify = fs.readFileSync(path, "utf8").toLowerCase();
const remaining = markers.filter((marker) => verify.includes(marker.toLowerCase()));

if (remaining.length) {
  console.error("[clean-active-product-json] Remaining markers:");
  for (const marker of remaining) {
    console.error(`- ${marker}`);
  }
  process.exit(1);
}

console.log("[clean-active-product-json] No known pollution markers remain.");