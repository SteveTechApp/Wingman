# Remove pricing from Wingman

## Goal

Wingman captures room requirements, recommends a system, and produces an unpriced technical proposal with equipment, scope, assumptions, dependencies, and handoff details. No route requires pricing data to continue, validate, save, or export.

## Work

- [ ] Remove product and installation price entry, rate cards, totals, currency/tax controls, price readiness gates, and price-only proposal steps from both the proposal builder and template review.
- [ ] Keep quantities, equipment schedules, installation scope, technical validation, and quote-independent proposal readiness.
- [ ] Remove pricing fields and pricing-only serialization from project/proposal models; old stored values may be ignored on decode.
- [ ] Update HTML, PDF, DOCX, and CSV outputs to contain unpriced schedules without price placeholders or commercial totals.
- [ ] Update documentation and route copy so pricing is deferred and does not appear as a Wingman feature.
- [ ] Run the scenario/route audit results, focused tests, typecheck, build, and browser smoke; repair any substantive non-pricing workflow defects found.
