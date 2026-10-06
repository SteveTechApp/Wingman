// Current-data acceptance suites are opt-in during the catalogue revision.
// Behavioural comparison and evidence-safety suites remain in the default run.
export const catalogueAcceptanceTests = [
  "src/__tests__/productStoryCoverage.test.ts",
  "src/wingman2/lib/competitorMatchDecisions.snapshot.test.ts",
  "src/wingman2/lib/competitorSpecRegistry.integrity.test.ts",
  "src/wingman2/lib/governedCatalogueDataIntegrity.test.ts",
  "src/wingman2/lib/nhd0401DataIntegrity.test.ts",
  "src/wingman2/lib/productDataQuality.test.ts",
  "src/wingman2/lib/governedCoverage.test.ts",
  "src/wingman2/pages/CatalogBrowserPage.governedCoverage.test.tsx",
  "src/wingman2/pages/ComparePageNew.governedCoverage.test.tsx",
  "src/wingman2/pages/ProductPitchPage.governedCoverage.test.tsx",
];
