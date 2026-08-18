import { recommendWirelessCastingSkus } from "./wirelessCastingRecommendationRules";
import { rigorousCompare } from "./rigorousCompare";
import {
  applyKnownCompareProfileOverrides,
  enrichCompareInputWithKnownProfile,
} from "./knownCompareProfiles";
import { applyCompareEligibilityRanking, classifyCompareIntent } from "./compareEligibilityEngine";
import { recoverFalseNoMatchCandidates } from "./compareFalseNoMatchRecovery";
import { rescueCompareFalseNoMatchWithV2 } from "./compareMatchServiceV2";
import { applyCompareEquivalenceGuards } from "./compareEquivalenceGuard";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";
import { classifyCompetitorCompareDecision } from "./competitorCompareDecision";

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

function isExplicitRuntimeCastingAccessory(value: unknown): boolean {
  const text = String(value ?? "").toLowerCase();

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

function matchRuntimeSkuKeys(value: WirelessRuntimeRecord | undefined): string[] {
  const sku = runtimeSku(value);
  return sku ? runtimeSkuLookupKeys(sku) : [];
}

function prioritiseRuntimeSkus(
  matches: readonly WirelessRuntimeRecord[] | undefined,
  products: readonly WirelessRuntimeRecord[],
  competitor: unknown,
  primarySkus: readonly string[],
  optionalSkus: readonly string[],
  rationale: string,
): { matches: WirelessRuntimeRecord[]; rejected: WirelessRuntimeRecord[] } {
  const existing = Array.isArray(matches) ? matches : [];
  const preferredKeys = [...primarySkus, ...optionalSkus].map((item) =>
    String(item).toUpperCase().replace(/[^A-Z0-9]+/g, ""),
  );

  // Re-rank the ALREADY EVALUATED matches only - never fabricate catalogue rows.
  // Prepending raw product records here produced top-of-list candidates with no
  // `decision`, which the page then had to re-classify from half-empty data.
  const ordered: WirelessRuntimeRecord[] = [];
  const used = new Set<WirelessRuntimeRecord>();

  for (const preferred of preferredKeys) {
    const found = existing.find((match) =>
      !used.has(match) && matchRuntimeSkuKeys(match).includes(preferred),
    );
    if (found) {
      ordered.push(found);
      used.add(found);
    }
  }

  for (const match of existing) {
    if (!used.has(match)) {
      ordered.push(match);
    }
  }

  // When a genuinely recommended PRIMARY switcher (e.g. SW-640L-TX-W for four
  // or more sources) was never part of the evaluated candidate pool, add it as
  // a REAL evaluated match - structured WyreStorm profile plus a classifier
  // decision - rather than a bare catalogue row. NO MATCH verdicts still go to
  // `rejected`, preserving the fail-closed contract. Optional accessories
  // (e.g. IDB-300 desk box) are surfaced in the recommendation prose instead,
  // never as like-for-like match cards: their honest verdict against a
  // wireless-presentation competitor is NO MATCH, which is right but would
  // confuse a rep who saw the "recommended" accessory sitting in rejected.
  const presentKeys = new Set<string>();
  for (const match of [...existing, ...ordered]) {
    for (const key of matchRuntimeSkuKeys(match)) {
      presentKeys.add(key);
    }
  }

  const added: WirelessRuntimeRecord[] = [];
  const rejected: WirelessRuntimeRecord[] = [];

  for (const sku of primarySkus) {
    const lookupKeys = runtimeSkuLookupKeys(sku);
    if (lookupKeys.some((key) => presentKeys.has(key))) {
      continue;
    }

    const product = products.find((item) =>
      lookupKeys.includes(runtimeSkuKey(item)),
    );
    if (!product) {
      continue;
    }

    const wyrestorm = buildWyrestormCompareProfile(product as any);
    const decision = classifyCompetitorCompareDecision({
      competitor: competitor as any,
      wyrestorm,
      score: 72,
      evidence: [rationale],
    });
    const entry: WirelessRuntimeRecord = {
      sku: product.sku ?? product.model ?? sku,
      name: product.name ?? product.title ?? sku,
      family: product.family ?? product.productFamily ?? product.category ?? "WyreStorm",
      heuristicScore: decision.confidence,
      wyrestorm,
      decision,
      compareEligibility: {
        eligibility: "direct",
        fitPenalty: -90,
        reasons: [rationale],
      },
    };

    for (const key of lookupKeys) {
      presentKeys.add(key);
    }
    if (decision.outcome === "NO MATCH") {
      rejected.push(entry);
    } else {
      added.push(entry);
    }
  }

  return { matches: [...ordered, ...added], rejected };
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

  const competitorText = wirelessRuntimeText(record?.competitor);

  // A competitor described explicitly as a casting/presentation DONGLE (e.g.
  // ClickShare Button, ScreenBeam) is a single endpoint, not a room switcher:
  // lead with APO-DG2 (the WyreStorm casting dongle itself) even where the
  // room-size rules would otherwise put a presentation switcher or UC bar
  // first. The eligibility layer already prefers APO-DG2 via fit penalty for
  // this case - the room-based reordering must not override it.
  const castingAccessoryCompetitor = isExplicitRuntimeCastingAccessory(`${inputText} ${competitorText}`);

  const recommendation = recommendWirelessCastingSkus({
    roomType: inputText,
    sourceCount: inferWirelessSourceCount(inputText, result),
    deskConnection: /desk|table|lectern|cubby|in-desk/i.test(inputText),
    connectionLocation: inputText,
  });

  const primarySkus = castingAccessoryCompetitor
    ? ["APO-DG2", ...recommendation.primarySkus]
    : recommendation.primarySkus;

  const rationale = castingAccessoryCompetitor
    ? `The competitor is an explicit wireless casting accessory (dongle/button/adapter), so APO-DG2 leads as the role-equivalent accessory. APO-DG2 must then be paired with a compatible WyreStorm room core such as SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2. ${recommendation.rationale}`
    : recommendation.rationale;

  // This runtime layer executes AFTER the main eligibility engine. It must not
  // re-introduce or preserve DG2 for a generic wireless room-hub comparison
  // after eligibility has correctly determined that the accessory is not the
  // thing being compared.
  const wirelessMatches = castingAccessoryCompetitor
    ? record.matches
    : (Array.isArray(record.matches)
        ? record.matches.filter(
            (match: WirelessRuntimeRecord) => runtimeSkuKey(match) !== "APODG2",
          )
        : record.matches);

  const ranked = prioritiseRuntimeSkus(
    wirelessMatches,
    products,
    record.competitor,
    primarySkus,
    recommendation.optionalSkus,
    rationale,
  );

  record.matches = ranked.matches;
  record.rejected = [
    ...(Array.isArray(record.rejected) ? record.rejected : []),
    ...ranked.rejected,
  ];

  const optionalProse = recommendation.optionalSkus.length > 0
    ? `For desk/table or lectern connections, add ${recommendation.optionalSkus.join(", ")} as a connectivity accessory option - it is an accessory, not a like-for-like equivalent.`
    : "";

  const castingAccessorySystemProse = castingAccessoryCompetitor
    ? "APO-DG2 is the casting accessory only. Pair it with one compatible WyreStorm room core: SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2."
    : "";

  record.nextSteps = [
    rationale,
    ...(castingAccessorySystemProse ? [castingAccessorySystemProse] : []),
    ...(optionalProse ? [optionalProse] : []),
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

  const rankedResult = applyCompareEligibilityRanking(
    curatedResult,
    normalisedProducts,
    inputText,
  );

  return rescueCompareFalseNoMatchWithV2(
    rankedResult,
    normalisedProducts,
    inputText,
  );
}

export function runCompareRuntimePipeline(...args: Parameters<typeof runCompareRuntimePipelineBase>): ReturnType<typeof runCompareRuntimePipelineBase> {
  const result = runCompareRuntimePipelineBase(...args);
  const inputText = String(args[0] ?? "");
  const products = Array.isArray(args[1]) ? (args[1] as readonly WirelessRuntimeRecord[]) : [];

  return applyWirelessCastingRulesToRuntimeResult(result, products, inputText) as ReturnType<typeof runCompareRuntimePipelineBase>;
}
