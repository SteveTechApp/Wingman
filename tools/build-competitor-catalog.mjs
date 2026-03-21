import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const competitorSourceDir = path.join(rootDir, "src", "data", "catalog", "competitors");
const compareSeedFile = path.join(rootDir, "src", "data", "catalog", "competitor-compare.seed.json");
const legacyCompetitorFile = path.join(rootDir, "src", "competitor", "competitors.json");
const productIntelligenceFile = path.join(rootDir, "data", "product-intelligence-db.json");
const outputFile = path.join(rootDir, "src", "data", "catalog", "competitor-catalog.phase4.json");

const BRAND_NAME_BY_KEY = {
  atlona: "Atlona",
  barco: "Barco",
  blustream: "Blustream",
  bluestream: "Blustream",
  crestron: "Crestron",
  extron: "Extron",
  kramer: "Kramer",
  lightware: "Lightware",
  zeevee: "ZeeVee",
};

const BRAND_HOME_URLS = {
  atlona: "https://atlona.com/",
  barco: "https://www.barco.com/en/support",
  blustream: "https://www.blustream-us.com/",
  crestron: "https://www.crestron.com/",
  extron: "https://www.extron.com/",
  kramer: "https://www1.kramerav.com/us/",
  lightware: "https://lightware.com/",
  zeevee: "https://www.zeevee.com/",
};

const BRAND_SEARCH_URL_BUILDERS = {
  atlona: (sku) => `https://atlona.com/?s=${encodeURIComponent(sku)}`,
  barco: (_sku) => BRAND_HOME_URLS.barco,
  blustream: (sku) => `https://www.blustream-us.com/search?q=${encodeURIComponent(sku)}`,
  crestron: (sku) => `https://www.crestron.com/search-results?query=${encodeURIComponent(sku)}`,
  extron: (sku) => `https://www.extron.com/search?searchterm=${encodeURIComponent(sku)}`,
  kramer: (sku) => `https://www.kramerav.com/search?term=${encodeURIComponent(sku)}`,
  lightware: (sku) => `https://lightware.com/search?q=${encodeURIComponent(sku)}`,
  zeevee: (sku) => `https://www.zeevee.com/?s=${encodeURIComponent(sku)}`,
};

const CATEGORY_SCORES = {
  Matrix: 6,
  Switcher: 5,
  Extender: 4,
  Controller: 4,
  Audio: 3,
  Accessories: 2,
  AVoIP: 5,
  Uncategorized: 0,
  Unknown: 0,
};

const STATUS_SCORES = {
  active: 3,
  draft: 2,
  legacy: 1,
};

function tidy(value) {
  return String(value ?? "").trim();
}

function normalizeSku(value) {
  return tidy(value).toUpperCase();
}

function normalizeId(value) {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
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

function dedupePorts(values) {
  const out = [];
  const seen = new Set();

  for (const value of values) {
    const type = tidy(value?.type);
    const count = Math.max(0, Math.round(Number(value?.count) || 0));
    if (!type) continue;
    const key = `${type.toLowerCase()}::${count}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, count });
  }

  return out;
}

function canonicalBrandName(value) {
  const raw = tidy(value);
  if (!raw) return "";
  return BRAND_NAME_BY_KEY[normalizeId(raw)] || raw;
}

function brandKey(value) {
  return normalizeId(canonicalBrandName(value));
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = tidy(value);
    if (text) return text;
  }
  return "";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function urlQuality(value) {
  const raw = normalizeUrl(value);
  if (!raw) return 0;

  try {
    const parsed = new URL(raw);
    const pathText = `${parsed.hostname}${parsed.pathname}`.toLowerCase();

    if (!parsed.pathname || parsed.pathname === "/") return 1;
    if (parsed.searchParams.has("q") || parsed.searchParams.has("s") || parsed.searchParams.has("query") || parsed.searchParams.has("term") || parsed.pathname.toLowerCase().includes("/search")) {
      return 2;
    }
    if (/(product|products|model|clickshare|navigator|nav|omni|omega)/i.test(pathText)) {
      return 5;
    }
    return 3;
  } catch {
    return 0;
  }
}

function textQuality(value) {
  const text = tidy(value);
  if (!text) return 0;

  let score = Math.min(140, text.length);
  const lower = text.toLowerCase();

  if (!/(reference record|seed comparison|legacy competitor reference|placeholder)/i.test(lower)) {
    score += 18;
  }
  if (/\b4k|\b8k|\bhdmi|\busb|\bhdbaset|\bav over ip|\bmatrix|\bswitcher|\bencoder|\bdecoder|\btransmitter|\breceiver/i.test(lower)) {
    score += 14;
  }

  return score;
}

function pickBetterText(current, incoming, currentPriority, incomingPriority) {
  const currentText = tidy(current);
  const incomingText = tidy(incoming);
  if (!currentText) return incomingText;
  if (!incomingText) return currentText;

  const currentScore = textQuality(currentText) + currentPriority * 10;
  const incomingScore = textQuality(incomingText) + incomingPriority * 10;
  return incomingScore > currentScore ? incomingText : currentText;
}

function pickPreferredLabel(current, incoming, currentPriority, incomingPriority, weak = []) {
  const currentText = tidy(current);
  const incomingText = tidy(incoming);
  if (!currentText) return incomingText;
  if (!incomingText) return currentText;

  const currentWeak = weak.includes(currentText);
  const incomingWeak = weak.includes(incomingText);
  if (currentWeak && !incomingWeak) return incomingText;
  if (incomingWeak && !currentWeak) return currentText;
  if (incomingPriority > currentPriority) return incomingText;
  return currentText;
}

function pickBetterStatus(current, incoming) {
  const currentStatus = tidy(current).toLowerCase();
  const incomingStatus = tidy(incoming).toLowerCase();
  if (!currentStatus) return incomingStatus || "draft";
  if (!incomingStatus) return currentStatus;
  return (STATUS_SCORES[incomingStatus] || 0) > (STATUS_SCORES[currentStatus] || 0) ? incomingStatus : currentStatus;
}

function pickBetterUrl(current, incoming, currentPriority, incomingPriority) {
  const currentUrl = normalizeUrl(current);
  const incomingUrl = normalizeUrl(incoming);
  if (!currentUrl) return incomingUrl;
  if (!incomingUrl) return currentUrl;

  const currentScore = urlQuality(currentUrl) + currentPriority * 2;
  const incomingScore = urlQuality(incomingUrl) + incomingPriority * 2;
  return incomingScore > currentScore ? incomingUrl : currentUrl;
}

function mergeVideoProfile(current, incoming, currentPriority, incomingPriority) {
  const base = current && typeof current === "object" ? current : {};
  const next = incoming && typeof incoming === "object" ? incoming : {};
  const winnerIsIncoming = incomingPriority >= currentPriority;

  const maxResolution = pickBetterText(base.maxResolution, next.maxResolution, currentPriority, incomingPriority);
  const hdmi = pickPreferredLabel(base.hdmi, next.hdmi, currentPriority, incomingPriority, [""]);
  const bandwidthGbps = winnerIsIncoming
    ? Number(next.bandwidthGbps) || Number(base.bandwidthGbps) || undefined
    : Number(base.bandwidthGbps) || Number(next.bandwidthGbps) || undefined;
  const hdr = typeof next.hdr === "boolean"
    ? next.hdr
    : typeof base.hdr === "boolean"
      ? base.hdr
      : undefined;

  if (!maxResolution && !hdmi && bandwidthGbps == null && hdr == null) return undefined;
  return {
    maxResolution: maxResolution || undefined,
    hdmi: hdmi || undefined,
    bandwidthGbps,
    hdr,
  };
}

function normalizeCategory(value) {
  const raw = tidy(value);
  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (/\bmatrix\b/.test(lower)) return "Matrix";
  if (/\bav over ip\b|\bavoip\b/.test(lower)) return "AVoIP";
  if (/\bswitcher\b/.test(lower)) return "Switcher";
  if (/\bcontroller\b|\bmanager\b/.test(lower)) return "Controller";
  if (/\bdongle\b|\bbutton\b|\baccessor/.test(lower)) return "Accessories";
  if (/\bsoundbar\b|\baudio\b|\bspeaker\b|\bmicrophone\b/.test(lower)) return "Audio";
  if (/\bencoder\b|\bdecoder\b|\btransmitter\b|\breceiver\b|\bextender\b|\bhdbaset\b/.test(lower)) return "Extender";
  return raw;
}

function inferTransport(text) {
  const blob = tidy(text).toLowerCase();
  if (!blob) return "";
  if (/\bhdbaset\b|\bdtp\b/.test(blob)) return "HDBaseT";
  if (/\bav over ip\b|\bavoip\b|\bnetworkhd\b|\bnvx\b|\bnav\b|\bomni/.test(blob)) return "AVoIP";
  if (/\bwireless\b|\bclickshare\b/.test(blob)) return "Wireless";
  if (/\busb\b|\bkvm\b/.test(blob)) return "USB";
  if (/\bmatrix\b|\bswitcher\b/.test(blob)) return "Local";
  return "";
}

function inferFamily(brand, sku, category, summary, features = []) {
  const brandName = canonicalBrandName(brand);
  const rawSku = normalizeSku(sku);
  const blob = `${brandName} ${rawSku} ${tidy(category)} ${tidy(summary)} ${features.join(" ")}`.toLowerCase();

  if (brandKey(brandName) === "atlona") {
    if (rawSku.includes("OME")) return "Omega";
    if (rawSku.includes("OMNI")) return "OmniStream";
  }
  if (brandKey(brandName) === "barco" && /clickshare/.test(blob)) return "ClickShare";
  if (brandKey(brandName) === "crestron" && rawSku.includes("NVX")) return "DM NVX";
  if (brandKey(brandName) === "extron") {
    if (rawSku.startsWith("NAV")) return "NAV";
    if (rawSku.startsWith("DTP")) return "DTP";
    if (rawSku.startsWith("IN")) return "IN";
  }
  if (brandKey(brandName) === "lightware" && rawSku.startsWith("TPX")) return "TPX";
  if (brandKey(brandName) === "blustream" && rawSku.startsWith("IP")) return "IP";

  const normalizedCategory = normalizeCategory(category);
  if (normalizedCategory === "AVoIP") return "AVoIP";
  if (normalizedCategory === "Matrix") return "Matrix";
  if (normalizedCategory === "Switcher") return "Switcher";
  if (normalizedCategory === "Extender") return "Extension";
  return "Unknown";
}

function sourceUrlFor(brand, sku) {
  const key = brandKey(brand);
  const normalizedSku = normalizeSku(sku);
  const builder = BRAND_SEARCH_URL_BUILDERS[key];
  const url = builder ? builder(normalizedSku) : BRAND_HOME_URLS[key];
  return normalizeUrl(url);
}

function combineNotes(...values) {
  const notes = dedupeStrings(
    values.flatMap((value) => {
      if (Array.isArray(value)) return value;
      return tidy(value) ? [value] : [];
    }),
    12,
  );
  return notes.join(" | ");
}

function normalizePrimaryCatalogRecord(record, sourceName) {
  const brand = canonicalBrandName(record.brand);
  const sku = normalizeSku(record.sku);
  const name = tidy(record.name);
  const category = tidy(record.category);
  const status = tidy(record.status).toLowerCase();
  const sourceUrl = normalizeUrl(record.sourceUrl);

  if (!brand) throw new Error(`${sourceName}: missing brand`);
  if (!sku) throw new Error(`${sourceName}: missing sku`);
  if (!name) throw new Error(`${sourceName}: missing name`);
  if (!category) throw new Error(`${sourceName}: missing category`);
  if (!STATUS_SCORES[status]) throw new Error(`${sourceName}: invalid status "${status}"`);
  if (!sourceUrl) throw new Error(`${sourceName}: missing sourceUrl`);

  return {
    brand,
    sku,
    name,
    family: tidy(record.family) || inferFamily(brand, sku, category, record.summary, toArray(record.features)),
    category,
    subcategory: tidy(record.subcategory) || undefined,
    status,
    summary: tidy(record.summary) || `${sku} competitor reference record.`,
    sourceUrl,
    transport: tidy(record.transport) || inferTransport(`${category} ${record.summary} ${toArray(record.features).join(" ")}`) || undefined,
    latency: tidy(record.latency) || undefined,
    inputs: dedupePorts(toArray(record.inputs)),
    outputs: dedupePorts(toArray(record.outputs)),
    control: dedupeStrings(toArray(record.control), 16),
    audio: dedupeStrings(toArray(record.audio), 16),
    video: mergeVideoProfile(undefined, record.video, 0, 4),
    features: dedupeStrings(toArray(record.features), 24),
    notes: tidy(record.notes) || undefined,
    priority: 4,
  };
}

function normalizeCompareSeedRecord(record, sourceName) {
  const brand = canonicalBrandName(record.brand);
  const sku = normalizeSku(record.competitorSku);
  if (!brand || !sku) return null;

  const categoryDetail = firstNonEmpty(record.category, "Competitor");
  const category = normalizeCategory(categoryDetail) || "Uncategorized";
  const summary = tidy(record.summary) || `${sku} comparison seed record.`;
  const features = dedupeStrings([
    ...toArray(record.features),
    ...toArray(record.recommendedFamilies),
  ], 24);

  return {
    brand,
    sku,
    name: firstNonEmpty(record.name, categoryDetail, sku),
    family: inferFamily(brand, sku, categoryDetail, summary, features),
    category,
    subcategory: category !== categoryDetail ? categoryDetail : undefined,
    status: "draft",
    summary,
    sourceUrl: sourceUrlFor(brand, sku),
    transport: inferTransport(`${categoryDetail} ${summary} ${features.join(" ")}`) || undefined,
    latency: undefined,
    inputs: [],
    outputs: [],
    control: [],
    audio: [],
    video: undefined,
    features,
    notes: combineNotes(record.rationale, record.notes, `${sourceName} merged into deployed competitor catalog.`) || undefined,
    priority: 2,
  };
}

function normalizeLegacyCompetitorRecord(record, sourceName) {
  const brand = canonicalBrandName(record.brand);
  const sku = normalizeSku(record.sku || record.model);
  if (!brand || !sku) return null;

  const categoryDetail = firstNonEmpty(record.category, "Competitor");
  const category = normalizeCategory(categoryDetail) || "Uncategorized";
  const features = dedupeStrings([
    ...toArray(record.tags),
    ...toArray(record.features),
  ], 24);

  return {
    brand,
    sku,
    name: firstNonEmpty(record.name, record.model, sku),
    family: inferFamily(brand, sku, categoryDetail, record.summary, features),
    category,
    subcategory: category !== categoryDetail ? categoryDetail : undefined,
    status: "legacy",
    summary: tidy(record.summary) || `${firstNonEmpty(record.name, sku)} legacy competitor reference record.`,
    sourceUrl: sourceUrlFor(brand, sku),
    transport: inferTransport(`${categoryDetail} ${features.join(" ")}`) || undefined,
    latency: undefined,
    inputs: [],
    outputs: [],
    control: [],
    audio: [],
    video: mergeVideoProfile(undefined, record.video, 0, 1),
    features,
    notes: combineNotes(record.notes, `${sourceName} merged into deployed competitor catalog.`) || undefined,
    priority: 1,
  };
}

function normalizeProductIntelligenceRecord(record, sourceName) {
  const brand = canonicalBrandName(record.brand);
  const sku = normalizeSku(record.sku);
  if (!brand || !sku) return null;

  const rawCategory = firstNonEmpty(record.category, "Competitor");
  const category = normalizeCategory(rawCategory) || "Uncategorized";
  const mappedStatus = tidy(record.status).toLowerCase() === "approved"
    ? "active"
    : tidy(record.status).toLowerCase() === "expired"
      ? "legacy"
      : "draft";

  return {
    brand,
    sku,
    name: firstNonEmpty(record.name, sku),
    family: firstNonEmpty(record.family, inferFamily(brand, sku, rawCategory, record.summary, toArray(record.features))),
    category,
    subcategory: category !== rawCategory ? rawCategory : undefined,
    status: mappedStatus,
    summary: tidy(record.summary) || `${sku} product intelligence record.`,
    sourceUrl: normalizeUrl(toArray(record.sourceUrls)[0]) || sourceUrlFor(brand, sku),
    transport: firstNonEmpty(record.transport, inferTransport(`${rawCategory} ${record.summary} ${toArray(record.features).join(" ")}`)) || undefined,
    latency: tidy(record.latency) || undefined,
    inputs: dedupePorts(toArray(record.inputs)),
    outputs: dedupePorts(toArray(record.outputs)),
    control: dedupeStrings(toArray(record.control), 16),
    audio: dedupeStrings(toArray(record.audio), 16),
    video: mergeVideoProfile(undefined, record.video, 0, 3),
    distanceMeters: Number(record.distanceMeters) || undefined,
    technology: tidy(record.technology) || undefined,
    topology: tidy(record.topology) || undefined,
    role: tidy(record.role) || undefined,
    directionality: tidy(record.directionality) || undefined,
    features: dedupeStrings(toArray(record.features), 24),
    notes: combineNotes(record.notes, `${sourceName} merged into deployed competitor catalog.`) || undefined,
    priority: 3,
  };
}

function mergeCatalogRecords(current, incoming) {
  if (!current) return incoming;

  const mergedPriority = Math.max(current.priority, incoming.priority);
  const category = pickPreferredLabel(
    current.category,
    incoming.category,
    current.priority + (CATEGORY_SCORES[current.category] || 0),
    incoming.priority + (CATEGORY_SCORES[incoming.category] || 0),
    ["Unknown", "Uncategorized"],
  );

  return {
    brand: current.brand,
    sku: current.sku,
    name: pickBetterText(current.name, incoming.name, current.priority, incoming.priority),
    family: pickPreferredLabel(current.family, incoming.family, current.priority, incoming.priority, ["Unknown"]),
    category,
    subcategory: pickPreferredLabel(current.subcategory, incoming.subcategory, current.priority, incoming.priority, [""]),
    status: pickBetterStatus(current.status, incoming.status),
    summary: pickBetterText(current.summary, incoming.summary, current.priority, incoming.priority),
    sourceUrl: pickBetterUrl(current.sourceUrl, incoming.sourceUrl, current.priority, incoming.priority),
    transport: pickPreferredLabel(current.transport, incoming.transport, current.priority, incoming.priority, [""]),
    latency: pickPreferredLabel(current.latency, incoming.latency, current.priority, incoming.priority, [""]),
    inputs: dedupePorts([...current.inputs, ...incoming.inputs]),
    outputs: dedupePorts([...current.outputs, ...incoming.outputs]),
    control: dedupeStrings([...current.control, ...incoming.control], 16),
    audio: dedupeStrings([...current.audio, ...incoming.audio], 16),
    video: mergeVideoProfile(current.video, incoming.video, current.priority, incoming.priority),
    distanceMeters: Number(current.distanceMeters) || Number(incoming.distanceMeters) || undefined,
    technology: pickPreferredLabel(current.technology, incoming.technology, current.priority, incoming.priority, [""]),
    topology: pickPreferredLabel(current.topology, incoming.topology, current.priority, incoming.priority, [""]),
    role: pickPreferredLabel(current.role, incoming.role, current.priority, incoming.priority, ["UNKNOWN"]),
    directionality: pickPreferredLabel(current.directionality, incoming.directionality, current.priority, incoming.priority, [""]),
    features: dedupeStrings([...current.features, ...incoming.features], 24),
    notes: combineNotes(current.notes, incoming.notes) || undefined,
    priority: mergedPriority,
  };
}

function toCatalogOutput(record) {
  const output = {
    sku: record.sku,
    name: record.name,
    brand: record.brand,
    family: record.family,
    category: record.category,
    subcategory: record.subcategory,
    status: record.status,
    summary: record.summary,
    sourceUrl: record.sourceUrl,
    inputs: record.inputs,
    outputs: record.outputs,
    control: record.control,
    audio: record.audio,
    video: record.video,
    transport: record.transport,
    latency: record.latency,
    distance: record.distance || (record.distanceMeters != null ? { meters: Number(record.distanceMeters) } : undefined),
    technology: record.technology,
    topology: record.topology,
    role: record.role,
    directionality: record.directionality,
    features: record.features,
    notes: record.notes,
  };

  return Object.fromEntries(
    Object.entries(output).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") return Object.keys(value).length > 0;
      return value != null && value !== "";
    }),
  );
}

function recordKey(record) {
  return `${brandKey(record.brand)}::${normalizeSku(record.sku)}`;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function buildMergedCatalog() {
  const files = fs.readdirSync(competitorSourceDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No competitor source files found in ${competitorSourceDir}`);
  }

  const merged = new Map();
  let overlapCount = 0;
  const sourceBreakdown = new Map();

  function ingestRows(rows, sourceLabel, mapper) {
    for (const [index, rawRecord] of rows.entries()) {
      const record = mapper(rawRecord, `${sourceLabel}#${index + 1}`);
      if (!record) continue;

      const key = recordKey(record);
      const existing = merged.get(key);
      if (existing) overlapCount += 1;
      merged.set(key, mergeCatalogRecords(existing, record));
      sourceBreakdown.set(sourceLabel, (sourceBreakdown.get(sourceLabel) || 0) + 1);
    }
  }

  for (const file of files) {
    const filePath = path.join(competitorSourceDir, file);
    const rows = readJson(filePath, []);
    if (!Array.isArray(rows)) {
      throw new Error(`${file}: expected an array of competitor records`);
    }
    ingestRows(rows, file, normalizePrimaryCatalogRecord);
  }

  ingestRows(readJson(compareSeedFile, []), "competitor-compare.seed.json", normalizeCompareSeedRecord);
  ingestRows(readJson(legacyCompetitorFile, []), "src/competitor/competitors.json", normalizeLegacyCompetitorRecord);

  const productIntelligence = readJson(productIntelligenceFile, { records: [] });
  const productRecords = toArray(productIntelligence.records)
    .filter((record) => normalizeId(record.vendorType) === "competitor" && !record.archived);
  ingestRows(productRecords, "data/product-intelligence-db.json", normalizeProductIntelligenceRecord);

  const rows = Array.from(merged.values())
    .map((record) => toCatalogOutput(record))
    .sort((left, right) => {
      const brandCmp = left.brand.localeCompare(right.brand);
      if (brandCmp !== 0) return brandCmp;
      const familyCmp = String(left.family || "").localeCompare(String(right.family || ""));
      if (familyCmp !== 0) return familyCmp;
      return left.sku.localeCompare(right.sku);
    });

  return {
    rows,
    overlapCount,
    sourceBreakdown,
  };
}

function dedupeEvidence(entries) {
  const out = [];
  const seen = new Set();

  for (const entry of entries) {
    const label = tidy(entry?.label);
    const value = tidy(entry?.value);
    if (!label || !value) continue;
    const fingerprint = `${normalizeId(entry?.type)}|${normalizeId(label)}|${normalizeId(value)}|${normalizeId(entry?.sourceUrl)}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    out.push(entry);
  }

  return out.slice(0, 80);
}

function buildTags(record) {
  return dedupeStrings([
    normalizeId(record.family),
    normalizeId(record.category),
    normalizeId(record.transport),
    ...toArray(record.features).map((value) => normalizeId(value)),
  ], 20);
}

function buildEvidence(record, capturedAt) {
  const sourceUrl = normalizeUrl(record.sourceUrl) || sourceUrlFor(record.brand, record.sku);
  const evidence = [];

  if (tidy(record.summary)) {
    evidence.push({
      id: `${normalizeId(record.sku)}-summary`,
      type: "spec",
      label: "Catalog Summary",
      value: tidy(record.summary),
      sourceUrl,
      capturedAt,
      confidence: record.status === "active" ? 0.76 : 0.68,
      notes: "Derived from deployed competitor catalog.",
    });
  }

  if (toArray(record.features).length > 0) {
    evidence.push({
      id: `${normalizeId(record.sku)}-features`,
      type: "io",
      label: "Catalog Features",
      value: toArray(record.features).join("; "),
      sourceUrl,
      capturedAt,
      confidence: record.status === "active" ? 0.74 : 0.66,
      notes: "Derived from deployed competitor catalog.",
    });
  }

  return evidence;
}

function syncProductIntelligenceDatabase(catalogRows) {
  const capturedAt = new Date().toISOString();
  const existing = readJson(productIntelligenceFile, {
    version: 1,
    generatedAt: capturedAt,
    updatedAt: capturedAt,
    records: [],
  });

  const existingRecords = toArray(existing.records);
  const existingById = new Map();

  for (const record of existingRecords) {
    const id = tidy(record.id);
    if (!id) continue;
    existingById.set(id, record);
  }

  const nextCompetitorIds = new Set();
  const nextCompetitorRecords = catalogRows.map((record) => {
    const id = `competitor::${brandKey(record.brand)}::${normalizeSku(record.sku)}`;
    nextCompetitorIds.add(id);

    const current = existingById.get(id) || {};
    const sourceUrls = dedupeStrings([
      normalizeUrl(record.sourceUrl),
      ...toArray(current.sourceUrls).map((value) => normalizeUrl(value)),
    ], 8).filter(Boolean);
    const evidence = dedupeEvidence([
      ...buildEvidence(record, capturedAt),
      ...toArray(current.evidence),
    ]);

    return {
      ...current,
      id,
      vendorType: "competitor",
      brand: record.brand,
      sku: normalizeSku(record.sku),
      name: tidy(record.name) || normalizeSku(record.sku),
      family: tidy(record.family) || "Unknown",
      category: tidy(record.category) || tidy(record.family) || "Uncategorized",
      summary: tidy(record.summary) || `${normalizeSku(record.sku)} reference record.`,
      features: dedupeStrings([
        ...toArray(record.features),
        ...toArray(current.features),
      ], 24),
      transport: firstNonEmpty(record.transport, current.transport) || undefined,
      inputs: dedupePorts([
        ...toArray(record.inputs),
        ...toArray(current.inputs),
      ]),
      outputs: dedupePorts([
        ...toArray(record.outputs),
        ...toArray(current.outputs),
      ]),
      control: dedupeStrings([
        ...toArray(record.control),
        ...toArray(current.control),
      ], 16),
      audio: dedupeStrings([
        ...toArray(record.audio),
        ...toArray(current.audio),
      ], 16),
      video: mergeVideoProfile(current.video, record.video, 3, 4),
      distanceMeters: Number(record.distanceMeters) || Number(current.distanceMeters) || undefined,
      status: tidy(current.status).toLowerCase() || "draft",
      confidence: Math.max(Number(current.confidence) || 0, record.status === "active" ? 0.76 : 0.68),
      sourceType: tidy(current.sourceType) === "manual" ? "manual" : "catalog",
      sourceUrls,
      tags: dedupeStrings([
        ...buildTags(record),
        ...toArray(current.tags),
      ], 20),
      notes: pickBetterText(current.notes, record.notes, 3, 4) || undefined,
      createdAt: tidy(current.createdAt) || capturedAt,
      updatedAt: capturedAt,
      lastCapturedAt: capturedAt,
      lastReviewedAt: tidy(current.lastReviewedAt) || undefined,
      reviewedBy: tidy(current.reviewedBy) || undefined,
      evidence,
      reviewFlags: toArray(current.reviewFlags),
      archived: Boolean(current.archived),
    };
  });

  const preservedRecords = existingRecords.filter((record) => {
    if (normalizeId(record.vendorType) !== "competitor") return true;
    const id = tidy(record.id);
    return !nextCompetitorIds.has(id);
  });

  const mergedRecords = [...preservedRecords, ...nextCompetitorRecords]
    .sort((left, right) => {
      const vendorCmp = tidy(left.vendorType).localeCompare(tidy(right.vendorType));
      if (vendorCmp !== 0) return vendorCmp;
      const brandCmp = tidy(left.brand).localeCompare(tidy(right.brand));
      if (brandCmp !== 0) return brandCmp;
      return normalizeSku(left.sku).localeCompare(normalizeSku(right.sku));
    });

  const payload = {
    version: 1,
    generatedAt: tidy(existing.generatedAt) || capturedAt,
    updatedAt: capturedAt,
    records: mergedRecords,
  };

  fs.writeFileSync(productIntelligenceFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return nextCompetitorRecords.length;
}

function main() {
  const { rows, overlapCount, sourceBreakdown } = buildMergedCatalog();
  fs.writeFileSync(outputFile, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  const syncedCount = syncProductIntelligenceDatabase(rows);

  const counts = rows.reduce((acc, row) => {
    acc[row.brand] = (acc[row.brand] || 0) + 1;
    return acc;
  }, {});

  console.log(`Built competitor catalog with ${rows.length} deployed records.`);
  console.log(`Merged ${overlapCount} overlapping source rows into the canonical catalog.`);
  console.log(`Synced ${syncedCount} competitor records into product intelligence storage.`);
  console.log("Source intake:");
  for (const [source, count] of [...sourceBreakdown.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    console.log(`- ${source}: ${count}`);
  }
  console.log("Brand totals:");
  for (const brand of Object.keys(counts).sort()) {
    console.log(`- ${brand}: ${counts[brand]}`);
  }
}

main();
