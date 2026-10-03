# WyreStorm product lifecycle mechanism

How Wingman keeps WyreStorm product information current: how end-of-life products
are flagged and archived, and how superseded versions are identified and routed to
their replacement.

## Sources of truth

The authoritative inputs are the governed WyreStorm source files:

| File | Meaning |
|------|---------|
| `data-sources/wyrestorm/lifecycle.csv` | Active, review, discontinued, do-not-spec and cable business decisions |
| `data-sources/wyrestorm/products.csv` | Product identity, classification and commercial facts |

These are parsed by [`wyrestormSkuBusinessStatus.ts`](../src/wingman2/lib/wyrestormSkuBusinessStatus.ts)
into a single `active | discontinued | do-not-spec | cable | unlisted` status.

## Runtime: never present an EoL or superseded product as current

[`wyrestormProductLifecycle.ts`](../src/wingman2/lib/wyrestormProductLifecycle.ts)
is the single entry point. `resolveProductLifecycle(sku)` returns the business
status, whether the SKU is `recommendable`, and — when it is superseded — the
current `supersededBy` replacement plus rep-facing guidance. Call it anywhere the
app is about to position a SKU (Compare leads, Finder, Product Positioning,
Proposal) so an EoL or superseded product is flagged rather than sold as current.

Confirmed supersessions live in the curated `WYRESTORM_SUPERSESSIONS` map (a
discontinued predecessor → its active successor, e.g. `SYN-TOUCH10 → SYN-TOUCH10-V2`).
Entries are promoted there from the reconciliation report once a human confirms the
successor is current.

## Keeping it up to date — the cadence

1. **Discover new / removed products from WyreStorm's site:**
   `node tools/check-wyrestorm-product-updates.mjs` crawls the WyreStorm sitemap and
   writes `public/wyrestorm-product-update-check.json` (products on the site but not
   in the index).
2. **Refresh lifecycle:** import the latest WyreStorm exports with
   `npm run product-update:import-lifecycle -- <active.txt> <discontinued.txt> <do-not-spec.txt> <cables.txt>`,
   then review the resulting source CSV diff. Raw lists are import inputs, not a
   second runtime authority.
3. **Reconcile:** `npm run lifecycle:reconcile`
   ([reconcile-wyrestorm-lifecycle.mjs](../tools/reconcile-wyrestorm-lifecycle.mjs))
   diffs the governed lifecycle source against the live index and stories and writes
   [`docs/wyrestorm-lifecycle-reconciliation.md`](./wyrestorm-lifecycle-reconciliation.md)
   with five action lists:

   | Section | Action |
   |---------|--------|
   | **BLOCKED** | Indexed products now discontinued or do-not-spec — retained for catalogue history but excluded from active recommendation paths |
   | **ADD** | Active products missing from the index — add to `data-sources/wyrestorm/products.csv` and `enrichment.json`, then rebuild |
   | **REVIEW** | Indexed products on no business list — verify status, then archive or confirm |
   | **SUPERSEDED** | Version families where a discontinued SKU has an active successor — promote into `WYRESTORM_SUPERSESSIONS` |
   | **STORIES** | Governed stories leading with or recommending a non-active SKU — update the story to the current SKU |

4. **Act and re-run** until the actionable lists are clear or consciously deferred.

## Guard rails (enforced in CI)

- [`productStoriesLifecycle.test.ts`](../src/wingman2/data/productStoriesLifecycle.test.ts)
  fails the build if any governed story leads with, or recommends as a companion, a
  do-not-spec or cable SKU. This is what stops an EoL/never-spec product reaching a
  customer-facing card.
- [`wyrestormProductLifecycle.test.ts`](../src/wingman2/lib/wyrestormProductLifecycle.test.ts)
  locks the status and supersession behaviour.

Discontinued/unlisted *references* are reported for review rather than hard-failed,
because some business-list entries are contested (e.g. a controller whose stated
successor is itself listed discontinued) and need a human decision, not an automated
block.
