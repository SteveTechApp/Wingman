# Wingman Data Ownership

## Canonical active app data
- src/data/products/*         -> product family source modules used by app/runtime
- src/data/techDatabase/*     -> technical knowledge modules
- src/data/templates/*        -> template modules and template JSON assets
- src/data/training/*         -> training modules
- src/data/productDatabase.ts -> composed product database
- src/data/technicalDatabase.ts -> composed technical reference database
- src/data/defaultTemplates.ts -> default templates assembly
- src/data/trainingContent.ts -> training content assembly
- src/data/pricing.ts         -> pricing logic/data
- src/data/navigation.ts      -> app navigation model
- src/data/constants.ts       -> shared constants
- src/data/wizardOptions.ts   -> wizard configuration data

## Catalog domain ownership
- src/catalog/*                      -> canonical frontend catalog domain, repository, classification, and consumer projections
- src/catalog/repository.ts          -> primary resolved catalog access layer for app/runtime
- src/catalog/seedCatalog.ts         -> WyreStorm seed builder over raw data assets
- src/catalog/workflowCatalog.ts     -> canonical workflow/BOM catalog projection
- src/catalog/boundCatalogue.ts      -> canonical bound-catalogue projection for Wingman bridges
- src/catalog/recommendationCatalog.ts -> canonical import/export recommendation projection and SKU description map
- src/catalog/guruCatalog.ts         -> canonical Guru product projection
- src/catalog/serviceRecommendations.ts -> canonical service-layer family/tier/transport SKU starter mapping
- src/workflow/catalogueAdapter.ts   -> compatibility shim to src/catalog/workflowCatalog.ts
- src/core/wingman/catalogBridge.ts  -> compatibility shim to src/catalog/boundCatalogue.ts

## SKU ownership
- data/raw/sku/*.xlsx                     -> raw source workbook inputs
- src/data/wyrestormSkuCatalog.2026.json -> generated runtime catalogue dataset
- src/data/sku/wyrestormSkuCatalog.ts    -> canonical typed SKU facade for runtime imports
- src/data/wyrestormSkuCatalog.2026.ts   -> compatibility facade, keep for older imports
- src/services/sku/wyrestormSkuCatalog.2026.ts -> compatibility facade, keep for older imports
- src/data/sku/*.xlsx                    -> raw workbook inputs kept with SKU ownership

## Compare / competitor data ownership
- src/data/catalog/competitorCatalog.ts  -> canonical frontend facade for competitor catalogue seed data
- src/data/catalog/competitorCompareSeed.ts -> canonical frontend facade for compare seed rows
- src/data/catalog/wyrestormSeedCatalog.ts -> canonical frontend facade for raw WyreStorm phase1 seed data
- src/data/catalog/*.json                -> raw catalog assets used by frontend facades and server-side readers
- src/competitor/*                       -> canonical competitor domain logic, local lookup, fit scoring, and types
- src/services/competitor/*              -> canonical competitor service API plus live lookup fetch / extract / cache pipeline
- data/competitor-approvals.json         -> local approval queue storage for lookup diagnostics and admin workflows

## Governance / indirect data
Keep in place for now:
- src/data/catalog.wyrestorm.json
- src/data/eolSkus.deny.json
- src/data/sales-language-map.json
- src/data/sales-readiness-model.json
- src/data/sales-starter-journeys.json
- src/data/wingman.completion-checklist.json

## Legacy / archived raw data
- data/raw/archive/* -> legacy root data files not directly referenced by runtime

## Cleanup rule
Do not delete from src/data unless:
1. ref count is confirmed zero
2. not referenced indirectly through JSON relationships
3. not consumed by generators/import scripts
4. it has been archived first
