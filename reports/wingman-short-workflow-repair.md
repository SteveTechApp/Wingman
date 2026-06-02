# Wingman Short Workflow Repair

## Issue

The short workflow pass partially applied but failed because:

- `WingmanWorkspacePage.tsx` imported a missing `ActiveOpportunityStrip` component.
- `DiscoveryPage.tsx` no longer uses the old `summary` state model.
- Current Discovery uses a 7-step `answers` state model.

## Fix

- Removed the missing `ActiveOpportunityStrip` dependency from the shared workspace wrapper.
- Added Guru call-note intake to the current Discovery `answers` state model.
- Kept supporting detail collapsed by default.
- Updated the short workflow guard to match the current Discovery implementation.

## Rule

Do not checkpoint partial marker-driven changes. Typecheck and full verify must pass first.