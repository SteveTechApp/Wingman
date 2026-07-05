import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const excludedDirs = new Set([
  ".git",
  ".claude",
  "archive",
  "_review",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".vite",
  ".turbo",
]);

const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".txt",
  ".csv",
  ".html",
  ".css",
  ".yml",
  ".yaml",
]);

const activeRoots = [
  "src/",
  "tools/",
  "docs/",
  "data-sources/",
  "public/product-call-card-products.json",
  "package.json",
  "README.md",
];

const highRiskGenerated = [
  /^public\/product-call-card-.*audit\.json$/i,
  /^public\/product-intelligence-index\.json$/i,
  /^public\/product-media-index\.json$/i,
  /^data\/backend\//i,
  /^data\/catalog\/.*generated\.json$/i,
  /^data\/catalog\/.*phase\d+\.json$/i,
];

function normalisePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function shouldScan(rel) {
  if (!activeRoots.some((root) => rel === root || rel.startsWith(root))) {
    return false;
  }

  if (highRiskGenerated.some((pattern) => pattern.test(rel))) {
    return false;
  }

  return true;
}

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const rel = normalisePath(fullPath);

    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue;
      walk(fullPath, output);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    if (!shouldScan(rel)) continue;

    output.push(fullPath);
  }

  return output;
}

/*
  Use escaped Unicode code-points instead of literal mojibake examples so this
  checker does not contaminate the repo with the same text it is looking for.
*/
const mojibakeMarkerPattern = /[\u00c2\u00c3\u00c6\u0192\u00e2\u20ac\u201c\u201d\u00a2]/u;
const replacementCharacterPattern = /\uFFFD/u;

const files = walk(repoRoot);
const warnings = [];

for (const file of files) {
  const rel = normalisePath(file);

  if (rel === "tools/check-compare-source-repair.mjs") {
    continue;
  }

  const source = fs.readFileSync(file, "utf8");

  if (replacementCharacterPattern.test(source) || mojibakeMarkerPattern.test(source)) {
    warnings.push(rel);
  }
}

if (warnings.length) {
  console.warn("[compare-source-repair] Mojibake markers remain in active source files:");
  for (const rel of warnings) {
    console.warn(`- ${rel}`);
  }
  console.warn("[compare-source-repair] This is advisory only; visible UI text should be reviewed.");
} else {
  console.log("[compare-source-repair] No mojibake markers found in active source files.");
}
