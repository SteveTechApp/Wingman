import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "data-sources/wyrestorm/enrichment.json",
      "data/wingman-canonical-product-store.json",
      "public/product-intelligence-index.json",
    ];

const suspectFeatures = [
  { label: "NDI", evidence: /\bNDI(?:\|HX\d?)?\b/i },
  { label: "USB-C power delivery", evidence: /\b(?:USB-C\s+)?power delivery\b|\bUSB-C\s+charging\b|\bPD\s*\d{2,3}\s*W\b/i },
  { label: "DSP audio processing", evidence: /\bDSP\b|\bdigital signal process(?:or|ing)\b/i },
  { label: "Seamless Switching", evidence: /\bseamless\s+(?:matrix\s+)?switch(?:ing|er)\b|\bfast switching\b/i },
];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sourceEvidence(record) {
  const profile = record?.technicalProfile ?? {};
  const governed = profile.governedSpecification ?? {};
  return [
    record.sku,
    record.name,
    record.title,
    record.description,
    record.summary,
    ...(profile.evidence?.technicalLines ?? []),
    ...(profile.evidence?.featureLines ?? []),
    ...(governed.transport ?? []),
    ...(governed.video ?? []),
    ...(governed.audio ?? []),
    ...(governed.usb ?? []),
    ...(governed.network ?? []),
    ...(governed.control ?? []),
  ].map(text).filter(Boolean).join("\n");
}

function removeUnsupportedLabels(value, unsupported) {
  if (!Array.isArray(value)) return value;
  return value.filter((item) => {
    const label = typeof item === "string" ? item : text(item?.label);
    return ![...unsupported].some((feature) =>
      label.toLowerCase() === feature.label.toLowerCase() || feature.evidence.test(label),
    );
  });
}

function sanitizeRecord(record) {
  const evidence = sourceEvidence(record);
  const unsupported = new Set(suspectFeatures.filter((feature) => !feature.evidence.test(evidence)));
  if (!unsupported.size) return [];

  const removed = [];
  const clean = (owner, key) => {
    if (!owner || !Array.isArray(owner[key])) return;
    const before = owner[key];
    owner[key] = removeUnsupportedLabels(before, unsupported);
    for (const item of before) {
      const label = typeof item === "string" ? item : text(item?.label);
      if ([...unsupported].some((feature) =>
        label.toLowerCase() === feature.label.toLowerCase() || feature.evidence.test(label),
      )) removed.push(label);
    }
  };

  for (const key of ["technologies", "features", "featureTags", "tags", "capabilities", "searchTerms"]) clean(record, key);
  const profile = record.technicalProfile;
  if (profile) {
    for (const key of ["transports", "features", "processing"]) clean(profile, key);
    for (const values of Object.values(profile.featureGroups ?? {})) {
      if (!Array.isArray(values)) continue;
      const filtered = removeUnsupportedLabels(values, unsupported);
      values.splice(0, values.length, ...filtered);
    }
    clean(profile.network, "protocols");
    clean(profile.audio, "processing");
  }

  return [...new Set(removed)];
}

for (const relative of targets) {
  const file = path.resolve(root, relative);
  const payload = JSON.parse(await fs.readFile(file, "utf8"));
  const records = Array.isArray(payload) ? payload : payload.products;
  if (!Array.isArray(records)) throw new Error(`${relative} does not contain a product array`);

  const changes = [];
  for (const record of records) {
    const removed = sanitizeRecord(record);
    if (removed.length) changes.push({ sku: record.sku, removed });
  }

  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[feature-integrity] ${relative}: cleaned ${changes.length} records`);
  for (const change of changes) console.log(`  ${change.sku}: ${change.removed.join(", ")}`);
}
