import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const wyrestormSourcePath = path.join(projectRoot, "data-sources", "wyrestorm", "enrichment.json");
const reportPath = path.join(projectRoot, "reports", "wingman-product-technical-profile-summary.json");
// reports/ is gitignored, so the detailed summary is a local artefact only.
// The freshness guard needs something that survives a fresh clone and shows
// up in review, so a small status record is written beside the enrichment.
const statusPath = path.join(projectRoot, "data-sources", "wyrestorm", "enrichment-status.json");

const PROFILE_VERSION = "wyrestorm-product-manager-v1";
const FETCH_TIMEOUT_MS = 25000;
const OFFLINE_MODE = process.argv.includes("--offline");

const ROLE_LABELS = {
  "primary-hardware": "Primary hardware",
  "endpoint-hardware": "Endpoint hardware",
  "system-controller": "System controller / conditional-default",
  "workflow-endpoint": "Workflow endpoint / conditional-default",
  accessory: "Accessory / request-only",
  cable: "Cable / request-only",
  "power-accessory": "Power accessory / request-only",
  "rack-mount": "Rack mount / request-only",
};

const GROUP_ORDER = [
  "Video",
  "Audio",
  "USB",
  "Network",
  "Control",
  "Processing",
  "Power",
  "Mechanical",
  "Collaboration",
  "Accessory",
];

const FEATURE_RULES = [
  { id: "hdmi", label: "HDMI", group: "Video", terms: ["hdmi"] },
  { id: "hdmi-21", label: "HDMI 2.1 / 8K", group: "Video", terms: ["hdmi 2.1", "8k", "48gbps"] },
  { id: "hdbaset", label: "HDBaseT", group: "Video", terms: ["hdbaset", "hdbt"] },
  { id: "hdbaset-3", label: "HDBaseT 3.0", group: "Video", terms: ["hdbaset 3", "hdbaset3", "hdbt 3"] },
  { id: "displayport", label: "DisplayPort", group: "Video", terms: ["displayport", "display port", "dp++"] },
  { id: "usb-c-video", label: "USB-C video input", group: "Video", terms: ["usb-c", "usb c", "type-c"] },
  { id: "wireless-presentation", label: "Wireless presentation", group: "Collaboration", terms: ["airplay", "miracast", "wireless casting", "wireless presentation"] },
  { id: "wireless-conferencing", label: "Wireless conferencing", group: "Collaboration", terms: ["wireless conferencing", "wireless conference"] },
  { id: "networkhd", label: "NetworkHD AV over IP", group: "Network", terms: ["networkhd", "av over ip", "avoip"] },
  { id: "ndi", label: "NDI", group: "Network", terms: ["ndi"] },
  { id: "dante", label: "Dante", group: "Audio", terms: ["dante"] },
  { id: "aes67", label: "AES67", group: "Audio", terms: ["aes67"] },
  { id: "analog-audio", label: "Analog audio", group: "Audio", terms: ["analog audio", "line level", "line-level", "phoenix"] },
  { id: "audio-breakout", label: "Audio breakout", group: "Audio", terms: ["audio breakout", "audio break out", "audio de-embed", "de-embed", "deembed"] },
  { id: "amplifier", label: "Amplifier output", group: "Audio", terms: ["amplifier", "speaker output", "70v", "100v", "4/8", "4 ohm", "8 ohm"] },
  { id: "dsp", label: "DSP audio processing", group: "Audio", terms: ["dsp", "eq", "filters", "dynamics", "delay", "mixing"] },
  { id: "microphone", label: "Microphone", group: "Audio", terms: ["microphone", "mic array", "add-on mic", "ceiling mic"] },
  { id: "speakerphone", label: "Speakerphone", group: "Collaboration", terms: ["speakerphone", "speaker phone"] },
  { id: "video-bar", label: "Video bar", group: "Collaboration", terms: ["video bar", "videobar"] },
  { id: "camera", label: "Camera", group: "Collaboration", terms: ["camera", "ptz", "webcam"] },
  { id: "usb-20", label: "USB 2.0", group: "USB", terms: ["usb 2.0", "usb2.0", "usb 2"] },
  { id: "usb-30", label: "USB 3.x", group: "USB", terms: ["usb 3.0", "usb3.0", "usb 3.1", "usb 3.2", "superspeed", "5gbps", "10gbps"] },
  { id: "usb-c", label: "USB-C", group: "USB", terms: ["usb-c", "usb c", "type-c"] },
  { id: "usb-routing", label: "USB routing / switching", group: "USB", terms: ["usb routing", "usb switching", "usb host switching", "usb host", "usb device", "usb peripheral"] },
  { id: "usb-pd", label: "USB-C power delivery", group: "USB", terms: ["pd", "power delivery", "60w charging", "60w device charging", "usb-c charging"] },
  { id: "kvm", label: "KVM / USB extension", group: "USB", terms: ["kvm", "keyboard", "mouse", "hid"] },
  { id: "scaling", label: "Scaling", group: "Processing", terms: ["scaling", "scaler"] },
  { id: "seamless-switching", label: "Seamless switching", group: "Processing", terms: ["seamless switching", "seamless matrix", "fast switching"] },
  { id: "multiview", label: "Multiview", group: "Processing", terms: ["multiview", "multi-view", "multi view"] },
  { id: "video-wall", label: "Video wall", group: "Processing", terms: ["video wall", "videowall"] },
  { id: "edid", label: "EDID management", group: "Processing", terms: ["edid"] },
  { id: "hdcp", label: "HDCP support", group: "Processing", terms: ["hdcp"] },
  { id: "hdr", label: "HDR", group: "Video", terms: ["hdr", "dolby vision", "hlg"] },
  { id: "rs232", label: "RS-232 control", group: "Control", terms: ["rs-232", "rs232"] },
  { id: "ir", label: "IR control", group: "Control", terms: [" ir ", "ir passthrough", "infrared"] },
  { id: "cec", label: "CEC control", group: "Control", terms: ["cec"] },
  { id: "ip-control", label: "IP / web control", group: "Control", terms: ["telnet", "api", "web ui", "web gui", "ip control", "lan control"] },
  { id: "relay", label: "Relay / I/O control", group: "Control", terms: ["relay", "contact closure", "gpio"] },
  { id: "ethernet", label: "Ethernet / LAN", group: "Network", terms: ["ethernet", "lan", "rj45"] },
  { id: "poe", label: "PoE / PoH / PoC", group: "Power", terms: ["poe", "poh", "poc", "power over ethernet", "power over hdbaset"] },
  { id: "sfp", label: "SFP / fibre", group: "Network", terms: ["sfp", "fiber", "fibre", "optical"] },
  { id: "rack", label: "Rack installation", group: "Mechanical", terms: ["rack mount", "rackmount", "1u", "rack ears"] },
  { id: "in-wall", label: "In-wall installation", group: "Mechanical", terms: ["in-wall", "in wall", "wall plate"] },
  { id: "tabletop", label: "Tabletop / room installation", group: "Mechanical", terms: ["table top", "tabletop", "desktop"] },
  { id: "plenum", label: "Plenum / rated cable", group: "Mechanical", terms: ["plenum", "ft6", "cpr", "cl3"] },
];

const SPEC_KEYWORDS = [
  "inputs",
  "outputs",
  "video resolution",
  "maximum pixel clock",
  "audio formats",
  "output video encoding",
  "microphone",
  "speaker",
  "control",
  "hdmi",
  "hdbaset",
  "usb",
  "lan",
  "rs-232",
  "rs232",
  "power supply",
  "max power consumption",
  "communication",
  "audio and video",
  "audio & video",
  "power",
  "mechanical",
  "environmental",
];

function asString(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function clean(value) {
  return asString(value).replace(/\s+/g, " ").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function unique(values) {
  const seen = new Set();
  const output = [];

  for (const value of values.flat().map(clean).filter(Boolean)) {
    const key = lower(value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function collectTextValues(value, output = []) {
  if (typeof value === "string" || typeof value === "number") {
    const text = clean(value);
    if (text) output.push(text);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, output));
    return output;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectTextValues(item, output));
  }

  return output;
}

function uniqueObjects(values, keySelector) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const key = keySelector(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

// Word-boundary term match: a short token like "ndi" must NOT match inside a
// longer word ("i-ndi-viduals"). Terms may contain spaces/hyphens/dots/slashes,
// so we only require the boundaries to be non-alphanumeric.
function matchesTerm(text, term) {
  const needle = lower(term).trim();
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(lower(text));
}

function includesAny(text, terms) {
  return terms.some((term) => matchesTerm(text, term));
}

function normaliseSkuKey(value) {
  return upper(value).replace(/[^A-Z0-9]/g, "");
}

function slugifySku(value) {
  return lower(value)
    .replace(/\btm\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addUnique(array, values) {
  return unique([...(Array.isArray(array) ? array : []), ...values]);
}

function decodeHtml(value) {
  return asString(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, " TM ")
    .replace(/&#x00ae;|&#174;|&reg;/gi, " R ")
    .replace(/&#8211;|&#x2013;|&ndash;/gi, "-")
    .replace(/&#8212;|&#x2014;|&mdash;/gi, "-")
    .replace(/&#8216;|&#x2018;|&lsquo;/gi, "'")
    .replace(/&#8217;|&#x2019;|&rsquo;/gi, "'")
    .replace(/&#8220;|&#x201c;|&ldquo;/gi, "\"")
    .replace(/&#8221;|&#x201d;|&rdquo;/gi, "\"")
    .replace(/&#215;|&times;/gi, "x")
    .replace(/&#176;|&deg;/gi, " degrees ");
}

function htmlToLines(html) {
  const text = decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|td|th|tr|div|section|article|span)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return text
    .split(/\n+/)
    .map((line) => clean(line))
    .filter(Boolean);
}

function getProductUrl(product) {
  const explicitUrl = asString(product.url);
  if (explicitUrl.startsWith("http")) return explicitUrl;

  const sku = asString(product.sku || product.id || product.model);
  if (!sku) return "";

  return `https://www.wyrestorm.com/product/${slugifySku(sku)}/`;
}

async function fetchOfficialPage(product) {
  if (OFFLINE_MODE) {
    return {
      url: getProductUrl(product),
      status: "offline",
      lines: [],
      technicalLines: [],
      featureEvidenceLines: [],
    };
  }

  const url = getProductUrl(product);
  if (!url) {
    return { url, status: "missing-url", lines: [], technicalLines: [], featureEvidenceLines: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 WyreStorm-Wingman-Product-Data-Audit/1.0",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return { url, status: response.status, lines: [], technicalLines: [], featureEvidenceLines: [] };
    }

    const html = await response.text();
    return extractPageFacts(html, response.url || url, response.status);
  } catch (error) {
    return {
      url,
      status: error.name === "AbortError" ? "timeout" : "fetch-error",
      error: error.message,
      lines: [],
      technicalLines: [],
      featureEvidenceLines: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isStopLine(line) {
  return /^(downloads?|product downloads?|related products?|you may also like|reviews?|resources?|product categories|register|login as a partner)/i.test(line);
}

function isNavigationNoise(line) {
  return /^(products|solutions|resources|about|contact|cart|home|new arrivals|best sellers|newsletter|skip to content)$/i.test(line);
}

function isSpecHeading(line) {
  const text = lower(line);
  if (SPEC_KEYWORDS.some((keyword) => text === keyword || text.startsWith(`${keyword} `))) return true;
  if (line.length <= 34 && /^[A-Z0-9 &/()_.+-]+$/.test(line) && /[A-Z]/.test(line)) return true;
  return false;
}

function looksLikeFeatureSentence(line) {
  const text = lower(line);
  if (line.length < 45) return false;
  if (isNavigationNoise(line) || isSpecHeading(line)) return false;
  if (/^\d+\s*x\s+/i.test(line)) return false;
  if (/^(sku|inputs|outputs|video resolution|max|power supply|frequency response|sample rate)\b/i.test(line)) return false;
  return /(supports?|provides?|allows?|features?|includes?|compatible|designed|integrates?|delivers?|enables?)/i.test(text);
}

function extractPageFacts(html, url, status) {
  const lines = htmlToLines(html).filter((line) => !isNavigationNoise(line));
  const technicalStart = lines.findIndex((line) => /^technical specifications$/i.test(line));
  const technicalLines = [];

  if (technicalStart >= 0) {
    for (const line of lines.slice(technicalStart + 1)) {
      if (isStopLine(line)) break;
      technicalLines.push(line);
    }
  }

  const cleanedTechnicalLines = unique(technicalLines)
    .filter((line) => !/^technical specifications$/i.test(line))
    .slice(0, 180);

  const featureEvidenceLines = unique([
    ...lines.filter(looksLikeFeatureSentence),
    ...cleanedTechnicalLines.filter(looksLikeFeatureSentence),
  ]).slice(0, 60);

  return {
    url,
    status,
    lines,
    technicalLines: cleanedTechnicalLines,
    featureEvidenceLines,
  };
}

function buildTextBlob(product, pageFacts = {}) {
  return [
    product.sku,
    product.id,
    product.name,
    product.title,
    product.description,
    product.summary,
    product.category,
    product.family,
    ...(Array.isArray(pageFacts.technicalLines) ? pageFacts.technicalLines : []),
  ].map(clean).filter(Boolean).join(" ");
}

function inferRole(product, text) {
  const sku = upper(product.sku || product.id || product.model);
  const identityText = lower(`${product.sku ?? ""} ${product.name ?? ""} ${product.title ?? ""} ${product.description ?? ""} ${product.summary ?? ""}`);

  if (/^(CAB-|CBL-|EXP-CAB-|EXP-HDMI-|EXP-8KUHD-|EXP-4KUHD-)/.test(sku)) {
    return { productRole: "cable", catalogVisibility: "request-only" };
  }

  if (/^PSU-/.test(sku) || includesAny(identityText, ["replacement power", "power adapter", "power supply for", "psu"])) {
    return { productRole: "power-accessory", catalogVisibility: "request-only" };
  }

  if (/(-MNT$|MOUNT|BRACKET)/.test(sku) || includesAny(identityText, ["mounting kit", "wall mount", "display mount", "bracket"])) {
    return { productRole: "accessory", catalogVisibility: "request-only" };
  }

  if (/^(APO-(COM-MIC|SKY-MIC|MIC-EXT)|HALO-COM-MIC)$/.test(sku) || includesAny(identityText, ["add-on microphone", "add on microphone", "ceiling mic"])) {
    return { productRole: "accessory", catalogVisibility: "request-only" };
  }

  if (includesAny(identityText, ["dongle", "adapter", "docking cradle"]) || /-DG/.test(sku)) {
    return { productRole: "workflow-endpoint", catalogVisibility: "conditional-default" };
  }

  if (includesAny(identityText, ["switcher", "matrix", "processor", "amplifier", "speakerphone", "video bar", "microphone hub", "camera bridge"])) {
    return { productRole: "primary-hardware", catalogVisibility: "default" };
  }

  if (includesAny(text, ["controller", "touchpad", "touchscreen", "keypad", "control app", "protocol converter"])) {
    return { productRole: "system-controller", catalogVisibility: "conditional-default" };
  }

  if (includesAny(text, ["receiver", "transmitter", "encoder", "decoder", "transceiver", "extender"])) {
    return { productRole: "endpoint-hardware", catalogVisibility: "default" };
  }

  return { productRole: "primary-hardware", catalogVisibility: "default" };
}

function baseClassification(product, text) {
  const sku = upper(product.sku || product.id || product.model);
  const identityText = lower(`${product.sku ?? ""} ${product.name ?? ""} ${product.title ?? ""} ${product.description ?? ""} ${product.summary ?? ""}`);
  // What the product IS, as opposed to what its datasheet talks about. A
  // description names the things you connect - "supports a PTZ camera on input
  // 2", "pairs with any NetworkHD decoder" - so deciding a product's own
  // identity from it turns a transmitter into a camera. Use this for any test
  // that decides WHAT THE PRODUCT IS; identityText remains fine for detecting
  // capabilities it mentions.
  const identityOnlyText = lower(`${product.sku ?? ""} ${product.name ?? ""} ${product.title ?? ""}`);
  const role = inferRole(product, text);
  const roleVisibility = {
    productRole: role.productRole,
    catalogVisibility: role.catalogVisibility,
  };

  const make = (fields) => ({
    taxonomyVersion: PROFILE_VERSION,
    primaryCategory: fields.primaryCategory,
    category: fields.category,
    subCategory: fields.subCategory,
    productType: fields.productType,
    productSubType: fields.productSubType,
    systemRole: fields.systemRole,
    applicationRole: fields.applicationRole,
    transportClass: fields.transportClass || [],
    signalDomains: fields.signalDomains || [],
    subClassifications: unique(fields.subClassifications || []),
    classificationPath: unique([
      fields.primaryCategory,
      fields.category,
      fields.subCategory,
      fields.productType,
      fields.productSubType,
    ]),
    confidence: fields.confidence ?? 0.82,
    productRole: fields.productRole || roleVisibility.productRole,
    catalogVisibility: fields.catalogVisibility || roleVisibility.catalogVisibility,
  });

  if (/^(CAB-|CBL-|EXP-CAB-|EXP-HDMI-|EXP-8KUHD-|EXP-4KUHD-)/.test(sku)) {
    return make({
      primaryCategory: "Cable / Connectivity",
      category: includesAny(identityText, ["usb"]) ? "USB cable" : includesAny(identityText, ["displayport"]) ? "DisplayPort cable" : "HDMI cable",
      subCategory: includesAny(identityText, ["active optical", "aoc"]) ? "Active optical cable" : "Passive cable",
      productType: "Cable",
      productSubType: includesAny(identityText, ["plenum", "ft6"]) ? "Plenum rated" : includesAny(identityText, ["cpr", "cl3"]) ? "CPR / CL3 rated" : "",
      systemRole: "Physical connectivity",
      applicationRole: "Interconnect and installed cabling",
      transportClass: ["HDMI", "USB", "DisplayPort"].filter((item) => includesAny(identityText, [item])),
      signalDomains: ["Video", includesAny(identityText, ["usb"]) && "USB"].filter(Boolean),
      subClassifications: ["cable", includesAny(identityText, ["active optical", "aoc"]) && "active-optical"].filter(Boolean),
      confidence: 0.94,
      productRole: "cable",
      catalogVisibility: "request-only",
    });
  }

  if (sku === "APO-210-UC") {
    return make({
      primaryCategory: "Unified Communications",
      category: "UC room core",
      subCategory: "Apollo speakerphone switcher",
      productType: "Speakerphone and presentation switcher",
      productSubType: "USB peripheral hub with HDMI, USB-C, wireless casting and HDBaseT output",
      systemRole: "UC room audio and source switching hub",
      applicationRole: "Camera, speakerphone, microphone and BYOM/BYOD meeting workflows",
      transportClass: ["HDMI", "USB-C", "USB 3.x", "HDBaseT", "Wireless"],
      signalDomains: ["Video", "Audio", "USB", "Control"],
      subClassifications: ["speakerphone", "presentation-switcher", "uc-peripheral-hub", "wireless-collaboration"],
      confidence: 0.98,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (sku === "USB-HUB4" || sku === "WYRERING") {
    return make({
      primaryCategory: "Accessory / Other",
      category: sku === "USB-HUB4" ? "USB accessory" : "Adapter accessory",
      subCategory: sku === "USB-HUB4" ? "USB hub" : "Adapter ring",
      productType: "Accessory",
      productSubType: "",
      systemRole: "Supporting connectivity accessory",
      applicationRole: "Optional room connectivity accessory",
      transportClass: sku === "USB-HUB4" ? ["USB"] : ["HDMI", "USB-C", "DisplayPort"],
      signalDomains: ["USB", "Video"],
      subClassifications: ["accessory", sku === "USB-HUB4" ? "usb-hub" : "adapter-ring"],
      confidence: 0.95,
      productRole: "accessory",
      catalogVisibility: "request-only",
    });
  }

  if (/(-MNT$|MOUNT|BRACKET)/.test(sku) || includesAny(identityText, ["mounting kit", "wall mount", "display mount", "bracket"])) {
    return make({
      primaryCategory: "Accessory / Other",
      category: "Mounting accessory",
      subCategory: "Product-specific mounting kit",
      productType: "Mount / bracket",
      productSubType: "",
      systemRole: "Mechanical support accessory",
      applicationRole: "Mounting or installation support for parent product",
      transportClass: [],
      signalDomains: ["Mechanical"],
      subClassifications: ["mounting-accessory", "accessory"],
      confidence: 0.93,
      productRole: "accessory",
      catalogVisibility: "request-only",
    });
  }

  if (/^(NHD-.*RACK|NHD-RACK)/.test(sku)) {
    return make({
      primaryCategory: "Accessory / Other",
      category: "Rack accessory",
      subCategory: "NetworkHD rack mount",
      productType: "Rack mount",
      productSubType: "",
      systemRole: "Mechanical support accessory",
      applicationRole: "Rack mounting for NetworkHD endpoint hardware",
      transportClass: [],
      signalDomains: ["Mechanical"],
      subClassifications: ["rack-mount", "networkhd-accessory"],
      confidence: 0.95,
      productRole: "rack-mount",
      catalogVisibility: "request-only",
    });
  }

  // The bare word "webcam" also appears in HDBaseT extender / AVoIP transceiver
  // descriptions as an example of a USB device the product can pass through
  // (e.g. RX-700: "supports data transmission of USB 2.0 devices like HD
  // webcams..."; NHD-600-TRXF: "...webcams, touchscreens, and media storage"),
  // not because the product itself is a camera. Every genuine WyreStorm
  // webcam/camera product's own description is free of extender/transceiver
  // language, so require the absence of that language before trusting the
  // bare "webcam" keyword.
  const mentionsWebcamAsPassthroughExample = includesAny(identityText, ["webcam"])
    && includesAny(identityText, ["hdbaset", "receiver", "transmitter", "transceiver", "extender", "sdvoe"]);

  if (
    /^CAM-/.test(sku) ||
    /^FOCUS/.test(sku) ||
    includesAny(identityOnlyText, ["ptz camera", "camera bridge", "ndi camera"]) ||
    (includesAny(identityOnlyText, ["webcam"]) && !mentionsWebcamAsPassthroughExample)
  ) {
    return make({
      primaryCategory: "Camera / Capture",
      category: "Camera endpoint",
      subCategory: includesAny(identityText, ["bridge", "mixer"]) ? "Camera bridge / mixer" : includesAny(identityText, ["ptz"]) ? "PTZ camera" : "USB camera",
      productType: includesAny(identityText, ["ndi"]) ? "NDI camera endpoint" : "Camera endpoint",
      productSubType: includesAny(identityText, ["4k"]) ? "4K camera" : includesAny(identityText, ["1080"]) ? "1080p camera" : "",
      systemRole: "Image capture endpoint",
      applicationRole: "UC, lecture capture and streaming workflows",
      transportClass: ["USB", "NDI", "HDMI", "Network"].filter((item) => includesAny(text, [item])),
      signalDomains: ["Video", "USB", "Network", "Control"],
      subClassifications: ["camera", includesAny(identityText, ["ptz"]) && "ptz", includesAny(identityText, ["ndi"]) && "ndi"].filter(Boolean),
      confidence: 0.95,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^(APO-|HALO-|OFFICE-KIT|COM-)/.test(sku) || includesAny(identityText, ["speakerphone", "video bar", "unified communication", "microphone hub"])) {
    const isDongle = includesAny(identityText, ["dongle", "casting dongle"]);
    const isMic = includesAny(identityText, ["microphone", "mic array", "ceiling mic", "add-on mic", "microphone hub"]);
    const isCamera = includesAny(identityText, ["ptz camera", "webcam", "camera"]);
    const isVideoBar = includesAny(identityText, ["video bar", "videobar"]);
    const isSpeakerphone = includesAny(identityText, ["speakerphone"]);

    return make({
      primaryCategory: "Unified Communications",
      category: isDongle ? "Wireless collaboration accessory" : isCamera ? "Camera / capture" : isMic ? "Microphone system" : isVideoBar ? "Video bar" : "UC audio / room core",
      subCategory: isDongle ? "Apollo wireless dongle" : isSpeakerphone ? "Speakerphone switcher" : isMic ? "UC microphone accessory" : isVideoBar ? "All-in-one video bar" : "UC endpoint",
      productType: isDongle ? "Wireless casting endpoint" : isCamera ? "Camera endpoint" : isMic ? "Microphone endpoint" : isVideoBar ? "Camera, microphone and speaker endpoint" : "UC room device",
      productSubType: isSpeakerphone ? "Speakerphone / presentation switcher" : isMic ? "Conference microphone / microphone hub" : "",
      systemRole: isDongle ? "Optional collaboration endpoint" : isMic ? "UC audio capture component" : "UC room endpoint",
      applicationRole: "Meeting room, BYOD/BYOM and conferencing workflows",
      transportClass: ["USB", "Audio", "Wireless", "HDMI"].filter((item) => includesAny(text, [item])),
      signalDomains: ["Audio", "USB", "Video", "Control"].filter((item) => includesAny(text, [item]) || item === "Audio"),
      subClassifications: [
        isDongle && "wireless-dongle",
        isMic && "microphone",
        isCamera && "camera",
        isVideoBar && "video-bar",
        isSpeakerphone && "speakerphone",
        includesAny(identityText, ["switcher"]) && "switcher",
      ].filter(Boolean),
      confidence: 0.92,
    });
  }

  if (/^(CON-|EXP-CON-)/.test(sku)) {
    return make({
      primaryCategory: "Control",
      category: "Signal management",
      subCategory: includesAny(identityText, ["edid"]) ? "EDID / re-clocking" : includesAny(identityText, ["audio", "downmix"]) ? "Audio extraction / conversion" : "Inline scaling / conversion",
      productType: "Inline signal utility",
      productSubType: "",
      systemRole: "Signal conditioning, audio breakout or format management",
      applicationRole: "Problem-solving utility for HDMI, audio and control paths",
      transportClass: ["HDMI", "Audio", "Control"].filter((item) => includesAny(text, [item])),
      signalDomains: ["Video", "Audio", "Control"],
      subClassifications: ["signal-utility", includesAny(identityText, ["edid"]) && "edid", includesAny(identityText, ["audio", "downmix"]) && "audio-conversion"].filter(Boolean),
      confidence: 0.86,
      productRole: "system-controller",
      catalogVisibility: "conditional-default",
    });
  }

  if (/^COMPANIONCONTROL$/.test(sku) || includesAny(identityText, ["companion control app", "control app", "visual control app"])) {
    return make({
      primaryCategory: "Control",
      category: "Software control",
      subCategory: "Control application",
      productType: "Software control app",
      productSubType: "",
      systemRole: "User control interface",
      applicationRole: "Control interface for compatible WyreStorm systems",
      transportClass: ["IP"],
      signalDomains: ["Control", "Network"],
      subClassifications: ["software", "control-app"],
      confidence: 0.92,
      productRole: "system-controller",
      catalogVisibility: "conditional-default",
    });
  }

  if (sku === "NHD-128-NDI-TRX") {
    return make({
      primaryCategory: "Camera / Capture",
      category: "NDI workflow endpoint",
      subCategory: "NDI encoder / decoder",
      productType: "NDI bridge endpoint",
      productSubType: "",
      systemRole: "NDI source/display workflow bridge",
      applicationRole: "NDI camera, streaming and production workflows",
      transportClass: ["NDI", "Network", "HDMI"],
      signalDomains: ["Video", "Network", "Control"],
      subClassifications: ["ndi", "encoder-decoder", "camera-workflow"],
      confidence: 0.94,
      productRole: "endpoint-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^NHD[- ]?TOUCH/.test(sku)) {
    return make({
      primaryCategory: "NetworkHD AV over IP",
      category: "AVoIP infrastructure",
      subCategory: "Controller",
      productType: "NetworkHD touch control interface",
      productSubType: "",
      systemRole: "AVoIP system control",
      applicationRole: "NetworkHD user control interface",
      transportClass: ["IP"],
      signalDomains: ["Control", "Network"],
      subClassifications: ["networkhd-control", "touch-interface"],
      confidence: 0.95,
      productRole: "system-controller",
      catalogVisibility: "conditional-default",
    });
  }

  // NetworkHD branding does not necessarily mean that a product transports
  // video over the network. This unit has four local HDMI inputs; its RJ45 is
  // for control/integration. Keep this architectural exception ahead of the
  // broad NHD family rule so refreshes cannot turn it into an AVoIP endpoint.
  if (sku === "NHD-0401-MV") {
    return make({
      primaryCategory: "Video Processing",
      category: "Multiview processor",
      subCategory: "Standalone HDMI multiview switcher",
      productType: "4-input HDMI multiview processor",
      productSubType: "4K60 multiview with local HDMI inputs",
      systemRole: "Multiview composition and source switching",
      applicationRole: "Combine up to four local HDMI sources on one HDMI output",
      transportClass: ["HDMI", "1GbE control"],
      signalDomains: ["Video", "Audio", "Control", "Network"],
      subClassifications: ["multiview-processor", "local-hdmi", "standalone-processor"],
      confidence: 0.99,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^NHD-/.test(sku)) {
    const series = sku.includes("600") || includesAny(text, ["networkhd 600", "10g"]) ? "NetworkHD 600" : sku.includes("500") || includesAny(text, ["networkhd 500"]) ? "NetworkHD 500" : "NetworkHD 100";
    // The endpoint role is decided from the SKU suffix and the product NAME,
    // never from the description or summary. A NetworkHD datasheet routinely
    // names the other end of the link ("pairs with any NetworkHD decoder",
    // "requires the NHD-000-CTL controller"), and matching that prose is what
    // previously typed NHD-124-TX, NHD-400-TX and NHD-400-TX-IW - all encoders
    // - as decoders, and NHD-500-IW-TX, NHD-500-IW-TX-V2, NHD-150-RX and
    // NHD-250-RX as controllers.
    //
    // The suffix is unambiguous: -CTL controller, -TRX transceiver, -TX
    // encoder, -RX decoder. Multiview is checked before the suffix because a
    // multiview processor sits on the decode side and is named for its job.
    const skuRole = lower(sku);
    const nameRole = lower(`${product.name ?? ""} ${product.title ?? ""}`);
    const endpointRole = /-ctl(\b|-)/.test(skuRole) || includesAny(nameRole, ["controller", "touchscreen"])
      ? "Controller"
      : includesAny(nameRole, ["multiview", "multi-view"])
        ? "Multiview processor"
        : /-trx(\b|-)/.test(skuRole) || includesAny(nameRole, ["transceiver"])
          ? "Transceiver"
          : /-tx(\b|-)/.test(skuRole) || includesAny(nameRole, ["encoder", "transmitter"])
            ? "Encoder"
            : /-rx(\b|-)/.test(skuRole) || includesAny(nameRole, ["decoder", "receiver"])
              ? "Decoder"
              : "AVoIP endpoint";

    return make({
      primaryCategory: "NetworkHD AV over IP",
      category: series,
      subCategory: endpointRole,
      productType: endpointRole === "Controller" ? "AVoIP controller" : endpointRole === "Multiview processor" ? "AVoIP multiview processor" : "AVoIP endpoint",
      productSubType: includesAny(text, ["10g"]) ? "10G lossless transport" : includesAny(text, ["4k60"]) ? "4K60 transport" : "",
      systemRole: endpointRole === "Controller" ? "AVoIP system control" : endpointRole,
      applicationRole: "Distributed AV routing, video wall, multiview or AVoIP transport",
      transportClass: ["AVoIP", series, includesAny(text, ["10g"]) ? "10G Ethernet" : "1G Ethernet"].filter(Boolean),
      signalDomains: ["Video", "Network", "Control", includesAny(text, ["usb"]) && "USB"].filter(Boolean),
      subClassifications: [series.toLowerCase().replace(/\s+/g, "-"), lower(endpointRole).replace(/\s+/g, "-")],
      confidence: 0.95,
    });
  }

  if (/^(M42|M43)/.test(sku) || includesAny(identityText, ["netgear", "network switch", "pre-configured switch"])) {
    return make({
      primaryCategory: "NetworkHD AV over IP",
      category: "AVoIP infrastructure",
      subCategory: "Network switch",
      productType: "Pre-configured network switch",
      productSubType: includesAny(text, ["10g"]) ? "10G switch" : "1G PoE switch",
      systemRole: "Network infrastructure for AV over IP",
      applicationRole: "NetworkHD infrastructure",
      transportClass: ["Ethernet", includesAny(text, ["10g"]) ? "10G" : "1G"],
      signalDomains: ["Network", "Power"],
      subClassifications: ["network-switch", "avoip-infrastructure"],
      confidence: 0.94,
    });
  }

  if (/^EXP-SW-/.test(sku)) {
    return make({
      primaryCategory: "Presentation / Room Core",
      category: "Presentation switcher",
      subCategory: includesAny(identityText, ["8k"]) ? "8K HDMI switcher" : "Room switcher",
      productType: "Room source switcher",
      productSubType: "",
      systemRole: "Source switching",
      applicationRole: "Presentation source selection",
      transportClass: ["HDMI"],
      signalDomains: ["Video", "Audio", "Control"],
      subClassifications: ["presentation-switcher", "source-switcher"],
      confidence: 0.9,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^SP-/.test(sku) || includesAny(identityText, ["splitter", "distribution amplifier"])) {
    return make({
      primaryCategory: "Distribution",
      category: "Splitter / distribution amplifier",
      subCategory: includesAny(text, ["scaling"]) ? "Scaling splitter" : "HDMI splitter",
      productType: "One-to-many distribution",
      productSubType: "",
      systemRole: "Signal distribution",
      applicationRole: "Duplicate one source to multiple displays",
      transportClass: ["HDMI"],
      signalDomains: ["Video", "Audio"],
      subClassifications: ["splitter", includesAny(text, ["scaling"]) && "scaling"].filter(Boolean),
      confidence: 0.93,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^AMP-/.test(sku) || (includesAny(identityText, ["amplifier"]) && !includesAny(identityText, ["distribution amplifier"]))) {
    return make({
      primaryCategory: "Audio",
      category: "Amplification",
      subCategory: includesAny(text, ["dante"]) ? "Dante DSP amplifier" : "Audio amplifier",
      productType: "Network amplifier",
      productSubType: includesAny(text, ["70v", "100v"]) ? "Low/high impedance amplifier" : "",
      systemRole: "Audio DSP and speaker amplification",
      applicationRole: "Room audio, distributed audio and speech reinforcement",
      transportClass: ["Analog audio", includesAny(text, ["dante"]) && "Dante/AES67"].filter(Boolean),
      signalDomains: ["Audio", "Network", "Control", "Power"],
      subClassifications: ["amplifier", includesAny(text, ["dsp"]) && "dsp", includesAny(text, ["dante"]) && "dante"].filter(Boolean),
      confidence: 0.96,
    });
  }

  if (/^EXP-MX-/.test(sku)) {
    return make({
      primaryCategory: "Matrix / Routing",
      category: includesAny(text, ["hdbaset", "hdbt"]) ? "HDBaseT matrix" : "Matrix switcher",
      subCategory: includesAny(text, ["hdbaset", "hdbt"]) ? "Matrix with HDBaseT extension" : "Fixed I/O matrix",
      productType: "Matrix routing package",
      productSubType: "",
      systemRole: "Central video routing",
      applicationRole: "Fixed I/O source-to-display routing",
      transportClass: ["HDMI", includesAny(text, ["hdbaset", "hdbt"]) && "HDBaseT"].filter(Boolean),
      signalDomains: ["Video", "Audio", "Control"],
      subClassifications: ["matrix", "package"],
      confidence: 0.9,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^SYN-(KEY|TOUCH|CTL)/.test(sku)) {
    return make({
      primaryCategory: "Control",
      category: "Control interface",
      subCategory: includesAny(identityText, ["touch"]) ? "Touch panel" : includesAny(identityText, ["keypad"]) ? "Keypad" : "Protocol bridge",
      productType: "Control device",
      productSubType: "",
      systemRole: "User or protocol control interface",
      applicationRole: "Room control and automation",
      transportClass: ["IP", "RS-232", "IR", "Relay"].filter((item) => includesAny(text, [item])),
      signalDomains: ["Control", "Network"],
      subClassifications: ["control", includesAny(identityText, ["touch"]) && "touch", includesAny(identityText, ["keypad"]) && "keypad"].filter(Boolean),
      confidence: 0.92,
      productRole: "system-controller",
      catalogVisibility: "conditional-default",
    });
  }

  if (/^EXP-SW-/.test(sku)) {
    return make({
      primaryCategory: "Presentation / Room Core",
      category: "Presentation switcher",
      subCategory: includesAny(identityText, ["8k"]) ? "8K HDMI switcher" : "Room switcher",
      productType: "Room source switcher",
      productSubType: "",
      systemRole: "Source switching",
      applicationRole: "Presentation source selection",
      transportClass: ["HDMI"],
      signalDomains: ["Video", "Audio", "Control"],
      subClassifications: ["presentation-switcher", "source-switcher"],
      confidence: 0.9,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^TS-/.test(sku)) {
    return make({
      primaryCategory: "Control",
      category: "Control interface",
      subCategory: "Touchscreen",
      productType: "Room control touchscreen",
      productSubType: "",
      systemRole: "User control interface",
      applicationRole: "Room control and presentation switcher control",
      transportClass: ["RS-232", "Control"],
      signalDomains: ["Control"],
      subClassifications: ["control", "touchscreen"],
      confidence: 0.92,
      productRole: "system-controller",
      catalogVisibility: "conditional-default",
    });
  }

  if (/^SW-020/.test(sku)) {
    return make({
      primaryCategory: "Video Processing",
      category: "Video wall processor",
      subCategory: includesAny(identityText, ["6-output", "6 output"]) ? "Multi-output wall processor" : "Preset wall processor",
      productType: "Dedicated video wall processor",
      productSubType: includesAny(text, ["4k60"]) ? "4K60 processor" : "",
      systemRole: "Video wall layout processing",
      applicationRole: "Video wall, signage and multi-display processing",
      transportClass: ["HDMI"],
      signalDomains: ["Video", "Control"],
      subClassifications: ["video-wall", "processor"],
      confidence: 0.97,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^(SW-|SYN-KIT)/.test(sku)) {
    const wireless = includesAny(text, ["wireless", "airplay", "miracast"]);
    const uc = /^SW-(620|640)/.test(sku) || includesAny(identityText, ["wireless conferencing", "conferencing", "byom", "speakerphone", "camera"]);
    return make({
      primaryCategory: uc ? "Unified Communications" : "Presentation / Room Core",
      category: wireless ? "Wireless presentation switcher" : "Presentation switcher",
      subCategory: includesAny(identityText, ["in-wall", "in wall"]) ? "In-wall transmitter / switcher" : includesAny(text, ["hdbaset"]) ? "HDBaseT room switcher" : "Room switcher",
      productType: "Room source switcher",
      productSubType: includesAny(text, ["dual-view", "dual view", "mst"]) ? "Dual-display / MST capable" : "",
      systemRole: "Room presentation and source switching core",
      applicationRole: "Meeting room, classroom and BYOD presentation workflows",
      transportClass: ["HDMI", includesAny(text, ["usb-c"]) && "USB-C", includesAny(text, ["hdbaset"]) && "HDBaseT", wireless && "Wireless"].filter(Boolean),
      signalDomains: ["Video", "Audio", "Control", includesAny(text, ["usb"]) && "USB"].filter(Boolean),
      subClassifications: ["presentation-switcher", wireless && "wireless", uc && "uc", includesAny(text, ["hdbaset"]) && "hdbaset"].filter(Boolean),
      confidence: 0.92,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^(RX-|RX3-|RXF-|RXV-|TX-)/.test(sku)) {
    const isUsb = includesAny(text, ["usb", "kvm"]);
    return make({
      primaryCategory: "Extension",
      category: isUsb ? "USB / KVM extender" : "HDBaseT extender",
      subCategory: includesAny(identityText, ["receiver"]) ? "Receiver" : includesAny(identityText, ["transmitter"]) ? "Transmitter" : "Endpoint",
      productType: "Signal extension endpoint",
      productSubType: includesAny(text, ["scaling", "scl"]) ? "Scaling endpoint" : "",
      systemRole: "Point-to-point extension",
      applicationRole: "Long-distance video, USB, control and network transport",
      transportClass: ["HDBaseT", isUsb && "USB", includesAny(text, ["fiber", "fibre"]) && "Fiber"].filter(Boolean),
      signalDomains: ["Video", isUsb && "USB", "Control", "Network"].filter(Boolean),
      subClassifications: ["extender", isUsb && "usb-kvm", includesAny(identityText, ["receiver"]) && "receiver", includesAny(identityText, ["transmitter"]) && "transmitter"].filter(Boolean),
      confidence: 0.94,
      productRole: "endpoint-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^MX-.*MST/.test(sku)) {
    return make({
      primaryCategory: "Presentation / Room Core",
      category: "Presentation switcher",
      subCategory: "Dual-display / MST room core",
      productType: "Room source switcher",
      productSubType: "MST / dual-display capable",
      systemRole: "Room presentation and source switching core",
      applicationRole: "Meeting room, classroom and BYOD/BYOM presentation workflows",
      transportClass: ["HDMI", "USB-C", "HDBaseT"].filter((item) => includesAny(text, [item])),
      signalDomains: ["Video", "Audio", "Control", includesAny(text, ["usb"]) && "USB"].filter(Boolean),
      subClassifications: ["presentation-switcher", "mst", "room-core"],
      confidence: 0.96,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^(MX-|MXV-)/.test(sku) || includesAny(identityText, ["matrix switcher", "matrix kit"])) {
    const seamless = includesAny(text, ["seamless", "scl", "scaling"]);
    const hdbaset = includesAny(text, ["hdbaset", "hdbt"]);
    return make({
      primaryCategory: "Matrix / Routing",
      category: seamless ? "Seamless matrix" : hdbaset ? "HDBaseT matrix" : "Matrix switcher",
      subCategory: hdbaset ? "Matrix with HDBaseT extension" : "Fixed I/O matrix",
      productType: "Matrix routing core",
      productSubType: seamless ? "Scaling / seamless matrix" : "",
      systemRole: "Central video routing",
      applicationRole: "Fixed I/O source-to-display routing",
      transportClass: ["HDMI", hdbaset && "HDBaseT"].filter(Boolean),
      signalDomains: ["Video", "Audio", "Control", hdbaset && "Network"].filter(Boolean),
      subClassifications: ["matrix", seamless && "seamless", hdbaset && "hdbaset"].filter(Boolean),
      confidence: 0.93,
    });
  }

  if (/^EXP-SW-/.test(sku)) {
    return make({
      primaryCategory: "Presentation / Room Core",
      category: "Presentation switcher",
      subCategory: includesAny(identityText, ["8k"]) ? "8K HDMI switcher" : "Room switcher",
      productType: "Room source switcher",
      productSubType: "",
      systemRole: "Source switching",
      applicationRole: "Presentation source selection",
      transportClass: ["HDMI"],
      signalDomains: ["Video", "Audio", "Control"],
      subClassifications: ["presentation-switcher", "source-switcher"],
      confidence: 0.9,
      productRole: "primary-hardware",
      catalogVisibility: "default",
    });
  }

  if (/^(EX-|EX3-|EXA-|EXF-|RX-|RX3-|RXF-|RXV-|TX-|SWX-)/.test(sku) || includesAny(identityText, ["extender", "hdbaset receiver", "hdbaset transmitter"])) {
    const isUsb = includesAny(text, ["usb", "kvm"]);
    return make({
      primaryCategory: "Extension",
      category: isUsb ? "USB / KVM extender" : "HDBaseT extender",
      subCategory: includesAny(text, ["receiver"]) ? "Receiver" : includesAny(text, ["transmitter"]) ? "Transmitter" : includesAny(text, ["kit"]) ? "Extender kit" : "Endpoint",
      productType: "Signal extension endpoint",
      productSubType: includesAny(text, ["hdbaset 3", "hdbaset3"]) ? "HDBaseT 3.0" : "",
      systemRole: "Point-to-point extension",
      applicationRole: "Long-distance video, USB, control and network transport",
      transportClass: ["HDBaseT", isUsb && "USB", includesAny(text, ["fiber", "fibre"]) && "Fiber"].filter(Boolean),
      signalDomains: ["Video", isUsb && "USB", "Control", "Network"].filter(Boolean),
      subClassifications: ["extender", isUsb && "usb-kvm", includesAny(text, ["receiver"]) && "receiver", includesAny(text, ["transmitter"]) && "transmitter"].filter(Boolean),
      confidence: 0.92,
    });
  }

  if (/^SW-020/.test(sku) || includesAny(identityText, ["video wall processor", "videowall processor"])) {
    return make({
      primaryCategory: "Video Processing",
      category: "Video wall processor",
      subCategory: includesAny(text, ["6-output", "6 output"]) ? "Multi-output wall processor" : "Preset wall processor",
      productType: "Dedicated video wall processor",
      productSubType: includesAny(text, ["4k60"]) ? "4K60 processor" : "",
      systemRole: "Video wall layout processing",
      applicationRole: "Video wall, signage and multi-display processing",
      transportClass: ["HDMI"],
      signalDomains: ["Video", "Control"],
      subClassifications: ["video-wall", "processor"],
      confidence: 0.96,
    });
  }

  if (/^(SW-|SYN-KIT|EXP-SW-)/.test(sku) || includesAny(identityText, ["presentation switcher", "switcher"])) {
    const wireless = includesAny(text, ["wireless", "airplay", "miracast"]);
    const uc = includesAny(identityText, ["conference", "speakerphone", "byom", "camera"]);
    return make({
      primaryCategory: uc ? "Unified Communications" : "Presentation / Room Core",
      category: wireless ? "Wireless presentation switcher" : "Presentation switcher",
      subCategory: includesAny(text, ["in-wall", "in wall"]) ? "In-wall transmitter / switcher" : includesAny(text, ["hdbaset"]) ? "HDBaseT room switcher" : "Room switcher",
      productType: "Room source switcher",
      productSubType: includesAny(text, ["dual-view", "dual view", "mst"]) ? "Dual-display / MST capable" : "",
      systemRole: "Room presentation and source switching core",
      applicationRole: "Meeting room, classroom and BYOD presentation workflows",
      transportClass: ["HDMI", includesAny(text, ["usb-c"]) && "USB-C", includesAny(text, ["hdbaset"]) && "HDBaseT", wireless && "Wireless"].filter(Boolean),
      signalDomains: ["Video", "Audio", "Control", includesAny(text, ["usb"]) && "USB"].filter(Boolean),
      subClassifications: ["presentation-switcher", wireless && "wireless", uc && "uc", includesAny(text, ["hdbaset"]) && "hdbaset"].filter(Boolean),
      confidence: 0.9,
    });
  }

  if (/^SP-/.test(sku) || includesAny(identityText, ["splitter", "distribution amplifier"])) {
    return make({
      primaryCategory: "Distribution",
      category: "Splitter / distribution amplifier",
      subCategory: includesAny(text, ["scaling"]) ? "Scaling splitter" : "HDMI splitter",
      productType: "One-to-many distribution",
      productSubType: "",
      systemRole: "Signal distribution",
      applicationRole: "Duplicate one source to multiple displays",
      transportClass: ["HDMI"],
      signalDomains: ["Video", "Audio"],
      subClassifications: ["splitter", includesAny(text, ["scaling"]) && "scaling"].filter(Boolean),
      confidence: 0.93,
    });
  }

  if (/^(CAB-|CBL-|EXP-CAB-|EXP-8KUHD-|EXP-4KUHD-)/.test(sku)) {
    return make({
      primaryCategory: "Cable / Connectivity",
      category: includesAny(identityText, ["usb"]) ? "USB cable" : includesAny(identityText, ["displayport"]) ? "DisplayPort cable" : "HDMI cable",
      subCategory: includesAny(identityText, ["active optical", "aoc"]) ? "Active optical cable" : "Passive cable",
      productType: "Cable",
      productSubType: includesAny(identityText, ["plenum", "ft6"]) ? "Plenum rated" : includesAny(identityText, ["cpr", "cl3"]) ? "CPR / CL3 rated" : "",
      systemRole: "Physical connectivity",
      applicationRole: "Interconnect and installed cabling",
      transportClass: ["HDMI", "USB", "DisplayPort"].filter((item) => includesAny(identityText, [item])),
      signalDomains: ["Video", includesAny(identityText, ["usb"]) && "USB"].filter(Boolean),
      subClassifications: ["cable", includesAny(identityText, ["active optical", "aoc"]) && "active-optical"].filter(Boolean),
      confidence: 0.94,
    });
  }

  if (/^(SYN-|TS-)/.test(sku) || includesAny(identityText, ["touchscreen", "touchpad", "keypad", "control", "rs232", "relay"])) {
    return make({
      primaryCategory: "Control",
      category: "Control interface",
      subCategory: includesAny(text, ["touch"]) ? "Touch panel" : includesAny(text, ["keypad"]) ? "Keypad" : "Protocol bridge",
      productType: "Control device",
      productSubType: "",
      systemRole: "User or protocol control interface",
      applicationRole: "Room control and automation",
      transportClass: ["IP", "RS-232", "IR", "Relay"].filter((item) => includesAny(text, [item])),
      signalDomains: ["Control", "Network"],
      subClassifications: ["control", includesAny(text, ["touch"]) && "touch", includesAny(text, ["keypad"]) && "keypad"].filter(Boolean),
      confidence: 0.88,
    });
  }

  return make({
    primaryCategory: "Accessory / Other",
    category: "Accessory",
    subCategory: "Product-specific accessory",
    productType: "Accessory",
    productSubType: "",
    systemRole: "Supporting component",
    applicationRole: "Dependent on parent product",
    transportClass: [],
    signalDomains: [],
    subClassifications: ["accessory"],
    confidence: 0.62,
  });
}

function technologyTypeForClassification(classification) {
  if (classification.primaryCategory === "Unified Communications") return "Unified Comms";
  if (classification.primaryCategory === "Camera / Capture") return "Camera / Capture";
  if (classification.primaryCategory === "NetworkHD AV over IP") {
    return classification.category === "AVoIP infrastructure" || classification.subCategory === "Controller" ? "AVoIP Infrastructure" : "AVoIP";
  }
  if (classification.primaryCategory === "Audio") return "Audio / Control";
  if (classification.primaryCategory === "Control") return "Audio / Control";
  if (classification.primaryCategory === "Matrix / Routing") return "Matrix";
  if (classification.primaryCategory === "Extension") return "Extender / HDBaseT";
  if (classification.primaryCategory === "Video Processing") return "Video Wall / Multiview";
  if (classification.primaryCategory === "Distribution") return "Splitter / Distribution";
  if (classification.primaryCategory === "Presentation / Room Core") return "Presentation / Room Core";
  if (classification.primaryCategory === "Cable / Connectivity") return "Cable";
  return "Accessory";
}

function familyForTechnologyType(type) {
  if (type === "AVoIP" || type === "AVoIP Infrastructure") return "NetworkHD AVoIP";
  if (type === "Audio / Control") return "Audio / Control";
  if (type === "Camera / Capture") return "Camera / Capture";
  if (type === "Cable") return "Cable";
  if (type === "Extender / HDBaseT") return "Extender / HDBaseT";
  if (type === "Matrix") return "Matrix Switcher";
  if (type === "Presentation / Room Core") return "Presentation / Room Core";
  if (type === "Splitter / Distribution") return "Splitter / Distribution";
  if (type === "Unified Comms") return "Unified Comms";
  if (type === "Video Wall / Multiview") return "Video Processor";
  return "Accessory";
}

function featureEvidence(rule, lines, fallbackText) {
  const allLines = lines.map(clean).filter(Boolean);
  const term = rule.terms.find((candidate) => matchesTerm(fallbackText, candidate));
  if (!term) return null;

  const evidence = allLines.find((line) => matchesTerm(line, term)) || "";
  return {
    id: rule.id,
    label: rule.label,
    group: rule.group,
    evidence: evidence || term,
    confidence: evidence ? 0.94 : 0.72,
  };
}

function inferFeatures(text, lines) {
  return FEATURE_RULES
    .map((rule) => featureEvidence(rule, lines, text))
    .filter(Boolean)
    .sort((a, b) => {
      const groupDelta = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
      return groupDelta || a.label.localeCompare(b.label);
    });
}

function inferApplications(text, classification) {
  const applications = [];
  const add = (label, condition) => {
    if (condition) applications.push(label);
  };

  add("Meeting room", includesAny(text, ["meeting room", "conference room", "boardroom", "huddle"]));
  add("Classroom / lecture", includesAny(text, ["classroom", "lecture", "education", "university"]));
  add("BYOD presentation", includesAny(text, ["byod", "usb-c", "wireless presentation", "airplay", "miracast"]));
  add("BYOM / UC", includesAny(text, ["byom", "conference", "teams", "zoom", "speakerphone", "camera"]));
  add("AV over IP distribution", classification.primaryCategory === "NetworkHD AV over IP");
  add("Video wall", includesAny(text, ["video wall", "videowall"]));
  add("Control room", includesAny(text, ["control room", "command", "monitoring"]));
  add("Digital signage", includesAny(text, ["signage", "retail", "hospitality"]));
  add("Audio reinforcement", classification.primaryCategory === "Audio" || includesAny(text, ["amplifier", "speaker", "microphone"]));
  add("Point-to-point extension", classification.primaryCategory === "Extension");
  add("Installed cabling", classification.primaryCategory === "Cable / Connectivity");

  return unique([...applications, classification.applicationRole].filter(Boolean));
}

function extractMatches(text, regex, limit = 20) {
  const matches = [];
  for (const match of text.matchAll(regex)) {
    matches.push(clean(match[0]));
    if (matches.length >= limit) break;
  }
  return unique(matches);
}

function normaliseConnector(raw) {
  const text = clean(raw)
    .replace(/^\d+\s*x\s*/i, "")
    .replace(/\b(in|out|input|output)\b/gi, "")
    .replace(/[:|].*$/g, "")
    .replace(/\b\d+-pin\b/gi, "")
    .replace(/\btype\s*[ab c]\b/gi, "")
    .trim();

  if (/usb[\s-]?c|type-c/i.test(raw)) return "USB-C";
  if (/usb[\s-]?a/i.test(raw)) return "USB-A";
  if (/usb[\s-]?b/i.test(raw)) return "USB-B";
  if (/usb/i.test(raw)) return "USB";
  if (/hdbaset|hdbt/i.test(raw)) return "HDBaseT";
  if (/hdmi/i.test(raw)) return "HDMI";
  if (/displayport|\bdp\b/i.test(raw)) return "DisplayPort";
  if (/sdi/i.test(raw)) return "SDI";
  if (/dante|aes67/i.test(raw)) return "Dante / AES67";
  if (/rj45|lan|ethernet/i.test(raw)) return "RJ45 / Ethernet";
  if (/rs-?232/i.test(raw)) return "RS-232";
  if (/\bir\b/i.test(raw)) return "IR";
  if (/relay/i.test(raw)) return "Relay";
  if (/phoenix|analog audio|audio/i.test(raw)) return "Analog audio";
  if (/sfp|fiber|fibre|optical/i.test(raw)) return "SFP / fibre";

  return text || clean(raw);
}

function portCategory(connector, raw) {
  const text = lower(`${connector} ${raw}`);
  if (includesAny(text, ["usb"])) return "usb";
  if (includesAny(text, ["hdmi", "hdbaset", "displayport", "sdi", "vga", "sfp", "fiber", "fibre", "video"])) return "video";
  if (includesAny(text, ["audio", "dante", "aes67", "mic", "speaker", "phoenix"])) return "audio";
  if (includesAny(text, ["rj45", "ethernet", "lan", "network"])) return "network";
  if (includesAny(text, ["rs-232", "rs232", "ir", "cec", "relay", "control"])) return "control";
  return "other";
}

function extractPorts(lines) {
  const ports = [];
  let direction = "";
  let portHeading = "";
  let inBoxContents = false;

  for (const line of lines) {
    if (/^in the box$/i.test(line)) {
      inBoxContents = true;
      portHeading = "";
      continue;
    }
    if (inBoxContents) continue;

    if (/^inputs?$/i.test(line)) {
      direction = "input";
      continue;
    }
    if (/^outputs?$/i.test(line)) {
      direction = "output";
      continue;
    }

    if (/^(?:hdmi|network|lan|ethernet|rs-?232|ir|usb|audio)$/i.test(line)) {
      portHeading = line;
      continue;
    }

    const explicitDirection = /\b(in|input)\b/i.test(line) ? "input" : /\b(out|output)\b/i.test(line) ? "output" : direction;
    const compactPortMatches = [...line.matchAll(/\b(\d+)\s*x\s*([A-Za-z0-9+ ./_-]+?)(?=$|,|\||;|\()/gi)];

    for (const match of compactPortMatches) {
      const count = Number(match[1]);
      const rawConnector = clean(match[2]);
      if (!rawConnector || rawConnector.length > 80) continue;

      // The compact match prefix is always a substring of the line; prepending it
      // made normaliseConnector see doubled text for non-family connectors (e.g.
      // "1x EXP-MX-0402-H2 Matrix" became "EXP-MX-0402-H2 Matrix 1x EXP-MX-0402-H2
      // Matrix"). The line itself already carries the connector phrase.
      const contextualLine = portHeading ? `${portHeading} ${line}` : line;
      const connector = normaliseConnector(contextualLine);
      ports.push({
        count,
        connector,
        direction: explicitDirection || "unspecified",
        category: portCategory(connector, contextualLine),
        evidence: line,
      });
    }
  }

  return uniqueObjects(ports, (port) => `${port.count}:${port.connector}:${port.direction}:${port.evidence}`);
}

function groupedPorts(ports) {
  const byCategory = {
    video: [],
    audio: [],
    usb: [],
    network: [],
    control: [],
    other: [],
  };

  for (const port of ports) {
    byCategory[port.category]?.push(port);
  }

  return byCategory;
}

function inferUsbProfile(text, features) {
  const labels = new Set(features.filter((feature) => feature.group === "USB").map((feature) => feature.label));
  return {
    present: labels.size > 0 || includesAny(text, ["usb"]),
    versions: unique([
      ...extractMatches(text, /\bUSB\s*(?:2\.0|3\.0|3\.1|3\.2(?:\s*Gen\s*\d(?:x\d)?)?)\b/gi, 12),
      labels.has("USB 2.0") ? "USB 2.0" : "",
      labels.has("USB 3.x") ? "USB 3.x" : "",
    ]),
    connectors: unique(extractMatches(text, /\bUSB[-\s]?(?:A|B|C)\b/gi, 12)),
    roles: unique([
      includesAny(text, ["usb host"]) ? "USB host" : "",
      includesAny(text, ["usb device"]) ? "USB device" : "",
      includesAny(text, ["usb peripheral"]) ? "USB peripheral" : "",
      includesAny(text, ["kvm", "hid"]) ? "KVM / HID" : "",
      includesAny(text, ["displaylink"]) ? "DisplayLink" : "",
    ]),
    bandwidth: unique(extractMatches(text, /\b(?:5|10|20|40)\s*Gbps\b/gi, 8)),
    powerDelivery: includesAny(text, ["power delivery", "pd", "60w charging", "60w device charging", "usb-c charging"]),
  };
}

function inferAudioProfile(text, lines) {
  return {
    present: includesAny(text, ["audio", "dante", "aes67", "speaker", "microphone", "amplifier", "phoenix"]),
    formats: unique(extractMatches(text, /\b(?:PCM|Dolby [A-Za-z0-9 +.-]+|DTS[-A-Za-z0-9 +.]*)\b/gi, 12)),
    networkAudio: unique([
      includesAny(text, ["dante"]) ? "Dante" : "",
      includesAny(text, ["aes67"]) ? "AES67" : "",
    ]),
    amplifierPower: unique(lines.filter((line) => includesAny(line, ["watts", "w @", "70v", "100v", "4ohm", "4 ohm"]))),
    microphone: unique(lines.filter((line) => includesAny(line, ["microphone", "mic array", "pickup range", "aec", "agc", "ans"]))),
    speaker: unique(lines.filter((line) => includesAny(line, ["speaker", "watts", "db @"]))),
    processing: unique([
      includesAny(text, ["dsp"]) ? "DSP" : "",
      includesAny(text, ["aec"]) ? "AEC" : "",
      includesAny(text, ["agc"]) ? "AGC" : "",
      includesAny(text, ["ans"]) ? "ANS" : "",
      includesAny(text, ["eq"]) ? "EQ" : "",
      includesAny(text, ["delay"]) ? "Delay" : "",
      includesAny(text, ["mixing"]) ? "Mixing" : "",
    ]),
  };
}

function inferVideoProfile(text, lines) {
  return {
    present: includesAny(text, ["video", "hdmi", "hdbaset", "displayport", "4k", "8k", "1080p", "ndi", "sdi"]),
    maxResolutions: unique([
      ...extractMatches(text, /\b(?:8K|4K|3840x2160p?|4096x2160p?|1920x1080p?|1080p|720p)[^.;\n|]{0,45}(?:Hz|hz|4:4:4|4:2:0|HDR|bit)?/g, 20),
    ]),
    standards: unique([
      ...extractMatches(text, /\bHDMI\s*(?:1\.4|2\.0|2\.1)?\b/gi, 8),
      ...extractMatches(text, /\bHDCP\s*(?:1\.4|2\.2|2\.3)?\b/gi, 8),
      includesAny(text, ["displaylink"]) ? "DisplayLink" : "",
      includesAny(text, ["dolby vision"]) ? "Dolby Vision" : "",
      includesAny(text, ["hdr"]) ? "HDR" : "",
    ]),
    bandwidth: unique(extractMatches(text, /\b(?:10\.2|18|24|32|40|48)\s*Gbps\b/gi, 8)),
    distance: unique(extractMatches(text, /\b\d+(?:\.\d+)?\s*m(?:\/\d+\s*ft)?\b|\b\d+\s*ft\b/gi, 12)),
    processing: unique([
      includesAny(text, ["scaling", "scaler"]) ? "Scaling" : "",
      includesAny(text, ["multiview", "multi-view", "multi view"]) ? "Multiview" : "",
      includesAny(text, ["video wall", "videowall"]) ? "Video wall" : "",
      includesAny(text, ["seamless"]) ? "Seamless switching" : "",
      includesAny(text, ["edid"]) ? "EDID management" : "",
    ]),
    evidence: unique(lines.filter((line) => includesAny(line, ["resolution", "hdmi", "hdbaset", "hdcp", "pixel clock", "video"]))),
  };
}

function inferNetworkProfile(text, lines) {
  return {
    present: includesAny(text, ["network", "ethernet", "lan", "rj45", "ip", "poe", "sfp", "dante", "ndi"]),
    interfaces: unique(lines.filter((line) => includesAny(line, ["rj45", "lan", "ethernet", "sfp", "network"]))),
    protocols: unique([
      includesAny(text, ["networkhd"]) ? "NetworkHD" : "",
      includesAny(text, ["dante"]) ? "Dante" : "",
      includesAny(text, ["aes67"]) ? "AES67" : "",
      includesAny(text, ["ndi"]) ? "NDI" : "",
      includesAny(text, ["telnet"]) ? "Telnet" : "",
      includesAny(text, ["api"]) ? "API" : "",
    ]),
    linkSpeeds: unique(extractMatches(text, /\b(?:1G|2\.5G|10G|1000Base-T|10GbE|5Gbps|10Gbps)\b/gi, 10)),
    powerOverNetwork: unique([
      includesAny(text, ["poe"]) ? "PoE" : "",
      includesAny(text, ["poh"]) ? "PoH" : "",
      includesAny(text, ["poc"]) ? "PoC" : "",
    ]),
  };
}

function inferControlProfile(text, lines) {
  return {
    present: includesAny(text, ["control", "rs232", "rs-232", "ir", "cec", "relay", "telnet", "api", "edid"]),
    protocols: unique([
      includesAny(text, ["rs-232", "rs232"]) ? "RS-232" : "",
      includesAny(text, [" ir ", "ir passthrough", "infrared"]) ? "IR" : "",
      includesAny(text, ["cec"]) ? "CEC" : "",
      includesAny(text, ["telnet"]) ? "Telnet" : "",
      includesAny(text, ["api"]) ? "API" : "",
      includesAny(text, ["relay"]) ? "Relay" : "",
      includesAny(text, ["edid"]) ? "EDID" : "",
    ]),
    evidence: unique(lines.filter((line) => includesAny(line, ["control", "rs-232", "rs232", "ir", "cec", "telnet", "api", "relay", "edid"]))),
  };
}

function buildFeatureGroups(features) {
  const groups = {};
  for (const feature of features) {
    groups[feature.group] = groups[feature.group] || [];
    groups[feature.group].push(feature.label);
  }

  return Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, unique(values)]));
}

function buildSelectionGuidance(product, classification) {
  const sku = upper(product.sku || product.id || product.model);

  if (sku === "APO-210-UC") {
    return {
      recommendedWhen: [
        "A UC room needs speakerphone audio, microphone pickup, USB peripheral connection and presentation source switching.",
        "A camera or USB peripheral workflow is part of the requirement.",
        "Dual-display HDMI plus HDBaseT output is useful in a meeting room.",
      ],
      cautionWhen: [
        "Do not rank as a generic 2x2 video switcher when no UC audio, microphone, camera or BYOM requirement is present.",
        "It can pass video without a camera, but that is not its normal application unless the speakerphone/microphone function is the requirement.",
      ],
      betterAlternativesWhen: [
        "Use presentation switchers or matrix products for simple non-UC source/display routing.",
      ],
    };
  }

  if (classification.primaryCategory === "Unified Communications") {
    return {
      recommendedWhen: ["Camera, microphone, speakerphone, USB peripheral or conferencing workflows are part of the requirement."],
      cautionWhen: ["Avoid using UC endpoints as generic AV switchers unless the conferencing/audio role is also required."],
      betterAlternativesWhen: ["Use presentation switchers, extenders, matrix products or NetworkHD when the requirement is only video transport or routing."],
    };
  }

  if (classification.primaryCategory === "NetworkHD AV over IP") {
    return {
      recommendedWhen: ["Flexible, scalable or distributed source-to-display routing is required."],
      cautionWhen: ["Confirm network design, switch capacity, controller requirements and endpoint counts before proposal."],
      betterAlternativesWhen: ["Use HDBaseT or fixed matrix hardware for simpler point-to-point or fixed-I/O systems."],
    };
  }

  if (classification.primaryCategory === "Matrix / Routing") {
    return {
      recommendedWhen: ["A fixed number of sources and displays need predictable routed outputs."],
      cautionWhen: ["Confirm whether scaling, seamless switching, audio breakout or HDBaseT outputs are required."],
      betterAlternativesWhen: ["Use NetworkHD when future expansion or distributed routing is more important than fixed I/O simplicity."],
    };
  }

  return {
    recommendedWhen: [classification.applicationRole].filter(Boolean),
    cautionWhen: [],
    betterAlternativesWhen: [],
  };
}

function buildSalesLanguage(product, classification, profile) {
  const sku = upper(product.sku || product.id || product.model);
  const category = classification.primaryCategory;
  const featureGroups = profile?.featureGroups || {};
  const hasUsb = Array.isArray(featureGroups.USB) && featureGroups.USB.length > 0;
  const hasWireless = Array.isArray(featureGroups.Collaboration) && featureGroups.Collaboration.some((item) => includesAny(item, ["wireless"]));
  const hasHdbaset = Array.isArray(profile?.transports) && profile.transports.some((item) => includesAny(item, ["hdbaset"]));
  const hasAvoip = category === "NetworkHD AV over IP";
  const application = classification.applicationRole || "Use when the product matches the room workflow and signal path.";
  const technicalAnchor = classification.productType || classification.category || "WyreStorm product";

  const base = {
    voiceVersion: "wingman-sales-language-v1",
    headline: `${sku}: ${technicalAnchor}`,
    plainEnglishSummary: `${sku} helps the customer solve a defined AV problem in the room or system.`,
    customerValue: "Helps the salesperson explain the outcome before discussing ports and specifications.",
    realWorldApplication: application,
    salespersonCue: "Start with what the customer needs the system to do, then use the technical details as proof.",
    talkTrack: [],
    discoveryPrompts: [
      "What is the user trying to do when they walk into the room?",
      "Where are the sources, displays and user devices physically located?",
      "Does the customer need presentation, conferencing, recording, distribution, or a mix of those workflows?",
    ],
    positioningNotes: [],
    avoidPositioningAs: [],
    marketApplications: profile?.applications || [],
  };

  if (sku === "MX-0403-H3-MST" || sku === "MX-0403-MST") {
    return {
      ...base,
      headline: `${sku}: runs a dual-display collaboration room and creates a useful third feed`,
      plainEnglishSummary:
        "Use this when a room needs more than simple screen switching. It lets users connect laptops by USB-C or HDMI, show content across two room displays, handle USB for collaboration devices, and send an additional output to another destination.",
      customerValue:
        "It helps a meeting room behave like a complete collaboration space: local presentation, dual-screen working, USB device sharing, and an extra hand-off feed for the wider system.",
      realWorldApplication:
        "Best for boardrooms, teaching spaces and Teams-style rooms where the in-room displays are not the only destination for the content.",
      salespersonCue:
        "Position the third output as the room's hand-off point, not just another display output.",
      thirdOutputUseCase:
        "The third output is designed for a Microsoft Teams Rooms PC, a recording or lecture-capture device, or an AV-over-IP encoder when the room signal needs to leave the room and join a wider system.",
      talkTrack: [
        "It gives the room two main display outputs for local presentation, then keeps a third output available for capture, conferencing or distribution.",
        "The third output is useful when the customer wants the same room signal available to a Teams Rooms PC, recorder, streaming device or AVoIP encoder.",
        "This is a room-core product: it is about making the room easier to use, not just adding another switch in the rack.",
      ],
      discoveryPrompts: [
        "Will the third output feed a Microsoft Teams Rooms PC, a recording device, or an AVoIP encoder?",
        "Do the two room displays need independent content, mirrored content, or MST-style dual-screen behaviour?",
        "Where will the USB camera, microphone or speakerphone connect, and which laptop should control it?",
        "Does the room content need to be recorded, streamed, or distributed outside the room?",
      ],
      positioningNotes: [
        "Lead with the room workflow: laptop in, displays on, USB devices available, third feed out.",
        "Use when the customer needs a meeting-room core with USB-C, HDMI, USB and an HDBaseT output path.",
        "The third output can be a practical bridge from the local room into Teams, recording or NetworkHD/AVoIP distribution.",
      ],
      avoidPositioningAs: [
        "Do not describe it as only a 4x3 matrix. That undersells the room workflow.",
        "Do not use it as a generic distribution product when the real requirement is large-scale routing.",
      ],
      marketApplications: [
        "Microsoft Teams Rooms",
        "Boardroom dual-display presentation",
        "Lecture capture",
        "Training room recording",
        "Room-to-AVoIP hand-off",
        "Hybrid meeting rooms",
      ],
    };
  }

  if (category === "Presentation / Room Core") {
    return {
      ...base,
      headline: `${sku}: makes the room easier for presenters to use`,
      plainEnglishSummary:
        "Use this when people need to walk into a room, connect a laptop or room source, and get content onto the display without cable swapping or technical confusion.",
      customerValue:
        "It improves the day-to-day room experience by bringing source switching, display connection and often USB collaboration into one predictable room core.",
      realWorldApplication: "Meeting rooms, classrooms, training spaces and collaboration rooms where users need simple presentation from modern laptops.",
      salespersonCue: "Talk about the user journey: connect, present, share, hand off to the display or wider system.",
      talkTrack: [
        hasUsb ? "It can support the USB side of collaboration, so cameras, speakerphones or USB devices can be part of the room workflow." : "It focuses on getting presentation sources to the room display cleanly.",
        hasWireless ? "It also supports wireless sharing, which helps guests present without needing the right cable." : "It is strongest when the customer wants a reliable wired room experience.",
        hasHdbaset ? "HDBaseT output helps when the display or next device is away from the room core." : "Use it where the display path stays local or is handled by another transport product.",
      ],
      discoveryPrompts: [
        "How many laptops or room sources need to connect?",
        "Do users need USB devices such as a camera, speakerphone or touch display?",
        "Are there one, two or more displays in the room?",
        "Does the room need a feed for recording, Teams, Zoom, or AV-over-IP?",
      ],
      positioningNotes: [
        "Lead with user simplicity and room workflow.",
        "Use the port count and USB class as proof after the application is understood.",
      ],
      avoidPositioningAs: ["Do not sell it as a generic matrix unless the customer only cares about source-to-display routing."],
    };
  }

  if (category === "Unified Communications") {
    return {
      ...base,
      headline: `${sku}: improves the meeting experience for people in and outside the room`,
      plainEnglishSummary:
        "Use this when the room needs to support video meetings, shared audio, cameras, microphones or BYOM/BYOD collaboration.",
      customerValue:
        "It helps make the meeting feel joined-up: people can be seen, heard and shared with more reliably than using loose laptop accessories.",
      realWorldApplication: "Huddle rooms, boardrooms, classrooms and hybrid meeting spaces.",
      salespersonCue: "Ask what the remote participant needs to see and hear, then position the product around that experience.",
      talkTrack: [
        "It is about the meeting workflow, not only the hardware.",
        "It helps remove friction around camera, microphone, speaker and USB connectivity.",
        "It should be selected when conferencing is part of the use case.",
      ],
      discoveryPrompts: [
        "Which meeting platform is being used?",
        "Do users bring their own laptop, use a room PC, or both?",
        "What camera, microphone and speaker coverage does the room need?",
      ],
      positioningNotes: ["Use for UC-led rooms where audio, camera or USB device behaviour matters."],
      avoidPositioningAs: ["Do not lead with UC products for simple video switching if there is no conferencing requirement."],
    };
  }

  if (category === "Matrix / Routing") {
    return {
      ...base,
      headline: `${sku}: lets several sources feed several displays from one controlled system`,
      plainEnglishSummary:
        "Use this when the customer has a known number of sources and displays and wants reliable routing without building a full networked AV system.",
      customerValue:
        "It keeps switching predictable and commercially efficient for fixed rooms or smaller multi-display systems.",
      realWorldApplication: "Boardrooms, divisible rooms, education spaces, hospitality areas and fixed source-to-display systems.",
      salespersonCue: "Confirm the source and display count first. If those numbers are stable, a matrix may be the cleanest answer.",
      talkTrack: [
        "It avoids manual cable changes by routing sources to the right display.",
        "It is often a strong commercial option where the system is fixed and not expected to grow heavily.",
        "Scaling or seamless behaviour can help when displays and sources do not all match perfectly.",
      ],
      discoveryPrompts: [
        "How many sources need to be connected?",
        "How many displays need independent control?",
        "Are the display runs local HDMI, HDBaseT, or mixed?",
        "Is future expansion likely, or is this a fixed room?",
      ],
      positioningNotes: ["For smaller fixed systems, check matrix before jumping to AV-over-IP."],
      avoidPositioningAs: ["Do not position as fully flexible site-wide routing if the customer needs scalable distributed AV."],
    };
  }

  if (category === "Video Processing") {
    return {
      ...base,
      headline: `${sku}: turns multiple video signals or displays into a controlled visual layout`,
      plainEnglishSummary:
        "Use this when the customer needs more than basic switching, such as a video wall, multiview, scaling, source layout control or a more polished display presentation.",
      customerValue:
        "It helps create the visual result the customer actually wants on screen, rather than simply moving a signal from source to display.",
      realWorldApplication:
        "Video walls, monitoring screens, hospitality displays, retail feature walls, education spaces and room systems that need layout or scaling control.",
      salespersonCue:
        "Ask what the screens should look like in use: one big image, several sources, fixed presets, flexible layouts or simple source switching.",
      talkTrack: [
        "It is about shaping the final display layout, not only routing a source.",
        "It can be the cleaner answer when the requirement is a fixed visual wall or display-processing task rather than scalable building-wide AV.",
        "Check whether the customer needs a dedicated processor, matrix processing, or AV-over-IP video wall behaviour.",
      ],
      discoveryPrompts: [
        "What is the screen layout and how many displays are involved?",
        "Should the displays show one large image, separate sources, multiview, presets or mixed layouts?",
        "How many sources feed the processor and what resolution must the final display support?",
        "Does the customer need a fixed processor or future expansion through AV-over-IP?",
      ],
      positioningNotes: [
        "Use when the visible display behaviour is the main requirement.",
        "Compare dedicated processing against AV-over-IP when flexibility, endpoint count or future expansion matters.",
      ],
      avoidPositioningAs: [
        "Do not treat video processing as the same requirement as ordinary source switching.",
        "Do not assume AV-over-IP is automatically better for a simple fixed video wall.",
      ],
    };
  }

  if (hasAvoip) {
    return {
      ...base,
      headline: `${sku}: moves AV around the building using the network`,
      plainEnglishSummary:
        "Use this when sources and displays are spread out, the customer needs flexible routing, or the system may grow over time.",
      customerValue:
        "It turns AV into a more flexible system where content can be routed to different places without redesigning fixed cabling every time.",
      realWorldApplication: "Campuses, sports bars, casinos, command rooms, education buildings and large distributed AV systems.",
      salespersonCue: "Sell the flexibility and future-proofing, then validate the network design.",
      talkTrack: [
        "It is strongest when the system needs expansion, many endpoints, or routing across distance.",
        "It depends on the network, so switch selection and commissioning matter.",
        "It is not automatically the best option for every multi-display room.",
      ],
      discoveryPrompts: [
        "How many sources and displays are needed now and later?",
        "Is there a dedicated AV network or will one be provided?",
        "Does the customer need video wall, multiview, USB, Dante or control integration?",
      ],
      positioningNotes: ["Use for flexible and expandable systems, not simply because there are multiple screens."],
      avoidPositioningAs: ["Do not use AV-over-IP to overcomplicate a small fixed room when a matrix or HDBaseT solution fits better."],
    };
  }

  if (category === "Extension") {
    return {
      ...base,
      headline: `${sku}: gets the signal from one place to another without moving the equipment`,
      plainEnglishSummary:
        "Use this when the source, display, USB device or control point is too far away for a simple local cable.",
      customerValue:
        "It lets the room be built around where people and displays need to be, rather than where short cables happen to reach.",
      realWorldApplication: "Displays away from the rack, lecterns, teaching rooms, meeting rooms and point-to-point signal paths.",
      salespersonCue: "Start with distance and what has to travel: video only, video plus USB, audio, control or network.",
      talkTrack: [
        "It solves a distance problem.",
        hasUsb ? "If USB is included, it can support cameras, touch displays, keyboards, mice or conferencing peripherals." : "Use it when the video path needs reliable point-to-point extension.",
        "It is usually simpler than AV-over-IP when the path is one source to one display.",
      ],
      discoveryPrompts: [
        "How far is the source from the display or USB device?",
        "What signals need to travel over the same path?",
        "Is this a single fixed route or does it need to switch between many destinations?",
      ],
      positioningNotes: ["Best for defined point-to-point paths."],
      avoidPositioningAs: ["Do not use an extender as a routing system when many sources and many displays need flexible switching."],
    };
  }

  if (category === "Camera / Capture") {
    return {
      ...base,
      headline: `${sku}: helps remote viewers see the room clearly`,
      plainEnglishSummary:
        "Use this when the room, presenter, audience or content needs to be captured for meetings, teaching, streaming or recording.",
      customerValue:
        "It improves the quality of the image being sent to remote participants or recording systems.",
      realWorldApplication: "Meeting rooms, classrooms, lecture capture, training spaces and streaming workflows.",
      salespersonCue: "Ask what needs to be seen and where that video needs to go.",
      talkTrack: [
        "It is about image capture and the viewer experience.",
        "The right choice depends on room size, mounting position and output path.",
      ],
      discoveryPrompts: [
        "What needs to be captured: presenter, table, audience or whiteboard?",
        "Where will the camera be mounted?",
        "Does the signal go to USB, HDMI, NDI, recording or conferencing?",
      ],
      positioningNotes: ["Use when camera quality and capture path matter."],
      avoidPositioningAs: ["Do not treat camera products as generic video routing hardware."],
    };
  }

  if (category === "Audio") {
    return {
      ...base,
      headline: `${sku}: makes the room audio work as part of the AV system`,
      plainEnglishSummary:
        "Use this when the customer needs reliable sound through installed speakers or needs audio tied into the wider AV workflow.",
      customerValue:
        "It helps the room sound clear and controlled, which matters as much as the image in meetings and teaching spaces.",
      realWorldApplication: "Meeting rooms, classrooms, lecture spaces and AV racks with installed speakers or network audio.",
      salespersonCue: "Ask where the sound comes from, where it needs to be heard, and how it is controlled.",
      talkTrack: [
        "It supports the audio outcome, not the video switching outcome.",
        "Dante or DSP details are proof points after the room audio requirement is clear.",
      ],
      discoveryPrompts: [
        "How many speakers are in the room?",
        "Is audio local, networked, or part of a DSP system?",
        "Does the room need speech reinforcement, program audio or both?",
      ],
      positioningNotes: ["Lead with audibility, control and integration."],
      avoidPositioningAs: ["Do not shortlist audio products for video routing requirements."],
    };
  }

  if (category === "Control") {
    return {
      ...base,
      headline: `${sku}: gives users a simpler way to run the room`,
      plainEnglishSummary:
        "Use this when the customer needs buttons, touch control, protocol conversion or a cleaner way to trigger room behaviour.",
      customerValue:
        "It helps hide technical complexity from everyday users.",
      realWorldApplication: "Meeting rooms, classrooms, AV racks and controlled presentation spaces.",
      salespersonCue: "Talk about the action the user wants, not the protocol.",
      talkTrack: [
        "It turns technical commands into practical room actions.",
        "It should be tied to a clear user workflow or control requirement.",
      ],
      discoveryPrompts: [
        "Who controls the room?",
        "What actions should be one-touch?",
        "Which devices need control: display, switcher, source, lift, lighting or audio?",
      ],
      positioningNotes: ["Use when control simplicity or integration is part of the requirement."],
      avoidPositioningAs: ["Do not add control hardware unless there is a clear control task."],
    };
  }

  if (category === "Distribution") {
    return {
      ...base,
      headline: `${sku}: sends one source to multiple displays`,
      plainEnglishSummary:
        "Use this when the same content needs to appear on more than one screen without independent routing.",
      customerValue: "It is a simple and cost-effective way to duplicate a source.",
      realWorldApplication: "Signage, overflow displays, simple hospitality screens and duplicate monitor feeds.",
      salespersonCue: "Confirm whether all screens show the same thing. If yes, a splitter may be enough.",
      talkTrack: [
        "It duplicates a signal rather than creating a flexible routing system.",
        "It is useful when the requirement is simple and fixed.",
      ],
      discoveryPrompts: [
        "Do all displays show the same source?",
        "How many outputs are required?",
        "Do any displays need scaling or different resolution handling?",
      ],
      positioningNotes: ["Use for same-source distribution."],
      avoidPositioningAs: ["Do not use a splitter when displays need independent source selection."],
    };
  }

  if (category === "Cable / Connectivity" || category === "Accessory / Other") {
    return {
      ...base,
      headline: `${sku}: supports the main system`,
      plainEnglishSummary:
        "Use this as a supporting item when the main design needs the right cable, adapter, mount, hub or accessory to make the workflow complete.",
      customerValue:
        "It helps avoid small missing pieces that stop a good system from working properly on site.",
      realWorldApplication: "Project accessories, room connectivity and installation support.",
      salespersonCue: "Attach it to a main workflow rather than selling it as the lead product.",
      talkTrack: [
        "This is a dependency or convenience item.",
        "It should be included when it completes the installation or user connection path.",
      ],
      discoveryPrompts: [
        "Which main product or room workflow depends on this item?",
        "Where will it be installed or used?",
        "Is this required for installation, user connection, serviceability or spare stock?",
      ],
      positioningNotes: ["Use as a supporting line item in the BOM."],
      avoidPositioningAs: ["Do not present accessories as the main solution unless the customer explicitly asks for that part."],
    };
  }

  return base;
}

function addVoiceSetToSalesLanguage(language, product, classification, profile) {
  const sku = upper(product.sku || product.id || product.model);
  const category = classification.primaryCategory || "WyreStorm product";
  const transports = Array.isArray(profile?.transports) ? profile.transports.slice(0, 4) : [];
  const baseTalkTrack = Array.isArray(language.talkTrack) ? language.talkTrack : [];
  const basePrompts = Array.isArray(language.discoveryPrompts) ? language.discoveryPrompts : [];
  const basePositioning = Array.isArray(language.positioningNotes) ? language.positioningNotes : [];
  const baseAvoid = Array.isArray(language.avoidPositioningAs) ? language.avoidPositioningAs : [];
  const transportNote = transports.length
    ? `Check the practical signal path around ${transports.join(", ")} before finalising the design.`
    : "Check the practical signal path before finalising the design.";

  const installerPitchByCategory = {
    "Presentation / Room Core":
      "Use this view when the installer needs to understand where the room core sits, which user connections land at the table or wall, and what leaves the room toward displays, USB devices or downstream systems.",
    "Unified Communications":
      "Use this view when the installer needs to validate the camera, microphone, speaker, USB and meeting-platform path before the room is quoted or commissioned.",
    "Matrix / Routing":
      "Use this view when the installer needs a clear source-to-display count, cable path, rack location and control method for a fixed routing system.",
    "Video Processing":
      "Use this view when the installer needs to confirm the screen layout, source count, output mapping, resolution handling, presets and how the processor is controlled.",
    "NetworkHD AV over IP":
      "Use this view when the installer needs to confirm endpoint count, switch requirements, VLAN or dedicated AV network design, controller placement and commissioning responsibility.",
    Extension:
      "Use this view when the installer needs to prove the point-to-point route, cable distance, signal direction, power method and USB behaviour if USB is involved.",
    "Camera / Capture":
      "Use this view when the installer needs to confirm camera position, field of view, mounting, USB/HDMI/NDI path and how the signal reaches conferencing or recording.",
    Audio:
      "Use this view when the installer needs to confirm speaker load, audio source, DSP or Dante path, rack position and how users control volume or source selection.",
    Control:
      "Use this view when the installer needs to confirm what each button, touch action or control command actually triggers in the room.",
    Distribution:
      "Use this view when the installer needs to confirm one-source-to-many-display behaviour, cable distance, display compatibility and whether scaling is required.",
  };

  const consultantPitchByCategory = {
    "Presentation / Room Core":
      "Use this view to decide whether the product is the right room-core architecture or whether the room should move toward a simpler switcher, matrix, extender or AV-over-IP design.",
    "Unified Communications":
      "Use this view to test whether conferencing is genuinely part of the requirement. If the room does not need camera, microphone, speakerphone or USB collaboration, there may be cleaner product paths.",
    "Matrix / Routing":
      "Use this view to compare fixed-I/O matrix switching against AV-over-IP, especially where source and display counts are stable and expansion is not the main driver.",
    "Video Processing":
      "Use this view to decide whether the requirement is best solved by a dedicated processor, matrix processing or AV-over-IP video wall design.",
    "NetworkHD AV over IP":
      "Use this view to validate why AV-over-IP is justified: flexibility, expansion, distributed locations, multiview, video wall, USB, Dante or control integration.",
    Extension:
      "Use this view to decide whether the project is simply a defined distance problem or whether routing, switching or networked AV is actually required.",
    "Camera / Capture":
      "Use this view to validate the capture objective, camera coverage, output format and whether the wider system can receive the chosen signal.",
    Audio:
      "Use this view to keep audio design tied to the room outcome: intelligibility, program sound, conferencing, installed speakers or network audio.",
    Control:
      "Use this view to decide whether the control requirement is real, what user actions matter, and whether this product simplifies or complicates the room.",
    Distribution:
      "Use this view to confirm whether the customer only needs duplicated content. If displays need independent source choice, move away from distribution.",
  };

  const thirdOutputNotes = language.thirdOutputUseCase ? [language.thirdOutputUseCase] : [];

  return {
    ...language,
    voices: {
      endUser: {
        label: "End user",
        audience: "Customer stakeholder",
        headline: language.headline,
        pitch: language.plainEnglishSummary,
        value: language.customerValue,
        talkTrack: unique([
          language.salespersonCue,
          language.realWorldApplication,
          ...baseTalkTrack,
          ...thirdOutputNotes,
        ]).slice(0, 4),
        discoveryPrompts: unique([
          "What do users need to do when they walk into the room?",
          "What would make the room feel easier or more reliable for everyday use?",
          ...basePrompts,
        ]).slice(0, 4),
        positioningNotes: unique([
          "Keep the language about outcomes and the user experience before talking about ports.",
          ...basePositioning,
        ]).slice(0, 4),
        avoidPositioningAs: baseAvoid,
      },
      systemIntegrator: {
        label: "SI / installer",
        audience: "Installer or system integrator",
        headline: `${sku}: deployment and commissioning view`,
        pitch:
          installerPitchByCategory[category] ||
          `Use this view when the installer needs to understand exactly where ${sku} sits in the signal path and what it depends on.`,
        value:
          "Turns the sales conversation into practical install checks: location, cabling, signal direction, dependencies, control and commissioning risk.",
        talkTrack: unique([
          transportNote,
          "Confirm what connects locally, what leaves the room, and which accessories or endpoints are required.",
          "Check USB class, power method, control path and firmware notes before treating the product as a like-for-like substitute.",
          ...thirdOutputNotes,
        ]).slice(0, 4),
        discoveryPrompts: unique([
          "Where will the product physically live: table, wall, display, rack, lectern or network closet?",
          "What cable type, distance and route are available between each endpoint?",
          "Which products, receivers, USB devices, controllers or network switches must be present for this to work?",
          ...basePrompts,
        ]).slice(0, 5),
        positioningNotes: unique([
          "Good installer language should make dependencies visible before a quote is issued.",
          "Call out install risk early when the product depends on USB bandwidth, network design, endpoint pairing or control integration.",
          ...basePositioning,
        ]).slice(0, 5),
        avoidPositioningAs: unique([
          "Do not imply it is plug-and-play where cable distance, USB class, endpoint compatibility, network design or control programming still needs validation.",
          ...baseAvoid,
        ]).slice(0, 4),
      },
      consultant: {
        label: "Consultant / technical",
        audience: "Consultant or technical designer",
        headline: `${sku}: architecture fit and trade-off view`,
        pitch:
          consultantPitchByCategory[category] ||
          `Use this view to test whether ${sku} is the right architectural answer for the room or system rather than only a specification match.`,
        value:
          "Helps separate a technically possible product choice from the strongest design choice for the application, budget, risk and future expansion.",
        talkTrack: unique([
          "Validate the application first, then decide whether this product family is the cleanest architecture.",
          "Compare against simpler or more scalable alternatives where the requirement is fixed, expandable, distance-led or conferencing-led.",
          "Use the specification as evidence after the room workflow and signal architecture are clear.",
          ...thirdOutputNotes,
        ]).slice(0, 4),
        discoveryPrompts: unique([
          "Is this requirement driven by user experience, source/display routing, distance, USB, collaboration, network distribution, processing or control?",
          "What would make this product the wrong choice even if it technically works?",
          "Is the system expected to grow, change rooms, add endpoints, record, stream or integrate with a wider AV platform?",
          ...basePrompts,
        ]).slice(0, 5),
        positioningNotes: unique([
          "Use for architectural judgement, product-family selection and proposal-safe trade-off language.",
          "Be explicit when the product is technically possible but unlikely to be the most natural choice.",
          ...basePositioning,
        ]).slice(0, 5),
        avoidPositioningAs: unique([
          "Do not let a feature match override the real application, architecture or operational requirement.",
          ...baseAvoid,
        ]).slice(0, 4),
      },
    },
  };
}

function buildTechnicalProfile(product, classification, pageFacts) {
  const lines = unique([
    ...(Array.isArray(pageFacts.technicalLines) ? pageFacts.technicalLines : []),
    ...(Array.isArray(pageFacts.featureEvidenceLines) ? pageFacts.featureEvidenceLines : []),
  ]);
  const text = buildTextBlob(product, pageFacts);
  const features = inferFeatures(text, lines);
  const ports = extractPorts(lines);
  const portGroups = groupedPorts(ports);
  const applications = inferApplications(text, classification);
  const profileSeed = {
    featureGroups: buildFeatureGroups(features),
    transports: unique([...classification.transportClass, ...features.map((feature) => feature.label).filter((label) => includesAny(label, ["HDMI", "HDBaseT", "USB", "Dante", "NDI", "NetworkHD", "Wireless", "DisplayPort"]))]),
    applications,
  };
  const salesLanguage = addVoiceSetToSalesLanguage(
    buildSalesLanguage(product, classification, profileSeed),
    product,
    classification,
    profileSeed,
  );

  return {
    profileVersion: PROFILE_VERSION,
    sourceQuality: {
      officialProductUrl: pageFacts.url || getProductUrl(product),
      officialPageStatus: pageFacts.status || "not-fetched",
      livePageUsed: Number(pageFacts.status) >= 200 && Number(pageFacts.status) < 300,
      capturedTechnicalLineCount: Array.isArray(pageFacts.technicalLines) ? pageFacts.technicalLines.length : 0,
    },
    signalDomains: unique([...classification.signalDomains, ...features.map((feature) => feature.group)]),
    transports: profileSeed.transports,
    io: {
      ports,
      video: portGroups.video,
      audio: portGroups.audio,
      usb: portGroups.usb,
      network: portGroups.network,
      control: portGroups.control,
      other: portGroups.other,
    },
    video: inferVideoProfile(text, lines),
    audio: inferAudioProfile(text, lines),
    usb: inferUsbProfile(text, features),
    network: inferNetworkProfile(text, lines),
    control: inferControlProfile(text, lines),
    processing: unique(features.filter((feature) => feature.group === "Processing").map((feature) => feature.label)),
    power: {
      poe: features.some((feature) => feature.id === "poe"),
      powerDelivery: features.some((feature) => feature.id === "usb-pd"),
      evidence: unique(lines.filter((line) => includesAny(line, ["power", "poe", "poh", "poc", "consumption", "dc", "watts"]))),
    },
    mechanical: {
      installation: unique(features.filter((feature) => feature.group === "Mechanical").map((feature) => feature.label)),
      evidence: unique(lines.filter((line) => includesAny(line, ["rack", "wall", "mount", "plenum", "cpr", "cl3", "ft6"]))),
    },
    featureGroups: profileSeed.featureGroups,
    features,
    applications,
    selectionGuidance: buildSelectionGuidance(product, classification),
    salesLanguage,
    evidence: {
      technicalLines: (pageFacts.technicalLines || []).slice(0, 80),
      featureLines: (pageFacts.featureEvidenceLines || []).slice(0, 40),
    },
  };
}

function enrichProduct(product, pageFacts) {
  const text = buildTextBlob(product, pageFacts);
  const productClassification = baseClassification(product, text);
  const technicalProfile = buildTechnicalProfile(product, productClassification, pageFacts);
  const salesLanguage = technicalProfile.salesLanguage;
  const technologyType = technologyTypeForClassification(productClassification);
  const featureLabels = technicalProfile.features.map((feature) => feature.label);

  return {
    ...product,
    family: familyForTechnologyType(technologyType),
    role: ROLE_LABELS[productClassification.productRole] || product.role || "Primary hardware",
    productRole: productClassification.productRole,
    catalogVisibility: productClassification.catalogVisibility,
    technologyType,
    hardwareType: technologyType,
    productClassification,
    classificationPath: productClassification.classificationPath,
    subClassifications: productClassification.subClassifications,
    technicalProfile,
    salesLanguage,
    features: addUnique(product.features, [technologyType, ...productClassification.classificationPath, ...featureLabels]),
    featureTags: addUnique(product.featureTags, [technologyType, ...productClassification.subClassifications, ...featureLabels]),
    tags: addUnique(product.tags, [technologyType, ...productClassification.classificationPath, ...productClassification.subClassifications, ...featureLabels, ...technicalProfile.applications]),
    capabilities: addUnique(product.capabilities, [...featureLabels, ...technicalProfile.transports, ...technicalProfile.processing]),
    searchTerms: addUnique(product.searchTerms, [
      product.sku,
      product.name,
      product.title,
      productClassification.primaryCategory,
      productClassification.category,
      productClassification.subCategory,
      productClassification.productType,
      productClassification.productSubType,
      productClassification.systemRole,
      ...productClassification.subClassifications,
      ...featureLabels,
      ...technicalProfile.applications,
      ...collectTextValues(salesLanguage),
    ]),
    roleCorrectionSource: `product-manager-profile:${PROFILE_VERSION}`,
  };
}

function mergeProfileIntoFinderRecord(record, sourceProduct) {
  const profile = sourceProduct.technicalProfile;
  const classification = sourceProduct.productClassification;
  const salesLanguage = sourceProduct.salesLanguage || profile.salesLanguage;
  const featureLabels = profile.features.map((feature) => feature.label);
  const connectorLabels = profile.io.ports.map((port) => port.connector);

  return {
    ...record,
    family: familyForTechnologyType(sourceProduct.technologyType),
    category: record.category || classification.primaryCategory,
    technologies: addUnique(record.technologies, [sourceProduct.technologyType, ...profile.transports, ...classification.signalDomains]),
    connectors: addUnique(record.connectors, connectorLabels),
    features: addUnique(record.features, [sourceProduct.technologyType, ...classification.classificationPath, ...featureLabels]),
    applications: addUnique(record.applications, profile.applications),
    tags: addUnique(record.tags, [
      sourceProduct.technologyType,
      ...classification.classificationPath,
      ...classification.subClassifications,
      ...featureLabels,
      ...connectorLabels,
      ...profile.applications,
    ]),
    productRole: classification.productRole,
    catalogVisibility: classification.catalogVisibility,
    technologyType: sourceProduct.technologyType,
    hardwareType: sourceProduct.hardwareType,
    productClassification: classification,
    classificationPath: classification.classificationPath,
    subClassifications: classification.subClassifications,
    technicalProfile: profile,
    salesLanguage,
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

function buildSummary(products, finderRecords, fetchResults) {
  const countBy = (items, selector) => {
    const output = {};
    for (const item of items) {
      const key = selector(item) || "Unknown";
      output[key] = (output[key] || 0) + 1;
    }
    return Object.fromEntries(Object.entries(output).sort((a, b) => a[0].localeCompare(b[0])));
  };

  const profileCoverage = products.map((product) => ({
    sku: product.sku,
    primaryCategory: product.productClassification?.primaryCategory,
    category: product.productClassification?.category,
    subCategory: product.productClassification?.subCategory,
    featureCount: product.technicalProfile?.features?.length || 0,
    portCount: product.technicalProfile?.io?.ports?.length || 0,
    officialPageStatus: product.technicalProfile?.sourceQuality?.officialPageStatus,
  }));

  return {
    generatedAt: new Date().toISOString(),
    profileVersion: PROFILE_VERSION,
    offlineMode: OFFLINE_MODE,
    sourceProductCount: products.length,
    finderRecordCount: finderRecords.length,
    categorySummary: countBy(products, (product) => product.productClassification?.primaryCategory),
    subCategorySummary: countBy(products, (product) => product.productClassification?.category),
    technologyTypeSummary: countBy(products, (product) => product.technologyType),
    finderCoverage: {
      withTechnicalProfile: finderRecords.filter((record) => record.technicalProfile).length,
      withClassification: finderRecords.filter((record) => record.productClassification).length,
      withSalesLanguage: finderRecords.filter((record) => record.salesLanguage).length,
      withSalesVoices: finderRecords.filter((record) =>
        record.salesLanguage?.voices?.endUser &&
        record.salesLanguage?.voices?.systemIntegrator &&
        record.salesLanguage?.voices?.consultant
      ).length,
    },
    officialPageFetchSummary: countBy(fetchResults, (result) => String(result.status)),
    lowCoverageSkus: profileCoverage
      .filter((row) => row.featureCount < 2 && row.portCount === 0)
      .slice(0, 50),
  };
}

async function main() {
  const sourceProducts = JSON.parse(await fs.readFile(wyrestormSourcePath, "utf8"));
  const finderRecords = sourceProducts;

  console.log(`[wyrestorm-enrich] Profiling ${sourceProducts.length} WyreStorm source products${OFFLINE_MODE ? " in offline mode" : " with live official pages"}.`);

  const sourcePageFacts = await mapLimit(sourceProducts, 5, async (product, index) => {
    if ((index + 1) % 25 === 0 || index === sourceProducts.length - 1) {
      console.log(`[wyrestorm-enrich] Source page pass ${index + 1}/${sourceProducts.length}`);
    }
    return fetchOfficialPage(product);
  });

  const enrichedSourceProducts = sourceProducts.map((product, index) => enrichProduct(product, sourcePageFacts[index]));
  const enrichedBySkuKey = new Map(enrichedSourceProducts.map((product) => [normaliseSkuKey(product.sku), product]));

  const enrichedFinderRecords = await mapLimit(finderRecords, 5, async (record) => {
    const exactMatch = enrichedBySkuKey.get(normaliseSkuKey(record.sku));
    if (exactMatch) return mergeProfileIntoFinderRecord(record, exactMatch);

    const pageFacts = await fetchOfficialPage(record);
    const enrichedRecordAsProduct = enrichProduct(
      {
        ...record,
        id: record.sku,
        title: record.title || record.name,
        vendorType: record.vendorType || "wyrestorm",
        brand: record.brand || "WyreStorm",
      },
      pageFacts
    );

    return mergeProfileIntoFinderRecord(record, enrichedRecordAsProduct);
  });

  const summary = buildSummary(enrichedSourceProducts, enrichedFinderRecords, [
    ...sourcePageFacts,
    ...enrichedFinderRecords.map((record) => ({
      status: record.technicalProfile?.sourceQuality?.officialPageStatus || "matched-source",
    })),
  ]);

  await fs.writeFile(wyrestormSourcePath, JSON.stringify(enrichedSourceProducts, null, 2) + "\n", "utf8");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log(`[wyrestorm-enrich] Wrote ${path.relative(projectRoot, wyrestormSourcePath)}`);
  await fs.writeFile(
    statusPath,
    JSON.stringify(
      {
        generatedAt: summary.generatedAt,
        profileVersion: summary.profileVersion,
        offlineMode: summary.offlineMode,
        sourceProductCount: summary.sourceProductCount,
        officialPageFetchSummary: summary.officialPageFetchSummary,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`[wyrestorm-enrich] Wrote ${path.relative(projectRoot, reportPath)}`);
  console.log(`[wyrestorm-enrich] Wrote ${path.relative(projectRoot, statusPath)}`);
  console.log("[wyrestorm-enrich] Run npm run data:sources:build to publish the updated source package.");
  console.log("[wyrestorm-enrich] Category summary:");
  console.log(JSON.stringify(summary.categorySummary, null, 2));
}

main().catch((error) => {
  console.error("[wyrestorm-enrich] Failed.");
  console.error(error);
  process.exitCode = 1;
});
