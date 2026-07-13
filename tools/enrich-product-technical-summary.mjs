// Backfills and cleans structured technical detail on top of the existing
// WyreStorm enrichment source (data-sources/wyrestorm/enrichment.json).
//
// This does NOT fetch anything new from the network. It only re-derives
// structured fields from text that is already present and already sourced
// in this file (technicalProfile.features, technicalProfile.io.ports,
// name/description/summary), so every value produced here is traceable back
// to real, previously-captured evidence - nothing is invented.
//
// What it fixes (see reports/wingman-product-technical-spec-completeness-audit.json
// for the audit this was built from):
//   1. 11 products (mostly newer SKUs added via the Product Guide PDF import)
//      are missing the richer technicalProfile.video/audio/usb/network/control
//      sub-profiles that the other ~299 products already have. This backfills
//      them using the same inference approach as the live enrichment tool.
//   2. ~23% of technicalProfile.io.ports rows are not physical I/O at all -
//      they are included accessories (mounting brackets, power supplies,
//      quickstart guides, terminal blocks, cable ties) that were swept up by
//      the original port-line parser. These are moved to a separate
//      `io.accessories` list so port/I-O counts used for comparison are not
//      inflated by an in-box screwdriver kit.
//   3. video.maxResolutions frequently contains duplicated/truncated garbage
//      (e.g. repeated marketing copy fragments). This dedupes and filters it.
//   4. Adds a dedicated technicalProfile.hdbaset field (present/version/
//      distance) so HDBaseT class and reach can be queried directly instead
//      of being buried inside generic video.standards/video.distance text.
//   5. Populates the previously always-empty sourceCatalog quick-glance
//      summary strings (inputs/outputs/resolutionBandwidth/usb/audio/control/
//      networkRequirement) by summarising the structured profile - these are
//      the fields the original products.csv columns for this were meant to
//      hold, but were never filled in.
//
// Run with: node tools/enrich-product-technical-summary.mjs
// Then rebuild the downstream catalogues with:
//   npm run data:sources:build && npm run data:product-intelligence-index

import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const enrichmentPath = path.join(root, "data-sources/wyrestorm/enrichment.json");
const reportPath = path.join(root, "reports/wingman-product-technical-summary-enrichment.json");

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}
function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values.flat().map(clean).filter(Boolean)) {
    const key = lower(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
function includesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}
function extractMatches(text, regex, limit = 20) {
  const matches = [];
  for (const match of text.matchAll(regex)) {
    matches.push(clean(match[0]));
    if (matches.length >= limit) break;
  }
  return unique(matches);
}

// --- accessory-vs-real-port detection -------------------------------------

const ACCESSORY_EVIDENCE_TERMS = [
  "mounting bracket",
  "rack bracket",
  "wall bracket",
  "mounting kit",
  "quickstart",
  "quick start",
  "user guide",
  "power supply",
  "power adapter",
  "terminal block",
  "remote control",
  "desktop stand",
  "wall mounting kit",
  "lens cap",
  "cable pack",
  "cable ties",
  "reusable cable tie",
  "warranty card",
];

function isAccessoryPort(port) {
  const evidence = lower(`${port.connector || ""} ${port.evidence || ""}`);
  if (includesAny(evidence, ACCESSORY_EVIDENCE_TERMS)) return true;
  if (/\b(transmitter|receiver|tx|rx)\b.*\b(1x|2x)\b/i.test(port.connector || "") && /\bor\b/i.test(port.connector || "")) return true;
  return false;
}

function partitionPorts(ports) {
  const genuine = [];
  const accessories = [];
  for (const port of ports) {
    (isAccessoryPort(port) ? accessories : genuine).push(port);
  }
  return { genuine, accessories };
}

function regroupPortsByCategory(ports) {
  const groups = { video: [], audio: [], usb: [], network: [], control: [], other: [] };
  for (const port of ports) {
    (groups[port.category] || groups.other).push(port);
  }
  return groups;
}

// --- backfill profile inference (ported from enrich-wyrestorm-product-intelligence.mjs) ---

function inferVideoProfile(text, lines) {
  return {
    present: includesAny(text, ["video", "hdmi", "hdbaset", "displayport", "4k", "8k", "1080p", "ndi", "sdi"]),
    maxResolutions: unique(extractMatches(text, /\b(?:8K|4K|3840x2160p?|4096x2160p?|1920x1080p?|1080p|720p)[^.;\n|]{0,45}(?:Hz|hz|4:4:4|4:2:0|HDR|bit)?/g, 20)),
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
  };
}

function inferAudioProfile(text) {
  return {
    present: includesAny(text, ["audio", "dante", "aes67", "speaker", "microphone", "amplifier", "phoenix"]),
    formats: unique(extractMatches(text, /\b(?:PCM|Dolby [A-Za-z0-9 +.-]+|DTS[-A-Za-z0-9 +.]*)\b/gi, 12)),
    networkAudio: unique([includesAny(text, ["dante"]) ? "Dante" : "", includesAny(text, ["aes67"]) ? "AES67" : ""]),
    processing: unique([
      includesAny(text, ["dsp"]) ? "DSP" : "",
      includesAny(text, ["aec"]) ? "AEC" : "",
      includesAny(text, ["agc"]) ? "AGC" : "",
      includesAny(text, ["ans"]) ? "ANS" : "",
    ]),
  };
}

function inferUsbProfile(text) {
  return {
    present: includesAny(text, ["usb"]),
    versions: unique(extractMatches(text, /\bUSB\s*(?:2\.0|3\.0|3\.1|3\.2(?:\s*Gen\s*\d(?:x\d)?)?)\b/gi, 12)),
    connectors: unique(extractMatches(text, /\bUSB[-\s]?(?:A|B|C)\b/gi, 12)),
    roles: unique([
      includesAny(text, ["usb host"]) ? "USB host" : "",
      includesAny(text, ["usb device"]) ? "USB device" : "",
      includesAny(text, ["kvm", "hid"]) ? "KVM / HID" : "",
    ]),
    bandwidth: unique(extractMatches(text, /\b(?:5|10|20|40)\s*Gbps\b/gi, 8)),
    powerDelivery: includesAny(text, ["power delivery", " pd ", "60w charging", "usb-c charging"]),
  };
}

function inferNetworkProfile(text) {
  return {
    present: includesAny(text, ["network", "ethernet", "lan", "rj45", "poe", "sfp"]),
    protocols: unique([
      includesAny(text, ["networkhd"]) ? "NetworkHD" : "",
      includesAny(text, ["dante"]) ? "Dante" : "",
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

function inferControlProfile(text) {
  return {
    present: includesAny(text, ["control", "rs232", "rs-232", "ir", "cec", "relay", "telnet", "api", "edid"]),
    protocols: unique([
      includesAny(text, ["rs-232", "rs232"]) ? "RS-232" : "",
      includesAny(text, [" ir ", "ir passthrough", "infrared", "ir emitter", "ir receiver"]) ? "IR" : "",
      includesAny(text, ["cec"]) ? "CEC" : "",
      includesAny(text, ["telnet"]) ? "Telnet" : "",
      includesAny(text, ["api"]) ? "API" : "",
      includesAny(text, ["relay"]) ? "Relay" : "",
    ]),
  };
}

function inferHdbasetProfile(text) {
  const present = /\bhdbase[-\s]?t\b|\bhdbt\b/i.test(text);
  if (!present) return { present: false, version: "", distance: [] };
  const versionMatch = text.match(/\bhdbaset\s*(2\.0|3\.0)\b/i);
  return {
    present: true,
    version: versionMatch ? `HDBaseT ${versionMatch[1]}` : "",
    distance: unique(extractMatches(text, /\b\d{2,3}\s*m(?:\/\d+\s*ft)?\b|\b\d{2,4}\s*ft\b/gi, 6)),
  };
}

// --- text cleanup ----------------------------------------------------------

// Some scraped maxResolutions entries are duplicated/truncated marketing
// fragments (e.g. "4K60Hz 4:4:4 Encoder 4K60Hz 4:4:4 Encoder 4K60H"). Keep
// only entries that look like a genuine resolution token and drop anything
// that is mostly a repeated substring of another entry in the same list.
function cleanResolutionList(list) {
  const candidates = unique(list).filter((entry) => /\b(4k|8k|1080p?|720p?|\d{3,4}x\d{3,4})\b/i.test(entry));
  const out = [];
  for (const entry of candidates) {
    const isDuplicateFragment = out.some((existing) => existing.includes(entry) || entry.includes(existing));
    if (!isDuplicateFragment) out.push(entry);
  }
  return out.map((entry) => entry.replace(/\s{2,}/g, " ").slice(0, 80));
}

// --- text blob for backfilling products with no rich profile --------------

function textBlobForBackfill(product) {
  const profile = product.technicalProfile || {};
  const features = Array.isArray(profile.features) ? profile.features.map((f) => `${f.label || ""} ${f.evidence || ""}`) : [];
  const ports = Array.isArray(profile.io?.ports) ? profile.io.ports.map((p) => `${p.connector || ""} ${p.evidence || ""}`) : [];
  return [
    product.sku,
    product.name,
    product.title,
    product.description,
    product.summary,
    product.category,
    product.family,
    ...(Array.isArray(product.connectors) ? product.connectors : []),
    ...features,
    ...ports,
  ].map(clean).filter(Boolean).join(" | ");
}

// --- sourceCatalog summary derivation --------------------------------------

function summariseIoDirection(ports, direction) {
  const matches = ports.filter((p) => p.direction === direction);
  if (!matches.length) return "";
  return matches.map((p) => `${p.count}x ${p.connector}`).join(", ");
}

function deriveSourceCatalogFields(product, genuinePorts) {
  const profile = product.technicalProfile || {};
  const hasDirectionInfo = genuinePorts.some((p) => p.direction === "input" || p.direction === "output");
  const inputs = hasDirectionInfo
    ? summariseIoDirection(genuinePorts, "input")
    : genuinePorts.length
      ? `${genuinePorts.map((p) => `${p.count}x ${p.connector}`).join(", ")} (direction not specified in source)`
      : "";
  const outputs = hasDirectionInfo ? summariseIoDirection(genuinePorts, "output") : "";

  const video = profile.video;
  const resolutionBandwidth = video?.present
    ? unique([...(video.standards || []), ...(cleanResolutionList(video.maxResolutions || [])), ...(video.bandwidth || [])]).slice(0, 6).join(", ")
    : "";

  const usb = profile.usb?.present
    ? unique([
        ...(profile.usb.versions || []),
        ...(profile.usb.connectors || []),
        ...(profile.usb.roles || []),
        profile.usb.powerDelivery ? "Power delivery" : "",
      ]).slice(0, 6).join(", ")
    : "";

  const audio = profile.audio?.present
    ? unique([...(profile.audio.formats || []), ...(profile.audio.networkAudio || []), ...(profile.audio.processing || [])]).slice(0, 6).join(", ")
    : "";

  const control = profile.control?.present ? unique(profile.control.protocols || []).join(", ") : "";

  const networkRequirement = profile.network?.present
    ? unique([...(profile.network.protocols || []), ...(profile.network.linkSpeeds || []), ...(profile.network.powerOverNetwork || [])]).slice(0, 6).join(", ")
    : "";

  return { inputs, outputs, resolutionBandwidth, usb, audio, control, networkRequirement };
}

// --- main -------------------------------------------------------------

async function main() {
  const raw = await fs.readFile(enrichmentPath, "utf8");
  const products = JSON.parse(raw);
  if (!Array.isArray(products)) {
    throw new Error("Expected data-sources/wyrestorm/enrichment.json to contain a JSON array of products.");
  }

  const stats = {
    productsProcessed: products.length,
    profilesBackfilled: 0,
    portsMovedToAccessories: 0,
    productsWithAccessoriesSeparated: 0,
    resolutionEntriesCleaned: 0,
    hdbasetFieldsAdded: 0,
    sourceCatalogFieldsPopulated: 0,
  };

  for (const product of products) {
    const profile = product.technicalProfile;
    if (!profile || typeof profile !== "object") continue;

    // 1. Backfill missing rich sub-profiles from already-sourced text.
    const needsBackfill = !profile.video || !profile.audio || !profile.usb || !profile.network || !profile.control;
    if (needsBackfill) {
      const text = textBlobForBackfill(product);
      if (!profile.video) profile.video = inferVideoProfile(text, []);
      if (!profile.audio) profile.audio = inferAudioProfile(text);
      if (!profile.usb) profile.usb = inferUsbProfile(text);
      if (!profile.network) profile.network = inferNetworkProfile(text);
      if (!profile.control) profile.control = inferControlProfile(text);
      stats.profilesBackfilled += 1;
    }

    // 2. Partition io.ports into genuine ports vs included accessories.
    const io = profile.io && typeof profile.io === "object" ? profile.io : null;
    if (io && Array.isArray(io.ports)) {
      const { genuine, accessories } = partitionPorts(io.ports);
      if (accessories.length) {
        io.ports = genuine;
        io.accessories = accessories;
        const regrouped = regroupPortsByCategory(genuine);
        io.video = regrouped.video;
        io.audio = regrouped.audio;
        io.usb = regrouped.usb;
        io.network = regrouped.network;
        io.control = regrouped.control;
        io.other = regrouped.other;
        stats.portsMovedToAccessories += accessories.length;
        stats.productsWithAccessoriesSeparated += 1;
      }
    }

    // 3. Clean duplicated/garbage maxResolutions text.
    if (profile.video && Array.isArray(profile.video.maxResolutions) && profile.video.maxResolutions.length) {
      const before = profile.video.maxResolutions.length;
      profile.video.maxResolutions = cleanResolutionList(profile.video.maxResolutions);
      if (profile.video.maxResolutions.length !== before) stats.resolutionEntriesCleaned += 1;
    }

    // 4. Add a dedicated HDBaseT profile field.
    if (!profile.hdbaset) {
      const text = textBlobForBackfill(product);
      profile.hdbaset = inferHdbasetProfile(text);
      if (profile.hdbaset.present) stats.hdbasetFieldsAdded += 1;
    }

    // 5. Populate sourceCatalog quick-glance summary fields (only where empty,
    // so any future manual curation is never overwritten).
    const sc = product.sourceCatalog;
    if (sc && typeof sc === "object") {
      const genuinePorts = io && Array.isArray(io.ports) ? io.ports : [];
      const derived = deriveSourceCatalogFields(product, genuinePorts);
      let populatedAny = false;
      for (const key of ["inputs", "outputs", "resolutionBandwidth", "usb", "audio", "control", "networkRequirement"]) {
        if (!clean(sc[key]) && derived[key]) {
          sc[key] = derived[key];
          populatedAny = true;
        }
      }
      if (populatedAny) stats.sourceCatalogFieldsPopulated += 1;
    }
  }

  await fs.writeFile(enrichmentPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), stats }, null, 2)}\n`, "utf8");

  console.log("[enrich-product-technical-summary]", JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error("[enrich-product-technical-summary] Failed:", error);
  process.exit(1);
});
