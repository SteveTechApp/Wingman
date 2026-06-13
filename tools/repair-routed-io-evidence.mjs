import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");

const REPORT_DIR = path.join(ROOT, "reports");
const REPORT_JSON = path.join(REPORT_DIR, "routed-io-repair-report.json");
const REPORT_MD = path.join(REPORT_DIR, "routed-io-repair-report.md");

const SEARCH_DIRS = ["public", "data"];

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".vite",
  ".next",
  "reports"
]);

const EXCLUDED_FILE_PATTERNS = [
  /audit/i,
  /maintenance-queue/i,
  /source-pdf-intelligence/i,
  /product-intelligence-drafts/i,
  /product-call-card-products/i
];

function shouldSkipJsonFile(filePath) {
  const relativePath = path.relative(ROOT, filePath).replaceAll("\\", "/");
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

const ROUTED_IO_OVERRIDES = {
  "MX-0808-SCL-V2": {
    routedInputs: 8,
    routedOutputs: 8,
    matrixSizeEvidence: "SKU evidence: MX-0808-SCL-V2",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-1616-H2XC": {
    routedInputs: 16,
    routedOutputs: 16,
    matrixSizeEvidence: "SKU evidence: MX-1616-H2XC",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MXV-0606-H2A-70": {
    routedInputs: 6,
    routedOutputs: 6,
    matrixSizeEvidence: "SKU evidence: MXV-0606-H2A-70",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MXV-0808-H2L": {
    routedInputs: 8,
    routedOutputs: 8,
    physicalOutputs: 10,
    mirroredOutputs: 2,
    matrixSizeEvidence: "SKU evidence: MXV-0808-H2L; physical outputs include mirrored/parallel outputs",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MXV-0808-H2A-70-V3": {
    routedInputs: 8,
    routedOutputs: 8,
    matrixSizeEvidence: "Title evidence: 70m 4K60 8x8 HDBaseT Matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MXV-0404-H2A-KIT-V2": {
    routedInputs: 4,
    routedOutputs: 4,
    physicalOutputs: 5,
    mirroredOutputs: 1,
    matrixSizeEvidence: "Source evidence: 4 HDBaseT zone outputs plus 1 mirrored HDMI output",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0402-MST": {
    routedInputs: 4,
    routedOutputs: 2,
    matrixSizeEvidence: "SKU/title evidence: MX-0402-MST / 4x2 HDMI",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "SW-0401-H2": {
    routedInputs: 4,
    routedOutputs: 1,
    matrixSizeEvidence: "Title/source evidence: 4x1 HDMI switcher routing four sources to one display",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "SW-640L-TX-W": {
    routedInputs: 4,
    routedOutputs: 2,
    matrixSizeEvidence: "Title evidence: 4-input presentation switcher with 2 HDMI matrix outputs",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0403-H3-MST": {
    routedInputs: 4,
    routedOutputs: 3,
    matrixSizeEvidence: "SKU/title evidence: MX-0403-H3-MST / 4x3 HDMI",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0404-HDMI": {
    routedInputs: 4,
    routedOutputs: 4,
    matrixSizeEvidence: "SKU/title evidence: MX-0404-HDMI / 4x4 HDMI Matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0404-SCL": {
    routedInputs: 4,
    routedOutputs: 4,
    matrixSizeEvidence: "SKU/title evidence: MX-0404-SCL / 4x4 HDMI Matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0804-EDC": {
    routedInputs: 8,
    routedOutputs: 4,
    matrixSizeEvidence: "Title evidence: 8x4 Seamless Matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0808-SCL": {
    routedInputs: 8,
    routedOutputs: 8,
    matrixSizeEvidence: "SKU evidence: MX-0808-SCL",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0812-SCL": {
    routedInputs: 8,
    routedOutputs: 12,
    matrixSizeEvidence: "SKU evidence: MX-0812-SCL",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-1007-HYB": {
    routedInputs: 10,
    routedOutputs: 7,
    matrixSizeEvidence: "SKU/title evidence: MX-1007-HYB / 10x7 Seamless Matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-1616-SCL": {
    routedInputs: 16,
    routedOutputs: 16,
    matrixSizeEvidence: "SKU/title evidence: MX-1616-SCL / 16x16 HDMI",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "SP-0108-SCL": {
    routedInputs: 1,
    routedOutputs: 8,
    physicalOutputs: 8,
    mirroredOutputs: 8,
    matrixSizeEvidence: "Title evidence: 1x8 HDMI",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "EXP-SP-0102-8K": {
    routedInputs: 1,
    routedOutputs: 2,
    physicalOutputs: 2,
    mirroredOutputs: 2,
    matrixSizeEvidence: "Title evidence: 1x2 HDMI Splitter",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "EXP-SP-0102-H2": {
    routedInputs: 1,
    routedOutputs: 2,
    physicalOutputs: 2,
    mirroredOutputs: 2,
    matrixSizeEvidence: "Title evidence: 1x2 HDMI Splitter",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "EXP-SP-0104-H2": {
    routedInputs: 1,
    routedOutputs: 4,
    physicalOutputs: 4,
    mirroredOutputs: 4,
    matrixSizeEvidence: "Title evidence: 1x4 HDMI Splitter",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "SP-0102-H2": {
    routedInputs: 1,
    routedOutputs: 2,
    physicalOutputs: 2,
    mirroredOutputs: 2,
    matrixSizeEvidence: "Title evidence: 1x2 HDMI Splitter",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "SP-0104-H2": {
    routedInputs: 1,
    routedOutputs: 4,
    physicalOutputs: 4,
    mirroredOutputs: 4,
    matrixSizeEvidence: "Title evidence: 1x4 HDMI Splitter",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "SP-618": {
    routedInputs: 1,
    routedOutputs: 8,
    physicalOutputs: 8,
    mirroredOutputs: 8,
    matrixSizeEvidence: "Title evidence: 1x8 HDMI Splitter",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "TX-H2X-HDBT": {
    routedInputs: 1,
    routedOutputs: 1,
    physicalOutputs: 2,
    mirroredOutputs: 1,
    matrixSizeEvidence: "Source evidence: 1 routed HDBaseT output plus 1 mirrored HDMI output",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "TX-H2X-HDMI": {
    routedInputs: 1,
    routedOutputs: 1,
    physicalOutputs: 2,
    mirroredOutputs: 1,
    matrixSizeEvidence: "Source evidence: 1 routed HDBaseT output plus 1 mirrored HDMI output",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "TX-H2X-OM3": {
    routedInputs: 1,
    routedOutputs: 1,
    physicalOutputs: 2,
    mirroredOutputs: 1,
    matrixSizeEvidence: "Source evidence: 1 routed fibre output plus 1 mirrored HDMI output",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "MX-0808-KIT-V2": {
    routedInputs: 8,
    routedOutputs: 8,
    mirroredOutputs: 4,
    matrixSizeEvidence: "Title evidence: 8x8 HDBaseT matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "verify-before-quote"
  },
  "AT-OME-MS52W": {
    routedInputs: 5,
    routedOutputs: 2,
    physicalOutputs: 3,
    mirroredOutputs: 1,
    matrixSizeEvidence: "Title evidence: 5x2 Matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "AT-OME-SW32": {
    routedInputs: 3,
    routedOutputs: 2,
    matrixSizeEvidence: "Summary evidence: 3-input matrix switcher with dual HDMI outputs",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "DM-MD8X8": {
    routedInputs: 8,
    routedOutputs: 8,
    matrixSizeEvidence: "SKU evidence: DM-MD8X8",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "DA2-HDMI": {
    routedInputs: 1,
    routedOutputs: 2,
    physicalOutputs: 2,
    mirroredOutputs: 2,
    matrixSizeEvidence: "Title evidence: HDMI distribution amplifier feeding two displays",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "HD-DA2-4KZ-E": {
    routedInputs: 1,
    routedOutputs: 2,
    physicalOutputs: 2,
    mirroredOutputs: 2,
    matrixSizeEvidence: "Title evidence: 1x2 HDMI Distribution Amplifier",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "UCX-2X1-HC30": {
    routedInputs: 2,
    routedOutputs: 1,
    matrixSizeEvidence: "Title evidence: 2x1 switcher",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "UCX-4X3-HCM40": {
    routedInputs: 4,
    routedOutputs: 3,
    matrixSizeEvidence: "SKU/summary evidence: UCX-4X3-HCM40 / 4x3 universal matrix switcher",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "UCX-4X2-HC60D": {
    routedInputs: 4,
    routedOutputs: 2,
    matrixSizeEvidence: "Title evidence: 4x2 switcher",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  },
  "VS-88H2A": {
    routedInputs: 8,
    routedOutputs: 8,
    matrixSizeEvidence: "Title evidence: 8x8 Matrix",
    ioEvidenceStatus: "derived",
    quoteSafety: "comparison-only-verify"
  }
};

const SKU_KEYS = [
  "sku",
  "SKU",
  "model",
  "modelNumber",
  "productSku",
  "partNumber",
  "part_number"
];

const NUMERIC_INPUT_FIELDS = [
  "inputs",
  "inputCount",
  "videoInputs",
  "matrixInputs"
];

const NUMERIC_OUTPUT_FIELDS = [
  "outputs",
  "outputCount",
  "videoOutputs",
  "matrixOutputs"
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normaliseSku(value) {
  return String(value ?? "").trim().toUpperCase();
}

function getSku(record) {
  for (const key of SKU_KEYS) {
    if (typeof record[key] !== "undefined") {
      const sku = normaliseSku(record[key]);
      if (sku.length > 0) {
        return sku;
      }
    }
  }

  return "";
}

function listJsonFiles(startDir) {
  const absoluteStart = path.join(ROOT, startDir);

  if (!fs.existsSync(absoluteStart)) {
    return [];
  }

  const files = [];

  function walk(folder) {
    const entries = fs.readdirSync(folder, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }

        walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!entry.name.toLowerCase().endsWith(".json")) {
        continue;
      }

      files.push(absolutePath);
    }
  }

  walk(absoluteStart);
  return files;
}

function walkJson(value, visitor, location = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      walkJson(value[index], visitor, location.concat(String(index)));
    }

    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  visitor(value, location);

  for (const key of Object.keys(value)) {
    walkJson(value[key], visitor, location.concat(key));
  }
}

function getNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function preservePhysicalCount(record, fieldName, routedValue, evidenceKey) {
  const currentValue = getNumber(record[fieldName]);

  if (currentValue === null) {
    return;
  }

  if (currentValue <= routedValue) {
    return;
  }

  if (typeof record[evidenceKey] === "undefined") {
    record[evidenceKey] = currentValue;
  }
}

function patchNumericField(record, fieldName, value) {
  const currentValue = getNumber(record[fieldName]);

  if (currentValue === null) {
    return false;
  }

  if (currentValue === value) {
    return false;
  }

  record[fieldName] = value;
  return true;
}

function applyOverride(record, sku, override) {
  const before = {};

  for (const key of [
    "inputs",
    "outputs",
    "inputCount",
    "outputCount",
    "videoInputs",
    "videoOutputs",
    "matrixInputs",
    "matrixOutputs",
    "routedInputs",
    "routedOutputs",
    "routedInputCount",
    "routedOutputCount",
    "physicalOutputs",
    "mirroredOutputs",
    "ioEvidenceStatus",
    "quoteSafety",
    "matrixSizeEvidence"
  ]) {
    if (typeof record[key] !== "undefined") {
      before[key] = record[key];
    }
  }

  preservePhysicalCount(record, "outputs", override.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "outputCount", override.routedOutputs, "physicalOutputCount");
  preservePhysicalCount(record, "videoOutputs", override.routedOutputs, "physicalVideoOutputCount");

  for (const fieldName of NUMERIC_INPUT_FIELDS) {
    patchNumericField(record, fieldName, override.routedInputs);
  }

  for (const fieldName of NUMERIC_OUTPUT_FIELDS) {
    patchNumericField(record, fieldName, override.routedOutputs);
  }

  record.routedInputs = override.routedInputs;
  record.routedOutputs = override.routedOutputs;
  record.routedInputCount = override.routedInputs;
  record.routedOutputCount = override.routedOutputs;
  record.matrixInputs = override.routedInputs;
  record.matrixOutputs = override.routedOutputs;
  record.matrixSize = `${override.routedInputs}x${override.routedOutputs}`;
  record.matrixSizeEvidence = override.matrixSizeEvidence;
  record.ioEvidenceStatus = override.ioEvidenceStatus;
  record.quoteSafety = override.quoteSafety;

  if (typeof override.physicalOutputs === "number") {
    record.physicalOutputs = override.physicalOutputs;
    record.physicalOutputCount = override.physicalOutputs;
  }

  if (typeof override.mirroredOutputs === "number") {
    record.mirroredOutputs = override.mirroredOutputs;
    record.mirroredOutputCount = override.mirroredOutputs;
  }

  const after = {};

  for (const key of [
    "inputs",
    "outputs",
    "inputCount",
    "outputCount",
    "videoInputs",
    "videoOutputs",
    "matrixInputs",
    "matrixOutputs",
    "routedInputs",
    "routedOutputs",
    "routedInputCount",
    "routedOutputCount",
    "physicalOutputs",
    "mirroredOutputs",
    "ioEvidenceStatus",
    "quoteSafety",
    "matrixSizeEvidence"
  ]) {
    if (typeof record[key] !== "undefined") {
      after[key] = record[key];
    }
  }

  return {
    sku,
    before,
    after
  };
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeJsonFile(filePath, data) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(filePath, text, "utf8");
}

function ensureReportDir() {
  if (fs.existsSync(REPORT_DIR)) {
    return;
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function run() {
  const jsonFiles = SEARCH_DIRS.flatMap(listJsonFiles);

  const report = {
    mode: APPLY ? "apply" : "check",
    generatedAt: new Date().toISOString(),
    filesScanned: jsonFiles.length,
    filesSkipped: 0,
    noOpMatches: 0,
    actualChanges: 0,
    filesChanged: 0,
    productsMatched: 0,
    recordsChanged: [],
    parseErrors: []
  };

  for (const filePath of jsonFiles) {
    if (shouldSkipJsonFile(filePath)) {
      report.filesSkipped += 1;
      continue;
    }
    let data = null;

    try {
      data = readJsonFile(filePath);
    } catch (error) {
      report.parseErrors.push({
        file: path.relative(ROOT, filePath),
        error: error instanceof Error ? error.message : String(error)
      });

      continue;
    }

    const changes = [];

    walkJson(data, (record, location) => {
      const sku = getSku(record);

      if (!sku) {
        return;
      }

      const override = ROUTED_IO_OVERRIDES[sku];

      if (!override) {
        return;
      }

      report.productsMatched += 1;

      const result = applyOverride(record, sku, override);

      changes.push({
        file: path.relative(ROOT, filePath),
        location: location.join("."),
        ...result
      });
    });

    if (changes.length === 0) {
      continue;
    }

    const actualChanges = changes.filter((change) => JSON.stringify(change.before) !== JSON.stringify(change.after));
const noOpMatches = changes.length - actualChanges.length;

report.noOpMatches += noOpMatches;
report.actualChanges += actualChanges.length;
report.recordsChanged.push(...actualChanges);

    if (!APPLY) {
      continue;
    }

    writeJsonFile(filePath, data);
    report.filesChanged += 1;
  }

  ensureReportDir();

  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = [
    "# Routed I/O Repair Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    `Files scanned: ${report.filesScanned}`,
    `Files changed: ${report.filesChanged}`,
    `Products matched: ${report.productsMatched}`,
    `Actual changes: ${report.actualChanges}`,
    `No-op matches: ${report.noOpMatches}`,
    `Records reported: ${report.recordsChanged.length}`,
    `Files skipped: ${report.filesSkipped}`,
    `Parse errors: ${report.parseErrors.length}`,
    "",
    "## Records changed",
    "",
    "| SKU | File | Location | Routed I/O | Evidence |",
    "|---|---|---|---:|---|",
    ...report.recordsChanged.map((item) => {
      const after = item.after ?? {};
      const routed = `${after.routedInputs ?? "?"}x${after.routedOutputs ?? "?"}`;
      const evidence = String(after.matrixSizeEvidence ?? "").replaceAll("|", "/");
      return `| ${item.sku} | ${item.file} | ${item.location} | ${routed} | ${evidence} |`;
    }),
    "",
    "## Parse errors",
    "",
    ...report.parseErrors.map((item) => `- ${item.file}: ${item.error}`)
  ].join("\n");

  fs.writeFileSync(REPORT_MD, `${md}\n`, "utf8");

  console.log("");
  console.log("Routed I/O repair complete.");
  console.log(`Mode: ${report.mode}`);
  console.log(`Files scanned: ${report.filesScanned}`);
  console.log(`Files changed: ${report.filesChanged}`);
  console.log(`Products matched: ${report.productsMatched}`);
  console.log(`Actual changes: ${report.actualChanges}`);
  console.log(`No-op matches: ${report.noOpMatches}`);
  console.log(`Records reported: ${report.recordsChanged.length}`);
  console.log(`Files skipped: ${report.filesSkipped}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_MD)}`);
  console.log("");

  if (report.parseErrors.length > 0) {
    console.log("Some JSON files could not be parsed. See report for details.");
  }

  if (!APPLY && report.actualChanges > 0) {
    console.log("Run npm run wm:repair-routed-io to apply the routed I/O repair set.");
    process.exitCode = 1;
  }
}

run();
