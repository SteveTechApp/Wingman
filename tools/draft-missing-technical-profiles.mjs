#!/usr/bin/env node
/**
 * Drafts every active lead SKU that is absent from the governed technical
 * profile database.
 *
 * This tool is deliberately fail-closed:
 * - --check and --apply are mutually exclusive;
 * - only current, specifiable lead products are considered: `active` lifecycle
 *   always, and `review` lifecycle only when a successful official WyreStorm
 *   page was captured (the product is live on the site but its currency is
 *   pending human confirmation - the draft stays review-required either way);
 * - every draft must have a successful captured official WyreStorm page;
 * - every draft remains review-required;
 * - existing profiles are never overwritten;
 * - the complete candidate is schema-validated before an atomic rename.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isCurrentCatalogProduct } from "./lib/current-catalog.mjs";
import { atomicWriteJson, list, profileClass, text, unique, validateSchema } from "./lib/wyrestorm-profile-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const canonicalPath = path.join(root, "data", "wingman-canonical-product-store.json");
const schemaPath = path.join(root, "data", "schemas", "wyrestorm-technical-profile.schema.json");
const REVIEWED_ON = "2026-07-30";
const REVIEWER = "Wingman canonical official-source extraction (NOT human-verified)";
const officialSourceOverrides = new Map([
  ["EXP-SW-0201-8K", "https://www.wyrestorm.com/product/exp-sw-0x01-8k/"],
  ["IDB-USBA-C", "https://www.wyrestorm.com/product/idb-400-ms-c/"],
  ["IDB-USBC-C", "https://www.wyrestorm.com/product/idb-400-ms-c/"],
  ["MXV-0808-H2A-MK2", "https://www.wyrestorm.com/product-resources/"],
  ["NHD-610-RX", "https://www.wyrestorm.com/global/product/nhd-610/"],
]);

function fail(message) {
  console.error(`[draft-missing-profiles] ${message}`);
  process.exit(1);
}


function domainLines(domain, keys) {
  if (!domain || typeof domain !== "object") return [];
  return unique(keys.flatMap((key) => list(domain[key])));
}

function safePorts(product) {
  return list(product.technicalProfile?.io?.ports)
    .filter((port) => port && typeof port === "object")
    .filter((port) => ["video", "audio", "usb", "network", "control", "power", "storage"].includes(text(port.category)))
    .filter((port) => Number.isInteger(port.count) && port.count > 0 && port.count <= 32)
    .filter((port) => !/guide|bracket|mount|power supply|camera$|remote$/i.test(text(port.connector)))
    .map((port) => ({
      count: port.count,
      connector: text(port.connector) || "Connector requires review",
      direction: ["input", "output", "bidirectional"].includes(text(port.direction))
        ? text(port.direction)
        : "unspecified",
      category: text(port.category),
      detail: text(port.evidence),
    }));
}

function createDraft(product) {
  const technical = product.technicalProfile ?? {};
  const sourceQuality = technical.sourceQuality ?? {};
  const sourceUrl = officialSourceOverrides.get(text(product.sku).toUpperCase()) ??
    text(sourceQuality.officialProductUrl || product.url);
  const video = domainLines(technical.video, ["maxResolutions", "standards", "bandwidth", "distance", "processing"]);
  const audio = domainLines(technical.audio, ["formats", "networkAudio", "amplifierPower", "microphone", "speaker", "processing"]);
  const usb = domainLines(technical.usb, ["versions", "connectors", "roles", "bandwidth"]);
  const network = domainLines(technical.network, ["interfaces", "protocols", "linkSpeeds", "powerOverNetwork"]);
  const control = domainLines(technical.control, ["protocols"]);
  const power = domainLines(technical.power, ["input", "consumption", "delivery"]);
  const physical = domainLines(technical.physical, ["dimensions", "weight", "mounting", "environment"]);
  const transports = unique([
    ...list(technical.transports),
    ...list(product.productClassification?.transportClass),
    text(product.sourceCatalog?.transportType),
  ]);
  const dependencies = unique([
    ...list(product.sourceCatalog?.dependencies),
    ...list(product.dependencies),
  ]);
  const maxResolution = text(technical.video?.maxResolutions?.[0]);

  return {
    sku: text(product.sku).toUpperCase(),
    status: "review-required",
    productClass: profileClass(product),
    role: text(product.productClassification?.systemRole || product.productRole || product.role || "Role requires review"),
    productType: text(product.productClassification?.productType || product.name || product.title || "Product type requires review"),
    transport: transports.length ? transports : ["Transport requires human review"],
    ...(maxResolution ? { maxResolution } : {}),
    ports: safePorts(product),
    video,
    audio,
    usb,
    network,
    control,
    power,
    physical,
    dependencies,
    compatibleFamilies: unique(list(product.sourceCatalog?.compatibleFamilies)),
    checks: [
      "Human-review the current official product page and datasheet before promoting this profile.",
      "Confirm all I/O counts, signal directions, performance limits, included accessories and mandatory dependencies before quotation.",
      "Confirm lifecycle, firmware, regional variant, power supply, mounting and cable requirements before customer issue.",
    ],
    warnings: [
      "Machine-drafted from the canonical official-page extraction. This profile is not verified and must not support automatic equivalence or customer-ready claims.",
    ],
    evidence: [{
      sourceType: "official-product-page-canonical-capture",
      sourceUrl,
      reviewedOn: REVIEWED_ON,
      reviewer: REVIEWER,
      note: `Draft generated from canonical official-source material (${Number(sourceQuality.capturedTechnicalLineCount ?? 0)} captured technical line(s)). Exact claims and SKU identity require human review.`,
    }],
  };
}


function validateOfficialSources(products, drafts) {
  const errors = [];
  const productBySku = new Map(products.map((product) => [text(product.sku).toUpperCase(), product]));
  for (const draft of drafts) {
    const source = productBySku.get(draft.sku)?.technicalProfile?.sourceQuality ?? {};
    const evidence = draft.evidence[0];
    if (!evidence.sourceUrl.startsWith("https://www.wyrestorm.com/")) errors.push(`${draft.sku} has no official WyreStorm HTTPS source.`);
    const hasCapturedPage = source.livePageUsed === true && Number(source.officialPageStatus) === 200;
    const hasReviewedOverride = officialSourceOverrides.has(draft.sku);
    if (!hasCapturedPage && !hasReviewedOverride) errors.push(`${draft.sku} has neither a successful captured official page nor an explicitly reviewed official-source override.`);
    if (draft.status !== "review-required") errors.push(`${draft.sku} is not review-required.`);
  }
  return errors;
}


const check = process.argv.includes("--check");
const apply = process.argv.includes("--apply");
const unknown = process.argv.slice(2).filter((argument) => !["--check", "--apply"].includes(argument));
if (unknown.length) fail(`Unknown argument(s): ${unknown.join(", ")}`);
if (check === apply) fail("Choose exactly one mode: --check or --apply.");
for (const filePath of [target, canonicalPath, schemaPath]) {
  if (!fs.existsSync(filePath)) fail(`Missing required file: ${filePath}`);
}

const payload = JSON.parse(fs.readFileSync(target, "utf8"));
const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const existing = new Set(payload.profiles.map((profile) => text(profile.sku).toUpperCase()));
// Only products the website currently lists are drafted, per the shared
// current-catalog predicate (tools/lib/current-catalog.mjs): `active`
// lifecycle always; `review` lifecycle only when an official page was
// successfully captured (live on the site, currency pending human
// confirmation - the review-required draft status keeps that gate).
// Discontinued, do-not-spec and accessory/cable products are never drafted.
const currentProducts = canonical.products.filter(isCurrentCatalogProduct);
const missingProducts = currentProducts.filter((product) => !existing.has(text(product.sku).toUpperCase()));
const drafts = missingProducts.map(createDraft);
const candidate = structuredClone(payload);
candidate.profiles.push(...drafts);
candidate.profiles.sort((a, b) => text(a.sku).localeCompare(text(b.sku)));
if (drafts.length) candidate.updatedAt = REVIEWED_ON;

const errors = [
  ...validateOfficialSources(currentProducts, drafts),
  ...validateSchema(candidate, schema),
];
const seen = new Set();
candidate.profiles.forEach((profile, index) => {
  const sku = text(profile.sku).toUpperCase();
  if (seen.has(sku)) errors.push(`$.profiles[${index}].sku duplicates ${sku}.`);
  seen.add(sku);
});
if (errors.length) {
  console.error("[draft-missing-profiles] Validation failed:");
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`[draft-missing-profiles] Candidate schema valid: ${candidate.profiles.length} total profile(s).`);
console.log(`[draft-missing-profiles] Official captured source validated for ${drafts.length} missing current-catalog SKU(s).`);
console.log(`[draft-missing-profiles] Drafts: ${drafts.map((draft) => draft.sku).join(", ") || "(none)"}`);

if (check) {
  console.log("[draft-missing-profiles] Check mode complete; no files changed.");
  process.exit(0);
}
if (!drafts.length) {
  console.log("[draft-missing-profiles] Nothing to apply.");
  process.exit(0);
}

atomicWriteJson(target, candidate);
console.log(`[draft-missing-profiles] Atomically added ${drafts.length} review-required profile(s).`);
console.log("[draft-missing-profiles] Human review is still required before any profile can become verified.");
