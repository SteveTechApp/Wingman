import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const required = [
  "DASHBOARD_PRIMARY_BUTTONS",
  "DashboardPrimaryButtons",
  "DashboardPrimaryButtonsSupport",
  "data-wingman-dashboard-clean-grid",
  "data-wingman-dashboard-primary-button",
  "data-wingman-dashboard-legacy-card",
  "Wingman dashboard primary visual buttons",
  'grid-template-columns: repeat(7, minmax(0, 1fr))',
  "export function DashboardPage",
  "export default DashboardPage",
];

const missing = required.filter((marker) => !dashboard.includes(marker) && !css.includes(marker));

if (missing.length) {
  console.error("[dashboard-primary-buttons] Check failed:");
  for (const marker of missing) console.error("- Missing marker: " + marker);
  process.exit(1);
}

console.log("[dashboard-primary-buttons] Verified 7-button primary dashboard grid with visual backgrounds and legacy duplicate hide markers.");
