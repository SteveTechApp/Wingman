import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredPages = [
  "src/wingman2/pages/DashboardPage.tsx",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/FinderPage.tsx",
  "src/wingman2/pages/ProductFamilyPage.tsx",
  "src/wingman2/pages/ProductPitchPage.tsx",
  "src/wingman2/pages/ProposalPage.tsx",
  "src/wingman2/pages/ComparePageNew.tsx",
  "src/wingman2/pages/TemplatesPage.tsx",
  "src/wingman2/pages/VideowallBuilderPage.tsx",
];

const recommendedPages = [
  "src/wingman2/pages/ProjectsPage.tsx",
  "src/wingman2/pages/ProjectDetailPage.tsx",
  "src/wingman2/pages/ProductCallCardsPage.tsx",
  "src/wingman2/pages/CatalogBrowserPage.tsx",
];

const routedPageSources = {
  "src/wingman2/pages/ComparePageNew.tsx": [
    "src/wingman2/pages/ComparePageNew.tsx",
    "src/wingman2/pages/ComparePageNew.advanced.tsx",
  ],
};

const errors = [];
const warnings = [];

function count(value, token) {
  return value.match(new RegExp(`\\b${token}\\b`, "g"))?.length ?? 0;
}

function checkPage(relativePath, required = true) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    const message = `${relativePath} is missing`;
    if (required) {
      errors.push(message);
      return;
    }

    warnings.push(message);
    return;
  }

  const sourcePaths = routedPageSources[relativePath] ?? [relativePath];
  const text = sourcePaths
    .map((sourcePath) => fs.readFileSync(path.join(root, sourcePath), "utf8"))
    .join("\n");
  const counts = {
    page: count(text, "wm-ui-page"),
    card: count(text, "wm-ui-card"),
    title: count(text, "wm-ui-title"),
    copy: count(text, "wm-ui-copy"),
    button: count(text, "wm-ui-button"),
    input: count(text, "wm-ui-input"),
  };

  if (required && counts.page < 1) errors.push(`${relativePath} has no wm-ui-page root class`);
  if (required && counts.card < 3) errors.push(`${relativePath} has too few wm-ui-card surfaces (${counts.card})`);
  if (required && counts.title < 2) errors.push(`${relativePath} has too few wm-ui-title headings (${counts.title})`);
  if (required && counts.copy < 2) errors.push(`${relativePath} has too few wm-ui-copy text blocks (${counts.copy})`);

  console.log(
    `[page-markup] ${relativePath}: page=${counts.page}, card=${counts.card}, title=${counts.title}, copy=${counts.copy}, button=${counts.button}, input=${counts.input}`,
  );
}

for (const page of requiredPages) checkPage(page, true);
for (const page of recommendedPages) checkPage(page, false);

if (warnings.length) {
  console.warn("[page-markup] Warnings:");
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error("[page-markup] FAILED:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("[page-markup] Shared markup migration checks passed.");
