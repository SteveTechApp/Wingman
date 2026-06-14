/**
 * WyreStorm direct candidate map for visible Compare workflow.
 *
 * Purpose:
 * Before the older comparison/eligibility pipeline runs, obvious competitor
 * product types should be constrained to the correct WyreStorm family.
 *
 * Example:
 * Blustream IP350UHD-TX = AVoIP transmitter
 * Direct WyreStorm candidates = NetworkHD TX products, not EX/EXF extenders.
 */

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

function isLikelyAvoipText(text: string): boolean {
  if (containsAny(text, ["avoip", "av over ip", "av-over-ip", "network av", "networkhd", "sdvoe", "jpeg-xs", "jpeg xs"])) {
    return true;
  }

  if (/\bIP\d{2,4}[A-Z0-9]*-(TX|RX)\b/i.test(text)) {
    return true;
  }

  if (/\bIP\d{2,4}[A-Z0-9]*\b/i.test(text) && containsAny(text, ["tx", "rx", "transmitter", "receiver", "encoder", "decoder"])) {
    return true;
  }

  return false;
}

function isSourceSide(text: string): boolean {
  return containsAny(text, ["-tx", " tx", "transmitter", "encoder", "source-side", "source side"]);
}

function isSinkSide(text: string): boolean {
  return containsAny(text, ["-rx", " rx", "receiver", "decoder", "display-side", "display side", "sink-side", "sink side"]);
}

function is10G(text: string): boolean {
  return containsAny(text, ["10gbe", "10gb", "10g", "sdvoe", "zero latency", "zero-frame", "zero frame"]);
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

function findBySkuOrder(products: DirectCandidateProduct[], orderedTerms: string[]): DirectCandidateProduct[] {
  const result: DirectCandidateProduct[] = [];
  const used = new Set<string>();

  for (const term of orderedTerms) {
    const normalisedTerm = normaliseSku(term);

    for (const product of products) {
      const sku = normaliseSku(product.sku);

      if (!sku || used.has(sku)) {
        continue;
      }

      if (sku.includes(normalisedTerm)) {
        used.add(sku);
        result.push(enrichCandidate(product));
      }
    }
  }

  return result;
}

function addFallback(
  result: DirectCandidateProduct[],
  sku: string,
  name: string,
  fields: Partial<DirectCandidateProduct>,
): void {
  const existing = new Set(result.map((item) => normaliseSku(item.sku)));
  const normalisedSku = normaliseSku(sku);

  if (existing.has(normalisedSku)) {
    return;
  }

  result.push(enrichCandidate({
    sku,
    name,
    title: name,
    productName: name,
    ...fields,
  }));
}

function enrichCandidate(product: DirectCandidateProduct): DirectCandidateProduct {
  const sku = normaliseSku(product.sku);
  const existingTags = Array.isArray(product.tags) ? product.tags : [];

  if (sku.includes("NHD-600")) {
    return {
      ...product,
      name: product.name ?? product.title ?? "NHD-600-TRX NetworkHD 600 transceiver",
      title: product.title ?? product.name ?? "NHD-600-TRX NetworkHD 600 transceiver",
      productName: product.productName ?? product.name ?? product.title ?? "NHD-600-TRX NetworkHD 600 transceiver",
      productClass: product.productClass ?? "NetworkHD 600 AVoIP transceiver",
      family: product.family ?? "NetworkHD 600",
      technology: product.technology ?? "10G SDVoE AVoIP",
      transport: product.transport ?? "AVoIP",
      role: product.role ?? "Transceiver",
      description:
        product.description ??
        "NetworkHD 600 10G AVoIP transceiver for high-performance source or display endpoint roles.",
      network: product.network ?? "10GbE",
      networkInterface: product.networkInterface ?? "10GbE",
      maxResolution: product.maxResolution ?? "4K60",
      resolution: product.resolution ?? "4K60",
      inputs: product.inputs ?? 1,
      outputs: product.outputs ?? 1,
      inputCount: product.inputCount ?? 1,
      outputCount: product.outputCount ?? 1,
      tags: Array.from(new Set([...existingTags, "direct-compare-candidate", "avoip", "networkhd", "10g"])),
    };
  }

  if (sku.includes("NHD") && sku.includes("TX")) {
    return {
      ...product,
      name: product.name ?? product.title ?? `${sku} NetworkHD AVoIP transmitter`,
      title: product.title ?? product.name ?? `${sku} NetworkHD AVoIP transmitter`,
      productName: product.productName ?? product.name ?? product.title ?? `${sku} NetworkHD AVoIP transmitter`,
      productClass: product.productClass ?? "NetworkHD AVoIP transmitter",
      family: product.family ?? "NetworkHD",
      technology: product.technology ?? "1G NetworkHD AVoIP transmitter",
      transport: product.transport ?? "AVoIP",
      role: product.role ?? "Transmitter",
      description:
        product.description ??
        "NetworkHD AVoIP transmitter/encoder candidate for source-side AVoIP comparison.",
      network: product.network ?? "1GbE",
      networkInterface: product.networkInterface ?? "1GbE",
      maxResolution: product.maxResolution ?? "4K60",
      resolution: product.resolution ?? "4K60",
      inputs: product.inputs ?? 1,
      outputs: product.outputs ?? 1,
      inputCount: product.inputCount ?? 1,
      outputCount: product.outputCount ?? 1,
      tags: Array.from(new Set([...existingTags, "direct-compare-candidate", "avoip", "networkhd", "transmitter", "encoder"])),
    };
  }

  if (sku.includes("NHD") && (sku.includes("RX") || sku.includes("150"))) {
    return {
      ...product,
      name: product.name ?? product.title ?? `${sku} NetworkHD AVoIP receiver`,
      title: product.title ?? product.name ?? `${sku} NetworkHD AVoIP receiver`,
      productName: product.productName ?? product.name ?? product.title ?? `${sku} NetworkHD AVoIP receiver`,
      productClass: product.productClass ?? "NetworkHD AVoIP receiver",
      family: product.family ?? "NetworkHD",
      technology: product.technology ?? "1G NetworkHD AVoIP receiver",
      transport: product.transport ?? "AVoIP",
      role: product.role ?? "Receiver",
      description:
        product.description ??
        "NetworkHD AVoIP receiver/decoder candidate for display-side AVoIP comparison.",
      network: product.network ?? "1GbE",
      networkInterface: product.networkInterface ?? "1GbE",
      maxResolution: product.maxResolution ?? "4K60",
      resolution: product.resolution ?? "4K60",
      inputs: product.inputs ?? 1,
      outputs: product.outputs ?? 1,
      inputCount: product.inputCount ?? 1,
      outputCount: product.outputCount ?? 1,
      tags: Array.from(new Set([...existingTags, "direct-compare-candidate", "avoip", "networkhd", "receiver", "decoder"])),
    };
  }

  return product;
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
  const text = args.competitorText.toLowerCase();
  const maxCandidates = args.maxCandidates ?? 10;
  const products = args.wyrestormProducts.filter((product) => normaliseSku(product.sku));

  if (isLikelyAvoipText(text) && is10G(text)) {
    const selected = findBySkuOrder(products, ["NHD-600-TRX", "NHD-600"]);
    addFallback(selected, "NHD-600-TRX", "NetworkHD 600 transceiver", {
      productClass: "NetworkHD 600 AVoIP transceiver",
      family: "NetworkHD 600",
      technology: "10G SDVoE AVoIP",
      transport: "AVoIP",
      role: "Transceiver",
    });

    const candidates = unique(selected).slice(0, maxCandidates);

    return {
      didApply: true,
      intent: "avoip_10g",
      reason: "Competitor appears to be a 10G AVoIP endpoint. Restricting direct comparison to NetworkHD 600.",
      candidates,
      candidateSkus: candidates.map((item) => normaliseSku(item.sku)),
      debug: [`input=${args.competitorText}`, `candidates=${candidates.length}`],
    };
  }

  if (isLikelyAvoipText(text) && isSourceSide(text)) {
    const selected = findBySkuOrder(
      products.filter((product) => !isNonDirectAccessory(product) && !isHdbasetExtender(product)),
      ["NHD-500-TX", "NHD-124-TX", "NHD-128", "NHD-100-TX"],
    );

    addFallback(selected, "NHD-500-TX", "NetworkHD 500 transmitter", {
      productClass: "NetworkHD 500 AVoIP transmitter",
      family: "NetworkHD 500",
      technology: "1G JPEG-XS AVoIP transmitter",
      transport: "AVoIP",
      role: "Transmitter",
    });

    addFallback(selected, "NHD-124-TX", "NetworkHD 100 transmitter", {
      productClass: "NetworkHD 100 AVoIP transmitter",
      family: "NetworkHD 100",
      technology: "1G AVoIP transmitter",
      transport: "AVoIP",
      role: "Transmitter",
    });

    const candidates = unique(selected).slice(0, maxCandidates);

    return {
      didApply: true,
      intent: "avoip_encoder",
      reason: "Competitor appears to be an AVoIP transmitter/encoder. Restricting direct comparison to NetworkHD transmitter candidates.",
      candidates,
      candidateSkus: candidates.map((item) => normaliseSku(item.sku)),
      debug: [`input=${args.competitorText}`, `candidates=${candidates.length}`],
    };
  }

  if (isLikelyAvoipText(text) && isSinkSide(text)) {
    const selected = findBySkuOrder(
      products.filter((product) => !isNonDirectAccessory(product) && !isHdbasetExtender(product)),
      ["NHD-500-RX", "NHD-150-RX", "NHD-120-RX", "NHD-100-RX"],
    );

    addFallback(selected, "NHD-500-RX", "NetworkHD 500 receiver", {
      productClass: "NetworkHD 500 AVoIP receiver",
      family: "NetworkHD 500",
      technology: "1G JPEG-XS AVoIP receiver",
      transport: "AVoIP",
      role: "Receiver",
    });

    addFallback(selected, "NHD-150-RX", "NetworkHD 100 multiview receiver", {
      productClass: "NetworkHD 100 AVoIP multiview receiver",
      family: "NetworkHD 100",
      technology: "1G AVoIP multiview receiver",
      transport: "AVoIP",
      role: "Receiver",
    });

    addFallback(selected, "NHD-120-RX", "NetworkHD 100 receiver", {
      productClass: "NetworkHD 100 AVoIP receiver",
      family: "NetworkHD 100",
      technology: "1G AVoIP receiver",
      transport: "AVoIP",
      role: "Receiver",
    });

    const candidates = unique(selected).slice(0, maxCandidates);

    return {
      didApply: true,
      intent: "avoip_decoder",
      reason: "Competitor appears to be an AVoIP receiver/decoder. Restricting direct comparison to NetworkHD receiver candidates.",
      candidates,
      candidateSkus: candidates.map((item) => normaliseSku(item.sku)),
      debug: [`input=${args.competitorText}`, `candidates=${candidates.length}`],
    };
  }

  return {
    didApply: false,
    intent: "none",
    reason: "No direct WyreStorm candidate map applied.",
    candidates: [],
    candidateSkus: [],
    debug: [`input=${args.competitorText}`],
  };
}