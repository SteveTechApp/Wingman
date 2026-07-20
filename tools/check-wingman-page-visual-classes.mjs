import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targetFiles = [
  "src/wingman2/pages/DashboardPage.tsx",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/RecommendationsPage.tsx",
  "src/wingman2/pages/ProductFamilyPage.tsx",
  "src/wingman2/pages/ProductPitchPage.tsx",
  "src/wingman2/pages/ProposalPage.tsx",
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/pages/TemplatesPage.tsx",
  "src/wingman2/pages/VideowallBuilderPage.tsx",
  "src/wingman2/pages/ProjectsPage.tsx",
  "src/wingman2/pages/ProjectDetailPage.tsx",
  "src/wingman2/pages/ProductCallCardsPage.tsx",
  "src/wingman2/pages/CatalogBrowserPage.tsx",
];

const baselinePath = path.join(root, "tools", "wingman-page-visual-classes-baseline.json");
const updateBaseline = process.argv.includes("--update-baseline");

const utilityPattern =
  /\b(?:text|bg|border|ring|outline|from|via|to)-(?:\[[^\]]+\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?)(?:\/\d+)?\b/g;

function scanFile(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    return { file: relativePath, count: 0, missing: true };
  }

  const text = fs.readFileSync(absolutePath, "utf8");
  const matches = text.match(utilityPattern) ?? [];

  return {
    file: relativePath,
    count: matches.length,
    sample: [...new Set(matches)].slice(0, 12),
  };
}

const results = targetFiles.map(scanFile);
const total = results.reduce((sum, result) => sum + result.count, 0);

for (const result of results) {
  console.log(`[visual-class-drift] ${result.file}: ${result.count}${result.sample?.length ? ` (${result.sample.join(", ")})` : ""}`);
}

if (updateBaseline) {
  const baseline = {
    updatedAt: new Date().toISOString(),
    rule: "Maximum allowed hard-coded visual colour utility count in migrated Wingman page files.",
    total,
    files: Object.fromEntries(results.map((result) => [result.file, result.count])),
  };

  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`[visual-class-drift] Baseline updated: ${path.relative(root, baselinePath)} total=${total}`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`[visual-class-drift] Missing baseline: ${path.relative(root, baselinePath)}`);
  console.error("[visual-class-drift] Run: npm run audit:page-visual-classes:baseline");
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const failures = [];

if (total > baseline.total) {
  failures.push(`total ${total} > baseline ${baseline.total}`);
}

for (const result of results) {
  const allowed = baseline.files?.[result.file];
  if (typeof allowed === "number" && result.count > allowed) {
    failures.push(`${result.file}: ${result.count} > baseline ${allowed}`);
  }
}

if (failures.length) {
  console.error("[visual-class-drift] FAILED:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[visual-class-drift] OK. total=${total}, baseline=${baseline.total}`);