import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");
const source = `${dashboard}\n${css}`;

const errors = [];

[
  "export function DashboardPage",
  "export default DashboardPage",
  "wm-dashboard-shell",
  "wm-dashboard-rail",
  "wm-dashboard-main",
  "wm-dashboard-projects-section",
  "wm-dashboard-project-grid",
  "WINGMAN DASHBOARD CANONICAL LAYOUT START",
  "grid-template-columns: minmax(230px, 300px) minmax(0, 1fr)",
  "main.wm-dashboard-shell .wm-dashboard-grid",
  "main.wm-dashboard-shell .wm-dashboard-project-grid",
].forEach((marker) => {
  if (!source.includes(marker)) errors.push(`Missing current Dashboard contract marker: ${marker}`);
});

[
  "DashboardRestoreOriginalCardsSupport",
  "DASHBOARD_RESTORE_ROUTE_MAP",
  "data-wingman-dashboard-primary-card-row",
  "data-wingman-dashboard-primary-card",
  "data-wingman-dashboard-duplicate-card",
  "Wingman dashboard restore original card layout",
  "grid-template-columns: repeat(7, minmax(0, 1fr))",
].forEach((marker) => {
  if (source.includes(marker)) errors.push(`Obsolete original-card marker must not return: ${marker}`);
});

if (errors.length) {
  console.error("[dashboard-original-card-layout] Check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("[dashboard-original-card-layout] Verified current two-column Dashboard contract and no seven-card restore.");
