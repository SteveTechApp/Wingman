import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data/catalog/competitor-products.generated.json");
const products = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}

function flattenSpecsJson(value, out = []) {
  if (value === null || value === undefined) return out;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    out.push(String(value));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenSpecsJson(item, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      flattenSpecsJson(item, out);
    }
  }
  return out;
}

function textBlobFor(product) {
  const inputs = Array.isArray(product.inputs) ? product.inputs.map((p) => `${p.count ?? ""}x ${p.type ?? ""}`) : [];
  const outputs = Array.isArray(product.outputs) ? product.outputs.map((p) => `${p.count ?? ""}x ${p.type ?? ""}`) : [];
  const control = Array.isArray(product.control) ? product.control : [];
  const audio = Array.isArray(product.audio) ? product.audio : [];
  const features = Array.isArray(product.features)
    ? product.features
    : product.features && typeof product.features === "object"
      ? Object.entries(product.features).filter(([, v]) => v === true).map(([k]) => k)
      : [];
  const specsFlat = flattenSpecsJson(product.specs);
  return [
    product.sku,
    product.name,
    product.summary,
    product.category,
    product.subcategory,
    product.family,
    product.technology,
    product.notes,
    product.knownLimitations,
    product.video?.maxResolution,
    product.video?.hdmi,
    product.video?.hdbaset,
    product.video?.hdbasetClass,
    ...inputs,
    ...outputs,
    ...control,
    ...audio,
    ...features,
    ...specsFlat,
  ].map(clean).filter(Boolean).join(" | ");
}

const rows = [];
const totals = {
  products: 0,
  byApprovalStatus: {},
  byBrand: {},
  missingInputsOutputs: 0,
  missingControl: 0,
  missingAudio: 0,
  missingFeatures: 0,
  missingMaxResolution: 0,
  noResolutionEvidence: 0,
  hdmiMentionedNoVersion: 0,
  hdbasetMentionedNoClassOrVersion: 0,
  usbMentionedNoVersion: 0,
  noControlProtocolStructured: 0,
  mentionsWirelessButNoFeatureFlag: 0,
  mentionsMultiviewButNoFeatureFlag: 0,
  missingIoCounts: 0,
  missingSourceUrl: 0,
};

for (const product of products) {
  totals.products += 1;
  totals.byApprovalStatus[product.approvalStatus] = (totals.byApprovalStatus[product.approvalStatus] || 0) + 1;
  totals.byBrand[product.brand] = (totals.byBrand[product.brand] || 0) + 1;

  const text = textBlobFor(product);
  const hasInputs = Array.isArray(product.inputs) && product.inputs.length > 0;
  const hasOutputs = Array.isArray(product.outputs) && product.outputs.length > 0;
  if (!hasInputs && !hasOutputs) totals.missingInputsOutputs += 1;

  const hasControl = Array.isArray(product.control) && product.control.length > 0;
  if (!hasControl) totals.missingControl += 1;

  const hasAudio = Array.isArray(product.audio) && product.audio.length > 0;
  if (!hasAudio) totals.missingAudio += 1;

  const featureCount = Array.isArray(product.features)
    ? product.features.length
    : product.features && typeof product.features === "object"
      ? Object.values(product.features).filter(Boolean).length
      : 0;
  if (!featureCount) totals.missingFeatures += 1;

  const hasMaxResolution = Boolean(clean(product.video?.maxResolution));
  if (!hasMaxResolution) totals.missingMaxResolution += 1;

  const hasResolutionEvidence = /\b(4k|8k|1080p|720p|3840x2160|4096x2160|1920x1080|2160p)\b/i.test(text);
  if (!hasResolutionEvidence) totals.noResolutionEvidence += 1;

  const structuredHdmi = clean(product.video?.hdmi) || clean(product.specs?.video?.hdmi);
  const mentionsHdmi = /\bhdmi\b/i.test(text);
  const hasHdmiVersion = /(1\.4|2\.0[ab]?|2\.1)\b/i.test(structuredHdmi) || /\bhdmi\s*(1\.4|2\.0[ab]?|2\.1)\b/i.test(text);
  if (mentionsHdmi && !hasHdmiVersion) totals.hdmiMentionedNoVersion += 1;

  const structuredHdbaset = clean(product.video?.hdbaset) || clean(product.specs?.video?.hdbaset);
  const structuredHdbasetClass = clean(product.video?.hdbasetClass) || clean(product.specs?.video?.hdbasetClass);
  const mentionsHdbaset = /\bhdbase[-\s]?t\b|\bhdbt\b/i.test(text);
  const hasHdbasetClassOrVersion =
    /(2\.0|3\.0)\b/.test(structuredHdbaset) ||
    /^[abc]$/i.test(structuredHdbasetClass) ||
    /\bhdbaset\s*(2\.0|3\.0)\b|\bclass\s*[abc]\b/i.test(text);
  if (mentionsHdbaset && !hasHdbasetClassOrVersion) totals.hdbasetMentionedNoClassOrVersion += 1;

  const structuredUsb = clean(product.specs?.usb?.standard) || clean(product.usb?.standard);
  const mentionsUsb = /\busb\b/i.test(text);
  const hasUsbVersion = /(2\.0|3\.0|3\.1|3\.2)\b/.test(structuredUsb) || /\busb\s*(2\.0|3\.0|3\.1|3\.2)\b/i.test(text);
  if (mentionsUsb && !hasUsbVersion) totals.usbMentionedNoVersion += 1;

  const mentionsControlTerm = /\brs-?232\b|\bir\b|\bcec\b|\btelnet\b|\bapi\b|\brelay\b|\btcp\/ip\b|\bweb ui\b/i.test(text);
  if (mentionsControlTerm && !hasControl) totals.noControlProtocolStructured += 1;

  const mentionsWireless = /\bairplay\b|\bmiracast\b|\bchromecast\b|\bclickshare\b|\bwireless casting\b|\bwireless presentation\b|\bscreen ?sharing\b/i.test(text);
  const hasWirelessFlag = featureCount > 0 && /wireless|airplay|miracast|clickshare|screen ?sharing|casting/i.test(
    Array.isArray(product.features) ? product.features.join(" ") : Object.keys(product.features || {}).join(" "),
  );
  if (mentionsWireless && !hasWirelessFlag) totals.mentionsWirelessButNoFeatureFlag += 1;

  const mentionsMultiview = /\bmulti[-\s]?view\b/i.test(text);
  const hasMultiviewFlag = featureCount > 0 && /multiview|multi-view|multi view/i.test(
    Array.isArray(product.features) ? product.features.join(" ") : Object.keys(product.features || {}).join(" "),
  );
  if (mentionsMultiview && !hasMultiviewFlag) totals.mentionsMultiviewButNoFeatureFlag += 1;

  const hasIoCounts = product.routedInputCount != null || product.routedOutputCount != null || hasInputs || hasOutputs;
  if (!hasIoCounts) totals.missingIoCounts += 1;

  if (!clean(product.sourceUrl)) totals.missingSourceUrl += 1;

  rows.push({
    sku: product.sku,
    brand: product.brand,
    approvalStatus: product.approvalStatus,
    hasInputs,
    hasOutputs,
    hasControl,
    hasAudio,
    featureCount,
    hasMaxResolution,
    hasResolutionEvidence,
    mentionsHdmi,
    hasHdmiVersion,
    mentionsHdbaset,
    hasHdbasetClassOrVersion,
    mentionsUsb,
    hasUsbVersion,
  });
}

const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "wingman-competitor-technical-spec-completeness-audit.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), totals, rows }, null, 2) + "\n",
);

console.log(JSON.stringify(totals, null, 2));
