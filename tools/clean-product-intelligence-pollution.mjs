import fs from "node:fs";

const sourcePath = "./data/wyrestorm-product-intelligence.json";

const raw = fs.readFileSync(sourcePath, "utf8");

let data;
try {
  data = JSON.parse(raw);
} catch (error) {
  console.error("[clean-product-data] JSON parse failed.");
  console.error(error.message);
  process.exit(1);
}

const pollutionPatterns = [
  "elementor_popups",
  "broken_search_jet_mobile_menu",
  "broken_search_browsers_back_arrow",
  "force_refresh_checkout",
  "woocommerce",
  "wp-content/plugins",
  "jquery-dgwt-wcas",
  "yith_wcan",
  "sourceURL=",
  "<script",
  "</script",
  "<link rel=",
  "<style",
  "</style",
  "<!doctype html",
  "<html",
  "<head",
  "CDATA"
];

const hardCutMarkers = [
  "<!doctype html",
  "<html",
  "<head",
  "<script",
  "</script",
  "<link rel=",
  "<style",
  "</style",
  "elementor_popups",
  "broken_search_jet_mobile_menu",
  "broken_search_browsers_back_arrow",
  "force_refresh_checkout",
  "wp-content/plugins",
  "jquery-dgwt-wcas",
  "yith_wcan",
  "sourceURL=",
  "CDATA"
];

let cleanedStringCount = 0;
let clearedStringCount = 0;
let visitedStringCount = 0;

function containsPollution(value) {
  const lower = value.toLowerCase();
  return pollutionPatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function stripHtmlNoise(value) {
  let output = String(value);

  const lower = output.toLowerCase();
  let cutAt = -1;

  for (const marker of hardCutMarkers) {
    const index = lower.indexOf(marker.toLowerCase());

    if (index !== -1 && (cutAt === -1 || index < cutAt)) {
      cutAt = index;
    }
  }

  if (cutAt !== -1) {
    output = output.slice(0, cutAt);
  }

  output = output
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&raquo;/gi, " ")
    .replace(/&#038;/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\\s+/g, " ")
    .trim();

  // Remove obvious labels left behind by copied page-source snippets.
  output = output.replace(/^corrupted:\s*/i, "").trim();

  return output;
}

function cleanValue(value, path = "root") {
  if (typeof value === "string") {
    visitedStringCount++;

    if (!containsPollution(value)) {
      return value;
    }

    const cleaned = stripHtmlNoise(value);

    if (!cleaned || cleaned.length < 3) {
      clearedStringCount++;
      return "";
    }

    cleanedStringCount++;
    return cleaned;
  }

  if (Array.isArray(value)) {
    return value
      .map((item, index) => cleanValue(item, `${path}[${index}]`))
      .filter((item) => !(typeof item === "string" && item.trim() === ""));
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = cleanValue(value[key], `${path}.${key}`);

      if (typeof value[key] === "string" && value[key].trim() === "") {
        // Keep known scalar fields stable, but remove empty noisy optional text fields.
        if (
          key.toLowerCase().includes("html") ||
          key.toLowerCase().includes("raw") ||
          key.toLowerCase().includes("page") ||
          key.toLowerCase().includes("scrape") ||
          key.toLowerCase().includes("source")
        ) {
          delete value[key];
        }
      }
    }
  }

  return value;
}

cleanValue(data);

const output = `${JSON.stringify(data, null, 2)}\n`;
fs.writeFileSync(sourcePath, output, "utf8");

console.log("[clean-product-data] Complete.");
console.log(`[clean-product-data] Visited string fields: ${visitedStringCount}`);
console.log(`[clean-product-data] Cleaned string fields: ${cleanedStringCount}`);
console.log(`[clean-product-data] Cleared string fields: ${clearedStringCount}`);

const verify = fs.readFileSync(sourcePath, "utf8");
const remaining = pollutionPatterns.filter((pattern) =>
  verify.toLowerCase().includes(pattern.toLowerCase())
);

if (remaining.length > 0) {
  console.warn("[clean-product-data] Remaining pollution patterns:");
  for (const pattern of remaining) {
    console.warn(`- ${pattern}`);
  }
  process.exitCode = 2;
} else {
  console.log("[clean-product-data] No known pollution patterns remain.");
}