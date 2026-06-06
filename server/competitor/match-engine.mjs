/**
 * Competitor Match Engine - Server-side implementation
 *
 * Provides intelligent product matching with optional LLM enrichment
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

// Brand detection patterns
const BRAND_PATTERNS = [
  [/\b(crestron|dm-nvx|dmps|hd-md|hd-rx|hd-tx)\b/i, "Crestron"],
  [/\b(extron|dtp\d?|nav\s*[ed]|in1608|smp|xtp)\b/i, "Extron"],
  [/\b(atlona|at-|omni-|omega)\b/i, "Atlona"],
  [/\b(kramer|kds-|vp-|vs-|vm-)\b/i, "Kramer"],
  [/\b(lightware|ubex|vinx|taurus|mmx)\b/i, "Lightware"],
  [/\b(blustream|ip\d{3}uhd|hmx|acm|pla)\b/i, "Blustream"],
  [/\b(barco|clickshare|c-5|c-10|cx-|cse-)\b/i, "Barco"],
  [/\b(zeevee|zyper\d*k?)\b/i, "ZeeVee"],
  [/\b(amx|nmx-|dvx-|dxl-|dgx)\b/i, "AMX"],
  [/\b(avpro|ac-ex|ac-mx|mxnet)\b/i, "AVPro Edge"],
  [/\b(binary|b-\d{3})\b/i, "Binary"],
  [/\b(aten|ve\d{3,4}|uc\d{4})\b/i, "ATEN"],
  [/\b(logitech|rally|meetup|tap)\b/i, "Logitech"],
  [/\b(poly|studio\s*x|trio)\b/i, "Poly"],
  [/\b(biamp|tesira|devio)\b/i, "Biamp"],
  [/\b(shure|mxa|ani|ulxd)\b/i, "Shure"],
  [/\b(qsc|q-sys|core|nx)\b/i, "QSC"],
  [/\b(savant|sav-)\b/i, "Savant"],
  [/\b(control4|c4-)\b/i, "Control4"],
  [/\b(cyp|pu-|clux-|au-)\b/i, "CYP"],
  [/\b(aurora|ipx-|qdx-|vhub)\b/i, "Aurora"],
  [/\b(intelix|int-)\b/i, "Intelix"],
  [/\b(gefen|ext-|gtb-)\b/i, "Gefen"],
  [/\b(rgb\s*spectrum|quadview)\b/i, "RGB Spectrum"],
];

// Technology class detection
const TECH_CLASS_PATTERNS = [
  [[/\b(nvx|zyper|ip\d{2,3}uhd|kds|nav\s*[ed]|nmx|mxnet|vinx|ubex|networkhd|nhd|avoip|av.over.ip|sdn|ndi)\b/i], "AVOIP"],
  [[/\b(dtp\d?|hdbaset|hdb|hdbt|cat\s*ext|poe.?ext)\b/i], "HDBASET"],
  [[/\b(matrix|mtrx|mx-?\d|vs-?\d{2}h|mmx|dgx)\b/i], "MATRIX"],
  [[/\b(presentation|switcher|scaler|sw-|dmps|dvx|ps-|in1608)\b/i], "PRESENTATION"],
  [[/\b(video\s*wall|wall\s*proc|vw-|multiview)\b/i], "VIDEO_WALL"],
  [[/\b(extender|ext-|kit|tx.*rx|transmit|receiv)\b/i], "EXTENDER"],
  [[/\b(usb|byod|byom|uc\s*|conference|teams|zoom|huddle|collab)\b/i], "USB_CONFERENCE"],
  [[/\b(wireless|clickshare|airmedia|solstice|screenbeam|miracast)\b/i], "WIRELESS_PRESENTATION"],
  [[/\b(audio|amp|dsp|dante|aes67|speaker|microphone)\b/i], "AUDIO"],
  [[/\b(control|processor|automation|nx-|cp-|rms)\b/i], "CONTROL"],
];

// Role detection
const ROLE_PATTERNS = [
  [[/\b(enc|encoder|tx|transmit|-e\d{2,3}|send)\b/i], "encoder"],
  [[/\b(dec|decoder|rx|receiv|-d\d{2,3})\b/i], "decoder"],
  [[/\b(transceiver|tcvr|bidirect|two.?way)\b/i], "transceiver"],
  [[/\b(transmitter|tx-|sender)\b/i], "transmitter"],
  [[/\b(receiver|rx-)\b/i], "receiver"],
  [[/\b(matrix|mtrx|mx-?\d{2,4})\b/i], "matrix"],
  [[/\b(switch|sw-|selector)\b/i], "switcher"],
  [[/\b(scaler|scale)\b/i], "scaler"],
  [[/\b(processor|proc|dsp)\b/i], "processor"],
  [[/\b(amp|amplifier)\b/i], "amplifier"],
  [[/\b(control|automation|nx-|cp-)\b/i], "controller"],
];

// Capability keywords
const CAPABILITY_KEYWORDS = [
  [/\b4k60?\b/i, "4K"],
  [/\b4k60\s*4:4:4\b/i, "4K60 4:4:4"],
  [/\b1080p?\b/i, "1080p"],
  [/\bhdr\b/i, "HDR"],
  [/\bhdcp\s*2\.2\b/i, "HDCP 2.2"],
  [/\busb[- ]?c\b/i, "USB-C"],
  [/\busb\s*3\b/i, "USB 3.0"],
  [/\busb\s*2\b/i, "USB 2.0"],
  [/\bdante\b/i, "Dante"],
  [/\baes67\b/i, "AES67"],
  [/\bpoe\b/i, "PoE"],
  [/\bhdbaset?\b/i, "HDBaseT"],
  [/\b10g\b/i, "10G"],
  [/\b1g\b/i, "1G"],
  [/\brs-?232\b/i, "RS-232"],
  [/\bir\b/i, "IR"],
  [/\bcec\b/i, "CEC"],
  [/\bapi\b/i, "API"],
  [/\bweb\s*ui\b/i, "Web UI"],
  [/\barc\b/i, "ARC"],
  [/\bearc\b/i, "eARC"],
  [/\bkvm\b/i, "KVM"],
  [/\baudio\s*embed\b/i, "Audio Embed"],
  [/\baudio\s*de.?embed\b/i, "Audio De-embed"],
  [/\bmulticast\b/i, "Multicast"],
  [/\bunicast\b/i, "Unicast"],
  [/\bigmp\b/i, "IGMP"],
  [/\bwall\s*plate\b/i, "Wall Plate"],
  [/\brack\s*mount\b/i, "Rack Mount"],
  [/\bdownscale\b/i, "Downscaling"],
  [/\bedid\b/i, "EDID Management"],
  [/\bvideo\s*wall\b/i, "Video Wall"],
  [/\bmultiview\b/i, "Multiview"],
];

// Technology class compatibility
const TECH_CLASS_COMPATIBILITY = {
  AVOIP: ["AVOIP"],
  HDBASET: ["HDBASET", "EXTENDER"],
  MATRIX: ["MATRIX", "AVOIP"],
  PRESENTATION: ["PRESENTATION", "MATRIX"],
  VIDEO_WALL: ["VIDEO_WALL", "AVOIP", "MATRIX"],
  EXTENDER: ["EXTENDER", "HDBASET"],
  USB_CONFERENCE: ["USB_CONFERENCE", "PRESENTATION"],
  WIRELESS_PRESENTATION: ["WIRELESS_PRESENTATION", "PRESENTATION"],
  AUDIO: ["AUDIO"],
  CONTROL: ["CONTROL"],
  UNKNOWN: [],
};

// WyreStorm family to tech class mapping
const WYRESTORM_FAMILY_MAP = {
  "NetworkHD": "AVOIP",
  "NHD": "AVOIP",
  "Matrix": "MATRIX",
  "MX": "MATRIX",
  "SW": "PRESENTATION",
  "EX": "EXTENDER",
  "CON": "USB_CONFERENCE",
  "AMP": "AUDIO",
  "Amplifier": "AUDIO",
  "CPX": "CONTROL",
  "Dante": "AUDIO",
};

let cachedProducts = null;
let productsLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadProducts() {
  const now = Date.now();
  if (cachedProducts && (now - productsLoadedAt) < CACHE_TTL_MS) {
    return cachedProducts;
  }

  const paths = [
    path.join(repoRoot, "data", "wyrestorm-product-intelligence.json"),
    path.join(repoRoot, "public", "product-intelligence-index.json"),
  ];

  for (const filePath of paths) {
    try {
      const data = await fs.readFile(filePath, "utf8");
      const products = JSON.parse(data);
      if (Array.isArray(products) && products.length > 0) {
        cachedProducts = products;
        productsLoadedAt = now;
        return products;
      }
    } catch {
      continue;
    }
  }

  return [];
}

function detectBrand(input) {
  const text = input.toLowerCase();
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(text)) {
      return brand;
    }
  }
  return "Unknown";
}

function detectTechClass(input, brand) {
  const text = `${input} ${brand}`.toLowerCase();
  for (const [patterns, techClass] of TECH_CLASS_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      return techClass;
    }
  }
  return "UNKNOWN";
}

function detectRole(input) {
  const text = input.toLowerCase();
  for (const [patterns, role] of ROLE_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      return role;
    }
  }
  return "unknown";
}

function extractCapabilities(input) {
  const caps = [];
  for (const [pattern, capability] of CAPABILITY_KEYWORDS) {
    if (pattern.test(input)) {
      caps.push(capability);
    }
  }
  return [...new Set(caps)];
}

function analyzeCompetitor(input, providedBrand) {
  const trimmed = input.trim();
  const brand = providedBrand || detectBrand(trimmed);
  const technologyClass = detectTechClass(trimmed, brand);
  const role = detectRole(trimmed);
  const capabilities = extractCapabilities(trimmed);

  let confidence = "low";
  if (brand !== "Unknown" && technologyClass !== "UNKNOWN" && role !== "unknown") {
    confidence = "high";
  } else if (brand !== "Unknown" || technologyClass !== "UNKNOWN") {
    confidence = "medium";
  }

  return {
    originalInput: trimmed,
    brand,
    sku: trimmed.split(/\s+/)[0] || trimmed,
    technologyClass,
    role,
    confidence,
    capabilities,
    evidence: [
      brand !== "Unknown" ? `Detected brand: ${brand}` : null,
      technologyClass !== "UNKNOWN" ? `Technology class: ${technologyClass.replace(/_/g, " ")}` : null,
      role !== "unknown" ? `Product role: ${role}` : null,
    ].filter(Boolean),
  };
}

function getProductTechClass(product) {
  const searchText = [
    product.sku,
    product.name,
    product.family,
    product.role,
    ...(product.features || []),
    ...(product.tags || []),
  ].join(" ").toLowerCase();

  // Check family-based mappings first
  for (const [family, techClass] of Object.entries(WYRESTORM_FAMILY_MAP)) {
    if (product.family?.toLowerCase().includes(family.toLowerCase()) ||
        product.sku?.toLowerCase().startsWith(family.toLowerCase())) {
      return techClass;
    }
  }

  // Fall back to pattern detection
  for (const [patterns, techClass] of TECH_CLASS_PATTERNS) {
    if (patterns.some((p) => p.test(searchText))) {
      return techClass;
    }
  }

  return "UNKNOWN";
}

function getProductRole(product) {
  const searchText = [
    product.sku,
    product.name,
    product.role,
  ].join(" ").toLowerCase();

  for (const [patterns, role] of ROLE_PATTERNS) {
    if (patterns.some((p) => p.test(searchText))) {
      return role;
    }
  }

  return "unknown";
}

function extractProductCapabilities(product) {
  const searchText = [
    product.name,
    product.description,
    ...(product.features || []),
    ...(product.featureTags || []),
    ...(product.capabilities || []),
  ].join(" ");

  return extractCapabilities(searchText);
}

function scoreProduct(competitor, product) {
  const productTechClass = getProductTechClass(product);
  const productRole = getProductRole(product);
  const productCaps = extractProductCapabilities(product);

  let score = 0;
  const matchReasons = [];
  const cautions = [];

  // Technology class match
  const compatibleClasses = TECH_CLASS_COMPATIBILITY[competitor.technologyClass] || [];
  if (compatibleClasses.includes(productTechClass)) {
    score += 40;
    matchReasons.push(`Same technology class: ${productTechClass.replace(/_/g, " ")}`);
  } else if (productTechClass !== "UNKNOWN" && competitor.technologyClass !== "UNKNOWN") {
    cautions.push(`Different technology: ${competitor.technologyClass} vs ${productTechClass}`);
  }

  // Role match
  if (competitor.role !== "unknown" && productRole !== "unknown") {
    if (competitor.role === productRole) {
      score += 25;
      matchReasons.push(`Same role: ${productRole}`);
    } else if (
      (competitor.role === "encoder" && productRole === "transmitter") ||
      (competitor.role === "transmitter" && productRole === "encoder") ||
      (competitor.role === "decoder" && productRole === "receiver") ||
      (competitor.role === "receiver" && productRole === "decoder")
    ) {
      score += 20;
      matchReasons.push(`Compatible role: ${competitor.role} ↔ ${productRole}`);
    }
  }

  // Capability overlap
  const capabilityOverlap = [];
  const missingCapabilities = [];

  for (const cap of competitor.capabilities) {
    if (productCaps.includes(cap)) {
      capabilityOverlap.push(cap);
      score += 5;
    } else {
      missingCapabilities.push(cap);
    }
  }

  if (capabilityOverlap.length > 0) {
    matchReasons.push(`Shared capabilities: ${capabilityOverlap.join(", ")}`);
  }

  if (missingCapabilities.length > 0 && missingCapabilities.length <= 3) {
    cautions.push(`May not support: ${missingCapabilities.join(", ")}`);
  }

  // Match quality
  let matchQuality;
  if (score >= 60) matchQuality = "excellent";
  else if (score >= 45) matchQuality = "good";
  else if (score >= 25) matchQuality = "partial";
  else matchQuality = "weak";

  return {
    sku: product.sku,
    name: product.name || product.title || product.sku,
    family: product.family || "Unknown",
    score,
    matchQuality,
    matchReasons,
    cautions,
    capabilityOverlap,
    missingCapabilities,
  };
}

function isRelevantToWyrestorm(competitor) {
  const relevantClasses = [
    "AVOIP", "HDBASET", "MATRIX", "PRESENTATION",
    "VIDEO_WALL", "EXTENDER", "USB_CONFERENCE", "AUDIO",
  ];

  if (competitor.technologyClass === "UNKNOWN") {
    return {
      relevant: true,
      reason: "Product type not fully identified - showing best matches based on available information",
    };
  }

  if (relevantClasses.includes(competitor.technologyClass)) {
    return {
      relevant: true,
      reason: `${competitor.technologyClass.replace(/_/g, " ")} products are within WyreStorm's product range`,
    };
  }

  if (competitor.technologyClass === "CONTROL") {
    return {
      relevant: false,
      reason: "WyreStorm does not manufacture dedicated control processors. Consider WyreStorm products that are controllable via third-party systems.",
    };
  }

  if (competitor.technologyClass === "WIRELESS_PRESENTATION") {
    return {
      relevant: true,
      reason: "While WyreStorm doesn't make wireless presentation devices, our NetworkHD and presentation switchers integrate with wireless systems",
    };
  }

  return {
    relevant: false,
    reason: `${competitor.technologyClass.replace(/_/g, " ")} is outside WyreStorm's core product range`,
  };
}

export async function compareCompetitor(input, providedBrand, maxResults = 5) {
  const competitor = analyzeCompetitor(input, providedBrand);
  const products = await loadProducts();
  const relevance = isRelevantToWyrestorm(competitor);

  // Score all products
  const scoredProducts = products
    .map((product) => scoreProduct(competitor, product))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  // Build recommendation
  let recommendation;
  let nextSteps;

  if (!relevance.relevant) {
    recommendation = relevance.reason;
    nextSteps = [
      "Consider what the competitor product is being used for",
      "Look at WyreStorm products that could serve the same application",
    ];
  } else if (scoredProducts.length === 0) {
    recommendation = "No strong matches found. The competitor product may have unique specifications.";
    nextSteps = [
      "Verify the competitor product specifications",
      "Contact WyreStorm pre-sales for custom recommendations",
    ];
  } else if (scoredProducts[0].matchQuality === "excellent") {
    recommendation = `${scoredProducts[0].sku} is an excellent alternative to ${competitor.sku}`;
    nextSteps = [
      `Review ${scoredProducts[0].sku} datasheet for exact specifications`,
      "Compare pricing and availability",
      "Verify installation requirements match",
    ];
  } else if (scoredProducts[0].matchQuality === "good") {
    recommendation = `${scoredProducts[0].sku} is a good alternative, but verify specific requirements`;
    nextSteps = [
      "Confirm feature requirements with customer",
      "Review any capability gaps noted",
      "Consider alternatives listed below",
    ];
  } else {
    recommendation = "Partial matches found - customer requirements should be verified";
    nextSteps = [
      "Clarify the exact application requirements",
      "Review all alternatives with customer",
      "Contact pre-sales if unsure",
    ];
  }

  return {
    competitor,
    isRelevant: relevance.relevant,
    relevanceReason: relevance.reason,
    matches: scoredProducts,
    recommendation,
    nextSteps,
  };
}

export function createCompareRoutes(router) {
  router.post("/api/compare/match", async (req, res) => {
    try {
      const { input, brand, maxResults } = req.body;

      if (!input || typeof input !== "string") {
        return res.status(400).json({
          error: "Missing required field: input",
        });
      }

      const result = await compareCompetitor(
        input,
        brand || undefined,
        Math.min(maxResults || 5, 10)
      );

      res.json(result);
    } catch (error) {
      console.error("Compare match error:", error);
      res.status(500).json({
        error: "Comparison failed",
        message: error.message,
      });
    }
  });

  router.get("/api/compare/analyze", async (req, res) => {
    try {
      const input = req.query.input;
      const brand = req.query.brand;

      if (!input) {
        return res.status(400).json({
          error: "Missing required query param: input",
        });
      }

      const result = analyzeCompetitor(input, brand || undefined);
      res.json(result);
    } catch (error) {
      console.error("Compare analyze error:", error);
      res.status(500).json({
        error: "Analysis failed",
        message: error.message,
      });
    }
  });

  return router;
}
