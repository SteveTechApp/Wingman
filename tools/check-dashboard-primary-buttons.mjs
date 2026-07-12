import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const errors = [];
const primaryButtonCount = (dashboard.match(/data-wingman-dashboard-primary-button="true"/g) ?? []).length;

if (primaryButtonCount !== 2) {
  errors.push(`Expected exactly 2 visible Dashboard primary rail buttons; found ${primaryButtonCount}.`);
}

[
  "Start guided discovery",
  "Compare a competitor",
  "routeCatalogByKey.discovery.path",
  "routeCatalogByKey.compare.path",
  "wm-dashboard-action-button",
  "data-wingman-dashboard-short-label=\"Discover\"",
  "data-wingman-dashboard-short-label=\"Compare\"",
].forEach((marker) => {
  if (!dashboard.includes(marker)) errors.push(`DashboardPage.tsx missing primary button marker: ${marker}`);
});

[
  "main.wm-dashboard-shell .wm-dashboard-action-button",
  "min-height: 2.75rem",
  "aspect-ratio: auto",
].forEach((marker) => {
  if (!css.includes(marker)) errors.push(`wingman-style-stack.css missing primary button marker: ${marker}`);
});

[
  "DASHBOARD_PRIMARY_BUTTONS",
  "DashboardPrimaryButtons",
  "DashboardPrimaryButtonsSupport",
  "data-wingman-dashboard-clean-grid",
  "data-wingman-dashboard-legacy-card",
  "grid-template-columns: repeat(7, minmax(0, 1fr))",
].forEach((marker) => {
  if (dashboard.includes(marker) || css.includes(marker)) {
    errors.push(`Obsolete primary-button marker is still present: ${marker}`);
  }
});

if (errors.length) {
  console.error("[dashboard-primary-buttons] Check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("[dashboard-primary-buttons] Verified current visible Dashboard primary actions.");
