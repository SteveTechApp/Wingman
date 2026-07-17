import fs from "node:fs/promises";
import path from "node:path";
import { enrichProductClassification } from "./shared/product-classification.mjs";
import {
  COMPETITOR_CATALOG_FILE,
  PRODUCT_INTELLIGENCE_DB_FILE,
  WINGMAN_CANONICAL_PRODUCT_STORE_FILE,
} from "./catalog/files.mjs";
import { getWingmanRequestAuth } from "./wingman-app-store.mjs";

const PRODUCT_INTELLIGENCE_MAX_RECORDS = Math.max(100, Number(process.env.PRODUCT_INTELLIGENCE_MAX_RECORDS || 4000));

const VALID_VENDOR_TYPES = new Set(["wyrestorm", "competitor"]);
const VALID_STATUSES = new Set(["draft", "approved", "expired"]);
const VALID_SOURCE_TYPES = new Set(["catalog", "live", "manual", "import"]);
const VALID_EVIDENCE_TYPES = new Set(["spec", "io", "compatibility", "positioning", "application", "other"]);

const BRAND_SOURCE_URLS = {
  wyrestorm: "https://www.wyrestorm.com/",
  crestron: "https://www.crestron.com/",
  extron: "https://www.extron.com/",
  atlona: "https://atlona.com/",
  lightware: "https://lightware.com/",
  blustream: "https://www.blustream-us.com/",
  kramer: "https://www.kramerav.com/",
  zeevee: "https://www.zeevee.com/",
};

const SKU_MASTER_FAMILY_LABELS = {
  AMP: "Amplifier",
  APO: "Apollo",
  CAB: "Cabling",
  CAM: "Camera",
  COM: "Control",
  EX: "HDBaseT",
  EX3: "HDBaseT",
  EXA: "HDBaseT",
  EXF: "Fiber",
  EXP: "USB Extension",
  HALO: "HALO",
  "HALO 60": "HALO",
  "HALO 80": "HALO",
  IDB: "Interactive Display",
  MX: "Matrix",
  MXV: "Matrix",
  NHD: "NetworkHD",
  "NHD-120": "NetworkHD",
  "NHD-500": "NetworkHD",
  "NHD-600": "NetworkHD",
  "NETWORKHD TOUCH": "NetworkHD Touch",
  RX: "HDBaseT",
  RX3: "HDBaseT",
  RXF: "Fiber",
  RXV: "HDBaseT",
  SP: "Audio",
  SW: "Switcher",
  SYN: "Video Wall",
  TS: "Touch Panel",
  TX: "HDBaseT",
  USB: "USB Extension",
};

function nowIso() {
  return new Date().toISOString();
}

function tidy(value) {
  return String(value ?? "").trim();
}

function cleanText(value) {
  const text = tidy(value);
  if (!text) return "";

  return text
    .normalize("NFKC")
    .replace(/[\u00A0\u1680\u180E\u2000-\u200D\u2028\u2029\u202F\u205F\u3000]/g, " ")
    .replace(/[•]/g, "")
    .replace(/[""«»„‟]/g, "\"")
    .replace(/[''‚‛]/g, "'")
    .replace(/[--―]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSku(value) {
  return tidy(value).toUpperCase();
}

function normalizeId(value) {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function normalizeFamilyKey(value) {
  return cleanText(value).toUpperCase().replace(/\s+/g, " ");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampConfidence(value, fallback = 0.6) {
  return Number(clampNumber(value, 0, 1, fallback).toFixed(3));
}

function normalizeUrl(value) {
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

function dedupeStrings(values, limit = 24) {
  const out = [];
  const seen = new Set();
  for (const value of asArray(values)) {
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

function splitSkuDescription(description) {
  return cleanText(description)
    .split("|")
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function skuMasterFamilyLabel(familyCode) {
  const key = normalizeFamilyKey(familyCode);
  return SKU_MASTER_FAMILY_LABELS[key] || cleanText(familyCode) || "Unknown";
}

function skuMasterCategory(familyCode, description) {
  const key = normalizeFamilyKey(familyCode);
  const text = cleanText(description).toLowerCase();

  if (key === "CAB" || /\bcable\b|\bmount\b|\bkit\b|\badapter\b|\bdock\b|\bdongle\b/.test(text)) return "Accessories";
  if (text.includes("matrix") || key.startsWith("MX")) return "Matrix";
  if (text.includes("switcher") || key === "SW" || key === "APO") return "Switcher";
  if (key.startsWith("NHD") || text.includes("networkhd") || text.includes("multiview")) return "AVoIP";
  if (text.includes("video wall") || key === "SYN") return "VideoWall";
  if (text.includes("encoder") || text.includes("decoder") || text.includes("receiver") || text.includes("transmitter") || text.includes("extender") || text.includes("hdbaset")) return "Extender";
  if (key === "USB" || key === "EXP" || text.includes("usb")) return "KVM";
  if (key === "COM" || key === "TS" || key === "NETWORKHD TOUCH" || /\bcontrol\b|\btouch\b/.test(text)) return "Control";
  if (key === "CAM" || key === "AMP" || key === "HALO" || key === "SP" || /\bcamera\b|\bmic\b|\bspeaker\b|\bamplifier\b|\baudio\b/.test(text)) return "Audio";
  return "Other";
}

function skuMasterTransport(familyCode, description) {
  const key = normalizeFamilyKey(familyCode);
  const text = cleanText(description).toLowerCase();

  if (text.includes("hdbaset") || /^EX|^TX|^RX/.test(key)) return "HDBaseT";
  if (text.includes("networkhd") || text.includes("avoip") || text.includes("multiview") || text.includes("dante")) return "AVoIP";
  if (text.includes("usb")) return "USB Extension";
  if (text.includes("switcher") || text.includes("matrix") || text.includes("dock") || text.includes("dongle")) return "Local";
  return "";
}

function skuMasterVideo(description) {
  const text = cleanText(description).toLowerCase();
  const maxResolution = text.includes("8k")
    ? "8K"
    : text.includes("4k60")
      ? (text.includes("444") ? "4K60 4:4:4" : "4K60")
      : text.includes("4k30")
        ? "4K30"
        : text.includes("4k")
          ? "4K"
          : text.includes("1080p")
            ? "1080p"
            : "";
  const hdr = /\bhdr\b|dolby vision/i.test(description);

  if (!maxResolution && !hdr) return undefined;
  return {
    maxResolution: maxResolution || undefined,
    hdr: hdr || undefined,
  };
}

function skuMasterDistanceMeters(description) {
  const matches = Array.from(cleanText(description).matchAll(/(\d+(?:\.\d+)?)\s*m(?:\/|\b)/gi))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 1000);
  if (matches.length === 0) return undefined;
  return Math.max(...matches);
}

function normalizePortType(value) {
  const text = cleanText(value).toLowerCase().replace(/\s+/g, "");
  if (text === "dp") return "DisplayPort";
  if (text === "usbc") return "USB-C";
  if (text === "rj45" || text === "lan" || text === "ethernet") return "RJ45";
  if (text === "mic" || text === "mics") return "Mic";
  return cleanText(value).toUpperCase() === "HDMI" ? "HDMI" : cleanText(value);
}

async function requireProductIntelligenceAdmin(req, res, url, sendJson) {
  const auth = await getWingmanRequestAuth(req, url);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return null;
  }
  if (!auth.permissions?.canManageWorkspace) {
    sendJson(res, 403, { ok: false, error: "Workspace administrator access is required." });
    return null;
  }
  return auth;
}

// Read access to the product/competitor intelligence catalog only requires an
// authenticated workspace session, not admin rights - the mutation routes
// above still require requireProductIntelligenceAdmin().
async function requireProductIntelligenceRead(req, res, url, sendJson) {
  const auth = await getWingmanRequestAuth(req, url);
  if (!auth.ok) {
    sendJson(res, 401, { ok: false, error: auth.error });
    return null;
  }
  return auth;
}

function skuMasterPorts(description) {
  const inputs = [];
  const outputs = [];
  const pattern = /(\d+)\s*(?:x)?\s*(hdmi|usb-c|usb|displayport|dp|rj45|lan|ethernet|mic|mics|audio)\s*(input|inputs|output|outputs)\b/gi;

  for (const match of cleanText(description).matchAll(pattern)) {
    const entry = {
      type: normalizePortType(match[2]),
      count: Math.max(0, Number(match[1]) || 0),
    };
    if (String(match[3]).toLowerCase().startsWith("input")) {
      inputs.push(entry);
    } else {
      outputs.push(entry);
    }
  }

  return { inputs, outputs };
}

function _mapWyrestormSkuMasterRow(raw) {
  const sku = normalizeSku(raw?.sku);
  if (!sku) return null;

  const description = cleanText(raw?.description);
  const familyCode = cleanText(raw?.family);
  const segments = splitSkuDescription(description);
  const summary = segments[0] || `${sku} reference record.`;
  const ports = skuMasterPorts(description);

  return {
    sku,
    name: summary,
    family: skuMasterFamilyLabel(familyCode),
    category: skuMasterCategory(familyCode, description),
    summary,
    features: segments.slice(1, 7),
    transport: skuMasterTransport(familyCode, description) || undefined,
    inputs: ports.inputs,
    outputs: ports.outputs,
    control: /\bcec\b|\brs-?232\b|\bir\b|\bweb ui\b/i.test(description) ? ["Control"] : [],
    audio: /\baudio\b|\bspeaker\b|\bmic\b|\bdsp\b|\bdante\b/i.test(description) ? ["Audio"] : [],
    video: skuMasterVideo(description),
    distanceMeters: skuMasterDistanceMeters(description),
    notes: "Expanded from WyreStorm SKU master.",
  };
}

function coercePortArray(value) {
  return asArray(value)
    .map((entry) => {
      const type = tidy(entry?.type);
      const count = Math.max(0, Math.round(Number(entry?.count) || 0));
      if (!type) return null;
      return { type, count };
    })
    .filter(Boolean)
    .slice(0, 24);
}

function coerceVideo(value) {
  if (!value || typeof value !== "object") return undefined;
  const maxResolution = tidy(value.maxResolution);
  const hdr = typeof value.hdr === "boolean" ? value.hdr : undefined;
  if (!maxResolution && hdr == null) return undefined;
  return {
    maxResolution: maxResolution || undefined,
    hdr,
  };
}

function sourceUrlForBrand(vendorType, brand) {
  if (vendorType === "wyrestorm") return BRAND_SOURCE_URLS.wyrestorm;
  const key = normalizeId(brand);
  return BRAND_SOURCE_URLS[key] || "";
}

function makeRecordId(vendorType, brand, sku) {
  return `${vendorType}::${normalizeId(brand)}::${normalizeSku(sku)}`;
}

function statusForVendor(vendorType) {
  return vendorType === "wyrestorm" ? "approved" : "draft";
}

function confidenceForVendor(vendorType) {
  return vendorType === "wyrestorm" ? 0.87 : 0.72;
}

function sanitizeStatus(value, fallback = "draft") {
  const normalized = normalizeId(value);
  if (VALID_STATUSES.has(normalized)) return normalized;
  return fallback;
}

function sanitizeVendorType(value, fallback = "competitor") {
  const normalized = normalizeId(value);
  if (VALID_VENDOR_TYPES.has(normalized)) return normalized;
  return fallback;
}

function sanitizeSourceType(value, fallback = "manual") {
  const normalized = normalizeId(value);
  if (VALID_SOURCE_TYPES.has(normalized)) return normalized;
  return fallback;
}

function makeSeedEvidence(record, capturedAt) {
  const sourceUrl = record.sourceUrls[0] || sourceUrlForBrand(record.vendorType, record.brand);
  const evidence = [];

  if (tidy(record.summary)) {
    evidence.push({
      id: `${normalizeId(record.sku)}-summary`,
      type: "spec",
      label: "Catalog Summary",
      value: tidy(record.summary),
      sourceUrl: sourceUrl || undefined,
      capturedAt,
      confidence: clampConfidence(record.confidence, 0.72),
      notes: "Derived from catalog summary field.",
    });
  }

  if (record.features.length > 0) {
    evidence.push({
      id: `${normalizeId(record.sku)}-features`,
      type: "io",
      label: "Catalog Features",
      value: record.features.join("; "),
      sourceUrl: sourceUrl || undefined,
      capturedAt,
      confidence: clampConfidence(record.confidence, 0.7),
      notes: "Derived from catalog feature list.",
    });
  }

  return evidence;
}

function coerceEvidenceEntry(raw, fallback = {}) {
  const id = tidy(raw?.id) || `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const typeValue = normalizeId(raw?.type || fallback.type || "other");
  const type = VALID_EVIDENCE_TYPES.has(typeValue) ? typeValue : "other";
  const label = tidy(raw?.label || fallback.label || "Evidence");
  const value = tidy(raw?.value || fallback.value);
  const capturedAt = tidy(raw?.capturedAt || fallback.capturedAt || nowIso());
  const sourceUrl = normalizeUrl(raw?.sourceUrl || fallback.sourceUrl);
  const confidence = clampConfidence(raw?.confidence, clampConfidence(fallback.confidence, 0.65));
  const notes = tidy(raw?.notes || fallback.notes);

  if (!label || !value) return null;
  return {
    id,
    type,
    label,
    value,
    sourceUrl: sourceUrl || undefined,
    capturedAt,
    confidence,
    notes: notes || undefined,
  };
}

function mergeEvidence(seedEvidence, existingEvidence) {
  const merged = [];
  const seen = new Set();
  for (const source of [asArray(seedEvidence), asArray(existingEvidence)]) {
    for (const entry of source) {
      const evidence = coerceEvidenceEntry(entry);
      if (!evidence) continue;
      const fingerprint = `${normalizeId(evidence.type)}|${normalizeId(evidence.label)}|${normalizeId(evidence.value)}|${normalizeId(evidence.sourceUrl)}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      merged.push(evidence);
    }
  }
  return merged.slice(0, 80);
}

function tagsFromRecord(record) {
  const fromFeatures = record.features.map((entry) => normalizeId(entry)).filter(Boolean);
  const fromCategory = [normalizeId(record.family), normalizeId(record.category), normalizeId(record.transport)].filter(Boolean);
  return dedupeStrings([...fromCategory, ...fromFeatures], 16);
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const vendorCmp = String(a.vendorType).localeCompare(String(b.vendorType));
    if (vendorCmp !== 0) return vendorCmp;
    const brandCmp = String(a.brand).localeCompare(String(b.brand));
    if (brandCmp !== 0) return brandCmp;
    return String(a.sku).localeCompare(String(b.sku));
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

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function mapCatalogRecord(raw, vendorType, capturedAt) {
  const brand = vendorType === "wyrestorm" ? "WyreStorm" : tidy(raw?.brand) || "Unknown";
  const sku = normalizeSku(raw?.sku);
  if (!sku) return null;

  const confidence = confidenceForVendor(vendorType);
  const sourceUrl = sourceUrlForBrand(vendorType, brand);
  const record = {
    id: makeRecordId(vendorType, brand, sku),
    vendorType,
    brand,
    sku,
    name: tidy(raw?.name) || sku,
    family: tidy(raw?.family) || "Unknown",
    category: tidy(raw?.category) || tidy(raw?.family) || "Uncategorized",
    summary: tidy(raw?.summary) || `${sku} reference record.`,
    features: dedupeStrings(raw?.features, 24),
    transport: tidy(raw?.transport) || undefined,
    inputs: coercePortArray(raw?.inputs),
    outputs: coercePortArray(raw?.outputs),
    control: dedupeStrings(raw?.control, 16),
    audio: dedupeStrings(raw?.audio, 16),
    video: coerceVideo(raw?.video),
    distanceMeters: clampNumber(raw?.distance?.meters ?? raw?.distanceMeters, 0, 100000, 0) || undefined,
    status: statusForVendor(vendorType),
    confidence,
    sourceType: "catalog",
    sourceUrls: sourceUrl ? [sourceUrl] : [],
    tags: [],
    notes: tidy(raw?.notes) || undefined,
    createdAt: capturedAt,
    updatedAt: capturedAt,
    lastCapturedAt: capturedAt,
    lastReviewedAt: vendorType === "wyrestorm" ? capturedAt : undefined,
    reviewedBy: vendorType === "wyrestorm" ? "seed-catalog" : undefined,
    evidence: [],
  };

  record.tags = tagsFromRecord(record);
  record.evidence = makeSeedEvidence(record, capturedAt);
  return record;
}

function sanitizeRecord(raw, fallback = {}) {
  const vendorType = sanitizeVendorType(raw?.vendorType || fallback.vendorType, "competitor");
  const brand = tidy(raw?.brand || fallback.brand) || (vendorType === "wyrestorm" ? "WyreStorm" : "Unknown");
  const sku = normalizeSku(raw?.sku || fallback.sku);
  if (!sku) return null;

  const id = tidy(raw?.id) || makeRecordId(vendorType, brand, sku);
  const createdAt = tidy(raw?.createdAt || fallback.createdAt || nowIso());
  const updatedAt = tidy(raw?.updatedAt || fallback.updatedAt || nowIso());
  const status = sanitizeStatus(raw?.status || fallback.status, statusForVendor(vendorType));
  const confidence = clampConfidence(raw?.confidence, fallback.confidence ?? confidenceForVendor(vendorType));
  const sourceType = sanitizeSourceType(raw?.sourceType || fallback.sourceType, fallback.sourceType || "manual");

  const sourceUrls = dedupeStrings(
    [
      ...asArray(raw?.sourceUrls),
      ...asArray(fallback.sourceUrls),
      normalizeUrl(raw?.sourceUrl),
      normalizeUrl(fallback.sourceUrl),
      sourceUrlForBrand(vendorType, brand),
    ],
    8,
  )
    .map((item) => normalizeUrl(item))
    .filter(Boolean);

  const record = {
    id,
    vendorType,
    brand,
    sku,
    name: tidy(raw?.name || fallback.name) || sku,
    family: tidy(raw?.family || fallback.family) || "Unknown",
    category: tidy(raw?.category || fallback.category) || tidy(raw?.family || fallback.family) || "Uncategorized",
    summary: tidy(raw?.summary || fallback.summary) || `${sku} reference record.`,
    features: dedupeStrings([...asArray(fallback.features), ...asArray(raw?.features)], 24),
    transport: tidy(raw?.transport || fallback.transport) || undefined,
    inputs: coercePortArray(raw?.inputs ?? fallback.inputs),
    outputs: coercePortArray(raw?.outputs ?? fallback.outputs),
    control: dedupeStrings(raw?.control ?? fallback.control, 16),
    audio: dedupeStrings(raw?.audio ?? fallback.audio, 16),
    video: coerceVideo(raw?.video ?? fallback.video),
    distanceMeters: clampNumber(raw?.distanceMeters ?? fallback.distanceMeters, 0, 100000, 0) || undefined,
    status,
    confidence,
    sourceType,
    sourceUrls,
    tags: dedupeStrings([...(asArray(raw?.tags)), ...(asArray(fallback.tags))], 20),
    notes: tidy(raw?.notes || fallback.notes) || undefined,
    createdAt,
    updatedAt,
    lastCapturedAt: tidy(raw?.lastCapturedAt || fallback.lastCapturedAt || updatedAt),
    lastReviewedAt: tidy(raw?.lastReviewedAt || fallback.lastReviewedAt) || undefined,
    reviewedBy: tidy(raw?.reviewedBy || fallback.reviewedBy) || undefined,
    evidence: mergeEvidence(raw?.evidence, fallback.evidence),
  };

  if (record.tags.length === 0) {
    record.tags = tagsFromRecord(record);
  }

  return record;
}

function mergeRecord(seedRecord, existingRecord) {
  if (!existingRecord) return seedRecord;
  const merged = sanitizeRecord({
    ...seedRecord,
    ...existingRecord,
    id: seedRecord.id,
    vendorType: seedRecord.vendorType,
    brand: seedRecord.brand,
    sku: seedRecord.sku,
    name: existingRecord.name || seedRecord.name,
    family: existingRecord.family || seedRecord.family,
    category: existingRecord.category || seedRecord.category,
    summary: seedRecord.summary || existingRecord.summary,
    features: dedupeStrings([...seedRecord.features, ...existingRecord.features], 24),
    sourceUrls: dedupeStrings([...seedRecord.sourceUrls, ...existingRecord.sourceUrls], 8),
    status: existingRecord.status || seedRecord.status,
    confidence: Math.max(seedRecord.confidence || 0, existingRecord.confidence || 0),
    sourceType: existingRecord.sourceType === "manual" ? "manual" : seedRecord.sourceType,
    createdAt: existingRecord.createdAt || seedRecord.createdAt,
    updatedAt: nowIso(),
    lastCapturedAt: seedRecord.lastCapturedAt || existingRecord.lastCapturedAt,
    lastReviewedAt: existingRecord.lastReviewedAt,
    reviewedBy: existingRecord.reviewedBy,
    notes: existingRecord.notes || seedRecord.notes,
    evidence: mergeEvidence(seedRecord.evidence, existingRecord.evidence),
    tags: dedupeStrings([...seedRecord.tags, ...existingRecord.tags], 20),
  });
  return merged;
}

async function buildSeedRecords(existingRecords = []) {
  const capturedAt = nowIso();
  const wyrestormCanonical = await readJsonFile(WINGMAN_CANONICAL_PRODUCT_STORE_FILE, { products: [] });
  const wyrestormRows = asArray(wyrestormCanonical?.products)
    .filter((row) => row?.dataMaintenance?.approvedFor?.finder !== false);
  const competitorRows = asArray(await readJsonFile(COMPETITOR_CATALOG_FILE, []));

  const seed = [];
  const seededIds = new Set();
  for (const row of wyrestormRows) {
    const record = mapCatalogRecord(row, "wyrestorm", capturedAt);
    if (record) {
      seed.push(record);
      seededIds.add(record.id);
    }
  }
  for (const row of competitorRows) {
    const record = mapCatalogRecord(row, "competitor", capturedAt);
    if (record) seed.push(record);
  }

  const existingMap = new Map();
  for (const existing of asArray(existingRecords)) {
    const sanitized = sanitizeRecord(existing);
    if (!sanitized) continue;
    existingMap.set(sanitized.id, sanitized);
  }

  const merged = [];
  const seen = new Set();
  for (const record of seed) {
    const existing = existingMap.get(record.id);
    merged.push(mergeRecord(record, existing));
    seen.add(record.id);
  }

  for (const [id, existing] of existingMap.entries()) {
    if (seen.has(id)) continue;
    merged.push(existing);
  }

  return sortRecords(merged).slice(0, PRODUCT_INTELLIGENCE_MAX_RECORDS);
}

function summarizeRecords(records) {
  const byStatus = { draft: 0, approved: 0, expired: 0 };
  const byVendorType = { wyrestorm: 0, competitor: 0 };
  const nowMs = Date.now();
  let stale90Days = 0;
  let highConfidence = 0;

  for (const record of records) {
    if (byStatus[record.status] != null) byStatus[record.status] += 1;
    if (byVendorType[record.vendorType] != null) byVendorType[record.vendorType] += 1;
    if ((record.confidence || 0) >= 0.8) highConfidence += 1;
    const capturedMs = Date.parse(record.lastCapturedAt || "");
    if (Number.isFinite(capturedMs) && (nowMs - capturedMs) > 90 * 24 * 60 * 60 * 1000) stale90Days += 1;
  }

  return {
    total: records.length,
    byStatus,
    byVendorType,
    stale90Days,
    highConfidence,
  };
}

async function ensureDatabase() {
  const existing = await readJsonFile(PRODUCT_INTELLIGENCE_DB_FILE, null);
  if (existing && Array.isArray(existing.records)) {
    const records = sortRecords(
      existing.records
        .map((entry) => sanitizeRecord(entry))
        .filter(Boolean),
    ).slice(0, PRODUCT_INTELLIGENCE_MAX_RECORDS);

    return {
      version: 1,
      generatedAt: tidy(existing.generatedAt) || nowIso(),
      updatedAt: tidy(existing.updatedAt) || nowIso(),
      records,
    };
  }

  const records = await buildSeedRecords([]);
  const seeded = {
    version: 1,
    generatedAt: nowIso(),
    updatedAt: nowIso(),
    records,
  };
  await writeJsonFile(PRODUCT_INTELLIGENCE_DB_FILE, seeded);
  return seeded;
}

async function saveDatabase(db) {
  const sanitized = {
    version: 1,
    generatedAt: tidy(db.generatedAt) || nowIso(),
    updatedAt: nowIso(),
    records: sortRecords(asArray(db.records).map((entry) => sanitizeRecord(entry)).filter(Boolean)).slice(0, PRODUCT_INTELLIGENCE_MAX_RECORDS),
  };
  await writeJsonFile(PRODUCT_INTELLIGENCE_DB_FILE, sanitized);
  return sanitized;
}

function filterRecords(records, filters = {}) {
  const vendorType = sanitizeVendorType(filters.vendorType || "", "");
  const status = sanitizeStatus(filters.status || "", "");
  const brandFilter = normalizeId(filters.brand || "");
  const skuFilter = normalizeSku(filters.sku || "");
  const search = tidy(filters.q || "").toLowerCase();
  const limit = Math.max(1, Math.min(1000, Number(filters.limit) || 250));

  const next = records.filter((record) => {
    if (vendorType && record.vendorType !== vendorType) return false;
    if (status && record.status !== status) return false;
    if (brandFilter && normalizeId(record.brand) !== brandFilter) return false;
    if (skuFilter && normalizeSku(record.sku) !== skuFilter) return false;

    if (search) {
      const blob = [
        record.vendorType,
        record.brand,
        record.sku,
        record.name,
        record.family,
        record.category,
        record.summary,
        ...(record.features || []),
      ].join(" ").toLowerCase();
      if (!blob.includes(search)) return false;
    }
    return true;
  });

  return {
    total: next.length,
    records: next.slice(0, limit),
    limit,
  };
}

async function refreshDatabase() {
  const current = await ensureDatabase();
  const records = await buildSeedRecords(current.records);
  const next = await saveDatabase({
    ...current,
    generatedAt: current.generatedAt || nowIso(),
    records,
  });
  return {
    ok: true,
    message: "Product intelligence database refreshed from catalog sources.",
    count: next.records.length,
    summary: summarizeRecords(next.records),
  };
}

function recordSkeleton({ vendorType, brand, sku }) {
  const now = nowIso();
  const normalizedVendorType = sanitizeVendorType(vendorType, "competitor");
  const normalizedBrand = tidy(brand) || (normalizedVendorType === "wyrestorm" ? "WyreStorm" : "Unknown");
  const normalizedSku = normalizeSku(sku);
  const sourceUrl = sourceUrlForBrand(normalizedVendorType, normalizedBrand);
  return {
    id: makeRecordId(normalizedVendorType, normalizedBrand, normalizedSku),
    vendorType: normalizedVendorType,
    brand: normalizedBrand,
    sku: normalizedSku,
    name: normalizedSku,
    family: "Unknown",
    category: "Uncategorized",
    summary: `${normalizedSku} reference record.`,
    features: [],
    transport: undefined,
    inputs: [],
    outputs: [],
    control: [],
    audio: [],
    video: undefined,
    distanceMeters: undefined,
    status: "draft",
    confidence: 0.6,
    sourceType: "manual",
    sourceUrls: sourceUrl ? [sourceUrl] : [],
    tags: [],
    notes: undefined,
    createdAt: now,
    updatedAt: now,
    lastCapturedAt: now,
    lastReviewedAt: undefined,
    reviewedBy: undefined,
    evidence: [],
  };
}

function parseUpsertPayload(payload) {
  const vendorType = sanitizeVendorType(payload?.vendorType, normalizeId(payload?.brand) === "wyrestorm" ? "wyrestorm" : "competitor");
  const brand = tidy(payload?.brand) || (vendorType === "wyrestorm" ? "WyreStorm" : "");
  const sku = normalizeSku(payload?.sku);
  if (!brand || !sku) {
    return {
      ok: false,
      error: "Product upsert payload must include brand and sku.",
      payload: null,
    };
  }

  return {
    ok: true,
    error: "",
    payload: {
      vendorType,
      brand,
      sku,
      name: tidy(payload?.name),
      family: tidy(payload?.family),
      category: tidy(payload?.category),
      summary: tidy(payload?.summary),
      features: dedupeStrings(payload?.features, 24),
      transport: tidy(payload?.transport),
      inputs: coercePortArray(payload?.inputs),
      outputs: coercePortArray(payload?.outputs),
      control: dedupeStrings(payload?.control, 16),
      audio: dedupeStrings(payload?.audio, 16),
      video: coerceVideo(payload?.video),
      distanceMeters: clampNumber(payload?.distanceMeters, 0, 100000, 0) || undefined,
      status: sanitizeStatus(payload?.status, "draft"),
      confidence: clampConfidence(payload?.confidence, 0.65),
      sourceType: sanitizeSourceType(payload?.sourceType, "manual"),
      sourceUrls: dedupeStrings(payload?.sourceUrls, 8)
        .map((item) => normalizeUrl(item))
        .filter(Boolean),
      tags: dedupeStrings(payload?.tags, 20),
      notes: tidy(payload?.notes),
      reviewedBy: tidy(payload?.reviewedBy),
      lastReviewedAt: tidy(payload?.lastReviewedAt),
      evidence: asArray(payload?.evidence),
    },
  };
}

async function upsertRecord(payload) {
  const parsed = parseUpsertPayload(payload);
  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
      record: null,
      warnings: [],
    };
  }

  const db = await ensureDatabase();
  const incoming = parsed.payload;
  const id = makeRecordId(incoming.vendorType, incoming.brand, incoming.sku);
  const existing = db.records.find((entry) => entry.id === id) || null;
  const base = existing || recordSkeleton(incoming);
  const now = nowIso();

  const merged = sanitizeRecord({
    ...base,
    ...incoming,
    id,
    vendorType: incoming.vendorType,
    brand: incoming.brand,
    sku: incoming.sku,
    name: incoming.name || base.name,
    family: incoming.family || base.family,
    category: incoming.category || base.category,
    summary: incoming.summary || base.summary,
    features: incoming.features.length > 0 ? incoming.features : base.features,
    transport: incoming.transport || base.transport,
    inputs: incoming.inputs.length > 0 ? incoming.inputs : base.inputs,
    outputs: incoming.outputs.length > 0 ? incoming.outputs : base.outputs,
    control: incoming.control.length > 0 ? incoming.control : base.control,
    audio: incoming.audio.length > 0 ? incoming.audio : base.audio,
    video: incoming.video || base.video,
    distanceMeters: incoming.distanceMeters ?? base.distanceMeters,
    sourceUrls: dedupeStrings([
      ...incoming.sourceUrls,
      ...base.sourceUrls,
      sourceUrlForBrand(incoming.vendorType, incoming.brand),
    ], 8),
    tags: dedupeStrings([...incoming.tags, ...base.tags], 20),
    notes: incoming.notes || base.notes,
    status: incoming.status || base.status,
    confidence: incoming.confidence ?? base.confidence,
    sourceType: incoming.sourceType || base.sourceType,
    reviewedBy: incoming.reviewedBy || base.reviewedBy,
    lastReviewedAt: incoming.lastReviewedAt || base.lastReviewedAt,
    createdAt: base.createdAt || now,
    updatedAt: now,
    lastCapturedAt: now,
    evidence: mergeEvidence(incoming.evidence, base.evidence),
  }, base);

  const nextRecords = db.records.filter((entry) => entry.id !== id);
  nextRecords.push(merged);
  const next = await saveDatabase({
    ...db,
    records: nextRecords,
  });

  return {
    ok: true,
    error: "",
    record: next.records.find((entry) => entry.id === id) || merged,
    warnings: [],
    count: next.records.length,
    summary: summarizeRecords(next.records),
  };
}

async function updateStatus(payload) {
  const brand = tidy(payload?.brand);
  const sku = normalizeSku(payload?.sku);
  const status = sanitizeStatus(payload?.status, "");
  const vendorType = sanitizeVendorType(payload?.vendorType, normalizeId(brand) === "wyrestorm" ? "wyrestorm" : "competitor");

  if (!brand || !sku || !status) {
    return {
      ok: false,
      error: "Status update requires brand, sku, and status.",
      record: null,
      warnings: [],
    };
  }

  const db = await ensureDatabase();
  const id = makeRecordId(vendorType, brand, sku);
  const existing = db.records.find((entry) => entry.id === id) || recordSkeleton({ vendorType, brand, sku });
  const now = nowIso();
  const reviewedBy = tidy(payload?.reviewedBy) || "wingman-review";
  const notes = tidy(payload?.notes) || existing.notes;
  const nextRecord = sanitizeRecord({
    ...existing,
    status,
    notes,
    reviewedBy,
    lastReviewedAt: now,
    updatedAt: now,
  }, existing);

  const nextRecords = db.records.filter((entry) => entry.id !== id);
  nextRecords.push(nextRecord);
  const next = await saveDatabase({
    ...db,
    records: nextRecords,
  });

  return {
    ok: true,
    error: "",
    record: next.records.find((entry) => entry.id === id) || nextRecord,
    warnings: [],
    count: next.records.length,
    summary: summarizeRecords(next.records),
  };
}

async function addEvidence(payload) {
  const brand = tidy(payload?.brand);
  const sku = normalizeSku(payload?.sku);
  const vendorType = sanitizeVendorType(payload?.vendorType, normalizeId(brand) === "wyrestorm" ? "wyrestorm" : "competitor");

  if (!brand || !sku) {
    return {
      ok: false,
      error: "Evidence payload requires brand and sku.",
      record: null,
      evidence: null,
      warnings: [],
    };
  }

  const candidateEvidence = coerceEvidenceEntry(payload, {
    type: payload?.type,
    label: payload?.label,
    value: payload?.value,
    sourceUrl: payload?.sourceUrl,
    capturedAt: payload?.capturedAt,
    confidence: payload?.confidence,
    notes: payload?.notes,
  });

  if (!candidateEvidence) {
    return {
      ok: false,
      error: "Evidence payload requires non-empty label and value.",
      record: null,
      evidence: null,
      warnings: [],
    };
  }

  const db = await ensureDatabase();
  const id = makeRecordId(vendorType, brand, sku);
  const existing = db.records.find((entry) => entry.id === id) || recordSkeleton({ vendorType, brand, sku });
  const now = nowIso();
  const evidence = mergeEvidence([candidateEvidence], existing.evidence);

  const sourceUrls = dedupeStrings([
    ...existing.sourceUrls,
    candidateEvidence.sourceUrl,
  ], 8).map((item) => normalizeUrl(item)).filter(Boolean);

  const nextRecord = sanitizeRecord({
    ...existing,
    evidence,
    sourceUrls,
    confidence: Math.max(existing.confidence || 0, candidateEvidence.confidence || 0.6),
    updatedAt: now,
    lastCapturedAt: now,
    sourceType: existing.sourceType || "manual",
  }, existing);

  const nextRecords = db.records.filter((entry) => entry.id !== id);
  nextRecords.push(nextRecord);
  const next = await saveDatabase({
    ...db,
    records: nextRecords,
  });

  const stored = next.records.find((entry) => entry.id === id) || nextRecord;
  const latestEvidence = stored.evidence.find((entry) => entry.id === candidateEvidence.id) || candidateEvidence;

  return {
    ok: true,
    error: "",
    record: stored,
    evidence: latestEvidence,
    warnings: [],
    count: next.records.length,
    summary: summarizeRecords(next.records),
  };
}

function parseRequestFilters(url) {
  return {
    vendorType: url.searchParams.get("vendorType") || "",
    status: url.searchParams.get("status") || "",
    brand: url.searchParams.get("brand") || "",
    sku: url.searchParams.get("sku") || "",
    q: url.searchParams.get("q") || "",
    limit: url.searchParams.get("limit") || "",
  };
}

export async function getProductIntelligenceHealth() {
  const db = await ensureDatabase();
  const summary = summarizeRecords(db.records);
  return {
    ok: true,
    now: nowIso(),
    file: PRODUCT_INTELLIGENCE_DB_FILE,
    databaseVersion: db.version,
    generatedAt: db.generatedAt,
    updatedAt: db.updatedAt,
    summary,
  };
}


function enrichProductIntelligenceRecords(products) {
  return (Array.isArray(products) ? products : []).map((product) => {
    const classification = enrichProductClassification(product ?? {});

    return {
      ...product,
      commercialFamily: classification.commercialFamily,
      functionalRole: classification.functionalRole,
      routingClass: classification.routingClass,
      featureTags: Array.from(
        new Set([
          ...((Array.isArray(product?.featureTags) ? product.featureTags : [])),
          ...classification.featureTags,
        ]),
      ),
      applicationTags: Array.from(
        new Set([
          ...((Array.isArray(product?.applicationTags)
            ? product.applicationTags
            : Array.isArray(product?.applications)
              ? product.applications
              : [])),
          ...classification.applicationTags,
        ]),
      ),
      matrixCapable: classification.matrixCapable,
      trueMatrix: classification.trueMatrix,
      conferencingOptimised: classification.conferencingOptimised,
      distributionOptimised: classification.distributionOptimised,
      notes: classification.notes ?? product?.notes,
    };
  });
}
export async function handleProductIntelligenceGet(req, res, url, { sendJson }) {
  const auth = await requireProductIntelligenceRead(req, res, url, sendJson);
  if (!auth) return;

  try {
    const db = await ensureDatabase();
    const filters = parseRequestFilters(url);
    const filtered = filterRecords(db.records, filters);
    const enrichedRecords = enrichProductIntelligenceRecords(filtered.records);
    const enrichedSummarySource = enrichProductIntelligenceRecords(db.records);

    sendJson(res, 200, {
      ok: true,
      mode: "file-db",
      file: PRODUCT_INTELLIGENCE_DB_FILE,
      generatedAt: db.generatedAt,
      updatedAt: db.updatedAt,
      filters: {
        vendorType: sanitizeVendorType(filters.vendorType, ""),
        status: sanitizeStatus(filters.status, ""),
        brand: tidy(filters.brand) || undefined,
        sku: normalizeSku(filters.sku) || undefined,
        q: tidy(filters.q) || undefined,
        limit: filtered.limit,
      },
      total: filtered.total,
      count: enrichedRecords.length,
      records: enrichedRecords,
      summary: summarizeRecords(enrichedSummarySource),
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Product intelligence query failed.",
    });
  }
}
export async function handleProductIntelligenceHealthGet(req, res, url, { sendJson }) {
  const auth = await requireProductIntelligenceRead(req, res, url, sendJson);
  if (!auth) return;

  try {
    const health = await getProductIntelligenceHealth();
    sendJson(res, 200, health);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Product intelligence health query failed.",
    });
  }
}

export async function handleProductIntelligenceRefreshPost(req, res, url, { sendJson, parseJsonBody }) {
  const auth = await requireProductIntelligenceAdmin(req, res, url, sendJson);
  if (!auth) return;
  try {
    try {
      await parseJsonBody(req);
    } catch {
      sendJson(res, 400, {
        ok: false,
        error: "Invalid JSON body.",
      });
      return;
    }

    const refreshed = await refreshDatabase();
    sendJson(res, 200, refreshed);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Product intelligence refresh failed.",
    });
  }
}

export async function handleProductIntelligenceUpsertPost(req, res, url, { sendJson, parseJsonBody }) {
  const auth = await requireProductIntelligenceAdmin(req, res, url, sendJson);
  if (!auth) return;
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

  try {
    const result = await upsertRecord(body);
    if (!result.ok) {
      sendJson(res, 400, {
        ok: false,
        error: result.error,
        warnings: result.warnings,
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      mode: "file-db",
      file: PRODUCT_INTELLIGENCE_DB_FILE,
      count: result.count,
      record: result.record,
      warnings: result.warnings,
      summary: result.summary,
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Product intelligence upsert failed.",
    });
  }
}

export async function handleProductIntelligenceEvidencePost(req, res, url, { sendJson, parseJsonBody }) {
  const auth = await requireProductIntelligenceAdmin(req, res, url, sendJson);
  if (!auth) return;
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

  try {
    const result = await addEvidence(body);
    if (!result.ok) {
      sendJson(res, 400, {
        ok: false,
        error: result.error,
        warnings: result.warnings,
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      mode: "file-db",
      file: PRODUCT_INTELLIGENCE_DB_FILE,
      count: result.count,
      record: result.record,
      evidence: result.evidence,
      warnings: result.warnings,
      summary: result.summary,
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Product intelligence evidence update failed.",
    });
  }
}

export async function handleProductIntelligenceStatusPost(req, res, url, { sendJson, parseJsonBody }) {
  const auth = await requireProductIntelligenceAdmin(req, res, url, sendJson);
  if (!auth) return;
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

  try {
    const result = await updateStatus(body);
    if (!result.ok) {
      sendJson(res, 400, {
        ok: false,
        error: result.error,
        warnings: result.warnings,
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      mode: "file-db",
      file: PRODUCT_INTELLIGENCE_DB_FILE,
      count: result.count,
      record: result.record,
      warnings: result.warnings,
      summary: result.summary,
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Product intelligence status update failed.",
    });
  }
}
