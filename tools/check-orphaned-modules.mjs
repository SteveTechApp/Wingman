import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

// Guards against the exact failure mode found in a 2026-07-04 audit: 25 files
// (compareRuntimePipeline.ts, compareEngineScoring.ts, wyrestormCompareShortlist.ts,
// and ~22 more) had zero path back to any routed page, yet carried passing
// tests and dedicated tools/check-*.mjs guards — giving false confidence that
// the logic ran in production when it never did. A simple "does anything
// import this file" check isn't enough: those files imported EACH OTHER in a
// closed, dead subgraph, and their own .test.ts files counted as "importers"
// under a naive check. This script instead does real reachability: it walks
// the `import ... from` graph outward from main.tsx and every page component,
// resolves relative specifiers to actual files, and flags any
// src/wingman2/lib or src/wingman2/data module that reachability never
// touches. Test files are never traversed (they aren't how the app runs), so
// a module "only imported by its own test" is correctly still an orphan.

const root = process.cwd();
const SRC = path.resolve(root, "src");
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const IMPORT_LINE = /^\s*(?:import|export)\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|[^"';]+from\s+)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /import\(\s*["']([^"']+)["']\s*\)/g;

// Files legitimately loaded outside the static import graph this script can
// trace (e.g. behind a dynamic import(), or referenced only from a build
// tool/CI script rather than another src/ file). Keep this list short and
// explain each entry — it should shrink over time, not grow.
const KNOWN_DYNAMIC_ALLOWLIST = new Set([]);

function isTestFile(filePath) {
  return /\.test\.tsx?$/.test(filePath);
}

function listFilesRecursive(startDir) {
  const results = [];
  const stack = [startDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!existsSync(current)) continue;
    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null; // package import, not part of our graph

  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    ...SOURCE_EXTENSIONS.map((ext) => base + ext),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(base, "index" + ext)),
  ];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function importsOf(filePath) {
  const source = readFileSync(filePath, "utf8");
  const specifiers = new Set();
  let match;

  IMPORT_LINE.lastIndex = 0;
  while ((match = IMPORT_LINE.exec(source)) !== null) specifiers.add(match[1]);

  DYNAMIC_IMPORT.lastIndex = 0;
  while ((match = DYNAMIC_IMPORT.exec(source)) !== null) specifiers.add(match[1]);

  const resolved = [];
  for (const specifier of specifiers) {
    const target = resolveSpecifier(filePath, specifier);
    if (target) resolved.push(target);
  }
  return resolved;
}

const allSourceFiles = listFilesRecursive(SRC).filter((f) => !isTestFile(f));

const entryPoints = [
  path.join(SRC, "main.tsx"),
  ...listFilesRecursive(path.join(SRC, "wingman2", "pages")).filter((f) => !isTestFile(f)),
].filter((f) => existsSync(f));

const reachable = new Set();
const stack = [...entryPoints];

while (stack.length > 0) {
  const current = stack.pop();
  if (reachable.has(current)) continue;
  reachable.add(current);

  for (const target of importsOf(current)) {
    if (!reachable.has(target)) stack.push(target);
  }
}

const SCAN_DIRS = [path.join(SRC, "wingman2", "lib"), path.join(SRC, "wingman2", "data")];
const candidates = allSourceFiles.filter((f) => SCAN_DIRS.some((dir) => f.startsWith(dir + path.sep)));

const orphans = candidates.filter((f) => !reachable.has(f) && !KNOWN_DYNAMIC_ALLOWLIST.has(path.relative(root, f).replace(/\\/g, "/")));

if (orphans.length > 0) {
  console.error(`[orphaned-modules] The following ${orphans.length} module(s) under src/wingman2/lib or src/wingman2/data are unreachable from main.tsx or any page component:`);
  for (const orphan of orphans.sort()) {
    console.error("  - " + path.relative(root, orphan).replace(/\\/g, "/"));
  }
  console.error("");
  console.error("If this code genuinely isn't used by any live page, delete it (and its test) rather than leaving it to accumulate false confidence.");
  console.error("If it's a real false positive (e.g. loaded dynamically in a form this script doesn't recognise, or intentionally kept for another tool's guard), add its repo-relative path to KNOWN_DYNAMIC_ALLOWLIST at the top of this file with a one-line reason — don't just delete the check.");
  process.exit(1);
}

console.log(`[orphaned-modules] Checked ${candidates.length} modules under src/wingman2/lib and src/wingman2/data — all reachable from main.tsx or a page component.`);
