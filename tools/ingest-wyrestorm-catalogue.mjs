import {
  clean,
  missingFields,
  normaliseSku,
  readCsv,
  splitList,
  truthy,
  writeJson,
  writeText,
  wyrestormRequiredFields
} from "./product-update-utils.mjs";

const catalogue = readCsv("data-imports/wyrestorm-catalogue-current.csv");
const lifecycle = readCsv("data-imports/wyrestorm-lifecycle-current.csv");
const lifecycleBySku = new Map();

for (const record of lifecycle) {
  const sku = normaliseSku(record.sku);
  if (sku) lifecycleBySku.set(sku, record);
}

const records = catalogue.map((record) => {
  const sku = normaliseSku(record.sku);
  const lifecycleRecord = lifecycleBySku.get(sku) ?? {};
  const lifecycleStatus = clean(lifecycleRecord.lifecycle_status || record.lifecycle_status || "review").toLowerCase();
  const doNotSpec = truthy(lifecycleRecord.do_not_spec || record.do_not_spec);
  const missing = missingFields({ ...record, sku, lifecycle_status: lifecycleStatus }, wyrestormRequiredFields);

  return {
    sku,
    productName: clean(record.product_name),
    family: clean(record.family),
    productType: clean(record.product_type),
    role: clean(record.role),
    lifecycleStatus,
    doNotSpec,
    successor: clean(lifecycleRecord.successor || record.successor),
    inputs: clean(record.inputs),
    outputs: clean(record.outputs),
    transportType: clean(record.transport_type),
    resolutionBandwidth: clean(record.resolution_bandwidth),
    usb: clean(record.usb),
    audio: clean(record.audio),
    control: clean(record.control),
    networkRequirement: clean(record.network_requirement),
    dependencies: splitList(record.dependencies),
    compatibleFamilies: splitList(record.compatible_families),
    applicationFit: clean(record.application_fit),
    disqualifiers: clean(record.disqualifiers),
    quoteWarnings: clean(record.quote_warnings),
    evidenceSource: clean(record.evidence_source || lifecycleRecord.evidence_source),
    lastReviewed: clean(record.last_reviewed || lifecycleRecord.last_reviewed),
    reviewer: clean(record.reviewer || lifecycleRecord.reviewer),
    missingFields: missing,
    recommendationCapable: lifecycleStatus === "active" && !doNotSpec && missing.length === 0
  };
});

const counts = {
  total: records.length,
  active: records.filter((record) => record.lifecycleStatus === "active").length,
  doNotSpec: records.filter((record) => record.doNotSpec).length,
  recommendationCapable: records.filter((record) => record.recommendationCapable).length,
  needsReview: records.filter((record) => !record.recommendationCapable).length
};

writeJson("generated/product-intelligence/wyrestorm-catalogue-normalized.json", {
  generatedAt: new Date().toISOString(),
  counts,
  records
});

const reviewRows = records
  .filter((record) => !record.recommendationCapable)
  .map((record) => `| ${record.sku} | ${record.productName} | ${record.lifecycleStatus} | ${record.doNotSpec ? "yes" : "no"} | ${record.missingFields.join(", ") || "-"} |`)
  .join("\n");

writeText("reports/wyrestorm-catalogue-ingest-report.md", `
# WyreStorm catalogue ingest report

Generated: ${new Date().toISOString()}

- Total records: ${counts.total}
- Active records: ${counts.active}
- Recommendation-capable records: ${counts.recommendationCapable}
- Needs review: ${counts.needsReview}

| SKU | Product | Lifecycle | Do-not-spec | Missing fields |
| --- | --- | --- | --- | --- |
${reviewRows || "| - | - | - | - | - |"}
`);

console.log("[ingest-wyrestorm] Records:", records.length);
