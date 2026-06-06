import { readFileSync } from "node:fs";

const dashboard = readFileSync("src/wingman2/pages/DashboardPage.tsx", "utf8");

const required = [
  "const foundCards: Element[] = []",
  "as HTMLAnchorElement[]",
  "DashboardRestoreOriginalCardsSupport",
  "export function DashboardPage",
  "export default DashboardPage",
];

const missing = required.filter((marker) => !dashboard.includes(marker));

if (missing.length) {
  console.error("[dashboard-element-typing] Check failed:");
  for (const marker of missing) console.error("- Missing marker: " + marker);
  process.exit(1);
}

console.log("[dashboard-element-typing] Verified DashboardPage DOM helper typing and exports.");
