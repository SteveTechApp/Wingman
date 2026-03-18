# Competitor data import folder

## Purpose
This folder supports the Wingman competitor intelligence pipeline.

## Files
- `competitor-import-template.csv` : starter format for manual or distributor imports
- `dataset.generated.ts` : generated TypeScript starter dataset created by the upgrade script
- `README.md` : usage notes

## Recommended process
1. Import manufacturer or distributor data into the CSV template.
2. Convert raw rows with `normaliseRawRecord`.
3. Run `enrichDataset` to score completeness and flag missing fields.
4. Display each item with `CompetitorSpecQualityPanel`.
5. Replace seeded records with verified data over time.

## Notes
The generated dataset is only a scaffold to increase SKU count quickly.
Use manufacturer websites, distributor feeds, and PDF extraction to improve confidence levels.