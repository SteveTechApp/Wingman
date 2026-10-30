/**
 * How a competitor becomes a profile, and how known products are curated.
 *
 * The page owns a module-level product list so its match helpers can read the
 * catalogue without props, and this module owns that list: it starts as the
 * hand-typed catalogue, is upgraded once with the real one, and is read through
 * one alias-aware lookup so every caller finds the same product for a SKU.
 * buildCompetitorProfile is the other half - reading a brand and SKU through the
 * spec registry, UC catalog and saved specs before the known-profile overrides
 * correct what the registry could not confirm.
 */
import { type WyreStormProduct } from "../../features/compare";
import { findUcCompetitorProduct } from "../../data/ucCompetitorProducts";
import { resolveCompetitorSpecProfile } from "../../lib/competitorSpecRegistry";
import { findSavedCompetitorSpec } from "../../lib/savedCompetitorSpecs";
import { resolveWyrestormSkuAlias, skuAliasMatches } from "../../lib/skuAliasResolver";
import { uniqueSkuOptions } from "./textTokens";
import {
  compareSkuKey,
  extractTags,
  normalizeCompetitorSku,
  productClassFromTags,
  roleFromTags,
  transportFromTags,
} from "./compareProductTaxonomy";
import type { CompetitorProfile } from "./compareTypes";
import { isAtlonaOmeExKitProfile } from "./compareProfileSignals";
import { lookupCompareIntelligence } from "./compareRunLookup";
import { WYRESTORM_PRODUCTS } from "./compareCuratedCatalog";
import { productClassFromResolvedDomain } from "./compareMatchNormalisation";

/*
 * Real WyreStorm catalogue integration.
 *
 * WYRESTORM_PRODUCTS (compareCuratedCatalog.ts) is a ~45-item hand-typed subset
 * with only free-text productClass/role/transport/tags - it drove every compare
 * recommendation, while the real, structured 310-product catalogue at
 * public/product-intelligence-summary.json (generated from
 * data/wingman-canonical-product-store.json, already loaded via
 * loadProductIntelligenceIndex() in the page's index-load effect but previously
 * discarded) sat unused. Every real entry also carries a `technicalProfile`
 * with genuine port-level I/O data that buildWyrestormCompareProfile()
 * (wyrestormCompareProfile.ts) already knows how to read - it was just never
 * given real data to read.
 *
 * ACTIVE_WYRESTORM_PRODUCTS starts as WYRESTORM_PRODUCTS and is upgraded once
 * (via mergeRealWyrestormCatalog() and setActiveWyrestormProducts(), called
 * from the component's index-load effect) to include the real catalogue, with
 * real entries winning on SKU collision. It is intentionally a module-level
 * mutable list rather than component state so the helpers that run outside any
 * component and cannot receive props - findWyrestormProduct here and
 * rigorousMatchToCandidate in compareMatchNormalisation.ts - keep working
 * unchanged; the page component separately tracks a `catalogVersion` counter to
 * know when to recompute its memoised candidate lists after the upgrade
 * happens.
 */
let ACTIVE_WYRESTORM_PRODUCTS: WyreStormProduct[] = WYRESTORM_PRODUCTS;

// The page upgrades this list once the product-intelligence index resolves, and
// its match helpers read it without props - so it is reachable one way in and out.
export function activeWyrestormProducts(): WyreStormProduct[] {
  return ACTIVE_WYRESTORM_PRODUCTS;
}

export function setActiveWyrestormProducts(products: WyreStormProduct[]): void {
  ACTIVE_WYRESTORM_PRODUCTS = products;
}

export function runKnownProfileCompare(profile: CompetitorProfile): CompetitorProfile {
  return applyKnownCompareProfileOverrides(profile);
}

export function applyKnownCompareProfileOverrides(profile: CompetitorProfile): CompetitorProfile {
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

export function isSelectableWyrestormRecommendation(candidate: WyreStormProduct | null | undefined): boolean {
  return Boolean(candidate?.sku);
}

export function fallbackRetrySourceUrl(sourceUrl?: string): string {
  return sourceUrl ?? "";
}

export function buildCompetitorProfile(brand: string, sku: string, description: string): CompetitorProfile {
  const normalizedSku = normalizeCompetitorSku(sku);
  const userSavedProduct = normalizedSku ? findSavedCompetitorSpec(brand, normalizedSku) : null;
  const resolvedSpec = normalizedSku ? resolveCompetitorSpecProfile(normalizedSku, brand, undefined, userSavedProduct) : null;
  const ucProduct = findUcCompetitorProduct(brand, normalizedSku);
  const rawText = [
    brand,
    normalizedSku,
    description,
    ucProduct?.comparisonText,
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
    productClass: ucProduct
      ? productClassFromTags(requestedTags)
      : productClassFromResolvedDomain(resolvedSpec?.domain) || productClassFromTags(requestedTags),
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

export function findWyrestormProduct(sku: string): WyreStormProduct | undefined {
  const canonicalSku = resolveWyrestormSkuAlias(sku);
  const key = compareSkuKey(canonicalSku);
  return ACTIVE_WYRESTORM_PRODUCTS.find((product) => compareSkuKey(product.sku) === key || skuAliasMatches(product.sku, canonicalSku));
}
