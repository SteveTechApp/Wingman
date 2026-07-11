import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "src", "wingman2", "app", "route-manifest.json");
const appShellPath = path.join(root, "src", "wingman2", "layout", "AppShell.tsx");
const cssPath = path.join(root, "src", "wingman2", "styles", "wingman-style-stack.css");
const pagesDirectory = path.join(root, "src", "wingman2", "pages");
const reportPath = path.join(root, "docs", "app-page-style-consistency-audit.md");

const errors = [];
const warnings = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

const manifest = JSON.parse(read("src/wingman2/app/route-manifest.json") || "[]");
const appShell = read("src/wingman2/layout/AppShell.tsx");
const css = read("src/wingman2/styles/wingman-style-stack.css");

for (const marker of [
  'data-wingman-page-header="true"',
  'wingman-topbar-page-label',
  'wingman-topbar-page-summary',
  'data-wingman-page-style="governed"',
  'wm-app-page-frame',
]) {
  if (!appShell.includes(marker)) {
    errors.push(`AppShell is missing governed page-style marker: ${marker}`);
  }
}

for (const marker of [
  "WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP START",
  "WINGMAN APP-WIDE STYLE CONSISTENCY SWEEP END",
  ".wingman-topbar-page-label",
  ".wingman-topbar-page-summary",
  ".wingman-app-main > .wm-app-page-frame",
  "--wm-app-heading",
  "--wm-app-copy",
  "--wm-app-panel",
]) {
  if (!css.includes(marker)) {
    errors.push(`Global stylesheet is missing consistency marker: ${marker}`);
  }
}

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length > 0) {
  errors.push("wingman-style-stack.css contains active @import lines; Wingman must retain one compiled global stylesheet.");
}

const routesByFile = new Map();

for (const route of manifest) {
  if (!route.pageFile) {
    errors.push(`Route ${route.key ?? "(unknown)"} has no pageFile.`);
    continue;
  }

  const routeList = routesByFile.get(route.pageFile) ?? [];
  routeList.push(route);
  routesByFile.set(route.pageFile, routeList);
}

const rows = [];

for (const [pageFile, routes] of [...routesByFile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const relativePath = path.join("src", "wingman2", "pages", pageFile);
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push(`Routed page is missing: ${relativePath}`);
    rows.push({
      pageFile,
      routes: routes.map((route) => route.path).join(", "),
      status: "MISSING",
      h1: 0,
      roots: 0,
      cards: 0,
      hardLight: 0,
    });
    continue;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  const h1Count = count(source, /<h1\b/g);
  const rootCount = count(
    source,
    /\b(?:wm-ui-page|wm-page|wm20-page|wingman-page|wingman-page-host|wm-compare-page|wm-discovery-page|wm-finder-page)\b/g,
  );
  const cardCount = count(
    source,
    /\b(?:wm-ui-card|wm-card|wm-section-card|wm-output-panel|wm20-panel|wingman-card)\b/g,
  );
  const hardLightCount = count(
    source,
    /\b(?:bg-white|bg-slate-50|bg-gray-50|text-slate-950|text-gray-950)\b/g,
  );

  if (h1Count === 0) {
    warnings.push(`${relativePath} has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.`);
  }

  if (rootCount === 0) {
    warnings.push(`${relativePath} has no internal shared page-root class; it is currently governed only by AppShell.`);
  }

  if (hardLightCount > 0) {
    warnings.push(`${relativePath} contains ${hardLightCount} light-theme utility class occurrence(s); the final governed layer overrides these surfaces, but the markup should be normalised when next edited.`);
  }

  rows.push({
    pageFile,
    routes: routes.map((route) => route.path).join(", "),
    status: "Covered by AppShell",
    h1: h1Count,
    roots: rootCount,
    cards: cardCount,
    hardLight: hardLightCount,
  });
}

const allPageFiles = fs.existsSync(pagesDirectory)
  ? fs.readdirSync(pagesDirectory).filter((name) => name.endsWith(".tsx"))
  : [];

const routedFiles = new Set(routesByFile.keys());
const supplementalFiles = allPageFiles
  .filter((name) => !routedFiles.has(name))
  .sort();

const report = [
  "# Wingman app page style consistency audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Governed visual contract",
  "",
  "- Every route is wrapped by `AppShell > .wm-app-page-frame`.",
  "- The global top bar separates the aquamarine page label from the concise route summary.",
  "- Body copy is white; page and section headings use the governed aquamarine palette.",
  "- Cards and panels use a consistent dark-navy surface, border, radius and spacing system.",
  "- Buttons, tabs, inputs and tables share one compact interaction style.",
  "- The final CSS layer is contained in the single `wingman-style-stack.css` file.",
  "",
  "## Routed page coverage",
  "",
  "| Page implementation | Route(s) | Coverage | H1 | Shared roots | Shared cards | Light-theme utilities |",
  "|---|---|---:|---:|---:|---:|---:|",
  ...rows.map(
    (row) =>
      `| ${row.pageFile} | ${row.routes} | ${row.status} | ${row.h1} | ${row.roots} | ${row.cards} | ${row.hardLight} |`,
  ),
  "",
  "## Supplemental page modules",
  "",
  ...(supplementalFiles.length > 0
    ? supplementalFiles.map((name) => `- ${name}`)
    : ["- None"]),
  "",
  "## Warnings",
  "",
  ...(warnings.length > 0 ? warnings.map((warning) => `- ${warning}`) : ["- None"]),
  "",
];

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${report.join("\n")}\n`, "utf8");

console.log(
  `[app-page-style] Covered ${manifest.length} routes across ${routesByFile.size} routed page implementation(s).`,
);
console.log(`[app-page-style] Audit written to ${path.relative(root, reportPath)}.`);

if (warnings.length > 0) {
  console.warn(`[app-page-style] ${warnings.length} non-blocking markup warning(s) recorded in the audit.`);
}

if (errors.length > 0) {
  console.error("[app-page-style] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[app-page-style] AppShell, colour profile, header system and page coverage checks passed.");
