# Wingman alpha-numeric filtering opportunities

## Implemented in this pass

A shared workflow alpha-numeric filter has been added and mounted globally through src/main.tsx.

It activates on these Wingman workflow routes:

- /wingman/product-call-cards
- /wingman/products
- /wingman/product-finder
- /wingman/compare
- /wingman/projects
- /wingman/templates

It only appears when a page contains a long product-like or SKU-like list. It also avoids duplicating an alpha-numeric toolbar where one already exists.

## Best places to use this pattern

| Area | Reason | Priority |
|---|---|---:|
| Product Call Cards | Fast SKU browsing and sales discussion start point | High |
| Product Finder / Products | Search result narrowing and family browsing | High |
| Compare | Competitor model picker and WyreStorm shortlist | High |
| Projects / Opportunity | Attach products to a project or product direction | Medium |
| Templates | Helpful only when template count becomes large | Low |
| Documents / Response Pack | Only useful if selecting products/SKUs | Low |

## Files scanned for likely future native integration

- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — SKU, product, compare, list/results
- $RelativePath — product, filter, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — product, filter, list/results
- $RelativePath — product, compare, filter, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — SKU, product, compare, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — SKU, product, compare, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — product, compare, list/results
- $RelativePath — SKU, product, compare, list/results
- $RelativePath — compare, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — list/results
- $RelativePath — SKU, product, filter, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — SKU, product, compare, list/results
- $RelativePath — SKU, product, compare, filter, list/results
- $RelativePath — product, list/results
- $RelativePath — product
- $RelativePath — SKU, product, filter, list/results
- $RelativePath — SKU, product, list/results
- $RelativePath — SKU, product, filter, list/results
- $RelativePath — product, list/results
- $RelativePath — SKU, product

## Suggested next hardening pass

Once the UX is confirmed, convert the global enhancer into native React integration in the highest-value pages:

1. ProductCallCardsPage
2. ProductFinder / Products page
3. ComparePageNew
4. Project detail product attachment panel

Native integration will allow better count handling, keyboard support, and cleaner page-state filtering.