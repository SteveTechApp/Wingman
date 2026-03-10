#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const MAIN = path.join(SRC, "main.tsx");
const ROUTES = path.join(SRC, "AppRoutes.tsx");
const REPORT_PATH = path.join(ROOT, "docs", "css-audit-report.md");

function toPosix(inputPath) {
  return inputPath.split(path.sep).join("/");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function resolveImport(spec, fromFile) {
  if (spec.startsWith("@/")) return path.join(SRC, spec.slice(2));
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return path.resolve(path.dirname(fromFile), spec);
  }
  return null;
}

function resolveTsModule(filePathNoExt) {
  const attempts = [
    filePathNoExt,
    `${filePathNoExt}.tsx`,
    `${filePathNoExt}.ts`,
    `${filePathNoExt}.jsx`,
    `${filePathNoExt}.js`,
    path.join(filePathNoExt, "index.tsx"),
    path.join(filePathNoExt, "index.ts"),
    path.join(filePathNoExt, "index.jsx"),
    path.join(filePathNoExt, "index.js"),
  ];
  return attempts.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function extractCssImports(source, fromFile) {
  const out = [];
  const jsImportRe = /import\s+(?:[^"'`]+from\s+)?["'`]([^"'`]+\.css)["'`]/g;
  const cssImportRe = /@import\s+["'`]([^"'`]+\.css)["'`]/g;

  for (const re of [jsImportRe, cssImportRe]) {
    let match;
    while ((match = re.exec(source))) {
      const resolved = resolveImport(match[1], fromFile);
      if (resolved) out.push(resolved);
    }
  }
  return out;
}

function extractClassTokens(source) {
  const values = [];
  const patterns = [
    /className\s*=\s*"([^"]+)"/g,
    /className\s*=\s*'([^']+)'/g,
    /className\s*=\s*{\s*"([^"]+)"\s*}/g,
    /className\s*=\s*{\s*'([^']+)'\s*}/g,
    /className\s*=\s*{\s*`([^`]+)`\s*}/g,
  ];

  for (const re of patterns) {
    let match;
    while ((match = re.exec(source))) {
      values.push(match[1]);
    }
  }

  const out = new Set();
  for (const value of values) {
    const cleaned = value
      .replace(/\$\{[^}]+\}/g, " ")
      .replace(/[{}()?:,+]/g, " ")
      .trim();
    for (const token of cleaned.split(/\s+/)) {
      const normalized = token.replace(/[^A-Za-z0-9_-]/g, "");
      if (normalized) out.add(normalized);
    }
  }
  return out;
}

function extractCssClasses(cssText) {
  const out = new Set();
  const re = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
  let match;
  while ((match = re.exec(cssText))) out.add(match[1]);
  return out;
}

function getActiveCssFiles() {
  const mainText = read(MAIN);
  const imports = extractCssImports(mainText, MAIN);
  return [...new Set(imports)].filter((filePath) => fs.existsSync(filePath));
}

function getRoutedPageFiles() {
  const routesText = read(ROUTES);
  if (!routesText) return [];

  const lazyImports = new Map();
  const lazyRe =
    /const\s+([A-Za-z0-9_]+)\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("([^"]+)"\)\);/g;
  let lazyMatch;
  while ((lazyMatch = lazyRe.exec(routesText))) {
    lazyImports.set(lazyMatch[1], lazyMatch[2]);
  }

  const usedComponents = new Set();
  const routeElRe = /element=\{<([A-Za-z0-9_]+)\s*\/?>\}/g;
  let routeMatch;
  while ((routeMatch = routeElRe.exec(routesText))) {
    usedComponents.add(routeMatch[1]);
  }

  const files = [];
  for (const componentName of usedComponents) {
    const modSpec = lazyImports.get(componentName);
    if (!modSpec) continue;
    const basePath = resolveImport(modSpec, ROUTES);
    if (!basePath) continue;
    const resolved = resolveTsModule(basePath);
    if (!resolved) continue;
    files.push(resolved);
  }

  return [...new Set(files)];
}

function buildAudit() {
  const activeCssFiles = getActiveCssFiles();
  const routedPageFiles = getRoutedPageFiles();

  const activeClassNames = new Set();
  for (const cssFile of activeCssFiles) {
    for (const className of extractCssClasses(read(cssFile))) {
      if (className.startsWith("wm-")) activeClassNames.add(className);
    }
  }

  const missingByPage = [];
  const missingFrequency = new Map();

  for (const pageFile of routedPageFiles) {
    const classTokens = extractClassTokens(read(pageFile));
    const wmClasses = [...classTokens].filter((name) => name.startsWith("wm-"));
    const missing = [...new Set(wmClasses.filter((name) => !activeClassNames.has(name)))].sort();
    if (!missing.length) continue;

    for (const name of missing) {
      missingFrequency.set(name, (missingFrequency.get(name) ?? 0) + 1);
    }

    missingByPage.push({
      file: pageFile,
      missing,
    });
  }

  const allCssFiles = walk(path.join(SRC, "styles")).filter((filePath) =>
    filePath.endsWith(".css")
  );

  const referencedCss = new Set(activeCssFiles);
  const allSourceFiles = walk(SRC).filter((filePath) =>
    /\.(css|ts|tsx|js|jsx)$/.test(filePath)
  );
  for (const sourceFile of allSourceFiles) {
    for (const imported of extractCssImports(read(sourceFile), sourceFile)) {
      if (fs.existsSync(imported)) referencedCss.add(imported);
    }
  }

  const unreferencedCssFiles = allCssFiles
    .filter((filePath) => !referencedCss.has(filePath))
    .sort();

  const removablePlaceholderFiles = unreferencedCssFiles.filter((filePath) => {
    const size = fs.statSync(filePath).size;
    return size <= 40;
  });

  const sortedMissingFrequency = [...missingFrequency.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

  return {
    generatedAt: new Date().toISOString(),
    activeCssFiles,
    routedPageFiles,
    missingByPage: missingByPage.sort((a, b) => a.file.localeCompare(b.file)),
    missingFrequency: sortedMissingFrequency,
    unreferencedCssFiles,
    removablePlaceholderFiles,
  };
}

function writeReport(audit) {
  const lines = [];
  lines.push("# CSS Audit Report");
  lines.push("");
  lines.push(`Generated: ${audit.generatedAt}`);
  lines.push("");
  lines.push("## Active Runtime CSS");
  lines.push("");
  for (const filePath of audit.activeCssFiles) {
    lines.push(`- \`${toPosix(path.relative(ROOT, filePath))}\``);
  }
  lines.push("");
  lines.push("## Routed Pages Audited");
  lines.push("");
  lines.push(`- Count: ${audit.routedPageFiles.length}`);
  lines.push("");
  for (const filePath of audit.routedPageFiles.sort()) {
    lines.push(`- \`${toPosix(path.relative(ROOT, filePath))}\``);
  }
  lines.push("");
  lines.push("## Missing `wm-*` Classes (Routed Pages)");
  lines.push("");
  if (!audit.missingByPage.length) {
    lines.push("- None");
  } else {
    for (const row of audit.missingByPage) {
      lines.push(`- \`${toPosix(path.relative(ROOT, row.file))}\``);
      lines.push(`  - ${row.missing.join(", ")}`);
    }
  }
  lines.push("");
  lines.push("## Missing Class Frequency");
  lines.push("");
  if (!audit.missingFrequency.length) {
    lines.push("- None");
  } else {
    for (const [name, count] of audit.missingFrequency.slice(0, 50)) {
      lines.push(`- \`${name}\`: ${count}`);
    }
  }
  lines.push("");
  lines.push("## Unreferenced CSS Files (Not Imported Anywhere)");
  lines.push("");
  if (!audit.unreferencedCssFiles.length) {
    lines.push("- None");
  } else {
    for (const filePath of audit.unreferencedCssFiles) {
      lines.push(`- \`${toPosix(path.relative(ROOT, filePath))}\``);
    }
  }
  lines.push("");
  lines.push("## Safe Removal Candidates");
  lines.push("");
  if (!audit.removablePlaceholderFiles.length) {
    lines.push("- None");
  } else {
    for (const filePath of audit.removablePlaceholderFiles) {
      lines.push(`- \`${toPosix(path.relative(ROOT, filePath))}\``);
    }
  }
  lines.push("");

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
}

const audit = buildAudit();
writeReport(audit);

console.log(`Wrote report: ${toPosix(path.relative(ROOT, REPORT_PATH))}`);
console.log(`Active CSS files: ${audit.activeCssFiles.length}`);
console.log(`Routed pages audited: ${audit.routedPageFiles.length}`);
console.log(`Routed pages with missing wm-* classes: ${audit.missingByPage.length}`);
console.log(`Unreferenced CSS files: ${audit.unreferencedCssFiles.length}`);
console.log(`Safe removal candidates: ${audit.removablePlaceholderFiles.length}`);
