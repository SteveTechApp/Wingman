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

  if (relative.endsWith("CallCardsPage.tsx")) {
    if (!text.includes('to="/wingman/call-coach"')) {
      findings.push(`${relative}: old call-cards route should redirect to Call Coach.`);
    }
    continue;
  }

  if (/\/wingman\/call-cards/i.test(text)) {
    findings.push(`${relative}: visible UI still links to /wingman/call-cards`);
  }

  if (/title:\s*"Inbound call"/i.test(text) || /Live call cards/i.test(text)) {
    findings.push(`${relative}: visible UI still exposes the redundant live-call card.`);
  }
}

if (findings.length > 0) {
  console.error("[call-coach-no-loop] Failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("[call-coach-no-loop] Verified Call Coach no longer loops to Live Call Cards and old Call Cards route redirects safely.");