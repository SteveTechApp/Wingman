# Incoming product source updates

Stage reviewed replacements here, then run:

```sh
npm run product-update:check-incoming
npm run product-update:promote-incoming
```

Supported files:

- `wyrestorm-vendor-export.csv` — optional raw vendor export consumed by the
  normalizer; it is not promoted directly.
- `wyrestorm-products.csv` together with `wyrestorm-lifecycle.csv` — full WyreStorm
  source replacements; both are required as a pair.
- `competitors/<manufacturer>.csv` — one or more manufacturer replacements.

Empty files are rejected. Competitor updates are independent, so updating one
manufacturer never clears another manufacturer. Promotion validates the complete
combined source package, restores the previous sources on failure, archives the
previous versions, and rebuilds runtime outputs on success.
