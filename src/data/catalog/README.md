# Catalog Raw Asset Structure

Canonical raw catalog asset entry points:

- `wyrestormSeedCatalog.ts`: frontend facade for `wyrestorm-catalog.phase1.json`
- `competitorCatalog.ts`: frontend facade for `competitor-catalog.phase4.json`
- `competitorCompareSeed.ts`: frontend facade for `competitor-compare.seed.json`

Raw JSON files remain in this folder so generators, tests, and server-side tooling can still read them directly when needed.

For app/runtime imports, prefer these facade modules over importing the JSON files directly.
