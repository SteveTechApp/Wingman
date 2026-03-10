import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const COMPETITOR_CATALOG_FILE = path.join(ROOT, "src", "data", "catalog", "competitor-catalog.phase4.json");
const APPROVAL_DB_FILE = path.join(ROOT, "data", "competitor-approvals.json");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const RETRY_ATTEMPTS = Number(process.env.LOOKUP_RETRY_ATTEMPTS || 3);
const FETCH_TIMEOUT_MS = Number(process.env.LOOKUP_TIMEOUT_MS || 4500);

const BRAND_ADAPTERS = {
  crestron: (sku) => [
    `https://www.crestron.com/search-results?query=${encodeURIComponent(sku)}`,
  ],
  extron: (sku) => [
    `https://www.extron.com/search?searchterm=${encodeURIComponent(sku)}`,
  ],
  atlona: (sku) => [
    `https://atlona.com/?s=${encodeURIComponent(sku)}`,
  ],
  lightware: (sku) => [
    `https://lightware.com/search?q=${encodeURIComponent(sku)}`,
  ],
  blustream: (sku) => [
    `https://www.blustream-us.com/search?q=${encodeURIComponent(sku)}`,
    `https://www.blustream.co.uk/search?q=${encodeURIComponent(sku)}`,
  ],
  kramer: (sku) => [
    `https://www.kramerav.com/search?term=${encodeURIComponent(sku)}`,
  ],
  zeevee: (sku) => [
    `https://www.zeevee.com/?s=${encodeURIComponent(sku)}`,
  ],
};

let catalogCache = null;

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
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        if (!text) return resolve({});
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
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

async function getCompetitorCatalog() {
  if (catalogCache) return catalogCache;
  const rows = await readJsonFile(COMPETITOR_CATALOG_FILE, []);
  catalogCache = Array.isArray(rows) ? rows : [];
  return catalogCache;
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

function adapterUrlsFor(brand, skuOrQuery) {
  const key = normalizeId(brand);
  if (!key || !BRAND_ADAPTERS[key]) return [];
  return BRAND_ADAPTERS[key](skuOrQuery).filter(Boolean);
}

async function lookupManufacturerMetadata({ brand, sku, query }) {
  const searchTerm = sku || query;
  const urls = adapterUrlsFor(brand, searchTerm);
  const warnings = [];
  const traces = [];

  if (urls.length === 0) {
    warnings.push(`No manufacturer adapter configured for brand: ${brand || "unknown"}.`);
    return { record: null, warnings, traces };
  }

  for (const sourceUrl of urls) {
    const fetched = await fetchTextWithRetries(sourceUrl);
    traces.push(...fetched.trace);

    if (!fetched.ok) {
      warnings.push(`Lookup attempt failed for ${sourceUrl}.`);
      continue;
    }

    const metadata = extractHtmlMetadata(fetched.html);
    if (!metadata.title && !metadata.description) {
      warnings.push(`Page fetched but no title/description metadata found: ${fetched.finalUrl}.`);
      continue;
    }

    return {
      record: {
        brand: brand || "Unknown",
        sku: normalizeSku(sku || query),
        name: metadata.title || normalizeSku(sku || query),
        family: "Unknown",
        category: "Uncategorized",
        summary: metadata.description || "Metadata captured from manufacturer website.",
        features: [],
        sourceUrl: fetched.finalUrl,
      },
      warnings,
      traces,
    };
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
  const urls = adapterUrlsFor(item.brand, item.sku || query);
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
    sourceUrl: urls[0],
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
    sendJson(res, 400, {
      ok: false,
      error: "Invalid JSON body.",
    });
    return;
  }

  const query = tidy(body.query);
  if (!query) {
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
    sendJson(res, 200, {
      ok: true,
      mode: "catalog-fallback",
      query,
      record: toLookupRecordFromCatalog(catalogMatch, query),
      warnings,
      fetchedAt: nowIso(),
    });
    return;
  }

  const synthetic = syntheticLookupRecord({ brand, sku, query });
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

async function readApprovals() {
  const rows = await readJsonFile(APPROVAL_DB_FILE, []);
  return Array.isArray(rows) ? rows : [];
}

async function saveApprovalRecord(input) {
  const approvals = await readApprovals();
  const normalized = normalizeApprovalPayload(input);

  if (!normalized.brand || !normalized.sku) {
    return {
      ok: false,
      error: "Approval payload must include brand and sku.",
      record: null,
      count: approvals.length,
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

  const existingIndex = approvals.findIndex((item) => item.id === id);
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
  await writeJsonFile(APPROVAL_DB_FILE, approvals);

  return {
    ok: true,
    error: null,
    record: approvals.find((item) => item.id === id) || null,
    count: approvals.length,
  };
}

async function handleApprovalsGet(_req, res) {
  const approvals = await readApprovals();
  sendJson(res, 200, {
    ok: true,
    count: approvals.length,
    records: approvals,
    file: APPROVAL_DB_FILE,
  });
}

async function handleApprovalsPost(req, res) {
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

  const saved = await saveApprovalRecord(body);
  if (!saved.ok) {
    sendJson(res, 400, {
      ok: false,
      error: saved.error,
      count: saved.count,
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    mode: "file-db",
    count: saved.count,
    record: saved.record,
    file: APPROVAL_DB_FILE,
  });
}

function buildHealthPayload() {
  return {
    ok: true,
    service: "wingman-competitor-lookup-server",
    now: nowIso(),
    lookupEndpoint: `http://${HOST}:${PORT}/api/competitor-lookup`,
    approvalsEndpoint: `http://${HOST}:${PORT}/api/competitor-approvals`,
    retryAttempts: RETRY_ATTEMPTS,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
  };
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (method === "OPTIONS") {
    res.writeHead(204, withCorsHeaders());
    res.end();
    return;
  }

  if (method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, buildHealthPayload());
    return;
  }

  if (method === "POST" && url.pathname === "/api/competitor-lookup") {
    await handleLookupRequest(req, res);
    return;
  }

  if (method === "GET" && url.pathname === "/api/competitor-approvals") {
    await handleApprovalsGet(req, res);
    return;
  }

  if (method === "POST" && url.pathname === "/api/competitor-approvals") {
    await handleApprovalsPost(req, res);
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

