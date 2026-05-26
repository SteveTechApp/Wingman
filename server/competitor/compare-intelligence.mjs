import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const DEFAULT_TIMEOUT_MS = Number(process.env.LOOKUP_SEARCH_TIMEOUT_MS || 12000);
const MAX_PAGES_TO_READ = Number(process.env.LOOKUP_MAX_PAGES_TO_READ || 6);

const WYRESTORM_PRODUCT_FILES = [
  "data/wyrestorm-product-intelligence.json",
  "public/product-intelligence-index.json",
  "data/products.json",
  "src/data/products.json"
];
const ACTIVE_SKU_MASTER_FILE = "data/catalog/wyrestormSkuCatalog.2026.json";
const MINIMUM_PROFESSIONAL_MATCH_SCORE = 70;
const MINIMUM_ANY_MATCH_SCORE = 42;

async function loadLocalEnvFile() {
  try {
    const raw = await fs.readFile(path.join(repoRoot, ".env"), "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const index = trimmed.indexOf("=");

      if (index <= 0) {
        continue;
      }

      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    return;
  }
}

await loadLocalEnvFile();

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return cleanText(value).toLowerCase();
}

function skuKey(value) {
  return cleanText(value).toUpperCase();
}

function ensureArrayPayload(value) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    if (Array.isArray(value.records)) return value.records;
    if (Array.isArray(value.products)) return value.products;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.catalog)) return value.catalog;
    if (Array.isArray(value.data)) return value.data;
  }

  return [];
}

function hasAny(text, patterns) {
  const value = String(text ?? "");
  return patterns.some((pattern) => pattern.test(value));
}

function scorePatterns(text, patterns) {
  const value = String(text ?? "");
  return patterns.reduce((total, pattern) => total + (pattern.test(value) ? 1 : 0), 0);
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyFn(item);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function normaliseProductUrl(value) {
  const trimmed = cleanText(value);

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) {
    return "https://" + trimmed;
  }

  return "";
}

function makeSkuVariants(rawSku) {
  const raw = cleanText(rawSku);
  const noSpaces = raw.replace(/\s+/g, "");
  const compact = noSpaces.replace(/[^a-z0-9]/gi, "");

  return {
    raw,
    lower: noSpaces.toLowerCase(),
    upper: noSpaces.toUpperCase(),
    compactLower: compact.toLowerCase(),
    encoded: encodeURIComponent(noSpaces)
  };
}

function buildDirectVendorUrls(brand, sku, productUrl) {
  const urls = [];
  const known = normaliseProductUrl(productUrl);

  if (known) {
    urls.push({ url: known, title: cleanText(brand + " " + sku + " known product page") });
  }

  const vendor = lower(brand);
  const skuLower = lower(sku).replace(/[^a-z0-9]/g, "");
  const variants = makeSkuVariants(sku);

  if (vendor.includes("extron")) {
    if (skuLower === "navd121") {
      urls.push({ url: "https://www.extron.com/product/navd121", title: "Extron NAV D 121" });
    }

    if (skuLower === "nave121") {
      urls.push({ url: "https://www.extron.com/product/nave121", title: "Extron NAV E 121" });
    }

    urls.push(
      { url: "https://www.extron.com/product/" + variants.compactLower, title: cleanText(brand + " " + sku) },
      { url: "https://www.extron.com/product/" + variants.lower, title: cleanText(brand + " " + sku) }
    );
  }

  if (vendor.includes("blustream") || vendor.includes("blu stream")) {
    if (skuLower === "c88cs") {
      urls.push({ url: "https://www.blustream.co.uk/8x8-hdbaset-matrix-c88cs", title: "Blustream C88CS" });
    }

    if (skuLower === "pla88cs") {
      urls.push({ url: "https://www.blustream.co.uk/8x8-hdbaset-matrix-pla88cs", title: "Blustream PLA88CS" });
    }
  }

  if (vendor.includes("avpro") || vendor.includes("av pro")) {
    urls.push(
      { url: "https://www.avproedge.com/" + variants.lower + ".html", title: cleanText(brand + " " + sku) },
      { url: "https://www.avproedge.com/" + variants.upper + ".html", title: cleanText(brand + " " + sku) }
    );
  }

  if (vendor.includes("kramer")) {
    urls.push(
      { url: "https://www1.kramerav.com/product/" + variants.lower, title: cleanText(brand + " " + sku) },
      { url: "https://www1.kramerav.com/product/" + variants.upper, title: cleanText(brand + " " + sku) }
    );
  }

  return uniqueBy(urls, (item) => item.url);
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 WingmanCompare/1.0",
        "accept": "text/html,application/xhtml+xml,application/xml,text/plain,*/*",
        "accept-language": "en-GB,en;q=0.9"
      }
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      text
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      text: "",
      error: error?.message || String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function sourceExcerpt(text, sku, productName) {
  const readable = stripHtml(text);
  const low = lower(readable);
  const skuNeedle = lower(sku);
  const nameNeedle = lower(productName);

  let index = skuNeedle ? low.indexOf(skuNeedle) : -1;

  if (index < 0 && nameNeedle) {
    index = low.indexOf(nameNeedle);
  }

  if (index < 0) {
    index = low.search(/hdbaset|hdbt|extender|encoder|decoder|presentation|switcher|matrix|hdmi|rs[-\s]?232|edid|hdcp/i);
  }

  if (index < 0) {
    return readable.slice(0, 700);
  }

  return readable.slice(Math.max(0, index - 260), Math.min(readable.length, index + 900));
}

async function lookupPublicWebSpecs(input = {}) {
  const brand = cleanText(input.brand || input.manufacturer);
  const sku = cleanText(input.sku || input.model);
  const productName = cleanText(input.productName || input.name);
  const productUrl = cleanText(input.productUrl || input.url || input.vendorUrl || input.productPageUrl);

  const queries = [
    '"' + brand + '" "' + sku + '" specifications',
    '"' + brand + '" "' + sku + '" datasheet',
    '"' + brand + '" "' + sku + '" manual',
    brand + " " + sku + " HDMI RS232 IR LAN audio EDID HDCP"
  ].filter((query) => query.replace(/["\s]/g, "").length > 8);

  const sources = new Map();

  for (const source of buildDirectVendorUrls(brand, sku, productUrl)) {
    sources.set(source.url, source);
  }

  const apiKey = cleanText(process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY);
  const cx = cleanText(process.env.GOOGLE_CSE_CX || process.env.GOOGLE_CUSTOM_SEARCH_CX);

  if (apiKey && cx) {
    for (const query of queries.slice(0, 3)) {
      const url =
        "https://www.googleapis.com/customsearch/v1?key=" +
        encodeURIComponent(apiKey) +
        "&cx=" +
        encodeURIComponent(cx) +
        "&q=" +
        encodeURIComponent(query) +
        "&num=5";

      const response = await fetchText(url);

      if (!response.ok) {
        continue;
      }

      try {
        const parsed = JSON.parse(response.text);

        for (const item of Array.isArray(parsed.items) ? parsed.items : []) {
          if (item.link && /^https?:\/\//i.test(item.link)) {
            sources.set(item.link, { url: item.link, title: cleanText(item.title || item.link) });
          }
        }
      } catch {
        continue;
      }
    }
  }

  const discovered = Array.from(sources.values()).slice(0, 10);
  const pages = [];

  for (const source of discovered.slice(0, MAX_PAGES_TO_READ)) {
    const response = await fetchText(source.url);
    const readable = stripHtml(response.text);
    const compactSku = lower(sku).replace(/[-\s]/g, "");
    const containsSku = sku ? lower(readable).includes(lower(sku)) || lower(readable).includes(compactSku) : false;
    const containsName = productName ? lower(readable).includes(lower(productName)) : false;
    const directKnownUrl = productUrl ? lower(source.url).includes(lower(productUrl).replace(/^https?:\/\//, "").split("/")[0]) : false;
    const likelyProductPage =
      containsSku ||
      containsName ||
      directKnownUrl ||
      hasAny(readable, [/hdbaset/i, /hdbt/i, /extender/i, /encoder/i, /decoder/i, /presentation/i, /switcher/i, /matrix/i]);

    pages.push({
      url: response.finalUrl || source.url,
      title: source.title,
      status: response.status,
      ok: response.ok,
      containsSku,
      containsName,
      likelyProductPage,
      excerpt: sourceExcerpt(response.text, sku, productName),
      text: readable.slice(0, 24000)
    });
  }

  const usefulPages = pages.filter((page) => page.ok && page.likelyProductPage && (page.containsSku || page.containsName || productUrl));
  const aggregateText = usefulPages.map((page) => [page.title, page.url, page.text].join("\n")).join("\n\n");

  return {
    attempted: queries.length > 0 || discovered.length > 0,
    queries,
    searchRuns: [],
    sources: pages.map((page) => ({
      url: page.url,
      title: page.title,
      status: page.status,
      ok: page.ok,
      containsSku: page.containsSku,
      containsName: page.containsName,
      likelyProductPage: page.likelyProductPage,
      excerpt: page.excerpt
    })),
    text: aggregateText,
    pagesRead: pages.length,
    usefulPages: usefulPages.length
  };
}

function emptyVerifiedSpecProfile() {
  return {
    videoInputs: {},
    videoOutputs: {},
    control: {},
    usb: {
      usb2: false,
      usb3: false
    },
    audio: {
      audioDeEmbedding: false,
      audioEmbedding: false,
      analogueOutput: false,
      balancedOutput: false,
      micInput: false,
      dante: false,
      aes67: false
    },
    features: {
      scaling: false,
      seamless: false,
      multiview: false,
      videoWall: false,
      wirelessCasting: false,
      wirelessConferencing: false,
      webUi: false,
      poe: false,
      hdcp: false,
      edid: false,
      cec: false,
      hdbasetExtension: false,
      ndi: false,
      h264: false,
      h265: false,
      jpeg2000: false,
      jpegXs: false,
      ipmx: false
    },
    evidenceHints: {
      hdmiMentions: 0,
      usbCMentions: 0,
      hdbasetMentions: 0,
      rs232Mentions: 0,
      irMentions: 0,
      relayMentions: 0,
      gpioMentions: 0
    }
  };
}

function knownProductKeyForVerifiedFacts(input = {}) {
  const brand = lower(input.brand || "");
  const sku = cleanText(input.sku || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const evidenceText = lower(input.evidenceText || input.rawText || input.text || "");
  const isExtron = /extron/.test(brand) || /extron/.test(evidenceText);

  if (isExtron && (sku === "navd121" || /\bnav\s*d\s*121\b|\bnavd121\b/.test(evidenceText))) {
    return "extron-nav-d-121";
  }

  if (isExtron && (sku === "nave121" || /\bnav\s*e\s*121\b|\bnave121\b/.test(evidenceText))) {
    return "extron-nav-e-121";
  }

  const isBlustream = /blustream|blu\s*stream/.test(brand) || /blustream|blu\s*stream/.test(evidenceText);

  if (isBlustream && (sku === "c88cs" || /\bc\s*88\s*cs\b|\bc88cs\b/.test(evidenceText))) {
    return "blustream-c88cs";
  }

  if (isBlustream && (sku === "pla88cs" || /\bpla\s*88\s*cs\b|\bpla88cs\b/.test(evidenceText))) {
    return "blustream-pla88cs";
  }

  const isAvpro = /av\s*pro\s*edge|avproedge/.test(brand) || /av\s*pro\s*edge|avproedge/.test(evidenceText);

  if (isAvpro && (sku === "acex100444r3" || /\bac[-\s]?ex100[-\s]?444[-\s]?r3\b/.test(evidenceText))) {
    return "avpro-ac-ex100-444-r3";
  }

  return "";
}

function buildVerifiedSpecProfile(input = {}) {
  const key = knownProductKeyForVerifiedFacts(input);

  if (!key) {
    return null;
  }

  const profile = emptyVerifiedSpecProfile();

  if (key === "extron-nav-d-121") {
    profile.videoOutputs = { hdmi: 1 };
    profile.control = { rs232: 1, ir: 1, digitalIo: 1, lan: 1 };
    profile.network = {
      transport: "1GbE copper Ethernet",
      codec: "PURE3",
      bitrateClass: "NAV 1G stream"
    };
    profile.videoProcessing = {
      maxResolution: "4K60 4:4:4",
      role: "decoder / display-side endpoint",
      scaling: "No scaling on NAV D 121"
    };
    profile.power = { poePlus: true };
    profile.features = {
      ...profile.features,
      hdcp: true,
      edid: true,
      webUi: true,
      poe: true,
      scaling: false,
      multiview: false,
      videoWall: false,
      hdbasetExtension: false
    };
    profile.verifiedSource = {
      product: "Extron NAV D 121",
      role: "1G Pro AV over IP compact decoder with HDMI output",
      confidence: "Known product profile"
    };
    return profile;
  }

  if (key === "extron-nav-e-121") {
    profile.videoInputs = { hdmi: 1 };
    profile.videoOutputs = { hdmiLoopThrough: 1 };
    profile.control = { rs232: 1, lan: 1 };
    profile.network = {
      transport: "1GbE copper Ethernet",
      codec: "PURE3",
      bitrateClass: "NAV 1G stream"
    };
    profile.videoProcessing = {
      maxResolution: "4K60 4:4:4",
      role: "encoder / source-side endpoint"
    };
    profile.power = { poePlus: true };
    profile.audio = { ...profile.audio, aes67: true };
    profile.features = {
      ...profile.features,
      hdcp: true,
      edid: true,
      webUi: true,
      poe: true,
      scaling: false,
      multiview: false,
      videoWall: false,
      hdbasetExtension: false
    };
    profile.verifiedSource = {
      product: "Extron NAV E 121",
      role: "1G Pro AV over IP compact encoder with HDMI input and loop-through",
      confidence: "Known product profile"
    };
    return profile;
  }

  if (key === "blustream-c88cs" || key === "blustream-pla88cs") {
    profile.videoInputs = { hdmi: 8 };
    profile.videoOutputs = { hdbaset: 8, hdmiMirrored: 1 };
    profile.control = { rs232: 1, ir: 1, lan: 1 };
    profile.features = {
      ...profile.features,
      hdcp: true,
      edid: true,
      webUi: true,
      hdbasetExtension: true,
      scaling: false,
      multiview: false,
      videoWall: false
    };
    profile.verifiedSource = {
      product: key === "blustream-c88cs" ? "Blustream C88CS" : "Blustream PLA88CS",
      role: "8x8 HDBaseT CSC matrix",
      confidence: "Known product profile"
    };
    return profile;
  }

  if (key === "avpro-ac-ex100-444-r3") {
    profile.videoInputs = { hdmi: 1 };
    profile.videoOutputs = { hdmi: 1 };
    profile.control = { rs232: 1, ir: 1, lan: 1 };
    profile.usb = { usb2: false, usb3: true };
    profile.videoProcessing = {
      maxResolution: "4K60 4:4:4",
      role: "HDBaseT 3.0 extender kit / TX+RX set"
    };
    profile.features = {
      ...profile.features,
      hdbasetExtension: true,
      hdcp: true,
      edid: true,
      scaling: false,
      multiview: false,
      videoWall: false
    };
    profile.verifiedSource = {
      product: "AVPro Edge AC-EX100-444-R3",
      role: "HDBaseT 3.0 extender kit",
      confidence: "Known product profile"
    };
    return profile;
  }

  return null;
}

function hasExplicitMultiviewFeature(sourceText) {
  const text = String(sourceText || "");

  return (
    /\bmultiview\b/i.test(text) ||
    /\bmulti[-\s]?view\b/i.test(text) ||
    /\bquad\s+view\b/i.test(text) ||
    /\bpip\b/i.test(text) ||
    /\bpbp\b/i.test(text) ||
    /picture[-\s]?in[-\s]?picture/i.test(text) ||
    /picture[-\s]?by[-\s]?picture/i.test(text) ||
    /\bmosaic\b/i.test(text) ||
    /multiple\s+sources?\s+on\s+(?:a\s+)?single\s+(?:hdmi\s+)?output/i.test(text) ||
    /single\s+(?:hdmi\s+)?output\s+(?:showing|displaying|with)\s+multiple\s+sources?/i.test(text)
  );
}

function hasOnlyMultipleOutputsNotMultiview(sourceText) {
  const text = String(sourceText || "");
  const hasOutputCount =
    /\b\d+\s*(?:x|X)?\s*hdmi\s*(?:outputs?|out\b)/i.test(text) ||
    /\b\d+\s*(?:x|X)?\s*(?:hdbaset|hdbt)\s*(?:outputs?|out\b)/i.test(text) ||
    /\b\d+\s*[xX]\s*\d+\b/i.test(text) ||
    /\bmatrix\b/i.test(text);

  return hasOutputCount && !hasExplicitMultiviewFeature(text);
}

function extractSpecProfile(sourceText = "") {
  const text = lower(sourceText);
  const profile = emptyVerifiedSpecProfile();

  if (/\bhdmi\b/i.test(text)) {
    profile.evidenceHints.hdmiMentions = 1;
  }

  if (/\bhdbaset\b|\bhdbt\b/i.test(text)) {
    profile.features.hdbasetExtension = true;
    profile.evidenceHints.hdbasetMentions = 1;
  }

  if (/\brs[-\s]?232\b/i.test(text)) {
    profile.control.rs232 = 1;
    profile.evidenceHints.rs232Mentions = 1;
  }

  if (/\bir\b/i.test(text)) {
    profile.control.ir = 1;
    profile.evidenceHints.irMentions = 1;
  }

  if (/\blan\b|\bethernet\b|\brj45\b/i.test(text)) {
    profile.control.lan = 1;
  }

  if (/\bhdcp\b/i.test(text)) {
    profile.features.hdcp = true;
  }

  if (/\bedid\b/i.test(text)) {
    profile.features.edid = true;
  }

  if (/web\s*ui|webui|browser[-\s]?based|web\s+gui/i.test(text)) {
    profile.features.webUi = true;
  }

  if (/\bpoe\b|\bpoh\b|power\s+over\s+ethernet/i.test(text)) {
    profile.features.poe = true;
  }

  if (/\busb\s*2(?:\.0)?\b|\busb2\b/i.test(text)) {
    profile.usb.usb2 = true;
  }

  if (/\busb\s*3(?:\.0|\.1|\.2)?\b|\busb3\b/i.test(text)) {
    profile.usb.usb3 = true;
  }

  if (/\bdante\b/i.test(text)) {
    profile.audio.dante = true;
  }

  if (/\baes67\b/i.test(text)) {
    profile.audio.aes67 = true;
  }

  if (hasExplicitMultiviewFeature(text)) {
    profile.features.multiview = true;
  }

  if (!hasOnlyMultipleOutputsNotMultiview(text) && /video\s*wall|videowall|video[-\s]?wall|wall\s+processor|wall\s+controller/i.test(text)) {
    profile.features.videoWall = true;
  }

  if (/\bscaler\b|\bscaling\b|\bscale\b|\bupscal|\bdownscal/i.test(text)) {
    profile.features.scaling = true;
  }

  if (hasOnlyMultipleOutputsNotMultiview(text)) {
    profile.features.multiview = false;
  }

  return profile;
}

const CATEGORY_RULES = [
  {
    id: "av_over_ip",
    label: "AV over IP endpoint",
    wyrestormOverlap: true,
    signals: [
      /\bav\s*over\s*ip\b/i,
      /\bavoip\b/i,
      /\bnav\s*[de]\s*\d+/i,
      /\bnav-[de]-?\d+/i,
      /\bencoder\b/i,
      /\bdecoder\b/i,
      /\btransceiver\b/i,
      /\bnhd[-_]/i,
      /\bnetworkhd\b/i,
      /\bipmx\b/i,
      /\bsdvoe\b/i
    ]
  },
  {
    id: "hdbaset_extender",
    label: "HDBaseT extender / transmitter / receiver",
    wyrestormOverlap: true,
    signals: [
      /\bhdbaset\b/i,
      /\bhdbt\b/i,
      /\bhdmi\s*over\s*cat/i,
      /\bextender\b/i,
      /\bac[-\s]?ex/i,
      /\bex[-_]\d+/i
    ]
  },
  {
    id: "matrix_switcher",
    label: "Matrix switcher",
    wyrestormOverlap: true,
    signals: [
      /\bmatrix\b/i,
      /\b\d+\s*[xX]\s*\d+\b/i,
      /crosspoint/i,
      /hdmi\s+matrix/i,
      /hdbaset\s+matrix/i
    ]
  },
  {
    id: "video_wall_processor",
    label: "Video wall processor",
    wyrestormOverlap: true,
    signals: [
      /video\s*wall/i,
      /videowall/i,
      /video[-\s]?wall/i,
      /wall\s+processor/i,
      /wall\s+controller/i,
      /bezel\s+correction/i
    ]
  },
  {
    id: "multiview_processor",
    label: "Multiview processor",
    wyrestormOverlap: true,
    signals: [
      /\bmultiview\b/i,
      /multi[-\s]?view/i,
      /quad\s+view/i,
      /\bpip\b/i,
      /\bpbp\b/i
    ]
  },
  {
    id: "presentation_switcher",
    label: "Presentation switcher / scaler / room switcher",
    wyrestormOverlap: true,
    signals: [
      /presentation\s+switch/i,
      /presentation\s+scaler/i,
      /switcher\s*\/\s*scaler/i,
      /room\s+switcher/i,
      /\bbyod\b/i,
      /\bbyom\b/i,
      /\bvp[-\s]?\d+/i
    ]
  },
  {
    id: "audio_dsp",
    label: "Audio DSP / audio processor",
    wyrestormOverlap: false,
    signals: [
      /\bdsp\b/i,
      /audio\s+processor/i,
      /\baec\b/i,
      /automix/i
    ]
  },
  {
    id: "control_processor",
    label: "Control processor / automation controller",
    wyrestormOverlap: false,
    signals: [
      /control\s+processor/i,
      /automation\s+controller/i,
      /control\s+system/i
    ]
  }
];

function classifyKnownModel(input = {}) {
  const brand = lower(input.brand || input.manufacturer || input.vendor);
  const sku = cleanText(input.sku || input.model || input.partNumber);
  const compactSku = lower(sku).replace(/[^a-z0-9]/g, "");
  const text = lower([brand, sku, input.productName, input.rawText, input.text].filter(Boolean).join(" "));

  if (/extron/.test(brand) && (compactSku === "navd121" || /\bnav\s*d\s*121\b/.test(text))) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.92,
      wyrestormOverlap: true,
      reason: "Extron NAV D model pattern indicates an AVoIP decoder/display-side endpoint."
    };
  }

  if (/extron/.test(brand) && (compactSku === "nave121" || /\bnav\s*e\s*121\b/.test(text))) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.92,
      wyrestormOverlap: true,
      reason: "Extron NAV E model pattern indicates an AVoIP encoder/source-side endpoint."
    };
  }

  if ((/blustream|blu\s*stream/.test(brand) || /blustream|blu\s*stream/.test(text)) && (compactSku === "c88cs" || /\bc\s*88\s*cs\b|\bc88cs\b/.test(text))) {
    return {
      category: "matrix_switcher",
      categoryLabel: "Blustream C88CS 8x8 HDBaseT CSC matrix",
      confidence: 0.9,
      wyrestormOverlap: true,
      reason: "Blustream C88CS is a known 8x8 HDBaseT CSC matrix product."
    };
  }

  if ((/blustream|blu\s*stream/.test(brand) || /blustream|blu\s*stream/.test(text)) && (compactSku === "pla88cs" || /\bpla\s*88\s*cs\b|\bpla88cs\b/.test(text))) {
    return {
      category: "matrix_switcher",
      categoryLabel: "Blustream PLA88CS 8x8 HDBaseT CSC matrix",
      confidence: 0.9,
      wyrestormOverlap: true,
      reason: "Blustream PLA88CS is a known 8x8 HDBaseT CSC matrix product."
    };
  }

  if ((/av\s*pro\s*edge|avproedge/.test(brand) || /av\s*pro\s*edge|avproedge/.test(text)) && /^ac[-\s]?ex/i.test(sku)) {
    return {
      category: "hdbaset_extender",
      categoryLabel: "HDBaseT extender / transmitter / receiver",
      confidence: 0.82,
      wyrestormOverlap: true,
      reason: "AVPro Edge AC-EX model prefix maps to HDBaseT extender products."
    };
  }

  if ((/turtle\s*av|turtleav/.test(brand) || /turtle\s*av|turtleav/.test(text)) && /video\s*wall|videowall|video[-\s]?wall|\b\d+\s*[xX]\s*\d+\b/.test(text)) {
    return {
      category: "video_wall_processor",
      categoryLabel: "Video wall processor / matrix",
      confidence: 0.78,
      wyrestormOverlap: true,
      reason: "TurtleAV video wall wording indicates a video wall processor or matrix-style video wall requirement."
    };
  }

  if (/kramer/.test(brand) && /^vp[-\s]?\d+/i.test(sku)) {
    return {
      category: "presentation_switcher",
      categoryLabel: "Presentation switcher / scaler / room switcher",
      confidence: 0.55,
      wyrestormOverlap: true,
      reason: "Kramer VP model prefix commonly maps to presentation scaler/switcher products."
    };
  }

  if (/^nhd[-_]/i.test(sku) || text.includes("networkhd")) {
    return {
      category: "av_over_ip",
      categoryLabel: "AV over IP endpoint",
      confidence: 0.9,
      wyrestormOverlap: true,
      reason: "WyreStorm NHD/NetworkHD products are AVoIP endpoints."
    };
  }

  if (/^ex[-_]/i.test(sku) || text.includes("hdbaset")) {
    return {
      category: "hdbaset_extender",
      categoryLabel: "HDBaseT extender / transmitter / receiver",
      confidence: 0.88,
      wyrestormOverlap: true,
      reason: "WyreStorm EX products are HDBaseT/extender products."
    };
  }

  if (/^mxv[-_]?0808/i.test(sku) || /^mx[-_]?0808/i.test(sku)) {
    return {
      category: "matrix_switcher",
      categoryLabel: "8x8 matrix switcher",
      confidence: 0.86,
      wyrestormOverlap: true,
      reason: "WyreStorm MX/MXV 0808 products are 8x8 matrix products."
    };
  }

  return null;
}

function classifyProduct(input = {}) {
  const known = classifyKnownModel(input);

  const text = lower([
    input.brand,
    input.sku,
    input.model,
    input.productName,
    input.name,
    input.title,
    input.category,
    input.family,
    input.description,
    input.rawText,
    input.text
  ].filter(Boolean).join(" "));

  const scored = CATEGORY_RULES.map((rule) => {
    let score = scorePatterns(text, rule.signals);

    if (rule.id === "multiview_processor" && !hasExplicitMultiviewFeature(text)) {
      score = 0;
    }

    return {
      id: rule.id,
      label: rule.label,
      wyrestormOverlap: rule.wyrestormOverlap,
      score
    };
  }).sort((a, b) => b.score - a.score);

  if (known) {
    return {
      category: known.category,
      categoryLabel: known.categoryLabel,
      confidence: known.confidence,
      wyrestormOverlap: known.wyrestormOverlap,
      alternatives: scored.filter((item) => item.score > 0).slice(0, 5)
    };
  }

  const best = scored[0];

  if (!best || best.score <= 0) {
    return {
      category: "unknown",
      categoryLabel: "Need more product detail",
      confidence: 0,
      wyrestormOverlap: false,
      alternatives: scored.slice(0, 5)
    };
  }

  return {
    category: best.id,
    categoryLabel: best.label,
    confidence: Math.max(0.18, Math.min(0.98, best.score / 7)),
    wyrestormOverlap: best.wyrestormOverlap,
    alternatives: scored.filter((item) => item.score > 0).slice(0, 5)
  };
}

function inferAvOverIpRole(text) {
  const value = String(text ?? "");
  const compact = value.replace(/\s+/g, " ");

  if (/\bnav\s*e\s*\d+/i.test(compact) || /\bnav-e-?\d+/i.test(compact)) {
    return { role: "encoder", label: "AVoIP encoder / source-side endpoint", confidence: "high" };
  }

  if (/\bnav\s*d\s*\d+/i.test(compact) || /\bnav-d-?\d+/i.test(compact)) {
    return { role: "decoder", label: "AVoIP decoder / display-side endpoint", confidence: "high" };
  }

  if (/\bNHD[-_\s]?\d+[-_\s]?TRX\b/i.test(compact) || /[-_\s]TRX\b/i.test(compact) || /\btransceiver\b/i.test(compact)) {
    return { role: "transceiver", label: "AVoIP transceiver", confidence: "high" };
  }

  if (/\bNHD[-_\s]?\d+[-_\s]?(?:E[-_\s]?)?TX\b/i.test(compact) || /[-_\s]TX\b/i.test(compact) || /\bencoder\b/i.test(compact)) {
    return { role: "encoder", label: "AVoIP encoder / source-side endpoint", confidence: "high" };
  }

  if (/\bNHD[-_\s]?\d+[-_\s]?(?:E[-_\s]?)?RX\b/i.test(compact) || /[-_\s]RX\b/i.test(compact) || /\bdecoder\b/i.test(compact)) {
    return { role: "decoder", label: "AVoIP decoder / display-side endpoint", confidence: "high" };
  }

  return { role: "unknown", label: "AVoIP endpoint role not confirmed", confidence: "unknown" };
}

function inferHdbasetRole(text) {
  const value = String(text ?? "");
  const upper = value.toUpperCase();

  if (/\bAC[-\s]?EX\d+[-\s]?\d+[-\s]?R\d+\b/i.test(value) || /\bextender\s*kit\b/i.test(value) || /\btx\s*(?:and|\/|\+)\s*rx\b/i.test(value)) {
    return { role: "extender_set", label: "HDBaseT extender kit / TX+RX set", confidence: "high" };
  }

  if (/\bEX[-_]/i.test(upper) && !/[-_\s]TX\b/i.test(upper) && !/[-_\s]RX\b/i.test(upper)) {
    return { role: "extender_set", label: "HDBaseT extender kit / TX+RX set", confidence: "high" };
  }

  if (/[-_\s]TX\b/i.test(upper) || /\btransmitter\b/i.test(value)) {
    return { role: "transmitter", label: "HDBaseT transmitter / source-side unit", confidence: "high" };
  }

  if (/[-_\s]RX\b/i.test(upper) || /\breceiver\b/i.test(value)) {
    return { role: "receiver", label: "HDBaseT receiver / display-side unit", confidence: "high" };
  }

  return { role: "unknown", label: "HDBaseT endpoint role not confirmed", confidence: "unknown" };
}

function identifyHdbasetSpecificity(text) {
  const value = String(text || "");
  const isHdbaset3 =
    /\bhdbaset\s*3(?:\.0)?\b/i.test(value) ||
    /\bhdbt\s*3(?:\.0)?\b/i.test(value) ||
    /\bvalens\s*vs3000\b/i.test(value) ||
    /\b4k\s*60\s*4\s*:?4\s*:?4\b/i.test(value) ||
    /\b18\s*gbps\b/i.test(value) ||
    /\busb\s*3(?:\.0|\.1|\.2)?\b/i.test(value) ||
    /\busb3\b/i.test(value) ||
    /\bAC[-\s]?EX100[-\s]?444[-\s]?R3\b/i.test(value);

  if (isHdbaset3) {
    return {
      standard: "hdbaset_3",
      label: "HDBaseT 3.0 / 4K60 4:4:4 extender set",
      requiredWyrestormSku: "EX-100-USB3",
      confidence: "high"
    };
  }

  return { standard: "general_hdbaset", label: "HDBaseT extender set", requiredWyrestormSku: "", confidence: "medium" };
}

function identifyHdbasetMatrixSpecificity(text) {
  const value = String(text || "");
  const matrixMatch = value.match(/\b(\d+)\s*[xX]\s*(\d+)\b/);
  const inputs = matrixMatch ? Number(matrixMatch[1]) : null;
  const outputs = matrixMatch ? Number(matrixMatch[2]) : null;

  const isC88 = /\bC88CS\b/i.test(value) || /\bblustream\b/i.test(value) && /\bc\s*88\s*cs\b/i.test(value);
  const isPla88 = /\bPLA88CS\b/i.test(value) || /\bblustream\b/i.test(value) && /\bpla\s*88\s*cs\b/i.test(value);
  const isHdbasetMatrix =
    isC88 ||
    isPla88 ||
    /\bhdbaset\b/i.test(value) && /\bmatrix\b/i.test(value) ||
    /\bhdbt\b/i.test(value) && /\bmatrix\b/i.test(value);

  if (!isHdbasetMatrix) {
    return { isHdbasetMatrix: false, inputs, outputs, label: "HDBaseT matrix requirement not confirmed" };
  }

  if (isC88) {
    return { isHdbasetMatrix: true, inputs: 8, outputs: 8, label: "Blustream C88CS 8x8 HDBaseT CSC matrix", leadWyrestormSku: "MXV-0808-H2A-KIT", confidence: "high" };
  }

  if (isPla88) {
    return { isHdbasetMatrix: true, inputs: 8, outputs: 8, label: "Blustream PLA88CS 8x8 HDBaseT CSC matrix", leadWyrestormSku: "MXV-0808-H2A-KIT", confidence: "high" };
  }

  if (inputs === 8 && outputs === 8) {
    return { isHdbasetMatrix: true, inputs, outputs, label: "8x8 HDBaseT matrix requirement", leadWyrestormSku: "MXV-0808-H2A-KIT", confidence: "high" };
  }

  return { isHdbasetMatrix: true, inputs, outputs, label: "HDBaseT matrix requirement", leadWyrestormSku: "MXV-0808-H2A-KIT", confidence: "medium" };
}

function identifyVideoWallSpecificity(text) {
  const value = String(text || "");
  const matrixMatch = value.match(/\b(\d+)\s*[xX]\s*(\d+)\b/);
  const inputs = matrixMatch ? Number(matrixMatch[1]) : null;
  const outputs = matrixMatch ? Number(matrixMatch[2]) : null;
  const isVideoWall =
    /\bvideo\s*wall\b/i.test(value) ||
    /\bvideowall\b/i.test(value) ||
    /\bvideo[-\s]?wall\b/i.test(value) ||
    /\bwall\s+processor\b/i.test(value) ||
    /\bwall\s+controller\b/i.test(value) ||
    /\bwall\s+matrix\b/i.test(value);

  if (!isVideoWall) {
    return { isVideoWall: false, inputs, outputs, label: "Video wall requirement not confirmed" };
  }

  if (inputs === 8 && outputs === 8) {
    return { isVideoWall: true, inputs, outputs, label: "8x8 video wall processor / matrix requirement", leadWyrestormSku: "MX-0808-SCL" };
  }

  if (outputs !== null && outputs > 6) {
    return { isVideoWall: true, inputs, outputs, label: String(inputs || "multi-input") + "x" + outputs + " video wall / matrix requirement", leadWyrestormSku: outputs <= 8 ? "MX-0808-SCL" : "MX-0812-SCL" };
  }

  if (outputs !== null && outputs <= 6) {
    return { isVideoWall: true, inputs, outputs, label: String(inputs || "multi-input") + "x" + outputs + " video wall processor requirement", leadWyrestormSku: "SW-0206-VW" };
  }

  return { isVideoWall: true, inputs, outputs, label: "Video wall processor requirement", leadWyrestormSku: "SW-0206-VW" };
}

function inferProductPurpose(classification, text) {
  const category = classification?.category || "unknown";
  const value = String(text ?? "");

  if (category === "av_over_ip") {
    return inferAvOverIpRole(value);
  }

  if (category === "hdbaset_extender") {
    return inferHdbasetRole(value);
  }

  if (category === "matrix_switcher") {
    const hdbasetMatrix = identifyHdbasetMatrixSpecificity(value);

    if (hdbasetMatrix.isHdbasetMatrix) {
      return { role: "hdbaset_matrix", label: hdbasetMatrix.label, confidence: hdbasetMatrix.confidence || "high" };
    }

    return { role: "matrix_switcher", label: "matrix switcher", confidence: "medium" };
  }

  if (category === "video_wall_processor") {
    const wall = identifyVideoWallSpecificity(value);
    return { role: wall.isVideoWall ? "video_wall_matrix" : "lcd_wall_processor", label: wall.label, confidence: wall.isVideoWall ? "high" : "medium" };
  }

  if (category === "multiview_processor") {
    return { role: "multiview_processor", label: "multiview processor: multiple source inputs composited onto one HDMI output", confidence: "high" };
  }

  return { role: "not_directional", label: "Role check not required for this product type", confidence: "medium" };
}

function categoriesAreCompatible(competitorCategory, candidateCategory) {
  if (competitorCategory === candidateCategory) {
    return true;
  }

  const related = new Map([
    ["presentation_switcher", ["matrix_switcher", "hdbaset_extender"]],
    ["matrix_switcher", ["presentation_switcher"]],
    ["hdbaset_extender", ["presentation_switcher"]],
    ["video_wall_processor", ["matrix_switcher"]],
    ["multiview_processor", ["av_over_ip"]],
    ["av_over_ip", ["multiview_processor"]]
  ]);

  return (related.get(competitorCategory) || []).includes(candidateCategory);
}

function purposeRolesAreCompatible(category, competitorPurpose, candidatePurpose) {
  const competitorRole = competitorPurpose?.role || "unknown";
  const candidateRole = candidatePurpose?.role || "unknown";

  if (category === "av_over_ip") {
    if (competitorRole === "unknown" || candidateRole === "unknown") {
      return { ok: false, reason: "AVoIP endpoint role is not confirmed." };
    }

    if (competitorRole === candidateRole) {
      return { ok: true, reason: "same AVoIP endpoint role: " + competitorPurpose.label };
    }

    if (competitorRole === "transceiver" || candidateRole === "transceiver") {
      return { ok: true, reason: "transceiver can cover the required AVoIP role" };
    }

    return { ok: false, reason: "AVoIP role mismatch" };
  }

  if (category === "hdbaset_extender") {
    if (competitorRole === candidateRole) {
      return { ok: true, reason: "same HDBaseT role: " + competitorPurpose.label };
    }

    if (competitorRole === "extender_set" || candidateRole === "extender_set") {
      return { ok: true, reason: "extender kit can cover both TX and RX sides" };
    }

    return { ok: false, reason: "HDBaseT endpoint role mismatch" };
  }

  return { ok: true, reason: "role check passed for this product type" };
}

let activeSkuMasterCache;

async function loadActiveSkuMaster() {
  if (activeSkuMasterCache) {
    return activeSkuMasterCache;
  }

  try {
    const raw = await fs.readFile(path.join(repoRoot, ACTIVE_SKU_MASTER_FILE), "utf8");
    const parsed = JSON.parse(raw);
    const items = ensureArrayPayload(parsed);

    activeSkuMasterCache = {
      source: ACTIVE_SKU_MASTER_FILE,
      skus: new Set(items.map((item) => skuKey(item?.sku || item?.SKU || item?.model || item?.id)).filter(Boolean)),
    };
  } catch {
    activeSkuMasterCache = { source: "", skus: new Set() };
  }

  return activeSkuMasterCache;
}

function recordValue(candidate, key) {
  if (!candidate || typeof candidate !== "object") return "";

  const raw = candidate.raw && typeof candidate.raw === "object" ? candidate.raw : null;
  const nestedRaw = raw?.raw && typeof raw.raw === "object" ? raw.raw : null;

  return cleanText(candidate[key] || raw?.[key] || nestedRaw?.[key]);
}

function inferCandidateLifecycle(candidate, activeSkuMaster) {
  const sku = candidateSku(candidate);
  const explicitActiveSku = recordValue(candidate, "activeSku");
  const explicitLifecycleStatus = lower(recordValue(candidate, "lifecycleStatus"));
  const explicitRecommendationStatus = lower(recordValue(candidate, "recommendationStatus"));
  const explicitWarning = recordValue(candidate, "lifecycleWarning") || recordValue(candidate, "manualReviewNotes");
  const lifecycleSource = recordValue(candidate, "lifecycleSource");

  if (explicitActiveSku === "Yes" || (explicitLifecycleStatus === "active" && explicitRecommendationStatus === "recommendable")) {
    return {
      activeSku: "Yes",
      lifecycleStatus: "active",
      recommendationStatus: "recommendable",
      lifecycleSource: lifecycleSource || "product record",
      lifecycleWarning: "",
    };
  }

  if (explicitActiveSku === "EOL" || explicitLifecycleStatus === "eol") {
    return {
      activeSku: "EOL",
      lifecycleStatus: "eol",
      recommendationStatus: "blocked",
      lifecycleSource: lifecycleSource || "product record",
      lifecycleWarning: explicitWarning || "Product is marked EOL and must not be recommended as an active SKU.",
    };
  }

  if (explicitActiveSku === "Review" || explicitLifecycleStatus === "review-required" || explicitRecommendationStatus === "review-required") {
    return {
      activeSku: "Review",
      lifecycleStatus: "review-required",
      recommendationStatus: "review-required",
      lifecycleSource: lifecycleSource || "product record",
      lifecycleWarning: explicitWarning || "Lifecycle status requires manual review before positioning.",
    };
  }

  if (sku && activeSkuMaster?.skus?.has(sku)) {
    return {
      activeSku: "Yes",
      lifecycleStatus: "active",
      recommendationStatus: "recommendable",
      lifecycleSource: activeSkuMaster.source || "active SKU master",
      lifecycleWarning: "",
    };
  }

  return {
    activeSku: "Review",
    lifecycleStatus: "review-required",
    recommendationStatus: "review-required",
    lifecycleSource: activeSkuMaster?.source || "not verified",
    lifecycleWarning: "SKU was not found in the active SKU master. Treat as review-only until verified against current WyreStorm source data.",
  };
}

function lifecycleIsRecommendable(lifecycle) {
  return lifecycle?.activeSku === "Yes" &&
    lifecycle?.lifecycleStatus === "active" &&
    lifecycle?.recommendationStatus === "recommendable";
}

function normaliseProductRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const sku = cleanText(record.sku || record.SKU || record.model || record.Model || record.partNumber || record.id);
  const name = cleanText(record.name || record.title || record.productName || record.description || sku);

  if (!sku && !name) {
    return null;
  }

  const family = cleanText(record.family || record.series || record.category || record.type || record.productFamily);
  const tags = Array.isArray(record.tags) ? record.tags.join(" ") : cleanText(record.tags);
  const features = Array.isArray(record.features) ? record.features.join(" ") : cleanText(record.features);
  const ports = Array.isArray(record.ports) ? record.ports.join(" ") : cleanText(record.ports);

  const text = [
    sku,
    name,
    family,
    record.category,
    record.type,
    record.description,
    record.shortDescription,
    record.longDescription,
    record.summary,
    tags,
    features,
    ports,
    JSON.stringify(record)
  ].filter(Boolean).join(" ");

  return {
    sku,
    name,
    family,
    activeSku: cleanText(record.activeSku),
    lifecycleStatus: cleanText(record.lifecycleStatus),
    recommendationStatus: cleanText(record.recommendationStatus),
    lifecycleSource: cleanText(record.lifecycleSource),
    lifecycleWarning: cleanText(record.lifecycleWarning),
    manualReviewNotes: cleanText(record.manualReviewNotes),
    raw: record,
    text,
  };
}

function collectProducts(value, products = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectProducts(item, products);
    }

    return products;
  }

  if (!value || typeof value !== "object") {
    return products;
  }

  const direct = normaliseProductRecord(value);

  if (direct?.sku || direct?.name) {
    products.push(direct);
  }

  for (const key of ["products", "items", "data", "index", "records", "nodes"]) {
    if (value[key]) {
      collectProducts(value[key], products);
    }
  }

  return products;
}

async function loadWyrestormProducts() {
  const found = [];
  const activeSkuMaster = await loadActiveSkuMaster();

  for (const relativePath of WYRESTORM_PRODUCT_FILES) {
    try {
      const raw = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
      const parsed = JSON.parse(raw);
      const products = collectProducts(parsed).filter(Boolean);

      for (const product of products) {
        const lifecycle = inferCandidateLifecycle(product, activeSkuMaster);
        found.push({ ...product, ...lifecycle, sourceFile: relativePath });
      }
    } catch {
      continue;
    }
  }

  const deduped = new Map();

  for (const product of found) {
    const key = lower(product.sku || product.name);

    if (key && !deduped.has(key)) {
      deduped.set(key, product);
    }
  }

  return Array.from(deduped.values());
}

function featureNames(profile) {
  return Object.entries(profile.features || {})
    .filter(([, enabled]) => enabled === true)
    .map(([name]) => name);
}

function portScore(competitorProfile, candidateProfile) {
  let score = 0;
  const reasons = [];

  for (const group of ["videoInputs", "videoOutputs", "control", "audio", "usb", "features"]) {
    const competitorGroup = competitorProfile[group] || {};
    const candidateGroup = candidateProfile[group] || {};

    for (const [key, value] of Object.entries(competitorGroup)) {
      if (value === null || value === undefined || value === false) {
        continue;
      }

      const candidateValue = candidateGroup[key];

      if (candidateValue === true && value === true) {
        score += 2;
        reasons.push(group + "." + key);
      }

      if (typeof value === "number" && typeof candidateValue === "number") {
        const delta = Math.abs(value - candidateValue);

        if (delta === 0) {
          score += 2;
          reasons.push(group + "." + key + " exact");
        }

        if (delta > 0 && delta <= 2) {
          score += 1;
          reasons.push(group + "." + key + " near");
        }
      }
    }
  }

  return { score, reasons };
}

function candidateSku(candidate) {
  return String(candidate?.sku || "").trim().toUpperCase();
}

function avoipRoleFromCandidate(candidate) {
  const sku = candidateSku(candidate);
  const text = String([candidate?.sku, candidate?.name, candidate?.candidatePurpose, candidate?.purposeRole].filter(Boolean).join(" "));

  if (/NHD[-_]?USB[-_]?TRX/i.test(sku)) {
    return "usb_transport";
  }

  if (/\bTRX\b|[-_]TRX\b|\bTRANSCEIVER\b/i.test(text)) {
    return "transceiver";
  }

  if (/[-_]TX\b|\bTX\b|\bENCODER\b/i.test(text)) {
    return "encoder";
  }

  if (/[-_]RX\b|\bRX\b|\bDECODER\b/i.test(text)) {
    return "decoder";
  }

  return String(candidate?.purposeRole || "").toLowerCase() || "unknown";
}

function candidateSupportsAvoipEvidence(candidate, competitorProfile, competitorPurpose) {
  const role = avoipRoleFromCandidate(candidate);
  const sku = candidateSku(candidate);
  const maxResolution = lower(competitorProfile.videoProcessing?.maxResolution || "");
  const requires4k60 = maxResolution.includes("4k60") || maxResolution.includes("4k 60") || maxResolution.includes("4:4:4");
  const requiresMultiview = competitorProfile.features?.multiview === true;

  if (role === "usb_transport") {
    return false;
  }

  if (competitorPurpose.role === "encoder" && role !== "encoder" && role !== "transceiver") {
    return false;
  }

  if (competitorPurpose.role === "decoder" && role !== "decoder" && role !== "transceiver") {
    return false;
  }

  if (requiresMultiview && !/NHD[-_]?150[-_]?RX/i.test(sku)) {
    return false;
  }

  if (!requiresMultiview && /NHD[-_]?150[-_]?RX/i.test(sku)) {
    return false;
  }

  if (requires4k60 && /NHD[-_]?120/i.test(sku)) {
    return true;
  }

  return true;
}

function scoreWyrestormCandidate(competitorClassification, competitorProfile, product, competitorEvidenceText = "", activeSkuMaster) {
  const lifecycle = inferCandidateLifecycle(product, activeSkuMaster);

  if (!lifecycleIsRecommendable(lifecycle)) {
    return null;
  }

  let candidateClassification = classifyProduct({
    brand: "WyreStorm",
    sku: product.sku,
    productName: product.name,
    rawText: product.text
  });

  const knownCandidate = classifyKnownModel({
    brand: "WyreStorm",
    sku: product.sku,
    productName: product.name,
    rawText: product.text
  });

  if (knownCandidate) {
    candidateClassification = {
      category: knownCandidate.category,
      categoryLabel: knownCandidate.categoryLabel,
      confidence: knownCandidate.confidence,
      wyrestormOverlap: knownCandidate.wyrestormOverlap,
      alternatives: []
    };
  }

  if (!categoriesAreCompatible(competitorClassification.category, candidateClassification.category)) {
    return null;
  }

  const competitorPurpose = inferProductPurpose(competitorClassification, competitorEvidenceText);
  const candidatePurpose = inferProductPurpose(candidateClassification, [product.sku, product.name, product.text].join(" "));
  const purposeCompatibility = purposeRolesAreCompatible(competitorClassification.category, competitorPurpose, candidatePurpose);

  if (!purposeCompatibility.ok) {
    return null;
  }

  const candidateProfile = extractSpecProfile(product.text);
  const directCategory = competitorClassification.category === candidateClassification.category;
  const categoryScore = directCategory ? 42 : 18;
  const purposeScore = competitorPurpose.role !== "unknown" && candidatePurpose.role !== "unknown" ? 25 : 6;
  const matchedFeatures = featureNames(competitorProfile).filter((feature) => candidateProfile.features?.[feature] === true);
  const featureScore = matchedFeatures.length * 3;
  const scoredPorts = portScore(competitorProfile, candidateProfile);
  const total = Math.min(100, categoryScore + purposeScore + featureScore + scoredPorts.score);

  return {
    sku: product.sku,
    name: product.name,
    family: product.family,
    sourceFile: product.sourceFile,
    score: total,
    confidence: Math.min(0.96, total / 100),
    activeSku: lifecycle.activeSku,
    lifecycleStatus: lifecycle.lifecycleStatus,
    recommendationStatus: lifecycle.recommendationStatus,
    lifecycleSource: lifecycle.lifecycleSource,
    lifecycleWarning: lifecycle.lifecycleWarning,
    candidateCategory: candidateClassification.category,
    candidateCategoryLabel: candidateClassification.categoryLabel,
    competitorPurpose: competitorPurpose.label,
    candidatePurpose: candidatePurpose.label,
    purposeRole: candidatePurpose.role,
    purposeMatch: purposeCompatibility.reason,
    reasons: [
      directCategory ? "same type of product" : "related product type",
      purposeCompatibility.reason,
      ...matchedFeatures.map((feature) => "matches " + feature),
      ...scoredPorts.reasons.map((reason) => "similar ports: " + reason)
    ].slice(0, 12)
  };
}

function curatedAvoipCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");

  if (classification.category !== "av_over_ip") {
    return [];
  }

  const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const maxResolution = lower(profile.videoProcessing?.maxResolution || "");
  const requires4k60 = maxResolution.includes("4k60") || maxResolution.includes("4k 60") || maxResolution.includes("4:4:4");

  if (competitorPurpose.role === "decoder") {
    if (requires4k60) {
      return [
        {
          sku: "NHD-500-RX",
          name: "WyreStorm NetworkHD 500-series 4K60 decoder / display-side endpoint",
          family: "NetworkHD 500 Series",
          sourceFile: "curated-avoip-role-map",
          score: 78,
          confidence: 0.78,
          candidateCategory: "av_over_ip",
          candidateCategoryLabel: "AV over IP endpoint",
          competitorPurpose: competitorPurpose.label,
          candidatePurpose: "AVoIP decoder / display-side endpoint with 4K60-class requirement",
          purposeRole: "decoder",
          purposeMatch: "same decoder role; stronger 4K60-class fit than NHD-120-RX",
          reasons: [
            "same AVoIP endpoint role",
            "display-side decoder, not source-side encoder",
            "4K60-class requirement identified",
            "confirm codec, latency, network family and control requirements before quoting"
          ]
        },
        {
          sku: "NHD-120-RX",
          name: "WyreStorm NetworkHD 100-series decoder / display-side endpoint",
          family: "NetworkHD 100 Series",
          sourceFile: "curated-avoip-role-map",
          score: 62,
          confidence: 0.62,
          candidateCategory: "av_over_ip",
          candidateCategoryLabel: "AV over IP endpoint",
          competitorPurpose: competitorPurpose.label,
          candidatePurpose: "AVoIP decoder / display-side endpoint",
          purposeRole: "decoder",
          purposeMatch: "same decoder role, but check 4K60 parity carefully",
          reasons: [
            "same endpoint role",
            "conditional fit",
            "check 4K60 and codec parity before quoting"
          ]
        }
      ];
    }

    return [
      {
        sku: "NHD-120-RX",
        name: "WyreStorm NetworkHD 100-series AVoIP decoder / display-side endpoint",
        family: "NetworkHD 100 Series",
        sourceFile: "curated-avoip-role-map",
        score: 74,
        confidence: 0.74,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP endpoint",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "AVoIP decoder / display-side endpoint",
        purposeRole: "decoder",
        purposeMatch: "same AVoIP role: decoder / display-side endpoint",
        reasons: [
          "lead option",
          "same AVoIP endpoint role",
          "display-side decoder, not source-side encoder",
          "confirm compression, latency, resolution, network design and control requirements before quoting"
        ]
      }
    ];
  }

  if (competitorPurpose.role === "encoder") {
    if (requires4k60) {
      return [
        {
          sku: "NHD-500-TX",
          name: "WyreStorm NetworkHD 500-series 4K60 encoder / source-side endpoint",
          family: "NetworkHD 500 Series",
          sourceFile: "curated-avoip-role-map",
          score: 78,
          confidence: 0.78,
          candidateCategory: "av_over_ip",
          candidateCategoryLabel: "AV over IP endpoint",
          competitorPurpose: competitorPurpose.label,
          candidatePurpose: "AVoIP encoder / source-side endpoint with 4K60-class requirement",
          purposeRole: "encoder",
          purposeMatch: "same encoder role; stronger 4K60-class fit than NHD-120-TX",
          reasons: [
            "same AVoIP endpoint role",
            "source-side encoder, not display-side decoder",
            "4K60-class requirement identified",
            "confirm codec, latency, network family and control requirements before quoting"
          ]
        },
        {
          sku: "NHD-120-TX",
          name: "WyreStorm NetworkHD 100-series encoder / source-side endpoint",
          family: "NetworkHD 100 Series",
          sourceFile: "curated-avoip-role-map",
          score: 62,
          confidence: 0.62,
          candidateCategory: "av_over_ip",
          candidateCategoryLabel: "AV over IP endpoint",
          competitorPurpose: competitorPurpose.label,
          candidatePurpose: "AVoIP encoder / source-side endpoint",
          purposeRole: "encoder",
          purposeMatch: "same encoder role, but check 4K60 parity carefully",
          reasons: [
            "same endpoint role",
            "conditional fit",
            "check 4K60 and codec parity before quoting"
          ]
        }
      ];
    }

    return [
      {
        sku: "NHD-120-TX",
        name: "WyreStorm NetworkHD 100-series AVoIP encoder / source-side endpoint",
        family: "NetworkHD 100 Series",
        sourceFile: "curated-avoip-role-map",
        score: 74,
        confidence: 0.74,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP endpoint",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "AVoIP encoder / source-side endpoint",
        purposeRole: "encoder",
        purposeMatch: "same AVoIP role: encoder / source-side endpoint",
        reasons: [
          "lead option",
          "same AVoIP endpoint role",
          "source-side encoder, not display-side decoder",
          "confirm compression, latency, resolution, network design and control requirements before quoting"
        ]
      }
    ];
  }

  return [];
}

function curatedHdbasetExtenderCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");

  if (classification.category !== "hdbaset_extender") {
    return [];
  }

  const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const specificity = identifyHdbasetSpecificity(evidenceText);

  if (specificity.standard === "hdbaset_3") {
    return [
      {
        sku: "EX-100-USB3",
        name: "WyreStorm 100m HDBaseT 3.0 extender set with USB 3 support",
        family: "HDBaseT 3.0 Extender",
        sourceFile: "curated-hdbaset3-role-map",
        score: 94,
        confidence: 0.94,
        candidateCategory: "hdbaset_extender",
        candidateCategoryLabel: "HDBaseT extender / transmitter / receiver",
        competitorPurpose: specificity.label,
        candidatePurpose: "HDBaseT 3.0 extender kit / TX+RX set",
        purposeRole: "extender_set",
        purposeMatch: "same HDBaseT 3.0 role: extender kit / TX+RX set",
        reasons: [
          "same type of product",
          "same HDBaseT 3.0 standard",
          "same extender kit / TX+RX role",
          "required match for AC-EX100-444-R3 style products"
        ]
      }
    ];
  }

  if (competitorPurpose.role === "extender_set") {
    return [
      {
        sku: "EX-100-H2",
        name: "WyreStorm 100m 4K HDR HDBaseT extender set",
        family: "HDBaseT Extender",
        sourceFile: "curated-hdbaset-role-map",
        score: 78,
        confidence: 0.78,
        candidateCategory: "hdbaset_extender",
        candidateCategoryLabel: "HDBaseT extender / transmitter / receiver",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "HDBaseT extender kit / TX+RX set",
        purposeRole: "extender_set",
        purposeMatch: "same HDBaseT extender kit role",
        reasons: [
          "same HDBaseT role",
          "confirm distance, HDMI bandwidth, HDR, audio and control requirements before quoting"
        ]
      }
    ];
  }

  return [];
}

function curatedHdbasetMatrixCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");
  const specificity = identifyHdbasetMatrixSpecificity(evidenceText);

  if (!specificity.isHdbasetMatrix) {
    return [];
  }

  if (classification.category !== "matrix_switcher" && classification.category !== "hdbaset_extender") {
    return [];
  }

  return [
    {
      sku: "MXV-0808-H2A-KIT",
      name: "WyreStorm 8x8 HDBaseT matrix kit with 8 HDBaseT zone outputs",
      family: "HDBaseT Matrix Kit",
      sourceFile: "curated-hdbaset-matrix-role-map",
      score: 92,
      confidence: 0.92,
      candidateCategory: "matrix_switcher",
      candidateCategoryLabel: "8x8 HDBaseT matrix",
      competitorPurpose: specificity.label,
      candidatePurpose: "8x8 HDBaseT matrix / distribution role",
      purposeRole: "hdbaset_matrix",
      purposeMatch: "same 8x8 HDBaseT matrix role",
      reasons: [
        "lead option",
        "same 8x8 matrix scale",
        "same HDBaseT distribution role",
        "confirm receiver package, ARC/audio behaviour, control and distance before quoting"
      ]
    },
    {
      sku: "MXV-0808-H2L",
      name: "WyreStorm 8x8 4K60 HDBaseT matrix option",
      family: "HDBaseT Matrix",
      sourceFile: "curated-hdbaset-matrix-role-map",
      score: 82,
      confidence: 0.82,
      candidateCategory: "matrix_switcher",
      candidateCategoryLabel: "8x8 HDBaseT matrix",
      competitorPurpose: specificity.label,
      candidatePurpose: "8x8 HDBaseT matrix role",
      purposeRole: "hdbaset_matrix",
      purposeMatch: "same 8x8 HDBaseT matrix role, subject to package and receiver requirements",
      reasons: [
        "related option",
        "same 8x8 HDBaseT matrix role",
        "confirm whether this project needs kit receivers, ARC, audio downmixing and mirrored HDMI outputs"
      ]
    }
  ];
}

function curatedVideoWallCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");
  const specificity = identifyVideoWallSpecificity(evidenceText);

  if (!specificity.isVideoWall) {
    return [];
  }

  if (classification.category !== "video_wall_processor" && classification.category !== "multiview_processor") {
    return [];
  }

  if (specificity.leadWyrestormSku === "MX-0808-SCL") {
    return [
      {
        sku: "MX-0808-SCL",
        name: "WyreStorm 8x8 seamless matrix / scaling solution for video wall style requirements",
        family: "Seamless Matrix / Video Wall",
        sourceFile: "curated-videowall-role-map",
        score: 88,
        confidence: 0.88,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Video wall processor / matrix",
        competitorPurpose: specificity.label,
        candidatePurpose: "8x8 video wall / seamless matrix role",
        purposeRole: "video_wall_matrix",
        purposeMatch: "direct 8x8 video wall / matrix scale match",
        reasons: [
          "lead option",
          "same video wall requirement",
          "same 8x8 scale",
          "confirm source count, display count, layout behaviour and control requirement before quoting"
        ]
      },
      {
        sku: "SW-0206-VW",
        name: "WyreStorm 2-input / 6-output dedicated video wall processor",
        family: "Dedicated Video Wall Processor",
        sourceFile: "curated-videowall-role-map",
        score: 54,
        confidence: 0.54,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Dedicated video wall processor",
        competitorPurpose: specificity.label,
        candidatePurpose: "smaller dedicated LCD video wall processor role",
        purposeRole: "lcd_wall_processor",
        purposeMatch: "related video wall processor, but not an 8x8 matrix replacement",
        reasons: [
          "related alternative",
          "not like-for-like for an 8x8 requirement",
          "consider only if the real requirement is up to 6 display outputs"
        ]
      },
      {
        sku: "SW-0204-VW",
        name: "WyreStorm 2-input / 4-output dedicated video wall processor",
        family: "Dedicated Video Wall Processor",
        sourceFile: "curated-videowall-role-map",
        score: 48,
        confidence: 0.48,
        candidateCategory: "video_wall_processor",
        candidateCategoryLabel: "Dedicated video wall processor",
        competitorPurpose: specificity.label,
        candidatePurpose: "smaller dedicated LCD video wall processor role",
        purposeRole: "lcd_wall_processor",
        purposeMatch: "related video wall processor, but not an 8x8 matrix replacement",
        reasons: [
          "related alternative",
          "not like-for-like for an 8x8 requirement",
          "consider only if the real requirement is up to 4 display outputs"
        ]
      }
    ];
  }

  return [
    {
      sku: "SW-0206-VW",
      name: "WyreStorm 2-input / 6-output video wall processor",
      family: "Dedicated Video Wall Processor",
      sourceFile: "curated-videowall-role-map",
      score: 82,
      confidence: 0.82,
      candidateCategory: "video_wall_processor",
      candidateCategoryLabel: "Video wall processor",
      competitorPurpose: specificity.label,
      candidatePurpose: "small to medium LCD video wall processor role",
      purposeRole: "lcd_wall_processor",
      purposeMatch: "same dedicated video wall processor role, subject to output count",
      reasons: [
        "lead option for up to 6 outputs",
        "same video wall requirement",
        "dedicated video wall processor path"
      ]
    }
  ];
}

function buildCuratedWyrestormCandidates(classification, profile) {
  return [
    ...curatedAvoipCandidates(classification, profile),
    ...curatedHdbasetMatrixCandidates(classification, profile),
    ...curatedVideoWallCandidates(classification, profile),
    ...curatedHdbasetExtenderCandidates(classification, profile)
  ];
}

async function matchWyrestormProducts(classification, profile) {
  const products = await loadWyrestormProducts();
  const activeSkuMaster = await loadActiveSkuMaster();
  const evidenceText = String(profile.__evidenceText || "");
  const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const hdbasetSpecificity = identifyHdbasetSpecificity(evidenceText);
  const videoWallSpecificity = identifyVideoWallSpecificity(evidenceText);
  const hdbasetMatrixSpecificity = identifyHdbasetMatrixSpecificity(evidenceText);

  const scoredCandidates = products
    .map((product) => scoreWyrestormCandidate(classification, profile, product, evidenceText, activeSkuMaster))
    .filter(Boolean);

  const curatedCandidates = buildCuratedWyrestormCandidates(classification, profile);
  const bySku = new Map();
  let lifecycleFilteredCount = 0;

  for (const rawCandidate of [...curatedCandidates, ...scoredCandidates]) {
    if (!rawCandidate) {
      continue;
    }

    const lifecycle = inferCandidateLifecycle(rawCandidate, activeSkuMaster);
    const candidate = { ...rawCandidate, ...lifecycle };

    if (!lifecycleIsRecommendable(lifecycle)) {
      lifecycleFilteredCount += 1;
      continue;
    }

    if (classification.category === "av_over_ip" && !candidateSupportsAvoipEvidence(candidate, profile, competitorPurpose)) {
      continue;
    }

    const key = candidateSku(candidate);

    if (!key) {
      continue;
    }

    if (classification.category === "hdbaset_extender" && hdbasetSpecificity.standard === "hdbaset_3" && key !== "EX-100-USB3") {
      continue;
    }

    if (hdbasetMatrixSpecificity.isHdbasetMatrix && hdbasetMatrixSpecificity.inputs === 8 && hdbasetMatrixSpecificity.outputs === 8) {
      if (!["MXV-0808-H2A-KIT", "MXV-0808-H2L", "MX-0808-KIT V2", "MX-0808-HDBT-H2"].includes(key)) {
        continue;
      }
    }

    if (classification.category === "video_wall_processor" && videoWallSpecificity.isVideoWall && videoWallSpecificity.inputs === 8 && videoWallSpecificity.outputs === 8) {
      if (!["MX-0808-SCL", "MX-0812-SCL", "SW-0206-VW", "SW-0204-VW"].includes(key)) {
        continue;
      }
    }

    const existing = bySku.get(key);

    if (!existing || Number(candidate.score || 0) > Number(existing.score || 0)) {
      bySku.set(key, candidate);
    }
  }

  let candidates = Array.from(bySku.values()).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  if (classification.category === "av_over_ip") {
    candidates = candidates.slice(0, profile.verifiedSource ? 3 : 1);
  } else if (hdbasetSpecificity.standard === "hdbaset_3") {
    candidates = candidates.slice(0, 1);
  } else {
    candidates = candidates.slice(0, 8);
  }

  const top = candidates[0];

  if (!top || Number(top.score || 0) < MINIMUM_ANY_MATCH_SCORE) {
    return {
      attempted: true,
      matchStatus: "no_genuine_match",
      candidates,
      message: lifecycleFilteredCount > 0
        ? "Wingman found possible WyreStorm product areas, but the closest SKUs were not verified as active/recommendable. No customer-safe comparison is being forced."
        : "Wingman identified the competitor product type, but no WyreStorm product reached the minimum confidence threshold for a professional comparison."
    };
  }

  if (Number(top.score || 0) < MINIMUM_PROFESSIONAL_MATCH_SCORE) {
    return {
      attempted: true,
      matchStatus: "review_required",
      candidates,
      message: "Wingman found a same-area WyreStorm product, but the evidence is not strong enough to position it as a recommendation without manual review."
    };
  }

  return {
    attempted: true,
    matchStatus: "candidate_match",
    candidates,
    message: profile.verifiedSource
      ? "Wingman found WyreStorm options against verified competitor product facts."
      : "Wingman found a provisional same-role WyreStorm option. Add product-page or datasheet facts before quoting."
  };
}

function assessWyrestormGate(classification) {
  if (classification.category === "unknown") {
    return {
      canAttemptMatch: false,
      matchStatus: "insufficient_type_confidence",
      reason: "Wingman needs more product detail before recommending a WyreStorm alternative."
    };
  }

  if (!classification.wyrestormOverlap) {
    return {
      canAttemptMatch: false,
      matchStatus: "no_wyrestorm_category",
      reason: "The product appears to be " + classification.categoryLabel + ". WyreStorm does not directly compete with that product type."
    };
  }

  if (classification.confidence < 0.3) {
    return {
      canAttemptMatch: false,
      matchStatus: "insufficient_type_confidence",
      reason: "Wingman has found a possible product family, but needs more detail before making a professional recommendation."
    };
  }

  return {
    canAttemptMatch: true,
    matchStatus: "candidate_match_allowed",
    reason: "The product category overlaps with WyreStorm: " + classification.categoryLabel + "."
  };
}

export async function resolveCompetitorIntelligence(input = {}) {
  const brand = cleanText(input.brand || input.manufacturer || input.vendor);
  const sku = cleanText(input.sku || input.model || input.partNumber);
  const productName = cleanText(input.productName || input.name || input.title);
  const rawNotes = cleanText(input.rawText || input.notes || input.description);
  const productUrl = cleanText(input.productUrl || input.url || input.vendorUrl || input.productPageUrl);
  const allowWeb = input.allowWeb !== false;

  let web = {
    attempted: false,
    queries: [],
    searchRuns: [],
    sources: [],
    text: "",
    pagesRead: 0,
    usefulPages: 0
  };

  if (allowWeb && (brand || sku || productName || productUrl)) {
    web = await lookupPublicWebSpecs({ brand, sku, productName, productUrl });
  }

  const evidenceText = [brand, sku, productName, productUrl, rawNotes, web.text].filter(Boolean).join("\n\n");

  const classification = classifyProduct({
    brand,
    sku,
    productName,
    rawText: evidenceText
  });

  const verifiedProfile = buildVerifiedSpecProfile({ brand, sku, productName, evidenceText });
  const profile = verifiedProfile || extractSpecProfile(evidenceText);

  Object.defineProperty(profile, "__evidenceText", {
    value: evidenceText,
    enumerable: false
  });

  const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const gate = assessWyrestormGate(classification);

  let wyrestorm = {
    attempted: false,
    matchStatus: gate.matchStatus,
    candidates: [],
    message: gate.reason
  };

  if (gate.canAttemptMatch) {
    wyrestorm = await matchWyrestormProducts(classification, profile);
  }

  return {
    ok: true,
    query: {
      brand,
      sku,
      productName,
      productUrl,
      allowWeb
    },
    competitor: {
      brand,
      sku,
      productName,
      category: classification.category,
      categoryLabel: classification.categoryLabel,
      categoryConfidence: classification.confidence,
      wyrestormOverlap: classification.wyrestormOverlap,
      purposeRole: competitorPurpose.role,
      purposeLabel: competitorPurpose.label,
      purposeConfidence: competitorPurpose.confidence,
      alternatives: classification.alternatives,
      specProfile: profile
    },
    wyrestorm,
    evidence: {
      webSearchAttempted: web.attempted,
      queries: web.queries,
      searchRuns: web.searchRuns,
      pagesRead: web.pagesRead,
      usefulPages: web.usefulPages,
      sources: web.sources
    }
  };
}

export default resolveCompetitorIntelligence;
