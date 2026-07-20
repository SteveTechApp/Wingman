import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredPages = [
  "src/wingman2/pages/DashboardPage.tsx",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/RecommendationsPage.tsx",
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

const defaultClassTokens = {
  page: ["wm-ui-page", "wm-page"],
  card: ["wm-ui-card", "wm-card", "wm-section-card", "wm-action-card", "wm-output-panel"],
  title: ["wm-ui-title", "wm-page-title", "wm-section-title", "wm-card-title"],
  copy: ["wm-ui-copy", "wm-copy"],
  button: ["wm-ui-button", "wm-button"],
  input: ["wm-ui-input", "wm-input", "wm-select", "wm-textarea"],
};

const pageContracts = {
  "src/wingman2/pages/DashboardPage.tsx": {
    sources: ["src/wingman2/pages/DashboardPage.tsx"],
    tokens: {
      page: ["wm-reference-dashboard"],
      card: [
        "wm-reference-primary-card",
        "wm-reference-project-card",
        "wm-reference-rail-card",
      ],
      title: [
        "wm-reference-section-heading",
        "wm-reference-rail-title",
      ],
      copy: [
        "wm-reference-primary-copy",
        "wm-reference-project-name",
        "wm-reference-project-next",
      ],
    },
  },
  "src/wingman2/pages/ProposalPage.tsx": {
    sources: [
      "src/wingman2/pages/ProposalPage.tsx",
      "src/wingman2/components/ProposalCompletionWizard.tsx",
      "src/wingman2/components/TemplateProposalSeedPanel.tsx",
    ],
    tokens: {
      page: [
        "wm-proposal-wizard-page",
        "wm-template-proposal-page",
      ],
      card: [
        "wm-proposal-progress-card",
        "wm-proposal-step-card",
        "wm-template-proposal-hero",
        "wm-template-proposal-meta",
        "wm-template-proposal-table",
        "wingman-surface",
      ],
      title: [
        "wm-proposal-wizard-header",
        "wm-proposal-step-heading",
        "wm-proposal-bom-heading",
        "wm-template-seed-kicker",
      ],
      copy: [
        "wm-proposal-step-heading",
        "wm-proposal-evidence-details",
        "wm-template-seed-kicker",
        "wm-template-proposal-grid",
      ],
      button: [
        "wm-proposal-step-rail",
        "wm-template-proposal-actions",
      ],
      input: [
        "wm-proposal-field",
        "wm-proposal-confirmation",
      ],
    },
  },
  "src/wingman2/pages/ComparePageNew.tsx": {
    sources: [
      "src/wingman2/pages/ComparePageNew.tsx",
      "src/wingman2/pages/ComparePageNew.advanced.tsx",
    ],
  },
};

function tokensFor(relativePath, category) {
  return [
    ...defaultClassTokens[category],
    ...(pageContracts[relativePath]?.tokens?.[category] ?? []),
  ];
}

const errors = [];
const warnings = [];

function count(value, token) {
  return value.match(new RegExp(`\\b${token}\\b`, "g"))?.length ?? 0;
}

function countAny(value, tokens) {
  return tokens.reduce((total, token) => total + count(value, token), 0);
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

  const sourcePaths = pageContracts[relativePath]?.sources ?? [relativePath];
  const text = sourcePaths
    .map((sourcePath) => fs.readFileSync(path.join(root, sourcePath), "utf8"))
    .join("\n");
  const counts = {
    page: countAny(text, tokensFor(relativePath, "page")),
    card: countAny(text, tokensFor(relativePath, "card")),
    title: countAny(text, tokensFor(relativePath, "title")),
    copy: countAny(text, tokensFor(relativePath, "copy")),
    button: countAny(text, tokensFor(relativePath, "button")),
    input: countAny(text, tokensFor(relativePath, "input")),
  };

  if (required && counts.page < 1) errors.push(`${relativePath} has no shared wm-page root class`);
  if (required && counts.card < 3) errors.push(`${relativePath} has too few shared card surfaces (${counts.card})`);
  if (required && counts.title < 2) errors.push(`${relativePath} has too few shared title classes (${counts.title})`);
  if (required && counts.copy < 2) errors.push(`${relativePath} has too few shared copy text blocks (${counts.copy})`);

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
