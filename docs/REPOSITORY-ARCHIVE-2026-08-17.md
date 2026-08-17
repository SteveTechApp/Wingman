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

- `src/features/catalog/catalogIntelligence.ts`
- `src/lib/`

The active application entry point is the Vite/React Wingman application under `src/wingman2/`. The removed `src/lib/` files were Next.js/Supabase SSR scaffolding and are outside the active typecheck entry set unless imported. The cleanup branch is validated by CI before merge so any hidden dependency fails closed.

## Retained deliberately

The cleanup does **not** remove active build, deployment, data-governance, generated-catalogue, test, documentation, Supabase migration, Docker or current `tools/` assets. The product review workbook is also retained because it may still support governed data maintenance.

## Restore example

```powershell
git restore --source archive/pre-cleanup-20260817 -- path/to/file
```

## Validation policy

Repository cleanup is merged only after the normal Wingman CI, governed-data and Docker build gates pass.
