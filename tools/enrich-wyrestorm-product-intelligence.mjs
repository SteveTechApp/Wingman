import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const wyrestormSourcePath = path.join(projectRoot, "data", "wyrestorm-product-intelligence.json");
const finderDbPath = path.join(projectRoot, "data", "product-intelligence-db.json");
const reportPath = path.join(projectRoot, "reports", "wingman-product-technical-profile-summary.json");

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

function includesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
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

  if (/^CAM-/.test(sku) || /^FOCUS/.test(sku) || includesAny(identityText, ["ptz camera", "camera bridge", "ndi camera", "webcam"])) {
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

  if (/^NHD-/.test(sku)) {
    const series = sku.includes("600") || includesAny(text, ["networkhd 600", "10g"]) ? "NetworkHD 600" : sku.includes("500") || includesAny(text, ["networkhd 500"]) ? "NetworkHD 500" : "NetworkHD 100";
    const endpointRole = includesAny(identityText, ["controller", "touchscreen"]) ? "Controller" : includesAny(identityText, ["multiview"]) ? "Multiview processor" : includesAny(identityText, ["decoder", "receiver"]) ? "Decoder" : includesAny(identityText, ["encoder", "transmitter"]) ? "Encoder" : includesAny(identityText, ["transceiver"]) ? "Transceiver" : "AVoIP endpoint";

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
  const term = rule.terms.find((candidate) => lower(fallbackText).includes(lower(candidate)));
  if (!term) return null;

  const evidence = allLines.find((line) => lower(line).includes(lower(term))) || "";
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

  for (const line of lines) {
    if (/^inputs?$/i.test(line)) {
      direction = "input";
      continue;
    }
    if (/^outputs?$/i.test(line)) {
      direction = "output";
      continue;
    }

    const explicitDirection = /\b(in|input)\b/i.test(line) ? "input" : /\b(out|output)\b/i.test(line) ? "output" : direction;
    const compactPortMatches = [...line.matchAll(/\b(\d+)\s*x\s*([A-Za-z0-9+ ./_-]+?)(?=$|,|\||;|\()/gi)];

    for (const match of compactPortMatches) {
      const count = Number(match[1]);
      const rawConnector = clean(match[2]);
      if (!rawConnector || rawConnector.length > 80) continue;

      const connector = normaliseConnector(`${match[0]} ${line}`);
      ports.push({
        count,
        connector,
        direction: explicitDirection || "unspecified",
        category: portCategory(connector, line),
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

  return {
    profileVersion: PROFILE_VERSION,
    sourceQuality: {
      officialProductUrl: pageFacts.url || getProductUrl(product),
      officialPageStatus: pageFacts.status || "not-fetched",
      livePageUsed: Number(pageFacts.status) >= 200 && Number(pageFacts.status) < 300,
      capturedTechnicalLineCount: Array.isArray(pageFacts.technicalLines) ? pageFacts.technicalLines.length : 0,
    },
    signalDomains: unique([...classification.signalDomains, ...features.map((feature) => feature.group)]),
    transports: unique([...classification.transportClass, ...features.map((feature) => feature.label).filter((label) => includesAny(label, ["HDMI", "HDBaseT", "USB", "Dante", "NDI", "NetworkHD", "Wireless", "DisplayPort"]))]),
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
    featureGroups: buildFeatureGroups(features),
    features,
    applications,
    selectionGuidance: buildSelectionGuidance(product, classification),
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
    ]),
    roleCorrectionSource: `product-manager-profile:${PROFILE_VERSION}`,
  };
}

function mergeProfileIntoFinderRecord(record, sourceProduct) {
  const profile = sourceProduct.technicalProfile;
  const classification = sourceProduct.productClassification;
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
    },
    officialPageFetchSummary: countBy(fetchResults, (result) => String(result.status)),
    lowCoverageSkus: profileCoverage
      .filter((row) => row.featureCount < 2 && row.portCount === 0)
      .slice(0, 50),
  };
}

async function main() {
  const sourceProducts = JSON.parse(await fs.readFile(wyrestormSourcePath, "utf8"));
  const finderDb = JSON.parse(await fs.readFile(finderDbPath, "utf8"));
  const finderRecords = Array.isArray(finderDb.records) ? finderDb.records : [];

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

  finderDb.records = enrichedFinderRecords;
  finderDb.meta = {
    ...(finderDb.meta || {}),
    technicalProfileVersion: PROFILE_VERSION,
    technicalProfileUpdatedAt: summary.generatedAt,
    technicalProfileNote: "Product-manager classification and technical profile generated from WyreStorm source records and official product pages when available.",
  };

  await fs.writeFile(wyrestormSourcePath, JSON.stringify(enrichedSourceProducts, null, 2) + "\n", "utf8");
  await fs.writeFile(finderDbPath, JSON.stringify(finderDb, null, 2) + "\n", "utf8");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log(`[wyrestorm-enrich] Wrote ${path.relative(projectRoot, wyrestormSourcePath)}`);
  console.log(`[wyrestorm-enrich] Wrote ${path.relative(projectRoot, finderDbPath)}`);
  console.log(`[wyrestorm-enrich] Wrote ${path.relative(projectRoot, reportPath)}`);
  console.log("[wyrestorm-enrich] Category summary:");
  console.log(JSON.stringify(summary.categorySummary, null, 2));
}

main().catch((error) => {
  console.error("[wyrestorm-enrich] Failed.");
  console.error(error);
  process.exitCode = 1;
});
