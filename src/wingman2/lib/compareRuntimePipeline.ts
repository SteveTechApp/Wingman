import { recommendWirelessCastingSkus } from "./wirelessCastingRecommendationRules";
import { rigorousCompare } from "./rigorousCompare";
import {
  applyKnownCompareProfileOverrides,
  enrichCompareInputWithKnownProfile,
} from "./knownCompareProfiles";
import { applyCompareEligibilityRanking, classifyCompareIntent } from "./compareEligibilityEngine";
import { applyCompareEquivalenceGuards } from "./compareEquivalenceGuard";

type AnyRecord = Record<string, any>;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanSku(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseSkuKey(value: unknown): string {
  return cleanSku(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function isProductLikeRecord(value: unknown): value is AnyRecord {
  if (!isRecord(value)) {
    return false;
  }

  const sku = cleanSku(value.sku ?? value.model ?? value.partNumber);
  const hasIdentity = Boolean(sku);
  const hasProductDescription = Boolean(
    value.name ??
    value.title ??
    value.family ??
    value.productFamily ??
    value.category ??
    value.role ??
    value.governanceRole,
  );

  return hasIdentity && hasProductDescription;
}

function collectProductLikeRecords(value: unknown, output: AnyRecord[], seenObjects: Set<unknown>): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  if (seenObjects.has(value)) {
    return;
  }

  seenObjects.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      collectProductLikeRecords(item, output, seenObjects);
    }

    return;
  }

  if (isProductLikeRecord(value)) {
    output.push(value);
    return;
  }

  for (const item of Object.values(value as AnyRecord)) {
    collectProductLikeRecords(item, output, seenObjects);
  }
}

export function normaliseCompareProducts(input: unknown): AnyRecord[] {
  const output: AnyRecord[] = [];
  collectProductLikeRecords(input, output, new Set());

  const deduped = new Map<string, AnyRecord>();

  for (const product of output) {
    const key = normaliseSkuKey(product.sku ?? product.model ?? product.partNumber);

    if (!key) {
      continue;
    }

    if (!deduped.has(key)) {
      deduped.set(key, product);
    }
  }

  return Array.from(deduped.values());
}


type WirelessRuntimeRecord = Record<string, any>;

function runtimeSku(value: unknown): string {
  const record = value as WirelessRuntimeRecord | undefined;
  return String(record?.sku ?? record?.wyrestorm?.sku ?? "").toUpperCase();
}

function runtimeSkuKey(value: unknown): string {
  return runtimeSku(value).replace(/[^A-Z0-9]+/g, "");
}

const RUNTIME_DISPLAY_SKU_ALIASES: Record<string, readonly string[]> = {
  SW620LTXW: ["SW620TXW"],
  SW620TXW: ["SW620LTXW"],
  SW640TXW: ["SW640LTXW"],
  SW640LTXW: ["SW640TXW"],
};

function runtimeSkuLookupKeys(value: unknown): string[] {
  const key = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return key ? Array.from(new Set([key, ...(RUNTIME_DISPLAY_SKU_ALIASES[key] ?? [])])) : [];
}

function wirelessRuntimeText(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as WirelessRuntimeRecord;
  return [
    record.sku,
    record.name,
    record.title,
    record.brand,
    record.manufacturer,
    record.domain,
    record.role,
    record.transport,
    record.category,
    record.productClass,
  ]
    .filter(Boolean)
    .join(" ");
}

function hasWirelessCastingIntent(result: unknown, inputText: string): boolean {
  const record = result as WirelessRuntimeRecord | undefined;
  const competitorText = wirelessRuntimeText(record?.competitor);
  const text = `${inputText} ${competitorText}`.toLowerCase();

  return /wireless|casting|clickshare|solstice|screen share|airplay|miracast/.test(text);
}

function inferWirelessSourceCount(inputText: string, result: unknown): number | undefined {
  const record = result as WirelessRuntimeRecord | undefined;
  const competitor = record?.competitor as WirelessRuntimeRecord | undefined;

  if (typeof competitor?.inputCount === "number") {
    return competitor.inputCount;
  }

  const text = String(inputText ?? "").toLowerCase();
  const match = text.match(/\b([2-9]|10|11|12)\s*(source|sources|input|inputs)\b/);

  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

function findRuntimeProductBySku(products: readonly WirelessRuntimeRecord[], sku: string): WirelessRuntimeRecord {
  const targetKeys = runtimeSkuLookupKeys(sku);
  const found = products.find((product) => targetKeys.includes(runtimeSkuKey(product)));

  if (found) {
    return runtimeSkuKey(found) === runtimeSkuLookupKeys(sku)[0] ? found : { ...found, sku };
  }

  return {
    sku,
    name: sku,
    role: sku === "IDB-300" ? "accessory / request-only" : "primary-hardware / default",
    compareRuleSource: "wireless-casting-recommendation-rule",
  };
}

function prioritiseRuntimeSkus(
  matches: readonly WirelessRuntimeRecord[] | undefined,
  products: readonly WirelessRuntimeRecord[],
  primarySkus: readonly string[],
  optionalSkus: readonly string[],
): WirelessRuntimeRecord[] {
  const existing = Array.isArray(matches) ? matches : [];
  const preferredSkus = [...primarySkus, ...optionalSkus].map((item) => item.toUpperCase());
  const preferred = preferredSkus.map((item) => findRuntimeProductBySku(products, item));
  const remaining = existing.filter((item) => !preferredSkus.includes(runtimeSku(item)));

  return [...preferred, ...remaining];
}

function applyWirelessCastingRulesToRuntimeResult<T>(
  result: T,
  products: readonly WirelessRuntimeRecord[],
  inputText: string,
): T {
  const record = result as WirelessRuntimeRecord;
  if (classifyCompareIntent(record?.competitor || record, inputText) === "control-system") {
    return result;
  }

  if (!hasWirelessCastingIntent(result, inputText)) {
    return result;
  }

  const recommendation = recommendWirelessCastingSkus({
    roomType: inputText,
    sourceCount: inferWirelessSourceCount(inputText, result),
    deskConnection: /desk|table|lectern|cubby|in-desk/i.test(inputText),
    connectionLocation: inputText,
  });

  record.matches = prioritiseRuntimeSkus(
    record.matches,
    products,
    recommendation.primarySkus,
    recommendation.optionalSkus,
  );

  record.nextSteps = [
    recommendation.rationale,
    ...(Array.isArray(record.nextSteps) ? record.nextSteps : []),
  ];

  return record as T;
}

function runCompareRuntimePipelineBase(
  inputText: string,
  products: unknown,
  brand?: string,
  limit = 10,
  productUrl = "",
): AnyRecord {
  const normalisedProducts = normaliseCompareProducts(products);
  const enrichedInput = enrichCompareInputWithKnownProfile(inputText, brand);
  const baseResult = applyCompareEquivalenceGuards(
    rigorousCompare(enrichedInput, normalisedProducts as any, brand, limit, productUrl)
  );
  const curatedResult = applyKnownCompareProfileOverrides(baseResult, normalisedProducts, inputText, brand);

  return applyCompareEligibilityRanking(curatedResult, normalisedProducts, inputText);
}

export function runCompareRuntimePipeline(...args: Parameters<typeof runCompareRuntimePipelineBase>): ReturnType<typeof runCompareRuntimePipelineBase> {
  const result = runCompareRuntimePipelineBase(...args);
  const inputText = String(args[0] ?? "");
  const products = Array.isArray(args[1]) ? args[1] as readonly WirelessRuntimeRecord[] : [];

  return applyWirelessCastingRulesToRuntimeResult(result, products, inputText) as ReturnType<typeof runCompareRuntimePipelineBase>;
}
