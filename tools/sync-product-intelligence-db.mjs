import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const DB_PATH = path.join(ROOT, "data", "product-intelligence-db.json");
const PHASE1_PATH = path.join(ROOT, "src", "data", "catalog", "wyrestorm-catalog.phase1.json");
const MASTER_PATH = path.join(ROOT, "src", "data", "wyrestormSkuCatalog.2026.json");
const LIVE_CAPTURE_PATH = path.join(ROOT, "data", "wyrestorm-product-intelligence.json");
const COMPETITOR_CATALOG_PATH = path.join(ROOT, "src", "data", "catalog", "competitor-catalog.phase4.json");
const COMPETITOR_FAMILY_INTELLIGENCE_PATH = path.join(ROOT, "src", "data", "catalog", "competitors", "family-intelligence.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function dedupeStrings(values, limit = 32) {
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

function mergeById(existingValues, incomingValues) {
  const merged = new Map();
  for (const entry of asArray(existingValues)) {
    const id = tidy(entry?.id);
    if (!id) continue;
    merged.set(id, entry);
  }
  for (const entry of asArray(incomingValues)) {
    const id = tidy(entry?.id);
    if (!id) continue;
    merged.set(id, entry);
  }
  return Array.from(merged.values());
}

function mergeObjectDefaults(defaults, existing) {
  if (!defaults || typeof defaults !== "object") return existing;
  if (!existing || typeof existing !== "object") return { ...defaults };
  return { ...defaults, ...existing };
}

function normalizeUrl(value) {
  const text = tidy(value);
  if (!text) return "";
  try {
    return new URL(text).toString();
  } catch {
    return "";
  }
}

function splitNoteSegments(value) {
  return tidy(value)
    .split("|")
    .map((part) => tidy(part))
    .filter(Boolean);
}

function makePort(type, count) {
  const parsed = Math.max(0, Number(count) || 0);
  return parsed > 0 ? { type, count: parsed } : null;
}

function mergePorts(...groups) {
  const merged = new Map();

  for (const group of groups) {
    for (const entry of asArray(group)) {
      const type = tidy(entry?.type);
      const count = Math.max(0, Number(entry?.count) || 0);
      if (!type || count <= 0) continue;
      merged.set(type, (merged.get(type) || 0) + count);
    }
  }

  return Array.from(merged.entries()).map(([type, count]) => ({ type, count }));
}

function mergePortsPreferPrimary(primary, secondary) {
  const merged = new Map();

  for (const entry of asArray(secondary)) {
    const type = tidy(entry?.type);
    const count = Math.max(0, Number(entry?.count) || 0);
    if (!type || count <= 0) continue;
    merged.set(type, count);
  }

  for (const entry of asArray(primary)) {
    const type = tidy(entry?.type);
    const count = Math.max(0, Number(entry?.count) || 0);
    if (!type || count <= 0) continue;
    merged.set(type, count);
  }

  return Array.from(merged.entries()).map(([type, count]) => ({ type, count }));
}

function sortPorts(ports) {
  return asArray(ports).sort((left, right) => left.type.localeCompare(right.type));
}

function firstSentence(text) {
  const clean = tidy(text).replace(/\s+/g, " ");
  if (!clean) return "";
  const match = clean.match(/^(.+?[.?!])(?:\s|$)/);
  return tidy(match?.[1] || clean);
}

function parseSegments(description) {
  return tidy(description)
    .split("|")
    .map((part) => tidy(part))
    .filter(Boolean);
}

function textBlob(...values) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => tidy(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function parseMetaDescription(html) {
  const match = tidy(html).match(/<meta name="description" content="([^"]+)"/i);
  return tidy(match?.[1] || "");
}

function parseCanonicalUrl(html) {
  const match = tidy(html).match(/<link rel="canonical" href="([^"]+)"/i);
  return normalizeUrl(match?.[1] || "");
}

function captureForSku(captures, sku) {
  return captures[normalizeId(sku)] || null;
}

function sourceUrlForRow(row, capture) {
  return normalizeUrl(
    capture?.url ||
    parseCanonicalUrl(capture?.html) ||
    (tidy(row.slug) ? `https://www.wyrestorm.com/product/${tidy(row.slug).replace(/^\/+|\/+$/g, "")}/` : ""),
  );
}

const OFFICIAL_SKU_OVERRIDES = {
  "APO-DG2": {
    inputs: [{ type: "USB-C", count: 1 }],
    outputs: [{ type: "Wireless", count: 1 }],
    video: { maxResolution: "4K" },
    usb: { usbCVideoInput: true },
    wireless: { wirelessPresentation: true, wirelessConference: true },
  },
  "APO-DG2-PRO": {
    inputs: [{ type: "USB-C", count: 1 }],
    outputs: [{ type: "Wireless", count: 1 }],
    video: { maxResolution: "4K" },
    usb: { usbCVideoInput: true },
    wireless: { wirelessPresentation: true, wirelessConference: true },
  },
  "APO-VX20-UC": {
    inputs: [
      { type: "HDMI", count: 1 },
      { type: "USB-C", count: 1 },
    ],
    outputs: [{ type: "HDMI", count: 1 }],
    video: { maxResolution: "4K" },
    wireless: { airplay: true, miracast: true },
    audio: ["Speaker", "AEC"],
  },
  "USB-HUB4": {
    inputs: [{ type: "USB-B", count: 1 }],
    outputs: [{ type: "USB-A", count: 4 }],
    usb: { passthrough: true, hostPorts: 1, devicePorts: 4 },
  },
  "SYN-KEY10": {
    inputs: [{ type: "LAN", count: 1 }],
    outputs: [
      { type: "LAN", count: 1 },
      { type: "RS-232", count: 1 },
    ],
    control: ["TCP/IP", "RS-232"],
    integration: { lanControl: true, rs232: true },
  },
};

function applyOfficialSkuOverrides(record) {
  const override = OFFICIAL_SKU_OVERRIDES[normalizeSku(record.sku)];
  if (!override) return record;
  return {
    ...record,
    ...(override.video ? { video: { ...(record.video || {}), ...override.video } } : {}),
    ...(override.usb ? { usb: { ...(record.usb || {}), ...override.usb } } : {}),
    ...(override.wireless ? { wireless: { ...(record.wireless || {}), ...override.wireless } } : {}),
    ...(override.integration ? { integration: { ...(record.integration || {}), ...override.integration } } : {}),
    ...(override.power ? { power: { ...(record.power || {}), ...override.power } } : {}),
    ...(override.inputs ? { inputs: sortPorts(override.inputs) } : {}),
    ...(override.outputs ? { outputs: sortPorts(override.outputs) } : {}),
    ...(override.features ? { features: dedupeStrings([...(record.features || []), ...override.features], 24) } : {}),
    ...(override.control ? { control: dedupeStrings([...(record.control || []), ...override.control], 16) } : {}),
    ...(override.audio ? { audio: dedupeStrings([...(record.audio || []), ...override.audio], 16) } : {}),
  };
}

function competitorIdFor(brand, sku) {
  return `competitor::${normalizeId(brand)}::${normalizeSku(sku)}`;
}

function normalizeCompetitorTransport(value) {
  const text = tidy(value).toUpperCase();
  if (!text) return "";
  if (text === "HDBASET" || text === "HDBT") return "HDBaseT";
  if (text === "AVOIP" || text === "AV OVER IP") return "AVoIP";
  if (text === "USB EXTENSION") return "USB Extension";
  if (text === "HDMI_DISTRIBUTION") return "Local";
  return tidy(value);
}

const OFFICIAL_COMPETITOR_FAMILY_PROFILES = readJson(COMPETITOR_FAMILY_INTELLIGENCE_PATH).map((entry) => ({
  ...entry,
  brandKey: normalizeId(entry.brand),
  familyRegexes: asArray(entry.familyPatterns).map((pattern) => new RegExp(pattern, "i")),
  skuRegexes: asArray(entry.skuPatterns).map((pattern) => new RegExp(pattern, "i")),
  nameRegexes: asArray(entry.namePatterns).map((pattern) => new RegExp(pattern, "i")),
}));

function profilePatternMatch(regexes, value) {
  return regexes.length === 0 || regexes.some((regex) => regex.test(tidy(value)));
}

function profileSpecificity(profile) {
  const familyWeight = asArray(profile.familyPatterns).reduce((total, pattern) => total + tidy(pattern).length, 0) * 0.5;
  const skuWeight = asArray(profile.skuPatterns).reduce((total, pattern) => total + tidy(pattern).length * 3, 0);
  const nameWeight = asArray(profile.namePatterns).reduce((total, pattern) => total + tidy(pattern).length * 3, 0);
  return familyWeight + skuWeight + nameWeight;
}

function getOfficialCompetitorProfiles(catalogRow, existingRecord) {
  const brandKey = normalizeId(catalogRow.brand || existingRecord?.brand);
  const family = tidy(catalogRow.family || existingRecord?.family);
  const sku = normalizeSku(catalogRow.sku || existingRecord?.sku);
  const name = tidy(catalogRow.name || existingRecord?.name);

  return OFFICIAL_COMPETITOR_FAMILY_PROFILES
    .filter(
      (profile) =>
        profile.brandKey === brandKey &&
        profilePatternMatch(profile.familyRegexes, family) &&
        profilePatternMatch(profile.skuRegexes, sku) &&
        profilePatternMatch(profile.nameRegexes, name),
    )
    .sort((left, right) => profileSpecificity(left) - profileSpecificity(right));
}

function applyOfficialCompetitorProfiles(record, profiles) {
  let next = { ...record };

  for (const profile of profiles) {
    const classification = profile.classification || {};
    next = {
      ...next,
      group: tidy(classification.group || next.group),
      category: tidy(classification.category || next.category),
      subcategory: tidy(classification.subcategory || next.subcategory),
      classificationSource: "source",
      technology: tidy(classification.technology || next.technology),
      topology: tidy(classification.topology || next.topology),
      role: tidy(classification.role || next.role),
      directionality: tidy(classification.directionality || next.directionality),
      outputBehavior: tidy(classification.outputBehavior || next.outputBehavior),
      transport: tidy(classification.transport || next.transport),
      features: dedupeStrings([...(next.features || []), ...(profile.features || [])], 24),
      control: dedupeStrings([...(next.control || []), ...(profile.control || [])], 16),
      audio: dedupeStrings([...(next.audio || []), ...(profile.audio || [])], 16),
      sourceUrls: dedupeStrings([...(next.sourceUrls || []), ...(profile.officialUrls || [])], 12),
      tags: dedupeStrings(
        [
          ...(next.tags || []),
          "official-family",
          `official-family:${normalizeId(profile.id)}`,
          normalizeId(classification.category),
          normalizeId(classification.technology),
          normalizeId(classification.role),
        ],
        40,
      ),
      notes: dedupeStrings(
        [
          ...splitNoteSegments(next.notes),
          profile.officialSummary,
          profile.comparisonGuidance,
          "Official competitor family guidance applied during canonical sync.",
        ],
        20,
      ).join(" | "),
      usb: mergeObjectDefaults(profile.usb, next.usb),
      wireless: mergeObjectDefaults(profile.wireless, next.wireless),
      integration: mergeObjectDefaults(profile.integration, next.integration),
      power: mergeObjectDefaults(profile.power, next.power),
      video: mergeObjectDefaults(profile.video, next.video),
      distance: mergeObjectDefaults(profile.distance, next.distance),
    };
  }

  return next;
}

function buildOfficialCompetitorFamilyEvidence(record, profiles) {
  return profiles.map((profile) => ({
    id: `${normalizeId(record.sku)}-${normalizeId(profile.id)}`,
    type: "spec",
    label: "Official Competitor Family Guidance",
    value: [profile.officialSummary, profile.comparisonGuidance].filter(Boolean).join(" | "),
    sourceUrl: normalizeUrl(asArray(profile.officialUrls)[0] || asArray(record.sourceUrls)[0] || ""),
    capturedAt: nowIso(),
    confidence: 0.92,
    notes: "Derived from official vendor family references and applied during canonical sync.",
  }));
}

function inferCompetitorContext(row, existingRecord) {
  const rawCategory = tidy(row.category || existingRecord?.category);
  const family = tidy(row.family || existingRecord?.family);
  const text = textBlob(
    row.brand,
    row.sku,
    row.name,
    family,
    rawCategory,
    row.summary,
    row.transport,
    ...(row.features || []),
    ...(row.control || []),
    ...(row.audio || []),
    row.notes,
    existingRecord?.summary,
    ...(existingRecord?.features || []),
    ...(existingRecord?.control || []),
    ...(existingRecord?.audio || []),
  );
  const transport = normalizeCompetitorTransport(row.transport || existingRecord?.transport);
  const inputs = mergePorts(asArray(row.inputs), asArray(existingRecord?.inputs));
  const outputs = mergePorts(asArray(row.outputs), asArray(existingRecord?.outputs));
  const hasWireless = /wireless presentation|wireless conferencing|airplay|miracast|google cast|chromecast|byom|byod/.test(text);
  const hasCollaboration = /collaboration|presentation switcher|conference|conferencing|usb host|usb routing|usb-c/.test(text);
  const hasVideoWall = /video wall|windowall|wall processor|multiview|quad view|multi-source presentation/.test(text);

  if (/multiview processor/i.test(rawCategory) || hasVideoWall && /processor|multiview/.test(text)) {
    return {
      group: "videowall",
      category: "Video Wall",
      subcategory: "Multiview Processor",
      technology: "Video Wall Processor",
      topology: "video processor",
      role: "multiview-processor",
      directionality: "bidirectional",
      outputBehavior: "multiview capable",
    };
  }

  if (rawCategory.toLowerCase() === "matrix") {
    return {
      group: "matrix",
      category: "Matrix",
      subcategory: /presentation|collaboration|usb-c|dual-screen/.test(text) ? "Presentation Matrix" : transport === "HDBaseT" ? "HDBaseT Matrix" : "HDMI Matrix",
      technology: transport === "HDBaseT" ? "HDBaseT" : "Matrix",
      topology: /modular|card chassis|digitalmedia/i.test(text) ? "modular matrix" : "matrix",
      role: "matrix",
      directionality: "bidirectional",
      outputBehavior: /mirrored|mirror|loop/.test(text) ? "mirrored + local" : "matrixed",
    };
  }

  if (rawCategory.toLowerCase() === "switcher") {
    if (hasWireless && !inputs.some((entry) => /hdmi|usb-c|dp|displayport/i.test(entry.type))) {
      return {
        group: "casting",
        category: /conference|conferencing|byom/.test(text) ? "UC" : "Wireless Presentation",
        subcategory: /conference|conferencing|byom/.test(text) ? "Wireless Conferencing Hub" : "Wireless Presentation Hub",
        technology: /conference|conferencing|byom/.test(text) ? "Unified Communications" : "Wireless Presentation",
        topology: "collaboration appliance",
        role: /conference|conferencing|byom/.test(text) ? "conferencing-hub" : "wireless-hub",
        directionality: "bidirectional",
        outputBehavior: "single room endpoint",
      };
    }
    return {
      group: hasWireless || hasCollaboration ? "uc" : "switcher",
      category: hasWireless && /conference|conferencing|byom/.test(text) ? "UC" : "Presentation Switcher",
      subcategory: hasWireless ? "Collaboration Switcher" : "Presentation Switcher",
      technology: hasWireless ? "Wireless Presentation" : "Presentation Switcher",
      topology: hasWireless || hasCollaboration ? "collaboration appliance" : "local switcher",
      role: "presentation-switcher",
      directionality: "bidirectional",
      outputBehavior: hasVideoWall ? "multiview capable" : outputs.length > 1 ? "mirrored + local" : "single room endpoint",
    };
  }

  if (rawCategory.toLowerCase() === "avoip") {
    const role =
      /controller|manager|director/.test(text) ? "controller"
      : /transceiver|encoder\/decoder|tx\/rx/.test(text) ? "transceiver"
      : /decoder|receiver|\brx\b/.test(text) ? "decoder"
      : /encoder|transmitter|\btx\b/.test(text) ? "encoder"
      : /adapter/.test(text) ? "adapter"
      : "endpoint";
    return {
      group: role === "controller" ? "control" : "avoip",
      category: "AVoIP",
      subcategory: role === "controller" ? "AVoIP Controller" : role === "adapter" ? "AVoIP Adapter" : role === "transceiver" ? "Transceiver" : role === "decoder" ? "Decoder" : role === "encoder" ? "Encoder" : "Endpoint",
      technology: "AVoIP",
      topology: role === "controller" ? "controller" : hasVideoWall ? "endpoint" : "endpoint",
      role,
      directionality: role === "controller" || role === "transceiver" || role === "adapter" ? "bidirectional" : role === "encoder" ? "tx" : role === "decoder" ? "rx" : "bidirectional",
      outputBehavior:
        role === "controller" ? "control plane"
        : hasVideoWall && /multiview/.test(text) ? "multiview capable"
        : hasVideoWall ? "tiled endpoint"
        : role === "encoder" ? "single stream encode"
        : "single display only",
    };
  }

  if (rawCategory.toLowerCase() === "extender") {
    const role =
      /kit|set/.test(text) ? "extender-kit"
      : /receiver|\brx\b/.test(text) ? "rx"
      : /transmitter|\btx\b/.test(text) ? "tx"
      : "extender";
    return {
      group: "extender",
      category: "Extender",
      subcategory: role === "extender-kit" ? "Extender Kit" : role === "rx" ? "Receiver" : role === "tx" ? "Transmitter" : "Extender",
      technology: transport === "USB Extension" ? "USB Extension" : transport === "AVoIP" ? "IP Extension" : "HDBaseT",
      topology: "1:1 extender",
      role,
      directionality: role === "extender-kit" ? "kit" : role === "tx" ? "tx" : role === "rx" ? "rx" : "bidirectional",
      outputBehavior: /loop|mirrored/.test(text) ? "mirrored + local" : "single display only",
    };
  }

  if (rawCategory.toLowerCase() === "distribution") {
    return {
      group: "distribution",
      category: "Distribution",
      subcategory: "Distribution Amplifier",
      technology: "Distribution",
      topology: "splitter",
      role: "distribution-amplifier",
      directionality: "one-to-many",
      outputBehavior: "mirrored",
    };
  }

  if (rawCategory.toLowerCase() === "control") {
    return {
      group: "control",
      category: "Control",
      subcategory: /touch/.test(text) ? "Touch Controller" : "Controller",
      technology: "Control",
      topology: "controller",
      role: "controller",
      directionality: "bidirectional",
      outputBehavior: "control plane",
    };
  }

  if (rawCategory.toLowerCase() === "uc") {
    return {
      group: "uc",
      category: "UC",
      subcategory: /bar/.test(text) ? "Video Bar" : "Conferencing Hub",
      technology: "Unified Communications",
      topology: "collaboration appliance",
      role: /bar/.test(text) ? "video-bar" : "conferencing-hub",
      directionality: "bidirectional",
      outputBehavior: "single room endpoint",
    };
  }

  if (rawCategory.toLowerCase() === "accessories") {
    return {
      group: "other",
      category: /usb|hub/i.test(text) ? "Accessory" : "Accessory",
      subcategory: /usb|hub/i.test(text) ? "USB Accessory" : "Accessory",
      technology: /usb/i.test(text) ? "USB" : "Accessory",
      topology: /hub/i.test(text) ? "hub" : "accessory",
      role: /hub/i.test(text) ? "hub" : "accessory",
      directionality: "bidirectional",
      outputBehavior: "utility",
    };
  }

  return {
    group: "other",
    category: rawCategory || "Other",
    subcategory: tidy(existingRecord?.subcategory) || "Reference",
    technology: transport || rawCategory || "Other",
    topology: "device",
    role: "device",
    directionality: "bidirectional",
    outputBehavior: "device",
  };
}

function buildCompetitorEvidence(record, sourceUrl) {
  const capturedAt = nowIso();
  const evidence = [
    {
      id: `${normalizeId(record.sku)}-summary`,
      type: "spec",
      label: "Competitor Summary",
      value: record.summary,
      sourceUrl,
      capturedAt,
      confidence: record.confidence,
      notes: "Derived from structured competitor catalog and official vendor source URLs.",
    },
  ];
  if (record.inputs.length > 0 || record.outputs.length > 0) {
    evidence.push({
      id: `${normalizeId(record.sku)}-io`,
      type: "io",
      label: "Competitor I/O Profile",
      value: [
        record.inputs.length > 0 ? `Inputs: ${record.inputs.map((entry) => `${entry.count}x ${entry.type}`).join(", ")}` : "",
        record.outputs.length > 0 ? `Outputs: ${record.outputs.map((entry) => `${entry.count}x ${entry.type}`).join(", ")}` : "",
      ].filter(Boolean).join(" | "),
      sourceUrl,
      capturedAt,
      confidence: Math.max(0.72, record.confidence - 0.04),
      notes: "Derived from structured competitor compare catalog.",
    });
  }
  return evidence;
}

function buildCompetitorReviewFlags(record) {
  const flags = [];
  const criticalCategories = new Set(["Matrix", "Presentation Switcher", "AVoIP", "Extender", "Distribution", "Video Wall"]);
  if (criticalCategories.has(record.category) && (record.inputs.length === 0 || record.outputs.length === 0)) {
    flags.push({
      id: `flag_${normalizeId(record.sku)}_io`,
      kind: "other",
      status: "open",
      message: `${record.sku} should be reviewed to confirm full I/O coverage.`,
      note: "Critical routed-video competitor rows should retain both input and output structure in the canonical store.",
      source: "competitor-sync",
      createdAt: nowIso(),
      createdBy: "competitor-sync",
      updatedAt: nowIso(),
    });
  }
  return flags;
}

function buildCompetitorRecord(catalogRow, existingRecord) {
  const brand = tidy(catalogRow.brand || existingRecord?.brand);
  const sku = normalizeSku(catalogRow.sku || existingRecord?.sku);
  const summary = tidy(catalogRow.summary || existingRecord?.summary || catalogRow.name || sku);
  const transport = normalizeCompetitorTransport(catalogRow.transport || existingRecord?.transport);
  const context = inferCompetitorContext(catalogRow, existingRecord);
  const officialProfiles = getOfficialCompetitorProfiles(catalogRow, existingRecord);
  const sourceUrls = dedupeStrings([
    normalizeUrl(catalogRow.sourceUrl),
    ...(catalogRow.sourceUrls || []),
    ...(existingRecord?.sourceUrls || []),
  ], 12);
  const sourceUrl = sourceUrls[0] || "";
  const notes = dedupeStrings([
    ...splitNoteSegments(catalogRow.notes),
    "Canonical competitor record rebuilt from structured compare catalog.",
  ], 12).join(" | ");
  const descriptionBlob = [
    summary,
    ...(catalogRow.features || []),
    ...(catalogRow.control || []),
    ...(catalogRow.audio || []),
  ].join(" | ");
  const control = dedupeStrings([
    ...(catalogRow.control || []),
    ...(existingRecord?.control || []),
    ...inferControlList(descriptionBlob, inferIntegration(descriptionBlob, existingRecord?.integration), []),
  ], 16);
  const audio = dedupeStrings([
    ...(catalogRow.audio || []),
    ...(existingRecord?.audio || []),
    ...inferAudioList(descriptionBlob, []),
  ], 16);
  let record = {
    id: competitorIdFor(brand, sku),
    vendorType: "competitor",
    brand,
    sku,
    name: tidy(catalogRow.name || existingRecord?.name || sku),
    family: tidy(catalogRow.family || existingRecord?.family || "Unknown"),
    group: context.group,
    category: context.category,
    subcategory: tidy(catalogRow.subcategory || existingRecord?.subcategory || context.subcategory),
    classificationSource: officialProfiles.length > 0 ? "source" : "inferred",
    summary,
    technology: context.technology,
    topology: context.topology,
    role: context.role,
    directionality: context.directionality,
    outputBehavior: context.outputBehavior,
    features: dedupeStrings([...(catalogRow.features || []), ...(existingRecord?.features || [])], 24),
    transport,
    inputs: sortPorts(mergePortsPreferPrimary(catalogRow.inputs, existingRecord?.inputs)),
    outputs: sortPorts(mergePortsPreferPrimary(catalogRow.outputs, existingRecord?.outputs)),
    control,
    audio,
    video: catalogRow.video || existingRecord?.video || inferVideo(descriptionBlob, existingRecord?.video),
    latency: tidy(existingRecord?.latency) || undefined,
    distance: catalogRow.distance || existingRecord?.distance || (Number(catalogRow.distanceMeters || existingRecord?.distanceMeters) > 0 ? { meters: Number(catalogRow.distanceMeters || existingRecord?.distanceMeters) } : inferDistance(descriptionBlob, transport, existingRecord?.distance)),
    distanceMeters: Number(catalogRow.distanceMeters || existingRecord?.distanceMeters) || undefined,
    usb: inferUsb(descriptionBlob, existingRecord?.usb),
    wireless: inferWireless(descriptionBlob, existingRecord?.wireless),
    integration: inferIntegration(descriptionBlob, existingRecord?.integration),
    power: inferPower(descriptionBlob, catalogRow, existingRecord?.power),
    status: tidy(catalogRow.status || existingRecord?.status || "draft"),
    confidence: Math.max(Number(existingRecord?.confidence) || 0, 0.86),
    sourceType: "catalog",
    sourceUrls,
    tags: dedupeStrings([
      context.technology,
      context.topology,
      context.role,
      context.outputBehavior,
      transport,
      tidy(catalogRow.family || existingRecord?.family),
      context.category,
      tidy(catalogRow.subcategory || existingRecord?.subcategory),
      ...(catalogRow.features || []),
      ...(catalogRow.control || []),
      ...(catalogRow.audio || []),
    ].map((entry) => normalizeId(entry)), 32),
    notes: notes || undefined,
    createdAt: tidy(existingRecord?.createdAt) || nowIso(),
    updatedAt: nowIso(),
    lastCapturedAt: tidy(existingRecord?.lastCapturedAt) || nowIso(),
    lastReviewedAt: tidy(existingRecord?.lastReviewedAt) || undefined,
    reviewedBy: tidy(existingRecord?.reviewedBy) || undefined,
    evidence: [],
    reviewFlags: [],
    archived: Boolean(existingRecord?.archived),
  };
  record = applyOfficialCompetitorProfiles(record, officialProfiles);
  record.reviewFlags = buildCompetitorReviewFlags(record);
  record.evidence = mergeById(
    buildCompetitorEvidence(record, record.sourceUrls[0] || sourceUrl),
    buildOfficialCompetitorFamilyEvidence(record, officialProfiles),
  );
  return record;
}

function classifyGroup(row, description) {
  const sku = normalizeSku(row.sku);
  const family = tidy(row.family);
  const type = tidy(row.type).toLowerCase();
  const text = textBlob(sku, family, row.name, description);

  if (family === "Cables" || /\bcable\b/.test(type)) {
    return {
      group: "other",
      category: "Cable",
      subcategory: /\busb-c\b|\busbc\b/.test(text) ? "USB-C Cable" : /\bhdmi\b/.test(text) ? "HDMI Cable" : "Cable",
      technology: "Cable",
      topology: "point-to-point link",
      role: "cable",
      directionality: "passive",
      outputBehavior: "pass-through",
    };
  }

  if (family === "Audio" || /\bamplifier\b|\bspeakerphone\b|\bmicrophone\b|\bmic\b|\bdsp\b/.test(text)) {
    const isAmp = /\bamp(?:lifier)?\b/.test(text);
    const isSpeakerphone = /\bspeakerphone\b/.test(text);
    return {
      group: "audio",
      category: "Audio",
      subcategory: isAmp ? "Amplifier" : isSpeakerphone ? "Speakerphone" : /\bmicrophone hub\b|\bmixer\b/.test(text) ? "Microphone Hub" : "Audio Device",
      technology: isAmp ? "Amplifier" : isSpeakerphone ? "Speakerphone" : "Audio",
      topology: isAmp ? "audio endpoint" : "audio appliance",
      role: isAmp ? "amplifier" : isSpeakerphone ? "speakerphone" : /\bmicrophone hub\b|\bmixer\b/.test(text) ? "microphone-hub" : "audio-device",
      directionality: "bidirectional",
      outputBehavior: "audio endpoint",
    };
  }

  if (family === "Accessories") {
    const isTouch = /\btouchscreen\b|\btouchscreen controller\b|\btouchpad\b/.test(text);
    const isHub = /\bhub\b/.test(text);
    return {
      group: isTouch ? "control" : "other",
      category: isTouch ? "Control" : "Accessory",
      subcategory: isTouch ? "Touch Controller" : isHub ? "USB Hub" : "Accessory",
      technology: isTouch ? "Control" : isHub ? "USB" : "Accessory",
      topology: isTouch ? "controller" : isHub ? "hub" : "accessory",
      role: isTouch ? "controller" : isHub ? "hub" : "accessory",
      directionality: "bidirectional",
      outputBehavior: isTouch ? "control endpoint" : "utility",
    };
  }

  if (family === "Distribution" || /\bsplitter\b|\bdistribution amplifier\b/.test(text)) {
    return {
      group: "distribution",
      category: "Distribution",
      subcategory: "Splitter",
      technology: "Distribution",
      topology: "splitter",
      role: "distribution-amplifier",
      directionality: "one-to-many",
      outputBehavior: "mirrored",
    };
  }

  if (family === "NetworkHD" || sku.startsWith("NHD")) {
    if (/\bcontroller\b/.test(text)) {
      return {
        group: "control",
        category: "Control",
        subcategory: "AVoIP Controller",
        technology: "AVoIP",
        topology: "controller",
        role: "controller",
        directionality: "bidirectional",
        outputBehavior: "control plane",
      };
    }
    if (/\bmultiview\b/.test(text) && !/\bencoder\b|\bdecoder\b|\btransceiver\b/.test(text)) {
      return {
        group: "videowall",
        category: "Video Wall",
        subcategory: "Multiview Processor",
        technology: "AVoIP",
        topology: "video processor",
        role: "multiview-processor",
        directionality: "bidirectional",
        outputBehavior: "multiview capable",
      };
    }
    return {
      group: "avoip",
      category: "AVoIP",
      subcategory: /\btransceiver\b|\btrx\b/.test(text) ? "Transceiver" : /\bencoder\b|\btx\b/.test(text) ? "Encoder" : /\bdecoder\b|\brx\b/.test(text) ? "Decoder" : "Endpoint",
      technology: "AVoIP",
      topology: "endpoint",
      role: /\btransceiver\b|\btrx\b/.test(text) ? "transceiver" : /\bencoder\b|\btx\b/.test(text) ? "encoder" : /\bdecoder\b|\brx\b/.test(text) ? "decoder" : "endpoint",
      directionality: /\btransceiver\b|\btrx\b/.test(text) ? "bidirectional" : /\bencoder\b|\btx\b/.test(text) ? "tx" : /\bdecoder\b|\brx\b/.test(text) ? "rx" : "bidirectional",
      outputBehavior: /\bmultiview\b/.test(text) ? "multiview capable" : /\bvideo wall\b/.test(text) ? "tiled endpoint" : /\bencoder\b|\btx\b/.test(text) ? "single stream encode" : "single display only",
    };
  }

  if (family === "Extenders and KVM") {
    return {
      group: "extender",
      category: "Extender",
      subcategory: /\bkit\b|\bset\b/.test(text) ? "Extender Kit" : /\btransmitter\b|\btx\b/.test(text) ? "Transmitter" : /\breceiver\b|\brx\b/.test(text) ? "Receiver" : "Extender",
      technology: /\bip extender\b|\b1gbe\b|\b10g\b/.test(text) ? "IP Extension" : /\busb\b/.test(text) && !/\bhdbaset\b|\bhdmi\b/.test(text) ? "USB Extension" : "HDBaseT",
      topology: "1:1 extender",
      role: /\bkit\b|\bset\b/.test(text) ? "extender-kit" : /\btransmitter\b|\btx\b/.test(text) ? "tx" : /\breceiver\b|\brx\b/.test(text) ? "rx" : "extender",
      directionality: /\bkit\b|\bset\b/.test(text) ? "kit" : /\btransmitter\b|\btx\b/.test(text) ? "tx" : /\breceiver\b|\brx\b/.test(text) ? "rx" : "bidirectional",
      outputBehavior: /\bloop out\b/.test(text) ? "mirrored + local" : "single display only",
    };
  }

  if (family === "Presentation and UC") {
    if (type === "video-bar" || /\bvideo bar\b|\bvideobar\b/.test(text)) {
      return {
        group: "uc",
        category: "UC",
        subcategory: "Video Bar",
        technology: "Unified Communications",
        topology: "collaboration appliance",
        role: "video-bar",
        directionality: "bidirectional",
        outputBehavior: "single room endpoint",
      };
    }
    if (type === "camera" || /\bcamera\b|\bptz\b|\bwebcam\b/.test(text)) {
      return {
        group: "camera",
        category: "Camera",
        subcategory: /\bptz\b/.test(text) ? "PTZ Camera" : /\bwebcam\b/.test(text) ? "Webcam" : "Camera",
        technology: "Camera",
        topology: "camera endpoint",
        role: /\bptz\b/.test(text) ? "ptz-camera" : /\bwebcam\b/.test(text) ? "webcam" : "camera",
        directionality: "tx",
        outputBehavior: "camera source",
      };
    }
    if (type === "dongle" || /\bwireless casting\b|\bdongle\b/.test(text)) {
      return {
        group: "casting",
        category: "Wireless Presentation",
        subcategory: "Casting Dongle",
        technology: "Wireless Presentation",
        topology: "endpoint",
        role: "dongle",
        directionality: "tx",
        outputBehavior: "wireless source",
      };
    }
    return {
      group: /\bspeakerphone\b|\bmicrophone\b|\bmic\b/.test(text) ? "audio" : "uc",
      category: /\bspeakerphone\b|\bmicrophone\b|\bmic\b/.test(text) ? "Audio" : "Presentation Switcher",
      subcategory: /\bspeakerphone\b/.test(text) ? "Speakerphone" : /\bmicrophone\b|\bmic\b/.test(text) ? "Microphone" : "Collaboration Switcher",
      technology: /\bairplay\b|\bmiracast\b/.test(text) ? "Wireless Presentation" : /\bspeakerphone\b/.test(text) ? "Speakerphone" : "Presentation Switcher",
      topology: /\bspeakerphone\b|\bmicrophone\b|\bmic\b/.test(text) ? "audio appliance" : "local switcher",
      role: /\bspeakerphone\b/.test(text) ? "speakerphone" : /\bmicrophone\b|\bmic\b/.test(text) ? "microphone" : "presentation-switcher",
      directionality: "bidirectional",
      outputBehavior: /\bspeakerphone\b|\bmicrophone\b|\bmic\b/.test(text) ? "audio endpoint" : /\bdual-view\b|\bquad view\b/.test(text) ? "multiview capable" : "mirrored + local",
    };
  }

  if (family === "Switching and Control") {
    if (/\bin-desk\b|\bdesk\b.*\bconnectivity\b|\bpassthrough\b/.test(text)) {
      return {
        group: "accessory",
        category: "Accessory",
        subcategory: "In-Desk Box",
        technology: "Accessory",
        topology: "pass-through module",
        role: "in-desk-box",
        directionality: "bidirectional",
        outputBehavior: "pass-through",
      };
    }
    if (/\bvideo wall\b/.test(text)) {
      return {
        group: "videowall",
        category: "Video Wall",
        subcategory: "Video Wall Processor",
        technology: "Video Wall Processor",
        topology: "video wall processor",
        role: "video-wall-processor",
        directionality: "bidirectional",
        outputBehavior: "tiled wall processor",
      };
    }
    if (/\bcontroller\b|\btouchpad\b|\bkeypad\b|\bprotocol converter\b/.test(text)) {
      return {
        group: "control",
        category: "Control",
        subcategory: /\btouchpad\b/.test(text) ? "Touch Controller" : /\bkeypad\b/.test(text) ? "Keypad Controller" : "Controller",
        technology: "Control",
        topology: "controller",
        role: "controller",
        directionality: "bidirectional",
        outputBehavior: "control endpoint",
      };
    }
    if (/\bmatrix\b/.test(text)) {
      return {
        group: "matrix",
        category: "Matrix",
        subcategory: /\bkit\b/.test(text) ? "Matrix Kit" : /\bseamless\b/.test(text) ? "Seamless Matrix" : /\bhdbaset\b/.test(text) ? "HDBaseT Matrix" : "HDMI Matrix",
        technology: /\bhdbaset\b/.test(text) ? "HDBaseT" : /\bsynergy\b/.test(text) ? "Presentation Matrix" : "Matrix",
        topology: /\bhyb\b|\bhybrid\b/.test(text) ? "hybrid matrix" : "matrix",
        role: /\bkit\b/.test(text) ? "matrix-kit" : "matrix",
        directionality: "bidirectional",
        outputBehavior: /\bmirrored\b|\bmirror(?:ed)?\b/.test(text) || /\bhdbaset\b/.test(text) && /\bhdmi\b/.test(text) ? "mirrored + local" : "matrixed",
      };
    }
    if (/\bswitcher\b|\bpresentation switcher\b/.test(text)) {
      return {
        group: /\bairplay\b|\bmiracast\b|\bconference\b|\bwireless\b/.test(text) ? "uc" : "switcher",
        category: "Presentation Switcher",
        subcategory: /\bwireless\b|\bairplay\b|\bmiracast\b/.test(text) ? "Wireless Collaboration Switcher" : "Switcher",
        technology: /\bairplay\b|\bmiracast\b/.test(text) ? "Wireless Presentation" : "Presentation Switcher",
        topology: /\bin-wall\b|\bwall\b/.test(text) ? "wall plate switcher" : "local switcher",
        role: "presentation-switcher",
        directionality: "bidirectional",
        outputBehavior: /\bdual-view\b|\bquad view\b/.test(text) ? "multiview capable" : /\bhdbaset\b/.test(text) && /\bhdmi\b/.test(text) ? "mirrored + local" : "single display only",
      };
    }
  }

  return {
    group: "other",
    category: tidy(row.category) || "Other",
    subcategory: tidy(row.type) || "Product",
    technology: tidy(row.family) || "Other",
    topology: "device",
    role: tidy(row.type) || "product",
    directionality: "bidirectional",
    outputBehavior: "device",
  };
}

function inferTransport(row, context, description) {
  const text = textBlob(row.family, row.type, description, context.technology);
  if (context.group === "avoip") return "AVoIP";
  if (context.group === "extender") {
    if (/\bip extender\b|\b1gbe\b|\b10g\b/.test(text)) return "AVoIP";
    if (/\busb\b/.test(text) && !/\bhdmi\b|\bhdbaset\b/.test(text)) return "USB Extension";
    return /\bhdbaset\b|\bhdbt\b/.test(text) ? "HDBaseT" : "USB Extension";
  }
  if (/\bhdbaset\b|\bhdbt\b/.test(text)) return "HDBaseT";
  if (/\bnetworkhd\b|\bav over ip\b|\bsdvoe\b|\b1gbe\b|\b10g\b/.test(text)) return "AVoIP";
  if (/\busb extension\b/.test(text)) return "USB Extension";
  return "Local";
}

function inferVideo(description, existing) {
  if (existing && typeof existing === "object" && Object.keys(existing).length > 0) return existing;
  const text = tidy(description);
  const normalized = text.toLowerCase();
  const video = {};

  if (normalized.includes("8k60")) video.maxResolution = "8K60";
  else if (normalized.includes("5k30")) video.maxResolution = "5K30";
  else if (normalized.includes("4k60")) video.maxResolution = "4K60";
  else if (normalized.includes("4k30")) video.maxResolution = "4K30";
  else if (normalized.includes("4k")) video.maxResolution = "4K";
  else if (normalized.includes("1080p60")) video.maxResolution = "1080p60";
  else if (normalized.includes("1080p")) video.maxResolution = "1080p";

  const frameRateMatch = text.match(/(120|100|60|50|30)\s*hz/i);
  if (frameRateMatch) video.maxFramerate = `${frameRateMatch[1]}Hz`;

  const chromaMatch = text.match(/4:4:4|4:2:0/);
  if (chromaMatch) video.chroma = chromaMatch[0];

  if (/\bhdr\b/.test(normalized)) video.hdr = true;
  if (/dolby vision/i.test(text)) video.dolbyVision = true;

  const hdmiVersionMatch = text.match(/hdmi\s*(2\.1|2\.0|1\.4)/i);
  if (hdmiVersionMatch) video.hdmiVersion = hdmiVersionMatch[1];

  const hdcpMatch = text.match(/hdcp\s*(2\.3|2\.2|1\.4)/i);
  if (hdcpMatch) video.hdcpVersion = hdcpMatch[1];

  const bandwidthMatch = text.match(/(48|24|20|18|10)\s*gbps/i);
  if (bandwidthMatch) video.bandwidthGbps = Number(bandwidthMatch[1]);

  if (/down-?scal/i.test(text)) {
    video.scaling = true;
    video.downscaling = true;
  }
  if (/up-?scal/i.test(text)) {
    video.scaling = true;
    video.upscaling = true;
  }
  if (/seamless/i.test(text)) video.seamlessSwitching = true;
  if (/multiview|dual-view|quad view|9-window/i.test(text)) video.multiview = true;

  return Object.keys(video).length > 0 ? video : undefined;
}

function inferDistance(description, transport, existing) {
  if (existing && typeof existing === "object" && Object.keys(existing).length > 0) return existing;
  const text = tidy(description);
  const distance = {};
  const pairMatch = text.match(/4K[: )]*(\d+)\s*m.*1080p[: )]*(\d+)\s*m/i);
  if (pairMatch) {
    distance.meters4k = Number(pairMatch[1]);
    distance.meters1080p = Number(pairMatch[2]);
    distance.meters = Math.max(distance.meters4k, distance.meters1080p);
  } else {
    const allMeters = [...text.matchAll(/(\d+(?:\.\d+)?)\s*m(?:\/|\b)/gi)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isFinite(value) && value > 0 && value <= 1000);
    if (allMeters.length > 0) distance.meters = Math.max(...allMeters);
  }

  if (/class a/i.test(text)) distance.hdbasetClass = "Class A";
  if (/class b/i.test(text)) distance.hdbasetClass = "Class B";
  if (!distance.hdbasetClass && transport === "HDBaseT") {
    const meterHint = Math.max(Number(distance.meters4k) || 0, Number(distance.meters) || 0);
    if (meterHint >= 70) distance.hdbasetClass = "Class A";
    else if (meterHint >= 35) distance.hdbasetClass = "Class B";
  }

  if (/10g\b|10gbe|sfp\+/i.test(text)) distance.networkSpeed = "10G";
  else if (/2gbe/i.test(text)) distance.networkSpeed = "2G";
  else if (/1gbe|gigabit|1g\b/i.test(text)) distance.networkSpeed = "1G";

  if (/sdvoe/i.test(text)) distance.codec = "SDVoE";
  else if (/dante av-a/i.test(text)) distance.codec = "Dante AV-A";
  else if (/aes67/i.test(text)) distance.codec = "AES67";

  if (/zero latency/i.test(text)) distance.latencyClass = "zero-latency";
  else if (/ultra low latency|low latency/i.test(text)) distance.latencyClass = "ultra-low";

  return Object.keys(distance).length > 0 ? distance : undefined;
}

function inferIntegration(description, existing) {
  if (existing && typeof existing === "object" && Object.keys(existing).length > 0) return existing;
  const text = textBlob(description);
  const profile = {};
  if (/rs232|rs-232/.test(text)) profile.rs232 = true;
  if (/\bir\b/.test(text)) profile.ir = true;
  if (/ip control/.test(text)) profile.lanControl = true;
  if (/ethernet passthrough|tcp\/ip|lan control|web gui|web-ui|web ui/.test(text)) profile.lanControl = true;
  if (/web gui|web-ui|web ui/.test(text)) profile.webUi = true;
  if (/\bcec\b/.test(text)) profile.cec = true;
  const relayMatch = text.match(/(\d+)\s*x?\s*relays?\b|\brelays?\b/);
  if (relayMatch) profile.relayCount = Number(relayMatch[1] || 1);
  const gpioMatch = text.match(/(\d+)\s*x?\s*gpio\b|\bgpio\b/);
  if (gpioMatch) profile.gpioCount = Number(gpioMatch[1] || 1);
  if (/poe\+?|power over ethernet/.test(text)) profile.poe = true;
  if (/poe pd/.test(text)) profile.poePd = true;
  return Object.keys(profile).length > 0 ? profile : undefined;
}

function inferWireless(description, existing) {
  if (existing && typeof existing === "object" && Object.keys(existing).length > 0) return existing;
  const text = textBlob(description);
  const profile = {};
  if (/airplay/.test(text)) profile.airplay = true;
  if (/miracast/.test(text)) profile.miracast = true;
  if (/wireless presentation|wireless casting/.test(text)) profile.wirelessPresentation = true;
  if (/wireless conference|wireless conferencing/.test(text)) profile.wirelessConference = true;
  if (/\bmst\b/.test(text)) profile.mst = true;
  if (/byod/.test(text)) profile.byod = true;
  if (/byom/.test(text)) profile.byom = true;
  return Object.keys(profile).length > 0 ? profile : undefined;
}

function inferPower(description, row, existing) {
  if (existing && typeof existing === "object" && Object.keys(existing).length > 0) return existing;
  const text = textBlob(row.sku, row.family, row.type, description);
  const profile = {};
  if (/poh\+?/.test(text)) profile.poh = true;
  if (/\bpoc\b/.test(text)) profile.poc = true;
  if (/poe\+?|power over ethernet/.test(text)) profile.powerSupplyType = "PoE";
  if (/2-gang|single gang|in-wall|wall plate/.test(text)) profile.wallPlate = true;
  if (/table ?top|table-mount/.test(text)) profile.tableMount = true;
  if (/rack mount|1u|6u/.test(text)) profile.formFactor = "Rackmount";
  else if (/in-wall|wall plate/.test(text)) profile.formFactor = "Wall plate";
  else if (/video bar|speakerphone|camera|dongle/.test(text)) profile.formFactor = "Desktop";
  const rackWidthMatch = text.match(/\b(1u|2u|6u)\b/i);
  if (rackWidthMatch) profile.rackWidth = rackWidthMatch[1].toUpperCase();
  return Object.keys(profile).length > 0 ? profile : undefined;
}

function inferUsb(description, existing) {
  if (existing && typeof existing === "object" && Object.keys(existing).length > 0) return existing;
  const text = textBlob(description);
  const profile = {};
  if (/usb passthrough|usb 2\.0|usb 3\.0|usb 3\.2|usb hid|usb hub/.test(text)) profile.passthrough = true;
  if (/usb-c/.test(text)) profile.usbCVideoInput = true;
  const watts = text.match(/(\d+)\s*-?watt|(\d+)\s*w\b|(\d+)\s*pd\b/);
  const parsedWatts = Number(watts?.[1] || watts?.[2] || watts?.[3] || 0);
  if (parsedWatts > 0 && parsedWatts <= 240) profile.usbCChargingWatts = parsedWatts;
  const hostMatch = text.match(/(\d+)\s*x?\s*usb host\b|usb host/i);
  if (hostMatch) profile.hostPorts = Number(hostMatch[1] || 1);
  const deviceMatch = text.match(/(\d+)\s*x?\s*usb-a ports?\b|(\d+)\s*x?\s*usb-a\b/);
  if (deviceMatch) profile.devicePorts = Number(deviceMatch[1] || deviceMatch[2] || 1);
  const hubMatch = text.match(/(\d+)[-\s]*port\b.*usb(?:\s*3\.\d)?\s*hub/i);
  if (hubMatch) profile.devicePorts = Math.max(profile.devicePorts || 0, Number(hubMatch[1] || 0));
  if (profile.devicePorts > 0 && !profile.hostPorts) profile.hostPorts = 1;
  if (/kvm/.test(text)) profile.kvmSupport = true;
  if (/peripheral switching|usb host switching|usb routing/.test(text)) profile.peripheralSwitching = true;
  return Object.keys(profile).length > 0 ? profile : undefined;
}

function inferAudioList(description, existing) {
  if (Array.isArray(existing) && existing.length > 0) return dedupeStrings(existing, 16);
  const text = textBlob(description);
  const items = [];
  if (/audio de-embed|de-embedding/.test(text)) items.push("Audio De-embed");
  if (/analog audio/.test(text)) items.push("Analog Audio");
  if (/spdif|s\/pdif/.test(text)) items.push("S/PDIF");
  if (/dante/.test(text)) items.push("Dante");
  if (/aes67/.test(text)) items.push("AES67");
  if (/\barc\b/.test(text)) items.push("ARC");
  if (/\bearc\b/.test(text)) items.push("eARC");
  if (/dsp/.test(text)) items.push("DSP");
  if (/mixer|mixing/.test(text)) items.push("Mixer");
  if (/aec/.test(text)) items.push("AEC");
  if (/speaker/.test(text)) items.push("Speaker");
  return dedupeStrings(items, 16);
}

function inferControlList(description, integration, existing) {
  if (Array.isArray(existing) && existing.length > 0) return dedupeStrings(existing, 16);
  const text = textBlob(description);
  const items = [];
  if (integration?.lanControl) items.push("TCP/IP");
  if (integration?.webUi) items.push("Web UI");
  if (integration?.rs232) items.push("RS-232");
  if (integration?.ir) items.push("IR");
  if (integration?.cec) items.push("CEC");
  if (/usb/.test(text) && /controller|switcher|video bar|speakerphone/.test(text)) items.push("USB");
  return dedupeStrings(items, 16);
}

function inferFeatureList(description, existing, wireless, usb, integration, audio) {
  const derived = parseSegments(description).slice(1, 10);
  if (wireless?.airplay) derived.push("AirPlay");
  if (wireless?.miracast) derived.push("Miracast");
  if (wireless?.mst) derived.push("MST");
  if (usb?.kvmSupport) derived.push("KVM");
  if (usb?.usbCChargingWatts) derived.push(`${usb.usbCChargingWatts}W USB-C Charging`);
  if (integration?.relayCount) derived.push("Relays");
  if (audio?.includes("Dante")) derived.push("Dante");
  if (audio?.includes("AES67")) derived.push("AES67");
  return dedupeStrings([...(existing || []), ...derived], 24);
}

function allocatePortsByPattern(row, context, transport) {
  const text = tidy(row.description || row.summary || row.name);
  const lower = text.toLowerCase();
  const inputs = [];
  const outputs = [];
  const shape = text.match(/(\d+)\s*x\s*(\d+)/i);
  const totalInputs = Number(shape?.[1] || 0);
  const totalOutputs = Number(shape?.[2] || 0);

  if (context.group === "distribution" && totalInputs > 0 && totalOutputs > 0) {
    inputs.push(makePort("HDMI", totalInputs));
    outputs.push(makePort("HDMI", totalOutputs));
  }

  if (context.group === "matrix" && totalInputs > 0 && totalOutputs > 0) {
    const explicitHdmiUsb = text.match(/(\d+)\s*hdmi\s*(?:&|\+)\s*1\s*usb-c/i);
    if (explicitHdmiUsb) {
      inputs.push(makePort("HDMI", Number(explicitHdmiUsb[1])));
      inputs.push(makePort("USB-C", 1));
    } else if (/\busb-c\b/.test(lower)) {
      inputs.push(makePort("HDMI", Math.max(totalInputs - 1, 0)));
      inputs.push(makePort("USB-C", 1));
    } else {
      inputs.push(makePort("HDMI", totalInputs));
    }

    const hdBaseTLayout = text.match(/\((\d+)\s*hdbaset(?: tm| 2\.0| 3\.0)?[, ]+(\d+)\s*hdmi\)/i);
    const mirroredHdmi = Number(text.match(/(\d+)\s*x?\s*mirrored hdmi/i)?.[1] || 0);

    if (hdBaseTLayout) {
      outputs.push(makePort("HDBaseT", Number(hdBaseTLayout[1])));
      outputs.push(makePort("HDMI", Number(hdBaseTLayout[2])));
    } else if (mirroredHdmi > 0) {
      outputs.push(makePort("HDBaseT", totalOutputs));
      outputs.push(makePort("HDMI", mirroredHdmi));
    } else if (/hdbaset/.test(lower) && /hdmi/.test(lower) && /output/.test(lower)) {
      outputs.push(makePort("HDMI", Math.max(totalOutputs - 1, 0)));
      outputs.push(makePort("HDBaseT", 1));
    } else if (/hdbaset/.test(lower) && !/hdmi matrix/.test(lower)) {
      outputs.push(makePort("HDBaseT", totalOutputs));
    } else {
      outputs.push(makePort("HDMI", totalOutputs));
    }
  }

  if (context.group === "videowall") {
    const outputCount = Number(text.match(/(\d+)[-\s]*output video wall/i)?.[1] || totalOutputs || 1);
    inputs.push(makePort("HDMI", 1));
    outputs.push(makePort("HDMI", outputCount));
  }

  if (context.group === "accessory" || context.role === "in-desk-box") {
    const passthroughHdmiCount = Number(text.match(/(\d+)\s*hdmi(?:\s*&|\s*\+)?\s*(?:1\s*)?usb-c passthrough/i)?.[1] || text.match(/(\d+)\s*hdmi[^|]*passthrough/i)?.[1] || 0);
    if (passthroughHdmiCount > 0) {
      inputs.push(makePort("HDMI", passthroughHdmiCount));
      outputs.push(makePort("HDMI", passthroughHdmiCount));
    } else if (/\bhdmi\b/.test(lower) && /\bpassthrough\b/.test(lower)) {
      inputs.push(makePort("HDMI", 1));
      outputs.push(makePort("HDMI", 1));
    }
    if (/\busb-c\b/.test(lower) && /\bpassthrough\b/.test(lower)) {
      inputs.push(makePort("USB-C", 1));
      outputs.push(makePort("USB-C", 1));
    }
    if (/\brj-?45\b|\bethernet passthrough\b/.test(lower)) {
      inputs.push(makePort("RJ45", 1));
      outputs.push(makePort("RJ45", 1));
    }
    if (/\bcec passthrough\b/.test(lower)) outputs.push(makePort("CEC", 1));
    if (/\brs-?232 passthrough\b/.test(lower)) outputs.push(makePort("RS-232", 1));
    if (/\bir passthrough\b/.test(lower)) outputs.push(makePort("IR", 1));
  }

  if ((context.group === "switcher" || context.group === "uc") && inputs.length === 0) {
    const inputCount = Number(text.match(/(\d+)[-\s]*input/i)?.[1] || 0);
    const comboUsbCHdmiInput = /\busb-c\b[^|,;]*\bhdmi\b[^|,;]*\binput\b|\bhdmi\b[^|,;]*\busb-c\b[^|,;]*\binput\b/.test(lower);
    if (comboUsbCHdmiInput) {
      inputs.push(makePort("HDMI", 1));
      inputs.push(makePort("USB-C", 1));
    } else if (/\bhdmi input\b/.test(lower)) {
      inputs.push(makePort("HDMI", 1));
      if (/\busb-c input\b/.test(lower)) inputs.push(makePort("USB-C", 1));
    } else if (/\busb-c input\b/.test(lower)) {
      inputs.push(makePort("USB-C", 1));
    }
    if (inputCount > 0) {
      if (/\busb-c\b/.test(lower) && /hdmi/.test(lower)) {
        inputs.push(makePort("HDMI", Math.max(inputCount - 1, 0)));
        inputs.push(makePort("USB-C", 1));
      } else if (/\busb-c\b/.test(lower)) {
        inputs.push(makePort("USB-C", inputCount));
      } else {
        inputs.push(makePort("HDMI", inputCount));
      }
    }
  }

  if ((context.group === "switcher" || context.group === "uc") && outputs.length === 0) {
    const hdmiMatrixOutputs = Number(text.match(/(\d+)\s*hdmi matrix outputs?/i)?.[1] || 0);
    if (hdmiMatrixOutputs > 0) outputs.push(makePort("HDMI", hdmiMatrixOutputs));
    if (/\bhdmi out\b/.test(lower)) outputs.push(makePort("HDMI", hdmiMatrixOutputs || 1));
    if (/\bhdmi output\b/.test(lower)) outputs.push(makePort("HDMI", hdmiMatrixOutputs || 1));
    if (/\bhdbaset(?: tm| 2\.0| 3\.0)? out\b/.test(lower)) outputs.push(makePort("HDBaseT", 1));
    if (outputs.length === 0 && transport === "HDBaseT") outputs.push(makePort("HDBaseT", 1));
    if (outputs.length === 0) outputs.push(makePort("HDMI", 1));
  }

  if (context.group === "casting") {
    if (/\busb-c\b/.test(lower)) inputs.push(makePort("USB-C", 1));
    else if (/\bhdmi\b/.test(lower)) inputs.push(makePort("HDMI", 1));
    outputs.push(makePort("Wireless", 1));
  }

  if (context.group === "extender") {
    const localInputCount = Number(text.match(/(\d+)[-\s]*input/i)?.[1] || 0);
    const usbAPorts = Number(text.match(/(\d+)\s*x?\s*usb-a ports?/i)?.[1] || 0);
    const hasUsbC = /\busb-c\b/.test(lower);
    const hasHdmi = /\bhdmi\b/.test(lower);
    const isTx = context.role === "tx";
    const isRx = context.role === "rx";
    const isKit = context.role === "extender-kit";

    if (isTx || isKit) {
      if (localInputCount > 0 && hasHdmi) inputs.push(makePort("HDMI", Math.max(localInputCount - (hasUsbC ? 1 : 0), 1)));
      else if (hasHdmi) inputs.push(makePort("HDMI", 1));
      if (hasUsbC) inputs.push(makePort("USB-C", 1));
      if (/usb 2\.0|usb 3\.0|usb 3\.2|usb host/i.test(lower)) inputs.push(makePort("USB-B", 1));
      if (transport === "HDBaseT") outputs.push(makePort("HDBaseT", 1));
      if (transport === "AVoIP") outputs.push(makePort("RJ45", /2gbe/i.test(lower) ? 2 : 1));
      if (/loop out/i.test(lower)) outputs.push(makePort("HDMI", 1));
    }

    if (isRx) {
      if (transport === "HDBaseT") inputs.push(makePort("HDBaseT", 1));
      if (transport === "AVoIP") inputs.push(makePort("RJ45", /2gbe/i.test(lower) ? 2 : 1));
      if (localInputCount > 1) inputs.push(makePort("HDMI", localInputCount - 1));
      outputs.push(makePort("HDMI", 1));
      if (usbAPorts > 0) outputs.push(makePort("USB-A", usbAPorts));
    }
  }

  if (context.group === "avoip") {
    const networkPortCount = /2gbe|dual nic/i.test(lower) ? 2 : 1;
    if (context.role === "controller") {
      inputs.push(makePort("RJ45", networkPortCount));
      outputs.push(makePort("RJ45", networkPortCount));
    } else if (context.role === "encoder") {
      if (normalizeSku(row.sku).includes("124")) inputs.push(makePort("HDMI", 4));
      else if (/\bhdmi\b/.test(lower)) inputs.push(makePort("HDMI", 1));
      if (/\busb-c\b/.test(lower)) inputs.push(makePort("USB-C", 1));
      outputs.push(makePort(/sfp\+|sfp\b/i.test(text) ? "SFP" : "RJ45", networkPortCount));
      if (/\bloop out\b/.test(lower)) outputs.push(makePort("HDMI", 1));
    } else if (context.role === "decoder") {
      inputs.push(makePort(/sfp\+|sfp\b/i.test(text) ? "SFP" : "RJ45", networkPortCount));
      outputs.push(makePort("HDMI", 1));
    } else if (context.role === "transceiver") {
      inputs.push(makePort("HDMI", 1));
      inputs.push(makePort(/sfp\+|sfp\b/i.test(text) ? "SFP" : "RJ45", networkPortCount));
      outputs.push(makePort("HDMI", 1));
      outputs.push(makePort(/sfp\+|sfp\b/i.test(text) ? "SFP" : "RJ45", networkPortCount));
    } else {
      if (/\bhdmi\b/.test(lower)) inputs.push(makePort("HDMI", 1));
      outputs.push(makePort(/sfp\+|sfp\b/i.test(text) ? "SFP" : "RJ45", networkPortCount));
    }
  }

  if (context.group === "camera") {
    if (/usb 3\.0|usb 3\.2/.test(lower)) outputs.push(makePort("USB-A", 1));
    if (/\bhdmi out\b/.test(lower)) outputs.push(makePort("HDMI", 1));
    if (/\bndi\b|\bnetwork streaming\b/.test(lower)) outputs.push(makePort("RJ45", 1));
  }

  if (context.group === "audio") {
    if (/network amplifier|dante/.test(lower)) inputs.push(makePort("LAN", 1));
    if (/\bbluetooth\b/.test(lower)) inputs.push(makePort("Bluetooth", 1));
    if (/\b4x mics\b|\bmics\b/.test(lower)) inputs.push(makePort("Mic", Number(text.match(/(\d+)\s*x?\s*mics?\b/i)?.[1] || 1)));
    if (/\busb\b/.test(lower)) outputs.push(makePort(/\busb-c\b/.test(lower) ? "USB-C" : "USB-A", 1));
  }

  if (context.group === "control") {
    if (/poe|ethernet|web gui|tcp\/ip/.test(lower)) {
      inputs.push(makePort("LAN", 1));
      outputs.push(makePort("LAN", 1));
    }
    if (/rs232|rs-232/.test(lower)) outputs.push(makePort("RS-232", 1));
  }

  if (context.role === "hub" && inputs.length === 0 && outputs.length === 0) {
    const hubPortCount = Number(text.match(/(\d+)[-\s]*port\b.*usb(?:\s*3\.\d)?\s*hub/i)?.[1] || 0);
    if (hubPortCount > 0) {
      inputs.push(makePort(/\busb-c\b/.test(lower) && !/\busb 3\.0\b/.test(lower) ? "USB-C" : "USB-B", 1));
      outputs.push(makePort("USB-A", hubPortCount));
    }
  }

  if (context.role === "cable") {
    if (/\bhdmi\b/.test(lower)) {
      inputs.push(makePort("HDMI", 1));
      outputs.push(makePort("HDMI", 1));
    } else if (/\busb-c\b/.test(lower)) {
      inputs.push(makePort("USB-C", 1));
      outputs.push(makePort("USB-C", 1));
    } else if (/\busb\b/.test(lower)) {
      inputs.push(makePort("USB-A", 1));
      outputs.push(makePort("USB-A", 1));
    }
  }

  return {
    inputs: sortPorts(mergePorts(inputs)),
    outputs: sortPorts(mergePorts(outputs)),
  };
}

function buildEvidence(record, sourceUrl, capture, phase1) {
  const capturedAt = tidy(capture?.fetchedAt) || nowIso();
  const evidence = [];
  evidence.push({
    id: `${normalizeId(record.sku)}-summary`,
    type: "spec",
    label: "WyreStorm Summary",
    value: record.summary,
    sourceUrl,
    capturedAt,
    confidence: record.confidence,
    notes: phase1 ? "Merged from curated WyreStorm seed and 2026 SKU catalog." : "Derived from 2026 WyreStorm SKU catalog.",
  });
  if (record.inputs.length > 0 || record.outputs.length > 0) {
    evidence.push({
      id: `${normalizeId(record.sku)}-io`,
      type: "io",
      label: "WyreStorm I/O Profile",
      value: [
        record.inputs.length > 0 ? `Inputs: ${record.inputs.map((entry) => `${entry.count}x ${entry.type}`).join(", ")}` : "",
        record.outputs.length > 0 ? `Outputs: ${record.outputs.map((entry) => `${entry.count}x ${entry.type}`).join(", ")}` : "",
      ].filter(Boolean).join(" | "),
      sourceUrl,
      capturedAt,
      confidence: record.confidence,
      notes: "Derived from SKU family, naming, and product description.",
    });
  }
  const metaDescription = parseMetaDescription(capture?.html);
  if (metaDescription) {
    evidence.push({
      id: `${normalizeId(record.sku)}-capture`,
      type: "spec",
      label: "WyreStorm Product Page Capture",
      value: metaDescription,
      sourceUrl,
      capturedAt,
      confidence: Math.min(0.95, record.confidence + 0.05),
      notes: "Recovered from saved manufacturer page capture.",
    });
  }
  return evidence;
}

function buildReviewFlags(row, context, record) {
  const text = textBlob(row.sku, row.name, row.description);
  const flags = [];
  const portCriticalGroups = new Set(["distribution", "matrix", "videowall", "switcher", "uc", "extender", "avoip", "camera"]);
  if (/hyb|hybrid|empty custom matrix chassis/i.test(text) || (record.confidence < 0.75 && portCriticalGroups.has(context.group))) {
    flags.push({
      id: `flag_${normalizeId(row.sku)}_review`,
      kind: "categorisation",
      status: "open",
      message: `${normalizeSku(row.sku)} needs manual review to confirm final I/O modeling.`,
      note: "Generated from SKU and description patterns where the topology is likely correct but not fully explicit.",
      source: "wyrestorm-backfill",
      createdAt: nowIso(),
      createdBy: "wyrestorm-backfill",
      updatedAt: nowIso(),
    });
  }
  if (asArray(record.inputs).length === 0 && asArray(record.outputs).length === 0 && portCriticalGroups.has(context.group)) {
    flags.push({
      id: `flag_${normalizeId(row.sku)}_ports`,
      kind: "other",
      status: "open",
      message: `${normalizeSku(row.sku)} still lacks inferred ports and should be reviewed.`,
      note: "The description did not expose enough I/O structure for a safe automatic fill.",
      source: "wyrestorm-backfill",
      createdAt: nowIso(),
      createdBy: "wyrestorm-backfill",
      updatedAt: nowIso(),
    });
  }
  return flags;
}

function mergeRecord(existing, generated) {
  if (!existing) return generated;
  const retainedExistingReviewFlags = asArray(existing.reviewFlags).filter((entry) => tidy(entry?.source) !== "wyrestorm-backfill");
  return {
    ...existing,
    ...generated,
    sourceUrls: dedupeStrings([...(existing.sourceUrls || []), ...(generated.sourceUrls || [])], 12),
    features: dedupeStrings([...(existing.features || []), ...(generated.features || [])], 24),
    control: dedupeStrings([...(existing.control || []), ...(generated.control || [])], 16),
    audio: dedupeStrings([...(existing.audio || []), ...(generated.audio || [])], 16),
    tags: dedupeStrings([...(existing.tags || []), ...(generated.tags || [])], 32),
    evidence: mergeById(asArray(existing.evidence), asArray(generated.evidence)),
    reviewFlags: mergeById(retainedExistingReviewFlags, asArray(generated.reviewFlags)),
    inputs: generated.inputs.length > 0 ? generated.inputs : asArray(existing.inputs),
    outputs: generated.outputs.length > 0 ? generated.outputs : asArray(existing.outputs),
    video: generated.video || existing.video,
    distance: generated.distance || existing.distance,
    usb: generated.usb || existing.usb,
    wireless: generated.wireless || existing.wireless,
    integration: generated.integration || existing.integration,
    power: generated.power || existing.power,
    sourceType: existing.sourceType === "manual" ? existing.sourceType : generated.sourceType,
    confidence: Math.max(Number(existing.confidence) || 0, Number(generated.confidence) || 0),
    updatedAt: generated.updatedAt,
    lastCapturedAt: generated.lastCapturedAt,
    lastReviewedAt: existing.lastReviewedAt || generated.lastReviewedAt,
    reviewedBy: existing.reviewedBy || generated.reviewedBy,
    archived: Boolean(existing.archived),
  };
}

function buildWyrestormRecord(masterRow, phase1Row, capture, existingRecord) {
  const sku = normalizeSku(masterRow?.sku || phase1Row?.sku);
  const description = tidy(masterRow?.description || phase1Row?.summary || phase1Row?.name);
  const captureMeta = firstSentence(parseMetaDescription(capture?.html));
  const sourceUrl = sourceUrlForRow(masterRow || phase1Row || {}, capture);
  const context = classifyGroup(masterRow || phase1Row || {}, description);
  const transport = phase1Row?.transport || inferTransport(masterRow || phase1Row || {}, context, description);
  const inferredPorts = allocatePortsByPattern(masterRow || phase1Row || {}, context, transport);
  const ports = {
    inputs: sortPorts(mergePorts(asArray(phase1Row?.inputs), inferredPorts.inputs)),
    outputs: sortPorts(mergePorts(asArray(phase1Row?.outputs), inferredPorts.outputs)),
  };
  const wireless = phase1Row?.wireless || inferWireless(description, existingRecord?.wireless);
  const integration = phase1Row?.integration || inferIntegration(description, existingRecord?.integration);
  const usb = phase1Row?.usb || inferUsb(description, existingRecord?.usb);
  const power = phase1Row?.power || inferPower(description, masterRow || phase1Row || {}, existingRecord?.power);
  const audio = inferAudioList(description, phase1Row?.audio || existingRecord?.audio);
  const control = inferControlList(description, integration, phase1Row?.control || existingRecord?.control);
  const video = phase1Row?.video || inferVideo(description, existingRecord?.video);
  const distance = phase1Row?.distance || inferDistance(description, transport, existingRecord?.distance);
  const summary = tidy(phase1Row?.summary) || captureMeta || firstSentence(description) || tidy(masterRow?.name) || sku;
  const sourceUrls = dedupeStrings([sourceUrl, normalizeUrl(phase1Row?.sourceUrl), "https://www.wyrestorm.com/"], 12);
  const confidenceBase = phase1Row ? 0.88 : capture ? 0.84 : 0.78;
  const ambiguous = /hyb|hybrid|empty custom matrix chassis/i.test(textBlob(description, sku));
  const confidence = Math.max(0.62, Math.min(0.95, confidenceBase - (ambiguous ? 0.08 : 0)));
  const notes = dedupeStrings([
    tidy(existingRecord?.notes),
    phase1Row ? "Merged from curated WyreStorm seed catalog." : "",
    masterRow ? "Expanded from 2026 WyreStorm SKU catalog." : "",
    capture ? "Enriched from saved WyreStorm manufacturer page capture." : "",
    OFFICIAL_SKU_OVERRIDES[sku] ? "Adjusted from official WyreStorm product page details." : "",
  ], 12).join(" | ");

  let record = {
    id: `wyrestorm::wyrestorm::${sku}`,
    vendorType: "wyrestorm",
    brand: "WyreStorm",
    sku,
    name: tidy(phase1Row?.name) || tidy(masterRow?.name) || capture?.title || sku,
    family: tidy(phase1Row?.family) || tidy(masterRow?.family) || "Unknown",
    group: context.group,
    category: tidy(phase1Row?.category) || context.category,
    subcategory: tidy(phase1Row?.subcategory) || context.subcategory,
    classificationSource: phase1Row?.category || phase1Row?.subcategory ? "source" : "inferred",
    summary,
    technology: tidy(phase1Row?.technology) || context.technology,
    topology: tidy(phase1Row?.topology) || context.topology,
    role: tidy(phase1Row?.role) || context.role,
    directionality: tidy(phase1Row?.directionality) || context.directionality,
    outputBehavior: tidy(phase1Row?.outputBehavior) || context.outputBehavior,
    features: [],
    transport,
    inputs: ports.inputs,
    outputs: ports.outputs,
    control,
    audio,
    video,
    latency: tidy(phase1Row?.latency) || distance?.latencyClass || undefined,
    distance,
    distanceMeters: Number(distance?.meters) || undefined,
    usb,
    wireless,
    integration,
    power,
    status: "approved",
    confidence: Number(confidence.toFixed(2)),
    sourceType: capture ? "live" : "catalog",
    sourceUrls,
    tags: [],
    notes: notes || undefined,
    createdAt: tidy(existingRecord?.createdAt) || nowIso(),
    updatedAt: nowIso(),
    lastCapturedAt: tidy(capture?.fetchedAt) || nowIso(),
    lastReviewedAt: tidy(existingRecord?.lastReviewedAt) || (phase1Row ? nowIso() : undefined),
    reviewedBy: tidy(existingRecord?.reviewedBy) || (phase1Row ? "seed-catalog" : undefined),
    evidence: [],
    reviewFlags: [],
    archived: Boolean(existingRecord?.archived),
  };

  record = applyOfficialSkuOverrides(record);
  record.features = inferFeatureList(
    description,
    phase1Row?.features || existingRecord?.features,
    record.wireless,
    record.usb,
    record.integration,
    record.audio,
  );
  record.tags = dedupeStrings([
    record.technology, record.topology, record.role, record.directionality, record.outputBehavior,
    record.family, record.category, record.subcategory, record.group, record.transport,
    ...record.features, ...record.control, ...record.audio,
    ...record.inputs.map((entry) => entry.type), ...record.outputs.map((entry) => entry.type),
    record.video?.maxResolution, record.video?.maxFramerate, record.distance?.hdbasetClass,
    record.distance?.networkSpeed, record.distance?.codec,
  ], 32);
  record.reviewFlags = buildReviewFlags(masterRow || phase1Row || {}, context, record);
  record.evidence = buildEvidence(record, sourceUrl, capture, phase1Row);
  return record;
}

function sortRecords(records) {
  return records.sort((left, right) => {
    const vendorCmp = tidy(left.vendorType).localeCompare(tidy(right.vendorType));
    if (vendorCmp !== 0) return vendorCmp;
    const brandCmp = tidy(left.brand).localeCompare(tidy(right.brand));
    if (brandCmp !== 0) return brandCmp;
    return normalizeSku(left.sku).localeCompare(normalizeSku(right.sku));
  });
}

const existingDb = readJson(DB_PATH);
const phase1 = readJson(PHASE1_PATH);
const master = readJson(MASTER_PATH);
const liveCaptures = readJson(LIVE_CAPTURE_PATH);
const competitorCatalog = readJson(COMPETITOR_CATALOG_PATH);

const phase1BySku = new Map(asArray(phase1).map((row) => [normalizeSku(row.sku), row]));
const masterBySku = new Map(asArray(master).map((row) => [normalizeSku(row.sku), row]));
const existingById = new Map(asArray(existingDb.records).map((record) => [tidy(record.id), record]));
const captureEntries = Object.fromEntries(Object.entries(liveCaptures || {}).map(([key, value]) => [normalizeId(key), value]));

const wyrestormSkus = Array.from(new Set([...phase1BySku.keys(), ...masterBySku.keys()])).sort();
const generatedWyrestormRecords = wyrestormSkus.map((sku) => {
  const phase1Row = phase1BySku.get(sku);
  const masterRow = masterBySku.get(sku) || phase1Row || {};
  const existingRecord = existingById.get(`wyrestorm::wyrestorm::${sku}`);
  const capture = captureForSku(captureEntries, sku);
  return mergeRecord(existingRecord, buildWyrestormRecord(masterRow, phase1Row, capture, existingRecord));
});

const compareCatalogIds = new Set(
  asArray(competitorCatalog).map((row) => competitorIdFor(row.brand, row.sku)),
);
const existingCompetitorExtras = asArray(existingDb.records).filter(
  (record) => tidy(record.vendorType) === "competitor" && !compareCatalogIds.has(tidy(record.id)),
);
const competitorSeeds = [
  ...asArray(competitorCatalog),
  ...existingCompetitorExtras.map((record) => ({
    brand: record.brand,
    sku: record.sku,
    name: record.name,
    family: record.family,
    category: record.category,
    subcategory: record.subcategory,
    summary: record.summary,
    transport: record.transport,
    inputs: record.inputs,
    outputs: record.outputs,
    control: record.control,
    audio: record.audio,
    video: record.video,
    distance: record.distance,
    distanceMeters: record.distanceMeters,
    features: record.features,
    sourceUrl: asArray(record.sourceUrls)[0] || "",
    sourceUrls: record.sourceUrls,
    notes: record.notes,
    status: record.status,
  })),
];
const competitorRecords = competitorSeeds.map((row) => {
  const id = competitorIdFor(row.brand, row.sku);
  const existingRecord = existingById.get(id);
  return mergeRecord(existingRecord, buildCompetitorRecord(row, existingRecord));
});
const nextRecords = sortRecords([...competitorRecords, ...generatedWyrestormRecords]);

writeJson(DB_PATH, {
  version: Number(existingDb.version) || 1,
  generatedAt: tidy(existingDb.generatedAt) || nowIso(),
  updatedAt: nowIso(),
  records: nextRecords,
});

console.log("");
console.log("Product intelligence sync complete");
console.log(`  wyrestorm records: ${generatedWyrestormRecords.length}`);
console.log(`  competitor records retained: ${competitorRecords.length}`);
console.log(`  total records written: ${nextRecords.length}`);
