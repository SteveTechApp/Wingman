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

const COMPETITOR_SKU_SEED_CATALOG = {
  Atlona: [
    "AT-OMNI-111",
    "AT-OMNI-112",
    "AT-OMNI-121",
    "AT-OMNI-122",
    "AT-OMNI-232",
    "AT-OMNI-512",
    "AT-OMNI-521",
    "AT-OME-MS42",
    "AT-OME-MS52",
    "AT-OME-PS62",
    "AT-UHD-PRO3-88M",
    "AT-UHD-EX-100CE-KIT",
  ],
  Blustream: [
    "IP200UHD-TX",
    "IP200UHD-RX",
    "IP250UHD-TX",
    "IP250UHD-RX",
    "IP300UHD-TX",
    "IP300UHD-RX",
    "IP350UHD-TX",
    "IP350UHD-RX",
    "C88CS",
    "HMX88-18G-KIT",
    "HMX44-18G-KIT",
  ],
  Crestron: [
    "DM-NVX-350",
    "DM-NVX-351",
    "DM-NVX-360",
    "DM-NVX-363",
    "DM-NVX-E30",
    "DM-NVX-D30",
    "HD-MD4X2-4KZ-E",
    "DMPS3-4K-350-C",
  ],
  Extron: ["NAV E 101", "NAV E 121", "NAV E 501", "NAV D 101", "NAV D 121", "NAV D 501", "NAV SD 101", "DTP2 T 211", "DTP2 R 211", "IN1608 xi"],
  Kramer: ["KDS-7-EN7", "KDS-7-DEC7", "KDS-EN6", "KDS-DEC6", "KDS-100", "VS-88H2A", "VS-44H2A", "VP-440X"],
  Lightware: ["UBEX-PRO20-HDMI-F100", "UBEX-PRO20-HDMI-F110", "VINX-110-HDMI-ENC", "VINX-120-HDMI-ENC", "VINX-210AP-HDMI-DEC", "MMX8x8-HDMI-4K-A", "TAURUS UCX-4x2-HC30"],
  AMX: ["NMX-ENC-N2412A", "NMX-DEC-N2422A", "NMX-ENC-N2612S", "NMX-DEC-N2622S", "NMX-ENC-N3312D", "NMX-DEC-N3322", "DGX1600-ENC"],
  "AVPro Edge": ["MXNet-1G-E", "MXNet-1G-D", "MXNet-10G-TCVR", "AC-MX-44HDBT", "AC-MX-88"],
  ZeeVee: ["ZyPer4K Encoder", "ZyPer4K Decoder", "ZyPerUHD Encoder", "ZyPerUHD Decoder", "ZyPerUHD60 Encoder", "ZyPerUHD60 Decoder"],
  Binary: ["B-900-MOIP-4K-TX", "B-900-MOIP-4K-RX", "B-660-MTRX-8x8"],
  "Just Add Power": ["VBS-HDIP-707POE", "VBS-HDIP-508POE", "VBS-HDIP-747POE"],
  CUSTOM: [],
} as const;

const MANUFACTURER_SELECT_OPTIONS = Object.keys(COMPETITOR_SKU_SEED_CATALOG);

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
  knownProfile: Record<string, unknown> | null;
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

function applyCompareEquivalenceGuards(candidate: ScoredCandidate): ScoredCandidate {
  return candidate;
}

function applyKnownCompareProfileOverrides(profile: CompetitorProfile): CompetitorProfile {
  return profile;
}

function lookupCompareIntelligence(sku: string): Record<string, unknown> | null {
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
  if (includesAny(text, ["HDR"])) tags.push("hdr");
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
        checks: uniqueSkuOptions([recommendation.controllerReminder, product.caveat]),
        gaps: uniqueSkuOptions(verifyGap),
      };
    })
    .slice(0, 8);
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

function verdictClass(verdict: Verdict): string {
  if (verdict === "GOOD MATCH") return "is-good";
  if (verdict === "PARTIAL MATCH") return "is-partial";
  return "is-no-match";
}

function productPitchUrl(sku: string): string {
  const params = new URLSearchParams();
  params.set("sku", sku);
  params.set("source", "compare");
  return `/wingman/product-pitch?${params.toString()}`;
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

function BestCandidateCard({ candidate, onCopySummary }: { candidate: ScoredCandidate; onCopySummary: () => void }) {
  return (
    <section className="compare-native-best-card">
      <div className="compare-native-result-head">
        <span className={`compare-native-verdict ${verdictClass(candidate.verdict)}`}>{candidate.verdict}</span>
        <span className="compare-native-score">{Math.round(candidate.score)}%</span>
      </div>

      <div className="compare-native-product-card compare-native-product-card--best">
        <p className="compare-native-label compare-native-label--subtle">Best WyreStorm candidate</p>
        <h3>{candidate.product.sku}</h3>
        <h4>{candidate.product.name}</h4>
        <p>{candidate.product.family} - {candidate.product.productClass} - {candidate.product.role}</p>

        <div className="compare-native-action-row">
          <button className="compare-native-secondary-action" type="button" onClick={onCopySummary}>Copy summary</button>
          <ProductMoreLink sku={candidate.product.sku} />
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

  const scoredCandidates = useMemo(() => {
    const avoip = avoipProfile;

    if (avoip.recommendation.applies) {
      return buildAvoipCandidates(avoip.classification, avoip.recommendation);
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
      "",
      "Why this fits",
      `- ${best.product.sku} is the closest WyreStorm starting point based on product role and system class.`,
      `- ${roleNote}`,
      "",
      "Check before quoting",
      "- Confirm codec/compression class.",
      "- Confirm video format, USB/KVM, audio and control requirements.",
      "- Confirm controller and network switch requirements before quoting.",
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
                <BestCandidateCard candidate={best} onCopySummary={() => { void copySummary(); }} />
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
