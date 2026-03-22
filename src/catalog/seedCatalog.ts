import rawCatalog from "@/data/catalog/wyrestormSeedCatalog";
import {
  WYRESTORM_SKU_CATALOG_SOURCE,
  wyrestormSkuCatalogItems,
  type WyreStormSkuCatalogItem,
} from "@/data/sku/wyrestormSkuCatalog";

import { classifyProductType } from "./classification";
import { enrichCatalogProduct } from "./enrich";
import { normalizeCatalogProduct } from "./normalize";
import type { CatalogPortCount, CatalogProduct, CatalogTransport, CatalogVideo } from "./types";

type MasterSkuRow = Partial<WyreStormSkuCatalogItem> & {
  tier?: string;
};

const FAMILY_LABELS: Record<string, string> = {
  AMP: "Amplifier",
  APO: "Apollo",
  CAB: "Cabling",
  CAM: "Camera",
  COM: "Control",
  EX: "HDBaseT",
  EX3: "HDBaseT",
  EXA: "HDBaseT",
  EXF: "Fiber",
  EXP: "USB Extension",
  HALO: "HALO",
  "HALO 60": "HALO",
  "HALO 80": "HALO",
  IDB: "Interactive Display",
  MX: "Matrix",
  MXV: "Matrix",
  NHD: "NetworkHD",
  "NHD-120": "NetworkHD",
  "NHD-500": "NetworkHD",
  "NHD-600": "NetworkHD",
  "NETWORKHD TOUCH": "NetworkHD Touch",
  RX: "HDBaseT",
  RX3: "HDBaseT",
  RXF: "Fiber",
  RXV: "HDBaseT",
  SP: "Audio",
  SW: "Switcher",
  SYN: "Video Wall",
  TS: "Touch Panel",
  TX: "HDBaseT",
  USB: "USB Extension",
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanText(value: unknown): string {
  return tidy(value)
            .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s*[\|\/,;]+\s*/g, " | ")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+/g, " ")
    .trim()
    .trim()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: unknown): string {
  return cleanText(value).toUpperCase().replace(/\s+/g, " ");
}

function splitDescription(description: string): string[] {
  return description
    .split("|")
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function pickVideoProfile(text: string): CatalogVideo | undefined {
  const normalized = text.toLowerCase();
  const hasHdr = /\bhdr\b|dolby vision/i.test(text);

  let maxResolution = "";
  if (normalized.includes("8k")) maxResolution = "8K";
  else if (normalized.includes("4k60")) maxResolution = normalized.includes("444") ? "4K60 4:4:4" : "4K60";
  else if (normalized.includes("4k30")) maxResolution = "4K30";
  else if (normalized.includes("4k")) maxResolution = "4K";
  else if (normalized.includes("1080p")) maxResolution = "1080p";

  if (!maxResolution && !hasHdr) return undefined;

  return {
    maxResolution: maxResolution || undefined,
    hdr: hasHdr || undefined,
  };
}

function pickDistance(text: string): CatalogProduct["distance"] | undefined {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*m(?:\/|\b)/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 1000);

  if (matches.length === 0) return undefined;

  return {
    meters: Math.max(...matches),
  };
}

function normalizePortType(value: string): string {
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  if (normalized === "dp") return "DisplayPort";
  if (normalized === "usbc") return "USB-C";
  if (normalized === "rj45" || normalized === "lan" || normalized === "ethernet") return "RJ45";
  if (normalized === "mic" || normalized === "mics") return "Mic";
  return value.toUpperCase() === "HDMI" ? "HDMI" : cleanText(value);
}

function pickPorts(text: string): {
  inputs: CatalogPortCount[];
  outputs: CatalogPortCount[];
} {
  const inputs: CatalogPortCount[] = [];
  const outputs: CatalogPortCount[] = [];
  const pattern = /(\d+)\s*(?:x)?\s*(hdmi|usb-c|usb|displayport|dp|rj45|lan|ethernet|mic|mics|audio)\s*(input|inputs|output|outputs)\b/gi;

  for (const match of text.matchAll(pattern)) {
    const count = Math.max(0, Number(match[1]) || 0);
    const type = normalizePortType(match[2]);
    const direction = match[3].toLowerCase();
    const target = direction.startsWith("input") ? inputs : outputs;
    target.push({ type, count });
  }

  return { inputs, outputs };
}

function pickTransport(familyCode: string, text: string): CatalogTransport {
  const normalizedFamily = normalizeKey(familyCode);
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("hdbaset") || /^EX|^TX|^RX/.test(normalizedFamily)) return "HDBaseT";
  if (
    normalizedText.includes("networkhd") ||
    normalizedText.includes("avoip") ||
    normalizedText.includes("multiview") ||
    normalizedText.includes("dante")
  ) {
    return "AVoIP";
  }
  if (normalizedText.includes("usb")) return "USB Extension";
  if (
    normalizedText.includes("switcher") ||
    normalizedText.includes("matrix") ||
    normalizedText.includes("dock") ||
    normalizedText.includes("dongle")
  ) {
    return "Local";
  }
  return "Unknown";
}

function inferFamilyLabelFromSku(sku: string): string {
  const normalizedSku = normalizeKey(sku);
  const matchedKey = Object.keys(FAMILY_LABELS)
    .sort((left, right) => right.length - left.length)
    .find((candidate) => normalizedSku.startsWith(candidate));

  return matchedKey ? FAMILY_LABELS[matchedKey] : "";
}

function pickFamilyLabel(familyCode: string, sku: string): string {
  const key = normalizeKey(familyCode);
  return FAMILY_LABELS[key] || inferFamilyLabelFromSku(sku) || cleanText(familyCode) || "Unknown";
}

function pickFeatures(description: string): string[] {
  const segments = splitDescription(description);
  const features = segments.slice(1, 10);

  if (features.length > 0) return features;

  return description
    .split(",")
    .map((item) => cleanText(item))
    .filter(Boolean)
    .slice(1, 10);
}

function toDerivedCatalogProduct(row: MasterSkuRow): CatalogProduct | null {
  const sku = cleanText(row.sku).toUpperCase();
  if (!sku) return null;

  const description = cleanText(row.description);
  const familyCode = cleanText(row.family);
  const segments = splitDescription(description);
  const summary = segments[0] || `${sku} catalog reference.`;
  const ports = pickPorts(description);
  const classification = classifyProductType({
    sku,
    family: familyCode,
    name: summary,
    description,
  });

  return {
    sku,
    name: summary,
    family: pickFamilyLabel(familyCode, sku),
    category: classification.category,
    subcategory: classification.label,
    status: "active",
    summary,
    role: classification.label,
    inputs: ports.inputs,
    outputs: ports.outputs,
    control: /\bcec\b|\brs-?232\b|\bir\b|\bweb ui\b/i.test(description) ? ["Control"] : [],
    audio: /\baudio\b|\bspeaker\b|\bmic\b|\bdsp\b|\bdante\b/i.test(description) ? ["Audio"] : [],
    video: pickVideoProfile(description),
    transport: pickTransport(familyCode, description),
    distance: pickDistance(description),
    features: pickFeatures(description),
    notes: description
      ? `${description} Source: ${cleanText(WYRESTORM_SKU_CATALOG_SOURCE) || "WyreStorm SKU master"}.`
      : `Expanded from ${cleanText(WYRESTORM_SKU_CATALOG_SOURCE) || "WyreStorm SKU master"}.`,
  };
}

function mergeCatalogProducts(base: CatalogProduct, incoming: CatalogProduct): CatalogProduct {
  return {
    ...incoming,
    sku: incoming.sku || base.sku,
    name: incoming.name || base.name,
    family: incoming.family || base.family,
    // Keep curated phase1 classification labels when present.
    category: base.category || incoming.category,
    subcategory: base.subcategory || incoming.subcategory,
    status: incoming.status || base.status,
    summary: incoming.summary || base.summary,
    inputs: incoming.inputs && incoming.inputs.length > 0 ? incoming.inputs : base.inputs,
    outputs: incoming.outputs && incoming.outputs.length > 0 ? incoming.outputs : base.outputs,
    control: incoming.control && incoming.control.length > 0 ? incoming.control : base.control,
    audio: incoming.audio && incoming.audio.length > 0 ? incoming.audio : base.audio,
    video: incoming.video || base.video,
    transport: incoming.transport !== "Unknown" ? incoming.transport : base.transport,
    distance: incoming.distance || base.distance,
    features:
      incoming.features && incoming.features.length > 0
        ? Array.from(new Set([...(base.features || []), ...incoming.features]))
        : base.features,
    notes: incoming.notes || base.notes,
  };
}

function toCatalogProduct(row: CatalogProduct): CatalogProduct {
  return enrichCatalogProduct(normalizeCatalogProduct(row));
}

export function buildWyrestormSeedCatalogProducts(): CatalogProduct[] {
  const seeded = new Map<string, CatalogProduct>();

  for (const row of Array.isArray(rawCatalog) ? (rawCatalog as CatalogProduct[]) : []) {
    const product = toCatalogProduct(row);
    seeded.set(product.sku, product);
  }

  const masterItems = wyrestormSkuCatalogItems as MasterSkuRow[];

  for (const row of masterItems) {
    const derived = toDerivedCatalogProduct(row);
    if (!derived) continue;

    const normalizedDerived = toCatalogProduct(derived);
    const existing = seeded.get(normalizedDerived.sku);

    if (!existing) {
      seeded.set(normalizedDerived.sku, normalizedDerived);
      continue;
    }

    seeded.set(normalizedDerived.sku, toCatalogProduct(mergeCatalogProducts(existing, normalizedDerived)));
  }

  return Array.from(seeded.values()).sort((left, right) => left.sku.localeCompare(right.sku));
}
