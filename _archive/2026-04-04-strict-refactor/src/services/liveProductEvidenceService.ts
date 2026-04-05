import { z } from "zod";

import type { CatalogPortCount, CatalogProduct } from "@/catalog";
import type { CompetitorProduct } from "@/competitor/repository";

export type ProductEvidenceVendor = "competitor" | "wyrestorm";

export type ProductEvidenceInput = Partial<CatalogProduct> &
  Partial<CompetitorProduct> & {
    vendorType: ProductEvidenceVendor;
    brand?: string;
    sourceUrl?: string;
  };

export type ProductEvidenceDigest = {
  vendorType: ProductEvidenceVendor;
  brand: string;
  sku: string;
  name: string;
  sourceUrl?: string;
  summary: string;
  inputCount: number;
  outputCount: number;
  inputPorts: string;
  outputPorts: string;
  connectivity: string;
  controlPorts: string;
  networkPorts: string;
  wirelessCasting: boolean;
  keyTakeaways: string[];
  fetchedAt: string;
  source: "catalog" | "endpoint";
  warnings: string[];
};

type LiveEvidenceResponse = {
  summary?: string;
  keyTakeaways?: string[];
  inputs?: CatalogPortCount[];
  outputs?: CatalogPortCount[];
  connectivity?: string[];
  control?: string[];
  networkPorts?: string[];
  wirelessCasting?: boolean;
  sourceUrl?: string;
  warnings?: string[];
};

const EVIDENCE_ENDPOINT = String(import.meta.env.VITE_PRODUCT_PAGE_EVIDENCE_ENDPOINT ?? "").trim();

const endpointSchema = z
  .object({
    summary: z.string().optional(),
    keyTakeaways: z.array(z.string()).optional(),
    inputs: z.array(z.object({ type: z.string(), count: z.coerce.number().optional() })).optional(),
    outputs: z.array(z.object({ type: z.string(), count: z.coerce.number().optional() })).optional(),
    connectivity: z.array(z.string()).optional(),
    control: z.array(z.string()).optional(),
    networkPorts: z.array(z.string()).optional(),
    wirelessCasting: z.boolean().optional(),
    sourceUrl: z.string().optional(),
    warnings: z.array(z.string()).optional(),
  })
  .passthrough();

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeSku(value: unknown): string {
  return tidy(value).toUpperCase();
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function asPortLabel(ports?: CatalogPortCount[]): string {
  const values = (ports ?? [])
    .map((port) => {
      const type = tidy(port.type);
      const count = Number(port.count ?? 0);
      if (!type) return "";
      return `${type}${count > 0 ? ` x${count}` : ""}`;
    })
    .filter(Boolean);
  return values.length > 0 ? values.join(", ") : "-";
}

function totalPorts(ports?: CatalogPortCount[]): number {
  return (ports ?? []).reduce((sum, port) => sum + Math.max(0, Number(port.count ?? 0)), 0);
}

function inferNetworkPorts(product: ProductEvidenceInput): string {
  const portTypes = [
    ...(product.inputs ?? []).map((port) => tidy(port.type)),
    ...(product.outputs ?? []).map((port) => tidy(port.type)),
    ...(product.features ?? []),
    product.summary,
    product.transport,
    product.video?.maxResolution,
  ]
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean);

  const hasLan = portTypes.some((value) => has(value, /\blan\b|\brj45\b|\bethernet\b/));
  const hasSfp = portTypes.some((value) => has(value, /\bsfp\+\b|\bsfp\b/));
  const has10G = portTypes.some((value) => has(value, /\b10g\b|\b10gbe\b|\b10gb\b|\b10-gig\b/));
  const has2G = portTypes.some((value) => has(value, /\b2g\b|\b2\.5g\b/));
  const has1G = portTypes.some((value) => has(value, /\b1g\b|\bgigabit\b|\bone-gig\b/));

  const out: string[] = [];
  if (hasLan) out.push("Ethernet");
  if (hasSfp) out.push("SFP");
  if (has10G) out.push("10Gb");
  else if (has2G) out.push("2Gb/2.5Gb");
  else if (has1G || hasLan) out.push("1Gb");
  return out.length > 0 ? Array.from(new Set(out)).join(", ") : "-";
}

function inferConnectivity(product: ProductEvidenceInput): string {
  const values = [
    ...(product.inputs ?? []).map((port) => tidy(port.type)),
    ...(product.outputs ?? []).map((port) => tidy(port.type)),
    product.transport,
  ]
    .filter(Boolean)
    .slice(0, 8);
  return values.length > 0 ? Array.from(new Set(values)).join(", ") : "-";
}

function inferWirelessCasting(product: ProductEvidenceInput): boolean {
  const text = [
    ...(product.features ?? []),
    product.summary,
    product.name,
  ]
    .map((value) => tidy(value).toLowerCase())
    .join(" ");

  return has(
    text,
    /\bwireless casting\b|\bwireless presentation\b|\bairplay\b|\bmiracast\b|\bchromecast\b|\bclickshare\b/,
  );
}

function dedupe(values: string[], limit = 6): string[] {
  return Array.from(new Set(values.map((value) => tidy(value)).filter(Boolean))).slice(0, limit);
}

function makeTakeaways(product: ProductEvidenceInput): string[] {
  const takeaways: string[] = [];
  const summary = tidy(product.summary);
  if (summary) takeaways.push(summary);

  const ioSummary = `${totalPorts(product.inputs)} input(s), ${totalPorts(product.outputs)} output(s).`;
  takeaways.push(ioSummary);

  const control = (product.control ?? []).map((item) => tidy(item)).filter(Boolean);
  if (control.length > 0) {
    takeaways.push(`Control: ${control.slice(0, 4).join(", ")}.`);
  }

  const features = (product.features ?? []).map((item) => tidy(item)).filter(Boolean);
  if (features.length > 0) {
    takeaways.push(`Key features: ${features.slice(0, 5).join(", ")}.`);
  }

  return dedupe(takeaways, 5);
}

export function getProductPageEvidenceEndpoint(): string | null {
  return EVIDENCE_ENDPOINT || null;
}

export function buildProductEvidenceDigest(product: ProductEvidenceInput): ProductEvidenceDigest {
  return {
    vendorType: product.vendorType,
    brand: tidy(product.brand) || (product.vendorType === "wyrestorm" ? "WyreStorm" : "Unknown"),
    sku: normalizeSku(product.sku) || "UNKNOWN",
    name: tidy(product.name) || normalizeSku(product.sku) || "Unknown product",
    sourceUrl: tidy(product.sourceUrl) || undefined,
    summary: tidy(product.summary) || "No summary available.",
    inputCount: totalPorts(product.inputs),
    outputCount: totalPorts(product.outputs),
    inputPorts: asPortLabel(product.inputs),
    outputPorts: asPortLabel(product.outputs),
    connectivity: inferConnectivity(product),
    controlPorts: (product.control ?? []).map((item) => tidy(item)).filter(Boolean).join(", ") || "-",
    networkPorts: inferNetworkPorts(product),
    wirelessCasting: inferWirelessCasting(product),
    keyTakeaways: makeTakeaways(product),
    fetchedAt: new Date().toISOString(),
    source: "catalog",
    warnings: [],
  };
}

export async function fetchLiveProductEvidence(product: ProductEvidenceInput): Promise<ProductEvidenceDigest> {
  const fallback = buildProductEvidenceDigest(product);
  if (!EVIDENCE_ENDPOINT || typeof fetch !== "function" || !fallback.sourceUrl) {
    return {
      ...fallback,
      warnings: EVIDENCE_ENDPOINT
        ? ["Live evidence endpoint requires a product source URL."]
        : ["Live evidence endpoint is not configured; using catalog evidence."],
    };
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 7000) : null;

  try {
    const response = await fetch(EVIDENCE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorType: product.vendorType,
        brand: fallback.brand,
        sku: fallback.sku,
        name: fallback.name,
        url: fallback.sourceUrl,
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      return {
        ...fallback,
        warnings: [`Live evidence endpoint returned HTTP ${response.status}; using catalog evidence.`],
      };
    }

    const payload = await response.json();
    const parsed = endpointSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ...fallback,
        warnings: ["Live evidence response did not match expected format; using catalog evidence."],
      };
    }

    const live = parsed.data as LiveEvidenceResponse;
    const controlList = dedupe([...(live.control ?? []), ...(product.control ?? [])], 6);
    const connectivityList = dedupe([...(live.connectivity ?? []), inferConnectivity(product)], 8);
    const networkList = dedupe([...(live.networkPorts ?? []), inferNetworkPorts(product)], 5);
    const takeaways = dedupe([...(live.keyTakeaways ?? []), ...makeTakeaways(product)], 6);

    return {
      ...fallback,
      source: "endpoint",
      summary: tidy(live.summary) || fallback.summary,
      sourceUrl: tidy(live.sourceUrl) || fallback.sourceUrl,
      inputCount: totalPorts(live.inputs ?? product.inputs),
      outputCount: totalPorts(live.outputs ?? product.outputs),
      inputPorts: asPortLabel(live.inputs ?? product.inputs),
      outputPorts: asPortLabel(live.outputs ?? product.outputs),
      connectivity: connectivityList.join(", "),
      controlPorts: controlList.length > 0 ? controlList.join(", ") : "-",
      networkPorts: networkList.length > 0 ? networkList.join(", ") : "-",
      wirelessCasting: Boolean(live.wirelessCasting ?? fallback.wirelessCasting),
      keyTakeaways: takeaways,
      warnings: dedupe([...(live.warnings ?? []), ...fallback.warnings], 6),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ...fallback,
      warnings: ["Live evidence fetch failed; using catalog evidence."],
    };
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
}

export function buildEvidenceContextLines(
  competitor: ProductEvidenceDigest | null,
  wyrestorm: ProductEvidenceDigest | null,
): string[] {
  const lines: string[] = [];

  if (competitor) {
    lines.push(
      `Competitor ${competitor.brand} ${competitor.sku}: inputs ${competitor.inputPorts}; outputs ${competitor.outputPorts}; connectivity ${competitor.connectivity}; network ${competitor.networkPorts}; control ${competitor.controlPorts}.`,
    );
    if (competitor.keyTakeaways.length > 0) {
      lines.push(`Competitor takeaways: ${competitor.keyTakeaways.slice(0, 3).join(" ")}`);
    }
  }

  if (wyrestorm) {
    lines.push(
      `WyreStorm ${wyrestorm.sku}: inputs ${wyrestorm.inputPorts}; outputs ${wyrestorm.outputPorts}; connectivity ${wyrestorm.connectivity}; network ${wyrestorm.networkPorts}; control ${wyrestorm.controlPorts}.`,
    );
    if (wyrestorm.keyTakeaways.length > 0) {
      lines.push(`WyreStorm takeaways: ${wyrestorm.keyTakeaways.slice(0, 3).join(" ")}`);
    }
  }

  return dedupe(lines, 8);
}

