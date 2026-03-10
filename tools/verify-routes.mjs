import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_ROUTES = path.join(ROOT, "src", "AppRoutes.tsx");

function resolveModule(moduleId) {
  if (!moduleId.startsWith("@/")) return null;
  const base = path.join(ROOT, "src", moduleId.slice(2));
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read ${filePath}: ${error.message}`);
  }
}

function verifyRouteImports(source) {
  const lazyImportPattern = /React\.lazy\(\(\)\s*=>\s*import\("([^"]+)"\)\)/g;
  const imports = [];
  let match = lazyImportPattern.exec(source);
  while (match) {
    imports.push(match[1]);
    match = lazyImportPattern.exec(source);
  }

  if (imports.length === 0) {
    throw new Error("No lazy route imports found in src/AppRoutes.tsx.");
  }

  const unresolved = imports
    .map((moduleId) => ({ moduleId, resolved: resolveModule(moduleId) }))
    .filter((item) => item.resolved == null);

  if (unresolved.length > 0) {
    const missing = unresolved.map((item) => item.moduleId).join(", ");
    throw new Error(`Missing route module(s): ${missing}`);
  }

  return imports.length;
}

function verifyCriticalRoutes(source) {
  const requiredPaths = [
    'path="/"',
    'path="/app"',
    'path="dashboard"',
    'path="projects"',
    'path="tools"',
  ];

  const missing = requiredPaths.filter((needle) => !source.includes(needle));
  if (missing.length > 0) {
    throw new Error(`Critical route path(s) missing: ${missing.join(", ")}`);
  }
}

function main() {
  if (!fs.existsSync(APP_ROUTES)) {
    throw new Error("src/AppRoutes.tsx is missing.");
  }

  const source = readFile(APP_ROUTES);
  const lazyCount = verifyRouteImports(source);
  verifyCriticalRoutes(source);
  console.log(`Route integrity check passed (${lazyCount} files).`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
