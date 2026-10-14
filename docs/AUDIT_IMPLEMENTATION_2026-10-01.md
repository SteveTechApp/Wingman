# Wingman audit implementation — 1 October 2026

The implementation removes obsolete runtime and validation scaffolding, reduces initial bundle cost, isolates authenticated responses from service-worker caches, and makes ordinary builds and test bootstrap independent of source repairs. It retains decision eligibility, legacy URL redirects, export parity and local offline edits.

## Delivered changes

- Removed unused Support/Call Cards route implementations, Documents/Response Pack hub exports and excluded lazy registrations. Embedded features and redirect destinations remain reachable.
- Removed three global DOM helpers that manipulated retired presentation or duplicated React behaviour, their unused CSS, and 48 proven obsolete selector rules. The remaining display-scale observer coalesces callbacks and avoids unchanged writes.
- Removed the visible UI mode chooser; existing stored layout preferences remain compatible.
- Reduced the Compare bridge to routing. Candidate and decision guards now run meaningful existing behavioural suites rather than validating dummy exports or wrapper comments. Workflow checks follow the current implementation.
- Shared catalogue summary/full-detail loading across consumers, bounded full hydration to six workers per batch, retained transient failure retries, and cleared the catalogue cache on workspace activation/sign-out. Idle Compare waits until a comparison starts before loading full product detail.
- Moved graph-editor CSS into its feature module, removing its eager runtime preload. Split generated governance data and product stories from project-core, and removed an ineffective dynamic import.
- Bypassed service-worker caching for API and cross-origin requests. Static offline asset caching remains. Service-worker activation only removes obsolete Wingman caches; build stamping uses the configured output directory.
- Added canonical-only test bootstrap with tracked-source fingerprint coverage. `npm run build` compiles without repairing catalogue evidence; `npm run build:prepare-data` explicitly regenerates it. Source maintenance remains explicit. The existing AV-over-IP source corrections were applied and regenerated rather than hidden inside validation.
- Aggregate visual verification runs the shared dashboard checker once. Runtime reachability checks now start at the application entry and traverse the route graph. Budget limits were lowered where reductions were measured; project-core now has its own budget.
- Updated stale Windows browser checks to the market-first Discovery flow, paginated template library and current dashboard destinations. Added an idle-Compare request regression.

## Production bundle measurements

Raw emitted bytes from the same local build workflow; these are not latency measurements.

| Metric | Audit baseline | After implementation | Change |
|---|---:|---:|---:|
| Entry JS plus HTML modulepreloads | 568,224 | 385,387 | −32.2% |
| Project-core chunk | 1,380,135 | 328,024 | −76.2% |
| All emitted JavaScript | 7,086,085 | 7,066,735 | −0.3% |
| All emitted CSS | 974,307 | 963,602 | −1.1% |
| Competitor registry | 874,984 | 874,984 | unchanged |

Splitting changes when code is downloaded; it does not eliminate all dependencies. Full active comparisons still hydrate catalogue detail to retain decision evidence. Browser checks confirm zero per-product detail requests on idle Compare at desktop, tablet and mobile widths.

## Verification

- Full strict typecheck, lint and Vitest suite passed: 378 files, 2,745 tests passed, one skipped. Lint retains 59 existing warnings.
- Build, architecture, dependency and size-budget gates passed; data verification passed after explicit source maintenance.
- Contract verification passed, including 21 authenticated HTTP API contract checks, rendered Compare scenarios, route consolidation and runtime reachability.
- Visual/style verification passed without relaxing the style baseline. Screen/DOCX/PDF proposal parity passed with 11 semantic markers and three SKU quantities.
- All 24 existing Windows critical browser cases passed across desktop/tablet/mobile in scoped reruns after fixing obsolete test expectations; the three new idle-Compare cases also passed. Earlier failures and their fixes were confined to stale navigation, market-entry and template-grid expectations.
- All six offline reconnect/conflict-resolution browser cases passed, including mobile, tablet and desktop checks.
- Authenticated local file-store smoke load passed with 100% success: health p95 3.44 ms, project save p95 69.83 ms and project list p95 52.75 ms, three virtual users and a 326.4 KB project payload. This does not establish staging or Supabase performance.
- Reviewed changes were synchronised to the main checkout with existing edits and newer commits preserved. Generated proposal evidence already edited in main was retained rather than replaced by this verification run.

## Remaining recommendations and prerequisites

1. **Compact Compare decision index:** derive an explicit schema containing every eligibility/ranking field, compare decisions against full records, then hydrate rich evidence only for selected/shortlisted products. This implementation provides safe deferral/coalescing/concurrency bounds; it does not claim to have eliminated the active-comparison waterfall.
2. **Manufacturer registry splitting:** retain cross-brand search and candidate parity while separating brand-specific data. The 875 KB registry remains the largest known shared catalogue chunk.
3. **CSS ownership and large page modules:** obsolete rules are removed, but the large route/workflow styles and feature pages still need incremental extraction around mounted surfaces. Use representative visual comparisons and confidence-tone checks for each extraction.
4. **Backend storage decomposition:** profile lock wait, snapshot/serialization cost and targeted writes under authenticated staging load before changing storage interfaces or transaction semantics. The local smoke result does not justify an architectural rewrite by itself.
5. **Release evidence:** complete actual mobile/slow-network performance traces, authenticated staging measurements and human/device UAT. External evidence gates remain open; local checks are not substitutes.

No commit, deployment or release approval is included in this change.
