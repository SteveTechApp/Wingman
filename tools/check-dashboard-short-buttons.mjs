import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");
const errors = [];

const shortLabels = [...dashboard.matchAll(/data-wingman-dashboard-short-label="([^"]+)"/g)].map((match) => match[1]);

if (shortLabels.join(",") !== "Discover,Compare") {
  errors.push(`Expected short labels Discover,Compare on visible rail actions; found ${shortLabels.join(",") || "none"}.`);
}

[
  "Start guided discovery",
  "Compare a competitor",
  "wm-dashboard-rail-actions",
  "wm-dashboard-action-button",
].forEach((marker) => {
  if (!dashboard.includes(marker)) errors.push(`DashboardPage.tsx missing short-button marker: ${marker}`);
});

[
  "main.wm-dashboard-shell .wm-dashboard-rail-actions",
  "grid-template-columns: 1fr",
  "main.wm-dashboard-shell .wm-dashboard-action-button",
].forEach((marker) => {
  if (!css.includes(marker)) errors.push(`wingman-style-stack.css missing short-button marker: ${marker}`);
});

[
  "DASHBOARD_SHORT_BUTTON_COPY",
  "DashboardShortButtonSupport",
  "data-wingman-dashboard-tooltip",
  "Wingman dashboard short-button tooltip layout",
].forEach((marker) => {
  if (dashboard.includes(marker) || css.includes(marker)) {
    errors.push(`Obsolete short-button marker is still present: ${marker}`);
  }
});

if (errors.length) {
  console.error("[dashboard-short-buttons] Check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("[dashboard-short-buttons] Verified visible compact rail button labels.");
