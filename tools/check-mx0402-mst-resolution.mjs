import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const passed = [];

function check(condition, message) {
  if (condition) passed.push(message);
  else errors.push(message);
}

const governancePath = path.join(root, "data", "governance", "wyrestorm-technical-profiles.json");
const enginePath = path.join(root, "src", "wingman2", "lib", "compareSpecEngine.ts");
const csvPath = path.join(root, "data-sources", "wyrestorm", "products.csv");

const governance = JSON.parse(fs.readFileSync(governancePath, "utf8"));
const profile = governance.profiles.find((item) => String(item.sku).toUpperCase() === "MX-0402-MST");
const engine = fs.readFileSync(enginePath, "utf8");
const csv = fs.readFileSync(csvPath, "utf8");

check(Boolean(profile), "MX-0402-MST governed profile exists");

if (profile) {
  check(profile.maxResolution === "4K60 4:4:4", "MX-0402-MST maximum video is 4K60 4:4:4");
  // Check the governed maximum-resolution field itself. The profile deliberately
  // contains warning text such as "Do not display 4K120", which must not be
  // mistaken for a technical 4K120 capability claim.
  check(
    !/4K120/i.test(String(profile.maxResolution ?? "")),
    "MX-0402-MST governed maximum-resolution field contains no 4K120 claim",
  );
  check(Number(profile.specs?.bandwidthGbps) === 18, "MX-0402-MST bandwidth is 18Gbps");
  check(Number(profile.features?.routedInputCount) === 4, "MX-0402-MST has four routed inputs");
  check(Number(profile.features?.routedOutputCount) === 2, "MX-0402-MST has two routed outputs");
  check(profile.specs?.poe === false && profile.specs?.poh === false, "MX-0402-MST has no PoE or PoH");
}

check(!engine.includes("4096.*120|2160.*120"), "Unsafe broad 4K120 regex has been removed");
check(engine.includes("A dedicated max-resolution field outranks"), "Dedicated max-resolution data outranks broad standards text");
function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
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

const csvLines = csv.split(/\r?\n/).filter(Boolean);
const csvHeaders = parseCsvLine(csvLines[0] ?? "");
const skuColumn = csvHeaders.indexOf("sku");
const resolutionColumn = csvHeaders.indexOf("resolution_bandwidth");
const mx0402Values = csvLines
  .slice(1)
  .map(parseCsvLine)
  .find((values) => String(values[skuColumn] ?? "").toUpperCase() === "MX-0402-MST");
const mx0402Resolution = mx0402Values && resolutionColumn >= 0
  ? String(mx0402Values[resolutionColumn] ?? "")
  : "";

check(Boolean(mx0402Values), "Canonical CSV contains MX-0402-MST");
check(/4K60 4:4:4/i.test(mx0402Resolution), "Canonical CSV resolution field records 4K60 4:4:4");
check(!/4K120/i.test(mx0402Resolution), "Canonical CSV resolution field does not claim 4K120");

console.log(`[mx0402-resolution] ${passed.length} passed, ${errors.length} failed`);
for (const item of passed) console.log(`PASS: ${item}`);
for (const item of errors) console.error(`FAIL: ${item}`);

if (errors.length) process.exit(1);
