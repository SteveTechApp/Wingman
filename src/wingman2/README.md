# Wingman2

`src/wingman2` is the canonical client application surface for Wingman.

Structure:

- `app/`: route manifest, route catalog, and app entry
- `layout/`: application shell and shared navigation
- `pages/`: routed feature pages
- `components/`: shared UI primitives used by routed pages
- `content/`: feature audit and other static workflow content
- `styles/`: Wingman2-only styling entrypoint and theme

Canonical runtime data:

- `data-sources/`: authoritative editable WyreStorm and competitor sources
- `data/catalog/`: compiled competitor catalogue and source manifest
- `data/governance/`: governance and policy data used by the active server runtime
- `data/wingman-canonical-product-store.json`: generated WyreStorm runtime catalogue
- `data/runtime/`: ignored operational state; never an editable product-data source

Entry points:

- `src/main.tsx`
- `src/App.tsx`

Runtime note:

- The active app now resolves only through `src/wingman2`.
- Legacy files elsewhere under `src/` are not part of the Wingman2 runtime path.
