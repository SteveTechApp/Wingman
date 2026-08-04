// The research agents dispatched to backfill competitor technical specs were
// explicitly told not to touch approval_status (a governance/trust field), but
// several of them did anyway - approved count jumped from 15 to 112 across the
// competitor CSVs. This script restores approval_status to "review" for every
// row that was not in the original, pre-research-pass set of 15 approved SKUs,
// while leaving every other column (the newly researched facts) untouched.
import fs from "node:fs";
import path from "node:path";
import { readCsv } from "./product-update-utils.mjs";

const root = process.cwd();
const competitorDir = path.join(root, "data-sources/competitors");

const ORIGINALLY_APPROVED = new Set([
  "Atlona|AT-OME-CS31-SA",
  "Atlona|AT-OME-MS42",
  "Atlona|AT-OME-PS62",
  "Atlona|AT-OMNI-111",
  "Atlona|AT-OMNI-112",
  "Atlona|AT-UHD-EX-100CE-KIT",
  "Blustream|IP300UHD-RX",
  "Blustream|IP300UHD-TX",
  "Crestron|DM-NVX-350",
  "Crestron|DM-NVX-D30",
  "Crestron|DM-NVX-E30",
  "Crestron|HD-MD4X2-4KZ-E",
  "Extron|IN1608 XI",
  "Extron|NAV E 501",
  "Kramer|VS-88H2A",
]);

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const files = fs.readdirSync(competitorDir).filter((f) => f.endsWith(".csv") && !f.includes(".backup"));
let totalReverted = 0;
const revertedBySku = [];

for (const file of files) {
  const relPath = `data-sources/competitors/${file}`;
  const absPath = path.join(root, relPath);
  const rawText = fs.readFileSync(absPath, "utf8");
  const hasBom = rawText.charCodeAt(0) === 0xfeff;
  const rows = readCsv(relPath);
  if (!rows.length) continue;

  const headerLine = rawText.split(/\r?\n/, 1)[0].replace(/^\uFEFF/, "");
  const headers = headerLine.split(",").map((h) => h.replace(/^"|"$/g, ""));

  let changed = false;
  const outRows = rows.map((row) => {
    const key = `${row.manufacturer}|${row.model}`;
    if (row.approval_status === "approved" && !ORIGINALLY_APPROVED.has(key)) {
      changed = true;
      totalReverted += 1;
      revertedBySku.push(key);
      return { ...row, approval_status: "review" };
    }
    return row;
  });

  if (!changed) continue;

  const lines = [headerLine];
  for (const row of outRows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  const content = (hasBom ? "﻿" : "") + lines.join("\r\n") + "\r\n";
  fs.writeFileSync(absPath, content, "utf8");
}

console.log(`Reverted approval_status back to "review" for ${totalReverted} unauthorized promotions.`);
console.log(JSON.stringify(revertedBySku, null, 2));
