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
| AnalyticsDashboardPage.tsx | /wingman/analytics | Covered by AppShell | 0 | 2 | 0 | 0 |
| ApprovalQueuePage.tsx | /wingman/approval-queue | Covered by AppShell | 0 | 2 | 0 | 0 |
| BattleCardsPage.tsx | /wingman/battle-cards | Covered by AppShell | 0 | 0 | 0 | 0 |
| CatalogBrowserPage.tsx | /wingman/catalog-browser | Covered by AppShell | 0 | 3 | 2 | 0 |
| ComparePageNew.tsx | /wingman/compare | Covered by AppShell | 0 | 0 | 0 | 0 |
| DashboardPage.tsx | /wingman | Covered by AppShell | 1 | 2 | 0 | 0 |
| DiscoveryPage.tsx | /wingman/discovery | Covered by AppShell | 0 | 5 | 3 | 0 |
| GlossaryPage.tsx | /wingman/glossary | Covered by AppShell | 1 | 4 | 0 | 0 |
| IngestPage.tsx | /wingman/ingest | Covered by AppShell | 1 | 0 | 0 | 2 |
| NavigationHubPages.tsx | /wingman/call-coach, /wingman/products, /wingman/documents, /wingman/responses, /wingman/learn, /wingman/call-cards, /wingman/support | Covered by AppShell | 1 | 2 | 1 | 0 |
| ProductCallCardsPage.tsx | /wingman/product-call-cards | Covered by AppShell | 1 | 2 | 21 | 0 |
| ProductFamilyPage.tsx | /wingman/product-families | Covered by AppShell | 0 | 2 | 3 | 0 |
| ProductPitchPage.tsx | /wingman/product-pitch | Covered by AppShell | 2 | 8 | 22 | 3 |
| ProfilePage.tsx | /wingman/settings | Covered by AppShell | 1 | 3 | 12 | 0 |
| ProjectsPage.tsx | /wingman/projects | Covered by AppShell | 1 | 1 | 0 | 0 |
| ProposalPage.tsx | /wingman/proposal | Covered by AppShell | 0 | 2 | 1 | 0 |
| ProposalVisualsPage.tsx | /wingman/proposal-visuals | Covered by AppShell | 1 | 0 | 8 | 0 |
| QuoteSafetyDashboardPage.tsx | /wingman/quote-safety | Covered by AppShell | 1 | 6 | 0 | 0 |
| RecommendationsPage.tsx | /wingman/recommendations | Covered by AppShell | 0 | 3 | 9 | 0 |
| SalesHelperPage.tsx | /wingman/sales-helper | Covered by AppShell | 1 | 1 | 0 | 0 |
| TemplatesPage.tsx | /wingman/templates | Covered by AppShell | 1 | 3 | 4 | 0 |
| TermsPage.tsx | /wingman/terms | Covered by AppShell | 1 | 5 | 4 | 0 |
| VideowallBuilderPage.tsx | /wingman/videowall | Covered by AppShell | 1 | 1 | 0 | 0 |

## Supplemental page modules

- ApprovalQueuePage.test.tsx
- CatalogBrowserPage.adminEdit.test.tsx
- CatalogBrowserPage.fetchError.test.tsx
- CatalogBrowserPage.governedCoverage.test.tsx
- CatalogBrowserPage.paging.test.tsx
- ComparePageNew.advanced.tsx
- ComparePageNew.atlonaHdda4.test.tsx
- ComparePageNew.bridge.test.tsx
- ComparePageNew.decisionQueue.test.tsx
- ComparePageNew.governedCoverage.test.tsx
- ComparePageNew.governedHonesty.test.tsx
- ComparePageNew.idleLoading.test.tsx
- ComparePageNew.ingestDrill.test.tsx
- ComparePageNew.noMatchFallback.test.tsx
- ComparePageNew.savedHistory.test.tsx
- ComparePageNew.semanticDistribution.test.tsx
- ComparePageNew.strongDirection.test.tsx
- ComparePageNew.typedSkuHonesty.test.tsx
- ComparePageNew.verdictLead.test.tsx
- DashboardPage.test.tsx
- DataManagerPage.test.tsx
- DataManagerPage.tsx
- GlossaryPage.test.tsx
- GovernedCopyConsistency.test.tsx
- IngestPage.errorHandling.test.tsx
- IngestPage.multiSku.test.tsx
- NavigationHubPages.paging.test.tsx
- OpportunitiesPage.test.tsx
- OpportunitiesPage.tsx
- ProductPitchPage.governedCoverage.test.tsx
- ProjectDetailPage.discoveryConversation.test.tsx
- ProjectDetailPage.evidenceTrace.test.tsx
- ProjectDetailPage.requirementSync.test.tsx
- ProjectDetailPage.test.tsx
- ProjectDetailPage.tsx
- ProjectsPage.test.tsx
- QuoteSafetyDashboardPage.test.tsx
- RecommendationsPage.governedEvidence.test.tsx
- RecommendationsPage.strandedRail.test.tsx
- SalesHelperPage.paging.test.tsx
- TemplateBuilderPage.tsx
- TemplateReviewPage.tsx
- TemplatesPage.test.tsx
- TrainingPortalPage.tsx

## Warnings

- src/wingman2/pages/AnalyticsDashboardPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/ApprovalQueuePage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/BattleCardsPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/BattleCardsPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/CatalogBrowserPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/ComparePageNew.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/ComparePageNew.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/DiscoveryPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/IngestPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/IngestPage.tsx contains 2 light-theme utility class occurrence(s); the final governed layer overrides these surfaces, but the markup should be normalised when next edited.
- src/wingman2/pages/ProductFamilyPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/ProductPitchPage.tsx contains 3 light-theme utility class occurrence(s); the final governed layer overrides these surfaces, but the markup should be normalised when next edited.
- src/wingman2/pages/ProposalPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.
- src/wingman2/pages/ProposalVisualsPage.tsx has no internal shared page-root class; it is currently governed only by AppShell.
- src/wingman2/pages/RecommendationsPage.tsx has no explicit <h1>; confirm that its routed hub/header still supplies a meaningful page title.

