import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "reports");

mkdirSync(reportDir, { recursive: true });

const ignoredDirs = new Set([".git", "node_modules", "dist", "build", ".vite", ".cache", "coverage", "archive", "reports"]);
const dataExtensions = new Set([".json", ".jsonl", ".csv", ".tsv", ".xlsx", ".xls", ".md"]);

const protectedExactPaths = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.typecheck.json",
  "vite.config.ts",
  "vite.config.js",
  "postcss.config.json",
  "postcss.config.js",
  "tailwind.config.js",
  "README.md",
  "docs/wingman-sales-copy-style.md",
  "public/template-photos/README.md",
  "public/product-intelligence-index.json",
  "public/wyrestorm-product-update-check.json",
  "src/wingman2/styles/CSS_MIGRATION_REGISTER.md",
  "src/wingman2/styles/legacy-overrides/README.md",
]);

const protectedPrefixes = [
  "src/",
  "tools/",
  "data/backend/",
  "docs/",
  "public/",
];

const generatedPathMarkers = [
  "public/product-intelligence-index.json",
  "reports/",
  "dist/",
];

const staleNameMarkers = [
  ".bak",
  "backup",
  "backups/",
  "old",
  "legacy",
  "deprecated",
  "copy",
  "sample",
  "scratch",
  "temp",
  "tmp",
];

const archiveAllowedPrefixes = [
  "backups/",
  "exports/",
];

function normalisePath(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function isProtectedPath(relativePath) {
  if (protectedExactPaths.has(relativePath)) return true;

  if (protectedPrefixes.some((prefix) => relativePath.startsWith(prefix))) {
    return true;
  }

  return false;
}

function isArchiveAllowedPath(relativePath) {
  return archiveAllowedPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function walk(dir, output = []) {
  if (!existsSync(dir)) return output;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(full, output);
      continue;
    }

    if (dataExtensions.has(path.extname(entry.name).toLowerCase())) {
      output.push(full);
    }
  }

  return output;
}

function sha1(file) {
  return crypto.createHash("sha1").update(readFileSync(file)).digest("hex");
}

function readText(file) {
  try {
    return readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
}

function tryJson(file) {
  if (path.extname(file).toLowerCase() !== ".json") return null;

  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
}

function arrayify(value) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    for (const key of ["products", "items", "entries", "records", "index", "data"]) {
      if (Array.isArray(value[key])) return value[key];
    }

    const values = Object.values(value).filter((item) => item && typeof item === "object");
    if (values.length > 3) return values;
  }

  return [];
}

function skuOf(item) {
  if (!item || typeof item !== "object") return "";
  return String(item.sku || item.model || item.partNumber || item.id || item.code || "").trim();
}

function titleOf(item) {
  if (!item || typeof item !== "object") return "";
  return String(item.title || item.name || item.description || "").trim();
}

function classifyFile(relativePath, text, json, itemCount) {
  const lower = relativePath.toLowerCase();
  const classifications = [];

  if (generatedPathMarkers.some((marker) => lower.includes(marker))) classifications.push("generated-output");
  if (staleNameMarkers.some((marker) => lower.includes(marker))) classifications.push("stale-name-marker");
  if (lower.includes("product") || lower.includes("sku") || lower.includes("intelligence")) classifications.push("product-data-candidate");
  if (lower.includes("competitor")) classifications.push("competitor-data-candidate");
  if (lower.includes("room") || lower.includes("template")) classifications.push("template-data-candidate");
  if (lower.includes("route") || lower.includes("manifest")) classifications.push("manifest-data-candidate");
  if (json && itemCount > 0) classifications.push("structured-json");
  if (/NHD-|MX-|SW-|EX-|APO-|CAM-/.test(text)) classifications.push("contains-wyrestorm-skus");
  if (/Crestron|Extron|AMX|Kramer|Atlona|Blustream|ZeeVee|Barco|Lightware/i.test(text)) classifications.push("contains-competitor-terms");
  if (isProtectedPath(relativePath)) classifications.push("protected-path");
  if (isArchiveAllowedPath(relativePath)) classifications.push("archive-allowed-path");

  return Array.from(new Set(classifications));
}

function sourceReferences() {
  const sourceFiles = walk(path.join(root, "src")).concat(walk(path.join(root, "tools")));
  const texts = [];

  for (const file of sourceFiles) {
    const ext = path.extname(file).toLowerCase();

    if ([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"].includes(ext)) {
      texts.push(readText(file));
    }
  }

  const packageJson = path.join(root, "package.json");
  if (existsSync(packageJson)) texts.push(readText(packageJson));

  return texts.join("\n");
}

const allRefs = sourceReferences();
const files = walk(root);
const records = [];
const skuLocations = new Map();

for (const file of files) {
  const relativePath = normalisePath(file);
  const stats = statSync(file);
  const text = readText(file);
  const json = tryJson(file);
  const items = arrayify(json);
  const skus = [];

  for (const item of items) {
    const sku = skuOf(item);
    if (!sku) continue;

    skus.push({ sku, title: titleOf(item) });

    const key = sku.toUpperCase();
    if (!skuLocations.has(key)) skuLocations.set(key, []);
    skuLocations.get(key).push(relativePath);
  }

  const referenced =
    allRefs.includes(relativePath) ||
    allRefs.includes("./" + relativePath) ||
    allRefs.includes(relativePath.replace(/^public\//, "/"));

  const classifications = classifyFile(relativePath, text, json, items.length);

  records.push({
    path: relativePath,
    ext: path.extname(file).toLowerCase(),
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    hash: sha1(file),
    referenced,
    protected: isProtectedPath(relativePath),
    archiveAllowedPath: isArchiveAllowedPath(relativePath),
    classifications,
    itemCount: items.length,
    skuCount: skus.length,
    sampleSkus: skus.slice(0, 8),
  });
}

const duplicateSkus = [];

for (const [sku, locations] of skuLocations.entries()) {
  const uniqueLocations = Array.from(new Set(locations));

  if (uniqueLocations.length > 1) {
    duplicateSkus.push({ sku, locations: uniqueLocations });
  }
}

const duplicateFilesByHash = Object.values(records.reduce((acc, record) => {
  acc[record.hash] = acc[record.hash] || [];
  acc[record.hash].push(record.path);
  return acc;
}, {})).filter((paths) => paths.length > 1);

const canonicalCandidates = records.filter((record) =>
  record.referenced &&
  record.classifications.includes("structured-json") &&
  (
    record.classifications.includes("product-data-candidate") ||
    record.classifications.includes("competitor-data-candidate") ||
    record.classifications.includes("manifest-data-candidate") ||
    record.classifications.includes("template-data-candidate")
  )
);

const protectedCandidates = records.filter((record) =>
  record.protected &&
  (
    record.classifications.includes("structured-json") ||
    record.classifications.includes("product-data-candidate") ||
    record.classifications.includes("competitor-data-candidate") ||
    record.classifications.includes("manifest-data-candidate") ||
    record.classifications.includes("template-data-candidate")
  )
);

const archiveCandidates = records.filter((record) => {
  if (record.protected) return false;
  if (record.referenced) return false;
  if (record.classifications.includes("generated-output")) return false;
  if (!record.archiveAllowedPath) return false;

  return (
    record.classifications.includes("stale-name-marker") ||
    duplicateFilesByHash.some((group) => group.includes(record.path))
  );
});

const likelyDangerousUnreferenced = records.filter((record) => {
  if (record.referenced) return false;
  if (record.classifications.includes("generated-output")) return false;
  if (archiveCandidates.some((candidate) => candidate.path === record.path)) return false;

  return (
    record.protected ||
    (
      record.classifications.includes("structured-json") &&
      (
        record.classifications.includes("product-data-candidate") ||
        record.classifications.includes("competitor-data-candidate") ||
        record.classifications.includes("manifest-data-candidate")
      )
    )
  );
});

const summary = {
  generatedAt: new Date().toISOString(),
  totalDataFiles: records.length,
  canonicalCandidateCount: canonicalCandidates.length,
  protectedCandidateCount: protectedCandidates.length,
  archiveCandidateCount: archiveCandidates.length,
  likelyDangerousUnreferencedCount: likelyDangerousUnreferenced.length,
  duplicateSkuCount: duplicateSkus.length,
  duplicateFileGroupCount: duplicateFilesByHash.length,
  records,
  canonicalCandidates,
  protectedCandidates,
  archiveCandidates,
  likelyDangerousUnreferenced,
  duplicateSkus,
  duplicateFilesByHash,
};

writeFileSync(path.join(reportDir, "wingman-data-source-audit.json"), JSON.stringify(summary, null, 2), "utf8");

const md = [
  "# Wingman Data Source Audit",
  "",
  "Generated: " + summary.generatedAt,
  "",
  "## Summary",
  "",
  "- Total data-like files scanned: " + summary.totalDataFiles,
  "- Canonical referenced candidates: " + summary.canonicalCandidateCount,
  "- Protected candidates: " + summary.protectedCandidateCount,
  "- Safe archive candidates: " + summary.archiveCandidateCount,
  "- Unreferenced but potentially important data files: " + summary.likelyDangerousUnreferencedCount,
  "- Duplicate SKU definitions: " + summary.duplicateSkuCount,
  "- Duplicate file-content groups: " + summary.duplicateFileGroupCount,
  "",
  "## Canonical referenced candidates",
  "",
  ...(canonicalCandidates.length ? canonicalCandidates.map((item) => "- " + item.path + " | items=" + item.itemCount + " | skus=" + item.skuCount + " | " + item.classifications.join(", ")) : ["No canonical candidates detected."]),
  "",
  "## Protected candidates",
  "",
  ...(protectedCandidates.length ? protectedCandidates.map((item) => "- " + item.path + " | " + item.classifications.join(", ")) : ["No protected candidates detected."]),
  "",
  "## Safe archive candidates",
  "",
  ...(archiveCandidates.length ? archiveCandidates.map((item) => "- " + item.path + " | " + item.classifications.join(", ")) : ["No safe archive candidates detected."]),
  "",
  "## Unreferenced but potentially important data files",
  "",
  ...(likelyDangerousUnreferenced.length ? likelyDangerousUnreferenced.map((item) => "- " + item.path + " | items=" + item.itemCount + " | skus=" + item.skuCount + " | " + item.classifications.join(", ")) : ["None detected."]),
  "",
  "## Duplicate SKUs",
  "",
  ...(duplicateSkus.length ? duplicateSkus.slice(0, 80).map((item) => "- " + item.sku + " -> " + item.locations.join(" | ")) : ["No duplicate SKU definitions detected across parsed JSON records."]),
  "",
  "## Duplicate file-content groups",
  "",
  ...(duplicateFilesByHash.length ? duplicateFilesByHash.map((group) => "- " + group.join(" | ")) : ["No duplicate file-content groups detected."]),
  "",
  "## Archive policy",
  "",
  "- Protected paths are never moved automatically.",
  "- Only unreferenced files under backups/ or exports/ are eligible for automatic archive movement.",
  "- Root config files, public files, source files, docs and data/backend files are protected.",
  "- Generated files such as public/product-intelligence-index.json are build outputs, not source-of-truth data.",
  "- After any archive apply, run npm run typecheck, npm run build and npm run verify.",
  "",
].join("\n");

writeFileSync(path.join(reportDir, "wingman-data-source-audit.md"), md, "utf8");

console.log("");
console.log("[data-source-audit] Wrote reports/wingman-data-source-audit.md");
console.log("[data-source-audit] Wrote reports/wingman-data-source-audit.json");
console.log("");
console.log("Total data-like files scanned:          " + summary.totalDataFiles);
console.log("Canonical referenced candidates:        " + summary.canonicalCandidateCount);
console.log("Protected candidates:                   " + summary.protectedCandidateCount);
console.log("Safe archive candidates:                " + summary.archiveCandidateCount);
console.log("Unreferenced important-looking files:   " + summary.likelyDangerousUnreferencedCount);
console.log("Duplicate SKU definitions:              " + summary.duplicateSkuCount);
console.log("Duplicate file-content groups:          " + summary.duplicateFileGroupCount);
