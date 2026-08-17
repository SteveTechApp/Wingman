# Wingman Repository Archive — 17 August 2026

## Purpose

This cleanup removes historical one-off development artefacts from the active Wingman source tree while preserving the complete pre-cleanup state in Git history and the dedicated archive branch:

`archive/pre-cleanup-20260817`

Nothing listed below is permanently lost. Restore any file from that branch if a historical investigation requires it.

## Removed from the active tree

### Historical root PowerShell patches and audits

One-off scripts used during the Data Manager, CSS consolidation, video-wall styling and local development repair passes were removed from the repository root. Their implemented outcomes now live in the application source, shared tooling and committed tests.

### Temporary development artefacts

- `.sync-test.txt`
- `bashcreated.txt`
- `verify-failure.txt`
- `.wingman-work/`

### Superseded source scaffolding

- `src/lib/`

The active application entry point is the Vite/React Wingman application under `src/wingman2/`. The removed `src/lib/` files were legacy Next.js/Supabase SSR scaffolding outside the active application path.

`src/features/catalog/catalogIntelligence.ts` was evaluated for removal but restored after the production Docker build proved that `CatalogBrowserPage.tsx` still imports it. It remains active code.

## Retained deliberately

The cleanup does **not** remove active build, deployment, catalogue intelligence, data-governance, generated-catalogue, test, documentation, Supabase migration, Docker or current `tools/` assets. The product review workbook is also retained because it may still support governed data maintenance.

## Restore example

```powershell
git restore --source archive/pre-cleanup-20260817 -- path/to/file
```

## Validation policy

Repository cleanup is merged only after the normal Wingman CI and Docker build gates pass. Failed validation is treated as evidence that a candidate archive path is still active, as happened with the catalogue intelligence module during this pass.
