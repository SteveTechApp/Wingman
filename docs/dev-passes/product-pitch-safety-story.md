# Development pass — Product Pitch safety and sales story

## Goal

Make Product Pitch suitable for trusted internal testing.

Product Pitch should become a guided sales conversation page, not just a product fact page.

## Files likely affected

- `src/wingman2/pages/ProductPitchPage.tsx`
- `src/wingman2/lib/productStoryEngine.ts`
- `src/wingman2/lib/recommendationEvidence.ts`
- `src/wingman2/styles/wingman-style-stack.css`

## Required sections

- Customer requirement
- Product direction
- Suggested system shape
- Why this fits
- What to check before quoting
- Alternatives
- Customer-safe wording
- Internal guidance
- Do-not-quote-from-pitch-alone warning where needed

## Acceptance criteria

- Product Pitch opens from Finder.
- Product Pitch opens from Compare.
- Weak or fallback product matches show validation warnings.
- Product Pitch does not present incomplete requirements as final design.
- Customer-safe wording is clearly separated from internal guidance.
- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run verify` passes or known audit warnings are documented.