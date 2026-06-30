import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const themePath = path.join(root, "src/wingman2/styles/wingman-redesign-theme.css");
const dashboardPath = path.join(root, "src/wingman2/pages/DashboardPage.tsx");

const theme = fs.readFileSync(themePath, "utf8");
const dashboard = fs.readFileSync(dashboardPath, "utf8");

const start = "/* === WINGMAN DASHBOARD VISUAL CORRECTION PASS START === */";
const end = "/* === WINGMAN DASHBOARD VISUAL CORRECTION PASS END === */";

const startIndex = theme.indexOf(start);
const endIndex = theme.indexOf(end, startIndex);

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
    if (!block.includes(item)) errors.push(`Missing ${item}`);
  }

  for (const item of forbidden) {
    if (block.includes(item)) errors.push(`Dashboard correction block must not contain ${item}`);
  }
}

if (theme.includes('html[data-wingman-route="dashboard"]')) {
  errors.push('wingman-redesign-theme.css still contains html[data-wingman-route="dashboard"].');
}

if (!dashboard.includes("wm-dashboard-visual-root")) {
  errors.push("DashboardPage.tsx is missing wm-dashboard-visual-root.");
}

if (errors.length) {
  console.error("[dashboard-visual] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[dashboard-visual] Dashboard visual correction block is installed without route-scoped dashboard drift.");