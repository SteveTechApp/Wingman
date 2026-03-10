import fs from "node:fs";
import path from "node:path";

const filesToCheck = [
  "src/core/wingman/routeMap.ts",
  "src/features/tools/toolFeatureModel.ts",
  "src/app/navigation/nav.data.ts",
  "src/app/routes/navConfig.ts",
  "src/app/routing/routes.ts",
  "src/app/shell/ToolsLayout.tsx",
  "src/components/app/tools/ToolGrid.tsx",
  "src/features/tools/TemplatesPage.tsx",
  "src/features/dashboard/dashboardIntelligence.ts",
  "src/features/catalog/catalogIntelligence.ts",
  "src/features/discovery/discoveryStore.ts",
  "src/features/misc/ProfilePage.tsx",
  "src/features/compare/CompetitorComparePage.tsx",
  "src/features/misc/VideoWallPlannerPage.tsx",
];

const deprecatedPatterns = [
  { label: "legacy /app/toolhub", regex: /\/app\/toolhub\b/g },
  { label: "legacy /app/catalogue", regex: /\/app\/catalogue\b/g },
  { label: "legacy /app/guru", regex: /\/app\/guru\b/g },
  { label: "legacy /app/training", regex: /\/app\/training\b/g },
  { label: "legacy /app/survey-import", regex: /\/app\/survey-import\b/g },
  { label: "typo /app/app/tools", regex: /\/app\/app\/tools\//g },
  { label: "legacy competitor route", regex: /\/app\/tools\/competitor(?:-compare|s)?\b/g },
  { label: "legacy room route", regex: /\/app\/tools\/room(?!-wizard)\b/g },
  { label: "legacy /roomwizard route", regex: /\/app\/tools\/roomwizard\b/g },
  { label: "legacy /room-designer route", regex: /\/app\/tools\/room-designer\b/g },
  { label: "legacy /proposals route", regex: /\/app\/tools\/proposals\b/g },
  { label: "legacy /videowall route", regex: /\/app\/tools\/videowall\b/g },
];

const issues = [];

for (const relativeFile of filesToCheck) {
  const fullPath = path.resolve(process.cwd(), relativeFile);
  if (!fs.existsSync(fullPath)) {
    issues.push({ file: relativeFile, line: 1, reason: "Missing file in route check list" });
    continue;
  }

  const text = fs.readFileSync(fullPath, "utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    for (const pattern of deprecatedPatterns) {
      if (pattern.regex.test(lineText)) {
        issues.push({
          file: relativeFile,
          line: index + 1,
          reason: pattern.label,
          text: lineText.trim(),
        });
      }
      pattern.regex.lastIndex = 0;
    }
  });
}

if (issues.length > 0) {
  console.error("Route integrity check failed. Deprecated or invalid paths were found:\n");
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} | ${issue.reason}`);
    if (issue.text) {
      console.error(`  ${issue.text}`);
    }
  }
  process.exit(1);
}

console.log(`Route integrity check passed (${filesToCheck.length} files).`);
