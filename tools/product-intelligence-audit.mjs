import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data/wyrestorm-product-intelligence.json");
const products = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function includesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}

function csv(value) {
  const text = clean(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function expectedFor(product) {
  const sku = upper(product.sku || product.id || product.model);
  const text = `${sku} ${product.title ?? ""} ${product.name ?? ""} ${product.description ?? ""} ${product.summary ?? ""}`;

  if (/^(CAB-|CBL-|EXP-CAB-|EXP-HDMI-|EXP-8KUHD-|EXP-4KUHD-)/.test(sku)) return "Cable";
  if (/^PSU-/.test(sku)) return "Accessory";
  if (sku === "USB-HUB4") return "Accessory";
  if (sku === "NHD-128-NDI-TRX") return "Camera / Capture";
  if (sku === "NHD-TOUCHPLUS") return "Audio / Control";
  if (/^NHD-TOUCH/.test(sku)) return "AVoIP Infrastructure";
  if (/^TS-/.test(sku)) return "Audio / Control";
  if (/^(SR-|NHD-.*RACK|NHD-RACK|APO-.*MNT|.*-MNT$)/.test(sku)) return "Accessory";
  if (/^CAM-/.test(sku) || /^FOCUS-/.test(sku) || includesAny(text, ["ptz camera", "webcam", "camera bridge", "ndi camera"])) return "Camera / Capture";
  if (/^(CON-|EXP-CON-)/.test(sku)) return "Audio / Control";
  if (/^EXP-EX-/.test(sku)) return "Extender / HDBaseT";
  if (/^EXP-MX-/.test(sku)) return "Matrix";
  if (/^EXP-SW-/.test(sku)) return "Presentation / Room Core";
  if (/^IDB-/.test(sku)) return "Accessory";
  if (/^NHD-/.test(sku)) {
    if (includesAny(text, ["controller", "touchscreen", "touchscreen control", "control application"])) return "AVoIP Infrastructure";
    return "AVoIP";
  }
  if (/^M42|^M43/.test(sku) || includesAny(text, ["pre-configured", "netgear", "network switch"])) return "AVoIP Infrastructure";
  if (/^SWX-/.test(sku)) return "Extender / HDBaseT";
  if (/^(EX-|EX3-|EXA-|EXF-|RX-|RX3-|RXF-|RXV-|TX-)/.test(sku)) return "Extender / HDBaseT";
  if (/^(MX-|MXV-|TX-H2X-)/.test(sku)) {
    if (/^MX-.*MST/.test(sku)) return "Presentation / Room Core";
    return "Matrix";
  }
  if (/^SP-/.test(sku) || /^EXP-SP-/.test(sku) || includesAny(text, ["splitter", "distribution amplifier"])) return "Splitter / Distribution";
  if (/^SW-020/.test(sku)) return "Video Wall / Multiview";
  if (/^SW-/.test(sku) || /^SYN-KIT/.test(sku)) {
    if (includesAny(text, ["wireless conferencing", "speakerphone", "video bar"])) return "Unified Comms";
    return "Presentation / Room Core";
  }
  if (/^(APO-|HALO-|OFFICE-KIT)/.test(sku) || includesAny(text, ["speakerphone", "video bar", "conference", "unified communication", "webcam"])) return "Unified Comms";
  if (/^(SYN-|TS-)/.test(sku) || includesAny(text, ["touchscreen", "touchpad", "keypad", "control", "rs232", "relay", "ir protocol"])) return "Audio / Control";
  if (includesAny(text, ["amplifier", "dante", "audio extractor", "downmixer", "microphone"])) return "Audio / Control";

  return "Needs Review";
}

const rows = [];

for (const product of products) {
  const sku = clean(product.sku || product.id || product.model);
  const title = clean(product.title || product.name);
  const expected = expectedFor(product);
  const actual = clean(product.technologyType || product.hardwareType || "Missing");
  const issues = [];

  if (!sku) issues.push("missing SKU");
  if (!title) issues.push("missing title");
  if (!product.technologyType) issues.push("missing technologyType");
  if (!product.hardwareType) issues.push("missing hardwareType");
  if (!product.productRole) issues.push("missing productRole");
  if (!product.catalogVisibility) issues.push("missing catalogVisibility");
  if (!product.productClassification) issues.push("missing productClassification");
  if (!product.technicalProfile) issues.push("missing technicalProfile");

  if (expected !== "Needs Review" && actual !== expected) {
    issues.push(`expected ${expected}, found ${actual}`);
  }

  if (/^NHD-/.test(upper(sku)) && actual === "Video Wall / Multiview" && !includesAny(`${title} ${product.description ?? ""}`, ["multiview", "multi view"])) {
    issues.push("normal NetworkHD endpoint should not be multiview");
  }

  if (/^(EX-|EX3-|EXA-|EXF-|RX-|RX3-|RXF-|RXV-|TX-)/.test(upper(sku)) && actual === "Cable") {
    issues.push("extender endpoint classified as cable");
  }

  if ((/^CAM-/.test(upper(sku)) || /^FOCUS-/.test(upper(sku))) && actual !== "Camera / Capture") {
    issues.push("camera product not classified as Camera / Capture");
  }

  if (includesAny(title, ["speakerphone", "video bar"]) && actual === "Cable") {
    issues.push("UC product classified as cable");
  }

  const profile = product.technicalProfile && typeof product.technicalProfile === "object" ? product.technicalProfile : {};
  const classification = product.productClassification && typeof product.productClassification === "object" ? product.productClassification : {};
  const profileFeatureCount = Array.isArray(profile.features) ? profile.features.length : 0;
  const profilePortCount = Array.isArray(profile.io?.ports) ? profile.io.ports.length : 0;
  const classificationPath = Array.isArray(product.classificationPath) ? product.classificationPath : [];
  const subClassifications = Array.isArray(product.subClassifications) ? product.subClassifications : [];

  if (product.productClassification && !classification.primaryCategory) {
    issues.push("productClassification missing primaryCategory");
  }

  if (product.productClassification && classificationPath.length < 2) {
    issues.push("classificationPath too shallow");
  }

  if (product.productClassification && subClassifications.length === 0) {
    issues.push("missing subClassifications");
  }

  if (product.technicalProfile && profileFeatureCount < 1) {
    issues.push("technicalProfile has no features");
  }

  rows.push({
    sku,
    title,
    family: clean(product.family),
    role: clean(product.role),
    technologyType: actual,
    expectedTechnologyType: expected,
    productRole: clean(product.productRole),
    catalogVisibility: clean(product.catalogVisibility),
    primaryCategory: clean(classification.primaryCategory),
    category: clean(classification.category),
    subCategory: clean(classification.subCategory),
    productType: clean(classification.productType),
    subClassifications: subClassifications.join("|"),
    profileFeatureCount,
    profilePortCount,
    officialPageStatus: clean(profile.sourceQuality?.officialPageStatus),
    correctionSource: clean(product.roleCorrectionSource),
    issues: issues.join("; "),
  });
}

rows.sort((a, b) => a.sku.localeCompare(b.sku));

const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const jsonPath = path.join(reportDir, "wingman-product-intelligence-audit.json");
const csvPath = path.join(reportDir, "wingman-product-intelligence-audit.csv");

fs.writeFileSync(jsonPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "data/wyrestorm-product-intelligence.json",
  productCount: rows.length,
  issueCount: rows.filter((row) => row.issues).length,
  rows,
}, null, 2) + "\n");

const columns = [
  "sku",
  "title",
  "family",
  "role",
  "technologyType",
  "expectedTechnologyType",
  "productRole",
  "catalogVisibility",
  "primaryCategory",
  "category",
  "subCategory",
  "productType",
  "subClassifications",
  "profileFeatureCount",
  "profilePortCount",
  "officialPageStatus",
  "correctionSource",
  "issues",
];

fs.writeFileSync(csvPath, [columns.join(","), ...rows.map((row) => columns.map((column) => csv(row[column])).join(","))].join("\n") + "\n");

const issueRows = rows.filter((row) => row.issues);

console.log(`[product-intelligence-audit] Products audited: ${rows.length}`);
console.log(`[product-intelligence-audit] Issue rows: ${issueRows.length}`);
console.log("[product-intelligence-audit] Wrote reports/wingman-product-intelligence-audit.csv");
console.log("[product-intelligence-audit] Wrote reports/wingman-product-intelligence-audit.json");

if (issueRows.length > 0) {
  console.log("[product-intelligence-audit] First 20 issue rows:");
  for (const row of issueRows.slice(0, 20)) {
    console.log(`- ${row.sku}: ${row.issues}`);
  }
}
