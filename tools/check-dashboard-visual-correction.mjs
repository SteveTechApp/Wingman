import fs from "node:fs";

const dashboard = fs.readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = fs.readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const errors = [];

const requiredDashboardMarkers = [
  'data-wingman-dashboard-layout="viewport-split"',
  'data-wingman-dashboard-rail="viewport-depth"',
  'data-wingman-dashboard-main="viewport-depth"',
  "wm-dashboard-shell",
  "wm-dashboard-rail",
  "wm-dashboard-main",
  "wm-dashboard-project-grid",
];

const requiredCssMarkers = [
  "WINGMAN DASHBOARD VIEWPORT CONTRACT START",
  "grid-template-columns: minmax(280px, 0.34fr) minmax(0, 1fr)",
  "height: calc(100dvh - var(--wm-header))",
  ".wm-dashboard-rail",
  "height: 100%",
  ".wm-dashboard-main",
  "overflow-y: auto",
  "@media (max-width: 1180px)",
];

for (const marker of requiredDashboardMarkers) {
  if (!dashboard.includes(marker)) errors.push(`DashboardPage.tsx is missing ${marker}`);
}

for (const marker of requiredCssMarkers) {
  if (!css.includes(marker)) errors.push(`Dashboard CSS is missing ${marker}`);
}

const forbidden = [
  "Wingman dashboard restore original card layout",
  "data-wingman-dashboard-primary-card-row",
  "data-wingman-home-single-screen",
];

for (const marker of forbidden) {
  if (css.includes(marker)) errors.push(`Legacy Dashboard CSS marker remains: ${marker}`);
}

if (errors.length) {
  console.error("[dashboard-visual] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[dashboard-visual] Current two-column viewport Dashboard contract is installed.");