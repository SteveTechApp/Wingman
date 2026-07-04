import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();

function read(relPath) {
  const full = path.join(repo, relPath);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8");
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function resolveImport(fromRel, importPath) {
  if (!importPath.startsWith(".")) return "";

  const fromDir = path.dirname(path.join(repo, fromRel));
  const base = path.resolve(fromDir, importPath);

  const attempts = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ];

  const found = attempts.find((file) => fs.existsSync(file));
  return found ? path.relative(repo, found).replaceAll("\\", "/") : "";
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (!["node_modules", "dist", ".git", "build"].includes(item.name)) {
        files.push(...walk(full));
      }
      continue;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(item.name)) {
      files.push(full);
    }
  }

  return files;
}

console.log("");
console.log("== WINGMAN ROUTE REGISTRY DIRECT AUDIT ==");
console.log("");

const routesRel = "src/wingman2/app/routes.tsx";
const catalogRel = "src/wingman2/app/routeCatalog.ts";
const routesText = read(routesRel);
const catalogText = read(catalogRel);

if (!routesText) {
  console.log(`Missing: ${routesRel}`);
  process.exit(1);
}

console.log("== routes.tsx lazy imports ==");
const routeImports = [];

for (const match of routesText.matchAll(/([A-Za-z0-9_]+)\s*:\s*lazy\s*\([\s\S]*?import\s*\(\s*["']([^"']+)["']\s*\)[\s\S]*?\)/g)) {
  const key = match[1];
  const source = match[2];
  const line = lineNumber(routesText, match.index ?? 0);
  const resolved = resolveImport(routesRel, source);

  routeImports.push({ key, source, line, resolved });
  console.log(`${key.padEnd(24)} line ${String(line).padStart(3)}  ${source}  =>  ${resolved || "UNRESOLVED"}`);
}

if (!routeImports.length) {
  console.log("No lazy route imports found. routes.tsx may use a different pattern.");
}

console.log("");
console.log("== routeCatalog.ts /wingman paths ==");
const catalogPaths = [];

for (const match of catalogText.matchAll(/([A-Za-z0-9_]+)\s*:\s*["'](\/wingman[^"']*)["']/g)) {
  const key = match[1];
  const routePath = match[2];
  const line = lineNumber(catalogText, match.index ?? 0);

  catalogPaths.push({ key, routePath, line });
  console.log(`${key.padEnd(24)} line ${String(line).padStart(3)}  ${routePath}`);
}

console.log("");
console.log("== page files imported by routes.tsx ==");
for (const item of routeImports) {
  const status = item.resolved && fs.existsSync(path.join(repo, item.resolved)) ? "OK" : "MISSING";
  console.log(`${status.padEnd(8)} ${item.key.padEnd(24)} ${item.resolved || item.source}`);
}

console.log("");
console.log("== Product Call Cards ownership ==");
const canonicalProductCallCardsFile = "src/wingman2/pages/ProductCallCardsPage.tsx";
const legacyProductCallCardsDirectory = "src/wingman2/pages/productCallCards";
const canonicalExists = fs.existsSync(path.join(repo, canonicalProductCallCardsFile));
const legacyDirectoryPath = path.join(repo, legacyProductCallCardsDirectory);
const legacyExists = fs.existsSync(legacyDirectoryPath) && walk(legacyDirectoryPath).length > 0;

console.log(`${canonicalExists ? "OK" : "MISSING"}  ${canonicalProductCallCardsFile}`);
console.log(`${legacyExists ? "STALE" : "OK"}  one routed implementation; no legacy multi-page duplicate`);

if (!canonicalExists || legacyExists) {
  process.exitCode = 1;
}

console.log("");
console.log("== files importing Product Call Cards files ==");
const allFiles = walk(path.join(repo, "src"));

for (const file of allFiles) {
  const text = fs.readFileSync(file, "utf8");
  const relFile = path.relative(repo, file).replaceAll("\\", "/");

  if (
    text.includes("ProductCallCardsPage")
  ) {
    console.log(relFile);
  }
}

console.log("");
console.log("== possible stale /wingman links ==");
const knownCatalogPaths = new Set(catalogPaths.map((item) => item.routePath.replace(/\/$/, "")));
knownCatalogPaths.add("/wingman");

const wingmanLinks = [];

for (const file of allFiles) {
  const text = fs.readFileSync(file, "utf8");
  const relFile = path.relative(repo, file).replaceAll("\\", "/");

  for (const match of text.matchAll(/["'](\/wingman[^"']*)["']/g)) {
    const routePath = match[1];
    const cleanPath = routePath.replace(/\/$/, "");

    if (
      routePath.includes(".json") ||
      routePath.includes("${") ||
      knownCatalogPaths.has(cleanPath)
    ) {
      continue;
    }

    wingmanLinks.push({
      file: relFile,
      line: lineNumber(text, match.index ?? 0),
      routePath,
    });
  }
}

if (!wingmanLinks.length) {
  console.log("No stale links found by this direct scan.");
}

for (const link of wingmanLinks) {
  console.log(`${link.file}:${link.line}  ${link.routePath}`);
}

console.log("");
console.log("== orphan ComparePage check ==");
const comparePath = "src/wingman2/pages/ComparePage.tsx";
const compareExists = fs.existsSync(path.join(repo, comparePath));

if (!compareExists) {
  console.log("ComparePage.tsx does not exist.");
} else {
  const importedBy = allFiles
    .filter((file) => {
      const text = fs.readFileSync(file, "utf8");
      return text.includes("ComparePage") || text.includes("./pages/ComparePage") || text.includes("./ComparePage");
    })
    .map((file) => path.relative(repo, file).replaceAll("\\", "/"));

  console.log(`${comparePath} exists`);
  console.log(`Imported by: ${importedBy.length ? importedBy.join(", ") : "nothing detected"}`);
}

console.log("");
console.log("Audit complete.");
