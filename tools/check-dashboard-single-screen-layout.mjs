import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const errors = [];

const requiredDashboardMarkers = [
  'className="wm-dashboard-page wm-page wingman-page-host wm-dashboard-visual-root wm-dashboard-shell"',
  'className="wm-section-card wm-dashboard-rail"',
  'className="wm-dashboard-main"',
  'className="wm-section wm-dashboard-section wm-dashboard-projects-section"',
  'className="wm-dashboard-project-grid"',
];

const requiredCssMarkers = [
  "WINGMAN DASHBOARD CANONICAL LAYOUT START",
  ".wingman-app-main > .wingman-page-host:has(> main.wm-dashboard-shell)",
  "height: calc(100dvh - var(--wm-header))",
  "grid-template-columns: minmax(230px, 300px) minmax(0, 1fr)",
  "align-items: stretch",
  "min-height: 0",
  "overflow: hidden",
  "main.wm-dashboard-shell > .wm-dashboard-rail",
  "height: 100%",
  "align-self: stretch",
  "main.wm-dashboard-shell .wm-dashboard-main",
  "overflow-y: auto",
  "@media (max-width: 1180px)",
  "grid-template-columns: minmax(0, 1fr)",
  "overflow: visible",
];

for (const marker of requiredDashboardMarkers) {
  if (!dashboard.includes(marker)) errors.push(`DashboardPage.tsx missing marker: ${marker}`);
}

for (const marker of requiredCssMarkers) {
  if (!css.includes(marker)) errors.push(`wingman-style-stack.css missing marker: ${marker}`);
}

[
  "data-wingman-home-single-screen",
  "Wingman home single-screen compact layout",
  "grid-template-columns: repeat(7, minmax(0, 1fr))",
].forEach((marker) => {
  if (dashboard.includes(marker) || css.includes(marker)) {
    errors.push(`Obsolete single-screen/seven-card marker is still present: ${marker}`);
  }
});

if (errors.length) {
  console.error("[dashboard-single-screen-layout] Check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("[dashboard-single-screen-layout] Verified Dashboard viewport-height contract and responsive one-column fallback.");
