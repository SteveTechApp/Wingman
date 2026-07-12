import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dashboardPath = path.join(root, "src/wingman2/pages/DashboardPage.tsx");
const themePath = path.join(root, "src/wingman2/styles/wingman-style-stack.css");

const canonicalStart = "/* === WINGMAN DASHBOARD CANONICAL LAYOUT START === */";
const canonicalEnd = "/* === WINGMAN DASHBOARD CANONICAL LAYOUT END === */";

const obsoleteCssPatterns = [
  /\/\* === WINGMAN DASHBOARD VISUAL CORRECTION PASS START === \*\/[\s\S]*?\/\* === WINGMAN DASHBOARD VISUAL CORRECTION PASS END === \*\/\r?\n?/g,
  /\/\* WINGMAN DASHBOARD WORKFLOW MENU START \*\/[\s\S]*?\/\* WINGMAN DASHBOARD WORKFLOW MENU END \*\/\r?\n?/g,
  /\/\* WINGMAN DASHBOARD MENU LAYOUT REPAIR START \*\/[\s\S]*?\/\* WINGMAN DASHBOARD MENU LAYOUT REPAIR END \*\/\r?\n?/g,
  /\/\* === Wingman home single-screen compact layout === \*\/[\s\S]*?\/\* === End Wingman dashboard restore original card layout === \*\/\r?\n?/g,
  /\r?\n\.wm-dashboard-page \.wm-ui-card,[\s\S]*?(?=\r?\n\.wingman-page-host h1,)/g,
];

const obsoleteMarkers = [
  "data-wingman-home-single-screen",
  "data-wingman-dashboard-primary-card",
  "data-wingman-dashboard-primary-card-row",
  "DashboardRestoreOriginalCardsSupport",
  "DASHBOARD_RESTORE_ROUTE_MAP",
  "WINGMAN DASHBOARD WORKFLOW MENU START",
  "WINGMAN DASHBOARD MENU LAYOUT REPAIR START",
  "Wingman dashboard restore original card layout",
];

function writeIfChanged(file, before, after) {
  if (before === after) return false;
  fs.writeFileSync(file, after);
  return true;
}

function ensureDashboardRootClass() {
  const before = fs.readFileSync(dashboardPath, "utf8");
  let dashboard = before;

  if (!dashboard.includes("wm-dashboard-shell")) {
    throw new Error("DashboardPage.tsx is missing wm-dashboard-shell; restore the current Dashboard root markup first.");
  }

  if (!dashboard.includes("wm-dashboard-visual-root")) {
    dashboard = dashboard.replace(/\bwm-dashboard-shell\b/, "wm-dashboard-visual-root wm-dashboard-shell");
  }

  if (!dashboard.includes("wm-page")) {
    dashboard = dashboard.replace(/\bwm-dashboard-page\b/, "wm-dashboard-page wm-page");
  }

  const changed = writeIfChanged(dashboardPath, before, dashboard);
  console.log(changed ? "[dashboard-drift] Repaired Dashboard root classes." : "[dashboard-drift] Dashboard root classes already current.");
}

function removeObsoleteCssBlocks() {
  const before = fs.readFileSync(themePath, "utf8");
  let theme = before;

  for (const pattern of obsoleteCssPatterns) {
    theme = theme.replace(pattern, "");
  }

  const changed = writeIfChanged(themePath, before, theme);
  console.log(changed ? "[dashboard-drift] Removed obsolete Dashboard CSS blocks." : "[dashboard-drift] No obsolete Dashboard CSS blocks found.");
}

function verifyCurrentContract() {
  const dashboard = fs.readFileSync(dashboardPath, "utf8");
  const theme = fs.readFileSync(themePath, "utf8");
  const errors = [];

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

  const startIndex = theme.indexOf(canonicalStart);
  const endIndex = theme.indexOf(canonicalEnd, startIndex);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    errors.push("Canonical Dashboard layout block is missing.");
  } else {
    const block = theme.slice(startIndex, endIndex + canonicalEnd.length);
    [
      "main.wm-dashboard-shell.wm-dashboard-visual-root",
      "height: calc(100dvh - var(--wm-header))",
      "align-items: stretch",
      "overflow: hidden",
      "main.wm-dashboard-shell > .wm-dashboard-rail",
      "main.wm-dashboard-shell .wm-dashboard-main",
      "overflow-y: auto",
    ].forEach((marker) => {
      if (!block.includes(marker)) errors.push(`Canonical Dashboard block missing ${marker}`);
    });
  }

  const combined = `${dashboard}\n${theme}`;
  obsoleteMarkers.forEach((marker) => {
    if (combined.includes(marker)) errors.push(`Obsolete Dashboard marker remains: ${marker}`);
  });

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
}

ensureDashboardRootClass();
removeObsoleteCssBlocks();
verifyCurrentContract();

console.log("[dashboard-drift] Dashboard style drift repair completed against the current class contract.");
