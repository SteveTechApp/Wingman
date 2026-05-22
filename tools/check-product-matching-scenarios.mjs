import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, "public", "product-intelligence-index.json");

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
  if (products.length < 50) throw new Error(`Expected at least 50 indexed products, found ${products.length}`);
  return products;
}

function findSku(products, sku) {
  return products.find((product) => product.sku.toUpperCase() === sku.toUpperCase());
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(normaliseText(term)));
}

const scenarios = [
  {
    name: "USB 3.x device path exists",
    requiredSkus: ["EX-100-USB3"],
    rejectSkus: ["EX-100-H2"],
    terms: ["usb 3", "usb 3.0", "superspeed", "5gbps", "10gbps"],
  },
  {
    name: "Integrated HDMI and USB extension path exists",
    requiredSkus: ["EX-100-H2", "EX-100-KVM", "EX-100-IW-USBC"],
    rejectSkus: ["USB-HUB4", "CAB-UAOC-15-C"],
    terms: ["hdmi", "usb", "kvm", "hdbaset", "extender"],
  },
  {
    name: "Dual display MST products exist",
    requiredSkus: ["MX-0402-MST", "MX-0403-H3-MST"],
    rejectSkus: ["EXP-SW-0301-H2"],
    terms: ["mst", "dual display", "matrix"],
  },
  {
    name: "NetworkHD multiview products exist",
    requiredSkus: ["NHD-150-RX", "NHD-0401-MV"],
    rejectSkus: ["MHD-0401-MV"],
    terms: ["networkhd", "multiview", "multi view", "mv"],
  },
  {
    name: "Dedicated LCD video wall processors exist",
    requiredSkus: ["SW-0204-VW", "SW-0206-VW"],
    rejectSkus: ["USB-HUB4"],
    terms: ["video wall", "videowall", "wall processor"],
  },
  {
    name: "NDI camera and bridge paths exist",
    requiredSkus: ["CAM-210-NDI-PTZ", "NHD-128-NDI-TRX"],
    rejectSkus: [],
    terms: ["ndi", "camera", "ptz", "bridge", "transceiver"],
  },
];

function runScenario(products, scenario) {
  const missingRequired = scenario.requiredSkus.filter((sku) => !findSku(products, sku));
  const rejectedPresent = scenario.rejectSkus.filter((sku) => findSku(products, sku));
  const matched = products.filter((product) => hasAny(productText(product), scenario.terms));
  const passed = missingRequired.length === 0 && rejectedPresent.length === 0 && matched.length > 0;
  return {
    name: scenario.name,
    passed,
    matches: matched.length,
    top: matched.slice(0, 8).map((product) => product.sku),
    missingRequired,
    rejectedPresent,
  };
}

try {
  const products = readProducts();
  const results = scenarios.map((scenario) => runScenario(products, scenario));
  const failures = results.filter((result) => !result.passed);

  console.log(`Checked product matching scenarios: ${results.length}`);
  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
    console.log(`  matches=${result.matches} top=${result.top.join(", ") || "none"}`);
    if (result.missingRequired.length) console.log(`  missing required SKUs=${result.missingRequired.join(", ")}`);
    if (result.rejectedPresent.length) console.log(`  rejected SKUs present=${result.rejectedPresent.join(", ")}`);
  }

  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
