import fs from "node:fs";

const dashboard = fs.readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = fs.readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const errors = [];

const required = [
  "const destinations",
  "wm-dashboard-grid",
  "wm-dashboard-destination-card",
  "wm-dashboard-project-grid",
  "export function DashboardPage",
  "export default DashboardPage",
];

for (const marker of required) {
  if (!dashboard.includes(marker) && !css.includes(marker)) {
    errors.push(`Missing current Dashboard marker: ${marker}`);
  }
}

const forbidden = [
  "data-wingman-dashboard-primary-card-row",
  "data-wingman-dashboard-primary-card",
  "data-wingman-dashboard-duplicate-card",
  "grid-template-columns: repeat(7, minmax(0, 1fr))",
  "Wingman dashboard restore original card layout",
];

for (const marker of forbidden) {
  if (dashboard.includes(marker) || css.includes(marker)) {
    errors.push(`Obsolete Dashboard contract remains: ${marker}`);
  }
}

if (errors.length) {
  console.error("[dashboard-original-card-layout] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[dashboard-original-card-layout] Verified the current Dashboard cards without the obsolete seven-card contract.");