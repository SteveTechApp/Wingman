import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repo = process.cwd();
const srcDir = path.join(repo, "src");
const docsDir = path.join(repo, "docs");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const routeReportPath = path.join(docsDir, `wingman-routing-page-audit-${stamp}.md`);
const routeCsvPath = path.join(docsDir, `wingman-routing-page-audit-${stamp}.csv`);
const duplicateCsvPath = path.join(docsDir, `wingman-duplicate-page-candidates-${stamp}.csv`);
const linkCsvPath = path.join(docsDir, `wingman-link-route-audit-${stamp}.csv`);

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const pageNamePattern = /Page\.(tsx|ts|jsx|js)$/i;

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", "dist", "build", ".git", ".vite"].includes(entry.name)) {
        continue;
      }

      files.push(...walk(full));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!sourceExtensions.has(path.extname(entry.name))) {
      continue;
    }

    files.push(full);
  }

  return files;
}

function rel(file) {
  return path.relative(repo, file).replaceAll("\\", "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function cleanText(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hashContent(text) {
  return crypto.createHash("sha1").update(cleanText(text)).digest("hex").slice(0, 12);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function writeCsv(file, rows, columns) {
  const lines = [columns.join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }

  fs.writeFileSync(file, lines.join("\n"), "utf8");
}

function getImportSpecifiers(text) {
  const imports = [];
  const patterns = [
    /import\s+([^'";]+?)\s+from\s+["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (match.length === 3) {
        imports.push({
          importText: match[1].trim(),
          source: match[2],
          index: match.index ?? 0,
        });
      }

      if (match.length === 2) {
        imports.push({
          importText: "dynamic",
          source: match[1],
          index: match.index ?? 0,
        });
      }
    }
  }

  return imports;
}

function resolveImport(fromFile, source) {
  if (!source.startsWith(".")) {
    return null;
  }

  const base = path.resolve(path.dirname(fromFile), source);
  const attempts = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
    path.join(base, "index.jsx"),
    path.join(base, "index.js"),
  ];

  return attempts.find((attempt) => fs.existsSync(attempt)) ?? null;
}

function getExports(text) {
  const named = new Set();
  const defaultExport = /export\s+default\s+/m.test(text);

  for (const match of text.matchAll(/export\s+(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/g)) {
    named.add(match[1]);
  }

  for (const match of text.matchAll(/export\s*\{([^}]+)\}/g)) {
    const parts = match[1].split(",");

    for (const part of parts) {
      const name = part.trim().split(/\s+as\s+/i).pop()?.trim();

      if (name) {
        named.add(name);
      }
    }
  }

  return {
    defaultExport,
    named: [...named].sort(),
  };
}

function extractRoutesFromRoutesFile(file, text) {
  const rows = [];
  const routeKeyMap = new Map();

  for (const match of text.matchAll(/([A-Za-z0-9_]+)\s*:\s*lazy\s*\(([^)]*?import\s*\(\s*["']([^"']+)["']\s*\)[\s\S]*?)\)/g)) {
    const key = match[1];
    const importSource = match[3];
    const line = lineNumber(text, match.index ?? 0);
    const resolved = resolveImport(file, importSource);
    const importBody = match[2];
    const namedExportMatch = importBody.match(/fromNamedExport\s*\([^,]+,\s*["']([^"']+)["']\s*\)/);
    const expectedExport = namedExportMatch ? namedExportMatch[1] : "default";

    rows.push({
      routeKey: key,
      pathGuess: "",
      importSource,
      file: resolved ? rel(resolved) : "",
      expectedExport,
      importLine: line,
      sourceFile: rel(file),
    });

    routeKeyMap.set(key, rows[rows.length - 1]);
  }

  return { rows, routeKeyMap };
}

function extractPathMaps(text, file) {
  const rows = [];

  for (const match of text.matchAll(/([A-Za-z0-9_]+)\s*:\s*["'](\/wingman[^"']*)["']/g)) {
    rows.push({
      key: match[1],
      path: match[2],
      line: lineNumber(text, match.index ?? 0),
      sourceFile: rel(file),
    });
  }

  return rows;
}

function extractLinks(text, file) {
  const rows = [];
  const patterns = [
    /\bto=\{?["'](\/wingman[^"']*)["']\}?/g,
    /\bhref=\{?["'](\/wingman[^"']*)["']\}?/g,
    /navigate\(\s*["'](\/wingman[^"']*)["']\s*\)/g,
    /window\.location(?:\.href|\.assign)?\s*(?:=|\()\s*["'](\/wingman[^"']*)["']/g,
    /["'](\/wingman\/[A-Za-z0-9_/?#=&.-]+)["']/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      rows.push({
        path: match[1],
        line: lineNumber(text, match.index ?? 0),
        sourceFile: rel(file),
      });
    }
  }

  return rows;
}

function extractVisibleHeadings(text) {
  const headings = [];
  const patterns = [
    /<h[1-3][^>]*>\s*([^<{]+?)\s*<\/h[1-3]>/g,
    /title\s*[:=]\s*["']([^"']{4,80})["']/g,
    /heading\s*[:=]\s*["']([^"']{4,80})["']/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      headings.push(match[1].replace(/\s+/g, " ").trim());
    }
  }

  return [...new Set(headings)].slice(0, 12);
}

function componentNameFromFile(file) {
  return path.basename(file).replace(/\.(tsx|ts|jsx|js)$/i, "");
}

function routeSlugFromFile(file) {
  return componentNameFromFile(file)
    .replace(/Page$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

const files = walk(srcDir);
const pageFiles = files.filter((file) => pageNamePattern.test(file));
const allTexts = new Map(files.map((file) => [file, read(file)]));

const routesFiles = files.filter((file) => {
  const text = allTexts.get(file) ?? "";
  return /WingmanRouteKey|fromNamedExport|lazy\(.*import|\/wingman/.test(text) && /route|routes|navigation|sidebar|menu/i.test(file);
});

const routeRows = [];
const routeKeyRows = [];
const pathRows = [];
const linkRows = [];
const exportRows = [];
const importRows = [];
const pageRows = [];

for (const file of files) {
  const text = allTexts.get(file) ?? "";
  const exports = getExports(text);

  exportRows.push({
    file: rel(file),
    defaultExport: exports.defaultExport ? "yes" : "no",
    namedExports: exports.named.join("; "),
  });

  const imports = getImportSpecifiers(text);

  for (const imp of imports) {
    const resolved = resolveImport(file, imp.source);

    if (!resolved) {
      continue;
    }

    importRows.push({
      sourceFile: rel(file),
      line: lineNumber(text, imp.index),
      importText: imp.importText,
      importSource: imp.source,
      resolvedFile: rel(resolved),
    });
  }

  pathRows.push(...extractPathMaps(text, file));
  linkRows.push(...extractLinks(text, file));
}

for (const file of routesFiles) {
  const text = allTexts.get(file) ?? "";
  const extracted = extractRoutesFromRoutesFile(file, text);

  routeRows.push(...extracted.rows);

  for (const row of extracted.rows) {
    routeKeyRows.push(row);
  }
}

for (const file of pageFiles) {
  const text = allTexts.get(file) ?? "";
  const exports = getExports(text);
  const headings = extractVisibleHeadings(text);
  const importedBy = importRows
    .filter((row) => row.resolvedFile === rel(file))
    .map((row) => `${row.sourceFile}:${row.line}`);

  const routeImports = routeRows
    .filter((row) => row.file === rel(file))
    .map((row) => row.routeKey);

  pageRows.push({
    file: rel(file),
    component: componentNameFromFile(file),
    slugGuess: routeSlugFromFile(file),
    hash: hashContent(text),
    defaultExport: exports.defaultExport ? "yes" : "no",
    namedExports: exports.named.join("; "),
    routeKeys: routeImports.join("; "),
    importedBy: importedBy.join("; "),
    headings: headings.join(" | "),
    status: routeImports.length > 0 ? "ROUTED" : importedBy.length > 0 ? "IMPORTED_NOT_ROUTE" : "ORPHAN_PAGE",
  });
}

const routeByFile = new Map();

for (const row of routeRows) {
  if (!row.file) {
    continue;
  }

  if (!routeByFile.has(row.file)) {
    routeByFile.set(row.file, []);
  }

  routeByFile.get(row.file).push(row.routeKey);
}

const pageBySlug = new Map();

for (const row of pageRows) {
  if (!pageBySlug.has(row.slugGuess)) {
    pageBySlug.set(row.slugGuess, []);
  }

  pageBySlug.get(row.slugGuess).push(row);
}

const duplicateRows = [];

for (const [slug, rows] of pageBySlug.entries()) {
  if (rows.length <= 1) {
    continue;
  }

  for (const row of rows) {
    duplicateRows.push({
      duplicateType: "same_slug_guess",
      key: slug,
      file: row.file,
      routeKeys: row.routeKeys,
      status: row.status,
      headings: row.headings,
    });
  }
}

const pageByHash = new Map();

for (const row of pageRows) {
  if (!pageByHash.has(row.hash)) {
    pageByHash.set(row.hash, []);
  }

  pageByHash.get(row.hash).push(row);
}

for (const [hash, rows] of pageByHash.entries()) {
  if (rows.length <= 1) {
    continue;
  }

  for (const row of rows) {
    duplicateRows.push({
      duplicateType: "same_content_hash",
      key: hash,
      file: row.file,
      routeKeys: row.routeKeys,
      status: row.status,
      headings: row.headings,
    });
  }
}

const headingMap = new Map();

for (const row of pageRows) {
  const firstHeading = row.headings.split(" | ")[0] ?? "";

  if (!firstHeading) {
    continue;
  }

  const key = firstHeading.toLowerCase();

  if (!headingMap.has(key)) {
    headingMap.set(key, []);
  }

  headingMap.get(key).push(row);
}

for (const [heading, rows] of headingMap.entries()) {
  if (rows.length <= 1) {
    continue;
  }

  for (const row of rows) {
    duplicateRows.push({
      duplicateType: "same_visible_heading",
      key: heading,
      file: row.file,
      routeKeys: row.routeKeys,
      status: row.status,
      headings: row.headings,
    });
  }
}

const pathSet = new Set(pathRows.map((row) => row.path));
const normalisedPathSet = new Set();

for (const row of pathRows) {
  normalisedPathSet.add(row.path.replace(/\/$/, ""));
}

const auditedLinks = linkRows
  .map((row) => {
    const cleanPath = row.path.replace(/\/$/, "");
    const exact = pathSet.has(row.path) || normalisedPathSet.has(cleanPath);
    const routeLike = row.path === "/wingman" || row.path.startsWith("/wingman/");

    return {
      ...row,
      routeKnown: exact ? "yes" : "unknown",
      routeLike: routeLike ? "yes" : "no",
    };
  })
  .filter((row, index, rows) => {
    return rows.findIndex((item) => item.path === row.path && item.sourceFile === row.sourceFile && item.line === row.line) === index;
  });

const exportProblems = [];

for (const row of routeRows) {
  if (!row.file) {
    exportProblems.push({
      routeKey: row.routeKey,
      file: row.file,
      issue: `Import source did not resolve: ${row.importSource}`,
      sourceFile: row.sourceFile,
      importLine: row.importLine,
    });
    continue;
  }

  const full = path.join(repo, row.file);
  const text = fs.existsSync(full) ? read(full) : "";
  const exports = getExports(text);

  if (row.expectedExport === "default" && !exports.defaultExport) {
    exportProblems.push({
      routeKey: row.routeKey,
      file: row.file,
      issue: "Route expects default export but file has no default export",
      sourceFile: row.sourceFile,
      importLine: row.importLine,
    });
  }

  if (row.expectedExport !== "default" && !exports.named.includes(row.expectedExport)) {
    exportProblems.push({
      routeKey: row.routeKey,
      file: row.file,
      issue: `Route expects named export ${row.expectedExport} but file does not export it`,
      sourceFile: row.sourceFile,
      importLine: row.importLine,
    });
  }
}

const missingLinkRows = auditedLinks.filter((row) => row.routeKnown === "unknown" && !row.path.includes("${"));

writeCsv(routeCsvPath, pageRows, [
  "status",
  "file",
  "component",
  "slugGuess",
  "routeKeys",
  "defaultExport",
  "namedExports",
  "importedBy",
  "headings",
  "hash",
]);

writeCsv(duplicateCsvPath, duplicateRows, [
  "duplicateType",
  "key",
  "file",
  "routeKeys",
  "status",
  "headings",
]);

writeCsv(linkCsvPath, auditedLinks, [
  "routeKnown",
  "path",
  "sourceFile",
  "line",
  "routeLike",
]);

const routedPages = pageRows.filter((row) => row.status === "ROUTED");
const orphanPages = pageRows.filter((row) => row.status === "ORPHAN_PAGE");
const importedNotRoutePages = pageRows.filter((row) => row.status === "IMPORTED_NOT_ROUTE");

const productCallCardFiles = pageRows.filter((row) => row.file.includes("productCallCards") || row.file.includes("ProductCallCards"));

const report = [];

report.push(`# Wingman routing and duplicate page audit`);
report.push(``);
report.push(`Generated: ${new Date().toLocaleString()}`);
report.push(`Repo: ${repo}`);
report.push(``);
report.push(`## Summary`);
report.push(``);
report.push(`| Check | Count |`);
report.push(`|---|---:|`);
report.push(`| Source files scanned | ${files.length} |`);
report.push(`| Page files scanned | ${pageRows.length} |`);
report.push(`| Route-related files scanned | ${routesFiles.length} |`);
report.push(`| Pages directly imported by route registry | ${routedPages.length} |`);
report.push(`| Page files imported somewhere but not directly routed | ${importedNotRoutePages.length} |`);
report.push(`| Orphan page files | ${orphanPages.length} |`);
report.push(`| Duplicate page candidates | ${duplicateRows.length} |`);
report.push(`| Export/import route problems | ${exportProblems.length} |`);
report.push(`| Unknown / possibly stale /wingman links | ${missingLinkRows.length} |`);
report.push(``);

report.push(`## Route-related source files`);
report.push(``);
for (const file of routesFiles.map(rel).sort()) {
  report.push(`- ${file}`);
}
report.push(``);

report.push(`## Direct route imports found`);
report.push(``);
if (routeRows.length === 0) {
  report.push(`No route registry lazy imports were found by the audit patterns.`);
}
for (const row of routeRows) {
  report.push(`- \`${row.routeKey}\` → \`${row.file || row.importSource}\` expects \`${row.expectedExport}\` from \`${row.sourceFile}:${row.importLine}\``);
}
report.push(``);

report.push(`## Export / route import problems`);
report.push(``);
if (exportProblems.length === 0) {
  report.push(`No direct route export mismatch detected.`);
}
for (const problem of exportProblems) {
  report.push(`- **${problem.routeKey}**: ${problem.issue} — \`${problem.file}\` referenced from \`${problem.sourceFile}:${problem.importLine}\``);
}
report.push(``);

report.push(`## Page files not directly routed`);
report.push(``);
report.push(`These are the files most likely to cause “I edited a page but did not see a change” confusion.`);
report.push(``);
if (orphanPages.length === 0) {
  report.push(`No orphan page files detected.`);
}
for (const row of orphanPages) {
  report.push(`- \`${row.file}\` — headings: ${row.headings || "none detected"}`);
}
report.push(``);

report.push(`## Imported but not route-entry pages`);
report.push(``);
if (importedNotRoutePages.length === 0) {
  report.push(`No imported-but-not-route page files detected.`);
}
for (const row of importedNotRoutePages) {
  report.push(`- \`${row.file}\` — imported by: ${row.importedBy || "unknown"} — headings: ${row.headings || "none detected"}`);
}
report.push(``);

report.push(`## Duplicate page candidates`);
report.push(``);
if (duplicateRows.length === 0) {
  report.push(`No duplicate page candidates detected by slug, content hash or first heading.`);
}
for (const row of duplicateRows) {
  report.push(`- **${row.duplicateType}** \`${row.key}\` → \`${row.file}\` — status: ${row.status} — route keys: ${row.routeKeys || "none"}`);
}
report.push(``);

report.push(`## Product Call Cards routing focus`);
report.push(``);
if (productCallCardFiles.length === 0) {
  report.push(`No Product Call Cards page files detected.`);
}
for (const row of productCallCardFiles) {
  report.push(`- \`${row.file}\` — status: ${row.status} — route keys: ${row.routeKeys || "none"} — imported by: ${row.importedBy || "none"}`);
}
report.push(``);

report.push(`## Unknown / possibly stale /wingman links`);
report.push(``);
if (missingLinkRows.length === 0) {
  report.push(`No unknown /wingman links detected by the static scan.`);
}
for (const row of missingLinkRows.slice(0, 80)) {
  report.push(`- \`${row.path}\` in \`${row.sourceFile}:${row.line}\``);
}
if (missingLinkRows.length > 80) {
  report.push(`- ...and ${missingLinkRows.length - 80} more. See CSV.`);
}
report.push(``);

report.push(`## Output files`);
report.push(``);
report.push(`- Route/page audit CSV: \`${rel(routeCsvPath)}\``);
report.push(`- Duplicate candidate CSV: \`${rel(duplicateCsvPath)}\``);
report.push(`- Link audit CSV: \`${rel(linkCsvPath)}\``);
report.push(`- Markdown report: \`${rel(routeReportPath)}\``);
report.push(``);

report.push(`## How to use this report`);
report.push(``);
report.push(`1. For any page you are editing, check whether it appears as **ROUTED**.`);
report.push(`2. If it appears as **ORPHAN_PAGE**, you are probably editing a dead or duplicate file.`);
report.push(`3. If a route expects a named export and the file only has a default export, the build may fail or load a different page wrapper.`);
report.push(`4. If sidebar/menu links appear under unknown links, they may point to stale paths.`);
report.push(`5. For Product Call Cards, use the focus section to confirm which file owns each step.`);

fs.writeFileSync(routeReportPath, report.join("\n"), "utf8");

console.log("");
console.log("Wingman routing/page audit complete");
console.log("");
console.log(`Markdown report: ${rel(routeReportPath)}`);
console.log(`Route/page CSV:  ${rel(routeCsvPath)}`);
console.log(`Duplicate CSV:   ${rel(duplicateCsvPath)}`);
console.log(`Link CSV:        ${rel(linkCsvPath)}`);
console.log("");
console.log("Key checks:");
console.log(`- Orphan pages: ${orphanPages.length}`);
console.log(`- Duplicate candidates: ${duplicateRows.length}`);
console.log(`- Export/import route problems: ${exportProblems.length}`);
console.log(`- Unknown /wingman links: ${missingLinkRows.length}`);
console.log("");

if (exportProblems.length > 0) {
  console.log("Export/import problems:");
  for (const problem of exportProblems) {
    console.log(`- ${problem.routeKey}: ${problem.issue} (${problem.file})`);
  }
}

if (productCallCardFiles.length > 0) {
  console.log("");
  console.log("Product Call Cards files:");
  for (const row of productCallCardFiles) {
    console.log(`- ${row.status}: ${row.file} routeKeys=${row.routeKeys || "none"} importedBy=${row.importedBy || "none"}`);
  }
}