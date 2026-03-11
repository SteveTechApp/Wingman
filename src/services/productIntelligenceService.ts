import competitorCatalog from "@/data/catalog/competitor-catalog.phase4.json";
import { buildWyrestormSeedCatalogProducts } from "@/catalog/seedCatalog";

export type ProductVendorType = "wyrestorm" | "competitor";
export type ProductApprovalStatus = "draft" | "approved" | "expired";
export type ProductSourceType = "catalog" | "live" | "manual" | "import";
export type ProductEvidenceType = "spec" | "io" | "compatibility" | "positioning" | "application" | "other";

export type ProductPortCount = {
  type: string;
  count: number;
};

export type ProductVideoProfile = {
  maxResolution?: string;
  hdr?: boolean;
};

export type ProductEvidenceEntry = {
  id: string;
  type: ProductEvidenceType;
  label: string;
  value: string;
  sourceUrl?: string;
  capturedAt: string;
  confidence: number;
  notes?: string;
};

export type ProductIntelligenceRecord = {
  id: string;
  vendorType: ProductVendorType;
  brand: string;
  sku: string;
  name: string;
  family: string;
  category: string;
  summary: string;
  features: string[];
  transport?: string;
  inputs: ProductPortCount[];
  outputs: ProductPortCount[];
  control: string[];
  audio: string[];
  video?: ProductVideoProfile;
  distanceMeters?: number;
  status: ProductApprovalStatus;
  confidence: number;
  sourceType: ProductSourceType;
  sourceUrls: string[];
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastCapturedAt: string;
  lastReviewedAt?: string;
  reviewedBy?: string;
  evidence: ProductEvidenceEntry[];
};

export type ProductIntelligenceSummary = {
  total: number;
  byStatus: Record<ProductApprovalStatus, number>;
  byVendorType: Record<ProductVendorType, number>;
  stale90Days: number;
  highConfidence: number;
};

export type ProductIntelligenceQuery = {
  vendorType?: ProductVendorType;
  status?: ProductApprovalStatus;
  brand?: string;
  sku?: string;
  q?: string;
  limit?: number;
};

export type ProductIntelligenceQueryResult = {
  ok: true;
  available: boolean;
  endpoint: string | null;
  fetchedAt: string;
  mode: string;
  warnings: string[];
  total: number;
  count: number;
  records: ProductIntelligenceRecord[];
  summary: ProductIntelligenceSummary;
};

export type ProductIntelligenceHealthResult = {
  ok: true;
  available: boolean;
  endpoint: string | null;
  fetchedAt: string;
  warnings: string[];
  summary: ProductIntelligenceSummary;
  generatedAt?: string;
  updatedAt?: string;
};

export type ProductIntelligenceMutationResult = {
  ok: true;
  available: boolean;
  endpoint: string | null;
  mode: string;
  message: string;
  warnings: string[];
  record?: ProductIntelligenceRecord;
  summary?: ProductIntelligenceSummary;
};

export type ProductIntelligenceUpsertPayload = Partial<ProductIntelligenceRecord> & {
  vendorType: ProductVendorType;
  brand: string;
  sku: string;
};

export type ProductIntelligenceStatusPayload = {
  vendorType?: ProductVendorType;
  brand: string;
  sku: string;
  status: ProductApprovalStatus;
  reviewedBy?: string;
  notes?: string;
};

export type ProductIntelligenceEvidencePayload = {
  vendorType?: ProductVendorType;
  brand: string;
  sku: string;
  type: ProductEvidenceType;
  label: string;
  value: string;
  sourceUrl?: string;
  capturedAt?: string;
  confidence?: number;
  notes?: string;
};

const EXPLICIT_ENDPOINT = String(import.meta.env.VITE_PRODUCT_INTELLIGENCE_ENDPOINT ?? "").trim();
const EXPLICIT_HEALTH_ENDPOINT = String(import.meta.env.VITE_PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT ?? "").trim();
const LOOKUP_ENDPOINT = String(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT ?? "").trim();

const BRAND_SOURCE_URLS: Record<string, string> = {
  wyrestorm: "https://www.wyrestorm.com/",
  crestron: "https://www.crestron.com/",
  extron: "https://www.extron.com/",
  atlona: "https://atlona.com/",
  lightware: "https://lightware.com/",
  blustream: "https://www.blustream-us.com/",
  kramer: "https://www.kramerav.com/",
  zeevee: "https://www.zeevee.com/",
};

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

function clampConfidence(value: unknown, fallback = 0.65): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, Number(parsed.toFixed(3))));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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

function normalizeUrl(value: unknown): string {
  const raw = tidy(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["https:", "http:"].includes(parsed.protocol)) return "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function inferEndpointFromLookup(): string {
  if (!LOOKUP_ENDPOINT) return "";
  try {
    const parsed = new URL(LOOKUP_ENDPOINT);
    const cleanPath = parsed.pathname.replace(/\/$/, "");
    parsed.pathname = cleanPath.endsWith("/api/competitor-lookup")
      ? cleanPath.replace(/\/api\/competitor-lookup$/, "/api/product-intelligence")
      : `${cleanPath}/product-intelligence`;
    return parsed.toString();
  } catch {
    return "";
  }
}

const PRODUCT_INTELLIGENCE_ENDPOINT = EXPLICIT_ENDPOINT || inferEndpointFromLookup();
const PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT =
  EXPLICIT_HEALTH_ENDPOINT ||
  (PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/health` : "");

function sourceUrlForBrand(vendorType: ProductVendorType, brand: string): string {
  if (vendorType === "wyrestorm") return BRAND_SOURCE_URLS.wyrestorm;
  return BRAND_SOURCE_URLS[normalizeId(brand)] || "";
}

function toRecordId(vendorType: ProductVendorType, brand: string, sku: string): string {
  return `${vendorType}::${normalizeId(brand)}::${normalizeSku(sku)}`;
}

function mapPortArray(value: unknown): ProductPortCount[] {
  return asArray<{ type?: unknown; count?: unknown }>(value)
    .map((entry) => ({
      type: tidy(entry?.type),
      count: Math.max(0, Number(entry?.count) || 0),
    }))
    .filter((entry) => Boolean(entry.type))
    .slice(0, 24);
}

function mapVideo(value: unknown): ProductVideoProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const maxResolution = tidy((value as { maxResolution?: unknown }).maxResolution);
  const hdrValue = (value as { hdr?: unknown }).hdr;
  const hdr = typeof hdrValue === "boolean" ? hdrValue : undefined;
  if (!maxResolution && hdr == null) return undefined;
  return {
    maxResolution: maxResolution || undefined,
    hdr,
  };
}

function makeCatalogRecord(row: Record<string, unknown>, vendorType: ProductVendorType): ProductIntelligenceRecord | null {
  const brand = vendorType === "wyrestorm" ? "WyreStorm" : tidy(row.brand) || "Unknown";
  const sku = normalizeSku(row.sku);
  if (!sku) return null;

  const sourceUrl = sourceUrlForBrand(vendorType, brand);
  const status: ProductApprovalStatus = vendorType === "wyrestorm" ? "approved" : "draft";
  const confidence = vendorType === "wyrestorm" ? 0.87 : 0.72;
  const now = nowIso();
  const summary = tidy(row.summary) || `${sku} reference record.`;
  const features = dedupeStrings(asArray<string>(row.features), 24);

  const evidence: ProductEvidenceEntry[] = [];
  if (summary) {
    evidence.push({
      id: `${normalizeId(sku)}-summary`,
      type: "spec",
      label: "Catalog Summary",
      value: summary,
      sourceUrl: sourceUrl || undefined,
      capturedAt: now,
      confidence,
      notes: "Derived from catalog summary field.",
    });
  }
  if (features.length > 0) {
    evidence.push({
      id: `${normalizeId(sku)}-features`,
      type: "io",
      label: "Catalog Features",
      value: features.join("; "),
      sourceUrl: sourceUrl || undefined,
      capturedAt: now,
      confidence,
      notes: "Derived from catalog feature list.",
    });
  }

  return {
    id: toRecordId(vendorType, brand, sku),
    vendorType,
    brand,
    sku,
    name: tidy(row.name) || sku,
    family: tidy(row.family) || "Unknown",
    category: tidy(row.category) || tidy(row.family) || "Uncategorized",
    summary,
    features,
    transport: tidy(row.transport) || undefined,
    inputs: mapPortArray(row.inputs),
    outputs: mapPortArray(row.outputs),
    control: dedupeStrings(asArray<string>(row.control), 16),
    audio: dedupeStrings(asArray<string>(row.audio), 16),
    video: mapVideo(row.video),
    distanceMeters: Number((row as { distance?: { meters?: unknown } }).distance?.meters ?? row.distanceMeters) || undefined,
    status,
    confidence,
    sourceType: "catalog",
    sourceUrls: sourceUrl ? [sourceUrl] : [],
    tags: dedupeStrings([tidy(row.family), tidy(row.category), tidy(row.transport), ...features], 20),
    notes: tidy(row.notes) || undefined,
    createdAt: now,
    updatedAt: now,
    lastCapturedAt: now,
    lastReviewedAt: vendorType === "wyrestorm" ? now : undefined,
    reviewedBy: vendorType === "wyrestorm" ? "seed-catalog" : undefined,
    evidence,
  };
}

function buildLocalFallbackRecords(): ProductIntelligenceRecord[] {
  const out: ProductIntelligenceRecord[] = [];
  for (const row of buildWyrestormSeedCatalogProducts()) {
    const mapped = makeCatalogRecord(row as unknown as Record<string, unknown>, "wyrestorm");
    if (mapped) out.push(mapped);
  }
  for (const row of asArray<Record<string, unknown>>(competitorCatalog)) {
    const mapped = makeCatalogRecord(row, "competitor");
    if (mapped) out.push(mapped);
  }
  return out.sort((a, b) => {
    const vendorCmp = a.vendorType.localeCompare(b.vendorType);
    if (vendorCmp !== 0) return vendorCmp;
    const brandCmp = a.brand.localeCompare(b.brand);
    if (brandCmp !== 0) return brandCmp;
    return a.sku.localeCompare(b.sku);
  });
}

function summarizeRecords(records: ProductIntelligenceRecord[]): ProductIntelligenceSummary {
  const byStatus: Record<ProductApprovalStatus, number> = { draft: 0, approved: 0, expired: 0 };
  const byVendorType: Record<ProductVendorType, number> = { wyrestorm: 0, competitor: 0 };
  let stale90Days = 0;
  let highConfidence = 0;
  const nowMs = Date.now();

  for (const record of records) {
    byStatus[record.status] += 1;
    byVendorType[record.vendorType] += 1;
    if (record.confidence >= 0.8) highConfidence += 1;
    const capturedMs = Date.parse(record.lastCapturedAt);
    if (Number.isFinite(capturedMs) && (nowMs - capturedMs) > 90 * 24 * 60 * 60 * 1000) {
      stale90Days += 1;
    }
  }

  return {
    total: records.length,
    byStatus,
    byVendorType,
    stale90Days,
    highConfidence,
  };
}

function applyFilters(records: ProductIntelligenceRecord[], query: ProductIntelligenceQuery): ProductIntelligenceRecord[] {
  const vendorType = query.vendorType ?? "";
  const status = query.status ?? "";
  const brand = normalizeId(query.brand ?? "");
  const sku = normalizeSku(query.sku ?? "");
  const text = tidy(query.q).toLowerCase();

  return records.filter((record) => {
    if (vendorType && record.vendorType !== vendorType) return false;
    if (status && record.status !== status) return false;
    if (brand && normalizeId(record.brand) !== brand) return false;
    if (sku && normalizeSku(record.sku) !== sku) return false;
    if (!text) return true;

    const blob = [
      record.vendorType,
      record.brand,
      record.sku,
      record.name,
      record.family,
      record.category,
      record.summary,
      ...record.features,
    ].join(" ").toLowerCase();
    return blob.includes(text);
  });
}

function mapBackendRecord(raw: Record<string, unknown>): ProductIntelligenceRecord | null {
  const vendorTypeValue = normalizeId(raw.vendorType);
  const vendorType: ProductVendorType = vendorTypeValue === "wyrestorm" ? "wyrestorm" : "competitor";
  const brand = tidy(raw.brand) || (vendorType === "wyrestorm" ? "WyreStorm" : "Unknown");
  const sku = normalizeSku(raw.sku);
  if (!sku) return null;

  const statusValue = normalizeId(raw.status);
  const status: ProductApprovalStatus = statusValue === "approved" || statusValue === "expired" ? statusValue : "draft";
  const sourceTypeValue = normalizeId(raw.sourceType);
  const sourceType: ProductSourceType =
    sourceTypeValue === "catalog" || sourceTypeValue === "live" || sourceTypeValue === "import" ? sourceTypeValue : "manual";

  const evidence = asArray<Record<string, unknown>>(raw.evidence)
    .map((entry) => {
      const typeValue = normalizeId(entry.type);
      const type: ProductEvidenceType =
        typeValue === "spec" || typeValue === "io" || typeValue === "compatibility" || typeValue === "positioning" || typeValue === "application"
          ? typeValue
          : "other";
      const label = tidy(entry.label);
      const value = tidy(entry.value);
      if (!label || !value) return null;
      const mapped: ProductEvidenceEntry = {
        id: tidy(entry.id) || `ev_${Math.random().toString(36).slice(2, 10)}`,
        type,
        label,
        value,
        sourceUrl: normalizeUrl(entry.sourceUrl) || undefined,
        capturedAt: tidy(entry.capturedAt) || nowIso(),
        confidence: clampConfidence(entry.confidence, 0.65),
        notes: tidy(entry.notes) || undefined,
      };
      return mapped;
    })
    .filter((entry): entry is ProductEvidenceEntry => entry != null);

  return {
    id: tidy(raw.id) || toRecordId(vendorType, brand, sku),
    vendorType,
    brand,
    sku,
    name: tidy(raw.name) || sku,
    family: tidy(raw.family) || "Unknown",
    category: tidy(raw.category) || tidy(raw.family) || "Uncategorized",
    summary: tidy(raw.summary) || `${sku} reference record.`,
    features: dedupeStrings(asArray<string>(raw.features), 24),
    transport: tidy(raw.transport) || undefined,
    inputs: mapPortArray(raw.inputs),
    outputs: mapPortArray(raw.outputs),
    control: dedupeStrings(asArray<string>(raw.control), 16),
    audio: dedupeStrings(asArray<string>(raw.audio), 16),
    video: mapVideo(raw.video),
    distanceMeters: Number(raw.distanceMeters) || undefined,
    status,
    confidence: clampConfidence(raw.confidence, vendorType === "wyrestorm" ? 0.85 : 0.7),
    sourceType,
    sourceUrls: dedupeStrings(asArray<string>(raw.sourceUrls), 8).map((entry) => normalizeUrl(entry)).filter(Boolean),
    tags: dedupeStrings(asArray<string>(raw.tags), 20),
    notes: tidy(raw.notes) || undefined,
    createdAt: tidy(raw.createdAt) || nowIso(),
    updatedAt: tidy(raw.updatedAt) || nowIso(),
    lastCapturedAt: tidy(raw.lastCapturedAt) || nowIso(),
    lastReviewedAt: tidy(raw.lastReviewedAt) || undefined,
    reviewedBy: tidy(raw.reviewedBy) || undefined,
    evidence,
  };
}

async function getJson<T>(endpoint: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!endpoint || typeof fetch !== "function") {
    return { ok: false, status: 0, data: null };
  }
  try {
    const response = await fetch(endpoint);
    const data = (await response.json()) as T;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function postJson<T>(endpoint: string, payload: unknown): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!endpoint || typeof fetch !== "function") {
    return { ok: false, status: 0, data: null };
  }
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    const data = (await response.json()) as T;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export function getProductIntelligenceEndpoint(): string | null {
  return PRODUCT_INTELLIGENCE_ENDPOINT || null;
}

export function getProductIntelligenceHealthEndpoint(): string | null {
  return PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT || null;
}

export function getProductIntelligenceContractSummary(): string {
  return "GET /api/product-intelligence with filters; POST /refresh, /upsert, /status, /evidence. Records include source URLs, capture dates, confidence, and approval status.";
}

export async function fetchProductIntelligenceRecords(query: ProductIntelligenceQuery = {}): Promise<ProductIntelligenceQueryResult> {
  const fallbackRecords = buildLocalFallbackRecords();
  const filteredFallback = applyFilters(fallbackRecords, query);
  const limit = Math.max(1, Math.min(1000, Number(query.limit) || 250));

  if (!PRODUCT_INTELLIGENCE_ENDPOINT) {
    const records = filteredFallback.slice(0, limit);
    return {
      ok: true,
      available: false,
      endpoint: null,
      fetchedAt: nowIso(),
      mode: "local-fallback",
      warnings: ["Product intelligence endpoint is not configured; using catalog fallback data."],
      total: filteredFallback.length,
      count: records.length,
      records,
      summary: summarizeRecords(fallbackRecords),
    };
  }

  const requestUrl = new URL(PRODUCT_INTELLIGENCE_ENDPOINT);
  if (query.vendorType) requestUrl.searchParams.set("vendorType", query.vendorType);
  if (query.status) requestUrl.searchParams.set("status", query.status);
  if (query.brand) requestUrl.searchParams.set("brand", query.brand);
  if (query.sku) requestUrl.searchParams.set("sku", query.sku);
  if (query.q) requestUrl.searchParams.set("q", query.q);
  if (query.limit != null) requestUrl.searchParams.set("limit", String(query.limit));

  const response = await getJson<{ records?: Record<string, unknown>[]; total?: number; summary?: ProductIntelligenceSummary }>(requestUrl.toString());
  if (!response.ok || !response.data) {
    const records = filteredFallback.slice(0, limit);
    return {
      ok: true,
      available: false,
      endpoint: PRODUCT_INTELLIGENCE_ENDPOINT,
      fetchedAt: nowIso(),
      mode: "endpoint-fallback",
      warnings: [`Product intelligence endpoint unavailable (HTTP ${response.status || 0}); using catalog fallback data.`],
      total: filteredFallback.length,
      count: records.length,
      records,
      summary: summarizeRecords(fallbackRecords),
    };
  }

  const records = asArray<Record<string, unknown>>(response.data.records)
    .map((entry) => mapBackendRecord(entry))
    .filter((entry): entry is ProductIntelligenceRecord => entry != null);

  return {
    ok: true,
    available: true,
    endpoint: PRODUCT_INTELLIGENCE_ENDPOINT,
    fetchedAt: nowIso(),
    mode: "endpoint",
    warnings: [],
    total: Number(response.data.total) || records.length,
    count: records.length,
    records,
    summary: response.data.summary || summarizeRecords(records),
  };
}

export async function fetchProductIntelligenceHealth(): Promise<ProductIntelligenceHealthResult> {
  const fallback = summarizeRecords(buildLocalFallbackRecords());
  if (!PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      fetchedAt: nowIso(),
      warnings: ["Product intelligence health endpoint is not configured."],
      summary: fallback,
    };
  }

  const response = await getJson<{ summary?: ProductIntelligenceSummary; generatedAt?: string; updatedAt?: string }>(PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT);
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint: PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT,
      fetchedAt: nowIso(),
      warnings: [`Product intelligence health endpoint unavailable (HTTP ${response.status || 0}).`],
      summary: fallback,
    };
  }

  return {
    ok: true,
    available: true,
    endpoint: PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT,
    fetchedAt: nowIso(),
    warnings: [],
    summary: response.data.summary || fallback,
    generatedAt: tidy(response.data.generatedAt) || undefined,
    updatedAt: tidy(response.data.updatedAt) || undefined,
  };
}

export async function refreshProductIntelligenceCatalogSeed(): Promise<ProductIntelligenceMutationResult> {
  const endpoint = PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/refresh` : "";
  const response = await postJson<{ message?: string; summary?: ProductIntelligenceSummary }>(endpoint, {});
  if (!endpoint) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      mode: "client-disabled",
      message: "Product intelligence endpoint is not configured.",
      warnings: ["Refresh is unavailable until backend endpoint is configured."],
    };
  }
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "endpoint-unavailable",
      message: "Product intelligence refresh request failed.",
      warnings: [`Refresh endpoint returned HTTP ${response.status || 0}.`],
    };
  }
  return {
    ok: true,
    available: true,
    endpoint,
    mode: "endpoint",
    message: tidy(response.data.message) || "Product intelligence refreshed.",
    warnings: [],
    summary: response.data.summary,
  };
}

export async function upsertProductIntelligenceRecord(payload: ProductIntelligenceUpsertPayload): Promise<ProductIntelligenceMutationResult> {
  const endpoint = PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/upsert` : "";
  const response = await postJson<{ record?: Record<string, unknown>; summary?: ProductIntelligenceSummary; warnings?: string[] }>(endpoint, payload);
  if (!endpoint) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      mode: "client-disabled",
      message: "Product intelligence endpoint is not configured.",
      warnings: ["Upsert is unavailable until backend endpoint is configured."],
    };
  }
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "endpoint-unavailable",
      message: "Product intelligence upsert failed.",
      warnings: [`Upsert endpoint returned HTTP ${response.status || 0}.`],
    };
  }

  return {
    ok: true,
    available: true,
    endpoint,
    mode: "endpoint",
    message: `Saved ${payload.brand} ${normalizeSku(payload.sku)}.`,
    warnings: dedupeStrings(asArray<string>(response.data.warnings), 12),
    record: response.data.record ? mapBackendRecord(response.data.record) || undefined : undefined,
    summary: response.data.summary,
  };
}

export async function updateProductIntelligenceStatus(payload: ProductIntelligenceStatusPayload): Promise<ProductIntelligenceMutationResult> {
  const endpoint = PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/status` : "";
  const response = await postJson<{ record?: Record<string, unknown>; summary?: ProductIntelligenceSummary; warnings?: string[] }>(endpoint, payload);
  if (!endpoint) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      mode: "client-disabled",
      message: "Product intelligence endpoint is not configured.",
      warnings: ["Status update is unavailable until backend endpoint is configured."],
    };
  }
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "endpoint-unavailable",
      message: "Product intelligence status update failed.",
      warnings: [`Status endpoint returned HTTP ${response.status || 0}.`],
    };
  }

  return {
    ok: true,
    available: true,
    endpoint,
    mode: "endpoint",
    message: `Status updated to ${payload.status} for ${payload.brand} ${normalizeSku(payload.sku)}.`,
    warnings: dedupeStrings(asArray<string>(response.data.warnings), 12),
    record: response.data.record ? mapBackendRecord(response.data.record) || undefined : undefined,
    summary: response.data.summary,
  };
}

export async function addProductIntelligenceEvidence(payload: ProductIntelligenceEvidencePayload): Promise<ProductIntelligenceMutationResult> {
  const endpoint = PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/evidence` : "";
  const response = await postJson<{ record?: Record<string, unknown>; summary?: ProductIntelligenceSummary; warnings?: string[] }>(endpoint, payload);
  if (!endpoint) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      mode: "client-disabled",
      message: "Product intelligence endpoint is not configured.",
      warnings: ["Evidence capture is unavailable until backend endpoint is configured."],
    };
  }
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "endpoint-unavailable",
      message: "Product intelligence evidence update failed.",
      warnings: [`Evidence endpoint returned HTTP ${response.status || 0}.`],
    };
  }

  return {
    ok: true,
    available: true,
    endpoint,
    mode: "endpoint",
    message: `Evidence added for ${payload.brand} ${normalizeSku(payload.sku)}.`,
    warnings: dedupeStrings(asArray<string>(response.data.warnings), 12),
    record: response.data.record ? mapBackendRecord(response.data.record) || undefined : undefined,
    summary: response.data.summary,
  };
}
