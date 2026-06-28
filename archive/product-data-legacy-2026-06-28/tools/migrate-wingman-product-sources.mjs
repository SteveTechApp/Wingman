import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { readCsv } from "./product-update-utils.mjs";

const root = process.cwd();
const reviewDate = new Date().toISOString().slice(0, 10);

const wyrestormProductHeaders = [
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
  "reviewer",
];

const lifecycleHeaders = [
  "sku",
  "lifecycle_status",
  "do_not_spec",
  "successor",
  "reason",
  "evidence_source",
  "last_reviewed",
  "reviewer",
];

const competitorHeaders = [
  "manufacturer",
  "model",
  "product_name",
  "family",
  "product_class",
  "subcategory",
  "role",
  "approval_status",
  "source_tier",
  "transport_type",
  "input_count",
  "output_count",
  "max_resolution",
  "chroma",
  "technology",
  "topology",
  "directionality",
  "inputs_json",
  "outputs_json",
  "control_json",
  "audio_json",
  "features_json",
  "specs_json",
  "summary",
  "known_limitations",
  "closest_wyrestorm_architecture",
  "closest_wyrestorm_sku_or_family",
  "confidence",
  "evidence_source",
  "last_reviewed",
  "reviewer",
  "notes",
  "aliases_json",
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normaliseKey(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function productRows(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["products", "records", "items", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(relativePath, headers, rows) {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
  ];
  await fs.writeFile(target, `${lines.join("\n")}\n`, "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));
}

function jsonCell(value, fallback) {
  const resolved = value === undefined || value === null ? fallback : value;
  return JSON.stringify(resolved);
}

function truthy(value) {
  return ["true", "yes", "y", "1"].includes(clean(value).toLowerCase());
}

function sourceUrlFromProduct(product) {
  return clean(
    product?.officialUrl ||
      product?.sourceUrl ||
      product?.url ||
      product?.technicalProfile?.sourceQuality?.officialUrl ||
      product?.technicalProfile?.sourceQuality?.url,
  );
}

function descriptionSaysDiscontinued(product) {
  return /\bDISCONTINUED\b/i.test(`${product?.description ?? ""} ${product?.summary ?? ""}`);
}

function normaliseManufacturer(value) {
  const raw = clean(value);
  const key = normaliseKey(raw);
  const aliases = {
    BARCOCLICKSHARE: "Barco",
    BLUSTREAM: "Blustream",
    AVPRO: "AVPro Edge",
    AVPROEDGE: "AVPro Edge",
  };
  return aliases[key] || raw || "Unknown";
}

function manufacturerSlug(value) {
  return normaliseManufacturer(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function competitorKey(manufacturer, model) {
  return `${normaliseKey(normaliseManufacturer(manufacturer))}|${normaliseKey(model)}`;
}

function directProductUrl(value) {
  const url = clean(value);
  return Boolean(url) && !/search[?/]|\bsearchterm=|google\.|bing\./i.test(url);
}

function phase4Score(row) {
  let score = 0;
  if (directProductUrl(row.sourceUrl)) score += 50;
  if (Array.isArray(row.inputs)) score += row.inputs.length;
  if (Array.isArray(row.outputs)) score += row.outputs.length;
  if (row.video?.maxResolution) score += 5;
  if (row.summary) score += 2;
  return score;
}

function emptyCompetitorRow(manufacturer, model) {
  return {
    manufacturer: normaliseManufacturer(manufacturer),
    model: clean(model),
    product_name: clean(model),
    family: "",
    product_class: "",
    subcategory: "",
    role: "",
    approval_status: "needs-evidence",
    source_tier: "sku-seed",
    transport_type: "",
    input_count: "",
    output_count: "",
    max_resolution: "",
    chroma: "",
    technology: "",
    topology: "",
    directionality: "",
    inputs_json: "[]",
    outputs_json: "[]",
    control_json: "[]",
    audio_json: "[]",
    features_json: "[]",
    specs_json: "{}",
    summary: "",
    known_limitations: "",
    closest_wyrestorm_architecture: "",
    closest_wyrestorm_sku_or_family: "",
    confidence: "low",
    evidence_source: "",
    last_reviewed: "",
    reviewer: "",
    notes: "",
    aliases_json: "[]",
  };
}

function rowFromPhase4(record, aliases = []) {
  return {
    ...emptyCompetitorRow(record.brand, record.sku),
    product_name: clean(record.name || record.sku),
    family: clean(record.family),
    product_class: clean(record.category || record.technology),
    subcategory: clean(record.subcategory),
    role: clean(record.role),
    approval_status: clean(record.status).toLowerCase() === "approved" ? "approved" : "draft",
    source_tier: "structured-catalog",
    transport_type: clean(record.transport),
    input_count: clean(record.routedInputCount ?? record.matrixInputs),
    output_count: clean(record.routedOutputCount ?? record.matrixOutputs),
    max_resolution: clean(record.video?.maxResolution),
    chroma: clean(record.video?.chroma),
    technology: clean(record.technology),
    topology: clean(record.topology),
    directionality: clean(record.directionality),
    inputs_json: jsonCell(record.inputs, []),
    outputs_json: jsonCell(record.outputs, []),
    control_json: jsonCell(record.control, []),
    audio_json: jsonCell(record.audio, []),
    features_json: jsonCell(record.features, []),
    specs_json: jsonCell(
      {
        video: record.video,
        distance: record.distance,
        matrixInputs: record.matrixInputs,
        matrixOutputs: record.matrixOutputs,
        routedInputCount: record.routedInputCount,
        routedOutputCount: record.routedOutputCount,
      },
      {},
    ),
    summary: clean(record.summary),
    confidence: "medium",
    evidence_source: clean(record.sourceUrl),
    notes: clean(record.notes),
    aliases_json: jsonCell(aliases, []),
  };
}

function mergeText(left, right) {
  const values = [clean(left), clean(right)].filter(Boolean);
  return [...new Set(values)].join(" | ");
}

async function migrateWyrestorm() {
  const incomingProducts = readCsv("data-imports/incoming/wyrestorm-catalogue-source.csv");
  const incomingLifecycle = readCsv("data-imports/incoming/wyrestorm-lifecycle-source.csv");
  const controlledProducts = readCsv("data-imports/wyrestorm-catalogue-current.csv");
  const sourceProducts = incomingProducts.length >= 250 ? incomingProducts : controlledProducts;
  const canonical = productRows(await readJson("data/wingman-canonical-product-store.json"));
  const canonicalBySku = new Map(canonical.map((product) => [normaliseKey(product.sku || product.id), product]));
  const lifecycleBySku = new Map(incomingLifecycle.map((row) => [normaliseKey(row.sku), row]));
  const suppression = await readJson("data/wingman-product-suppression-list.json");
  const suppressedKeys = new Set((suppression.suppressedSkus || []).map((row) => normaliseKey(row.sku)));

  const products = [];
  const lifecycle = [];
  const enrichment = [];

  for (const sourceRow of sourceProducts) {
    const key = normaliseKey(sourceRow.sku);
    const existing = canonicalBySku.get(key) || {};
    const existingLifecycle = clean(existing.lifecycleStatus || existing.lifecycle || existing.productLifecycle).toLowerCase();
    const lifecycleRow = lifecycleBySku.get(key) || {};
    const discontinued =
      suppressedKeys.has(key) ||
      descriptionSaysDiscontinued(existing) ||
      ["eol", "discontinued", "do-not-spec", "archive"].includes(existingLifecycle) ||
      truthy(lifecycleRow.do_not_spec);
    const lifecycleStatus = discontinued ? "discontinued" : clean(lifecycleRow.lifecycle_status || sourceRow.lifecycle_status || "review").toLowerCase();
    const evidenceSource = clean(sourceUrlFromProduct(existing) || sourceRow.evidence_source || lifecycleRow.evidence_source || "Wingman canonical migration");
    const reviewer = discontinued ? "Wingman lifecycle migration" : "Wingman source migration (review required)";
    const lastReviewed = clean(sourceRow.last_reviewed || lifecycleRow.last_reviewed || reviewDate);
    const reason = discontinued
      ? "Product is explicitly marked discontinued/EOL in source evidence or the suppression list."
      : clean(lifecycleRow.reason || "Lifecycle requires commercial review before proposal use.");

    products.push({
      ...sourceRow,
      product_name: clean(existing.name || existing.title || sourceRow.product_name),
      family: clean(existing.family || sourceRow.family),
      product_type: clean(existing.category || sourceRow.product_type),
      role: clean(existing.productRole || sourceRow.role),
      lifecycle_status: lifecycleStatus,
      do_not_spec: discontinued ? "true" : "false",
      evidence_source: evidenceSource,
      last_reviewed: lastReviewed,
      reviewer,
    });
    lifecycle.push({
      sku: clean(sourceRow.sku),
      lifecycle_status: lifecycleStatus,
      do_not_spec: discontinued ? "true" : "false",
      successor: clean(lifecycleRow.successor || sourceRow.successor),
      reason,
      evidence_source: evidenceSource,
      last_reviewed: lastReviewed,
      reviewer,
    });
    enrichment.push({
      ...existing,
      brand: "WyreStorm",
      vendorType: "wyrestorm",
      sku: clean(sourceRow.sku).toUpperCase(),
      lifecycleStatus,
      doNotSpec: discontinued,
      successor: clean(lifecycleRow.successor || sourceRow.successor),
      dataMaintenance: undefined,
    });
  }

  products.sort((a, b) => clean(a.sku).localeCompare(clean(b.sku)));
  lifecycle.sort((a, b) => clean(a.sku).localeCompare(clean(b.sku)));
  enrichment.sort((a, b) => clean(a.sku).localeCompare(clean(b.sku)));

  await writeCsv("data-sources/wyrestorm/products.csv", wyrestormProductHeaders, products);
  await writeCsv("data-sources/wyrestorm/lifecycle.csv", lifecycleHeaders, lifecycle);
  await fs.mkdir(path.join(root, "data-sources", "wyrestorm"), { recursive: true });
  await fs.writeFile(
    path.join(root, "data-sources", "wyrestorm", "enrichment.json"),
    `${JSON.stringify(enrichment, null, 2)}\n`,
    "utf8",
  );

  return { products: products.length, discontinued: lifecycle.filter((row) => row.do_not_spec === "true").length };
}

async function migrateCompetitors() {
  const phase4 = productRows(await readJson("data/catalog/competitor-catalog.phase4.json"));
  const compareSeeds = productRows(await readJson("data/catalog/competitor-compare.seed.json"));
  const controlledFingerprints = readCsv("data-imports/competitor-fingerprints-current.csv");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });

  let curatedFingerprints;
  let sourceProducts;
  let skuSeedCatalog;

  try {
    ({ CURATED_FINGERPRINTS: curatedFingerprints } = await vite.ssrLoadModule("/src/wingman2/lib/competitorSpecRegistry.ts"));
    ({ competitorSourceProducts: sourceProducts } = await vite.ssrLoadModule("/src/wingman2/data/competitorSourceFeeds.ts"));
    ({ COMPETITOR_SKU_SEED_CATALOG: skuSeedCatalog } = await vite.ssrLoadModule("/src/wingman2/lib/competitorProductIntelligence.ts"));
  } finally {
    await vite.close();
  }

  const phase4Groups = new Map();
  for (const record of phase4) {
    const key = competitorKey(record.brand, record.sku);
    if (!phase4Groups.has(key)) phase4Groups.set(key, []);
    phase4Groups.get(key).push(record);
  }

  const records = new Map();
  for (const [key, candidates] of phase4Groups.entries()) {
    const ranked = [...candidates].sort((a, b) => phase4Score(b) - phase4Score(a));
    const winner = ranked[0];
    const aliases = ranked.slice(1).map((row) => clean(row.sku)).filter(Boolean);
    const row = rowFromPhase4(winner, aliases);
    row.notes = ranked.slice(1).reduce((notes, duplicate) => mergeText(notes, duplicate.notes), row.notes);
    records.set(key, row);
  }

  for (const fingerprint of curatedFingerprints) {
    const key = competitorKey(fingerprint.brand, fingerprint.sku);
    const row = records.get(key) || emptyCompetitorRow(fingerprint.brand, fingerprint.sku);
    row.product_class = clean(row.product_class || fingerprint.domain);
    row.role = clean(fingerprint.role || row.role);
    row.approval_status = clean(fingerprint.datasheetUrl || row.evidence_source) ? "approved" : "review";
    row.source_tier = "curated-fingerprint";
    row.input_count = fingerprint.inputCount ?? row.input_count;
    row.output_count = fingerprint.outputCount ?? row.output_count;
    row.max_resolution = clean(fingerprint.maxResolution || row.max_resolution);
    row.chroma = clean(fingerprint.chroma || row.chroma);
    row.technology = clean(fingerprint.domain || row.technology);
    row.features_json = jsonCell(fingerprint.features || JSON.parse(row.features_json || "[]"), []);
    row.specs_json = jsonCell(fingerprint.specs || JSON.parse(row.specs_json || "{}"), {});
    row.evidence_source = clean(fingerprint.datasheetUrl || row.evidence_source);
    row.confidence = row.approval_status === "approved" ? "high" : "medium";
    row.last_reviewed = row.last_reviewed || reviewDate;
    row.reviewer = row.reviewer || "Wingman curated fingerprint migration";
    row.aliases_json = jsonCell(
      [...new Set([...(JSON.parse(row.aliases_json || "[]")), ...(fingerprint.keys || [])])],
      [],
    );
    records.set(key, row);
  }

  for (const source of sourceProducts) {
    const key = competitorKey(source.manufacturer, source.sku);
    const row = records.get(key) || emptyCompetitorRow(source.manufacturer, source.sku);
    row.product_name = clean(source.title || row.product_name);
    row.family = clean(source.family || row.family);
    row.product_class = clean(source.domain || row.product_class);
    row.role = clean(source.role || row.role);
    if (row.approval_status !== "approved") row.approval_status = "needs-evidence";
    if (row.source_tier === "sku-seed") row.source_tier = "source-feed";
    row.transport_type = clean(source.transport || row.transport_type);
    row.input_count = source.inputCount ?? row.input_count;
    row.output_count = source.outputCount ?? row.output_count;
    row.max_resolution = clean(source.maxResolution || row.max_resolution);
    row.chroma = clean(source.chroma || row.chroma);
    row.features_json = jsonCell(source.features || JSON.parse(row.features_json || "[]"), []);
    row.summary = clean(source.summary || row.summary);
    row.evidence_source = clean(source.sourceUrl || row.evidence_source);
    row.notes = mergeText(row.notes, (source.evidence || []).join(" | "));
    records.set(key, row);
  }

  for (const seed of compareSeeds) {
    const key = competitorKey(seed.brand, seed.competitorSku);
    const row = records.get(key) || emptyCompetitorRow(seed.brand, seed.competitorSku);
    row.product_class = clean(row.product_class || seed.category);
    row.summary = clean(row.summary || seed.summary);
    row.closest_wyrestorm_architecture = clean(seed.wyrestormCategory || row.closest_wyrestorm_architecture);
    row.closest_wyrestorm_sku_or_family = clean(seed.wyrestormSku || row.closest_wyrestorm_sku_or_family);
    row.notes = mergeText(row.notes, [seed.rationale, ...(seed.notes || [])].filter(Boolean).join(" | "));
    records.set(key, row);
  }

  for (const [manufacturer, models] of Object.entries(skuSeedCatalog)) {
    for (const model of models) {
      const key = competitorKey(manufacturer, model);
      if (!records.has(key)) records.set(key, emptyCompetitorRow(manufacturer, model));
    }
  }

  for (const controlled of controlledFingerprints) {
    const key = competitorKey(controlled.manufacturer, controlled.model);
    const row = records.get(key) || emptyCompetitorRow(controlled.manufacturer, controlled.model);
    row.product_class = clean(controlled.product_class || row.product_class);
    row.role = clean(controlled.role || row.role);
    row.approval_status = clean(controlled.confidence).toLowerCase() === "high" ? "approved" : "review";
    row.source_tier = "reviewed-import";
    row.input_count = clean(controlled.input_count || row.input_count);
    row.output_count = clean(controlled.output_count || row.output_count);
    row.transport_type = clean(controlled.transport_type || row.transport_type);
    row.max_resolution = clean(controlled.resolution_bandwidth || row.max_resolution);
    row.known_limitations = clean(controlled.known_limitations || row.known_limitations);
    row.closest_wyrestorm_architecture = clean(controlled.closest_wyrestorm_architecture || row.closest_wyrestorm_architecture);
    row.closest_wyrestorm_sku_or_family = clean(controlled.closest_wyrestorm_sku_or_family || row.closest_wyrestorm_sku_or_family);
    row.confidence = clean(controlled.confidence || row.confidence).toLowerCase();
    row.evidence_source = clean(controlled.evidence_source || row.evidence_source);
    row.last_reviewed = clean(controlled.last_reviewed || row.last_reviewed);
    row.reviewer = clean(controlled.reviewer || row.reviewer);
    records.set(key, row);
  }

  const byManufacturer = new Map();
  for (const row of records.values()) {
    const manufacturer = normaliseManufacturer(row.manufacturer);
    row.manufacturer = manufacturer;
    if (!byManufacturer.has(manufacturer)) byManufacturer.set(manufacturer, []);
    byManufacturer.get(manufacturer).push(row);
  }

  const competitorRoot = path.join(root, "data-sources", "competitors");
  await fs.mkdir(competitorRoot, { recursive: true });
  for (const entry of await fs.readdir(competitorRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".csv")) {
      await fs.unlink(path.join(competitorRoot, entry.name));
    }
  }

  for (const [manufacturer, rows] of [...byManufacturer.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    rows.sort((a, b) => clean(a.model).localeCompare(clean(b.model)));
    await writeCsv(`data-sources/competitors/${manufacturerSlug(manufacturer)}.csv`, competitorHeaders, rows);
  }

  return {
    products: records.size,
    manufacturers: byManufacturer.size,
    approved: [...records.values()].filter((row) => row.approval_status === "approved").length,
  };
}

const wyrestorm = await migrateWyrestorm();
const competitors = await migrateCompetitors();

console.log(`[product-source-migration] WyreStorm products: ${wyrestorm.products}`);
console.log(`[product-source-migration] WyreStorm discontinued/do-not-spec: ${wyrestorm.discontinued}`);
console.log(`[product-source-migration] Competitor products: ${competitors.products}`);
console.log(`[product-source-migration] Competitor manufacturers: ${competitors.manufacturers}`);
console.log(`[product-source-migration] Approved competitor profiles: ${competitors.approved}`);
