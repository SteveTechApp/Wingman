import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const apply = process.argv.includes("--apply");
const auditPath = path.join(root, "reports/wingman-data-source-audit.json");

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
  "public/product-intelligence-index.json",
  "public/wyrestorm-product-update-check.json",
]);

const protectedPrefixes = [
  "src/",
  "tools/",
  "data/backend/",
  "docs/",
  "public/",
];

function isProtectedPath(relativePath) {
  if (protectedExactPaths.has(relativePath)) return true;
  return protectedPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function isArchiveAllowedPath(relativePath) {
  return relativePath.startsWith("backups/") || relativePath.startsWith("exports/");
}

if (!existsSync(auditPath)) {
  console.error("[archive-data] Missing reports/wingman-data-source-audit.json. Run npm run audit:data-sources first.");
  process.exit(1);
}

const audit = JSON.parse(readFileSync(auditPath, "utf8").replace(/^\uFEFF/, ""));
const candidates = audit.archiveCandidates || [];
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const archiveRoot = path.join(root, "archive", "data-sources", stamp);
const actions = [];
const rejected = [];

for (const candidate of candidates) {
  const relativePath = candidate.path;

  if (isProtectedPath(relativePath) || !isArchiveAllowedPath(relativePath)) {
    rejected.push({
      path: relativePath,
      reason: "Protected path or outside backups/exports allow-list.",
    });
    continue;
  }

  const from = path.join(root, relativePath);
  const to = path.join(archiveRoot, relativePath);

  if (!existsSync(from)) continue;

  actions.push({
    from: relativePath,
    to: path.relative(root, to).replace(/\\/g, "/"),
    classifications: candidate.classifications,
  });

  if (apply) {
    mkdirSync(path.dirname(to), { recursive: true });
    renameSync(from, to);
  }
}

mkdirSync(path.join(root, "reports"), { recursive: true });

writeFileSync(path.join(root, "reports", "wingman-data-archive-plan.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  mode: apply ? "apply" : "dry-run",
  archiveRoot: path.relative(root, archiveRoot).replace(/\\/g, "/"),
  actions,
  rejected,
}, null, 2), "utf8");

console.log("");
console.log("[archive-data] Mode: " + (apply ? "APPLY" : "DRY RUN"));
console.log("[archive-data] Candidate files accepted: " + actions.length);
console.log("[archive-data] Candidate files rejected: " + rejected.length);
console.log("[archive-data] Plan: reports/wingman-data-archive-plan.json");

for (const action of actions.slice(0, 50)) {
  console.log("- " + action.from + " -> " + action.to);
}

if (!apply) {
  console.log("");
  console.log("No files moved. Review reports/wingman-data-archive-plan.json before running npm run archive:data-sources:apply.");
}
