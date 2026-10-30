/**
 * Reading SKUs and product records out of the loose shapes the compare lane carries.
 *
 * Every predicate in the eligibility rules starts here: which SKU a match is about,
 * what a candidate calls itself, and the normalised text a rule greps. The shapes are
 * deliberately loose because rows arrive from the shared selector, the governed
 * technical profile and saved runs, which do not agree on field names — so the lookups
 * here are the one place that knows all the spellings.
 */
import type { LooseRecord, LooseMatch } from "./compareEligibilityTypes";

export function toText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(toText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value as LooseRecord).map(toText).join(" ");
  }

  return String(value ?? "");
}

export function normalise(value: unknown): string {
  return toText(value).toLowerCase();
}

/**
 * Recognises the competitor-side device that plays the "casting accessory"
 * role. Vendors use several names for essentially the same user-facing job:
 * dongle, button, connect adapter, wireless presentation adapter, etc.
 *
 * Keep this deliberately scoped to wireless-presentation language so a generic
 * AV/network adapter is never mistaken for a casting accessory.
 */
export function isExplicitCastingAccessoryComparison(value: unknown): boolean {
  const text = normalise(value);

  if (/\b(?:dongle|clickshare\s+button|airmedia\s+connect\s+adapter)\b/i.test(text)) {
    return true;
  }

  const hasAccessoryWord = /\b(?:adapter|button|dongle)\b/i.test(text);
  const hasWirelessPresentationContext =
    /\b(?:airmedia|clickshare|wireless|casting|screen\s*share|screen\s*sharing|presentation|byod)\b/i.test(text);
  const looksLikeRoomCore =
    /\b(?:switcher|receiver|gateway|video\s*bar|conference\s*bar|room\s*system|matrix)\b/i.test(text);

  return hasAccessoryWord && hasWirelessPresentationContext && !looksLikeRoomCore;
}

export function skuKey(value: unknown): string {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

const DISPLAY_SKU_LOOKUP_ALIASES: Record<string, readonly string[]> = {
  SW620LTXW: ["SW620TXW"],
  SW620TXW: ["SW620LTXW"],
  SW640TXW: ["SW640LTXW"],
  SW640LTXW: ["SW640TXW"],
};

export function skuLookupKeys(value: unknown): string[] {
  const key = skuKey(value);
  return key ? Array.from(new Set([key, ...(DISPLAY_SKU_LOOKUP_ALIASES[key] ?? [])])) : [];
}

export function getSku(value: LooseRecord): string {
  return String(value?.sku ?? value?.wyrestorm?.sku ?? value?.model ?? value?.partNumber ?? value?.title ?? "");
}

export function getProduct(match: LooseMatch, products: LooseRecord[]): LooseRecord {
  if (match?.wyrestorm && typeof match.wyrestorm === "object") {
    return match.wyrestorm;
  }

  return findProductBySku(products, getSku(match)) ?? match;
}

export function productText(product: LooseRecord): string {
  return [
    product.sku,
    product.model,
    product.partNumber,
    product.name,
    product.title,
    product.family,
    product.productFamily,
    product.category,
    product.role,
    product.governanceRole,
    product.description,
    product.summary,
    product.technology,
    product.technologies,
    product.features,
    product.featureTags,
    product.tags,
    product.applications,
    product.searchTerms,
  ].map(toText).join(" ");
}

export function productNameFromRecord(product: LooseRecord): string {
  return String(product.name ?? product.title ?? product.sku ?? product.model ?? product.partNumber ?? "").trim();
}

export function findProductBySku(products: LooseRecord[], sku: string): LooseRecord | undefined {
  const wanted = skuLookupKeys(sku);

  if (wanted.length === 0) {
    return undefined;
  }

  return products.find((product) => wanted.includes(skuKey(product?.sku ?? product?.model ?? product?.partNumber)));
}

function _hasSku(products: LooseRecord[], sku: string): boolean {
  return Boolean(findProductBySku(products, sku));
}

function _productLooksLike(product: LooseRecord, pattern: RegExp): boolean {
  return pattern.test(`${getSku(product)} ${productText(product)}`);
}

export function extractCompetitorText(resultOrInput: unknown, inputText = ""): string {
  return [inputText, toText(resultOrInput)].join(" ");
}

