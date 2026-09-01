import { isSkuAdminBlocked } from "./adminProductOverrides";
import {
  classifyWingmanProduct,
  distanceGateReason,
  isWingmanProductEligibleForFinderNeed,
  matchedGateReasons,
  wingmanHardwareTypePriority,
  type WingmanFinderNeedLike,
  type WingmanProductLike,
  type WingmanProductProfile,
} from "./productClassification";
import { collectDealOutcomes } from "./feedbackInformedGuidance";
import { loadProductIntelligenceIndex } from "./productIntelligenceIndexCache";
import { extractRawProducts } from "./productStoryEngine";
import { normaliseSkuKey, resolveWyrestormSkuAlias } from "./skuAliasResolver";
import { resolveProductLifecycle } from "./wyrestormProductLifecycle";

export const PRODUCT_SELECTOR_ENGINE_VERSION = "2026.07.1";

export type ProductSelectorMode =
  | "finder"
  | "recommendations"
  | "product-pitch"
  | "call-card"
  | "compare"
  | "catalogue"
  | "contextual"
  | "embedded";

export type ProductSelectorDecisionStatus =
  | "compatible"
  | "partial"
  | "dependency"
  | "browse-only"
  | "blocked";

export interface ProductSelectorRequest extends WingmanFinderNeedLike {
  mode: ProductSelectorMode;
  query?: string;
  family?: string;
  alphaFilter?: string;
  includeAccessories?: boolean;
  includeCables?: boolean;
  includeDependencies?: boolean;
  includeDiscontinued?: boolean;
  includeBrowseOnly?: boolean;
  includeArchitectureAlternatives?: boolean;
  limit?: number;
}

export interface ProductSelectorDecision<TProduct extends WingmanProductLike = WingmanProductLike> {
  sku: string;
  canonicalSku: string;
  product: TProduct;
  profile: WingmanProductProfile;
  eligible: boolean;
  status: ProductSelectorDecisionStatus;
  score: number;
  reasons: string[];
  rejectionReasons: string[];
  warningReasons: string[];
  lifecycleStatus: string;
  lifecycleLabel: string;
  supersededBy?: string;
}

type IndexedProduct = WingmanProductLike & {
  sku?: string;
  title?: string;
  productName?: string;
};

const SELECTOR_POLICY_BLOCKED_SKUS = new Set([
  "SW-0X01-8K",
  "SW-120-TX3-US",
  "SW-130-TX-US",
  "SW-540-TX-W",
  "NHD-100",
  "NHD-250-RX",
  "NHD-300-TX",
  "APO-100-UC",
  "APO-200-UC",
  "APO-DG2-PRO",
  "HALO-VX10-V1",
  "MX-1010-H2XC",
  "MX-1616-H2XC",
  "NHD-000-RACK3",
  "NHD-000-CTL",
  "NHD-110-RX",
  "NHD-110-TX",
  "NHD-110-RX-S",
  "NHD-500-E",
  "NHD-500-T",
  "NHD-610",
  "NHD-600-TXRX",
  "NHD-CTL-PRO",
  "NHD-CTL-PRO-T",
  "NHD-TOUCH",
  "NHD-TOUCHPLUS",
  "OFFICE-KIT",
  "SYN-TOUCH10",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalise(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normaliseSku(value: unknown) {
  return clean(value).toUpperCase();
}

function productSku(product: WingmanProductLike) {
  return clean(product.sku || product.title || product.name);
}

function productName(product: WingmanProductLike) {
  return clean(product.name || product.title || product.sku);
}

function textParts(product: WingmanProductLike) {
  const extra = product as Record<string, unknown>;
  const arrays = [
    extra.keyFeatures,
    extra.applications,
    extra.ioSummary,
    extra.video,
    extra.audio,
    extra.usb,
    extra.network,
    extra.control,
    extra.proofPoints,
    extra.questions,
  ].flatMap((value) => (Array.isArray(value) ? value : []));

  return [
    product.sku,
    product.title,
    product.name,
    product.family,
    product.category,
    product.description,
    product.searchText,
    product.primarySystemFamily,
    product.commercialRole,
    product.dependencyType,
    ...product.tags ?? [],
    ...arrays,
  ];
}

function searchBlob(product: WingmanProductLike) {
  return normalise(textParts(product).join(" "));
}

function hasSelectorIntent(request: ProductSelectorRequest) {
  return Boolean(
    clean(request.technicalRequirement) ||
      clean(request.productPath) ||
      clean(request.technologyType) ||
      clean(request.signalType) ||
      clean(request.sourceConnector) ||
      clean(request.displayConnector) ||
      clean(request.inputs) ||
      clean(request.outputs) ||
      clean(request.distance) ||
      clean(request.resolution) ||
      clean(request.usb) ||
      clean(request.processing) ||
      clean(request.network) ||
      clean(request.audio) ||
      clean(request.control),
  );
}

function textMatches(product: WingmanProductLike, request: ProductSelectorRequest) {
  const query = normalise(request.query);
  if (!query) return true;

  const sku = normaliseSku(productSku(product));
  const compactSku = normaliseSkuKey(sku);
  const compactQuery = normaliseSkuKey(query);
  const blob = searchBlob(product);

  return (
    blob.includes(query) ||
    normalise(sku).includes(query) ||
    (!!compactQuery && compactSku.includes(compactQuery))
  );
}

function familyMatches(product: WingmanProductLike, request: ProductSelectorRequest) {
  const family = normalise(request.family);
  if (!family || family === "all") return true;
  return normalise([product.family, product.category, product.primarySystemFamily].join(" ")).includes(family);
}

function alphaMatches(product: WingmanProductLike, request: ProductSelectorRequest) {
  const filter = clean(request.alphaFilter);
  if (!filter || /^all$/i.test(filter)) return true;

  const lead = normaliseSku(productSku(product) || productName(product)).charAt(0);
  if (/^(0-9|1-9)$/i.test(filter)) return /^[0-9]$/.test(lead);
  return lead === filter.toUpperCase();
}

function lifecycleLabel(decision: Pick<ProductSelectorDecision, "lifecycleStatus" | "supersededBy">) {
  if (decision.supersededBy) return `Discontinued - use ${decision.supersededBy}`;
  if (decision.lifecycleStatus === "active") return "Active";
  if (decision.lifecycleStatus === "discontinued") return "Discontinued";
  if (decision.lifecycleStatus === "cable") return "Cable / accessory";
  if (decision.lifecycleStatus === "unlisted") return "Needs verification";
  return decision.lifecycleStatus.replace(/-/g, " ");
}

function modeAllowsBrowseOnly(request: ProductSelectorRequest) {
  return Boolean(request.includeBrowseOnly || request.mode === "catalogue" || request.mode === "product-pitch" || request.mode === "call-card");
}

function isDependencySku(sku: string, profile: WingmanProductProfile) {
  const key = normaliseSku(sku);
  return (
    profile.productClass === "accessory" ||
    profile.productRole === "accessory" ||
    /^APO-DG2\b/i.test(key) ||
    /(?:RACK|BRK|RMK|PSU|PWR|TOUCH|CTL|MIC)\b/i.test(key)
  );
}

function selectorPolicyBlockReason(sku: string) {
  const value = normaliseSku(sku);

  if (!value) return "Missing SKU cannot be selected.";
  if (SELECTOR_POLICY_BLOCKED_SKUS.has(value)) return "Selector policy blocks this legacy, invalid or manually rejected SKU.";
  if (value.endsWith("-US")) return "Regional US SKU is hidden from the UK active selector catalogue.";
  if (value === "NHD-400" || value.startsWith("NHD-400-")) return "Legacy NetworkHD 400 SKU is hidden from active selection.";
  if (value.includes("H2HC") && /(^|-)TX($|-)/.test(value)) return "H2HC transmitter card is hidden from active product selection.";

  return "";
}

function requestText(request: ProductSelectorRequest) {
  return normalise(
    [
      request.query,
      request.technicalRequirement,
      request.productPath,
      request.technologyType,
      request.signalType,
      request.sourceConnector,
      request.displayConnector,
      request.usb,
      request.processing,
      request.network,
      request.audio,
      request.control,
    ].join(" "),
  );
}

function extraCompatibilityRejections(product: WingmanProductLike, profile: WingmanProductProfile, request: ProductSelectorRequest) {
  const text = requestText(request);
  const sku = normaliseSku(productSku(product));
  const reasons: string[] = [];

  if (!text) return reasons;

  if (/\b(encoder|transmitter|tx|source side|source-side)\b/.test(text)) {
    if (profile.productClass === "avoip-decoder" || /\bRX\b/.test(sku)) {
      reasons.push("Endpoint role mismatch: request needs a source-side encoder/transmitter.");
    }
  }

  if (/\b(decoder|receiver|rx|display side|display-side)\b/.test(text)) {
    if (profile.productClass === "avoip-encoder" || /\bTX\b/.test(sku)) {
      reasons.push("Endpoint role mismatch: request needs a display-side decoder/receiver.");
    }
  }

  if (/\b(networkhd|nhd)\s*500\b/.test(text) && /^NHD-/i.test(sku) && !/^NHD-5/i.test(sku)) {
    reasons.push("NetworkHD series mismatch: request is for a 500-series product path.");
  }

  if (/\b(networkhd|nhd)\s*600\b/.test(text) && /^NHD-/i.test(sku) && !/^NHD-6/i.test(sku)) {
    reasons.push("NetworkHD series mismatch: request is for a 600-series product path.");
  }

  if (/\busb\s*3|usb3|super\s*speed/.test(text) && !profile.features.usb3) {
    reasons.push("USB 3.x evidence is not present on this product.");
  }

  if (/\bmultiview|multi\s*view/.test(text) && !profile.features.multiview && profile.productClass !== "multiview-processor") {
    reasons.push("Multiview processing evidence is not present on this product.");
  }

  const distanceReason = distanceGateReason(profile, request.distance);
  if (distanceReason) reasons.push(distanceReason);

  return reasons;
}

/**
 * Cache for per-SKU deal outcome counts. Populated lazily on first scoring
 * call and cleared between selectWingmanProducts batches.
 */
let dealOutcomeCache: Map<string, { wins: number; losses: number }> | null = null;

function ensureDealOutcomeCache(): Map<string, { wins: number; losses: number }> {
  if (dealOutcomeCache) return dealOutcomeCache;
  const map = new Map<string, { wins: number; losses: number }>();
  for (const outcome of collectDealOutcomes()) {
    for (const sku of outcome.productSkus) {
      const key = normaliseSkuKey(sku);
      if (!key) continue;
      const existing = map.get(key) ?? { wins: 0, losses: 0 };
      if (outcome.outcome === "won") existing.wins += 1;
      if (outcome.outcome === "lost") existing.losses += 1;
      map.set(key, existing);
    }
  }
  dealOutcomeCache = map;
  return map;
}

function scoreProduct(product: WingmanProductLike, profile: WingmanProductProfile, request: ProductSelectorRequest, warnings: string[]) {
  let score = 0;
  const sku = normaliseSku(productSku(product));
  const query = normaliseSku(request.query);
  const compactQuery = normaliseSkuKey(query);

  score += Math.max(0, 120 - wingmanHardwareTypePriority(product) * 6);
  if (profile.productRole === "primary") score += 80;
  if (profile.productRole === "endpoint") score += 45;
  if (profile.productClass === "matrix-switch" || profile.productClass === "presentation-switcher") score += 30;
  if (profile.productClass === "cable" || profile.productClass === "accessory") score -= 160;
  if (warnings.length) score -= warnings.length * 12;
  if (compactQuery && normaliseSkuKey(sku) === compactQuery) score += 250;
  if (compactQuery && normaliseSkuKey(sku).startsWith(compactQuery)) score += 120;
  if (normalise(productName(product)).includes(normalise(request.query))) score += 30;

  // Deal outcome feedback loop: boost products that have won deals,
  // penalise those that have been in lost deals.
  const outcomes = ensureDealOutcomeCache();
  const dealData = outcomes.get(normaliseSkuKey(sku));
  if (dealData) {
    score += dealData.wins * 25; // Each win boosts by 25 points
    score -= dealData.losses * 15; // Each loss penalises by 15 points
  }

  return score;
}

function dedupeProducts<TProduct extends WingmanProductLike>(products: readonly TProduct[]) {
  const bySku = new Map<string, TProduct>();

  for (const product of products) {
    const rawSku = productSku(product);
    const canonical = resolveWyrestormSkuAlias(rawSku);
    const key = normaliseSkuKey(canonical);
    if (!key) continue;

    const current = bySku.get(key);
    if (!current) {
      bySku.set(key, product);
      continue;
    }

    const currentSku = productSku(current);
    if (normaliseSkuKey(currentSku) !== key && normaliseSkuKey(rawSku) === key) {
      bySku.set(key, product);
    }
  }

  return Array.from(bySku.values());
}

// classifyWingmanProduct()/resolveProductLifecycle() are pure functions of a SKU's own
// catalogue data and the (build-time, static-per-deploy) admin override/business-status
// lists - never of the caller's search request. selectWingmanProducts() runs buildDecision
// over the full ~310-product catalogue on every call (every keystroke in several pages),
// so without this cache the same SKU gets reclassified from scratch on every call within
// a session even though the answer can't have changed. Keyed by canonical SKU only: the
// underlying catalogue array is itself a stable, session-long-cached reference (see
// productIntelligenceIndexCache.ts), so a given SKU's product data can't change out from
// under the cache within a session.
const skuClassificationCache = new Map<string, { profile: WingmanProductProfile; lifecycle: ReturnType<typeof resolveProductLifecycle> }>();

function classifySkuCached<TProduct extends WingmanProductLike>(classifiedProduct: TProduct, canonical: string) {
  const cached = skuClassificationCache.get(canonical);
  if (cached) return cached;

  const entry = {
    profile: classifyWingmanProduct(classifiedProduct),
    lifecycle: resolveProductLifecycle(canonical),
  };
  skuClassificationCache.set(canonical, entry);
  return entry;
}

function buildDecision<TProduct extends WingmanProductLike>(product: TProduct, request: ProductSelectorRequest): ProductSelectorDecision<TProduct> {
  const rawSku = productSku(product);
  const canonical = resolveWyrestormSkuAlias(rawSku);
  const classifiedProduct = { ...product, sku: canonical };
  const { profile, lifecycle } = classifySkuCached(classifiedProduct, canonical);
  const reasons: string[] = [];
  const rejectionReasons: string[] = [];
  const warningReasons: string[] = [];
  const testingAdminStatus = String((product as Record<string, unknown>).testingAdminStatus ?? "").toLowerCase();
  const testingAdminAllowed = testingAdminStatus === "approved";

  if (canonical !== rawSku) reasons.push(`SKU alias resolved to ${canonical}.`);
  const policyBlockReason = selectorPolicyBlockReason(canonical);
  if (policyBlockReason && !testingAdminAllowed) rejectionReasons.push(policyBlockReason);
  if (lifecycle.status === "unlisted" && !testingAdminAllowed) warningReasons.push("Needs verification: SKU is not confirmed in the governed business lists.");
  if (lifecycle.supersededBy && !testingAdminAllowed) warningReasons.push(`Superseded by ${lifecycle.supersededBy}.`);
  if (profile.visibility === "request-only") warningReasons.push("Request-only product: show only when the customer requirement asks for it.");

  if ((isSkuAdminBlocked(canonical) || lifecycle.adminBlocked) && !testingAdminAllowed) {
    rejectionReasons.push("Admin override blocks this SKU from selection.");
  }

  if (!request.includeDiscontinued && !lifecycle.recommendable && !testingAdminAllowed) {
    if (lifecycle.status === "discontinued") rejectionReasons.push("Discontinued product is not a current lead selection.");
    if (lifecycle.status === "do-not-spec") rejectionReasons.push("Do-not-spec product is not a current lead selection.");
    if (lifecycle.supersededBy) rejectionReasons.push(`Superseded product should hand off to ${lifecycle.supersededBy}.`);
  }
  if (testingAdminAllowed) {
    reasons.push("ADMIN allowed this SKU for testing against the currently stored product data.");
  }

  if (profile.productClass === "cable" && !request.includeCables) {
    rejectionReasons.push("Cable hidden by default.");
  }

  if (isDependencySku(canonical, profile) && !request.includeAccessories && !request.includeDependencies) {
    rejectionReasons.push("Accessory or dependency hidden by default.");
  }

  const hasNeed = hasSelectorIntent(request);
  if (hasNeed && !isWingmanProductEligibleForFinderNeed(classifiedProduct, request)) {
    rejectionReasons.push("Compatibility gate rejected this product for the current requirement.");
  }

  rejectionReasons.push(...extraCompatibilityRejections(classifiedProduct, profile, request));

  let status: ProductSelectorDecisionStatus = "compatible";
  if (rejectionReasons.length) {
    status = "blocked";
  } else if (isDependencySku(canonical, profile)) {
    status = "dependency";
    reasons.push("Dependency/accessory candidate; attach to a lead product rather than positioning as the lead.");
  } else if ((!lifecycle.recommendable && !testingAdminAllowed) || warningReasons.length) {
    status = "browse-only";
  } else if (profile.visibility === "request-only") {
    status = "partial";
  }

  const browseAllowed = modeAllowsBrowseOnly(request);
  const eligible =
    status === "compatible" ||
    status === "partial" ||
    (status === "dependency" && Boolean(request.includeDependencies || request.includeAccessories)) ||
    (status === "browse-only" && browseAllowed);

  // Positive evidence: when the request actually specified I/O, USB or reach
  // dimensions and the product cleared them, say so. Reps see WHY the product
  // passed the gates, not just that it did. Mirrors the eligibility predicates
  // one-for-one, so a claim is never made for a gate that did not run.
  if (eligible && hasNeed) {
    reasons.push(...matchedGateReasons(profile, request));
  }

  const decision: ProductSelectorDecision<TProduct> = {
    sku: canonical,
    canonicalSku: canonical,
    product,
    profile,
    eligible,
    status,
    score: scoreProduct(classifiedProduct, profile, request, warningReasons),
    reasons,
    rejectionReasons,
    warningReasons,
    lifecycleStatus: lifecycle.status,
    lifecycleLabel: lifecycleLabel({ lifecycleStatus: lifecycle.status, supersededBy: lifecycle.supersededBy }),
    supersededBy: lifecycle.supersededBy,
  };

  return decision;
}

function statusRank(status: ProductSelectorDecisionStatus) {
  switch (status) {
    case "compatible":
      return 0;
    case "partial":
      return 1;
    case "browse-only":
      return 2;
    case "dependency":
      return 3;
    case "blocked":
    default:
      return 4;
  }
}

export function selectWingmanProducts<TProduct extends WingmanProductLike>(
  products: readonly TProduct[],
  request: ProductSelectorRequest,
): ProductSelectorDecision<TProduct>[] {
  const decisions = dedupeProducts(products)
    .map((product) => buildDecision(product, request))
    .filter((decision) => textMatches({ ...decision.product, sku: decision.sku }, request))
    .filter((decision) => familyMatches(decision.product, request))
    .filter((decision) => alphaMatches({ ...decision.product, sku: decision.sku }, request))
    .sort((a, b) => {
      const eligibilityDelta = Number(b.eligible) - Number(a.eligible);
      if (eligibilityDelta) return eligibilityDelta;

      const statusDelta = statusRank(a.status) - statusRank(b.status);
      if (statusDelta) return statusDelta;

      return b.score - a.score || a.sku.localeCompare(b.sku);
    });

  return typeof request.limit === "number" && request.limit > 0 ? decisions.slice(0, request.limit) : decisions;
}

export async function loadWingmanProductSelectorDecisions(
  request: ProductSelectorRequest,
): Promise<ProductSelectorDecision<IndexedProduct>[]> {
  const payload = await loadProductIntelligenceIndex();
  const products = extractRawProducts(payload) as IndexedProduct[];
  return selectWingmanProducts(products, request);
}
