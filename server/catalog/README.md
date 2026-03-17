# Catalog Server Structure

Shared server-side file references live in `files.mjs`.

Use that module for paths to:

- product intelligence DB storage
- competitor approval storage
- WyreStorm SKU master JSON
- WyreStorm seed catalog JSON
- competitor catalog JSON
- compare seed JSON

This keeps raw catalog and data-file ownership consistent across server modules.
