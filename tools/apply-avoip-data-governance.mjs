import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const runSources = args.has("--sources") || (!args.has("--generated") && !args.has("--check"));
const runGenerated = args.has("--generated") || (!args.has("--sources") && !args.has("--check"));
const checkOnly = args.has("--check");

const registryPath = path.join(root, "data", "governance", "avoip-technology-registry.json");
const wyrestormCsvPath = path.join(root, "data-sources", "wyrestorm", "products.csv");
const wyrestormEnrichmentPath = path.join(root, "data-sources", "wyrestorm", "enrichment.json");
const competitorDirectory = path.join(root, "data-sources", "competitors");
const canonicalPath = path.join(root, "data", "wingman-canonical-product-store.json");
const competitorGeneratedPath = path.join(root, "data", "catalog", "competitor-products.generated.json");

function fail(message) {
  console.error(`[avoip-governance] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(registryPath)) fail(`Missing registry: ${registryPath}`);
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const allowedNetworkSpeeds = new Set(registry.policy?.networkSpeedValues ?? ["1GbE", "10GbE"]);

function clean(value) {
  return String(value ?? "").trim();
}

function normaliseSku(value) {
  return clean(value).toUpperCase().replace(/\s+/g, "");
}

function normaliseVendor(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function unique(values) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeIfChanged(filePath, nextText, label) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (current === nextText) return false;
  if (checkOnly) fail(`${label} is not normalised. Run npm run data:canonical-products.`);
  fs.writeFileSync(filePath, nextText, "utf8");
  console.log(`[avoip-governance] Updated ${path.relative(root, filePath)}`);
  return true;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const nonEmpty = rows.filter((values) => values.some((value) => value !== ""));
  const headers = (nonEmpty.shift() ?? []).map((header) => header.trim());
  const records = nonEmpty.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? "")])),
  );
  return { headers, records };
}

function csvCell(value) {
  const text = String(value ?? "");
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function serialiseCsv(headers, records) {
  const lines = [headers.map(csvCell).join(",")];
  for (const record of records) lines.push(headers.map((header) => csvCell(record[header])).join(","));
  return `${lines.join("\n")}\n`;
}

function recordText(record) {
  return [
    record.sku,
    record.model,
    record.name,
    record.title,
    record.product_name,
    record.family,
    record.category,
    record.product_class,
    record.subcategory,
    record.product_type,
    record.transport,
    record.transport_type,
    record.technology,
    record.summary,
    record.description,
    record.features,
    record.features_json,
    record.specs,
    record.specs_json,
    record.sourceCatalog,
    record.technicalProfile,
  ]
    .map((value) => (typeof value === "string" ? value : JSON.stringify(value ?? "")))
    .join(" ");
}

function isAvoip(record) {
  const identity = [
    record.sku,
    record.model,
    record.family,
    record.category,
    record.product_class,
    record.product_type,
    record.subcategory,
    record.role,
    record.transport,
    record.transport_type,
    record.technology,
  ].map(clean).join(" ").toLowerCase();
  return /\bavoip\b|av[ -]?over[ -]?ip|networkhd|sdvoe|omni-?stream|dm-?nvx|\bnav\b|zyper|vinx/.test(identity);
}

function findRule(vendor, sku, text = "") {
  const vendorKey = normaliseVendor(vendor);
  const skuValue = normaliseSku(sku);
  return (registry.rules ?? []).find((rule) => {
    if (rule.vendor && normaliseVendor(rule.vendor) !== vendorKey) return false;
    try {
      return new RegExp(rule.skuPattern, "i").test(skuValue) || (rule.textPattern && new RegExp(rule.textPattern, "i").test(text));
    } catch {
      return false;
    }
  });
}

function inferNetworkSpeed(text) {
  const value = clean(text).toLowerCase();
  if (/\b(?:1\s*gb(?:e|ps)?|one[- ]gigabit|1000base|gigabit ethernet|1gb managed network|over (?:a )?1gb network)\b/.test(value)) {
    return "1GbE";
  }
  if (/\b(?:10\s*gb(?:e|ps)?|ten[- ]gigabit|10-gigabit ethernet|10gbe network|sdvoe)\b/.test(value)) {
    return "10GbE";
  }
  return undefined;
}

function inferCodec(text) {
  const value = clean(text);
  if (/jpeg\s*2000/i.test(value)) return "JPEG2000";
  if (/sdvoe/i.test(value)) return "SDVoE Pixel Pipeline";
  if (/h\.?(?:264|265)/i.test(value)) {
    const codecs = [];
    if (/h\.?264/i.test(value)) codecs.push("H.264");
    if (/h\.?265|hevc/i.test(value)) codecs.push("H.265");
    return codecs.join("/");
  }
  if (/vc-?2|smpte\s*2042/i.test(value)) return "VC-2 / SMPTE 2042";
  if (/pure3/i.test(value)) return "PURE3";
  if (/visually[- ]lossless/i.test(value)) return "Visually lossless compression";
  if (/uncompressed/i.test(value)) return "Uncompressed";
  return undefined;
}

function technologyFor(record, vendor, sku) {
  const text = recordText(record);
  const rule = findRule(vendor, sku, text);
  const networkSpeed = rule?.networkSpeed ?? inferNetworkSpeed(text);
  const codec = rule?.codec ?? inferCodec(text);
  const chipset = Object.prototype.hasOwnProperty.call(rule ?? {}, "chipset") ? rule.chipset : null;
  const chipsetStatus = chipset ? "known" : rule?.chipsetStatus ?? "not-publicly-confirmed";
  return {
    rule,
    networkSpeed,
    codec,
    chipset,
    chipsetStatus,
    evidenceUrl: rule?.evidenceUrl,
  };
}

function mergeSpecs(target, technology) {
  const specs = target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {};
  if (technology.networkSpeed) specs.networkSpeed = technology.networkSpeed;
  specs.avoipChip = technology.chipset ?? null;
  specs.avoipChipStatus = technology.chipsetStatus;
  if (technology.codec) specs.avoipCodec = technology.codec;
  return specs;
}

function applySourceCsv(filePath, vendorType) {
  if (!fs.existsSync(filePath)) return { changed: false, avoipRows: 0, unresolved: [] };
  const { headers, records } = parseCsv(fs.readFileSync(filePath, "utf8"));
  const applicable = records
    .map((record) => {
      if (!isAvoip(record)) return null;
      const vendor = vendorType === "wyrestorm" ? "WyreStorm" : record.manufacturer;
      const sku = vendorType === "wyrestorm" ? record.sku : record.model;
      const technology = technologyFor(record, vendor, sku);
      if (vendorType === "wyrestorm" && !technology.rule && !technology.networkSpeed) return null;
      return { record, vendor, sku, technology };
    })
    .filter(Boolean);

  if (!applicable.length) return { changed: false, avoipRows: 0, unresolved: [] };

  for (const required of ["network_requirement", "avoip_chip", "avoip_codec", "avoip_chip_status"]) {
    if (!headers.includes(required)) headers.push(required);
  }

  const unresolved = [];
  let avoipRows = 0;
  for (const { record, vendor, sku, technology } of applicable) {
    avoipRows += 1;

    if (technology.networkSpeed) {
      record.network_requirement = `${technology.networkSpeed} managed AV network`;
    } else {
      record.network_requirement = "Unconfirmed - verify 1GbE or 10GbE";
      unresolved.push(`${vendor} ${sku}: network speed not confirmed`);
      if (vendorType === "competitor" && clean(record.approval_status).toLowerCase() === "approved") {
        record.approval_status = "review";
        if ("quote_safety" in record) record.quote_safety = "comparison-only-verify";
        if ("notes" in record && !/network speed/i.test(record.notes)) {
          record.notes = [clean(record.notes), "AVoIP network speed requires 1GbE/10GbE verification before approval."].filter(Boolean).join(" | ");
        }
      }
    }
    record.avoip_chip = technology.chipset ?? "";
    record.avoip_chip_status = technology.chipsetStatus;
    record.avoip_codec = technology.codec ?? "";

    if (vendorType === "competitor" && "specs_json" in record) {
      let specs = {};
      try {
        specs = clean(record.specs_json) ? JSON.parse(record.specs_json) : {};
      } catch {
        unresolved.push(`${vendor} ${sku}: invalid specs_json`);
      }
      record.specs_json = JSON.stringify(mergeSpecs(specs, technology));
    }
  }

  const nextText = serialiseCsv(headers, records);
  const changed = writeIfChanged(filePath, nextText, path.relative(root, filePath));
  return { changed, avoipRows, unresolved };
}

function normaliseWyrestormEnrichment() {
  const records = readJson(wyrestormEnrichmentPath);
  if (!Array.isArray(records)) fail(`Missing WyreStorm enrichment source: ${wyrestormEnrichmentPath}`);

  let touched = 0;
  for (const product of records) {
    const sku = normaliseSku(product.sku ?? product.id);
    if (!isAvoip(product)) continue;
    const technology = technologyFor(product, "WyreStorm", sku);
    if (!technology.rule && !technology.networkSpeed) continue;
    touched += 1;

    product.avoip = {
      networkSpeed: technology.networkSpeed ?? null,
      networkRequirement: technology.networkSpeed ? `${technology.networkSpeed} managed AV network` : "Unconfirmed",
      chipset: technology.chipset ?? null,
      chipsetStatus: technology.chipsetStatus,
      codec: technology.codec ?? null,
      evidenceUrl: technology.evidenceUrl ?? product.url ?? null,
    };
    product.specs = mergeSpecs(product.specs, technology);
    product.sourceCatalog = product.sourceCatalog && typeof product.sourceCatalog === "object"
      ? { ...product.sourceCatalog }
      : {};
    if (technology.networkSpeed) product.sourceCatalog.networkRequirement = `${technology.networkSpeed} managed AV network`;
    product.sourceCatalog.avoipChip = technology.chipset ?? null;
    product.sourceCatalog.avoipChipStatus = technology.chipsetStatus;
    if (technology.codec) product.sourceCatalog.avoipCodec = technology.codec;

    product.technicalProfile = product.technicalProfile && typeof product.technicalProfile === "object"
      ? { ...product.technicalProfile }
      : {};
    product.technicalProfile.avoip = {
      networkSpeed: technology.networkSpeed ?? null,
      codec: technology.codec ?? null,
      chipset: technology.chipset ?? null,
      chipsetStatus: technology.chipsetStatus,
      evidenceUrl: technology.evidenceUrl ?? null,
    };
    product.technicalProfile.network = product.technicalProfile.network && typeof product.technicalProfile.network === "object"
      ? { ...product.technicalProfile.network }
      : { present: true };
    if (technology.networkSpeed) product.technicalProfile.network.linkSpeeds = [technology.networkSpeed];

    const exact = registry.exactPortProfiles?.[sku];
    if (exact) applyExactPortProfile(product, exact);
  }

  writeIfChanged(wyrestormEnrichmentPath, stableJson(records), "WyreStorm enrichment AVoIP data");
  console.log(`[avoip-governance] Governed ${touched} WyreStorm enrichment records.`);
}

function portLabel(port) {
  const count = Number(port.count) || 1;
  const direction = port.direction && port.direction !== "unspecified" ? ` ${port.direction}` : "";
  return `${count} x ${port.connector}${direction}${port.detail ? ` - ${port.detail}` : ""}`;
}

function applyExactPortProfile(product, profile) {
  const ports = profile.ports.map((port) => ({ ...port, evidence: port.detail || port.connector }));
  const buckets = {
    ports,
    video: ports.filter((port) => port.category === "video"),
    audio: ports.filter((port) => port.category === "audio"),
    usb: ports.filter((port) => port.category === "usb"),
    network: ports.filter((port) => port.category === "network"),
    control: ports.filter((port) => port.category === "control"),
    power: ports.filter((port) => port.category === "power"),
  };

  product.connectors = unique(ports.map((port) => port.connector));
  product.specs = { ...(product.specs ?? {}), ...profile.specs };
  product.routedInputCount = profile.routedInputCount;
  product.routedOutputCount = profile.routedOutputCount;
  product.inputCount = profile.routedInputCount;
  product.outputCount = profile.routedOutputCount;

  product.technicalProfile = product.technicalProfile && typeof product.technicalProfile === "object"
    ? { ...product.technicalProfile }
    : {};
  product.technicalProfile.io = buckets;
  product.technicalProfile.avoip = {
    networkSpeed: profile.specs.networkSpeed,
    codec: profile.specs.avoipCodec,
    chipset: profile.specs.avoipChip,
    chipsetStatus: profile.specs.avoipChipStatus,
    evidenceUrl: profile.sourceUrl,
  };
  product.technicalProfile.usb = {
    present: profile.specs.usbTotalPorts > 0,
    versions: unique(ports.filter((port) => port.category === "usb").map((port) => port.connector.replace(/\s+Type.*$/i, ""))),
    connectors: unique(ports.filter((port) => port.category === "usb").map((port) => port.connector)),
    roles: unique(ports.filter((port) => port.category === "usb").map((port) => port.detail)),
    totalPorts: profile.specs.usbTotalPorts,
  };
  product.technicalProfile.network = {
    present: true,
    linkSpeeds: [profile.specs.networkSpeed],
    ports: ports.filter((port) => port.category === "network").map(portLabel),
  };

  product.sourceCatalog = product.sourceCatalog && typeof product.sourceCatalog === "object"
    ? { ...product.sourceCatalog }
    : {};
  product.sourceCatalog.inputs = ports.filter((port) => port.direction === "input" && !["power", "control"].includes(port.category)).map(portLabel);
  product.sourceCatalog.outputs = ports.filter((port) => port.direction === "output" && !["power", "control"].includes(port.category)).map(portLabel);
  product.sourceCatalog.usb = ports.filter((port) => port.category === "usb").map(portLabel).join("; ");
  product.sourceCatalog.networkRequirement = `${profile.specs.networkSpeed} managed AV network`;
  product.sourceCatalog.avoipChip = profile.specs.avoipChip;
  product.sourceCatalog.avoipChipStatus = profile.specs.avoipChipStatus;
  product.sourceCatalog.avoipCodec = profile.specs.avoipCodec;
}

function applyTechnologyToGenerated(record, vendor, sku) {
  if (!isAvoip(record)) return false;
  const technology = technologyFor(record, vendor, sku);
  if (!technology.rule && !technology.networkSpeed) return false;
  if (technology.networkSpeed && !allowedNetworkSpeeds.has(technology.networkSpeed)) {
    fail(`${vendor} ${sku} uses invalid network speed ${technology.networkSpeed}`);
  }

  record.avoip = {
    networkSpeed: technology.networkSpeed ?? null,
    networkRequirement: technology.networkSpeed ? `${technology.networkSpeed} managed AV network` : "Unconfirmed",
    chipset: technology.chipset ?? null,
    chipsetStatus: technology.chipsetStatus,
    codec: technology.codec ?? null,
    evidenceUrl: technology.evidenceUrl ?? record.sourceUrl ?? record.url ?? null,
  };
  record.specs = mergeSpecs(record.specs, technology);

  record.sourceCatalog = record.sourceCatalog && typeof record.sourceCatalog === "object"
    ? { ...record.sourceCatalog }
    : {};
  if (technology.networkSpeed) record.sourceCatalog.networkRequirement = `${technology.networkSpeed} managed AV network`;
  record.sourceCatalog.avoipChip = technology.chipset ?? null;
  record.sourceCatalog.avoipChipStatus = technology.chipsetStatus;
  if (technology.codec) record.sourceCatalog.avoipCodec = technology.codec;

  if (record.technicalProfile && typeof record.technicalProfile === "object") {
    record.technicalProfile.avoip = {
      networkSpeed: technology.networkSpeed ?? null,
      codec: technology.codec ?? null,
      chipset: technology.chipset ?? null,
      chipsetStatus: technology.chipsetStatus,
      evidenceUrl: technology.evidenceUrl ?? null,
    };
    if (record.technicalProfile.network && typeof record.technicalProfile.network === "object" && technology.networkSpeed) {
      record.technicalProfile.network.linkSpeeds = [technology.networkSpeed];
    }
  }
  return true;
}

function normaliseCanonical() {
  const payload = readJson(canonicalPath);
  if (!payload) fail(`Missing generated canonical store: ${canonicalPath}`);
  const products = Array.isArray(payload) ? payload : payload.products;
  if (!Array.isArray(products)) fail("Canonical store must be an array or contain products[].");

  let touched = 0;
  for (const product of products) {
    const sku = normaliseSku(product.sku ?? product.id);
    if (checkOnly) {
      if (isAvoip(product) && findRule("WyreStorm", sku, recordText(product))) touched += 1;
      continue;
    }
    if (applyTechnologyToGenerated(product, "WyreStorm", sku)) touched += 1;
    const exact = registry.exactPortProfiles?.[sku];
    if (exact) applyExactPortProfile(product, exact);
  }

  const tx = products.find((product) => normaliseSku(product.sku ?? product.id) === "NHD-500-TX");
  if (!tx) fail("NHD-500-TX missing from canonical product store.");
  const txUsb = Number(tx.specs?.usbTotalPorts);
  if (txUsb !== 1) fail(`NHD-500-TX must have exactly 1 USB port; found ${txUsb || 0}.`);
  if (tx.specs?.hdmiInputs !== 1 || tx.specs?.hdmiOutputs !== 1) {
    fail("NHD-500-TX must have 1 HDMI input and 1 HDMI loop output.");
  }
  const txPortText = JSON.stringify(tx.technicalProfile?.io?.ports ?? []).toLowerCase();
  if (/rack bracket|wall bracket|mounting kit|in the box/.test(txPortText)) {
    fail("NHD-500-TX port profile still contains packaging or mounting accessories.");
  }
  if (tx.avoip?.networkSpeed !== "1GbE") fail("NHD-500-TX must be governed as 1GbE.");
  if (!Object.prototype.hasOwnProperty.call(tx.avoip ?? {}, "chipset")) fail("NHD-500-TX must record the chipset field, even when unconfirmed.");

  if (!checkOnly) {
    const next = Array.isArray(payload) ? products : { ...payload, products };
    writeIfChanged(canonicalPath, stableJson(next), "canonical AVoIP data");
  }
  console.log(`[avoip-governance] ${checkOnly ? "Validated" : "Governed"} ${touched} WyreStorm AVoIP records.`);
}

function validateCompetitors() {
  const records = readJson(competitorGeneratedPath);
  if (!Array.isArray(records)) fail(`Missing generated competitor catalogue: ${competitorGeneratedPath}`);
  let checked = 0;
  const unresolvedApproved = [];

  for (const record of records) {
    if (!isAvoip(record)) continue;
    const vendor = clean(record.manufacturer ?? record.brand);
    const sku = normaliseSku(record.model ?? record.sku);
    const technology = technologyFor(record, vendor, sku);
    checked += 1;

    const specs = record.specs && typeof record.specs === "object" ? record.specs : {};
    if (record.approvalStatus === "approved" && !allowedNetworkSpeeds.has(specs.networkSpeed)) {
      unresolvedApproved.push(`${vendor} ${sku}`);
    }
    if (!Object.prototype.hasOwnProperty.call(specs, "avoipChip")) {
      fail(`${vendor} ${sku} is missing specs.avoipChip (use null when not publicly confirmed).`);
    }
    if (!clean(specs.avoipChipStatus)) {
      fail(`${vendor} ${sku} is missing specs.avoipChipStatus.`);
    }
  }

  if (unresolvedApproved.length) {
    fail(`Approved AVoIP records missing 1GbE/10GbE network class: ${unresolvedApproved.slice(0, 20).join(", ")}`);
  }
  console.log(`[avoip-governance] Validated ${checked} competitor AVoIP records.`);
}

const sourceIssues = [];
if (runSources || checkOnly) {
  const wyrestorm = applySourceCsv(wyrestormCsvPath, "wyrestorm");
  sourceIssues.push(...wyrestorm.unresolved);
  normaliseWyrestormEnrichment();
  if (fs.existsSync(competitorDirectory)) {
    for (const entry of fs.readdirSync(competitorDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".csv")) continue;
      const result = applySourceCsv(path.join(competitorDirectory, entry.name), "competitor");
      sourceIssues.push(...result.unresolved);
    }
  }
}

if (sourceIssues.length) {
  console.warn(`[avoip-governance] Review required (${sourceIssues.length}): ${sourceIssues.slice(0, 30).join("; ")}`);
}

if (runGenerated || checkOnly) {
  normaliseCanonical();
  validateCompetitors();
}

console.log("[avoip-governance] AVoIP data governance complete.");
