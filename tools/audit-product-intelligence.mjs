import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
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

function dedupeStrings(values, limit = 24) {
  const out = [];
  const seen = new Set();

  for (const value of values || []) {
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

function portArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      type: tidy(entry?.type),
      count: Math.max(0, Number(entry?.count) || 0),
    }))
    .filter((entry) => entry.type && entry.count >= 0);
}

function pickVideoProfile(text) {
  const normalized = text.toLowerCase();
  const hasHdr = /\bhdr\b|dolby vision/i.test(text);

  let maxResolution = "";
  if (normalized.includes("8k")) maxResolution = "8K";
  else if (normalized.includes("4k60")) maxResolution = normalized.includes("444") ? "4K60 4:4:4" : "4K60";
  else if (normalized.includes("4k30")) maxResolution = "4K30";
  else if (normalized.includes("4k")) maxResolution = "4K";
  else if (normalized.includes("1080p")) maxResolution = "1080p";

  if (!maxResolution && !hasHdr) return undefined;

  return {
    maxResolution: maxResolution || undefined,
    hdr: hasHdr || undefined,
  };
}

function pickDistance(text) {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*m(?:\/|\b)/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 1000);

  if (matches.length === 0) return undefined;

  return {
    meters: Math.max(...matches),
  };
}

function normalizePortType(value) {
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  if (normalized === "dp") return "DisplayPort";
  if (normalized === "usbc") return "USB-C";
  if (normalized === "rj45" || normalized === "lan" || normalized === "ethernet") return "RJ45";
  if (normalized === "mic" || normalized === "mics") return "Mic";
  return value.toUpperCase() === "HDMI" ? "HDMI" : tidy(value);
}

function pickPorts(text) {
  const inputs = [];
  const outputs = [];
  const pattern = /(\d+)\s*(?:x)?\s*(hdmi|usb-c|usb|displayport|dp|rj45|lan|ethernet|mic|mics|audio)\s*(input|inputs|output|outputs)\b/gi;

  for (const match of text.matchAll(pattern)) {
    const count = Math.max(0, Number(match[1]) || 0);
    const type = normalizePortType(match[2]);
    const direction = match[3].toLowerCase();
    const target = direction.startsWith("input") ? inputs : outputs;
    target.push({ type, count });
  }

  return { inputs, outputs };
}

function pickTransport(familyCode, text) {
  const normalizedFamily = tidy(familyCode).toUpperCase();
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("hdbaset") || /^EX|^TX|^RX/.test(normalizedFamily)) return "HDBaseT";
  if (
    normalizedText.includes("networkhd") ||
    normalizedText.includes("avoip") ||
    normalizedText.includes("multiview") ||
    normalizedText.includes("dante")
  ) {
    return "AVoIP";
  }
  if (normalizedText.includes("usb")) return "USB Extension";
  if (
    normalizedText.includes("switcher") ||
    normalizedText.includes("matrix") ||
    normalizedText.includes("dock") ||
    normalizedText.includes("dongle")
  ) {
    return "Local";
  }
  return "";
}

function inferVendorType(vendorType, brand) {
  if (vendorType === "wyrestorm" || vendorType === "competitor") return vendorType;
  return normalizeId(brand) === "wyrestorm" ? "wyrestorm" : "competitor";
}

function hasVideo(video) {
  return Boolean(
    video &&
    (
      tidy(video.maxResolution) ||
      tidy(video.maxFramerate) ||
      tidy(video.hdmiVersion) ||
      tidy(video.hdcpVersion) ||
      Number.isFinite(Number(video.bandwidthGbps)) ||
      typeof video.hdr === "boolean" ||
      typeof video.scaling === "boolean" ||
      typeof video.multiview === "boolean"
    ),
  );
}

function hasDistance(distance) {
  return Boolean(
    distance &&
    (
      Number.isFinite(Number(distance.meters)) ||
      Number.isFinite(Number(distance.meters4k)) ||
      Number.isFinite(Number(distance.meters1080p)) ||
      tidy(distance.hdbasetClass) ||
      tidy(distance.networkSpeed) ||
      tidy(distance.codec) ||
      tidy(distance.notes)
    ),
  );
}

function hasUsb(usb) {
  return Boolean(
    usb &&
    (
      usb.passthrough ||
      usb.usbCVideoInput ||
      usb.kvmSupport ||
      usb.peripheralSwitching ||
      Number(usb.usbCChargingWatts) > 0 ||
      Number(usb.hostPorts) > 0 ||
      Number(usb.devicePorts) > 0
    ),
  );
}

function hasWireless(wireless) {
  return Boolean(
    wireless &&
    (
      wireless.airplay ||
      wireless.miracast ||
      wireless.wirelessPresentation ||
      wireless.wirelessConference ||
      wireless.mst ||
      wireless.byod ||
      wireless.byom
    ),
  );
}

function hasIntegration(integration) {
  return Boolean(
    integration &&
    (
      integration.rs232 ||
      integration.ir ||
      integration.lanControl ||
      integration.webUi ||
      integration.cec ||
      integration.poe ||
      integration.poePd ||
      Number(integration.relayCount) > 0 ||
      Number(integration.gpioCount) > 0
    ),
  );
}

function hasAudio(audio) {
  return Array.isArray(audio) && audio.length > 0;
}

function normalizeRecord(record) {
  const brand = tidy(record.brand) || (inferVendorType(record.vendorType, record.brand) === "wyrestorm" ? "WyreStorm" : "Unknown");
  const sku = normalizeSku(record.sku);
  const vendorType = inferVendorType(record.vendorType, brand);
  return {
    id: `${vendorType}::${normalizeId(brand)}::${sku}`,
    vendorType,
    brand,
    sku,
    name: tidy(record.name) || sku,
    family: tidy(record.family) || "Unknown",
    group: tidy(record.group) || "",
    category: tidy(record.category) || "",
    subcategory: tidy(record.subcategory) || "",
    summary: tidy(record.summary) || "",
    technology: tidy(record.technology) || "",
    topology: tidy(record.topology) || "",
    role: tidy(record.role) || "",
    directionality: tidy(record.directionality) || "",
    outputBehavior: tidy(record.outputBehavior) || "",
    transport: tidy(record.transport) || "",
    inputs: portArray(record.inputs),
    outputs: portArray(record.outputs),
    video: record.video || undefined,
    distance: record.distance || (Number.isFinite(Number(record.distanceMeters)) ? { meters: Number(record.distanceMeters) } : undefined),
    usb: record.usb || undefined,
    wireless: record.wireless || undefined,
    integration: record.integration || undefined,
    power: record.power || undefined,
    sourceUrls: dedupeStrings(record.sourceUrls || []),
    features: dedupeStrings(record.features || []),
    control: dedupeStrings(record.control || []),
    audio: dedupeStrings(record.audio || []),
    tags: dedupeStrings(record.tags || []),
    evidence: Array.isArray(record.evidence) ? record.evidence : [],
  };
}

function mergeRecordPair(base, incoming) {
  const next = incoming || {};
  const prev = base || {};
  return normalizeRecord({
    ...prev,
    ...next,
    vendorType: next.vendorType || prev.vendorType,
    brand: next.brand || prev.brand,
    sku: next.sku || prev.sku,
    name: next.name || prev.name,
    family: next.family || prev.family,
    category: next.category || prev.category,
    summary: next.summary || prev.summary,
    technology: next.technology || prev.technology,
    topology: next.topology || prev.topology,
    role: next.role || prev.role,
    outputBehavior: next.outputBehavior || prev.outputBehavior,
    transport: next.transport || prev.transport,
    inputs: Array.isArray(next.inputs) && next.inputs.length > 0 ? next.inputs : prev.inputs,
    outputs: Array.isArray(next.outputs) && next.outputs.length > 0 ? next.outputs : prev.outputs,
    video: hasVideo(next.video) ? next.video : prev.video,
    distance: hasDistance(next.distance) ? next.distance : prev.distance,
    usb: hasUsb(next.usb) ? next.usb : prev.usb,
    wireless: hasWireless(next.wireless) ? next.wireless : prev.wireless,
    integration: hasIntegration(next.integration) ? next.integration : prev.integration,
    power: next.power || prev.power,
    sourceUrls: dedupeStrings([...(prev.sourceUrls || []), ...(next.sourceUrls || [])]),
    features: dedupeStrings([...(prev.features || []), ...(next.features || [])]),
    control: dedupeStrings([...(prev.control || []), ...(next.control || [])]),
    audio: dedupeStrings([...(prev.audio || []), ...(next.audio || [])]),
  });
}

function recordText(record) {
  return [
    record.summary,
    record.subcategory,
    ...(record.features || []),
    ...(record.control || []),
    ...(record.audio || []),
  ].join(" ").toLowerCase();
}

function isCompareVideoCategory(record) {
  const category = tidy(record.category).toLowerCase();
  return new Set([
    "matrix",
    "avoip",
    "extender",
    "distribution",
    "presentation switcher",
    "video wall",
    "camera",
  ]).has(category);
}

function isWirelessPresentation(record) {
  const category = tidy(record.category).toLowerCase();
  return category === "wireless presentation" || tidy(record.role).toLowerCase() === "dongle";
}

function isUcProduct(record) {
  return tidy(record.category).toLowerCase() === "uc";
}

function isAudioProduct(record) {
  return tidy(record.category).toLowerCase() === "audio";
}

function isControlProduct(record) {
  return tidy(record.category).toLowerCase() === "control";
}

function isAccessoryProduct(record) {
  const category = tidy(record.category).toLowerCase();
  const topology = tidy(record.topology).toLowerCase();
  const role = tidy(record.role).toLowerCase();
  return category === "accessory" || category === "cable" || role === "hub" || role === "accessory" || topology === "pass-through module";
}

function requiresDistance(record) {
  const transport = tidy(record.transport).toLowerCase();
  return transport === "hdbaset" || transport === "avoip" || transport === "usb extension" || transport === "ip extension";
}

function completenessChecks(record) {
  const text = recordText(record);
  const checks = [
    Boolean(tidy(record.brand)),
    Boolean(tidy(record.sku)),
    Boolean(tidy(record.name)),
    Boolean(tidy(record.family)),
    Boolean(tidy(record.category)),
    Boolean(tidy(record.summary)),
    Boolean(tidy(record.technology)),
    Boolean(tidy(record.topology)),
    Boolean(tidy(record.role)),
    Boolean(tidy(record.outputBehavior)),
    Boolean(tidy(record.transport)),
    Array.isArray(record.sourceUrls) && record.sourceUrls.length > 0,
  ];

  if (isCompareVideoCategory(record)) {
    checks.push(Array.isArray(record.inputs) && record.inputs.length > 0);
    checks.push(Array.isArray(record.outputs) && record.outputs.length > 0);
    checks.push(hasVideo(record.video));
    if (requiresDistance(record)) checks.push(hasDistance(record.distance));
    return checks;
  }

  if (isWirelessPresentation(record)) {
    checks.push(
      (Array.isArray(record.inputs) && record.inputs.length > 0) ||
      hasUsb(record.usb) ||
      /\busb-c\b|\bhdmi\b/.test(text),
    );
    checks.push(hasWireless(record.wireless) || /\bwireless\b|\bairplay\b|\bmiracast\b/.test(text));
    checks.push(hasVideo(record.video) || /\b4k\b|\b1080p\b/.test(text));
    return checks;
  }

  if (isUcProduct(record)) {
    checks.push(
      (Array.isArray(record.inputs) && record.inputs.length > 0) ||
      (Array.isArray(record.outputs) && record.outputs.length > 0) ||
      hasUsb(record.usb),
    );
    checks.push(hasVideo(record.video) || /\bcamera\b|\b4k\b/.test(text));
    checks.push(hasAudio(record.audio) || /\bspeaker\b|\bmic\b|\baec\b|\bagc\b/.test(text));
    checks.push(hasWireless(record.wireless) || hasUsb(record.usb) || /\bairplay\b|\bmiracast\b|\bwireless\b/.test(text));
    return checks;
  }

  if (isAudioProduct(record)) {
    checks.push(hasAudio(record.audio) || /\baudio\b|\bmicrophone\b|\bmic\b|\bmixer\b|\bspeaker\b/.test(text));
    checks.push(
      (Array.isArray(record.inputs) && record.inputs.length > 0) ||
      (Array.isArray(record.outputs) && record.outputs.length > 0) ||
      hasIntegration(record.integration) ||
      (Array.isArray(record.control) && record.control.length > 0),
    );
    return checks;
  }

  if (isControlProduct(record)) {
    checks.push((Array.isArray(record.control) && record.control.length > 0) || hasIntegration(record.integration));
    checks.push(
      (Array.isArray(record.inputs) && record.inputs.length > 0) ||
      (Array.isArray(record.outputs) && record.outputs.length > 0) ||
      hasIntegration(record.integration),
    );
    return checks;
  }

  if (isAccessoryProduct(record)) {
    checks.push(
      (Array.isArray(record.inputs) && record.inputs.length > 0) ||
      (Array.isArray(record.outputs) && record.outputs.length > 0) ||
      hasUsb(record.usb),
    );
    if (tidy(record.role).toLowerCase() === "hub") checks.push(hasUsb(record.usb) || (Array.isArray(record.outputs) && record.outputs.some((entry) => /usb/i.test(entry.type))));
    return checks;
  }

  checks.push(Array.isArray(record.inputs) && record.inputs.length > 0);
  checks.push(Array.isArray(record.outputs) && record.outputs.length > 0);
  if (hasVideo(record.video)) checks.push(true);
  else if (/\b4k\b|\b8k\b|\b1080p\b/.test(text)) checks.push(true);
  else checks.push(false);
  if (requiresDistance(record)) checks.push(hasDistance(record.distance));
  return checks;
}

function completenessScore(record) {
  const checks = completenessChecks(record);
  const filled = checks.filter(Boolean).length;
  return Number(((filled / Math.max(1, checks.length)) * 100).toFixed(1));
}

function toWyrestormSeedRecord(row) {
  const sku = normalizeSku(row.sku);
  if (!sku) return null;

  const description = tidy(row.description || row.summary || row.name);
  const ports = pickPorts(description);
  const summary = tidy(row.summary) || tidy(row.name) || description || `${sku} reference record.`;

  return normalizeRecord({
    vendorType: "wyrestorm",
    brand: "WyreStorm",
    sku,
    name: tidy(row.name) || summary,
    family: tidy(row.family) || "Unknown",
    category: tidy(row.category),
    summary,
    inputs: Array.isArray(row.inputs) && row.inputs.length > 0 ? row.inputs : ports.inputs,
    outputs: Array.isArray(row.outputs) && row.outputs.length > 0 ? row.outputs : ports.outputs,
    control: Array.isArray(row.control) ? row.control : (/\bcec\b|\brs-?232\b|\bir\b|\bweb ui\b/i.test(description) ? ["Control"] : []),
    audio: Array.isArray(row.audio) ? row.audio : (/\baudio\b|\bspeaker\b|\bmic\b|\bdsp\b|\bdante\b/i.test(description) ? ["Audio"] : []),
    video: row.video || pickVideoProfile(description),
    transport: tidy(row.transport) || pickTransport(row.family, description),
    distance: row.distance || pickDistance(description),
    features: Array.isArray(row.features) ? row.features : [],
    sourceUrls: Array.isArray(row.sourceUrls) ? row.sourceUrls : [],
  });
}

const wyrestormPhase1 = readJson("src/data/catalog/wyrestorm-catalog.phase1.json");
const wyrestormMaster = readJson("src/data/wyrestormSkuCatalog.2026.json");
const competitorCatalog = readJson("src/data/catalog/competitor-catalog.phase4.json");
const productIntelligenceDb = readJson("data/product-intelligence-db.json");

const seedMerged = new Map();

for (const row of Array.isArray(wyrestormPhase1) ? wyrestormPhase1 : []) {
  const record = toWyrestormSeedRecord(row);
  if (!record) continue;
  seedMerged.set(record.id, record);
}

for (const row of Array.isArray(wyrestormMaster) ? wyrestormMaster : []) {
  const record = toWyrestormSeedRecord(row);
  if (!record) continue;
  seedMerged.set(record.id, mergeRecordPair(seedMerged.get(record.id), record));
}

for (const row of Array.isArray(competitorCatalog) ? competitorCatalog : []) {
  const record = normalizeRecord({ vendorType: "competitor", ...row });
  seedMerged.set(record.id, mergeRecordPair(seedMerged.get(record.id), record));
}

const seedPreviewRecords = Array.from(seedMerged.values()).sort((left, right) => {
  const vendorCmp = left.vendorType.localeCompare(right.vendorType);
  if (vendorCmp !== 0) return vendorCmp;
  const brandCmp = left.brand.localeCompare(right.brand);
  if (brandCmp !== 0) return brandCmp;
  return left.sku.localeCompare(right.sku);
});

const records = Array.isArray(productIntelligenceDb?.records)
  ? productIntelligenceDb.records.map((record) => normalizeRecord(record))
  : [];

const scored = records.map((record) => ({
  ...record,
  completenessPct: completenessScore(record),
}));

function summarize(rows) {
  const avg = rows.length > 0 ? Number((rows.reduce((sum, row) => sum + row.completenessPct, 0) / rows.length).toFixed(1)) : 0;
  const min = rows.length > 0 ? Math.min(...rows.map((row) => row.completenessPct)) : 0;
  const max = rows.length > 0 ? Math.max(...rows.map((row) => row.completenessPct)) : 0;
  const ready90 = rows.filter((row) => row.completenessPct >= 90).length;
  const ready75 = rows.filter((row) => row.completenessPct >= 75).length;
  return { avg, min, max, ready90, ready75 };
}

function gapSummary(rows) {
  return {
    category: rows.filter((row) => !tidy(row.category)).length,
    technology: rows.filter((row) => !tidy(row.technology)).length,
    topology: rows.filter((row) => !tidy(row.topology)).length,
    role: rows.filter((row) => !tidy(row.role)).length,
    outputBehavior: rows.filter((row) => !tidy(row.outputBehavior)).length,
    transport: rows.filter((row) => !tidy(row.transport)).length,
    inputs: rows.filter((row) => !Array.isArray(row.inputs) || row.inputs.length === 0).length,
    outputs: rows.filter((row) => !Array.isArray(row.outputs) || row.outputs.length === 0).length,
    video: rows.filter((row) => !hasVideo(row.video)).length,
    distance: rows.filter((row) => !hasDistance(row.distance)).length,
    sourceUrls: rows.filter((row) => !Array.isArray(row.sourceUrls) || row.sourceUrls.length === 0).length,
  };
}

const wyrestormRows = scored.filter((row) => row.vendorType === "wyrestorm");
const competitorRows = scored.filter((row) => row.vendorType === "competitor");
const overall = summarize(scored);
const wyrestormSummary = summarize(wyrestormRows);
const competitorSummary = summarize(competitorRows);
const overallGaps = gapSummary(scored);
const wyrestormGaps = gapSummary(wyrestormRows);
const competitorGaps = gapSummary(competitorRows);
const competitorOfficialFamilyRows = competitorRows.filter((row) =>
  Array.isArray(row.evidence) && row.evidence.some((entry) => tidy(entry?.label) === "Official Competitor Family Guidance"),
).length;
const brandCounts = competitorRows.reduce((acc, row) => {
  acc[row.brand] = (acc[row.brand] || 0) + 1;
  return acc;
}, {});
const seedWyrestormRows = seedPreviewRecords.filter((row) => row.vendorType === "wyrestorm");
const seedCompetitorRows = seedPreviewRecords.filter((row) => row.vendorType === "competitor");

console.log("");
console.log("Central product intelligence audit");
console.log(`  canonical db rows: ${scored.length}`);
console.log(`  wyrestorm rows: ${wyrestormRows.length}`);
console.log(`  competitor rows: ${competitorRows.length}`);
console.log(`  competitor brands: ${Object.keys(brandCounts).length}`);
console.log("");
console.log("Source layers");
console.log(`  wyrestorm phase1 rows: ${Array.isArray(wyrestormPhase1) ? wyrestormPhase1.length : 0}`);
console.log(`  wyrestorm master SKU rows: ${Array.isArray(wyrestormMaster) ? wyrestormMaster.length : 0}`);
console.log(`  wyrestorm merged seed rows: ${new Set(seedWyrestormRows.map((row) => row.sku)).size}`);
console.log(`  competitor compare catalog rows: ${Array.isArray(competitorCatalog) ? competitorCatalog.length : 0}`);
console.log(`  committed intelligence DB rows: ${Array.isArray(productIntelligenceDb?.records) ? productIntelligenceDb.records.length : 0}`);
console.log(`  canonical competitor rows outside compare catalog: ${Math.max(0, competitorRows.length - seedCompetitorRows.length)}`);
console.log(`  competitor rows with official family intelligence: ${competitorOfficialFamilyRows}/${competitorRows.length}`);
console.log("");
console.log("Completeness");
console.log(`  overall avg: ${overall.avg}%`);
console.log(`  overall min/max: ${overall.min}% / ${overall.max}%`);
console.log(`  overall >= 75%: ${overall.ready75}/${scored.length}`);
console.log(`  overall >= 90%: ${overall.ready90}/${scored.length}`);
console.log(`  wyrestorm avg: ${wyrestormSummary.avg}%`);
console.log(`  wyrestorm >= 75%: ${wyrestormSummary.ready75}/${wyrestormRows.length}`);
console.log(`  wyrestorm >= 90%: ${wyrestormSummary.ready90}/${wyrestormRows.length}`);
console.log(`  competitor avg: ${competitorSummary.avg}%`);
console.log(`  competitor >= 75%: ${competitorSummary.ready75}/${competitorRows.length}`);
console.log(`  competitor >= 90%: ${competitorSummary.ready90}/${competitorRows.length}`);
console.log("");
console.log("Coverage gaps");
console.log(`  overall missing taxonomy fields: category ${overallGaps.category}, technology ${overallGaps.technology}, topology ${overallGaps.topology}, role ${overallGaps.role}, output behavior ${overallGaps.outputBehavior}`);
console.log(`  overall missing structure: transport ${overallGaps.transport}, inputs ${overallGaps.inputs}, outputs ${overallGaps.outputs}, video ${overallGaps.video}, distance ${overallGaps.distance}, source URLs ${overallGaps.sourceUrls}`);
console.log(`  wyrestorm missing structure: transport ${wyrestormGaps.transport}, inputs ${wyrestormGaps.inputs}, outputs ${wyrestormGaps.outputs}, video ${wyrestormGaps.video}, distance ${wyrestormGaps.distance}, source URLs ${wyrestormGaps.sourceUrls}`);
console.log(`  competitor missing structure: transport ${competitorGaps.transport}, inputs ${competitorGaps.inputs}, outputs ${competitorGaps.outputs}, video ${competitorGaps.video}, distance ${competitorGaps.distance}, source URLs ${competitorGaps.sourceUrls}`);
console.log("");
console.log("Top competitor brands");
for (const [brand, count] of Object.entries(brandCounts).sort((left, right) => right[1] - left[1]).slice(0, 12)) {
  console.log(`  ${brand}: ${count}`);
}
