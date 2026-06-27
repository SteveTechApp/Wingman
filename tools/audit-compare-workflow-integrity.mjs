import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const reportPath = path.join(root, "docs", "compare-workflow-integrity-audit.md");

const sourceRoots = [
  "src",
  "data",
  "public",
  "tools",
].map((entry) => path.join(root, entry)).filter((entry) => fs.existsSync(entry));

const textFileExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
]);

const knownWyreStormSkuPrefixes = [
  "NHD",
  "MX",
  "MXV",
  "SW",
  "APO",
  "SYN",
  "CAM",
  "CAB",
  "CON",
  "EXP",
  "EXT",
  "EX",
  "HDBT",
  "USB",
  "RXV",
  "TXV",
  "RX",
  "TX",
];

const compareFiles = [
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/pages/ComparePage.tsx",
  "src/wingman2/app/routes.tsx",
  "src/wingman2/app/route-manifest.json",
  "src/main.tsx",
  "src/wingman2/lib/compareEligibilityEngine.ts",
  "src/wingman2/lib/rigorousCompare.ts",
  "src/wingman2/lib/compareRuntimePipeline.ts",
  "src/wingman2/lib/competitorMatchEngine.ts",
  "src/wingman2/lib/compareCandidateGate.ts",
  "src/wingman2/lib/competitorCompareBehaviour.test.ts",
].map((entry) => path.join(root, entry));

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  if (!exists(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(dir) {
  const output = [];
  if (!fs.existsSync(dir)) return output;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      if (entry.name === "dist") continue;
      if (entry.name.startsWith("_wingman_backup")) continue;
      output.push(...walkFiles(full));
      continue;
    }

    const ext = path.extname(entry.name);
    if (!textFileExtensions.has(ext)) continue;
    output.push(full);
  }

  return output;
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function lineHits(filePath, regex) {
  const text = read(filePath);
  const lines = text.split(/\r?\n/);
  const hits = [];

  lines.forEach((line, index) => {
    if (regex.test(line)) {
      hits.push({
        file: rel(filePath),
        line: index + 1,
        text: line.trim(),
      });
    }
  });

  return hits;
}

function allSourceFiles() {
  return sourceRoots.flatMap(walkFiles);
}

function collectHits(regex) {
  return allSourceFiles().flatMap((file) => lineHits(file, regex));
}

function unique(values) {
  return Array.from(new Set(values));
}

function asTable(rows, headers) {
  if (rows.length === 0) return "_None found._\n";

  const escaped = rows.map((row) => headers.map((header) => {
    const value = String(row[header] ?? "");
    return value.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
  }));

  const headerLine = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = escaped.map((row) => `| ${row.join(" | ")} |`).join("\n");

  return `${headerLine}\n${divider}\n${body}\n`;
}

function extractSkusFromText(text) {
  const prefixPattern = knownWyreStormSkuPrefixes.join("|");
  const regex = new RegExp(`\\b(?:${prefixPattern})-[A-Z0-9][A-Z0-9-]*\\b`, "gi");
  return unique(Array.from(text.matchAll(regex)).map((match) => match[0].toUpperCase()));
}

function flattenObjects(value, output = []) {
  if (!value) return output;

  if (Array.isArray(value)) {
    value.forEach((item) => flattenObjects(item, output));
    return output;
  }

  if (typeof value === "object") {
    output.push(value);
    Object.values(value).forEach((item) => flattenObjects(item, output));
  }

  return output;
}

function getPossibleSkuFromObject(object) {
  const candidateKeys = [
    "sku",
    "SKU",
    "model",
    "modelNumber",
    "partNumber",
    "id",
    "name",
    "title",
  ];

  for (const key of candidateKeys) {
    const value = object?.[key];
    if (typeof value !== "string") continue;
    const skus = extractSkusFromText(value);
    if (skus.length > 0) return skus[0];
  }

  const joined = Object.values(object || {})
    .filter((value) => typeof value === "string")
    .join(" ");

  const skus = extractSkusFromText(joined);
  return skus[0] || "";
}

function collectCatalogueSkus() {
  const candidates = [
    "public/product-intelligence-index.json",
    "data/catalog/product-intelligence-index.json",
    "data/catalog/wyrestorm-products.json",
    "data/catalog/products.json",
  ].map((entry) => path.join(root, entry));

  const rows = [];
  const skuSet = new Set();
  const sourceStats = [];

  for (const filePath of candidates) {
    if (!exists(filePath)) continue;

    let parsed = null;
    try {
      parsed = JSON.parse(read(filePath));
    } catch {
      sourceStats.push({
        source: rel(filePath),
        status: "JSON parse failed",
        entries: 0,
      });
      continue;
    }

    const objects = flattenObjects(parsed);
    let count = 0;

    for (const object of objects) {
      const sku = getPossibleSkuFromObject(object);
      if (!sku) continue;

      skuSet.add(sku);
      count += 1;

      rows.push({
        sku,
        source: rel(filePath),
        title: object.title || object.name || object.productName || "",
        role: object.role || object.productRole || object.classification || object.category || "",
        technology: object.technology || object.technologyClass || object.transport || "",
      });
    }

    sourceStats.push({
      source: rel(filePath),
      status: "read",
      entries: count,
    });
  }

  return {
    skuSet,
    rows,
    sourceStats,
  };
}

function getMainGuards() {
  const mainPath = path.join(root, "src/main.tsx");
  const text = read(mainPath);

  const imports = Array.from(text.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+["']\.\/wingman2\/components\/workflow\/([^"']+)["'];/g))
    .map((match) => ({
      component: match[1],
      path: match[2],
      mounted: new RegExp(`<${match[1]}\\s*/>`).test(text),
    }));

  return imports;
}

function getRouteStatus() {
  const routesText = read(path.join(root, "src/wingman2/app/routes.tsx"));
  const manifestText = read(path.join(root, "src/wingman2/app/route-manifest.json"));

  return {
    compareRouteUsesNew: /compare:\s*lazy\(\(\)\s*=>\s*import\(["']\.\.\/pages\/ComparePageNew["']\)\)/.test(routesText),
    compareRouteUsesOld: /compare:\s*lazy\(\(\)\s*=>\s*import\(["']\.\.\/pages\/ComparePage["']\)\)/.test(routesText),
    manifestPathCompare: /"path":\s*"\/wingman\/compare"/.test(manifestText),
    manifestPageNew: /"pageFile":\s*"ComparePageNew\.tsx"/.test(manifestText),
    oldCompareExists: exists(path.join(root, "src/wingman2/pages/ComparePage.tsx")),
    newCompareExists: exists(path.join(root, "src/wingman2/pages/ComparePageNew.tsx")),
  };
}

function analyseComparePageNew() {
  const filePath = path.join(root, "src/wingman2/pages/ComparePageNew.tsx");
  const text = read(filePath);

  const runCompareCount = (text.match(/Run compare/g) || []).length;
  const handleSkuSelectMatches = Array.from(text.matchAll(/handleSkuSelect/g)).length;
  const handleSubmitMatches = Array.from(text.matchAll(/handleSubmit/g)).length;
  const workflowStepMatches = Array.from(text.matchAll(/setWorkflowStep|workflowStep/g)).length;
  const stateMatches = Array.from(text.matchAll(/setState|state ===|state/g)).length;

  return {
    file: rel(filePath),
    lines: text.split(/\r?\n/).length,
    runCompareCount,
    handleSkuSelectMatches,
    handleSubmitMatches,
    workflowStepMatches,
    stateMatches,
    hasRunKnownProfileCompare: text.includes("runKnownProfileCompare("),
    hasLookupCompareIntelligence: text.includes("lookupCompareIntelligence"),
    hasSelectableGate: text.includes("isSelectableWyrestormRecommendation"),
    hasNoSuitableMessage: text.includes("No suitable WyreStorm match found from the current data"),
    hasSeedCatalog: text.includes("COMPETITOR_SKU_SEED_CATALOG"),
    hasManufacturerOptions: text.includes("MANUFACTURER_SELECT_OPTIONS"),
  };
}

function analyseInvalidSkuReferences(catalogueSkuSet) {
  const files = allSourceFiles();
  const rows = [];

  for (const file of files) {
    const text = read(file);
    const skus = extractSkusFromText(text);
    const invalid = skus.filter((sku) => !catalogueSkuSet.has(sku));

    for (const sku of invalid) {
      if (sku.length < 5) continue;
      rows.push({
        sku,
        file: rel(file),
      });
    }
  }

  return rows;
}

function analyseCompareClassTerms() {
  const keyFiles = [
    "src/wingman2/lib/compareEligibilityEngine.ts",
    "src/wingman2/lib/rigorousCompare.ts",
    "src/wingman2/lib/compareRuntimePipeline.ts",
    "src/wingman2/lib/competitorMatchEngine.ts",
    "src/wingman2/lib/compareCandidateGate.ts",
  ].map((entry) => path.join(root, entry)).filter(exists);

  const riskyTerms = [
    "Eligibility correction",
    "candidate inserted",
    "fallback",
    "verify",
    "Unknown",
    "WIRELESS_CASTING",
    "PRESENTATION",
    "VIDEO_WALL",
    "audio processor",
    "role mismatch",
    "Technology class mismatch",
  ];

  const rows = [];

  for (const file of keyFiles) {
    const lines = read(file).split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const term of riskyTerms) {
        if (!line.toLowerCase().includes(term.toLowerCase())) continue;

        rows.push({
          file: rel(file),
          line: index + 1,
          term,
          text: line.trim(),
        });
      }
    });
  }

  return rows;
}

function analyseCompetitorSeedCatalog() {
  const comparePath = path.join(root, "src/wingman2/pages/ComparePageNew.tsx");
  const text = read(comparePath);

  const manufacturerBlockMatch = text.match(/COMPETITOR_SKU_SEED_CATALOG[\s\S]*?};/);
  const block = manufacturerBlockMatch?.[0] || "";

  const brandMatches = Array.from(block.matchAll(/["']([^"']+)["']\s*:\s*\[/g)).map((match) => match[1]);
  const skuMatches = Array.from(block.matchAll(/["']([^"']+)["']/g)).map((match) => match[1]);

  const likelySkuCount = skuMatches.filter((value) => /[A-Z0-9][A-Z0-9 -]*[0-9][A-Z0-9 -]*/i.test(value)).length;

  return {
    brands: unique(brandMatches).sort(),
    brandCount: unique(brandMatches).length,
    rawStringCount: skuMatches.length,
    likelySkuCount,
    hasBlustreamIp300: /IP300/i.test(block),
    hasSolstice: /Solstice/i.test(block),
    hasExtronDtp: /DTP/i.test(block),
  };
}

function analyseDuplicateRunCompareSources() {
  const rows = collectHits(/Run compare|Run typed\/custom compare|wingman-compare-run-action|data-wingman-compare-run-action/i);

  return rows.map((row) => ({
    file: row.file,
    line: row.line,
    text: row.text,
  }));
}

function recommendation() {
  return [
    "Stop adding global DOM workflow guards for compare. They are now causing duplicated UI and masking the real engine behaviour.",
    "Move the workflow split, SKU click-to-run, reset behaviour and result presentation into `ComparePageNew.tsx` natively.",
    "The compare engine must fail closed: a candidate SKU must exist in `public/product-intelligence-index.json` before it can be shown.",
    "Eligibility corrections must never promote a different product class as the best match. They may only add adjacent options, clearly labelled.",
    "For wireless casting competitors, show no direct equivalent unless the user also describes wired AV, USB, conferencing or room switching requirements.",
    "Reduce the result page to decision content only: top direction, why it fits, confirm before quoting, and next action. Hide audit evidence by default.",
    "Competitor seed data is not enough for accurate comparisons unless each item has structured role, class, transport, I/O, resolution and required workflow metadata.",
  ];
}

const routeStatus = getRouteStatus();
const comparePageNew = analyseComparePageNew();
const guards = getMainGuards();
const catalogue = collectCatalogueSkus();
const invalidSkuReferences = analyseInvalidSkuReferences(catalogue.skuSet);
const classTerms = analyseCompareClassTerms();
const seedCatalog = analyseCompetitorSeedCatalog();
const duplicateRunCompareSources = analyseDuplicateRunCompareSources();

const severeFindings = [];

if (!routeStatus.compareRouteUsesNew) {
  severeFindings.push("`/wingman/compare` is not clearly wired to `ComparePageNew.tsx`.");
}

if (guards.filter((guard) => guard.component.toLowerCase().includes("compare")).length > 4) {
  severeFindings.push("Too many global compare workflow guards are mounted in `main.tsx`; this is likely causing duplicated controls and inconsistent state.");
}

if (duplicateRunCompareSources.length > 3) {
  severeFindings.push("Multiple `Run compare` sources exist; duplicate buttons/actions are expected.");
}

if (invalidSkuReferences.some((row) => row.sku === "SW-740-TX" || row.sku === "SW-740")) {
  severeFindings.push("Invalid SKU reference found: `SW-740` / `SW-740-TX`.");
}

if (catalogue.skuSet.size < 250) {
  severeFindings.push("Product intelligence catalogue may be too small or not being read correctly.");
}

if (!comparePageNew.hasSelectableGate) {
  severeFindings.push("ComparePageNew is missing or not using `isSelectableWyrestormRecommendation` marker/gate.");
}

const markdown = `# Compare workflow integrity audit

Generated: ${new Date().toISOString()}

## Executive summary

${severeFindings.length === 0 ? "_No severe structural findings detected by this static audit._" : severeFindings.map((item) => `- ${item}`).join("\n")}

## Route and file wiring

${asTable([routeStatus], [
  "compareRouteUsesNew",
  "compareRouteUsesOld",
  "manifestPathCompare",
  "manifestPageNew",
  "oldCompareExists",
  "newCompareExists",
])}

## ComparePageNew static markers

${asTable([comparePageNew], [
  "file",
  "lines",
  "runCompareCount",
  "handleSkuSelectMatches",
  "handleSubmitMatches",
  "workflowStepMatches",
  "hasRunKnownProfileCompare",
  "hasLookupCompareIntelligence",
  "hasSelectableGate",
  "hasNoSuitableMessage",
  "hasSeedCatalog",
  "hasManufacturerOptions",
])}

## Global workflow guards mounted in main.tsx

These are important because many recent fixes were global DOM overlays rather than native compare-page logic.

${asTable(guards, [
  "component",
  "path",
  "mounted",
])}

## Duplicate Run Compare action sources

${asTable(duplicateRunCompareSources.slice(0, 80), [
  "file",
  "line",
  "text",
])}

## Product intelligence sources

${asTable(catalogue.sourceStats, [
  "source",
  "status",
  "entries",
])}

Unique catalogue SKU count: **${catalogue.skuSet.size}**

## Invalid / non-catalogue WyreStorm SKU references

This compares SKU-like references in source/data against the product intelligence index. Some false positives may appear, but any recommended SKU must be catalogue-backed.

${asTable(invalidSkuReferences.slice(0, 120), [
  "sku",
  "file",
])}

## Competitor seed catalogue coverage

${asTable([{
  brandCount: seedCatalog.brandCount,
  likelySkuCount: seedCatalog.likelySkuCount,
  rawStringCount: seedCatalog.rawStringCount,
  hasBlustreamIp300: seedCatalog.hasBlustreamIp300,
  hasSolstice: seedCatalog.hasSolstice,
  hasExtronDtp: seedCatalog.hasExtronDtp,
}], [
  "brandCount",
  "likelySkuCount",
  "rawStringCount",
  "hasBlustreamIp300",
  "hasSolstice",
  "hasExtronDtp",
])}

Brands detected:

${seedCatalog.brands.map((brand) => `- ${brand}`).join("\n") || "_No brands detected._"}

## Compare class / eligibility risk terms

${asTable(classTerms.slice(0, 120), [
  "file",
  "line",
  "term",
  "text",
])}

## Required corrective direction

${recommendation().map((item) => `- ${item}`).join("\n")}

## Proposed native refactor

### 1. Remove overlay guards from main.tsx

Global compare-specific DOM guards should be removed after the native compare page is fixed. They create duplicated UI and are not reliable sources of truth.

### 2. Make ComparePageNew the only workflow owner

The page should own:

- workflow step state;
- manufacturer selection;
- known SKU selection;
- auto-run on SKU click;
- custom typed search;
- reset/start again;
- result display;
- evidence expansion.

### 3. Add a catalogue-backed candidate gate

Before rendering a WyreStorm recommendation:

1. candidate SKU must exist in product intelligence index;
2. candidate product family must match the competitor technology class;
3. candidate role must match the competitor role;
4. fallback/adjacent directions must be labelled as adjacent, not best match;
5. no direct equivalent must be allowed as a valid outcome.

### 4. Make result output decision-led

Visible by default:

- what Wingman understood;
- outcome;
- best direct match or no direct equivalent;
- why;
- check before quoting;
- next action.

Collapsed by default:

- other options;
- ruled-out list;
- copy-safe summary;
- diagnostic warnings;
- evidence text.

### 5. Data requirement

A competitor SKU is not enough unless it maps to structured fields:

- brand;
- model;
- technology class;
- product role;
- endpoint role;
- source/display I/O;
- transport;
- resolution;
- USB/audio/control requirements;
- known WyreStorm adjacent workflow type.

`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, markdown, "utf8");

console.log("");
console.log("==> Compare workflow integrity audit complete");
console.log(`Report: ${path.relative(root, reportPath).replaceAll(path.sep, "/")}`);
console.log("");
console.log("==> Severe findings");
if (severeFindings.length === 0) {
  console.log("None");
}
for (const finding of severeFindings) {
  console.log(`- ${finding}`);
}
console.log("");
console.log("==> Key counts");
console.log(`Global workflow guards: ${guards.length}`);
console.log(`Compare-specific global guards: ${guards.filter((guard) => guard.component.toLowerCase().includes("compare")).length}`);
console.log(`Run compare sources: ${duplicateRunCompareSources.length}`);
console.log(`Catalogue SKUs: ${catalogue.skuSet.size}`);
console.log(`Invalid/non-catalogue SKU references: ${invalidSkuReferences.length}`);