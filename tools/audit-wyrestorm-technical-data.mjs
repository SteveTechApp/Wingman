import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const governancePath = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const productsPath = path.join(root, "data-sources", "wyrestorm", "products.csv");
const jsonOutput = path.join(root, "public", "wyrestorm-technical-data-audit.json");
const markdownOutput = path.join(root, "docs", "wyrestorm-technical-data-audit.md");

const governance = JSON.parse(fs.readFileSync(governancePath, "utf8"));
const productsCsv = fs.readFileSync(productsPath, "utf8");

const errors = [];
const warnings = [];
const passed = [];

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
}

function check(condition, message) {
  if (condition) passed.push(message);
  else errors.push(message);
}

const profiles = Array.isArray(governance.profiles) ? governance.profiles : [];
const target = profiles.find((profile) => String(profile.sku).toUpperCase() === "MX-0808-H2A-MK2");

check(Boolean(target), "MX-0808-H2A-MK2 governed profile exists");

if (target) {
  const features = target.features ?? {};
  const specs = target.specs ?? {};
  const ports = Array.isArray(target.ports) ? target.ports : [];

  const videoInputs = ports
    .filter((port) => port.category === "video" && port.direction === "input")
    .reduce((sum, port) => sum + Number(port.count || 0), 0);

  const videoOutputs = ports
    .filter((port) => port.category === "video" && port.direction === "output")
    .reduce((sum, port) => sum + Number(port.count || 0), 0);

  // "Verified" requires a human: MX-0808-H2A-MK2 entered the governed
  // program machine-transcribed, then a reviewer confirmed its spec-critical
  // fields in the 2026-08 structured review pass, recording verifiedBy.
  check(
    target.status === "verified" && Boolean(String(target.verifiedBy || "").trim()),
    "MX-0808-H2A-MK2 is human-verified with verifiedBy recorded",
  );
  check(target.productClass === "MATRIX", "MX-0808-H2A-MK2 product class is MATRIX");
  check(Array.isArray(target.transport) && target.transport.length === 1 && target.transport[0] === "HDMI",
    "MX-0808-H2A-MK2 transport is HDMI only");
  check(/4K60/i.test(String(target.maxResolution)) && !/4K120/i.test(String(target.maxResolution)),
    "MX-0808-H2A-MK2 maximum presentation format is 4K60, not 4K120");
  check(Number(specs.bandwidthGbps) === 18, "MX-0808-H2A-MK2 bandwidth is 18Gbps");
  check(videoInputs === 8, "MX-0808-H2A-MK2 has 8 video inputs");
  check(videoOutputs === 8, "MX-0808-H2A-MK2 has 8 routed video outputs");
  check(Number(features.routedInputCount) === 8, "MX-0808-H2A-MK2 routed input count is 8");
  check(Number(features.routedOutputCount) === 8, "MX-0808-H2A-MK2 routed output count is 8");
  check(Number(features.mirroredOutputCount) === 0, "MX-0808-H2A-MK2 has no mirrored outputs");
  check(Number(features.loopOutputCount) === 0, "MX-0808-H2A-MK2 has no loop outputs");
  check(Number(specs.usbTotalPorts) === 0, "MX-0808-H2A-MK2 has no USB ports");
  check(specs.poe === false && specs.poh === false, "MX-0808-H2A-MK2 has no PoE or PoH");
  check(
    Array.isArray(target.evidence) &&
      target.evidence.some((item) => /^https:\/\/www\.wyrestorm\.com\//i.test(String(item.sourceUrl || ""))),
    "MX-0808-H2A-MK2 has an official WyreStorm evidence URL",
  );
}

for (const profile of profiles) {
  if (!/^verified/.test(String(profile.status || ""))) continue;

  const evidence = Array.isArray(profile.evidence) ? profile.evidence : [];
  if (!evidence.some((item) => String(item.sourceUrl || "").trim())) {
    warnings.push(`${profile.sku}: verified profile has no evidence URL`);
  }

  const maxResolution = String(profile.maxResolution || "");
  const bandwidth = Number(profile.specs?.bandwidthGbps || 0);

  if (/4K120/i.test(maxResolution) && bandwidth > 0 && bandwidth <= 18) {
    warnings.push(`${profile.sku}: 4K120 conflicts with ${bandwidth}Gbps governed bandwidth`);
  }

  if (profile.productClass === "MATRIX") {
    const ports = Array.isArray(profile.ports) ? profile.ports : [];
    const hasVideoInput = ports.some((port) => port.category === "video" && port.direction === "input");
    const hasVideoOutput = ports.some((port) => port.category === "video" && port.direction === "output");

    if (!hasVideoInput || !hasVideoOutput) {
      warnings.push(`${profile.sku}: verified matrix lacks connector-level video input/output data`);
    }
  }
}

const lines = productsCsv.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(lines[0] || "");
const skuIndex = headers.indexOf("sku");
const targetLine = lines.slice(1).find((line) => {
  const values = parseCsvLine(line);
  return String(values[skuIndex] || "").toUpperCase() === "MX-0808-H2A-MK2";
});

check(Boolean(targetLine), "MX-0808-H2A-MK2 exists in the canonical WyreStorm CSV");

if (targetLine) {
  const values = parseCsvLine(targetLine);
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));

  check(row.family !== "HDBaseT Matrix", "Canonical CSV no longer classifies MX-0808-H2A-MK2 as HDBaseT");
  check(row.transport_type === "HDMI", "Canonical CSV transport is HDMI");
  check(/4K60/i.test(row.resolution_bandwidth) && !/4K120/i.test(row.resolution_bandwidth),
    "Canonical CSV contains 4K60 and no 4K120");
  check(/8 x HDMI routed inputs/i.test(row.inputs), "Canonical CSV records 8 routed HDMI inputs");
  check(/8 x HDMI routed outputs/i.test(row.outputs), "Canonical CSV records 8 routed HDMI outputs");
  check(!row.usb, "Canonical CSV does not claim USB support");
  check(/No HDBaseT outputs/i.test(row.disqualifiers), "Canonical CSV explicitly excludes HDBaseT outputs");
}

const result = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? "failed" : "passed",
  passed,
  warnings,
  errors,
};

fs.mkdirSync(path.dirname(jsonOutput), { recursive: true });
fs.mkdirSync(path.dirname(markdownOutput), { recursive: true });
fs.writeFileSync(jsonOutput, `${JSON.stringify(result, null, 2)}\n`, "utf8");

const markdown = [
  "# WyreStorm Technical Data Audit",
  "",
  `Generated: ${result.generatedAt}`,
  "",
  `Status: **${result.status.toUpperCase()}**`,
  "",
  "## Passed",
  "",
  ...(passed.length ? passed.map((item) => `- ${item}`) : ["- None"]),
  "",
  "## Warnings",
  "",
  ...(warnings.length ? warnings.map((item) => `- ${item}`) : ["- None"]),
  "",
  "## Errors",
  "",
  ...(errors.length ? errors.map((item) => `- ${item}`) : ["- None"]),
  "",
].join("\n");

fs.writeFileSync(markdownOutput, markdown, "utf8");

console.log(`[wyrestorm-technical-data] ${result.status.toUpperCase()}`);
console.log(`[wyrestorm-technical-data] ${passed.length} passed, ${warnings.length} warnings, ${errors.length} errors`);
console.log(`[wyrestorm-technical-data] ${path.relative(root, jsonOutput)}`);
console.log(`[wyrestorm-technical-data] ${path.relative(root, markdownOutput)}`);

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
