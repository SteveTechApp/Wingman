# Wingman Pre-Production Report

_Measured: 2026-09-08 · Branch `main` @ `2f8f3a5c` · Version `0.9.0`_

## Verdict

Wingman is a late-beta product with a green engineering baseline and broad, guarded sales
workflows. It is suitable for a controlled authenticated internal pilot. It is not yet defensible
as v1.0 because production-like load, real-device sales UAT, offline reconciliation,
large-workspace performance and cross-format proposal parity lack dated release evidence.

## Evidence executed on this commit

| Gate or measure | Result |
|---|---|
| Full verification | PASS — `npm run verify` completed fast, build, data, contract and visual stages in the pre-commit hook |
| TypeScript | PASS using `tsconfig.typecheck.json` |
| Lint | PASS with 0 errors and 35 non-blocking warnings |
| Unit/integration tests | 2,368 passing across 308 files |
| Size and style ratchets | PASS without raising either baseline |
| API contract | PASS — 19 authenticated and unauthenticated HTTP checks |
| Routes | 29 routed features checked |
| Catalogue | 315 WyreStorm products; 354 competitor products across 28 brands |
| Technical governance | 133/133 active lead SKUs verified; 3 profiles at the 14-day confirmation warning threshold |
| Story governance | 137/137 active catalogue SKUs covered |
| Template lifecycle | 44 referenced SKUs resolve active across 55 room templates |

## Open release risks

### P0 — external evidence required

1. No dated sales-representative UAT on agreed phone and tablet targets.
2. No strict authenticated staging load run attributable to a production-like deployment.
3. No release artifact proving offline edit, reconnect and reconciliation behaviour.

These require a staging environment and named human test sessions; a local green gate cannot
close them.

### P1 — engineering completion

1. Complete client adoption of the guarded per-project push endpoint.
2. Split the 10,701,624-byte product intelligence index into summary and deferred detail.
3. Produce a dated proposal parity matrix across screen, DOCX and PDF.
4. Schedule large-workspace p95/p99, error-rate and payload-budget enforcement.
5. Add release-level journey completion and failure measurement.

### P2 — quality debt to contain

- Lint reports 35 warnings, including accessibility labels, unused bindings and hook dependencies.
- Expected jsdom navigation diagnostics obscure otherwise passing test output.
- The Compare source-repair audit reports advisory mojibake in `src/wingman2/pages/DataManagerPage.tsx`.
- Three room templates retain source/display-ratio warnings requiring explicit assumptions.

## Release decision

Proceed with an authenticated internal pilot while Tasks 3–5 in the dated release sequence collect
staging/UAT evidence, finish scale work and publish the final v1 evidence matrix. Do not label the
product v1.0 until each criterion in `docs/DEVELOPMENT_MILESTONES.md` section 5 links to a dated
passing artifact or an explicit release-owner risk acceptance.
