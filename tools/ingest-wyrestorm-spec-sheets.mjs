#!/usr/bin/env node
/**
 * Governed PDF spec-sheet ingestion.
 *
 * Parses official WyreStorm spec-bearing PDFs (declared in
 * data-sources/wyrestorm/spec-sheet-manifest.json) into governed technical
 * profiles, so a product with an official spec sheet becomes compare-ready
 * without hand-typing. The pipeline is deliberately fail-closed:
 *
 * - every manifest entry must pass a SKU-identity fingerprint - the PDF's own
 *   text must contain the declared SKU, so a wrong file can never be attached
 *   to a product;
 * - only current, specifiable lead products (the shared current-catalog
 *   predicate) are drafted - discontinued, do-not-spec and accessory products
 *   keep the honesty badge's "Technical data not resolved" path;
 * - extraction is conservative: ports come from the specification section
 *   (not the flattened comparison tables), directions default to unspecified,
 *   and explicit negations (e.g. "removing USB") drop whole categories;
 * - every draft is review-required with the machine-transcription warning and
 *   the standard review checks - it renders at the official-structured tier
 *   and can only become verified through the human confirmation pass
 *   (verifiedBy), never by machine promotion;
 * - the complete candidate is schema-validated plus hard-blocked (video
 *   classes need maxResolution, AVoIP needs dependencies, matrices need
 *   routed video I/O) before an atomic write.
 *
 * Usage:
 *   node tools/ingest-wyrestorm-spec-sheets.mjs --check
 *   node tools/ingest-wyrestorm-spec-sheets.mjs --apply
 *   --file <profiles.json>  target a specific profiles payload (testing)
 *   --manifest <manifest>   target a specific manifest (testing)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { isCurrentCatalogProduct } from "./lib/current-catalog.mjs";
import {
  atomicWriteJson,
  list,
  normaliseSkuKey,
  profileClass,
  text,
  unique,
  validateSchema,
} from "./lib/wyrestorm-profile-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(root, "data-sources", "wyrestorm", "spec-sheet-manifest.json");
const CANONICAL_PATH = path.join(root, "data", "wingman-canonical-product-store.json");
const SCHEMA_PATH = path.join(root, "data", "schemas", "wyrestorm-technical-profile.schema.json");

const REVIEWER = "Wingman machine PDF transcription (NOT human-verified)";
const BLANKET_WARNING =
  "Machine-transcribed from the official spec-sheet PDF. This profile is not verified and must not support automatic equivalence or customer-ready claims.";
const INGESTABLE_TYPES = new Set(["spec-sheet", "training-brochure", "one-pager"]);
const VIDEO_CLASSES = ["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"];

// Identity aliases: a manifest SKU may legitimately appear in the PDF text
// with or without a revision suffix (e.g. "APO-VX20-UC v2" -> "APO-VX20-UC").
const SKU_ALIASES = {
  "APO-VX20-UC-V2": ["APOVX20UCV2", "APOVX20UC"],
};

function fail(message) {
  console.error(`[spec-sheet-ingest] ${message}`);
  process.exit(1);
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function identityKeys(sku) {
  return [normaliseSkuKey(sku), ...(SKU_ALIASES[sku] ?? [])];
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

async function extractPdf(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await getDocument({ data, disableWorker: true, verbosity: 0 }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent({ includeMarkedContent: false });
    pages.push({ pageNo, text: clean(content.items.map((item) => item.str || "").join(" ")) });
  }
  return { pageCount: pdf.numPages, pages, fullText: pages.map((page) => page.text).join(" \n ") };
}

// The LAST "Specification" marker is the actual spec table header (earlier
// occurrences are section titles like "Specifications & Packing List").
// Port extraction is scoped to the specification section so the flattened
// per-model comparison tables cannot leak another model's I/O into this one.
export function extractSpecSection(fullText) {
  const markers = [...fullText.matchAll(/specification/gi)].map((m) => m.index);
  const start = markers.length ? markers[markers.length - 1] : 0;
  const rest = fullText.slice(start);
  const next = rest.search(/\bTypical Connection\b|\bComparison with\b|\bWhat'?s? in the Box\b|\bQ\s*&\s*A\b|\bCompetitor Analysis\b/i);
  return next === -1 ? rest : rest.slice(0, next);
}

// ---------------------------------------------------------------------------
// Spec fact extraction (conservative, fail-closed)
// ---------------------------------------------------------------------------

export function extractResolution(text) {
  const clauses = [];
  // Bound the clause to the resolution plus optional chroma/bit depth so the
  // flattened table text cannot swallow the rest of the page into the claim.
  const re = /(\d{3,5}\s*[xX×]\s*\d{3,5}\s*@\s*\d+\s*Hz(?:\s*(?:4:2:0|4:4:4|4:2:2|8\s*bit|10\s*bit|RGB|YUV\s*4:4:4))?)/gi;
  for (const match of text.matchAll(re)) {
    clauses.push(clean(match[1]));
  }
  if (!clauses.length) {
    for (const match of text.matchAll(/\b(8K|4K\s*60|4K\s*30|4K UHD|1080p\s*60?)\b/gi)) {
      clauses.push(clean(match[1]).replace(/\s+/g, ""));
    }
  }
  return unique(clauses).join(", ");
}

export function usbNegated(text) {
  return /\b(?:no|without|remove|removing|unsupported|not supported)\s+USB\b|USB[^.]{0,40}\b(?:unsupported|not supported)\b/i.test(text);
}

const CONNECTOR_RULES = [
  { re: /(\d+)\s*[x×]\s*HDMI\s*(?:2\.\d)?/gi, category: "video", connector: (m) => clean(m[0]).replace(/^\d+\s*[x×]\s*/i, "") },
  { re: /(\d+)\s*[x×]\s*(?:RJ45|RJ-45)/gi, category: "network", connector: "RJ45 / Ethernet" },
  { re: /(\d+)\s*[x×]\s*USB[- ]?([AB])(?:\.\d)?/gi, category: "usb", connector: (m) => `USB-${m[2].toUpperCase()}` },
  { re: /(\d+)\s*[x×]\s*USB(?![- ]?[AB])(?:\.\d)?/gi, category: "usb", connector: "USB" },
  { re: /(\d+)\s*[x×]\s*IR\s*(?:In|Out)?/gi, category: "control", connector: "IR" },
  { re: /(\d+)\s*[x×]\s*RS[- ]?232/gi, category: "control", connector: "RS-232" },
  { re: /(\d+)\s*[x×]\s*(?:3|5|8)-?\s*pin\s*(?:Phoenix|Terminal|Connector)?/gi, category: "terminal", connector: "Terminal Block" },
  { re: /(\d+)\s*[x×]\s*(?:3\.5\s*mm|3\.5MM)\s*(?:analog|Audio)?/gi, category: "audio", connector: "Analog audio" },
  { re: /(\d+)\s*[x×]\s*(?:12V|24V|DC)\s*\d*\s*[AW]?/gi, category: "power", connector: "DC power" },
];

export function detectDirection(raw, windowText) {
  // The matched token itself is the reliable signal ("1x IR In", "1x IR Out");
  // the flattened text window is a fuzzy fallback that must never reach
  // another row's labels.
  const rawIn = /\bIn\b/i.test(raw);
  const rawOut = /\bOut\b/i.test(raw);
  if (rawIn || rawOut) return rawIn && rawOut ? "bidirectional" : rawIn ? "input" : "output";
  const hasIn = /\b(?:in\b|input|inputs)/i.test(windowText);
  const hasOut = /\b(?:out\b|output|outputs)/i.test(windowText);
  if (hasIn && hasOut) return "bidirectional";
  if (hasIn) return "input";
  if (hasOut) return "output";
  return "unspecified";
}

export function extractPorts(specSection, fullText) {
  const negateUsb = usbNegated(fullText);
  const rows = [];
  for (const rule of CONNECTOR_RULES) {
    for (const match of specSection.matchAll(rule.re)) {
      const count = Number(match[1]);
      if (!Number.isInteger(count) || count < 1 || count > 64) continue;
      const raw = clean(match[0]);
      if (/guide|bracket|mount|wall/i.test(raw)) continue;
      let category = rule.category;
      if (category === "terminal") {
        // "RS232 1x 3-pin Phoenix" is a control connector, not audio.
        const before = specSection.slice(Math.max(0, match.index - 20), match.index);
        category = /RS[- ]?232|serial/i.test(before) ? "control" : "audio";
      }
      if (category === "usb" && negateUsb) continue;
      const windowStart = Math.max(0, match.index - 25);
      const windowEnd = Math.min(specSection.length, match.index + raw.length + 25);
      rows.push({
        count,
        connector: typeof rule.connector === "function" ? rule.connector(match) : rule.connector,
        direction: detectDirection(raw, specSection.slice(windowStart, windowEnd)),
        category,
        detail: raw,
      });
    }
  }
  const keyed = new Map();
  for (const row of rows) {
    const key = `${row.connector}|${row.direction}|${row.category}|${row.detail}`;
    if (keyed.has(key)) keyed.get(key).count += row.count;
    else keyed.set(key, row);
  }
  return Array.from(keyed.values()).sort((a, b) => a.category.localeCompare(b.category) || a.connector.localeCompare(b.connector));
}

export function domainFragments(text, patterns) {
  const out = [];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const fragment = clean(match[0]);
      if (fragment && !out.includes(fragment)) out.push(fragment);
    }
  }
  return out.slice(0, 20);
}

export function extractDomains(fullText) {
  const usb = usbNegated(fullText) ? [] : domainFragments(fullText, [
    /\bUSB[- ]?[AB]\b|\bUSB\s*(?:2|3)\.?\d/gi,
    /\bKVM\b|\bHID\b/gi,
  ]);
  return {
    video: domainFragments(fullText, [
      /4K60\s*4:4:4|4K\s*60\s*4:4:4|8K/gi,
      /HDR10|HLG|Dolby Vision|HDR\b/gi,
      /HDCP\s*2\.\d/gi,
      /seamless switching|scaling|EDID/gi,
    ]),
    audio: domainFragments(fullText, [
      /Dante|AES67/gi,
      /analog audio|audio de-embed|3\.5mm/gi,
    ]),
    usb,
    network: domainFragments(fullText, [
      /10GbE|10G Ethernet|SDVoE/gi,
      /1GbE|1G Ethernet/gi,
      /RJ45/gi,
    ]),
    control: domainFragments(fullText, [
      /RS[- ]?232/gi,
      /\bIR\b|CEC|API\b|EDID/gi,
    ]),
    power: domainFragments(fullText, [
      /PoE\+?|PoH|PoC|802\.3at/gi,
      /12V|24V|DC\s*PSU/gi,
      /consumption/gi,
    ]),
    physical: domainFragments(fullText, [
      /\brack\b|wall mount|dimension|weight/gi,
    ]),
  };
}

export function extractTransport(sku, fullText, usb) {
  const transports = [];
  if (/^NHD-/i.test(text(sku)) || /SDVoE|AV over IP|AVoIP/i.test(fullText)) transports.push("AVoIP");
  if (/HDBaseT/i.test(fullText)) transports.push("HDBaseT");
  if (/HDMI/i.test(fullText)) transports.push("HDMI");
  if (/Dante|AES67/i.test(fullText)) transports.push("Dante");
  if (usb.length) transports.push("USB");
  if (/RS[- ]?232|IR (?:In|Out)/i.test(fullText)) transports.push("Control passthrough");
  return unique(transports).slice(0, 8);
}

export function extractDependencies(fullText, productClass) {
  if (productClass !== "AVOIP") return [];
  const dependencies = [];
  if (/10GbE|10G Ethernet|SDVoE/i.test(fullText)) dependencies.push("Requires a 10GbE SDVoE-capable managed AV network");
  if (/controller|NHD-CTL/i.test(fullText)) dependencies.push("Requires a NetworkHD controller (NHD-CTL-PRO-V2)");
  if (/PoE\+?/i.test(fullText)) dependencies.push("Can be powered from a compatible PoE+ network switch");
  return unique(dependencies);
}

// ---------------------------------------------------------------------------
// Profile building and validation
// ---------------------------------------------------------------------------

export function buildDraft(entry, extracted, canonicalProduct) {
  const specSection = extractSpecSection(extracted.fullText);
  const domains = extractDomains(extracted.fullText);
  const ports = extractPorts(specSection, extracted.fullText);
  const sku = text(entry.sku).toUpperCase();
  const productClass = profileClass({
    sku,
    productClassification: { primaryCategory: entry.category ?? "" },
  });
  const maxResolution = extractResolution(specSection);
  const role = canonicalProduct
    ? text(canonicalProduct.productClassification?.systemRole || canonicalProduct.productRole || "Role requires review")
    : "Role requires review";
  const productType = canonicalProduct
    ? text(canonicalProduct.name || canonicalProduct.title || "Product type requires review")
    : "Product type requires review";

  return {
    sku,
    status: "review-required",
    productClass,
    role,
    productType,
    transport: extractTransport(sku, extracted.fullText, domains.usb),
    ...(maxResolution ? { maxResolution } : {}),
    ports,
    video: domains.video,
    audio: domains.audio,
    usb: domains.usb,
    network: domains.network,
    control: domains.control,
    power: domains.power,
    physical: domains.physical,
    dependencies: extractDependencies(extracted.fullText, productClass),
    compatibleFamilies: [],
    checks: [
      "Human-review the official spec-sheet PDF and the current official product page before promoting this profile.",
      "Confirm all I/O counts, signal directions, performance limits, included accessories and mandatory dependencies before quotation.",
      "Confirm lifecycle, firmware, regional variant, power supply, mounting and cable requirements before customer issue.",
    ],
    warnings: [BLANKET_WARNING],
    evidence: [{
      sourceType: "official-spec-sheet-pdf",
      sourceUrl: text(entry.sourceUrl),
      reviewedOn: text(entry.reviewedOn),
      reviewer: REVIEWER,
      note: `Machine transcription from the official PDF spec sheet (${path.basename(String(entry.pdf ?? "").trim())}, ${extracted.pageCount} page(s)). Port directions and exact counts require human confirmation.`,
    }],
  };
}

export function hardBlock(profile) {
  if (VIDEO_CLASSES.includes(profile.productClass) && !String(profile.maxResolution ?? "").trim()) return "no-maxResolution";
  if (profile.productClass === "AVOIP" && !(profile.dependencies ?? []).length) return "no-dependencies";
  if (profile.productClass === "MATRIX") {
    const hasVideoIn = (profile.ports ?? []).some((port) => port.category === "video" && port.direction === "input");
    const hasVideoOut = (profile.ports ?? []).some((port) => port.category === "video" && port.direction === "output");
    if (!hasVideoIn || !hasVideoOut) return "no-video-ports";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
const args = process.argv.slice(2);
const check = args.includes("--check");
const apply = args.includes("--apply");
const fileArg = args.indexOf("--file");
const manifestArg = args.indexOf("--manifest");
const valueArgs = new Set();
if (fileArg >= 0 && args[fileArg + 1]) valueArgs.add(args[fileArg + 1]);
if (manifestArg >= 0 && args[manifestArg + 1]) valueArgs.add(args[manifestArg + 1]);
const unknown = args.filter((argument) => !["--check", "--apply", "--file", "--manifest"].includes(argument) && !valueArgs.has(argument));
if (unknown.length) fail(`Unknown argument(s): ${unknown.join(", ")}`);
if (check === apply) fail("Choose exactly one mode: --check or --apply.");

const targetPath = fileArg >= 0 ? path.resolve(args[fileArg + 1]) : path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const manifestPath = manifestArg >= 0 ? path.resolve(args[manifestArg + 1]) : MANIFEST_PATH;
for (const filePath of [manifestPath, CANONICAL_PATH, SCHEMA_PATH, targetPath]) {
  if (!fs.existsSync(filePath)) fail(`Missing required file: ${filePath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, "utf8"));
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const payload = JSON.parse(fs.readFileSync(targetPath, "utf8"));
const existing = new Set(payload.profiles.map((profile) => text(profile.sku).toUpperCase()));
const productBySku = new Map(canonical.products.map((product) => [text(product.sku).toUpperCase(), product]));
const baseDir = text(manifest.baseDir || "public/product-docs");

const report = { covered: [], draftable: [], excluded: [], notInCanonical: [], errors: [] };
for (const entry of list(manifest.entries)) {
  if (!INGESTABLE_TYPES.has(text(entry.documentType))) continue;
  const sku = text(entry.sku).toUpperCase();
  if (!sku) {
    report.errors.push("Manifest entry without a SKU.");
    continue;
  }
  const pdfRelative = String(entry.pdf ?? "").trim();
  const pdfPath = path.join(root, baseDir, pdfRelative);
  if (!fs.existsSync(pdfPath)) {
    report.errors.push(`${sku}: missing PDF ${pdfRelative}`);
    continue;
  }

  let extracted;
  try {
    extracted = await extractPdf(pdfPath);
  } catch (error) {
    report.errors.push(`${sku}: PDF parse failed - ${error.message}`);
    continue;
  }

  const textKey = normaliseSkuKey(extracted.fullText);
  if (!identityKeys(sku).some((key) => textKey.includes(key))) {
    report.errors.push(`${sku}: PDF text does not mention the SKU (fingerprint mismatch) - ${path.basename(pdfRelative)}`);
    continue;
  }

  if (existing.has(sku)) {
    report.covered.push(sku);
    continue;
  }

  const canonicalProduct = productBySku.get(sku);
  if (!canonicalProduct) {
    report.notInCanonical.push(`${sku} - add the product to the data sources before ingesting`);
    continue;
  }
  if (!isCurrentCatalogProduct(canonicalProduct)) {
    report.excluded.push(`${sku} (${text(canonicalProduct.lifecycleStatus)}${canonicalProduct.doNotSpec ? ", do-not-spec" : ""})`);
    continue;
  }

  const draft = buildDraft(entry, extracted, canonicalProduct);
  const block = hardBlock(draft);
  if (block) {
    report.errors.push(`${sku}: extraction cannot honestly satisfy "${block}" - hold for human data`);
    continue;
  }
  report.draftable.push(draft);
}

const candidate = structuredClone(payload);
candidate.profiles.push(...report.draftable);
candidate.profiles.sort((a, b) => text(a.sku).localeCompare(text(b.sku)));
const errors = [...report.errors, ...validateSchema(candidate, schema)];
const seen = new Set();
candidate.profiles.forEach((profile, index) => {
  const sku = text(profile.sku).toUpperCase();
  if (seen.has(sku)) errors.push(`$.profiles[${index}].sku duplicates ${sku}.`);
  seen.add(sku);
});

console.log(`[spec-sheet-ingest] Manifest: ${list(manifest.entries).length} entries | ${report.covered.length} already profiled | ${report.draftable.length} draftable | ${report.excluded.length} excluded (not current/specifiable) | ${report.notInCanonical.length} not in canonical store | ${report.errors.length} error(s).`);
if (report.draftable.length) {
  console.log(`[spec-sheet-ingest] Would draft: ${report.draftable.map((draft) => draft.sku).join(", ")}`);
}
if (report.excluded.length) console.log(`[spec-sheet-ingest] Excluded: ${report.excluded.join(", ")}`);
if (report.notInCanonical.length) console.log(`[spec-sheet-ingest] Not in canonical store: ${report.notInCanonical.join("; ")}`);

if (errors.length) {
  console.error("[spec-sheet-ingest] Validation failed:");
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

if (check) {
  if (report.draftable.length) {
    console.error("[spec-sheet-ingest] Gate FAILED: spec sheets exist for current products without a governed profile. Run `--apply` to draft them as review-required, then the govern chain.");
    process.exit(1);
  }
  console.log("[spec-sheet-ingest] Check mode complete; gate OK.");
  process.exit(0);
}

if (!report.draftable.length) {
  console.log("[spec-sheet-ingest] Nothing to apply.");
  process.exit(0);
}

candidate.updatedAt = text(manifest.updatedAt || "2026-08-16");
candidate.version = Number(payload.version ?? 1) + 1;
atomicWriteJson(targetPath, candidate);
console.log(`[spec-sheet-ingest] Atomically added ${report.draftable.length} review-required profile(s) to ${path.relative(root, targetPath)} (version -> ${candidate.version}).`);
console.log("[spec-sheet-ingest] Human review is still required before any profile can become verified.");
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    console.error("[spec-sheet-ingest] Failed.");
    console.error(error);
    process.exitCode = 1;
  });
}
