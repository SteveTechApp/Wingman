# WyreStorm Wingman

WyreStorm Wingman is an internal sales, discovery, product-selection and proposal-support tool for WyreStorm Technologies.

The application helps sales and pre-sales users move from customer requirements to a practical AV system direction using guided workflows, product intelligence, comparison support, project storage and proposal-ready outputs.

## Core development checks

Before committing changes, run:

npm run verify

For faster local validation during UI work, run:

npm run typecheck
npm run build

## Styling governance

Wingman uses a consolidated stylesheet stack imported from src/main.tsx.

Page files should not import their own CSS. Visual migration work should use shared wm-ui-* primitives and the redesign theme layer rather than scattered page-level overrides.

## Documentation

Root-level project documentation is kept intentionally short. Detailed feature, launch, migration and audit notes live under the docs and archive folders.
