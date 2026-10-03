# Wingman product data sources

This directory is the authoritative, editable source package for Wingman product data.
Files under `data/`, `generated/` and `public/` are compiled runtime outputs and must not
be edited as source data.

## Layout

- `wyrestorm/products.csv` — product identity, classification and commercial facts.
- `wyrestorm/lifecycle.csv` — lifecycle and business-status decisions keyed by SKU.
- `wyrestorm/enrichment.json` — structured technical, evidence and sales enrichment.
- `competitors/<manufacturer>.csv` — one bulk-editable dataset per manufacturer, all
  using the same schema.

Manufacturer files are physical editing shards, not separate data models. The compiler
combines them into one competitor catalogue keyed by normalized manufacturer + model.

## Update workflow

1. Edit the appropriate source CSV or update WyreStorm enrichment through the existing
   PDF/product-guide enrichment tools.
2. Run `npm run data:sources:check`.
3. Run `npm run data:sources:build`.
4. Run the focused data checks or `npm run data:maintenance`.

When WyreStorm supplies refreshed active/discontinued/do-not-spec/cable lists, import
them into the governed lifecycle source with:

`npm run product-update:import-lifecycle -- <active.txt> <discontinued.txt> <do-not-spec.txt> <cables.txt>`

The raw lists are import inputs, not runtime authorities. Review the resulting CSV
diff, then run the normal source check/build workflow.

The build fails on duplicate normalized keys, malformed JSON columns, missing lifecycle
rows, invalid statuses, and approved competitor rows without review evidence.

Lifecycle policy:

- `active` — eligible for normal Finder/Compare use.
- `review` — usable for Finder/Compare with review gates; never proposal-approved.
- `discontinued`, `eol`, `do-not-spec`, `superseded`, `archive` — blocked from runtime
  recommendation catalogues.

Competitor approval policy:

- `approved` — exact structured profile may be treated as verified.
- `review` — structured facts may assist comparison, but remain review-gated.
- `draft` or `needs-evidence` — discovery only; never presented as approved.
- `blocked` or `ignored` — excluded from compiled runtime competitor data.
