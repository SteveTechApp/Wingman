# SKU Data Structure

Canonical SKU data module:

- `wyrestormSkuCatalog.ts`: typed facade for the generated 2026 SKU master JSON.

Supporting files:

- `../wyrestormSkuCatalog.2026.json`: generated runtime dataset used by app and server.
- `2026 Wyrestorm SKU (1).xlsx`: raw workbook source kept beside the SKU facade.

Compatibility facades remain at:

- `src/data/wyrestormSkuCatalog.2026.ts`
- `src/services/sku/wyrestormSkuCatalog.2026.ts`

Use the canonical module above for new data imports.
