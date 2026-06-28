# Legacy product data archive — 2026-06-28

This archive preserves the product-data sources and maintenance scripts retired by
the canonical `data-sources` migration.

Archived material includes:

- the former four-file `data-imports` promotion workflow;
- overlapping WyreStorm JSON catalogues and seed catalogues;
- the phase-four and comparison-seed competitor catalogues;
- normalized intermediate outputs and legacy reconciliation reports;
- the four 2026 lifecycle business lists after their decisions were imported into
  `data-sources/wyrestorm/lifecycle.csv`;
- helper scripts that operated only on those retired paths.

Do not restore individual files into active `data/` paths. If historical facts need
to be recovered, migrate the reviewed row into the appropriate authoritative source:

- `data-sources/wyrestorm/`
- `data-sources/competitors/<manufacturer>.csv`

Then run `npm run data:sources:build`.
