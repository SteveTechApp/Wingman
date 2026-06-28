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
import { buildWyrestormCompareProfile } from "../lib/wyrestormCompareProfile";
import { findKnownWyrestormCompareProfile, hydrateWyrestormCompareProfile } from "../lib/knownWyrestormCompareProfiles";
import type { KnownWyrestormCompareProfile } from "../lib/knownWyrestormCompareProfiles";
import type { CompareSpecFacts } from "../lib/competitorCompareDecision";
import { isWyreStormSkuCompareLeadAllowed } from "../lib/wyrestormSkuBusinessStatus";
import { resolveWyrestormSkuAlias, skuAliasMatches } from "../lib/skuAliasResolver";

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
type CompareStage = "brand" | "sku" | "results";

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

function productClassFromResolvedDomain(domain?: string): string | null {
  switch ((domain || "").toUpperCase()) {
    case "AVOIP":
      return "AV-over-IP";
    case "AUDIO":
      return "Network audio";
    case "VIDEO_WALL":
      return "Video wall";
    case "MULTIVIEW":
      return "Multiview";
    case "MATRIX":
      return "Matrix";
    case "HDBASET":
      return "HDBaseT extender";
    case "PRESENTATION":
      return "Presentation switcher";
    case "WIRELESS_PRESENTATION":
      return "Wireless casting";
    case "NDI_CAMERA":
      return "NDI camera";
    case "PTZ_CAMERA":
      return "PTZ camera";
    case "WIRELESS_CASTING":
      return "Wireless casting";
    case "CONTROL":
      return "Control accessory";
    default:
      return null;
  }
}

type ScoredCandidate = {
  product: WyreStormProduct;
  score: number;
  verdict: Verdict;
  matched: string[];
  checks: string[];
  gaps: string[];
  partialMatches: string[];
  mismatches: string[];
  unknowns: string[];
  blockers: string[];
  dependencies: string[];
  outcomeLabel: string;
};

type CompetitorSummary = {
  heading: string;
  detail: string;
  recognisedClass: string;
  role: string;
  signalDirection: string;
  transport: string;
  resolution: string;
  ecosystem: string;
  facts: Array<{ label: string; value: string }>;
  identityItems: string[];
  knownFeatures: string[];
  unknownFeatures: string[];
  verifyItems: string[];
  outcomeLabel: string;
  warning: string;
  sourceUrl?: string;
};

type WyreStormSummary = {
  heading: string;
  detail: string;
  family: string;
  productType: string;
  role: string;
  signalDirection: string;
  transport: string;
  resolution: string;
  headlineIo: string;
  identityItems: string[];
  facts: Array<{ label: string; value: string }>;
  comparisonFacts: Array<{ label: string; value: string }>;
};

type CompareCoreFact = {
  label: string;
  competitor: string;
  wyrestorm: string;
  result: string;
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
    sku: "EX-70-H2",
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
    sku: "CAM-210-NDI-PTZ",
    name: "1080p60 NDI PTZ camera",
    family: "WyreStorm Cameras",
    productClass: "NDI camera",
    role: "NDI Camera",
    transport: "NDI / HDMI / USB",
    tags: ["camera", "ndi", "ndi camera", "ptz", "usb", "hdmi", "meeting room", "streaming"],
    caveat: "Use when the customer needs an actual NDI-capable PTZ camera rather than just video transport elsewhere in the system.",
  },
  {
    sku: "CAM-420-PTZ",
    name: "4K dual-lens AI PTZ camera",
    family: "WyreStorm Cameras",
    productClass: "PTZ camera",
    role: "PTZ Camera",
    transport: "HDMI / USB / IP",
    tags: ["camera", "ptz", "usb", "hdmi", "ip control", "tracking", "meeting room"],
    caveat: "Use when the customer needs a controllable room camera and the discussion is really about framing, placement and PTZ workflow.",
  },
  {
    sku: "CAM-0402-NDI-BRG",
    name: "4K multi-camera bridge with NDI",
    family: "WyreStorm Cameras",
    productClass: "Camera bridge",
    role: "Camera bridge",
    transport: "NDI / HDMI / USB",
    tags: ["camera", "bridge", "ndi", "usb", "hdmi", "multi-camera", "switching"],
    caveat: "Use only when the requirement is bridging or combining several camera feeds, not when the customer is simply asking for the camera itself.",
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
    sku: "MX-0808-KIT-V2",
    name: "8x8 HDMI/HDBaseT matrix kit",
    family: "Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDBaseT / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io"],
    caveat: "Good direction for contained fixed I/O systems. Confirm routed vs mirrored outputs.",
  },
  {
    sku: "MXV-0808-H2A-MK2",
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
      partialMatches: uniqueSkuOptions([
        ...candidate.partialMatches,
        "Useful only if the customer has moved from point-to-point extension into a switching-led room design.",
      ]),
      mismatches: uniqueSkuOptions([
        ...candidate.mismatches,
        "This is not a point-to-point extender like-for-like replacement.",
      ]),
      blockers: uniqueSkuOptions([
        ...candidate.blockers,
        "Architecture changes must be agreed before this can be quoted as the preferred path.",
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

  if (includesAny(text, [
    "AVOIP",
    "AV OVER IP",
    "AV-OVER-IP",
    "IP350UHD",
    "IP300UHD",
    "IP250UHD",
    "IP200UHD",
    "OMNISTREAM",
    "AT-OMNI",
    "DM-NVX",
    "DMNVX",
    "NAV E",
    "NAV D",
    "NAVE",
    "NAVD",
    "ZYPER",
    "MXNET",
    "JUST ADD POWER",
    "JAP",
    "SDVOE",
  ])) tags.push("avoip");
  if (includesAny(text, ["TX", "ENCODER", "TRANSMITTER", "SOURCE"])) tags.push("encoder");
  if (includesAny(text, ["RX", "DECODER", "RECEIVER", "DISPLAY"])) tags.push("decoder");
  if (includesAny(text, ["TRX", "TRANSCEIVER"])) tags.push("transceiver");
  if (includesAny(text, ["EXTENDER", "EXTENSION", "POINT-TO-POINT", "TX/RX KIT", "TX RX KIT", "TRANSMITTER RECEIVER"])) tags.push("extender");
  if (includesAny(text, ["MATRIX", "8X8", "4X4", "16X16", "MATRIX SWITCHER"])) tags.push("matrix");
  if (includesAny(text, ["VIDEO WALL", "VIDEOWALL", "WALL PROCESSOR", "LCD WALL", "LED WALL"])) tags.push("video wall");
  if (includesAny(text, ["MULTIVIEW", "MULTI VIEW", "QUAD VIEW", "4 INPUT"])) tags.push("multiview");
  if (includesAny(text, ["NDI", "BIRDDOG", "MARSHALL CV", "NDI CAMERA"])) tags.push("ndi camera");
  if (includesAny(text, ["PTZ", "VISCA", "PELCO", "BRC", "EVI", "SRG"])) tags.push("ptz camera");
  if (includesAny(text, ["CAMERA", "HUDDLY", "VADDIO", "RALLY BAR", "MEETUP", "BRIO", "WEBCAM"])) tags.push("camera");
  if (includesAny(text, ["WIRELESS", "CLICKSHARE", "SOLSTICE", "MERSIVE", "AIRTAME", "AIRPLAY", "MIRACAST", "CHROMECAST"])) tags.push("wireless casting");
  if (includesAny(text, ["SPEAKERPHONE", "SOUNDBAR", "VIDEO BAR", "CONFERENCING BAR", "USB CAMERA", "CONFERENCE CAMERA"])) tags.push("usb conferencing");
  if (includesAny(text, ["DANTE", "AES67", "AUDIO DSP", "NETWORK AUDIO", "Q-SYS", "QSYS", "TESIRA", "DEVIO", "AMPLIFIER", "AUDIO PROCESSOR"])) tags.push("network audio");
  if (includesAny(text, ["USB", "UC", "BYOD", "BYOM", "TEAMS", "ZOOM", "USB-C"])) tags.push("usb");
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
  if (tags.includes("ndi camera")) return "NDI camera";
  if (tags.includes("ptz camera")) return "PTZ camera";
  if (tags.includes("camera")) return "PTZ camera";
  if (tags.includes("usb conferencing")) return "USB conferencing";
  if (tags.includes("network audio")) return "Network audio";
  if (tags.includes("wireless casting")) return "Wireless casting";
  if (tags.includes("video wall")) return "Video wall";
  if (tags.includes("multiview")) return "Multiview";
  if (tags.includes("matrix")) return "Matrix";
  if (tags.includes("hdbaset") || tags.includes("extender")) return "HDBaseT extender";
  if (tags.includes("avoip")) return "AV-over-IP";
  if (tags.includes("usb")) return "Presentation switcher";
  return "Unknown";
}

function roleFromTags(tags: string[]): string {
  if (tags.includes("ndi camera")) return "NDI Camera";
  if (tags.includes("ptz camera")) return "PTZ Camera";
  if (tags.includes("camera")) return "Camera";
  if (tags.includes("usb conferencing")) return "Conference bar / USB conferencing";
  if (tags.includes("network audio")) return "Audio processor";
  if (tags.includes("wireless casting")) return "Wireless casting";
  if (tags.includes("transceiver")) return "Transceiver";
  if (tags.includes("extender") && tags.includes("usb")) return "USB extender";
  if (tags.includes("extender") || tags.includes("hdbaset")) return "TX/RX extender kit";
  if (tags.includes("encoder")) return "Encoder / transmitter";
  if (tags.includes("decoder")) return "Decoder / receiver";
  if (tags.includes("matrix")) return "Switcher";
  if (tags.includes("usb")) return "Switcher";
  if (tags.includes("video wall") || tags.includes("multiview")) return "Processor";
  return "Unknown";
}

function transportFromTags(tags: string[]): string {
  if (tags.includes("ndi camera")) return "NDI / HDMI";
  if (tags.includes("ptz camera")) return "HDMI / USB / IP";
  if (tags.includes("camera")) return "HDMI / USB / IP";
  if (tags.includes("usb conferencing")) return "USB / HDMI / network collaboration";
  if (tags.includes("network audio")) return "Dante / AES67 / network audio";
  if (tags.includes("wireless casting")) return "Wi-Fi / Ethernet";
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
    productClass: productClassFromResolvedDomain(resolvedSpec?.domain) || productClassFromTags(requestedTags),
    role: resolvedSpec?.domain === "HDBASET" && resolvedSpec?.features?.receiverKit
      ? "TX/RX extender kit"
      : resolvedSpec?.domain === "HDBASET" && resolvedSpec?.features?.usbRouting
        ? "USB extender"
        : resolvedSpec?.role || roleFromTags(requestedTags),
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
  const partialMatches: string[] = [];
  const mismatches: string[] = [];
  const unknowns: string[] = [];
  const blockers: string[] = [];
  const trueVideoWallRequirement = isTrueVideoWallRequirement(profile);
  const wirelessPresentationRequirement = isWirelessPresentationRequirement(profile);
  const containedLocalMatrixRequirement = isContainedLocalMatrixRequirement(profile);
  const ndiCameraRequirement = profile.productClass === "NDI camera";
  const ptzCameraRequirement = profile.productClass === "PTZ camera";
  const usbConferencingRequirement = profile.productClass === "USB conferencing";
  const networkAudioRequirement = profile.productClass === "Network audio";
  const wirelessCastingRequirement = profile.productClass === "Wireless casting";
  const competitorIo = buildCompetitorIoSnapshot(profile);
  const candidateIo = buildWyrestormIoSnapshot(product);
  const unresolvedAdditionalVideoFamilies = competitorIo.additionalVideoFamilies.filter(
    (family) => !competitorIo.waivedAdditionalVideoFamilies.includes(family),
  );

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
  } else if (profile.transport !== "Unknown") {
    partialMatches.push(`Transport differs: competitor points to ${profile.transport}, WyreStorm candidate is ${product.transport}.`);
  }

  profile.requestedTags.forEach((tag) => {
    if (product.tags.includes(tag)) {
      score += 7;
      matched.push(`Matches requested feature: ${tag}`);
    }
  });

  if (competitorIo.waivedAdditionalVideoFamilies.length > 0) {
    matched.push(`Additional competitor connectors excluded from this comparison: ${competitorIo.waivedAdditionalVideoFamilies.join(", ")}.`);
  }

  if (unresolvedAdditionalVideoFamilies.length > 0) {
    score -= 84;
    mismatches.push(`Competitor evidence includes ${unresolvedAdditionalVideoFamilies.join(", ")} connections outside the default HDMI / USB-C / HDBaseT comparison lane.`);
    blockers.push(`Confirm that ${unresolvedAdditionalVideoFamilies.join(", ")} are not required for this comparison before recommending a WyreStorm alternative.`);
    unknowns.push(`If ${unresolvedAdditionalVideoFamilies.join(", ")} stay in scope, reject this candidate rather than treating it as a valid match.`);
  }

  score += compareInputOutputFit(
    "input",
    competitorIo.inputCount,
    candidateIo.inputCount,
    matched,
    partialMatches,
    mismatches,
    blockers,
  );

  score += compareInputOutputFit(
    "output",
    competitorIo.outputCount,
    candidateIo.outputCount,
    matched,
    partialMatches,
    mismatches,
    blockers,
  );

  const missingInputFamilies = competitorIo.inputFamilies.filter((family) => !coversConnectorFamily(candidateIo.inputFamilies, family));
  const missingOutputFamilies = competitorIo.outputFamilies.filter((family) => !coversConnectorFamily(candidateIo.outputFamilies, family));

  if (missingInputFamilies.length > 0) {
    score -= 46;
    mismatches.push(`${product.sku} does not cover the competitor input connection type${missingInputFamilies.length === 1 ? "" : "s"}: ${missingInputFamilies.join(", ")}.`);
    blockers.push(`Do not recommend a product that drops required competitor input connection types.`);
  } else if (competitorIo.inputFamilies.length > 0) {
    score += 12;
    matched.push(`Required input connection types covered: ${competitorIo.inputFamilies.join(", ")}.`);
  }

  if (missingOutputFamilies.length > 0) {
    score -= 46;
    mismatches.push(`${product.sku} does not cover the competitor output connection type${missingOutputFamilies.length === 1 ? "" : "s"}: ${missingOutputFamilies.join(", ")}.`);
    blockers.push(`Do not recommend a product that drops required competitor output connection types.`);
  } else if (competitorIo.outputFamilies.length > 0) {
    score += 12;
    matched.push(`Required output connection types covered: ${competitorIo.outputFamilies.join(", ")}.`);
  }

  profile.videoTags.forEach((tag) => {
    if (!product.tags.includes(tag)) {
      gaps.push(`Confirm video bandwidth requirement: ${tag}`);
      unknowns.push(`Verify whether the competitor really requires ${tag} before treating this as like-for-like.`);
    }
  });

  if (profile.productClass === "AV-over-IP" && product.productClass !== "AV-over-IP") {
    score -= 24;
    gaps.push("Competitor appears to be AVoIP but candidate is not an AVoIP endpoint.");
    mismatches.push("Competitor architecture is AV-over-IP, but this WyreStorm product is not an AVoIP endpoint.");
    blockers.push("Do not quote this as a direct AVoIP replacement.");
  }

  if (usbConferencingRequirement && /Presentation switcher|PTZ camera/.test(product.productClass)) {
    score += product.productClass === "PTZ camera" ? 36 : 28;
    partialMatches.push(
      product.productClass === "PTZ camera"
        ? "This stays in the room-camera lane, but confirm whether the customer also needs the wider USB conferencing appliance."
        : "This supports meeting-room collaboration, but confirm whether the customer needs a conferencing bar/camera rather than source switching.",
    );
  } else if (usbConferencingRequirement && product.productClass === "AV-over-IP") {
    score -= 72;
    mismatches.push("This is AV-over-IP transport hardware, not a USB conferencing device.");
    blockers.push("Wrong product class for a conferencing-bar or USB-camera comparison.");
  }

  if (networkAudioRequirement && product.productClass === "AV-over-IP") {
    score -= 88;
    mismatches.push("This is network audio, not network video.");
    blockers.push("Wrong product class for an audio DSP / Dante comparison.");
  }

  if (ndiCameraRequirement && product.productClass === "NDI camera") {
    score += 82;
    matched.push("Same product class: NDI camera.");
    matched.push("Keeps the comparison in the real camera category instead of drifting into transport hardware.");
  }

  if (ptzCameraRequirement && product.productClass === "PTZ camera") {
    score += 78;
    matched.push("Same product class: PTZ camera.");
    matched.push("Keeps the comparison focused on the actual room-camera job.");
  }

  if (ndiCameraRequirement && product.productClass === "PTZ camera") {
    score += 22;
    partialMatches.push("This stays in camera territory, but it does not preserve the competitor's NDI-led workflow.");
    unknowns.push("Confirm whether the customer specifically needs NDI output or only a controllable PTZ camera.");
  }

  if (ptzCameraRequirement && product.productClass === "NDI camera") {
    score += 20;
    partialMatches.push("This stays in camera territory and adds NDI workflow value, but confirm whether NDI is actually required.");
  }

  if ((ndiCameraRequirement || ptzCameraRequirement) && product.productClass === "Camera bridge") {
    score -= 42;
    mismatches.push("This is a camera bridge / mixer path, not the camera itself.");
    blockers.push("Do not lead with a bridge when the competitor product is an actual camera.");
  }

  if (ndiCameraRequirement && !["NDI camera", "PTZ camera", "Camera bridge"].includes(product.productClass)) {
    score -= 88;
    mismatches.push("Competitor is an NDI camera, but this WyreStorm product is not a camera product.");
    blockers.push("Wrong product class for an NDI camera comparison.");
  }

  if (ptzCameraRequirement && !["PTZ camera", "NDI camera", "Camera bridge"].includes(product.productClass)) {
    score -= 84;
    mismatches.push("Competitor is a PTZ camera, but this WyreStorm product is not a camera product.");
    blockers.push("Wrong product class for a PTZ camera comparison.");
  }

  if (wirelessCastingRequirement && /wireless/i.test(product.transport)) {
    score += 34;
    matched.push("Wireless presentation / casting direction preserved.");
  } else if (wirelessCastingRequirement && product.productClass === "Presentation switcher") {
    score += 12;
    partialMatches.push("Presentation switching may help, but the competitor brief is specifically wireless-casting led.");
  } else if (wirelessCastingRequirement) {
    score -= 48;
    mismatches.push("Competitor is a wireless-casting product, but this WyreStorm candidate is not a wireless-casting path.");
  }

  if (profile.role.includes("Encoder") && product.role.includes("Decoder")) {
    score -= 26;
    gaps.push("Competitor appears to be a transmitter/encoder but candidate is a receiver/decoder.");
    mismatches.push("Competitor is source-side / encoder-led, but this candidate sits at the display-side / decoder end.");
    blockers.push("Wrong endpoint direction for a direct replacement.");
  }

  if (profile.role.includes("Decoder") && product.role.includes("Encoder")) {
    score -= 26;
    gaps.push("Competitor appears to be a receiver/decoder but candidate is a transmitter/encoder.");
    mismatches.push("Competitor is display-side / decoder-led, but this candidate sits at the source-side / encoder end.");
    blockers.push("Wrong endpoint direction for a direct replacement.");
  }

  if (profile.productClass === "Matrix" && product.productClass === "HDBaseT extender") {
    score -= 42;
    mismatches.push("This is a matrix-style routing product, not a point-to-point extender.");
    blockers.push("Do not replace a routed matrix requirement with an extender-led answer.");
  }

  if (profile.productClass === "HDBaseT extender" && product.productClass === "Matrix") {
    score -= 42;
    mismatches.push("This is a point-to-point extender requirement, not a matrix-style routing product.");
    blockers.push("Do not replace a point-to-point extender requirement with a matrix-led answer.");
  }

  if (product.sku.endsWith("-VW") && !trueVideoWallRequirement) {
    score -= 52;
    gaps.push("Products ending in -VW should only lead when the brief is a true LCD video wall requirement.");
    mismatches.push("This is a dedicated video-wall processor path, but the current brief does not prove a true LCD video-wall requirement.");
    blockers.push("Do not lead with a -VW product unless the job is genuinely a video wall.");
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
    mismatches.push("This is a specialist large-room / dual-room core, not a normal default compare answer.");
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
    unknowns.push("Wireless presentation benefit is not yet evidenced from the competitor brief.");
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
    partialMatches.push("This could help functionally if the room is really presentation-led, but it is not the same matrix architecture by default.");
  }

  if (matched.length === 0) {
    gaps.push("No strong feature match from the entered data.");
    unknowns.push("The current competitor evidence does not yet prove a strong like-for-like fit.");
  }

  const hdbasetExtenderProfile = /hdbaset extender/i.test(profile.productClass) || isAtlonaOmeExKitProfile(profile);

  if (hdbasetExtenderProfile && product.productClass === "HDBaseT extender") {
    score += 70;
    matched.push("Same product class: point-to-point HDBaseT extender path.");
    matched.push("Preserves point-to-point extension architecture instead of forcing switching or matrix logic.");
  }

  if (hdbasetExtenderProfile && (product.productClass === "Presentation switcher" || product.productClass === "Matrix")) {
    score -= 55;
    gaps.push("Competitor is an HDBaseT extender kit, not a switching or matrix product.");
    mismatches.push("This changes the architecture from point-to-point extension into switching/routing.");
    blockers.push("Only discuss this as an architecture alternative, not a direct replacement.");
  }

  if (hdbasetExtenderProfile && product.sku === "MX-0403-H3-MST") {
    score -= 50;
    gaps.push("MX-0403-H3-MST should only be considered as an architecture alternative when the brief adds switching, multiple sources or multiple outputs.");
    blockers.push("Do not lead with MX-0403-H3-MST unless the customer has moved beyond a simple extender brief.");
  }
  checks.push(product.caveat);
  checks.push("Confirm mandatory features against current datasheets before quoting.");
  checks.push("Do not place competitor products in a WyreStorm BOM.");
  unknowns.push(...compareUnknownFeatureSummary(profile).slice(0, 4));

  const boundedScore = Math.max(0, Math.min(100, score));
  const verdict: Verdict = boundedScore >= 72 ? "GOOD MATCH" : boundedScore >= 42 ? "PARTIAL MATCH" : "NO MATCH";
  const requiredDependencies = candidateRequiredDependencies(product, profile);

  const candidate = applyCompareEquivalenceGuards({
    product,
    score: boundedScore,
    verdict,
    matched: uniqueSkuOptions(matched),
    checks: uniqueSkuOptions(checks),
    gaps: uniqueSkuOptions(gaps),
    partialMatches: uniqueSkuOptions(partialMatches),
    mismatches: uniqueSkuOptions(mismatches),
    unknowns: uniqueSkuOptions(unknowns),
    blockers: uniqueSkuOptions(blockers),
    dependencies: uniqueSkuOptions(requiredDependencies),
    outcomeLabel: "Feature check needed",
  }, profile);

  return {
    ...candidate,
    outcomeLabel: plainLanguageOutcome(profile, candidate),
  };
}

function findWyrestormProduct(sku: string): WyreStormProduct | undefined {
  const canonicalSku = resolveWyrestormSkuAlias(sku);
  const key = compareSkuKey(canonicalSku);
  return WYRESTORM_PRODUCTS.find((product) => compareSkuKey(product.sku) === key || skuAliasMatches(product.sku, canonicalSku));
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

function avoipCandidateSpecificEvidence(product: WyreStormProduct): {
  matched: string[];
  partial: string[];
  mismatches: string[];
  unknowns: string[];
  dependencies: string[];
} {
  const upper = product.sku.toUpperCase();

  if (upper === "NHD-500-TX") {
    return {
      matched: [
        "Standard NetworkHD 500 source-side encoder path.",
        "Fits the 1GbE visually-lossless / 4K60 4:4:4 WyreStorm AVoIP lane.",
      ],
      partial: [],
      mismatches: [],
      unknowns: ["Verify whether the competitor also expects USB, audio-network or wall-plate behaviour beyond the base encoder role."],
      dependencies: [
        "Specify one NHD-CTL-PRO-V2 controller per system unless the site already has one.",
        "Quote matching decoder endpoints separately for the display side.",
      ],
    };
  }

  if (upper === "NHD-500-E-TX") {
    return {
      matched: [
        "Same NetworkHD 500 encoder family and same source-side AVoIP role.",
        "Useful when the brief only needs a simpler encoder endpoint rather than a richer feature set.",
      ],
      partial: ["This is a lighter NetworkHD 500 encoder path, so confirm that no additional endpoint features are expected."],
      mismatches: [],
      unknowns: ["Verify whether the competitor endpoint expects any feature beyond the lighter encoder role before using this as the lead answer."],
      dependencies: [
        "Specify one NHD-CTL-PRO-V2 controller per system unless the site already has one.",
        "Quote matching decoder endpoints separately for the display side.",
      ],
    };
  }

  if (upper === "NHD-510-TX") {
    return {
      matched: [
        "Same NetworkHD 500 source-side encoder architecture.",
        "Only makes commercial sense when the competitor brief points toward Dante / network-audio workflow value.",
      ],
      partial: ["This is the stronger audio-network encoder option, so it is only a better fit if Dante-style audio handling matters."],
      mismatches: [],
      unknowns: ["Verify whether the competitor sale actually includes Dante / audio-network expectations before leading with NHD-510-TX."],
      dependencies: [
        "Specify one NHD-CTL-PRO-V2 controller per system unless the site already has one.",
        "Quote matching decoder endpoints separately for the display side.",
        "Confirm the audio-network design and who owns Dante configuration before quoting.",
      ],
    };
  }

  if (upper.includes("-IW-")) {
    return {
      matched: ["Same AVoIP endpoint direction with an in-wall installation form factor."],
      partial: ["Only a better fit if the physical wall-plate format is actually required."],
      mismatches: [],
      unknowns: ["Verify whether the project truly needs an in-wall endpoint rather than a standard chassis."],
      dependencies: [],
    };
  }

  return {
    matched: [product.name],
    partial: [],
    mismatches: [],
    unknowns: ["Verify endpoint feature detail before quoting."],
    dependencies: [],
  };
}

function buildAvoipCandidates(
  profile: CompetitorProfile,
  classification: CompetitorAvoipClassification,
  recommendation: NetworkHdAvoipRecommendation,
): ScoredCandidate[] {
  const networkNote = `Same network class: ${recommendation.networkClass.toUpperCase()}.`;
  const identityNote = classification.knownFamily ? `Competitor identified as ${classification.knownFamily}.` : `Detected endpoint role: ${classification.role}.`;
  const verifyGap = recommendation.verifyCodec ? ["Confirm the video transport method before choosing between NetworkHD 500 and NetworkHD 100."] : [];
  const bandwidthNote = classification.signals.includes("explicit 4K60 4:4:4 signal")
    ? "4K60 4:4:4 requirement detected. Stay in NetworkHD 500 or 600; do not drop to NetworkHD 100."
    : "";

  return recommendation.candidateSkus
    .filter((sku) => !isBannedNetworkHdSku(sku))
    .map((sku, index) => {
      const product = findWyrestormProduct(sku) ?? synthAvoipProduct(sku);
      const specific = avoipCandidateSpecificEvidence(product);
      const isLead = index === 0;
      const score = recommendation.verifyCodec ? (isLead ? 70 : 60) : isLead ? 94 : 82;
      const verdict: Verdict = score >= 72 ? "GOOD MATCH" : score >= 42 ? "PARTIAL MATCH" : "NO MATCH";

      const candidate: ScoredCandidate = {
        product,
        score,
        verdict,
        matched: uniqueSkuOptions([recommendation.reason, networkNote, identityNote, bandwidthNote, ...specific.matched]),
        checks: uniqueSkuOptions([
          recommendation.controllerReminder,
          product.caveat,
          classification.signals.includes("explicit 4K60 4:4:4 signal")
            ? "Confirm whether the customer expects 4K60 4:4:4 on every endpoint, because that rules out the NetworkHD 100 series."
            : "",
        ]),
        gaps: uniqueSkuOptions(verifyGap),
        partialMatches: uniqueSkuOptions(specific.partial),
        mismatches: uniqueSkuOptions(specific.mismatches),
        unknowns: uniqueSkuOptions([
          ...specific.unknowns,
          recommendation.verifyCodec ? "Competitor video transport method is not proven from local evidence." : "",
          "Verify USB, audio, control and any non-video feature expectations before quoting.",
        ]),
        blockers: uniqueSkuOptions([
          classification.role === "encoder" && product.role.includes("Decoder") ? "Wrong endpoint direction for a direct replacement." : "",
          classification.role === "decoder" && product.role.includes("Encoder") ? "Wrong endpoint direction for a direct replacement." : "",
        ]),
        dependencies: uniqueSkuOptions([
          ...specific.dependencies,
          recommendation.controllerReminder,
          ...candidateRequiredDependencies(product, profile),
        ]),
        outcomeLabel: "Feature check needed",
      };

      return {
        ...candidate,
        outcomeLabel: plainLanguageOutcome(profile, candidate),
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
  const leadSku = classA ? "MXV-0808-H2A-70-V3" : "MXV-0808-H2A-MK2";
  const alternateSku = classA ? "MXV-0808-H2A-MK2" : "MXV-0808-H2A-70-V3";
  const lead = findWyrestormProduct(leadSku);
  const alternate = findWyrestormProduct(alternateSku);
  const fallback = findWyrestormProduct("MX-0808-KIT-V2");

  const leadMatched = [
        `18Gbps 8x8 HDBaseT matrix path is a closer WyreStorm fit than the kit-style MX matrix path.`,
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
    const leadCandidate: ScoredCandidate = {
      product: lead,
      score: 95,
      verdict: "GOOD MATCH",
      matched: uniqueSkuOptions(leadMatched),
      checks: uniqueSkuOptions(leadChecks),
      gaps: [],
      partialMatches: [],
      mismatches: [],
      unknowns: uniqueSkuOptions([
        "Verify HDMI version, HDCP version and control behaviour before quoting.",
        "Verify whether every destination really needs HDBaseT and at what resolution over distance.",
      ]),
      blockers: [],
      dependencies: uniqueSkuOptions(candidateRequiredDependencies(lead, profile)),
      outcomeLabel: "Same product job",
    };
    candidates.push(leadCandidate);
  }

  if (alternate) {
    const alternateCandidate: ScoredCandidate = {
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
      partialMatches: uniqueSkuOptions([
        "Same 8x8 MXV architecture, but the HDBaseT class/distance assumption differs from the current lead path.",
      ]),
      mismatches: [],
      unknowns: uniqueSkuOptions([
        "Verify actual cable distance and transmitted signal requirement before switching HDBaseT class.",
      ]),
      blockers: [],
      dependencies: uniqueSkuOptions(candidateRequiredDependencies(alternate, profile)),
      outcomeLabel: "Feature check needed",
    };
    candidates.push(alternateCandidate);
  }

  if (fallback) {
    const fallbackCandidate: ScoredCandidate = {
      product: fallback,
      score: 34,
      verdict: "NO MATCH",
      matched: ["Older fixed-I/O matrix family only."],
      checks: uniqueSkuOptions([
        "Avoid using MX-0808-KIT-V2 as the lead answer for an 18Gbps 8x8 HDBaseT matrix brief.",
        "If 18Gbps / 4K60 4:4:4 matters, stay in the MXV family instead.",
      ]),
      gaps: uniqueSkuOptions([
        "MX-0808-KIT-V2 is not the right 18Gbps matrix path for this competitor brief.",
      ]),
      partialMatches: [],
      mismatches: ["Kit-style matrix path does not satisfy the evidenced 18Gbps / 4K60 4:4:4 HDBaseT requirement."],
      unknowns: [],
      blockers: ["Do not quote MX-0808-KIT-V2 as the direct replacement for this brief."],
      dependencies: [],
      outcomeLabel: "Wrong product type",
    };
    candidates.push(fallbackCandidate);
  }

  return candidates;
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

function exactLimitedDataWarning(profile: CompetitorProfile): string {
  const limited =
    !profile.resolvedSpec
    || profile.resolvedSpec.specTier !== "verified-profile"
    || profile.knownProfile === null;

  return limited
    ? "Wingman has limited local data for this competitor SKU. Closest direction only until the competitor specification is confirmed."
    : "";
}

function compareSignalDirection(profile: CompetitorProfile): string {
  const role = (profile.role || "").toLowerCase();
  if (role.includes("encoder") || role.includes("transmitter")) return "Source-side / encoder path";
  if (role.includes("decoder") || role.includes("receiver")) return "Display-side / decoder path";
  if (role.includes("transceiver")) return "Bidirectional / transceiver path";
  if (role.includes("switcher") || role.includes("matrix")) return "Room core / switching path";
  if (role.includes("processor")) return "Processing path";
  return "Signal direction needs confirmation";
}

function compareCompetitorEcosystem(profile: CompetitorProfile): string {
  const combined = [profile.brand, profile.sku, profile.rawText].join(" ").toUpperCase();

  if (combined.includes("OMNISTREAM") || combined.includes("AT-OMNI") || combined.includes("ATOMNI")) {
    return "Atlona OmniStream";
  }

  if (profile.resolvedSpec?.title) return profile.resolvedSpec.title;
  if (profile.resolvedSpec?.brand && profile.productClass !== "Unknown") {
    return `${profile.resolvedSpec.brand} ${profile.productClass}`;
  }
  return profile.brand || "Not confirmed";
}

function verifiedVideoInputLabels(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;

  return uniqueText([
    specs?.hdmiInputs ? "HDMI" : "",
    specs?.displayPortInputs ? "DisplayPort" : "",
    specs?.dviInputs ? "DVI" : "",
    specs?.vgaInputs ? "VGA" : "",
    specs?.sdiInputs ? "SDI" : "",
    specs?.compositeInputs ? "composite video" : "",
    specs?.componentInputs ? "component video" : "",
  ], 6);
}

function _verifiedLocalSourcePhrase(profile: CompetitorProfile): string {
  const inputs = verifiedVideoInputLabels(profile);

  if (inputs.length === 1) {
    return `local ${inputs[0]} source`;
  }

  if (inputs.length > 1) {
    return `local ${inputs.slice(0, -1).join(", ")} or ${inputs[inputs.length - 1]} source`;
  }

  return "local source";
}

function inputConnectorUnknownText(profile: CompetitorProfile): string {
  const role = (profile.role || "").toLowerCase();
  const sourceSide = role.includes("encoder") || role.includes("transmitter") || role.includes("transceiver");

  if (!sourceSide) {
    return "";
  }

  return verifiedVideoInputLabels(profile).length > 0 ? "" : "Input connector not confirmed locally.";
}

function humanizeMissingFact(fact: string): string {
  const value = fact.trim().toLowerCase();

  if (value === "endpoint role") return "Exact endpoint role not fully confirmed from local competitor data.";
  if (value === "network class or codec") return "Network class or codec not verified locally.";
  if (value === "max resolution") return "Maximum supported resolution not verified locally.";
  if (value === "transport") return "Transport method not verified locally.";
  if (value === "controller/network requirement") return "Controller or managed-network requirement not verified locally.";
  if (value === "input/output endpoint count") return "Exact endpoint input/output count not verified locally.";
  if (value === "input types") return "Input connector types not verified locally.";
  if (value === "output types") return "Output connector types not verified locally.";
  if (value === "usb-c/usb behaviour") return "USB-C or USB behaviour not verified locally.";
  if (value === "scaling") return "Scaling behaviour not verified locally.";
  if (value === "audio support") return "Audio handling not verified locally.";
  if (value === "control support") return "Control ports and control behaviour not verified locally.";
  return `${fact.trim()} not verified locally.`;
}

function compareFeatureFlagSummary(profile: CompetitorProfile): string[] {
  const features = profile.resolvedSpec?.features ?? {};
  const specs = profile.resolvedSpec?.specs;
  return uniqueText([
    features.receiverKit ? "Receiver kit packaging evidenced" : "",
    features.hdbtOutput ? "HDBaseT output path evidenced" : "",
    features.usbRouting ? "USB routing evidenced" : "",
    features.usbC ? "USB-C connectivity evidenced" : "",
    features.tenGig ? "10GbE transport evidenced" : "",
    features.zeroLatency ? "Zero-latency transport evidenced" : "",
    features.lossless ? "Visually lossless / uncompressed transport evidenced" : "",
    features.wireless ? "Wireless casting evidenced" : "",
    specs?.dante ? "Dante audio evidenced" : "",
    specs?.audioDeEmbed ? "Audio de-embed evidenced" : "",
    specs?.audioEmbed ? "Audio embed evidenced" : "",
  ], 8);
}

function compareUnknownFeatureSummary(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;
  const unknowns = uniqueText([
    !profile.resolvedSpec ? "No verified local competitor specification profile found." : "",
    !profile.resolvedSpec?.maxResolution ? "Resolution ceiling not verified locally." : "",
    !profile.role || profile.role === "Unknown" ? "Endpoint role not proven from local competitor data." : "",
    !profile.transport || profile.transport === "Unknown" ? "Transport type not proven from local competitor data." : "",
    inputConnectorUnknownText(profile),
    !specs?.hdmiVersion ? "HDMI version not verified locally." : "",
    !specs?.hdcpVersion ? "HDCP version not verified locally." : "",
    !specs?.usbStandard && profile.requestedTags.includes("usb") ? "USB standard and port behaviour not verified locally." : "",
    !specs?.hdbasetClass && profile.requestedTags.includes("hdbaset") ? "HDBaseT class/distance not verified locally." : "",
    !specs?.networkPorts && profile.requestedTags.includes("avoip") ? "LAN port count and network control details not verified locally." : "",
    ...(profile.resolvedSpec?.missingFacts ?? []).map(humanizeMissingFact),
  ], 8);

  return unknowns;
}

function candidateRequiredDependencies(product: WyreStormProduct, profile: CompetitorProfile): string[] {
  if (product.sku.startsWith("NHD-")) {
    return uniqueText([
      "Specify one NHD-CTL-PRO-V2 controller per NetworkHD system unless the site already has one.",
      product.role.includes("Encoder") ? "Quote compatible decoder endpoints at the display side if the system needs a full end-to-end AVoIP path." : "",
      product.role.includes("Decoder") ? "Quote compatible encoder endpoints at the source side if the system needs a full end-to-end AVoIP path." : "",
      product.sku.includes("-DNT-") || product.sku.includes("-510-") ? "Only position this path when the Dante / network-audio workflow is genuinely part of the brief." : "",
      product.sku.includes("-IW-") ? "Only position this path if the physical in-wall form factor is a project requirement." : "",
      "Confirm network switch readiness, VLAN policy, multicast handling and who owns network setup before quoting.",
    ], 6);
  }

  if (product.sku.startsWith("MXV-")) {
    return uniqueText([
      wantsClassA(profile)
        ? matrixReceiverRequirement(profile, true)
        : matrixReceiverRequirement(profile, false),
      "Confirm the receiver model, HDBaseT class and actual cable-distance requirement before quoting.",
      "Confirm whether local mirrored HDMI outputs, audio breakouts or scaling are required.",
    ], 5);
  }

  if (product.productClass === "HDBaseT extender") {
    return uniqueText([
      "Quote the transmitter/receiver kit or matching endpoint pair; do not treat this as a matrix or AVoIP system.",
      "Confirm HDBaseT class, cable run, USB version and control path before quoting.",
    ], 4);
  }

  if (product.productClass === "Presentation switcher") {
    return uniqueText([
      "Confirm whether the room needs switching, BYOD/BYOM, wireless presentation or USB transport, not just a nearest technical SKU.",
      /H3|HDBASET/i.test(product.transport) ? "Confirm whether the downstream HDBaseT / room-capture path is genuinely part of the requirement." : "",
      /Wireless/i.test(product.transport) ? "Confirm whether wireless presentation and guest connection are actually required." : "",
    ], 4);
  }

  return uniqueText([
    "Confirm the final room workflow, dependencies and adjacent products before quoting.",
  ], 3);
}

function plainLanguageOutcome(profile: CompetitorProfile, candidate: ScoredCandidate): string {
  const limited = Boolean(exactLimitedDataWarning(profile));
  const hasClassMismatch = candidate.blockers.some((line) => /class mismatch|role mismatch|wrong product class/i.test(line))
    || candidate.mismatches.some((line) => /not an AVoIP|wrong architecture|point-to-point|does not replace/i.test(line));

  if (hasClassMismatch || candidate.verdict === "NO MATCH") {
    return "Wrong product type";
  }

  if (limited && candidate.verdict !== "GOOD MATCH") {
    return "Insufficient competitor data";
  }

  if (candidate.verdict === "ARCHITECTURE ALTERNATIVE") {
    return "Feature check needed";
  }

  if (candidate.verdict === "GOOD MATCH" && candidate.matched.some((line) => /Same product class|Same endpoint role|matrix topology|role-compatible/i.test(line))) {
    return "Same product job";
  }

  if (candidate.verdict === "PARTIAL MATCH") {
    return "Feature check needed";
  }

  return limited ? "Insufficient competitor data" : "Feature check needed";
}

function competitorIoTypeLabel(profile: CompetitorProfile): string {
  const spec = profile.resolvedSpec;
  const transport = String(spec?.transport || profile.transport || "").toLowerCase();

  if (spec?.domain === "NDI_CAMERA" || /ndi/.test(transport)) return "NDI / camera endpoint";
  if (spec?.domain === "PTZ_CAMERA" || /ptz/.test(profile.role.toLowerCase())) return "Camera endpoint";
  if (spec?.domain === "WIRELESS_CASTING" || /wireless|wi-fi/.test(transport)) return "Wireless presentation";
  if (spec?.domain === "AVOIP" || transport.includes("avoip")) return "AV-over-IP endpoint";
  if (spec?.domain === "HDBASET" || transport.includes("hdbaset") || transport.includes("tps")) return "HDBaseT / extension";
  if (transport.includes("usb-c")) return "HDMI / USB-C";
  if (transport.includes("hdmi")) return "HDMI";
  if (transport.includes("usb")) return "USB / video";
  return "signal path";
}

function joinCommercialFactParts(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

function commercialPortLabel(count: number | undefined, singular: string, plural = `${singular}s`): string {
  if (!count) return "";
  return `${count}x ${count === 1 ? singular : plural}`;
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

  return `I/O: ${parts.join(" / ")}${parts.length ? ` | ${competitorIoTypeLabel(profile)}` : ""}`;
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

  return labels.length ? `USB: ${labels.join(" | ")}` : "";
}

function competitorHdbasetFacts(profile: CompetitorProfile): string {
  const specs = profile.resolvedSpec?.specs;
  const items = [specs?.hdbasetVersion, specs?.hdbasetClass].filter(Boolean);
  return items.length ? `HDBaseT: ${items.join(" | ")}` : "";
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
    return "Educational point: AVoIP is often easier to position because the transport decision moves away from per-link HDBaseT limits and toward the wider AV network design.";
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

  return items.length ? `Control: ${items.join(" | ")}` : "";
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

  return items.length ? `Audio / Network: ${items.join(" | ")}` : "";
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

  return items.length ? `Wireless: ${items.join(" | ")}` : "";
}

function competitorCommercialIdentity(profile: CompetitorProfile): string[] {
  const specs = profile.resolvedSpec?.specs;
  const isAvoip = profile.resolvedSpec?.domain === "AVOIP" || profile.requestedTags.includes("avoip");
  const isHdBaseT = profile.resolvedSpec?.domain === "HDBASET" || profile.requestedTags.includes("hdbaset");
  const isNdiCamera = profile.productClass === "NDI camera";
  const isPtzCamera = profile.productClass === "PTZ camera";
  const role = (profile.role || "").toLowerCase();
  const identity: string[] = [];
  const ecosystem = compareCompetitorEcosystem(profile);
  const classLabel =
    profile.productClass.toLowerCase() === "av-over-ip"
      ? "an AV-over-IP product"
      : /^[aeiou]/i.test(profile.productClass)
        ? `an ${profile.productClass.toLowerCase()}`
        : `a ${profile.productClass.toLowerCase()}`;

  if (profile.productClass !== "Unknown") {
    identity.push(`This product is ${classLabel} in the ${ecosystem} family.`);
  }

  const sourceSideIo = joinCommercialFactParts([
    commercialPortLabel(specs?.hdmiInputs, "HDMI input")
      || commercialPortLabel(profile.resolvedSpec?.inputCount, "source/video input"),
    commercialPortLabel(specs?.networkPorts ?? (isAvoip ? 1 : undefined), "LAN/network port"),
  ]);

  const displaySideIo = joinCommercialFactParts([
    commercialPortLabel(specs?.networkPorts ?? (isAvoip ? 1 : undefined), "LAN/network port"),
    commercialPortLabel(specs?.hdmiOutputs, "HDMI output")
      || commercialPortLabel(profile.resolvedSpec?.outputCount, "display/video output"),
  ]);

  const routedIo = joinCommercialFactParts([
    commercialPortLabel(specs?.hdmiInputs ?? profile.resolvedSpec?.inputCount, "HDMI input"),
    commercialPortLabel(specs?.hdmiOutputs ?? profile.resolvedSpec?.outputCount, "HDMI output"),
    commercialPortLabel(specs?.usbCPorts, "USB-C port"),
    commercialPortLabel(specs?.networkPorts, "LAN/network port"),
  ]);

  if (isAvoip && /encoder|transmitter/.test(role) && sourceSideIo) {
    identity.push(`Headline I/O: ${sourceSideIo}.`);
  } else if (isAvoip && /decoder|receiver/.test(role) && displaySideIo) {
    identity.push(`Headline I/O: ${displaySideIo}.`);
  } else if (isNdiCamera) {
    identity.push("Headline I/O: NDI camera output path, plus local video/USB monitoring or handoff where fitted.");
  } else if (isPtzCamera) {
    identity.push("Headline I/O: camera video output path with separate PTZ/control workflow.");
  } else if (routedIo) {
    identity.push(`Headline I/O: ${routedIo}.`);
  }

  const extraVideoIo = joinCommercialFactParts([
    commercialPortLabel(specs?.displayPortInputs, "DisplayPort input"),
    commercialPortLabel(specs?.displayPortOutputs, "DisplayPort output"),
    commercialPortLabel(specs?.dviInputs, "DVI input"),
    commercialPortLabel(specs?.dviOutputs, "DVI output"),
    commercialPortLabel(specs?.vgaInputs, "VGA input"),
    commercialPortLabel(specs?.vgaOutputs, "VGA output"),
    commercialPortLabel(specs?.sdiInputs, "SDI input"),
    commercialPortLabel(specs?.sdiOutputs, "SDI output"),
    commercialPortLabel(specs?.compositeInputs, "composite input"),
    commercialPortLabel(specs?.componentInputs, "component input"),
  ]);

  if (extraVideoIo) {
    identity.push(`Other video I/O: ${extraVideoIo}.`);
  }

  const featureCallouts = joinCommercialFactParts([
    profile.resolvedSpec?.maxResolution ? `Resolution ${profile.resolvedSpec.maxResolution}` : "",
    specs?.hdmiVersion ? specs.hdmiVersion : "",
    specs?.hdcpVersion ? specs.hdcpVersion : "",
    specs?.usbStandard ? specs.usbStandard : "",
    isHdBaseT && specs?.hdbasetVersion ? specs.hdbasetVersion : "",
    isHdBaseT && specs?.hdbasetClass ? specs.hdbasetClass : "",
    specs?.dante ? "Dante" : "",
    specs?.wirelessCasting ? "Wireless casting" : "",
  ]);

  if (featureCallouts) {
    identity.push(`Key feature callouts: ${featureCallouts}.`);
  }

  return uniqueText(identity, 4);
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

  const facts = [
    { label: "Recognised class", value: profile.productClass !== "Unknown" ? profile.productClass : "Needs confirmation" },
    { label: "Role", value: profile.role !== "Unknown" ? profile.role : "Needs confirmation" },
    { label: "Signal direction", value: compareSignalDirection(profile) },
    { label: "Transport", value: profile.transport !== "Unknown" ? profile.transport : "Needs confirmation" },
    { label: "Resolution", value: resolvedSpec?.maxResolution || "Not verified locally" },
    { label: "Ecosystem / family", value: compareCompetitorEcosystem(profile) },
  ].filter((entry) => entry.value);

  const knownFeatures = uniqueText([
    competitorHeadlineIo(profile),
    competitorVideoProtectionFacts(profile),
    competitorUsbFacts(profile),
    competitorHdbasetFacts(profile),
    competitorControlFacts(profile),
    competitorAudioNetworkFacts(profile),
    competitorWirelessFacts(profile),
    unsupportedPorts.length ? `Other video I/O evidenced: ${unsupportedPorts.join(", ")}` : "",
    ...compareFeatureFlagSummary(profile),
    inferredTags.length ? `Detected traits: ${inferredTags.join(", ")}` : "",
    mustMatchFeatures.trim() ? `Must-match notes: ${mustMatchFeatures.trim()}` : "",
  ], 10);

  const unknownFeatures = uniqueText([
    ...compareUnknownFeatureSummary(profile),
    unsupportedPorts.length
      ? "WyreStorm does not natively match every competitor legacy connector, so confirm whether signal conversion or surrounding workflow is acceptable."
      : "",
  ], 8);

  const verifyItems = uniqueText([
    competitorDistanceQuestion(profile),
    competitorCommercialRiskNote(profile),
    competitorEducationalNote(profile),
    "Confirm exact video format, bandwidth and connector expectations before external quote use.",
    "Confirm control, audio and USB behaviour before treating this as a direct equivalent.",
    "Confirm whether the quote stays in the same architecture or moves to a different WyreStorm system.",
  ], 8);

  const warning = exactLimitedDataWarning(profile);
  const outcomeLabel = warning ? "Insufficient competitor data" : profile.productClass === "Unknown" ? "Feature check needed" : "Same product job";
  const identityItems = competitorCommercialIdentity(profile);

  if (isAtlonaOmeExKitProfile(profile)) {
    return {
      heading: "Atlona AT-OME-EX-KIT",
      detail: "HDBaseT TX/RX extender kit",
      recognisedClass: "HDBaseT extender",
      role: "TX/RX extender kit",
      signalDirection: "Point-to-point source-to-display extension",
      transport: "HDBaseT",
      resolution: resolvedSpec?.maxResolution || "Not verified locally",
      ecosystem: "Atlona OME",
      facts: [
        { label: "Recognised class", value: "HDBaseT extender" },
        { label: "Role", value: "TX/RX extender kit" },
        { label: "Signal direction", value: "Point-to-point source-to-display extension" },
        { label: "Transport", value: "HDBaseT" },
        { label: "Resolution", value: resolvedSpec?.maxResolution || "Not verified locally" },
        { label: "Ecosystem / family", value: "Atlona OME" },
      ],
      identityItems: uniqueText([
        "This product is an HDBaseT extender in the Atlona OME family.",
        "Headline I/O: 1x source/video input, 1x display/video output, USB/control extension over category cable.",
        resolvedSpec?.maxResolution ? `Key feature callouts: Resolution ${resolvedSpec.maxResolution}.` : "",
      ], 4),
      knownFeatures: uniqueText([
        "Point-to-point HDMI / USB / control extension over category cable.",
        "USB 2.0 plus control transport where supported.",
        "Typical application: meeting room, classroom, interactive display or UC extension.",
      ], 8),
      unknownFeatures: uniqueText([
        "Exact HDMI/HDCP version not verified locally.",
        "HDBaseT class and cable-distance behaviour not verified locally.",
        "Control and USB edge-case behaviour should be checked against the live datasheet.",
      ], 8),
      verifyItems: uniqueText([
        "Confirm required resolution, USB version, cable length and HDBaseT class before quoting.",
        "Confirm whether the customer really needs point-to-point extension or has moved into switching/matrix architecture.",
        "Confirm control needs before positioning any alternative as direct replacement.",
      ], 8),
      outcomeLabel: exactLimitedDataWarning(profile) ? "Insufficient competitor data" : "Same product job",
      warning: exactLimitedDataWarning(profile),
      sourceUrl: resolvedSpec?.datasheetUrl,
    };
  }
  return {
    heading: [profile.brand, profile.sku].filter(Boolean).join(" ").trim() || "Competitor product",
    detail: resolvedSpec?.title?.trim()
      || (profile.knownProfile && typeof profile.knownProfile.title === "string" && profile.knownProfile.title.trim() ? profile.knownProfile.title.trim() : "")
      || (profile.knownProfile && typeof profile.knownProfile.name === "string" && profile.knownProfile.name.trim() ? profile.knownProfile.name.trim() : "")
      || "Wingman matched against this competitor product direction.",
    recognisedClass: profile.productClass !== "Unknown" ? profile.productClass : "Needs confirmation",
    role: profile.role !== "Unknown" ? profile.role : "Needs confirmation",
    signalDirection: compareSignalDirection(profile),
    transport: profile.transport !== "Unknown" ? profile.transport : "Needs confirmation",
    resolution: resolvedSpec?.maxResolution || "Not verified locally",
    ecosystem: compareCompetitorEcosystem(profile),
    facts,
    identityItems,
    knownFeatures,
    unknownFeatures,
    verifyItems,
    outcomeLabel,
    warning,
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

function CompareEvidenceList({ title, items, className = "" }: { title: string; items: string[]; className?: string }) {
  const visibleItems = uniqueText(items.map((item) => commercializeCompareCopy(item)).filter(Boolean), items.length);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className={`compare-native-evidence-block ${className}`.trim()}>
      <p className="compare-native-label compare-native-label--subtle">{title}</p>
      <ul className="compare-native-bullet-list">
        {visibleItems.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function roleSignalDirection(role: string): string {
  const value = role.toLowerCase();

  if (/ndi camera|ptz camera|camera bridge/.test(value)) return "Room capture / camera source";
  if (/encoder|transmitter/.test(value)) return "Source-side endpoint";
  if (/decoder|receiver/.test(value)) return "Display-side endpoint";
  if (/transceiver/.test(value)) return "Bi-directional endpoint";
  if (/tx\/rx extender kit|usb extender|extender/.test(value)) return "Point-to-point source-to-display extension";
  if (/matrix/.test(value)) return "Local routed source-to-display switching";
  if (/presentation switcher|switcher/.test(value)) return "In-room source switching";
  if (/video wall/.test(value)) return "Dedicated video wall processing";

  return "System direction needs confirmation";
}

function pickProductConnectorLabel(candidate: ScoredCandidate, side: "input" | "output"): string {
  const tags = candidate.product.tags.join(" ").toLowerCase();
  const transport = candidate.product.transport.toLowerCase();
  const combined = `${tags} ${transport} ${candidate.product.name.toLowerCase()}`;

  if (/hdbaset/.test(combined)) {
    return side === "input" ? "HDMI source input" : "HDBaseT output";
  }
  if (/usb-c/.test(combined) && /wireless/.test(combined)) {
    return side === "input" ? "local source input" : "display/video output";
  }
  if (/usb-c/.test(combined)) {
    return side === "input" ? "local source input" : "display/video output";
  }
  if (/wireless/.test(combined)) {
    return side === "input" ? "wired/wireless source input" : "display/video output";
  }
  if (/hdmi/.test(combined) || /matrix|presentation switcher|switcher/.test(candidate.product.productClass.toLowerCase())) {
    return side === "input" ? "HDMI input" : "HDMI output";
  }
  if (/networkhd|av-over-ip/.test(combined)) {
    return side === "input" ? "local source input" : "LAN/network port";
  }

  return side === "input" ? "source/video input" : "display/video output";
}

function wyrestormHeadlineIo(candidate: ScoredCandidate, inputCount?: number, outputCount?: number): string {
  const role = candidate.product.role.toLowerCase();
  const family = candidate.product.family.toLowerCase();
  const inputLabel = pickProductConnectorLabel(candidate, "input");
  const outputLabel = pickProductConnectorLabel(candidate, "output");
  const items: string[] = [];

  if (/encoder|transmitter/.test(role) && /networkhd|av-over-ip/.test(family)) {
    items.push("1x local source input");
    items.push("1x LAN/network port");
  } else if (/decoder|receiver/.test(role) && /networkhd|av-over-ip/.test(family)) {
    items.push("1x LAN/network port");
    items.push("1x display/video output");
  } else if (/tx\/rx extender kit/.test(role)) {
    items.push("1x transmitter");
    items.push("1x receiver");
    items.push("category-cable link");
  } else {
    items.push(commercialPortLabel(inputCount, inputLabel) || "");
    items.push(commercialPortLabel(outputCount, outputLabel) || "");
  }

  return joinCommercialFactParts(items) || "I/O still needs confirmation from current local data";
}

function wyrestormFeatureCallouts(candidate: ScoredCandidate, resolution: string): string {
  const values = candidate.product.tags.map((tag) => tag.toLowerCase());
  const highlights = [
    resolution && resolution !== "Not verified locally" ? `Resolution ${resolution}` : "",
    values.includes("444") ? "4:4:4" : "",
    values.includes("hdr") ? "HDR" : "",
    values.includes("usb-c") ? "USB-C" : "",
    values.includes("wireless") ? "Wireless presentation" : "",
    values.includes("mst") ? "MST" : "",
    values.includes("hdbaset3") ? "HDBaseT 3.0 direction" : "",
    candidate.product.sku === "NHD-510-TX" ? "Audio-network / Dante-oriented endpoint direction" : "",
  ].filter(Boolean);

  return joinCommercialFactParts(highlights);
}

function buildWyrestormSummary(candidate: ScoredCandidate): WyreStormSummary {
  const knownProfile = findKnownWyrestormCompareProfile(candidate.product.sku);
  const hydratedProduct = hydrateWyrestormCompareProfile({
    ...candidate.product,
    title: candidate.product.name,
    category: candidate.product.productClass,
    role: candidate.product.role,
    description: candidate.product.name,
    summary: candidate.product.caveat,
    technologies: [candidate.product.transport],
    features: candidate.product.tags,
    capabilities: candidate.product.tags,
  }) as Parameters<typeof buildWyrestormCompareProfile>[0];

  const profile = buildWyrestormCompareProfile(hydratedProduct);
  const resolution = profile.maxResolution || "Not verified locally";
  const headlineIo = wyrestormHeadlineIo(candidate, profile.inputCount, profile.outputCount);
  const featureCallouts = wyrestormFeatureCallouts(candidate, resolution);
  const hdmiProtection = joinCommercialFactParts([
    knownProfile?.hdmiVersion,
    knownProfile?.hdcpVersion,
  ].filter((item) => item && !/^verify datasheet$/i.test(item)));
  const usbFacts = joinCommercialFactParts([
    profile.specs?.usbCPorts ? `${profile.specs.usbCPorts}x USB-C` : "",
    profile.specs?.usbHostPorts ? `${profile.specs.usbHostPorts}x USB host` : "",
    profile.specs?.usbDevicePorts ? `${profile.specs.usbDevicePorts}x USB device` : "",
    profile.specs?.usbTotalPorts ? `${profile.specs.usbTotalPorts}x USB total` : "",
    profile.specs?.usbStandard || "",
    !profile.specs?.usbTotalPorts && knownProfile?.inputTypes.includes("USB-C") ? "USB-C source input path" : "",
  ]);
  const hdbasetFacts = joinCommercialFactParts([
    profile.specs?.hdbasetVersion || "",
    profile.specs?.hdbasetClass || "",
    knownProfile?.distanceClass && !/^verify datasheet$/i.test(knownProfile.distanceClass) ? knownProfile.distanceClass : "",
  ]);
  const controlFacts = joinCommercialFactParts([
    profile.specs?.networkPorts ? `${profile.specs.networkPorts}x LAN/network port${profile.specs.networkPorts === 1 ? "" : "s"}` : "",
    profile.specs?.rs232 ? "RS-232" : "",
    profile.specs?.ir ? "IR" : "",
    profile.specs?.relay ? "Relay" : "",
    profile.specs?.gpio ? "GPIO" : "",
    knownProfile?.control?.filter((item) => !/verify/i.test(item)).join(" | ") || "",
  ]);
  const otherVideoIo = joinCommercialFactParts([
    knownProfile?.mirroredOutputCount
      ? `${knownProfile.mirroredOutputCount}x mirrored ${knownProfile.mirroredOutputTypes.join(" / ")} output${knownProfile.mirroredOutputCount === 1 ? "" : "s"}`
      : "",
    knownProfile?.loopOutputCount
      ? `${knownProfile.loopOutputCount}x loop ${knownProfile.loopOutputTypes.join(" / ")} output${knownProfile.loopOutputCount === 1 ? "" : "s"}`
      : "",
  ]);
  const identityItems = uniqueText([
    `This WyreStorm option is a ${candidate.product.productClass.toLowerCase()} in the ${candidate.product.family} family.`,
    headlineIo !== "I/O still needs confirmation from current local data" ? `Headline I/O: ${headlineIo}.` : "",
    featureCallouts ? `Key feature callouts: ${featureCallouts}.` : "",
    candidate.dependencies[0] || "",
  ], 4);

  return {
    heading: candidate.product.sku,
    detail: candidate.product.name,
    family: candidate.product.family,
    productType: candidate.product.productClass,
    role: candidate.product.role,
    signalDirection: roleSignalDirection(candidate.product.role),
    transport: candidate.product.transport,
    resolution,
    headlineIo,
    identityItems,
    facts: [
      { label: "Product type", value: candidate.product.productClass },
      { label: "Role", value: candidate.product.role },
      { label: "Signal direction", value: roleSignalDirection(candidate.product.role) },
      { label: "Transport", value: candidate.product.transport },
      { label: "Headline I/O", value: headlineIo },
      { label: "Resolution", value: resolution },
    ],
    comparisonFacts: [
      { label: "Inputs", value: wyrestormInputSummary(candidate, profile, knownProfile) },
      { label: "Outputs", value: wyrestormOutputSummary(candidate, profile, knownProfile) },
      { label: "HDMI / HDCP", value: hdmiProtection },
      { label: "USB", value: usbFacts },
      { label: "HDBaseT / distance", value: hdbasetFacts },
      { label: "Max resolution", value: knownProfile?.maxResolution || resolution },
      { label: "Control / network", value: controlFacts },
      { label: "Other video I/O", value: otherVideoIo },
    ].filter((entry) => entry.value),
  };
}

function _wyrestormIdentityItems(candidate: ScoredCandidate): string[] {
  return buildWyrestormSummary(candidate).identityItems;
}

function stripComparePrefix(value: string, prefix: string): string {
  return value.startsWith(`${prefix}: `) ? value.slice(prefix.length + 2) : value;
}

function textHasToken(value: string, pattern: RegExp): boolean {
  return pattern.test(value.toLowerCase());
}

function safeCompareValue(value: string | undefined): string {
  return String(value ?? "").trim();
}

function commercializeCompareCopy(value: string | undefined): string {
  const input = String(value ?? "").trim();

  if (!input) {
    return "";
  }

  const replacements: Array<[RegExp, string]> = [
    [/^Why this matters:\s*/i, ""],
    [/^Educational point:\s*/i, ""],
    [/Wingman has limited local data for this competitor SKU\.\s*Treat this as product-direction guidance, not a confirmed direct equivalent\./i, "Closest direction only until the competitor specification is confirmed."],
    [/Treat this as product-direction guidance, not a confirmed direct equivalent\./i, "Closest direction only until the competitor specification is confirmed."],
    [/Confirm exact video format, bandwidth and connector expectations before external quote use\./i, "Video format, bandwidth and connector expectations need checking before quote."],
    [/Confirm control, audio and USB behaviour before treating this as a direct equivalent\./i, "Control, audio and USB behaviour need checking before quote."],
    [/Confirm whether the customer wants the same architecture or is open to a different WyreStorm system direction\./i, "Confirm whether the quote stays in the same architecture or moves to a different WyreStorm system."],
    [/USB-C or USB behaviour not verified locally\./i, "USB behaviour needs checking before quote."],
    [/USB standard and port behaviour not verified locally\./i, "USB count and behaviour need checking before quote."],
    [/LAN port count and network control details not verified locally\./i, "LAN port count and network control need checking before quote."],
    [/Resolution ceiling not verified locally\./i, "Maximum resolution needs checking before quote."],
    [/Maximum supported resolution not verified locally\./i, "Maximum resolution needs checking before quote."],
    [/Endpoint role not proven from local competitor data\./i, "Exact product role needs checking before quote."],
    [/Transport type not proven from local competitor data\./i, "Transport type needs checking before quote."],
    [/Input connector not confirmed locally\./i, "Input connector needs checking before quote."],
    [/Input connector types not verified locally\./i, "Input connector types need checking before quote."],
    [/Output connector types not verified locally\./i, "Output connector types need checking before quote."],
    [/HDMI version not verified locally\./i, "HDMI version needs checking before quote."],
    [/HDCP version not verified locally\./i, "HDCP version needs checking before quote."],
    [/HDBaseT class\/distance not verified locally\./i, "HDBaseT class and distance need checking before quote."],
    [/Controller or managed-network requirement not verified locally\./i, "Controller and managed-network requirements need checking before quote."],
    [/Control ports and control behaviour not verified locally\./i, "Control ports and behaviour need checking before quote."],
    [/Audio handling not verified locally\./i, "Audio handling needs checking before quote."],
    [/Scaling behaviour not verified locally\./i, "Scaling behaviour needs checking before quote."],
    [/No verified local competitor specification profile found\./i, "Competitor specification needs checking before quote."],
    [/Correct WyreStorm direction, not a drop-in replacement\./i, "Closest direction, not confirmed one-box replacement."],
    [/This is the closest WyreStorm direction from the local evidence, but it should be positioned as a system-fit answer rather than a guaranteed one-box replacement\./i, "Closest direction, not confirmed one-box replacement."],
    [/Do not quote this as a direct AVoIP replacement\./i, "Closest direction, not a direct AVoIP swap."],
  ];

  let line = input.replace(/\s+/g, " ");
  replacements.forEach(([pattern, replacement]) => {
    line = line.replace(pattern, replacement);
  });

  if (/not verified locally\./i.test(line)) {
    line = line.replace(/ not verified locally\./i, " needs checking before quote.");
  }

  line = line.replace(/\s+\./g, ".").trim();

  return line;
}

type CompareIoSnapshot = {
  inputCount?: number;
  outputCount?: number;
  inputFamilies: string[];
  outputFamilies: string[];
  additionalVideoFamilies: string[];
  waivedAdditionalVideoFamilies: string[];
};

function connectorFamilyLabel(value: string): string {
  const normalized = value.toLowerCase().trim();
  if (/displayport|\bdp\b/.test(normalized)) return "DisplayPort";
  if (/dvi/.test(normalized)) return "DVI";
  if (/vga/.test(normalized)) return "VGA";
  if (/sdi/.test(normalized)) return "SDI";
  if (/composite|cvbs/.test(normalized)) return "Composite";
  if (/component|ypbpr/.test(normalized)) return "Component";
  if (/usb-?c|type-?c/.test(normalized)) return "USB-C";
  if (/hdbaset|tps/.test(normalized)) return "HDBaseT/TPS";
  if (/network|ethernet|lan|avoip/.test(normalized)) return "Network/LAN";
  if (/hdmi/.test(normalized)) return "HDMI";
  return value.trim();
}

function uniqueConnectorFamilies(values: Array<string | null | undefined>): string[] {
  return uniqueText(values.map((value) => value ? connectorFamilyLabel(value) : ""), 12);
}

function connectorFamilyWaived(rawText: string, family: string): boolean {
  const token = family.toLowerCase().replace(/\//g, " ");
  const compact = token.replace(/\s+/g, "[\\s-]*");
  const patterns = [
    new RegExp(`\\b(no|without|ignore|excluding?)\\s+${compact}\\b`, "i"),
    new RegExp(`\\b${compact}\\b.{0,24}\\b(not required|not used|unused|not needed|ignore|exclude)\\b`, "i"),
    new RegExp(`\\b(not required|not used|unused|not needed|ignore|exclude)\\b.{0,24}\\b${compact}\\b`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(rawText));
}

function buildCompetitorIoSnapshot(profile: CompetitorProfile): CompareIoSnapshot {
  const specs = profile.resolvedSpec?.specs;
  const rawText = profile.rawText.toLowerCase();
  const additionalVideoFamilies = uniqueConnectorFamilies([
    specs?.displayPortInputs || specs?.displayPortOutputs ? "DisplayPort" : "",
    specs?.dviInputs || specs?.dviOutputs ? "DVI" : "",
    specs?.vgaInputs || specs?.vgaOutputs ? "VGA" : "",
    specs?.sdiInputs || specs?.sdiOutputs ? "SDI" : "",
    specs?.compositeInputs || specs?.compositeOutputs ? "Composite" : "",
    specs?.componentInputs || specs?.componentOutputs ? "Component" : "",
  ]);

  return {
    inputCount: profile.resolvedSpec?.inputCount,
    outputCount: profile.resolvedSpec?.outputCount,
    inputFamilies: uniqueConnectorFamilies([
      specs?.hdmiInputs ? "HDMI" : "",
      specs?.usbCPorts ? "USB-C" : "",
      specs?.displayPortInputs ? "DisplayPort" : "",
      specs?.dviInputs ? "DVI" : "",
      specs?.vgaInputs ? "VGA" : "",
      specs?.sdiInputs ? "SDI" : "",
      specs?.compositeInputs ? "Composite" : "",
      specs?.componentInputs ? "Component" : "",
      specs?.networkPorts && /encoder|transmitter|av over ip|avoip|networkhd/.test(rawText) ? "Network/LAN" : "",
      /hdbaset|tps/.test(rawText) && /matrix|switcher|presentation|extender|input/.test(rawText) ? "HDBaseT/TPS" : "",
      !specs?.hdmiInputs && /\bhdmi\b/.test(rawText) && /matrix|switcher|presentation|encoder|transmitter|source/.test(rawText) ? "HDMI" : "",
      /\busb-?c\b/.test(rawText) ? "USB-C" : "",
    ]),
    outputFamilies: uniqueConnectorFamilies([
      specs?.hdmiOutputs ? "HDMI" : "",
      specs?.displayPortOutputs ? "DisplayPort" : "",
      specs?.dviOutputs ? "DVI" : "",
      specs?.vgaOutputs ? "VGA" : "",
      specs?.sdiOutputs ? "SDI" : "",
      specs?.compositeOutputs ? "Composite" : "",
      specs?.componentOutputs ? "Component" : "",
      specs?.networkPorts && /decoder|receiver|av over ip|avoip|networkhd/.test(rawText) ? "Network/LAN" : "",
      /hdbaset|tps/.test(rawText) && /matrix|switcher|presentation|extender|output|display/.test(rawText) ? "HDBaseT/TPS" : "",
      !specs?.hdmiOutputs && /\bhdmi\b/.test(rawText) && /output|display|decoder|receiver|matrix|switcher/.test(rawText) ? "HDMI" : "",
    ]),
    additionalVideoFamilies,
    waivedAdditionalVideoFamilies: additionalVideoFamilies.filter((family) => connectorFamilyWaived(profile.rawText, family)),
  };
}

function buildWyrestormIoSnapshot(product: WyreStormProduct): CompareIoSnapshot {
  const knownProfile = findKnownWyrestormCompareProfile(product.sku);
  const hydratedProduct = hydrateWyrestormCompareProfile({
    ...product,
    title: product.name,
    category: product.productClass,
    role: product.role,
    description: product.name,
    summary: product.caveat,
    technologies: [product.transport],
    features: product.tags,
    capabilities: product.tags,
  }) as Parameters<typeof buildWyrestormCompareProfile>[0];
  const profile = buildWyrestormCompareProfile(hydratedProduct);
  const specs = profile.specs;
  const transportText = `${product.transport} ${profile.transport} ${product.role} ${product.productClass}`.toLowerCase();

  return {
    inputCount: knownProfile?.routedInputCount ?? profile.inputCount,
    outputCount: knownProfile?.routedOutputCount ?? profile.outputCount,
    inputFamilies: uniqueConnectorFamilies([
      ...(knownProfile?.inputTypes ?? []),
      specs?.hdmiInputs ? "HDMI" : "",
      specs?.usbCPorts ? "USB-C" : "",
      specs?.networkPorts && /encoder|transmitter|av over ip|avoip|networkhd/.test(transportText) ? "Network/LAN" : "",
      /\bhdbaset\b|\btps\b/.test(transportText) && /matrix|switcher|presentation|extender|input/.test(transportText) ? "HDBaseT/TPS" : "",
      /\bhdmi\b/.test(transportText) && /matrix|switcher|presentation|encoder|transmitter|source/.test(transportText) ? "HDMI" : "",
      /\busb-?c\b/.test(transportText) ? "USB-C" : "",
    ]),
    outputFamilies: uniqueConnectorFamilies([
      ...(knownProfile?.routedOutputTypes ?? knownProfile?.outputTypes ?? []),
      specs?.hdmiOutputs ? "HDMI" : "",
      specs?.networkPorts && /decoder|receiver|av over ip|avoip|networkhd/.test(transportText) ? "Network/LAN" : "",
      /\bhdbaset\b/.test(transportText) ? "HDBaseT/TPS" : "",
      /\bhdmi\b/.test(transportText) && /output|display|decoder|receiver|matrix|switcher/.test(transportText) ? "HDMI" : "",
    ]),
    additionalVideoFamilies: [],
    waivedAdditionalVideoFamilies: [],
  };
}

function coversConnectorFamily(candidateFamilies: string[], requiredFamily: string): boolean {
  return candidateFamilies.includes(requiredFamily);
}

function compareInputOutputFit(
  label: "input" | "output",
  competitorCount: number | undefined,
  candidateCount: number | undefined,
  matched: string[],
  partialMatches: string[],
  mismatches: string[],
  blockers: string[],
): number {
  if (!competitorCount || !candidateCount) {
    return 0;
  }

  if (candidateCount < competitorCount) {
    mismatches.push(`WyreStorm provides ${candidateCount} ${label}${candidateCount === 1 ? "" : "s"}, but the competitor brief needs ${competitorCount}.`);
    blockers.push(`Do not recommend a product with fewer ${label}${competitorCount === 1 ? "" : "s"} than the competitor brief requires.`);
    return -72;
  }

  if (candidateCount === competitorCount) {
    matched.push(`Same ${label} count: ${candidateCount}.`);
    return 22;
  }

  const spare = candidateCount - competitorCount;
  matched.push(`Covers the required ${label} count (${competitorCount}) with ${spare} spare.`);

  if (spare >= 4) {
    partialMatches.push(`Larger ${label} frame than the competitor brief; confirm that the extra I/O is commercially acceptable.`);
  }

  return Math.max(10, 18 - spare * 2);
}

function normalizeCompareValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compareValueCount(value: string): number | null {
  const match = value.match(/\b(\d+)x\b/i);
  return match ? Number(match[1]) : null;
}

function compareSharesToken(value: string, tokens: string[]): boolean {
  const normalized = normalizeCompareValue(value);
  return tokens.some((token) => normalized.includes(token));
}

function compareRowResult(label: string, competitor: string, wyrestorm: string): string {
  const competitorValue = commercializeCompareCopy(competitor);
  const wyrestormValue = commercializeCompareCopy(wyrestorm);

  if (label === "Main caveat") {
    return "Check before quote";
  }

  if (!competitorValue || !wyrestormValue) {
    return "Needs checking";
  }

  if (normalizeCompareValue(competitorValue) === normalizeCompareValue(wyrestormValue)) {
    return "Aligned";
  }

  if (label === "Inputs" || label === "Outputs") {
    const competitorCount = compareValueCount(competitorValue);
    const wyrestormCount = compareValueCount(wyrestormValue);

    if (competitorCount !== null && wyrestormCount !== null) {
      if (wyrestormCount < competitorCount) return "Too few ports";
      return competitorCount === wyrestormCount ? "Counts align" : "Covers required count";
    }

    return "Check connection mix";
  }

  if (label === "USB") {
    if (/needs checking before quote/i.test(`${competitorValue} ${wyrestormValue}`)) return "USB check";
    if (/usb/i.test(competitorValue) && /usb/i.test(wyrestormValue)) return "USB path present";
    return "USB differs";
  }

  if (label === "Max resolution") {
    if (normalizeCompareValue(competitorValue) === normalizeCompareValue(wyrestormValue)) return "Resolution aligns";
    if (compareSharesToken(competitorValue, ["4k"]) && compareSharesToken(wyrestormValue, ["4k"])) return "Same 4K class";
    return "Resolution differs";
  }

  if (label === "Transport") {
    if (compareSharesToken(competitorValue, ["av over ip"]) && compareSharesToken(wyrestormValue, ["avoip", "networkhd"])) return "Same transport lane";
    if (compareSharesToken(competitorValue, ["hdbaset", "tps"]) && compareSharesToken(wyrestormValue, ["hdbaset", "tps"])) return "Same transport lane";
    if (compareSharesToken(competitorValue, ["hdmi"]) && compareSharesToken(wyrestormValue, ["hdmi"])) return "Same transport lane";
    return "Closest direction";
  }

  if (label === "Signal direction") {
    if (compareSharesToken(competitorValue, ["source side", "encoder"]) && compareSharesToken(wyrestormValue, ["source side", "encoder"])) return "Same signal role";
    if (compareSharesToken(competitorValue, ["display side", "decoder"]) && compareSharesToken(wyrestormValue, ["display side", "decoder"])) return "Same signal role";
    if (compareSharesToken(competitorValue, ["room core", "switching", "in room"]) && compareSharesToken(wyrestormValue, ["room core", "switching", "in room"])) return "Same signal role";
    return "Role differs";
  }

  if (label === "Product type") {
    if (compareSharesToken(competitorValue, ["matrix"]) && compareSharesToken(wyrestormValue, ["matrix"])) return "Matrix match";
    if (compareSharesToken(competitorValue, ["presentation switcher", "switcher"]) && compareSharesToken(wyrestormValue, ["presentation switcher", "switcher"])) return "Switcher match";
    if (compareSharesToken(competitorValue, ["ndi camera", "camera"]) && compareSharesToken(wyrestormValue, ["ndi camera", "camera"])) return "Camera match";
    if (compareSharesToken(competitorValue, ["av over ip"]) && compareSharesToken(wyrestormValue, ["av over ip"])) return "AV-over-IP match";
    return "Closest direction";
  }

  return "Check fit";
}

function _compareQuoteChecks(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  return uniqueText([
    ...candidate.blockers,
    ...candidate.mismatches,
    ...candidate.dependencies,
    ...candidate.unknowns,
    ...candidate.checks,
    ...candidate.gaps,
    ...competitor.verifyItems,
    competitor.warning,
  ].map((item) => commercializeCompareCopy(item)).filter(Boolean), 8);
}

function compareSpecificQuoteChecks(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  return uniqueText([
    ...candidate.unknowns,
    ...candidate.checks,
    ...candidate.gaps,
    ...competitor.verifyItems,
    competitor.warning,
    ...candidate.mismatches,
    ...candidate.blockers,
  ].map((item) => commercializeCompareCopy(item)).filter(Boolean), 8);
}

function compareCompetitorMainCaveat(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  const checks = compareSpecificQuoteChecks(competitor, candidate);
  const preferred = checks.find((item) => /needs checking before quote|closest direction only|not a direct/i.test(item)) || checks[0];

  if (preferred) {
    return preferred;
  }

  if (/presentation switcher/i.test(competitor.recognisedClass)) {
    return "USB path, display behaviour and room workflow need checking before quote.";
  }

  if (/matrix/i.test(competitor.recognisedClass)) {
    return "Input/output count and output behaviour need checking before quote.";
  }

  if (/av-over-ip/i.test(competitor.recognisedClass)) {
    return "Controller, codec and network requirements need checking before quote.";
  }

  if (/hdbaset|extender/i.test(competitor.recognisedClass) || /extender/i.test(competitor.role)) {
    return "Distance, USB and control requirements need checking before quote.";
  }

  if (/ndi camera|ptz camera/i.test(competitor.recognisedClass) || /camera/i.test(competitor.role)) {
    return "Camera control, output path and resolution need checking before quote.";
  }

  if (/wireless/i.test(competitor.recognisedClass) || /wireless/i.test(competitor.role)) {
    return "Wireless policy and guest-share workflow need checking before quote.";
  }

  return "Feature fit needs checking before quote.";
}

function compareWyreStormMainCaveat(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  if (/av-over-ip/i.test(competitor.recognisedClass) && /^NHD-/i.test(candidate.product.sku)) {
    return "Closest direction, not confirmed one-box replacement.";
  }

  if (/presentation switcher/i.test(competitor.recognisedClass) && /^SW-|^MX-/i.test(candidate.product.sku)) {
    return "Switcher direction matches, but USB path and room workflow must line up.";
  }

  if (/matrix/i.test(competitor.recognisedClass) && /^MX/i.test(candidate.product.sku)) {
    return "Matrix direction matches, but routed I/O and output behaviour must line up.";
  }

  if (/hdbaset|extender/i.test(competitor.recognisedClass) || /^EX-/i.test(candidate.product.sku)) {
    return "Extender direction matches, but distance, USB and control must line up.";
  }

  if (/ndi camera|ptz camera/i.test(competitor.recognisedClass) || /^CAM-/i.test(candidate.product.sku)) {
    return "Camera direction matches, but control, optics and output expectations must line up.";
  }

  if (/wireless/i.test(competitor.recognisedClass) || /^SW-6\d{2}.*-W$/i.test(candidate.product.sku)) {
    return "Wireless direction matches, but policy and guest-share expectations must line up.";
  }

  return commercializeCompareCopy(salesImportantDifference(competitor, candidate))
    || "Closest direction, not confirmed one-box replacement.";
}

function compareHeaderCaveat(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  const replacementConfidence = salesReplacementConfidenceLabel(competitor, candidate);
  const preferred = replacementConfidence === "Not a drop-in replacement"
    ? compareWyreStormMainCaveat(competitor, candidate)
    : compareCompetitorMainCaveat(competitor, candidate);
  return preferred.length > 92 ? `${preferred.slice(0, 89).trimEnd()}...` : preferred;
}

function compareDecisionSummaryBullets(
  competitor: CompetitorSummary,
  candidate: ScoredCandidate,
  directionFit: string,
  replacementConfidence: string,
): string[] {
  const firstMatch = commercializeCompareCopy(candidate.matched[0] || candidate.partialMatches[0] || "");
  const secondMatch = commercializeCompareCopy(candidate.matched[1] || candidate.partialMatches[1] || candidate.matched[0] || "");
  const quoteCheck = compareHeaderCaveat(competitor, candidate)
    || commercializeCompareCopy(salesImportantDifference(competitor, candidate));

  return uniqueText([
    `Selected because ${commercializeCompareCopy(wyrestormPlainEnglishRequirement(candidate, competitor))}.`,
    firstMatch
      ? `What matches: ${firstMatch.charAt(0).toLowerCase()}${firstMatch.slice(1)}`
      : `What matches: ${directionFit.toLowerCase()} with ${replacementConfidence.toLowerCase()}.`,
    quoteCheck ? `Check before quote: ${quoteCheck.charAt(0).toLowerCase()}${quoteCheck.slice(1)}` : "",
    secondMatch && secondMatch !== firstMatch ? `Also relevant: ${secondMatch.charAt(0).toLowerCase()}${secondMatch.slice(1)}` : "",
  ], 3);
}

function explicitPortSummary(specs: CompareSpecFacts | undefined, direction: "input" | "output"): string {
  if (!specs) {
    return "";
  }

  const connectorParts = [
    commercialPortLabel(direction === "input" ? specs.hdmiInputs : specs.hdmiOutputs, direction === "input" ? "HDMI input" : "HDMI output", direction === "input" ? "HDMI inputs" : "HDMI outputs"),
    commercialPortLabel(direction === "input" ? specs.displayPortInputs : specs.displayPortOutputs, direction === "input" ? "DisplayPort input" : "DisplayPort output", direction === "input" ? "DisplayPort inputs" : "DisplayPort outputs"),
    commercialPortLabel(direction === "input" ? specs.dviInputs : specs.dviOutputs, direction === "input" ? "DVI input" : "DVI output", direction === "input" ? "DVI inputs" : "DVI outputs"),
    commercialPortLabel(direction === "input" ? specs.vgaInputs : specs.vgaOutputs, direction === "input" ? "VGA input" : "VGA output", direction === "input" ? "VGA inputs" : "VGA outputs"),
    commercialPortLabel(direction === "input" ? specs.sdiInputs : specs.sdiOutputs, direction === "input" ? "SDI input" : "SDI output", direction === "input" ? "SDI inputs" : "SDI outputs"),
    commercialPortLabel(direction === "input" ? specs.compositeInputs : specs.compositeOutputs, direction === "input" ? "composite input" : "composite output", direction === "input" ? "composite inputs" : "composite outputs"),
    commercialPortLabel(direction === "input" ? specs.componentInputs : specs.componentOutputs, direction === "input" ? "component input" : "component output", direction === "input" ? "component inputs" : "component outputs"),
  ].filter(Boolean);

  return joinCommercialFactParts(connectorParts);
}

function inferredCompetitorInputLabel(profile: CompetitorProfile): { singular: string; plural: string } {
  const transport = `${profile.transport} ${profile.resolvedSpec?.transport ?? ""}`.toLowerCase();
  const role = profile.role.toLowerCase();
  const domain = profile.resolvedSpec?.domain ?? "";

  if (domain === "AVOIP" || transport.includes("avoip")) {
    if (/decoder|receiver/.test(role)) return { singular: "LAN/network port", plural: "LAN/network ports" };
    if (transport.includes("hdmi")) return { singular: "HDMI input", plural: "HDMI inputs" };
    return { singular: "local source input", plural: "local source inputs" };
  }

  if (domain === "HDBASET" || /tps|hdbaset/.test(transport)) {
    return { singular: "HDMI input", plural: "HDMI inputs" };
  }

  if (transport.includes("usb-c") && transport.includes("hdmi")) {
    return { singular: "source input (HDMI / USB-C)", plural: "source inputs (HDMI / USB-C)" };
  }

  if (transport.includes("usb-c")) {
    return { singular: "USB-C input", plural: "USB-C inputs" };
  }

  if (transport.includes("hdmi")) {
    return { singular: "HDMI input", plural: "HDMI inputs" };
  }

  return { singular: "source input", plural: "source inputs" };
}

function inferredCompetitorOutputLabel(profile: CompetitorProfile): { singular: string; plural: string } {
  const transport = `${profile.transport} ${profile.resolvedSpec?.transport ?? ""}`.toLowerCase();
  const role = profile.role.toLowerCase();
  const domain = profile.resolvedSpec?.domain ?? "";

  if (domain === "AVOIP" || transport.includes("avoip")) {
    if (/decoder|receiver/.test(role) && transport.includes("hdmi")) return { singular: "HDMI output", plural: "HDMI outputs" };
    return { singular: "LAN/network port", plural: "LAN/network ports" };
  }

  if (transport.includes("tps")) {
    return { singular: "TPS output", plural: "TPS outputs" };
  }

  if (domain === "HDBASET" || transport.includes("hdbaset")) {
    return { singular: "HDBaseT output", plural: "HDBaseT outputs" };
  }

  if (transport.includes("hdmi")) {
    return { singular: "HDMI output", plural: "HDMI outputs" };
  }

  return { singular: "display output", plural: "display outputs" };
}

function competitorInputSummary(profile: CompetitorProfile): string {
  const explicit = explicitPortSummary(profile.resolvedSpec?.specs, "input");

  if (explicit) {
    return explicit;
  }

  const count = profile.resolvedSpec?.inputCount;
  if (!count) {
    return "";
  }

  const label = inferredCompetitorInputLabel(profile);
  return commercialPortLabel(count, label.singular, label.plural);
}

function competitorOutputSummary(profile: CompetitorProfile): string {
  const explicit = explicitPortSummary(profile.resolvedSpec?.specs, "output");

  if (explicit) {
    return explicit;
  }

  const count = profile.resolvedSpec?.outputCount;
  if (!count) {
    return "";
  }

  const label = inferredCompetitorOutputLabel(profile);
  return commercialPortLabel(count, label.singular, label.plural);
}

function wyrestormInputSummary(
  candidate: ScoredCandidate,
  profile: ReturnType<typeof buildWyrestormCompareProfile>,
  knownProfile?: KnownWyrestormCompareProfile,
): string {
  const explicit = explicitPortSummary(profile.specs, "input");

  if (explicit) {
    return explicit;
  }

  if (knownProfile?.routedInputCount) {
    const typeText = knownProfile.inputTypes.length ? ` (${knownProfile.inputTypes.join(" / ")})` : "";
    return `${knownProfile.routedInputCount}x routed source input${knownProfile.routedInputCount === 1 ? "" : "s"}${typeText}`;
  }

  return stripComparePrefix(wyrestormHeadlineIo(candidate, profile.inputCount, profile.outputCount).split(",")[0] ?? "", "Headline I/O");
}

function wyrestormOutputSummary(
  candidate: ScoredCandidate,
  profile: ReturnType<typeof buildWyrestormCompareProfile>,
  knownProfile?: KnownWyrestormCompareProfile,
): string {
  const explicit = explicitPortSummary(profile.specs, "output");
  const extras = joinCommercialFactParts([
    knownProfile?.mirroredOutputCount
      ? `${knownProfile.mirroredOutputCount}x mirrored ${knownProfile.mirroredOutputTypes.join(" / ")} output${knownProfile.mirroredOutputCount === 1 ? "" : "s"}`
      : "",
    knownProfile?.loopOutputCount
      ? `${knownProfile.loopOutputCount}x loop ${knownProfile.loopOutputTypes.join(" / ")} output${knownProfile.loopOutputCount === 1 ? "" : "s"}`
      : "",
  ]);

  if (knownProfile?.routedOutputCount) {
    const routedTypes = knownProfile.routedOutputTypes.length ? ` (${knownProfile.routedOutputTypes.join(" / ")})` : "";
    const routed = `${knownProfile.routedOutputCount}x routed display output${knownProfile.routedOutputCount === 1 ? "" : "s"}${routedTypes}`;
    return joinCommercialFactParts([routed, extras]);
  }

  if (explicit) {
    return joinCommercialFactParts([explicit, extras]);
  }

  const headlineParts = wyrestormHeadlineIo(candidate, profile.inputCount, profile.outputCount).split(",").slice(1).join(",").trim();
  return joinCommercialFactParts([headlineParts, extras]);
}

function competitorComparisonFacts(competitor: CompetitorSummary, profile: CompetitorProfile): Array<{ label: string; value: string }> {
  const unsupportedPorts = unsupportedCompetitorVideoPorts(profile);
  const transport = `${profile.transport} ${profile.resolvedSpec?.transport ?? ""}`.trim();

  return [
    { label: "Inputs", value: competitorInputSummary(profile) },
    { label: "Outputs", value: competitorOutputSummary(profile) },
    { label: "HDMI / HDCP", value: stripComparePrefix(competitorVideoProtectionFacts(profile), "HDMI / HDCP") },
    { label: "USB", value: stripComparePrefix(competitorUsbFacts(profile), "USB") },
    {
      label: "HDBaseT / TPS",
      value: joinCommercialFactParts([
        stripComparePrefix(competitorHdbasetFacts(profile), "HDBaseT"),
        textHasToken(transport, /\btps\b/) ? "TPS transport path evidenced" : "",
      ]),
    },
    { label: "Max resolution", value: competitor.resolution !== "Not verified locally" ? competitor.resolution : "" },
    {
      label: "Control / network",
      value: joinCommercialFactParts([
        stripComparePrefix(competitorControlFacts(profile), "Control"),
        stripComparePrefix(competitorAudioNetworkFacts(profile), "Audio / Network"),
      ]),
    },
    { label: "Other video I/O", value: unsupportedPorts.join(", ") },
  ].filter((entry) => entry.value);
}

function buildCoreComparisonFacts(
  competitor: CompetitorSummary,
  profile: CompetitorProfile,
  wyrestorm: WyreStormSummary,
  candidate: ScoredCandidate,
): CompareCoreFact[] {
  const competitorFacts = new Map(competitorComparisonFacts(competitor, profile).map((entry) => [entry.label, entry.value]));
  const wyrestormFacts = new Map(wyrestorm.comparisonFacts.map((entry) => [entry.label, entry.value]));
  const mainQuoteCheck = compareCompetitorMainCaveat(competitor, candidate);
  const wyrestormCaveat = compareWyreStormMainCaveat(competitor, candidate);
  const entries: CompareCoreFact[] = [
    {
      label: "Product type",
      competitor: safeCompareValue(competitor.recognisedClass),
      wyrestorm: safeCompareValue(wyrestorm.productType),
      result: "",
    },
    {
      label: "Inputs",
      competitor: safeCompareValue(competitorFacts.get("Inputs")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Inputs")),
      result: "",
    },
    {
      label: "Outputs",
      competitor: safeCompareValue(competitorFacts.get("Outputs")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Outputs")),
      result: "",
    },
    {
      label: "USB",
      competitor: safeCompareValue(competitorFacts.get("USB")),
      wyrestorm: safeCompareValue(wyrestormFacts.get("USB")),
      result: "",
    },
    {
      label: "Max resolution",
      competitor: safeCompareValue(competitorFacts.get("Max resolution") || competitor.resolution),
      wyrestorm: safeCompareValue(wyrestormFacts.get("Max resolution") || wyrestorm.resolution),
      result: "",
    },
    {
      label: "Transport",
      competitor: safeCompareValue(competitor.transport),
      wyrestorm: safeCompareValue(wyrestorm.transport),
      result: "",
    },
    {
      label: "Signal direction",
      competitor: safeCompareValue(competitor.signalDirection),
      wyrestorm: safeCompareValue(wyrestorm.signalDirection),
      result: "",
    },
    {
      label: "Main caveat",
      competitor: safeCompareValue(mainQuoteCheck),
      wyrestorm: safeCompareValue(wyrestormCaveat),
      result: "Check before quote",
    },
  ];

  return entries
    .filter((entry) => entry.competitor || entry.wyrestorm)
    .map((entry) => ({
      ...entry,
      competitor: commercializeCompareCopy(entry.competitor),
      wyrestorm: commercializeCompareCopy(entry.wyrestorm),
      result: entry.result || compareRowResult(entry.label, entry.competitor, entry.wyrestorm),
    }));
}

function shortRoleLabel(role: string): string {
  const value = role.trim();
  if (/ndi camera/i.test(value)) return "NDI camera";
  if (/ptz camera/i.test(value)) return "PTZ camera";
  if (/wireless casting/i.test(value)) return "wireless presentation endpoint";
  if (/encoder|transmitter/i.test(value)) return "source-side AV-over-IP encoder";
  if (/decoder|receiver/i.test(value)) return "display-side AV-over-IP decoder";
  if (/transceiver/i.test(value)) return "AV-over-IP transceiver";
  if (/tx\/rx extender kit/i.test(value)) return "point-to-point HDBaseT extender kit";
  if (/usb extender/i.test(value)) return "USB extension endpoint";
  if (/presentation switcher|switcher/i.test(value)) return "presentation switcher";
  if (/matrix/i.test(value)) return "matrix switcher";
  if (/video wall/i.test(value)) return "video wall processor";
  return value.toLowerCase();
}

function competitorPlainEnglishPurpose(competitor: CompetitorSummary): string {
  if (/ndi camera/i.test(competitor.recognisedClass) || /ndi camera/i.test(competitor.role)) {
    return "capture the room as an NDI-capable camera source";
  }

  if (/ptz camera/i.test(competitor.recognisedClass) || /ptz camera/i.test(competitor.role)) {
    return "capture the room as a controllable PTZ camera source";
  }

  if (/wireless casting/i.test(competitor.recognisedClass) || /wireless casting/i.test(competitor.role)) {
    return "let users share content wirelessly into the room system";
  }

  if (/av-over-ip/i.test(competitor.recognisedClass) && /encoder|transmitter/i.test(competitor.role)) {
    const verifiedText = [...competitor.identityItems, ...competitor.knownFeatures].join(" ");

    if (/HDMI input/i.test(verifiedText)) {
      return "put a local HDMI source into an AV-over-IP distribution system";
    }

    return "put a local source into an AV-over-IP distribution system";
  }

  if (/av-over-ip/i.test(competitor.recognisedClass) && /decoder|receiver/i.test(competitor.role)) {
    return "pull a stream back out of an AV-over-IP system at the display end";
  }

  if (/hdbaset/i.test(competitor.recognisedClass) || /extender/i.test(competitor.role)) {
    return "extend a source to a remote display or device over category cable";
  }

  if (/matrix/i.test(competitor.recognisedClass)) {
    return "route multiple sources to different display destinations";
  }

  if (/presentation/i.test(competitor.recognisedClass)) {
    return "switch room sources cleanly for a meeting-room or presentation workflow";
  }

  if (/video wall/i.test(competitor.recognisedClass)) {
    return "build and control a dedicated video wall layout";
  }

  return "solve the same system requirement in the competitor ecosystem";
}

function wyrestormPlainEnglishRequirement(candidate: ScoredCandidate, competitor: CompetitorSummary): string {
  if (/^CAM-210-NDI-PTZ$/i.test(candidate.product.sku)) {
    return "the customer needs an actual NDI PTZ camera rather than a transport endpoint elsewhere in the system";
  }

  if (/^CAM-420-PTZ$/i.test(candidate.product.sku)) {
    return "the customer needs a controllable room camera and the discussion is really about PTZ coverage, framing and output path";
  }

  if (/^CAM-0402-NDI-BRG$/i.test(candidate.product.sku)) {
    return "several camera feeds need to be bridged or combined, rather than replacing the camera itself";
  }

  if (/NHD-500-TX/i.test(candidate.product.sku)) {
    return "encoding a local source into a WyreStorm NetworkHD 500 system";
  }

  if (/NHD-500-E-TX/i.test(candidate.product.sku)) {
    return "a lighter NetworkHD 500 source encoder path without stepping up to richer endpoint features";
  }

  if (/NHD-510-TX/i.test(candidate.product.sku)) {
    return "encoding into NetworkHD 500 where Dante or audio-network workflow matters";
  }

  if (/^EX-/i.test(candidate.product.sku)) {
    return "point-to-point extension over category cable rather than switching or matrix routing";
  }

  if (/^MX-0404-SCL$/i.test(candidate.product.sku)) {
    return "a contained local matrix with fixed routed HDMI outputs";
  }

  if (/^MX/i.test(candidate.product.sku)) {
    return "routed source-to-display switching inside a contained matrix system";
  }

  if (/^SW-020[46]-VW$/i.test(candidate.product.sku)) {
    return "a dedicated WyreStorm video wall processor path";
  }

  if (/^SW-|presentation/i.test(candidate.product.productClass)) {
    return "presentation-room switching and source ownership in one room";
  }

  if (/av-over-ip/i.test(competitor.recognisedClass)) {
    return "the same endpoint role inside the correct WyreStorm AV-over-IP family";
  }

  return "the same system role in a WyreStorm design";
}

function _salesOutcomeBadges(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  const badges: string[] = [];

  if (candidate.outcomeLabel !== "Wrong product type" && candidate.outcomeLabel !== "Insufficient competitor data") badges.push("Correct product direction");
  if (candidate.matched.some((item) => /Same endpoint role/i.test(item))) badges.push("Same product job");
  if (candidate.matched.some((item) => /Same product class|Same product class: point-to-point HDBaseT extender path|Same NetworkHD 500 source-side encoder architecture|matrix/i.test(item))) badges.push("Same system type");
  if (candidate.mismatches.length > 0 || candidate.blockers.length > 0) badges.push("Not drop-in compatible");
  if (candidate.unknowns.length > 0 || competitor.warning) badges.push("Feature check needed");
  if (candidate.outcomeLabel === "Wrong product type") badges.push("Wrong product type");
  if (candidate.outcomeLabel === "Insufficient competitor data") badges.push("Insufficient competitor data");

  return uniqueText(badges, 5);
}

function salesWhyBullets(candidate: ScoredCandidate): string[] {
  return uniqueText([
    ...candidate.matched,
    ...candidate.partialMatches,
  ], 4);
}

function salesImportantDifference(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  if (/av-over-ip/i.test(competitor.recognisedClass) && /^NHD-5/i.test(candidate.product.sku)) {
    return `Correct WyreStorm direction, not a drop-in replacement. ${competitor.ecosystem} and WyreStorm NetworkHD are separate ecosystems, so this should be positioned as the right system direction rather than a one-box swap.`;
  }

  if (/hdbaset/i.test(competitor.recognisedClass) && /^EX-/i.test(candidate.product.sku)) {
    return "This stays in the same point-to-point extension lane, but HDMI version, HDBaseT class, cable distance and USB/control behaviour still need to match before it is treated as equivalent.";
  }

  if (/matrix/i.test(competitor.recognisedClass) && /^MX/i.test(candidate.product.sku)) {
    return "This is the right WyreStorm matrix direction, but it is only a safe match if the routed I/O size, output behaviour and required signal format really line up with the competitor design.";
  }

  if (candidate.mismatches[0]) {
    return candidate.mismatches[0];
  }

  return "This is the closest WyreStorm direction from the local evidence, but it should be positioned as a system-fit answer rather than a guaranteed one-box replacement.";
}

function salesAskCustomer(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  const visiblePrompts = uniqueText([
    ...competitor.verifyItems,
    ...candidate.dependencies,
    ...candidate.unknowns,
  ], 8).filter((item) => !/^Why this matters:/i.test(item) && !/^Educational point:/i.test(item));

  if (competitor.warning) {
    return visiblePrompts.slice(0, 5);
  }

  return visiblePrompts.slice(0, 5);
}

function _salesWhatItDoes(competitor: CompetitorSummary): string {
  return `${competitor.heading} is used to ${competitorPlainEnglishPurpose(competitor)}.`;
}

function competitorIdentityItems(competitor: CompetitorSummary): string[] {
  return uniqueText([
    ...competitor.identityItems,
    competitor.resolution && competitor.resolution !== "Not verified locally" && !competitor.identityItems.some((item) => item.includes(competitor.resolution))
      ? `Key feature callouts: Resolution ${competitor.resolution}.`
      : "",
  ], 4);
}

function openGuruForCompare(competitor: CompetitorSummary, candidate: ScoredCandidate) {
  if (typeof window === "undefined") {
    return;
  }

  const prompt = [
    `Explain this compare result in plain English.`,
    `Competitor: ${competitor.heading} - ${competitor.detail}.`,
    `Wingman suggested: ${candidate.product.sku} - ${candidate.product.name}.`,
    `Focus on what the competitor product appears to be, why this WyreStorm direction was selected, the main difference, and what must be checked before quote.`,
  ].join(" ");

  window.dispatchEvent(new CustomEvent("wingman:open-guru", { detail: { prompt } }));
}

function salesDirectionFitLabel(candidate: ScoredCandidate): string {
  if (candidate.outcomeLabel === "Insufficient competitor data") return "Insufficient competitor data";
  if (candidate.outcomeLabel === "Wrong product type") return "Wrong product type";
  return "Correct product direction";
}

function salesReplacementConfidenceLabel(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  if (/av-over-ip/i.test(competitor.recognisedClass) && /^NHD-/i.test(candidate.product.sku)) {
    return "Not a drop-in replacement";
  }

  if (candidate.mismatches.length > 0 || candidate.blockers.length > 0) {
    return "Not a drop-in replacement";
  }

  if (candidate.unknowns.length > 0 || competitor.warning) {
    return "Feature check needed";
  }

  return "Same product job";
}

function CompareManufacturerCombobox(props: {
  brands: string[];
  selectedBrand: string;
  onBrandSelect: (brand: string) => void;
}) {
  return (
    <section className="compare-native-card compare-native-card--compact wm-ui-card">
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-manufacturer">Manufacturer</label>
      <input
        id="compare-manufacturer"
        className="compare-native-input wm-ui-input"
        value={props.selectedBrand}
        onChange={(event) => props.onBrandSelect(event.target.value)}
        placeholder="Type competitor brand"
      />
      <div className="compare-native-chip-row" aria-label="Known manufacturers">
        {props.brands.map((brand) => (
          <button
            key={brand}
            className={`compare-native-chip wm-ui-button ${brand === props.selectedBrand ? "wm-ui-button-selected" : "wm-ui-button-secondary"}`}
            type="button"
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
    <section className="compare-native-card compare-native-card--compact wm-ui-card" data-wingman-compare-auto-advance="true">
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-competitor-sku">Competitor SKU</label>
      <input
        id="compare-competitor-sku"
        className="compare-native-input wm-ui-input"
        value={props.value}
        onChange={(event) => props.onInputChange(event.target.value)}
        placeholder="Type competitor SKU or select from the known list"
        data-wingman-sku-normalisation="true"
      />

      <div className="compare-native-sku-block">
        <button className="compare-native-chip compare-native-chip--custom wm-ui-button wm-ui-button-secondary" type="button" onClick={() => props.onSkuSelect("CUSTOM / missing SKU")}>
          CUSTOM / missing SKU
        </button>

        <p className="compare-native-label compare-native-label--subtle">Known SKUs for selected brand</p>

        <div className="compare-native-chip-row">
          {props.knownSkus.length > 0 ? (
            props.knownSkus.map((skuOption) => (
              <button key={skuOption} className="compare-native-chip wm-ui-button wm-ui-button-secondary" type="button" onClick={() => props.onSkuSelect(skuOption)}>
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
                <button key={skuOption} className="compare-native-chip wm-ui-button wm-ui-button-secondary" type="button" onClick={() => props.onSkuSelect(skuOption)}>
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


function CompareEvidenceMatrix({ candidate, competitor }: { candidate: ScoredCandidate; competitor: unknown }) {
  const readText = (source: unknown, keys: string[], fallback: string) => {
    if (!source || typeof source !== "object") {
      return fallback;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value)) {
        const joined = value
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .slice(0, 3)
          .join(" | ");

        if (joined) {
          return joined;
        }
      }
    }

    return fallback;
  };
  const readScore = (source: unknown) => {
    if (!source || typeof source !== "object") {
      return null;
    }

    const record = source as Record<string, unknown>;
    const keys = ["score", "matchScore", "fitScore", "scorePercent", "confidence"];

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "number" && Number.isFinite(value)) {
        return value <= 1 ? Math.round(value * 100) : Math.round(value);
      }

      if (typeof value === "string") {
        const parsed = Number(value.replace("%", "").trim());

        if (Number.isFinite(parsed)) {
          return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
        }
      }
    }

    return null;
  };

  const scoreExplanation = (score: number | null) => {
    const reason = first([...candidate.matched, ...candidate.partialMatches], "the available evidence shows some relevant fit");
    const caveat = first([...candidate.mismatches, ...candidate.gaps, ...candidate.unknowns], "there are still details to confirm before treating this as a like-for-like replacement");

    if (score === null) {
      return `Score not shown because the comparison did not expose a numeric score. Treat this as a shortlist result: ${reason}; ${caveat}.`;
    }

    if (score >= 90) {
      return `${score}% because the product role and evidence are strongly aligned. Main fit: ${reason}. Still confirm: ${caveat}.`;
    }

    if (score >= 75) {
      return `${score}% because the product appears to fit the main requirement, but it is not fully proven as a like-for-like replacement. Main fit: ${reason}. Check: ${caveat}.`;
    }

    if (score >= 60) {
      return `${score}% because this is a plausible architecture or product-family match, but important details are incomplete or different. Main fit: ${reason}. Gap to check: ${caveat}.`;
    }

    return `${score}% because the candidate only partially matches the competitor requirement. Main fit: ${reason}. Risk: ${caveat}.`;
  };

  const competitorSku = readText(competitor, ["sku", "model", "partNumber", "name", "title"], "Competitor product not clearly identified");
  const competitorBrand = readText(competitor, ["manufacturer", "brand", "vendor"], "Competitor brand not captured");
  const competitorType = readText(competitor, ["productClass", "class", "category", "family", "type", "role"], "Competitor product type not captured");
  const wyrestormType = `${candidate.product.family} - ${candidate.product.productClass} - ${candidate.product.role}`;
  const displayedScore = readScore(candidate);
  const first = (items: string[] | undefined, fallback: string) => {
    const value = uniqueText(items ?? [], 1)[0];
    return value && value.trim() ? value : fallback;
  };

  const joined = (items: string[] | undefined, fallback: string, limit = 2) => {
    const values = uniqueText(items ?? [], limit).filter((item) => item.trim().length > 0);
    return values.length ? values.join(" | ") : fallback;
  };

  const quoteChecks = uniqueText([
    ...candidate.blockers,
    ...candidate.unknowns,
    ...candidate.checks,
    ...candidate.gaps
  ], 3);

  const rows = [
    {
      label: "Competitor product",
      evidence: `${competitorBrand} - ${competitorSku} - ${competitorType}`,
      meaning: "Identifies what the customer is actually asking Wingman to compare."
    },
    {
      label: "WyreStorm candidate",
      evidence: wyrestormType,
      meaning: "Shows the WyreStorm product type being proposed, so sales can see whether it is the same class or an architecture alternative."
    },
    {
      label: "Why it scored",
      evidence: first(candidate.matched, "No strong matched fact was captured."),
      meaning: "The strongest direct reason this candidate was shortlisted."
    },
    {
      label: "Score explanation",
      evidence: scoreExplanation(displayedScore),
      meaning: "Translates the match percentage into plain sales language, including the main reason and the main caveat."
    },
    {
      label: "Confirmed fit",
      evidence: joined(candidate.matched, "No confirmed fit evidence captured.", 2),
      meaning: "Facts that make this a credible WyreStorm alternative."
    },
    {
      label: "Important differences",
      evidence: joined(candidate.mismatches, "No specific difference captured.", 2),
      meaning: "Reasons the recommendation may not be a like-for-like replacement."
    },
    {
      label: "Why not 100%",
      evidence: first([...candidate.mismatches, ...candidate.gaps, ...candidate.unknowns], "The available evidence does not show a material gap."),
      meaning: "Explains why the score should be treated as a fit indicator, not a guarantee."
    },
    {
      label: "Check before quoting",
      evidence: quoteChecks.length ? quoteChecks.join(" | ") : "Confirm source, display, USB, audio, control and distance requirements before quoting.",
      meaning: "Commercial or technical checks needed before using this in a proposal."
    },
    {
      label: "WyreStorm dependencies",
      evidence: joined(candidate.dependencies, "No additional WyreStorm dependency captured.", 2),
      meaning: "Items that may need adding to the system design or BOM."
    }
  ];

  return (
    <section className="compare-native-evidence-matrix" aria-label="Compare evidence matrix">
      <div className="compare-native-evidence-matrix__header">
        <h4>Comparison evidence matrix</h4>
        <p>Plain-English explanation of the match result, gaps and quote checks.</p>
      </div>
      <div className="compare-native-evidence-matrix__grid">
        {rows.map((row) => (
          <div className="compare-native-evidence-matrix__row" key={row.label}>
            <div className="compare-native-evidence-matrix__label">{row.label}</div>
            <div className="compare-native-evidence-matrix__evidence">{row.evidence}</div>
            <div className="compare-native-evidence-matrix__meaning">{row.meaning}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
function BestCandidateCard({
  candidate,
  competitor,
  competitorProfile,
  onCopySummary,
}: {
  candidate: ScoredCandidate;
  competitor: CompetitorSummary;
  competitorProfile: CompetitorProfile;
  onCopySummary: () => void;
}) {
  const directionFit = salesDirectionFitLabel(candidate);
  const replacementConfidence = salesReplacementConfidenceLabel(competitor, candidate);
  const wyrestorm = buildWyrestormSummary(candidate);
  const coreFacts = buildCoreComparisonFacts(competitor, competitorProfile, wyrestorm, candidate);
  const whyBullets = salesWhyBullets(candidate);
  const askCustomer = salesAskCustomer(competitor, candidate);
  const decisionBullets = compareDecisionSummaryBullets(competitor, candidate, directionFit, replacementConfidence);
  const headerCaveat = compareHeaderCaveat(competitor, candidate);

  return (
    <section className="compare-native-best-card">
      <div className="compare-native-result-head">
        <span className={`compare-native-verdict ${verdictClass(candidate.verdict)}`}>{candidate.verdict}</span>
        <span className="compare-native-score">{directionFit}</span>
        {headerCaveat ? <span className="compare-native-score compare-native-score--caveat">{headerCaveat}</span> : null}
      </div>

      <div className="compare-native-product-card compare-native-product-card--best">
        <div className="compare-native-result-summary">
          <section className="compare-native-result-panel">
            <p className="compare-native-label compare-native-label--subtle">Competitor matched against</p>
            <h3>{competitor.heading}</h3>
            <h4>{competitor.detail}</h4>
            <p className="compare-native-match-anchor">{shortRoleLabel(competitor.role)} | {competitor.transport}</p>
          </section>

          <section className="compare-native-result-panel compare-native-result-panel--wyrestorm">
            <p className="compare-native-label compare-native-label--subtle">Suggested WyreStorm direction</p>
            <h3>{wyrestorm.heading}</h3>
            <h4>{wyrestorm.detail}</h4>
            <p className="compare-native-match-anchor">{wyrestorm.family} | {wyrestorm.transport}</p>
            <div className="compare-native-fact-row compare-native-fact-row--tight" aria-label="WyreStorm outcome facts">
              <span className="compare-native-fact-pill">{replacementConfidence}</span>
            </div>
          </section>
        </div>

        {coreFacts.length ? (
          <section className="compare-native-core-facts" aria-label="Core comparison points">
            <p className="compare-native-label compare-native-label--subtle">Key comparison matrix</p>
            <div className="compare-native-core-matrix" role="table" aria-label="Competitor versus WyreStorm comparison matrix">
              <div className="compare-native-core-matrix-header" role="rowgroup">
                <div className="compare-native-core-matrix-row compare-native-core-matrix-row--header" role="row">
                  <span className="compare-native-core-matrix-heading" role="columnheader">Comparison point</span>
                  <span className="compare-native-core-matrix-heading" role="columnheader">Competitor</span>
                  <span className="compare-native-core-matrix-heading" role="columnheader">WyreStorm</span>
                  <span className="compare-native-core-matrix-heading" role="columnheader">Result</span>
                </div>
              </div>
              <div className="compare-native-core-matrix-body" role="rowgroup">
                {coreFacts.map((fact) => (
                  <article key={`core-fact-${fact.label}`} className="compare-native-core-matrix-row" role="row">
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--point" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Comparison point</span>
                      <strong>{fact.label}</strong>
                    </div>
                    <div className="compare-native-core-matrix-cell" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Competitor</span>
                      <p>{fact.competitor || "Not verified locally"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--wyrestorm" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">WyreStorm</span>
                      <p>{fact.wyrestorm || "Confirm in WyreStorm datasheet"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--result" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Result</span>
                      <p>{fact.result}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="compare-native-decision-summary" aria-label="Decision summary">
          <p className="compare-native-label compare-native-label--subtle">Decision summary</p>
          <ul className="compare-native-decision-list">
            {decisionBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>

        <details className="compare-native-summary">
          <summary>Quote checks</summary>
          <CompareEvidenceList title="Check before quote" items={askCustomer} className="compare-native-evidence--warn" />
        </details>

        <details className="compare-native-summary">
          <summary>Why this fits</summary>
          <CompareEvidenceList title="Matched points" items={whyBullets} />
        </details>

        <details className="compare-native-summary">
          <summary>Full evidence trace</summary>
          <div className="compare-native-compare-grid">
            <div className="compare-native-product-card compare-native-product-card--competitor">
              <p className="compare-native-label compare-native-label--subtle">Competitor detail</p>
              <h3>{competitor.heading}</h3>
              <h4>{competitor.detail}</h4>
              <p className="compare-native-match-anchor">{competitor.outcomeLabel}</p>
              <CompareEvidenceList title="Verified product identity" items={competitorIdentityItems(competitor)} />
              {competitor.facts.length ? (
                <div className="compare-native-fact-row" aria-label="Competitor headline facts">
                  {competitor.facts.map((fact) => (
                    <span key={`${fact.label}-${fact.value}`} className="compare-native-fact-pill">{fact.label}: {fact.value}</span>
                  ))}
                </div>
              ) : null}
              <CompareEvidenceList title="Known features" items={competitor.knownFeatures} />
              <CompareEvidenceList title="Unknowns" items={competitor.unknownFeatures.slice(0, 5)} className="compare-native-evidence--warn" />
              {competitor.sourceUrl ? (
                <div className="compare-native-action-row">
                  <a className="compare-native-secondary-action" href={competitor.sourceUrl} target="_blank" rel="noreferrer">
                    Open competitor reference
                  </a>
                </div>
              ) : null}
            </div>

            <div className="compare-native-product-card compare-native-product-card--best">
              <p className="compare-native-label compare-native-label--subtle">WyreStorm detail</p>
              <h3>{candidate.product.sku}</h3>
              <h4>{candidate.product.name}</h4>
              <p>{candidate.product.family} - {candidate.product.productClass} - {candidate.product.role}</p>
              <p className="compare-native-match-anchor">{directionFit}</p>
              <CompareEvidenceList title="Why this WyreStorm product" items={wyrestorm.identityItems} />
              <CompareEvidenceMatrix candidate={candidate} competitor={competitor} />
              <CompareEvidenceList title="Strong fit areas" items={candidate.matched.slice(0, 5)} />
              <CompareEvidenceList title="Deeper why this fits" items={candidate.partialMatches.slice(0, 4)} />
              <CompareEvidenceList title="Important differences" items={candidate.mismatches.slice(0, 4)} className="compare-native-evidence--danger" />
              <CompareEvidenceList title="Unknowns" items={uniqueText([...candidate.unknowns, ...candidate.checks, ...candidate.gaps], 6)} className="compare-native-evidence--warn" />
              <CompareEvidenceList title="Quote blockers" items={candidate.blockers.slice(0, 4)} className="compare-native-evidence--danger" />
              <CompareEvidenceList title="Required WyreStorm dependencies" items={candidate.dependencies.slice(0, 5)} />
            </div>
          </div>
        </details>

        <div className="compare-native-action-row">
          <button className="compare-native-secondary-action" type="button" onClick={onCopySummary}>Copy summary</button>
          <button className="compare-native-secondary-action" type="button" onClick={() => openGuruForCompare(competitor, candidate)}>
            Ask Guru
          </button>
          <ProductMoreLink sku={candidate.product.sku} />
        </div>
      </div>
    </section>
  );
}

function CandidateOptionCard({ candidate }: { candidate: ScoredCandidate }) {
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
        <span className="compare-native-score">{candidate.outcomeLabel}</span>
      </div>

      <p className="compare-native-option-note">{commercializeCompareCopy(candidate.matched[0]) || "Closest role-compatible WyreStorm option from the current Compare data."}</p>
      {candidate.partialMatches[0] ? <p className="compare-native-option-note">{commercializeCompareCopy(candidate.partialMatches[0])}</p> : null}
      {candidate.mismatches[0] ? <p className="compare-native-option-check">{commercializeCompareCopy(candidate.mismatches[0])}</p> : null}
      {!candidate.mismatches[0] && candidate.unknowns[0] ? <p className="compare-native-option-check">{commercializeCompareCopy(candidate.unknowns[0])}</p> : null}

      <details className="compare-native-summary">
        <summary>Why this option was shortlisted</summary>
        <CompareEvidenceList title="Why this direction" items={candidate.matched.slice(0, 3)} />
        <CompareEvidenceList title="Important differences" items={candidate.mismatches.slice(0, 2)} className="compare-native-evidence--danger" />
        <CompareEvidenceList title="Commercial checks" items={uniqueText([...candidate.unknowns, ...candidate.checks, ...candidate.gaps, ...candidate.dependencies], 4)} className="compare-native-evidence--warn" />
      </details>

      <div className="compare-native-action-row">
        <ProductMoreLink sku={candidate.product.sku} />
      </div>
    </article>
  );
}

function CompareSummaryPanel({ summary, requestLiveLookup, sourceUrl }: { summary: string; requestLiveLookup: boolean; sourceUrl: string }) {
  return (
    <details className="compare-native-summary">
      <summary>Copyable summary</summary>
      <pre>{summary}</pre>
      {requestLiveLookup ? <p className="compare-native-muted">Live lookup recommended for source validation. {sourceUrl}</p> : null}
    </details>
  );
}

const COMPARE_STAGES: Array<{ key: CompareStage; step: string; title: string }> = [
  { key: "brand", step: "Step 1", title: "Choose competitor brand" },
  { key: "sku", step: "Step 2", title: "Choose competitor product" },
  { key: "results", step: "Step 3", title: "Review WyreStorm direction" },
];

function ComparePageNew() {
  const bestMatchRef = useRef<HTMLDivElement | null>(null);
  const [selectedBrand, setSelectedBrand] = useState("Atlona");
  const [competitorInput, setCompetitorInput] = useState("");
  const [mustMatchFeatures, setMustMatchFeatures] = useState("");
  const [workflowStep, setWorkflowStep] = useState<"capture" | "options">("capture");
  const [compareStage, setCompareStage] = useState<CompareStage>("brand");
  const [hasCompared, setHasCompared] = useState(false);
  const [, setState] = useState<"capture" | "analyzing" | "results">("capture");
  const [customSkuStore, setCustomSkuStore] = useState<string[]>([]);
  const [customManufacturerStore, setCustomManufacturerStore] = useState<string[]>([]);
  const [customManufacturerInput, setCustomManufacturerInput] = useState("");
  const [isAddingManufacturer, setIsAddingManufacturer] = useState(false);
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
  const hasCompetitorSelection = competitorInput.trim().length > 0;

  const compareManufacturerOptions = useMemo(() => {
    const seededBrands = new Set(MANUFACTURER_SELECT_OPTIONS.map((brand) => brand.toLowerCase()));
    const newBrands = customManufacturerStore.filter((brand) => !seededBrands.has(brand.toLowerCase()));
    return [...newBrands, ...MANUFACTURER_SELECT_OPTIONS];
  }, [customManufacturerStore]);
  const scoredCandidates = useMemo(() => {
    const avoip = avoipProfile;
    const shouldUseAvoipFastPath = avoip.recommendation.applies && profile.productClass === "AV-over-IP";

    if (shouldUseAvoipFastPath) {
      return buildAvoipCandidates(profile, avoip.classification, avoip.recommendation);
    }

    const matrixCandidates = buildMatrixCandidates(profile);

    if (matrixCandidates?.length) {
      return matrixCandidates;
    }

    return WYRESTORM_PRODUCTS
      .filter((product) => !isBannedNetworkHdSku(product.sku))
      .filter((product) => isWyreStormSkuCompareLeadAllowed(product.sku))
      .map((product) => scoreProduct(profile, product))
      .filter((candidate) => isSelectableWyrestormRecommendation(candidate.product))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [avoipProfile, profile]);

  const viableCandidates = useMemo(
    () => scoredCandidates.filter((candidate) => candidate.verdict !== "NO MATCH"),
    [scoredCandidates],
  );
  const best = viableCandidates[0] ?? null;
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
  const alternativeCandidates = best
    ? viableCandidates.filter((candidate) => candidate.product.sku !== best.product.sku)
    : [];
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
    setCompareStage("results");
    setState("results");
  }, [effectiveBrand, mustMatchFeatures]);

  const handleSubmit = useCallback((event?: { preventDefault?: () => void }): void => {
    event?.preventDefault?.();

    runKnownProfileCompare(profile);
    setHasCompared(true);
    setWorkflowStep("options");
    setCompareStage("results");
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

    const directionFit = salesDirectionFitLabel(best);
    const replacementConfidence = salesReplacementConfidenceLabel(competitorSummary, best);
    const askCustomer = salesAskCustomer(competitorSummary, best).map((line) => commercializeCompareCopy(line)).filter(Boolean);
    const identityItems = competitorIdentityItems(competitorSummary);
    const limitedWarning = exactLimitedDataWarning(profile);

    return [
      `${competitorSummary.heading} appears to be a ${shortRoleLabel(competitorSummary.role)}.`,
      ...identityItems.map((line) => line),
      `The closest WyreStorm direction is ${best.product.sku} because it performs the same basic job in a ${best.product.family} system.`,
      `${directionFit}. ${replacementConfidence}.`,
      salesImportantDifference(competitorSummary, best),
      ...(limitedWarning ? [limitedWarning] : []),
      "",
      "Ask the customer before quoting:",
      ...askCustomer.slice(0, 4).map((line) => `- ${line}`),
    ].join("\n");
  }, [best, competitorSummary, profile]);

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

  function saveCustomManufacturer(): void {
    const brand = customManufacturerInput.trim();

    if (!brand) {
      return;
    }

    const lowerBrand = brand.toLowerCase();

    setCustomManufacturerStore((current) => {
      const alreadyCustom = current.some((item) => item.toLowerCase() === lowerBrand);
      const alreadySeeded = MANUFACTURER_SELECT_OPTIONS.some((item) => item.toLowerCase() === lowerBrand);

      if (alreadyCustom || alreadySeeded) {
        return current;
      }

      return [brand, ...current].slice(0, 12);
    });

    setSelectedBrand(brand);
    setCompetitorInput("");
    setCommittedSku(null);
    setMustMatchFeatures("");
    setWorkflowStep("capture");
    setHasCompared(false);
    setState("capture");
    setCustomManufacturerInput("");
    setIsAddingManufacturer(false);
    setCompareStage("sku");
  }
  function onBrandSelect(brand: string): void {
    setSelectedBrand(brand);
    setCompetitorInput("");
    setCommittedSku(null);
    setIsAddingManufacturer(false);
    setCustomManufacturerInput("");
    setCompareStage("sku");
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
    setCompareStage("results");
  }

  function resetCompare(): void {
    setSelectedBrand("Atlona");
    setCompetitorInput("");
    setMustMatchFeatures("");
    setWorkflowStep("capture");
    setCompareStage("brand");
    setHasCompared(false);
    setCustomSkuStore([]);
    setCustomManufacturerStore([]);
    setCustomManufacturerInput("");
    setIsAddingManufacturer(false);
    setCommittedSku(null);
  }

  async function copySummary(): Promise<void> {
    await navigator.clipboard.writeText(summary);
  }

  handleRetryWithSourceUrl("");

  return (
    <main className="compare-native-page wm-ui-page wingman-page-host" data-wingman-page="compare">
      <section className="compare-native-hero wm-ui-hero">
        <div>
          <p className="compare-native-eyebrow wm-ui-kicker">Competitor Compare</p>
          <h1 className="wm-ui-title">Find the nearest WyreStorm product direction</h1>
          <p className="wm-ui-copy">
            Move through the compare workflow one step at a time so the user sees the product direction first, then the deeper evidence only when needed, while Wingman keeps the result quote-safe.
          </p>
        </div>
        <button className="compare-native-reset wm-ui-button wm-ui-button-secondary" type="button" onClick={handleReset}>Reset compare</button>
      </section>

      <nav className="compare-native-stage-rail" aria-label="Compare workflow steps">
        {COMPARE_STAGES.map((stage, index) => {
          const isActive = compareStage === stage.key;
          const currentIndex = COMPARE_STAGES.findIndex((item) => item.key === compareStage);
          const isComplete = currentIndex > index;
          const isLocked = stage.key === "results" && !hasCompared;

          return (
            <button
              key={stage.key}
              type="button"
              className={`compare-native-stage-card wm-ui-card${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
              onClick={() => {
                if (isLocked) {
                  return;
                }

                setCompareStage(stage.key);
              }}
              aria-current={isActive ? "step" : undefined}
              disabled={isLocked}
            >
              <span className="compare-native-stage-step">{stage.step}</span>
              <strong>{stage.title}</strong>
            </button>
          );
        })}
      </nav>

      {compareStage === "brand" ? (
        <section className="compare-native-results compare-native-results--stage wm-ui-section" aria-live="polite">
          <div className="compare-native-section-title wm-ui-card-header">
            <h2 className="wm-ui-title">Choose competitor brand</h2>
            <p className="wm-ui-copy">Start with the manufacturer so Wingman can narrow the SKU list and compare against the right product family.</p>
          </div>

          <CompareManufacturerCombobox brands={compareManufacturerOptions} selectedBrand={selectedBrand} onBrandSelect={onBrandSelect} />

          <section className="compare-native-card compare-native-card--compact compare-native-guidance-card">
            <p className="compare-native-label compare-native-label--subtle">Why this step matters</p>
            <p>Picking the brand first keeps the next screen shorter and avoids mixing unlike technologies before the actual competitor product has been chosen.</p>
          </section>

          {isAddingManufacturer ? (
            <section className="compare-native-card compare-native-card--compact wm-ui-card">
              <label className="compare-native-label wm-ui-kicker" htmlFor="compare-custom-manufacturer">Missing manufacturer name</label>
              <input
                id="compare-custom-manufacturer"
                className="compare-native-input wm-ui-input"
                value={customManufacturerInput}
                onChange={(event) => setCustomManufacturerInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  event.preventDefault();
                  saveCustomManufacturer();
                }}
                placeholder="Example: AVPro Edge, AV Access, PureLink"
                autoFocus
              />
              <p className="compare-native-auto-note">
                Use this when the competitor brand is not listed. The next step will capture the missing model/SKU and the must-match features.
              </p>
              <div className="compare-native-action-row wm-ui-action-row">
                <button className="compare-native-more wm-ui-button wm-ui-button-primary" type="button" onClick={saveCustomManufacturer} disabled={customManufacturerInput.trim().length === 0}>
                  Use this manufacturer
                </button>
                <button
                  className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
                  type="button"
                  onClick={() => {
                    setIsAddingManufacturer(false);
                    setCustomManufacturerInput("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </section>
          ) : null}
          <div className="compare-native-action-row compare-native-action-row--between wm-ui-action-row">
            <span className="compare-native-muted">Selected brand: {selectedBrand}</span>
            <div className="compare-native-action-row wm-ui-action-row">
              <button
                className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={() => {
                  setIsAddingManufacturer((current) => !current);
                  setCustomManufacturerInput("");
                }}
              >
                Add missing manufacturer
              </button>
              <button className="compare-native-more wm-ui-button wm-ui-button-forward" type="button" onClick={() => setCompareStage("sku")}>
                Next: choose competitor product
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {compareStage === "sku" ? (
        <form className="compare-native-results compare-native-results--stage wm-ui-section" onSubmit={handleSubmit}>
          <div className="compare-native-section-title wm-ui-card-header">
            <h2 className="wm-ui-title">Choose competitor product</h2>
            <p className="wm-ui-copy">Pick a known SKU, or type a custom model and add only the details that change the product direction or quote risk.</p>
          </div>

          <CompareProductLookupInput
            value={competitorInput}
            knownSkus={knownBrandSkus}
            suggestions={skuSuggestions}
            onInputChange={setCompetitorInput}
            onSkuSelect={onSkuSelect}
          />

          <section className="compare-native-card compare-native-card--compact wm-ui-card">
            <label className="compare-native-label wm-ui-kicker" htmlFor="compare-must-match">Known type or must-match features</label>
            <input
              id="compare-must-match"
              className="compare-native-input wm-ui-input"
              value={mustMatchFeatures}
              onChange={(event) => setMustMatchFeatures(event.target.value)}
              placeholder="Example: AV-over-IP transmitter HDMI 2.0 4K60 4:4:4 HDR USB"
            />
          </section>

          <p className="compare-native-auto-note">Clicking a known SKU will still open the result automatically. Typed entries can still use Enter, or use the review button below.</p>

          <div className="compare-native-action-row compare-native-action-row--between wm-ui-action-row">
            <button className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" type="button" onClick={() => setCompareStage("brand")}>
              Back to brand
            </button>
            <div className="compare-native-action-row wm-ui-action-row">
              <button
                className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={() => {
                  const customLabel = competitorInput.trim().length > 0 ? competitorInput.trim() : "Custom / missing SKU";
                  setCompetitorInput(customLabel);
                  setCommittedSku(customLabel);
                  setCustomSkuStore((current) => current.includes(customLabel) ? current : [customLabel, ...current].slice(0, 8));
                }}
              >
                CUSTOM / missing SKU
              </button>
              <button className="compare-native-more wm-ui-button wm-ui-button-forward" type="submit" disabled={!hasCompetitorSelection}>
                Review WyreStorm direction
              </button>
            </div>
          </div>

          <button className="compare-native-hidden-submit" type="submit" aria-hidden="true" tabIndex={-1}>Run compare</button>
        </form>
      ) : null}

      {compareStage === "results" ? (
        <section className="compare-native-results" aria-live="polite">
          <div className="compare-native-section-title compare-native-section-title--inline">
            <div>
              <h2>{workflowStep === "capture" ? "Start a new competitor comparison" : "Review WyreStorm product direction"}</h2>
              <p>Answer first. Open supporting evidence only when you need to validate the quote.</p>
            </div>
            <div className="compare-native-action-row">
              <button className="compare-native-secondary-action" type="button" onClick={() => setCompareStage("sku")}>
                Edit competitor details
              </button>
              <button className="compare-native-secondary-action" type="button" onClick={handleReset}>
                Start new compare
              </button>
            </div>
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
                <BestCandidateCard
                  candidate={best}
                  competitor={competitorSummary}
                  competitorProfile={profile}
                  onCopySummary={() => { void copySummary(); }}
                />
              </div>
            ) : (
              <section className="compare-native-empty">
                <h3>No suitable WyreStorm match found from the current data</h3>
                <p>{competitorSummary.warning || "Add the competitor product type, I/O, video bandwidth, USB, audio, control or wall-processing requirement and try again."}</p>
                {competitorSummary.verifyItems.length ? (
                  <ul className="compare-native-bullet-list">
                    {competitorSummary.verifyItems.slice(0, 3).map((item) => (
                      <li key={`no-match-${item}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            )}

            {alternativeCandidates.length ? (
              <details className="compare-native-summary compare-native-options">
                <summary>Other possible WyreStorm options ({Math.min(alternativeCandidates.length, 3)})</summary>
                <div className="compare-native-option-grid">
                  {alternativeCandidates.slice(0, 3).map((candidate) => (
                    <CandidateOptionCard key={`${candidate.product.sku}-${candidate.verdict}`} candidate={candidate} />
                  ))}
                </div>
              </details>
            ) : null}

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
      ) : null}

      <span className="compare-native-marker" aria-hidden="true">{ROUTE_LOCK_MARKER}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_TYPEAHEAD_STATIC_MARKERS.join(" ")}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_CANDIDATE_GATE_STATIC_MARKERS.join(" ")}</span>
    </main>
  );
}

export default ComparePageNew;
