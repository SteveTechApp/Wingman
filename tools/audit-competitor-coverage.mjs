import {
  markdownTable,
  readJsonIfExists,
  stableGeneratedNotice,
  writeText
} from "./product-update-utils.mjs";

const normalised = readJsonIfExists("generated/product-intelligence/competitor-fingerprints-normalized.json", { records: [] });
const records = normalised.records ?? [];

const blocked = records.filter((record) =>
  !record.productClass ||
  !record.role ||
  !record.closestWyrestormSkuOrFamily ||
  record.confidence === "low"
);

const partial = records.filter((record) => record.missingFields.length > 0 && !blocked.includes(record));
const known = records.filter((record) => record.missingFields.length === 0 && record.confidence !== "low");

const rows = [...blocked, ...partial].map((record) => ({
  Manufacturer: record.manufacturer,
  Model: record.model,
  Class: record.productClass || "-",
  Role: record.role || "-",
  Confidence: record.confidence,
  Missing: record.missingFields.join(", ") || "-",
  Action: blocked.includes(record) ? "Block from precise replacement" : "Partial comparison only"
}));

writeText("docs/competitor-fingerprint-audit.md", `
# Competitor fingerprint audit

Generated: ${stableGeneratedNotice}

- Known comparison profiles: ${known.length}
- Partial profiles: ${partial.length}
- Blocked or weak profiles: ${blocked.length}

Competitor fingerprints are comparison-only and must not be used in WyreStorm BOMs.

${markdownTable(["Manufacturer", "Model", "Class", "Role", "Confidence", "Missing", "Action"], rows.length ? rows : [{ Manufacturer: "-", Model: "-", Class: "-", Role: "-", Confidence: "-", Missing: "-", Action: "-" }])}
`);

console.log("[product-update:audit-competitors] Complete");
