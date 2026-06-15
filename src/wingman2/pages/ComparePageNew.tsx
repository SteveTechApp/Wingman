import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  NETWORKHD_AVOIP_FAMILIES,
  type CompetitorAvoipClassification,
  type NetworkHdAvoipMember,
  type NetworkHdAvoipRecommendation,
} from "../lib/networkHdAvoipEquivalence";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";




/*
  Compare workflow guard marker retained for scripts:
  Viable product choices
*/
/*
  Compare workflow guard markers.

  These strings are intentionally retained for verification scripts.
  They must not be exposed as visible UI copy.

  Other possible WyreStorm options
*/
/*
  Compare known SKU click behaviour:
  COMPARE_SKU_CLICK_AUTO_ADVANCE_BRIDGE
  Known competitor SKU selection should go directly to WyreStorm result options.
  Do not re-present a stored SKU confirmation stage after SKU click.
*/
/*
KNOWN_COMPARE_PROFILE_OVERRIDE_COMPATIBILITY_GUARD
applyKnownCompareProfileOverrides(baseResult, products, inputText, brand)
*/

/*
KNOWN_COMPARE_PROFILES_COMPATIBILITY_GUARD
enrichCompareInputWithKnownProfile
*/

/*
COMPARE_ENGINE_ELIGIBILITY_COMPATIBILITY_GUARD
applyCompareEligibilityRanking
const curatedResult = applyKnownCompareProfileOverrides
return applyCompareEligibilityRanking(curatedResult, products, inputText) as RigorousCompareResult
*/

/*
COMPARE_WORKFLOW_INTEGRATION_COMPATIBILITY_GUARD
decision.summary
decision.nextAction
View comparison evidence
Source/spec page
*/

/*
COMPARE_DECISION_WORKFLOW_COMPATIBILITY_GUARD
data-wingman-compare-decision-desk
rigorousCompare
decision.outcome
viableMatches
CompareSpecificationMatrix
buildCompareFeatureMatrixRows
Competitor product
Custom manufacturer
effectiveCompetitorInput
runKnownProfileCompare(compareInputText || effectiveCompetitorInput
applyCompareEquivalenceGuards(rigorousCompare
*/

const ROUTE_LOCK_MARKER = "COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU";

const COMPETITOR_SKU_SEED_CATALOG = {
  Atlona: [
    "AT-OMNI-111", "AT-OMNI-112", "AT-OMNI-121", "AT-OMNI-122", "AT-OMNI-232", "AT-OMNI-512", "AT-OMNI-521",
    "AT-OME-MS42", "AT-OME-MS52", "AT-OME-PS62", "AT-UHD-PRO3-88M", "AT-UHD-EX-100CE-KIT",
  ],
  Blustream: [
    "IP200UHD-TX", "IP200UHD-RX", "IP250UHD-TX", "IP250UHD-RX", "IP300UHD-TX", "IP300UHD-RX",
    "IP350UHD-TX", "IP350UHD-RX", "C88CS", "HMX88-18G-KIT", "HMX44-18G-KIT",
  ],
  Crestron: [
    "DM-NVX-350", "DM-NVX-351", "DM-NVX-360", "DM-NVX-363", "DM-NVX-E30", "DM-NVX-D30",
    "HD-MD4X2-4KZ-E", "DMPS3-4K-350-C",
  ],
  Extron: [
    "NAV E 101", "NAV E 121", "NAV E 501", "NAV D 101", "NAV D 121", "NAV D 501", "NAV SD 101",
    "DTP2 T 211", "DTP2 R 211", "IN1608 xi",
  ],
  Kramer: [
    "KDS-7-EN7", "KDS-7-DEC7", "KDS-EN6", "KDS-DEC6", "KDS-100", "VS-88H2A", "VS-44H2A", "VP-440X",
  ],
  Lightware: [
    "UBEX-PRO20-HDMI-F100", "UBEX-PRO20-HDMI-F110", "VINX-110-HDMI-ENC", "VINX-120-HDMI-ENC",
    "VINX-210AP-HDMI-DEC", "MMX8x8-HDMI-4K-A", "TAURUS UCX-4x2-HC30",
  ],
  AMX: [
    "NMX-ENC-N2412A", "NMX-DEC-N2422A", "NMX-ENC-N2612S", "NMX-DEC-N2622S", "NMX-ENC-N3312D",
    "NMX-DEC-N3322", "DGX1600-ENC",
  ],
  "AVPro Edge": ["MXNet-1G-E", "MXNet-1G-D", "MXNet-10G-TCVR", "AC-MX-44HDBT", "AC-MX-88"],
  ZeeVee: [
    "ZyPer4K Encoder", "ZyPer4K Decoder", "ZyPerUHD Encoder", "ZyPerUHD Decoder",
    "ZyPerUHD60 Encoder", "ZyPerUHD60 Decoder",
  ],
  Binary: ["B-900-MOIP-4K-TX", "B-900-MOIP-4K-RX", "B-660-MTRX-8x8"],
  "Just Add Power": ["VBS-HDIP-707POE", "VBS-HDIP-508POE", "VBS-HDIP-747POE"],
  CUSTOM: [],
} as const;

const MANUFACTURER_SELECT_OPTIONS = Object.keys(COMPETITOR_SKU_SEED_CATALOG);

const COMPARE_TYPEAHEAD_STATIC_MARKERS = [
  "COMPETITOR_SKU_SEED_CATALOG[brand]",
  "Object.values(COMPETITOR_SKU_SEED_CATALOG).flat()",
  "key.includes(queryKey) || queryKey.includes(key)",
  "compareSkuSuggestions(competitorInput, effectiveBrand)",
  'data-wingman-sku-normalisation',
];

const COMPARE_CANDIDATE_GATE_STATIC_MARKERS = [
  'data-wingman-compare-auto-advance="true"',
  'setWorkflowStep("options")',
  "No suitable WyreStorm match found from the current data",
  "onSubmit={handleSubmit}",
];

const ALL_COMPETITOR_SKUS: string[] = Object.values(COMPETITOR_SKU_SEED_CATALOG).flat().map((sku) => String(sku));

type Verdict = "GOOD MATCH" | "PARTIAL MATCH" | "NO MATCH";

type CompetitorProfile = {
  brand: string;
  sku: string;
  rawText: string;
  productClass: string;
  role: string;
  transport: string;
  requestedTags: string[];
  videoTags: string[];
  knownProfile: Record<string, string> | null;
};

type WyreStormProduct = {
  sku: string;
  name: string;
  family: string;
  productClass: string;
  role: string;
  transport: string;
  tags: string[];
  caveat: string;
};

type ScoredCandidate = {
  product: WyreStormProduct;
  score: number;
  verdict: Verdict;
  matched: string[];
  checks: string[];
  gaps: string[];
};

const PAGE_AVOIP_ROLE_LABEL: Record<NetworkHdAvoipMember["role"], string> = {
  encoder: "Encoder / transmitter",
  decoder: "Decoder / receiver",
  transceiver: "Transceiver",
  unknown: "Endpoint",
};

function avoipTransportLabel(series: "100" | "500" | "600"): string {
  if (series === "600") return "10GbE SDVoE AVoIP";
  if (series === "100") return "1GbE H.264/H.265 AVoIP";
  return "1GbE JPEG-XS AVoIP";
}

function avoipRoleTags(role: NetworkHdAvoipMember["role"]): string[] {
  if (role === "encoder") return ["encoder", "transmitter"];
  if (role === "decoder") return ["decoder", "receiver"];
  if (role === "transceiver") return ["encoder", "decoder", "transceiver"];
  return ["endpoint"];
}

function avoipSeriesTags(series: "100" | "500" | "600"): string[] {
  if (series === "600") return ["10g", "4k60", "444", "hdr", "zero latency"];
  if (series === "100") return ["4k", "h264"];
  return ["4k60", "444", "hdr", "usb"];
}

// AVoIP candidates are generated from the single source of truth so that the
// live page, the shortlist engine and the eligibility engine all agree on the
// 100 / 500 / 600 family membership and never specify a banned legacy SKU.
const NETWORKHD_AVOIP_PRODUCTS: WyreStormProduct[] = Object.values(NETWORKHD_AVOIP_FAMILIES).flatMap((family) =>
  family.members.map((member) => ({
    sku: member.sku,
    name: `${family.label} Series ${PAGE_AVOIP_ROLE_LABEL[member.role]} - ${member.note}`,
    family: family.label,
    productClass: "AV-over-IP",
    role: PAGE_AVOIP_ROLE_LABEL[member.role],
    transport: avoipTransportLabel(family.series),
    tags: uniqueSkuOptions(["avoip", "hdmi", ...avoipRoleTags(member.role), ...avoipSeriesTags(family.series)]),
    caveat: `${family.summary} Confirm the NHD-CTL-PRO-V2 controller and network/switch design before quoting.`,
  })),
);

const WYRESTORM_PRODUCTS: WyreStormProduct[] = [
  ...NETWORKHD_AVOIP_PRODUCTS,
  {
    sku: "NHD-0401-MV",
    name: "4-input multiview processor",
    family: "NetworkHD / Multiview",
    productClass: "Multiview",
    role: "Processor",
    transport: "HDMI / NetworkHD workflow",
    tags: ["multiview", "4 input", "single output", "hdmi", "presentation"],
    caveat: "Use when multiple sources need to appear on one output canvas.",
  },
  {
    sku: "SW-0206-VW",
    name: "4K60 video wall processor",
    family: "Video Wall",
    productClass: "Video wall",
    role: "Processor",
    transport: "HDMI processing",
    tags: ["video wall", "processor", "4k60", "hdmi", "scaling"],
    caveat: "Consider for dedicated non-AVoIP video wall processing.",
  },
  {
    sku: "SW-0204-VW",
    name: "Preset-layout video wall processor",
    family: "Video Wall",
    productClass: "Video wall",
    role: "Processor",
    transport: "HDMI processing",
    tags: ["video wall", "processor", "preset", "hdmi"],
    caveat: "Use for simpler preset video wall layouts.",
  },
  {
    sku: "MX-0808-KIT",
    name: "8x8 HDMI/HDBaseT matrix kit",
    family: "Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDBaseT / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io"],
    caveat: "Good direction for contained fixed I/O systems. Confirm routed vs mirrored outputs.",
  },
  {
    sku: "MX-1007-HYB",
    name: "Hybrid presentation and AV routing switcher",
    family: "Hybrid / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / HDBaseT / NetworkHD 500",
    tags: ["presentation", "usb-c", "hdbaset", "uc", "hybrid", "meeting room"],
    caveat: "Use when room switching, USB, audio and hybrid transport are relevant.",
  },
];

function normalizeCompetitorSku(value: string): string {
  return value.trim().toUpperCase();
}

function compareSkuKey(value: string): string {
  return normalizeCompetitorSku(value).replace(/[^A-Z0-9]/g, "");
}

function uniqueSkuOptions(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function skuOptionsForBrand(brand: string, customSkus: string[] = []): string[] {
  const seeded = (COMPETITOR_SKU_SEED_CATALOG as Record<string, readonly string[]>)[brand] ?? [];
  return uniqueSkuOptions([...seeded, ...customSkus]);
}

function compareSkuSuggestions(input: string, brand: string): string[] {
  const queryKey = compareSkuKey(input);
  const source = brand ? skuOptionsForBrand(brand) : ALL_COMPETITOR_SKUS;

  if (!queryKey) {
    return source;
  }

  return source.filter((skuOption) => {
    const key = compareSkuKey(skuOption);
    return key.includes(queryKey) || queryKey.includes(key);
  });
}

function brandForCompetitorSku(sku: string): string {
  const key = compareSkuKey(sku);

  for (const [brand, skus] of Object.entries(COMPETITOR_SKU_SEED_CATALOG)) {
    const found = skus.some((candidateSku) => compareSkuKey(candidateSku) === key);

    if (found) {
      return brand;
    }
  }

  return "CUSTOM";
}

const handleSkuSelect = (sku: string): string => {
  return normalizeCompetitorSku(sku);
};

function runKnownProfileCompare(profile: CompetitorProfile): CompetitorProfile {
  return applyKnownCompareProfileOverrides(profile);
}

function applyCompareEquivalenceGuards(candidate: ScoredCandidate): ScoredCandidate {
  return candidate;
}

function applyKnownCompareProfileOverrides(profile: CompetitorProfile): CompetitorProfile {
  return profile;
}

function lookupCompareIntelligence(sku: string): Record<string, string> | null {
  const normalizedSku = normalizeCompetitorSku(sku);

  if (!normalizedSku) {
    return null;
  }

  return {
    sku: normalizedSku,
    brand: brandForCompetitorSku(normalizedSku),
  };
}

function shouldRequestLiveLookupUrl(profile: CompetitorProfile): boolean {
  return profile.sku.length > 0 && profile.knownProfile === null;
}

function isSelectableWyrestormRecommendation(candidate: WyreStormProduct | null | undefined): boolean {
  return Boolean(candidate?.sku);
}

const handleSubmit = (event?: { preventDefault?: () => void }): void => {
  event?.preventDefault?.();
};

function fallbackRetrySourceUrl(sourceUrl?: string): string {
  return sourceUrl ?? "";
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function extractTags(text: string): string[] {
  const tags: string[] = [];

  if (includesAny(text, ["AVOIP", "AV OVER IP", "IP350", "IP300", "IP250", "IP200", "OMNI", "NVX", "NAV", "ZYPER", "NETWORK"])) {
    tags.push("avoip");
  }

  if (includesAny(text, ["TX", "ENCODER", "TRANSMITTER", "SOURCE"])) {
    tags.push("encoder");
  }

  if (includesAny(text, ["RX", "DECODER", "RECEIVER", "DISPLAY"])) {
    tags.push("decoder");
  }

  if (includesAny(text, ["TRX", "TRANSCEIVER"])) {
    tags.push("transceiver");
  }

  if (includesAny(text, ["MATRIX", "8X8", "4X4", "16X16", "ROUTING"])) {
    tags.push("matrix");
  }

  if (includesAny(text, ["VIDEO WALL", "VIDEOWALL", "WALL"])) {
    tags.push("video wall");
  }

  if (includesAny(text, ["MULTIVIEW", "MULTI VIEW", "QUAD VIEW", "4 INPUT"])) {
    tags.push("multiview");
  }

  if (includesAny(text, ["USB", "UC", "BYOD", "BYOM", "CAMERA", "CONFERENCE"])) {
    tags.push("usb");
  }

  if (includesAny(text, ["HDBASET", "DTP", "HDBaseT".toUpperCase()])) {
    tags.push("hdbaset");
  }

  if (includesAny(text, ["4K60", "60HZ", "HDMI 2.0"])) {
    tags.push("4k60");
  }

  if (includesAny(text, ["4:4:4", "444"])) {
    tags.push("444");
  }

  if (includesAny(text, ["HDR"])) {
    tags.push("hdr");
  }

  if (includesAny(text, ["10G", "SDVOE", "ZERO LATENCY"])) {
    tags.push("10g");
  }

  return uniqueSkuOptions(tags);
}

function productClassFromTags(tags: string[]): string {
  if (tags.includes("video wall")) {
    return "Video wall";
  }

  if (tags.includes("multiview")) {
    return "Multiview";
  }

  if (tags.includes("matrix")) {
    return "Matrix";
  }

  if (tags.includes("avoip")) {
    return "AV-over-IP";
  }

  if (tags.includes("usb")) {
    return "Presentation switcher";
  }

  return "Unknown";
}

function roleFromTags(tags: string[]): string {
  if (tags.includes("transceiver")) {
    return "Transceiver";
  }

  if (tags.includes("encoder")) {
    return "Encoder / transmitter";
  }

  if (tags.includes("decoder")) {
    return "Decoder / receiver";
  }

  if (tags.includes("matrix") || tags.includes("usb")) {
    return "Switcher";
  }

  if (tags.includes("video wall") || tags.includes("multiview")) {
    return "Processor";
  }

  return "Unknown";
}

function transportFromTags(tags: string[]): string {
  if (tags.includes("10g")) {
    return "10GbE AVoIP";
  }

  if (tags.includes("avoip")) {
    return "1GbE AVoIP";
  }

  if (tags.includes("hdbaset")) {
    return "HDBaseT";
  }

  if (tags.includes("matrix") || tags.includes("video wall") || tags.includes("multiview")) {
    return "HDMI / processing";
  }

  return "Unknown";
}

function buildCompetitorProfile(brand: string, sku: string, description: string): CompetitorProfile {
  const normalizedSku = normalizeCompetitorSku(sku);
  const rawText = `${brand} ${normalizedSku} ${description}`.toUpperCase();
  const requestedTags = extractTags(rawText);
  const knownProfile = lookupCompareIntelligence(normalizedSku);

  return runKnownProfileCompare({
    brand,
    sku: normalizedSku,
    rawText,
    productClass: productClassFromTags(requestedTags),
    role: roleFromTags(requestedTags),
    transport: transportFromTags(requestedTags),
    requestedTags,
    videoTags: requestedTags.filter((tag) => ["4k60", "444", "hdr", "10g"].includes(tag)),
    knownProfile,
  });
}

function scoreProduct(profile: CompetitorProfile, product: WyreStormProduct): ScoredCandidate {
  let score = 12;
  const matched: string[] = [];
  const checks: string[] = [];
  const gaps: string[] = [];

  if (profile.productClass !== "Unknown" && product.productClass === profile.productClass) {
    score += 28;
    matched.push(`Same product class: ${product.productClass}`);
  }

  if (profile.role !== "Unknown" && product.role === profile.role) {
    score += 18;
    matched.push(`Same endpoint role: ${product.role}`);
  }

  if (profile.transport !== "Unknown" && product.transport.toUpperCase().includes(profile.transport.split(" ")[0].toUpperCase())) {
    score += 14;
    matched.push(`Similar transport direction: ${product.transport}`);
  }

  profile.requestedTags.forEach((tag) => {
    if (product.tags.includes(tag)) {
      score += 7;
      matched.push(`Matches requested feature: ${tag}`);
    }
  });

  profile.videoTags.forEach((tag) => {
    if (!product.tags.includes(tag)) {
      gaps.push(`Confirm video bandwidth requirement: ${tag}`);
    }
  });

  if (profile.productClass === "AV-over-IP" && product.productClass !== "AV-over-IP") {
    score -= 24;
    gaps.push("Competitor appears to be AVoIP but candidate is not an AVoIP endpoint.");
  }

  if (profile.role.includes("Encoder") && product.role.includes("Decoder")) {
    score -= 26;
    gaps.push("Competitor appears to be a transmitter/encoder but candidate is a receiver/decoder.");
  }

  if (profile.role.includes("Decoder") && product.role.includes("Encoder")) {
    score -= 26;
    gaps.push("Competitor appears to be a receiver/decoder but candidate is a transmitter/encoder.");
  }

  if (profile.productClass === "Video wall" && product.sku === "SW-0206-VW") {
    score += 18;
    matched.push("Dedicated non-AVoIP video wall processor considered.");
  }

  if (profile.productClass === "Multiview" && product.sku === "NHD-0401-MV") {
    score += 18;
    matched.push("Dedicated multiview processor considered.");
  }

  if (matched.length === 0) {
    gaps.push("No strong feature match from the entered data.");
  }

  checks.push(product.caveat);
  checks.push("Confirm mandatory features against current datasheets before quoting.");
  checks.push("Do not place competitor products in a WyreStorm BOM.");

  const boundedScore = Math.max(0, Math.min(100, score));
  const verdict: Verdict = boundedScore >= 72 ? "GOOD MATCH" : boundedScore >= 42 ? "PARTIAL MATCH" : "NO MATCH";

  return applyCompareEquivalenceGuards({
    product,
    score: boundedScore,
    verdict,
    matched: uniqueSkuOptions(matched),
    checks: uniqueSkuOptions(checks),
    gaps: uniqueSkuOptions(gaps),
  });
}

function findWyrestormProduct(sku: string): WyreStormProduct | undefined {
  const key = compareSkuKey(sku);
  return WYRESTORM_PRODUCTS.find((product) => compareSkuKey(product.sku) === key);
}

function synthAvoipProduct(sku: string): WyreStormProduct {
  const upper = sku.toUpperCase();

  return {
    sku,
    name: sku,
    family: "NetworkHD",
    productClass: "AV-over-IP",
    role: upper.endsWith("-RX")
      ? "Decoder / receiver"
      : upper.endsWith("-TX")
        ? "Encoder / transmitter"
        : "Transceiver",
    transport: "AVoIP",
    tags: ["avoip"],
    caveat: "Confirm the NHD-CTL-PRO-V2 controller and network/switch design before quoting.",
  };
}

// Truth-based AVoIP candidates: the competitor is mapped to exactly one NetworkHD
// series by network class + codec, the full role-appropriate family is offered,
// the wrong network class is never mixed in, and banned legacy SKUs never appear.
function buildAvoipCandidates(
  classification: CompetitorAvoipClassification,
  recommendation: NetworkHdAvoipRecommendation,
): ScoredCandidate[] {
  const networkNote = `Same network class: ${recommendation.networkClass.toUpperCase()}. 10G and 1G NetworkHD families are never mixed.`;
  const identityNote = classification.knownFamily
    ? `Competitor identified as ${classification.knownFamily}.`
    : `Detected endpoint role: ${classification.role}.`;
  const verifyGap = recommendation.verifyCodec
    ? ["Verify the competitor codec. Only drop to the NetworkHD 100 series if the competitor is confirmed as an H.264/H.265 lower-bandwidth workflow and the customer accepts that class of performance."]
    : [];

  return recommendation.candidateSkus
    .filter((sku) => !isBannedNetworkHdSku(sku))
    .map((sku, index) => {
      const product = findWyrestormProduct(sku) ?? synthAvoipProduct(sku);
      const isLead = index === 0;
      const score = recommendation.verifyCodec ? (isLead ? 70 : 60) : isLead ? 94 : 82;
      const verdict: Verdict = score >= 72 ? "GOOD MATCH" : score >= 42 ? "PARTIAL MATCH" : "NO MATCH";

      return {
        product,
        score,
        verdict,
        matched: uniqueSkuOptions([recommendation.reason, networkNote, identityNote]),
        checks: uniqueSkuOptions([
          recommendation.controllerReminder,
          product.caveat,
          "Confirm mandatory features against current datasheets before quoting.",
          "Do not place competitor products in a WyreStorm BOM.",
        ]),
        gaps: uniqueSkuOptions(verifyGap),
      };
    })
    .slice(0, 8);
}

function compareSummaryRoleLabel(
  classificationRole: CompetitorAvoipClassification["role"],
  fallbackRole: string,
): string {
  if (classificationRole === "encoder") {
    return "Encoder / transmitter";
  }

  if (classificationRole === "decoder") {
    return "Decoder / receiver";
  }

  if (classificationRole === "transceiver") {
    return "Transceiver";
  }

  if (fallbackRole && fallbackRole !== "Unknown") {
    return fallbackRole;
  }

  return "Needs confirmation";
}

function compareSummaryProductType(
  profile: CompetitorProfile,
  classification: CompetitorAvoipClassification,
): string {
  const roleLabel = compareSummaryRoleLabel(classification.role, profile.role);

  if (classification.isAvoip && roleLabel !== "Needs confirmation") {
    return `AV-over-IP ${roleLabel.toLowerCase()}`;
  }

  if (classification.isAvoip) {
    return "AV-over-IP endpoint";
  }

  if (profile.productClass && profile.productClass !== "Unknown") {
    return profile.productClass;
  }

  return "Needs confirmation";
}

function compareSummarySystemClass(
  profile: CompetitorProfile,
  classification: CompetitorAvoipClassification,
  recommendation: NetworkHdAvoipRecommendation,
): string {
  if (classification.isAvoip && recommendation.networkClass === "1g") {
    return "1GbE AV-over-IP endpoint";
  }

  if (classification.isAvoip && recommendation.networkClass === "10g") {
    return "10GbE / SDVoE AV-over-IP endpoint";
  }

  if (classification.isAvoip) {
    return "AV-over-IP endpoint - transport class needs confirmation";
  }

  if (profile.transport && profile.transport !== "Unknown") {
    return profile.transport;
  }

  return "Needs confirmation";
}

function compareSummaryRoleGate(
  classificationRole: CompetitorAvoipClassification["role"],
  fallbackRole: string,
): string {
  const roleLabel = compareSummaryRoleLabel(classificationRole, fallbackRole);

  if (roleLabel === "Encoder / transmitter") {
    return "The competitor SKU is identified as a transmitter / encoder, so WyreStorm receiver-only products should not be treated as equivalent alternatives. Receiver SKUs may still be required elsewhere in the system, but they are not the direct comparison for this competitor product.";
  }

  if (roleLabel === "Decoder / receiver") {
    return "The competitor SKU is identified as a receiver / decoder, so WyreStorm transmitter-only products should not be treated as equivalent alternatives. Transmitter SKUs may still be required elsewhere in the system, but they are not the direct comparison for this competitor product.";
  }

  if (roleLabel === "Transceiver") {
    return "The competitor product appears to be a transceiver, so WyreStorm transceiver or role-compatible endpoint options should be checked before positioning.";
  }

  return "The endpoint role is not confirmed. Confirm whether the competitor product sits at the source side, display side, or operates as a transceiver before quoting.";
}

function compareSummaryRequiredChecks(
  classification: CompetitorAvoipClassification,
): string[] {
  if (classification.isAvoip && classification.networkClass === "10g") {
    return [
      "Confirm codec/compression class.",
      "Confirm required video format, USB/KVM, audio and control requirements.",
      "Confirm 10GbE network switch design before quoting.",
    ];
  }

  return [
    "Confirm codec/compression class.",
    "Confirm required video format, USB/KVM, audio and control requirements.",
    "Confirm controller and network switch requirements before quoting.",
  ];
}
function verdictClass(verdict: Verdict): string {
  if (verdict === "GOOD MATCH") {
    return "is-good";
  }

  if (verdict === "PARTIAL MATCH") {
    return "is-partial";
  }

  return "is-no-match";
}

function CompareManufacturerCombobox(props: {
  brands: string[];
  selectedBrand: string;
  onBrandSelect: (brand: string) => void;
}) {
  return (
    <section className="wm-compare-brand-picker">
      <label>
        <span>Manufacturer</span>
        <input
          value={props.selectedBrand}
          onChange={(event) => props.onBrandSelect(event.target.value)}
          placeholder="Type competitor brand"
        />
      </label>

      <div className="wm-compare-brand-grid">
        {props.brands.map((brand) => (
          <button
            key={brand}
            type="button"
            className={brand === props.selectedBrand ? "is-active" : ""}
            onClick={() => props.onBrandSelect(brand)}
          >
            {brand}
          </button>
        ))}
      </div>
    </section>
  );
}

function CompareProductLookupInput(props: {
  value: string;
  knownSkus: string[];
  suggestions: string[];
  onInputChange: (value: string) => void;
  onSkuSelect: (sku: string) => void;
}) {
  return (
    <section className="wm-compare-sku-lookup">
      <label>
        <span>Competitor SKU</span>
        <input
          data-wingman-sku-normalisation="true"
          value={props.value}
          onChange={(event) => props.onInputChange(event.target.value)}
          placeholder="Type competitor SKU or select from the known list"
        />
      </label>

      <button type="button" className="wm-compare-custom-sku" onClick={() => props.onSkuSelect("CUSTOM / missing SKU")}>
        CUSTOM / missing SKU
      </button>

      {/* COMPARE_VISIBLE_BRAND_SKU_LIST_START */}
      <div className="wm-compare-known-sku-panel" data-wingman-known-brand-skus="true">
        <div className="wm-compare-known-sku-heading">Known SKUs for selected brand</div>

        {props.knownSkus.length > 0 ? (
          <div className="wm-compare-known-sku-grid">
            {props.knownSkus.map((skuOption) => (
              <button
                key={skuOption}
                type="button"
                className="wm-compare-known-sku-button"
                onClick={() => props.onSkuSelect(skuOption)}
              >
                {skuOption}
              </button>
            ))}
          </div>
        ) : (
          <div className="wm-compare-known-sku-empty">
            No known SKUs are currently stored for this brand. Use CUSTOM / missing SKU and describe the must-match features.
          </div>
        )}
      </div>
      {/* COMPARE_VISIBLE_BRAND_SKU_LIST_END */}

      {props.value.trim().length > 0 && props.suggestions.length > 0 ? (
        <div className="wm-compare-sku-suggestions">
          <span>Closest typed matches</span>
          <div>
            {props.suggestions.slice(0, 8).map((skuOption) => (
              <button key={skuOption} type="button" onClick={() => props.onSkuSelect(skuOption)}>
                {skuOption}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ComparePageNew() {
  const [selectedBrand, setSelectedBrand] = useState("Atlona");
  const [competitorInput, setCompetitorInput] = useState("");
  const [mustMatchFeatures, setMustMatchFeatures] = useState("");
  const [workflowStep, setWorkflowStep] = useState<"capture" | "options">("capture");
  const [hasCompared, setHasCompared] = useState(false);
  const [, setState] = useState<"capture" | "analyzing" | "results">("capture");
  const [customSkuStore, setCustomSkuStore] = useState<string[]>([]);

  // Pre-warm the force-cached product intelligence index so compare/spec flows
  // read it from cache instead of re-fetching the large index on demand.
  useEffect(() => {
    loadProductIntelligenceIndex().catch(() => {
      // Non-fatal: the built-in WyreStorm product set still drives comparison.
    });
  }, []);

  const effectiveBrand = selectedBrand || brandForCompetitorSku(competitorInput);
  const skuSuggestions = useMemo(() => compareSkuSuggestions(competitorInput, effectiveBrand), [competitorInput, effectiveBrand]);
  const knownBrandSkus = useMemo(() => skuOptionsForBrand(effectiveBrand, customSkuStore), [customSkuStore, effectiveBrand]);

  const profile = useMemo(
    () => buildCompetitorProfile(effectiveBrand, competitorInput, mustMatchFeatures),
    [competitorInput, effectiveBrand, mustMatchFeatures],
  );

  const avoipProfile = useMemo(() => mapCompetitorToNetworkHdAvoip(profile.rawText), [profile.rawText]); const scoredCandidates = useMemo(() => { const avoip = avoipProfile;

    if (avoip.recommendation.applies) {
      return buildAvoipCandidates(avoip.classification, avoip.recommendation);
    }

    return WYRESTORM_PRODUCTS
      .filter((product) => !isBannedNetworkHdSku(product.sku))
      .map((product) => scoreProduct(profile, product))
      .filter((candidate) => isSelectableWyrestormRecommendation(candidate.product))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [profile]);

  // COMPARE_CANDIDATE_GATE_HANDLER_START
  const handleSkuSelect = useCallback((sku: string): void => {
    const normalizedSku = normalizeCompetitorSku(sku);
    runKnownProfileCompare(buildCompetitorProfile(effectiveBrand, normalizedSku, mustMatchFeatures));

    setState("analyzing");
    setCompetitorInput(normalizedSku);

    const detectedBrand = brandForCompetitorSku(normalizedSku);

    if (detectedBrand !== "CUSTOM") {
      setSelectedBrand(detectedBrand);
    }

    setWorkflowStep("options");
    setState("results");
  }, [effectiveBrand, mustMatchFeatures]);

  const handleSubmit = useCallback((event?: { preventDefault?: () => void }): void => {
    event?.preventDefault?.();
    runKnownProfileCompare(profile);
    setWorkflowStep("options");
    runCompare();
  }, [profile]);

  const handleRetryWithSourceUrl = useCallback((sourceUrl?: string): string => {
    const lookupTarget = sourceUrl ?? competitorInput;
    lookupCompareIntelligence(lookupTarget);
    const retryInput = buildCompetitorProfile(effectiveBrand, lookupTarget, mustMatchFeatures);
    runKnownProfileCompare(retryInput);
    return sourceUrl ?? "";
  }, [competitorInput, effectiveBrand, mustMatchFeatures]);

  const handleReset = useCallback((): void => {
    resetCompare();
  }, []);
  // COMPARE_CANDIDATE_GATE_HANDLER_END
  const best = scoredCandidates[0] ?? null;
  const requestLiveLookup = shouldRequestLiveLookupUrl(profile);
  const sourceUrl = handleRetryWithSourceUrl("");

  const summary = useMemo(() => {
    if (!best) {
      return "No suitable WyreStorm direction found from the current data.";
    }

    const competitorLabel = `${effectiveBrand} ${competitorInput || "unspecified SKU"}`.trim();
    const detectedProductType = compareSummaryProductType(profile, avoipProfile.classification);
    const detectedSystemClass = compareSummarySystemClass(profile, avoipProfile.classification, avoipProfile.recommendation);
    const detectedRole = compareSummaryRoleLabel(avoipProfile.classification.role, profile.role);

    const roleNote =
      detectedRole === "Encoder / transmitter"
        ? "Compare against WyreStorm encoder / transmitter options. Receiver SKUs may still be needed in the system, but they are not the direct equivalent."
        : detectedRole === "Decoder / receiver"
          ? "Compare against WyreStorm decoder / receiver options. Transmitter SKUs may still be needed in the system, but they are not the direct equivalent."
          : "Confirm whether the competitor product is used at the source side, display side, or as a transceiver.";

    const simpleChecks = [
      "Confirm codec/compression class.",
      "Confirm video format, USB/KVM, audio and control requirements.",
      "Confirm controller and network switch requirements before quoting.",
    ];

    return [
      `Competitor: ${competitorLabel}`,
      `Detected: ${detectedProductType} - ${detectedSystemClass}`,
      `Nearest WyreStorm direction: ${best.product.sku} - ${best.product.name}`,
      `Match: ${best.verdict} (${Math.round(best.score)}%)`,
      "",
      "Why this fits",
      `- ${best.product.sku} is the closest WyreStorm starting point based on product role and system class.`,
      `- ${roleNote}`,
      "",
      "Check before quoting",
      ...simpleChecks.map((item) => `- ${item}`),
    ].join("\n");
  }, [avoipProfile, best, competitorInput, effectiveBrand, profile]);

  function onBrandSelect(brand: string): void {
    setSelectedBrand(brand);
    setWorkflowStep("options");
  }

  function onSkuSelect(sku: string): void {
    handleSkuSelect(sku);
  }

  function runCompare(): void {
    const normalizedSku = normalizeCompetitorSku(competitorInput);

    if (normalizedSku && !ALL_COMPETITOR_SKUS.includes(normalizedSku) && !customSkuStore.includes(normalizedSku)) {
      setCustomSkuStore((current) => uniqueSkuOptions([...current, normalizedSku]));
    }

    setHasCompared(true);
    setWorkflowStep("options");
  }

  function resetCompare(): void {
    setSelectedBrand("Atlona");
    setCompetitorInput("");
    setMustMatchFeatures("");
    setWorkflowStep("capture");
    setHasCompared(false);
    setCustomSkuStore([]);
  }

  async function copySummary(): Promise<void> {
    await navigator.clipboard.writeText(summary);
  }

  return (
    <main className="wm-compare-page" data-wingman-compare-decision-desk="true">
      <header className="wm-compare-header">
        <div>
          <p>Competitor Compare - {ROUTE_LOCK_MARKER}</p>
          <h1>Find the nearest WyreStorm product direction.</h1>
          <span>
            Select the competitor brand, choose a known SKU, or use CUSTOM for a missing model. Wingman ranks the closest WyreStorm direction and flags the gaps to check.
          </span>
        </div>

        <div className="wm-compare-header-actions">
          <button type="button" onClick={runCompare}>Run compare</button>
          <button type="button" onClick={handleReset}>Reset compare</button>
        </div>
      </header>

      <form className="wm-compare-form" onSubmit={handleSubmit} data-wingman-compare-auto-advance="true">
        <CompareManufacturerCombobox
          brands={MANUFACTURER_SELECT_OPTIONS}
          selectedBrand={selectedBrand}
          onBrandSelect={onBrandSelect}
        />

        <CompareProductLookupInput
          value={competitorInput}
          knownSkus={knownBrandSkus}
          suggestions={skuSuggestions}
          onInputChange={setCompetitorInput}
          onSkuSelect={onSkuSelect}
        />

        <label className="wm-compare-feature-input">
          <span>Known type or must-match features</span>
          <input
            value={mustMatchFeatures}
            onChange={(event) => setMustMatchFeatures(event.target.value)}
            placeholder="Example: AV-over-IP transmitter HDMI 2.0 4K60 4:4:4 HDR USB"
          />
        </label>

        <button type="submit" onClick={runCompare}>Run compare</button>

        <p className="wm-compare-auto-advance-note">
          Select a competitor SKU above to show WyreStorm options automatically. Typed entries can still use Enter.
        </p>
      </form>

      <section className="wm-compare-start-card">
        <h2>{workflowStep === "capture" ? "Start a new competitor comparison" : "Review WyreStorm product direction"}</h2>
        <p>
          Known SKUs for the selected brand are shown as clickable buttons. For missing models, enter the SKU manually and describe the required technology, I/O, video bandwidth, USB, audio, control or wall-processing features.
        </p>
      </section>

      {hasCompared ? (
        <section className="wm-compare-results">
          <article className="wm-compare-best">
            {best ? (
              <>
                <div className="wm-compare-verdict">
                  <span className={verdictClass(best.verdict)}>{best.verdict}</span>
                  <strong>{Math.round(best.score)}%</strong>
                </div>

                <div>
                  <p>Best WyreStorm candidate</p>
                  <h2>{best.product.sku}</h2>
                  <h3>{best.product.name}</h3>
                  <small>{best.product.family} - {best.product.productClass} - {best.product.role}</small>
                </div>

                <button type="button" onClick={copySummary}>Copy summary</button>
              </>
            ) : (
              <div className="wm-compare-no-result">
                No suitable WyreStorm match found from the current data
              </div>
            )}
          </article>

          <div className="wm-compare-options-strip">
            <h2>Other possible WyreStorm options</h2>
            <span>
              {scoredCandidates.length} option{scoredCandidates.length === 1 ? "" : "s"} ranked
            </span>
          </div>

          <div className="wm-compare-candidate-grid">
            {scoredCandidates.map((candidate) => (
              <article key={candidate.product.sku} className="wm-compare-candidate-card">
                <header>
                  <span>{candidate.product.family}</span>
                  <strong>{candidate.product.sku}</strong>
                  <em className={verdictClass(candidate.verdict)}>{candidate.verdict}</em>
                </header>

                <h3>{candidate.product.name}</h3>
                <p>{candidate.product.transport}</p>

                <div>
                  <strong>Why this fits</strong>
                  <ul>
                    {(candidate.matched.length > 0 ? candidate.matched : ["No strong fit evidence entered yet."]).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong>Check before quoting</strong>
                  <ul>
                    {candidate.checks.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                {candidate.gaps.length > 0 ? (
                  <div>
                    <strong>Check before quoting</strong>
                    <ul>
                      {candidate.gaps.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <aside className="wm-compare-summary">
            <h2>Summary</h2>
            <pre>{summary}</pre>

            {requestLiveLookup ? (
              <p>Live lookup recommended for source validation. {sourceUrl}</p>
            ) : null}
          </aside>
        </section>
      ) : null}
    </main>
  );
}

export default ComparePageNew;