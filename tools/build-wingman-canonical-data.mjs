import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { atomicWriteJson } from "./lib/atomic-json-writer.mjs";

const repoRoot = process.cwd();

const productSources = [
  {
    name: "wyrestorm-product-intelligence",
    path: "data/wyrestorm-product-intelligence.json",
    priority: 30,
  },
  {
    name: "product-intelligence-db",
    path: "data/product-intelligence-db.json",
    priority: 20,
  },
];

const outputPath = path.join(repoRoot, "data", "wingman-canonical-product-store.json");
const queuePath = path.join(repoRoot, "data", "wingman-data-maintenance-queue.json");
const reportJsonPath = path.join(repoRoot, "reports", "wingman-data-maintenance-report.json");
const reportMdPath = path.join(repoRoot, "reports", "wingman-data-maintenance-report.md");

const sourceControlledTimestamp = "source-controlled";

const skuAliasEntries = [
  {
    canonicalSku: "MXV-0808-H2A-V3",
    aliases: ["MXV-0808-H2A", "MXV0808H2A", "MXV 0808 H2A", "MXV-0808-H2A-V3", "MXV0808H2AV3"],
  },
  {
    canonicalSku: "MXV-0808-H2A-70-V3",
    aliases: ["MXV-0808-70-H2A", "MXV080870H2A", "MXV 0808 70 H2A", "MXV-0808-H2A-70", "MXV-0808-H2A-70-V3", "MXV0808H2A70V3"],
  },
  {
    canonicalSku: "MXV-0808-H2A-KIT",
    aliases: ["MXV-0808-H2A-KIT", "MXV0808H2AKIT", "MXV 0808 H2A KIT"],
  },
  {
    canonicalSku: "MX-0808-KIT-V2",
    aliases: ["MX-0808-KIT", "MX0808KIT", "MX 0808 KIT", "MX-0808-KIT-V2", "MX0808KITV2"],
  },
  {
    canonicalSku: "MX-0808-H2A-MK2",
    aliases: ["MX-0808-H2A", "MX0808H2A", "MX 0808 H2A", "MX-0808-H2A-MK2", "MX0808H2AMK2"],
  },
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normaliseSkuKey(value) {
  return clean(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function normaliseSku(value) {
  return clean(value)
    .replace(/^product\//i, "")
    .replace(/^global\//i, "")
    .replace(/^product-/i, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9-]/gi, "")
    .replace(/-+$/g, "")
    .toUpperCase();
}

function resolveSkuAlias(value) {
  const inputKey = normaliseSkuKey(value);

  if (!inputKey) return normaliseSku(value);

  for (const entry of skuAliasEntries) {
    if (normaliseSkuKey(entry.canonicalSku) === inputKey) return entry.canonicalSku;
    if (entry.aliases.some((alias) => normaliseSkuKey(alias) === inputKey)) return entry.canonicalSku;
  }

  return normaliseSku(value);
}

function unique(values) {
  const seen = new Set();
  const results = [];

  for (const value of values.flat()) {
    // Preserve structured items (e.g. technicalProfile port objects). Previously
    // clean() ran String() over these, producing "[object Object]" entries that
    // destroyed the structured I/O the compare engine relies on. Keep the original
    // object/array intact and dedupe it by its JSON signature instead.
    if (isPlainObject(value) || Array.isArray(value)) {
      const key = JSON.stringify(value);

      if (seen.has(key)) continue;

      seen.add(key);
      results.push(value);
      continue;
    }

    const text = clean(value);
    const key = text.toLowerCase();

    if (!text || seen.has(key)) continue;

    seen.add(key);
    results.push(text);
  }

  return results;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return clean(value).length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function payloadToArray(value) {
  if (Array.isArray(value)) return value;
  if (isPlainObject(value)) {
    if (Array.isArray(value.products)) return value.products;
    if (Array.isArray(value.records)) return value.records;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.catalog)) return value.catalog;
    if (Array.isArray(value.data)) return value.data;
  }

  return [];
}

async function readJsonOptional(relativePath) {
  try {
    const raw = await readFile(path.join(repoRoot, relativePath), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readTextOptional(relativePath) {
  try {
    return await readFile(path.join(repoRoot, relativePath), "utf8");
  } catch {
    return "";
  }
}

function mergeObject(baseValue, incomingValue) {
  if (Array.isArray(baseValue) || Array.isArray(incomingValue)) {
    return unique([
      ...(Array.isArray(baseValue) ? baseValue : []),
      ...(Array.isArray(incomingValue) ? incomingValue : []),
    ]);
  }

  if (isPlainObject(baseValue) && isPlainObject(incomingValue)) {
    const merged = { ...baseValue };

    for (const [key, value] of Object.entries(incomingValue)) {
      if (!hasValue(value)) continue;

      if (Array.isArray(value)) {
        merged[key] = unique([...(Array.isArray(merged[key]) ? merged[key] : []), ...value]);
        continue;
      }

      if (isPlainObject(value) && isPlainObject(merged[key])) {
        merged[key] = mergeObject(merged[key], value);
        continue;
      }

      if (!hasValue(merged[key])) {
        merged[key] = value;
      }
    }

    return merged;
  }

  return hasValue(baseValue) ? baseValue : incomingValue;
}

function mergeProductRecord(existing, incoming) {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming.record)) {
    if (key === "dataMaintenance") continue;
    if (!hasValue(value)) continue;

    if (Array.isArray(value)) {
      merged[key] = unique([...(Array.isArray(merged[key]) ? merged[key] : []), ...value]);
      continue;
    }

    if (isPlainObject(value)) {
      merged[key] = mergeObject(merged[key], value);
      continue;
    }

    if (!hasValue(merged[key])) {
      merged[key] = value;
    }
  }

  return merged;
}

function productSku(product) {
  return clean(product?.sku || product?.SKU || product?.partNumber || product?.part_number || product?.model || product?.id);
}

function productTitle(product) {
  return clean(product?.title || product?.name || product?.productName || product?.product_name || productSku(product));
}

function getOfficialUrl(product) {
  const profile = isPlainObject(product.technicalProfile) ? product.technicalProfile : {};
  const sourceQuality = isPlainObject(profile.sourceQuality) ? profile.sourceQuality : {};

  return clean(
    product.officialUrl ||
      product.sourceUrl ||
      product.url ||
      product.productUrl ||
      profile.sourceUrl ||
      sourceQuality.officialUrl ||
      sourceQuality.url
  );
}

function getOfficialStatus(product) {
  const profile = isPlainObject(product.technicalProfile) ? product.technicalProfile : {};
  const sourceQuality = isPlainObject(profile.sourceQuality) ? profile.sourceQuality : {};
  const status = product.officialPageStatus ?? product.sourceStatus ?? sourceQuality.officialPageStatus ?? sourceQuality.status;
  return clean(status);
}

function getProfilePorts(product) {
  const profile = isPlainObject(product.technicalProfile) ? product.technicalProfile : {};
  const io = isPlainObject(profile.io) ? profile.io : {};
  return [
    ...(Array.isArray(io.ports) ? io.ports : []),
    ...(Array.isArray(profile.ports) ? profile.ports : []),
    ...(Array.isArray(product.ports) ? product.ports : []),
    ...(Array.isArray(product.connectors) ? product.connectors : []),
  ];
}

function getFeatureCount(product) {
  const profile = isPlainObject(product.technicalProfile) ? product.technicalProfile : {};

  return unique([
    ...(Array.isArray(product.features) ? product.features : []),
    ...(Array.isArray(product.featureTags) ? product.featureTags : []),
    ...(Array.isArray(profile.features) ? profile.features.map((feature) => feature?.label || feature?.name || feature) : []),
  ]).length;
}

function gate(status, label, detail) {
  return { status, label, detail };
}

function readinessGates(product) {
  const officialUrl = getOfficialUrl(product);
  const officialStatus = getOfficialStatus(product);
  const hasTechnicalProfile = isPlainObject(product.technicalProfile);
  const portCount = getProfilePorts(product).length;
  const featureCount = getFeatureCount(product);
  const lifecycle = clean(product.lifecycleStatus || product.lifecycle || product.productLifecycle);
  const availability = clean(product.regionalAvailability || product.availability || product.stockStatus);
  const approvedFor = isPlainObject(product.approvedFor) ? product.approvedFor : {};

  return {
    officialSource: gate(
      officialUrl && !/^404$/i.test(officialStatus) ? "pass" : "review",
      "Official source",
      officialUrl ? `Source: ${officialUrl}${officialStatus ? ` (${officialStatus})` : ""}` : "Missing official source URL."
    ),
    technicalProfile: gate(
      hasTechnicalProfile && featureCount > 0 ? "pass" : "review",
      "Technical profile",
      hasTechnicalProfile ? `${featureCount} features captured.` : "Missing technical profile."
    ),
    portsAndIo: gate(
      portCount > 0 ? "pass" : "review",
      "Ports and I/O",
      portCount > 0 ? `${portCount} port/connector items captured.` : "Missing structured ports or connectors."
    ),
    lifecycle: gate(
      lifecycle ? "pass" : "review",
      "Lifecycle",
      lifecycle || "Lifecycle status not yet confirmed."
    ),
    availability: gate(
      availability ? "pass" : "review",
      "Availability",
      availability || "Regional availability not yet confirmed."
    ),
    commercialReview: gate(
      approvedFor.proposal === true || clean(product.commercialReviewStatus).toLowerCase() === "approved" ? "pass" : "review",
      "Commercial review",
      approvedFor.proposal === true ? "Approved for proposal use." : "Proposal/commercial approval not confirmed."
    ),
  };
}

function confidenceFor(product) {
  const officialStatus = getOfficialStatus(product);
  const gates = readinessGates(product);
  let score = 35;

  if (getOfficialUrl(product)) score += 15;
  if (/^(200|page fetched|product-guide-pdf)$/i.test(officialStatus)) score += 15;
  if (isPlainObject(product.technicalProfile)) score += 20;
  if (getProfilePorts(product).length > 0) score += 10;
  if (getFeatureCount(product) > 0) score += 10;
  if (/404/i.test(officialStatus)) score -= 20;
  if (gates.lifecycle.status !== "pass") score -= 5;
  if (gates.availability.status !== "pass") score -= 5;

  return Math.max(5, Math.min(98, score));
}

function buildMaintenance(product, sourceEntries, aliases) {
  const gates = readinessGates(product);
  const gateStatuses = Object.values(gates).map((item) => item.status);
  const confidence = confidenceFor(product);
  const compareReady = gates.officialSource.status === "pass" && gates.technicalProfile.status === "pass";
  const proposalReady = gateStatuses.every((status) => status === "pass");

  return {
    canonicalSku: product.sku,
    aliases: unique(aliases.filter((alias) => alias && normaliseSkuKey(alias) !== normaliseSkuKey(product.sku))),
    sourceFiles: unique(sourceEntries.map((entry) => entry.relativePath)),
    sourceNames: unique(sourceEntries.map((entry) => entry.name)),
    lastCanonicalSync: sourceControlledTimestamp,
    confidence,
    status: proposalReady ? "customer-ready" : compareReady ? "compare-ready-with-review-gates" : "needs-data-review",
    approvedFor: {
      finder: confidence >= 65,
      compare: compareReady,
      pitch: confidence >= 60,
      proposal: proposalReady,
    },
    readinessGates: gates,
  };
}

function sourceSummary(sourceRecords) {
  return sourceRecords.map((source) => ({
    source: source.name,
    path: source.relativePath,
    recordCount: source.records.length,
    uniqueSkuCount: new Set(source.records.map((item) => normaliseSkuKey(productSku(item))).filter(Boolean)).size,
  }));
}

function countBy(products, getter) {
  const output = {};

  for (const product of products) {
    const key = clean(getter(product)) || "unknown";
    output[key] = (output[key] || 0) + 1;
  }

  return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b)));
}

function gateSummary(products) {
  const summary = {};

  for (const product of products) {
    const gates = product.dataMaintenance?.readinessGates || {};

    for (const [key, value] of Object.entries(gates)) {
      summary[key] ||= { pass: 0, review: 0 };
      summary[key][value.status] = (summary[key][value.status] || 0) + 1;
    }
  }

  return summary;
}

function likelyProductSku(value) {
  const sku = normaliseSku(value);

  if (!sku.includes("-")) return false;
  if (sku.length < 5 || sku.length > 52) return false;
  if (!/^(NHD|SW|SWX|MX|MXV|RX|RXV|TX|EX|EXA|EXP|APO|HALO|CAM|FOCUS|AMP|COM|SYN|SP|CAB|IDB|SR)-/i.test(sku)) return false;
  if (/(?:^|-)\d{2,4}X\d{2,4}(?:-|$)/i.test(sku)) return false;
  if (/(?:-SCALED|-PER\d*(?:-|$)|-SIDE(?:-|$)|-MAIN(?:-|$)|-FRONT(?:-|$)|-BACK(?:-|$)|-TOP(?:-|$)|-BOTTOM(?:-|$)|-CALLOUT(?:-|$))/i.test(sku)) return false;

  return true;
}

function numericSuffixBases(value) {
  const bases = [];
  let sku = normaliseSku(value);

  while (/-\d+$/.test(sku)) {
    sku = sku.replace(/-\d+$/, "");
    if (likelyProductSku(sku)) {
      bases.push(sku);
    }
  }

  return bases;
}

async function loadProductSources() {
  const sourceRecords = [];

  for (const source of productSources) {
    const payload = await readJsonOptional(source.path);
    const records = payloadToArray(payload);

    sourceRecords.push({
      ...source,
      relativePath: source.path,
      records,
    });
  }

  return sourceRecords;
}

function buildCanonicalProducts(sourceRecords) {
  const byCanonicalKey = new Map();

  for (const source of [...sourceRecords].sort((a, b) => b.priority - a.priority)) {
    for (const [index, record] of source.records.entries()) {
      const rawSku = productSku(record);
      const canonicalSku = resolveSkuAlias(rawSku);
      const canonicalKey = normaliseSkuKey(canonicalSku);

      if (!canonicalKey) continue;

      const incoming = {
        record: {
          ...record,
          brand: clean(record.brand || record.manufacturer || record.vendor || "WyreStorm"),
          vendorType: clean(record.vendorType || (clean(record.brand || "WyreStorm").toLowerCase() === "wyrestorm" ? "wyrestorm" : "")),
          sku: canonicalSku,
          title: productTitle(record),
          name: clean(record.name || record.title || productTitle(record)),
        },
        source,
        index,
        rawSku,
      };

      const existing = byCanonicalKey.get(canonicalKey);

      if (!existing) {
        byCanonicalKey.set(canonicalKey, {
          product: incoming.record,
          sourceEntries: [source],
          aliases: rawSku && normaliseSkuKey(rawSku) !== canonicalKey ? [rawSku] : [],
          sourceIndexes: [`${source.name}#${index + 1}`],
        });
        continue;
      }

      existing.product = mergeProductRecord(existing.product, incoming);
      existing.sourceEntries.push(source);
      existing.sourceIndexes.push(`${source.name}#${index + 1}`);

      if (rawSku && normaliseSkuKey(rawSku) !== canonicalKey) {
        existing.aliases.push(rawSku);
      }
    }
  }

  return [...byCanonicalKey.values()]
    .map((entry) => {
      const product = {
        ...entry.product,
        sku: resolveSkuAlias(entry.product.sku),
      };

      return {
        ...product,
        dataMaintenance: buildMaintenance(product, entry.sourceEntries, entry.aliases),
      };
    })
    .sort((a, b) => clean(a.sku).localeCompare(clean(b.sku)));
}

async function buildMaintenanceQueue(products) {
  const candidatePayload =
    (await readJsonOptional("data/wyrestorm-product-update-candidates.json")) ||
    (await readJsonOptional("public/wyrestorm-product-update-check.json")) ||
    {};
  const candidates = payloadToArray(candidatePayload.candidates ? { products: candidatePayload.candidates } : candidatePayload);
  const canonicalKeys = new Set(products.map((product) => normaliseSkuKey(product.sku)).filter(Boolean));

  const newWyrestormCandidates = candidates
    .filter((candidate) => likelyProductSku(candidate.sku || candidate.id || candidate.url))
    .filter((candidate) => !canonicalKeys.has(normaliseSkuKey(candidate.sku || candidate.id)))
    .filter((candidate) => !/returned 404/i.test(candidate.sourceStatus || ""))
    .filter((candidate) => !/^uc builder$/i.test(clean(candidate.title)))
    .filter((candidate) => !numericSuffixBases(candidate.sku || candidate.id).some((baseSku) => canonicalKeys.has(normaliseSkuKey(baseSku))))
    .map((candidate) => ({
      sku: normaliseSku(candidate.sku || candidate.id),
      title: clean(candidate.title || "Potential new WyreStorm product"),
      url: clean(candidate.url),
      sourceStatus: clean(candidate.sourceStatus),
      reason: clean(candidate.reason || "Found by WyreStorm data sweep but not present in canonical store."),
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku));

  const dataReviewItems = products
    .flatMap((product) => {
      const gates = product.dataMaintenance?.readinessGates || {};
      return Object.entries(gates)
        .filter(([, value]) => value.status !== "pass")
        .map(([gateName, value]) => ({
          sku: product.sku,
          title: productTitle(product),
          gate: gateName,
          detail: value.detail,
          confidence: product.dataMaintenance?.confidence || 0,
        }));
    })
    .sort((a, b) => a.confidence - b.confidence || a.sku.localeCompare(b.sku));

  return {
    generatedAt: new Date().toISOString(),
    newWyrestormCandidates,
    dataReviewItems,
    nextActions: [
      "Review new WyreStorm candidates and approve only real product SKUs.",
      "Confirm lifecycle and regional availability before allowing proposal-ready output.",
      "Add or update source URLs, datasheets and structured I/O for low-confidence records.",
      "Keep competitor updates evidence-tiered before moving them into approved compare profiles.",
    ],
  };
}

async function competitorSummary() {
  const phase4 = payloadToArray(await readJsonOptional("data/catalog/competitor-catalog.phase4.json"));
  const seed = payloadToArray(await readJsonOptional("data/catalog/competitor-compare.seed.json"));
  const sourceFeedText = await readTextOptional("src/wingman2/data/competitorSourceFeeds.ts");
  const sourceFeedCount = (sourceFeedText.match(/sourceUrl:/g) || []).length;

  return {
    phase4CatalogCount: phase4.length,
    seedCompareCount: seed.length,
    sourceFeedCount,
    brands: countBy([...phase4, ...seed], (product) => product.brand || product.manufacturer),
    reviewStatuses: countBy(phase4, (product) => product.status || "unknown"),
    note: "Competitor data is useful for guided comparison, but approved-profile coverage should continue to grow before unrestricted live-call use.",
  };
}

function markdownReport(report) {
  return [
    "# Wingman Data Maintenance Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Phase status",
    "",
    ...report.phaseStatus.map((phase) => `- ${phase.phase}: ${phase.status} - ${phase.detail}`),
    "",
    "## Product store",
    "",
    `- Canonical WyreStorm products: ${report.productStore.canonicalProductCount}`,
    `- Source records: ${report.productStore.sourceRecordCount}`,
    `- Runtime-ready source: data/wingman-canonical-product-store.json`,
    "",
    "## Readiness gates",
    "",
    ...Object.entries(report.productStore.gateSummary).map(([gateName, counts]) => `- ${gateName}: ${counts.pass || 0} pass, ${counts.review || 0} review`),
    "",
    "## Competitor intelligence",
    "",
    `- Phase 4 competitor catalog records: ${report.competitor.phase4CatalogCount}`,
    `- Seed compare records: ${report.competitor.seedCompareCount}`,
    `- Source-feed records: ${report.competitor.sourceFeedCount}`,
    "",
    "## Queue",
    "",
    `- New WyreStorm candidates needing approval: ${report.queue.newWyrestormCandidateCount}`,
    `- Data review items: ${report.queue.dataReviewItemCount}`,
    "",
    "## Next actions",
    "",
    ...report.nextActions.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

async function main() {
  const sourceRecords = await loadProductSources();
  const products = buildCanonicalProducts(sourceRecords);
  const queue = await buildMaintenanceQueue(products);
  const competitor = await competitorSummary();
  const gates = gateSummary(products);
  const report = {
    generatedAt: new Date().toISOString(),
    phaseStatus: [
      {
        phase: "1 canonical WyreStorm SKU store",
        status: "implemented",
        detail: "Merged product-intelligence-db and wyrestorm-product-intelligence into a single canonical store.",
      },
      {
        phase: "2 source sweep and delta queue",
        status: "implemented",
        detail: "Maintenance queue consumes the WyreStorm sweep output and filters obvious asset slugs.",
      },
      {
        phase: "3 runtime Compare source",
        status: "implemented",
        detail: "The public product index generator now prefers the canonical store when present.",
      },
      {
        phase: "4 data confidence gates",
        status: "implemented",
        detail: "Every SKU now carries official source, technical profile, I/O, lifecycle, availability and commercial review gates.",
      },
      {
        phase: "5 competitor evidence coverage",
        status: "implemented",
        detail: "Maintenance reporting includes competitor catalog, seed and source-feed coverage.",
      },
      {
        phase: "6 repeatable validation",
        status: "implemented",
        detail: "Use Update-WingmanData.ps1 to run canonical build, sweep, audits, checks, typecheck and build.",
      },
    ],
    productStore: {
      sourceFiles: sourceSummary(sourceRecords),
      sourceRecordCount: sourceRecords.reduce((sum, source) => sum + source.records.length, 0),
      canonicalProductCount: products.length,
      roleSummary: countBy(products, (product) => product.productRole || product.commercialRole),
      technologySummary: countBy(products, (product) => product.technologyType || product.hardwareType || product.category),
      gateSummary: gates,
    },
    competitor,
    queue: {
      newWyrestormCandidateCount: queue.newWyrestormCandidates.length,
      dataReviewItemCount: queue.dataReviewItems.length,
    },
    nextActions: [
      "Review the new-candidate queue after every fresh source sweep.",
      "Approve lifecycle, availability and commercial gates before using records in proposal output.",
      "Promote high-confidence competitor source-feed records into approved compare profiles.",
      "Keep the public product index generated from the canonical store before testing Compare.",
    ],
  };

  const output = {
    meta: {
      generatedAt: sourceControlledTimestamp,
      generator: "tools/build-wingman-canonical-data.mjs",
      sourceFiles: sourceRecords.map((source) => source.relativePath),
      count: products.length,
      note: "Canonical product source for Wingman Finder, Compare and sales-call data maintenance.",
    },
    products,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(queuePath), { recursive: true });
  await mkdir(path.dirname(reportJsonPath), { recursive: true });

  await atomicWriteJson(outputPath, output);
  await atomicWriteJson(queuePath, queue);
  await atomicWriteJson(reportJsonPath, report);
  await writeFile(reportMdPath, markdownReport(report), "utf8");

  console.log(`[wingman-data] Canonical products: ${products.length}`);
  console.log(`[wingman-data] New WyreStorm candidates queued: ${queue.newWyrestormCandidates.length}`);
  console.log(`[wingman-data] Data review items queued: ${queue.dataReviewItems.length}`);
  console.log("[wingman-data] Wrote data/wingman-canonical-product-store.json");
  console.log("[wingman-data] Wrote data/wingman-data-maintenance-queue.json");
  console.log("[wingman-data] Wrote reports/wingman-data-maintenance-report.json");
  console.log("[wingman-data] Wrote reports/wingman-data-maintenance-report.md");
}

main().catch((error) => {
  console.error("[wingman-data] Canonical data build failed.");
  console.error(error);
  process.exit(1);
});
