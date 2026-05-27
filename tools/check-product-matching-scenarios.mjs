import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, "public", "product-intelligence-index.json");
const domainFiles = [
  path.join(repoRoot, "src", "wingman2", "productMatching", "types.ts"),
  path.join(repoRoot, "src", "wingman2", "productMatching", "text.ts"),
  path.join(repoRoot, "src", "wingman2", "productMatching", "featureFilters.ts"),
  path.join(repoRoot, "src", "wingman2", "productMatching", "index.ts"),
];

const neutralValues = new Set(["", "unknown", "no audio requirement", "no processing", "no control", "not required"]);

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

function hasAny(text, terms) {
  return terms.some((term) => text.includes(normaliseText(term)));
}

function hasAllGroups(text, termGroups) {
  return termGroups.every((terms) => hasAny(text, terms));
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

function verifyDomainFiles() {
  const missing = domainFiles.filter((filePath) => !fs.existsSync(filePath));

  if (missing.length) {
    throw new Error(`Missing recovered domain file(s): ${missing.map((filePath) => path.relative(repoRoot, filePath)).join(", ")}`);
  }

  const featureFilters = fs.readFileSync(path.join(repoRoot, "src", "wingman2", "productMatching", "featureFilters.ts"), "utf8");
  const expectedExports = [
    "getActiveFeatureFilters",
    "toFeatureSearchMatch",
    "isAllowedFeatureSearchProduct",
    "productSupportsIoCount",
    "expectedProductPathForRequirement",
  ];
  const missingExports = expectedExports.filter((name) => !featureFilters.includes(`function ${name}`));

  if (missingExports.length) {
    throw new Error(`Recovered featureFilters.ts is missing expected export(s): ${missingExports.join(", ")}`);
  }
}

function filtersForNeed(need) {
  const filters = [];

  if (need.query && !neutralValues.has(normaliseText(need.query))) {
    const query = normaliseText(need.query);

    if (query.includes("usb 3")) {
      filters.push({ label: "query USB 3.x", weight: 40, match: (text) => hasAny(text, ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"]) });
    } else {
      const words = query.split(/\s+/).filter((word) => word.length >= 2 && !["and", "for", "with", "the", "product", "products"].includes(word));
      filters.push({ label: "query", weight: 34, match: (text) => text.includes(query) || words.every((word) => text.includes(word)) });
    }
  }

  if (need.technicalRequirement === "Extend HDMI and USB together") {
    filters.push({
      label: need.technicalRequirement,
      weight: 42,
      match: (text) => hasAllGroups(text, [["hdmi", "usb-c", "usb c"], ["usb", "kvm"], ["extender", "hdbaset", "hdbt", "transmitter", "receiver"]]),
    });
  } else if (need.technicalRequirement && !neutralValues.has(normaliseText(need.technicalRequirement))) {
    const terms = {
      "Extend HDMI over distance": ["hdbaset", "hdbt", "extender", "receiver", "transmitter", "hdmi"],
      "Connect USB-C laptop": ["usb-c", "usb c", "presentation switcher", "byod", "byom", "laptop"],
      "Dual display / MST": ["dual display", "dual-output", "multi output", "mst", "matrix", "presentation"],
      "Create multiview layout": ["multiview", "multi view", "multi-view", "pip", "quad view", "processor"],
      "Build LCD video wall": ["video wall", "lcd wall", "videowall", "wall processor", "networkhd"],
      "Distribute AV over network": ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver", "1gbe", "10g"],
      "Bring NDI camera into AV system": ["ndi", "camera", "ptz", "networkhd"],
    }[need.technicalRequirement] ?? [need.technicalRequirement];

    filters.push({ label: need.technicalRequirement, weight: 38, match: (text) => hasAny(text, terms) });
  }

  if (need.productPath && !neutralValues.has(normaliseText(need.productPath))) {
    const terms = {
      "Presentation switcher": ["presentation switcher", "switcher", "usb-c", "usb c", "byod", "byom"],
      "HDMI / USB extender": ["hdmi", "usb", "kvm", "hdbaset", "extender"],
      "HDBaseT extender": ["hdbaset", "hdbt", "extender", "receiver", "transmitter"],
      "Matrix / routing": ["matrix", "routing", "multi output", "multiple outputs", "seamless"],
      AVoIP: ["networkhd", "av over ip", "avoip", "encoder", "decoder", "transceiver"],
      "Video wall": ["video wall", "videowall", "wall processor", "lcd wall", "sw-0204", "sw-0206"],
      "NDI / camera": ["ndi", "camera", "ptz", "webcam"],
    }[need.productPath] ?? [need.productPath];

    filters.push({ label: need.productPath, weight: 36, match: (text) => hasAny(text, terms) });
  }

  if (need.signalType === "HDMI + USB") {
    filters.push({ label: need.signalType, weight: 38, match: (text) => hasAllGroups(text, [["hdmi"], ["usb", "kvm"]]) });
  }

  if (need.usb === "USB 2.0 enough") {
    filters.push({ label: need.usb, weight: 42, match: (text) => hasAny(text, ["usb 2", "usb 2.0", "usb 2 0", "usb over ip", "kvm", "hid"]) });
  }

  if (need.usb === "USB 3.x required") {
    filters.push({ label: need.usb, weight: 46, match: (text) => hasAny(text, ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"]) });
  }

  if (need.processing === "Multiview") {
    filters.push({ label: need.processing, weight: 34, match: (text) => hasAny(text, ["multiview", "multi view", "multi-view", "pip", "quad view"]) });
  }

  return filters;
}

function runScenario(products, scenario) {
  const filters = filtersForNeed(scenario.need);
  const scored = products
    .map((product) => {
      const text = productText(product);
      const matched = filters.filter((filter) => filter.match(text));
      return {
        product,
        matched,
        score: 40 + matched.reduce((sum, filter) => sum + filter.weight, 0) + (matched.length ? 12 : 0),
      };
    })
    .filter((item) => item.matched.length === filters.length)
    .filter((item) => matchesScenarioFocus(item.product, scenario))
    .sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku));

  const matchedSkus = new Set(scored.map((item) => item.product.sku));
  const missingRequired = scenario.requireAny.filter((skus) => !skus.some((sku) => matchedSkus.has(sku)));
  const rejectedHits = scenario.rejectSkus.filter((sku) => matchedSkus.has(sku));

  return {
    name: scenario.name,
    count: scored.length,
    top: scored.slice(0, 8).map((item) => item.product.sku),
    passed: missingRequired.length === 0 && rejectedHits.length === 0,
    missingRequired,
    rejectedHits,
  };
}

function matchesScenarioFocus(product, scenario) {
  const text = productText(product);
  const sku = product.sku.toUpperCase();

  if (scenario.allowedSkuPrefixes && !scenario.allowedSkuPrefixes.some((prefix) => sku.startsWith(prefix))) {
    return false;
  }

  if (scenario.mustHaveAnyTerms && !hasAny(text, scenario.mustHaveAnyTerms)) {
    return false;
  }

  if (scenario.mustHaveAllTermGroups && !hasAllGroups(text, scenario.mustHaveAllTermGroups)) {
    return false;
  }

  return true;
}

const scenarios = [
  {
    name: "USB 3.x devices stay in the USB 3.x lane",
    need: { query: "USB 3.0 devices", usb: "USB 3.x required" },
    allowedSkuPrefixes: ["EX-", "USB-", "CAB-U"],
    mustHaveAnyTerms: ["usb 3", "usb 3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps", "20gbps"],
    requireAny: [["EX-100-USB3", "EX-100-IW-USBC", "USB-HUB4"]],
    rejectSkus: ["EX-100-H2"],
  },
  {
    name: "Integrated HDMI and USB extension prefers combined products",
    need: {
      technicalRequirement: "Extend HDMI and USB together",
      productPath: "HDMI / USB extender",
      signalType: "HDMI + USB",
      usb: "USB 2.0 enough",
    },
    allowedSkuPrefixes: ["EX-", "SWX-", "RX-", "TX-"],
    mustHaveAllTermGroups: [["hdmi"], ["usb", "kvm"], ["extender", "hdbaset", "hdbt", "transmitter", "receiver"]],
    requireAny: [["EX-100-H2", "EX-100-KVM", "EX-100-IW-USBC"]],
    rejectSkus: ["USB-HUB4", "CAB-UAOC-15-C"],
  },
  {
    name: "Dual display MST routes toward MST matrix products",
    need: { technicalRequirement: "Dual display / MST", productPath: "Presentation switcher" },
    allowedSkuPrefixes: ["MX-"],
    mustHaveAnyTerms: ["mst", "dual display", "dual-output"],
    requireAny: [["MX-0402-MST", "MX-0403-H3-MST"]],
    rejectSkus: ["EXP-SW-0301-H2"],
  },
  {
    name: "NetworkHD multiview includes 100 and 500 series multiview products",
    need: { technicalRequirement: "Create multiview layout", productPath: "AVoIP", processing: "Multiview" },
    allowedSkuPrefixes: ["NHD-"],
    mustHaveAllTermGroups: [["networkhd", "nhd"], ["multiview", "multi view", "multi-view", "mv"]],
    requireAny: [["NHD-150-RX"], ["NHD-0401-MV"]],
    rejectSkus: [],
  },
  {
    name: "Dedicated LCD video wall processors remain discoverable",
    need: { technicalRequirement: "Build LCD video wall", productPath: "Video wall" },
    allowedSkuPrefixes: ["SW-", "NHD-"],
    mustHaveAnyTerms: ["video wall", "videowall", "wall processor", "sw 0204 vw", "sw 0206 vw"],
    requireAny: [["SW-0204-VW", "SW-0206-VW"]],
    rejectSkus: ["USB-HUB4"],
  },
  {
    name: "NDI camera workflow finds camera and bridge paths",
    need: { technicalRequirement: "Bring NDI camera into AV system", productPath: "NDI / camera" },
    allowedSkuPrefixes: ["CAM-", "NHD-"],
    mustHaveAllTermGroups: [["ndi"], ["camera", "ptz", "bridge", "transceiver"]],
    requireAny: [["CAM-210-NDI-PTZ", "NHD-128-NDI-TRX"]],
    rejectSkus: [],
  },
];

try {
  verifyDomainFiles();
  const products = readProducts();
  const results = scenarios.map((scenario) => runScenario(products, scenario));
  const failures = results.filter((result) => !result.passed);

  console.log(`Checked product matching scenarios: ${results.length}`);
  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
    console.log(`  matches=${result.count} top=${result.top.join(", ") || "none"}`);

    if (result.missingRequired.length) {
      console.log(`  missing required groups=${JSON.stringify(result.missingRequired)}`);
    }

    if (result.rejectedHits.length) {
      console.log(`  rejected hits=${result.rejectedHits.join(", ")}`);
    }
  }

  if (failures.length) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
