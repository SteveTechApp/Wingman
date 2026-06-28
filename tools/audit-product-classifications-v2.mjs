import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = path.join(root, "reports");

fs.mkdirSync(reportDir, { recursive: true });

const sourceFiles = [
  "data/wingman-canonical-product-store.json",
  "data-sources/wyrestorm/enrichment.json",
  "data/catalog/competitor-products.generated.json",
  "data/catalog/competitor-custom.local.json",
  "public/product-call-card-products.json"
].map((file) => path.join(root, file)).filter(fs.existsSync);

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function skuKey(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function norm(value) {
  return String(value ?? "")
    .replace(/[×]/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function first(record, keys) {
  for (const key of keys) {
    const value = record?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function flattenShallow(record) {
  if (!record || typeof record !== "object") return "";

  const fields = [
    record.sku,
    record.SKU,
    record.model,
    record.name,
    record.title,
    record.label,
    record.brand,
    record.family,
    record.series,
    record.category,
    record.productClass,
    record.product_class,
    record.productType,
    record.type,
    record.role,
    record.domain,
    record.transport,
    record.technology,
    record.description,
    record.summary,
    Array.isArray(record.tags) ? record.tags.join(" ") : "",
    Array.isArray(record.keywords) ? record.keywords.join(" ") : "",
  ];

  return fields.filter(Boolean).join(" ");
}

function productArrayFromJson(parsed) {
  if (Array.isArray(parsed)) return parsed;

  if (Array.isArray(parsed.records)) return parsed.records;
  if (Array.isArray(parsed.products)) return parsed.products;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.audit)) return [];

  return [];
}

function storedClassification(record) {
  return [
    first(record, ["productClass", "product_class", "classification"]),
    first(record, ["category", "domain", "productType", "type"]),
    first(record, ["role", "productRole", "recommendationRole"]),
    first(record, ["family", "series"]),
    first(record, ["transport", "technology"]),
  ].filter(Boolean).join(" ");
}

function classify(record) {
  const sku = first(record, ["sku", "SKU", "model", "partNumber", "productSku", "code"]);
  const k = skuKey(sku);
  const text = norm(flattenShallow(record));

  if (/ATOMEEXKIT/.test(k)) return "hdbaset-extender";

  if (k === "NHD0401MV") return "multiview";
  if (k === "NHD150RX") return "av-over-ip-multiview-decoder";
  if (k === "SW0206VW" || k === "SW0204VW") return "video-wall-processor";
  if (k === "NHDUSBTRX") return "usb-extender";

  if (/^EX/.test(k)) {
    if (/\bover ip\b|\bip extender\b/.test(text)) return "ip-kvm-extender";
    if (/\busb\b/.test(text)) return "hdbaset-usb-extender";
    return "hdbaset-extender";
  }

  if (/^EXP/.test(k)) {
    if (/\b(matrix|switcher|splitter|audio|converter)\b/.test(text)) return "signal-management";
    return "accessory";
  }

  if (/^NHD.*RACK/.test(k)) return "accessory";
  if (/^NHD.*CTL/.test(k)) return "controller-accessory";

  if (/^NHD/.test(k)) {
    if (/\bmultiview|multi-view\b/.test(text)) return "av-over-ip-multiview-decoder";
    if (/\bencoder|transmitter|\btx\b/.test(text)) return "av-over-ip-encoder";
    if (/\bdecoder|receiver|\brx\b/.test(text)) return "av-over-ip-decoder";
    if (/\btransceiver|trx\b/.test(text)) return "av-over-ip-transceiver";
    return "av-over-ip";
  }

  if (/^CAM/.test(k) || /\bptz camera|ndi camera|camera\b/.test(text)) return "camera";

  if (/^APO|^SPK|^AMP|^DSP/.test(k) || /\bspeakerphone|microphone|audio|amplifier|dsp\b/.test(text)) return "audio";

  if (/^SYN|TOUCH/.test(k) || /\btouch panel|control panel|controller\b/.test(text)) return "control";

  if (/\bvideo wall processor|videowall processor|wall processor\b/.test(text)) return "video-wall-processor";
  if (/\bmultiview|multi-view|quad view|single output canvas|picture by picture|pip|pbp\b/.test(text)) return "multiview";

  if (/\bhdbaset matrix|hdbt matrix|matrix kit\b/.test(text)) return "hdbaset-matrix";
  if (/\bmatrix|routed matrix|seamless matrix\b/.test(text)) return "matrix";

  if (/\bhdbaset extender|hdbt extender|tx\/rx extender|transmitter receiver|point-to-point\b/.test(text)) return "hdbaset-extender";

  if (/\bpresentation switcher|room switcher|wireless presentation|usb-c switcher|byod|byom|teams room|collaboration switcher\b/.test(text)) return "presentation-switcher";

  if (/\brack|mount|bracket|psu|power supply|cable|adapter|adaptor\b/.test(text)) return "accessory";

  return "unknown";
}

function group(value) {
  if (["hdbaset-extender", "hdbaset-usb-extender", "ip-kvm-extender", "usb-extender"].includes(value)) return "extension";
  if (["matrix", "hdbaset-matrix"].includes(value)) return "matrix";
  if (value.startsWith("av-over-ip")) return "av-over-ip";
  if (["accessory", "controller-accessory"].includes(value)) return "support-only";
  return value;
}

function storedGroup(record) {
  const stored = norm(storedClassification(record));
  const sku = first(record, ["sku", "SKU", "model", "partNumber", "productSku", "code"]);
  const k = skuKey(sku);

  if (!stored) return "unknown";

  if (/\bmultiview|multi-view\b/.test(stored)) return "multiview";
  if (/\bvideo wall\b/.test(stored)) return "video-wall-processor";
  if (/\bmatrix\b/.test(stored)) return "matrix";
  if (/\bextension|extender|hdbaset extender|usb extender\b/.test(stored)) return "extension";
  if (/\bnetworkhd|av-over-ip|avoip|encoder|decoder|transceiver\b/.test(stored)) return "av-over-ip";
  if (/\bpresentation|switcher|byod|byom|uc\b/.test(stored)) return "presentation-switcher";
  if (/\bcamera|ptz\b/.test(stored)) return "camera";
  if (/\baudio|speakerphone|microphone|dsp|amplifier\b/.test(stored)) return "audio";
  if (/\bcontrol|controller|touch panel\b/.test(stored)) return "control";
  if (/\baccessory|rack|mount|cable|psu|adapter|adaptor\b/.test(stored)) return "support-only";

  if (/^EX/.test(k)) return "extension";
  if (/^NHD/.test(k)) return "av-over-ip";

  return "unknown";
}

const records = [];

for (const file of sourceFiles) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const list = productArrayFromJson(parsed);

  list.forEach((record, index) => {
    if (!record || typeof record !== "object") return;

    const sku = first(record, ["sku", "SKU", "model", "partNumber", "productSku", "code"]);
    const name = first(record, ["name", "title", "label", "productName"]);

    if (!sku && !name) return;

    records.push({
      file: rel(file),
      index,
      sku,
      name,
      storedText: storedClassification(record),
      inferredClass: classify(record),
      storedGroup: storedGroup(record),
      inferredGroup: group(classify(record)),
      text: flattenShallow(record),
    });
  });
}

const issues = [];

function addIssue(record, severity, rule, reason) {
  issues.push({
    severity,
    sku: record.sku || "(no sku)",
    name: record.name || "",
    inferredClass: record.inferredClass,
    storedGroup: record.storedGroup,
    rule,
    reason,
    file: record.file,
    index: record.index,
    storedText: record.storedText,
  });
}

for (const record of records) {
  const k = skuKey(record.sku);

  if (!record.storedText.trim()) {
    addIssue(record, "MEDIUM", "missing-stored-classification", "Top-level product has no clear stored productClass/category/role/family/transport classification.");
    continue;
  }

  if (k === "ATOMEEXKIT" && record.storedGroup !== "extension") {
    addIssue(record, "HIGH", "atlona-extender-misclass", "AT-OME-EX-KIT must classify as HDBaseT extender, not presentation/matrix.");
  }

  if (/^EX/.test(k) && record.storedGroup !== "extension" && record.storedGroup !== "unknown") {
    addIssue(record, "HIGH", "wyrestorm-ex-family-misclass", "WyreStorm EX products should normally classify as extension products.");
  }

  if (k === "NHD0401MV" && record.storedGroup !== "multiview") {
    addIssue(record, "HIGH", "nhd-0401-mv-misclass", "NHD-0401-MV must classify as multiview.");
  }

  if ((k === "SW0206VW" || k === "SW0204VW") && record.storedGroup !== "video-wall-processor") {
    addIssue(record, "HIGH", "video-wall-processor-misclass", "SW-0206-VW and SW-0204-VW must classify as dedicated video wall processors.");
  }

  if (record.inferredGroup !== "unknown" && record.storedGroup !== "unknown" && record.inferredGroup !== record.storedGroup) {
    const allowedMixed = [
      ["av-over-ip", "multiview"],
      ["multiview", "av-over-ip"],
      ["audio", "control"],
      ["control", "audio"],
    ].some(([a, b]) => record.inferredGroup === a && record.storedGroup === b);

    if (!allowedMixed) {
      addIssue(record, "HIGH", "top-level-class-conflict", `Inferred ${record.inferredGroup} conflicts with stored ${record.storedGroup}.`);
    }
  }
}

issues.sort((a, b) => {
  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return (rank[a.severity] - rank[b.severity]) || `${a.sku}${a.file}`.localeCompare(`${b.sku}${b.file}`);
});

function csv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function md(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

const csvPath = path.join(reportDir, `product-classification-audit-v2-${stamp}.csv`);
const mdPath = path.join(reportDir, `product-classification-audit-v2-${stamp}.md`);
const jsonPath = path.join(reportDir, `product-classification-audit-v2-${stamp}.json`);

fs.writeFileSync(jsonPath, JSON.stringify({ records, issues }, null, 2), "utf8");

fs.writeFileSync(csvPath, [
  ["severity", "sku", "name", "inferredClass", "storedGroup", "rule", "reason", "file", "index", "storedText"].join(","),
  ...issues.map((item) => [
    item.severity,
    item.sku,
    item.name,
    item.inferredClass,
    item.storedGroup,
    item.rule,
    item.reason,
    item.file,
    item.index,
    item.storedText,
  ].map(csv).join(",")),
].join("\n"), "utf8");

const lines = [];
lines.push("# Product Classification Audit v2");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Source files scanned: ${sourceFiles.length}`);
lines.push(`- Top-level product records scanned: ${records.length}`);
lines.push(`- High severity issues: ${issues.filter((item) => item.severity === "HIGH").length}`);
lines.push(`- Medium severity issues: ${issues.filter((item) => item.severity === "MEDIUM").length}`);
lines.push(`- Total issues: ${issues.length}`);
lines.push("");
lines.push("## High severity issues");
lines.push("");
lines.push("| SKU | Inferred | Stored | Rule | Reason | File |");
lines.push("|---|---|---|---|---|---|");

for (const issue of issues.filter((item) => item.severity === "HIGH")) {
  lines.push(`| ${md(issue.sku)} | ${md(issue.inferredClass)} | ${md(issue.storedGroup)} | ${md(issue.rule)} | ${md(issue.reason)} | ${md(`${issue.file} [${issue.index}]`)} |`);
}

if (!issues.some((item) => item.severity === "HIGH")) {
  lines.push("| None |  |  |  |  |  |");
}

lines.push("");
lines.push("## Medium severity issues");
lines.push("");
lines.push("| SKU | Inferred | Stored | Rule | Reason | File |");
lines.push("|---|---|---|---|---|---|");

for (const issue of issues.filter((item) => item.severity === "MEDIUM")) {
  lines.push(`| ${md(issue.sku)} | ${md(issue.inferredClass)} | ${md(issue.storedGroup)} | ${md(issue.rule)} | ${md(issue.reason)} | ${md(`${issue.file} [${issue.index}]`)} |`);
}

if (!issues.some((item) => item.severity === "MEDIUM")) {
  lines.push("| None |  |  |  |  |  |");
}

lines.push("");
lines.push(`CSV: ${path.relative(root, csvPath).replace(/\\/g, "/")}`);
lines.push(`JSON: ${path.relative(root, jsonPath).replace(/\\/g, "/")}`);

fs.writeFileSync(mdPath, lines.join("\n"), "utf8");

console.log("[product-classification-audit-v2] Complete");
console.log(`Source files scanned: ${sourceFiles.length}`);
console.log(`Top-level product records scanned: ${records.length}`);
console.log(`High severity issues: ${issues.filter((item) => item.severity === "HIGH").length}`);
console.log(`Medium severity issues: ${issues.filter((item) => item.severity === "MEDIUM").length}`);
console.log(`Markdown: ${path.relative(root, mdPath).replace(/\\/g, "/")}`);
console.log(`CSV: ${path.relative(root, csvPath).replace(/\\/g, "/")}`);
console.log(`JSON: ${path.relative(root, jsonPath).replace(/\\/g, "/")}`);
