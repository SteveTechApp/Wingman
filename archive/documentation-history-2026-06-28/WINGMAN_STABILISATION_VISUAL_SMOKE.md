# Wingman Stabilisation Visual Smoke Checklist

Use this checklist on the integration branch before judging Wingman visually.

## Branch

Expected branch:

integration/wingman-stabilisation-pass

## Routes to check manually

- /wingman/dashboard
- /wingman/projects
- /wingman/discovery
- /wingman/finder
- /wingman/product-families
- /wingman/product-pitch
- /wingman/compare
- /wingman/templates
- /wingman/videowall
- /wingman/sales-helper
- /wingman/call-cards
- /wingman/ingest
- /wingman/proposal
- /wingman/support

## Discovery

Confirm:

- Step 1 Application cards are visible.
- Selecting an application moves the workflow forward.
- Environment, Outputs, Positions, Sources, Signal Paths, Processing and Recommendation steps are visible.
- No blank workflow panel appears under the step rail.

## Product Finder

Confirm:

- Technology Type dropdown is visible.
- Core hardware first is the default.
- Cables, dongles, accessories and mounts do not outrank main devices unless specifically requested.
- Product result cards have visual separation.
- Left filter rail, main results, and right logic / shortlist areas are visually distinct.

## Product Pitch

Confirm:

- The selected SKU is not forced into a generic family pitch when it has a more specific role.
- Multiview products are described as multiview / monitoring / preview products, not generic AVoIP distribution.
- The page uses cautious customer-safe language and avoids unsupported claims.

## Proposal Safety

Proposal output must separate:

- Confirmed requirement
- Design assumptions
- Recommended architecture
- Required WyreStorm products
- Optional enhancements
- Risks / needs validation
- Next steps