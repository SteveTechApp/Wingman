# Wingman product data health

_Last updated: 2026-07-05_

## Summary

Product data governance is mature enough to be useful, but not finished enough to treat every generated recommendation as sales-safe without validation.

## Known strengths

- Governed product-story layer is established.
- Active SKU coverage is high.
- Lifecycle reconciliation exists.
- Sales copy standards exist.
- Proposal safety standards exist.

## Known risks

| Risk | Commercial impact | Required action |
|---|---|---|
| Polluted generated records | Wrong or misleading sales recommendation | Move to review until corrected. |
| Invalid or placeholder SKUs | Sales team may quote non-saleable products | Suppress from lead recommendations. |
| Accessories treated as lead solutions | Poor recommendation quality | Keep accessories as dependencies only. |
| EoL / do-not-spec leakage | Commercial and support risk | Enforce lifecycle gate in compare, finder, proposal and call-card flows. |
| Overconfident equivalence wording | False direct-match claims | Use validated-match language and list gaps. |

## Review SKUs requiring governed treatment

These should stay out of lead recommendations until manually resolved:

- `HALO-WFA-130`
- `HALO-WFA-290`
- `MV-0401-PRO`
- `MXV-0606-H2A-70`
- `NHD-124-RACK-1U`
- `NHD-500-E`
- `SW-0X01-8K`
- `SW-130-TX`

## Required product data rules

1. Invalid SKUs must not appear as lead recommendations.
2. Accessories must not be promoted as primary system solutions.
3. EoL, superseded and do-not-spec products must not be presented as current recommendations.
4. Matrix outputs must distinguish independent routed outputs from mirrored, loop, local-monitor and auxiliary outputs.
5. AVoIP matching must respect series, role and network class.
6. Compare output must state matched points, missed points and evidence level.

## Next actions

| Priority | Action |
|---|---|
| P0 | Confirm lifecycle and suppression rules are enforced in active recommendation paths. |
| P1 | Resolve the eight polluted/review SKUs listed above. |
| P1 | Resolve remaining lifecycle review items. |
| P1 | Run product-story coverage and compare behaviour tests. |
| P2 | Generate a dated product-data health report after cleanup. |
