# Match dependencies to WyreStorm products

## Goal

Make proposal dependencies reflect uncovered system requirements. Selected
product capabilities must not be mistaken for room requirements, and governed
WyreStorm products that already fill a dependency must satisfy it.

## Steps

1. Separate requirement signals from selected-product evidence in dependency
   governance. Keep product evidence available for exact compatibility rules.
2. Suppress generic endpoint prompts when selected NetworkHD endpoints already
   represent the product path or when an exact endpoint rule identifies a gap.
3. Keep infrastructure checks where AV-over-IP or a real transport requirement
   needs them.
4. Document the invariant alongside proposal-output rules.

## Acceptance

- Product capability words alone do not create USB, audio, control, wall, or
  transport prompts.
- Requirement text can still create those prompts.
- Exact SKU compatibility dependencies and independent infrastructure checks
  remain governed.
- A selected NetworkHD endpoint does not receive a duplicate generic
  endpoint-count prompt.
