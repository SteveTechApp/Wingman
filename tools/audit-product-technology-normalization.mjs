import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadRoutedIoEvidence } from "./lib/routed-io-evidence.mjs";
import {
  materialiseTechnologyProfiles,
  rowsFrom,
} from "./lib/product-technology-profiles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const competitorPath = path.join(root, "data", "catalog", "competitor-products.generated.json");
const wyrestormPath = path.join(root, "public", "product-intelligence-index.json");
const materializedPath = path.join(root, "data", "catalog", "product-technology-profiles.generated.json");
const auditPath = path.join(root, "data", "governance", "product-technology-normalization-audit.generated.json");

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function manufacturerSummary(records) {
  const byManufacturer = new Map();

  for (const record of records) {
    const key = record.manufacturer || "Unknown";
    const current = byManufacturer.get(key) || {
      manufacturer: key,
      products: 0,
      normalized: 0,
      canonicalTransportKnown: 0,
      networkClassKnown: 0,
      codecKnown: 0,
    };

    current.products += 1;
    if ((record.profile?.matchedRuleIds?.length || 0) > 0) current.normalized += 1;
    if (record.profile?.canonicalTransport) current.canonicalTransportKnown += 1;
    if (record.profile?.networkClass) current.networkClassKnown += 1;
    if (record.profile?.codecName || record.profile?.codecStandard) current.codecKnown += 1;

    byManufacturer.set(key, current);
  }

  return [...byManufacturer.values()].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
}

function unresolvedNamedTechnology(records) {
  const signal = /\b(?:digitalmedia|dm\s*8g|dtp\d*|dxlink|nav|nvx|omnistream|vinx|zyper|networkhd|sdvoe|jpeg2000|pure3)\b/i;

  return records
    .filter((record) => {
      const text = [
        record.manufacturer,
        record.sku,
        record.profile?.vendorTechnology,
        record.profile?.canonicalTransport,
      ].filter(Boolean).join(" ");

      if (!signal.test(text)) return false;
      return (record.profile?.matchedRuleIds?.length || 0) === 0;
    })
    .map((record) => ({
      manufacturer: record.manufacturer,
      sku: record.sku,
    }))
    .slice(0, 200);
}

const routedIoEvidence = loadRoutedIoEvidence();
const competitorRows = rowsFrom(await readJson(competitorPath, []));
const wyrestormRows = rowsFrom(await readJson(wyrestormPath, []));

const records = materialiseTechnologyProfiles(competitorRows, wyrestormRows, routedIoEvidence);

await fs.mkdir(path.dirname(materializedPath), { recursive: true });
await fs.writeFile(
  materializedPath,
  JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  ),
  "utf8",
);

const normalizedCount = records.filter(
  (record) => (record.profile?.matchedRuleIds?.length || 0) > 0,
).length;

const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sources: {
    competitor: path.relative(root, competitorPath).replaceAll("\\", "/"),
    wyrestorm: path.relative(root, wyrestormPath).replaceAll("\\", "/"),
  },
  totals: {
    records: records.length,
    competitorRecords: records.filter((record) => record.vendorType === "competitor").length,
    wyrestormRecords: records.filter((record) => record.vendorType === "wyrestorm").length,
    normalizedByGovernedRule: normalizedCount,
    canonicalTransportKnown: records.filter((record) => record.profile?.canonicalTransport).length,
    networkClassKnown: records.filter((record) => record.profile?.networkClass).length,
    codecKnown: records.filter(
      (record) => record.profile?.codecName || record.profile?.codecStandard,
    ).length,
  },
  byManufacturer: manufacturerSummary(records),
  unresolvedNamedTechnology: unresolvedNamedTechnology(records),
};

await fs.mkdir(path.dirname(auditPath), { recursive: true });
await fs.writeFile(auditPath, JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify(report.totals, null, 2));
console.log(`Materialized: ${path.relative(root, materializedPath)}`);
console.log(`Audit: ${path.relative(root, auditPath)}`);
