import fs from "node:fs/promises";
import path from "node:path";
import { resolveCompetitorLiveLookup } from "./live-lookup.mjs";
import {
  WYRESTORM_PRODUCT_INTELLIGENCE_FILE,
  WYRESTORM_SEED_CATALOG_FILE,
  WYRESTORM_SKU_MASTER_FILE,
} from "../catalog/files.mjs";

const MATCH_CACHE = new Map();
const WYRESTORM_PAGE_CACHE = new Map();

function tidy(value) {
  return String(value ?? "").trim();
}

function normalise(value) {
  return tidy(value).toLowerCase();
}

function squash(value) {
  return normalise(value).replace(/[^a-z0-9]+/g, "");
}

function nowIso() {
  return new Date().toISOString();
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

function flattenHtmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "WingmanResolveMatch/1.0",
        Accept: "text/html, text/plain, application/xhtml+xml",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractTitle(html, fallback = "") {
  const m = String(html || "").match(/<title>(.*?)<\/title>/i);
  return tidy(m?.[1] || fallback);
}

function extractSummary(text) {
  return tidy(String(text || "").replace(/\s+/g, " ").slice(0, 380));
}


function inferCompetitorProductUrl(manufacturer, model) {
  const m = normalise(manufacturer);
  const sku = tidy(model);

  if (!sku) return "";

  if (m === "atlona") return `https://atlona.com/product/${sku}`;
  if (m === "extron") return `https://www.extron.com/product/${sku.toLowerCase()}`;
  if (m === "kramer") return `https://www1.kramerav.com/Product/${sku}`;
  if (m === "crestron") return `https://www.crestron.com/Products/Model/${sku}`;
  if (m === "blustream") return `https://www.blustream.co.uk/product/${sku}`;

  return "";
}

function extractMetaDescription(html) {
  const source = String(html || "");
  const patterns = [
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["'][^>]*>/i,
    /<meta\s+content=["']([^"']+)["']\s+name=["']description["'][^>]*>/i,
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["'][^>]*>/i,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["'][^>]*>/i
  ];

  for (const rx of patterns) {
    const m = source.match(rx);
    if (m?.[1]) return tidy(m[1]);
  }

  return "";
}

function enhanceCompetitorProfile(profile) {
  const model = normalise(profile?.model);
  const title = normalise(profile?.title);
  const summary = normalise(profile?.summary);
  const blob = [model, title, summary].join(" ");

  const next = {
    ...profile,
    ports: { ...(profile?.ports || {}) },
    video: { ...(profile?.video || {}) },
    features: { ...(profile?.features || {}) },
  };

  if (blob.includes("wallplate")) {
    next.category = "Wallplate Transmitter";
  }

  if (blob.includes("transmitter") || /\btx\b/.test(model)) {
    next.role = "Encoder";
  }

  if (blob.includes("receiver") || blob.includes("decoder") || /\brx\b/.test(model)) {
    next.role = "Decoder";
  }

  if (blob.includes("presentation switcher")) {
    next.category = "Presentation Switcher";
  }

  if (blob.includes("hdbaset")) {
    next.transport = "HDBaseT";
  }

  if (model.includes("tx11") || model.includes("ome-tx11")) {
    next.role = "Encoder";
    next.category = "Wallplate Transmitter";
    next.transport = "HDBaseT";
    next.ports.hdmiIn = Math.max(1, Number(next.ports.hdmiIn || 0));
    next.ports.usbC = Math.max(1, Number(next.ports.usbC || 0));
    next.ports.hdbt = 1;
    next.formFactor = "wallplate";
    next.features.byod = true;
    next.features.usbRouting = true;
    next.features.collaboration = true;
  }

  if (model.includes("cs31") || blob.includes("omega")) {
    next.category = "Presentation Switcher";
  }

  return next;
}
function detectTransport(blob) {
  const b = normalise(blob);
  if (b.includes("hdbaset") || b.includes("dtp")) return "HDBaseT";
  if (b.includes("sdvoe")) return "AVoIP";
  if (b.includes("jpeg2000") || b.includes("j2k")) return "AVoIP";
  if (b.includes("h.264") || b.includes("h264") || b.includes("h.265") || b.includes("h265")) return "AVoIP";
  if (b.includes("av over ip") || b.includes("avoip") || b.includes("networkhd")) return "AVoIP";
  if (b.includes("usb extension") || b.includes("kvm extender")) return "USB Extension";
  if (b.includes("matrix") || b.includes("switcher") || b.includes("hdmi")) return "HDMI";
  return "Unknown";
}

function detectSubtype(blob) {
  const b = normalise(blob);
  if (b.includes("multiview") || b.includes("multi-view")) return "Multiview";
  if (b.includes("sdvoe")) return "SDVoE";
  if (b.includes("jpeg2000") || b.includes("j2k") || b.includes("networkhd")) return "JPEG2000";
  if (b.includes("h.264") || b.includes("h264") || b.includes("h.265") || b.includes("h265")) return "H.264/H.265";
  if (b.includes("proprietary") || b.includes("nvx") || b.includes("nav") || b.includes("omni")) return "Proprietary";
  return "Unknown";
}

function detectRole(blob) {
  const b = normalise(blob);
  if (b.includes("multiview")) return "Multiview Decoder";
  if (b.includes("matrix")) return "Matrix";
  if (b.includes("presentation switcher")) return "Presentation Switcher";
  if (b.includes("switcher")) return "Switcher";
  if (b.includes("encoder") || /\btx\b/.test(b) || b.includes("transmitter")) return "Encoder";
  if (b.includes("decoder") || /\brx\b/.test(b) || b.includes("receiver")) return "Decoder";
  if (b.includes("extender")) return "Extender";
  return "Unknown";
}

function detectCategory(blob) {
  const role = detectRole(blob);
  if (role !== "Unknown") return role;
  const b = normalise(blob);
  if (b.includes("camera")) return "Camera";
  if (b.includes("video wall")) return "Video Wall";
  return "Unknown";
}

function detectVideo(blob) {
  const b = normalise(blob);

  const maxResolution =
    b.includes("8k") ? "8K" :
    b.includes("4k60") || b.includes("4k 60") || b.includes("2160p60") ? "4K60" :
    b.includes("4k") || b.includes("2160p") ? "4K30" :
    b.includes("1080") ? "1080p" :
    "Unknown";

  const chroma =
    b.includes("4:4:4") ? "4:4:4" :
    b.includes("4:2:0") ? "4:2:0" :
    "Unknown";

  const bandwidth =
    b.includes("48g") || b.includes("48gbps") ? "48G" :
    b.includes("18g") || b.includes("18gbps") || b.includes("600mhz") ? "18G" :
    b.includes("10g") || b.includes("10.2g") || b.includes("10gbps") || b.includes("340mhz") ? "10G" :
    "Unknown";

  return { maxResolution, chroma, bandwidth };
}

function detectNumericNear(blob, regexes, fallback = 0) {
  const b = normalise(blob);
  for (const source of regexes) {
    const rx = new RegExp(source, "i");
    const m = b.match(rx);
    if (m && m[1]) return Number(m[1]);
  }
  return fallback;
}

function detectPortCounts(blob) {
  const b = normalise(blob);

  function firstNumber(patterns, fallback = 0) {
    for (const p of patterns) {
      const rx = new RegExp(p, "i");
      const m = b.match(rx);
      if (m?.[1]) return Number(m[1]);
    }
    return fallback;
  }

  return {
    hdmiIn: firstNumber([
      "(?:inputs?|in)\\s*[:\\-]?\\s*(\\d{1,2})\\s*x\\s*hdmi",
      "(\\d{1,2})\\s*x\\s*hdmi\\s*inputs?",
      "hdmi\\s*inputs?\\s*[:\\-]?\\s*(\\d{1,2})"
    ], 0),
    hdmiOut: firstNumber([
      "(?:outputs?|out)\\s*[:\\-]?\\s*(\\d{1,2})\\s*x\\s*hdmi",
      "(\\d{1,2})\\s*x\\s*hdmi\\s*outputs?",
      "hdmi\\s*outputs?\\s*[:\\-]?\\s*(\\d{1,2})"
    ], 0),
    usbC: firstNumber([
      "(\\d{1,2})\\s*x\\s*usb-c",
      "usb-c\\s*[:\\-]?\\s*(\\d{1,2})"
    ], 0),
    usbHost: firstNumber([
      "(\\d{1,2})\\s*x\\s*usb\\s*host",
      "usb\\s*host\\s*[:\\-]?\\s*(\\d{1,2})"
    ], 0),
    usbDevice: firstNumber([
      "(\\d{1,2})\\s*x\\s*usb\\s*device",
      "usb\\s*device\\s*[:\\-]?\\s*(\\d{1,2})"
    ], 0),
    hdbt: firstNumber([
      "(\\d{1,2})\\s*x\\s*hdbaset",
      "hdbaset\\s*outputs?\\s*[:\\-]?\\s*(\\d{1,2})",
      "hdbaset\\s*in\\s*[:\\-]?\\s*(\\d{1,2})",
      "hdbaset\\s*out\\s*[:\\-]?\\s*(\\d{1,2})"
    ], 0),
    lan: firstNumber([
      "(\\d{1,2})\\s*x\\s*(?:lan|ethernet|rj-?45)",
      "(?:lan|ethernet|rj-?45)\\s*[:\\-]?\\s*(\\d{1,2})"
    ], 0),
  };
}


function detectFormFactor(blob, model = "") {
  const b = normalise(blob);
  const m = normalise(model);

  if (b.includes("wallplate") || b.includes("wall plate") || b.includes("1-gang") || b.includes("decora")) {
    return "wallplate";
  }

  if (b.includes("matrix kit")) return "matrix-kit";
  if (b.includes("matrix")) return "matrix";
  if (b.includes("receiver")) return "receiver";
  if (b.includes("transmitter") || /\btx\b/.test(m)) return "transmitter";
  if (b.includes("decoder") || /\brx\b/.test(m)) return "receiver";

  return "unknown";
}


function countByPatterns(blob, patterns, fallback = 0) {
  const b = normalise(blob);
  for (const pattern of patterns) {
    const rx = new RegExp(pattern, "i");
    const m = b.match(rx);
    if (m?.[1]) return Number(m[1]);
  }
  return fallback;
}

function detectDistances(blob) {
  const b = normalise(blob);
  const meters = countByPatterns(b, [
    "(\\d{1,3})\\s*m(?:eters?)?\\b",
    "up to\\s*(\\d{1,3})\\s*m\\b"
  ], 0);

  const feet = countByPatterns(b, [
    "(\\d{2,4})\\s*ft\\b",
    "(\\d{2,4})\\s*feet\\b"
  ], 0);

  return { meters, feet };
}

function detectHdcp(blob) {
  const b = normalise(blob);
  if (b.includes("hdcp 2.3")) return "2.3";
  if (b.includes("hdcp 2.2")) return "2.2";
  if (b.includes("hdcp 1.4")) return "1.4";
  return "Unknown";
}

function detectControl(blob) {
  const b = normalise(blob);
  return {
    rs232: b.includes("rs-232") || b.includes("rs232"),
    ir: b.includes(" ir ") || b.includes("ir passthrough") || b.includes("ir pass-through"),
    cec: b.includes(" cec ") || b.includes("cec pass"),
    relay: b.includes(" relay ") || b.includes("relays "),
    ethernetPassthrough: b.includes("ethernet passthrough") || b.includes("bidirectional ethernet"),
  };
}

function detectAudio(blob) {
  const b = normalise(blob);
  return {
    audioBreakout: b.includes("audio breakout"),
    audioDeEmbed: b.includes("de-embed") || b.includes("deembed"),
    analogAudioOut: b.includes("analog audio") || b.includes("line out") || b.includes("balanced audio"),
  };
}

function detectExactFormFactor(blob, model = "") {
  const b = normalise(blob);
  const m = normalise(model);

  if (b.includes("wallplate") || b.includes("wall plate") || b.includes("1-gang") || b.includes("decora")) return "wallplate";
  if (b.includes("rackmount") || b.includes("1u chassis") || b.includes("rack mount")) return "rackmount";
  if (b.includes("kit") || m.includes("-kit")) return "kit";
  if (b.includes("desktop")) return "desktop";
  return detectFormFactor(blob, model);
}

function detectDeviceClass(blob, model = "") {
  const b = normalise(blob);
  const m = normalise(model);

  if (b.includes("presentation switcher")) return "presentation-switcher";
  if (b.includes("matrix kit")) return "matrix-kit";
  if (b.includes("matrix")) return "matrix";
  if (b.includes("wallplate") && (b.includes("transmitter") || /\btx\b/.test(m))) return "wallplate-transmitter";
  if (b.includes("wallplate") && (b.includes("receiver") || /\brx\b/.test(m))) return "wallplate-receiver";
  if (b.includes("transmitter") || /\btx\b/.test(m)) return "transmitter";
  if (b.includes("receiver") || b.includes("decoder") || /\brx\b/.test(m)) return "receiver";
  if (b.includes("extender")) return "extender";
  if (b.includes("encoder")) return "encoder";
  if (b.includes("decoder")) return "decoder";
  return "unknown";
}

function extractStructuredSpecs(profile) {
  const blob = [
    profile.title,
    profile.summary,
    profile.rawText,
    ...truthyFeatureNames(profile.features),
  ].filter(Boolean).join(" ");

  return {
    formFactor: detectExactFormFactor(blob, profile.model),
    deviceClass: detectDeviceClass(blob, profile.model),
    distances: detectDistances(blob),
    hdcp: detectHdcp(blob),
    control: detectControl(blob),
    audio: detectAudio(blob),
  };
}

function enrichProfile(profile) {
  const structured = extractStructuredSpecs(profile);
  return {
    ...profile,
    formFactor: structured.formFactor || profile.formFactor,
    deviceClass: structured.deviceClass,
    distances: structured.distances,
    hdcp: structured.hdcp,
    control: structured.control,
    audio: {
      ...(profile.audio || {}),
      ...structured.audio,
    },
  };
}

function isCandidateClassCompatible(competitor, candidate) {
  const c = competitor.deviceClass || "unknown";
  const w = candidate.deviceClass || "unknown";

  if (c === "unknown" || w === "unknown") return true;
  if (c === w) return true;

  const compatiblePairs = new Set([
    "transmitter|encoder",
    "encoder|transmitter",
    "receiver|decoder",
    "decoder|receiver",
    "transmitter|extender",
    "receiver|extender",
    "extender|transmitter",
    "extender|receiver",
    "wallplate-transmitter|transmitter",
    "wallplate-transmitter|encoder",
    "wallplate-receiver|receiver",
    "wallplate-receiver|decoder",
  ]);

  return compatiblePairs.has(`${c}|${w}`);
}

function comparisonRow(label, competitorValue, wyrestormValue) {
  const a = String(competitorValue ?? "").trim();
  const b = String(wyrestormValue ?? "").trim();
  return {
    label,
    competitor: a || "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â",
    wyrestorm: b || "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â",
    matches: a !== "" && b !== "" && a === b,
  };
}

function buildComparisonRows(competitor, wyrestorm) {
  return [
    comparisonRow("Device class", competitor.deviceClass, wyrestorm.deviceClass),
    comparisonRow("Form factor", competitor.formFactor, wyrestorm.formFactor),
    comparisonRow("Transport", competitor.transport, wyrestorm.transport),
    comparisonRow("Role", competitor.role, wyrestorm.role),
    comparisonRow("HDMI inputs", competitor.ports?.hdmiIn, wyrestorm.ports?.hdmiIn),
    comparisonRow("HDMI outputs", competitor.ports?.hdmiOut, wyrestorm.ports?.hdmiOut),
    comparisonRow("USB-C", competitor.ports?.usbC, wyrestorm.ports?.usbC),
    comparisonRow("HDBaseT", competitor.ports?.hdbt, wyrestorm.ports?.hdbt),
    comparisonRow("LAN", competitor.ports?.lan, wyrestorm.ports?.lan),
    comparisonRow("Max resolution", competitor.video?.maxResolution, wyrestorm.video?.maxResolution),
    comparisonRow("Chroma", competitor.video?.chroma, wyrestorm.video?.chroma),
    comparisonRow("Bandwidth", competitor.video?.bandwidth, wyrestorm.video?.bandwidth),
    comparisonRow("HDCP", competitor.hdcp, wyrestorm.hdcp),
    comparisonRow("RS-232", competitor.control?.rs232, wyrestorm.control?.rs232),
    comparisonRow("IR", competitor.control?.ir, wyrestorm.control?.ir),
    comparisonRow("CEC", competitor.control?.cec, wyrestorm.control?.cec),
    comparisonRow("Relay", competitor.control?.relay, wyrestorm.control?.relay),
    comparisonRow("Audio de-embed", competitor.audio?.audioDeEmbed, wyrestorm.audio?.audioDeEmbed),
    comparisonRow("Audio breakout", competitor.audio?.audioBreakout, wyrestorm.audio?.audioBreakout),
  ];
}
function featurePenalty(candidate, competitor) {
  let penalty = 0;

  if (competitor.formFactor === "wallplate" && candidate.formFactor !== "wallplate") {
    penalty += 20;
  }

  if (competitor.role === "Encoder" && candidate.role !== "Encoder") {
    penalty += 18;
  }

  if (competitor.role === "Decoder" && candidate.role !== "Decoder") {
    penalty += 18;
  }

  if (competitor.category === "Wallplate Transmitter" && candidate.category === "Matrix") {
    penalty += 22;
  }

  return penalty;
}
function detectFeatures(blob) {
  const b = normalise(blob);
  return {
    scaling: b.includes(" scaler ") || b.includes(" scaling "),
    kvm: b.includes(" kvm "),
    videoWall: b.includes(" video wall "),
    audioBreakout: b.includes("audio breakout") || b.includes("de-embed") || b.includes("deembed"),
    multiview: b.includes("multiview") || b.includes("multi-view"),
    hdr: b.includes(" hdr ") || b.includes("hdr10") || b.includes("dolby vision") || b.includes("hlg"),
    byod: b.includes(" byod "),
    usbRouting: b.includes("usb routing") || b.includes("usb-c") || b.includes("usb c"),
    collaboration: b.includes(" collaboration ") || b.includes(" meeting room ") || b.includes(" conferencing "),
  };
}

function truthyFeatureNames(features) {
  if (Array.isArray(features)) return features;
  if (features && typeof features === "object") {
    return Object.entries(features)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
  }
  return [];
}

function toStructuredProfile(input) {
  const blob = [
    input.manufacturer,
    input.model,
    input.title,
    input.summary,
    input.category,
    input.transport,
    input.subtype,
    input.role,
    ...(input.keySpecs || []),
    ...truthyFeatureNames(input.features),
    input.rawText,
  ].filter(Boolean).join(" ");

  const ports = input.ports && typeof input.ports === "object"
    ? {
        hdmiIn: Number(input.ports.hdmiIn || input.ports.inputs || 0),
        hdmiOut: Number(input.ports.hdmiOut || input.ports.outputs || 0),
        usbC: Number(input.ports.usbC || 0),
        usbHost: Number(input.ports.usbHost || 0),
        usbDevice: Number(input.ports.usbDevice || 0),
        hdbt: Number(input.ports.hdbt || 0),
        lan: Number(input.ports.lan || 0),
      }
    : detectPortCounts(blob);

  return {
    manufacturer: tidy(input.manufacturer),
    model: tidy(input.model),
    title: tidy(input.title || input.model),
    summary: tidy(input.summary),
    category: tidy(input.category || detectCategory(blob)),
    transport: tidy(input.transport || detectTransport(blob)),
    subtype: tidy(input.subtype || detectSubtype(blob)),
    role: tidy(input.role || detectRole(blob)),
    video: input.video || detectVideo(blob),
    ports,
    features: input.features && typeof input.features === "object"
      ? input.features
      : detectFeatures(blob),
    keySpecs: Array.isArray(input.keySpecs) ? input.keySpecs : [],
    formFactor: tidy(input.formFactor || detectFormFactor(blob, input.model)),
    rawText: tidy(input.rawText || blob),
  };
}

function extractCompetitorProfileFromLivePayload(payload, manufacturer, model) {
  const html = String(payload?.html || "");
  const text = String(payload?.text || "");
  const title = tidy(payload?.title || extractTitle(html, model));
  const summary = tidy(
    payload?.summary ||
    extractMetaDescription(html) ||
    extractSummary(text)
  );

  const base = toStructuredProfile({
    manufacturer,
    model,
    title,
    summary,
    keySpecs: Array.isArray(payload?.keySpecs) ? payload.keySpecs : [],
    rawText: text,
  });

  return enhanceCompetitorProfile(base);
}

async function getWyreStormCatalog() {
  const primary = await readJsonFile(WYRESTORM_SKU_MASTER_FILE, null);
  if (Array.isArray(primary) && primary.length) return primary;

  const fallback = await readJsonFile(WYRESTORM_SEED_CATALOG_FILE, []);
  return Array.isArray(fallback) ? fallback : [];
}

function pickSku(row) {
  return tidy(
    row?.sku ||
    row?.SKU ||
    row?.model ||
    row?.Model ||
    row?.name ||
    row?.Name
  );
}

function pickName(row) {
  return tidy(
    row?.name ||
    row?.Name ||
    row?.title ||
    row?.Title ||
    row?.sku ||
    row?.SKU
  );
}

function pickBlob(row) {
  const parts = [];
  for (const key of Object.keys(row || {})) {
    const value = row[key];
    if (typeof value === "string") parts.push(value);
    if (Array.isArray(value)) parts.push(...value.filter((v) => typeof v === "string"));
  }
  return parts.join(" ");
}

function buildCandidateFromCatalog(row) {
  const sku = pickSku(row);
  const name = pickName(row);
  const blob = pickBlob(row);

  return {
    sku,
    name,
    deviceClass: detectDeviceClass(blob, sku),
    transport: detectTransport(blob),
    subtype: detectSubtype(blob),
    role: detectRole(blob),
    category: detectCategory(blob),
    video: detectVideo(blob),
    ports: detectPortCounts(blob),
    features: detectFeatures(blob),
    formFactor: detectExactFormFactor(blob, sku),
    blob,
  };
}

function shortlistWyreStormCandidates(competitorProfile, rows, limit = 5) {
  const candidates = rows
    .map(buildCandidateFromCatalog)
    .filter((item) => item.sku);

  const scored = candidates.map((candidate) => {
    let score = 0;

    if (candidate.transport === competitorProfile.transport) score += 30;
    if (candidate.role === competitorProfile.role) score += 25;
    if (candidate.category === competitorProfile.category) score += 15;
    if (candidate.subtype === competitorProfile.subtype && competitorProfile.subtype !== "Unknown") score += 12;

    if (candidate.video.maxResolution === competitorProfile.video.maxResolution) score += 8;
    if (candidate.video.bandwidth === competitorProfile.video.bandwidth) score += 5;
    if (candidate.video.chroma === competitorProfile.video.chroma) score += 5;

    const ioFields = ["hdmiIn", "hdmiOut", "usbC", "usbHost", "usbDevice", "hdbt", "lan"];
    for (const key of ioFields) {
      const a = Number(candidate.ports[key] || 0);
      const b = Number(competitorProfile.ports[key] || 0);
      if (a > 0 && b > 0) {
        if (a === b) score += 2;
        else score += Math.max(0, 2 - Math.abs(a - b));
      }
    }

    const featureKeys = ["scaling", "kvm", "videoWall", "audioBreakout", "multiview", "hdr", "byod", "usbRouting", "collaboration"];
    for (const key of featureKeys) {
      if (candidate.features[key] === competitorProfile.features[key]) score += 2;
    }

    score -= featurePenalty(candidate, competitorProfile);
        if (!isCandidateClassCompatible(competitorProfile, candidate)) { score -= 30; }
    return { ...candidate, shortlistScore: score };
  });

  return scored
    .sort((a, b) => b.shortlistScore - a.shortlistScore || a.sku.localeCompare(b.sku))
    .slice(0, limit);
}

function buildWyreStormProductUrl(sku) {
  return `https://www.wyrestorm.com/product/${encodeURIComponent(String(sku || "").trim())}`;
}

async function loadWyreStormPersistentCache() {
  const rows = await readJsonFile(WYRESTORM_PRODUCT_INTELLIGENCE_FILE, {});
  if (!rows || typeof rows !== "object") return {};
  return rows;
}

async function saveWyreStormPersistentCache(cache) {
  await writeJsonFile(WYRESTORM_PRODUCT_INTELLIGENCE_FILE, cache);
}

async function fetchWyreStormPage(sku) {
  const cacheKey = squash(sku);
  const memory = WYRESTORM_PAGE_CACHE.get(cacheKey);
  if (memory) return { ...memory, cacheHit: true };

  const persistentCache = await loadWyreStormPersistentCache();
  const disk = persistentCache[cacheKey];
  if (disk) {
    WYRESTORM_PAGE_CACHE.set(cacheKey, disk);
    return { ...disk, cacheHit: true };
  }

  const url = buildWyreStormProductUrl(sku);
  const response = await fetchWithTimeout(url, {}, 12000);

  if (!response.ok) {
    return {
      ok: false,
      sku,
      url,
      error: `WyreStorm page fetch failed: ${response.status}`,
      cacheHit: false,
    };
  }

  const html = await response.text();
  const text = flattenHtmlToText(html);

  const result = {
    ok: true,
    sku,
    url,
    html,
    text,
    title: extractTitle(html, sku),
    cacheHit: false,
    fetchedAt: nowIso(),
  };

  WYRESTORM_PAGE_CACHE.set(cacheKey, result);
  persistentCache[cacheKey] = result;
  await saveWyreStormPersistentCache(persistentCache);

  return result;
}

function buildWyreStormProfile(page, fallbackCandidate) {
  return enrichProfile(toStructuredProfile({
    manufacturer: "WyreStorm",
    model: fallbackCandidate.sku,
    title: page.title || fallbackCandidate.name || fallbackCandidate.sku,
    summary: extractSummary(page.text),
    keySpecs: [],
    rawText: page.text,
    category: fallbackCandidate.category,
    transport: fallbackCandidate.transport,
    subtype: fallbackCandidate.subtype,
    role: fallbackCandidate.role,
    video: fallbackCandidate.video,
    ports: fallbackCandidate.ports,
    features: fallbackCandidate.features,
  }));
}

function coveragePercent(total, matched) {
  if (total <= 0) return 0;
  return Math.round((matched / total) * 100);
}

function computeIoCoverage(a, b) {
  const keys = ["hdmiIn", "hdmiOut", "usbC", "usbHost", "usbDevice", "hdbt", "lan"];
  let comparable = 0;
  let matched = 0;

  for (const key of keys) {
    const av = Number(a.ports[key] || 0);
    const bv = Number(b.ports[key] || 0);
    if (av > 0 || bv > 0) {
      comparable += 1;
      if (av === bv) matched += 1;
    }
  }

  return coveragePercent(comparable, matched);
}

function computeFeatureCoverage(a, b) {
  const keys = ["scaling", "kvm", "videoWall", "audioBreakout", "multiview", "hdr", "byod", "usbRouting", "collaboration"];
  let comparable = 0;
  let matched = 0;

  for (const key of keys) {
    if (typeof a.features[key] === "boolean" || typeof b.features[key] === "boolean") {
      comparable += 1;
      if (Boolean(a.features[key]) === Boolean(b.features[key])) matched += 1;
    }
  }

  return coveragePercent(comparable, matched);
}

function scoreProfiles(competitor, wyrestorm) {
  let categoryScore = 0;
  let inputsScore = 0;
  let outputsScore = 0;
  let resolutionScore = 0;
  let transportScore = 0;
  let audioFeatureScore = 0;
  let latencyScore = 0;

  if (competitor.category !== "Unknown" && wyrestorm.category === competitor.category) categoryScore = 30;
  else if (wyrestorm.role === competitor.role && competitor.role !== "Unknown") categoryScore = 20;

  const inA = Number(competitor.ports.hdmiIn || 0) + Number(competitor.ports.usbC || 0);
  const inB = Number(wyrestorm.ports.hdmiIn || 0) + Number(wyrestorm.ports.usbC || 0);
  inputsScore =
    inA === 0 || inB === 0 ? 6 :
    inA === inB ? 15 :
    Math.max(0, 15 - Math.min(15, Math.abs(inA - inB) * 3));

  const outA = Number(competitor.ports.hdmiOut || 0) + Number(competitor.ports.hdbt || 0);
  const outB = Number(wyrestorm.ports.hdmiOut || 0) + Number(wyrestorm.ports.hdbt || 0);
  outputsScore =
    outA === 0 || outB === 0 ? 6 :
    outA === outB ? 15 :
    Math.max(0, 15 - Math.min(15, Math.abs(outA - outB) * 4));

  resolutionScore =
    competitor.video.maxResolution === wyrestorm.video.maxResolution ? 10 :
    competitor.video.maxResolution === "Unknown" || wyrestorm.video.maxResolution === "Unknown" ? 4 :
    0;

  transportScore =
    competitor.transport === wyrestorm.transport ? 10 :
    competitor.transport === "Unknown" || wyrestorm.transport === "Unknown" ? 4 :
    0;

  const featureKeys = ["audioBreakout", "hdr"];
  for (const key of featureKeys) {
    if (Boolean(competitor.features[key]) === Boolean(wyrestorm.features[key])) audioFeatureScore += 5;
  }

  latencyScore = 10;

  const total = Math.round(
    categoryScore +
    inputsScore +
    outputsScore +
    resolutionScore +
    transportScore +
    audioFeatureScore +
    latencyScore
  );

  const ioCoverage = computeIoCoverage(competitor, wyrestorm);
  const featureCoverage = computeFeatureCoverage(competitor, wyrestorm);

  const confidenceScore = Math.round(
    Math.min(100,
      total * 0.55 +
      ioCoverage * 0.25 +
      featureCoverage * 0.20
    )
  );

  const confidence =
    confidenceScore >= 80 ? "High" :
    confidenceScore >= 60 ? "Medium" :
    "Low";

  const matchType =
    total >= 85 ? "DIRECT MATCH" :
    total >= 70 ? "CLOSE MATCH" :
    total >= 55 ? "ALTERNATIVE" :
    "TECHNOLOGY DIFFERENCE";

  return {
    matchScore: Math.min(100, total),
    breakdown: {
      categoryScore,
      inputsScore,
      outputsScore,
      resolutionScore,
      transportScore,
      audioFeatureScore,
      latencyScore,
    },
    ioCoverage,
    featureCoverage,
    confidence,
    confidenceScore,
    matchType,
  };
}

export async function resolveCompetitorMatch(payload) {
  const manufacturer = tidy(payload?.manufacturer);
  const model = tidy(payload?.model);
  const productUrl = tidy(payload?.productUrl);

  const cacheKey = JSON.stringify({
    manufacturer: normalise(manufacturer),
    model: normalise(model),
    productUrl,
  });

  const cached = MATCH_CACHE.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      cacheHit: true,
    };
  }

  const competitorLive = await resolveCompetitorLiveLookup({
    manufacturer,
    model,
    productUrl,
  });

  if (!competitorLive?.ok) {
    return {
      ok: false,
      error: competitorLive?.error || "Competitor live lookup failed.",
      cacheHit: false,
    };
  }

  const competitorProfile = enrichProfile(extractCompetitorProfileFromLivePayload(competitorLive, manufacturer, model));

  const wyrestormRows = await getWyreStormCatalog();
  const shortlist = shortlistWyreStormCandidates(competitorProfile, wyrestormRows, 5);

  const ranked = [];
  for (const candidate of shortlist) {
    const page = await fetchWyreStormPage(candidate.sku);
    if (!page.ok) continue;

    const profile = buildWyreStormProfile(page, candidate);
    const scored = scoreProfiles(competitorProfile, profile);

    const comparison_rows = buildComparisonRows(competitorProfile, profile);

    ranked.push({
      sku: candidate.sku,
      name: profile.title,
      match_score: scored.matchScore,
      match_type: scored.matchType,
      confidence: scored.confidence,
      confidence_score: scored.confidenceScore,
      io_coverage: scored.ioCoverage,
      feature_coverage: scored.featureCoverage,
      resolvedUrl: page.url,
      summary: profile.summary,
      profile,
      comparison_rows,
      breakdown: scored.breakdown,
      verified_catalog_sku: true,
      live_spec_extracted: true,
    });
  }

  ranked.sort((a, b) => b.match_score - a.match_score || b.confidence_score - a.confidence_score || a.sku.localeCompare(b.sku));

  const best = ranked[0] || null;
  const alternatives = best ? ranked.filter((item) => item.sku !== best.sku) : [];

  const result = {
    ok: true,
    cacheHit: false,
    fetchedAt: nowIso(),
    competitor_product: {
      manufacturer: competitorProfile.manufacturer,
      model: competitorProfile.model,
      title: competitorProfile.title,
      category: competitorProfile.category,
      transport: competitorProfile.transport,
      role: competitorProfile.role,
      summary: competitorProfile.summary,
      resolvedUrl: competitorLive.resolvedUrl || competitorLive.discoveryUrl || productUrl || inferCompetitorProductUrl(manufacturer, model),
      ports: competitorProfile.ports,
      video: competitorProfile.video,
      features: competitorProfile.features,
    },
    best_match: best,
    alternatives,
    shortlist_count: shortlist.length,
    resolved_competitor_url: competitorLive.resolvedUrl || competitorLive.discoveryUrl || productUrl || inferCompetitorProductUrl(manufacturer, model),
  };

  MATCH_CACHE.set(cacheKey, result);
  return result;
}
