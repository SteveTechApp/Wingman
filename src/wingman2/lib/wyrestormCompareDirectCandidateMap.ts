/**
 * WyreStorm direct candidate map for visible Compare workflow.
 *
 * Purpose:
 * Before the older comparison/eligibility pipeline runs, obvious competitor
 * product types should be constrained to the correct WyreStorm family.
 *
 * AV-over-IP endpoints are mapped through networkHdAvoipEquivalence (the single
 * source of truth): the competitor's network class and codec decide the exact
 * NetworkHD series (100 / 500 / 600), 10G and 1G families are never mixed, and
 * the banned legacy SKUs (NHD-100/110/220/300/400) are never returned.
 *
 * Example:
 * Blustream IP350UHD-TX = 1G AVoIP transmitter (codec unspecified)
 * Direct WyreStorm candidates = NetworkHD 500 transmitters (verify codec),
 * not 100-series, not 10G, and never an EX/EXF extender.
 */

import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
} from "./networkHdAvoipEquivalence";

export interface DirectCandidateProduct {
  sku: string;
  name?: string;
  title?: string;
  productName?: string;
  productClass?: string;
  category?: string;
  family?: string;
  role?: string;
  technology?: string;
  transport?: string;
  description?: string;
  features?: string[] | string;
  tags?: string[];
  [key: string]: unknown;
}

export type DirectCandidateIntent =
  | "avoip_10g"
  | "avoip_encoder"
  | "avoip_decoder"
  | "multiview"
  | "video_wall"
  | "none";

export interface DirectCandidateMapResult {
  didApply: boolean;
  intent: DirectCandidateIntent;
  reason: string;
  candidates: DirectCandidateProduct[];
  candidateSkus: string[];
  debug: string[];
}

function textOf(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textOf).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(textOf).join(" ");
  }

  return String(value ?? "");
}

function productText(product: DirectCandidateProduct): string {
  return [
    product.sku,
    product.name,
    product.title,
    product.productName,
    product.productClass,
    product.category,
    product.family,
    product.role,
    product.technology,
    product.transport,
    product.description,
    product.features,
    product.tags,
  ]
    .map(textOf)
    .join(" ")
    .toLowerCase();
}

function normaliseSku(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function isNonDirectAccessory(product: DirectCandidateProduct): boolean {
  const sku = normaliseSku(product.sku);
  const text = productText(product);

  if (sku.includes("NHD-CTL")) return true;
  if (containsAny(text, ["controller", "control processor", "rack mount", "bracket", "power supply", "psu", "cable"])) return true;

  return false;
}

function isHdbasetExtender(product: DirectCandidateProduct): boolean {
  const sku = normaliseSku(product.sku);
  const text = productText(product);

  if (sku.startsWith("EX-")) return true;
  if (sku.startsWith("EXF-")) return true;
  if (containsAny(text, ["hdbaset extender", "hdbt extender", "extender kit"])) return true;

  return false;
}

function roleFromSku(sku: string): { role: string; isTransceiver: boolean } {
  if (sku.includes("TRX")) return { role: "Transceiver", isTransceiver: true };
  if (sku.endsWith("-RX") || sku.includes("-RX-")) return { role: "Receiver", isTransceiver: false };
  return { role: "Transmitter", isTransceiver: false };
}

/** Add display-quality NetworkHD AVoIP metadata to a (possibly bare) candidate. */
function enrichCandidate(product: DirectCandidateProduct): DirectCandidateProduct {
  const sku = normaliseSku(product.sku);

  if (!sku.startsWith("NHD")) {
    return product;
  }

  const existingTags = Array.isArray(product.tags) ? product.tags : [];
  const isTenGig = /NHD-6\d{2}/.test(sku);
  const { role } = roleFromSku(sku);
  const seriesMatch = sku.match(/NHD-(\d)/);
  const seriesLabel = seriesMatch ? `NetworkHD ${seriesMatch[1]}00` : "NetworkHD";
  const technology = isTenGig ? "10G SDVoE AVoIP" : "1G NetworkHD AVoIP";
  const network = isTenGig ? "10GbE" : "1GbE";

  return {
    ...product,
    name: product.name ?? product.title ?? `${sku} ${seriesLabel} AVoIP ${role.toLowerCase()}`,
    title: product.title ?? product.name ?? `${sku} ${seriesLabel} AVoIP ${role.toLowerCase()}`,
    productName: product.productName ?? product.name ?? product.title ?? `${sku} ${seriesLabel} AVoIP ${role.toLowerCase()}`,
    productClass: product.productClass ?? `${seriesLabel} AVoIP ${role.toLowerCase()}`,
    family: product.family ?? seriesLabel,
    technology: product.technology ?? technology,
    transport: product.transport ?? "AVoIP",
    role: product.role ?? role,
    description:
      product.description ??
      `${seriesLabel} AVoIP ${role.toLowerCase()} candidate for ${isTenGig ? "10G SDVoE" : "1G"} endpoint comparison.`,
    network: product.network ?? network,
    networkInterface: product.networkInterface ?? network,
    maxResolution: product.maxResolution ?? "4K60",
    resolution: product.resolution ?? "4K60",
    inputs: product.inputs ?? 1,
    outputs: product.outputs ?? 1,
    inputCount: product.inputCount ?? 1,
    outputCount: product.outputCount ?? 1,
    tags: Array.from(new Set([...existingTags, "direct-compare-candidate", "avoip", "networkhd", isTenGig ? "10g" : "1g"])),
  };
}

function unique(products: DirectCandidateProduct[]): DirectCandidateProduct[] {
  const used = new Set<string>();
  const result: DirectCandidateProduct[] = [];

  for (const product of products) {
    const sku = normaliseSku(product.sku);

    if (!sku || used.has(sku)) {
      continue;
    }

    used.add(sku);
    result.push(product);
  }

  return result;
}

export function buildWyreStormDirectCandidateMap(args: {
  competitorText: string;
  wyrestormProducts: DirectCandidateProduct[];
  maxCandidates?: number;
}): DirectCandidateMapResult {
  const maxCandidates = args.maxCandidates ?? 10;
  const products = args.wyrestormProducts.filter((product) => normaliseSku(product.sku));
  const { classification, recommendation } = mapCompetitorToNetworkHdAvoip(args.competitorText);

  if (!recommendation.applies) {
    return {
      didApply: false,
      intent: "none",
      reason: "No direct WyreStorm candidate map applied.",
      candidates: [],
      candidateSkus: [],
      debug: [`input=${args.competitorText}`],
    };
  }

  const intent: DirectCandidateIntent =
    recommendation.series === "600"
      ? "avoip_10g"
      : classification.role === "decoder"
        ? "avoip_decoder"
        : "avoip_encoder";

  const catalog = products.filter(
    (product) =>
      !isNonDirectAccessory(product) &&
      !isHdbasetExtender(product) &&
      !isBannedNetworkHdSku(product.sku),
  );
  const byKey = new Map(catalog.map((product) => [normaliseSku(product.sku), product]));

  const selected: DirectCandidateProduct[] = [];
  for (const sku of recommendation.candidateSkus) {
    if (isBannedNetworkHdSku(sku)) {
      continue;
    }

    const existing = byKey.get(normaliseSku(sku));
    selected.push(enrichCandidate(existing ?? { sku }));
  }

  const candidates = unique(selected).slice(0, maxCandidates);

  return {
    didApply: true,
    intent,
    reason: recommendation.reason,
    candidates,
    candidateSkus: candidates.map((item) => normaliseSku(item.sku)),
    debug: [
      `input=${args.competitorText}`,
      `series=NetworkHD ${recommendation.series}`,
      `networkClass=${recommendation.networkClass}`,
      `codec=${classification.codec}`,
      `verifyCodec=${recommendation.verifyCodec}`,
      `candidates=${candidates.length}`,
    ],
  };
}
