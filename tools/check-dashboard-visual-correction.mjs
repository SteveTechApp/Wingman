import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const themePath = path.join(root, "src/wingman2/styles/wingman-style-stack.css");
const dashboardPath = path.join(root, "src/wingman2/pages/DashboardPage.tsx");

const theme = fs.readFileSync(themePath, "utf8");
const dashboard = fs.readFileSync(dashboardPath, "utf8");

const start = "/* === WINGMAN DASHBOARD CANONICAL LAYOUT START === */";
const end = "/* === WINGMAN DASHBOARD CANONICAL LAYOUT END === */";
const startIndex = theme.indexOf(start);
const endIndex = theme.indexOf(end, startIndex);
const errors = [];

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  errors.push("Dashboard canonical layout block missing.");
} else {
  const block = theme.slice(startIndex, endIndex + end.length);

  [
    ".wingman-app-main > .wingman-page-host:has(> main.wm-dashboard-shell)",
    "height: calc(100dvh - var(--wm-header))",
    "main.wm-dashboard-shell.wm-dashboard-visual-root",
    "display: grid",
    "grid-template-columns: minmax(230px, 300px) minmax(0, 1fr)",
    "align-items: stretch",
    "overflow: hidden",
    "main.wm-dashboard-shell > .wm-dashboard-rail",
    "height: 100%",
    "main.wm-dashboard-shell .wm-dashboard-main",
    "overflow-y: auto",
    "main.wm-dashboard-shell .wm-dashboard-project-grid",
  ].forEach((marker) => {
    if (!block.includes(marker)) errors.push(`Canonical CSS missing ${marker}`);
  });
}

[
  "wm-dashboard-page",
  "wm-page",
  "wm-section-card",
  "wm-action-card",
  "wm-page-title",
  "wm-section-title",
  "wm-card-title",
  "wm-dashboard-shell",
  "wm-dashboard-rail",
  "wm-dashboard-main",
  "wm-dashboard-project-grid",
].forEach((marker) => {
  if (!dashboard.includes(marker)) errors.push(`DashboardPage.tsx missing ${marker}`);
});

["wm-ui-hero", "wm-ui-card"].forEach((marker) => {
  if (dashboard.includes(marker)) errors.push(`DashboardPage.tsx still contains obsolete visual class ${marker}`);
});

[
  "data-wingman-home-single-screen",
  "data-wingman-dashboard-primary-card",
  "data-wingman-dashboard-primary-card-row",
  "DashboardRestoreOriginalCardsSupport",
].forEach((marker) => {
  if (dashboard.includes(marker)) errors.push(`DashboardPage.tsx still contains obsolete marker ${marker}`);
  if (theme.includes(marker)) errors.push(`wingman-style-stack.css still contains obsolete marker ${marker}`);
});

if (dashboard.includes("style={") || dashboard.includes("const styles")) {
  errors.push("DashboardPage.tsx still contains inline style-driven layout.");
}

if (errors.length) {
  console.error("[dashboard-visual] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[dashboard-visual] Dashboard uses the canonical class-based two-column layout.");
