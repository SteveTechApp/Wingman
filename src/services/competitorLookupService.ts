import { z } from "zod";
import compareSeed from "@/data/catalog/competitor-compare.seed.json";
import { getCompetitorProducts, type CompetitorProduct } from "@/competitor/repository";
import type { CatalogPortCount, CatalogVideo } from "@/catalog/types";

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
  sku?: string;
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

const backendPortSchema = z.object({
  type: z.string().min(1),
  count: z.coerce.number().optional().default(0),
}).passthrough();

const backendVideoSchema = z.object({
  maxResolution: z.string().optional(),
  hdr: z.boolean().optional(),
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
  distanceMeters: z.coerce.number().optional(),
  distance_meters: z.coerce.number().optional(),
  distanceM: z.coerce.number().optional(),
  sourceUrl: z.string().optional(),
  url: z.string().optional(),
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

function parseQuery(query: string): { brand: string; sku: string } {
  const raw = tidy(query);
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
    distanceMeters: typeof product.distance?.meters === "number" ? product.distance.meters : undefined,
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
          }
        : undefined,
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

export function clearCompetitorLookupCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
  }
}
