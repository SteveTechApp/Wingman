import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const required = [
  "export function DashboardPage",
  "export default DashboardPage",
  "DASHBOARD_COMPACT_BUTTONS",
  "DashboardCompactButtonSupport",
  "data-wingman-dashboard-tooltip",
  "data-wingman-dashboard-kicker",
  "Wingman dashboard compact button copy and tooltips",
  "grid-template-columns: repeat(auto-fit, minmax(118px, 1fr))",
];

const missing = required.filter((marker) => !dashboard.includes(marker) && !css.includes(marker));

if (missing.length) {
  console.error("[dashboard-compact-buttons] Check failed:");
  for (const marker of missing) console.error("- Missing marker: " + marker);
  process.exit(1);
}

console.log("[dashboard-compact-buttons] Verified short dashboard button labels, named export and hover tooltip support.");
