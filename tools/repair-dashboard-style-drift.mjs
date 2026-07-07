import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const dashboardPath = path.join(root, "src/wingman2/pages/DashboardPage.tsx");
const themePath = path.join(root, "src/wingman2/styles/wingman-style-stack.css");
const checkPath = path.join(root, "tools/check-dashboard-visual-correction.mjs");

const start = "/* === WINGMAN DASHBOARD VISUAL CORRECTION PASS START === */";
const end = "/* === WINGMAN DASHBOARD VISUAL CORRECTION PASS END === */";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function write(file, value) {
  fs.writeFileSync(file, value);
}

function ensureDashboardRootClass() {
  let dashboard = fs.readFileSync(dashboardPath, "utf8");

  if (dashboard.includes("wm-dashboard-visual-root")) {
    console.log("[dashboard-drift] Dashboard root class already present.");
    return;
  }

  if (!dashboard.includes("wm-ui-page")) {
    throw new Error("DashboardPage.tsx does not contain wm-ui-page. Run page markup migration first.");
  }

  dashboard = dashboard.replace(/\bwm-ui-page\b/, "wm-ui-page wm-dashboard-visual-root");
  write(dashboardPath, dashboard);

  console.log("[dashboard-drift] Added wm-dashboard-visual-root to DashboardPage.tsx.");
}

function replaceDashboardCssBlock() {
  let theme = fs.readFileSync(themePath, "utf8");

  const blockPattern = new RegExp(`${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}`, "g");
  const beforeRemoval = theme;
  theme = theme.replace(blockPattern, "").trimEnd();

  if (beforeRemoval !== theme) {
    console.log("[dashboard-drift] Removed existing Dashboard correction block(s).");
  } else {
    console.log("[dashboard-drift] No existing Dashboard correction block found.");
  }

  if (theme.includes('html[data-wingman-route="dashboard"]')) {
    throw new Error('wingman-style-stack.css still contains html[data-wingman-route="dashboard"]. Remove the old route-scoped dashboard block before continuing.');
  }

  const block = `
${start}

/*
   Dashboard correction objective:
   - Use a component root class, not route-data selectors.
   - Do not introduce rgb(), rgba(), hex colours, or page-section route selectors.
   - Improve dashboard readability, card hierarchy, and button proportions.
*/

.wm-dashboard-visual-root {
  --wm-dashboard-border-subtle: color-mix(in srgb, var(--wm-aqua) 18%, transparent);
  --wm-dashboard-border-medium: color-mix(in srgb, var(--wm-aqua) 32%, transparent);
  --wm-dashboard-panel: color-mix(in srgb, var(--wm-card) 88%, var(--wm-bg-0));
  --wm-dashboard-panel-hover: color-mix(in srgb, var(--wm-card-soft) 88%, var(--wm-bg-0));
  --wm-dashboard-hero: linear-gradient(135deg, var(--wm-panel-soft), var(--wm-bg-1));
  --wm-dashboard-action: linear-gradient(135deg, var(--wm-aqua), var(--wm-heading-soft));
  max-width: 1860px !important;
  margin-inline: auto !important;
  color: var(--wm-text) !important;
  font-size: 16px !important;
}

.wm-dashboard-visual-root,
.wm-dashboard-visual-root p,
.wm-dashboard-visual-root li,
.wm-dashboard-visual-root span,
.wm-dashboard-visual-root button,
.wm-dashboard-visual-root a {
  font-size: 0.95rem !important;
  line-height: 1.5 !important;
}

.wm-dashboard-visual-root h1,
.wm-dashboard-visual-root .wm-ui-title {
  font-size: clamp(1.35rem, 1.15vw, 1.8rem) !important;
  line-height: 1.08 !important;
  color: var(--wm-heading) !important;
}

.wm-dashboard-visual-root h2 {
  font-size: clamp(1.08rem, 0.9vw, 1.35rem) !important;
}

.wm-dashboard-visual-root h3 {
  font-size: 1rem !important;
}

.wm-dashboard-visual-root .wm-ui-hero,
.wm-dashboard-visual-root .wm-ui-section {
  border-color: var(--wm-dashboard-border-subtle) !important;
  border-radius: 18px !important;
  box-shadow: var(--wm-shadow-panel) !important;
}

.wm-dashboard-visual-root .wm-ui-hero {
  min-height: 0 !important;
  padding: 1.15rem 1.25rem !important;
  background: var(--wm-dashboard-hero) !important;
}

.wm-dashboard-visual-root .wm-ui-card {
  border-color: var(--wm-dashboard-border-subtle) !important;
  border-radius: 16px !important;
  background: var(--wm-dashboard-panel) !important;
  box-shadow: var(--wm-shadow-card) !important;
}

.wm-dashboard-visual-root .wm-ui-card:hover {
  border-color: var(--wm-dashboard-border-medium) !important;
  background: var(--wm-dashboard-panel-hover) !important;
}

.wm-dashboard-visual-root .wm-ui-section,
.wm-dashboard-visual-root section {
  gap: 0.85rem !important;
}

.wm-dashboard-visual-root .wm-ui-button,
.wm-dashboard-visual-root button,
.wm-dashboard-visual-root a[role="button"] {
  min-height: 42px !important;
  width: auto !important;
  max-width: 100% !important;
  aspect-ratio: auto !important;
  padding: 0.65rem 0.95rem !important;
  border-radius: 12px !important;
  font-size: 0.9rem !important;
  font-weight: 750 !important;
  line-height: 1.2 !important;
}

.wm-dashboard-visual-root .wm-ui-button-primary,
.wm-dashboard-visual-root .wingman-new-project-button {
  background: var(--wm-dashboard-action) !important;
  border-color: var(--wm-dashboard-border-medium) !important;
  color: var(--wm-bg-0) !important;
}

.wm-dashboard-visual-root aside .wm-ui-card,
.wm-dashboard-visual-root [class*="assistant"] .wm-ui-card,
.wm-dashboard-visual-root [class*="coach"] .wm-ui-card,
.wm-dashboard-visual-root [class*="context"] .wm-ui-card {
  padding: 1rem !important;
}

.wm-dashboard-visual-root aside .wm-ui-button-primary,
.wm-dashboard-visual-root [class*="assistant"] .wm-ui-button-primary,
.wm-dashboard-visual-root [class*="coach"] .wm-ui-button-primary,
.wm-dashboard-visual-root [class*="context"] .wm-ui-button-primary {
  min-height: 44px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.wm-dashboard-visual-root [class*="project"] .wm-ui-card,
.wm-dashboard-visual-root [class*="Project"] .wm-ui-card {
  min-height: 132px !important;
  padding: 1rem !important;
}

.wm-dashboard-visual-root [class*="project"] .wm-ui-card .wm-ui-title,
.wm-dashboard-visual-root [class*="Project"] .wm-ui-card .wm-ui-title {
  font-size: 1rem !important;
}

.wm-dashboard-visual-root > * {
  min-height: 0 !important;
}

.wm-dashboard-visual-root [class*="min-h-[300"],
.wm-dashboard-visual-root [class*="min-h-[360"],
.wm-dashboard-visual-root [class*="min-h-[420"],
.wm-dashboard-visual-root [class*="min-h-[480"] {
  min-height: auto !important;
}

@media (min-width: 1400px) {
  .wm-dashboard-visual-root {
    font-size: 16px !important;
  }

  .wm-dashboard-visual-root .wm-ui-card {
    padding: 1.05rem !important;
  }

  .wm-dashboard-visual-root .wm-ui-hero {
    padding: 1.25rem 1.4rem !important;
  }
}

@media (max-width: 1100px) {
  .wm-dashboard-visual-root,
  .wm-dashboard-visual-root p,
  .wm-dashboard-visual-root li,
  .wm-dashboard-visual-root span {
    font-size: 0.9rem !important;
  }
}

${end}
`.trim();

  theme = `${theme}\n\n${block}\n`;

  write(themePath, theme);

  console.log("[dashboard-drift] Installed zero-drift Dashboard correction block.");
}

function updateDashboardCheck() {
  const check = `
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const themePath = path.join(root, "src/wingman2/styles/wingman-style-stack.css");
const dashboardPath = path.join(root, "src/wingman2/pages/DashboardPage.tsx");

const theme = fs.readFileSync(themePath, "utf8");
const dashboard = fs.readFileSync(dashboardPath, "utf8");

const start = "/* === WINGMAN DASHBOARD VISUAL CORRECTION PASS START === */";
const end = "/* === WINGMAN DASHBOARD VISUAL CORRECTION PASS END === */";

const startIndex = theme.indexOf(start);
const endIndex = theme.indexOf(end);

const errors = [];

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  errors.push("Dashboard correction block missing.");
} else {
  const block = theme.slice(startIndex, endIndex + end.length);

  const required = [
    "wm-dashboard-visual-root",
    ".wm-dashboard-visual-root .wm-ui-card",
    ".wm-dashboard-visual-root .wm-ui-button",
    "font-size: clamp(1.35rem",
    "min-height: 42px",
    "aspect-ratio: auto",
  ];

  const forbidden = [
    'html[data-wingman-route="dashboard"]',
    "rgba(",
    "rgb(",
  ];

  for (const item of required) {
    if (!block.includes(item)) errors.push(\`Missing \${item}\`);
  }

  for (const item of forbidden) {
    if (block.includes(item)) errors.push(\`Dashboard correction block must not contain \${item}\`);
  }
}

if (theme.includes('html[data-wingman-route="dashboard"]')) {
  errors.push('wingman-style-stack.css still contains html[data-wingman-route="dashboard"].');
}

if (!dashboard.includes("wm-dashboard-visual-root")) {
  errors.push("DashboardPage.tsx is missing wm-dashboard-visual-root.");
}

if (errors.length) {
  console.error("[dashboard-visual] FAILED:");
  errors.forEach((error) => console.error(\`- \${error}\`));
  process.exit(1);
}

console.log("[dashboard-visual] Dashboard visual correction block is installed without style-drift route selectors.");
`.trim();

  write(checkPath, `${check}\n`);

  console.log("[dashboard-drift] Updated Dashboard correction check.");
}

ensureDashboardRootClass();
replaceDashboardCssBlock();
updateDashboardCheck();

console.log("[dashboard-drift] Strict dashboard style-drift repair complete.");
