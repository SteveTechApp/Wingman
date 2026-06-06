/**
 * Competitor Match Engine
 *
 * Analyzes competitor products and finds best WyreStorm alternatives
 * based on technology class, capabilities, and role matching.
 */

import { gateCompareCandidate, type CompareCompetitorClass } from "./compareCandidateGate";

export type TechnologyClass =
  | "AVOIP"
  | "HDBASET"
  | "MATRIX"
  | "PRESENTATION"
  | "VIDEO_WALL"
  | "EXTENDER"
  | "USB_CONFERENCE"
  | "WIRELESS_PRESENTATION"
  | "AUDIO"
  | "CONTROL"
  | "UNKNOWN";

export type ProductRole =
  | "encoder"
  | "decoder"
  | "transceiver"
  | "transmitter"
  | "receiver"
  | "matrix"
  | "switcher"
  | "scaler"
  | "processor"
  | "amplifier"
  | "controller"
  | "unknown";

export type CompetitorProfile = {
  originalInput: string;
  brand: string;
  sku: string;
  technologyClass: TechnologyClass;
  role: ProductRole;
  confidence: "high" | "medium" | "low";
  capabilities: string[];
  evidence: string[];
};

export type WyrestormProduct = {
  sku: string;
  name: string;
  title?: string;
  family?: string;
  category?: string;
  productFamily?: string;
  governanceRole?: string;
  role?: string;
  technologies?: string[];
  connectors?: string[];
  features?: string[];
  featureTags?: string[];
  tags?: string[];
  capabilities?: string[];
  applications?: string[];
  searchTerms?: string[];
  description?: string;
  summary?: string;
};

export type MatchResult = {
  sku: string;
  name: string;
  family: string;
  score: number;
  matchQuality: "excellent" | "good" | "partial" | "weak";
  matchReasons: string[];
  cautions: string[];
  capabilityOverlap: string[];
  missingCapabilities: string[];
};

export type CompareResult = {
  competitor: CompetitorProfile;
  isRelevant: boolean;
  relevanceReason: string;
  matches: MatchResult[];
  recommendation: string;
  nextSteps: string[];
};

// Brand detection patterns
const BRAND_PATTERNS: [RegExp, string][] = [
  [/\b(crestron|dm-nvx|dmps|hd-md|hd-rx|hd-tx)\b/i, "Crestron"],
  [/\b(extron|dtp|nav\s*[ed]|in1608|smp|xtp)\b/i, "Extron"],
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
];

// Technology class detection
const TECH_CLASS_PATTERNS: [RegExp[], TechnologyClass][] = [
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
const ROLE_PATTERNS: [RegExp[], ProductRole][] = [
  [[/\b(enc|encoder|tx|transmit|-e\d{2,3}|send)\b/i], "encoder"],
  [[/\b(dec|decoder|rx|receiv|-d\d{2,3})\b/i], "decoder"],
  [[/\b(transceiver|tcvr|bidirect|two.?way|dm-nvx-(350|351|360|363))\b/i], "transceiver"],
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
const CAPABILITY_KEYWORDS: [RegExp, string][] = [
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

function detectBrand(input: string): string {
  const text = input.toLowerCase();
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(text)) {
      return brand;
    }
  }
  return "Unknown";
}

function detectTechnologyClass(input: string, brand: string): TechnologyClass {
  const text = `${input} ${brand}`.toLowerCase();
  for (const [patterns, techClass] of TECH_CLASS_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      return techClass;
    }
  }
  return "UNKNOWN";
}

function detectRole(input: string): ProductRole {
  const text = input.toLowerCase();
  for (const [patterns, role] of ROLE_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      return role;
    }
  }
  return "unknown";
}

function extractCapabilities(input: string): string[] {
  const caps: string[] = [];
  for (const [pattern, capability] of CAPABILITY_KEYWORDS) {
    if (pattern.test(input)) {
      caps.push(capability);
    }
  }
  return [...new Set(caps)];
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[;\n|]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function productText(product: WyrestormProduct): string {
  return [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.productFamily,
    product.category,
    product.governanceRole,
    product.role,
    product.description,
    product.summary,
    ...stringList(product.technologies),
    ...stringList(product.connectors),
    ...stringList(product.features),
    ...stringList(product.featureTags),
    ...stringList(product.tags),
    ...stringList(product.capabilities),
    ...stringList(product.applications),
    ...stringList(product.searchTerms),
  ].join(" ").toLowerCase();
}

function buildEvidence(
  input: string,
  brand: string,
  techClass: TechnologyClass,
  role: ProductRole
): string[] {
  const evidence: string[] = [];

  if (brand !== "Unknown") {
    evidence.push(`Detected brand: ${brand}`);
  }

  if (techClass !== "UNKNOWN") {
    evidence.push(`Technology class: ${techClass.replace(/_/g, " ")}`);
  }

  if (role !== "unknown") {
    evidence.push(`Product role: ${role}`);
  }

  return evidence;
}

export function analyzeCompetitor(input: string, providedBrand?: string): CompetitorProfile {
  const trimmed = input.trim();
  const brand = providedBrand || detectBrand(trimmed);
  const technologyClass = detectTechnologyClass(trimmed, brand);
  const role = detectRole(trimmed);
  const capabilities = extractCapabilities(trimmed);
  const evidence = buildEvidence(trimmed, brand, technologyClass, role);

  let confidence: "high" | "medium" | "low" = "low";
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
    evidence,
  };
}

// WyreStorm technology class mapping
const WYRESTORM_TECH_MAP: Record<string, TechnologyClass[]> = {
  // Family-based mappings
  "NetworkHD": ["AVOIP"],
  "NHD": ["AVOIP"],
  "Matrix": ["MATRIX"],
  "MX": ["MATRIX"],
  "SW": ["PRESENTATION", "MATRIX"],
  "EX": ["EXTENDER", "HDBASET"],
  "CON": ["USB_CONFERENCE"],
  "AMP": ["AUDIO"],
  "Amplifier": ["AUDIO"],
  "CPX": ["CONTROL"],
  "Dante": ["AUDIO"],
};

// Technology class compatibility - which WyreStorm classes match competitor classes
const TECH_CLASS_COMPATIBILITY: Record<TechnologyClass, TechnologyClass[]> = {
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

function getProductTechClass(product: WyrestormProduct): TechnologyClass {
  const sku = String(product.sku ?? "").trim().toUpperCase();
  const category = String(product.category ?? "").toLowerCase();
  const searchText = productText(product);

  if (/^NHD-/.test(sku) || category.includes("avoip") || searchText.includes("networkhd av over ip")) {
    return "AVOIP";
  }

  if (/^EX-/.test(sku) || /^RX-/.test(sku) || /^TX-/.test(sku) || category.includes("hdbaset")) {
    return "HDBASET";
  }

  if (/^MX-/.test(sku) || category.includes("matrix")) {
    return "MATRIX";
  }

  if (/^SW-/.test(sku) || category.includes("presentation")) {
    return "PRESENTATION";
  }

  if (/^APO-/.test(sku) || category.includes("uc") || category.includes("conferencing")) {
    return "USB_CONFERENCE";
  }

  if (/^CAM-/.test(sku) || category.includes("camera")) {
    return "USB_CONFERENCE";
  }

  if (/^AMP-/.test(sku) || category.includes("audio")) {
    return "AUDIO";
  }

  if (/^CAB-/.test(sku) || category.includes("cable") || category.includes("accessory")) {
    return "UNKNOWN";
  }

  // Check family-based mappings first
  for (const [family, classes] of Object.entries(WYRESTORM_TECH_MAP)) {
    if (product.family?.toLowerCase().includes(family.toLowerCase()) ||
        product.sku?.toLowerCase().startsWith(family.toLowerCase())) {
      return classes[0];
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

function getProductRole(product: WyrestormProduct): ProductRole {
  const searchText = productText(product);

  for (const [patterns, role] of ROLE_PATTERNS) {
    if (patterns.some((p) => p.test(searchText))) {
      return role;
    }
  }

  return "unknown";
}

function extractProductCapabilities(product: WyrestormProduct): string[] {
  const searchText = productText(product);

  return extractCapabilities(searchText);
}

function toGateClass(technologyClass: TechnologyClass): CompareCompetitorClass {
  if (technologyClass === "EXTENDER") return "HDBASET";
  if (technologyClass === "USB_CONFERENCE") return "USB_EXTENSION";
  return technologyClass;
}

function gateInputForProduct(product: WyrestormProduct) {
  return {
    sku: product.sku,
    title: product.title || product.name,
    role: product.role || product.governanceRole || product.category,
    category: product.category,
    family: product.family,
    productFamily: product.productFamily,
    tags: stringList(product.tags),
    features: stringList(product.features),
    text: [
      product.sku,
      product.name,
      product.title,
      product.category,
      product.family,
      product.productFamily,
      product.role,
      product.governanceRole,
      ...stringList(product.technologies),
      ...stringList(product.features),
      ...stringList(product.tags),
    ].join(" "),
  };
}

function scoreProduct(
  competitor: CompetitorProfile,
  product: WyrestormProduct
): MatchResult {
  const productTechClass = getProductTechClass(product);
  const productRole = getProductRole(product);
  const productCaps = extractProductCapabilities(product);

  let score = 0;
  const matchReasons: string[] = [];
  const cautions: string[] = [];

  // Technology class match (most important)
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
  } else if (
    competitor.technologyClass === "AVOIP" &&
    ["encoder", "decoder", "transceiver", "transmitter", "receiver"].includes(productRole)
  ) {
    score += 15;
    matchReasons.push(`AVoIP endpoint role: ${productRole}`);
  }

  // Capability overlap
  const capabilityOverlap: string[] = [];
  const missingCapabilities: string[] = [];

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

  // Determine match quality
  let matchQuality: "excellent" | "good" | "partial" | "weak";
  if (score >= 60) {
    matchQuality = "excellent";
  } else if (score >= 45) {
    matchQuality = "good";
  } else if (score >= 25) {
    matchQuality = "partial";
  } else {
    matchQuality = "weak";
  }

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

function isRelevantToWyrestorm(competitor: CompetitorProfile): { relevant: boolean; reason: string } {
  // WyreStorm's core competencies
  const relevantClasses: TechnologyClass[] = [
    "AVOIP",
    "HDBASET",
    "MATRIX",
    "PRESENTATION",
    "VIDEO_WALL",
    "EXTENDER",
    "USB_CONFERENCE",
    "AUDIO",
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

export function findMatches(
  competitor: CompetitorProfile,
  products: WyrestormProduct[],
  maxResults = 5
): CompareResult {
  const relevance = isRelevantToWyrestorm(competitor);
  const gateContext = {
    competitorClass: toGateClass(competitor.technologyClass),
    competitorRole: competitor.role,
    applicationContext: competitor.originalInput,
  };

  // Score all products
  const scoredProducts = products
    .filter((product) => gateCompareCandidate(gateInputForProduct(product), gateContext).allowed)
    .map((product) => scoreProduct(competitor, product))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  // Build recommendation
  let recommendation: string;
  let nextSteps: string[];

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

export function compareCompetitor(
  input: string,
  products: WyrestormProduct[],
  providedBrand?: string,
  maxResults = 5
): CompareResult {
  const competitor = analyzeCompetitor(input, providedBrand);
  return findMatches(competitor, products, maxResults);
}
