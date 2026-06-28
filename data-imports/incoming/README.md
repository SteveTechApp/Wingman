# Incoming Product Update Sources

Drop reviewed source exports here before promoting them into Wingman.

Expected files:

- wyrestorm-catalogue-source.csv
- wyrestorm-lifecycle-source.csv
- competitor-fingerprints-source.csv
- competitor-review-notes-source.csv

Promotion command:

npm run product-update:promote-incoming

Promotion rules:

- Existing controlled CSVs are backed up before replacement.
- Incoming files must pass check:product-update-source-schema.
- The full product-update pipeline runs after promotion.
- Competitor data remains comparison-only and must not enter WyreStorm BOMs.
