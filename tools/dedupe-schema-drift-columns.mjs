// 12 competitor CSVs picked up 4 extra, non-canonical columns during the
// earlier research passes (network_requirement, avoip_chip, avoip_codec,
// avoip_chip_status). These don't break the build (compileCompetitorRow()
// only reads known field names) but drift from the canonical 40-column
// schema shared by the other 7 files.
//
// Verified before writing this script: avoip_chip / avoip_codec /
// avoip_chip_status are already byte-for-byte duplicated inside
// specs_json's top-level avoipChip/avoipCodec/avoipChipStatus keys for
// every single row that has them (zero divergence found) - these are pure
// duplicates, safe to drop.
//
// network_requirement is mostly also a duplicate of specs.networkSpeed
// ("1GbE managed AV network" / "10GbE managed AV network"), EXCEPT for rows
// where it reads "Unconfirmed - verify 1GbE or 10GbE" - that specific value
// carries real information (an explicit not-yet-confirmed signal) that is
// NOT already captured anywhere in specs_json. Before dropping the column,
// this script migrates that signal into the canonical
// specs.networkSpeedConfidence / specs.networkSpeedEvidence fields that
// competitorCompareDecision.ts's compareNetworkClass() already knows how to
// read, so no information is lost - it moves to the schema-correct location
// instead of a bespoke column.
import fs from "node:fs";
import path from "node:path";
import { readCsv } from "./product-update-utils.mjs";

const root = process.cwd();
const dir = path.join(root, "data-sources/competitors");
const DRIFT_COLUMNS = ["network_requirement", "avoip_chip", "avoip_codec", "avoip_chip_status"];

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
function clean(v) { return String(v ?? "").replace(/\s+/g, " ").trim(); }

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".csv"));
let filesChanged = 0;
let migratedConfidence = 0;

for (const file of files) {
  const relPath = "data-sources/competitors/" + file;
  const absPath = path.join(root, relPath);
  const rawText = fs.readFileSync(absPath, "utf8");
  const hasBom = rawText.charCodeAt(0) === 0xfeff;
  const rows = readCsv(relPath);
  const headerLine = rawText.split(/\r?\n/, 1)[0].replace(/^\uFEFF/, "");
  const headers = headerLine.split(",").map((h) => h.replace(/^"|"$/g, ""));

  const hasDriftColumns = DRIFT_COLUMNS.some((c) => headers.includes(c));
  if (!hasDriftColumns) continue;

  const newHeaders = headers.filter((h) => !DRIFT_COLUMNS.includes(h));

  const outRows = rows.map((row) => {
    const networkRequirement = clean(row.network_requirement);
    if (/unconfirmed|verify/i.test(networkRequirement)) {
      let specs = {};
      try { specs = JSON.parse(row.specs_json || "{}"); } catch { specs = {}; }
      if (!specs.networkSpeedConfidence) {
        specs.networkSpeedConfidence = "verify";
        specs.networkSpeedEvidence = specs.networkSpeedEvidence ||
          "Network speed class (1GbE vs 10GbE) not publicly confirmed - verify before quoting.";
        migratedConfidence += 1;
        row = { ...row, specs_json: JSON.stringify(specs) };
      }
    }
    const cleaned = { ...row };
    for (const col of DRIFT_COLUMNS) delete cleaned[col];
    return cleaned;
  });

  const lines = [newHeaders.join(",")];
  for (const row of outRows) {
    lines.push(newHeaders.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  const content = (hasBom ? "﻿" : "") + lines.join("\r\n") + "\r\n";
  fs.writeFileSync(absPath, content, "utf8");
  filesChanged += 1;
  console.log(`${file}: dropped ${DRIFT_COLUMNS.filter((c) => headers.includes(c)).join(", ")}`);
}

console.log(`\nFiles restored to canonical schema: ${filesChanged}`);
console.log(`Network-speed-confidence facts migrated (not lost): ${migratedConfidence}`);
