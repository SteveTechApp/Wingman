# Development pass — Trusted tester scenario validation

## Goal

Move from marker-heavy checks to realistic scenario checks.

## Initial scenarios

1. Sports bar / hospitality matrix vs AVoIP
2. BYOD boardroom / USB-C / USB ownership
3. Standard classroom
4. LCD video wall
5. Competitor compare product-class guardrail

## Each scenario should check

- application detection;
- recommended architecture;
- expected lead product or family;
- required dependencies;
- missing information;
- quote safety status;
- products that must not appear as lead recommendation.

## Acceptance criteria

- Scenario tests fail when wrong product classes appear.
- Scenario tests fail when dependencies are missing.
- Scenario tests fail when quote safety is absent.
- Scenario pack is included in trusted tester documentation.