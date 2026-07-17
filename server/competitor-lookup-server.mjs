import { handleAgentsRoute } from "./routes/agents.mjs";
import { enforceCsrf, issueCsrf } from "./security/csrf.mjs";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {
  COMPETITOR_APPROVALS_FILE,
  COMPETITOR_CATALOG_FILE,
  WINGMAN_PRODUCT_REPORTS_FILE,
} from "./catalog/files.mjs";
import {
  handleProductIntelligenceEvidencePost,
  handleProductIntelligenceGet,
  handleProductIntelligenceHealthGet,
  handleProductIntelligenceRefreshPost,
  handleProductIntelligenceStatusPost,
  handleProductIntelligenceUpsertPost,
} from "./product-intelligence-store.mjs";
import {
  getStorageReadiness,
  getWingmanRequestAuth,
  handleWingmanAuditGet,
  handleWingmanInvitationAcceptPost,
  handleWingmanInvitationResolveGet,
  handleWingmanAuthLoginPost,
  handleWingmanAuthLogoutPost,
  handleWingmanAuthSessionGet,
  handleWingmanAuthSignupPost,
  handleWingmanGovernanceGet,
  handleWingmanHealthGet,
  handleWingmanProjectAttachmentsPost,
  handleWingmanProjectCommentsPost,
  handleWingmanProjectMarkReadyPost,
  handleWingmanProjectsGet,
  handleWingmanProjectsSyncPost,
  handleWingmanProjectSharesPost,
  handleWingmanTelemetryGet,
  handleWingmanTelemetryPost,
  handleWingmanWorkspaceGet,
  handleWingmanWorkspaceInvitationsGet,
  handleWingmanWorkspaceInvitationsPost,
  handleWingmanWorkspaceMemberRolePost,
  handleWingmanWorkspaceMembersGet,
  handleWingmanWorkspaceSettingsPost,
} from "./wingman-app-store.mjs";
import { resolveCompetitorMatch } from "./competitor/resolve-match.mjs";
import { resolveCompetitorLiveLookup } from "./competitor/live-lookup.mjs";
import {
  handleIntelligenceDraftBuildCompetitorPost,
  handleIntelligenceDraftBuildWyrestormPost,
  handleIntelligenceDraftsGet,
  handleIntelligenceDraftStatusPost,
} from "./intelligence/auto-draft-builder.mjs";
let createSupabaseClient = null;
try {
  ({ createClient: createSupabaseClient } = await import("@supabase/supabase-js"));
} catch {
}

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const UI_HOST = String(process.env.WINGMAN_UI_HOST || "127.0.0.1").trim() || "127.0.0.1";
const parsedUiPort = Number(process.env.WINGMAN_UI_PORT || 3000);
const UI_PORT = Number.isFinite(parsedUiPort) ? parsedUiPort : 3000;
const CORS_ALLOW_ORIGIN = String(process.env.WINGMAN_CORS_ALLOW_ORIGIN || `http://${UI_HOST}:${UI_PORT}`).trim();
const CORS_ALLOW_CREDENTIALS = CORS_ALLOW_ORIGIN !== "*";
const CORS_REJECT_WILDCARD_IN_PRODUCTION = process.env.NODE_ENV === "production" && CORS_ALLOW_ORIGIN === "*";
const MAX_JSON_BODY_BYTES = Math.max(1024, Number(process.env.WINGMAN_MAX_JSON_BODY_BYTES || 1_048_576));
const RETRY_ATTEMPTS = Number(process.env.LOOKUP_RETRY_ATTEMPTS || 3);
const FETCH_TIMEOUT_MS = Number(process.env.LOOKUP_TIMEOUT_MS || 4500);
const LOOKUP_ENABLE_LIVE_ENRICHMENT = !["0", "false", "off", "no"].includes(String(process.env.LOOKUP_ENABLE_LIVE_ENRICHMENT ?? "true").trim().toLowerCase());
const LOOKUP_CACHE_TTL_MS = Math.max(10_000, Number(process.env.LOOKUP_CACHE_TTL_MS || 30 * 60 * 1000));
const LOOKUP_CACHE_MAX_ENTRIES = Math.max(10, Number(process.env.LOOKUP_CACHE_MAX_ENTRIES || 500));
const LOOKUP_RATE_LIMIT_WINDOW_MS = Math.max(5_000, Number(process.env.LOOKUP_RATE_LIMIT_WINDOW_MS || 60_000));
const LOOKUP_RATE_LIMIT_MAX_REQUESTS = Math.max(1, Number(process.env.LOOKUP_RATE_LIMIT_MAX_REQUESTS || 12));
const LOOKUP_RUNTIME_EVENT_MAX = Math.max(20, Number(process.env.LOOKUP_RUNTIME_EVENT_MAX || 120));
const LOOKUP_RUNTIME_EVENT_RETENTION_DAYS = Math.max(1, Number(process.env.LOOKUP_RUNTIME_EVENT_RETENTION_DAYS || 30));
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const SUPABASE_APPROVALS_TABLE = String(process.env.SUPABASE_COMPETITOR_APPROVALS_TABLE || "competitor_approvals").trim();
const SUPABASE_APPROVALS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const LOOKUP_PERSIST_RUNTIME_EVENTS = !["0", "false", "off", "no"].includes(String(process.env.LOOKUP_PERSIST_RUNTIME_EVENTS ?? "true").trim().toLowerCase());
const SUPABASE_RUNTIME_EVENTS_TABLE = String(process.env.SUPABASE_LOOKUP_DIAGNOSTICS_TABLE || "competitor_lookup_runtime_events").trim();
const SUPABASE_RUNTIME_EVENTS_ENABLED = Boolean(SUPABASE_APPROVALS_ENABLED && LOOKUP_PERSIST_RUNTIME_EVENTS);
const ENABLE_SECURITY_HEADERS = !["0", "false", "off", "no"].includes(String(process.env.WINGMAN_ENABLE_SECURITY_HEADERS ?? "true").trim().toLowerCase());
const API_CONTENT_SECURITY_POLICY = String(process.env.WINGMAN_API_CONTENT_SECURITY_POLICY || "default-src 'none'; frame-ancestors 'none'; base-uri 'none'").trim();
const API_STRICT_TRANSPORT_SECURITY = String(process.env.WINGMAN_API_HSTS || "max-age=31536000; includeSubDomains").trim();

const SEARCH_ENGINE_PROVIDERS = [
  {
    key: "bing",
    label: "Bing site search",
    urls: (host, sku) => [
      `https://www.bing.com/search?q=${encodeURIComponent(`site:${host} "${sku}"`)}`,
    ],
  },
  {
    key: "duckduckgo",
    label: "DuckDuckGo site search",
    urls: (host, sku) => [
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:${host} "${sku}"`)}`,
    ],
  },
];

const BRAND_ADAPTERS = {
  crestron: {
    hosts: ["crestron.com", "www.crestron.com"],
    searchUrls: (sku) => [`https://www.crestron.com/search-results?query=${encodeURIComponent(sku)}`],
    productUrls: (sku) => [`https://www.crestron.com/Products/Model/${encodeURIComponent(sku)}`],
  },
  extron: {
    hosts: ["extron.com", "www.extron.com"],
    searchUrls: (sku) => [`https://www.extron.com/search?searchterm=${encodeURIComponent(sku)}`],
    productUrls: (sku) => [`https://www.extron.com/product/${normalizeId(sku)}`],
  },
  atlona: {
    hosts: ["atlona.com", "www.atlona.com"],
    searchUrls: (sku) => [`https://atlona.com/?s=${encodeURIComponent(sku)}`],
    productUrls: (sku) => [`https://atlona.com/product/${encodeURIComponent(String(sku || "").trim().toLowerCase())}/`],
  },
  lightware: {
    hosts: ["lightware.com", "www.lightware.com"],
    searchUrls: (sku) => [`https://lightware.com/search?q=${encodeURIComponent(sku)}`],
    productUrls: () => [],
  },
  blustream: {
    hosts: ["blustream-us.com", "www.blustream-us.com", "blustream.co.uk", "www.blustream.co.uk"],
    searchUrls: (sku) => [
      `https://www.blustream-us.com/search?q=${encodeURIComponent(sku)}`,
      `https://www.blustream.co.uk/search?q=${encodeURIComponent(sku)}`,
    ],
    productUrls: (sku) => [
      `https://www.blustream-us.com/${encodeURIComponent(String(sku || "").trim().toLowerCase())}`,
      `https://www.blustream.co.uk/${encodeURIComponent(String(sku || "").trim().toLowerCase())}`,
    ],
  },
  kramer: {
    hosts: ["kramerav.com", "www.kramerav.com", "www1.kramerav.com"],
    searchUrls: (sku) => [`https://www.kramerav.com/search?term=${encodeURIComponent(sku)}`],
    productUrls: (sku) => [`https://www1.kramerav.com/us/product/${encodeURIComponent(String(sku || "").trim().toLowerCase())}`],
  },
  zeevee: {
    hosts: ["zeevee.com", "www.zeevee.com"],
    searchUrls: (sku) => [`https://www.zeevee.com/?s=${encodeURIComponent(sku)}`],
    productUrls: () => [],
  },
  barco: {
    hosts: ["barco.com", "www.barco.com"],
    searchUrls: () => [],
    productUrls: () => [],
  },
};

let catalogCache = null;
let supabaseClient = null;
const liveLookupCache = new Map();
const liveLookupRateBuckets = new Map();
const runtimeDiagnosticsEvents = [];
let runtimeEventsPersistedCount = 0;
let runtimeEventsPersistFailures = 0;
let runtimeEventsPersistLastError = "";

function nowIso() {
  return new Date().toISOString();
}

function tidy(value) {
  return String(value ?? "").trim();
}

function normalizeSku(value) {
  return tidy(value).toUpperCase();
}

function normalizeId(value) {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function parseLookupQuery(query) {
  const raw = tidy(query);
  if (!raw) return { brand: "", sku: "", raw };

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^[A-Za-z]{2,}$/.test(parts[0])) {
    return {
      brand: tidy(parts[0]),
      sku: normalizeSku(parts.slice(1).join(" ")),
      raw,
    };
  }

  return {
    brand: "",
    sku: normalizeSku(raw),
    raw,
  };
}

function withCorsHeaders(base = {}) {
  // In production, if CORS is wildcard, log a warning (once per startup)
  if (CORS_REJECT_WILDCARD_IN_PRODUCTION && !withCorsHeaders._warned) {
    withCorsHeaders._warned = true;
    console.warn("[SECURITY] CORS wildcard (*) is configured in production. Set WINGMAN_CORS_ALLOW_ORIGIN to a specific origin.");
  }
  const headers = {
    "Access-Control-Allow-Origin": CORS_ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Wingman-Session",
    Vary: "Origin",
  };
  if (ENABLE_SECURITY_HEADERS) {
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Content-Security-Policy"] = API_CONTENT_SECURITY_POLICY;
    if (API_STRICT_TRANSPORT_SECURITY) {
      headers["Strict-Transport-Security"] = API_STRICT_TRANSPORT_SECURITY;
    }
  }
  if (CORS_ALLOW_CREDENTIALS) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return {
    ...headers,
    ...base,
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, withCorsHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  }));
  res.end(body);
}

async function runProtectedRoute(res, work) {
  try {
    await work();
  } catch (error) {
    sendJson(res, 503, {
      ok: false,
      error: error instanceof Error ? error.message : "Service unavailable.",
    });
  }
}

async function requireWingmanPermission(req, res, url, {
  permission,
  deniedMessage,
} = {}) {
  let auth = null;
  try {
    auth = await getWingmanRequestAuth(req, url);
  } catch (error) {
    sendJson(res, 503, {
      ok: false,
      error: error instanceof Error ? error.message : "Authentication service unavailable.",
    });
    return null;
  }

  if (!auth?.ok) {
    sendJson(res, 401, {
      ok: false,
      error: auth?.error || "Authentication required.",
    });
    return null;
  }

  if (permission && !auth.permissions?.[permission]) {
    sendJson(res, 403, {
      ok: false,
      error: deniedMessage || "Insufficient workspace permissions.",
    });
    return null;
  }

  return auth;
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bodyBytes = 0;
    let done = false;

    const fail = (error) => {
      if (done) return;
      done = true;
      reject(error);
    };

    const succeed = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };

    req.on("data", (chunk) => {
      chunks.push(chunk);
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_JSON_BODY_BYTES) {
        const error = new Error(`Request body too large. Max ${MAX_JSON_BODY_BYTES} bytes.`);
        error.statusCode = 413;
        fail(error);
        req.destroy();
      }
    });
    req.on("end", () => {
      if (done) return;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        if (!text) return succeed({});
        succeed(JSON.parse(text));
      } catch (error) {
        fail(error);
      }
    });
    req.on("error", fail);
  });
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

// Persist a user-submitted product data correction from the "Report a problem"
// button. Appends to data/wingman-product-reports.json for the product team to review.
async function handleProductReportPost(req, res, url, helpers) {
  const auth = await requireWingmanPermission(req, res, url, {
    permission: "canViewDiagnostics",
    deniedMessage: "Reporting a product problem requires an authenticated Wingman workspace session.",
  });
  if (!auth) return;

  let body;
  try {
    body = await helpers.parseJsonBody(req);
  } catch {
    helpers.sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const sku = String(body?.sku ?? "").trim();
  const problem = String(body?.problem ?? "").trim();

  if (!sku || !problem) {
    helpers.sendJson(res, 422, { ok: false, error: "A SKU and a problem description are required." });
    return;
  }

  const report = {
    id: String(body?.id ?? "").trim() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    receivedAt: new Date().toISOString(),
    createdAt: String(body?.createdAt ?? "").trim() || null,
    sku,
    productName: String(body?.productName ?? "").trim(),
    detail: String(body?.detail ?? "").trim(),
    problem,
    correction: String(body?.correction ?? "").trim(),
    reporter: auth.user.email,
    source: String(body?.source ?? "").trim(),
    status: "new",
  };

  const existing = await readJsonFile(WINGMAN_PRODUCT_REPORTS_FILE, []);
  const reports = Array.isArray(existing) ? existing : [];
  reports.unshift(report);
  await writeJsonFile(WINGMAN_PRODUCT_REPORTS_FILE, reports);

  helpers.sendJson(res, 200, { ok: true, id: report.id });
}

async function getCompetitorCatalog() {
  if (catalogCache) return catalogCache;
  const rows = await readJsonFile(COMPETITOR_CATALOG_FILE, []);
  catalogCache = Array.isArray(rows) ? rows : [];
  return catalogCache;
}

function getSupabaseClient() {
  if (!SUPABASE_APPROVALS_ENABLED) return null;
  if (supabaseClient) return supabaseClient;
  if (typeof createSupabaseClient !== "function") return null;

  try {
    supabaseClient = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return supabaseClient;
  } catch {
    return null;
  }
}

function normalizeLookupUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function adapterConfigForBrand(brand) {
  const key = normalizeId(brand);
  if (!key || !BRAND_ADAPTERS[key]) return { adapterKey: "", adapter: null };
  return { adapterKey: key, adapter: BRAND_ADAPTERS[key] };
}

function isAllowedAdapterUrl(adapterKey, rawUrl) {
  const adapter = BRAND_ADAPTERS[adapterKey];
  if (!adapter || !Array.isArray(adapter.hosts) || adapter.hosts.length === 0) return false;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return adapter.hosts.some((allowed) => {
      const normalizedAllowed = tidy(allowed).toLowerCase();
      return host === normalizedAllowed || host.endsWith(`.${normalizedAllowed}`);
    });
  } catch {
    return false;
  }
}

function pruneLookupCache(nowMs = Date.now()) {
  for (const [key, value] of liveLookupCache.entries()) {
    if (!value || typeof value.expiresAt !== "number" || value.expiresAt <= nowMs) {
      liveLookupCache.delete(key);
    }
  }
}

function readLookupCache(cacheKey) {
  pruneLookupCache();
  if (!liveLookupCache.has(cacheKey)) return null;
  const entry = liveLookupCache.get(cacheKey);
  if (!entry || typeof entry.expiresAt !== "number" || entry.expiresAt <= Date.now()) {
    liveLookupCache.delete(cacheKey);
    return null;
  }
  return entry.payload || null;
}

function writeLookupCache(cacheKey, payload) {
  pruneLookupCache();
  const expiresAt = Date.now() + LOOKUP_CACHE_TTL_MS;
  if (liveLookupCache.has(cacheKey)) {
    liveLookupCache.delete(cacheKey);
  }
  liveLookupCache.set(cacheKey, { expiresAt, payload });
  while (liveLookupCache.size > LOOKUP_CACHE_MAX_ENTRIES) {
    const oldestKey = liveLookupCache.keys().next().value;
    if (!oldestKey) break;
    liveLookupCache.delete(oldestKey);
  }
}

function takeRateLimitToken(bucketKey) {
  const key = tidy(bucketKey) || "global";
  const nowMs = Date.now();
  const current = liveLookupRateBuckets.get(key);

  if (!current || nowMs - current.windowStart >= LOOKUP_RATE_LIMIT_WINDOW_MS) {
    liveLookupRateBuckets.set(key, {
      windowStart: nowMs,
      count: 1,
    });
    return {
      ok: true,
      remaining: Math.max(0, LOOKUP_RATE_LIMIT_MAX_REQUESTS - 1),
      retryAfterMs: 0,
    };
  }

  if (current.count >= LOOKUP_RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, (current.windowStart + LOOKUP_RATE_LIMIT_WINDOW_MS) - nowMs),
    };
  }

  current.count += 1;
  liveLookupRateBuckets.set(key, current);
  return {
    ok: true,
    remaining: Math.max(0, LOOKUP_RATE_LIMIT_MAX_REQUESTS - current.count),
    retryAfterMs: 0,
  };
}

function truncateText(value, maxLength = 240) {
  const text = tidy(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function normalizeTraceEntries(trace) {
  if (!Array.isArray(trace)) return [];
  return trace.slice(-8).map((entry) => ({
    attempt: safeInt(entry?.attempt),
    status: safeInt(entry?.status),
    ok: Boolean(entry?.ok),
    url: truncateText(entry?.url, 280),
    error: truncateText(entry?.error, 220) || undefined,
    cacheHit: Boolean(entry?.cacheHit),
    rateLimited: Boolean(entry?.rateLimited),
    retryAfterMs: safeInt(entry?.retryAfterMs),
  }));
}

function safeInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function asStringArray(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => tidy(item))
    .filter(Boolean)
    .slice(0, Math.max(1, limit));
}

function eventTimestampValue(event) {
  const parsed = Date.parse(String(event?.timestamp || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortEventsByTimestampDesc(events) {
  return [...events].sort((a, b) => eventTimestampValue(b) - eventTimestampValue(a));
}

function parseRetentionDays(value, fallback = LOOKUP_RUNTIME_EVENT_RETENTION_DAYS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(3650, Math.max(1, Math.round(parsed)));
}

function thresholdIsoFromDays(days) {
  return new Date(Date.now() - (parseRetentionDays(days) * 24 * 60 * 60 * 1000)).toISOString();
}

function pruneRuntimeDiagnosticsEventsInMemory(days) {
  const thresholdMs = Date.parse(thresholdIsoFromDays(days));
  const before = runtimeDiagnosticsEvents.length;
  const kept = runtimeDiagnosticsEvents.filter((entry) => eventTimestampValue(entry) >= thresholdMs);
  runtimeDiagnosticsEvents.length = 0;
  runtimeDiagnosticsEvents.push(...sortEventsByTimestampDesc(kept).slice(0, LOOKUP_RUNTIME_EVENT_MAX));
  return {
    before,
    after: runtimeDiagnosticsEvents.length,
    removed: Math.max(0, before - runtimeDiagnosticsEvents.length),
    days: parseRetentionDays(days),
  };
}

function mergeRuntimeEvents(...lists) {
  const merged = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (!entry || typeof entry !== "object") continue;
      const id = tidy(entry.id);
      if (!id) continue;
      if (!merged.has(id)) {
        merged.set(id, entry);
      }
    }
  }
  return sortEventsByTimestampDesc(Array.from(merged.values()));
}

function toSupabaseRuntimeEventRow(entry) {
  return {
    id: entry.id,
    event_ts: entry.timestamp,
    scope: entry.scope,
    severity: entry.severity,
    mode: entry.mode,
    message: entry.message,
    query: entry.query || null,
    brand: entry.brand || null,
    sku: entry.sku || null,
    warnings: Array.isArray(entry.warnings) ? entry.warnings : [],
    trace: Array.isArray(entry.trace) ? entry.trace : [],
  };
}

function fromSupabaseRuntimeEventRow(row) {
  if (!row || typeof row !== "object") return null;
  const timestamp = tidy(row.event_ts || row.timestamp || row.created_at) || nowIso();
  return {
    id: tidy(row.id) || `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    scope: tidy(row.scope) || "lookup",
    severity: tidy(row.severity) || "info",
    mode: tidy(row.mode) || "unknown",
    message: truncateText(row.message, 260) || "Runtime diagnostic event",
    query: truncateText(row.query, 160) || undefined,
    brand: truncateText(row.brand, 80) || undefined,
    sku: truncateText(row.sku, 80) || undefined,
    warnings: asStringArray(row.warnings, 6),
    trace: normalizeTraceEntries(row.trace),
  };
}

async function persistRuntimeDiagnosticsEventToSupabase(entry) {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: SUPABASE_RUNTIME_EVENTS_ENABLED ? "Supabase diagnostics client could not be created." : "",
    };
  }

  try {
    const row = toSupabaseRuntimeEventRow(entry);
    const { error } = await client
      .from(SUPABASE_RUNTIME_EVENTS_TABLE)
      .upsert(row, { onConflict: "id" });

    if (error) {
      return {
        ok: false,
        reason: error.message || "Supabase diagnostics event upsert failed.",
      };
    }

    return {
      ok: true,
      reason: "",
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Supabase diagnostics event upsert failed.",
    };
  }
}

function queueRuntimeDiagnosticsPersistence(entry) {
  if (!SUPABASE_RUNTIME_EVENTS_ENABLED) return;
  void persistRuntimeDiagnosticsEventToSupabase(entry)
    .then((result) => {
      if (result.ok) {
        runtimeEventsPersistedCount += 1;
        return;
      }

      if (result.reason) {
        runtimeEventsPersistFailures += 1;
        runtimeEventsPersistLastError = truncateText(result.reason, 220);
      }
    })
    .catch((error) => {
      runtimeEventsPersistFailures += 1;
      runtimeEventsPersistLastError = truncateText(error instanceof Error ? error.message : "Unknown diagnostics persistence failure.", 220);
    });
}

async function readRuntimeDiagnosticsEventsFromSupabase(limit) {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: SUPABASE_RUNTIME_EVENTS_ENABLED ? "Supabase diagnostics client could not be created." : "",
      events: [],
    };
  }

  const cappedLimit = Math.max(1, Math.min(1000, Number(limit) || LOOKUP_RUNTIME_EVENT_MAX));

  try {
    let query = await client
      .from(SUPABASE_RUNTIME_EVENTS_TABLE)
      .select("*")
      .order("event_ts", { ascending: false })
      .limit(cappedLimit);

    if (query.error) {
      query = await client
        .from(SUPABASE_RUNTIME_EVENTS_TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(cappedLimit);
    }

    if (query.error) {
      return {
        ok: false,
        reason: query.error.message || "Supabase diagnostics event query failed.",
        events: [],
      };
    }

    const parsed = Array.isArray(query.data)
      ? query.data.map((row) => fromSupabaseRuntimeEventRow(row)).filter(Boolean)
      : [];

    return {
      ok: true,
      reason: "",
      events: sortEventsByTimestampDesc(parsed).slice(0, cappedLimit),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Supabase diagnostics event query failed.",
      events: [],
    };
  }
}

async function countRuntimeDiagnosticsEventsInSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: SUPABASE_RUNTIME_EVENTS_ENABLED ? "Supabase diagnostics client could not be created." : "",
      count: 0,
    };
  }

  try {
    const { count, error } = await client
      .from(SUPABASE_RUNTIME_EVENTS_TABLE)
      .select("id", { count: "exact", head: true });

    if (error) {
      return {
        ok: false,
        reason: error.message || "Supabase diagnostics event count failed.",
        count: 0,
      };
    }

    return {
      ok: true,
      reason: "",
      count: typeof count === "number" ? count : 0,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Supabase diagnostics event count failed.",
      count: 0,
    };
  }
}

async function clearRuntimeDiagnosticsEventsInSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: SUPABASE_RUNTIME_EVENTS_ENABLED ? "Supabase diagnostics client could not be created." : "",
      before: 0,
      after: 0,
      removed: 0,
    };
  }

  const beforeCount = await countRuntimeDiagnosticsEventsInSupabase();
  if (!beforeCount.ok) {
    return {
      ok: false,
      reason: beforeCount.reason,
      before: 0,
      after: 0,
      removed: 0,
    };
  }

  try {
    const { error } = await client
      .from(SUPABASE_RUNTIME_EVENTS_TABLE)
      .delete()
      .neq("id", "");

    if (error) {
      return {
        ok: false,
        reason: error.message || "Supabase diagnostics clear failed.",
        before: beforeCount.count,
        after: beforeCount.count,
        removed: 0,
      };
    }

    const afterCount = await countRuntimeDiagnosticsEventsInSupabase();
    if (!afterCount.ok) {
      return {
        ok: false,
        reason: afterCount.reason,
        before: beforeCount.count,
        after: beforeCount.count,
        removed: 0,
      };
    }

    return {
      ok: true,
      reason: "",
      before: beforeCount.count,
      after: afterCount.count,
      removed: Math.max(0, beforeCount.count - afterCount.count),
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Supabase diagnostics clear failed.",
      before: beforeCount.count,
      after: beforeCount.count,
      removed: 0,
    };
  }
}

async function pruneRuntimeDiagnosticsEventsInSupabase(days) {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: SUPABASE_RUNTIME_EVENTS_ENABLED ? "Supabase diagnostics client could not be created." : "",
      before: 0,
      after: 0,
      removed: 0,
      days: parseRetentionDays(days),
    };
  }

  const beforeCount = await countRuntimeDiagnosticsEventsInSupabase();
  if (!beforeCount.ok) {
    return {
      ok: false,
      reason: beforeCount.reason,
      before: 0,
      after: 0,
      removed: 0,
      days: parseRetentionDays(days),
    };
  }

  const retentionDays = parseRetentionDays(days);
  const thresholdIso = thresholdIsoFromDays(retentionDays);

  try {
    let deletion = await client
      .from(SUPABASE_RUNTIME_EVENTS_TABLE)
      .delete()
      .lt("event_ts", thresholdIso);

    if (deletion.error) {
      deletion = await client
        .from(SUPABASE_RUNTIME_EVENTS_TABLE)
        .delete()
        .lt("created_at", thresholdIso);
    }

    if (deletion.error) {
      return {
        ok: false,
        reason: deletion.error.message || "Supabase diagnostics prune failed.",
        before: beforeCount.count,
        after: beforeCount.count,
        removed: 0,
        days: retentionDays,
      };
    }

    const afterCount = await countRuntimeDiagnosticsEventsInSupabase();
    if (!afterCount.ok) {
      return {
        ok: false,
        reason: afterCount.reason,
        before: beforeCount.count,
        after: beforeCount.count,
        removed: 0,
        days: retentionDays,
      };
    }

    return {
      ok: true,
      reason: "",
      before: beforeCount.count,
      after: afterCount.count,
      removed: Math.max(0, beforeCount.count - afterCount.count),
      days: retentionDays,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Supabase diagnostics prune failed.",
      before: beforeCount.count,
      after: beforeCount.count,
      removed: 0,
      days: retentionDays,
    };
  }
}

function pushRuntimeDiagnosticsEvent(event) {
  pruneRuntimeDiagnosticsEventsInMemory(LOOKUP_RUNTIME_EVENT_RETENTION_DAYS);

  const entry = {
    id: `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: nowIso(),
    scope: tidy(event.scope) || "lookup",
    severity: tidy(event.severity) || "info",
    mode: tidy(event.mode) || "unknown",
    message: truncateText(event.message, 260) || "Runtime diagnostic event",
    query: truncateText(event.query, 160) || undefined,
    brand: truncateText(event.brand, 80) || undefined,
    sku: truncateText(event.sku, 80) || undefined,
    warnings: Array.isArray(event.warnings)
      ? event.warnings.map((item) => truncateText(item, 220)).filter(Boolean).slice(0, 6)
      : [],
    trace: normalizeTraceEntries(event.trace),
  };

  runtimeDiagnosticsEvents.unshift(entry);
  if (runtimeDiagnosticsEvents.length > LOOKUP_RUNTIME_EVENT_MAX) {
    runtimeDiagnosticsEvents.length = LOOKUP_RUNTIME_EVENT_MAX;
  }

  queueRuntimeDiagnosticsPersistence(entry);
}

function pickMeta(html, regex) {
  const match = regex.exec(html);
  return match ? tidy(match[1]).replace(/\s+/g, " ") : "";
}

function extractHtmlMetadata(html) {
  const title = pickMeta(html, /<title[^>]*>([^<]+)<\/title>/i);
  const metaDescription = pickMeta(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  const ogTitle = pickMeta(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  const ogDescription = pickMeta(
    html,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );

  return {
    title: ogTitle || title,
    description: ogDescription || metaDescription,
  };
}

async function fetchTextWithRetries(url, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || RETRY_ATTEMPTS));
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || FETCH_TIMEOUT_MS));
  const trace = [];

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "WingmanLookupBot/1.0 (+internal-support)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      const text = await response.text();
      clearTimeout(timeout);

      trace.push({
        attempt,
        status: response.status,
        ok: response.ok,
        url: response.url || url,
      });

      if (!response.ok) continue;
      return {
        ok: true,
        html: text,
        finalUrl: response.url || url,
        trace,
      };
    } catch (error) {
      clearTimeout(timeout);
      trace.push({
        attempt,
        status: 0,
        ok: false,
        url,
        error: error instanceof Error ? error.message : "unknown fetch error",
      });
    }
  }

  return {
    ok: false,
    html: "",
    finalUrl: url,
    trace,
  };
}

function preferredAdapterHost(adapter) {
  if (!adapter || !Array.isArray(adapter.hosts)) return "";
  const exact = adapter.hosts.find((host) => !String(host).startsWith("www."));
  return tidy(exact || adapter.hosts[0]).toLowerCase();
}

function adapterUrlsFor(brand, skuOrQuery) {
  const { adapterKey, adapter } = adapterConfigForBrand(brand);
  if (!adapter) {
    return { adapterKey: "", productUrls: [], searchUrls: [], searchEngineUrls: [] };
  }

  const normalizeAdapterUrls = (values) => values
    .map((value) => normalizeLookupUrl(value))
    .filter(Boolean);

  const productUrls = normalizeAdapterUrls(
    typeof adapter.productUrls === "function" ? adapter.productUrls(skuOrQuery) : [],
  ).filter((value) => isAllowedAdapterUrl(adapterKey, value));

  const searchUrls = normalizeAdapterUrls(
    typeof adapter.searchUrls === "function" ? adapter.searchUrls(skuOrQuery) : [],
  ).filter((value) => isAllowedAdapterUrl(adapterKey, value));

  const searchHost = preferredAdapterHost(adapter);
  const searchEngineUrls = searchHost
    ? SEARCH_ENGINE_PROVIDERS.flatMap((provider) =>
        provider.urls(searchHost, skuOrQuery)
          .map((value) => ({
            provider: provider.label,
            url: normalizeLookupUrl(value),
          }))
          .filter((entry) => Boolean(entry.url)),
      )
    : [];

  return {
    adapterKey,
    productUrls,
    searchUrls,
    searchEngineUrls,
  };
}

function isLikelySearchResultsUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const pathText = parsed.pathname.toLowerCase();
    return (
      parsed.searchParams.has("q") ||
      parsed.searchParams.has("s") ||
      parsed.searchParams.has("query") ||
      parsed.searchParams.has("term") ||
      pathText.endsWith("/search") ||
      pathText.includes("/search/")
    );
  } catch {
    return false;
  }
}

function unwrapSearchEngineResultUrl(rawUrl, baseUrl) {
  try {
    const parsed = new URL(rawUrl, baseUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("duckduckgo.com")) {
      const decoded = parsed.searchParams.get("uddg") || parsed.searchParams.get("u");
      return decoded ? normalizeLookupUrl(decoded) : normalizeLookupUrl(parsed.toString());
    }
    if (host.includes("google.")) {
      const decoded = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      return decoded ? normalizeLookupUrl(decoded) : normalizeLookupUrl(parsed.toString());
    }
    if (host.includes("bing.com")) {
      const decoded = parsed.searchParams.get("url") || parsed.searchParams.get("u");
      return decoded ? normalizeLookupUrl(decoded) : normalizeLookupUrl(parsed.toString());
    }
    return normalizeLookupUrl(parsed.toString());
  } catch {
    return null;
  }
}

function scoreCandidateUrl(rawUrl, searchTerm) {
  const normalizedTerm = normalizeId(searchTerm);
  const blob = normalizeId(rawUrl);
  let score = 0;

  if (normalizedTerm && blob.includes(normalizedTerm)) score += 120;
  if (/product|products|model|clickshare|navigator|nav|omega|omni|nvx/.test(rawUrl.toLowerCase())) score += 60;
  if (isLikelySearchResultsUrl(rawUrl)) score -= 80;

  return score;
}

function extractAllowedCandidateUrls(html, baseUrl, adapterKey, searchTerm) {
  const hrefMatches = String(html || "").matchAll(/href=["']([^"'#]+)["']/gi);
  const candidates = [];
  const seen = new Set();

  for (const match of hrefMatches) {
    const resolved = unwrapSearchEngineResultUrl(match[1], baseUrl);
    if (!resolved || !isAllowedAdapterUrl(adapterKey, resolved)) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    candidates.push(resolved);
  }

  return candidates
    .map((url) => ({ url, score: scoreCandidateUrl(url, searchTerm) }))
    .filter((entry) => entry.score > -20)
    .sort((left, right) => right.score - left.score || left.url.localeCompare(right.url))
    .slice(0, 5)
    .map((entry) => entry.url);
}

function metadataMatchesSearchTerm(metadata, sourceUrl, searchTerm) {
  const blob = normalizeId([
    metadata?.title,
    metadata?.description,
    sourceUrl,
  ].filter(Boolean).join(" "));
  const normalizedTerm = normalizeId(searchTerm);
  return Boolean(normalizedTerm && blob.includes(normalizedTerm));
}

// A fetch can return HTTP 200 with a title/description from a bot-block or
// WAF challenge page rather than the actual product page (seen live: Extron's
// site returned "Request Rejected" for an automated request). Without this
// check that garbage title reads as "usable metadata" and gets surfaced to
// the rep as if it were the real product name.
const BLOCK_PAGE_TITLE_PATTERNS = [
  /request rejected/i,
  /access denied/i,
  /forbidden/i,
  /attention required/i,
  /just a moment/i,
  /are you a human/i,
  /please verify you are a human/i,
  /pardon our interruption/i,
  /unusual traffic/i,
  /captcha/i,
  /bot detection/i,
  /reference #/i,
  /^error$/i,
  /^403$/i,
  /^404/i,
];

function looksLikeBlockPage(metadata) {
  const title = String(metadata?.title || "").trim();
  const description = String(metadata?.description || "").trim();

  if (BLOCK_PAGE_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return true;
  // A real product page title is essentially never this short with no
  // description backing it up - block/challenge pages commonly are.
  if (title.length > 0 && title.length < 8 && !description) return true;

  return false;
}

function hasUsefulMetadata(metadata, searchTerm, sourceUrl, kind) {
  if (!metadata?.title && !metadata?.description) return false;
  if (looksLikeBlockPage(metadata)) return false;
  if (kind === "product") return true;
  if (metadataMatchesSearchTerm(metadata, sourceUrl, searchTerm) && !isLikelySearchResultsUrl(sourceUrl)) {
    return true;
  }
  return false;
}

function buildMetadataRecord({ brand, sku, query, metadata, sourceUrl }) {
  return {
    brand: brand || "Unknown",
    sku: normalizeSku(sku || query),
    name: metadata.title || normalizeSku(sku || query),
    family: "Unknown",
    category: "Uncategorized",
    summary: metadata.description || "Metadata captured from manufacturer website.",
    features: [],
    sourceUrl,
  };
}

async function fetchProductCandidate({ adapterKey, brand, sku, query, searchTerm, url, warnings, traces }) {
  const cacheKey = `${adapterKey}|${normalizeSku(searchTerm)}|${url}`;
  const cached = readLookupCache(cacheKey);
  if (cached) {
    traces.push({
      attempt: 0,
      status: 200,
      ok: true,
      url,
      cacheHit: true,
    });
    return cached;
  }

  const token = takeRateLimitToken(adapterKey || "lookup");
  if (!token.ok) {
    warnings.push(`Live enrichment rate limit reached for ${brand || adapterKey}. Retry in ${Math.ceil(token.retryAfterMs / 1000)}s.`);
    traces.push({
      attempt: 0,
      status: 429,
      ok: false,
      url,
      rateLimited: true,
      retryAfterMs: token.retryAfterMs,
    });
    return null;
  }

  const fetched = await fetchTextWithRetries(url);
  traces.push(...fetched.trace);

  if (!fetched.ok) {
    warnings.push(`Lookup attempt failed for ${url}.`);
    return null;
  }

  if (!isAllowedAdapterUrl(adapterKey, fetched.finalUrl)) {
    warnings.push(`Lookup redirect blocked due to host policy: ${fetched.finalUrl}.`);
    return null;
  }

  const metadata = extractHtmlMetadata(fetched.html);
  if (!hasUsefulMetadata(metadata, searchTerm, fetched.finalUrl, "product")) {
    warnings.push(`Product page fetched but no usable metadata found: ${fetched.finalUrl}.`);
    return null;
  }

  const record = buildMetadataRecord({
    brand,
    sku,
    query,
    metadata,
    sourceUrl: fetched.finalUrl,
  });
  writeLookupCache(cacheKey, record);
  return record;
}

async function lookupManufacturerMetadata({ brand, sku, query }) {
  if (!LOOKUP_ENABLE_LIVE_ENRICHMENT) {
    return {
      record: null,
      warnings: ["Live enrichment is disabled by server configuration."],
      traces: [],
    };
  }

  const searchTerm = sku || query;
  const { adapterKey, productUrls, searchUrls, searchEngineUrls } = adapterUrlsFor(brand, searchTerm);
  const warnings = [];
  const traces = [];

  if (!adapterKey) {
    warnings.push(`No manufacturer adapter configured for brand: ${brand || "unknown"}.`);
    return { record: null, warnings, traces };
  }

  const directAttempts = productUrls.map((url) => ({ url, kind: "product", label: "direct product url" }));
  const searchAttempts = searchUrls.map((url) => ({ url, kind: "search", label: "manufacturer search" }));
  const widerSearchAttempts = searchEngineUrls.map((entry) => ({
    url: entry.url,
    kind: "external-search",
    label: entry.provider,
  }));
  const attempts = [...directAttempts, ...searchAttempts, ...widerSearchAttempts];

  if (attempts.length === 0) {
    warnings.push(`No lookup URLs available for brand: ${brand || adapterKey}.`);
    return { record: null, warnings, traces };
  }

  for (const attempt of attempts) {
    if (attempt.kind === "product") {
      const direct = await fetchProductCandidate({
        adapterKey,
        brand,
        sku,
        query,
        searchTerm,
        url: attempt.url,
        warnings,
        traces,
      });
      if (direct) return { record: direct, warnings, traces };
      continue;
    }

    const token = takeRateLimitToken(adapterKey);
    if (!token.ok) {
      warnings.push(`Live enrichment rate limit reached for ${brand || adapterKey}. Retry in ${Math.ceil(token.retryAfterMs / 1000)}s.`);
      traces.push({
        attempt: 0,
        status: 429,
        ok: false,
        url: attempt.url,
        rateLimited: true,
        retryAfterMs: token.retryAfterMs,
      });
      break;
    }

    const fetched = await fetchTextWithRetries(attempt.url);
    traces.push(...fetched.trace);

    if (!fetched.ok) {
      warnings.push(`Lookup attempt failed for ${attempt.url}.`);
      continue;
    }

    const metadata = extractHtmlMetadata(fetched.html);
    if (
      isAllowedAdapterUrl(adapterKey, fetched.finalUrl) &&
      hasUsefulMetadata(metadata, searchTerm, fetched.finalUrl, attempt.kind) &&
      !isLikelySearchResultsUrl(fetched.finalUrl)
    ) {
      const record = buildMetadataRecord({
        brand,
        sku,
        query,
        metadata,
        sourceUrl: fetched.finalUrl,
      });
      writeLookupCache(`${adapterKey}|${normalizeSku(searchTerm)}|${attempt.url}`, record);
      return { record, warnings, traces };
    }

    const candidateUrls = extractAllowedCandidateUrls(fetched.html, fetched.finalUrl, adapterKey, searchTerm);
    if (candidateUrls.length === 0) {
      warnings.push(`No product candidates discovered from ${attempt.label}: ${attempt.url}.`);
      continue;
    }

    for (const candidateUrl of candidateUrls) {
      const candidateRecord = await fetchProductCandidate({
        adapterKey,
        brand,
        sku,
        query,
        searchTerm,
        url: candidateUrl,
        warnings,
        traces,
      });
      if (!candidateRecord) continue;
      writeLookupCache(`${adapterKey}|${normalizeSku(searchTerm)}|${attempt.url}`, candidateRecord);
      return { record: candidateRecord, warnings, traces };
    }
  }

  return {
    record: null,
    warnings,
    traces,
  };
}

function matchCatalogRecord(catalog, { brand, sku, query }) {
  const skuKey = normalizeSku(sku || query);
  const brandKey = normalizeId(brand);

  const exact = catalog.find((item) => {
    const sameSku = normalizeSku(item.sku) === skuKey;
    const sameBrand = brandKey ? normalizeId(item.brand) === brandKey : true;
    return sameSku && sameBrand;
  });

  if (exact) return exact;

  const queryLower = tidy(query).toLowerCase();
  return catalog.find((item) => {
    const blob = [
      item.brand,
      item.sku,
      item.name,
      item.family,
      item.category,
      item.summary,
      ...(Array.isArray(item.features) ? item.features : []),
    ].join(" ").toLowerCase();
    return blob.includes(queryLower);
  }) || null;
}

function toLookupRecordFromCatalog(item, query) {
  const { productUrls, searchUrls } = adapterUrlsFor(item.brand, item.sku || query);
  const sourceUrl = tidy(item.sourceUrl) || productUrls[0] || searchUrls[0];
  return {
    brand: tidy(item.brand) || "Unknown",
    sku: normalizeSku(item.sku || query),
    name: tidy(item.name) || normalizeSku(item.sku || query),
    family: tidy(item.family) || "Unknown",
    category: tidy(item.category) || tidy(item.family) || "Uncategorized",
    summary: tidy(item.summary) || "Catalog fallback record.",
    features: Array.isArray(item.features) ? item.features.map((value) => tidy(value)).filter(Boolean) : [],
    transport: tidy(item.transport) || undefined,
    inputs: Array.isArray(item.inputs) ? item.inputs : [],
    outputs: Array.isArray(item.outputs) ? item.outputs : [],
    control: Array.isArray(item.control) ? item.control : [],
    audio: Array.isArray(item.audio) ? item.audio : [],
    video: item.video && typeof item.video === "object" ? item.video : undefined,
    distanceMeters: typeof item.distance?.meters === "number" ? item.distance.meters : undefined,
    sourceUrl,
  };
}

function syntheticLookupRecord({ brand, sku, query }) {
  const normalizedSku = normalizeSku(sku || query);
  if (!normalizedSku) return null;
  return {
    brand: brand || "Unknown",
    sku: normalizedSku,
    name: normalizedSku,
    family: "Unknown",
    category: "Uncategorized",
    summary: "Synthetic fallback record; no manufacturer or catalog match found.",
    features: [],
  };
}

async function handleLookupRequest(req, res) {
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    pushRuntimeDiagnosticsEvent({
      scope: "lookup",
      severity: "warn",
      mode: "invalid-request",
      message: "Invalid JSON body for competitor lookup request.",
    });
    sendJson(res, 400, {
      ok: false,
      error: "Invalid JSON body.",
    });
    return;
  }

  const query = tidy(body.query);
  if (!query) {
    pushRuntimeDiagnosticsEvent({
      scope: "lookup",
      severity: "warn",
      mode: "invalid-request",
      message: "Lookup request rejected because query is empty.",
    });
    sendJson(res, 400, {
      ok: false,
      error: "Request body must include a non-empty query.",
    });
    return;
  }

  const parsed = parseLookupQuery(query);
  const brand = tidy(body.brand) || parsed.brand;
  const sku = normalizeSku(body.sku) || parsed.sku;
  const warnings = [];

  const manufacturer = await lookupManufacturerMetadata({ brand, sku, query });
  warnings.push(...manufacturer.warnings);
  if (manufacturer.record) {
    pushRuntimeDiagnosticsEvent({
      scope: "lookup",
      severity: warnings.length > 0 ? "warn" : "info",
      mode: "manufacturer-lookup",
      message: `Lookup resolved via manufacturer metadata for ${manufacturer.record.brand} ${manufacturer.record.sku}.`,
      query,
      brand: manufacturer.record.brand,
      sku: manufacturer.record.sku,
      warnings,
      trace: manufacturer.traces,
    });
    sendJson(res, 200, {
      ok: true,
      mode: "manufacturer-lookup",
      query,
      record: {
        ...manufacturer.record,
        brand: manufacturer.record.brand || brand || "Unknown",
        sku: manufacturer.record.sku || sku || normalizeSku(query),
      },
      warnings,
      trace: manufacturer.traces,
      fetchedAt: nowIso(),
    });
    return;
  }

  const catalog = await getCompetitorCatalog();
  const catalogMatch = matchCatalogRecord(catalog, { brand, sku, query });
  if (catalogMatch) {
    const catalogRecord = toLookupRecordFromCatalog(catalogMatch, query);
    pushRuntimeDiagnosticsEvent({
      scope: "lookup",
      severity: warnings.length > 0 ? "warn" : "info",
      mode: "catalog-fallback",
      message: `Lookup resolved from curated catalog for ${catalogRecord.brand} ${catalogRecord.sku}.`,
      query,
      brand: catalogRecord.brand,
      sku: catalogRecord.sku,
      warnings,
      trace: manufacturer.traces,
    });
    sendJson(res, 200, {
      ok: true,
      mode: "catalog-fallback",
      query,
      record: catalogRecord,
      warnings,
      fetchedAt: nowIso(),
    });
    return;
  }

  const synthetic = syntheticLookupRecord({ brand, sku, query });
  pushRuntimeDiagnosticsEvent({
    scope: "lookup",
    severity: "warn",
    mode: "synthetic-fallback",
    message: `Lookup resolved with synthetic fallback for ${brand || "Unknown"} ${normalizeSku(sku || query)}.`,
    query,
    brand: brand || "Unknown",
    sku: normalizeSku(sku || query),
    warnings: warnings.length > 0 ? warnings : ["No manufacturer metadata or catalog fallback matched."],
    trace: manufacturer.traces,
  });
  sendJson(res, 200, {
    ok: true,
    mode: "synthetic-fallback",
    query,
    record: synthetic,
    warnings: warnings.length > 0 ? warnings : ["No manufacturer metadata or catalog fallback matched."],
    fetchedAt: nowIso(),
  });
}

function normalizeApprovalPayload(payload) {
  return {
    cacheKey: tidy(payload.cacheKey),
    brand: tidy(payload.brand),
    sku: normalizeSku(payload.sku),
    name: tidy(payload.name),
    source: tidy(payload.source),
    sourceUrl: tidy(payload.sourceUrl) || undefined,
    approvedBy: tidy(payload.approvedBy) || "wingman-user",
    notes: tidy(payload.notes) || undefined,
  };
}

async function readApprovalsFromFile() {
  const rows = await readJsonFile(COMPETITOR_APPROVALS_FILE, []);
  return Array.isArray(rows) ? rows : [];
}

async function saveApprovalRecordToFile(nextRecord) {
  const approvals = await readApprovalsFromFile();
  const existingIndex = approvals.findIndex((item) => item.id === nextRecord.id);
  const now = nowIso();
  if (existingIndex >= 0) {
    approvals[existingIndex] = {
      ...approvals[existingIndex],
      ...nextRecord,
      createdAt: approvals[existingIndex].createdAt || now,
    };
  } else {
    approvals.push({
      ...nextRecord,
      createdAt: now,
    });
  }

  approvals.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  await writeJsonFile(COMPETITOR_APPROVALS_FILE, approvals);
  const stored = approvals.find((item) => item.id === nextRecord.id) || null;
  return {
    record: stored,
    count: approvals.length,
  };
}

function toSupabaseRow(record) {
  const now = nowIso();
  return {
    id: record.id,
    cache_key: record.cacheKey || null,
    brand: record.brand,
    sku: record.sku,
    name: record.name || record.sku,
    source: record.source || "unknown",
    source_url: record.sourceUrl || null,
    approved_by: record.approvedBy || "wingman-user",
    notes: record.notes || null,
    approved_at: record.approvedAt || now,
    updated_at: now,
  };
}

function fromSupabaseRow(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: tidy(row.id),
    cacheKey: tidy(row.cache_key),
    brand: tidy(row.brand),
    sku: normalizeSku(row.sku),
    name: tidy(row.name),
    source: tidy(row.source),
    sourceUrl: tidy(row.source_url) || undefined,
    approvedBy: tidy(row.approved_by) || "wingman-user",
    notes: tidy(row.notes) || undefined,
    approvedAt: tidy(row.approved_at) || nowIso(),
    updatedAt: tidy(row.updated_at) || nowIso(),
    createdAt: tidy(row.created_at) || undefined,
  };
}

async function readApprovalsFromSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: SUPABASE_APPROVALS_ENABLED ? "Supabase approval DB client could not be created." : "",
      records: [],
    };
  }

  try {
    const { data, error } = await client
      .from(SUPABASE_APPROVALS_TABLE)
      .select("*")
      .limit(500);

    if (error) {
      return {
        ok: false,
        reason: error.message || "Supabase approval DB query failed.",
        records: [],
      };
    }

    const rows = Array.isArray(data) ? data.map((row) => fromSupabaseRow(row)).filter(Boolean) : [];
    rows.sort((a, b) => String(b.updatedAt || b.approvedAt || "").localeCompare(String(a.updatedAt || a.approvedAt || "")));
    return {
      ok: true,
      reason: "",
      records: rows,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Supabase approval DB query failed.",
      records: [],
    };
  }
}

async function saveApprovalToSupabase(record) {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      reason: SUPABASE_APPROVALS_ENABLED ? "Supabase approval DB client could not be created." : "",
      record: null,
      count: 0,
    };
  }

  try {
    const row = toSupabaseRow(record);
    const { data, error } = await client
      .from(SUPABASE_APPROVALS_TABLE)
      .upsert(row, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        reason: error.message || "Supabase approval DB upsert failed.",
        record: null,
        count: 0,
      };
    }

    const { count } = await client
      .from(SUPABASE_APPROVALS_TABLE)
      .select("id", { count: "exact", head: true });

    return {
      ok: true,
      reason: "",
      record: fromSupabaseRow(data) || record,
      count: typeof count === "number" ? count : 0,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Supabase approval DB upsert failed.",
      record: null,
      count: 0,
    };
  }
}

async function readApprovals() {
  const warnings = [];
  const remote = await readApprovalsFromSupabase();
  if (remote.ok) {
    return {
      mode: "supabase-db",
      records: remote.records,
      count: remote.records.length,
      warnings,
    };
  }

  if (remote.reason) warnings.push(`Supabase fallback: ${remote.reason}`);
  const local = await readApprovalsFromFile();
  return {
    mode: remote.reason ? "file-db-fallback" : "file-db",
    records: local,
    count: local.length,
    warnings,
  };
}

async function saveApprovalRecord(input) {
  const localApprovals = await readApprovalsFromFile();
  const normalized = normalizeApprovalPayload(input);

  if (!normalized.brand || !normalized.sku) {
    return {
      ok: false,
      error: "Approval payload must include brand and sku.",
      record: null,
      count: localApprovals.length,
      mode: "validation-error",
      warnings: [],
    };
  }

  const id = `${normalizeId(normalized.brand)}::${normalizeSku(normalized.sku)}`;
  const now = nowIso();
  const nextRecord = {
    ...normalized,
    id,
    approvedAt: now,
    updatedAt: now,
  };

  const warnings = [];
  const remote = await saveApprovalToSupabase(nextRecord);
  if (remote.ok) {
    return {
      ok: true,
      error: null,
      record: remote.record || nextRecord,
      count: remote.count,
      mode: "supabase-db",
      warnings,
    };
  }

  if (remote.reason) warnings.push(`Supabase fallback: ${remote.reason}`);
  const local = await saveApprovalRecordToFile(nextRecord);

  return {
    ok: true,
    error: null,
    record: local.record,
    count: local.count,
    mode: remote.reason ? "file-db-fallback" : "file-db",
    warnings,
  };
}

async function handleApprovalsGet(req, res, url) {
  if (!(await requireWingmanPermission(req, res, url, {
    permission: "canManageWorkspace",
    deniedMessage: "Competitor approvals are restricted to workspace admins.",
  }))) return;

  const approvals = await readApprovals();
  if (approvals.warnings.length > 0) {
    pushRuntimeDiagnosticsEvent({
      scope: "approval",
      severity: "warn",
      mode: approvals.mode,
      message: "Approval list read with fallback warnings.",
      warnings: approvals.warnings,
    });
  }
  sendJson(res, 200, {
    ok: true,
    mode: approvals.mode,
    count: approvals.count,
    records: approvals.records,
    file: COMPETITOR_APPROVALS_FILE,
    table: SUPABASE_APPROVALS_TABLE,
    warnings: approvals.warnings,
  });
}

async function handleApprovalsPost(req, res, url) {
  if (!(await requireWingmanPermission(req, res, url, {
    permission: "canManageWorkspace",
    deniedMessage: "Competitor approvals are restricted to workspace admins.",
  }))) return;

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    pushRuntimeDiagnosticsEvent({
      scope: "approval",
      severity: "warn",
      mode: "invalid-request",
      message: "Invalid JSON body for competitor approvals POST.",
    });
    sendJson(res, 400, {
      ok: false,
      error: "Invalid JSON body.",
    });
    return;
  }

  const saved = await saveApprovalRecord(body);
  if (!saved.ok) {
    pushRuntimeDiagnosticsEvent({
      scope: "approval",
      severity: "warn",
      mode: saved.mode,
      message: saved.error || "Approval payload failed validation.",
      warnings: saved.warnings,
      brand: body?.brand,
      sku: body?.sku,
    });
    sendJson(res, 400, {
      ok: false,
      error: saved.error,
      count: saved.count,
    });
    return;
  }

  pushRuntimeDiagnosticsEvent({
    scope: "approval",
    severity: saved.warnings.length > 0 || saved.mode === "file-db-fallback" ? "warn" : "info",
    mode: saved.mode,
    message: `Approval saved for ${saved.record?.brand || "Unknown"} ${saved.record?.sku || ""}.`,
    warnings: saved.warnings,
    brand: saved.record?.brand,
    sku: saved.record?.sku,
  });

  sendJson(res, 200, {
    ok: true,
    mode: saved.mode,
    count: saved.count,
    record: saved.record,
    file: COMPETITOR_APPROVALS_FILE,
    table: SUPABASE_APPROVALS_TABLE,
    warnings: saved.warnings,
  });
}

async function handleLookupRuntimeDiagnosticsGet(req, res, url) {
  if (!(await requireWingmanPermission(req, res, url, {
    permission: "canViewDiagnostics",
    deniedMessage: "Runtime diagnostics are unavailable for this workspace role.",
  }))) return;

  pruneRuntimeDiagnosticsEventsInMemory(LOOKUP_RUNTIME_EVENT_RETENTION_DAYS);

  const memoryEvents = runtimeDiagnosticsEvents.slice(0, LOOKUP_RUNTIME_EVENT_MAX);
  const warnings = [];
  let mode = "memory";
  let events = memoryEvents;

  if (SUPABASE_RUNTIME_EVENTS_ENABLED) {
    const remote = await readRuntimeDiagnosticsEventsFromSupabase(LOOKUP_RUNTIME_EVENT_MAX);
    if (remote.ok) {
      events = mergeRuntimeEvents(memoryEvents, remote.events).slice(0, LOOKUP_RUNTIME_EVENT_MAX);
      mode = "supabase-db";
    } else if (remote.reason) {
      warnings.push(`Supabase fallback: ${remote.reason}`);
      mode = "memory-fallback";
    }
  }

  sendJson(res, 200, {
    ok: true,
    mode,
    now: nowIso(),
    count: events.length,
    maxEvents: LOOKUP_RUNTIME_EVENT_MAX,
    memoryCount: memoryEvents.length,
    events,
    warnings,
    health: buildHealthPayload(),
  });
}

async function handleLookupRuntimeDiagnosticsClear(req, res, url) {
  if (!(await requireWingmanPermission(req, res, url, {
    permission: "canManageWorkspace",
    deniedMessage: "Runtime diagnostics maintenance is restricted to workspace admins.",
  }))) return;

  const warnings = [];
  const memoryBefore = runtimeDiagnosticsEvents.length;
  runtimeDiagnosticsEvents.length = 0;
  let mode = "memory";

  let remote = {
    ok: false,
    before: 0,
    after: 0,
    removed: 0,
    reason: "",
  };

  if (SUPABASE_RUNTIME_EVENTS_ENABLED) {
    remote = await clearRuntimeDiagnosticsEventsInSupabase();
    if (remote.ok) {
      mode = "supabase-db";
    } else if (remote.reason) {
      warnings.push(`Supabase fallback: ${remote.reason}`);
      mode = "memory-fallback";
      runtimeEventsPersistFailures += 1;
      runtimeEventsPersistLastError = truncateText(remote.reason, 220);
    }
  }

  sendJson(res, 200, {
    ok: true,
    mode,
    warnings,
    memoryBefore,
    memoryAfter: runtimeDiagnosticsEvents.length,
    memoryRemoved: memoryBefore,
    remoteBefore: remote.before,
    remoteAfter: remote.after,
    remoteRemoved: remote.removed,
  });
}

async function handleLookupRuntimeDiagnosticsPrune(req, res, url) {
  if (!(await requireWingmanPermission(req, res, url, {
    permission: "canManageWorkspace",
    deniedMessage: "Runtime diagnostics maintenance is restricted to workspace admins.",
  }))) return;

  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, {
      ok: false,
      error: "Invalid JSON body.",
    });
    return;
  }

  const days = parseRetentionDays(body?.days, LOOKUP_RUNTIME_EVENT_RETENTION_DAYS);
  const warnings = [];
  const memory = pruneRuntimeDiagnosticsEventsInMemory(days);
  let mode = "memory";

  let remote = {
    ok: false,
    before: 0,
    after: 0,
    removed: 0,
    days,
    reason: "",
  };

  if (SUPABASE_RUNTIME_EVENTS_ENABLED) {
    remote = await pruneRuntimeDiagnosticsEventsInSupabase(days);
    if (remote.ok) {
      mode = "supabase-db";
    } else if (remote.reason) {
      warnings.push(`Supabase fallback: ${remote.reason}`);
      mode = "memory-fallback";
      runtimeEventsPersistFailures += 1;
      runtimeEventsPersistLastError = truncateText(remote.reason, 220);
    }
  }

  sendJson(res, 200, {
    ok: true,
    mode,
    warnings,
    days,
    memory,
    remote,
  });
}

function buildHealthPayload() {
  pruneLookupCache();
  pruneRuntimeDiagnosticsEventsInMemory(LOOKUP_RUNTIME_EVENT_RETENTION_DAYS);
  return {
    ok: true,
    service: "wingman-competitor-lookup-server",
    now: nowIso(),
    lookupEndpoint: `http://${HOST}:${PORT}/api/competitor-lookup`,
    approvalsEndpoint: `http://${HOST}:${PORT}/api/competitor-approvals`,
    productIntelligenceEndpoint: `http://${HOST}:${PORT}/api/product-intelligence`,
    productIntelligenceHealthEndpoint: `http://${HOST}:${PORT}/api/product-intelligence/health`,
    intelligenceDraftsEndpoint: `http://${HOST}:${PORT}/api/intelligence/drafts`,
    competitorDraftBuildEndpoint: `http://${HOST}:${PORT}/api/intelligence/build-competitor`,
    wyrestormDraftBuildEndpoint: `http://${HOST}:${PORT}/api/intelligence/build-wyrestorm`,
    wingmanDeploymentEndpoint: `http://${HOST}:${PORT}/api/wingman`,
    retryAttempts: RETRY_ATTEMPTS,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
    liveEnrichmentEnabled: LOOKUP_ENABLE_LIVE_ENRICHMENT,
    liveLookupCacheTtlMs: LOOKUP_CACHE_TTL_MS,
    liveLookupCacheEntries: liveLookupCache.size,
    liveLookupRateWindowMs: LOOKUP_RATE_LIMIT_WINDOW_MS,
    liveLookupRateLimit: LOOKUP_RATE_LIMIT_MAX_REQUESTS,
    liveRuntimeEventMax: LOOKUP_RUNTIME_EVENT_MAX,
    liveRuntimeEventRetentionDays: LOOKUP_RUNTIME_EVENT_RETENTION_DAYS,
    runtimeEventsBuffered: runtimeDiagnosticsEvents.length,
    runtimeEventsPersistenceEnabled: SUPABASE_RUNTIME_EVENTS_ENABLED,
    runtimeEventsPersistenceTable: SUPABASE_RUNTIME_EVENTS_TABLE,
    runtimeEventsPersistedCount,
    runtimeEventsPersistFailures,
    runtimeEventsPersistLastError: runtimeEventsPersistLastError || undefined,
    supabaseApprovalsEnabled: SUPABASE_APPROVALS_ENABLED,
    supabaseApprovalsTable: SUPABASE_APPROVALS_TABLE,
  };
}


function allowLocalIntelligenceDraftBypass(req, url) {
  const enabled = !["0", "false", "off", "no"].includes(
    String(process.env.WINGMAN_ALLOW_LOCAL_INTELLIGENCE_DRAFT_BYPASS ?? "true").trim().toLowerCase()
  );

  if (!enabled) {
    return false;
  }

  const pathname = String(url?.pathname || "");
  const allowedPath = [
    "/api/intelligence/drafts",
    "/api/intelligence/build-competitor",
    "/api/intelligence/build-wyrestorm",
    "/api/intelligence/drafts/status"
  ].includes(pathname);

  if (!allowedPath) {
    return false;
  }

  const remoteAddress = String(req.socket?.remoteAddress || "");
  const host = String(req.headers?.host || "").toLowerCase();

  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("localhost:")
  );
}
let shuttingDown = false;

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

  // CSRF token bootstrap + double-submit guard. The guard is inert unless
  // WINGMAN_CSRF_ENFORCE=true, so this is a no-op until explicitly enabled.
  if (method === "GET" && url.pathname === "/api/csrf") {
    issueCsrf(req, res, sendJson);
    return;
  }

  if (!enforceCsrf(req, res, url, sendJson)) {
    return;
  }

  if (allowLocalIntelligenceDraftBypass(req, url)) {
    if (method === "GET" && url.pathname === "/api/intelligence/drafts") {
      await runProtectedRoute(res, () => handleIntelligenceDraftsGet(req, res, url, { sendJson }));
      return;
    }

    if (method === "POST" && url.pathname === "/api/intelligence/build-competitor") {
      await runProtectedRoute(res, () => handleIntelligenceDraftBuildCompetitorPost(req, res, url, { sendJson, parseJsonBody }));
      return;
    }

    if (method === "POST" && url.pathname === "/api/intelligence/build-wyrestorm") {
      await runProtectedRoute(res, () => handleIntelligenceDraftBuildWyrestormPost(req, res, url, { sendJson, parseJsonBody }));
      return;
    }

    if (method === "POST" && url.pathname === "/api/intelligence/drafts/status") {
      await runProtectedRoute(res, () => handleIntelligenceDraftStatusPost(req, res, url, { sendJson, parseJsonBody }));
      return;
    }
  }

  try {
    if (await handleAgentsRoute(req, res)) {
      return;
    }
  } catch (error) {
    sendJson(res, 503, {
      ok: false,
      error: error instanceof Error ? error.message : "Agents service unavailable.",
    });
    return;
  }

  if (method === "POST" && url.pathname === "/api/competitor/resolveMatch") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Competitor match lookup requires an authenticated Wingman workspace session.",
    }))) return;

    try {
      const body = await parseJsonBody(req);

      const result = await resolveCompetitorMatch({
        manufacturer: tidy(body.manufacturer),
        model: tidy(body.model),
        productUrl: tidy(body.productUrl),
      });

      return sendJson(res, result.ok ? 200 : 400, result);
    } catch (error) {
      return sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Resolve match failed",
      });
    }
  }

  if (method === "POST" && url.pathname === "/api/competitor/liveLookup") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Competitor live lookup requires an authenticated Wingman workspace session.",
    }))) return;

    try {
      const body = await parseJsonBody(req);

      const result = await resolveCompetitorLiveLookup({
        manufacturer: tidy(body.manufacturer),
        model: tidy(body.model),
        productUrl: tidy(body.productUrl),
      });

      return sendJson(res, result.ok ? 200 : 400, result);
    } catch (error) {
      return sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Live lookup failed",
      });
    }
  }

  if (method === "OPTIONS") {
    res.writeHead(204, withCorsHeaders());
    res.end();
    return;
  }

  if (method === "GET" && url.pathname === "/api/health") {
    const version = process.env.WINGMAN_VERSION || "0.1.0";
    sendJson(res, 200, {
      status: "ok",
      timestamp: nowIso(),
      version,
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/ready") {
    // Kubernetes-style readiness check - verify the server is accepting connections
    // AND, when Supabase-backed storage is configured, that Supabase is reachable.
    if (!server.listening || shuttingDown) {
      sendJson(res, 503, {
        ready: false,
        timestamp: nowIso(),
        error: "Server is not ready to accept traffic.",
      });
      return;
    }

    const storage = await getStorageReadiness();
    if (!storage.ready) {
      sendJson(res, 503, {
        ready: false,
        timestamp: nowIso(),
        storageMode: storage.mode,
        error: storage.error || "Storage is not ready.",
      });
      return;
    }

    sendJson(res, 200, {
      ready: true,
      timestamp: nowIso(),
      storageMode: storage.mode,
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/health/details") {
    sendJson(res, 200, buildHealthPayload());
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/health") {
    await runProtectedRoute(res, () => handleWingmanHealthGet(req, res, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/auth/signup") {
    await runProtectedRoute(res, () => handleWingmanAuthSignupPost(req, res, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/auth/login") {
    await runProtectedRoute(res, () => handleWingmanAuthLoginPost(req, res, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/auth/session") {
    await runProtectedRoute(res, () => handleWingmanAuthSessionGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/auth/logout") {
    await runProtectedRoute(res, () => handleWingmanAuthLogoutPost(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/product-report") {
    await runProtectedRoute(res, () => handleProductReportPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/workspace") {
    await runProtectedRoute(res, () => handleWingmanWorkspaceGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/workspace/members") {
    await runProtectedRoute(res, () => handleWingmanWorkspaceMembersGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/workspace/invitations") {
    await runProtectedRoute(res, () => handleWingmanWorkspaceInvitationsGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/workspace/invitations") {
    await runProtectedRoute(res, () => handleWingmanWorkspaceInvitationsPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/workspace/settings") {
    await runProtectedRoute(res, () => handleWingmanWorkspaceSettingsPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/projects") {
    await runProtectedRoute(res, () => handleWingmanProjectsGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/projects/sync") {
    await runProtectedRoute(res, () => handleWingmanProjectsSyncPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  const workspaceMemberRoleRoute = url.pathname.match(/^\/api\/wingman\/workspace\/members\/([^/]+)\/role$/);
  if (workspaceMemberRoleRoute && method === "POST") {
    const userId = decodeURIComponent(workspaceMemberRoleRoute[1] || "");
    await runProtectedRoute(res, () => handleWingmanWorkspaceMemberRolePost(req, res, url, userId, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/invitations/resolve") {
    await runProtectedRoute(res, () => handleWingmanInvitationResolveGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/invitations/accept") {
    await runProtectedRoute(res, () => handleWingmanInvitationAcceptPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  const wingmanProjectRoute = url.pathname.match(/^\/api\/wingman\/projects\/([^/]+)\/(comments|shares|attachments|mark-ready)$/);
  if (wingmanProjectRoute) {
    const projectId = decodeURIComponent(wingmanProjectRoute[1] || "");
    const action = wingmanProjectRoute[2];

    if (method === "POST" && action === "comments") {
      await runProtectedRoute(res, () => handleWingmanProjectCommentsPost(req, res, url, projectId, { sendJson, parseJsonBody }));
      return;
    }

    if (method === "POST" && action === "shares") {
      await runProtectedRoute(res, () => handleWingmanProjectSharesPost(req, res, url, projectId, { sendJson, parseJsonBody }));
      return;
    }

    if (method === "POST" && action === "attachments") {
      await runProtectedRoute(res, () => handleWingmanProjectAttachmentsPost(req, res, url, projectId, { sendJson, parseJsonBody }));
      return;
    }

    if (method === "POST" && action === "mark-ready") {
      await runProtectedRoute(res, () => handleWingmanProjectMarkReadyPost(req, res, url, projectId, { sendJson, parseJsonBody }));
      return;
    }
  }

  if (method === "GET" && url.pathname === "/api/wingman/governance") {
    await runProtectedRoute(res, () => handleWingmanGovernanceGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/audit") {
    await runProtectedRoute(res, () => handleWingmanAuditGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/wingman/telemetry") {
    await runProtectedRoute(res, () => handleWingmanTelemetryGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/wingman/telemetry") {
    await runProtectedRoute(res, () => handleWingmanTelemetryPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (
    method === "POST" &&
    (
      url.pathname === "/api/competitor-lookup" ||
      url.pathname === "/api/wingman/competitor-lookup"
    )
  ) {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Competitor lookup requires an authenticated Wingman workspace session.",
    }))) return;

    await handleLookupRequest(req, res);
    return;
  }

  if (method === "GET" && url.pathname === "/api/competitor-lookup/diagnostics") {
    await runProtectedRoute(res, () => handleLookupRuntimeDiagnosticsGet(req, res, url));
    return;
  }

  if (method === "POST" && url.pathname === "/api/competitor-lookup/diagnostics/clear") {
    await runProtectedRoute(res, () => handleLookupRuntimeDiagnosticsClear(req, res, url));
    return;
  }

  if (method === "POST" && url.pathname === "/api/competitor-lookup/diagnostics/prune") {
    await runProtectedRoute(res, () => handleLookupRuntimeDiagnosticsPrune(req, res, url));
    return;
  }

  if (method === "GET" && url.pathname === "/api/competitor-approvals") {
    await runProtectedRoute(res, () => handleApprovalsGet(req, res, url));
    return;
  }

  if (method === "POST" && url.pathname === "/api/competitor-approvals") {
    await runProtectedRoute(res, () => handleApprovalsPost(req, res, url));
    return;
  }

  if (method === "GET" && url.pathname === "/api/intelligence/drafts") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canManageWorkspace",
      deniedMessage: "Product intelligence drafts are restricted to workspace admins.",
    }))) return;

    await runProtectedRoute(res, () => handleIntelligenceDraftsGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/intelligence/build-competitor") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Competitor intelligence build requires an authenticated Wingman workspace session.",
    }))) return;

    await runProtectedRoute(res, () => handleIntelligenceDraftBuildCompetitorPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/intelligence/build-wyrestorm") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "WyreStorm intelligence build requires an authenticated Wingman workspace session.",
    }))) return;

    await runProtectedRoute(res, () => handleIntelligenceDraftBuildWyrestormPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/intelligence/drafts/status") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canManageWorkspace",
      deniedMessage: "Product intelligence draft approval is restricted to workspace admins.",
    }))) return;

    await runProtectedRoute(res, () => handleIntelligenceDraftStatusPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }
  if (method === "GET" && url.pathname === "/api/product-intelligence/health") {
    await runProtectedRoute(res, () => handleProductIntelligenceHealthGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "GET" && url.pathname === "/api/product-intelligence") {
    await runProtectedRoute(res, () => handleProductIntelligenceGet(req, res, url, { sendJson }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/product-intelligence/refresh") {
    await runProtectedRoute(res, () => handleProductIntelligenceRefreshPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/product-intelligence/upsert") {
    await runProtectedRoute(res, () => handleProductIntelligenceUpsertPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/product-intelligence/evidence") {
    await runProtectedRoute(res, () => handleProductIntelligenceEvidencePost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  if (method === "POST" && url.pathname === "/api/product-intelligence/status") {
    await runProtectedRoute(res, () => handleProductIntelligenceStatusPost(req, res, url, { sendJson, parseJsonBody }));
    return;
  }

  // New competitor match engine endpoint
  if (method === "POST" && url.pathname === "/api/compare/match") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Compare requires an authenticated Wingman workspace session.",
    }))) return;

    await runProtectedRoute(res, async () => {
      try {
        const body = await parseJsonBody(req);
        const { compareCompetitor } = await import("./competitor/match-engine.mjs");
        const result = await compareCompetitor(
          body.input || "",
          body.brand || undefined,
          Math.min(body.maxResults || 5, 10)
        );
        sendJson(res, 200, result);
      } catch (error) {
        console.error("[wingman-api] /api/compare/match failed:", error);
        sendJson(res, 500, { error: "Comparison failed." });
      }
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/compare/analyze") {
    if (!(await requireWingmanPermission(req, res, url, {
      permission: "canViewDiagnostics",
      deniedMessage: "Compare requires an authenticated Wingman workspace session.",
    }))) return;

    await runProtectedRoute(res, async () => {
      try {
        const input = url.searchParams.get("input") || "";
        const brand = url.searchParams.get("brand") || undefined;
        const { compareCompetitor } = await import("./competitor/match-engine.mjs");
        const result = await compareCompetitor(input, brand, 1);
        sendJson(res, 200, result.competitor);
      } catch (error) {
        console.error("[wingman-api] /api/compare/analyze failed:", error);
        sendJson(res, 500, { error: "Analysis failed." });
      }
    });
    return;
  }

  sendJson(res, 404, {
    ok: false,
error: "Route not found.",
    route: `${method} ${url.pathname}`,
  });
});

server.listen(PORT, HOST, () => {
  const health = buildHealthPayload();
  console.log(`[wingman-api] listening on http://${HOST}:${PORT}`);
  console.log(`[wingman-api] health: ${health.lookupEndpoint.replace("/api/competitor-lookup", "/api/health")}`);
});

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[wingman-api] ${signal} received, draining in-flight requests...`);

  const forceExitTimer = setTimeout(() => {
    console.error("[wingman-api] shutdown timed out, forcing exit.");
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close((error) => {
    clearTimeout(forceExitTimer);
    if (error) {
      console.error(`[wingman-api] error during shutdown: ${error.message}`);
      process.exit(1);
      return;
    }
    console.log("[wingman-api] shutdown complete.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("[wingman-api] uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[wingman-api] unhandled rejection:", reason);
});
