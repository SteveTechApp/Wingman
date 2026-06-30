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
    ".wm-dashboard-shell",
    ".wm-dashboard-rail",
    ".wm-dashboard-main",
    ".wm-dashboard-grid",
    ".wm-dashboard-project-grid",
    ".wm-dashboard-action-button",
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

if (dashboard.includes("style={") || dashboard.includes("const styles")) {
  errors.push("DashboardPage.tsx still contains inline style-driven layout.");
}

if (!dashboard.includes("wm-dashboard-shell") || !dashboard.includes("wm-dashboard-project-grid")) {
  errors.push("DashboardPage.tsx is missing class-based Dashboard layout markup.");
}

if (errors.length) {
  console.error("[dashboard-visual] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[dashboard-visual] Dashboard component uses class-based visual layout.");