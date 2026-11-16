# WyreStorm Current Availability Implementation Plan

> **For agentic workers:** Execute inline in this session, task by task.

**Goal:** Treat every distinct SKU in the user-provided WyreStorm roster as available in Wingman's governed product data.

**Architecture:** Keep `products.csv` and `lifecycle.csv` authoritative, add any roster SKUs missing from the source product records with identity and description from the supplied list, then regenerate canonical and product-intelligence data through the existing pipeline. Preserve cable classification so HDMI and USB cables remain searchable on cable intent only.

**Tech Stack:** CSV and JSON source data, Node.js product-data generators, existing catalogue eligibility logic.

**Spec:** User-provided pasted WyreStorm SKU list and instruction: “Treat all the SKUs as available.”

## Global Constraints

- Make and verify all edits in `.freebuff/worktrees/product-finder`, then copy changed files to `C:/Users/steve/wingman` and verify byte equality.
- Do not change cable-intent visibility: cable products remain hidden from ordinary product results until explicitly searched for.
- Map version and display-name variants to canonical SKUs; do not create duplicate identities.
- Preserve product descriptions from the supplied roster and use conservative product roles for new records.

### Task 1: Normalize the roster against governed source records

**Files:** the attached `Pasted text.txt`; `data-sources/wyrestorm/products.csv`; `data-sources/wyrestorm/lifecycle.csv`.

- [x] Extract SKU/description pairs, remove duplicate mentions, map suffix versions and recognized display-name variants, and identify roster products absent from governed source files.
- [x] Set every mapped SKU to lifecycle `active`, business status `active` or `cable` according to its product role, and `do_not_spec=false`; add missing source rows using only supplied identity and description evidence.

### Task 2: Rebuild governed product indexes

**Files:** `data/wingman-canonical-product-store.json`; generated product-intelligence summary and detail JSON.

- [x] Regenerate with the existing `data:canonical-products` and `data:product-intelligence-index` commands.
- [x] Confirm no duplicate SKU identities, all roster SKUs resolve, and cables remain separately classified for intent-gated visibility.

### Task 3: Verify and synchronize

**Files:** changed source and generated files in the two checkouts.

- [x] Run the lifecycle/data-source integrity checks.
- [x] Copy the affected source and generated product files to the main checkout and confirm matching SHA-256 hashes.
