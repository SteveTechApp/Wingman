# Wingman Domain Extraction Recovery

Date: 2026-05-22
Branch: recovery/wingman-domain-extraction
Issue: https://github.com/SteveTechApp/Wingman/issues/37

## Recovery Scope

This recovery pass stopped new feature work and focused on making GitHub the source of truth for the Product Finder domain extraction work.

Recovered into this branch:

- Product Matching domain folder at `src/wingman2/productMatching/`.
- `featureFilters.ts` with the existing Product Finder feature-filter logic represented as a reusable domain module.
- Shared Product Matching types and text helpers.
- `tools/check-product-matching-scenarios.mjs`.
- `package.json` script `check:product-matching`.

The live Finder page behavior was intentionally left unchanged in this recovery branch. GitHub `main` already contained the in-page feature-filter matching behavior, and this branch preserves that behavior while recovering the domain files and validation command requested by issue #37.

## Local Evidence Checked

The following reported local-only commit IDs were checked before recovery:

- `9572ce5`: not found as a local Git object.
- `4de4963`: not found as a local Git object.
- `a1bd97e`: not found as a local Git object.

The reported local branch `phase-2c-feature-filter-domain-extraction` was not found locally or on `origin`.

The following named patch and summary artifacts were not found in the repository or user home search:

- `codex-phase-2c-product-finder-freeze.patch`
- `codex-phase-2c-product-finder-freeze-summary.txt`
- `codex-wingman-current-work.patch`
- `codex-wingman-current-work-summary.txt`
- `codex-phase-3b-discovery-domain.patch`
- `codex-phase-3b-discovery-domain-summary.txt`

Earlier Codex session logs from 2026-05-03 showed the Product Finder feature-filter behavior and scenario output, but the referenced commits and patch files were not available for direct cherry-pick or patch application.

## Unrecovered Items

These items could not be directly recovered because the source commits and patch files were absent:

- Exact commit contents for `9572ce5`, `4de4963`, and `a1bd97e`.
- Exact patch contents for the six named `codex-*` recovery files.
- Any Phase 3B Discovery domain patch content beyond what is already present on GitHub `main`.

No Phase 3 work was continued in this recovery branch.
