// Infers HDMI/HDBaseT version numbers from ALREADY-CONFIRMED, already-sourced
// technical facts (stated bandwidth in Gbps, stated max resolution + chroma,
// stated transport distance, stated port/output types) using deterministic,
// well-established industry facts for each standard generation:
//
//   HDMI 1.4  -> 10.2 Gbps max  (no uncompressed 4K60 4:4:4)
//   HDMI 2.0  -> 18 Gbps max    (enables uncompressed 4K60 4:4:4 8-bit)
//   HDMI 2.1  -> 40-48 Gbps FRL (enables 8K60 / 4K120+)
//
//   HDBaseT Spec 1.0 -> 1080p to 100m, 4K to 70m (Cat5e+), no formal USB spec
//   HDBaseT Spec 2.0 -> 4K30 4:4:4 / 4K60 4:2:0 (compressed/subsampled) to
//                       100m over Cat6 (90m Cat5e); added USB 2.0 extension
//   HDBaseT Spec 3.0 -> the ONLY generation that supports fully uncompressed
//                       4K60 4:4:4 (18Gbps) to 100m; recommends Cat6a
//   (Source: hdbaset.org official "HDBaseT Standard Specifications", the
//   HDBaseT Alliance's own technology page.)
//
// This is NOT fabrication: every inferred value is a deterministic consequence
// of a fact the row ALREADY states (bandwidth/resolution/chroma/port type),
// not a guess. Every inferred fact is tagged with an explicit "...Evidence":
// "inferred" marker inside specs_json so it stays distinguishable from a
// directly vendor-confirmed number, and a short note is appended to
// known_limitations explaining the basis.
//
// CRITICAL GATE: HDBaseT inference only applies to products that actually
// HAVE an HDBaseT/twisted-pair port. AVoIP (network/1GbE), fiber, and local
// HDMI-only matrix/distribution products do NOT use HDBaseT transport even
// when they share similar bandwidth/resolution/compression characteristics -
// applying HDBaseT class logic to them would be a fabrication, not an
// inference. A row only qualifies if its inputs_json/outputs_json,
// technology, or transport_type field literally names an HDBaseT-family
// port/technology (HDBaseT, HDBT, DTP/DTP2/DTP3, DM 8G+/DM-NVX is explicitly
// EXCLUDED since that's Crestron's AVoIP line despite the "DM" prefix).
//
// Ambiguous cases (no reliable disambiguating signal, an explicit "Verify"
// placeholder already in the row, or a vendor-proprietary compression scheme
// like AVPro Edge's ICT that doesn't map cleanly to a spec-body class) are
// left untouched rather than guessed.
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

function bandwidthNumber(v) {
  const m = String(v ?? "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function safeParseArray(json) {
  if (!json || !json.trim()) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Explicit, narrow gate: does this row have real evidence of an HDBaseT
// (twisted-pair) port, as opposed to AVoIP/fiber/local-HDMI-only transport?
function hasHdbasetPort(row, specs) {
  const hdbasetPortPattern = /\bhdbase[-\s]?t\b|\bhdbt\b|\bdtp2?3?\b|\bdtp[-\s]?\d\b/i;
  const inputs = safeParseArray(row.inputs_json);
  const outputs = safeParseArray(row.outputs_json);
  const portTypes = [...inputs, ...outputs].map((p) => String(p?.type ?? ""));
  if (portTypes.some((t) => hdbasetPortPattern.test(t))) return true;
  if (hdbasetPortPattern.test(clean(row.technology))) return true;
  if (hdbasetPortPattern.test(clean(row.transport_type))) return true;
  // Already-populated distance sub-keys explicitly naming hdbaset (e.g.
  // "hdbasetMetersAt4k60444") are also acceptable evidence.
  const specsKeys = JSON.stringify(specs ?? {});
  if (/hdbaset|hdbt/i.test(specsKeys.replace(/"hdbasetEvidence"[^,}]*/gi, ""))) return true;
  return false;
}

function inferHdmi(specs, maxResolution, chroma, notes) {
  const bw = bandwidthNumber(specs?.video?.bandwidthGbps);
  const text = `${maxResolution ?? ""} ${chroma ?? ""}`.toLowerCase();
  const proprietaryCompression = /\bict\b|invisible compression|proprietary compression|motion jpeg|compressed/i.test(notes ?? "");
  const unverified = /verify/i.test(text);
  if (unverified) return null;

  if (bw != null) {
    if (bw >= 38) return { value: "2.1", basis: `inferred from stated ${specs.video.bandwidthGbps}Gbps bandwidth (HDMI 2.1 FRL range)` };
    if (bw >= 16 && bw <= 20) return { value: "2.0", basis: `inferred from stated ${specs.video.bandwidthGbps}Gbps bandwidth (HDMI 2.0 max)` };
    if (bw >= 9 && bw <= 11) return { value: "1.4", basis: `inferred from stated ${specs.video.bandwidthGbps}Gbps bandwidth (HDMI 1.4 max)` };
  }

  if (/\b8k\b|4k\s*1[2-9]\d\b|4k120|10k\b/i.test(text)) {
    return { value: "2.1", basis: "inferred: stated resolution (8K / 4K120+) exceeds HDMI 2.0's 18Gbps ceiling, requires 2.1 FRL" };
  }
  if (!proprietaryCompression && /4k.?60/.test(text) && /4:4:4/.test(text)) {
    return { value: "2.0", basis: "inferred: stated 4K60 4:4:4 (uncompressed) exceeds HDMI 1.4's 10.2Gbps ceiling, requires minimum HDMI 2.0" };
  }
  return null;
}

function distanceNumbers(specs) {
  const d = specs?.distance;
  if (!d || typeof d !== "object") return [];
  return Object.values(d).filter((v) => typeof v === "number");
}

function inferHdbaset(row, specs, maxResolution, chroma, notes) {
  if (!hasHdbasetPort(row, specs)) return null;

  const bw = bandwidthNumber(specs?.video?.bandwidthGbps);
  const text = `${maxResolution ?? ""} ${chroma ?? ""}`.toLowerCase();
  const proprietaryCompression = /\bict\b|invisible compression|proprietary compression|compressed|motion jpeg/i.test(notes ?? "");
  const unverified = /verify/i.test(text) || /verify/i.test(JSON.stringify(specs ?? {}));
  if (unverified) return null;

  const is444Uncompressed = /4:4:4/.test(text) && /4k.?60/.test(text);
  if (bw != null && bw >= 16 && bw <= 20 && is444Uncompressed && !proprietaryCompression) {
    return {
      value: "3.0",
      basis: `inferred from stated ${specs.video.bandwidthGbps}Gbps bandwidth + uncompressed 4K60 4:4:4 over a confirmed HDBaseT port (only HDBaseT 3.0 supports this per HDBaseT Alliance spec)`,
    };
  }

  // Compressed/subsampled delivery over a confirmed HDBaseT port at a
  // distance consistent with the 2.0-era 90-100m Cat6 profile (per HDBaseT
  // Alliance: "2.0 ... 100m/328ft over Cat6, 90m/295ft over Cat5e"), OR
  // explicit USB extension evidence (2.0 added USB 2.0 to the 5Play set).
  const compressedDelivery = (proprietaryCompression || /4:2:0/.test(text) || /4k.?30/.test(text)) && /4k/.test(text);
  const dists = distanceNumbers(specs);
  const distanceMatches2_0Profile = dists.some((m) => m >= 90);
  const hasUsbSignal = /\busb\b/i.test(JSON.stringify(specs?.usb ?? {})) || /\busb\b/i.test(notes ?? "");
  if (compressedDelivery && !is444Uncompressed && (distanceMatches2_0Profile || hasUsbSignal)) {
    return {
      value: "2.0",
      basis: "inferred: compressed/subsampled 4K delivery over a confirmed HDBaseT port, with a 90m+ Cat6 distance profile and/or USB extension present (both HDBaseT 2.0 hallmarks per HDBaseT Alliance spec)",
    };
  }
  return null;
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".csv"));
let hdmiFixed = 0;
let hdbasetFixed = 0;
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
    specs.video = specs.video || {};

    const notesBlob = `${row.notes ?? ""} ${row.known_limitations ?? ""} ${row.summary ?? ""}`;
    let rowChanged = false;
    const addedNotes = [];

    if (!clean(specs.video.hdmi)) {
      const inferred = inferHdmi(specs, row.max_resolution, specs.video.chroma || row.chroma, notesBlob);
      if (inferred) {
        specs.video.hdmi = inferred.value;
        specs.video.hdmiEvidence = "inferred";
        rowChanged = true;
        hdmiFixed += 1;
        addedNotes.push(`HDMI ${inferred.value} ${inferred.basis}.`);
        details.push(`${row.manufacturer}|${row.model}: hdmi=${inferred.value}`);
      }
    }

    if (!clean(specs.video.hdbaset)) {
      const inferred = inferHdbaset(row, specs, row.max_resolution, specs.video.chroma || row.chroma, notesBlob);
      if (inferred) {
        specs.video.hdbaset = inferred.value;
        specs.video.hdbasetEvidence = "inferred";
        rowChanged = true;
        hdbasetFixed += 1;
        addedNotes.push(`HDBaseT ${inferred.value} ${inferred.basis}.`);
        details.push(`${row.manufacturer}|${row.model}: hdbaset=${inferred.value}`);
      }
    }

    if (!rowChanged) return row;
    changed = true;
    const newKnownLimitations = clean(row.known_limitations)
      ? `${row.known_limitations} ${addedNotes.join(" ")}`
      : addedNotes.join(" ");
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

console.log(`HDMI versions inferred: ${hdmiFixed}`);
console.log(`HDBaseT versions inferred: ${hdbasetFixed}`);
console.log(details.join("\n"));
