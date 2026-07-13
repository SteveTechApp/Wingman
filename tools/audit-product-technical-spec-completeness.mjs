import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data/wingman-canonical-product-store.json");
const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const products = Array.isArray(payload?.products) ? payload.products : [];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
function lower(value) {
  return clean(value).toLowerCase();
}
function includesAny(text, terms) {
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}

// Evidence text that indicates a "port" entry is really an included
// accessory / in-box item rather than a physical signal I/O connector.
const ACCESSORY_EVIDENCE_TERMS = [
  "mounting bracket",
  "rack bracket",
  "wall bracket",
  "mounting kit",
  "quickstart",
  "quick start",
  "user guide",
  "power supply",
  "power adapter",
  "terminal block",
  "remote control",
  "desktop stand",
  "wall mounting kit",
  "lens cap",
  "cable pack",
  " tie",
  "warranty card",
];

function isAccessoryPort(port) {
  const evidence = lower(`${port.connector || ""} ${port.evidence || ""}`);
  if (includesAny(evidence, ACCESSORY_EVIDENCE_TERMS)) return true;
  // Self-referencing companion-unit rows, e.g. "1x NHD-500-TX or NHD-500-RX"
  if (/\b(transmitter|receiver|tx|rx)\b.*\b(1x|2x)\b/i.test(port.connector || "") && /\bor\b/i.test(port.connector || "")) return true;
  return false;
}

function textBlobFor(product) {
  const profile = product.technicalProfile || {};
  const ports = Array.isArray(profile.io?.ports) ? profile.io.ports : [];
  const features = Array.isArray(profile.features) ? profile.features.map((f) => f.label || f) : [];
  return [
    product.sku,
    product.name,
    product.title,
    product.description,
    product.summary,
    product.category,
    product.family,
    ...(Array.isArray(product.connectors) ? product.connectors : []),
    ...features,
    ...ports.map((p) => `${p.connector} ${p.evidence}`),
  ].map(clean).filter(Boolean).join(" | ");
}

const rows = [];
let totals = {
  products: 0,
  emptySourceCatalogInputs: 0,
  emptySourceCatalogOutputs: 0,
  emptySourceCatalogResolution: 0,
  emptySourceCatalogUsb: 0,
  emptySourceCatalogAudio: 0,
  emptySourceCatalogControl: 0,
  emptySourceCatalogNetwork: 0,
  noResolutionEvidence: 0,
  hdmiMentionedNoVersion: 0,
  hdbasetMentionedNoClassOrDistance: 0,
  usbMentionedNoVersion: 0,
  noControlProtocolStructured: 0,
  mentionsWirelessCastingButNoFeatureFlag: 0,
  mentionsMultiviewButNoFeatureFlag: 0,
  accessoryPortsPollutingIoCount: 0,
  totalIoPortRows: 0,
  missingStructuredVideoProfile: 0,
  missingStructuredAudioProfile: 0,
  missingStructuredUsbProfile: 0,
  missingStructuredNetworkProfile: 0,
  missingStructuredControlProfile: 0,
};

for (const product of products) {
  totals.products += 1;
  const sc = product.sourceCatalog || {};
  const profile = product.technicalProfile || {};
  const text = textBlobFor(product);
  const ports = Array.isArray(profile.io?.ports) ? profile.io.ports : [];
  const accessoryPorts = ports.filter(isAccessoryPort);

  if (!clean(sc.inputs)) totals.emptySourceCatalogInputs += 1;
  if (!clean(sc.outputs)) totals.emptySourceCatalogOutputs += 1;
  if (!clean(sc.resolutionBandwidth)) totals.emptySourceCatalogResolution += 1;
  if (!clean(sc.usb)) totals.emptySourceCatalogUsb += 1;
  if (!clean(sc.audio)) totals.emptySourceCatalogAudio += 1;
  if (!clean(sc.control)) totals.emptySourceCatalogControl += 1;
  if (!clean(sc.networkRequirement)) totals.emptySourceCatalogNetwork += 1;

  const hasResolutionEvidence = /\b(4k|8k|1080p|720p|3840x2160|4096x2160|1920x1080)\b/i.test(text);
  if (!hasResolutionEvidence) totals.noResolutionEvidence += 1;

  const mentionsHdmi = /\bhdmi\b/i.test(text);
  const hasHdmiVersion = /\bhdmi\s*(1\.4|2\.0[ab]?|2\.1)\b/i.test(text);
  if (mentionsHdmi && !hasHdmiVersion) totals.hdmiMentionedNoVersion += 1;

  const mentionsHdbaset = /\bhdbase[-\s]?t\b|\bhdbt\b/i.test(text);
  const hasHdbasetClassOrDistance = /\bhdbaset\s*(2\.0|3\.0)\b|\bclass\s*[ab]\b|\b\d{2,3}\s*m(?:eters)?\b|\b\d{2,4}\s*ft\b/i.test(text);
  if (mentionsHdbaset && !hasHdbasetClassOrDistance) totals.hdbasetMentionedNoClassOrDistance += 1;

  const mentionsUsb = /\busb\b/i.test(text);
  const hasUsbVersion = /\busb\s*(2\.0|3\.0|3\.1|3\.2)\b/i.test(text);
  if (mentionsUsb && !hasUsbVersion) totals.usbMentionedNoVersion += 1;

  const mentionsControlTerm = /\brs-?232\b|\bir\b|\bcec\b|\btelnet\b|\bapi\b|\brelay\b/i.test(text);
  const hasStructuredControl = !!(profile.control && Array.isArray(profile.control.protocols) && profile.control.protocols.length);
  if (mentionsControlTerm && !hasStructuredControl) totals.noControlProtocolStructured += 1;

  const mentionsWireless = /\bairplay\b|\bmiracast\b|\bchromecast\b|\bwireless casting\b|\bwireless presentation\b/i.test(text);
  const hasWirelessFeatureFlag = Array.isArray(profile.features) && profile.features.some((f) => /wireless/i.test(f.label || f));
  if (mentionsWireless && !hasWirelessFeatureFlag) totals.mentionsWirelessCastingButNoFeatureFlag += 1;

  const mentionsMultiview = /\bmulti[-\s]?view\b/i.test(text);
  const hasMultiviewFlag = Array.isArray(profile.features) && profile.features.some((f) => /multiview|multi-view|multi view/i.test(f.label || f));
  if (mentionsMultiview && !hasMultiviewFlag) totals.mentionsMultiviewButNoFeatureFlag += 1;

  totals.totalIoPortRows += ports.length;
  totals.accessoryPortsPollutingIoCount += accessoryPorts.length;

  if (!profile.video) totals.missingStructuredVideoProfile += 1;
  if (!profile.audio) totals.missingStructuredAudioProfile += 1;
  if (!profile.usb) totals.missingStructuredUsbProfile += 1;
  if (!profile.network) totals.missingStructuredNetworkProfile += 1;
  if (!profile.control) totals.missingStructuredControlProfile += 1;

  rows.push({
    sku: product.sku,
    category: product.category,
    hasResolutionEvidence,
    mentionsHdmi,
    hasHdmiVersion,
    mentionsHdbaset,
    hasHdbasetClassOrDistance,
    mentionsUsb,
    hasUsbVersion,
    mentionsControlTerm,
    hasStructuredControl,
    portCount: ports.length,
    accessoryPortCount: accessoryPorts.length,
    hasStructuredVideoProfile: Boolean(profile.video),
    hasStructuredUsbProfile: Boolean(profile.usb),
  });
}

const reportDir = path.join(root, "reports");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, "wingman-product-technical-spec-completeness-audit.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), totals, rows }, null, 2) + "\n",
);

console.log(JSON.stringify(totals, null, 2));
