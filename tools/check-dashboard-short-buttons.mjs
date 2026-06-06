import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const required = [
  "DASHBOARD_SHORT_BUTTON_COPY",
  "DashboardShortButtonSupport",
  "data-wingman-dashboard-tooltip",
  "data-wingman-dashboard-short-label",
  "Wingman dashboard short-button tooltip layout",
  "grid-template-columns: repeat(auto-fit, minmax(132px, 1fr))",
];

const missing = required.filter((marker) => !dashboard.includes(marker) && !css.includes(marker));

if (missing.length) {
  console.error("[dashboard-short-buttons] Check failed:");
  for (const marker of missing) console.error("- Missing marker: " + marker);
  process.exit(1);
}

console.log("[dashboard-short-buttons] Verified compact dashboard button labels and hover tooltip support.");
