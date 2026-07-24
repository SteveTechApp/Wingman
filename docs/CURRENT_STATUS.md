# Wingman current status

_Last updated: 2026-07-24_

## Where status lives now

**`docs/PRE_PRODUCTION_REPORT.md` is the live status document.** It records gate results that were
actually executed rather than asserted, and carries the prioritised route to production.

This file previously held a status table in which every row read "Pending", alongside two other
documents tracking overlapping state. That spread status across three places and made stale
entries look identical to real blockers. It is now a pointer, not a second source of truth.

## Current position at a glance

| | |
|---|---|
| Build / quality gate | `npm run verify` exits 0 across all stages |
| Tests | 717 passing across 88 files |
| Coverage | 68.9% lines, 61.0% branches, enforced by threshold in CI |
| Largest open risk | Governed technical data coverage - see P0-2 in the pre-production report |
| Launch shape | Internal pilot first; customer-facing output gated on the technical-data ratchet |

## How to refresh this

Do not hand-edit a status table here. Run the gates and read the result:

```bash
npm run verify
```

Stage by stage, if you want a faster signal:

```bash
npm run verify:fast
```

`verify:fast` runs typecheck, lint and the test suite in about a minute and catches most breakage.
The remaining stages (`verify:data`, `verify:contract`, `verify:visual`) cover data governance,
route and workflow contracts, and the visual guard suite.

## Related documents

- `docs/PRE_PRODUCTION_REPORT.md` - live status, blockers, and the plan to production.
- `docs/LAUNCH_CHECKLIST.md` - the go/no-go checklist for the launch itself.
- `docs/OPERATIONS.md` - runbooks, rollback, and operational procedure.
- `docs/production-readiness-audit.md` - superseded historical audit, kept for context.
