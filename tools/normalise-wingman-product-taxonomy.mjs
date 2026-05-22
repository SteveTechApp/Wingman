import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const dataFiles = [
  path.join(repoRoot, "data", "wyrestorm-product-intelligence.json"),
  path.join(repoRoot, "public", "product-intelligence-index.json"),
].filter((filePath) => fs.existsSync(filePath));

if (dataFiles.length === 0) {
  throw new Error("Could not find data/wyrestorm-product-intelligence.json or public/product-intelligence-index.json");
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

function normaliseText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function upper(value) {
  return normaliseText(value).toUpperCase();
}

function firstStringValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key];

    if (typeof value === "string" && normaliseText(value)) {
      return normaliseText(value);
    }
  }

  return "";
}

function collectText(record) {
  const parts = [];

  for (const key of [
    "sku",
    "model",
    "partNumber",
    "name",
    "title",
    "description",
    "shortDescription",
    "summary",
    "family",
    "productFamily",
    "category",
    "role",
    "type",
  ]) {
    const value = record?.[key];

    if (typeof value === "string") {
      parts.push(value);
    }
  }

  return upper(parts.join(" "));
}

function getSku(record) {
  const direct = firstStringValue(record, ["sku", "model", "partNumber", "code"]);
  const text = collectText(record);
  const found = text.match(/[A-Z0-9]{2,}(?:-[A-Z0-9]+)+/);

  if (direct) {
    return upper(direct);
  }

  return upper(found?.[0] ?? "");
}

function classifyProduct(record) {
  const sku = getSku(record);
  const text = collectText(record);
  const skuText = `${sku} ${text}`;

  const result = {
    family: "Unclassified",
    role: "Product",
    category: "General AV",
    technologyType: "General AV",
    routingClass: "Accessory / supporting item",
    confidence: "medium",
    reason: "General fallback classification",
  };

  function set(next) {
    Object.assign(result, next);
  }

  if (/^(NHD|NETWORKHD)-/.test(sku) || text.includes("NETWORKHD")) {
    set({
      family: "NetworkHD",
      role: "AV-over-IP product",
      category: "AV-over-IP",
      technologyType: "AV-over-IP",
      routingClass: "Distributed AV-over-IP",
      confidence: "high",
      reason: "NHD / NetworkHD naming",
    });
  }

  if (/^NHD-1[0-9]{2}/.test(sku)) {
    set({
      family: "NetworkHD 100",
      role: "AV-over-IP endpoint",
      category: "AV-over-IP",
      technologyType: "AV-over-IP",
      routingClass: "NetworkHD 100 distributed routing",
      confidence: "high",
      reason: "NHD-1xx SKU pattern",
    });
  }

  if (/^NHD-5[0-9]{2}/.test(sku)) {
    set({
      family: "NetworkHD 500",
      role: "AV-over-IP endpoint",
      category: "AV-over-IP",
      technologyType: "AV-over-IP",
      routingClass: "NetworkHD 500 distributed routing",
      confidence: "high",
      reason: "NHD-5xx SKU pattern",
    });
  }

  if (/^NHD-6[0-9]{2}/.test(sku)) {
    set({
      family: "NetworkHD 600",
      role: "10G AV-over-IP endpoint",
      category: "AV-over-IP",
      technologyType: "10G AV-over-IP",
      routingClass: "NetworkHD 600 distributed routing",
      confidence: "high",
      reason: "NHD-6xx SKU pattern",
    });
  }

  if (sku.includes("NHD-0401-MV")) {
    set({
      family: "NetworkHD 500",
      role: "Multiview processor",
      category: "AV-over-IP processing",
      technologyType: "AV-over-IP",
      routingClass: "Multiview processing",
      confidence: "high",
      reason: "NHD-0401-MV multiview processor",
    });
  }

  if (/^NHD-000|RACK|TOUCH|CTL/.test(skuText) && result.family.startsWith("NetworkHD")) {
    set({
      role: "NetworkHD accessory / control",
      routingClass: "Control / mounting accessory",
      reason: "NetworkHD accessory/control naming",
    });
  }

  if (/^APO-/.test(sku)) {
    set({
      family: "Apollo",
      role: "Presentation / UC product",
      category: "Presentation / UC",
      technologyType: "USB-C / collaboration",
      routingClass: "Room collaboration workflow",
      confidence: "high",
      reason: "APO SKU pattern",
    });
  }

  if (/^APO-COM|^APO-MIC|^APO-SKY|^COM-MIC|MICROPHONE/.test(skuText)) {
    set({
      family: "Apollo",
      role: "Microphone / UC audio accessory",
      category: "Audio / UC",
      technologyType: "USB / network audio accessory",
      routingClass: "Audio capture / conferencing accessory",
      confidence: "high",
      reason: "Microphone / UC audio naming",
    });
  }

  if (/^HALO-/.test(sku)) {
    set({
      family: "HALO",
      role: "USB/Bluetooth speakerphone or UC audio product",
      category: "Audio / UC",
      technologyType: "USB / Bluetooth audio",
      routingClass: "Conferencing audio",
      confidence: "high",
      reason: "HALO SKU pattern",
    });
  }

  if (/^CAM-/.test(sku) || text.includes("PTZ CAMERA") || text.includes("CAMERA")) {
    set({
      family: "Camera",
      role: "Camera / camera bridge",
      category: "Camera / capture",
      technologyType: text.includes("NDI") ? "NDI / USB / HDMI capture" : "Camera / capture",
      routingClass: "Camera capture workflow",
      confidence: "high",
      reason: "CAM SKU or camera naming",
    });
  }

  if (/^AMP-/.test(sku) || text.includes("AMPLIFIER")) {
    set({
      family: "Amplifier",
      role: "Audio amplifier",
      category: "Audio",
      technologyType: "Amplification / audio control",
      routingClass: "Audio output / amplification",
      confidence: "high",
      reason: "AMP SKU or amplifier naming",
    });
  }

  if (/^CAB-/.test(sku) || text.includes(" CABLE") || text.includes("AOC")) {
    set({
      family: "Cable",
      role: "Cable / active optical cable",
      category: "Cables",
      technologyType: "HDMI / USB-C / optical cable",
      routingClass: "Signal cable",
      confidence: "high",
      reason: "CAB SKU or cable naming",
    });
  }

  if (/^EX-/.test(sku) || text.includes("EXTENDER") || text.includes("HDBASET EXTENDER")) {
    set({
      family: "Extender",
      role: "Signal extender",
      category: "Extension",
      technologyType: text.includes("HDBASET") ? "HDBaseT" : "Signal extension",
      routingClass: "Point-to-point extension",
      confidence: "high",
      reason: "EX SKU or extender naming",
    });
  }

  if (/^SW-/.test(sku)) {
    set({
      family: "Switcher / processor",
      role: "Switcher / processor",
      category: "Switching / processing",
      technologyType: "HDMI processing",
      routingClass: "Local switching / processing",
      confidence: "high",
      reason: "SW SKU pattern",
    });
  }

  if (/^SW-.*VW/.test(sku) || text.includes("VIDEO WALL")) {
    set({
      family: "Video Wall Processor",
      role: "Video wall processor",
      category: "Video Wall",
      technologyType: "Video wall processing",
      routingClass: "Dedicated video wall processing",
      confidence: "high",
      reason: "VW / video wall naming",
    });
  }

  if (/^(MX|MXV|EXP-MX)-/.test(sku)) {
    set({
      family: "Matrix",
      role: "Matrix switcher",
      category: "Matrix switching",
      technologyType: text.includes("HDBASET") ? "HDBaseT / HDMI matrix" : "HDMI matrix",
      routingClass: "Matrix routing",
      confidence: "high",
      reason: "MX / MXV / EXP-MX SKU pattern",
    });
  }

  if (/^(MX|MXV|EXP-MX)-/.test(sku) && text.includes("HDBASET")) {
    set({
      family: "HDBaseT Matrix",
      role: "HDBaseT matrix switcher",
      category: "Matrix switching",
      technologyType: "HDBaseT / HDMI matrix",
      routingClass: "Fixed I/O HDBaseT matrix routing",
      confidence: "high",
      reason: "Matrix product with HDBaseT naming",
    });
  }

  if (/^(MX|MXV|EXP-MX)-/.test(sku) && sku.includes("SCL")) {
    set({
      family: "Seamless Matrix",
      role: "Seamless scaling matrix switcher",
      category: "Matrix switching / multiview",
      technologyType: "Seamless HDMI matrix",
      routingClass: "Seamless matrix with scaling / multiview capability",
      confidence: "high",
      reason: "SCL matrix SKU pattern",
    });
  }

  if (/^MX-040[23].*MST/.test(sku) || sku.includes("MST")) {
    set({
      family: "Presentation Switcher",
      role: "Room core / presentation switcher",
      category: "Presentation switching",
      technologyType: "USB-C / HDMI / MST presentation switching",
      routingClass: "Dual display room switching",
      confidence: "high",
      reason: "MST presentation switcher naming",
    });
  }

  if (/^IDB-/.test(sku)) {
    set({
      family: "Cable Management",
      role: "In-desk cable box",
      category: "Cable management",
      technologyType: "BYOD cable management",
      routingClass: "Table connectivity",
      confidence: "high",
      reason: "IDB SKU pattern",
    });
  }

  if (/^SPK-/.test(sku) || text.includes("SPEAKER")) {
    set({
      family: "Speaker",
      role: "Loudspeaker",
      category: "Audio",
      technologyType: "Speaker",
      routingClass: "Audio output",
      confidence: "high",
      reason: "Speaker naming",
    });
  }

  return result;
}

function setField(record, key, value) {
  record[key] = value;
}

function applyClassification(record) {
  const classification = classifyProduct(record);

  setField(record, "family", classification.family);
  setField(record, "productFamily", classification.family);
  setField(record, "wingmanFamily", classification.family);

  setField(record, "role", classification.role);
  setField(record, "wingmanRole", classification.role);

  setField(record, "category", classification.category);
  setField(record, "wingmanCategory", classification.category);

  setField(record, "technologyType", classification.technologyType);
  setField(record, "routingClass", classification.routingClass);

  setField(record, "wingmanClassificationConfidence", classification.confidence);
  setField(record, "wingmanClassificationReason", classification.reason);

  return classification;
}

function looksLikeProductRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const sku = getSku(value);
  const title = firstStringValue(value, ["title", "name", "description", "shortDescription"]);

  if (sku && title) {
    return true;
  }

  if (sku && Object.keys(value).length >= 3) {
    return true;
  }

  return false;
}

function walk(value, visitor) {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visitor));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (looksLikeProductRecord(value)) {
    visitor(value);
  }

  Object.values(value).forEach((child) => walk(child, visitor));
}

function auditProducts(root) {
  const products = [];

  walk(root, (record) => {
    const sku = getSku(record);
    const name = firstStringValue(record, ["title", "name", "shortDescription", "description"]);
    const currentFamily = firstStringValue(record, ["family", "productFamily", "wingmanFamily"]);
    const classification = classifyProduct(record);

    products.push({
      sku,
      name,
      currentFamily,
      correctedFamily: classification.family,
      correctedRole: classification.role,
      correctedCategory: classification.category,
      confidence: classification.confidence,
      reason: classification.reason,
    });
  });

  return products;
}

function csvEscape(value) {
  const text = normaliseText(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function writeAuditCsv(filePath, rows) {
  const header = [
    "sku",
    "name",
    "currentFamily",
    "correctedFamily",
    "correctedRole",
    "correctedCategory",
    "confidence",
    "reason",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(",")),
  ];

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

const allAuditRows = [];

for (const filePath of dataFiles) {
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);

  const backupPath = `${filePath}.backup-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);

  const beforeRows = auditProducts(json);

  let changedCount = 0;

  walk(json, (record) => {
    const before = JSON.stringify({
      family: record.family,
      productFamily: record.productFamily,
      role: record.role,
      category: record.category,
      technologyType: record.technologyType,
      routingClass: record.routingClass,
    });

    applyClassification(record);

    const after = JSON.stringify({
      family: record.family,
      productFamily: record.productFamily,
      role: record.role,
      category: record.category,
      technologyType: record.technologyType,
      routingClass: record.routingClass,
    });

    if (before !== after) {
      changedCount += 1;
    }
  });

  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");

  const afterRows = auditProducts(json);
  const familyCounts = new Map();

  for (const row of afterRows) {
    familyCounts.set(row.correctedFamily, (familyCounts.get(row.correctedFamily) ?? 0) + 1);
  }

  console.log("");
  console.log(`Updated ${path.relative(repoRoot, filePath)}`);
  console.log(`Backup: ${path.relative(repoRoot, backupPath)}`);
  console.log(`Products audited: ${afterRows.length}`);
  console.log(`Records changed: ${changedCount}`);
  console.log("Family counts:");

  [...familyCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([family, count]) => {
      console.log(`  ${family}: ${count}`);
    });

  beforeRows.forEach((row) => {
    allAuditRows.push({
      ...row,
      sourceFile: path.relative(repoRoot, filePath),
    });
  });
}

const reportDir = path.join(repoRoot, "reports");

if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const auditPath = path.join(reportDir, `product-taxonomy-audit-${timestamp}.csv`);
writeAuditCsv(auditPath, allAuditRows);

console.log("");
console.log(`Audit report: ${path.relative(repoRoot, auditPath)}`);
console.log("");
console.log("Taxonomy normalisation complete.");