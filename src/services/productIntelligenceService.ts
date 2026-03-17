import competitorCatalog from "@/data/catalog/competitorCatalog";
import { buildWyrestormSeedCatalogProducts } from "@/catalog/seedCatalog";
import { classifyProductType, type ProductTypeGroup } from "@/catalog/classification";

export type ProductVendorType = "wyrestorm" | "competitor";
export type ProductApprovalStatus = "draft" | "approved" | "expired";
export type ProductSourceType = "catalog" | "live" | "manual" | "import";
export type ProductEvidenceType = "spec" | "io" | "compatibility" | "positioning" | "application" | "other";
export type ProductClassificationSource = "inferred" | "source" | "manual";
export type ProductReviewFlagKind = "categorisation" | "association" | "duplicate" | "source-link" | "other";
export type ProductReviewFlagStatus = "open" | "resolved";

export type ProductReviewFlag = {
  id: string;
  kind: ProductReviewFlagKind;
  status: ProductReviewFlagStatus;
  message: string;
  note?: string;
  source?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

export type ProductPortCount = {
  type: string;
  count: number;
};

export type ProductVideoProfile = {
  maxResolution?: string;
  hdr?: boolean;
  hdmi?: string;
  bandwidthGbps?: number;
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
  group: ProductTypeGroup;
  category: string;
  subcategory?: string;
  classificationSource: ProductClassificationSource;
  summary: string;
  features: string[];
  transport?: string;
  inputs: ProductPortCount[];
  outputs: ProductPortCount[];
  control: string[];
  audio: string[];
  video?: ProductVideoProfile;
  latency?: string;
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
  reviewFlags: ProductReviewFlag[];
  archived?: boolean;
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
  includeArchived?: boolean;
  flaggedOnly?: boolean;
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

export type ProductIntelligenceFlagPayload = {
  vendorType?: ProductVendorType;
  brand: string;
  sku: string;
  kind?: ProductReviewFlagKind;
  message: string;
  note?: string;
  source?: string;
  createdBy?: string;
  record?: Partial<ProductIntelligenceRecord>;
};

export type ProductIntelligenceFlagStatusPayload = {
  vendorType?: ProductVendorType;
  brand: string;
  sku: string;
  flagId: string;
  status: ProductReviewFlagStatus;
  note?: string;
  resolvedBy?: string;
  record?: Partial<ProductIntelligenceRecord>;
};

export type ProductIntelligenceArchivePayload = {
  vendorType?: ProductVendorType;
  brand: string;
  sku: string;
  archived: boolean;
  note?: string;
  reviewedBy?: string;
  record?: Partial<ProductIntelligenceRecord>;
};

const EXPLICIT_ENDPOINT = String(import.meta.env.VITE_PRODUCT_INTELLIGENCE_ENDPOINT ?? "").trim();
const EXPLICIT_HEALTH_ENDPOINT = String(import.meta.env.VITE_PRODUCT_INTELLIGENCE_HEALTH_ENDPOINT ?? "").trim();
const LOOKUP_ENDPOINT = String(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT ?? "").trim();
const LOCAL_ADMIN_RECORDS_KEY = "wm_product_intelligence_admin_records_v1";

const BRAND_SOURCE_URLS: Record<string, string> = {
  wyrestorm: "https://www.wyrestorm.com/",
  barco: "https://www.barco.com/",
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

function inferVendorType(vendorType: ProductVendorType | undefined, brand: string): ProductVendorType {
  if (vendorType) return vendorType;
  return normalizeId(brand) === "wyrestorm" ? "wyrestorm" : "competitor";
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

function normalizeClassificationGroup(value: unknown, fallback: ProductTypeGroup): ProductTypeGroup {
  const normalized = normalizeId(value);
  const groups: ProductTypeGroup[] = [
    "distribution",
    "extender",
    "matrix",
    "avoip",
    "camera",
    "audio",
    "uc",
    "switcher",
    "control",
    "casting",
    "videowall",
    "other",
  ];
  return groups.includes(normalized as ProductTypeGroup) ? (normalized as ProductTypeGroup) : fallback;
}

function normalizeClassificationSource(
  value: unknown,
  fallback: ProductClassificationSource,
): ProductClassificationSource {
  const normalized = normalizeId(value);
  if (normalized === "source" || normalized === "manual") return normalized;
  if (normalized === "inferred") return "inferred";
  return fallback;
}

function sanitizeReviewFlag(flag: ProductReviewFlag): ProductReviewFlag {
  const now = nowIso();
  const kindValue = normalizeId(flag.kind);
  const kind: ProductReviewFlagKind =
    kindValue === "categorisation" ||
    kindValue === "association" ||
    kindValue === "duplicate" ||
    kindValue === "sourcelink"
      ? (kindValue === "sourcelink" ? "source-link" : kindValue)
      : "other";
  const status = normalizeId(flag.status) === "resolved" ? "resolved" : "open";

  return {
    id: tidy(flag.id) || `flag_${Math.random().toString(36).slice(2, 10)}`,
    kind,
    status,
    message: tidy(flag.message) || "Review requested.",
    note: tidy(flag.note) || undefined,
    source: tidy(flag.source) || undefined,
    createdAt: tidy(flag.createdAt) || now,
    createdBy: tidy(flag.createdBy) || "wingman-user",
    updatedAt: tidy(flag.updatedAt) || tidy(flag.createdAt) || now,
    resolvedAt: status === "resolved" ? tidy(flag.resolvedAt) || tidy(flag.updatedAt) || now : undefined,
    resolvedBy: status === "resolved" ? tidy(flag.resolvedBy) || undefined : undefined,
  };
}

function sanitizeRecord(record: ProductIntelligenceRecord): ProductIntelligenceRecord {
  const classification = classifyProductType({
    sku: record.sku,
    family: record.family,
    name: record.name,
    category: record.category,
    subcategory: record.subcategory,
    summary: record.summary,
    transport: record.transport,
    features: record.features,
    audio: record.audio,
    control: record.control,
  });

  return {
    ...record,
    id: tidy(record.id) || toRecordId(record.vendorType, record.brand, record.sku),
    vendorType: inferVendorType(record.vendorType, record.brand),
    brand: tidy(record.brand) || (record.vendorType === "wyrestorm" ? "WyreStorm" : "Unknown"),
    sku: normalizeSku(record.sku),
    name: tidy(record.name) || normalizeSku(record.sku),
    family: tidy(record.family) || "Unknown",
    group: normalizeClassificationGroup(record.group, classification.group),
    category: tidy(record.category) || classification.category || "Uncategorized",
    subcategory: tidy(record.subcategory) || classification.label || undefined,
    classificationSource: normalizeClassificationSource(
      record.classificationSource,
      tidy(record.category) || tidy(record.subcategory) ? "source" : "inferred",
    ),
    summary: tidy(record.summary) || `${normalizeSku(record.sku)} reference record.`,
    features: dedupeStrings(record.features || [], 24),
    transport: tidy(record.transport) || undefined,
    inputs: mapPortArray(record.inputs),
    outputs: mapPortArray(record.outputs),
    control: dedupeStrings(record.control || [], 16),
    audio: dedupeStrings(record.audio || [], 16),
    video: mapVideo(record.video),
    latency: tidy(record.latency) || undefined,
    distanceMeters: Number(record.distanceMeters) || undefined,
    confidence: clampConfidence(record.confidence, record.vendorType === "wyrestorm" ? 0.85 : 0.7),
    sourceUrls: dedupeStrings(record.sourceUrls || [], 8).map((entry) => normalizeUrl(entry)).filter(Boolean),
    tags: dedupeStrings(
      [
        record.family,
        record.category,
        record.subcategory,
        record.group,
        ...classification.tags,
        ...(record.tags || []),
      ],
      24,
    ),
    notes: tidy(record.notes) || undefined,
    createdAt: tidy(record.createdAt) || nowIso(),
    updatedAt: tidy(record.updatedAt) || nowIso(),
    lastCapturedAt: tidy(record.lastCapturedAt) || nowIso(),
    lastReviewedAt: tidy(record.lastReviewedAt) || undefined,
    reviewedBy: tidy(record.reviewedBy) || undefined,
    evidence: asArray<ProductEvidenceEntry>(record.evidence).map((entry) => ({
      ...entry,
      id: tidy(entry.id) || `ev_${Math.random().toString(36).slice(2, 10)}`,
      label: tidy(entry.label),
      value: tidy(entry.value),
      sourceUrl: normalizeUrl(entry.sourceUrl) || undefined,
      capturedAt: tidy(entry.capturedAt) || nowIso(),
      confidence: clampConfidence(entry.confidence, 0.65),
      notes: tidy(entry.notes) || undefined,
    })).filter((entry) => entry.label && entry.value),
    reviewFlags: asArray<ProductReviewFlag>(record.reviewFlags).map((flag) => sanitizeReviewFlag(flag)),
    archived: Boolean(record.archived),
  };
}

function readLocalAdminRecords(): ProductIntelligenceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ADMIN_RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProductIntelligenceRecord[];
    return Array.isArray(parsed) ? parsed.map((record) => sanitizeRecord(record)) : [];
  } catch {
    return [];
  }
}

function writeLocalAdminRecords(records: ProductIntelligenceRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_ADMIN_RECORDS_KEY, JSON.stringify(records.map((record) => sanitizeRecord(record))));
  } catch {
  }
}

function mergeRecordsById(records: ProductIntelligenceRecord[]): ProductIntelligenceRecord[] {
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

function applyLocalAdminRecords(records: ProductIntelligenceRecord[]): ProductIntelligenceRecord[] {
  const local = readLocalAdminRecords();
  if (local.length === 0) return mergeRecordsById(records);
  return mergeRecordsById([...records, ...local]);
}

function saveLocalAdminRecord(record: ProductIntelligenceRecord): ProductIntelligenceRecord {
  const nextRecord = sanitizeRecord(record);
  const next = mergeRecordsById([...readLocalAdminRecords(), nextRecord]);
  writeLocalAdminRecords(next);
  return nextRecord;
}

function findLocalAdminRecord(vendorType: ProductVendorType | undefined, brand: string, sku: string): ProductIntelligenceRecord | null {
  const id = toRecordId(inferVendorType(vendorType, brand), brand, sku);
  return readLocalAdminRecords().find((record) => record.id === id) || null;
}

function baseRecordForMutation(
  payload: {
    vendorType?: ProductVendorType;
    brand: string;
    sku: string;
    record?: Partial<ProductIntelligenceRecord>;
  },
): ProductIntelligenceRecord {
  const localRecord = findLocalAdminRecord(payload.vendorType, payload.brand, payload.sku);
  if (localRecord) return localRecord;

  const recordId = toRecordId(inferVendorType(payload.vendorType, payload.brand), payload.brand, payload.sku);
  const fallback = buildLocalFallbackRecords().find((record) => record.id === recordId);
  if (fallback) return fallback;

  const partial = payload.record ?? {};
  const classification = classifyProductType({
    sku: payload.sku,
    family: partial.family,
    name: partial.name,
    category: partial.category,
    subcategory: partial.subcategory,
    summary: partial.summary,
    transport: partial.transport,
    features: partial.features,
    audio: partial.audio,
    control: partial.control,
  });

  return sanitizeRecord({
    id: recordId,
    vendorType: inferVendorType(payload.vendorType, payload.brand),
    brand: tidy(payload.brand) || (payload.vendorType === "wyrestorm" ? "WyreStorm" : "Unknown"),
    sku: normalizeSku(payload.sku),
    name: tidy(partial.name) || normalizeSku(payload.sku),
    family: tidy(partial.family) || "Unknown",
    group: classification.group,
    category: tidy(partial.category) || classification.category || "Uncategorized",
    subcategory: tidy(partial.subcategory) || classification.label || undefined,
    classificationSource: tidy(partial.category) || tidy(partial.subcategory) ? "manual" : "inferred",
    summary: tidy(partial.summary) || `${normalizeSku(payload.sku)} reference record.`,
    features: dedupeStrings(asArray<string>(partial.features), 24),
    transport: tidy(partial.transport) || undefined,
    inputs: mapPortArray(partial.inputs),
    outputs: mapPortArray(partial.outputs),
    control: dedupeStrings(asArray<string>(partial.control), 16),
    audio: dedupeStrings(asArray<string>(partial.audio), 16),
    video: mapVideo(partial.video),
    latency: normalizeLatency(partial.latency),
    distanceMeters: Number(partial.distanceMeters) || undefined,
    status: "draft",
    confidence: clampConfidence(partial.confidence, 0.68),
    sourceType: partial.sourceType || "manual",
    sourceUrls: dedupeStrings(asArray<string>(partial.sourceUrls), 8).map((entry) => normalizeUrl(entry)).filter(Boolean),
    tags: dedupeStrings([classification.group, classification.label, ...classification.tags, ...asArray<string>(partial.tags)], 24),
    notes: tidy(partial.notes) || undefined,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastCapturedAt: nowIso(),
    lastReviewedAt: undefined,
    reviewedBy: undefined,
    evidence: [],
    reviewFlags: [],
    archived: false,
  });
}

function inferEndpointFromLookup(): string {
  if (tidy(import.meta.env.MODE).toLowerCase() === "test") return "";
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
  const hdmi = tidy((value as { hdmi?: unknown }).hdmi);
  const bandwidthGbpsValue = Number((value as { bandwidthGbps?: unknown }).bandwidthGbps);
  const hdr = typeof hdrValue === "boolean" ? hdrValue : undefined;
  if (!maxResolution && hdr == null && !hdmi && !Number.isFinite(bandwidthGbpsValue)) return undefined;
  return {
    maxResolution: maxResolution || undefined,
    hdr,
    hdmi: hdmi || undefined,
    bandwidthGbps: Number.isFinite(bandwidthGbpsValue) ? bandwidthGbpsValue : undefined,
  };
}

function normalizeLatency(value: unknown): string | undefined {
  const latency = tidy(value);
  return latency || undefined;
}

function summarizePorts(value: ProductPortCount[]): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value
    .map((entry) => `${Math.max(0, Number(entry.count) || 0)}x ${tidy(entry.type)}`)
    .filter(Boolean)
    .join(", ");
}

function makeCatalogRecord(row: Record<string, unknown>, vendorType: ProductVendorType): ProductIntelligenceRecord | null {
  const brand = vendorType === "wyrestorm" ? "WyreStorm" : tidy(row.brand) || "Unknown";
  const sku = normalizeSku(row.sku);
  if (!sku) return null;

  const explicitSourceUrl = normalizeUrl(row.sourceUrl);
  const sourceUrl = explicitSourceUrl || sourceUrlForBrand(vendorType, brand);
  const status: ProductApprovalStatus = vendorType === "wyrestorm" ? "approved" : "draft";
  const confidence = vendorType === "wyrestorm" ? 0.87 : 0.72;
  const now = nowIso();
  const summary = tidy(row.summary) || `${sku} reference record.`;
  const features = dedupeStrings(asArray<string>(row.features), 24);
  const inputs = mapPortArray(row.inputs);
  const outputs = mapPortArray(row.outputs);
  const control = dedupeStrings(asArray<string>(row.control), 16);
  const audio = dedupeStrings(asArray<string>(row.audio), 16);
  const video = mapVideo(row.video);
  const latency = normalizeLatency(row.latency);
  const explicitCategory = tidy(row.category);
  const explicitSubcategory = tidy(row.subcategory);
  const classification = classifyProductType({
    sku,
    family: tidy(row.family),
    name: tidy(row.name),
    category: explicitCategory,
    subcategory: explicitSubcategory,
    summary,
    transport: tidy(row.transport),
    features,
    audio,
    control,
  });

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
  if (inputs.length > 0 || outputs.length > 0) {
    const inputSummary = summarizePorts(inputs);
    const outputSummary = summarizePorts(outputs);
    evidence.push({
      id: `${normalizeId(sku)}-io`,
      type: "io",
      label: "Catalog I/O Profile",
      value: [inputSummary ? `Inputs: ${inputSummary}` : "", outputSummary ? `Outputs: ${outputSummary}` : ""]
        .filter(Boolean)
        .join(" | "),
      sourceUrl: sourceUrl || undefined,
      capturedAt: now,
      confidence,
      notes: "Derived from catalog port counts.",
    });
  }
  if (control.length > 0 || audio.length > 0) {
    evidence.push({
      id: `${normalizeId(sku)}-control-audio`,
      type: control.length > 0 ? "compatibility" : "spec",
      label: "Catalog Control and Audio",
      value: [
        control.length > 0 ? `Control: ${control.join(", ")}` : "",
        audio.length > 0 ? `Audio: ${audio.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      sourceUrl: sourceUrl || undefined,
      capturedAt: now,
      confidence,
      notes: "Derived from catalog control and audio fields.",
    });
  }
  if (video?.maxResolution || video?.hdr != null) {
    evidence.push({
      id: `${normalizeId(sku)}-video`,
      type: "spec",
      label: "Catalog Video Profile",
      value: [
        video.maxResolution ? `Resolution: ${video.maxResolution}` : "",
        video.hdr == null ? "" : `HDR: ${video.hdr ? "Yes" : "No"}`,
        video.hdmi ? `HDMI: ${video.hdmi}` : "",
        Number.isFinite(video.bandwidthGbps) ? `Bandwidth: ${video.bandwidthGbps} Gbps` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      sourceUrl: sourceUrl || undefined,
      capturedAt: now,
      confidence,
      notes: "Derived from catalog video metadata.",
    });
  }
  if (latency) {
    evidence.push({
      id: `${normalizeId(sku)}-latency`,
      type: "spec",
      label: "Catalog Latency Class",
      value: latency,
      sourceUrl: sourceUrl || undefined,
      capturedAt: now,
      confidence,
      notes: "Derived from catalog latency field.",
    });
  }
  if (features.length > 0) {
    evidence.push({
      id: `${normalizeId(sku)}-features`,
      type: "spec",
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
    group: classification.group,
    category: explicitCategory || classification.category || tidy(row.family) || "Uncategorized",
    subcategory: explicitSubcategory || classification.label || undefined,
    classificationSource: explicitCategory || explicitSubcategory ? "source" : "inferred",
    summary,
    features,
    transport: tidy(row.transport) || undefined,
    inputs,
    outputs,
    control,
    audio,
    video,
    latency,
    distanceMeters: Number((row as { distance?: { meters?: unknown } }).distance?.meters ?? row.distanceMeters) || undefined,
    status,
    confidence,
    sourceType: "catalog",
    sourceUrls: sourceUrl ? [sourceUrl] : [],
    tags: dedupeStrings([
      tidy(row.family),
      tidy(row.category),
      tidy(row.subcategory),
      classification.label,
      tidy(row.transport),
      ...inputs.map((entry) => entry.type),
      ...outputs.map((entry) => entry.type),
      ...control,
      ...audio,
      video?.maxResolution,
      video?.hdmi,
      Number.isFinite(video?.bandwidthGbps) ? `${video?.bandwidthGbps}Gbps` : "",
      video?.hdr ? "HDR" : "",
      latency,
      ...classification.tags,
      ...features,
    ], 24),
    notes: tidy(row.notes) || undefined,
    createdAt: now,
    updatedAt: now,
    lastCapturedAt: now,
    lastReviewedAt: vendorType === "wyrestorm" ? now : undefined,
    reviewedBy: vendorType === "wyrestorm" ? "seed-catalog" : undefined,
    evidence,
    reviewFlags: [],
    archived: false,
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

  for (const record of records.filter((entry) => !entry.archived)) {
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
  const includeArchived = Boolean(query.includeArchived);
  const flaggedOnly = Boolean(query.flaggedOnly);

  return records.filter((record) => {
    if (!includeArchived && record.archived) return false;
    if (vendorType && record.vendorType !== vendorType) return false;
    if (status && record.status !== status) return false;
    if (brand && normalizeId(record.brand) !== brand) return false;
    if (sku && normalizeSku(record.sku) !== sku) return false;
    if (flaggedOnly && !record.reviewFlags.some((flag) => flag.status === "open")) return false;
    if (!text) return true;

    const blob = [
      record.vendorType,
      record.brand,
      record.sku,
      record.name,
      record.family,
      record.group,
      record.category,
      record.subcategory,
      record.summary,
      ...record.features,
      ...record.tags,
      ...record.reviewFlags.map((flag) => `${flag.kind} ${flag.message} ${flag.note || ""}`),
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
  const explicitCategory = tidy(raw.category);
  const explicitSubcategory = tidy(raw.subcategory);
  const classification = classifyProductType({
    sku,
    family: tidy(raw.family),
    name: tidy(raw.name),
    category: explicitCategory,
    subcategory: explicitSubcategory,
    summary: tidy(raw.summary),
    transport: tidy(raw.transport),
    features: dedupeStrings(asArray<string>(raw.features), 24),
    audio: dedupeStrings(asArray<string>(raw.audio), 16),
    control: dedupeStrings(asArray<string>(raw.control), 16),
  });

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
    group: normalizeClassificationGroup(raw.group, classification.group),
    category: explicitCategory || classification.category || tidy(raw.family) || "Uncategorized",
    subcategory: explicitSubcategory || classification.label || undefined,
    classificationSource: normalizeClassificationSource(
      raw.classificationSource,
      explicitCategory || explicitSubcategory ? "source" : "inferred",
    ),
    summary: tidy(raw.summary) || `${sku} reference record.`,
    features: dedupeStrings(asArray<string>(raw.features), 24),
    transport: tidy(raw.transport) || undefined,
    inputs: mapPortArray(raw.inputs),
    outputs: mapPortArray(raw.outputs),
    control: dedupeStrings(asArray<string>(raw.control), 16),
    audio: dedupeStrings(asArray<string>(raw.audio), 16),
    video: mapVideo(raw.video),
    latency: normalizeLatency(raw.latency),
    distanceMeters: Number(raw.distanceMeters) || undefined,
    status,
    confidence: clampConfidence(raw.confidence, vendorType === "wyrestorm" ? 0.85 : 0.7),
    sourceType,
    sourceUrls: dedupeStrings(asArray<string>(raw.sourceUrls), 8).map((entry) => normalizeUrl(entry)).filter(Boolean),
    tags: dedupeStrings([classification.group, classification.label, ...classification.tags, ...asArray<string>(raw.tags)], 24),
    notes: tidy(raw.notes) || undefined,
    createdAt: tidy(raw.createdAt) || nowIso(),
    updatedAt: tidy(raw.updatedAt) || nowIso(),
    lastCapturedAt: tidy(raw.lastCapturedAt) || nowIso(),
    lastReviewedAt: tidy(raw.lastReviewedAt) || undefined,
    reviewedBy: tidy(raw.reviewedBy) || undefined,
    evidence,
    reviewFlags: asArray<ProductReviewFlag>(raw.reviewFlags).map((flag) => sanitizeReviewFlag(flag)),
    archived: Boolean(raw.archived),
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
  return "GET /api/product-intelligence with filters; POST /refresh, /upsert, /status, /evidence. Records include family/group/category detail, source URLs, capture dates, confidence, approval status, and local review flags.";
}

export async function fetchProductIntelligenceRecords(query: ProductIntelligenceQuery = {}): Promise<ProductIntelligenceQueryResult> {
  const fallbackRecords = applyLocalAdminRecords(buildLocalFallbackRecords());
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

  const records = applyLocalAdminRecords(
    asArray<Record<string, unknown>>(response.data.records)
    .map((entry) => mapBackendRecord(entry))
    .filter((entry): entry is ProductIntelligenceRecord => entry != null),
  );
  const filteredRecords = applyFilters(records, query);
  const visibleRecords = filteredRecords.slice(0, limit);

  return {
    ok: true,
    available: true,
    endpoint: PRODUCT_INTELLIGENCE_ENDPOINT,
    fetchedAt: nowIso(),
    mode: "endpoint",
    warnings: [],
    total: filteredRecords.length,
    count: visibleRecords.length,
    records: visibleRecords,
    summary: summarizeRecords(records),
  };
}

export async function fetchProductIntelligenceHealth(): Promise<ProductIntelligenceHealthResult> {
  const fallback = summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords()));
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

function appendNote(existing: string | undefined, next: string | undefined): string | undefined {
  const current = tidy(existing);
  const extra = tidy(next);
  if (!extra) return current || undefined;
  if (!current) return extra;
  if (current.includes(extra)) return current;
  return `${current}\n${extra}`;
}

function buildRecordFromUpsertPayload(
  payload: ProductIntelligenceUpsertPayload,
  existing?: ProductIntelligenceRecord,
): ProductIntelligenceRecord {
  const vendorType = inferVendorType(payload.vendorType, payload.brand || existing?.brand || "");
  const brand = tidy(payload.brand) || tidy(existing?.brand) || (vendorType === "wyrestorm" ? "WyreStorm" : "Unknown");
  const sku = normalizeSku(payload.sku || existing?.sku);
  const name = tidy(payload.name) || tidy(existing?.name) || sku;
  const family = tidy(payload.family) || tidy(existing?.family) || "Unknown";
  const category = tidy(payload.category) || tidy(existing?.category);
  const subcategory = tidy(payload.subcategory) || tidy(existing?.subcategory);
  const features = dedupeStrings(
    Array.isArray(payload.features) ? payload.features : (existing?.features || []),
    24,
  );
  const control = dedupeStrings(Array.isArray(payload.control) ? payload.control : (existing?.control || []), 16);
  const audio = dedupeStrings(Array.isArray(payload.audio) ? payload.audio : (existing?.audio || []), 16);
  const summary = tidy(payload.summary) || tidy(existing?.summary) || `${sku} reference record.`;
  const transport = tidy(payload.transport) || tidy(existing?.transport) || undefined;
  const classification = classifyProductType({
    sku,
    family,
    name,
    category,
    subcategory,
    summary,
    transport,
    features,
    audio,
    control,
  });
  const sourceUrls = dedupeStrings(
    Array.isArray(payload.sourceUrls) ? payload.sourceUrls : (existing?.sourceUrls || []),
    8,
  ).map((entry) => normalizeUrl(entry)).filter(Boolean);
  const manualCategory = Boolean(category || subcategory || payload.group);
  const now = nowIso();

  return sanitizeRecord({
    id: existing?.id || toRecordId(vendorType, brand, sku),
    vendorType,
    brand,
    sku,
    name,
    family,
    group: normalizeClassificationGroup(payload.group ?? existing?.group, classification.group),
    category: category || classification.category || "Uncategorized",
    subcategory: subcategory || classification.label || undefined,
    classificationSource: normalizeClassificationSource(
      payload.classificationSource ?? existing?.classificationSource,
      manualCategory ? "manual" : existing?.classificationSource || "inferred",
    ),
    summary,
    features,
    transport,
    inputs: mapPortArray(payload.inputs ?? existing?.inputs),
    outputs: mapPortArray(payload.outputs ?? existing?.outputs),
    control,
    audio,
    video: mapVideo(payload.video ?? existing?.video),
    latency: normalizeLatency(payload.latency ?? existing?.latency),
    distanceMeters: Number(payload.distanceMeters ?? existing?.distanceMeters) || undefined,
    status: payload.status ?? existing?.status ?? "draft",
    confidence: clampConfidence(payload.confidence, existing?.confidence ?? (vendorType === "wyrestorm" ? 0.85 : 0.7)),
    sourceType: payload.sourceType ?? existing?.sourceType ?? "manual",
    sourceUrls,
    tags: dedupeStrings(
      [
        family,
        category,
        subcategory,
        payload.group ?? existing?.group,
        classification.group,
        classification.label,
        ...classification.tags,
        ...(Array.isArray(payload.tags) ? payload.tags : (existing?.tags || [])),
      ],
      24,
    ),
    notes: appendNote(existing?.notes, payload.notes),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastCapturedAt: tidy(payload.lastCapturedAt) || existing?.lastCapturedAt || now,
    lastReviewedAt: tidy(payload.lastReviewedAt) || existing?.lastReviewedAt,
    reviewedBy: tidy(payload.reviewedBy) || existing?.reviewedBy,
    evidence: Array.isArray(payload.evidence) ? payload.evidence : (existing?.evidence || []),
    reviewFlags: existing?.reviewFlags || [],
    archived: Boolean(payload.archived ?? existing?.archived),
  });
}

function upsertLocalMutationRecord(payload: ProductIntelligenceUpsertPayload): ProductIntelligenceRecord {
  const existing = baseRecordForMutation(payload);
  const nextRecord = buildRecordFromUpsertPayload(payload, existing);
  return saveLocalAdminRecord(nextRecord);
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
  const localRecord = upsertLocalMutationRecord(payload);
  const endpoint = PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/upsert` : "";
  const response = await postJson<{ record?: Record<string, unknown>; summary?: ProductIntelligenceSummary; warnings?: string[] }>(endpoint, payload);
  if (!endpoint) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      mode: "local-store",
      message: `Saved ${localRecord.brand} ${localRecord.sku} locally for admin review.`,
      warnings: ["Product intelligence endpoint is not configured; changes are stored locally."],
      record: localRecord,
      summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
    };
  }
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "local-store",
      message: `Saved ${localRecord.brand} ${localRecord.sku} locally; endpoint sync failed.`,
      warnings: [`Upsert endpoint returned HTTP ${response.status || 0}; local copy retained.`],
      record: localRecord,
      summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
    };
  }

  const savedRecord = saveLocalAdminRecord(localRecord);
  return {
    ok: true,
    available: true,
    endpoint,
    mode: "endpoint",
    message: `Saved ${savedRecord.brand} ${savedRecord.sku}.`,
    warnings: dedupeStrings(asArray<string>(response.data.warnings), 12),
    record: savedRecord,
    summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
  };
}

export async function updateProductIntelligenceStatus(payload: ProductIntelligenceStatusPayload): Promise<ProductIntelligenceMutationResult> {
  const existing = baseRecordForMutation(payload);
  const localRecord = saveLocalAdminRecord({
    ...existing,
    status: payload.status,
    notes: appendNote(existing.notes, payload.notes),
    lastReviewedAt: nowIso(),
    reviewedBy: tidy(payload.reviewedBy) || existing.reviewedBy || "wingman-admin",
    updatedAt: nowIso(),
  });
  const endpoint = PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/status` : "";
  const response = await postJson<{ record?: Record<string, unknown>; summary?: ProductIntelligenceSummary; warnings?: string[] }>(endpoint, payload);
  if (!endpoint) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      mode: "local-store",
      message: `Status updated to ${payload.status} for ${localRecord.brand} ${localRecord.sku} locally.`,
      warnings: ["Product intelligence endpoint is not configured; status is stored locally."],
      record: localRecord,
      summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
    };
  }
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "local-store",
      message: `Status updated locally for ${localRecord.brand} ${localRecord.sku}; endpoint sync failed.`,
      warnings: [`Status endpoint returned HTTP ${response.status || 0}; local copy retained.`],
      record: localRecord,
      summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
    };
  }

  const savedRecord = saveLocalAdminRecord(localRecord);
  return {
    ok: true,
    available: true,
    endpoint,
    mode: "endpoint",
    message: `Status updated to ${payload.status} for ${savedRecord.brand} ${savedRecord.sku}.`,
    warnings: dedupeStrings(asArray<string>(response.data.warnings), 12),
    record: savedRecord,
    summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
  };
}

export async function addProductIntelligenceEvidence(payload: ProductIntelligenceEvidencePayload): Promise<ProductIntelligenceMutationResult> {
  const existing = baseRecordForMutation(payload);
  const evidenceEntry: ProductEvidenceEntry = {
    id: `ev_${normalizeId(payload.brand)}_${normalizeId(payload.sku)}_${Math.random().toString(36).slice(2, 8)}`,
    type: payload.type,
    label: tidy(payload.label),
    value: tidy(payload.value),
    sourceUrl: normalizeUrl(payload.sourceUrl) || undefined,
    capturedAt: tidy(payload.capturedAt) || nowIso(),
    confidence: clampConfidence(payload.confidence, 0.7),
    notes: tidy(payload.notes) || undefined,
  };
  const localRecord = saveLocalAdminRecord({
    ...existing,
    evidence: [...existing.evidence, evidenceEntry],
    updatedAt: nowIso(),
  });
  const endpoint = PRODUCT_INTELLIGENCE_ENDPOINT ? `${PRODUCT_INTELLIGENCE_ENDPOINT.replace(/\/$/, "")}/evidence` : "";
  const response = await postJson<{ record?: Record<string, unknown>; summary?: ProductIntelligenceSummary; warnings?: string[] }>(endpoint, payload);
  if (!endpoint) {
    return {
      ok: true,
      available: false,
      endpoint: null,
      mode: "local-store",
      message: `Evidence added for ${localRecord.brand} ${localRecord.sku} locally.`,
      warnings: ["Product intelligence endpoint is not configured; evidence is stored locally."],
      record: localRecord,
      summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
    };
  }
  if (!response.ok || !response.data) {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "local-store",
      message: `Evidence added locally for ${localRecord.brand} ${localRecord.sku}; endpoint sync failed.`,
      warnings: [`Evidence endpoint returned HTTP ${response.status || 0}; local copy retained.`],
      record: localRecord,
      summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
    };
  }

  const savedRecord = saveLocalAdminRecord(localRecord);
  return {
    ok: true,
    available: true,
    endpoint,
    mode: "endpoint",
    message: `Evidence added for ${savedRecord.brand} ${savedRecord.sku}.`,
    warnings: dedupeStrings(asArray<string>(response.data.warnings), 12),
    record: savedRecord,
    summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
  };
}

export async function flagProductIntelligenceRecord(payload: ProductIntelligenceFlagPayload): Promise<ProductIntelligenceMutationResult> {
  const existing = baseRecordForMutation(payload);
  const now = nowIso();
  const flag: ProductReviewFlag = sanitizeReviewFlag({
    id: `flag_${normalizeId(payload.brand)}_${normalizeId(payload.sku)}_${Math.random().toString(36).slice(2, 8)}`,
    kind: payload.kind || "categorisation",
    status: "open",
    message: tidy(payload.message) || `Review requested for ${normalizeSku(payload.sku)}.`,
    note: tidy(payload.note) || undefined,
    source: tidy(payload.source) || "catalogue",
    createdAt: now,
    createdBy: tidy(payload.createdBy) || "wingman-user",
    updatedAt: now,
  });
  const localRecord = saveLocalAdminRecord({
    ...existing,
    reviewFlags: [...existing.reviewFlags, flag],
    updatedAt: now,
  } as ProductIntelligenceRecord);

  return {
    ok: true,
    available: Boolean(PRODUCT_INTELLIGENCE_ENDPOINT),
    endpoint: PRODUCT_INTELLIGENCE_ENDPOINT || null,
    mode: "local-store",
    message: `Flagged ${localRecord.brand} ${localRecord.sku} for administrator review.`,
    warnings: PRODUCT_INTELLIGENCE_ENDPOINT
      ? ["Review flags are stored locally until a backend review workflow is added."]
      : ["Review flags are stored locally in this workspace."],
    record: localRecord,
    summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
  };
}

export async function updateProductIntelligenceFlagStatus(
  payload: ProductIntelligenceFlagStatusPayload,
): Promise<ProductIntelligenceMutationResult> {
  const existing = baseRecordForMutation(payload);
  const nextFlags = existing.reviewFlags.map((flag) =>
    flag.id !== payload.flagId
      ? flag
      : sanitizeReviewFlag({
          ...flag,
          status: payload.status,
          note: appendNote(flag.note, payload.note),
          updatedAt: nowIso(),
          resolvedAt: payload.status === "resolved" ? nowIso() : undefined,
          resolvedBy: payload.status === "resolved" ? tidy(payload.resolvedBy) || "wingman-admin" : undefined,
        }),
  );
  const localRecord = saveLocalAdminRecord({
    ...existing,
    reviewFlags: nextFlags,
    updatedAt: nowIso(),
  });

  return {
    ok: true,
    available: Boolean(PRODUCT_INTELLIGENCE_ENDPOINT),
    endpoint: PRODUCT_INTELLIGENCE_ENDPOINT || null,
    mode: "local-store",
    message: `Flag ${payload.status} for ${localRecord.brand} ${localRecord.sku}.`,
    warnings: PRODUCT_INTELLIGENCE_ENDPOINT
      ? ["Flag status is stored locally until a backend review workflow is added."]
      : ["Flag status is stored locally in this workspace."],
    record: localRecord,
    summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
  };
}

export async function setProductIntelligenceRecordArchived(
  payload: ProductIntelligenceArchivePayload,
): Promise<ProductIntelligenceMutationResult> {
  const existing = baseRecordForMutation(payload);
  const localRecord = saveLocalAdminRecord({
    ...existing,
    archived: payload.archived,
    notes: appendNote(existing.notes, payload.note),
    updatedAt: nowIso(),
    lastReviewedAt: nowIso(),
    reviewedBy: tidy(payload.reviewedBy) || existing.reviewedBy || "wingman-admin",
  });

  return {
    ok: true,
    available: Boolean(PRODUCT_INTELLIGENCE_ENDPOINT),
    endpoint: PRODUCT_INTELLIGENCE_ENDPOINT || null,
    mode: "local-store",
    message: payload.archived
      ? `${localRecord.brand} ${localRecord.sku} removed from the active catalogue.`
      : `${localRecord.brand} ${localRecord.sku} restored to the active catalogue.`,
    warnings: PRODUCT_INTELLIGENCE_ENDPOINT
      ? ["Archive state is stored locally until a backend delete/archive endpoint is added."]
      : ["Archive state is stored locally in this workspace."],
    record: localRecord,
    summary: summarizeRecords(applyLocalAdminRecords(buildLocalFallbackRecords())),
  };
}
