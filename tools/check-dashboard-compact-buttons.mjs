import { readFileSync } from "node:fs";

const dashboard = readFileSync(
  "src/wingman2/pages/DashboardPage.tsx",
  "utf8",
);

const css = readFileSync(
  "src/wingman2/styles/wingman-style-stack.css",
  "utf8",
);

const errors = [];

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) {
    errors.push(`${label} missing compact button marker: ${marker}`);
  }
}

function forbidMarker(source, marker) {
  if (source.includes(marker)) {
    errors.push(`Obsolete compact-button marker is still present: ${marker}`);
  }
}

[
  "export function DashboardPage",
  "export default DashboardPage",
  "wm-dashboard-rail-actions",
  "wm-dashboard-action-button",
  'data-wingman-dashboard-primary-button="true"',
  'data-wingman-dashboard-short-label="Discover"',
  'data-wingman-dashboard-short-label="Compare"',
].forEach((marker) => {
  requireMarker("DashboardPage.tsx", dashboard, marker);
});

[
  ".wm-dashboard-rail-actions",
  "display: grid",
  "gap: 0.65rem",
  ".wm-dashboard-action-button",
  "width: 100%",
  "min-height: 42px",
  "@media (max-width: 760px)",
].forEach((marker) => {
  requireMarker("wingman-style-stack.css", css, marker);
});

[
  "main.wm-dashboard-shell .wm-dashboard-action-button",
  "padding: 0.68rem 0.9rem",
  "DASHBOARD_COMPACT_BUTTONS",
  "DashboardCompactButtonSupport",
  "data-wingman-dashboard-tooltip",
  "data-wingman-dashboard-kicker",
  "Wingman dashboard compact button copy and tooltips",
].forEach((marker) => {
  forbidMarker(dashboard, marker);
  forbidMarker(css, marker);
});

if (errors.length) {
  console.error("[dashboard-compact-buttons] Check failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  "[dashboard-compact-buttons] Verified current compact Dashboard rail actions.",
);