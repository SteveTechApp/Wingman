import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");
const errors = [];

[
  "export function DashboardPage",
  "export default DashboardPage",
  "wm-dashboard-rail-actions",
  "wm-dashboard-action-button",
  "data-wingman-dashboard-primary-button=\"true\"",
  "data-wingman-dashboard-short-label=\"Discover\"",
  "data-wingman-dashboard-short-label=\"Compare\"",
].forEach((marker) => {
  if (!dashboard.includes(marker)) errors.push(`DashboardPage.tsx missing compact button marker: ${marker}`);
});

[
  "main.wm-dashboard-shell .wm-dashboard-action-button",
  "min-height: 2.75rem",
  "padding: 0.68rem 0.9rem",
  "@media (max-width: 760px)",
  "grid-template-columns: 1fr",
].forEach((marker) => {
  if (!css.includes(marker)) errors.push(`wingman-style-stack.css missing compact button marker: ${marker}`);
});

[
  "DASHBOARD_COMPACT_BUTTONS",
  "DashboardCompactButtonSupport",
  "data-wingman-dashboard-tooltip",
  "data-wingman-dashboard-kicker",
  "Wingman dashboard compact button copy and tooltips",
].forEach((marker) => {
  if (dashboard.includes(marker) || css.includes(marker)) {
    errors.push(`Obsolete compact-button marker is still present: ${marker}`);
  }
});

if (errors.length) {
  console.error("[dashboard-compact-buttons] Check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("[dashboard-compact-buttons] Verified compact visible Dashboard rail actions.");
