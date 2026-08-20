import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normaliseProductTechnology } from "../server/competitor/technology-normalizer.mjs";
import {
  applyRoutedIoEvidence,
  loadRoutedIoEvidence,
} from "./lib/routed-io-evidence.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const competitorPath = path.join(root, "data", "catalog", "competitor-products.generated.json");
const wyrestormPath = path.join(root, "public", "product-intelligence-index.json");
const materializedPath = path.join(root, "data", "catalog", "product-technology-profiles.generated.json");
const auditPath = path.join(root, "data", "governance", "product-technology-normalization-audit.generated.json");
const routedIoEvidence = loadRoutedIoEvidence();

function tidy(value) {
  return String(value ?? "").trim();
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function rowsFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.records)) return value.records;
  if (value && typeof value === "object") {
    return Object.values(value).filter((item) => item && typeof item === "object");
  }
  return [];
}

function productIdentity(row, vendorType) {
  const manufacturer =
    vendorType === "wyrestorm"
      ? "WyreStorm"
      : tidy(row.manufacturer || row.brand || row.vendor);
  const sku = tidy(row.sku || row.model || row.SKU || row.partNumber);

  return { manufacturer, sku };
}

function buildInput(row, vendorType) {
  const { manufacturer, sku } = productIdentity(row, vendorType);
  return {
    manufacturer,
    sku,
    model: sku,
    family: row.family || row.productFamily || row.primarySystemFamily,
    productClass:
      row.productClass ||
      row.product_type ||
      row.category ||
      row.productClassification?.primaryCategory ||
      row.productClassification?.category,
    transport: row.transport || row.transport_type || row.transportType,
    technology:
      row.technology ||
      row.technologyType ||
      (Array.isArray(row.technologies) ? row.technologies.join(" / ") : ""),
    summary: row.summary,
    description: row.description,
    features: row.features || row.featureTags || row.capabilities,
    specs: row.specs || row.technicalProfile,
    sourceUrl: row.sourceUrl || row.evidenceSource || row.evidence_source,
  };
}

function materialise(rows, vendorType) {
  return rows
    .map((row) => {
      const input = buildInput(row, vendorType);
      if (!input.sku) return null;

      const profile = normaliseProductTechnology(input);

      const record = {
        vendorType,
        manufacturer: input.manufacturer,
        sku: input.sku,
        profile,
        sourceUrl: input.sourceUrl || "",
      };

      const routedEvidence = routedIoEvidence[
        String(input.sku || "").trim().toUpperCase()
      ];

      if (routedEvidence) {
        applyRoutedIoEvidence(record, routedEvidence);
      }

      return record;
    })
    .filter(Boolean);
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

const competitorRows = rowsFrom(await readJson(competitorPath, []));
const wyrestormRows = rowsFrom(await readJson(wyrestormPath, []));

const records = [
  ...materialise(competitorRows, "competitor"),
  ...materialise(wyrestormRows, "wyrestorm"),
];

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