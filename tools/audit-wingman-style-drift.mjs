import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const reportDir = path.join(root, "reports");
const reportPath = path.join(reportDir, "wingman-style-drift-report.md");
const jsonPath = path.join(reportDir, "wingman-style-drift-report.json");

function walk(dir, extensions) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", "archive", "backups"].includes(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full, extensions));
      continue;
    }

    if (extensions.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }

  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function count(raw, regex) {
  const matches = raw.match(regex);
  return matches ? matches.length : 0;
}

function resolveRelativeImport(sourceFile, specifier) {
  if (!specifier.startsWith(".")) return "";

  return path.resolve(path.dirname(sourceFile), specifier);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const sourceFiles = walk(srcRoot, [".ts", ".tsx"]);
const cssFiles = walk(srcRoot, [".css"]);

const cssFileSet = new Set(cssFiles.map((file) => path.normalize(file)));
const sideEffectImports = [];
const cssImports = [];

for (const file of sourceFiles) {
  const raw = read(file);
  const regex = /import\s+["']([^"']+\.css)["'];/g;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    const specifier = match[1];
    const resolved = resolveRelativeImport(file, specifier);

    sideEffectImports.push({
      type: "ts-import",
      sourceFile: rel(file),
      import: specifier,
      resolvedAbs: resolved,
      resolved: resolved ? rel(resolved) : "",
      exists: resolved ? fs.existsSync(resolved) : false,
    });
  }
}

for (const file of cssFiles) {
  const raw = read(file);
  const regex = /@import\s+(?:url\()?["']([^"']+\.css)["']\)?\s*;/g;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    const specifier = match[1];
    const resolved = resolveRelativeImport(file, specifier);

    cssImports.push({
      type: "css-import",
      sourceFile: rel(file),
      import: specifier,
      resolvedAbs: resolved,
      resolved: resolved ? rel(resolved) : "",
      exists: resolved ? fs.existsSync(resolved) : false,
    });
  }
}

const allImports = [...sideEffectImports, ...cssImports];

function collectCssGraph(startAbs, visited = new Set(), chain = []) {
  const normal = path.normalize(startAbs);

  if (visited.has(normal)) {
    return;
  }

  if (!cssFileSet.has(normal)) {
    return;
  }

  visited.add(normal);
  chain.push(rel(normal));

  const children = cssImports.filter((item) => {
    return path.normalize(item.sourceFile.replaceAll("/", path.sep)) === rel(normal).replaceAll("/", path.sep);
  });

  for (const child of children) {
    if (child.exists) {
      collectCssGraph(child.resolvedAbs, visited, chain);
    }
  }
}

const activeCssAbs = new Set();

for (const item of sideEffectImports) {
  if (!item.exists) continue;

  const visited = new Set();
  const chain = [];

  collectCssGraph(item.resolvedAbs, visited, chain);

  for (const css of visited) {
    activeCssAbs.add(css);
  }
}

const importedByMap = new Map();

for (const item of allImports) {
  if (!item.exists) continue;

  const key = path.normalize(item.resolvedAbs);

  if (!importedByMap.has(key)) {
    importedByMap.set(key, []);
  }

  importedByMap.get(key).push(`${item.sourceFile} -> ${item.import}`);
}

const reports = cssFiles.map((file) => {
  const raw = read(file);
  const normal = path.normalize(file);

  const important = count(raw, /!important/g);
  const rootTokens = count(raw, /:root\s*\{/g);
  const shell = count(raw, /\.wingman-shell\b/g);
  const main = count(raw, /\.wingman-app-main\b/g);
  const sidebar = count(raw, /sidebar/gi);
  const topbar = count(raw, /topbar|header/gi);
  const route = count(raw, /wm-route-|data-wm-route|:has\(/g);
  const conflict = count(raw, /background:\s*#fff|background:\s*white|color:\s*#0f172a|--wm-finder-ink|--wm-disc-text/gi);

  const risk =
    important * 2 +
    rootTokens * 8 +
    shell * 5 +
    main * 5 +
    sidebar * 2 +
    topbar * 2 +
    route * 5 +
    conflict * 4;

  return {
    risk,
    file: rel(file),
    active: activeCssAbs.has(normal),
    lines: raw.split(/\r?\n/).length,
    sizeKb: Math.round((Buffer.byteLength(raw) / 1024) * 10) / 10,
    important,
    rootTokens,
    shell,
    main,
    sidebar,
    topbar,
    route,
    conflict,
    importedBy: importedByMap.get(normal) ?? [],
  };
}).sort((a, b) => {
  if (a.active !== b.active) return a.active ? -1 : 1;
  return b.risk - a.risk || b.sizeKb - a.sizeKb;
});

fs.mkdirSync(reportDir, { recursive: true });

const summary = {
  generatedAt: new Date().toISOString(),
  cssFiles: cssFiles.length,
  tsCssImports: sideEffectImports.length,
  cssAtImports: cssImports.length,
  activeCssFiles: reports.filter((item) => item.active).length,
  inactiveCssFiles: reports.filter((item) => !item.active).length,
  reports,
  sideEffectImports,
  cssImports,
};

fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

const lines = [];

lines.push("# Wingman Style Drift Report");
lines.push("");
lines.push(`Generated: ${summary.generatedAt}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- CSS files found: **${summary.cssFiles}**`);
lines.push(`- TS/TSX CSS import statements found: **${summary.tsCssImports}**`);
lines.push(`- CSS @import statements found: **${summary.cssAtImports}**`);
lines.push(`- Active CSS files through import graph: **${summary.activeCssFiles}**`);
lines.push(`- Inactive CSS files: **${summary.inactiveCssFiles}**`);
lines.push("");
lines.push("## Highest-risk active CSS files");
lines.push("");
lines.push("| Risk | Active | File | Lines | Size KB | !important | :root | Shell | Main | Sidebar | Topbar | Route | Light/Dark | Imported by |");
lines.push("|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");

for (const item of reports.filter((report) => report.active).slice(0, 40)) {
  const importedBy = item.importedBy.length ? item.importedBy.join("<br>") : "_import graph root or unknown_";
  lines.push(`| ${item.risk} | yes | \`${item.file}\` | ${item.lines} | ${item.sizeKb} | ${item.important} | ${item.rootTokens} | ${item.shell} | ${item.main} | ${item.sidebar} | ${item.topbar} | ${item.route} | ${item.conflict} | ${importedBy} |`);
}

lines.push("");
lines.push("## Inactive high-risk CSS files");
lines.push("");
lines.push("| Risk | File | Lines | !important | :root | Shell | Main | Sidebar | Topbar | Route | Light/Dark |");
lines.push("|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|");

for (const item of reports.filter((report) => !report.active).slice(0, 30)) {
  lines.push(`| ${item.risk} | \`${item.file}\` | ${item.lines} | ${item.important} | ${item.rootTokens} | ${item.shell} | ${item.main} | ${item.sidebar} | ${item.topbar} | ${item.route} | ${item.conflict} |`);
}

lines.push("");
lines.push("## TS/TSX CSS imports");
lines.push("");
lines.push("| Source file | Import | Exists |");
lines.push("|---|---|---|");

for (const item of sideEffectImports.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile))) {
  lines.push(`| \`${item.sourceFile}\` | \`${item.import}\` | ${item.exists ? "yes" : "no"} |`);
}

lines.push("");
lines.push("## CSS @imports");
lines.push("");
lines.push("| Source CSS | Import | Exists |");
lines.push("|---|---|---|");

for (const item of cssImports.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile))) {
  lines.push(`| \`${item.sourceFile}\` | \`${item.import}\` | ${item.exists ? "yes" : "no"} |`);
}

fs.writeFileSync(reportPath, lines.join("\n"));

console.log(`CSS files found: ${summary.cssFiles}`);
console.log(`TS/TSX CSS imports found: ${summary.tsCssImports}`);
console.log(`CSS @imports found: ${summary.cssAtImports}`);
console.log(`Active CSS files through graph: ${summary.activeCssFiles}`);
console.log(`Report written to: ${rel(reportPath)}`);