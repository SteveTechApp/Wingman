import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const finderPath = path.join(
  root,
  "src",
  "wingman2",
  "pages",
  "FinderPage.tsx",
);
const styleStackPath = path.join(
  root,
  "src",
  "wingman2",
  "styles",
  "wingman-style-stack.css",
);

function fail(message) {
  console.error(`[finder-density] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(finderPath)) {
  fail("FinderPage.tsx was not found.");
}

if (!fs.existsSync(styleStackPath)) {
  fail("wingman-style-stack.css was not found.");
}

const finder = fs.readFileSync(finderPath, "utf8");
const styleStack = fs.readFileSync(styleStackPath, "utf8");

const cssImports = [
  ...finder.matchAll(/import\s+["'][^"']+\.css["'];/g),
];

if (cssImports.length > 0) {
  fail(
    "FinderPage.tsx must not import CSS directly. " +
      "Use wingman-style-stack.css only.",
  );
}

const acceptedStyleMarkers = [
  "WINGMAN FINDER VIEWPORT FIT START",
  "WINGMAN FINDER STABLE RECOVERY START",
  "WINGMAN-FINDER-TOP-FILTER-REDESIGN-START",
];

if (!acceptedStyleMarkers.some((marker) => styleStack.includes(marker))) {
  fail(
    "Finder governed layout rules are missing from " +
      "wingman-style-stack.css.",
  );
}

const requiredFinderHooks = [
  "wm-finder-redesign-page",
  "finder-stepper",
  "finder-active-step-panel",
  "finder-start-form",
  "finder-step-footer",
];

for (const hook of requiredFinderHooks) {
  if (!finder.includes(hook)) {
    fail(`Finder layout hook is missing: ${hook}`);
  }
}

if (finder.includes("function applyFinderHeaderAndGuruCleanup")) {
  fail(
    "The obsolete Finder DOM styling workaround is still present.",
  );
}

const paragraphCount = [...finder.matchAll(/<p[\s>]/g)].length;
const smallCount = [...finder.matchAll(/<small[\s>]/g)].length;
const buttonCount = [...finder.matchAll(/<button[\s>]/g)].length;

const report = {
  finderPage: path.relative(root, finderPath).replaceAll("\\", "/"),
  paragraphCount,
  smallCount,
  buttonCount,
  governedStyleMarker: acceptedStyleMarkers.find((marker) =>
    styleStack.includes(marker),
  ),
  cssImports: cssImports.length,
  requiredHooks: requiredFinderHooks.length,
};

console.log("[finder-density] Finder density snapshot:");
console.log(JSON.stringify(report, null, 2));

if (paragraphCount > 140) {
  console.warn(
    "[finder-density] Finder still has a high number of <p> nodes.",
  );
}

console.log("[finder-density] Passed.");