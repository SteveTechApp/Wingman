import fs from "node:fs";

const sourcePath = "./data/wyrestorm-product-intelligence.json";
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const markers = [
  "text-567082745",
  "col-835134230",
  "banner-841213675",
  "MicrosoftTeams-image-76.png",
  "transport-solutions/airfare",
  "transport-solutions/marine",
  "retail-solutions/department-stores",
  "retail-solutions/boutiques",
  "height:auto;",
  "gap-element clearfix",
  "banner has-hover",
  "icon-box featured-box",
  "wp-content/uploads",
  "wyrestorm.com/retail-solutions",
  "wyrestorm.com/transport-solutions",
  "<style>",
  "</style>",
  "<div",
  "</div>",
  "<a ",
  "href=",
  "class="
];

let changedStrings = 0;
let emptiedStrings = 0;
let removedKeys = 0;

function containsMarker(value) {
  const lower = String(value).toLowerCase();
  return markers.some((marker) => lower.includes(marker.toLowerCase()));
}

function cleanString(value) {
  let text = String(value);

  if (!containsMarker(text)) {
    return text;
  }

  changedStrings++;

  const lower = text.toLowerCase();
  let cutAt = -1;

  for (const marker of markers) {
    const index = lower.indexOf(marker.toLowerCase());

    if (index !== -1 && (cutAt === -1 || index < cutAt)) {
      cutAt = index;
    }
  }

  if (cutAt >= 0) {
    text = text.slice(0, cutAt);
  }

  text = text
    .replace(/^corruption:\s*/i, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\\n|\\r|\\t/g, " ")
    .replace(/&raquo;/gi, " ")
    .replace(/&#038;/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 3) {
    emptiedStrings++;
    return "";
  }

  return text;
}

function shouldDeleteEmptyKey(key) {
  const lower = String(key).toLowerCase();

  return (
    lower.includes("html") ||
    lower.includes("raw") ||
    lower.includes("scrape") ||
    lower.includes("source") ||
    lower.includes("page") ||
    lower.includes("blob") ||
    lower.includes("content")
  );
}

function walk(value, path = "root") {
  if (typeof value === "string") {
    return cleanString(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item, index) => walk(item, `${path}[${index}]`))
      .filter((item) => !(typeof item === "string" && item.trim() === ""));
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      value[key] = walk(value[key], `${path}.${key}`);

      if (typeof value[key] === "string" && value[key].trim() === "" && shouldDeleteEmptyKey(key)) {
        delete value[key];
        removedKeys++;
      }
    }
  }

  return value;
}

walk(data);

fs.writeFileSync(sourcePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

const verify = fs.readFileSync(sourcePath, "utf8");
const remaining = markers.filter((marker) => verify.toLowerCase().includes(marker.toLowerCase()));

console.log(`[nuke-html] Changed strings: ${changedStrings}`);
console.log(`[nuke-html] Emptied strings: ${emptiedStrings}`);
console.log(`[nuke-html] Removed empty noisy keys: ${removedKeys}`);

if (remaining.length > 0) {
  console.error("[nuke-html] Still found markers:");
  for (const marker of remaining) {
    console.error(`- ${marker}`);
  }
  process.exit(1);
}

console.log("[nuke-html] Product source is clean.");