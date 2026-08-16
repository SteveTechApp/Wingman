#!/usr/bin/env node
// tools/separate-port-accessories.mjs
//
// Splits included box contents out of technicalProfile.io.ports at the
// enrichment source and dedupes the duplicated connector text the original
// port-line parser produced (e.g. "3.5mm Analog Stereo 1x 3.5mm Analog
// Stereo", "EXP-MX-0402-H2 Matrix 1x EXP-MX-0402-H2 Matrix").
//
// Background: the port-line parser (enrich-wyrestorm-product-intelligence.mjs
// extractPorts) swept box contents - power supplies, cables, mounts, guides,
// remotes - into io.ports, and built connector labels by prepending the
// compact "Nx <connector>" match to the full source line, which repeats the
// phrase. The compare engine's accessory filter then had to guess which rows
// were real ports, and its /terminal block/ and USB-version heuristics wrongly
// dropped real control/audio/USB connectors.
//
// This tool applies the durable fix to the currently committed data:
//   - rows with no physical-connector signal (box contents, capability text,
//     product-name rows) move to io.accessories;
//   - rows that describe a real connector survive, with deduped labels;
//   - duplicate rows collapse;
//   - io.video/audio/usb/network/control/other are regrouped from the clean
//     port list so downstream consumers never see accessories;
//   - product connectors[] and machine-derived sourceCatalog.inputs/outputs
//     are refreshed from the clean port list;
//   - the product-data manifest hash for enrichment.json is refreshed.
//
// Idempotent: re-running after a fix produces no further changes.
//
// Usage:
//   node tools/separate-port-accessories.mjs            # check (report only)
//   node tools/separate-port-accessories.mjs --apply    # back up + apply

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");

const FILES = [
  { path: "data-sources/wyrestorm/enrichment.json", pretty: true },
  { path: "data/wingman-canonical-product-store.json", pretty: true },
  { path: "public/product-intelligence-index.json", pretty: false },
];

// A row describes a physical connector when its text carries a connector
// signal. Rows that also mention box contents (a bundled cable, a power cord)
// still describe the real connector and must survive the split.
const CONNECTOR_SIGNAL =
  /\bhdmi\b|hdbaset|displayport|\bsdi\b|\bvga\b|\bdvi\b|usb[- ]?[abc]\b|usb\s+\d(?:\.\d)?\b|rj-?45|ethernet|\blan\b|rs-?232|phoenix|screw\s*down|\d+\s*-?\s*pin\b|terminal block|3\.5mm|toslink|spdif|\bsfp\b|fibre|fiber|dante|aes67|\bir\b|\bcec\b|\brelay\b|\bgpio\b|\bline\b|speaker|balanced|composite|optical|mini din|receptacle|socket|jack\b|female|male\b|bnc\b|xlr\b|rca\b|component|\btrs\b|combo\b/i;

// Box contents: only accessories when they do NOT describe a connector.
const BOX_CONTENT =
  /power supply|power adapter|\bpsu\b|dc\s+\d+\s*v|ac\s+power|\bmains\b|adapter\b|quick\s*start|user guide|\bmanual\b|warranty|mounting|\bmount\b|bracket|wall\s+mount|rack\s+mount|desktop\s+stand|lens cap|cable ties|reusable cable tie|remote control|handset|screw\b|sticker|label\b|rubber|\bfoot\b|\bfeet\b|battery|receiver unit|transmitter unit|\bkit\b|power cord|plug\b|cable pack|screwdriver|included\b/i;

// Capability or marketing text that is not a physical port (supported
// resolutions, zoom/watt/mic-array specs, USB bandwidth prose).
const CAPABILITY_ONLY =
  /\d{3,4}\s*[x×]\s*\d{3,4}|zoom\b|lens\b|watt\b|mic array|mems|\bhz\b|4:4:4|4:2:0|bandwidth|superspeed|10gbps|20gbps|\bhdr\b|\bedid\b|passthrough|up to\s+\d+|endpoints?|tiers?\b|device\s+limit|hub\s+limit|max(?:imum)?\s+hubs?/i;

const IO_CATEGORIES = ["video", "audio", "usb", "network", "control", "other"];
const DUP_MARKER = /\b1x\b.*\b1x\b|\d+x\s+\S+\s+\d+x\b/i;

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

// Collapse the "X 1x X" / "X 2x X 2x X" duplication the parser produced by
// keeping the longest distinct phrase and stripping a leading count prefix.
function dedupeConnector(raw) {
  let text = clean(raw).replace(/^\d+\s*x\s*/i, "");
  const segments = text
    .split(/\s+\d+x\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length > 1) {
    text = segments.sort((a, b) => b.length - a.length)[0];
  }
  return text;
}

function isAccessoryText(text, sku) {
  const value = lower(text);
  if (CONNECTOR_SIGNAL.test(value)) return false;
  if (sku && value.includes(lower(sku))) return true;
  if (BOX_CONTENT.test(value)) return true;
  if (CAPABILITY_ONLY.test(value)) return true;
  return false;
}

function machineDerivedIoText(value) {
  const text = String(value ?? "");
  return BOX_CONTENT.test(text) || CAPABILITY_ONLY.test(text) || DUP_MARKER.test(text);
}

function uniqueBySig(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item) continue;
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function cleanProductIo(product, stats) {
  const profile = product?.technicalProfile;
  const io = profile?.io && typeof profile.io === "object" ? profile.io : null;
  if (!io) return;

  const rows = [];
  for (const key of ["ports", ...IO_CATEGORIES, "accessories"]) {
    if (Array.isArray(io[key])) rows.push(...io[key]);
  }
  const master = uniqueBySig(rows);
  if (master.length === 0) return;

  const sku = String(product.sku || product.id || "");
  const kept = [];
  const accessories = [];
  let deduped = 0;

  for (const row of master) {
    const connector = dedupeConnector(row.connector);
    const next = connector === clean(row.connector) ? row : { ...row, connector };
    if (next !== row) deduped += 1;
    if (isAccessoryText(`${next.connector} ${next.evidence}`, sku)) {
      accessories.push(next);
    } else {
      kept.push(next);
    }
  }

  // Byte-idempotent change detection: compare the would-be io state against
  // the current one so re-runs after a fix produce no further changes.
  const nextIo = { ports: kept };
  for (const key of IO_CATEGORIES) {
    const list = kept.filter((port) => {
      const category = String(port.category || "other").toLowerCase();
      return (IO_CATEGORIES.includes(category) ? category : "other") === key;
    });
    if (list.length > 0) nextIo[key] = list;
  }
  if (accessories.length > 0) nextIo.accessories = accessories;
  const currentIo = { ports: Array.isArray(io.ports) ? io.ports : [] };
  for (const key of IO_CATEGORIES) {
    if (Array.isArray(io[key]) && io[key].length > 0) currentIo[key] = io[key];
  }
  if (Array.isArray(io.accessories) && io.accessories.length > 0) currentIo.accessories = io.accessories;
  if (JSON.stringify(currentIo) === JSON.stringify(nextIo)) return;

  stats.productsChanged += 1;
  stats.rowsMovedToAccessories += accessories.length;
  stats.rowsDeduped += deduped;

  io.ports = kept;
  for (const key of IO_CATEGORIES) delete io[key];
  for (const port of kept) {
    const category = String(port.category || "other").toLowerCase();
    const target = IO_CATEGORIES.includes(category) ? category : "other";
    if (!Array.isArray(io[target])) io[target] = [];
    io[target].push(port);
  }
  if (accessories.length > 0) {
    io.accessories = accessories;
  } else {
    delete io.accessories;
  }

  // Refresh the flat connectors[] list: drop accessory entries, dedupe labels.
  if (Array.isArray(product.connectors)) {
    const before = product.connectors.length;
    const seen = new Set();
    product.connectors = product.connectors
      .map(dedupeConnector)
      .filter((connector) => {
        if (!connector) return false;
        if (isAccessoryText(connector, sku)) return false;
        const key = lower(connector);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (product.connectors.length !== before) stats.connectorsChanged += 1;
  }

  // Refresh machine-derived sourceCatalog inputs/outputs from the clean ports.
  const sc = product.sourceCatalog && typeof product.sourceCatalog === "object" ? product.sourceCatalog : null;
  if (sc && machineDerivedIoText(sc.inputs) && machineDerivedIoText(sc.outputs)) {
    const format = (direction) =>
      kept
        .filter((port) => String(port.direction || "").toLowerCase() === direction)
        .map((port) => `${port.count}x ${port.connector}`)
        .join(", ");
    const nextInputs = format("input");
    const nextOutputs = format("output");
    if (nextInputs !== String(sc.inputs ?? "") || nextOutputs !== String(sc.outputs ?? "")) {
      sc.inputs = nextInputs;
      sc.outputs = nextOutputs;
      stats.sourceCatalogRefreshed += 1;
    }
  }
}

function stringify(payload, pretty) {
  return `${JSON.stringify(payload, null, pretty ? 2 : 0)}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function payloadToArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.records)) return payload.records;
  return [];
}

async function hashFile(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function main() {
  const total = {
    productsScanned: 0,
    productsChanged: 0,
    rowsMovedToAccessories: 0,
    rowsDeduped: 0,
    connectorsChanged: 0,
    sourceCatalogRefreshed: 0,
  };

  const fileResults = [];

  for (const file of FILES) {
    const filePath = path.join(root, file.path);
    const payload = await readJson(filePath);
    const stats = {
      productsChanged: 0,
      rowsMovedToAccessories: 0,
      rowsDeduped: 0,
      connectorsChanged: 0,
      sourceCatalogRefreshed: 0,
    };
    for (const product of payloadToArray(payload)) {
      total.productsScanned += 1;
      cleanProductIo(product, stats);
    }
    fileResults.push({ file, payload, stats });
    for (const key of ["productsChanged", "rowsMovedToAccessories", "rowsDeduped", "connectorsChanged", "sourceCatalogRefreshed"]) {
      total[key] += stats[key];
    }
  }

  console.log(`[separate-port-accessories] products scanned: ${total.productsScanned}`);
  console.log(`[separate-port-accessories] products changed: ${total.productsChanged}`);
  console.log(`[separate-port-accessories] rows moved to io.accessories: ${total.rowsMovedToAccessories}`);
  console.log(`[separate-port-accessories] connector labels deduped: ${total.rowsDeduped}`);
  console.log(`[separate-port-accessories] connectors[] refreshed: ${total.connectorsChanged}`);
  console.log(`[separate-port-accessories] sourceCatalog I/O refreshed: ${total.sourceCatalogRefreshed}`);
  for (const { file, stats } of fileResults) {
    const changed = Object.values(stats).some((count) => count > 0);
    console.log(`[separate-port-accessories] ${file.path}: ${changed ? "CHANGED" : "unchanged"}`);
  }

  if (!apply) {
    console.log("[separate-port-accessories] Check mode - no files written. Re-run with --apply to apply.");
    return;
  }

  const backupDir = path.join(
    root,
    "backups",
    `port-accessories-split-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  await fs.mkdir(backupDir, { recursive: true });
  for (const { file } of fileResults) {
    await fs.copyFile(path.join(root, file.path), path.join(backupDir, path.basename(file.path)));
  }

  for (const { file, payload, stats } of fileResults) {
    if (!Object.values(stats).some((count) => count > 0)) continue;
    await fs.writeFile(path.join(root, file.path), stringify(payload, file.pretty), "utf8");
  }

  const enrichmentChanged = fileResults.some(
    ({ file, stats }) => file.path.endsWith("enrichment.json") && Object.values(stats).some((count) => count > 0),
  );
  if (enrichmentChanged) {
    const manifestPath = path.join(root, "data/catalog/product-data-manifest.generated.json");
    const manifest = await readJson(manifestPath);
    if (manifest.hashes) {
      manifest.hashes["data-sources/wyrestorm/enrichment.json"] = await hashFile(
        path.join(root, "data-sources/wyrestorm/enrichment.json"),
      );
      await fs.writeFile(manifestPath, stringify(manifest, true), "utf8");
      console.log("[separate-port-accessories] manifest hash refreshed for data-sources/wyrestorm/enrichment.json");
    }
  }

  console.log(`[separate-port-accessories] Applied. Backup: ${backupDir}`);
}

main().catch((error) => {
  console.error("[separate-port-accessories] Failed:", error);
  process.exit(1);
});
