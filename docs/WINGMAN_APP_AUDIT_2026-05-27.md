# Wingman App Audit - 2026-05-27

## Current Position

Wingman is now much closer to a live sales-call workspace. The recovered template, product family, product pitch, lazy-route, and product-matching features are wired back into the active app, and the main UI has been simplified so pages lead with the current decision rather than exposing every model detail.

## Restored Useful Features

- Room templates, template review, editable BOM rows, save-to-project, proposal export, and BOM export.
- Lazy route loading for the routed Wingman pages and detail routes.
- Product Families and Product Pitch routes for rep-friendly product explanations.
- Product matching engine and scenario checks for USB, MST, AVoIP, video wall, and NDI workflows.
- Runtime product intelligence index generation with 151 indexed products.
- React-driven route state for route-specific styling, replacing the old DOM patch utility approach.

## Strong Points

- Routes are lazy-loaded, which keeps initial load smaller while preserving the larger tools.
- Product matching now has scenario coverage for the most important technical lanes.
- Discovery keeps its inference, validation, project-save, and routing logic while presenting a cleaner live-call UI.
- Proposal and template flows preserve export/save paths, which is essential for moving from call capture to customer output.
- The generated product index no longer writes a wall-clock timestamp, so builds do not create noisy dirty diffs.
- Browser smoke, route smoke, readiness, typecheck, build, and matching checks are all passing.

## Weaknesses To Strengthen

1. **Client-side persistence is still the main operational risk.** Project state is local and browser-based. Live sales calls need durable autosave, user identity, recovery, and cross-device continuity.
   - Improve with a real backend project store, per-user auth, autosave conflict resolution, and server-side backups.

2. **CSS has accumulated too many override layers.** The app now looks cleaner, but `entry.css` still contains historical patches and repeated density overrides.
   - Improve by extracting shared `PageHeader`, `DecisionCard`, `SideSummary`, `ActionBar`, and `DetailDrawer` patterns, then deleting old CSS patch blocks.

3. **Product intelligence is large and diff-heavy.** The product JSON and generated public index are useful, but current updates create very large diffs and make review harder.
   - Improve with a canonical source file, generated artifacts policy, schema validation, lifecycle metadata, and smaller incremental update files.

4. **Live-call confidence is not yet backed by full evidence trails.** Discovery, Finder, Compare, and Proposal expose confidence, but reps still need clearer "safe to say" versus "needs validation" states.
   - Improve with a shared confidence contract and customer-safe wording gates before proposal/export.

5. **Document ingest needs deeper test coverage.** PDF/DOCX ingest is important for tenders, but extraction quality and edge cases need repeatable fixtures.
   - Improve with sample tender fixtures, parser regression tests, and extraction confidence scoring.

6. **Accessibility and keyboard flow need a focused pass.** The new collapsed panels reduce clutter, but drawers, details controls, and route changes should be checked with keyboard and screen-reader expectations.
   - Improve with focus trapping for drawers, escape-to-close, clear labels, and Playwright accessibility checks.

7. **Security posture needs hardening before customer data is stored centrally.** Local-only use lowers immediate risk, but live sales usage will involve customer files, project notes, and exports.
   - Improve with content security policy, sanitized HTML export review, file upload constraints, secret scanning, audit logging, and role-based access.

8. **Proposal output still needs commercial governance.** The restored BOM/export path works, but quote-ready output needs availability, lifecycle, region, and accessory dependency checks.
   - Improve with lifecycle validation, region-aware product availability, mandatory accessory rules, and final review gates.

## Live Sales-Call Readiness Priorities

1. Add durable project autosave and recovery.
2. Standardize confidence states across Discovery, Finder, Compare, and Proposal.
3. Add a single call workspace mode that can move between question, notes, confidence, next action, and save-to-project without page switching.
4. Consolidate CSS into reusable app components.
5. Add fixture-based tests for ingest, matching, template save/export, and proposal generation.
6. Add source/date metadata to product intelligence and proposal evidence.

## Verification Run

- `npm run typecheck`
- `npm run build`
- `node tools/route-smoke-check.mjs`
- `node tools/production-readiness-check.mjs`
- `node tools/workflow-integration-check.mjs`
- `node tools/check-product-matching-scenarios.mjs`
- `node tools/browser-smoke-check.mjs`
- In-app browser visual pass across Dashboard, Discovery, Finder, Sales Helper, Proposal, Templates, and Product Pitch.
