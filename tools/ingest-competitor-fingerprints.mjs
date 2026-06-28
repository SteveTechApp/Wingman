import {
  clean,
  competitorRequiredFields,
  missingFields,
  normaliseKey,
  readCsv,
  writeJson,
  writeText
} from "./product-update-utils.mjs";

const rows = readCsv("data-imports/competitor-fingerprints-current.csv");

const records = rows.map((record) => {
  const missing = missingFields(record, competitorRequiredFields);
  const confidence = clean(record.confidence || "low").toLowerCase();

  return {
    key: normaliseKey(`${record.manufacturer}-${record.model}`),
    manufacturer: clean(record.manufacturer),
    model: clean(record.model),
    productClass: clean(record.product_class),
    role: clean(record.role),
    inputCount: clean(record.input_count),
    outputCount: clean(record.output_count),
    transportType: clean(record.transport_type),
    resolutionBandwidth: clean(record.resolution_bandwidth),
    usb: clean(record.usb),
    audio: clean(record.audio),
    control: clean(record.control),
    networkRequirement: clean(record.network_requirement),
    poePower: clean(record.poe_power),
    knownLimitations: clean(record.known_limitations),
    closestWyrestormArchitecture: clean(record.closest_wyrestorm_architecture),
    closestWyrestormSkuOrFamily: clean(record.closest_wyrestorm_sku_or_family),
    confidence,
    evidenceSource: clean(record.evidence_source),
    lastReviewed: clean(record.last_reviewed),
    reviewer: clean(record.reviewer),
    missingFields: missing,
    status: missing.length === 0 && confidence !== "low" ? "known-profile" : "review"
  };
});

const duplicateKeys = records.map((record) => record.key).filter((key, index, all) => all.indexOf(key) !== index);

writeJson("generated/product-intelligence/competitor-fingerprints-normalized.json", {
  generatedAt: new Date().toISOString(),
  counts: {
    total: records.length,
    knownProfile: records.filter((record) => record.status === "known-profile").length,
    review: records.filter((record) => record.status === "review").length,
    duplicateKeys: Array.from(new Set(duplicateKeys)).length
  },
  records
});

const reviewRows = records
  .filter((record) => record.status === "review" || duplicateKeys.includes(record.key))
  .map((record) => `| ${record.manufacturer} | ${record.model} | ${record.productClass || "-"} | ${record.role || "-"} | ${record.confidence} | ${record.missingFields.join(", ") || "-"} |`)
  .join("\n");

writeText("docs/competitor-fingerprint-coverage.md", `
# Competitor fingerprint coverage

Generated: ${new Date().toISOString()}

Competitor records are comparison-only. They must not be used in WyreStorm BOMs or proposal hardware lists.

| Manufacturer | Model | Class | Role | Confidence | Missing fields |
| --- | --- | --- | --- | --- | --- |
${reviewRows || "| - | - | - | - | - | - |"}
`);

console.log("[ingest-competitors] Records:", records.length);
