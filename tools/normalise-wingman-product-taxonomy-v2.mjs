import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const dataFiles = [
  path.join(repoRoot, "data", "wyrestorm-product-intelligence.json"),
  path.join(repoRoot, "public", "product-intelligence-index.json"),
].filter((filePath) => fs.existsSync(filePath));

if (dataFiles.length === 0) {
  throw new Error("Could not find product intelligence JSON files.");
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function firstString(record, keys) {
  for (const key of keys) {
    const value = record?.[key];

    if (typeof value === "string" && text(value)) {
      return text(value);
    }
  }

  return "";
}

function directSku(record) {
  return firstString(record, ["sku", "model", "partNumber", "part_number", "code"]);
}

function canonicalSkuFromText(value) {
  const candidate = upper(value)
    .replace(/\bHALO\s+(\d+)/g, "HALO-$1")
    .replace(/\bNETWORKHD\s+/g, "NHD-");

  const knownPrefixPattern = /\b(?:AMP|APO|CAB|CAM|COM|EX|EX3|EXP-MX|HALO|IDB|M4250|M4300|MV|MX|MXV|NHD|RX3|SPK|SW|SWX)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/;
  const match = candidate.match(knownPrefixPattern);

  return text(match?.[0]);
}

function canonicalSku(record) {
  const direct = upper(directSku(record));

  if (direct === "OFFICIAL-PRODUCT-PAGE") {
    return "";
  }

  const directMatch = canonicalSkuFromText(direct);

  if (directMatch) {
    return directMatch;
  }

  const combined = [
    record?.sku,
    record?.model,
    record?.partNumber,
    record?.title,
    record?.name,
    record?.shortDescription,
    record?.description,
  ].filter(Boolean).join(" ");

  return canonicalSkuFromText(combined);
}

function collectSearchText(record) {
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

function makeClassification(fields) {
  return {
    family: fields.family,
    productFamily: fields.productFamily ?? fields.family,
    displayFamily: fields.displayFamily ?? fields.family,
    role: fields.role,
    category: fields.category,
    technologyType: fields.technologyType,
    routingClass: fields.routingClass,
    confidence: fields.confidence ?? "high",
    reason: fields.reason,
  };
}

function classify(record) {
  const sku = canonicalSku(record);
  const search = collectSearchText(record);

  if (!sku) {
    return null;
  }

  if (/^AMP-/.test(sku)) {
    return makeClassification({
      family: "Amplifier",
      role: search.includes("DANTE") ? "Dante network amplifier" : "Audio amplifier",
      category: "Audio",
      technologyType: search.includes("DANTE") ? "Dante / amplification" : "Amplification",
      routingClass: "Audio output / amplification",
      reason: "AMP SKU prefix",
    });
  }

  if (/^APO-/.test(sku)) {
    let role = "Apollo presentation / UC product";
    let routingClass = "Room collaboration workflow";

    if (/^APO-DG/.test(sku)) {
      role = "Apollo wireless casting / conferencing dongle or dock";
      routingClass = "Wireless presentation / conferencing accessory";
    }

    if (/^APO-(COM|MIC|SKY)/.test(sku)) {
      role = "Apollo microphone / UC accessory";
      routingClass = "Audio capture / conferencing accessory";
    }

    if (/^APO-VX/.test(sku)) {
      role = "Apollo video bar / room UC switcher";
      routingClass = "Room video conferencing workflow";
    }

    return makeClassification({
      family: "Apollo",
      role,
      category: "Presentation / UC",
      technologyType: "USB-C / wireless / collaboration",
      routingClass,
      reason: "APO SKU prefix",
    });
  }

  if (/^HALO-WFA/.test(sku)) {
    return makeClassification({
      family: "Camera",
      productFamily: "Camera",
      displayFamily: "Camera",
      role: "USB webcam",
      category: "Camera / capture",
      technologyType: "USB camera",
      routingClass: "Camera capture workflow",
      reason: "HALO-WFA webcam SKU",
    });
  }

  if (/^HALO-/.test(sku)) {
    let role = "HALO conferencing audio product";

    if (search.includes("VIDEO BAR")) {
      role = "HALO video bar";
    }

    if (search.includes("MICROPHONE") || sku.includes("COM-MIC")) {
      role = "HALO microphone accessory";
    }

    return makeClassification({
      family: "HALO",
      role,
      category: "Audio / UC",
      technologyType: "USB / Bluetooth / conferencing audio",
      routingClass: "Conferencing audio workflow",
      reason: "HALO SKU prefix",
    });
  }

  if (/^CAM-/.test(sku)) {
    let role = "Camera";

    if (sku.includes("BRG")) {
      role = "Camera bridge";
    }

    if (sku.includes("PTZ")) {
      role = "PTZ camera";
    }

    if (sku.includes("NDI")) {
      role = "NDI camera / bridge";
    }

    return makeClassification({
      family: "Camera",
      role,
      category: "Camera / capture",
      technologyType: search.includes("NDI") ? "NDI / USB / HDMI capture" : "Camera / capture",
      routingClass: "Camera capture workflow",
      reason: "CAM SKU prefix",
    });
  }

  if (/^CAB-/.test(sku)) {
    let role = "Cable";

    if (sku.includes("AOC") || sku.includes("HAOC") || sku.includes("UAOC")) {
      role = "Active optical cable";
    }

    if (sku.includes("USBC")) {
      role = "USB-C cable";
    }

    return makeClassification({
      family: "Cable",
      role,
      category: "Cables",
      technologyType: "HDMI / USB-C / optical cable",
      routingClass: "Signal cable",
      reason: "CAB SKU prefix",
    });
  }

  if (/^IDB-/.test(sku)) {
    return makeClassification({
      family: "Cable Management",
      role: "In-desk cable management / table connectivity",
      category: "Cable management",
      technologyType: "BYOD table connectivity",
      routingClass: "Table connectivity",
      reason: "IDB SKU prefix",
    });
  }

  if (/^(M4250|M4300)-/.test(sku)) {
    return makeClassification({
      family: "Network Switch",
      role: "Pre-configured AV network switch",
      category: "Network infrastructure",
      technologyType: sku.startsWith("M4300") ? "10GbE AV network switch" : "1GbE AV network switch",
      routingClass: "AV-over-IP network infrastructure",
      reason: "Netgear AV switch SKU",
    });
  }

  if (sku === "NHD-0401-MV") {
    return makeClassification({
      family: "NetworkHD 500",
      role: "NetworkHD multiview processor",
      category: "AV-over-IP processing",
      technologyType: "NetworkHD 500 AV-over-IP",
      routingClass: "Multiview processing",
      reason: "NHD-0401-MV specific SKU",
    });
  }

  if (/^NHD-128-NDI/.test(sku)) {
    return makeClassification({
      family: "NetworkHD 100",
      role: "NDI / NetworkHD gateway",
      category: "AV-over-IP / NDI bridging",
      technologyType: "H.265 / NDI / NetworkHD 100",
      routingClass: "NDI to AV-over-IP gateway",
      reason: "NHD-128-NDI SKU",
    });
  }

  if (/^NHD-(000|CTL|TOUCH|USB)/.test(sku) || sku.includes("RACK")) {
    return makeClassification({
      family: "NetworkHD Accessory",
      role: "NetworkHD control / mounting / USB accessory",
      category: "AV-over-IP accessory",
      technologyType: "NetworkHD system accessory",
      routingClass: "Control / mounting / USB support",
      reason: "NetworkHD accessory SKU",
    });
  }

  if (/^NHD-(110|120|124|140|150)/.test(sku)) {
    let role = "NetworkHD 100 endpoint";

    if (sku.includes("-RX")) {
      role = "NetworkHD 100 decoder";
    }

    if (sku.includes("-TX")) {
      role = "NetworkHD 100 encoder";
    }

    if (sku === "NHD-150-RX") {
      role = "NetworkHD 100 multiview decoder";
    }

    return makeClassification({
      family: "NetworkHD 100",
      role,
      category: "AV-over-IP",
      technologyType: "H.264 / H.265 AV-over-IP",
      routingClass: "NetworkHD 100 distributed routing",
      reason: "NHD-1xx SKU",
    });
  }

  if (/^NHD-250/.test(sku)) {
    return makeClassification({
      family: "NetworkHD 200",
      role: "NetworkHD 200 endpoint / processor",
      category: "AV-over-IP",
      technologyType: "H.264 AV-over-IP",
      routingClass: "NetworkHD 200 distributed routing",
      reason: "NHD-250 SKU",
    });
  }

  if (/^NHD-(300|400)/.test(sku)) {
    return makeClassification({
      family: "NetworkHD 400",
      role: sku.includes("-RX") ? "NetworkHD 400 decoder" : "NetworkHD 400 encoder",
      category: "AV-over-IP",
      technologyType: "JPEG2000 AV-over-IP",
      routingClass: "NetworkHD 400 distributed routing",
      reason: "NHD-300/400 SKU",
    });
  }

  if (/^NHD-5/.test(sku)) {
    return makeClassification({
      family: "NetworkHD 500",
      role: sku.includes("-RX") ? "NetworkHD 500 decoder" : "NetworkHD 500 encoder",
      category: "AV-over-IP",
      technologyType: "JPEG2000 4K60 4:4:4 AV-over-IP",
      routingClass: "NetworkHD 500 distributed routing",
      reason: "NHD-5xx SKU",
    });
  }

  if (/^NHD-6|^NHD-610/.test(sku)) {
    return makeClassification({
      family: "NetworkHD 600",
      role: "NetworkHD 600 10G AV-over-IP endpoint",
      category: "AV-over-IP",
      technologyType: "10G SDVoE AV-over-IP",
      routingClass: "NetworkHD 600 distributed routing",
      reason: "NHD-6xx / 610 SKU",
    });
  }

  if (/^NHD-/.test(sku)) {
    return makeClassification({
      family: "NetworkHD",
      role: "NetworkHD AV-over-IP product",
      category: "AV-over-IP",
      technologyType: "AV-over-IP",
      routingClass: "Distributed AV-over-IP",
      reason: "NHD SKU fallback",
    });
  }

  if (/^MV-/.test(sku)) {
    return makeClassification({
      family: "Multiview Processor",
      role: "Multiview processor",
      category: "Video processing",
      technologyType: "HDMI multiview processing",
      routingClass: "Multiview processing",
      reason: "MV SKU prefix",
    });
  }

  if (/^SWX-/.test(sku)) {
    return makeClassification({
      family: "Extender",
      role: "HDBaseT extender kit",
      category: "Extension",
      technologyType: "HDBaseT",
      routingClass: "Point-to-point extension",
      reason: "SWX extender kit SKU",
    });
  }

  if (/^SW-.*VW/.test(sku)) {
    return makeClassification({
      family: "Video Wall Processor",
      role: "Dedicated video wall processor",
      category: "Video Wall",
      technologyType: "Video wall processing",
      routingClass: "Dedicated video wall processing",
      reason: "SW video wall SKU",
    });
  }

  if (/^SW-/.test(sku)) {
    return makeClassification({
      family: "Presentation Switcher",
      role: "Presentation switcher / room transmitter",
      category: "Presentation switching",
      technologyType: search.includes("HDBASET") ? "HDBaseT / HDMI / USB-C switching" : "HDMI / USB-C presentation switching",
      routingClass: "Room switching / presentation workflow",
      reason: "SW SKU prefix",
    });
  }

  if (/^(EX|EX3|RX3)-/.test(sku)) {
    return makeClassification({
      family: "Extender",
      role: "Signal extender",
      category: "Extension",
      technologyType: search.includes("HDBASET") ? "HDBaseT" : "Signal extension",
      routingClass: "Point-to-point extension",
      reason: "EX / RX extender SKU prefix",
    });
  }

  if (/^(MX|MXV|EXP-MX)-/.test(sku)) {
    if (sku.includes("SCL")) {
      return makeClassification({
        family: "Seamless Matrix",
        role: "Seamless scaling matrix",
        category: "Matrix switching / multiview",
        technologyType: "Seamless scaling HDMI matrix",
        routingClass: "Seamless matrix with scaling / multiview capability",
        reason: "SCL matrix SKU",
      });
    }

    if (sku.includes("MST")) {
      return makeClassification({
        family: "Presentation Switcher",
        role: "Dual-display presentation room core",
        category: "Presentation switching",
        technologyType: "USB-C / HDMI / MST presentation switching",
        routingClass: "Dual display room switching",
        reason: "MST presentation switcher SKU",
      });
    }

    if (search.includes("HDBASET") || sku.includes("H2A") || sku.includes("HDBT")) {
      return makeClassification({
        family: "HDBaseT Matrix",
        role: "HDBaseT matrix switcher",
        category: "Matrix switching",
        technologyType: "HDBaseT / HDMI matrix",
        routingClass: "Fixed I/O HDBaseT matrix routing",
        reason: "HDBaseT matrix SKU/text",
      });
    }

    return makeClassification({
      family: "Matrix",
      role: "HDMI matrix switcher",
      category: "Matrix switching",
      technologyType: "HDMI matrix",
      routingClass: "Fixed I/O matrix routing",
      reason: "MX / MXV matrix SKU",
    });
  }

  if (/^SPK-/.test(sku)) {
    return makeClassification({
      family: "Speaker",
      role: "Loudspeaker",
      category: "Audio",
      technologyType: "Speaker",
      routingClass: "Audio output",
      reason: "SPK SKU prefix",
    });
  }

  return makeClassification({
    family: "Unclassified",
    role: "Product",
    category: "General AV",
    technologyType: "General AV",
    routingClass: "Accessory / supporting item",
    confidence: "low",
    reason: "No confident SKU rule matched",
  });
}

function looksLikeProductRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return false;
  }

  const sku = canonicalSku(record);

  if (!sku) {
    return false;
  }

  const label = firstString(record, ["title", "name", "shortDescription", "description"]);

  if (label) {
    return true;
  }

  return Object.keys(record).some((key) => ["sku", "model", "partNumber", "code"].includes(key));
}

function applyClassification(record) {
  const classification = classify(record);

  if (!classification) {
    return false;
  }

  const sku = canonicalSku(record);

  record.sku = sku;

  record.family = classification.family;
  record.productFamily = classification.productFamily;
  record.wingmanFamily = classification.family;
  record.displayFamily = classification.displayFamily;
  record.familyLabel = classification.displayFamily;
  record.primaryFamily = classification.family;

  record.role = classification.role;
  record.wingmanRole = classification.role;

  record.category = classification.category;
  record.wingmanCategory = classification.category;

  record.technologyType = classification.technologyType;
  record.routingClass = classification.routingClass;

  record.taxonomy = {
    family: classification.family,
    displayFamily: classification.displayFamily,
    role: classification.role,
    category: classification.category,
    technologyType: classification.technologyType,
    routingClass: classification.routingClass,
  };

  record.wingmanClassificationConfidence = classification.confidence;
  record.wingmanClassificationReason = classification.reason;

  return true;
}

function shouldRemoveObject(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return false;
  }

  const rawSku = upper(directSku(record));

  if (rawSku === "OFFICIAL-PRODUCT-PAGE") {
    return true;
  }

  if (record.sku === "OFFICIAL-PRODUCT-PAGE") {
    return true;
  }

  return false;
}

function cleanTree(value) {
  if (Array.isArray(value)) {
    const cleaned = [];

    for (const item of value) {
      const next = cleanTree(item);

      if (next !== undefined) {
        cleaned.push(next);
      }
    }

    return cleaned;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (shouldRemoveObject(value)) {
    return undefined;
  }

  for (const [key, child] of Object.entries(value)) {
    const next = cleanTree(child);

    if (next === undefined) {
      delete value[key];
    }

    if (next !== undefined) {
      value[key] = next;
    }
  }

  if (looksLikeProductRecord(value)) {
    applyClassification(value);
  }

  return value;
}

function collectProducts(value, rows = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProducts(item, rows));
    return rows;
  }

  if (!value || typeof value !== "object") {
    return rows;
  }

  if (looksLikeProductRecord(value)) {
    const sku = canonicalSku(value);
    const classification = classify(value);

    rows.push({
      sku,
      name: firstString(value, ["title", "name", "shortDescription", "description"]),
      family: classification?.family ?? "",
      role: classification?.role ?? "",
      category: classification?.category ?? "",
      reason: classification?.reason ?? "",
    });
  }

  Object.values(value).forEach((child) => collectProducts(child, rows));

  return rows;
}

function csvEscape(value) {
  return `"${text(value).replace(/"/g, '""')}"`;
}

function writeAudit(rows) {
  const reportDir = path.join(repoRoot, "reports");

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, `product-taxonomy-v2-${timestamp}.csv`);
  const header = ["sku", "name", "family", "role", "category", "reason"];
  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(",")),
  ];

  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  return reportPath;
}

const combinedRows = [];

for (const filePath of dataFiles) {
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);
  const backupPath = `${filePath}.backup-taxonomy-v2-${timestamp}`;

  fs.copyFileSync(filePath, backupPath);

  const cleaned = cleanTree(json);
  const output = cleaned ?? json;

  fs.writeFileSync(filePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const rows = collectProducts(output);
  combinedRows.push(...rows.map((row) => ({ ...row, source: path.relative(repoRoot, filePath) })));

  const familyCounts = new Map();

  for (const row of rows) {
    familyCounts.set(row.family, (familyCounts.get(row.family) ?? 0) + 1);
  }

  console.log("");
  console.log(`Updated ${path.relative(repoRoot, filePath)}`);
  console.log(`Backup ${path.relative(repoRoot, backupPath)}`);
  console.log(`Products detected ${rows.length}`);
  console.log("Family counts:");

  [...familyCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([family, count]) => {
      console.log(`  ${family}: ${count}`);
    });
}

const auditPath = writeAudit(combinedRows);

console.log("");
console.log(`V2 audit written to ${path.relative(repoRoot, auditPath)}`);
console.log("Product taxonomy v2 complete.");