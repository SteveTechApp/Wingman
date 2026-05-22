import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, "public", "product-intelligence-index.json");
const incorrectNetworkHdMultiviewSku = ["MHD", "0401", "MV"].join("-");

function cleanText(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, " TM ")
    .replace(/&#x00ae;|&#174;|&reg;/gi, " R ")
    .replace(/&#x2013;|&#8211;|&ndash;/gi, "-")
    .replace(/&#x2014;|&#8212;|&mdash;/gi, "-")
    .replace(/&#x2018;|&#8216;|&lsquo;/gi, "'")
    .replace(/&#x2019;|&#8217;|&rsquo;/gi, "'")
    .replace(/&#x201c;|&#8220;|&ldquo;/gi, '"')
    .replace(/&#x201d;|&#8221;|&rdquo;/gi, '"')
    .replace(/&#x2022;|&#8226;|&bull;/gi, "-")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2022/g, "-")
    .replace(/[\u0080-\u024f]+/g, " ")
    .replace(/[^\u0020-\u007e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseText(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function deepText(value, depth = 0) {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return cleanText(value);
  if (Array.isArray(value)) return value.map((item) => deepText(item, depth + 1)).join(" ");
  if (typeof value === "object") return Object.values(value).map((item) => deepText(item, depth + 1)).join(" ");
  return "";
}

function toProduct(record) {
  const sku = cleanText(record.sku || record.id || record.model || record.productCode || "");
  const title = cleanText(record.title || record.name || record.productName || sku);
  if (!sku && !title) return null;

  return {
    sku: sku || title,
    title,
    family: cleanText(record.family || record.series || record.productFamily || ""),
    category: cleanText(record.category || record.type || record.technology || ""),
    description: cleanText(record.description || record.summary || record.shortDescription || ""),
    tags: [
      ...(Array.isArray(record.tags) ? record.tags : []),
      ...(Array.isArray(record.technologies) ? record.technologies : []),
      ...(Array.isArray(record.connectors) ? record.connectors : []),
      ...(Array.isArray(record.features) ? record.features : []),
      ...(Array.isArray(record.applications) ? record.applications : []),
    ].map(cleanText).filter(Boolean),
    searchText: deepText(record),
  };
}

function productText(product) {
  return normaliseText([
    product.sku,
    product.title,
    product.family,
    product.category,
    product.description,
    product.searchText,
    ...(product.tags ?? []),
  ].join(" "));
}

function readProducts() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing product intelligence index: ${path.relative(repoRoot, indexPath)}`);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const records = Array.isArray(index.products) ? index.products : [];
  const products = records.map(toProduct).filter(Boolean);

  if (products.length < 50) {
    throw new Error(`Expected at least 50 indexed products, found ${products.length}`);
  }

  return products;
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(normaliseText(term)));
}

function hasAllGroups(text, termGroups) {
  return termGroups.every((terms) => hasAny(text, terms));
}

function skuSet(products) {
  return new Set(products.map((product) => product.sku.toUpperCase()));
}

const scenarios = [
  {
    name: "USB 3.x device path exists",
    requiredAny: [["EX-100-USB3", "EX-100-IW-USBC"]],
    cautionSkus: ["EX-100-H2"],
    termGroups: [["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"]],
  },
  {
    name: "Integrated HDMI and USB extension path exists",
    requiredAny: [["EX-100-H2", "EX-100-KVM", "EX-100-IW-USBC"]],
    cautionSkus: ["USB-HUB4", "CAB-UAOC-15-C"],
    termGroups: [["hdmi", "usb c", "usb-c"], ["usb", "kvm"], ["extender", "hdbaset", "hdbt", "transmitter", "receiver"]],
  },
  {
    name: "Dual display MST products exist",
    requiredAny: [["MX-0402-MST", "MX-0403-H3-MST"]],
    cautionSkus: ["EXP-SW-0301-H2"],
    termGroups: [["mst", "dual display", "dual output", "dual-output"], ["matrix", "switcher", "presentation"]],
  },
  {
    name: "NetworkHD multiview products exist",
    requiredAny: [["NHD-150-RX"], ["NHD-0401-MV"]],
    failIfSkuExists: [incorrectNetworkHdMultiviewSku],
    cautionSkus: [],
    termGroups: [["networkhd", "nhd"], ["multiview", "multi view", "multi-view", "mv"]],
  },
  {
    name: "Dedicated LCD video wall processors exist",
    requiredAny: [["SW-0204-VW", "SW-0206-VW"]],
    cautionSkus: ["USB-HUB4"],
    termGroups: [["video wall", "videowall", "wall processor", "lcd wall"]],
  },
  {
    name: "NDI camera and bridge paths exist",
    requiredAny: [["CAM-210-NDI-PTZ", "NHD-128-NDI-TRX"]],
    cautionSkus: [],
    termGroups: [["ndi"], ["camera", "ptz", "bridge", "transceiver"]],
  },
];

function runScenario(products, scenario) {
  const matched = products.filter((product) => hasAllGroups(productText(product), scenario.termGroups));
  const matchedSkus = skuSet(matched);
  const catalogSkus = skuSet(products);

  const missingRequired = scenario.requiredAny.filter((skuGroup) => !skuGroup.some((sku) => catalogSkus.has(sku.toUpperCase())));
  const missingMatchedRequired = scenario.requiredAny.filter((skuGroup) => !skuGroup.some((sku) => matchedSkus.has(sku.toUpperCase())));
  const disallowedPresent = (scenario.failIfSkuExists ?? []).filter((sku) => catalogSkus.has(sku.toUpperCase()));
  const cautionMatched = (scenario.cautionSkus ?? []).filter((sku) => matchedSkus.has(sku.toUpperCase()));

  return {
    name: scenario.name,
    passed: missingRequired.length === 0 && missingMatchedRequired.length === 0 && disallowedPresent.length === 0 && matched.length > 0,
    matches: matched.length,
    top: matched.slice(0, 8).map((product) => product.sku),
    missingRequired,
    missingMatchedRequired,
    disallowedPresent,
    cautionMatched,
  };
}

try {
  const products = readProducts();
  const results = scenarios.map((scenario) => runScenario(products));
  const failures = results.filter((result) => !result.passed);

  console.log(`Checked product matching scenarios: ${results.length}`);
  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
    console.log(`  matches=${result.matches} top=${result.top.join(", ") || "none"}`);
    if (result.missingRequired.length) console.log(`  missing required SKU groups=${JSON.stringify(result.missingRequired)}`);
    if (result.missingMatchedRequired.length) console.log(`  required SKU groups not matched=${JSON.stringify(result.missingMatchedRequired)}`);
    if (result.disallowedPresent.length) console.log(`  disallowed SKUs present=${result.disallowedPresent.join(", ")}`);
    if (result.cautionMatched.length) console.log(`  caution: broad terms also matched=${result.cautionMatched.join(", ")}`);
  }

  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
