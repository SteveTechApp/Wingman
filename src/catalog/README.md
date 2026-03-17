# Catalog Domain

`src/catalog` is the canonical frontend catalog domain.

- `repository.ts` is the primary access layer for resolved catalog products.
- `seedCatalog.ts` builds the local WyreStorm seed catalog from raw assets in `src/data`.
- `workflowCatalog.ts` and `boundCatalogue.ts` are consumer projections built on top of `repository.ts`.
- `recommendationCatalog.ts` is the canonical import/export product projection for SKU descriptions and Bronze/Silver/Gold recommendation metadata.
- `guruCatalog.ts` is the canonical Guru-facing catalog projection.
- `serviceRecommendations.ts` is the canonical service-layer mapping for room-design, topology, and prompt-driven SKU starter recommendations.
- `types.ts`, `normalize.ts`, `enrich.ts`, and `classification.ts` hold shared catalog shaping logic.

Compatibility surfaces remain in place while the repo is being repaired:

- `CatalogRepository.ts`
- `CatalogService.ts`
- `src/workflow/catalogueAdapter.ts`
- `src/core/wingman/catalogBridge.ts`

New catalog consumers should import from `@/catalog` or a specific module in this folder rather than probing raw JSON paths.
