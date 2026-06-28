import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  clean,
  normaliseKey,
  normaliseSku,
  readCsv,
  splitList,
  truthy,
} from "./product-update-utils.mjs";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const sourceRoot = path.join(root, "data-sources");
const wyrestormProductsPath = "data-sources/wyrestorm/products.csv";
const wyrestormLifecyclePath = "data-sources/wyrestorm/lifecycle.csv";
const wyrestormEnrichmentPath = "data-sources/wyrestorm/enrichment.json";
const competitorDirectory = path.join(sourceRoot, "competitors");
const canonicalOutputPath = "data/wingman-canonical-product-store.json";
const competitorOutputPath = "data/catalog/competitor-products.generated.json";
const manifestOutputPath = "data/catalog/product-data-manifest.generated.json";
const queueOutputPath = "data/wingman-data-maintenance-queue.json";
const reportJsonOutputPath = "reports/wingman-data-maintenance-report.json";
const reportMarkdownOutputPath = "reports/wingman-data-maintenance-report.md";

const blockedLifecycleStatuses = new Set([
  "discontinued",
  "eol",
  "do-not-spec",
  "superseded",
  "archive",
  "unlisted",
]);
const validLifecycleStatuses = new Set(["active", "review", ...blockedLifecycleStatuses]);
const validBusinessStatuses = new Set(["active", "review", "discontinued", "do-not-spec", "cable"]);
const validCompetitorStatuses = new Set(["approved", "review", "draft", "needs-evidence", "blocked", "ignored"]);
const validConfidence = new Set(["low", "medium", "high"]);

const requiredWyrestormHeaders = [
  "sku",
  "product_name",
  "family",
  "product_type",
  "role",
  "lifecycle_status",
  "do_not_spec",
  "evidence_source",
  "last_reviewed",
  "reviewer",
];
const requiredLifecycleHeaders = [
  "sku",
  "lifecycle_status",
  "business_status",
  "do_not_spec",
  "reason",
  "evidence_source",
  "last_reviewed",
  "reviewer",
];
const requiredCompetitorHeaders = [
  "manufacturer",
  "model",
  "product_name",
  "product_class",
  "role",
  "approval_status",
  "source_tier",
  "inputs_json",
  "outputs_json",
  "features_json",
  "specs_json",
  "confidence",
  "evidence_source",
  "last_reviewed",
  "reviewer",
  "aliases_json",
];

function fail(message) {
  throw new Error(message);
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values.flat()) {
    if (value === null || value === undefined || value === "") continue;
    const signature = typeof value === "object" ? JSON.stringify(value) : clean(value).toLowerCase();
    if (seen.has(signature)) continue;
    seen.add(signature);
    output.push(value);
  }
  return output;
}

function productRows(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["products", "records", "items", "data"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));
}

async function writeJson(relativePath, payload) {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function assertHeaders(rows, required, sourceName) {
  if (!rows.length) fail(`${sourceName} has no data rows.`);
  const headers = new Set(Object.keys(rows[0]));
  const missing = required.filter((header) => !headers.has(header));
  if (missing.length) fail(`${sourceName} is missing required header(s): ${missing.join(", ")}`);
}

function assertUnique(rows, keyFn, sourceName) {
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (seen.has(key)) duplicates.push(`${key} (rows ${seen.get(key)} and ${row.__row})`);
    else seen.set(key, row.__row);
  }
  if (duplicates.length) fail(`${sourceName} has duplicate normalized key(s): ${duplicates.slice(0, 20).join(", ")}`);
}

function parseJsonCell(value, fallback, label) {
  const text = clean(value);
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) fail(`${label} must contain a JSON array.`);
    if (!Array.isArray(fallback) && (Array.isArray(parsed) || !parsed || typeof parsed !== "object")) {
      fail(`${label} must contain a JSON object.`);
    }
    return parsed;
  } catch (error) {
    fail(`${label} contains invalid JSON: ${error.message}`);
  }
}

function parseJsonValue(value, fallback, label) {
  const text = clean(value);
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} contains invalid JSON: ${error.message}`);
  }
}

function sourceUrl(product, sourceRow) {
  return clean(
    product?.officialUrl ||
      product?.sourceUrl ||
      product?.url ||
      product?.technicalProfile?.sourceQuality?.officialUrl ||
      product?.technicalProfile?.sourceQuality?.url ||
      sourceRow?.evidence_source,
  );
}

function getProfilePorts(product) {
  const profile = product?.technicalProfile && typeof product.technicalProfile === "object" ? product.technicalProfile : {};
  const io = profile?.io && typeof profile.io === "object" ? profile.io : {};
  return unique([
    ...(Array.isArray(io.ports) ? io.ports : []),
    ...(Array.isArray(profile.ports) ? profile.ports : []),
    ...(Array.isArray(product.ports) ? product.ports : []),
    ...(Array.isArray(product.connectors) ? product.connectors : []),
  ]);
}

function featureCount(product) {
  const profileFeatures = Array.isArray(product?.technicalProfile?.features)
    ? product.technicalProfile.features.map((feature) => feature?.label || feature?.name || feature)
    : [];
  return unique([
    ...(Array.isArray(product.features) ? product.features : []),
    ...(Array.isArray(product.featureTags) ? product.featureTags : []),
    ...profileFeatures,
  ]).length;
}

function confidenceFor(product, lifecycleStatus, doNotSpec) {
  let score = 35;
  if (sourceUrl(product, product.sourceCatalog)) score += 15;
  if (product.technicalProfile && typeof product.technicalProfile === "object") score += 20;
  if (getProfilePorts(product).length) score += 10;
  if (featureCount(product)) score += 10;
  if (lifecycleStatus === "active") score += 5;
  if (doNotSpec || blockedLifecycleStatuses.has(lifecycleStatus)) score = Math.min(score, 20);
  return Math.max(5, Math.min(98, score));
}

function buildWyrestormProducts(productSourceRows, lifecycleRows, enrichmentRows) {
  const lifecycleBySku = new Map(lifecycleRows.map((row) => [normaliseKey(row.sku), row]));
  const enrichmentBySku = new Map(
    enrichmentRows.map((product) => [normaliseKey(product.sku || product.id), product]),
  );
  const sourceKeys = new Set(productSourceRows.map((row) => normaliseKey(row.sku)));
  const enrichmentOnly = [...enrichmentBySku.keys()].filter((key) => !sourceKeys.has(key));
  if (enrichmentOnly.length) {
    fail(`WyreStorm enrichment contains SKU(s) absent from products.csv: ${enrichmentOnly.slice(0, 20).join(", ")}`);
  }

  return productSourceRows
    .map((sourceRow) => {
      const sku = normaliseSku(sourceRow.sku);
      const key = normaliseKey(sku);
      const lifecycle = lifecycleBySku.get(key);
      if (!lifecycle) fail(`WyreStorm lifecycle row missing for ${sku}.`);
      const lifecycleStatus = clean(lifecycle.lifecycle_status || sourceRow.lifecycle_status).toLowerCase();
      const businessStatus = clean(lifecycle.business_status).toLowerCase();
      if (!validLifecycleStatuses.has(lifecycleStatus)) {
        fail(`WyreStorm ${sku} has invalid lifecycle_status "${lifecycleStatus}".`);
      }
      if (!validBusinessStatuses.has(businessStatus)) {
        fail(`WyreStorm ${sku} has invalid business_status "${businessStatus}".`);
      }
      const doNotSpec = truthy(lifecycle.do_not_spec || sourceRow.do_not_spec);
      if (clean(sourceRow.lifecycle_status).toLowerCase() !== lifecycleStatus) {
        fail(`WyreStorm ${sku} lifecycle conflicts between products.csv and lifecycle.csv.`);
      }
      if (truthy(sourceRow.do_not_spec) !== doNotSpec) {
        fail(`WyreStorm ${sku} do_not_spec conflicts between products.csv and lifecycle.csv.`);
      }
      const lifecycleMatchesBusinessStatus =
        (["active", "cable"].includes(businessStatus) && lifecycleStatus === "active") ||
        (businessStatus === "review" && lifecycleStatus === "review") ||
        (businessStatus === "discontinued" &&
          ["discontinued", "eol", "superseded", "archive"].includes(lifecycleStatus)) ||
        (businessStatus === "do-not-spec" && lifecycleStatus === "do-not-spec");
      if (!lifecycleMatchesBusinessStatus) {
        fail(`WyreStorm ${sku} business_status "${businessStatus}" conflicts with lifecycle_status "${lifecycleStatus}".`);
      }
      if (blockedLifecycleStatuses.has(lifecycleStatus) && !doNotSpec) {
        fail(`WyreStorm ${sku} is ${lifecycleStatus} but do_not_spec is not true.`);
      }

      const enrichment = enrichmentBySku.get(key);
      if (!enrichment) fail(`WyreStorm enrichment row missing for ${sku}.`);
      const blocked = doNotSpec || blockedLifecycleStatuses.has(lifecycleStatus);
      const supportingOnly = businessStatus === "cable" || clean(sourceRow.role).toLowerCase() === "cable";
      const product = {
        ...enrichment,
        brand: "WyreStorm",
        vendorType: "wyrestorm",
        sku,
        id: clean(enrichment.id || sku),
        name: clean(sourceRow.product_name || enrichment.name || enrichment.title || sku),
        title: clean(sourceRow.product_name || enrichment.title || enrichment.name || sku),
        family: clean(sourceRow.family || enrichment.family),
        category: clean(sourceRow.product_type || enrichment.category),
        productRole: clean(sourceRow.role || enrichment.productRole),
        lifecycleStatus,
        businessStatus,
        doNotSpec,
        successor: clean(lifecycle.successor || sourceRow.successor),
        sourceCatalog: {
          inputs: clean(sourceRow.inputs),
          outputs: clean(sourceRow.outputs),
          transportType: clean(sourceRow.transport_type),
          resolutionBandwidth: clean(sourceRow.resolution_bandwidth),
          usb: clean(sourceRow.usb),
          audio: clean(sourceRow.audio),
          control: clean(sourceRow.control),
          networkRequirement: clean(sourceRow.network_requirement),
          dependencies: splitList(sourceRow.dependencies),
          compatibleFamilies: splitList(sourceRow.compatible_families),
          applicationFit: clean(sourceRow.application_fit),
          disqualifiers: clean(sourceRow.disqualifiers),
          quoteWarnings: clean(sourceRow.quote_warnings),
          evidenceSource: clean(sourceRow.evidence_source || lifecycle.evidence_source),
          lastReviewed: clean(sourceRow.last_reviewed || lifecycle.last_reviewed),
          reviewer: clean(sourceRow.reviewer || lifecycle.reviewer),
          lifecycleReason: clean(lifecycle.reason),
        },
      };
      const confidence = confidenceFor(product, lifecycleStatus, doNotSpec);
      const officialSourcePass = Boolean(sourceUrl(product, sourceRow));
      const technicalProfilePass = Boolean(product.technicalProfile && featureCount(product));
      const portsPass = getProfilePorts(product).length > 0;
      const active = lifecycleStatus === "active";
      const reviewUsable = lifecycleStatus === "review";
      const compareReady = !blocked && !supportingOnly && (active || reviewUsable) && officialSourcePass && technicalProfilePass;
      const finderReady = !blocked && !supportingOnly && (active || reviewUsable) && confidence >= 60;
      const proposalReady = active && !blocked && !supportingOnly && officialSourcePass && technicalProfilePass && portsPass;

      product.dataMaintenance = {
        canonicalSku: sku,
        aliases: Array.isArray(enrichment?.dataMaintenance?.aliases) ? enrichment.dataMaintenance.aliases : [],
        sourceFiles: [
          wyrestormProductsPath,
          wyrestormLifecyclePath,
          wyrestormEnrichmentPath,
        ],
        lastCanonicalSync: "source-controlled",
        confidence,
        status: blocked
          ? "blocked"
          : supportingOnly
            ? "supporting-only"
          : proposalReady
            ? "customer-ready"
            : compareReady
              ? "compare-ready-with-review-gates"
              : "needs-data-review",
        approvedFor: {
          finder: finderReady,
          compare: compareReady,
          pitch: finderReady,
          proposal: proposalReady,
        },
        readinessGates: {
          officialSource: {
            status: officialSourcePass ? "pass" : "review",
            label: "Official source",
            detail: sourceUrl(product, sourceRow) || "Missing source evidence.",
          },
          technicalProfile: {
            status: technicalProfilePass ? "pass" : "review",
            label: "Technical profile",
            detail: technicalProfilePass ? `${featureCount(product)} features captured.` : "Missing technical profile.",
          },
          portsAndIo: {
            status: portsPass ? "pass" : "review",
            label: "Ports and I/O",
            detail: portsPass ? `${getProfilePorts(product).length} port/connector items captured.` : "Missing structured ports or connectors.",
          },
          lifecycle: {
            status: blocked ? "blocked" : active ? "pass" : "review",
            label: "Lifecycle",
            detail: lifecycleStatus,
          },
          commercialReview: {
            status: proposalReady ? "pass" : "review",
            label: "Commercial review",
            detail: proposalReady ? "Active and proposal eligible." : "Proposal approval not confirmed.",
          },
        },
      };
      return product;
    })
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

function numberOrUndefined(value) {
  const parsed = Number(value);
  return clean(value) && Number.isFinite(parsed) ? parsed : undefined;
}

function compileCompetitorRow(row, sourceFile) {
  const manufacturer = clean(row.manufacturer);
  const model = clean(row.model);
  const approvalStatus = clean(row.approval_status).toLowerCase();
  const confidence = clean(row.confidence || "low").toLowerCase();
  if (!manufacturer || !model) fail(`${sourceFile} row ${row.__row} is missing manufacturer or model.`);
  if (!validCompetitorStatuses.has(approvalStatus)) {
    fail(`${sourceFile} ${manufacturer} ${model} has invalid approval_status "${approvalStatus}".`);
  }
  if (!validConfidence.has(confidence)) {
    fail(`${sourceFile} ${manufacturer} ${model} has invalid confidence "${confidence}".`);
  }
  if (approvalStatus === "approved") {
    const missing = ["product_class", "role", "evidence_source", "last_reviewed", "reviewer"]
      .filter((field) => !clean(row[field]));
    if (missing.length) {
      fail(`${sourceFile} approved profile ${manufacturer} ${model} is missing: ${missing.join(", ")}`);
    }
  }

  const inputs = parseJsonCell(row.inputs_json, [], `${sourceFile} ${manufacturer} ${model} inputs_json`);
  const outputs = parseJsonCell(row.outputs_json, [], `${sourceFile} ${manufacturer} ${model} outputs_json`);
  const control = parseJsonCell(row.control_json, [], `${sourceFile} ${manufacturer} ${model} control_json`);
  const audio = parseJsonCell(row.audio_json, [], `${sourceFile} ${manufacturer} ${model} audio_json`);
  const featureValue = parseJsonValue(row.features_json, [], `${sourceFile} ${manufacturer} ${model} features_json`);
  const specs = parseJsonCell(row.specs_json, {}, `${sourceFile} ${manufacturer} ${model} specs_json`);
  const aliases = parseJsonCell(row.aliases_json, [], `${sourceFile} ${manufacturer} ${model} aliases_json`);
  const inputCount = numberOrUndefined(row.input_count);
  const outputCount = numberOrUndefined(row.output_count);
  const routedInputCount = numberOrUndefined(row.routed_input_count) ?? inputCount;
  const routedOutputCount = numberOrUndefined(row.routed_output_count) ?? outputCount;
  const physicalOutputCount = numberOrUndefined(row.physical_output_count);
  const mirroredOutputCount = numberOrUndefined(row.mirrored_output_count);

  return {
    sku: model,
    model,
    name: clean(row.product_name || model),
    brand: manufacturer,
    manufacturer,
    family: clean(row.family),
    category: clean(row.product_class),
    subcategory: clean(row.subcategory),
    status: approvalStatus,
    approvalStatus,
    sourceTier: clean(row.source_tier),
    summary: clean(row.summary),
    sourceUrl: clean(row.evidence_source),
    evidenceSource: clean(row.evidence_source),
    lastReviewed: clean(row.last_reviewed),
    reviewer: clean(row.reviewer),
    confidence,
    role: clean(row.role),
    transport: clean(row.transport_type),
    technology: clean(row.technology || row.product_class),
    topology: clean(row.topology),
    directionality: clean(row.directionality),
    inputs,
    outputs,
    control,
    audio,
    features: featureValue,
    video: {
      ...(specs.video && typeof specs.video === "object" ? specs.video : {}),
      ...(clean(row.max_resolution) ? { maxResolution: clean(row.max_resolution) } : {}),
      ...(clean(row.chroma) ? { chroma: clean(row.chroma) } : {}),
    },
    ...(routedInputCount !== undefined
      ? {
          matrixInputs: routedInputCount,
          routedInputs: routedInputCount,
          routedInputCount,
        }
      : {}),
    ...(routedOutputCount !== undefined
      ? {
          matrixOutputs: routedOutputCount,
          routedOutputs: routedOutputCount,
          routedOutputCount,
        }
      : {}),
    ...(physicalOutputCount !== undefined ? { physicalOutputs: physicalOutputCount } : {}),
    ...(mirroredOutputCount !== undefined ? { mirroredOutputs: mirroredOutputCount } : {}),
    ...(clean(row.io_evidence_status) ? { ioEvidenceStatus: clean(row.io_evidence_status) } : {}),
    ...(clean(row.matrix_size_evidence) ? { matrixSizeEvidence: clean(row.matrix_size_evidence) } : {}),
    ...(clean(row.quote_safety) ? { quoteSafety: clean(row.quote_safety) } : {}),
    specs,
    aliases,
    knownLimitations: clean(row.known_limitations),
    closestWyrestormArchitecture: clean(row.closest_wyrestorm_architecture),
    closestWyrestormSkuOrFamily: clean(row.closest_wyrestorm_sku_or_family),
    notes: clean(row.notes),
    sourceFile,
    comparisonOnly: true,
  };
}

async function compileCompetitors() {
  const entries = (await fs.readdir(competitorDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".csv"))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!entries.length) fail("No competitor manufacturer CSV files found.");

  const rows = [];
  for (const entry of entries) {
    const relativePath = `data-sources/competitors/${entry.name}`;
    const fileRows = readCsv(relativePath);
    assertHeaders(fileRows, requiredCompetitorHeaders, relativePath);
    for (const row of fileRows) {
      const expectedSlug = clean(row.manufacturer)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (`${expectedSlug}.csv` !== entry.name) {
        fail(`${relativePath} row ${row.__row} manufacturer "${row.manufacturer}" belongs in ${expectedSlug}.csv.`);
      }
      rows.push({ ...row, __sourceFile: relativePath });
    }
  }
  assertUnique(rows, (row) => `${normaliseKey(row.manufacturer)}|${normaliseKey(row.model)}`, "competitor source package");
  const exactKeys = new Map(
    rows.map((row) => [`${normaliseKey(row.manufacturer)}|${normaliseKey(row.model)}`, row]),
  );
  const aliasOwners = new Map();
  const aliasConflicts = [];
  for (const row of rows) {
    const ownerKey = `${normaliseKey(row.manufacturer)}|${normaliseKey(row.model)}`;
    const aliases = parseJsonCell(
      row.aliases_json,
      [],
      `${row.__sourceFile} ${row.manufacturer} ${row.model} aliases_json`,
    );
    for (const alias of aliases) {
      const aliasKey = `${normaliseKey(row.manufacturer)}|${normaliseKey(alias)}`;
      if (!normaliseKey(alias) || aliasKey === ownerKey) continue;
      const exact = exactKeys.get(aliasKey);
      if (exact) {
        aliasConflicts.push(`${row.manufacturer} ${row.model} alias "${alias}" conflicts with exact model ${exact.model}`);
      }
      const previous = aliasOwners.get(aliasKey);
      if (previous && previous !== ownerKey) {
        aliasConflicts.push(`${row.manufacturer} alias "${alias}" is shared by ${previous.split("|")[1]} and ${normaliseKey(row.model)}`);
      } else {
        aliasOwners.set(aliasKey, ownerKey);
      }
    }
  }
  if (aliasConflicts.length) {
    fail(`Competitor aliases are ambiguous: ${aliasConflicts.slice(0, 30).join("; ")}`);
  }

  return rows
    .map((row) => compileCompetitorRow(row, row.__sourceFile))
    .filter((record) => !["blocked", "ignored"].includes(record.approvalStatus))
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.sku.localeCompare(b.sku));
}

async function hashFile(relativePath) {
  const content = await fs.readFile(path.join(root, relativePath));
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function buildManifest(products, competitors, competitorFiles) {
  const sourceFiles = [
    wyrestormProductsPath,
    wyrestormLifecyclePath,
    wyrestormEnrichmentPath,
    ...competitorFiles,
  ];
  const hashes = {};
  for (const sourceFile of sourceFiles) hashes[sourceFile] = await hashFile(sourceFile);

  return {
    schemaVersion: 1,
    generatedAt: "source-controlled",
    generator: "tools/build-product-data-sources.mjs",
    sourceFiles,
    hashes,
    counts: {
      wyrestorm: products.length,
      wyrestormBlocked: products.filter((product) => product.doNotSpec).length,
      competitor: competitors.length,
      competitorApproved: competitors.filter((record) => record.approvalStatus === "approved").length,
      competitorManufacturers: new Set(competitors.map((record) => record.manufacturer)).size,
    },
  };
}

async function buildMaintenanceOutputs(products, competitors, manifest) {
  let candidates = [];
  try {
    const payload = await readJson("data/wyrestorm-product-update-candidates.json");
    candidates = productRows(payload?.candidates ? { products: payload.candidates } : payload);
  } catch {
    candidates = [];
  }
  const knownSkus = new Set(products.map((product) => normaliseKey(product.sku)));
  const newWyrestormCandidates = candidates
    .filter((candidate) => {
      const sku = clean(candidate.sku || candidate.id);
      return sku && !knownSkus.has(normaliseKey(sku));
    })
    .map((candidate) => ({
      sku: normaliseSku(candidate.sku || candidate.id),
      title: clean(candidate.title || "Potential new WyreStorm product"),
      url: clean(candidate.url),
      sourceStatus: clean(candidate.sourceStatus),
      reason: clean(candidate.reason || "Found by source sweep but absent from authoritative products.csv."),
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku));

  const dataReviewItems = products.flatMap((product) =>
    Object.entries(product.dataMaintenance?.readinessGates || {})
      .filter(([, gate]) => gate.status !== "pass")
      .map(([gate, value]) => ({
        sku: product.sku,
        title: product.name,
        gate,
        detail: value.detail,
        confidence: product.dataMaintenance?.confidence || 0,
      })),
  );
  const queue = {
    generatedAt: "source-controlled",
    newWyrestormCandidates,
    dataReviewItems,
    nextActions: [
      "Review new WyreStorm candidates, then add approved products to data-sources/wyrestorm/products.csv and enrichment.json.",
      "Resolve lifecycle review rows before proposal approval.",
      "Add evidence URLs and reviewer metadata before promoting competitor rows to approved.",
      "Run npm run data:sources:build after every source edit.",
    ],
  };

  const report = {
    generatedAt: "source-controlled",
    phaseStatus: [
      { phase: "1 authoritative source package", status: "implemented", detail: "WyreStorm and manufacturer-sharded competitor sources live under data-sources." },
      { phase: "2 source validation", status: "implemented", detail: "Normalized duplicates, invalid JSON, lifecycle mismatches and approval gaps fail the build." },
      { phase: "3 canonical compile", status: "implemented", detail: "Runtime product catalogues are generated by tools/build-product-data-sources.mjs." },
      { phase: "4 lifecycle gating", status: "implemented", detail: "Discontinued and do-not-spec products are blocked from runtime recommendation outputs." },
      { phase: "5 competitor approval gating", status: "implemented", detail: "Draft and evidence-less competitor rows no longer resolve as approved profiles." },
      { phase: "6 repeatable maintenance", status: "implemented", detail: "Update-WingmanData.ps1 validates sources, compiles outputs, sweeps for deltas and runs safety checks." },
    ],
    productStore: {
      canonicalProductCount: products.length,
      runtimeEligibleCount: products.filter((product) => !product.doNotSpec).length,
      blockedCount: products.filter((product) => product.doNotSpec).length,
      compareReadyCount: products.filter((product) => product.dataMaintenance?.approvedFor?.compare).length,
      proposalReadyCount: products.filter((product) => product.dataMaintenance?.approvedFor?.proposal).length,
    },
    competitor: {
      productCount: competitors.length,
      approvedCount: competitors.filter((record) => record.approvalStatus === "approved").length,
      manufacturerCount: new Set(competitors.map((record) => record.manufacturer)).size,
      statusCounts: competitors.reduce((counts, record) => {
        counts[record.approvalStatus] = (counts[record.approvalStatus] || 0) + 1;
        return counts;
      }, {}),
    },
    queue: {
      newWyrestormCandidateCount: newWyrestormCandidates.length,
      dataReviewItemCount: dataReviewItems.length,
    },
    sourceManifest: manifestOutputPath,
  };
  const markdown = [
    "# Wingman Data Maintenance Report",
    "",
    "Generated from the authoritative `data-sources` package.",
    "",
    "## Product store",
    "",
    `- Canonical WyreStorm products: ${report.productStore.canonicalProductCount}`,
    `- Runtime eligible: ${report.productStore.runtimeEligibleCount}`,
    `- Lifecycle/do-not-spec blocked: ${report.productStore.blockedCount}`,
    `- Compare ready: ${report.productStore.compareReadyCount}`,
    `- Proposal ready: ${report.productStore.proposalReadyCount}`,
    "",
    "## Competitor intelligence",
    "",
    `- Products: ${report.competitor.productCount}`,
    `- Manufacturers: ${report.competitor.manufacturerCount}`,
    `- Approved exact profiles: ${report.competitor.approvedCount}`,
    ...Object.entries(report.competitor.statusCounts).map(([status, count]) => `- ${status}: ${count}`),
    "",
    "## Review queue",
    "",
    `- New WyreStorm candidates: ${report.queue.newWyrestormCandidateCount}`,
    `- Data review items: ${report.queue.dataReviewItemCount}`,
    "",
    "Run `npm run data:sources:build` after source edits, then review this report and the maintenance queue.",
    "",
  ].join("\n");
  return { queue, report, markdown };
}

async function main() {
  const productSourceRows = readCsv(wyrestormProductsPath);
  const lifecycleRows = readCsv(wyrestormLifecyclePath);
  const enrichmentRows = productRows(await readJson(wyrestormEnrichmentPath));
  assertHeaders(productSourceRows, requiredWyrestormHeaders, wyrestormProductsPath);
  assertHeaders(lifecycleRows, requiredLifecycleHeaders, wyrestormLifecyclePath);
  assertUnique(productSourceRows, (row) => normaliseKey(row.sku), wyrestormProductsPath);
  assertUnique(lifecycleRows, (row) => normaliseKey(row.sku), wyrestormLifecyclePath);

  const productKeys = new Set(productSourceRows.map((row) => normaliseKey(row.sku)));
  const lifecycleKeys = new Set(lifecycleRows.map((row) => normaliseKey(row.sku)));
  const lifecycleOnly = [...lifecycleKeys].filter((key) => !productKeys.has(key));
  const productOnly = [...productKeys].filter((key) => !lifecycleKeys.has(key));
  if (lifecycleOnly.length || productOnly.length) {
    fail(`WyreStorm product/lifecycle SKU mismatch. Product-only: ${productOnly.slice(0, 10).join(", ") || "-"}; lifecycle-only: ${lifecycleOnly.slice(0, 10).join(", ") || "-"}`);
  }

  const products = buildWyrestormProducts(productSourceRows, lifecycleRows, enrichmentRows);
  const competitors = await compileCompetitors();
  const competitorFiles = (await fs.readdir(competitorDirectory))
    .filter((name) => name.endsWith(".csv"))
    .sort()
    .map((name) => `data-sources/competitors/${name}`);
  const manifest = await buildManifest(products, competitors, competitorFiles);
  const maintenance = await buildMaintenanceOutputs(products, competitors, manifest);

  if (!checkOnly) {
    await writeJson(canonicalOutputPath, {
      meta: {
        generatedAt: "source-controlled",
        generator: "tools/build-product-data-sources.mjs",
        sourceManifest: manifestOutputPath,
        count: products.length,
      },
      products,
    });
    await writeJson(competitorOutputPath, competitors);
    await writeJson(manifestOutputPath, manifest);
    await writeJson(queueOutputPath, maintenance.queue);
    await writeJson(reportJsonOutputPath, maintenance.report);
    await fs.mkdir(path.dirname(path.join(root, reportMarkdownOutputPath)), { recursive: true });
    await fs.writeFile(path.join(root, reportMarkdownOutputPath), `${maintenance.markdown}\n`, "utf8");
  }

  console.log(`[product-data] WyreStorm products: ${products.length} (${manifest.counts.wyrestormBlocked} blocked)`);
  console.log(`[product-data] Competitor products: ${competitors.length} (${manifest.counts.competitorApproved} approved)`);
  console.log(`[product-data] Competitor manufacturers: ${manifest.counts.competitorManufacturers}`);
  console.log(checkOnly ? "[product-data] Source validation passed." : "[product-data] Canonical outputs written.");
}

main().catch((error) => {
  console.error(`[product-data] ${checkOnly ? "Source validation" : "Build"} failed.`);
  console.error(error.message || error);
  process.exit(1);
});
