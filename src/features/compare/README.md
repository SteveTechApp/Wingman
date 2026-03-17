# Compare Feature Structure

Canonical compare feature paths:

- `CompetitorComparePage.tsx`: active competitor comparison UI used by `/app/tools/compare`.
- `legacy/LegacyResolveMatchPage.tsx`: older resolve-and-rank compare UI kept for reference and compatibility.

Related domain code:

- `src/competitor/`: competitor dataset, fit scoring, local lookup, and compare trace types.
- `src/services/competitor/`: live lookup extraction, fallback, fetch, and cache helpers.
- `src/services/competitorComparisonService.ts`: canonical comparison service used outside the active compare page.

Compatibility path:

- `src/features/competitor/CompetitorComparePage.tsx`: shim that re-exports the legacy compare page.
