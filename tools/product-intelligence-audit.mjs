import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sourcePath = fs.existsSync(path.join(root, "data/wyrestorm-product-intelligence.json"))
  ? "data/wyrestorm-product-intelligence.json"
  : "public/product-intelligence-index.json";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalise(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function deepText(value, depth = 0) {
  if (value == null || depth > 5) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => deepText(item, depth + 1)).join(" ");
  if (typeof value === "object") return Object.values(value).map((item) => deepText(item, depth + 1)).join(" ");
  return "";
}

function firstString(record, keys) {
  for (const key of keys) {
    const value = clean(record?.[key]);
    if (value) return value;
  }
  return "";
}

function collect(value, output = [], depth = 0) {
  if (value == null || depth > 6) return output;

  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, output, depth + 1));
    return output;
  }

  if (typeof value !== "object") return output;

  const sku = firstString(value, ["sku", "SKU", "model", "Model", "id", "productCode"]);
  const title = firstString(value, ["title", "name", "productName", "Product Name", "description"]);

  if (sku || title) output.push(value);

  Object.values(value).forEach((item) => {
    if (Array.isArray(item) || (item && typeof item === "object")) {
      collect(item, output, depth + 1);
    }
  });

  return output;
}

function includesAny(text, terms) {
  const haystack = normalise(text);
  return terms.some((term) => haystack.includes(normalise(term)));
}

function classifyTechnology(text, sku) {
  const skuUpper = sku.toUpperCase();

  if (/^(CAB-|CBL-|EXP-CAB-|EXP-4KUHD-|EXP-8KUHD-)/.test(skuUpper) || includesAny(text, ["cable", "active optical", "hdmi aoc"])) return "Cable";
  if (includesAny(text, ["dongle", "casting dongle"])) return "Dongle";
  if (includesAny(text, ["rack", "mount", "bracket", "adapter", "faceplate", "accessory"])) return "Accessory";
  if (includesAny(text, ["video wall", "videowall", "multiview", "multi view"])) return "Video Wall / Multiview";
  if (includesAny(text, ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver", "nhd"])) return "AVoIP";
  if (includesAny(text, ["matrix", "matrix routing", "seamless matrix"])) return "Matrix";
  if (includesAny(text, ["presentation switcher", "room core", "usb-c switcher"])) return "Presentation / Room Core";
  if (includesAny(text, ["unified comms", "video bar", "wireless conferencing", "speakerphone", "apollo", "halo"])) return "Unified Comms";
  if (includesAny(text, ["camera", "ptz", "ndi", "camera bridge", "video bridge"])) return "Camera / Capture";
  if (includesAny(text, ["splitter", "distribution amplifier", "1x2", "1x4", "1x8"])) return "Splitter / Distribution";
  if (includesAny(text, ["extender", "hdbaset", "kvm", "receiver", "transmitter", "wall plate"])) return "Extender / HDBaseT";
  if (includesAny(text, ["switcher", "switching"])) return "Switcher";
  if (includesAny(text, ["audio", "dante", "aes67", "microphone", "amplifier", "control", "touch panel"])) return "Audio / Control";

  return "Unclassified";
}

function roleFor(type) {
  if (type === "Cable") return "cable";
  if (type === "Dongle") return "workflow-endpoint";
  if (type === "Accessory") return "accessory";
  if (type === "Unclassified") return "needs-review";
  return "primary-or-endpoint-hardware";
}

function visibilityFor(role) {
  if (role === "primary-or-endpoint-hardware") return "default";
  if (role === "workflow-endpoint") return "conditional-default";
  if (role === "needs-review") return "needs-review";
  return "request-only";
}

function csv(value) {
  const text = clean(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

if (!fs.existsSync(path.join(root, sourcePath))) {
  console.error(`[product-intelligence-audit] Missing source: ${sourcePath}`);
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(path.join(root, sourcePath), "utf8"));
const records = collect(source);
const seen = new Set();
const rows = [];

for (const record of records) {
  const sku = firstString(record, ["sku", "SKU", "model", "Model", "id", "productCode"]);
  const title = firstString(record, ["title", "name", "productName", "Product Name", "description"]);
  const key = normalise(`${sku} ${title}`);

  if (!key || seen.has(key)) continue;
  seen.add(key);

  const family = firstString(record, ["family", "productFamily", "series", "range"]);
  const category = firstString(record, ["category", "type", "role"]);
  const text = `${sku} ${title} ${family} ${category} ${deepText(record)}`;
  const technologyType = classifyTechnology(text, sku);
  const hardwareRole = roleFor(technologyType);
  const visibilityPriority = visibilityFor(hardwareRole);
  const issues = [];

  if (!sku) issues.push("missing SKU");
  if (!title) issues.push("missing title");
  if (technologyType === "Unclassified") issues.push("technology type needs review");

  rows.push({ sku, title, family, category, technologyType, hardwareRole, visibilityPriority, issues: issues.join("; ") });
}

rows.sort((a, b) => a.sku.localeCompare(b.sku));

fs.mkdirSync(path.join(root, "reports"), { recursive: true });

const jsonPath = path.join(root, "reports/wingman-product-intelligence-audit.json");
const csvPath = path.join(root, "reports/wingman-product-intelligence-audit.csv");
const columns = ["sku", "title", "family", "category", "technologyType", "hardwareRole", "visibilityPriority", "issues"];

fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), source: sourcePath, productCount: rows.length, rows }, null, 2) + "\n");
fs.writeFileSync(csvPath, [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n");

console.log(`[product-intelligence-audit] Products audited: ${rows.length}`);
console.log("[product-intelligence-audit] Wrote reports/wingman-product-intelligence-audit.csv");
console.log("[product-intelligence-audit] Wrote reports/wingman-product-intelligence-audit.json");