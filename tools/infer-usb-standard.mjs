// Infers the USB data-transfer standard (USB 2.0 / 3.0) for competitor
// products that mention USB extension/routing/KVM but never state a version,
// using two deterministic, sourced constraints - not a guess about USB-C
// connectors or USB-as-a-source-port, which genuinely don't imply a version:
//
//   1. HDBaseT's own "5Play" feature set explicitly defines its USB
//      extension capability as USB 2.0 (confirmed via the HDBaseT Alliance's
//      own technology page: "USB 2.0 extension support was added to 5Play").
//      Any product that extends/routes/hosts USB THROUGH a confirmed
//      HDBaseT port is therefore extending USB 2.0, by the spec's own
//      definition - not an assumption about the specific product.
//
//   2. A 1GbE-class AVoIP network (not 10G) physically cannot carry USB
//      3.0's 5Gbps signal alongside video traffic - 1000Mbps total bandwidth
//      is already mostly consumed by the compressed video stream. Any
//      "USB/KVM-over-IP" extension claim on a confirmed 1GbE AVoIP product is
//      therefore necessarily USB 2.0 (480Mbps max) by bandwidth arithmetic.
//
// Explicitly NOT inferred: a bare "USB-C" mention (a USB-C connector alone
// says nothing about the data standard behind it - could be 2.0, 3.1, or
// pure DisplayPort Alt Mode with no USB data channel at all), USB-as-a-
// power-source mentions, and any camera-class product (different, unverified
// engineering domain, consistent with the earlier chroma-inference pass).
//
// Every inferred value is tagged with a "usbEvidence": "inferred" marker and
// a reasoned note appended to known_limitations, following the same pattern
// as the HDMI/HDBaseT/chroma passes.
import fs from "node:fs";
import path from "node:path";
import { readCsv } from "./product-update-utils.mjs";

const root = process.cwd();
const dir = path.join(root, "data-sources/competitors");

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
function clean(v) { return String(v ?? "").replace(/\s+/g, " ").trim(); }

function safeParseArray(json) {
  if (!json || !json.trim()) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const SKIP_TECH = /^camera$/i;

// Reuse the same narrow, port-evidence-based HDBaseT gate established in
// infer-hdmi-hdbaset-versions.mjs, rather than trusting the "technology"
// label alone (which is often generic - MATRIX, PRESENTATION, etc. - even
// for products that do have a real HDBaseT port).
function hasHdbasetPort(row) {
  const hdbasetPortPattern = /\bhdbase[-\s]?t\b|\bhdbt\b|\bdtp2?3?\b|\bdtp[-\s]?\d\b/i;
  const inputs = safeParseArray(row.inputs_json);
  const outputs = safeParseArray(row.outputs_json);
  const portTypes = [...inputs, ...outputs].map((p) => String(p?.type ?? ""));
  if (portTypes.some((t) => hdbasetPortPattern.test(t))) return true;
  if (hdbasetPortPattern.test(clean(row.technology))) return true;
  if (hdbasetPortPattern.test(clean(row.transport_type))) return true;
  return false;
}

// USB *extension/routing* context - actual USB data being carried across a
// distance/network, as opposed to a plain USB-C source-input connector.
const USB_EXTENSION_CONTEXT = /usb\s*(?:host|hub|routing|extension|-?kvm|hid)|kvm\s*\(?\s*usb|usb[\s-]*over[\s-]*ip|usb\/(?:ir|rs-?232)|(?:ir|rs-?232)\/usb|usb.{0,15}touch-?back/i;

function inferUsbStandard(row, specs) {
  const technology = clean(row.technology);
  if (SKIP_TECH.test(technology)) return null;

  const blob = [row.summary, row.known_limitations, row.notes, row.technology, row.features_json]
    .map(clean)
    .join(" ");

  if (!USB_EXTENSION_CONTEXT.test(blob)) return null; // bare "USB-C" source port only - not inferable

  if (hasHdbasetPort(row)) {
    return {
      value: "USB 2.0",
      basis: "inferred: extends USB through a confirmed HDBaseT port - the HDBaseT 5Play spec defines its USB extension capability as USB 2.0",
    };
  }

  const isAvoip = /avoip/i.test(technology) || /avoip/i.test(clean(row.transport_type));
  if (isAvoip) {
    const networkSpeed = clean(specs?.networkSpeed || specs?.network?.speed || row.transport_type);
    const is10g = /10\s*g/i.test(networkSpeed) || /10\s*g/i.test(blob);
    const is1g = /1\s*g(?:be|b\b)|1gbe|gigabit/i.test(networkSpeed) || /1\s*g(?:be|b\b)|1gbe|gigabit/i.test(blob);
    if (is1g && !is10g) {
      return {
        value: "USB 2.0",
        basis: "inferred: extends USB/KVM over a confirmed 1GbE AVoIP network - USB 3.0 (5Gbps) cannot fit within a 1Gbps network budget alongside video",
      };
    }
  }

  return null;
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".csv"));
let fixed = 0;
const details = [];

for (const file of files) {
  const relPath = "data-sources/competitors/" + file;
  const absPath = path.join(root, relPath);
  const rawText = fs.readFileSync(absPath, "utf8");
  const hasBom = rawText.charCodeAt(0) === 0xfeff;
  const rows = readCsv(relPath);
  const headerLine = rawText.split(/\r?\n/, 1)[0].replace(/^\uFEFF/, "");
  const headers = headerLine.split(",").map((h) => h.replace(/^"|"$/g, ""));

  let changed = false;
  const outRows = rows.map((row) => {
    let specs = {};
    if (row.specs_json && row.specs_json.trim()) {
      try { specs = JSON.parse(row.specs_json); } catch { return row; }
    }
    specs.usb = specs.usb || {};
    if (clean(specs.usb.standard)) return row; // already has it

    // Some rows already recorded the version under a non-standard key
    // (e.g. specs.usb.ports = "3x USB-A 3.0 + 1x USB-B 3.0") - extract that
    // directly rather than re-inferring, since it's already a stated fact.
    const existingPortsText = clean(specs.usb.ports || specs.usb.port || "");
    const explicitMatch = existingPortsText.match(/usb[\s-]*[ab]?\s*(2\.0|3\.0|3\.1|3\.2)/i);
    if (explicitMatch) {
      specs.usb.standard = "USB " + explicitMatch[1];
      fixed += 1;
      changed = true;
      details.push(`${row.manufacturer}|${row.model}: usb.standard=USB ${explicitMatch[1]} (extracted from existing specs.usb.ports="${existingPortsText}")`);
      return { ...row, specs_json: JSON.stringify(specs) };
    }

    const inferred = inferUsbStandard(row, specs);
    if (!inferred) return row;

    specs.usb.standard = inferred.value;
    specs.usb.evidence = "inferred";
    fixed += 1;
    details.push(`${row.manufacturer}|${row.model}: usb.standard=${inferred.value} (${inferred.basis})`);

    changed = true;
    const note = `${inferred.value} ${inferred.basis}.`;
    const newKnownLimitations = clean(row.known_limitations)
      ? `${row.known_limitations} ${note}`
      : note;
    return { ...row, specs_json: JSON.stringify(specs), known_limitations: newKnownLimitations };
  });

  if (!changed) continue;
  const lines = [headerLine];
  for (const row of outRows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  const content = (hasBom ? "﻿" : "") + lines.join("\r\n") + "\r\n";
  fs.writeFileSync(absPath, content, "utf8");
}

console.log(`USB standards fixed/inferred: ${fixed}`);
console.log(details.join("\n"));
