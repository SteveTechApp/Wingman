/**
 * WyreStorm Compare Shortlist Engine
 *
 * Purpose:
 * The Compare feature should not try to score every WyreStorm SKU against every
 * competitor product. It should first create a small, sensible WyreStorm candidate
 * set based on product intent, then allow the scoring engine to judge gaps.
 *
 * This file is intentionally deterministic and easy to debug.
 * Do not add React, CSS, Guru, microphone, route or page layout code here.
 *
 * AV-over-IP endpoint shortlisting defers to networkHdAvoipEquivalence (the single
 * source of truth) so the 100 / 500 / 600 series mapping, the "never mix 10G and
 * 1G" rule and the banned-legacy-SKU list are enforced in exactly one place.
 */

import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  stripBannedNetworkHdSkus,
  type CompetitorAvoipClassification,
  type NetworkHdAvoipRecommendation,
} from "./networkHdAvoipEquivalence";
import { resolveWyrestormSkuAlias } from "./skuAliasResolver";
import { isWyreStormSkuCompareLeadAllowed } from "./wyrestormSkuBusinessStatus";

export type WyreStormCompareIntent =
  | "avoip_1g_encoder"
  | "avoip_1g_decoder"
  | "avoip_10g"
  | "avoip_controller"
  | "hdmi_matrix"
  | "hdbaset_matrix"
  | "hdbaset_extender"
  | "presentation_switcher"
  | "wireless_presentation"
  | "multiview"
  | "video_wall"
  | "ndi_camera_workflow"
  | "usb_conferencing"
  | "unknown";

export interface CompareShortlistProduct {
  sku: string;
  name?: string;
  productClass?: string;
  category?: string;
  family?: string;
  role?: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface CompareShortlistResult {
  intent: WyreStormCompareIntent;
  confidence: number;
  reason: string;
  candidateSkus: string[];
  candidates: CompareShortlistProduct[];
  rejectedCount: number;
  debug: string[];
}

function textOf(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textOf).join(" ");
  }

  return String(value ?? "").toLowerCase();
}

function productText(product: CompareShortlistProduct): string {
  return [
    product.sku,
    product.name,
    product.productClass,
    product.category,
    product.family,
    product.role,
    product.description,
    product.tags,
  ]
    .map(textOf)
    .join(" ");
}

function containsAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value.toLowerCase()));
}

function normaliseSku(value: unknown): string {
  const prepared = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");

  return String(resolveWyrestormSkuAlias(prepared))
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function canonicaliseProduct(product: CompareShortlistProduct): CompareShortlistProduct {
  const resolvedSku = resolveWyrestormSkuAlias(String(product.sku ?? "").trim());

  if (!resolvedSku || resolvedSku === product.sku) {
    return product;
  }

  return {
    ...product,
    sku: resolvedSku,
  };
}

function hasSku(product: CompareShortlistProduct, terms: string[]): boolean {
  const sku = normaliseSku(product.sku);
  return terms.some((term) => sku.includes(term.toUpperCase()));
}

function hasText(product: CompareShortlistProduct, terms: string[]): boolean {
  return containsAny(productText(product), terms);
}

function uniqueBySku(products: CompareShortlistProduct[]): CompareShortlistProduct[] {
  const seen = new Set<string>();
  const result: CompareShortlistProduct[] = [];

  for (const originalProduct of products) {
    const product = canonicaliseProduct(originalProduct);
    const sku = normaliseSku(product.sku);

    if (!sku || !isWyreStormSkuCompareLeadAllowed(product.sku) || seen.has(sku)) {
      continue;
    }

    seen.add(sku);
    result.push(product);
  }

  return result;
}

function detectCompetitorIntent(input: string): { intent: WyreStormCompareIntent; confidence: number; reason: string } {
  const text = input.toLowerCase();

  if (containsAny(text, ["10gbe", "10gb", "10g", "sdvoe", "zero latency", "zero-frame", "zero frame"])) {
    if (containsAny(text, ["avoip", "av over ip", "av-over-ip", "encoder", "decoder", "transmitter", "receiver", "trx", "tx", "rx"])) {
      return {
        intent: "avoip_10g",
        confidence: 95,
        reason: "Competitor appears to be a 10G AVoIP product.",
      };
    }
  }

  if (containsAny(text, ["ndi"]) && containsAny(text, ["camera", "ptz", "bridge", "workflow"])) {
    return {
      intent: "ndi_camera_workflow",
      confidence: 88,
      reason: "Competitor appears to involve NDI camera or NDI bridge workflow.",
    };
  }

  if (containsAny(text, ["video wall", "videowall", "wall processor", "led wall", "lcd wall"])) {
    return {
      intent: "video_wall",
      confidence: 92,
      reason: "Competitor appears to be a video wall or wall-processing requirement.",
    };
  }

  if (containsAny(text, ["multiview", "multi-view", "quad view", "picture in picture", "pip"])) {
    return {
      intent: "multiview",
      confidence: 90,
      reason: "Competitor appears to require multiview output.",
    };
  }

  if (containsAny(text, ["wireless", "airplay", "miracast", "chromecast", "casting", "screen sharing"])) {
    return {
      intent: "wireless_presentation",
      confidence: 88,
      reason: "Competitor appears to be wireless presentation or screen casting.",
    };
  }

  if (containsAny(text, ["presentation", "usb-c", "usbc", "auto switch", "autoswitch", "collaboration", "byod", "byom"])) {
    return {
      intent: "presentation_switcher",
      confidence: 84,
      reason: "Competitor appears to be a presentation switcher or collaboration device.",
    };
  }

  if (containsAny(text, ["hdbaset matrix", "hdbt matrix"]) || (containsAny(text, ["matrix"]) && containsAny(text, ["hdbaset", "hdbt"]))) {
    return {
      intent: "hdbaset_matrix",
      confidence: 90,
      reason: "Competitor appears to be an HDBaseT matrix.",
    };
  }

  if (containsAny(text, ["hdmi matrix", "matrix switcher", "matrix"])) {
    return {
      intent: "hdmi_matrix",
      confidence: 82,
      reason: "Competitor appears to be an HDMI matrix or fixed matrix switcher.",
    };
  }

  if (containsAny(text, ["hdbaset extender", "hdbt extender", "extender kit", "tx rx kit"])) {
    return {
      intent: "hdbaset_extender",
      confidence: 86,
      reason: "Competitor appears to be an HDBaseT extender.",
    };
  }

  if (containsAny(text, ["avoip", "av over ip", "av-over-ip", "network av"])) {
    if (containsAny(text, ["encoder", "transmitter", "-tx", " tx"])) {
      return {
        intent: "avoip_1g_encoder",
        confidence: 82,
        reason: "Competitor appears to be a 1G or unspecified AVoIP encoder/transmitter.",
      };
    }

    if (containsAny(text, ["decoder", "receiver", "-rx", " rx"])) {
      return {
        intent: "avoip_1g_decoder",
        confidence: 82,
        reason: "Competitor appears to be a 1G or unspecified AVoIP decoder/receiver.",
      };
    }

    if (containsAny(text, ["controller", "manager", "gateway", "dir"])) {
      return {
        intent: "avoip_controller",
        confidence: 80,
        reason: "Competitor appears to be an AVoIP controller.",
      };
    }
  }

  if (containsAny(text, ["usb camera", "speakerphone", "soundbar", "teams", "zoom", "uc", "conferencing"])) {
    return {
      intent: "usb_conferencing",
      confidence: 80,
      reason: "Competitor appears to be a USB conferencing or UC device.",
    };
  }

  return {
    intent: "unknown",
    confidence: 0,
    reason: "No reliable competitor intent detected.",
  };
}

function selectForIntent(
  intent: WyreStormCompareIntent,
  products: CompareShortlistProduct[],
): CompareShortlistProduct[] {
  const all = products.filter((product) => normaliseSku(product.sku).length > 0);

  if (intent === "avoip_10g") {
    return all.filter((product) =>
      hasSku(product, ["NHD-600", "600-TRX"]) ||
      hasText(product, ["networkhd 600", "sdvoe", "10g", "10gbe"]),
    );
  }

  if (intent === "avoip_1g_encoder") {
    return all.filter((product) =>
      hasSku(product, ["NHD-124", "NHD-128", "NHD-500-TX", "-TX"]) &&
      !hasSku(product, ["NHD-600"]) &&
      !isBannedNetworkHdSku(product.sku),
    );
  }

  if (intent === "avoip_1g_decoder") {
    return all.filter((product) =>
      hasSku(product, ["NHD-120", "NHD-150", "NHD-500-RX", "-RX"]) &&
      !hasSku(product, ["NHD-600"]) &&
      !isBannedNetworkHdSku(product.sku),
    );
  }

  if (intent === "avoip_controller") {
    return all.filter((product) =>
      hasSku(product, ["NHD-CTL"]) ||
      hasText(product, ["networkhd controller", "av over ip controller", "avoip controller"]),
    );
  }

  if (intent === "video_wall") {
    return all.filter((product) =>
      hasSku(product, ["SW-0206-VW", "SW-0204-VW", "NHD-0401-MV", "NHD-150", "NHD-600", "NHD-CTL"]) ||
      hasText(product, ["video wall", "videowall", "wall processor", "bezel"]),
    );
  }

  if (intent === "multiview") {
    return all.filter((product) =>
      hasSku(product, ["NHD-0401-MV", "NHD-150", "SCL"]) ||
      hasText(product, ["multiview", "multi-view", "scl"]),
    );
  }

  if (intent === "hdbaset_matrix") {
    return all.filter((product) =>
      hasText(product, ["hdbaset matrix", "hdbt matrix"]) ||
      (hasText(product, ["matrix"]) && hasText(product, ["hdbaset", "hdbt"])) ||
      (hasSku(product, ["MX", "MXV"]) && hasText(product, ["hdbaset", "hdbt"])),
    );
  }

  if (intent === "hdmi_matrix") {
    return all.filter((product) =>
      hasText(product, ["hdmi matrix", "matrix switcher"]) ||
      (hasSku(product, ["MX", "MXV"]) && hasText(product, ["matrix", "hdmi"])),
    );
  }

  if (intent === "hdbaset_extender") {
    return all.filter((product) =>
      hasSku(product, ["EX-", "TX-", "RX-"]) &&
      hasText(product, ["hdbaset", "hdbt", "extender"]),
    );
  }

  if (intent === "presentation_switcher") {
    return all.filter((product) =>
      hasSku(product, ["SW-", "APO-", "MX-040", "MX-1007"]) ||
      hasText(product, ["presentation", "switcher", "usb-c", "byod", "byom", "collaboration"]),
    );
  }

  if (intent === "wireless_presentation") {
    return all.filter((product) =>
      hasSku(product, ["APO", "-W", "DG2"]) ||
      hasText(product, ["wireless", "airplay", "miracast", "casting", "screen sharing"]),
    );
  }

  if (intent === "ndi_camera_workflow") {
    return all.filter((product) =>
      hasSku(product, ["NDI", "CAM", "NHD-128", "NHD-150"]) ||
      hasText(product, ["ndi", "ptz", "camera", "bridge"]),
    );
  }

  if (intent === "usb_conferencing") {
    return all.filter((product) =>
      hasSku(product, ["APO-", "CAM-", "SW-", "USB"]) ||
      hasText(product, ["usb", "conference", "camera", "speakerphone", "soundbar", "teams", "zoom"]),
    );
  }

  return [];
}

function addFallbackSkus(intent: WyreStormCompareIntent, selected: CompareShortlistProduct[]): CompareShortlistProduct[] {
  const result = [...selected];
  const existing = new Set(result.map((product) => normaliseSku(product.sku)));

  function add(sku: string, name: string, reason: string): void {
    const normalised = normaliseSku(sku);

    if (!normalised || !isWyreStormSkuCompareLeadAllowed(sku) || existing.has(normalised)) {
      return;
    }

    existing.add(normalised);
    result.push({
      sku,
      name,
      productClass: "Fallback candidate",
      description: reason,
      tags: ["fallback", intent],
    });
  }

  if (intent === "avoip_10g") {
    add("NHD-600-TRX", "NetworkHD 600 transceiver", "Fallback 10G NetworkHD candidate.");
    add("NHD-CTL-PRO", "NetworkHD controller", "Required NetworkHD controller dependency.");
  }

  if (intent === "avoip_1g_encoder") {
    add("NHD-124-TX", "NetworkHD 100 encoder", "Fallback 1G NetworkHD encoder candidate.");
    add("NHD-500-TX", "NetworkHD 500 encoder", "Fallback premium 1G NetworkHD encoder candidate.");
  }

  if (intent === "avoip_1g_decoder") {
    add("NHD-120-RX", "NetworkHD 100 receiver", "Fallback 1G NetworkHD receiver candidate.");
    add("NHD-150-RX", "NetworkHD 100 multiview receiver", "Fallback 1G NetworkHD multiview receiver candidate.");
    add("NHD-500-RX", "NetworkHD 500 receiver", "Fallback premium 1G NetworkHD receiver candidate.");
  }

  if (intent === "avoip_controller") {
    add("NHD-CTL-PRO", "NetworkHD controller", "Fallback NetworkHD control candidate.");
  }

  if (intent === "video_wall") {
    add("SW-0206-VW", "Video wall processor", "Fallback dedicated video wall processor candidate.");
    add("SW-0204-VW", "Preset video wall processor", "Fallback simple video wall processor candidate.");
    add("NHD-CTL-PRO", "NetworkHD controller", "NetworkHD video wall architecture dependency.");
  }

  if (intent === "multiview") {
    add("NHD-0401-MV", "4-input multiview processor", "Fallback standalone multiview candidate.");
    add("NHD-150-RX", "NetworkHD 100 multiview receiver", "Fallback NetworkHD multiview candidate.");
  }

  if (intent === "presentation_switcher" || intent === "wireless_presentation" || intent === "usb_conferencing") {
    add("APO-VX20-UC", "Apollo VX20 UC soundbar", "Fallback BYOD/UC meeting-room candidate.");
    add("SW-620-TX-W", "Wireless presentation switcher", "Fallback wireless presentation switcher candidate.");
    add("SW-640-TX-W", "Wireless presentation switcher", "Fallback larger wireless presentation switcher candidate.");
  }

  if (intent === "ndi_camera_workflow") {
    add("CAM-210-NDI-PTZ", "NDI PTZ camera", "Fallback NDI PTZ camera candidate.");
    add("NHD-128-NDI-TRX", "NDI to NetworkHD bridge/transceiver", "Fallback NDI to NetworkHD workflow candidate.");
    add("NHD-150-RX", "NetworkHD multiview receiver", "Fallback NetworkHD multiview output candidate.");
  }

  return result;
}

const AVOIP_ENDPOINT_INTENTS = new Set<WyreStormCompareIntent>([
  "avoip_10g",
  "avoip_1g_encoder",
  "avoip_1g_decoder",
]);

function avoipShortlistIntent(
  classification: CompetitorAvoipClassification,
  recommendation: NetworkHdAvoipRecommendation,
): WyreStormCompareIntent {
  if (recommendation.series === "600") return "avoip_10g";
  if (classification.role === "decoder") return "avoip_1g_decoder";
  return "avoip_1g_encoder";
}

function buildAvoipShortlistCandidates(
  recommendation: NetworkHdAvoipRecommendation,
  products: CompareShortlistProduct[],
): CompareShortlistProduct[] {
  const byKey = new Map(products.map((product) => [normaliseSku(product.sku), product]));

  const candidates = recommendation.candidateSkus
    .filter((sku) => !isBannedNetworkHdSku(sku))
    .map((sku) => {
      const existing = byKey.get(normaliseSku(sku));

      if (existing) {
        return existing;
      }

      return {
        sku: resolveWyrestormSkuAlias(sku),
        name: `NetworkHD ${recommendation.series} candidate`,
        productClass: `NetworkHD ${recommendation.series} AVoIP`,
        description: recommendation.reason,
        tags: ["avoip", "networkhd", `networkhd-${recommendation.series}`],
      } satisfies CompareShortlistProduct;
    });

  return uniqueBySku(candidates);
}

export function buildWyreStormCompareShortlist(args: {
  competitorText: string;
  wyrestormProducts: CompareShortlistProduct[];
  maxCandidates?: number;
}): CompareShortlistResult {
  const detected = detectCompetitorIntent(args.competitorText);
  const maxCandidates = args.maxCandidates ?? 12;

  // AV-over-IP endpoints are mapped by the single source of truth: correct series
  // by network class + codec, banned SKUs removed, 10G never mixed with 1G.
  if (AVOIP_ENDPOINT_INTENTS.has(detected.intent)) {
    const { classification, recommendation } = mapCompetitorToNetworkHdAvoip(args.competitorText);

    if (recommendation.applies) {
      const candidates = buildAvoipShortlistCandidates(recommendation, args.wyrestormProducts).slice(0, maxCandidates);
      const intent = avoipShortlistIntent(classification, recommendation);
      const confidence = classification.knownFamily || recommendation.series !== "500" ? 92 : 84;

      return {
        intent,
        confidence,
        reason: recommendation.reason,
        candidateSkus: candidates.map((product) => normaliseSku(product.sku)),
        candidates,
        rejectedCount: Math.max(0, args.wyrestormProducts.length - candidates.length),
        debug: [
          `Detected intent: ${intent}`,
          `AVoIP series: NetworkHD ${recommendation.series} (${recommendation.networkClass.toUpperCase()})`,
          `Codec: ${classification.codec}`,
          `Verify codec: ${recommendation.verifyCodec}`,
          `Returned candidates: ${candidates.length}`,
        ],
      };
    }
  }

  const selected = uniqueBySku(selectForIntent(detected.intent, args.wyrestormProducts));
  const withFallback = uniqueBySku(addFallbackSkus(detected.intent, selected));
  const candidates = stripBannedNetworkHdSkus(withFallback).slice(0, maxCandidates);

  return {
    intent: detected.intent,
    confidence: detected.confidence,
    reason: detected.reason,
    candidateSkus: candidates.map((product) => normaliseSku(product.sku)),
    candidates,
    rejectedCount: Math.max(0, args.wyrestormProducts.length - selected.length),
    debug: [
      `Detected intent: ${detected.intent}`,
      `Intent confidence: ${detected.confidence}`,
      `Initial selected candidates: ${selected.length}`,
      `Candidates after fallback: ${withFallback.length}`,
      `Returned candidates: ${candidates.length}`,
    ],
  };
}

export function explainWyreStormCompareShortlist(result: CompareShortlistResult): string {
  if (result.intent === "unknown") {
    return "No reliable product intent was detected. Ask for the competitor SKU, product type or datasheet before scoring.";
  }

  if (result.candidateSkus.length === 0) {
    return `Intent detected as ${result.intent}, but no WyreStorm candidates were found. Check the product index mapping.`;
  }

  return `Intent detected as ${result.intent}. Shortlisted WyreStorm candidates: ${result.candidateSkus.join(", ")}.`;
}
