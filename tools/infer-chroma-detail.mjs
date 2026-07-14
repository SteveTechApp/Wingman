// Infers the chroma-subsampling qualifier (4:4:4 / 4:2:0) for competitor
// products that already state a resolution + refresh rate (e.g. "4K60",
// "4K30", "1080p60") but not the subsampling detail, using deterministic
// bandwidth physics for each case - the same non-fabricating approach used
// for the HDMI/HDBaseT version gap:
//
//   4K60 (3840x2160 or 4096x2160) fully uncompressed 4:4:4 8-bit needs
//   ~17.8Gbps - i.e. requires HDMI 2.0/2.1-class bandwidth (>=16Gbps) or a
//   confirmed 18Gbps+ figure. If only HDMI 1.4/1.3/1.2 (10.2Gbps or less) is
//   confirmed, 4K60 is physically impossible at 4:4:4 and MUST be delivered
//   chroma-subsampled (4:2:0).
//
//   4K30 fits comfortably inside even HDMI 1.4's 10.2Gbps at 4:4:4, so a
//   bare "4K30" on a direct HDMI/HDBaseT-transport product is treated as
//   4:4:4 by default (no vendor subsamples where there's no bandwidth need).
//
//   1080p (any HDMI generation) is always full 4:4:4 in modern gear - the
//   bandwidth is trivial at any HDMI version, so subsampling wouldn't be
//   used.
//
//   8K60 at a confirmed ~40-48Gbps HDMI 2.1 FRL figure (no DSC mentioned)
//   cannot fit full uncompressed 4:4:4 (needs ~95Gbps) and is therefore
//   chroma-subsampled (4:2:0) by necessity.
//
// AV-over-IP (network) transport is treated separately and more
// conservatively: the delivered chroma is a codec/compression choice, not a
// direct consequence of the source HDMI port's bandwidth, so an AVoIP
// product's "4K60" is defaulted to 4:2:0 (the overwhelmingly common case for
// 1GbE-class encoders) ONLY when no chroma is already stated, and its 4K30
// mode is left BLANK (genuinely ambiguous - could be a visually-lossless
// 4:4:4 codec or a subsampled one, and no single rule is safe there).
//
// Cameras and pure control processors/touch panels are skipped entirely:
// camera chroma is a different, unverified engineering domain, and control
// gear has no video path to qualify.
//
// Every inferred value is tagged with a "chromaEvidence": "inferred" marker
// inside specs_json and a short reasoned note appended to known_limitations,
// exactly like the earlier HDMI/HDBaseT version-gap pass. Crucially, the
// qualifier is ALSO appended to the max_resolution CSV column itself - the
// app's runtime matching engine (catalogChroma() in competitorSpecRegistry.ts)
// derives chroma by regex-scanning that column's TEXT, not the structured
// specs_json field, so writing only to specs_json would be inert data.
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
function hdmiVersionNumber(v) {
  const m = String(v ?? "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

const SKIP_TECH = /^(control|camera)$/i;

// Bounded refresh-rate matching: "60"/"30" must sit right next to a
// resolution token (4k / 8k / 3840x2160 / 4096x2160 / 2160p) and must NOT be
// part of a larger number (e.g. the "60" inside "2160", or a "60" that
// belongs to an unrelated "1080p60" mode listed elsewhere in a compound
// description like "4K30 (wireless) / 1080p60 (HDMI in)"). This avoids
// stitching together a refresh rate from a different resolution mode than
// the one it's actually describing.
function tightMatch(resToken, refresh, res) {
  const pattern = new RegExp(`${resToken}\\D{0,8}(?<!\\d)${refresh}(?:hz)?\\b`, "i");
  return pattern.test(res);
}

function detectMode(res) {
  const tokens = ["4k", "3840x2160", "4096x2160", "2160p"];
  const eightkTokens = ["8k", "7680x4320"];
  for (const t of eightkTokens) {
    if (tightMatch(t, "60", res)) return "8k60";
  }
  for (const t of tokens) {
    if (tightMatch(t, "60", res)) return "4k60";
  }
  for (const t of tokens) {
    if (tightMatch(t, "30", res)) return "4k30";
  }
  if (/1080p/i.test(res)) return "1080p";
  return null;
}

function inferChroma(row, specs) {
  const technology = clean(row.technology);
  if (SKIP_TECH.test(technology)) return null;

  const res = clean(row.max_resolution);
  if (!res) return null;
  if (/4:4:4|4:2:0|4:2:2/i.test(res)) return null; // already has it
  if (/verify|button-dependent/i.test(res)) return null; // already flagged ambiguous

  const isAvoip = /avoip/i.test(technology);
  const bw = bandwidthNumber(specs?.video?.bandwidthGbps);
  const hdmiVer = hdmiVersionNumber(specs?.video?.hdmi);

  // Pick the single headline mode this row's resolution text is actually
  // describing (highest-bandwidth mode first, since that's what vendors lead
  // with), rather than independently testing "does it mention 4k anywhere"
  // and "does it mention 60 anywhere" - which can silently combine two
  // unrelated modes from a compound description.
  const mode = detectMode(res);
  const is8k60 = mode === "8k60";
  const is4k60 = mode === "4k60";
  const is4k30 = mode === "4k30";
  const is1080p = mode === "1080p";

  if (isAvoip) {
    if (is1080p) return { value: "4:4:4", basis: "inferred: 1080p fits well within any HDMI/AVoIP codec's bandwidth budget at full chroma" };
    if (is4k60) return { value: "4:2:0", basis: "inferred: 4K60 over 1GbE-class AVoIP transport is virtually always chroma-subsampled to fit network bandwidth" };
    return null; // 4K30 AVoIP: genuinely ambiguous (codec-dependent), left blank
  }

  if (is8k60) {
    if (bw != null && bw >= 38 && bw < 90) {
      return { value: "4:2:0", basis: `inferred: stated ${specs.video.bandwidthGbps}Gbps (HDMI 2.1 FRL range) cannot carry uncompressed 8K60 4:4:4 (~95Gbps needed), so delivery is chroma-subsampled` };
    }
    return null;
  }

  if (is4k60) {
    if ((bw != null && bw >= 16) || (hdmiVer != null && hdmiVer >= 2.0)) {
      return { value: "4:4:4", basis: bw != null ? `inferred: stated ${specs.video.bandwidthGbps}Gbps bandwidth supports uncompressed 4K60 4:4:4` : `inferred: confirmed HDMI ${specs.video.hdmi} supports uncompressed 4K60 4:4:4` };
    }
    if (hdmiVer != null && hdmiVer < 2.0) {
      return { value: "4:2:0", basis: `inferred: confirmed HDMI ${specs.video.hdmi} (10.2Gbps max) cannot carry uncompressed 4K60 4:4:4, delivery must be chroma-subsampled` };
    }
    return null;
  }

  if (is4k30) {
    return { value: "4:4:4", basis: "inferred: 4K30 fits well within any HDMI generation's bandwidth at full chroma (no subsampling needed)" };
  }

  if (is1080p) {
    return { value: "4:4:4", basis: "inferred: 1080p fits well within any HDMI generation's bandwidth at full chroma" };
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
  const headerLine = rawText.split(/\r?\n/, 1)[0].replace(/^﻿/, "");
  const headers = headerLine.split(",").map((h) => h.replace(/^"|"$/g, ""));

  let changed = false;
  const outRows = rows.map((row) => {
    let specs = {};
    if (row.specs_json && row.specs_json.trim()) {
      try { specs = JSON.parse(row.specs_json); } catch { return row; }
    }
    specs.video = specs.video || {};
    if (clean(specs.video.chroma)) return row; // already has structured chroma

    const inferred = inferChroma(row, specs);
    if (!inferred) return row;

    specs.video.chroma = inferred.value;
    specs.video.chromaEvidence = "inferred";
    fixed += 1;
    details.push(`${row.manufacturer}|${row.model}: chroma=${inferred.value} (${row.max_resolution})`);

    changed = true;
    const note = `Chroma ${inferred.value} ${inferred.basis}.`;
    const newKnownLimitations = clean(row.known_limitations)
      ? `${row.known_limitations} ${note}`
      : note;
    const newMaxResolution = `${row.max_resolution} ${inferred.value}`.trim();
    return {
      ...row,
      max_resolution: newMaxResolution,
      specs_json: JSON.stringify(specs),
      known_limitations: newKnownLimitations,
    };
  });

  if (!changed) continue;
  const lines = [headerLine];
  for (const row of outRows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  const content = (hasBom ? "﻿" : "") + lines.join("\r\n") + "\r\n";
  fs.writeFileSync(absPath, content, "utf8");
}

console.log(`Chroma values inferred: ${fixed}`);
console.log(details.join("\n"));
