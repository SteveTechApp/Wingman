import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dashboardPath = path.join(root, "src", "wingman2", "pages", "DashboardPage.tsx");
const themePath = path.join(root, "src", "wingman2", "styles", "wingman-reference-theme.css");
const workflowThemePath = path.join(root, "src", "wingman2", "styles", "wingman-workflow-theme.css");
const mainPath = path.join(root, "src", "main.tsx");
const errors = [];

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${path.relative(root, filePath)}`);
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
    errors.push(`${label} contains retired marker: ${marker}`);
  }
}

const dashboard = read(dashboardPath);
const theme = read(themePath);
const workflowTheme = read(workflowThemePath);
const main = read(mainPath);

[
  "wm-reference-dashboard",
  "Good morning",
  "Good afternoon",
  "Good evening",
  "Start Discovery",
  "Compare Products",
  "Browse Templates",
  "My Projects",
  "Recent Projects",
  "Today&apos;s Focus",
  "What&apos;s New",
  "grid-rows-2",
  "calc(100dvh - 145px)",
  "routeCatalogByKey.discovery.path",
  "routeCatalogByKey.compare.path",
  "routeCatalogByKey.templates.path",
  "routeCatalogByKey.projects.path",
].forEach((marker) => requireMarker("DashboardPage.tsx", dashboard, marker));

[
  "--wm-ref-bg",
  ".wingman-sidebar",
  ".wingman-workspace",
  ".wingman-topbar",
  ".wingman-app-main",
  ".wm-reference-primary-grid",
  ".wm-reference-primary-card",
  ".wm-reference-project-grid",
  ".wm-reference-dashboard-rail",
  ".wingman-guru-fab-image",
  "@keyframes wm-reference-guru-float",
  "@media (max-width: 980px)",
  "@media (prefers-reduced-motion: reduce)",
].forEach((marker) => requireMarker("wingman-reference-theme.css", theme, marker));

requireMarker(
  "wingman-workflow-theme.css",
  workflowTheme,
  'html[data-wingman-route="discovery"]',
);

[
  'import "./wingman2/styles/wingman-reference-theme.css";',
  'import "./wingman2/styles/wingman-workflow-theme.css";',
].forEach((marker) => requireMarker("src/main.tsx", main, marker));

[
  "How can Wingman help you today?",
  "data-wingman-dashboard-layout=\"viewport-split\"",
  "wm-dashboard-command-band",
  "wm-dashboard-rail",
  "wm-dashboard-main",
  "Quick Actions",
  "Product Spotlight",
  "Ask Guru",
  "quickActions",
  "wm-reference-quick-grid",
  "wm-reference-quick-card",
].forEach((marker) => forbidMarker("DashboardPage.tsx", dashboard, marker));

if (errors.length) {
  console.error("[dashboard-reference-layout] Check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  "[dashboard-reference-layout] Verified the simplified dashboard, expanded priority content and governed workflow theme.",
);
