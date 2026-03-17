import { wyrestormSkuCatalogItems, type WyreStormSkuCatalogItem } from "@/data/sku/wyrestormSkuCatalog";

import { findCatalogProductBySku, getCatalogProducts } from "./repository";
import type { CatalogProduct } from "./types";

export type RecommendationTier = "Bronze" | "Silver" | "Gold" | "Unclassified";

export type RecommendationCatalogItem = {
  sku: string;
  family: string;
  category: string;
  description: string;
  tier: RecommendationTier;
  searchText: string;
  accessoryLike: boolean;
  sourceUrl?: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(values: unknown[]): string {
  for (const value of values) {
    const text = tidy(value);
    if (text) return text;
  }
  return "";
}

function dedupe(values: unknown[], limit = 24): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function isAccessoryLikeText(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\bmount\b|\bbracket\b|\bcable\b|\brack\b|\badapter\b|\bdock\b|\baccessor(y|ies)\b|\bpower\b/.test(normalized);
}

function inferTierFromText(sku: string, text: string, accessoryLike: boolean): RecommendationTier {
  if (accessoryLike) return "Unclassified";

  const normalized = `${sku} ${text}`.toLowerCase();

  if (
    /\b(sdvoe|10g|10gbe|10gbe|dante|aes67|seamless|dual nic|enterprise)\b/.test(normalized) ||
    /^NHD-(600|610|500-DNT)/i.test(sku) ||
    /^MX-1007/i.test(sku) ||
    /^MX-1616/i.test(sku)
  ) {
    return "Gold";
  }

  if (
    /^NHD-(120|124|150)/i.test(sku) ||
    /\b4k30\b|\bcompact\b|\bbasic\b|\blite\b/.test(normalized)
  ) {
    return "Bronze";
  }

  if (
    /\b(networkhd|avoip|presentation|matrix|switcher|video wall|videowall|camera|ptz|audio|microphone|controller|hdbaset 3|5k|8k)\b/.test(normalized) ||
    /^NHD-(500|510|520|CTL)/i.test(sku) ||
    /^APO-/i.test(sku) ||
    /^SW-/i.test(sku) ||
    /^MX(V)?-/i.test(sku) ||
    /^EX(P)?-/i.test(sku)
  ) {
    return "Silver";
  }

  if (/\b(hdbaset|extender|splitter|receiver|transmitter)\b/.test(normalized)) {
    return "Bronze";
  }

  return "Unclassified";
}

function buildRawSearchText(item: WyreStormSkuCatalogItem): string {
  return dedupe([
    item.sku,
    item.name,
    item.family,
    item.type,
    item.description,
    item.searchText,
  ]).join(" | ");
}

function toRecommendationCatalogItem(
  product: CatalogProduct | undefined,
  raw: WyreStormSkuCatalogItem | undefined,
): RecommendationCatalogItem | null {
  const sku = firstNonEmpty([product?.sku, raw?.sku]).toUpperCase();
  if (!sku) return null;

  const description = firstNonEmpty([
    product?.summary,
    raw?.description,
    product?.name,
    raw?.name,
    sku,
  ]);
  const family = firstNonEmpty([product?.family, raw?.family, "General"]);
  const category = firstNonEmpty([product?.subcategory, product?.category, raw?.type, "Product"]);
  const searchText = dedupe([
    sku,
    product?.name,
    product?.summary,
    product?.family,
    product?.category,
    product?.subcategory,
    ...(product?.features || []),
    ...(product?.normalizedTags || []),
    ...(product?.control || []),
    ...(product?.audio || []),
    ...(product?.inputs || []).map((port) => port.type),
    ...(product?.outputs || []).map((port) => port.type),
    product?.transport,
    product?.video?.maxResolution,
    raw ? buildRawSearchText(raw) : "",
  ]).join(" | ");
  const accessoryLike = isAccessoryLikeText(`${family} ${category} ${description} ${searchText}`);

  return {
    sku,
    family,
    category,
    description,
    tier: inferTierFromText(sku, searchText, accessoryLike),
    searchText,
    accessoryLike,
    sourceUrl: firstNonEmpty([product?.sourceUrl]) || undefined,
  };
}

export function getRecommendationCatalogItems(): RecommendationCatalogItem[] {
  const bySku = new Map<string, RecommendationCatalogItem>();
  const rawBySku = new Map<string, WyreStormSkuCatalogItem>();

  for (const item of wyrestormSkuCatalogItems) {
    const sku = tidy(item.sku).toUpperCase();
    if (!sku || rawBySku.has(sku)) continue;
    rawBySku.set(sku, item);
  }

  for (const product of getCatalogProducts()) {
    const raw = rawBySku.get(product.sku);
    const mapped = toRecommendationCatalogItem(product, raw);
    if (!mapped) continue;
    bySku.set(mapped.sku, mapped);
  }

  for (const [sku, raw] of rawBySku.entries()) {
    if (bySku.has(sku)) continue;
    const mapped = toRecommendationCatalogItem(findCatalogProductBySku(sku), raw);
    if (!mapped) continue;
    bySku.set(mapped.sku, mapped);
  }

  return Array.from(bySku.values()).sort((left, right) => left.sku.localeCompare(right.sku));
}

export function findRecommendationCatalogItemBySku(sku: string): RecommendationCatalogItem | undefined {
  const key = tidy(sku).toUpperCase();
  if (!key) return undefined;
  return getRecommendationCatalogItems().find((item) => item.sku === key);
}

export function describeCatalogSku(sku: string): string {
  return findRecommendationCatalogItemBySku(sku)?.description || "Description unavailable";
}
