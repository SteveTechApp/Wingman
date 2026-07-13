import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");

const errors = [];

[
  "type DashboardDestination",
  "type DashboardProject",
  "const destinations: DashboardDestination[]",
  "const fallbackProjects: DashboardProject[]",
  "export function DashboardPage",
  "export default DashboardPage",
].forEach((marker) => {
  if (!dashboard.includes(marker)) errors.push(`Missing typed Dashboard marker: ${marker}`);
});

[
  "DashboardElementTypingSupport",
  "DashboardRestoreOriginalCardsSupport",
  "as HTMLAnchorElement[]",
  "const foundCards: Element[] = []",
].forEach((marker) => {
  if (dashboard.includes(marker)) errors.push(`Obsolete source-only typing marker still present: ${marker}`);
});

if (errors.length) {
  console.error("[dashboard-element-typing] Check failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log("[dashboard-element-typing] Verified Dashboard data is typed without source-only DOM marker helpers.");
