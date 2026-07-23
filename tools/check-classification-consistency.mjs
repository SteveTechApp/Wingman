#!/usr/bin/env node
// Classification consistency guard.
//
// The product taxonomy decides what Wingman tells a rep a product IS. It is
// generated partly from datasheet prose, and a datasheet routinely names the
// other end of the link - "pairs with any NetworkHD decoder", "supports a PTZ
// camera on input 2", "requires the NHD-000-CTL controller". Matching that
// prose typed encoders as decoders and transmitters as cameras, which put an
// encoder in the decoder slot of a bill of materials.
//
// This guard fails when a product's classification contradicts the two things
// that are not open to interpretation: its SKU and its product name. It cannot
// prove a classification is right, but it catches the class of error that has
// actually occurred.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const indexPath = path.join(projectRoot, "public", "product-intelligence-index.json");

function lower(value) {
  return String(value ?? "").toLowerCase();
}

function extractProducts(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["products", "records", "items", "catalog", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return Object.values(payload ?? {}).find(Array.isArray) ?? [];
}

const RULES = [
  {
    id: "tx-tagged-decoder",
    describe: (sku) => `${sku} is a transmitter/encoder by SKU or name but is classified as a decoder.`,
    applies: (sku, name) => /-tx(\b|-)/.test(sku) || /\bencoder\b|\btransmitter\b/.test(name),
    excludes: (sku, name) => /-rx(\b|-)/.test(sku) || /\bdecoder\b|\breceiver\b/.test(name),
    violated: (tokens) => tokens.has("decoder"),
  },
  {
    id: "rx-tagged-encoder",
    describe: (sku) => `${sku} is a receiver/decoder by SKU or name but is classified as an encoder.`,
    applies: (sku, name) => /-rx(\b|-)/.test(sku) || /\bdecoder\b|\breceiver\b/.test(name),
    excludes: (sku, name) => /-tx(\b|-)/.test(sku) || /\bencoder\b|\btransmitter\b/.test(name),
    violated: (tokens) => tokens.has("encoder"),
  },
  {
    id: "camera-without-camera-evidence",
    describe: (sku) => `${sku} is classified as a camera but neither its SKU nor its name says it captures an image.`,
    applies: () => true,
    excludes: (sku, name) =>
      /^(cam-|focus|office-kit|apo-|halo-)/.test(sku) ||
      /camera|webcam|ptz|video bar|videobar|capture|ndi gateway|bridge/.test(name),
    violated: (tokens) => tokens.has("camera"),
  },
  {
    id: "controller-without-control-evidence",
    describe: (sku) => `${sku} is classified as a controller but neither its SKU nor its name says it controls anything.`,
    applies: () => true,
    excludes: (sku, name) => /-ctl(\b|-)/.test(sku) || /controller|control|touch|keypad/.test(name),
    violated: (tokens) => tokens.has("controller"),
  },
  {
    id: "amplifier-without-audio-evidence",
    describe: (sku) => `${sku} is classified as an amplifier but neither its SKU nor its name says it amplifies audio.`,
    applies: () => true,
    excludes: (sku, name) => /^amp-/.test(sku) || /amplifier|\bamp\b|\bdsp\b/.test(name),
    violated: (tokens) => tokens.has("amplifier"),
  },
];

async function main() {
  const payload = JSON.parse(await fs.readFile(indexPath, "utf8"));
  const products = extractProducts(payload);
  const violations = [];
  let classified = 0;

  for (const product of products) {
    const sku = lower(product?.sku);
    if (!sku) continue;

    const classification = product?.productClassification;
    if (!classification || typeof classification !== "object") continue;
    classified += 1;

    const name = lower(`${product?.name ?? ""} ${product?.title ?? ""}`);
    const tokens = new Set((classification.subClassifications ?? []).map((token) => lower(token)));

    for (const rule of RULES) {
      if (!rule.applies(sku, name)) continue;
      if (rule.excludes(sku, name)) continue;
      if (!rule.violated(tokens)) continue;

      violations.push(`${rule.id}: ${rule.describe(product.sku)} tokens=[${[...tokens].join(", ")}]`);
    }
  }

  console.log(`[classification-consistency] Checked ${classified} classified products against ${RULES.length} rules.`);

  if (violations.length) {
    console.error(`[classification-consistency] FAIL - ${violations.length} contradiction(s):`);
    for (const violation of violations) console.error(`  - ${violation}`);
    console.error(
      "\nFix the rule in tools/enrich-wyrestorm-product-intelligence.mjs that inferred this from datasheet prose,",
    );
    console.error("or add a reviewed entry to data/catalog/product-classification-corrections.json explaining the correction.");
    process.exitCode = 1;
    return;
  }

  console.log("[classification-consistency] PASS - no classification contradicts its SKU or product name.");
}

main().catch((error) => {
  console.error("[classification-consistency] Failed to run:", error);
  process.exitCode = 1;
});
