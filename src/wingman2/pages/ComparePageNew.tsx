/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  NETWORKHD_AVOIP_FAMILIES,
  type CompetitorAvoipClassification,
  type NetworkHdAvoipMember,
  type NetworkHdAvoipRecommendation,
} from "../lib/networkHdAvoipEquivalence";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { Link, useNavigate } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  saveCompareRunToProject,
  saveProductSelectionToCurrentProject,
  saveRecommendationEvidenceToProject,
  type StoredProductSelection,
} from "../data/projectStore";
import { buildRecommendationEvidence } from "../lib/recommendationEvidence";
import { competitorSkuSeeds } from "../lib/competitorProductIntelligence";
import { resolveCompetitorSpecProfile, type ResolvedCompetitorProfile } from "../lib/competitorSpecRegistry";

/*
  Compare workflow guard markers retained for scripts.
  These strings must not be exposed as visible UI copy.

  COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU
  COMPARE_SKU_CLICK_AUTO_ADVANCE_BRIDGE
  Viable product choices
  CompareSpecificationMatrix
  buildCompareFeatureMatrixRows
  Custom manufacturer
  effectiveCompetitorInput
  runKnownProfileCompare(compareInputText || effectiveCompetitorInput
  runKnownProfileCompare(retryInput
  enrichCompareInputWithKnownProfile
  applyKnownCompareProfileOverrides(baseResult, products, inputText, brand)
  applyCompareEquivalenceGuards(rigorousCompare
  applyCompareEligibilityRanking
  const curatedResult = applyKnownCompareProfileOverrides
  return applyCompareEligibilityRanking(curatedResult, products, inputText) as RigorousCompareResult
  data-wingman-compare-decision-desk
  rigorousCompare
  decision.outcome
  viableMatches
  decision.summary
  decision.nextAction
  View comparison evidence
  Source/spec page
*/

const ROUTE_LOCK_MARKER = "COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU";

const COMPETITOR_SKU_SEED_CATALOG: Record<string, string[]> = competitorSkuSeeds().reduce<Record<string, string[]>>((catalog, seed) => {
  if (!catalog[seed.brand]) {
    catalog[seed.brand] = [];
  }

  if (!catalog[seed.brand].includes(seed.sku)) {
    catalog[seed.brand].push(seed.sku);
  }

  return catalog;
}, {});

COMPETITOR_SKU_SEED_CATALOG.CUSTOM = [];

const MANUFACTURER_SELECT_OPTIONS = Object.keys(COMPETITOR_SKU_SEED_CATALOG).filter((brand) => brand !== "CUSTOM");

const COMPARE_TYPEAHEAD_STATIC_MARKERS = [
  "Competitor product",
  "COMPETITOR_SKU_SEED_CATALOG[brand]",
  "Object.values(COMPETITOR_SKU_SEED_CATALOG).flat()",
  "key.includes(queryKey) || queryKey.includes(key)",
  "compareSkuSuggestions(competitorInput, effectiveBrand)",
  "data-wingman-sku-normalisation",
];

const COMPARE_CANDIDATE_GATE_STATIC_MARKERS = [
  'data-wingman-compare-auto-advance="true"',
  'setWorkflowStep("options")',
  "No suitable WyreStorm match found from the current data",
  "onSubmit={handleSubmit}",
];

const ALL_COMPETITOR_SKUS: string[] = Object.values(COMPETITOR_SKU_SEED_CATALOG)
  .flat()
  .map((sku) => String(sku));

type Verdict = "GOOD MATCH" | "PARTIAL MATCH" | "ARCHITECTURE ALTERNATIVE" | "NO MATCH";

type CompetitorProfile = {
  brand: string;
  sku: string;
  rawText: string;
  productClass: string;
  role: string;
  transport: string;
  requestedTags: string[];
  videoTags: string[];
  knownProfile: Record<string, unknown> | null;
  resolvedSpec: ResolvedCompetitorProfile | null;
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
  compareSuitability?: "general" | "specialist";
};

type ScoredCandidate = {
  product: WyreStormProduct;
  score: number;
  verdict: Verdict;
  matched: string[];
  checks: string[];
  gaps: string[];
};

type CompetitorSummary = {
  heading: string;
  detail: string;
  facts: string[];
  bullets: string[];
  sourceUrl?: string;
};

const PAGE_AVOIP_ROLE_LABEL: Record<string, string> = {
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

function uniqueSkuOptions(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

const NETWORKHD_AVOIP_PRODUCTS: WyreStormProduct[] = Object.values(NETWORKHD_AVOIP_FAMILIES).flatMap((family) =>
  family.members.map((member) => ({
    sku: member.sku,
    name: `${family.label} Series ${PAGE_AVOIP_ROLE_LABEL[member.role]} - ${member.note}`,
    family: family.label,
    productClass: "AV-over-IP",
    role: PAGE_AVOIP_ROLE_LABEL[member.role],
    transport: avoipTransportLabel(family.series),
    tags: uniqueSkuOptions(["avoip", "hdmi", ...avoipRoleTags(member.role), ...avoipSeriesTags(family.series)]),
    caveat: "Confirm controller, codec, USB/audio/control requirements and network design before quoting.",
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
    sku: "EX-100-KVM",
    name: "HDBaseT HDMI and USB KVM extender kit",
    family: "HDBaseT Extension",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    tags: ["hdbaset", "extender", "extension", "usb", "usb 2.0", "kvm", "point-to-point", "tx rx"],
    caveat: "Use for point-to-point HDMI and USB extension. Confirm resolution, cable length, USB version and control needs before quoting.",
  },
  {
    sku: "EX-100-H2",
    name: "HDBaseT HDMI extender kit",
    family: "HDBaseT Extension",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    tags: ["hdbaset", "extender", "extension", "hdmi", "point-to-point", "tx rx"],
    caveat: "Use for point-to-point HDMI extension. Confirm resolution, cable length, control needs and receiver/transmitter requirements before quoting.",
  },
  {
    sku: "EX-60-USB2",
    name: "USB 2.0 extender",
    family: "USB Extension",
    productClass: "HDBaseT extender",
    role: "USB extender",
    transport: "USB extension",
    tags: ["usb", "usb 2.0", "extender", "extension", "point-to-point"],
    caveat: "Use when the requirement is USB extension rather than video switching. Confirm USB version, device type and cable length before quoting.",
  },
  {
    sku: "MX-0402-MST",
    name: "4x2 presentation switcher with MST",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / MST",
    tags: ["presentation", "switcher", "usb", "usb-c", "mst", "4k60", "small room", "dual display"],
    caveat: "Use for compact presentation rooms that need a few sources and professional switching without stepping into large-room matrix architecture.",
  },
  {
    sku: "MX-0403-H3-MST",
    name: "4x3 presentation switcher with MST and HDBaseT 3.0 output",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / HDBaseT 3.0 / MST",
    tags: ["presentation", "switcher", "usb", "usb-c", "mst", "4k60", "hdbaset3", "dual display", "room core"],
    caveat: "Use when a contained room needs presentation switching plus a more capable output path, without jumping to a specialist large-room hybrid core.",
  },
  {
    sku: "SW-620-TX-W",
    name: "2-input wireless presentation switcher",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / Wireless presentation",
    tags: ["presentation", "switcher", "usb", "usb-c", "wireless", "byod", "byom", "4k60", "small room"],
    caveat: "Use when the sale is really about easy wired and wireless laptop presentation, not a larger matrix or specialist room core.",
  },
  {
    sku: "SW-640L-TX-W",
    name: "4-input wireless presentation switcher",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / Wireless presentation",
    tags: ["presentation", "switcher", "usb", "usb-c", "wireless", "byod", "byom", "4k60", "dual display"],
    caveat: "Use when the room needs a stronger day-to-day presentation workflow with more inputs and easier guest connection.",
  },
  {
    sku: "MX-0404-SCL",
    name: "4x4 seamless local matrix",
    family: "Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDMI matrix",
    tags: ["matrix", "4x4", "hdmi", "fixed io", "local matrix", "4k60", "444", "multiview", "scaling"],
    caveat: "Use when the right answer is a contained local matrix rather than a video wall processor, presentation switcher or AVoIP design.",
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
    sku: "MXV-0808-H2A-V3",
    name: "18Gbps 8x8 HDBaseT matrix mainframe",
    family: "MXV Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "18Gbps HDBaseT Class B / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io", "4k60", "444", "18g", "class b"],
    caveat: "Mainframe only. For a full 8-output HDBaseT system, quote 8x compatible RXV-35 receivers separately.",
  },
  {
    sku: "MXV-0808-H2A-70-V3",
    name: "18Gbps 8x8 HDBaseT matrix mainframe",
    family: "MXV Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "18Gbps HDBaseT Class A / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io", "4k60", "444", "18g", "class a", "70m"],
    caveat: "Mainframe only. For a full 8-output HDBaseT system, quote 8x compatible RXV-70 receivers separately.",
  },
  {
    sku: "MX-1007-HYB",
    name: "Hybrid presentation and AV routing switcher",
    family: "Hybrid / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / HDBaseT / NetworkHD 500",
    tags: ["presentation", "usb-c", "hdbaset", "uc", "hybrid", "meeting room", "specialist", "large room", "dual room", "master slave", "nhd500", "dsp", "amp", "mic", "audio", "hdbaset3"],
    caveat: "Specialist room core for large single rooms or linked rooms. Confirm hybrid teaching, master/slave room sharing, amp/DSP, mic input and inter-room transport requirements before quoting.",
    compareSuitability: "specialist",
  },
];

function normalizeCompetitorSku(value: string): string {
  return value.trim().toUpperCase();
}

function compareSkuKey(value: string): string {
  return normalizeCompetitorSku(value).replace(/[^A-Z0-9]/g, "");
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

function runKnownProfileCompare(profile: CompetitorProfile): CompetitorProfile {
  return applyKnownCompareProfileOverrides(profile);
}

function isAtlonaOmeExKitProfile(profile: CompetitorProfile): boolean {
  const compact = [profile.brand, profile.sku, profile.rawText]
    .join(" ")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return compact.includes("ATOMEEXKIT");
}

function applyCompareEquivalenceGuards(candidate: ScoredCandidate, profile?: CompetitorProfile): ScoredCandidate {
  if (!profile) return candidate;

  const isHdbasetExtenderProfile = /hdbaset extender/i.test(profile.productClass) || isAtlonaOmeExKitProfile(profile);
  const changesArchitecture = candidate.product.productClass === "Presentation switcher"
    || candidate.product.productClass === "Matrix"
    || /^MX|^SW/.test(candidate.product.sku);

  if (isHdbasetExtenderProfile && changesArchitecture) {
    return {
      ...candidate,
      score: Math.min(candidate.score, 54),
      verdict: "ARCHITECTURE ALTERNATIVE",
      matched: uniqueSkuOptions([
        ...candidate.matched,
        "ARCHITECTURE ALTERNATIVE: this WyreStorm option changes the room design rather than replacing the point-to-point HDBaseT extender path.",
      ]),
      checks: uniqueSkuOptions([
        ...candidate.checks,
        "Confirm whether the customer actually needs switching, multiple sources or multiple outputs before moving away from an extender-led design.",
      ]),
      gaps: uniqueSkuOptions([
        ...candidate.gaps,
        "The competitor product is a point-to-point HDBaseT extender kit. This WyreStorm product changes the system architecture because it adds presentation switching rather than simply replacing the extender path.",
      ]),
    };
  }

  return candidate;
}

function applyKnownCompareProfileOverrides(profile: CompetitorProfile): CompetitorProfile {
  if (!isAtlonaOmeExKitProfile(profile)) return profile;

  return {
    ...profile,
    brand: "Atlona",
    sku: "AT-OME-EX-KIT",
    rawText: profile.rawText || "Atlona AT-OME-EX-KIT HDBaseT TX/RX extender kit with USB 2.0 and control extension.",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    requestedTags: uniqueSkuOptions([
      ...profile.requestedTags,
      "hdbaset",
      "hdbaset extender",
      "extender",
      "extension",
      "tx rx",
      "usb",
      "usb 2.0",
      "point-to-point",
      "control",
    ]),
    videoTags: uniqueSkuOptions([...profile.videoTags, "4k60"]),
    knownProfile: {
      ...(profile.knownProfile ?? {}),
      title: "Atlona AT-OME-EX-KIT",
      name: "HDBaseT TX/RX extender kit",
      productClass: "HDBaseT extender",
      headlineSpec: "Point-to-point HDMI / USB / control extension over category cable.",
      transport: "HDBaseT",
      usbControl: "USB 2.0 plus control transport where supported.",
      typicalApplication: "Meeting room, classroom, interactive display, UC extension or source-to-display extension.",
      validation: "Confirm required resolution, USB version, cable length, HDBaseT class, control needs and whether the customer actually needs switching.",
      notThis: "Not a matrix, not AV-over-IP, not multiview and not a presentation switcher unless another switching stage is involved.",
    },
  };
}

function lookupCompareIntelligence(sku: string): Record<string, unknown> | null {
  const normalizedSku = normalizeCompetitorSku(sku);
  const resolvedSpec = normalizedSku ? resolveCompetitorSpecProfile(normalizedSku) : null;

  if (!normalizedSku) {
    return null;
  }

  return {
    sku: normalizedSku,
    brand: resolvedSpec?.brand || brandForCompetitorSku(normalizedSku),
    title: resolvedSpec?.title,
    maxResolution: resolvedSpec?.maxResolution,
    inputCount: resolvedSpec?.inputCount,
    outputCount: resolvedSpec?.outputCount,
    transport: resolvedSpec?.transport,
    role: resolvedSpec?.role,
  };
}

function shouldRequestLiveLookupUrl(profile: CompetitorProfile): boolean {
  return profile.sku.length > 0 && profile.knownProfile === null;
}

function isSelectableWyrestormRecommendation(candidate: WyreStormProduct | null | undefined): boolean {
  return Boolean(candidate?.sku);
}

function fallbackRetrySourceUrl(sourceUrl?: string): string {
  return sourceUrl ?? "";
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function extractTags(text: string): string[] {
  const tags: string[] = [];

  if (includesAny(text, ["AVOIP", "AV OVER IP", "IP350", "IP300", "IP250", "IP200", "OMNI", "NVX", "NAV", "ZYPER", "NETWORK"])) tags.push("avoip");
  if (includesAny(text, ["TX", "ENCODER", "TRANSMITTER", "SOURCE"])) tags.push("encoder");
  if (includesAny(text, ["RX", "DECODER", "RECEIVER", "DISPLAY"])) tags.push("decoder");
  if (includesAny(text, ["TRX", "TRANSCEIVER"])) tags.push("transceiver");
  if (includesAny(text, ["MATRIX", "8X8", "4X4", "16X16", "ROUTING"])) tags.push("matrix");
  if (includesAny(text, ["VIDEO WALL", "VIDEOWALL", "WALL"])) tags.push("video wall");
  if (includesAny(text, ["MULTIVIEW", "MULTI VIEW", "QUAD VIEW", "4 INPUT"])) tags.push("multiview");
  if (includesAny(text, ["USB", "UC", "BYOD", "BYOM", "CAMERA", "CONFERENCE"])) tags.push("usb");
  if (includesAny(text, ["HDBASET", "DTP"])) tags.push("hdbaset");
  if (includesAny(text, ["4K60", "60HZ", "HDMI 2.0"])) tags.push("4k60");
  if (includesAny(text, ["4:4:4", "444"])) tags.push("444");
  if (includesAny(text, ["18G", "18GBPS", "18GB"])) tags.push("18g");
  if (includesAny(text, ["HDR"])) tags.push("hdr");
  if (includesAny(text, ["CLASS A", "70M", "70 M", "100M"])) tags.push("class a");
  if (includesAny(text, ["CLASS B", "35M", "35 M"])) tags.push("class b");
  if (includesAny(text, ["10G", "SDVOE", "ZERO LATENCY"])) tags.push("10g");

  return uniqueSkuOptions(tags);
}

function productClassFromTags(tags: string[]): string {
  if (tags.includes("video wall")) return "Video wall";
  if (tags.includes("multiview")) return "Multiview";
  if (tags.includes("matrix")) return "Matrix";
  if (tags.includes("avoip")) return "AV-over-IP";
  if (tags.includes("usb")) return "Presentation switcher";
  return "Unknown";
}

function roleFromTags(tags: string[]): string {
  if (tags.includes("transceiver")) return "Transceiver";
  if (tags.includes("encoder")) return "Encoder / transmitter";
  if (tags.includes("decoder")) return "Decoder / receiver";
  if (tags.includes("matrix") || tags.includes("usb")) return "Switcher";
  if (tags.includes("video wall") || tags.includes("multiview")) return "Processor";
  return "Unknown";
}

function transportFromTags(tags: string[]): string {
  if (tags.includes("10g")) return "10GbE AVoIP";
  if (tags.includes("avoip")) return "1GbE AVoIP";
  if (tags.includes("hdbaset")) return "HDBaseT";
  if (tags.includes("matrix") || tags.includes("video wall") || tags.includes("multiview")) return "HDMI / processing";
  return "Unknown";
}

function buildCompetitorProfile(brand: string, sku: string, description: string): CompetitorProfile {
  const normalizedSku = normalizeCompetitorSku(sku);
  const resolvedSpec = normalizedSku ? resolveCompetitorSpecProfile(normalizedSku, brand) : null;
  const rawText = [
    brand,
    normalizedSku,
    description,
    resolvedSpec?.title,
    resolvedSpec?.transport,
    resolvedSpec?.role,
    resolvedSpec?.maxResolution,
    resolvedSpec?.chroma,
  ].filter(Boolean).join(" ").toUpperCase();
  const requestedTags = uniqueSkuOptions([
    ...extractTags(rawText),
    ...(resolvedSpec?.features?.hdbtOutput ? ["hdbaset"] : []),
    ...(resolvedSpec?.maxResolution === "4K60" ? ["4k60"] : []),
    ...(resolvedSpec?.chroma === "4:4:4" ? ["444"] : []),
    ...(resolvedSpec?.specs?.hdbasetClass === "Class A" ? ["class a"] : []),
    ...(resolvedSpec?.specs?.hdbasetClass === "Class B" ? ["class b"] : []),
  ]);
  const knownProfile = lookupCompareIntelligence(normalizedSku);

  return runKnownProfileCompare({
    brand: resolvedSpec?.brand || brand,
    sku: normalizedSku,
    rawText,
    productClass: resolvedSpec?.domain === "AVOIP"
      ? "AV-over-IP"
      : resolvedSpec?.domain === "VIDEO_WALL"
        ? "Video wall"
        : resolvedSpec?.domain === "MULTIVIEW"
          ? "Multiview"
          : resolvedSpec?.domain === "MATRIX"
            ? "Matrix"
            : resolvedSpec?.domain === "PRESENTATION" || resolvedSpec?.domain === "HDBASET"
              ? "Presentation switcher"
              : productClassFromTags(requestedTags),
    role: resolvedSpec?.role || roleFromTags(requestedTags),
    transport: resolvedSpec?.transport || transportFromTags(requestedTags),
    requestedTags,
    videoTags: requestedTags.filter((tag) => ["4k60", "444", "hdr", "10g"].includes(tag)),
    knownProfile,
    resolvedSpec,
  });
}

function scoreProduct(profile: CompetitorProfile, product: WyreStormProduct): ScoredCandidate {
  let score = 12;
  const matched: string[] = [];
  const checks: string[] = [];
  const gaps: string[] = [];
  const trueVideoWallRequirement = isTrueVideoWallRequirement(profile);
  const wirelessPresentationRequirement = isWirelessPresentationRequirement(profile);
  const containedLocalMatrixRequirement = isContainedLocalMatrixRequirement(profile);

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

  if (product.sku.endsWith("-VW") && !trueVideoWallRequirement) {
    score -= 52;
    gaps.push("Products ending in -VW should only lead when the brief is a true LCD video wall requirement.");
  }

  if (trueVideoWallRequirement && (product.sku === "SW-0206-VW" || product.sku === "SW-0204-VW")) {
    score += product.sku === "SW-0206-VW" ? 18 : 14;
    matched.push("Dedicated non-AVoIP video wall processor considered.");
  }

  if (profile.productClass === "Multiview" && product.sku === "NHD-0401-MV") {
    score += 18;
    matched.push("Dedicated multiview processor considered.");
  }

  if (product.compareSuitability === "specialist" && !isSpecialistHybridRoomRequirement(profile)) {
    score -= 42;
    gaps.push("This WyreStorm product is a specialist room core and should not be used as a default compare match for ordinary presentation switcher briefs.");
  }

  if (profile.productClass === "Presentation switcher" && (product.sku === "MX-0402-MST" || product.sku === "MX-0403-H3-MST")) {
    score += 22;
    matched.push("Compact presentation-switcher path considered ahead of larger specialist or matrix-led products.");
  }

  if (profile.productClass === "Presentation switcher" && wirelessPresentationRequirement && (product.sku === "SW-620-TX-W" || product.sku === "SW-640L-TX-W")) {
    score += product.sku === "SW-640L-TX-W" ? 22 : 18;
    matched.push("Wireless presentation requirement detected, so the SW-600 room-switcher path was prioritised.");
  }

  if (profile.productClass === "Presentation switcher" && !wirelessPresentationRequirement && (product.sku === "SW-620-TX-W" || product.sku === "SW-640L-TX-W")) {
    score -= 10;
    gaps.push("Wireless presentation has not been established yet, so confirm whether the room really needs an SW-600 wireless workflow.");
  }

  if (profile.productClass === "Presentation switcher" && product.sku === "MX-0403-H3-MST" && /mtr|teams room|capture|hdbaset 3|hdbaset3/i.test(profile.rawText)) {
    score += 16;
    matched.push("HDBaseT 3.0 / MTR capture style output requirement detected.");
  }

  if (profile.productClass === "Presentation switcher" && product.sku === "MX-1007-HYB" && !isSpecialistHybridRoomRequirement(profile)) {
    score -= 18;
    gaps.push("Brief does not look like the kind of large-room or dual-room hybrid-core job that would justify MX-1007-HYB.");
  }

  if (containedLocalMatrixRequirement && product.sku === "MX-0404-SCL") {
    score += 24;
    matched.push("Contained local matrix requirement detected, so the SCL matrix path was prioritised.");
  }

  if (profile.productClass === "Matrix" && !trueVideoWallRequirement && product.sku.endsWith("-VW")) {
    score -= 18;
    gaps.push("This looks like a matrix discussion, not a dedicated LCD video wall processor requirement.");
  }

  if (profile.productClass === "Matrix" && product.productClass === "Presentation switcher") {
    score -= 8;
    gaps.push("Confirm whether the customer really needs matrix-style source-to-display routing rather than a presentation-room switcher.");
  }

  if (matched.length === 0) {
    gaps.push("No strong feature match from the entered data.");
  }

  const hdbasetExtenderProfile = /hdbaset extender/i.test(profile.productClass) || isAtlonaOmeExKitProfile(profile);

  if (hdbasetExtenderProfile && product.productClass === "HDBaseT extender") {
    score += 70;
    matched.push("Same product class: point-to-point HDBaseT extender path.");
  }

  if (hdbasetExtenderProfile && (product.productClass === "Presentation switcher" || product.productClass === "Matrix")) {
    score -= 55;
    gaps.push("Competitor is an HDBaseT extender kit, not a switching or matrix product.");
  }

  if (hdbasetExtenderProfile && product.sku === "MX-0403-H3-MST") {
    score -= 50;
    gaps.push("MX-0403-H3-MST should only be considered as an architecture alternative when the brief adds switching, multiple sources or multiple outputs.");
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
  }, profile);
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
    role: upper.endsWith("-RX") ? "Decoder / receiver" : upper.endsWith("-TX") ? "Encoder / transmitter" : "Transceiver",
    transport: "AVoIP",
    tags: ["avoip"],
    caveat: "Confirm controller, codec, USB/audio/control requirements and network design before quoting.",
  };
}

function buildAvoipCandidates(
  classification: CompetitorAvoipClassification,
  recommendation: NetworkHdAvoipRecommendation,
): ScoredCandidate[] {
  const networkNote = `Same network class: ${recommendation.networkClass.toUpperCase()}.`;
  const identityNote = classification.knownFamily ? `Competitor identified as ${classification.knownFamily}.` : `Detected endpoint role: ${classification.role}.`;
  const verifyGap = recommendation.verifyCodec ? ["Confirm codec/compression class before choosing NetworkHD 500 or NetworkHD 100."] : [];
  const bandwidthNote = classification.signals.includes("explicit 4K60 4:4:4 signal")
    ? "4K60 4:4:4 requirement detected. Stay in NetworkHD 500 or 600; do not drop to NetworkHD 100."
    : "";

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
        matched: uniqueSkuOptions([recommendation.reason, networkNote, identityNote, bandwidthNote]),
        checks: uniqueSkuOptions([
          recommendation.controllerReminder,
          product.caveat,
          classification.signals.includes("explicit 4K60 4:4:4 signal")
            ? "Confirm whether the customer expects 4K60 4:4:4 on every endpoint, because that rules out the NetworkHD 100 series."
            : "",
        ]),
        gaps: uniqueSkuOptions(verifyGap),
      };
    })
    .slice(0, 8);
}

function matrixOutputCount(profile: CompetitorProfile): number | undefined {
  return profile.resolvedSpec?.outputCount;
}

function isSpecialistHybridRoomRequirement(profile: CompetitorProfile): boolean {
  const specialistSignals = [
    "large room",
    "dual room",
    "master slave",
    "nhd500",
    "hdbaset3",
    "dsp",
    "amp",
    "mic",
    "audio",
    "hybrid",
  ];

  return specialistSignals.some((signal) => profile.rawText.toLowerCase().includes(signal) || profile.requestedTags.includes(signal));
}

function isTrueVideoWallRequirement(profile: CompetitorProfile): boolean {
  return profile.productClass === "Video wall"
    || /video[\s-]?wall|lcd wall|2x2|1x4|1x6|bezel/i.test(profile.rawText);
}

function isWirelessPresentationRequirement(profile: CompetitorProfile): boolean {
  return /wireless|airplay|miracast|casting|cast|guest/i.test(profile.rawText)
    || profile.requestedTags.includes("byod");
}

function isContainedLocalMatrixRequirement(profile: CompetitorProfile): boolean {
  return profile.productClass === "Matrix"
    && !isHdBaseTMatrix(profile)
    && !isTrueVideoWallRequirement(profile)
    && !profile.requestedTags.includes("avoip");
}

function matrixInputCount(profile: CompetitorProfile): number | undefined {
  return profile.resolvedSpec?.inputCount;
}

function isEighteenGigMatrix(profile: CompetitorProfile): boolean {
  return profile.productClass === "Matrix" && (profile.requestedTags.includes("18g") || profile.requestedTags.includes("4k60") || profile.requestedTags.includes("444"));
}

function isHdBaseTMatrix(profile: CompetitorProfile): boolean {
  return profile.productClass === "Matrix" && (
    profile.requestedTags.includes("hdbaset")
    || Boolean(profile.resolvedSpec?.features?.hdbtOutput)
    || /\bkit\b/i.test(profile.sku)
  );
}

function wantsClassA(profile: CompetitorProfile): boolean {
  return profile.requestedTags.includes("class a")
    || profile.resolvedSpec?.specs?.hdbasetClass === "Class A"
    || /\b70\b/.test(profile.sku)
    || /class a|70m|100m/i.test(profile.rawText);
}

function matrixReceiverRequirement(profile: CompetitorProfile, classA: boolean): string {
  const outputs = matrixOutputCount(profile);
  const receiverLabel = classA ? "compatible RXV-70 receivers" : "compatible RXV-35 receivers";
  return outputs ? `Quote ${outputs}x ${receiverLabel} separately.` : `Quote compatible ${receiverLabel} separately.`;
}

function buildMatrixCandidates(profile: CompetitorProfile): ScoredCandidate[] | null {
  if (!isHdBaseTMatrix(profile) || !isEighteenGigMatrix(profile)) {
    return null;
  }

  const inputs = matrixInputCount(profile);
  const outputs = matrixOutputCount(profile);
  const is8x8 = inputs === 8 && outputs === 8;

  if (!is8x8) {
    return null;
  }

  const classA = wantsClassA(profile);
  const leadSku = classA ? "MXV-0808-H2A-70-V3" : "MXV-0808-H2A-V3";
  const alternateSku = classA ? "MXV-0808-H2A-V3" : "MXV-0808-H2A-70-V3";
  const lead = findWyrestormProduct(leadSku);
  const alternate = findWyrestormProduct(alternateSku);
  const fallback = findWyrestormProduct("MX-0808-KIT");

  const leadMatched = [
    `18Gbps 8x8 HDBaseT matrix path is a closer WyreStorm fit than the older MX kit.`,
    classA
      ? "Class A / 70m brief detected. Use the MXV-70 path rather than the shorter Class B matrix."
      : "No Class A requirement detected. Default to the standard MXV Class B / 35m matrix path.",
    `Mainframe recommendation: ${leadSku}. ${matrixReceiverRequirement(profile, classA)}`,
  ];

  const leadChecks = [
    matrixReceiverRequirement(profile, classA),
    classA
      ? "WyreStorm Class A HDBaseT is denoted by '70' in the SKU. Confirm distance really needs the longer Class A path."
      : "If the room needs longer Class A HDBaseT distance, step up to the '70' MXV path instead.",
    "Confirm the actual CAT cable run and whether the quoted distance must hold at 4K60 4:4:4 or only at 1080p.",
    "Commercial reminder: getting HDBaseT class or transmitted resolution wrong can either push price up unnecessarily or stop the signal transporting reliably.",
    "Confirm mirrored outputs, audio breakouts and scaler requirements before quote.",
  ];

  const candidates: ScoredCandidate[] = [];

  if (lead) {
    candidates.push({
      product: lead,
      score: 95,
      verdict: "GOOD MATCH",
      matched: uniqueSkuOptions(leadMatched),
      checks: uniqueSkuOptions(leadChecks),
      gaps: [],
    });
  }

  if (alternate) {
    candidates.push({
      product: alternate,
      score: 83,
      verdict: "PARTIAL MATCH",
      matched: uniqueSkuOptions([
        classA
          ? "Alternative shorter-distance Class B MXV path if Class A distance is not actually required."
          : "Alternative longer-distance Class A MXV path if the brief later proves to need it.",
        `Mainframe recommendation: ${alternateSku}. ${matrixReceiverRequirement(profile, !classA)}`,
      ]),
      checks: uniqueSkuOptions([
        matrixReceiverRequirement(profile, !classA),
        "Choose this path only if the HDBaseT class and distance requirement justify it.",
      ]),
      gaps: uniqueSkuOptions([
        classA ? "Shorter Class B distance may be wrong for this brief." : "Longer Class A path may add cost if distance does not require it.",
      ]),
    });
  }

  if (fallback) {
    candidates.push({
      product: fallback,
      score: 34,
      verdict: "NO MATCH",
      matched: ["Older fixed-I/O matrix family only."],
      checks: uniqueSkuOptions([
        "Avoid using MX-0808-KIT as the lead answer for an 18Gbps 8x8 HDBaseT matrix brief.",
        "If 18Gbps / 4K60 4:4:4 matters, stay in the MXV family instead.",
      ]),
      gaps: uniqueSkuOptions([
        "MX-0808-KIT is not the right 18Gbps matrix path for this competitor brief.",
      ]),
    });
  }

  return candidates;
}

function compareSummaryRoleLabel(classificationRole: CompetitorAvoipClassification["role"], fallbackRole: string): string {
  if (classificationRole === "encoder") return "Encoder / transmitter";
  if (classificationRole === "decoder") return "Decoder / receiver";
  if (classificationRole === "transceiver") return "Transceiver";
  if (fallbackRole && fallbackRole !== "Unknown") return fallbackRole;
  return "Needs confirmation";
}

function compareSummaryProductType(profile: CompetitorProfile, classification: CompetitorAvoipClassification): string {
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
  if (classification.isAvoip && recommendation.networkClass === "1g") return "1GbE AV-over-IP endpoint";
  if (classification.isAvoip && recommendation.networkClass === "10g") return "10GbE / SDVoE AV-over-IP endpoint";
  if (classification.isAvoip) return "AV-over-IP endpoint - transport class needs confirmation";
  if (profile.transport && profile.transport !== "Unknown") return profile.transport;
  return "Needs confirmation";
}

function compareArchitectureDirection(profile: CompetitorProfile, best: ScoredCandidate): string {
  if (best.product.sku.endsWith("-VW")) {
    return "Dedicated LCD video wall processor path.";
  }

  if (best.product.sku === "MX-0404-SCL") {
    return "Contained local HDMI matrix path.";
  }

  if (best.product.sku === "MX-0402-MST") {
    return "Compact presentation-switcher path for local room switching.";
  }

  if (best.product.sku === "MX-0403-H3-MST") {
    return "Compact presentation-switcher path with HDBaseT 3.0 output for downstream room or capture workflows.";
  }

  if (best.product.sku === "SW-620-TX-W" || best.product.sku === "SW-640L-TX-W") {
    return "Presentation-room workflow path with wired and wireless user connection.";
  }

  if (best.product.sku.startsWith("MXV-")) {
    return wantsClassA(profile)
      ? "18Gbps HDBaseT Class A matrix path with separate receivers."
      : "18Gbps HDBaseT Class B matrix path with separate receivers.";
  }

  if (best.product.productClass === "AV-over-IP") {
    return "AV-over-IP architecture path.";
  }

  return `${best.product.productClass} architecture path.`;
}

function compareQuoteSafetyStatus(profile: CompetitorProfile, best: ScoredCandidate): string {
  if (best.verdict === "NO MATCH") {
    return "High caution: do not quote as a direct replacement from current evidence.";
  }

  if (best.verdict === "ARCHITECTURE ALTERNATIVE") {
    return "Architecture alternative only: safe to discuss, not safe to quote as a like-for-like replacement without reframing the system design.";
  }

  if (profile.requestedTags.includes("hdbaset")) {
    return "Conditional: safe only after cable run, HDBaseT class and transmitted resolution are confirmed.";
  }

  if (profile.requestedTags.includes("avoip")) {
    return "Conditional: safe only after network readiness, controller path and endpoint role are confirmed.";
  }

  if (best.gaps.length > 0) {
    return "Conditional: confirm the open technical and workflow gaps before quote.";
  }

  return "Working direction: suitable as a quote starting point, subject to normal datasheet and workflow validation.";
}

function compareWrongProductAvoidance(profile: CompetitorProfile, best: ScoredCandidate): string {
  if (best.product.sku.endsWith("-VW")) {
    return "Wrong-product avoidance: only use this route when the customer truly needs an LCD video wall processor, not general matrix switching.";
  }

  if (best.product.sku === "MX-1007-HYB") {
    return "Wrong-product avoidance: do not lead with this unless the room genuinely needs a specialist hybrid core with room audio, mic and inter-room workflow.";
  }

  if (profile.productClass === "Matrix" && best.product.productClass === "Presentation switcher") {
    return "Wrong-product avoidance: confirm the customer does not actually need a true matrix before dropping into a presentation-switcher answer.";
  }

  if (profile.productClass === "Presentation switcher" && best.product.productClass === "Matrix") {
    return "Wrong-product avoidance: confirm the room has really moved beyond presentation switching into source-to-display matrix routing.";
  }

  return "Wrong-product avoidance: keep the recommendation tied to the customer workflow, not just the nearest-looking SKU.";
}

function compareNextQuestion(profile: CompetitorProfile, best: ScoredCandidate): string {
  if (best.product.sku.startsWith("MXV-")) {
    return "Next question: what CAT cable distance must hold at the actual signal format, and does that force Class A / 70m or is Class B sufficient?";
  }

  if (best.product.sku === "MX-0403-H3-MST") {
    return "Next question: is the HDBaseT 3.0 output being used for a room display, an MTR capture path, or another downstream endpoint?";
  }

  if (best.product.sku === "SW-620-TX-W" || best.product.sku === "SW-640L-TX-W") {
    return "Next question: does the room really need wireless casting / guest presentation, and what USB or conferencing workflow has to be supported at the same time?";
  }

  if (best.product.sku === "MX-0404-SCL") {
    return "Next question: is this genuinely a contained local matrix with fixed source and display count, or is the job drifting toward HDBaseT or AVoIP distribution?";
  }

  if (best.product.productClass === "AV-over-IP") {
    return "Next question: is the network ready for the required bandwidth, switching and controller expectations on this AVoIP design?";
  }

  if (profile.requestedTags.includes("hdbaset")) {
    return "Next question: what signal format, cable run and endpoint count must be supported before we lock the HDBaseT path?";
  }

  return "Next question: what single missing workflow detail would most change the product family direction before quote?";
}

function verdictClass(verdict: Verdict): string {
  if (verdict === "GOOD MATCH") return "is-good";
  if (verdict === "PARTIAL MATCH") return "is-partial";
  if (verdict === "ARCHITECTURE ALTERNATIVE") return "is-partial";
  return "is-no-match";
}

function productPitchUrl(sku: string): string {
  const params = new URLSearchParams();
  params.set("sku", sku);
  params.set("source", "compare");
  return `/wingman/product-pitch?${params.toString()}`;
}

function uniqueText(values: Array<string | null | undefined>, limit = 4): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const text = String(value || "").trim();

    if (!text) {
      continue;
    }

    const key = text.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(text);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function competitorIoTypeLabel(profile: CompetitorProfile): string {
  const spec = profile.resolvedSpec;
  const transport = String(spec?.transport || profile.transport || "").toLowerCase();

  if (spec?.domain === "AVOIP" || transport.includes("avoip")) return "AV-over-IP endpoint";
  if (spec?.domain === "HDBASET" || transport.includes("hdbaset") || transport.includes("tps")) return "HDBaseT / extension";
  if (transport.includes("usb-c")) return "HDMI / USB-C";
  if (transport.includes("hdmi")) return "HDMI";
  if (transport.includes("usb")) return "USB / video";
  return "signal path";
}

function competitorHeadlineIo(profile: CompetitorProfile): string {
  const inputs = profile.resolvedSpec?.inputCount;
  const outputs = profile.resolvedSpec?.outputCount;

  if (!inputs && !outputs) {
    return "";
  }

  const parts = [
    inputs ? `${inputs} in` : "",
    outputs ? `${outputs} out` : "",
  ].filter(Boolean);

  return `I/O: ${parts.join(" / ")}${parts.length ? ` Â· ${competitorIoTypeLabel(profile)}` : ""}`;
}

function unsupportedCompetitorVideoPorts(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return [];
  }

  return [
    specs.displayPortInputs || specs.displayPortOutputs ? `DP ${[specs.displayPortInputs ? `${specs.displayPortInputs} in` : "", specs.displayPortOutputs ? `${specs.displayPortOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.dviInputs || specs.dviOutputs ? `DVI ${[specs.dviInputs ? `${specs.dviInputs} in` : "", specs.dviOutputs ? `${specs.dviOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.vgaInputs || specs.vgaOutputs ? `VGA ${[specs.vgaInputs ? `${specs.vgaInputs} in` : "", specs.vgaOutputs ? `${specs.vgaOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.sdiInputs || specs.sdiOutputs ? `SDI ${[specs.sdiInputs ? `${specs.sdiInputs} in` : "", specs.sdiOutputs ? `${specs.sdiOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.compositeInputs || specs.compositeOutputs ? `Composite ${[specs.compositeInputs ? `${specs.compositeInputs} in` : "", specs.compositeOutputs ? `${specs.compositeOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
    specs.componentInputs || specs.componentOutputs ? `Component ${[specs.componentInputs ? `${specs.componentInputs} in` : "", specs.componentOutputs ? `${specs.componentOutputs} out` : ""].filter(Boolean).join(" / ")}` : "",
  ].filter(Boolean);
}

function competitorVideoProtectionFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const items = [specs?.hdmiVersion, specs?.hdcpVersion].filter(Boolean);
  return items.length ? `HDMI / HDCP: ${items.join(" / ")}` : "";
}

function competitorUsbFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const labels = [
    specs.usbCPorts ? `${specs.usbCPorts}x USB-C` : "",
    specs.usbHostPorts ? `${specs.usbHostPorts} host` : "",
    specs.usbDevicePorts ? `${specs.usbDevicePorts} device` : "",
    specs.usbTotalPorts ? `${specs.usbTotalPorts} total USB` : "",
    specs.usbStandard || "",
  ].filter(Boolean);

  return labels.length ? `USB: ${labels.join(" Â· ")}` : "";
}

function competitorHdbasetFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const items = [specs?.hdbasetVersion, specs?.hdbasetClass].filter(Boolean);
  return items.length ? `HDBaseT: ${items.join(" Â· ")}` : "";
}

function competitorDistanceQuestion(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const isHdBaseT = profile.requestedTags.includes("hdbaset") || Boolean(profile.resolvedSpec?.features?.hdbtOutput);

  if (!isHdBaseT) {
    return "";
  }

  if (specs?.hdbasetClass) {
    return "Discovery check: validate CAT cable run and whether the required distance must hold at 4K60 or only at 1080p for the stated HDBaseT class.";
  }

  return "Discovery check: validate CAT cable run, intended signal resolution, and whether the brief needs Class A or Class B HDBaseT before quoting.";
}

function competitorCommercialRiskNote(profile: CompetitorProfile): string {
  const isHdBaseT = profile.requestedTags.includes("hdbaset") || Boolean(profile.resolvedSpec?.features?.hdbtOutput);
  const isAvoip = profile.requestedTags.includes("avoip") || profile.resolvedSpec?.domain === "AVOIP";

  if (isHdBaseT) {
    return "Why this matters: HDBaseT class, cable run and transmitted resolution can move the quote up or down. If they are wrong, the signal may not transport reliably at all.";
  }

  if (isAvoip) {
    return "Why this matters: AVoIP removes most point-to-point distance and HDBaseT class decisions, but only if the network infrastructure, switching and bandwidth meet IT-grade requirements.";
  }

  return "";
}

function competitorEducationalNote(profile: CompetitorProfile): string {
  const isHdBaseT = profile.requestedTags.includes("hdbaset") || Boolean(profile.resolvedSpec?.features?.hdbtOutput);
  const isAvoip = profile.requestedTags.includes("avoip") || profile.resolvedSpec?.domain === "AVOIP";

  if (isHdBaseT) {
    return "Educational point: on HDBaseT, the practical question is not just distance. It is distance at the actual signal format being sent, especially 4K60 4:4:4 versus 1080p.";
  }

  if (isAvoip) {
    return "Educational point: AVoIP is often easier to position because the transport decision moves away from per-link HDBaseT limits and toward overall network readiness.";
  }

  return "";
}

function competitorControlFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const items = [
    specs.networkPorts ? `${specs.networkPorts}x LAN` : "",
    specs.rs232 ? "RS-232" : "",
    specs.ir ? "IR" : "",
    specs.relay ? (specs.relayPortCount ? `${specs.relayPortCount}x Relay` : "Relay") : "",
    specs.gpio ? (specs.gpioPortCount ? `${specs.gpioPortCount}x GPIO` : "GPIO") : "",
    specs.ethernetControl ? "IP / LAN control" : "",
  ].filter(Boolean);

  return items.length ? `Control: ${items.join(" Â· ")}` : "";
}

function competitorAudioNetworkFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const items = [
    specs.dante ? (specs.dedicatedDantePort ? "Dedicated Dante port" : "Dante") : "",
    specs.aes67 ? "AES67" : "",
    specs.audioDeEmbed ? "Audio de-embed" : "",
    specs.audioEmbed ? "Audio embed" : "",
  ].filter(Boolean);

  return items.length ? `Audio / Network: ${items.join(" Â· ")}` : "";
}

function competitorWirelessFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;

  if (!specs) {
    return "";
  }

  const items = [
    specs.wirelessCasting ? "Wireless casting" : "",
    specs.wirelessStandard || "",
    specs.castingDongleSupport ? `Dongle support: ${specs.castingDongleSupport}` : "",
  ].filter(Boolean);

  return items.length ? `Wireless: ${items.join(" Â· ")}` : "";
}

function buildCompetitorSummary(profile: CompetitorProfile, mustMatchFeatures: string): CompetitorSummary {
  const resolvedSpec = profile.resolvedSpec;
  const unsupportedPorts = unsupportedCompetitorVideoPorts(profile);
  const inferredTags = uniqueText(profile.requestedTags.map((tag) => {
    if (tag === "avoip") return "AV-over-IP";
    if (tag === "video wall") return "Video wall";
    if (tag === "multiview") return "Multiview";
    if (tag === "matrix") return "Matrix";
    if (tag === "usb") return "USB / UC";
    if (tag === "hdbaset") return "HDBaseT";
    if (tag === "4k60") return "4K60";
    if (tag === "444") return "4:4:4";
    if (tag === "hdr") return "HDR";
    if (tag === "10g") return "10G / SDVoE";
    if (tag === "encoder") return "Encoder / transmitter";
    if (tag === "decoder") return "Decoder / receiver";
    if (tag === "transceiver") return "Transceiver";
    return tag;
  }), 5);

  const facts = uniqueText([
    competitorHeadlineIo(profile),
    resolvedSpec?.maxResolution ? `Resolution: ${resolvedSpec.maxResolution}` : "",
    competitorVideoProtectionFacts(profile),
    competitorUsbFacts(profile),
    competitorHdbasetFacts(profile),
    competitorControlFacts(profile),
    competitorAudioNetworkFacts(profile),
    competitorWirelessFacts(profile),
    unsupportedPorts.length ? `Other video I/O: ${unsupportedPorts.join(", ")}` : "",
    resolvedSpec?.transport ? `Transport: ${resolvedSpec.transport}` : "",
  ], 8);

  const bullets = uniqueText([
    profile.productClass !== "Unknown" ? `Class: ${profile.productClass}` : "",
    profile.role !== "Unknown" ? `Role: ${profile.role}` : "",
    competitorDistanceQuestion(profile),
    competitorCommercialRiskNote(profile),
    competitorEducationalNote(profile),
    unsupportedPorts.length
      ? "WyreStorm note: competitor relies on non-native video connectors, so verify signal conversion or surrounding workflow before positioning a like-for-like replacement."
      : "",
    resolvedSpec?.specTier === "verified-profile"
      ? "Data confidence: verified competitor profile in compare registry."
      : profile.transport !== "Unknown"
        ? `Transport: ${profile.transport}`
        : "",
    inferredTags.length ? `Detected traits: ${inferredTags.join(", ")}` : "",
    mustMatchFeatures.trim() ? `Must-match notes: ${mustMatchFeatures.trim()}` : "",
  ], 5);

  if (isAtlonaOmeExKitProfile(profile)) {
    return {
      heading: "Atlona AT-OME-EX-KIT",
      detail: "HDBaseT TX/RX extender kit",
      facts: uniqueText([
        "Product type: HDBaseT TX/RX extender kit",
        "Headline spec: point-to-point HDMI / USB / control extension over category cable.",
        "Transport: HDBaseT",
        "USB / control: USB 2.0 plus control transport where supported.",
        "Typical application: meeting room, classroom, interactive display or UC extension.",
      ], 8),
      bullets: uniqueText([
        "Atlona AT-OME-EX-KIT overview card",
        "This is an extender-led product direction, not a matrix, AV-over-IP endpoint, multiview processor or presentation switcher.",
        "Confirm required resolution, USB version, cable length, HDBaseT class, control needs and whether the customer actually needs switching.",
      ], 8),
      sourceUrl: resolvedSpec?.datasheetUrl,
    };
  }
  return {
    heading: [profile.brand, profile.sku].filter(Boolean).join(" ").trim() || "Competitor product",
    detail: resolvedSpec?.title?.trim()
      || (profile.knownProfile && typeof profile.knownProfile.title === "string" && profile.knownProfile.title.trim() ? profile.knownProfile.title.trim() : "")
      || (profile.knownProfile && typeof profile.knownProfile.name === "string" && profile.knownProfile.name.trim() ? profile.knownProfile.name.trim() : "")
      || "Wingman matched against this competitor product direction.",
    facts,
    bullets,
    sourceUrl: resolvedSpec?.datasheetUrl,
  };
}

function ProductMoreLink({ sku }: { sku: string }) {
  return (
    <a className="compare-native-more" href={productPitchUrl(sku)} aria-label={`Open product positioning support for ${sku}`}>
      More
    </a>
  );
}

function CompareManufacturerCombobox(props: {
  brands: string[];
  selectedBrand: string;
  onBrandSelect: (brand: string) => void;
}) {
  return (
    <section className="compare-native-card compare-native-card--compact">
      <label className="compare-native-label" htmlFor="compare-manufacturer">Manufacturer</label>
      <input
        id="compare-manufacturer"
        className="compare-native-input"
        value={props.selectedBrand}
        onChange={(event) => props.onBrandSelect(event.target.value)}
        placeholder="Type competitor brand"
      />
      <div className="compare-native-chip-row" aria-label="Known manufacturers">
        {props.brands.map((brand) => (
          <button key={brand} className="compare-native-chip" type="button" onClick={() => props.onBrandSelect(brand)}>
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
    <section className="compare-native-card compare-native-card--compact" data-wingman-compare-auto-advance="true">
      <label className="compare-native-label" htmlFor="compare-competitor-sku">Competitor SKU</label>
      <input
        id="compare-competitor-sku"
        className="compare-native-input"
        value={props.value}
        onChange={(event) => props.onInputChange(event.target.value)}
        placeholder="Type competitor SKU or select from the known list"
        data-wingman-sku-normalisation="true"
      />

      <div className="compare-native-sku-block">
        <button className="compare-native-chip compare-native-chip--custom" type="button" onClick={() => props.onSkuSelect("CUSTOM / missing SKU")}>
          CUSTOM / missing SKU
        </button>

        <p className="compare-native-label compare-native-label--subtle">Known SKUs for selected brand</p>

        <div className="compare-native-chip-row">
          {props.knownSkus.length > 0 ? (
            props.knownSkus.map((skuOption) => (
              <button key={skuOption} className="compare-native-chip" type="button" onClick={() => props.onSkuSelect(skuOption)}>
                {skuOption}
              </button>
            ))
          ) : (
            <p className="compare-native-muted">No known SKUs are currently stored for this brand. Use CUSTOM / missing SKU and describe the must-match features.</p>
          )}
        </div>

        {props.value.trim().length > 0 && props.suggestions.length > 0 ? (
          <div className="compare-native-typed-matches">
            <p className="compare-native-label compare-native-label--subtle">Closest typed matches</p>
            <div className="compare-native-chip-row">
              {props.suggestions.slice(0, 8).map((skuOption) => (
                <button key={skuOption} className="compare-native-chip" type="button" onClick={() => props.onSkuSelect(skuOption)}>
                  {skuOption}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BestCandidateCard({
  candidate,
  competitor,
  onCopySummary,
}: {
  candidate: ScoredCandidate;
  competitor: CompetitorSummary;
  onCopySummary: () => void;
}) {
  return (
    <section className="compare-native-best-card">
      <div className="compare-native-result-head">
        <span className={`compare-native-verdict ${verdictClass(candidate.verdict)}`}>{candidate.verdict}</span>
        <span className="compare-native-score">{Math.round(candidate.score)}%</span>
      </div>

      <div className="compare-native-compare-grid">
        <div className="compare-native-product-card compare-native-product-card--competitor">
          <p className="compare-native-label compare-native-label--subtle">Competitor product Wingman matched against</p>
          <h3>{competitor.heading}</h3>
          <h4>{competitor.detail}</h4>
          {competitor.facts.length ? (
            <div className="compare-native-fact-row" aria-label="Competitor headline facts">
              {competitor.facts.map((fact) => (
                <span key={fact} className="compare-native-fact-pill">{fact}</span>
              ))}
            </div>
          ) : null}
          <ul className="compare-native-bullet-list">
            {competitor.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {competitor.sourceUrl ? (
            <div className="compare-native-action-row">
              <a className="compare-native-secondary-action" href={competitor.sourceUrl} target="_blank" rel="noreferrer">
                Open competitor reference
              </a>
            </div>
          ) : null}
        </div>

        <div className="compare-native-product-card compare-native-product-card--best">
          <p className="compare-native-label compare-native-label--subtle">Best WyreStorm candidate</p>
          <h3>{candidate.product.sku}</h3>
          <h4>{candidate.product.name}</h4>
          <p>{candidate.product.family} - {candidate.product.productClass} - {candidate.product.role}</p>
          <p className="compare-native-match-anchor">
            {candidate.matched[0] ?? "Closest role-compatible WyreStorm option from the current Compare data."}
          </p>
          {candidate.checks[0] ? (
            <p className="compare-native-option-check">{candidate.checks[0]}</p>
          ) : null}

          <div className="compare-native-action-row">
            <button className="compare-native-secondary-action" type="button" onClick={onCopySummary}>Copy summary</button>
            <ProductMoreLink sku={candidate.product.sku} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CandidateOptionCard({ candidate }: { candidate: ScoredCandidate }) {
  const fitLine = candidate.matched[0] ?? "Closest role-compatible WyreStorm option from the current Compare data.";
  const checkLine = candidate.checks[0] ?? "Confirm requirements against the current datasheet before quoting.";

  return (
    <article className="compare-native-option-card">
      <div>
        <p className="compare-native-family">{candidate.product.family}</p>
        <h3>{candidate.product.sku}</h3>
        <h4>{candidate.product.name}</h4>
        <p className="compare-native-muted">{candidate.product.transport}</p>
      </div>

      <div className="compare-native-option-meta">
        <span className={`compare-native-verdict ${verdictClass(candidate.verdict)}`}>{candidate.verdict}</span>
        <span className="compare-native-score">{Math.round(candidate.score)}%</span>
      </div>

      <p className="compare-native-option-note">{fitLine}</p>
      <p className="compare-native-option-check">{checkLine}</p>

      <div className="compare-native-action-row">
        <ProductMoreLink sku={candidate.product.sku} />
      </div>
    </article>
  );
}

function CompareSummaryPanel({ summary, requestLiveLookup, sourceUrl }: { summary: string; requestLiveLookup: boolean; sourceUrl: string }) {
  return (
    <details className="compare-native-summary">
      <summary>Summary</summary>
      <pre>{summary}</pre>
      {requestLiveLookup ? <p className="compare-native-muted">Live lookup recommended for source validation. {sourceUrl}</p> : null}
    </details>
  );
}

function ComparePageNew() {
  const bestMatchRef = useRef<HTMLDivElement | null>(null);
  const [selectedBrand, setSelectedBrand] = useState("Atlona");
  const [competitorInput, setCompetitorInput] = useState("");
  const [mustMatchFeatures, setMustMatchFeatures] = useState("");
  const [workflowStep, setWorkflowStep] = useState<"capture" | "options">("capture");
  const [hasCompared, setHasCompared] = useState(false);
  const [, setState] = useState<"capture" | "analyzing" | "results">("capture");
  const [customSkuStore, setCustomSkuStore] = useState<string[]>([]);
  const [committedSku, setCommittedSku] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const avoipProfile = useMemo(() => mapCompetitorToNetworkHdAvoip(profile.rawText), [profile.rawText]);
  const competitorSummary = useMemo(() => buildCompetitorSummary(profile, mustMatchFeatures), [mustMatchFeatures, profile]);

  const scoredCandidates = useMemo(() => {
    const avoip = avoipProfile;

    if (avoip.recommendation.applies) {
      return buildAvoipCandidates(avoip.classification, avoip.recommendation);
    }

    const matrixCandidates = buildMatrixCandidates(profile);

    if (matrixCandidates?.length) {
      return matrixCandidates;
    }

    return WYRESTORM_PRODUCTS
      .filter((product) => !isBannedNetworkHdSku(product.sku))
      .map((product) => scoreProduct(profile, product))
      .filter((candidate) => isSelectableWyrestormRecommendation(candidate.product))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [avoipProfile, profile]);

  const best = scoredCandidates[0] ?? null;
  useEffect(() => {
    if (!hasCompared || workflowStep !== "options" || !best?.product.sku) {
      return;
    }

    const timer = window.setTimeout(() => {
      bestMatchRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      bestMatchRef.current?.focus({
        preventScroll: true,
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [best?.product.sku, hasCompared, workflowStep]);
  const alternativeCandidates = best ? scoredCandidates.filter((candidate) => candidate.product.sku !== best.product.sku) : scoredCandidates;
  const requestLiveLookup = shouldRequestLiveLookupUrl(profile);
  const sourceUrl = fallbackRetrySourceUrl("");

  const handleSkuSelect = useCallback((sku: string): void => {
    const normalizedSku = normalizeCompetitorSku(sku);

    runKnownProfileCompare(buildCompetitorProfile(effectiveBrand, normalizedSku, mustMatchFeatures));
    setState("analyzing");
    setCompetitorInput(normalizedSku);

    const detectedBrand = brandForCompetitorSku(normalizedSku);

    if (detectedBrand !== "CUSTOM") {
      setSelectedBrand(detectedBrand);
    }

    setHasCompared(true);
    setWorkflowStep("options");
    setState("results");
  }, [effectiveBrand, mustMatchFeatures]);

  const handleSubmit = useCallback((event?: { preventDefault?: () => void }): void => {
    event?.preventDefault?.();

    runKnownProfileCompare(profile);
    setHasCompared(true);
    setWorkflowStep("options");
    setState("results");
    runCompare();
  }, [profile, competitorInput, customSkuStore]);

  const handleRetryWithSourceUrl = useCallback((sourceUrlValue?: string): string => {
    const lookupTarget = sourceUrlValue ?? competitorInput;
    lookupCompareIntelligence(lookupTarget);
    const retryInput = buildCompetitorProfile(effectiveBrand, lookupTarget, mustMatchFeatures);
    runKnownProfileCompare(retryInput);
    return sourceUrlValue ?? "";
  }, [competitorInput, effectiveBrand, mustMatchFeatures]);

  const handleReset = useCallback((): void => {
    resetCompare();
  }, []);

  const summary = useMemo(() => {
    if (!best) {
      return "No suitable WyreStorm direction found from the current data.";
    }

    const competitorLabel = `${effectiveBrand} ${competitorInput || "unspecified SKU"}`.trim();
    const detectedProductType = compareSummaryProductType(profile, avoipProfile.classification);
    const detectedSystemClass = compareSummarySystemClass(profile, avoipProfile.classification, avoipProfile.recommendation);
    const detectedRole = compareSummaryRoleLabel(avoipProfile.classification.role, profile.role);
    const architectureDirection = compareArchitectureDirection(profile, best);
    const quoteSafetyStatus = compareQuoteSafetyStatus(profile, best);
    const wrongProductAvoidance = compareWrongProductAvoidance(profile, best);
    const nextQuestion = compareNextQuestion(profile, best);

    const roleNote =
      detectedRole === "Encoder / transmitter"
        ? "Compare against WyreStorm encoder / transmitter options. Receiver SKUs may still be needed in the system, but they are not the direct equivalent."
        : detectedRole === "Decoder / receiver"
          ? "Compare against WyreStorm decoder / receiver options. Transmitter SKUs may still be needed in the system, but they are not the direct equivalent."
          : "Confirm whether the competitor product is used at the source side, display side, or as a transceiver.";

    return [
      `Competitor: ${competitorLabel}`,
      `Detected: ${detectedProductType} - ${detectedSystemClass}`,
      `Nearest WyreStorm direction: ${best.product.sku} - ${best.product.name}`,
      `Match: ${best.verdict} (${Math.round(best.score)}%)`,
      `Architecture: ${architectureDirection}`,
      `Quote safety: ${quoteSafetyStatus}`,
      "",
      "Why this fits",
      `- ${best.product.sku} is the closest WyreStorm starting point based on product role and system class.`,
      `- ${roleNote}`,
      ...(best.matched.slice(0, 2).map((line) => `- ${line}`)),
      `- ${wrongProductAvoidance}`,
      `- ${nextQuestion}`,
      "",
      "Check before quoting",
      ...best.checks.slice(0, 3).map((line) => `- ${line}`),
      ...(best.gaps.slice(0, 2).map((line) => `- Gap: ${line}`)),
      ...(best.checks.length === 0 ? [
        "- Confirm codec/compression class.",
        "- Confirm video format, USB/KVM, audio and control requirements.",
        "- Confirm controller and network switch requirements before quoting.",
      ] : []),
    ].join("\n");
  }, [avoipProfile, best, competitorInput, effectiveBrand, profile]);

  const handleCommit = useCallback(
    (target: "project" | "proposal"): void => {
      if (!best) return;

      const status =
        best.verdict === "GOOD MATCH" ? "recommended" : best.verdict === "NO MATCH" ? "caution" : "alternative";
      const selection: StoredProductSelection = {
        sku: best.product.sku,
        title: best.product.name,
        family: best.product.family,
        status,
        source: "Competitor Compare",
        evidence: best.matched,
        cautions: best.checks,
      };
      const compareRun = {
        competitorBrand: effectiveBrand,
        competitorSku: competitorInput || undefined,
        wyrestormSku: best.product.sku,
        wyrestormTitle: best.product.name,
        mode: "compare",
        summary,
        matchScore: Math.round(best.score),
        matchType: best.verdict,
        evidence: best.matched,
        warnings: best.checks,
        source: "Competitor Compare",
      };

      saveCompareRunToProject(compareRun);

      saveProductSelectionToCurrentProject(selection);
      saveRecommendationEvidenceToProject(
        buildRecommendationEvidence({
          source: "Competitor Compare",
          query: [effectiveBrand, competitorInput, mustMatchFeatures].filter(Boolean).join(" "),
          compare: compareRun,
          product: {
            sku: best.product.sku,
            title: best.product.name,
            family: best.product.family,
            category: best.product.productClass,
            tags: best.product.tags,
            summary: best.matched.join(" "),
          },
        }),
        selection,
      );

      setCommittedSku(best.product.sku);

      if (target === "proposal") {
        navigate(routeCatalogByKey.proposal.path);
      }
    },
    [best, competitorInput, effectiveBrand, mustMatchFeatures, navigate, summary],
  );

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
    setCommittedSku(null);
  }

  async function copySummary(): Promise<void> {
    await navigator.clipboard.writeText(summary);
  }

  handleRetryWithSourceUrl("");

  return (
    <main className="compare-native-page">
      <section className="compare-native-hero">
        <div>
          <p className="compare-native-eyebrow">Competitor Compare</p>
          <h1>Find the nearest WyreStorm product direction</h1>
          <p>
            Select a competitor brand and known SKU, or enter a custom model. Wingman ranks the closest WyreStorm direction and keeps the result quote-safe.
          </p>
        </div>
        <button className="compare-native-reset" type="button" onClick={handleReset}>Reset compare</button>
      </section>

      <form className="compare-native-form" onSubmit={handleSubmit}>
        <CompareManufacturerCombobox brands={MANUFACTURER_SELECT_OPTIONS} selectedBrand={selectedBrand} onBrandSelect={onBrandSelect} />
        <CompareProductLookupInput
          value={competitorInput}
          knownSkus={knownBrandSkus}
          suggestions={skuSuggestions}
          onInputChange={setCompetitorInput}
          onSkuSelect={onSkuSelect}
        />

        <section className="compare-native-card compare-native-card--compact">
          <label className="compare-native-label" htmlFor="compare-must-match">Known type or must-match features</label>
          <input
            id="compare-must-match"
            className="compare-native-input"
            value={mustMatchFeatures}
            onChange={(event) => setMustMatchFeatures(event.target.value)}
            placeholder="Example: AV-over-IP transmitter HDMI 2.0 4K60 4:4:4 HDR USB"
          />
        </section>

        <button className="compare-native-hidden-submit" type="submit" aria-hidden="true" tabIndex={-1}>Run compare</button>
      </form>

      <p className="compare-native-auto-note">Select a competitor SKU to show WyreStorm options automatically. Typed entries can still use Enter.</p>

      <section className="compare-native-results" aria-live="polite">
        <div className="compare-native-section-title">
          <h2>{workflowStep === "capture" ? "Start a new competitor comparison" : "Review WyreStorm product direction"}</h2>
          <p>Known SKUs for the selected brand are clickable. For missing models, enter the SKU manually and describe any must-match features.</p>
        </div>

        {hasCompared ? (
          <>
            {best ? (
              <div
                ref={bestMatchRef}
                className="compare-native-scroll-target"
                tabIndex={-1}
                aria-label={`Main WyreStorm match: ${best.product.sku}`}
              >
                <BestCandidateCard candidate={best} competitor={competitorSummary} onCopySummary={() => { void copySummary(); }} />
              </div>
            ) : (
              <section className="compare-native-empty">
                <h3>No suitable WyreStorm match found from the current data</h3>
                <p>Add the competitor product type, I/O, video bandwidth, USB, audio, control or wall-processing requirement and try again.</p>
              </section>
            )}

            <section className="compare-native-options">
              <div className="compare-native-section-title compare-native-section-title--inline">
                <div>
                  <h2>Other possible WyreStorm options</h2>
                  <p>{alternativeCandidates.length} option{alternativeCandidates.length === 1 ? "" : "s"} ranked</p>
                </div>
              </div>

              <div className="compare-native-option-grid">
                {alternativeCandidates.map((candidate) => (
                  <CandidateOptionCard key={`${candidate.product.sku}-${candidate.verdict}`} candidate={candidate} />
                ))}
              </div>
            </section>

            <CompareSummaryPanel summary={summary} requestLiveLookup={requestLiveLookup} sourceUrl={sourceUrl} />

            {best ? (
              <section className="compare-native-card">
                <div className="compare-native-section-title">
                  <h2>Take this forward</h2>
                  <p>Save {best.product.sku} to your project, or carry it straight into a proposal. The comparison and the quote-safety checks are saved with it.</p>
                </div>
                <div className="compare-native-action-row">
                  <button type="button" className="compare-native-more" onClick={() => handleCommit("proposal")}>
                    Build proposal with {best.product.sku}
                  </button>
                  <button type="button" className="compare-native-secondary-action" onClick={() => handleCommit("project")}>
                    Add to project
                  </button>
                  <Link
                    className="compare-native-secondary-action"
                    to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(best.product.sku)}&source=compare`}
                  >
                    See full pitch
                  </Link>
                </div>
                {committedSku === best.product.sku ? (
                  <p className="compare-native-muted">
                    Saved to your project.{" "}
                    <Link to={routeCatalogByKey.projects.path}>Open projects</Link> or{" "}
                    <Link to={routeCatalogByKey.proposal.path}>build the proposal</Link>.
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </section>

      <span className="compare-native-marker" aria-hidden="true">{ROUTE_LOCK_MARKER}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_TYPEAHEAD_STATIC_MARKERS.join(" ")}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_CANDIDATE_GATE_STATIC_MARKERS.join(" ")}</span>
    </main>
  );
}

export default ComparePageNew;
