/**
 * Pure builder for data/catalog/product-technology-profiles.generated.json.
 *
 * Extracted from tools/audit-product-technology-normalization.mjs so the SAME
 * deterministic logic that materialises the committed, tracked manifest can
 * also regenerate it in-memory for a drift check: a source input
 * (competitor-products.generated.json, product-intelligence-index.json, the
 * technology-normalization rules, or the routed-io evidence) can change
 * without anyone noticing because the tracked output is a blob of records
 * with no embedded hashes. Regenerating and diffing closes that gap.
 *
 * Determinism contract: no timestamps or randomness may enter `records`, and
 * ordering is input order — the drift checker byte-compares a fresh
 * materialisation against the committed file, so any drift fails CI.
 */
import {
  applyRoutedIoEvidence,
} from "./routed-io-evidence.mjs";
import { normaliseProductTechnology } from "../../server/competitor/technology-normalizer.mjs";

function tidy(value) {
  return String(value ?? "").trim();
}

/** Normalise a JSON document into a flat product-row array. */
export function rowsFrom(value) {
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

function materialise(rows, vendorType, routedIoEvidence) {
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

/**
 * Materialise the full records list from the two committed product catalogs
 * plus the routed-io evidence. Deterministic: same inputs -> same records.
 */
export function materialiseTechnologyProfiles(competitorRows, wyrestormRows, routedIoEvidence) {
  return [
    ...materialise(competitorRows, "competitor", routedIoEvidence),
    ...materialise(wyrestormRows, "wyrestorm", routedIoEvidence),
  ];
}
