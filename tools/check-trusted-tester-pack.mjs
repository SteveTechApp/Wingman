import fs from "node:fs";

const requiredFiles = [
  "docs/trusted-testing/README.md",
  "docs/trusted-testing/tester-scenarios.md",
  "docs/trusted-testing/feedback-form.md",
  "docs/trusted-testing/known-limitations.md",
  "docs/trusted-testing/release-checklist.md",
  "docs/trusted-testing/internal-tester-invite.md",
  "docs/dev-passes/product-pitch-safety-story.md",
  "docs/dev-passes/discovery-handoff-evidence.md",
  "docs/dev-passes/trusted-tester-scenario-validation.md",
];

const requiredScenarioMarkers = [
  "Sports bar",
  "BYOD boardroom",
  "Education classroom",
  "LCD video wall",
  "Competitor compare guardrail",
];

const requiredSafetyMarkerGroups = [
  ["not a final quoting tool", "not yet a final quoting tool"],
  ["not a finished quoting or design tool", "not yet a finished quoting or design tool"],
  ["pre-sales review", "presales review", "pre sales review"],
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));

if (missingFiles.length) {
  console.error("[trusted-tester-pack] Missing required files:");
  for (const file of missingFiles) console.error(`- ${file}`);
  process.exit(1);
}

const scenarios = fs.readFileSync("docs/trusted-testing/tester-scenarios.md", "utf8");
const readme = fs.readFileSync("docs/trusted-testing/README.md", "utf8");
const limitations = fs.readFileSync("docs/trusted-testing/known-limitations.md", "utf8");
const invite = fs.readFileSync("docs/trusted-testing/internal-tester-invite.md", "utf8");

const missingScenarios = requiredScenarioMarkers.filter((marker) => !scenarios.includes(marker));

if (missingScenarios.length) {
  console.error("[trusted-tester-pack] Missing scenario markers:");
  for (const marker of missingScenarios) console.error(`- ${marker}`);
  process.exit(1);
}

const combinedSafetyText = `${readme}\n${limitations}\n${invite}`.toLowerCase();

const missingSafetyGroups = requiredSafetyMarkerGroups.filter(
  (group) => !group.some((marker) => combinedSafetyText.includes(marker)),
);

if (missingSafetyGroups.length) {
  console.error("[trusted-tester-pack] Missing tester-safety positioning marker groups:");
  for (const group of missingSafetyGroups) {
    console.error(`- one of: ${group.join(" | ")}`);
  }
  process.exit(1);
}

console.log("[trusted-tester-pack] Trusted tester docs, scenario pack and safety positioning verified.");