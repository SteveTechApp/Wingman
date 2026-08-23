#!/usr/bin/env node
/**
 * check-call-card-profile-consistency.mjs
 *
 * Fails when a call-card entry's copyRefreshProfile contradicts its governed
 * product classification (from the product intelligence index).
 *
 * Example: a SWITCHER card classified as audio or accessory — the copy would
 * then position it with the wrong sales language, confusing reps and undermining
 * credibility when they quote.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const callCardPath = path.join(root, "public", "product-call-card-products.json");
const indexPath = path.join(root, "public", "product-intelligence-index.json");

if (!fs.existsSync(callCardPath)) {
  console.error("[profile-consistency] Missing product-call-card-products.json");
  process.exit(1);
}
if (!fs.existsSync(indexPath)) {
  console.error("[profile-consistency] Missing product-intelligence-index.json");
  process.exit(1);
}

const callCardData = JSON.parse(fs.readFileSync(callCardPath, "utf8"));
const indexData = JSON.parse(fs.readFileSync(indexPath, "utf8"));

const products = Array.isArray(callCardData)
  ? callCardData
  : Array.isArray(callCardData.products)
    ? callCardData.products
    : [];

if (products.length === 0) {
  console.error("[profile-consistency] No call-card products found");
  process.exit(1);
}

// Build SKU -> index lookup
const indexBySku = new Map();
for (const p of indexData.products) {
  indexBySku.set(p.sku, p);
}

// --- Contradiction rules ---
//
// Each rule: { test(product, indexEntry) → string|null }
//   returns a string description of the contradiction, or null if OK.
//
// The rules use subClassifications + classificationPath (the governed
// taxonomy) to determine what profile families are forbidden.  The
// mapping is deliberately conservative: it catches the clear landmines
// without false-positiving on edge cases where a product legitimately
// straddles two roles.

const FORBIDDEN_PROFILE_MAP = [
  // Matrix / switchers / video-wall must not be audio/cable/uc
  {
    label: "matrix-switcher",
    match: (sub) =>
      sub.includes("matrix") ||
      sub.includes("presentation-switcher") ||
      sub.includes("video-wall") ||
      sub.includes("source-switcher") ||
      sub.includes("seamless") ||
      sub.includes("splitter"),
    forbidden: new Set(["audio", "cable"]),
    allowed: new Set(["matrix", "presentation", "videoWall", "extender", "accessory"]),
  },
  // NetworkHD endpoints must not be audio
  {
    label: "networkhd",
    match: (sub) =>
      sub.includes("networkhd-100") ||
      sub.includes("networkhd-500") ||
      sub.includes("networkhd-600") ||
      sub.includes("encoder") ||
      sub.includes("decoder") ||
      sub.includes("encoder-decoder") ||
      sub.includes("transceiver") ||
      sub.includes("networkhd-accessory") ||
      sub.includes("networkhd-control"),
    forbidden: new Set(["audio", "cable"]),
    allowed: new Set(["networkhd", "uc", "accessory", "multiview"]),
  },
  // Cameras must not be accessory/cable/audio.
  // Exclude UC peripherals: their subClass includes camera/video-bar
  // because they capture video, but they are UC accessories not
  // standalone cameras — accessory is the correct call-card profile.
  {
    label: "camera",
    match: (sub, _primaryCat, primaryCat) =>
      (sub.includes("camera") ||
       sub.includes("ptz") ||
       sub.includes("camera-workflow") ||
       sub.includes("video-bar")) &&
      primaryCat !== "Unified Communications",
    forbidden: new Set(["accessory", "cable", "matrix"]),
    allowed: new Set(["camera", "cameraBridge", "uc"]),
  },
  // Amplifiers/audio must not be cable/matrix
  {
    label: "audio",
    match: (sub) =>
      sub.includes("amplifier") ||
      sub.includes("dsp") ||
      sub.includes("dante") ||
      sub.includes("audio-conversion") ||
      sub.includes("speakerphone"),
    forbidden: new Set(["cable", "matrix"]),
    allowed: new Set(["audio", "accessory", "uc"]),
  },
  // Cables must not be presentation/matrix/networkhd
  {
    label: "cable",
    match: (sub) =>
      sub.includes("cable") ||
      sub.includes("active-optical"),
    forbidden: new Set(["presentation", "matrix", "videoWall", "networkhd"]),
    allowed: new Set(["cable", "accessory"]),
  },
  // Extenders must not be cable/matrix/camera/presentation.
  // Exclude products that are primarily matrix or presentation
  // (they carry hdbaset in subClass because they extend, but the
  // governing role is switching/routing, not transport).
  {
    label: "extender",
    match: (sub) =>
      (sub.includes("extender") ||
       sub.includes("hdbaset") ||
       sub.includes("transmitter") ||
       sub.includes("receiver")) &&
      !sub.includes("matrix") &&
      !sub.includes("presentation-switcher"),
    forbidden: new Set(["cable", "matrix", "camera", "presentation"]),
    allowed: new Set(["extender", "accessory", "uc", "audio"]),
  },
];

const violations = [];

for (const card of products) {
  const sku = card.sku;
  const profile = card.copyRefreshProfile;
  if (!profile) continue; // no profile → nothing to contradict

  const idx = indexBySku.get(sku);
  if (!idx) continue; // SKU not in index → coverage issue caught elsewhere

  const subClass = Array.isArray(idx.productClassification?.subClassifications)
    ? idx.productClassification.subClassifications
    : [];
  const primaryCat = idx.productClassification?.primaryCategory || "";

  for (const rule of FORBIDDEN_PROFILE_MAP) {
    if (rule.match(subClass, primaryCat, primaryCat) && rule.forbidden.has(profile)) {
      const pathStr = Array.isArray(idx.productClassification?.classificationPath)
        ? idx.productClassification.classificationPath.join(" > ")
        : "(none)";
      violations.push({
        sku,
        profile,
        rule: rule.label,
        classificationPath: pathStr,
        message: `${sku}: copyRefreshProfile="${profile}" contradicts governed classification "${rule.label}" (${pathStr})`,
      });
    }
  }
}

if (violations.length > 0) {
  console.error(
    `[profile-consistency] ${violations.length} call-card entry/entries have copyRefreshProfile that contradicts governed productClass:\n` +
    violations.map((v) => `  ${v.message}`).join("\n")
  );
  process.exit(1);
}

console.log(
  `[profile-consistency] OK: ${products.length} call-card entries have copyRefreshProfile consistent with governed productClass.`
);
