import fs from "node:fs";

const cssPath = "src/wingman2/styles/wingman-style-stack.css";
const dashboardPath = "src/wingman2/pages/DashboardPage.tsx";

const css = fs.readFileSync(cssPath, "utf8");
const dashboard = fs.readFileSync(dashboardPath, "utf8");

const errors = [];

if (!css.includes("WINGMAN DASHBOARD VIEWPORT CONTRACT START")) {
  errors.push("Canonical Dashboard viewport contract is missing.");
}

if (!dashboard.includes('data-wingman-dashboard-layout="viewport-split"')) {
  errors.push("Dashboard viewport layout marker is missing.");
}

for (const legacy of [
  "Wingman dashboard restore original card layout",
  "data-wingman-home-single-screen",
  "data-wingman-dashboard-primary-card-row",
]) {
  if (css.includes(legacy)) {
    errors.push(`Legacy Dashboard styling remains: ${legacy}`);
  }
}

if (errors.length) {
  console.error("[dashboard-drift] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  console.error("Run repair-dashboard-guru-regressions.ps1 from the repository root.");
  process.exit(1);
}

console.log("[dashboard-drift] Dashboard styling is already canonical; no mutation was required.");