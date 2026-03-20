import { classifyProductType } from "@/catalog/classification";
import { enrichCatalogProduct } from "@/catalog/enrich";
import { normalizeCatalogProduct } from "@/catalog/normalize";
import type { CatalogProduct } from "@/catalog/types";
import {
  addProductIntelligenceEvidence,
  fetchProductIntelligenceRecords,
  getProductIntelligenceEndpoint,
  upsertProductIntelligenceRecord,
  type ProductIntelligenceQueryResult,
  type ProductIntelligenceRecord,
  type ProductIntelligenceSummary,
} from "@/services/productIntelligenceService";
import type { CompetitorLookupRecord } from "@/services/competitor/lookupService";

export type LiveProductDataStatus = {
  endpoint: string | null;
  available: boolean;
  mode: string;
  fetchedAt: string;
  total: number;
  warnings: string[];
  summary: ProductIntelligenceSummary;
};

type LiveProductDataSnapshot = LiveProductDataStatus & {
  version: 1;
  records: ProductIntelligenceRecord[];
};

const STORAGE_KEY = "wm_live_product_data_v1";

const EMPTY_SUMMARY: ProductIntelligenceSummary = {
  total: 0,
  byStatus: { draft: 0, approved: 0, expired: 0 },
  byVendorType: { wyrestorm: 0, competitor: 0 },
  stale90Days: 0,
  highConfidence: 0,
};

const EMPTY_STATUS: LiveProductDataStatus = {
  endpoint: getProductIntelligenceEndpoint(),
  available: false,
  mode: "seed",
  fetchedAt: "",
  total: 0,
  warnings: [],
  summary: EMPTY_SUMMARY,
};

let cachedSnapshot: LiveProductDataSnapshot | null = null;
let cachedStatus: LiveProductDataStatus | null = null;
let refreshPromise: Promise<LiveProductDataSnapshot | null> | null = null;
const listeners = new Set<() => void>();

function nowIso(): string {
  return new Date().toISOString();
}

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeSku(value: unknown): string {
  return tidy(value).toUpperCase();
}

function normalizeId(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function dedupeStrings(values: unknown[], limit = 24): string[] {
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

function sanitizeSummary(value: unknown): ProductIntelligenceSummary {
  if (!value || typeof value !== "object") return EMPTY_SUMMARY;
  const input = value as Partial<ProductIntelligenceSummary>;
  return {
    total: Number(input.total) || 0,
    byStatus: {
      draft: Number(input.byStatus?.draft) || 0,
      approved: Number(input.byStatus?.approved) || 0,
      expired: Number(input.byStatus?.expired) || 0,
    },
    byVendorType: {
      wyrestorm: Number(input.byVendorType?.wyrestorm) || 0,
      competitor: Number(input.byVendorType?.competitor) || 0,
    },
    stale90Days: Number(input.stale90Days) || 0,
    highConfidence: Number(input.highConfidence) || 0,
  };
}

function sanitizeRecord(record: ProductIntelligenceRecord): ProductIntelligenceRecord {
  return {
    ...record,
    id: tidy(record.id) || `${record.vendorType}::${normalizeId(record.brand)}::${normalizeSku(record.sku)}`,
    brand: tidy(record.brand) || (record.vendorType === "wyrestorm" ? "WyreStorm" : "Unknown"),
    sku: normalizeSku(record.sku),
    name: tidy(record.name) || normalizeSku(record.sku),
    family: tidy(record.family) || "Unknown",
    group: tidy(record.group) as ProductIntelligenceRecord["group"],
    category: tidy(record.category) || "Uncategorized",
    subcategory: tidy(record.subcategory) || undefined,
    classificationSource: tidy(record.classificationSource) as ProductIntelligenceRecord["classificationSource"] || "inferred",
    summary: tidy(record.summary) || `${normalizeSku(record.sku)} reference record.`,
    features: dedupeStrings(record.features || [], 24),
    transport: tidy(record.transport) || undefined,
    inputs: Array.isArray(record.inputs) ? record.inputs : [],
    outputs: Array.isArray(record.outputs) ? record.outputs : [],
    control: dedupeStrings(record.control || [], 16),
    audio: dedupeStrings(record.audio || [], 16),
    latency: tidy(record.latency) || undefined,
    sourceUrls: dedupeStrings(record.sourceUrls || [], 8),
    tags: dedupeStrings(record.tags || [], 20),
    notes: tidy(record.notes) || undefined,
    createdAt: tidy(record.createdAt) || nowIso(),
    updatedAt: tidy(record.updatedAt) || nowIso(),
    lastCapturedAt: tidy(record.lastCapturedAt) || nowIso(),
    lastReviewedAt: tidy(record.lastReviewedAt) || undefined,
    reviewedBy: tidy(record.reviewedBy) || undefined,
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
    reviewFlags: Array.isArray(record.reviewFlags) ? record.reviewFlags : [],
    archived: Boolean(record.archived),
  };
}

function sanitizeSnapshot(snapshot: LiveProductDataSnapshot): LiveProductDataSnapshot {
  const records = Array.isArray(snapshot.records)
    ? snapshot.records.map((record) => sanitizeRecord(record))
    : [];

  return {
    version: 1,
    endpoint: snapshot.endpoint || getProductIntelligenceEndpoint(),
    available: Boolean(snapshot.available),
    mode: tidy(snapshot.mode) || "unknown",
    fetchedAt: tidy(snapshot.fetchedAt) || nowIso(),
    total: Number(snapshot.total) || records.length,
    warnings: dedupeStrings(snapshot.warnings || [], 12),
    summary: sanitizeSummary(snapshot.summary),
    records,
  };
}

function readSnapshotFromStorage(): LiveProductDataSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveProductDataSnapshot;
    return sanitizeSnapshot(parsed);
  } catch {
    return null;
  }
}

function emitChange(): void {
  for (const listener of listeners) listener();
}

function toStatus(snapshot: LiveProductDataSnapshot): LiveProductDataStatus {
  return {
    endpoint: snapshot.endpoint,
    available: snapshot.available,
    mode: snapshot.mode,
    fetchedAt: snapshot.fetchedAt,
    total: snapshot.total,
    warnings: snapshot.warnings,
    summary: snapshot.summary,
  };
}

function setSnapshot(snapshot: LiveProductDataSnapshot): LiveProductDataSnapshot {
  const sanitized = sanitizeSnapshot(snapshot);
  cachedSnapshot = sanitized;
  cachedStatus = toStatus(sanitized);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
    }
  }

  emitChange();
  return sanitized;
}

function getSnapshot(): LiveProductDataSnapshot | null {
  if (cachedSnapshot) return cachedSnapshot;
  cachedSnapshot = readSnapshotFromStorage();
  cachedStatus = cachedSnapshot ? toStatus(cachedSnapshot) : null;
  return cachedSnapshot;
}

function toSnapshot(result: ProductIntelligenceQueryResult): LiveProductDataSnapshot {
  return sanitizeSnapshot({
    version: 1,
    endpoint: result.endpoint,
    available: result.available,
    mode: result.mode,
    fetchedAt: result.fetchedAt,
    total: result.total,
    warnings: result.warnings,
    summary: result.summary,
    records: result.records,
  });
}

function mergeById(records: ProductIntelligenceRecord[]): ProductIntelligenceRecord[] {
  const merged = new Map<string, ProductIntelligenceRecord>();

  for (const record of records) {
    const sanitized = sanitizeRecord(record);
    merged.set(sanitized.id, sanitized);
  }

  return Array.from(merged.values()).sort((left, right) => {
    const vendorCmp = left.vendorType.localeCompare(right.vendorType);
    if (vendorCmp !== 0) return vendorCmp;
    const brandCmp = left.brand.localeCompare(right.brand);
    if (brandCmp !== 0) return brandCmp;
    return left.sku.localeCompare(right.sku);
  });
}

function recordIdForLookup(record: CompetitorLookupRecord): string {
  return `competitor::${normalizeId(record.brand)}::${normalizeSku(record.sku)}`;
}

function mergeSnapshotRecord(record: ProductIntelligenceRecord): LiveProductDataSnapshot {
  const current = getSnapshot();
  const records = mergeById([...(current?.records || []), record]);
  const summary = records.reduce<ProductIntelligenceSummary>(
    (acc, item) => {
      acc.total += 1;
      acc.byStatus[item.status] += 1;
      acc.byVendorType[item.vendorType] += 1;
      if (item.confidence >= 0.8) acc.highConfidence += 1;
      const capturedAt = Date.parse(item.lastCapturedAt);
      if (Number.isFinite(capturedAt) && Date.now() - capturedAt > 90 * 24 * 60 * 60 * 1000) {
        acc.stale90Days += 1;
      }
      return acc;
    },
    {
      total: 0,
      byStatus: { draft: 0, approved: 0, expired: 0 },
      byVendorType: { wyrestorm: 0, competitor: 0 },
      stale90Days: 0,
      highConfidence: 0,
    },
  );

  return setSnapshot({
    version: 1,
    endpoint: current?.endpoint || getProductIntelligenceEndpoint(),
    available: current?.available ?? false,
    mode: current?.mode || "snapshot",
    fetchedAt: nowIso(),
    total: records.length,
    warnings: current?.warnings || [],
    summary,
    records,
  });
}

export function subscribeLiveProductData(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getLiveProductDataStatus(): LiveProductDataStatus {
  const snapshot = getSnapshot();
  if (!snapshot) return EMPTY_STATUS;
  if (cachedStatus) return cachedStatus;
  cachedStatus = toStatus(snapshot);
  return cachedStatus;
}

export function getLiveProductDataToken(): string {
  const snapshot = getSnapshot();
  if (!snapshot) return "seed::0";
  return `${snapshot.fetchedAt}::${snapshot.total}::${snapshot.available ? "online" : "fallback"}`;
}

export function getLiveProductDataRecords(
  vendorType?: ProductIntelligenceRecord["vendorType"],
): ProductIntelligenceRecord[] {
  const snapshot = getSnapshot();
  if (!snapshot) return [];
  return snapshot.records.filter((record) => !record.archived && (!vendorType || record.vendorType === vendorType));
}

export function mapProductIntelligenceRecordToCatalogProduct(record: ProductIntelligenceRecord): CatalogProduct {
  const classification = classifyProductType({
    sku: record.sku,
    family: record.family,
    name: record.name,
    category: record.category,
    summary: record.summary,
    transport: record.transport,
    features: record.features,
    audio: record.audio,
    control: record.control,
  });

  return enrichCatalogProduct(normalizeCatalogProduct({
    sku: normalizeSku(record.sku),
    name: tidy(record.name) || normalizeSku(record.sku),
    family: tidy(record.family) || "Unknown",
    category: tidy(record.category) || classification.category || "Uncategorized",
    subcategory: tidy(record.subcategory) || classification.label,
    status: record.status === "expired" ? "legacy" : record.status === "approved" ? "active" : "draft",
    summary: tidy(record.summary) || `${normalizeSku(record.sku)} reference record.`,
    sourceUrl: record.sourceUrls[0],
    technology: tidy(record.technology),
    topology: tidy(record.topology),
    role: tidy(record.role),
    directionality: tidy(record.directionality),
    outputBehavior: tidy(record.outputBehavior),
    inputs: Array.isArray(record.inputs) ? record.inputs : [],
    outputs: Array.isArray(record.outputs) ? record.outputs : [],
    control: dedupeStrings(record.control || [], 16),
    audio: dedupeStrings(record.audio || [], 16),
    video: record.video,
    latency: tidy(record.latency) || undefined,
    transport: tidy(record.transport) as CatalogProduct["transport"],
    distance: record.distance ?? (record.distanceMeters ? { meters: record.distanceMeters } : undefined),
    usb: record.usb,
    wireless: record.wireless,
    integration: record.integration,
    power: record.power,
    features: dedupeStrings(record.features || [], 24),
    notes:
      [
        record.sourceType === "live" ? "Live intelligence record." : "",
        record.sourceUrls[0] ? `Source: ${record.sourceUrls[0]}` : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined,
  }));
}

export async function refreshLiveProductData(options?: {
  force?: boolean;
  minIntervalMs?: number;
}): Promise<LiveProductDataSnapshot | null> {
  const force = Boolean(options?.force);
  const minIntervalMs = Math.max(30_000, Number(options?.minIntervalMs) || 10 * 60 * 1000);
  const current = getSnapshot();

  if (!force && current) {
    const ageMs = Date.now() - Date.parse(current.fetchedAt || "");
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < minIntervalMs) {
      return current;
    }
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = fetchProductIntelligenceRecords({ limit: 4000 })
    .then((result) => setSnapshot(toSnapshot(result)))
    .catch(() => current ?? null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function toLookupIntelligenceRecord(record: CompetitorLookupRecord): ProductIntelligenceRecord {
  const id = recordIdForLookup(record);
  const now = nowIso();
  const summary = tidy(record.summary) || `${normalizeSku(record.sku)} lookup result.`;
  const sourceUrl = tidy(record.sourceUrl);
  const classification = classifyProductType({
    sku: record.sku,
    family: record.family,
    name: record.name,
    category: record.category,
    summary,
    transport: record.transport,
    features: record.features,
    audio: record.audio,
    control: record.control,
  });

  return sanitizeRecord({
    id,
    vendorType: "competitor",
    brand: tidy(record.brand) || "Unknown",
    sku: normalizeSku(record.sku),
    name: tidy(record.name) || normalizeSku(record.sku),
    family: tidy(record.family) || "Unknown",
    group: classification.group,
    category: classification.category || tidy(record.category) || "Uncategorized",
    subcategory: classification.label,
    classificationSource: "inferred",
    summary,
    technology: tidy(record.transport) || undefined,
    features: dedupeStrings(record.features || [], 24),
    transport: tidy(record.transport) || undefined,
    inputs: Array.isArray(record.inputs) ? record.inputs : [],
    outputs: Array.isArray(record.outputs) ? record.outputs : [],
    control: dedupeStrings(record.control || [], 16),
    audio: dedupeStrings(record.audio || [], 16),
    video: record.video,
    latency: tidy(record.latency) || undefined,
    distanceMeters: record.distanceMeters,
    status: "draft",
    confidence: 0.76,
    sourceType: "live",
    sourceUrls: sourceUrl ? [sourceUrl] : [],
    tags: dedupeStrings(
      [
        record.brand,
        record.family,
        record.category,
        record.transport,
        record.video?.maxResolution,
        record.video?.hdmi,
        Number.isFinite(record.video?.bandwidthGbps) ? `${record.video?.bandwidthGbps}Gbps` : "",
        record.latency,
        classification.label,
        ...classification.tags,
        ...(record.features || []),
      ],
      20,
    ),
    notes: "Captured from live competitor lookup.",
    createdAt: now,
    updatedAt: now,
    lastCapturedAt: now,
    evidence: [
      {
        id: `${normalizeId(record.sku)}-lookup-summary`,
        type: "spec",
        label: "Live lookup summary",
        value: summary,
        sourceUrl: sourceUrl || undefined,
        capturedAt: now,
        confidence: 0.76,
        notes: "Captured from live competitor lookup workflow.",
      },
    ],
    reviewFlags: [],
    archived: false,
  });
}

export async function captureCompetitorLookupRecord(record: CompetitorLookupRecord): Promise<void> {
  const normalized = toLookupIntelligenceRecord(record);
  mergeSnapshotRecord(normalized);

  if (!getProductIntelligenceEndpoint()) {
    return;
  }

  const result = await upsertProductIntelligenceRecord({
    vendorType: "competitor",
    brand: normalized.brand,
    sku: normalized.sku,
    name: normalized.name,
    family: normalized.family,
    category: normalized.category,
    subcategory: normalized.subcategory,
    group: normalized.group,
    classificationSource: normalized.classificationSource,
    summary: normalized.summary,
    technology: normalized.technology,
    topology: normalized.topology,
    role: normalized.role,
    directionality: normalized.directionality,
    outputBehavior: normalized.outputBehavior,
    features: normalized.features,
    transport: normalized.transport,
    inputs: normalized.inputs,
    outputs: normalized.outputs,
    control: normalized.control,
    audio: normalized.audio,
    video: normalized.video,
    latency: normalized.latency,
    distance: normalized.distance,
    distanceMeters: normalized.distanceMeters,
    usb: normalized.usb,
    wireless: normalized.wireless,
    integration: normalized.integration,
    power: normalized.power,
    status: "draft",
    confidence: normalized.confidence,
    sourceType: "live",
    sourceUrls: normalized.sourceUrls,
    tags: normalized.tags,
    notes: normalized.notes,
  });

  if (result.record) {
    mergeSnapshotRecord(result.record);
  }

  if (normalized.summary) {
    await addProductIntelligenceEvidence({
      vendorType: "competitor",
      brand: normalized.brand,
      sku: normalized.sku,
      type: "spec",
      label: "Live lookup summary",
      value: normalized.summary,
      sourceUrl: normalized.sourceUrls[0],
      confidence: normalized.confidence,
      notes: "Auto-captured from live competitor lookup workflow.",
    });
  }
}
