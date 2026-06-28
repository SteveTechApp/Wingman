# Incoming Product Update Sources

Drop reviewed source exports here before promoting them into Wingman.

Expected files:

- wyrestorm-catalogue-source.csv
- wyrestorm-lifecycle-source.csv
- competitor-fingerprints-source.csv
- competitor-review-notes-source.csv

Promotion command:

```sh
npm run product-update:promote-incoming
```

Promotion rules:

- Existing controlled CSVs are backed up before replacement.
- Incoming files must pass check:product-update-source-schema.
- The full product-update pipeline runs after promotion.
- Competitor data remains comparison-only and must not enter WyreStorm BOMs.

## WyreStorm catalogue normalization

Normalize a vendor-supplied catalogue CSV into the controlled schema before review or promotion:

```sh
npm run product-update:normalize-wyrestorm-catalogue -- data-imports/incoming/wyrestorm-catalogue-source.csv data-imports/wyrestorm-catalogue-current.csv
```

The normalizer accepts common vendor/source header aliases, canonicalizes SKUs, lifecycle values, booleans, semicolon-delimited list fields, and emits the controlled `wyrestorm-catalogue-current.csv` column order.
