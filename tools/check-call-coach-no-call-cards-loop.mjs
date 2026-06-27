import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const candidateFiles = [
  "src/wingman2/pages/NavigationHubPages.tsx",
  "src/wingman2/pages/CallCardsPage.tsx",
  "src/wingman2/pages/SalesHelperPage.tsx"
];

const findings = [];

for (const relative of candidateFiles) {
  const absolute = path.join(root, relative);

  if (!fs.existsSync(absolute)) {
    continue;
  }

  const text = fs.readFileSync(absolute, "utf8");

  if (
    /Inbound call/i.test(text) &&
    /\/wingman\/call-cards/i.test(text)
  ) {
    findings.push(`${relative}: inbound/live-call card still links to /wingman/call-cards`);
  }

  if (
    /Call Coach/i.test(text) &&
    /Live call cards/i.test(text) &&
    /\/wingman\/call-cards/i.test(text)
  ) {
    findings.push(`${relative}: Call Coach still exposes the old Live Call Cards loop`);
  }
}

if (findings.length > 0) {
  console.error("[call-coach-no-loop] Failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("[call-coach-no-loop] Verified Call Coach no longer loops back to Live Call Cards.");