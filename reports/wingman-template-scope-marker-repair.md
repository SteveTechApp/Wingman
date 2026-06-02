# Wingman Template Scope Marker Repair

## Issue

`npm run check:readiness` failed because the standalone room template workflow marker was missing:

- `Other AV design scope`

## Cause

The production readiness audit expects this marker in either:

- `TemplatesPage.tsx`
- `TemplateReviewPage.tsx`

The marker confirms that standalone room templates can capture broader AV design scope without routing through Discovery.

## Fix

Restored the marker in the standalone template review workflow source.

## Rule

Do not weaken the readiness gate. The template workflow must continue to prove that standalone templates support other AV design scope.