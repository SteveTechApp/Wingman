# Wingman Tools

This folder contains PowerShell scripts used to patch, audit, and maintain the Wingman repo.

## Curated scripts

Curated, commit-safe scripts live under:

- `tools/_CURATED/`

These scripts are intended to be safe, deterministic, and suitable for source control.

## Local-only artifacts

The following paths are local-only and should not be committed:

- `tools/_ARCHIVE/`
- `tools/_reports/`

If you generate reports, keep them local or move them under `_ARCHIVE`.

## Conventions

- Always back up files before writing changes
- Prefer full-file replacement for stability
- Keep scripts idempotent when possible