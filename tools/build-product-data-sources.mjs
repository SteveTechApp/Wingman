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
import {
  applyRoutedIoEvidence,
  loadRoutedIoEvidence,
} from "./lib/routed-io-evidence.mjs";

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
const knownCompareProfilesPath = "data/governance/known-compare-profiles.json";

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

// The products.csv inputs/outputs/resolution_bandwidth/usb/audio/control/
// network_requirement columns are optional and, for the large majority of
// SKUs, were never filled in. Rather than ship an empty quick-glance summary
// for every product, fall back to a concise summary derived from the richer
// technicalProfile.video/audio/usb/network/control sub-profiles and the
// (accessory-filtered) io.ports list, which already carry real, sourced
// evidence. A CSV value - once someone curates one - always wins over this
// derived fallback.
function deriveSourceCatalogFallback(product) {
  const profile = product?.technicalProfile && typeof product.technicalProfile === "object" ? product.technicalProfile : {};
  const io = profile.io && typeof profile.io === "object" ? profile.io : {};
  const ports = Array.isArray(io.ports) ? io.ports : [];
  const hasDirection = ports.some((port) => port.direction === "input" || port.direction === "output");
  const portsWithDirection = (direction) => ports.filter((port) => port.direction === direction);
  const formatPorts = (list) => list.map((port) => `${port.count}x ${port.connector}`).join(", ");

  const inputs = hasDirection
    ? formatPorts(portsWithDirection("input"))
    : ports.length
      ? `${formatPorts(ports)} (direction not specified in source)`
      : "";
  const outputs = hasDirection ? formatPorts(portsWithDirection("output")) : "";

  const video = profile.video;
  const resolutionBandwidth = video?.present
    ? unique([...(video.standards || []), ...(video.maxResolutions || []), ...(video.bandwidth || [])]).slice(0, 6).join(", ")
    : "";
  const usb = profile.usb?.present
    ? unique([...(profile.usb.versions || []), ...(profile.usb.connectors || []), ...(profile.usb.roles || []), profile.usb.powerDelivery ? "Power delivery" : ""]).slice(0, 6).join(", ")
    : "";
  const audio = profile.audio?.present
    ? unique([...(profile.audio.formats || []), ...(profile.audio.networkAudio || []), ...(profile.audio.processing || [])]).slice(0, 6).join(", ")
    : "";
  const control = profile.control?.present ? unique(profile.control.protocols || []).join(", ") : "";
  const networkRequirement = profile.network?.present
    ? unique([...(profile.network.protocols || []), ...(profile.network.linkSpeeds || []), ...(profile.network.powerOverNetwork || [])]).slice(0, 6).join(", ")
    : "";

  return { inputs, outputs, resolutionBandwidth, usb, audio, control, networkRequirement };
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
        sourceCatalog: (() => {
          const fallback = deriveSourceCatalogFallback(enrichment);
          return {
          inputs: clean(sourceRow.inputs) || fallback.inputs,
          outputs: clean(sourceRow.outputs) || fallback.outputs,
          transportType: clean(sourceRow.transport_type),
          resolutionBandwidth: clean(sourceRow.resolution_bandwidth) || fallback.resolutionBandwidth,
          usb: clean(sourceRow.usb) || fallback.usb,
          audio: clean(sourceRow.audio) || fallback.audio,
          control: clean(sourceRow.control) || fallback.control,
          networkRequirement: clean(sourceRow.network_requirement) || fallback.networkRequirement,
          dependencies: splitList(sourceRow.dependencies),
          compatibleFamilies: splitList(sourceRow.compatible_families),
          applicationFit: clean(sourceRow.application_fit),
          disqualifiers: clean(sourceRow.disqualifiers),
          quoteWarnings: clean(sourceRow.quote_warnings),
          evidenceSource: clean(sourceRow.evidence_source || lifecycle.evidence_source),
          lastReviewed: clean(sourceRow.last_reviewed || lifecycle.last_reviewed),
          reviewer: clean(sourceRow.reviewer || lifecycle.reviewer),
          lifecycleReason: clean(lifecycle.reason),
          };
        })(),
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

// Competitor rows are hand-curated per manufacturer, and control_json/audio_json/
// features_json/specs_json are optional columns that are frequently left blank
// even when the summary/notes text already states the fact in prose (e.g. a
// summary that says "RS-232 and IR control" but has no control_json entry).
// These helpers mine ONLY the free text already present on the row (summary,
// known_limitations, notes, technology, max_resolution) for the same signal
// categories the WyreStorm sourceCatalog fallback covers, so nothing here is
// invented - a feature/control/audio line only appears if its trigger phrase
// is literally present in already-curated text.
const COMPETITOR_FEATURE_PATTERNS = [
  { label: "USB-C", pattern: /usb-?c/i },
  { label: "USB routing / KVM", pattern: /\bkvm\b|usb routing|usb host|usb 2\.0|usb 3\.\d/i },
  { label: "Dante", pattern: /\bdante\b/i },
  { label: "AES67", pattern: /aes67/i },
  { label: "Multiview", pattern: /multi[-\s]?view/i },
  { label: "Video wall", pattern: /video\s*wall|videowall/i },
  { label: "Wireless casting / presentation", pattern: /wireless (casting|presentation|screen ?sharing)|airplay|miracast|clickshare|screen mirroring/i },
  { label: "Casting dongle", pattern: /\bdongle\b|clickshare button/i },
  { label: "10G / SDVoE", pattern: /\b10g\b|sdvoe/i },
  { label: "HDBaseT output", pattern: /hdbaset|hdbt/i },
  { label: "PoE", pattern: /\bpoe\b|power over ethernet/i },
];

function deriveCompetitorFeatures(text) {
  return COMPETITOR_FEATURE_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.label);
}

const COMPETITOR_CONTROL_PATTERNS = [
  { label: "RS-232", pattern: /rs-?232/i },
  { label: "IR", pattern: /\bir\b|infrared/i },
  { label: "CEC", pattern: /\bcec\b/i },
  { label: "Relay / contact closure", pattern: /\brelay\b|contact closure/i },
  { label: "GPIO", pattern: /\bgpio\b/i },
  { label: "TCP/IP", pattern: /tcp\/ip|ip control|ethernet control/i },
  { label: "Web UI", pattern: /web ui|web interface/i },
  { label: "API", pattern: /\bapi\b/i },
  { label: "Telnet", pattern: /\btelnet\b/i },
];

function deriveCompetitorControl(text) {
  return COMPETITOR_CONTROL_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.label);
}

const COMPETITOR_AUDIO_PATTERNS = [
  { label: "Embedded audio", pattern: /audio\s*embed|embedded audio/i },
  { label: "De-embedded audio", pattern: /de-?embed/i },
  { label: "Dante", pattern: /\bdante\b/i },
  { label: "AES67", pattern: /aes67/i },
  { label: "Analog audio", pattern: /analog(ue)? audio|line (in|out)|phoenix audio/i },
  { label: "USB audio", pattern: /usb audio/i },
  { label: "ARC / eARC", pattern: /\bearc\b|\barc\b/i },
];

function deriveCompetitorAudio(text) {
  return COMPETITOR_AUDIO_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.label);
}

// Structured HDMI/HDBaseT/USB version facts, only populated when a version
// token is literally present in the source text (never inferred from
// product class or brand reputation).
function deriveCompetitorVideoDetail(text) {
  const result = {};
  const hdmi = text.match(/\bhdmi\s*(2\.1|2\.0[ab]?|1\.4|1\.3)\b/i);
  if (hdmi) result.hdmi = hdmi[1];
  const hdbaset = text.match(/\bhdbaset\s*(3\.0|2\.0|1\.0)\b/i);
  if (hdbaset) result.hdbaset = `HDBaseT ${hdbaset[1]}`;
  const hdbasetClass =
    text.match(/\bhdbaset[^.]{0,24}\bclass\s*([abc])\b/i) || text.match(/\bclass\s*([abc])\b[^.]{0,24}\bhdbaset\b/i);
  if (hdbasetClass) result.hdbasetClass = `Class ${hdbasetClass[1].toUpperCase()}`;
  const usb = text.match(/\busb\s*(3\.2|3\.1|3\.0|2\.0)\b/i);
  if (usb) result.usbStandard = `USB ${usb[1]}`;
  return result;
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

  const fallbackBlob = [
    row.summary,
    row.known_limitations,
    row.notes,
    row.technology,
    row.max_resolution,
  ].map(clean).filter(Boolean).join(" | ");
  const derivedFeatures = deriveCompetitorFeatures(fallbackBlob);
  const derivedControl = deriveCompetitorControl(fallbackBlob);
  const derivedAudio = deriveCompetitorAudio(fallbackBlob);
  const derivedVideoDetail = deriveCompetitorVideoDetail(fallbackBlob);
  const featureListEmpty = Array.isArray(featureValue)
    ? featureValue.length === 0
    : !featureValue || (typeof featureValue === "object" && Object.keys(featureValue).length === 0);

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
    control: control.length ? control : derivedControl,
    audio: audio.length ? audio : derivedAudio,
    features: featureListEmpty ? derivedFeatures : featureValue,
    video: {
      ...derivedVideoDetail,
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

async function buildMaintenanceOutputs(products, competitors, _manifest) {
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

/** Emits the routed-I/O evidence authority onto the canonical WyreStorm
 * products and the competitor catalog by SKU, so every downstream artifact
 * (public index, server-seeded runtime state) carries it by construction. */
function applyRoutedIoEvidenceBySku(products, competitors) {
  const evidence = loadRoutedIoEvidence();
  let applied = 0;

  for (const record of [...products, ...competitors]) {
    const entry = evidence[normaliseSku(record?.sku)];
    if (!entry) continue;
    applyRoutedIoEvidence(record, entry);
    applied += 1;
  }

  if (applied > 0) {
    console.log(`[product-data] Routed I/O evidence applied: ${applied} product(s).`);
  }
}

function applyRoutedIoEvidenceToNestedRecords(value, evidence) {
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + applyRoutedIoEvidenceToNestedRecords(item, evidence), 0);
  }
  if (!value || typeof value !== "object") return 0;

  let applied = 0;
  const sku = normaliseSku(value.sku);
  if (sku && evidence[sku]) {
    applyRoutedIoEvidence(value, evidence[sku]);
    applied += 1;
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") {
      applied += applyRoutedIoEvidenceToNestedRecords(child, evidence);
    }
  }
  return applied;
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
  applyRoutedIoEvidenceBySku(products, competitors);
  const knownCompareProfiles = await readJson(knownCompareProfilesPath);
  applyRoutedIoEvidenceToNestedRecords(knownCompareProfiles, loadRoutedIoEvidence());
  const competitorFiles = (await fs.readdir(competitorDirectory))
    .filter((name) => name.endsWith(".csv"))
    .sort()
    .map((name) => `data-sources/competitors/${name}`);
  const manifest = await buildManifest(products, competitors, competitorFiles);
  if (checkOnly) {
    // Verify the committed manifest matches the current sources. Without this,
    // editing a source CSV and forgetting to rebuild leaves the checked-in
    // hashes stale while --check still passes — drift stays silent.
    let committed;
    try {
      committed = await readJson(manifestOutputPath);
    } catch {
      fail(`Committed manifest ${manifestOutputPath} is missing. Run: npm run data:sources:build`);
    }
    const committedHashes = committed?.hashes;
    if (!committedHashes || typeof committedHashes !== "object") {
      fail(`Committed manifest ${manifestOutputPath} has no hashes object. Run: npm run data:sources:build`);
    }
    const stale = Object.keys(manifest.hashes)
      .filter((file) => committedHashes[file] !== manifest.hashes[file]);
    if (stale.length) {
      fail(`Source files changed since the manifest was generated — ${stale.join(", ")}. Run: npm run data:sources:build`);
    }
  }
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
    await writeJson(knownCompareProfilesPath, knownCompareProfiles);
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
