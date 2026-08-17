/**
 * Routed I/O evidence gate (check-only).
 *
 * Validates that every scanned JSON record whose SKU has a routed-I/O
 * authority entry (data/governance/routed-io-evidence.json) carries exactly
 * the evidence the authority defines - routed counts, matrix size, evidence
 * strings, quote safety. The generators emit this evidence by construction
 * (tools/build-product-data-sources.mjs applies the authority to the canonical
 * store, competitor catalog and public index; the server seed carries it into
 * the runtime state), so this tool NEVER writes: a mismatch means a
 * regeneration dropped or drifted the evidence, and the fix is to regenerate,
 * not to patch files in place.
 *
 * Formerly "repair" (with an --apply write path); the apply path was removed
 * when the evidence became first-class data.
 */

import fs from "node:fs";
import path from "node:path";
import {
  evidenceMismatches,
  loadRoutedIoEvidence,
} from "./lib/routed-io-evidence.mjs";

const ROOT = process.cwd();

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

const SKU_KEYS = [
  "sku",
  "SKU",
  "model",
  "modelNumber",
  "productSku",
  "partNumber",
  "part_number"
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

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function run() {
  const evidence = loadRoutedIoEvidence();
  const jsonFiles = SEARCH_DIRS.flatMap(listJsonFiles);

  const report = {
    mode: "check",
    generatedAt: new Date().toISOString(),
    evidenceFile: path.relative(ROOT, path.join(ROOT, "data", "governance", "routed-io-evidence.json")),
    filesScanned: jsonFiles.length,
    filesSkipped: 0,
    productsMatched: 0,
    mismatchedRecords: [],
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

    walkJson(data, (record, location) => {
      const sku = getSku(record);

      if (!sku) {
        return;
      }

      const entry = evidence[sku];

      if (!entry) {
        return;
      }

      report.productsMatched += 1;

      const mismatches = evidenceMismatches(record, entry);

      if (mismatches.length === 0) {
        return;
      }

      report.mismatchedRecords.push({
        sku,
        file: path.relative(ROOT, filePath),
        location: location.join("."),
        mismatches
      });
    });
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = [
    "# Routed I/O Evidence Gate Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    `Evidence authority: ${report.evidenceFile}`,
    `Files scanned: ${report.filesScanned}`,
    `Files skipped: ${report.filesSkipped}`,
    `Products matched: ${report.productsMatched}`,
    `Records with mismatches: ${report.mismatchedRecords.length}`,
    `Parse errors: ${report.parseErrors.length}`,
    "",
    "## Records with mismatches",
    "",
    ...(report.mismatchedRecords.length === 0
      ? ["(none)"]
      : report.mismatchedRecords.map((item) => {
          const detail = item.mismatches
            .map((m) => `${m.key}: record=${JSON.stringify(m.actual)} expected=${JSON.stringify(m.expected)}`)
            .join("; ");
          return `| ${item.sku} | ${item.file} | ${item.location} | ${detail} |`;
        })),
    "",
    "## Parse errors",
    "",
    ...(report.parseErrors.length === 0
      ? ["(none)"]
      : report.parseErrors.map((item) => `- ${item.file}: ${item.error}`))
  ].join("\n");

  fs.writeFileSync(REPORT_MD, `${md}\n`, "utf8");

  console.log("");
  console.log("Routed I/O evidence gate complete.");
  console.log(`Files scanned: ${report.filesScanned}`);
  console.log(`Products matched: ${report.productsMatched}`);
  console.log(`Records with mismatches: ${report.mismatchedRecords.length}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_MD)}`);
  console.log("");

  if (report.parseErrors.length > 0) {
    console.log("Some JSON files could not be parsed. See report for details.");
  }

  if (report.mismatchedRecords.length > 0 || report.parseErrors.length > 0) {
    console.log("Evidence mismatch: a scanned record drifted from the authority.");
    console.log("Regenerate the emitted data: npm run data:canonical-products && npm run data:product-intelligence-index");
    console.log("(the evidence is emitted by construction; patching files by hand will be overwritten).");
    process.exitCode = 1;
  }
}

run();
