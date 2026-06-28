import fs from "node:fs";
import {
  clean,
  normaliseKey,
  normaliseSku,
  readCsv
} from "./product-update-utils.mjs";

const sourceFiles = {
  wyrestormCatalogue: "data-imports/wyrestorm-catalogue-current.csv",
  wyrestormLifecycle: "data-imports/wyrestorm-lifecycle-current.csv",
  competitorFingerprints: "data-imports/competitor-fingerprints-current.csv",
  competitorReviewNotes: "data-imports/competitor-review-notes.csv"
};

const requiredHeaders = {
  wyrestormCatalogue: [
    "sku",
    "product_name",
    "family",
    "product_type",
    "role",
    "lifecycle_status",
    "do_not_spec",
    "successor",
    "inputs",
    "outputs",
    "transport_type",
    "resolution_bandwidth",
    "usb",
    "audio",
    "control",
    "network_requirement",
    "dependencies",
    "compatible_families",
    "application_fit",
    "disqualifiers",
    "quote_warnings",
    "evidence_source",
    "last_reviewed",
    "reviewer"
  ],
  wyrestormLifecycle: [
    "sku",
    "lifecycle_status",
    "do_not_spec",
    "successor",
    "reason",
    "evidence_source",
    "last_reviewed",
    "reviewer"
  ],
  competitorFingerprints: [
    "manufacturer",
    "model",
    "product_class",
    "role",
    "input_count",
    "output_count",
    "transport_type",
    "resolution_bandwidth",
    "usb",
    "audio",
    "control",
    "network_requirement",
    "poe_power",
    "known_limitations",
    "closest_wyrestorm_architecture",
    "closest_wyrestorm_sku_or_family",
    "confidence",
    "evidence_source",
    "last_reviewed",
    "reviewer"
  ],
  competitorReviewNotes: [
    "manufacturer",
    "model",
    "review_note",
    "action",
    "status",
    "last_reviewed",
    "reviewer"
  ]
};

const validLifecycle = new Set([
  "active",
  "review",
  "unlisted",
  "discontinued",
  "eol",
  "do-not-spec",
  "superseded",
  "archive"
]);

const validBoolean = new Set(["true", "false", "yes", "no", "y", "n", "1", "0", ""]);

const validConfidence = new Set(["low", "medium", "high"]);

const validReviewStatus = new Set(["review", "approved", "blocked", "ignored", "needs-evidence", "partial"]);

const roleSignals = [
  "encoder",
  "decoder",
  "transmitter",
  "receiver",
  "tx",
  "rx",
  "transceiver",
  "matrix",
  "switcher",
  "extender",
  "processor",
  "controller",
  "touch",
  "audio",
  "camera",
  "microphone",
  "speaker",
  "accessory",
  "cable",
  "power",
  "endpoint"
];

const classSignals = [
  "av-over-ip",
  "avoip",
  "matrix",
  "switcher",
  "extender",
  "processor",
  "video wall",
  "multiview",
  "controller",
  "presentation",
  "uc",
  "usb",
  "audio",
  "endpoint"
];

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function normaliseHeader(header) {
  return clean(header)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rawHeaders(file) {
  if (!fs.existsSync(file)) {
    fail(`Missing source file: ${file}`);
    return [];
  }

  const firstLine = fs.readFileSync(file, "utf8").split(/\r?\n/g)[0] ?? "";

  return firstLine
    .split(",")
    .map(normaliseHeader)
    .filter(Boolean);
}

function checkHeaders(name, file) {
  const headers = rawHeaders(file);
  const expected = requiredHeaders[name];
  const missing = expected.filter((header) => !headers.includes(header));

  if (missing.length > 0) {
    fail(`${file} is missing required header(s): ${missing.join(", ")}`);
  }

  const duplicates = headers.filter((header, index, all) => all.indexOf(header) !== index);

  if (duplicates.length > 0) {
    fail(`${file} contains duplicate header(s): ${Array.from(new Set(duplicates)).join(", ")}`);
  }
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(clean(value));
}

function hasSignal(value, signals) {
  const text = clean(value).toLowerCase();
  return signals.some((signal) => text.includes(signal));
}

function checkDuplicates(records, keyFn, label, file) {
  const seen = new Set();
  const duplicates = new Set();

  for (const record of records) {
    const key = keyFn(record);

    if (!key) {
      continue;
    }

    if (seen.has(key)) {
      duplicates.add(key);
    }

    seen.add(key);
  }

  if (duplicates.size > 0) {
    fail(`${file} has duplicate ${label}: ${Array.from(duplicates).join(", ")}`);
  }
}

for (const [name, file] of Object.entries(sourceFiles)) {
  checkHeaders(name, file);
}

const catalogue = readCsv(sourceFiles.wyrestormCatalogue);
const lifecycle = readCsv(sourceFiles.wyrestormLifecycle);
const competitors = readCsv(sourceFiles.competitorFingerprints);
const reviewNotes = readCsv(sourceFiles.competitorReviewNotes);

checkDuplicates(catalogue, (record) => normaliseSku(record.sku), "SKU rows", sourceFiles.wyrestormCatalogue);
checkDuplicates(lifecycle, (record) => normaliseSku(record.sku), "SKU rows", sourceFiles.wyrestormLifecycle);
checkDuplicates(
  competitors,
  (record) => normaliseKey(`${record.manufacturer}-${record.model}`),
  "competitor model rows",
  sourceFiles.competitorFingerprints
);

for (const record of catalogue) {
  const sku = normaliseSku(record.sku);

  if (!sku) {
    fail(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: missing SKU.`);
  }

  if (sku && !/^[A-Z0-9][A-Z0-9._-]*$/.test(sku)) {
    fail(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: SKU has an unsafe format: ${record.sku}`);
  }

  const lifecycleValue = clean(record.lifecycle_status).toLowerCase();
  if (!validLifecycle.has(lifecycleValue)) {
    fail(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: invalid lifecycle_status "${record.lifecycle_status}".`);
  }

  if (!validBoolean.has(clean(record.do_not_spec).toLowerCase())) {
    fail(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: do_not_spec must be true/false style.`);
  }

  if (!validDate(record.last_reviewed)) {
    fail(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: last_reviewed must use YYYY-MM-DD.`);
  }

  if (!hasSignal(record.role, roleSignals)) {
    warn(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: role "${record.role}" is unusual; confirm it is intentional.`);
  }

  if (!clean(record.evidence_source)) {
    fail(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: evidence_source is required.`);
  }

  if (!clean(record.reviewer)) {
    fail(`${sourceFiles.wyrestormCatalogue} row ${record.__row}: reviewer is required.`);
  }
}

for (const record of lifecycle) {
  const sku = normaliseSku(record.sku);

  if (!sku) {
    fail(`${sourceFiles.wyrestormLifecycle} row ${record.__row}: missing SKU.`);
  }

  const lifecycleValue = clean(record.lifecycle_status).toLowerCase();
  if (!validLifecycle.has(lifecycleValue)) {
    fail(`${sourceFiles.wyrestormLifecycle} row ${record.__row}: invalid lifecycle_status "${record.lifecycle_status}".`);
  }

  if (!validBoolean.has(clean(record.do_not_spec).toLowerCase())) {
    fail(`${sourceFiles.wyrestormLifecycle} row ${record.__row}: do_not_spec must be true/false style.`);
  }

  if (!validDate(record.last_reviewed)) {
    fail(`${sourceFiles.wyrestormLifecycle} row ${record.__row}: last_reviewed must use YYYY-MM-DD.`);
  }
}

for (const record of competitors) {
  const key = normaliseKey(`${record.manufacturer}-${record.model}`);

  if (!key) {
    fail(`${sourceFiles.competitorFingerprints} row ${record.__row}: manufacturer and model are required.`);
  }

  if (!hasSignal(record.product_class, classSignals)) {
    warn(`${sourceFiles.competitorFingerprints} row ${record.__row}: product_class "${record.product_class}" is unusual; confirm it is intentional.`);
  }

  if (!hasSignal(record.role, roleSignals)) {
    warn(`${sourceFiles.competitorFingerprints} row ${record.__row}: role "${record.role}" is unusual; confirm it is intentional.`);
  }

  if (!/^\d+$/.test(clean(record.input_count))) {
    fail(`${sourceFiles.competitorFingerprints} row ${record.__row}: input_count must be numeric.`);
  }

  if (!/^\d+$/.test(clean(record.output_count))) {
    fail(`${sourceFiles.competitorFingerprints} row ${record.__row}: output_count must be numeric.`);
  }

  if (!validConfidence.has(clean(record.confidence).toLowerCase())) {
    fail(`${sourceFiles.competitorFingerprints} row ${record.__row}: confidence must be low, medium or high.`);
  }

  if (!clean(record.closest_wyrestorm_architecture)) {
    fail(`${sourceFiles.competitorFingerprints} row ${record.__row}: closest_wyrestorm_architecture is required.`);
  }

  if (!clean(record.closest_wyrestorm_sku_or_family)) {
    fail(`${sourceFiles.competitorFingerprints} row ${record.__row}: closest_wyrestorm_sku_or_family is required.`);
  }

  if (!validDate(record.last_reviewed)) {
    fail(`${sourceFiles.competitorFingerprints} row ${record.__row}: last_reviewed must use YYYY-MM-DD.`);
  }
}

for (const record of reviewNotes) {
  if (!clean(record.manufacturer) || !clean(record.model)) {
    fail(`${sourceFiles.competitorReviewNotes} row ${record.__row}: manufacturer and model are required.`);
  }

  if (!validReviewStatus.has(clean(record.status).toLowerCase())) {
    fail(`${sourceFiles.competitorReviewNotes} row ${record.__row}: status "${record.status}" is not valid.`);
  }

  if (!validDate(record.last_reviewed)) {
    fail(`${sourceFiles.competitorReviewNotes} row ${record.__row}: last_reviewed must use YYYY-MM-DD.`);
  }
}

if (warnings.length > 0) {
  console.log("[product-update-source-schema] Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error("[product-update-source-schema] Failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[product-update-source-schema] Product update source schema checks passed.");
