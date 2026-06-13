import { rigorousCompare } from "./rigorousCompare";
import {
  applyKnownCompareProfileOverrides,
  enrichCompareInputWithKnownProfile,
} from "./knownCompareProfiles";
import { applyCompareEligibilityRanking } from "./compareEligibilityEngine";
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

export function runCompareRuntimePipeline(
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
