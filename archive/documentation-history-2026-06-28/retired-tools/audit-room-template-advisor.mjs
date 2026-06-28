import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");
const pagePath = path.join(root, "src", "wingman2", "pages", "TemplatesPage.tsx");
const cssPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const reportPath = path.join(root, "reports", "room-template-advisor-audit.md");

function fail(message) {
  throw new Error(message);
}

function read(file) {
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8");
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

if (!fs.existsSync(srcDir)) {
  fail("Cannot find src folder. Run this from C:\\Users\\Steve\\Wingman.");
}

if (!fs.existsSync(pagePath)) {
  fail("Cannot find src/wingman2/pages/TemplatesPage.tsx.");
}

if (!fs.existsSync(cssPath)) {
  fail("Cannot find src/wingman2/styles/wingman-style-stack.css.");
}

const page = read(pagePath);
const css = read(cssPath);

const checks = [
  {
    name: "Template page has advisory library marker",
    pass: /data-wingman-room-templates-page="true"/.test(page),
    fix: "Ensure the Room Templates page wrapper includes data-wingman-room-templates-page=\"true\"."
  },
  {
    name: "Template detail has schematic page marker",
    pass: /data-wingman-template-detail-page="true"/.test(page),
    fix: "Ensure the template detail wrapper includes data-wingman-template-detail-page=\"true\"."
  },
  {
    name: "Blank discovery card removed",
    pass: !/Start blank discovery/i.test(page) && !/No template/i.test(page),
    fix: "Remove the old Start blank discovery / No template card from TemplatesPage.tsx."
  },
  {
    name: "Advice uses real-world application language",
    pass: /realWorldApplication/.test(page) && /applicationLine/.test(page) && /primaryOutcome/.test(page),
    fix: "Add realWorldApplication, applicationLine and primaryOutcome fields to each template."
  },
  {
    name: "Room assumptions are data-driven",
    pass: /assumptions/.test(page) && /roomSize/.test(page) && /equipmentLocation/.test(page) && /unsuitableWhen/.test(page),
    fix: "Add room assumptions for room size, equipment location and unsuitable use cases."
  },
  {
    name: "Advisory guidance exists",
    pass: /useWhen/.test(page) && /avoidWhen/.test(page) && /questions/.test(page) && /upgradePath/.test(page),
    fix: "Add useWhen, avoidWhen, discovery questions and upgradePath arrays."
  },
  {
    name: "Validation section exists",
    pass: /validation/.test(page) && /Validate before using/i.test(page),
    fix: "Add validation checks and a visible Validate before using panel."
  },
  {
    name: "Visio-style schematic component exists",
    pass: /VisioRoomSchematic/.test(page) && /svg viewBox/.test(page),
    fix: "Add or restore the VisioRoomSchematic component."
  },
  {
    name: "Physical locations are included",
    pass: /locations/.test(page) && /Table|Lectern|Rack|Credenza|Display|Audio|Network/i.test(page),
    fix: "Add physical location boxes such as table, lectern, rack, display and audio."
  },
  {
    name: "Devices are grouped by location",
    pass: /devices/.test(page) && /location\.devices/.test(page),
    fix: "Ensure each location includes a devices array and the schematic renders location.devices."
  },
  {
    name: "Signal connections are data-driven",
    pass: /connections/.test(page) && /from:/.test(page) && /to:/.test(page) && /signal|SignalType|HDMI|USB|LAN \/ AVoIP/.test(page),
    fix: "Add data-driven connections with signal types."
  },
  {
    name: "No horizontal-scroll canvas pattern",
    pass: !/overflow-x-auto/.test(page) && !/whitespace-nowrap/.test(page),
    fix: "Remove overflow-x-auto and whitespace-nowrap from the template page."
  },
  {
    name: "CSS blocks horizontal scroll on template pages",
    pass: /overflow-x:\s*hidden\s*!important/.test(css) && /data-wingman-template-detail-page/.test(css),
    fix: "Add route-specific overflow-x hidden rules for template pages."
  },
  {
    name: "Schematic is responsive",
    pass: /\.wm-visio-shell/.test(css) && /svg/.test(css) && /width:\s*100%/.test(css),
    fix: "Ensure .wm-visio-shell svg is width: 100% and height: auto."
  },
  {
    name: "Sample advisory templates present",
    pass:
      /Corporate Boardroom - NetworkHD 500/.test(page) &&
      /Corporate Huddle Room - Apollo BYOD/.test(page) &&
      /Education Classroom - Front-of-Room HDBaseT/.test(page) &&
      /Hospitality Sports Bar - NetworkHD 500 Multi-Zone/.test(page) &&
      /Local Pub - 8x8 Matrix TV Distribution/.test(page),
    fix: "Restore the five required advisory-ready sample templates."
  }
];

const templateCount = countMatches(page, /name:\s*"[^"]+"/g);
const locationCount = countMatches(page, /label:\s*"[^"]+"/g);
const connectionCount = countMatches(page, /from:\s*"[^"]+"\s*,\s*to:\s*"[^"]+"/g);

const failed = checks.filter((check) => !check.pass);

const lines = [];

lines.push("# Room Template Advisor Audit");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Checks passed: ${checks.length - failed.length}/${checks.length}`);
lines.push(`- Advisory templates detected: ${templateCount}`);
lines.push(`- Location/device labels detected: ${locationCount}`);
lines.push(`- Signal connections detected: ${connectionCount}`);
lines.push("");

lines.push("## Checks");
lines.push("");

for (const check of checks) {
  lines.push(`### ${check.pass ? "PASS" : "FAIL"} - ${check.name}`);
  lines.push("");
  if (!check.pass) {
    lines.push(`Fix: ${check.fix}`);
    lines.push("");
  }
}

lines.push("## Required standard");
lines.push("");
lines.push("A room template should be accepted only if a salesperson can answer:");
lines.push("");
lines.push("- What room is this for?");
lines.push("- What customer problem does it solve?");
lines.push("- What equipment is assumed?");
lines.push("- Where are devices physically located?");
lines.push("- What connects to what?");
lines.push("- What must be checked before proposing it?");
lines.push("- Why is the suggested WyreStorm system appropriate?");
lines.push("");

fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

console.log("");
console.log("Room Template Advisor audit complete.");
console.log(`Report written to: ${path.relative(root, reportPath)}`);
console.log("");

if (failed.length > 0) {
  console.log("Failed checks:");
  for (const check of failed) console.log(`- ${check.name}`);
  process.exitCode = 1;
}

if (failed.length === 0) {
  console.log("All checks passed.");
}
