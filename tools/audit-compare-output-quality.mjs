import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const candidateFiles = [
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/lib/compareEligibilityEngine.ts",
  "src/wingman2/lib/competitorCompareProfiles.ts",
  "src/wingman2/lib/knownCompetitorProfiles.ts",
  "src/wingman2/lib/compareRecommendationCopy.ts",
  "src/wingman2/lib/compareOutputLanguage.ts"
];

const bannedPhrases = [
  ["Where it matches", "Use a specific heading such as Strong fit areas."],
  ["Where it does not match", "Use Important differences or Commercial gap."],
  ["Other viable options", "Use Other related WyreStorm options only when genuinely related."],
  ["Wrong-product avoidance", "Internal engineering wording, not suitable for sales users."],
  ["Next question:", "Use Check before quoting."],
  ["network ready for the required bandwidth, switching and controller expectations", "Too vague for non-technical sales output."],
  ["keep the recommendation tied to the customer workflow", "Internal reasoning, not customer-safe comparison output."]
];

const failures = [];

for (const relativePath of candidateFiles) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  const text = fs.readFileSync(filePath, "utf8");

  for (const [phrase, reason] of bannedPhrases) {
    const index = text.indexOf(phrase);

    if (index === -1) {
      continue;
    }

    const line = text.slice(0, index).split(/\r?\n/).length;
    failures.push(`${relativePath}:${line} contains "${phrase}" — ${reason}`);
  }
}

if (failures.length) {
  console.error("[compare-output-quality] Check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[compare-output-quality] Compare output language guard passed.");