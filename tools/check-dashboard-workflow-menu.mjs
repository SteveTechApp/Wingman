import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const files = {
  dashboard: path.join(
    repoRoot,
    "src",
    "wingman2",
    "pages",
    "DashboardPage.tsx",
  ),
  css: path.join(
    repoRoot,
    "src",
    "wingman2",
    "styles",
    "wingman-style-stack.css",
  ),
  packageJson: path.join(repoRoot, "package.json"),
};

const errors = [];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${path.relative(repoRoot, filePath)}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) {
    errors.push(`${label} missing marker: ${marker}`);
  }
}

function forbidMarker(label, source, marker) {
  if (source.includes(marker)) {
    errors.push(`${label} contains obsolete marker: ${marker}`);
  }
}

const dashboard = read(files.dashboard);
const css = read(files.css);
const packageJson = JSON.parse(read(files.packageJson) || "{}");

[
  "How can Wingman help you today?",
  "Start guided discovery",
  "Products",
  "Compare",
  "Documents",
  "Response Pack",
  "Projects",
  "Active projects",
  "routeCatalogByKey.discovery.path",
  "routeCatalogByKey.products.path",
  "routeCatalogByKey.compare.path",
  "routeCatalogByKey.documents.path",
  "routeCatalogByKey.responsePack.path",
  "routeCatalogByKey.projects.path",
  'data-wingman-dashboard-layout="viewport-split"',
  'data-wingman-dashboard-rail="viewport-depth"',
  'data-wingman-dashboard-main="viewport-depth"',
  "wm-dashboard-shell",
  "wm-dashboard-rail",
  "wm-dashboard-main",
  "wm-dashboard-grid",
  "wm-dashboard-project-grid",
].forEach((marker) => {
  requireMarker("DashboardPage.tsx", dashboard, marker);
});

[
  "WINGMAN DASHBOARD VIEWPORT CONTRACT START",
  ".wm-dashboard-shell",
  "grid-template-columns: minmax(280px, 0.34fr) minmax(0, 1fr)",
  "height: calc(100dvh - var(--wm-header))",
  ".wm-dashboard-rail",
  "align-self: stretch",
  "height: 100%",
  ".wm-dashboard-main",
  "overflow-y: auto",
  ".wm-dashboard-grid",
  ".wm-dashboard-project-grid",
  "@media (max-width: 1180px)",
  "grid-template-columns: minmax(0, 1fr)",
  "WINGMAN DASHBOARD VIEWPORT CONTRACT END",
].forEach((marker) => {
  requireMarker("wingman-style-stack.css", css, marker);
});

[
  "WINGMAN DASHBOARD CANONICAL LAYOUT START",
  "WINGMAN DASHBOARD CANONICAL LAYOUT END",
  "main.wm-dashboard-shell .wm-dashboard-grid",
  "main.wm-dashboard-shell .wm-dashboard-project-grid",
  "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  "Wingman dashboard restore original card layout",
  "data-wingman-dashboard-primary-card-row",
  "data-wingman-dashboard-primary-card",
  "data-wingman-home-single-screen",
  "What are you trying to do?",
  "Guide a customer call",
  "DASHBOARD_WORKFLOW_MENU_ROUTE_GUARD",
  "data-wingman-dashboard-menu",
  "WINGMAN DASHBOARD WORKFLOW MENU START",
].forEach((marker) => {
  forbidMarker("DashboardPage.tsx", dashboard, marker);
  forbidMarker("wingman-style-stack.css", css, marker);
});

const activeImports = css
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("@import"));

if (activeImports.length) {
  errors.push(
    "wingman-style-stack.css must not contain active @import lines.",
  );
}

if (!packageJson.scripts?.["check:dashboard-workflow-menu"]) {
  errors.push(
    "package.json missing check:dashboard-workflow-menu script.",
  );
}

if (!packageJson.scripts?.["check:navigation-consolidation"]) {
  errors.push(
    "package.json missing check:navigation-consolidation script.",
  );
}

if (
  !String(packageJson.scripts?.verify || "").includes(
    "check:dashboard-workflow-menu",
  )
) {
  errors.push(
    "package.json verify script missing check:dashboard-workflow-menu.",
  );
}

if (errors.length) {
  console.error("[dashboard-workflow-menu] Check failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  "[dashboard-workflow-menu] Verified current Dashboard destinations, routes and viewport-split layout.",
);