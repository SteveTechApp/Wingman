import { resolveCompetitorRecordWithLiveFallback } from "./competitorLiveFallbackService";
import { z } from "zod";
import compareSeed from "@/data/catalog/competitorCompareSeed";
import { getCompetitorProducts, type CompetitorProduct } from "@/competitor/repository";
import type { CatalogPortCount, CatalogVideo } from "@/catalog/types";
import { captureCompetitorLookupRecord } from "@/services/liveProductDataStore";

export type CompetitorLookupSource = "cache" | "backend" | "catalog" | "seed" | "synthetic";

export type CompetitorLookupRecord = {
  brand: string;
  sku: string;
  name: string;
  family: string;
  category: string;
  summary: string;
  features: string[];
  transport?: string;
  inputs?: CatalogPortCount[];
  outputs?: CatalogPortCount[];
  control?: string[];
  audio?: string[];
  video?: CatalogVideo;
  latency?: string;
  distanceMeters?: number;
  sourceUrl?: string;
};

export type CompetitorLookupProvenance = {
  source: CompetitorLookupSource;
  label: string;
  fetchedAt: string;
  cacheHit: boolean;
  ttlSeconds: number;
  endpoint?: string;
  sourceUrl?: string;
};

export type CompetitorLookupResult = {
  ok: true;
  query: string;
  record: CompetitorLookupRecord | null;
  provenance: CompetitorLookupProvenance;
  warnings: string[];
};

export type CompetitorLookupRequestPayload = {
  query: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  productUrl?: string;
};

export type CompetitorLookupCacheEntrySummary = {
  cacheKey: string;
  source: Exclude<CompetitorLookupSource, "cache">;
  savedAt: string;
  ageSeconds: number;
  expiresInSeconds: number;
  expired: boolean;
  brand: string;
  sku: string;
  name: string;
  sourceUrl?: string;
};

export type CompetitorLookupRuntimeTrace = {
  attempt: number;
  status: number;
  ok: boolean;
  url: string;
  error?: string;
  cacheHit?: boolean;
  rateLimited?: boolean;
  retryAfterMs?: number;
};

export type CompetitorLookupRuntimeEvent = {
  id: string;
  timestamp: string;
  scope: string;
  severity: string;
  mode: string;
  message: string;
  query?: string;
  brand?: string;
  sku?: string;
  warnings: string[];
  trace: CompetitorLookupRuntimeTrace[];
};

export type CompetitorLookupRuntimeDiagnostics = {
  ok: true;
  available: boolean;
  endpoint: string | null;
  fetchedAt: string;
  mode: string;
  memoryCount: number;
  count: number;
  maxEvents: number;
  warnings: string[];
  events: CompetitorLookupRuntimeEvent[];
  health: Record<string, unknown> | null;
};

export type CompetitorLookupRuntimeMaintenanceResult = {
  ok: true;
  available: boolean;
  endpoint: string | null;
  mode: string;
  warnings: string[];
  message: string;
};

type LookupCacheEntry = {
  record: CompetitorLookupRecord;
  source: Exclude<CompetitorLookupSource, "cache">;
  sourceUrl?: string;
  savedAt: string;
};

type BackendLookupAttempt = {
  record: CompetitorLookupRecord | null;
  warnings: string[];
};

const CACHE_KEY = "wm_competitor_lookup_cache_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ENDPOINT = String(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT ?? "").trim();
const DIAGNOSTICS_ENDPOINT = (() => {
  if (!ENDPOINT) return "";
  try {
    const parsed = new URL(ENDPOINT);
    const cleanPath = parsed.pathname.replace(/\/$/, "");
    if (cleanPath.endsWith("/api/competitor-lookup")) {
      parsed.pathname = cleanPath.replace(/\/api\/competitor-lookup$/, "/api/competitor-lookup/diagnostics");
    } else {
      parsed.pathname = `${cleanPath}/diagnostics`;
    }
    return parsed.toString();
  } catch {
    return "";
  }
})();
const DIAGNOSTICS_CLEAR_ENDPOINT = DIAGNOSTICS_ENDPOINT ? `${DIAGNOSTICS_ENDPOINT.replace(/\/$/, "")}/clear` : "";
const DIAGNOSTICS_PRUNE_ENDPOINT = DIAGNOSTICS_ENDPOINT ? `${DIAGNOSTICS_ENDPOINT.replace(/\/$/, "")}/prune` : "";

const backendPortSchema = z.object({
  type: z.string().min(1),
  count: z.coerce.number().optional().default(0),
}).passthrough();

const backendVideoSchema = z.object({
  maxResolution: z.string().optional(),
  hdr: z.boolean().optional(),
  hdmi: z.string().optional(),
  bandwidthGbps: z.coerce.number().optional(),
}).passthrough();

const _backendRequestSchema = z.object({
  query: z.string().optional(),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  sku: z.string().optional(),
  productUrl: z.string().optional(),
}).passthrough();
const backendRecordSchema = z.object({
  brand: z.string().optional(),
  sku: z.string().min(1),
  name: z.string().optional(),
  family: z.string().optional(),
  category: z.string().optional(),
  summary: z.string().optional(),
  features: z.array(z.string()).optional(),
  transport: z.string().optional(),
  inputs: z.array(backendPortSchema).optional(),
  outputs: z.array(backendPortSchema).optional(),
  control: z.array(z.string()).optional(),
  audio: z.array(z.string()).optional(),
  video: backendVideoSchema.optional(),
  latency: z.string().optional(),
  distanceMeters: z.coerce.number().optional(),
  distance_meters: z.coerce.number().optional(),
  distanceM: z.coerce.number().optional(),
  sourceUrl: z.string().optional(),
  url: z.string().optional(),
}).passthrough();

const backendTraceSchema = z.object({
  attempt: z.coerce.number().optional(),
  status: z.coerce.number().optional(),
  ok: z.boolean().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
  cacheHit: z.boolean().optional(),
  rateLimited: z.boolean().optional(),
  retryAfterMs: z.coerce.number().optional(),
}).passthrough();

const backendRuntimeEventSchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().optional(),
  scope: z.string().optional(),
  severity: z.string().optional(),
  mode: z.string().optional(),
  message: z.string().optional(),
  query: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  trace: z.array(backendTraceSchema).optional(),
}).passthrough();

const backendRuntimeDiagnosticsSchema = z.object({
  mode: z.string().optional(),
  memoryCount: z.coerce.number().optional(),
  count: z.coerce.number().optional(),
  maxEvents: z.coerce.number().optional(),
  warnings: z.array(z.string()).optional(),
  events: z.array(backendRuntimeEventSchema).optional(),
  health: z.record(z.unknown()).optional(),
}).passthrough();

const backendRuntimeMaintenanceSchema = z.object({
  ok: z.boolean().optional(),
  mode: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  memoryRemoved: z.coerce.number().optional(),
  days: z.coerce.number().optional(),
  memory: z.object({
    removed: z.coerce.number().optional(),
    days: z.coerce.number().optional(),
  }).optional(),
  remoteRemoved: z.coerce.number().optional(),
  remote: z.object({
    removed: z.coerce.number().optional(),
    days: z.coerce.number().optional(),
  }).optional(),
}).passthrough();

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
function resolveBrandName(payload: CompetitorLookupRequestPayload): string {
  return tidy(payload.manufacturer || payload.brand);
}

function resolveSourceUrl(payload: CompetitorLookupRequestPayload): string {
  return tidy(payload.productUrl);
}

function parseQuery(query: string): { brand: string; sku: string } {


function _mapLiveFallbackRecordToLookupRecord(record: {
  manufacturer: string;
  model: string;
  productUrl?: string;
  title?: string;
  summary?: string;
  category?: string;
  technology?: string;
  features: string[];
}): CompetitorLookupRecord {
  return {
    brand: tidy(record.manufacturer),
    sku: normalizeSku(record.model),
    name: tidy(record.title || record.model),
    family: tidy(record.technology || "Live lookup"),
    category: tidy(record.category || "Unknown"),
    summary: tidy(record.summary || "Resolved from live product page."),
    features: Array.isArray(record.features) ? record.features : [],
    transport: tidy(record.technology),
    sourceUrl: tidy(record.productUrl),
  };
}  const raw = tidy(query);
  if (!raw) return { brand: "", sku: "" };

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^[A-Za-z]{2,}$/.test(parts[0])) {
    return {
      brand: tidy(parts[0]),
      sku: normalizeSku(parts.slice(1).join(" ")),
    };
  }

  return { brand: "", sku: normalizeSku(raw) };
}

function buildLookupPayloadQuery(payload: CompetitorLookupRequestPayload): { brand: string; sku: string; sourceUrl: string } {
  const parsed = parseQuery(payload.query);
  const brand = resolveBrandName(payload) || parsed.brand;
  const sku = tidy(payload.sku) ? normalizeSku(payload.sku) : parsed.sku;
  const sourceUrl = resolveSourceUrl(payload);

  return { brand, sku, sourceUrl };
}

function makeCacheKey(query: string): string {
  const parsed = parseQuery(query);
  const normalizedQuery = normalizeId(query);
  const brand = normalizeId(parsed.brand);
  const sku = normalizeId(parsed.sku);
  return `${brand}|${sku}|${normalizedQuery}`;
}

function safeJsonParse(raw: string): Record<string, LookupCacheEntry> {
  try {
    const parsed = JSON.parse(raw) as Record<string, LookupCacheEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readCache(): Record<string, LookupCacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return safeJsonParse(raw);
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, LookupCacheEntry>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
  }
}

function ageFromIso(savedAt: string): number | null {
  const saved = Date.parse(savedAt);
  if (!Number.isFinite(saved)) return null;
  return Math.max(0, Date.now() - saved);
}

function isExpiredEntry(entry: LookupCacheEntry): boolean {
  const age = ageFromIso(entry.savedAt);
  if (age == null) return true;
  return age > CACHE_TTL_MS;
}

function readCacheEntry(cacheKey: string): LookupCacheEntry | null {
  const cache = readCache();
  const entry = cache[cacheKey];
  if (!entry || !entry.record) return null;
  if (isExpiredEntry(entry)) return null;
  return entry;
}

function writeCacheEntry(cacheKey: string, entry: LookupCacheEntry): void {
  const cache = readCache();
  cache[cacheKey] = entry;
  writeCache(cache);
}

function toLookupRecord(product: CompetitorProduct): CompetitorLookupRecord {
  return {
    brand: tidy(product.brand) || "Unknown",
    sku: normalizeSku(product.sku),
    name: tidy(product.name) || normalizeSku(product.sku),
    family: tidy(product.family) || "Unknown",
    category: tidy(product.category) || tidy(product.family) || "Uncategorized",
    summary: tidy(product.summary) || `${tidy(product.name) || normalizeSku(product.sku)} competitor reference record.`,
    features: Array.isArray(product.features) ? product.features.map((item) => tidy(item)).filter(Boolean) : [],
    transport: tidy(product.transport) || undefined,
    inputs: Array.isArray(product.inputs) ? product.inputs : [],
    outputs: Array.isArray(product.outputs) ? product.outputs : [],
    control: Array.isArray(product.control) ? product.control.map((item) => tidy(item)).filter(Boolean) : [],
    audio: Array.isArray(product.audio) ? product.audio.map((item) => tidy(item)).filter(Boolean) : [],
    video: product.video,
    latency: tidy(product.latency) || undefined,
    distanceMeters: typeof product.distance?.meters === "number" ? product.distance.meters : undefined,
    sourceUrl: product.sourceUrl,
  };
}

function findFromCompetitorCatalog(query: string): CompetitorLookupRecord | null {
  const q = tidy(query);
  if (!q) return null;

  const parsed = parseQuery(q);
  const competitors = getCompetitorProducts();
  if (competitors.length === 0) return null;

  const exactSku = parsed.sku
    ? competitors.find((item) => normalizeSku(item.sku) === parsed.sku && (!parsed.brand || normalizeId(item.brand) === normalizeId(parsed.brand)))
    : undefined;

  if (exactSku) return toLookupRecord(exactSku);

  const qLower = q.toLowerCase();
  const fuzzy = competitors.find((item) => {
    const blob = [
      item.brand,
      item.sku,
      item.name,
      item.family,
      item.category,
      item.summary,
      ...(item.features ?? []),
    ].join(" ").toLowerCase();
    return blob.includes(qLower);
  });

  return fuzzy ? toLookupRecord(fuzzy) : null;
}

type SeedRecord = {
  brand?: string;
  competitorSku?: string;
  category?: string;
  summary?: string;
  features?: string[];
};

function findFromSeed(query: string): CompetitorLookupRecord | null {
  const q = tidy(query);
  if (!q) return null;

  const parsed = parseQuery(q);
  const rows = (Array.isArray(compareSeed) ? compareSeed : []) as SeedRecord[];

  const exact = rows.find((item) => {
    const sku = normalizeSku(item.competitorSku);
    const brand = normalizeId(item.brand);
    return sku === parsed.sku && (!parsed.brand || brand === normalizeId(parsed.brand));
  });

  const fuzzy = exact ?? rows.find((item) => {
    const blob = [
      item.brand,
      item.competitorSku,
      item.category,
      item.summary,
      ...(item.features ?? []),
    ].join(" ").toLowerCase();
    return blob.includes(q.toLowerCase());
  });

  if (!fuzzy) return null;

  return {
    brand: tidy(fuzzy.brand) || parsed.brand || "Unknown",
    sku: normalizeSku(fuzzy.competitorSku || parsed.sku || q),
    name: tidy(fuzzy.category) || normalizeSku(fuzzy.competitorSku || q),
    family: tidy(fuzzy.category) || "Unknown",
    category: tidy(fuzzy.category) || "Uncategorized",
    summary: tidy(fuzzy.summary) || "Seed comparison record.",
    features: Array.isArray(fuzzy.features) ? fuzzy.features.map((item) => tidy(item)).filter(Boolean) : [],
  };
}

function asDistance(record: z.infer<typeof backendRecordSchema>): number | undefined {
  const value = Number(record.distanceMeters ?? record.distance_meters ?? record.distanceM ?? 0);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function extractBackendRecord(payload: unknown): { record: CompetitorLookupRecord | null; warning?: string } {
  const direct = backendRecordSchema.safeParse(payload);
  const withRecord = z.object({ record: backendRecordSchema }).passthrough().safeParse(payload);
  const withRecords = z.object({ records: z.array(backendRecordSchema) }).passthrough().safeParse(payload);

  const rawRecord =
    direct.success ? direct.data :
    withRecord.success ? withRecord.data.record :
    withRecords.success ? withRecords.data.records[0] :
    null;

  if (!rawRecord) {
    return {
      record: null,
      warning: "Backend payload did not match Wingman lookup contract. Falling back to local sources.",
    };
  }

  const sku = normalizeSku(rawRecord.sku);
  if (!sku) {
    return {
      record: null,
      warning: "Backend response contained a record without SKU.",
    };
  }

  return {
    record: {
      brand: tidy(rawRecord.brand) || "Unknown",
      sku,
      name: tidy(rawRecord.name) || sku,
      family: tidy(rawRecord.family) || "Unknown",
      category: tidy(rawRecord.category) || tidy(rawRecord.family) || "Uncategorized",
      summary: tidy(rawRecord.summary) || `${sku} lookup result.`,
      features: Array.isArray(rawRecord.features) ? rawRecord.features.map((item) => tidy(item)).filter(Boolean) : [],
      transport: tidy(rawRecord.transport) || undefined,
      inputs: Array.isArray(rawRecord.inputs)
        ? rawRecord.inputs.map((port) => ({ type: tidy(port.type), count: Math.max(0, Number(port.count) || 0) }))
        : [],
      outputs: Array.isArray(rawRecord.outputs)
        ? rawRecord.outputs.map((port) => ({ type: tidy(port.type), count: Math.max(0, Number(port.count) || 0) }))
        : [],
      control: Array.isArray(rawRecord.control) ? rawRecord.control.map((item) => tidy(item)).filter(Boolean) : [],
      audio: Array.isArray(rawRecord.audio) ? rawRecord.audio.map((item) => tidy(item)).filter(Boolean) : [],
      video: rawRecord.video
        ? {
            maxResolution: tidy(rawRecord.video.maxResolution) || undefined,
            hdr: rawRecord.video.hdr,
            hdmi: tidy(rawRecord.video.hdmi) || undefined,
            bandwidthGbps: Number(rawRecord.video.bandwidthGbps) || undefined,
          }
        : undefined,
      latency: tidy(rawRecord.latency) || undefined,
      distanceMeters: asDistance(rawRecord),
      sourceUrl: tidy(rawRecord.sourceUrl || rawRecord.url) || undefined,
    },
  };
}

function buildBackendRequest(query: string): CompetitorLookupRequestPayload {
  const parsed = parseQuery(query);
  return {
    query: tidy(query),
    brand: parsed.brand || undefined,
    sku: parsed.sku || undefined,
  };
}

async function lookupFromBackend(query: string): Promise<BackendLookupAttempt> {
  if (!ENDPOINT || typeof fetch !== "function") {
    return { record: null, warnings: [] };
  }

  const request = buildBackendRequest(query);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 6500) : null;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller?.signal,
    });

    if (!response.ok) {
      return {
        record: null,
        warnings: [`Backend lookup endpoint returned HTTP ${response.status}. Falling back to local sources.`],
      };
    }

    const payload = await response.json();
    const extracted = extractBackendRecord(payload);
    return {
      record: extracted.record,
      warnings: extracted.warning ? [extracted.warning] : [],
    };
  } catch {
    return {
      record: null,
      warnings: ["Backend lookup request failed. Falling back to local sources."],
    };
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
}

function syntheticFallback(query: string): CompetitorLookupRecord | null {
  const parsed = parseQuery(query);
  if (!parsed.sku) return null;

  return {
    brand: parsed.brand || "Unknown",
    sku: parsed.sku,
    name: parsed.sku,
    family: "Unknown",
    category: "Uncategorized",
    summary: "No curated or backend match was found. Synthetic placeholder created for manual review.",
    features: [],
  };
}

function provenance(
  source: CompetitorLookupSource,
  opts?: { cacheHit?: boolean; sourceUrl?: string }
): CompetitorLookupProvenance {
  const labels: Record<CompetitorLookupSource, string> = {
    cache: "Lookup cache",
    backend: "Manufacturer lookup endpoint",
    catalog: "Curated competitor catalog",
    seed: "Seed comparison dataset",
    synthetic: "Synthetic fallback",
  };

  return {
    source,
    label: labels[source],
    fetchedAt: nowIso(),
    cacheHit: Boolean(opts?.cacheHit),
    ttlSeconds: Math.round(CACHE_TTL_MS / 1000),
    endpoint: source === "backend" ? ENDPOINT || undefined : undefined,
    sourceUrl: opts?.sourceUrl,
  };
}

export function getCompetitorLookupEndpoint(): string | null {
  return ENDPOINT || null;
}

export function getCompetitorLookupDiagnosticsEndpoint(): string | null {
  return DIAGNOSTICS_ENDPOINT || null;
}

export function getCompetitorLookupContractSummary(): string {
  return "POST JSON body: { query, brand?, sku? }. Response: { record } or { records[] } or direct record including sku and optional specs.";
}

export function getCompetitorLookupCacheEntries(): CompetitorLookupCacheEntrySummary[] {
  const cache = readCache();
  const entries = Object.entries(cache).map(([cacheKey, entry]) => {
    const ageMs = ageFromIso(entry.savedAt) ?? Number.MAX_SAFE_INTEGER;
    const expired = ageMs > CACHE_TTL_MS;
    return {
      cacheKey,
      source: entry.source,
      savedAt: entry.savedAt,
      ageSeconds: Math.round(ageMs / 1000),
      expiresInSeconds: Math.max(0, Math.round((CACHE_TTL_MS - ageMs) / 1000)),
      expired,
      brand: tidy(entry.record.brand) || "Unknown",
      sku: normalizeSku(entry.record.sku),
      name: tidy(entry.record.name) || normalizeSku(entry.record.sku),
      sourceUrl: entry.sourceUrl,
    };
  });

  return entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function pruneExpiredCompetitorLookupCache(): number {
  const cache = readCache();
  const next: Record<string, LookupCacheEntry> = {};
  let removed = 0;

  for (const [key, entry] of Object.entries(cache)) {
    if (isExpiredEntry(entry)) {
      removed += 1;
      continue;
    }
    next[key] = entry;
  }

  writeCache(next);
  return removed;
}

export async function lookupCompetitorProduct(query: string): Promise<CompetitorLookupResult> {
  const cleanQuery = tidy(query);
  const warnings: string[] = [];
  const cacheKey = makeCacheKey(cleanQuery);

  if (!cleanQuery) {
    return {
      ok: true,
      query: cleanQuery,
      record: null,
      provenance: provenance("synthetic"),
      warnings: ["Lookup query is empty."],
    };
  }

  const cached = readCacheEntry(cacheKey);
  if (cached) {
    return {
      ok: true,
      query: cleanQuery,
      record: cached.record,
      provenance: provenance("cache", { cacheHit: true, sourceUrl: cached.sourceUrl }),
      warnings,
    };
  }

  const backendAttempt = await lookupFromBackend(cleanQuery);
  warnings.push(...backendAttempt.warnings);
  if (backendAttempt.record) {
    void captureCompetitorLookupRecord(backendAttempt.record).catch(() => undefined);

    writeCacheEntry(cacheKey, {
      record: backendAttempt.record,
      source: "backend",
      sourceUrl: backendAttempt.record.sourceUrl,
      savedAt: nowIso(),
    });

    return {
      ok: true,
      query: cleanQuery,
      record: backendAttempt.record,
      provenance: provenance("backend", { sourceUrl: backendAttempt.record.sourceUrl }),
      warnings,
    };
  }

  const catalogRecord = findFromCompetitorCatalog(cleanQuery);
  if (catalogRecord) {
    writeCacheEntry(cacheKey, {
      record: catalogRecord,
      source: "catalog",
      sourceUrl: catalogRecord.sourceUrl,
      savedAt: nowIso(),
    });

    return {
      ok: true,
      query: cleanQuery,
      record: catalogRecord,
      provenance: provenance("catalog", { sourceUrl: catalogRecord.sourceUrl }),
      warnings,
    };
  }

  const seedRecord = findFromSeed(cleanQuery);
  if (seedRecord) {
    writeCacheEntry(cacheKey, {
      record: seedRecord,
      source: "seed",
      sourceUrl: seedRecord.sourceUrl,
      savedAt: nowIso(),
    });

    return {
      ok: true,
      query: cleanQuery,
      record: seedRecord,
      provenance: provenance("seed", { sourceUrl: seedRecord.sourceUrl }),
      warnings,
    };
  }

  const syntheticRecord = syntheticFallback(cleanQuery);
  if (!syntheticRecord) {
    return {
      ok: true,
      query: cleanQuery,
      record: null,
      provenance: provenance("synthetic"),
      warnings: warnings.length ? warnings : ["No lookup result found."],
    };
  }

  writeCacheEntry(cacheKey, {
    record: syntheticRecord,
    source: "synthetic",
    sourceUrl: syntheticRecord.sourceUrl,
    savedAt: nowIso(),
  });

  return {
    ok: true,
    query: cleanQuery,
    record: syntheticRecord,
    provenance: provenance("synthetic", { sourceUrl: syntheticRecord.sourceUrl }),
    warnings,
  };
}

function toRuntimeTrace(trace: z.infer<typeof backendTraceSchema>): CompetitorLookupRuntimeTrace {
  return {
    attempt: Math.max(0, Number(trace.attempt ?? 0)),
    status: Math.max(0, Number(trace.status ?? 0)),
    ok: Boolean(trace.ok),
    url: tidy(trace.url),
    error: tidy(trace.error) || undefined,
    cacheHit: trace.cacheHit,
    rateLimited: trace.rateLimited,
    retryAfterMs: typeof trace.retryAfterMs === "number" ? Math.max(0, Number(trace.retryAfterMs)) : undefined,
  };
}

function toRuntimeEvent(event: z.infer<typeof backendRuntimeEventSchema>): CompetitorLookupRuntimeEvent {
  return {
    id: tidy(event.id) || `diag_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: tidy(event.timestamp) || nowIso(),
    scope: tidy(event.scope) || "lookup",
    severity: tidy(event.severity) || "info",
    mode: tidy(event.mode) || "unknown",
    message: tidy(event.message) || "Runtime diagnostic event.",
    query: tidy(event.query) || undefined,
    brand: tidy(event.brand) || undefined,
    sku: normalizeSku(event.sku) || undefined,
    warnings: Array.isArray(event.warnings) ? event.warnings.map((item) => tidy(item)).filter(Boolean) : [],
    trace: Array.isArray(event.trace) ? event.trace.map((item) => toRuntimeTrace(item)) : [],
  };
}

export async function fetchCompetitorLookupRuntimeDiagnostics(): Promise<CompetitorLookupRuntimeDiagnostics> {
  if (!DIAGNOSTICS_ENDPOINT || typeof fetch !== "function") {
    return {
      ok: true,
      available: false,
      endpoint: DIAGNOSTICS_ENDPOINT || null,
      fetchedAt: nowIso(),
      mode: "client-disabled",
      memoryCount: 0,
      count: 0,
      maxEvents: 0,
      warnings: ["Lookup diagnostics endpoint is not configured."],
      events: [],
      health: null,
    };
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 5500) : null;

  try {
    const response = await fetch(DIAGNOSTICS_ENDPOINT, {
      method: "GET",
      signal: controller?.signal,
    });

    if (!response.ok) {
      return {
        ok: true,
        available: false,
        endpoint: DIAGNOSTICS_ENDPOINT,
        fetchedAt: nowIso(),
        mode: "endpoint-unavailable",
        memoryCount: 0,
        count: 0,
        maxEvents: 0,
        warnings: [`Lookup diagnostics endpoint returned HTTP ${response.status}.`],
        events: [],
        health: null,
      };
    }

    const payload = await response.json();
    const parsed = backendRuntimeDiagnosticsSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: true,
        available: false,
        endpoint: DIAGNOSTICS_ENDPOINT,
        fetchedAt: nowIso(),
        mode: "contract-mismatch",
        memoryCount: 0,
        count: 0,
        maxEvents: 0,
        warnings: ["Lookup diagnostics payload did not match expected format."],
        events: [],
        health: null,
      };
    }

    const events = Array.isArray(parsed.data.events) ? parsed.data.events.map((item) => toRuntimeEvent(item)) : [];
    return {
      ok: true,
      available: true,
      endpoint: DIAGNOSTICS_ENDPOINT,
      fetchedAt: nowIso(),
      mode: tidy(parsed.data.mode) || "unknown",
      memoryCount: typeof parsed.data.memoryCount === "number" ? parsed.data.memoryCount : 0,
      count: typeof parsed.data.count === "number" ? parsed.data.count : events.length,
      maxEvents: typeof parsed.data.maxEvents === "number" ? parsed.data.maxEvents : events.length,
      warnings: Array.isArray(parsed.data.warnings) ? parsed.data.warnings.map((item) => tidy(item)).filter(Boolean) : [],
      events,
      health: parsed.data.health ?? null,
    };
  } catch {
    return {
      ok: true,
      available: false,
      endpoint: DIAGNOSTICS_ENDPOINT,
      fetchedAt: nowIso(),
      mode: "request-failed",
      memoryCount: 0,
      count: 0,
      maxEvents: 0,
      warnings: ["Lookup diagnostics request failed."],
      events: [],
      health: null,
    };
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
}

async function postDiagnosticsMaintenance(
  endpoint: string,
  payload?: Record<string, unknown>,
): Promise<CompetitorLookupRuntimeMaintenanceResult> {
  if (!endpoint || typeof fetch !== "function") {
    return {
      ok: true,
      available: false,
      endpoint: endpoint || null,
      mode: "client-disabled",
      warnings: ["Lookup diagnostics maintenance endpoint is not configured."],
      message: "Diagnostics maintenance endpoint is unavailable.",
    };
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 5500) : null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      signal: controller?.signal,
    });

    if (!response.ok) {
      return {
        ok: true,
        available: false,
        endpoint,
        mode: "endpoint-unavailable",
        warnings: [`Diagnostics maintenance endpoint returned HTTP ${response.status}.`],
        message: "Diagnostics maintenance request failed.",
      };
    }

    const raw = await response.json();
    const parsed = backendRuntimeMaintenanceSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: true,
        available: false,
        endpoint,
        mode: "contract-mismatch",
        warnings: ["Diagnostics maintenance response did not match expected format."],
        message: "Diagnostics maintenance response could not be parsed.",
      };
    }

    const mode = tidy(parsed.data.mode) || "unknown";
    const warnings = Array.isArray(parsed.data.warnings) ? parsed.data.warnings.map((item) => tidy(item)).filter(Boolean) : [];
    const removedMemory = Number(parsed.data.memoryRemoved ?? parsed.data.memory?.removed ?? 0);
    const removedRemote = Number(parsed.data.remoteRemoved ?? parsed.data.remote?.removed ?? 0);
    const days = Number(parsed.data.days ?? parsed.data.memory?.days ?? parsed.data.remote?.days ?? 0);
    const descriptor = days > 0 ? `${removedMemory} memory and ${removedRemote} remote entries (>${days}d)` : `${removedMemory} memory and ${removedRemote} remote entries`;

    return {
      ok: true,
      available: true,
      endpoint,
      mode,
      warnings,
      message: `Diagnostics maintenance completed (${descriptor}).`,
    };
  } catch {
    return {
      ok: true,
      available: false,
      endpoint,
      mode: "request-failed",
      warnings: ["Diagnostics maintenance request failed."],
      message: "Diagnostics maintenance request failed.",
    };
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
}

export async function clearCompetitorLookupRuntimeDiagnosticsFeed(): Promise<CompetitorLookupRuntimeMaintenanceResult> {
  return postDiagnosticsMaintenance(DIAGNOSTICS_CLEAR_ENDPOINT);
}

export async function pruneCompetitorLookupRuntimeDiagnosticsFeed(days: number): Promise<CompetitorLookupRuntimeMaintenanceResult> {
  return postDiagnosticsMaintenance(DIAGNOSTICS_PRUNE_ENDPOINT, { days });
}

export function clearCompetitorLookupCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
  }
}

export function buildCompetitorLookupStatusLabel(provenance: CompetitorLookupProvenance): string {
  if (provenance.source === "backend" && provenance.sourceUrl) {
    return "Resolved via live product page";
  }

  if (provenance.source === "cache" && provenance.sourceUrl) {
    return "Comparison complete via Lookup cache (live-page cached)";
  }

  if (provenance.source === "cache") {
    return "Comparison complete via Lookup cache (cached)";
  }

  if (provenance.source === "catalog" || provenance.source === "seed") {
    return "Resolved from local competitor dataset";
  }

  return provenance.label;
}
export async function lookupCompetitorWithManufacturer(
  payload: CompetitorLookupRequestPayload
): Promise<CompetitorLookupResult> {
  const lookup = buildLookupPayloadQuery(payload);
  const query = `${lookup.brand} ${lookup.sku}`.trim();

  const baseResult = await lookupCompetitorProduct(query);

    const hasRecord = !!baseResult.record;
  const hasLiveUrl = !!lookup.sourceUrl;
  const shouldTrustBaseResult =
    hasRecord &&
    baseResult.provenance.source !== "seed" &&
    baseResult.provenance.source !== "synthetic";

  if (shouldTrustBaseResult || !hasLiveUrl) {
    return baseResult;
  }

  const live = await resolveCompetitorRecordWithLiveFallback(
    {
      manufacturer: lookup.brand,
      model: lookup.sku,
      productUrl: lookup.sourceUrl,
    },
    async () => null
  );

  if (!live.found || !live.record) {
    return {
      ...baseResult,
      warnings: [
        ...baseResult.warnings,
        live.reason || "Live fallback did not return a usable competitor record.",
      ],
    };
  }

  const liveRecord: CompetitorLookupRecord = {
    brand: String(live.record.manufacturer || "").trim(),
    sku: String(live.record.model || "").trim().toUpperCase(),
    name: String(live.record.title || live.record.model || "").trim(),
    family: String(live.record.technology || "Live lookup"),
    category: String(live.record.category || "Unknown"),
    summary: String(live.record.summary || "Resolved from live product page."),
    features: Array.isArray(live.record.features) ? live.record.features : [],
    transport: live.record.technology,
    sourceUrl: live.record.productUrl,
  };

  captureCompetitorLookupRecord(liveRecord);

  return {
    ok: true,
    query,
    record: liveRecord,
    provenance: {
      source: live.databaseUpdated ? "backend" : "cache",
      label: live.databaseUpdated ? "Resolved via live product page" : "Resolved via cached live product page",
      fetchedAt: nowIso(),
      cacheHit: !live.databaseUpdated,
      ttlSeconds: Math.floor(CACHE_TTL_MS / 1000),
      endpoint: lookup.sourceUrl,
      sourceUrl: lookup.sourceUrl,
    },
    warnings: [
      ...baseResult.warnings,
      live.reason || "Resolved using manufacturer-aware live product page fallback.",
    ].filter(Boolean),
  };
}
