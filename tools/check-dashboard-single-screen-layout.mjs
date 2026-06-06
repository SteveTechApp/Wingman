import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const required = [
  "data-wingman-home-single-screen",
  "Wingman home single-screen compact layout",
  "grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))",
  "@media (max-height: 760px)",
];

const missing = required.filter((marker) => !dashboard.includes(marker) && !css.includes(marker));

if (missing.length) {
  console.error("[dashboard-single-screen-layout] Check failed:");
  for (const marker of missing) console.error("- Missing marker: " + marker);
  process.exit(1);
}

console.log("[dashboard-single-screen-layout] Verified compact single-screen /wingman dashboard layout markers.");
