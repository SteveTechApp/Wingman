# Wingman UI Overload Audit

Repo: C:\Users\steve\wingman
Generated: 2026-03-04 09:27:49

## Priority Order

| Severity | Score | Cards | Actions | Grids | Lines | File | Flags |
|---|---:|---:|---:|---:|---:|---|---|
| HIGH | 10 | 1 | 6 | 4 | 585 | src\features\guru\GuruPage.tsx | many actions, multiple grids, heavy inline styling, large page file |
| HIGH | 10 | 3 | 5 | 4 | 509 | src\pages\public\PublicLandingPage.tsx | multiple grids, heavy inline styling, large page file |
| HIGH | 9 | 1 | 7 | 3 | 505 | src\app\pages\CompletionChecklistPage.tsx | many actions, multiple grids, heavy inline styling, large page file |
| HIGH | 9 | 0 | 5 | 4 | 283 | src\features\dashboard\DashboardPage.tsx | multiple grids, heavy inline styling, large page file |
| HIGH | 9 | 1 | 4 | 3 | 959 | src\features\misc\TemplatesPage.tsx | multiple grids, heavy inline styling, large page file, dense layout markup |
| HIGH | 9 | 2 | 4 | 2 | 321 | src\pages\ProjectsPage.tsx | multiple grids, heavy inline styling, large page file |
| HIGH | 9 | 0 | 4 | 3 | 360 | src\pages\public\PublicAboutPage.tsx | multiple grids, heavy inline styling, large page file, dense layout markup |
| MEDIUM | 8 | 1 | 3 | 4 | 334 | src\features\catalog\CatalogPage.tsx | multiple grids, heavy inline styling, large page file |
| MEDIUM | 7 | 6 | 4 | 0 | 136 | src\features\compare\CompetitorComparePage.tsx | many cards, heavy inline styling |
| MEDIUM | 7 | 5 | 0 | 3 | 148 | src\features\misc\VideoWallPlannerPage.tsx | many cards, multiple grids, heavy inline styling |
| MEDIUM | 7 | 10 | 5 | 1 | 44 | src\pages\ToolHubPage.tsx | many cards, heavy inline styling |
| MEDIUM | 6 | 2 | 3 | 1 | 210 | src\features\projects\ProjectsPage.tsx | heavy inline styling, large page file |
| MEDIUM | 6 | 3 | 3 | 1 | 240 | src\features\roomwizard\RoomWizardPage.tsx | heavy inline styling, large page file |
| MEDIUM | 6 | 2 | 3 | 2 | 188 | src\pages\TemplateBrowserScreen.tsx | multiple grids, large page file, many headings |
| LOW | 5 | 2 | 4 | 1 | 203 | src\features\misc\TrainingHubPage.tsx | large page file |
| LOW | 5 | 3 | 3 | 0 | 178 | src\features\proposals\ProposalBuilderPage.tsx | heavy inline styling, large page file |
| LOW | 5 | 6 | 0 | 1 | 30 | src\pages\DashboardPage.tsx | many cards, heavy inline styling |
| LOW | 5 | 0 | 0 | 1 | 181 | src\pages\tools\CompetitorComparePage.tsx | heavy inline styling, large page file |
| LOW | 5 | 0 | 2 | 2 | 162 | src\pages\TrainingPage.tsx | multiple grids, large page file, many headings |
| LOW | 4 | 3 | 1 | 0 | 120 | src\features\misc\ProductCatalogPage.tsx | heavy inline styling |
| LOW | 4 | 0 | 8 | 0 | 175 | src\pages\SurveyImportPage.tsx | many actions, large page file |
| LOW | 4 | 5 | 2 | 2 | 85 | src\pages\WorkspaceHomePage.tsx | many cards, multiple grids |
| LOW | 2 | 0 | 2 | 0 | 74 | src\features\misc\WelcomeScreen.tsx | heavy inline styling |
| LOW | 2 | 0 | 4 | 0 | 101 | src\pages\VideoGeneratorPage.tsx | - |
| LOW | 2 | 2 | 1 | 1 | 52 | src\pages\WelcomeScreen.tsx | - |
| LOW | 1 | 1 | 2 | 0 | 47 | src\features\misc\ProfilePage.tsx | heavy inline styling |
| LOW | 1 | 2 | 2 | 0 | 15 | src\pages\NotFoundPage.tsx | - |
| LOW | 1 | 0 | 2 | 0 | 80 | src\pages\ProjectOverviewPage.tsx | heavy inline styling |
| LOW | 1 | 1 | 1 | 0 | 56 | src\pages\PublicLandingPage.tsx | heavy inline styling |
| LOW | 1 | 2 | 0 | 0 | 12 | src\pages\tools\ProductCatalogPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 91 | src\_legacy\pages\QuickQuestionPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 15 | src\features\import\ImportIntakePage.tsx | - |
| LOW | 0 | 0 | 1 | 0 | 82 | src\features\tools\ToolHubPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 34 | src\pages\AnalyticsPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 18 | src\pages\ComparisonPage.tsx | - |
| LOW | 0 | 1 | 0 | 0 | 27 | src\pages\CompetitorComparisonPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 13 | src\pages\ImportIntakePage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 12 | src\pages\LoginPage.tsx | - |
| LOW | 0 | 0 | 1 | 0 | 29 | src\pages\ProjectSetupScreen.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 91 | src\pages\QuickQuestionPage.tsx | - |
| LOW | 0 | 0 | 1 | 0 | 23 | src\pages\SignupPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 2 | src\pages\tools\ProposalBuilderPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 2 | src\pages\tools\RoomWizardPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 2 | src\pages\tools\TrainingHubPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 2 | src\pages\tools\VideoWallPlannerPage.tsx | - |
| LOW | 0 | 0 | 0 | 0 | 20 | src\pages\VideoWallPage.tsx | - |

## Recommended Treatment

- HIGH: simplify first; reduce to 1 primary block + 1 secondary block.
- MEDIUM: merge duplicate sections, hide advanced options by default.
- LOW: keep, but tighten spacing and reduce extra actions.

## Immediate Candidates

- **src\features\guru\GuruPage.tsx** — HIGH (score 10): many actions, multiple grids, heavy inline styling, large page file
- **src\pages\public\PublicLandingPage.tsx** — HIGH (score 10): multiple grids, heavy inline styling, large page file
- **src\app\pages\CompletionChecklistPage.tsx** — HIGH (score 9): many actions, multiple grids, heavy inline styling, large page file
- **src\features\dashboard\DashboardPage.tsx** — HIGH (score 9): multiple grids, heavy inline styling, large page file
- **src\features\misc\TemplatesPage.tsx** — HIGH (score 9): multiple grids, heavy inline styling, large page file, dense layout markup
- **src\pages\ProjectsPage.tsx** — HIGH (score 9): multiple grids, heavy inline styling, large page file
- **src\pages\public\PublicAboutPage.tsx** — HIGH (score 9): multiple grids, heavy inline styling, large page file, dense layout markup
- **src\features\catalog\CatalogPage.tsx** — MEDIUM (score 8): multiple grids, heavy inline styling, large page file

## Notes

- This is a heuristic audit, not a visual renderer.
- High scores usually indicate pages trying to do too much in one view.
- Best simplification pattern: one primary task, one supporting section, extras hidden or below fold.