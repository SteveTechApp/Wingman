#!/usr/bin/env node
/**
 * import-pricelist.mjs
 *
 * Parses the Q3 2026 WyreStorm GBP Distribution Price List and generates:
 *  1. New governed technical profiles for products missing from wyrestorm-technical-profiles.json
 *  2. A unified pricing catalogue (wyrestorm-pricing.json)
 *
 * Usage: node tools/import-pricelist.mjs <path-to-excel>
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { atomicWriteJsonSync } from "./lib/atomic-json-writer.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// 1. Parse Excel using xlsx (must be installed)
// ---------------------------------------------------------------------------
let XLSX;
try {
  XLSX = await import("xlsx");
} catch {
  console.error("xlsx not installed. Run: npm install xlsx --no-save");
  process.exit(1);
}
XLSX = XLSX.default || XLSX;

const excelPath = process.argv[2];
if (!excelPath) {
  console.error("Usage: node tools/import-pricelist.mjs <path-to-excel>");
  process.exit(1);
}

const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets["Sheet1"];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

// ---------------------------------------------------------------------------
// 2. Extract products with category tracking
// ---------------------------------------------------------------------------
const CATEGORY_HEADERS = new Set([
  "NetworkHD Components",
  "PRESENTATION AND CONFERENCING",
  "UNIFIED COMMUNICATION",
  "AUDIO SYSTEM",
  "MATRIX SOLUTION",
  "CONTROL SYSTEM",
  "VIDEO PROCESSOR",
  "HDMI EXTENDER",
  "USB EXTENDER",
  "KVM EXTENDER",
  "HDMI SPLITTER",
  "HDMI SWITCHER",
  "CABLE",
  "ACCESSORIES",
]);

const SUBCATEGORY_NAMES = new Set([
  "NetworkHD Components",
  "Network Switches",
  "Wireless Conference System",
  "Presentation Switcher",
  "In-Desk Box",
  "Camera",
  "Camera Bridge and Mixer",
  "Speakerphone",
  "Video Bar",
  "Audio",
  "Seamless Matrix Switcher",
  "HDMI Matrix Swithcer",
  "HDBaseT Matrix Kit",
  "HDBaseT Matrix Switcher",
  "Control System",
  "Video Processor",
  "HDMI Extender",
  "USB Extender",
  "KVM Extender",
  "HDMI Splitter",
  "HDMI Switcher",
  "HDMI AOC Cable",
  "HDMI Cable",
  "USB Cable",
  "USB-C Cable",
  "Adapter",
  "Accessories",
]);

const HEADER_ROW_VALUES = new Set(["DISTRIBUTOR", "DEALER", "MSRP", "Price Diff", "Warranty", "Note"]);

const products = [];
let currentCategory = "";
let currentSubcategory = "";

for (const row of rows) {
  const sku = row[0];
  const desc = row[1];

  if (!sku || typeof sku !== "string" || sku.length < 3) continue;

  // Skip known header/footer rows
  if (HEADER_ROW_VALUES.has(desc)) continue;
  if (sku.startsWith("Note: WyreStorm")) continue;
  if (sku.startsWith("© WyreStorm")) continue;

  // Category and subcategory headers (desc is null)
  if (!desc) {
    if (CATEGORY_HEADERS.has(sku)) {
      currentCategory = sku;
      currentSubcategory = "";
    } else if (SUBCATEGORY_NAMES.has(sku)) {
      currentSubcategory = sku;
    }
    continue;
  }

  products.push({
    sku: sku.trim(),
    description: String(desc).trim(),
    category: currentCategory,
    subcategory: currentSubcategory,
    distributorPrice: row[2] != null ? Number(row[2]) : null,
    dealerPrice: row[3] != null ? Number(row[3]) : null,
    msrp: row[4] != null ? Number(row[4]) : null,
    warranty: row[6] != null ? String(row[6]).trim() : "",
    note: row[7] != null ? String(row[7]).trim() : "",
  });
}

console.log(`Parsed ${products.length} products from Excel`);

// Deduplicate by SKU (some products appear in multiple categories)
const seen = new Map();
for (const p of products) {
  const key = p.sku.toUpperCase();
  if (!seen.has(key)) {
    seen.set(key, p);
  } else {
    // Merge: keep first occurrence's category, add secondary subcategory
    const existing = seen.get(key);
    if (p.subcategory && !existing.subcategory.includes(p.subcategory)) {
      existing.subcategory += ` / ${p.subcategory}`;
    }
  }
}
const uniqueProducts = [...seen.values()];
console.log(`Unique SKUs: ${uniqueProducts.length}`);

// ---------------------------------------------------------------------------
// 3. Load existing governed profiles
// ---------------------------------------------------------------------------
const profilesPath = resolve(ROOT, "data/governance/wyrestorm-technical-profiles.json");
const profileData = JSON.parse(readFileSync(profilesPath, "utf-8"));
const existingProfileMap = new Map();
for (const p of profileData.profiles || []) {
  existingProfileMap.set(p.sku.toUpperCase(), p);
}
console.log(`Existing governed profiles: ${existingProfileMap.size}`);

// ---------------------------------------------------------------------------
// 4. Classify product from description
// ---------------------------------------------------------------------------
function classifyProduct(desc, subcategory, sku) {
  const lower = desc.toLowerCase();
  const sub = subcategory.toLowerCase();
  const skuLower = (sku || "").toLowerCase().replace(/\s+v\d+.*$/, ""); // strip version suffix

  // Cables & accessories first
  if (sub.includes("cable") || /\bcable\b/i.test(lower)) {
    if (/hdmi.*aoc|aoc.*hdmi/i.test(lower)) return { productClass: "CABLE", role: "active optical cable", transport: ["HDMI"] };
    if (/usb-c/i.test(lower)) return { productClass: "CABLE", role: "USB-C cable", transport: ["USB-C"] };
    if (/usb.*cable/i.test(lower)) return { productClass: "CABLE", role: "USB cable", transport: ["USB"] };
    return { productClass: "CABLE", role: "HDMI cable", transport: ["HDMI"] };
  }
  if (sub.includes("accessories") || /^psu-/i.test(lower) || /power supply/i.test(lower)) {
    return { productClass: "ACCESSORY", role: "power supply / accessory", transport: [] };
  }
  if (/^idb-/i.test(lower) || /in-desk|cablebox|keystone/i.test(lower)) {
    return { productClass: "ACCESSORY", role: "in-desk connectivity", transport: ["HDMI", "USB-C"] };
  }

  // AVoIP / NetworkHD
  if (sub.includes("networkhd") || /^nhd-/i.test(skuLower) || /av over ip|avoip|sdvooe|networkhd/i.test(lower)) {
    if (/encoder|tx\b/i.test(lower)) return { productClass: "AVOIP", role: "AVoIP encoder", transport: ["1GbE AV network"] };
    if (/decoder|rx\b/i.test(lower)) return { productClass: "AVOIP", role: "AVoIP decoder", transport: ["1GbE AV network"] };
    if (/transceiver|trx/i.test(lower)) return { productClass: "AVOIP", role: "AVoIP transceiver", transport: ["1GbE AV network"] };
    if (/controller|ctl/i.test(lower)) return { productClass: "CONTROL", role: "AVoIP controller", transport: ["Ethernet"] };
    if (/switcher|mv|multiview/i.test(lower)) return { productClass: "MULTIVIEW", role: "multiview processor", transport: ["1GbE AV network"] };
    if (/rack/i.test(lower)) return { productClass: "ACCESSORY", role: "rack mount", transport: [] };
    if (/sfp/i.test(lower)) return { productClass: "ACCESSORY", role: "SFP module", transport: [] };
    return { productClass: "AVOIP", role: "AVoIP component", transport: ["1GbE AV network"] };
  }

  // Presentation switchers
  if (sub.includes("presentation") || /^sw-/i.test(skuLower)) {
    if (/wireless|airplay|miracast/i.test(lower)) return { productClass: "WIRELESS_PRESENTATION", role: "wireless presentation switcher", transport: ["HDMI", "Wi-Fi"] };
    if (/synergy|flow/i.test(lower)) return { productClass: "PRESENTATION", role: "presentation switcher", transport: ["HDBaseT"] };
    return { productClass: "PRESENTATION", role: "presentation switcher", transport: ["HDMI"] };
  }

  // Cameras
  if (sub.includes("camera") || /camera|ptz|webcam|focus/i.test(lower)) {
    return { productClass: "CAMERA", role: "camera", transport: ["HDMI", "USB", "NDI"] };
  }

  // Video bars
  if (sub.includes("video bar") || /video bar/i.test(lower)) {
    return { productClass: "UC", role: "video bar", transport: ["HDMI", "USB-C"] };
  }

  // Speakerphones
  if (sub.includes("speakerphone") || /speakerphone|halo\s*(60|80)/i.test(lower)) {
    return { productClass: "UC", role: "speakerphone", transport: ["USB", "Bluetooth"] };
  }

  // Audio
  if (sub.includes("audio") || /amplifier|amp-|dsp-|dante|audio extractor|con-.*-dnt|con-dnt|con-anlg|con-xlr|con-usbc-dnt/i.test(lower)) {
    if (/amplifier|amp-/i.test(lower)) return { productClass: "AUDIO", role: "audio amplifier", transport: ["Analog audio", "Dante"] };
    if (/dsp|processor/i.test(lower)) return { productClass: "AUDIO", role: "audio DSP", transport: ["Dante", "Analog audio"] };
    if (/dante|aes67/i.test(lower)) return { productClass: "AUDIO", role: "Dante adapter", transport: ["Dante", "AES67"] };
    if (/extractor/i.test(lower)) return { productClass: "AUDIO", role: "audio extractor", transport: ["HDMI"] };
    return { productClass: "AUDIO", role: "audio component", transport: ["Audio"] };
  }

  // Control systems
  if (sub.includes("control") || /^syn-/i.test(skuLower)) {
    return { productClass: "CONTROL", role: "control system", transport: ["Ethernet", "RS-232", "IR"] };
  }

  // Video processors
  if (sub.includes("video processor") || /video wall|vw-/i.test(lower)) {
    return { productClass: "VIDEO_WALL", role: "video wall processor", transport: ["HDMI"] };
  }

  // HDMI extenders
  if (sub.includes("extender") || /^ex-/i.test(skuLower) || /^exp-/i.test(skuLower)) {
    if (/kvm/i.test(lower)) return { productClass: "HDBASET", role: "KVM extender", transport: ["HDBaseT"] };
    if (/usb/i.test(lower)) return { productClass: "USB_EXTENSION", role: "USB extender", transport: ["HDBaseT", "USB"] };
    if (/fiber|fibre/i.test(lower)) return { productClass: "HDBASET", role: "fiber extender", transport: ["Fiber"] };
    if (/over ip|ip\b/i.test(lower)) return { productClass: "AVOIP", role: "AVoIP extender", transport: ["1GbE"] };
    return { productClass: "HDBASET", role: "HDMI extender", transport: ["HDBaseT", "HDMI"] };
  }

  // Matrix switchers
  if (sub.includes("matrix") || /^mx/i.test(skuLower) || /^mxv/i.test(skuLower)) {
    if (/seamless|scl/i.test(lower)) return { productClass: "MATRIX", role: "seamless matrix switcher", transport: ["HDMI"] };
    if (/hdbaset|h2a/i.test(lower)) return { productClass: "HDBASET", role: "HDBaseT matrix switcher", transport: ["HDBaseT"] };
    return { productClass: "MATRIX", role: "HDMI matrix switcher", transport: ["HDMI"] };
  }

  // Splitters
  if (sub.includes("splitter") || /^sp-/i.test(skuLower) || /splitter/i.test(lower)) {
    return { productClass: "DISTRIBUTION", role: "HDMI splitter", transport: ["HDMI"] };
  }

  // Switchers (HDMI)
  if (sub.includes("switcher") || /^exp-sw/i.test(skuLower) || /^exp-mx/i.test(skuLower)) {
    return { productClass: "SWITCHER", role: "HDMI switcher", transport: ["HDMI"] };
  }

  // Dongles
  if (/dongle|apo-dg/i.test(skuLower)) {
    return { productClass: "WIRELESS_PRESENTATION", role: "wireless dongle", transport: ["USB-C", "Wi-Fi"] };
  }

  // Docking stations
  if (/dock/i.test(lower)) {
    return { productClass: "ACCESSORY", role: "docking station", transport: ["USB-C"] };
  }

  // Fallback: use the Excel category/subcategory to infer class
  const catLower = (currentCategory || "").toLowerCase();
  const subLower = (subcategory || "").toLowerCase();
  if (catLower.includes("matrix") || subLower.includes("matrix")) {
    if (/hdbaset|h2a|kit/i.test(lower)) return { productClass: "HDBASET", role: "HDBaseT matrix", transport: ["HDBaseT"] };
    return { productClass: "MATRIX", role: "matrix switcher", transport: ["HDMI"] };
  }
  if (catLower.includes("extender") || subLower.includes("extender")) {
    if (/kvm/i.test(lower)) return { productClass: "HDBASET", role: "KVM extender", transport: ["HDBaseT"] };
    return { productClass: "HDBASET", role: "HDMI extender", transport: ["HDBaseT"] };
  }
  if (catLower.includes("cable") || subLower.includes("cable")) {
    if (/aoc/i.test(lower)) return { productClass: "CABLE", role: "active optical cable", transport: ["HDMI"] };
    if (/usb-c/i.test(lower)) return { productClass: "CABLE", role: "USB-C cable", transport: ["USB-C"] };
    return { productClass: "CABLE", role: "HDMI cable", transport: ["HDMI"] };
  }
  if (catLower.includes("control") || subLower.includes("control")) {
    return { productClass: "CONTROL", role: "control system", transport: ["Ethernet", "RS-232", "IR"] };
  }
  if (catLower.includes("accessories") || subLower.includes("accessories")) {
    return { productClass: "ACCESSORY", role: "accessory", transport: [] };
  }

  return { productClass: "OTHER", role: "WyreStorm product", transport: [] };
}

// ---------------------------------------------------------------------------
// 5. Extract video/audio/control features from description
// ---------------------------------------------------------------------------
function extractFeatures(desc) {
  const lower = desc.toLowerCase();
  const features = {};

  // Resolution
  if (/8k/i.test(lower)) features.maxResolution = "8K60Hz";
  else if (/5k/i.test(lower)) features.maxResolution = "5K60Hz";
  else if (/4k/i.test(lower)) features.maxResolution = "4K60Hz";
  else if (/1080p/i.test(lower)) features.maxResolution = "1080p60Hz";

  // Chroma
  if (/4:4:4/i.test(lower)) features.chroma = "4:4:4";
  else if (/4:2:2/i.test(lower)) features.chroma = "4:2:2";
  else if (/4:2:0/i.test(lower)) features.chroma = "4:2:0";

  // HDR
  if (/dolby vision/i.test(lower)) features.hdr = ["Dolby Vision"];
  else if (/hdr/i.test(lower)) features.hdr = ["HDR10"];

  // Transport
  if (/hdmi\s*2\.1/i.test(lower)) features.hdmiVersion = "2.1";
  else if (/hdmi\s*2\.0/i.test(lower)) features.hdmiVersion = "2.0";
  else if (/hdmi\s*1\.4/i.test(lower)) features.hdmiVersion = "1.4";
  else if (/hdmi\s*1\.3/i.test(lower)) features.hdmiVersion = "1.3";

  // HDCP
  if (/hdcp\s*2\.3/i.test(lower)) features.hdcp = "2.3";
  else if (/hdcp\s*2\.2/i.test(lower)) features.hdcp = "2.2";

  // PoE
  if (/poe\+?/i.test(lower)) features.poe = true;
  if (/poh/i.test(lower)) features.poh = true;

  // Audio features
  const audioFeatures = [];
  if (/arc\b/i.test(lower)) audioFeatures.push("ARC");
  if (/earc/i.test(lower)) audioFeatures.push("eARC");
  if (/dante/i.test(lower)) audioFeatures.push("Dante");
  if (/aes67/i.test(lower)) audioFeatures.push("AES67");
  if (/s\/pdif/i.test(lower)) audioFeatures.push("S/PDIF");
  if (/audio de-embed/i.test(lower)) audioFeatures.push("Audio De-embed");
  if (audioFeatures.length) features.audioFeatures = audioFeatures;

  // Control
  const controlFeatures = [];
  if (/rs-?232/i.test(lower)) controlFeatures.push("RS-232");
  if (/\bir\b/i.test(lower)) controlFeatures.push("IR");
  if (/\bcec\b/i.test(lower)) controlFeatures.push("CEC");
  if (/gpio/i.test(lower)) controlFeatures.push("GPIO");
  if (/relay/i.test(lower)) controlFeatures.push("Relay");
  if (controlFeatures.length) features.controlFeatures = controlFeatures;

  // Network
  const networkFeatures = [];
  if (/10gbe|10gb/i.test(lower)) networkFeatures.push("10GbE");
  else if (/1gbe|1gb/i.test(lower)) networkFeatures.push("1GbE");
  if (/sfp\+?/i.test(lower)) networkFeatures.push("SFP");
  if (/sygma cloud/i.test(lower)) networkFeatures.push("Sygma Cloud");
  if (/ndi/i.test(lower)) networkFeatures.push("NDI");
  if (networkFeatures.length) features.networkFeatures = networkFeatures;

  // USB
  if (/usb\s*3\.0/i.test(lower)) features.usb = "USB 3.0";
  else if (/usb\s*2\.0/i.test(lower)) features.usb = "USB 2.0";
  if (/usb-c.*charging|charging.*usb-c/i.test(lower)) {
    const match = lower.match(/(\d+)w\s*usb-c\s*charging/);
    features.usbCharging = match ? `${match[1]}W` : "60W";
  }

  // Physical
  if (/in-wall|in wall|2-gang|single gang/i.test(lower)) features.formFactor = "in-wall";
  if (/rack/i.test(lower)) features.formFactor = "rack-mount";

  return features;
}

// ---------------------------------------------------------------------------
// 6. Build ports array from description
// ---------------------------------------------------------------------------
function extractPorts(desc, productClass) {
  const ports = [];
  const lower = desc.toLowerCase();

  // Try to extract I/O counts from description patterns
  // e.g. "8x8" or "4x2" or "1x4"
  const ioMatch = lower.match(/(\d+)\s*x\s*(\d+)/);
  if (ioMatch && (productClass === "MATRIX" || productClass === "HDBASET" || productClass === "DISTRIBUTION" || productClass === "SWITCHER")) {
    const inputCount = parseInt(ioMatch[1]);
    const outputCount = parseInt(ioMatch[2]);

    if (/hdbaset/i.test(lower)) {
      ports.push({ count: inputCount, connector: "HDMI", direction: "input", category: "video", detail: `${inputCount}x HDMI inputs` });
      ports.push({ count: outputCount, connector: "HDBaseT", direction: "output", category: "video", detail: `${outputCount}x HDBaseT outputs` });
    } else if (productClass === "DISTRIBUTION" || /splitter/i.test(lower)) {
      ports.push({ count: 1, connector: "HDMI", direction: "input", category: "video", detail: "1x HDMI input" });
      ports.push({ count: outputCount, connector: "HDMI", direction: "output", category: "video", detail: `${outputCount}x HDMI outputs` });
    } else {
      ports.push({ count: inputCount, connector: "HDMI", direction: "input", category: "video", detail: `${inputCount}x HDMI inputs` });
      ports.push({ count: outputCount, connector: "HDMI", direction: "output", category: "video", detail: `${outputCount}x HDMI outputs` });
    }
  }

  // USB-C inputs
  const usbCMatch = lower.match(/(\d+)\s*usb-c/);
  if (usbCMatch) {
    ports.push({ count: parseInt(usbCMatch[1]), connector: "USB-C", direction: "input", category: "video", detail: `${usbCMatch[1]}x USB-C inputs` });
  }

  // Network port
  if (/1gbe|1gb|poes?e?\b/i.test(lower) || /av over ip|networkhd|sdvooe/i.test(lower)) {
    ports.push({ count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "1GbE network" });
  }
  if (/10gbe|10gb/i.test(lower)) {
    ports.push({ count: 1, connector: "RJ45", direction: "bidirectional", category: "network", detail: "10GbE network" });
  }

  return ports;
}

// ---------------------------------------------------------------------------
// 7. Generate profiles for missing products
// ---------------------------------------------------------------------------
const now = new Date().toISOString();
const newProfiles = [];
const updatedPricing = [];

for (const product of uniqueProducts) {
  const key = product.sku.toUpperCase();
  const existing = existingProfileMap.get(key);

  // Always add pricing data
  updatedPricing.push({
    sku: product.sku,
    description: product.description,
    category: product.category,
    subcategory: product.subcategory,
    distributorPrice: product.distributorPrice,
    dealerPrice: product.dealerPrice,
    msrp: product.msrp,
    currency: "GBP",
    warranty: product.warranty,
    note: product.note,
    updatedAt: now,
  });

  if (existing) {
    // Product already has a profile — skip generating new one
    continue;
  }

  // Generate new profile
  const classification = classifyProduct(product.description, product.subcategory, product.sku);
  const features = extractFeatures(product.description);
  const ports = extractPorts(product.description, classification.productClass);

  const profile = {
    sku: product.sku,
    status: "review-required",
    productClass: classification.productClass,
    role: classification.role,
    productType: product.description.split("|")[0].trim(),
    transport: classification.transport,
    maxResolution: features.maxResolution || undefined,
    routedInputs: ports.find(p => p.direction === "input")?.count || undefined,
    routedOutputs: ports.find(p => p.direction === "output")?.count || undefined,
    inputCount: ports.find(p => p.direction === "input")?.count || undefined,
    outputCount: ports.find(p => p.direction === "output")?.count || undefined,
    ports: ports.length ? ports : undefined,
    video: features.maxResolution ? [features.maxResolution + (features.chroma ? ` ${features.chroma}` : "") + (features.hdr ? ` ${features.hdr.join(" ")}` : "")] : undefined,
    audio: features.audioFeatures?.length ? features.audioFeatures : undefined,
    usb: features.usb ? [features.usb] : undefined,
    network: features.networkFeatures?.length ? features.networkFeatures : undefined,
    control: features.controlFeatures?.length ? features.controlFeatures : undefined,
    power: features.poe ? ["PoE"] : features.poh ? ["PoH"] : undefined,
    physical: features.formFactor ? [features.formFactor] : undefined,
    features: {
      hdr: !!features.hdr,
      arc: features.audioFeatures?.includes("ARC"),
      earc: features.audioFeatures?.includes("eARC"),
      cec: features.controlFeatures?.includes("CEC"),
      poe: features.poe,
      dante: features.audioFeatures?.includes("Dante"),
      ndi: features.networkFeatures?.includes("NDI"),
    },
    checks: [],
    warnings: [],
    evidence: [
      {
        sourceType: "pricelist-q3-2026",
        url: "",
        checkedAt: now.slice(0, 10),
        excerpt: product.description,
      },
    ],
    verifiedBy: "auto-import",
    verifiedAt: now,
    confirmedFields: [],
    createdAt: now,
  };

  // Ensure all expected array fields are present
  const arrayFields = ["dependencies", "compatibleFamilies", "checks", "warnings", "video", "audio", "usb", "network", "control", "power", "physical", "ports", "evidence", "confirmedFields"];
  for (const field of arrayFields) {
    if (!Array.isArray(profile[field])) profile[field] = [];
  }
  if (!Array.isArray(profile.transport)) profile.transport = [];

  newProfiles.push(profile);
}

console.log(`New profiles to add: ${newProfiles.length}`);
console.log(`Pricing entries: ${updatedPricing.length}`);

// ---------------------------------------------------------------------------
// 8. Write results
// ---------------------------------------------------------------------------

// Write new profiles into wyrestorm-technical-profiles.json
if (newProfiles.length > 0) {
  profileData.profiles = [...(profileData.profiles || []), ...newProfiles];
  profileData.updatedAt = now;
  atomicWriteJsonSync(profilesPath, profileData);
  console.log(`Updated ${profilesPath} (${profileData.profiles.length} total profiles)`);
}

// Write pricing catalogue
const pricingPath = resolve(ROOT, "data/governance/wyrestorm-pricing.json");
atomicWriteJsonSync(pricingPath, {
  version: "Q3-2026",
  currency: "GBP",
  source: "2026 (GBP) Distribution Price List Q3",
  updatedAt: now,
  products: updatedPricing,
});
console.log(`Wrote ${pricingPath} (${updatedPricing.length} products with pricing)`);

// ---------------------------------------------------------------------------
// 9. Summary
// ---------------------------------------------------------------------------
console.log("\n=== IMPORT SUMMARY ===");
const byClass = {};
for (const p of newProfiles) {
  byClass[p.productClass] = (byClass[p.productClass] || 0) + 1;
}
console.log("New profiles by product class:");
Object.entries(byClass).sort((a, b) => b[1] - a[1]).forEach(([cls, count]) => {
  console.log(`  ${cls}: ${count}`);
});

console.log(`\nTotal governed profiles: ${profileData.profiles.length}`);
console.log(`Total priced products: ${updatedPricing.length}`);
