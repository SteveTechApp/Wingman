# Surface Audit Actions Implementation Plan

> Execute inline in the existing worktree; preserve newer main-checkout content before editing and copy changed files back with hash verification.

**Goal:** Resolve verified audit noise and reduce repeated CSS colour definitions without altering product behaviour.

**Architecture:** Keep route and reachability checks intact. Extract a small marker classifier with regression fixtures. Use component-scoped CSS variables with exactly the existing colour values.

**Tech Stack:** Node.js, node:test, CSS custom properties.

**Spec:** User-supplied feature-surface, style-drift and CSS coverage reports dated 2026-10-20.

## Tasks

- [x] Add `tools/lib/unfinished-marker.mjs` and its regression test. Recognize explicit task markers and standalone placeholder phrases, excluding translations, state strings and ordinary prose.
- [x] Replace the feature audit's broad case-insensitive search with the classifier. Run `node --test tools/lib/unfinished-marker.test.mjs`, then regenerate the feature report.
- [x] In `src/wingman2/styles/wingman-videowall.css`, replace repeated colour literals with named variables declared on `.vw-builder`. Verify expanding those variables reproduces the original stylesheet exactly.
- [x] Run the style baseline gate, feature audit and production build against the current main checkout after verified synchronization.
- [x] Record the assessment, completed fixes, verification results and remaining coverage limitations in `docs/SURFACE_AUDIT_ASSESSMENT_2026-10-20.md`.

## Constraints

Do not delete CSS based solely on unvisited states. Do not raise debt baselines. Do not overwrite unrelated main-checkout changes. Do not commit unless requested.
