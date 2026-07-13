# Wingman app page style consistency audit

Generated: deterministic static analysis report

## Governed visual contract

- Every route is wrapped by `AppShell > .wm-app-page-frame`.
- The global top bar separates the aquamarine page label from the concise route summary.
- Body copy is white; page and section headings use the governed aquamarine palette.
- Cards and panels use a consistent dark-navy surface, border, radius and spacing system.
- Buttons, tabs, inputs and tables share one compact interaction style.
- The final CSS layer is contained in the single `wingman-style-stack.css` file.

## Routed page coverage

| Page implementation | Route(s) | Coverage | H1 | Shared roots | Shared cards | Light-theme utilities |
|---|---|---:|---:|---:|---:|---:|
| CallCardsPage.tsx | /wingman/call-cards | Covered by AppShell | 0 | 0 | 0 | 0 |
| CatalogBrowserPage.tsx | /wingman/catalog-browser | Covered by AppShell | 1 | 2 | 1 | 2 |
| ComparePageNew.tsx | /wingman/compare | Covered by AppShell | 0 | 0 | 0 | 0 |
| DashboardPage.tsx | /wingman | Covered by AppShell | 1 | 4 | 7 | 0 |
| DiscoveryPage.tsx | /wingman/discovery | Covered by AppShell | 1 | 6 | 21 | 0 |
| FinderPage.tsx | /wingman/finder | Covered by AppShell | 1 | 2 | 49 | 0 |
| GlossaryPage.tsx | /wingman/glossary | Covered by AppShell | 0 | 0 | 0 | 0 |
| IngestPage.tsx | /wingman/ingest | Covered by AppShell | 0 | 0 | 0 | 4 |
| IntelligencePage.tsx | /wingman/intelligence | Covered by AppShell | 1 | 2 | 0 | 0 |
| NavigationHubPages.tsx | /wingman/call-coach, /wingman/products, /wingman/documents, /wingman/response-pack, /wingman/learn | Covered by AppShell | 1 | 2 | 0 | 0 |
| ProductCallCardsPage.tsx | /wingman/product-call-cards | Covered by AppShell | 1 | 2 | 17 | 0 |
| ProductFamilyPage.tsx | /wingman/product-families | Covered by AppShell | 1 | 3 | 5 | 0 |
| ProductPitchPage.tsx | /wingman/product-pitch | Covered by AppShell | 3 | 8 | 37 | 4 |
| ProfilePage.tsx | /wingman/settings | Covered by AppShell | 1 | 4 | 11 | 0 |
| ProjectsPage.tsx | /wingman/projects | Covered by AppShell | 1 | 1 | 6 | 0 |
| ProposalPage.tsx | /wingman/proposal | Covered by AppShell | 0 | 2 | 38 | 0 |
| SalesHelperPage.tsx | /wingman/sales-helper | Covered by AppShell | 1 | 1 | 0 | 0 |
| SupportPage.tsx | /wingman/support | Covered by AppShell | 1 | 1 | 0 | 0 |
| TemplatesPage.tsx | /wingman/templates | Covered by AppShell | 1 | 5 | 4 | 0 |
| VideowallBuilderPage.tsx | /wingman/videowall | Covered by AppShell | 1 | 2 | 18 | 0 |
| VisualDesignStudioPage.tsx | /wingman/visual-design | Covered by AppShell | 0 | 0 | 1 | 0 |
| VisualStudioPage.tsx | /wingman/visual-studio | Covered by AppShell | 1 | 0 | 0 | 0 |

## Supplemental page modules

- ComparePageNew.advanced.tsx
- ComparePageNew.ingestDrill.test.tsx
- ComparePageNew.noMatchFallback.test.tsx
- IngestPage.multiSku.test.tsx
- ProjectDetailPage.tsx
- TemplateReviewPage.tsx

## Warnings

- src/wingman2/pages/CallCardsPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/CallCardsPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/CatalogBrowserPage.tsx contains 2 light-theme utility class occurrence(s); the final governed layer overrides these surfaces, but the markup should be normalised when next edited.
- src/wingman2/pages/ComparePageNew.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/ComparePageNew.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/GlossaryPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/GlossaryPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/IngestPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/IngestPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/IngestPage.tsx contains 4 light-theme utility class occurrence(s); the final governed layer overrides these surfaces, but the markup should be normalised when next edited.
- src/wingman2/pages/ProductPitchPage.tsx contains 4 light-theme utility class occurrence(s); the final governed layer overrides these surfaces, but the markup should be normalised when next edited.
- src/wingman2/pages/ProposalPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/VisualDesignStudioPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/VisualDesignStudioPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/VisualStudioPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.

