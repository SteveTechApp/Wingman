import fs from "node:fs";

const dashboard = fs.readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");
const css = fs.readFileSync("src/wingman2/styles/wingman-style-stack.css", "utf8");

const required = [
  'data-wingman-dashboard-layout="viewport-split"',
  'data-wingman-dashboard-rail="viewport-depth"',
  'data-wingman-dashboard-main="viewport-depth"',
  "height: calc(100dvh - var(--wm-header))",
  "align-items: stretch",
  "overflow: hidden",
  "@media (max-width: 1180px)",
  "height: auto",
  "overflow: visible",
];

const missing = required.filter(
  (marker) => !dashboard.includes(marker) && !css.includes(marker),
);

if (missing.length) {
  console.error("[dashboard-single-screen-layout] Check failed:");
  missing.forEach((marker) => console.error(`- Missing marker: ${marker}`));
  process.exit(1);
}

console.log("[dashboard-single-screen-layout] Verified viewport-depth desktop layout and responsive natural scrolling.");