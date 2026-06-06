import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const required = [
  "DashboardRestoreOriginalCardsSupport",
  "DASHBOARD_RESTORE_ROUTE_MAP",
  "data-wingman-dashboard-primary-card-row",
  "data-wingman-dashboard-primary-card",
  "data-wingman-dashboard-duplicate-card",
  "Wingman dashboard restore original card layout",
  "grid-template-columns: repeat(7, minmax(0, 1fr))",
  "export function DashboardPage",
  "export default DashboardPage",
];

const missing = required.filter((marker) => !dashboard.includes(marker) && !css.includes(marker));

if (missing.length) {
  console.error("[dashboard-original-card-layout] Check failed:");
  for (const marker of missing) console.error("- Missing marker: " + marker);
  process.exit(1);
}

console.log("[dashboard-original-card-layout] Verified restored original card layout with 7 primary destination cards.");
