import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const write = process.argv.includes("--write");
const full = process.argv.includes("--full") || process.argv.includes("--scope=full");

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".vite",
  ".turbo",
  "out",
  "_review",
]);

const ACTIVE_EXCLUDED_DIRS = new Set([
  ".claude",
  "archive",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".csv", ".md", ".txt", ".html", ".css",
  ".yml", ".yaml",
]);

const ACTIVE_ALLOWED = [
  /^src\//i,
  /^tools\//i,
  /^docs\//i,
  /^data-sources\//i,
  /^public\/product-call-card-products\.json$/i,
  /^package\.json$/i,
  /^README\.md$/i,
];

const HIGH_RISK_GENERATED = [
  /^public\/product-call-card-.*audit\.json$/i,
  /^public\/product-intelligence-index\.json$/i,
  /^public\/product-media-index\.json$/i,
  /^data\/backend\//i,
  /^data\/catalog\/.*generated\.json$/i,
  /^data\/catalog\/.*phase\d+\.json$/i,
];

const suspectPatterns = [
  { name: "replacement-character", regex: /�/g },
  { name: "double-encoded-mojibake", regex: /Ãƒ|Ã‚|Ã¢/g },
  { name: "utf8-mojibake", regex: /Ã|Â|â€|â€“|â€”|â€¦|â„¢|â€˜|â€™|â€œ|â€�/g },
  { name: "control-character", regex: /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g },
];

const encodingRepairs = [
  [/ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â/g, "×"],
  [/ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·/g, "·"],
  [/Ã‚Â·/g, "·"],
  [/Ã¢â‚¬â€/g, "—"],
  [/Ã¢â‚¬â€œ/g, "–"],
  [/Ã¢â‚¬Ëœ/g, "‘"],
  [/Ã¢â‚¬â„¢/g, "’"],
  [/Ã¢â‚¬Å“/g, "“"],
  [/Ã¢â‚¬Â/g, "”"],
  [/Ã¢â‚¬Â¦/g, "…"],
  [/â€™/g, "’"],
  [/â€˜/g, "‘"],
  [/â€œ/g, "“"],
  [/â€�/g, "”"],
  [/â€“/g, "–"],
  [/â€”/g, "—"],
  [/â€¦/g, "…"],
  [/Â£/g, "£"],
  [/Â®/g, "®"],
  [/Â©/g, "©"],
  [/Â°/g, "°"],
  [/Â±/g, "±"],
  [/Â·/g, "·"],
  [/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ""],
];

function relative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function shouldSkipRelative(rel) {
  // This tool intentionally contains mojibake examples in regex checks.
  if (rel === "tools/audit-text-hygiene.mjs") {
    return true;
  }
  if (full) return false;

  if (!ACTIVE_ALLOWED.some((pattern) => pattern.test(rel))) {
    return true;
  }

  if (HIGH_RISK_GENERATED.some((pattern) => pattern.test(rel))) {
    return true;
  }

  return false;
}

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const rel = relative(fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (!full && ACTIVE_EXCLUDED_DIRS.has(entry.name)) continue;
      walk(fullPath, output);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!isTextFile(fullPath)) continue;
    if (shouldSkipRelative(rel)) continue;

    output.push(fullPath);
  }

  return output;
}

function hasSuspectEncoding(text) {
  return suspectPatterns.some((pattern) => {
    pattern.regex.lastIndex = 0;
    return pattern.regex.test(text);
  });
}

function repairEncodingOnly(value) {
  let text = String(value ?? "");

  for (let i = 0; i < 4; i += 1) {
    const before = text;

    for (const [pattern, replacement] of encodingRepairs) {
      text = text.replace(pattern, replacement);
    }

    if (text === before) break;
  }

  return text;
}

const files = walk(repoRoot);
const findings = [];
let changedCount = 0;

for (const file of files) {
  const rel = relative(file);
  const original = fs.readFileSync(file, "utf8");

  if (!hasSuspectEncoding(original)) {
    continue;
  }

  const fileFindings = [];

  for (const pattern of suspectPatterns) {
    pattern.regex.lastIndex = 0;
    const matches = [...original.matchAll(pattern.regex)];
    if (matches.length) {
      fileFindings.push(`${pattern.name}:${matches.length}`);
    }
  }

  const next = repairEncodingOnly(original);
  const wouldChange = next !== original;

  if (fileFindings.length) {
    findings.push(`${rel} :: ${fileFindings.join(", ")}${wouldChange ? "" : " :: manual review"}`);
  }

  if (wouldChange) {
    changedCount += 1;
    if (write) {
      fs.writeFileSync(file, next, "utf8");
    }
  }
}

fs.mkdirSync(path.join(repoRoot, "docs"), { recursive: true });

fs.writeFileSync(
  path.join(repoRoot, "docs", "text-hygiene-report.md"),
  [
    "# Text hygiene report",
    "",
    `Mode: ${write ? "write" : "check"}`,
    `Scope: ${full ? "full" : "active"}`,
    `Files scanned: ${files.length}`,
    `Suspect files: ${findings.length}`,
    `Files ${write ? "changed" : "that would change"}: ${changedCount}`,
    "",
    "## Suspect files",
    "",
    findings.length ? findings.map((line) => `- ${line}`).join("\n") : "_None._",
    "",
    "## Scope note",
    "",
    full
      ? "Full scope includes archives and broad generated data. Use only for deliberate audit work."
      : "Active scope excludes `.claude/`, `archive/`, `_review/` and high-risk generated data by default.",
    "",
    "## Rule",
    "",
    "This tool only checks encoding corruption. It does not perform broad language, spelling, product-name or style rewrites.",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`[text-hygiene] Scope: ${full ? "full" : "active"}`);
console.log(`[text-hygiene] Scanned ${files.length} text files`);
console.log(`[text-hygiene] Suspect files ${findings.length}`);
console.log(`[text-hygiene] ${write ? "Changed" : "Would change"} ${changedCount} files`);
console.log("[text-hygiene] Report written to docs/text-hygiene-report.md");

if (!write && findings.length) {
  process.exitCode = 1;
}

