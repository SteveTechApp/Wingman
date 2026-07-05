# Wingman current status

_Last updated: 2026-07-05_

## Current position

Wingman is in late-stage pre-launch hardening.

The documentation set contains useful launch, operations, Supabase, production-readiness, product-governance and design material, but status was spread across multiple documents. This file is now the live status source.

## Launch state

| Area | Current status | Required action |
|---|---|---|
| Build | To be verified from current repo | Run `npm run build` and record result below. |
| Tests | To be verified from current repo | Run `npm run test` or current test command and record result below. |
| Verify gate | To be verified from current repo | Run `npm run verify` if available. |
| Text hygiene | Needs narrowed active-only workflow | Use `npm run text:hygiene` for active scan. Do not run full write mode unless deliberately auditing archives/worktrees. |
| Product data | Strong but review queue remains | Resolve polluted/review SKUs and lifecycle review items before sales-facing launch. |
| Supabase | Provisioning required | Create production project, apply migration and test data path. |
| Security | CSRF and secret rotation need completion | Finish CSRF workflow and document secret rotation. |
| Monitoring | Required before launch | Add operational monitoring and incident response path. |
| Load testing | Required before launch | Run documented load test and record result. |
| UAT | Required before launch | Complete 2-3 user UAT sessions and go/no-go sign-off. |

## Latest verification log

| Check | Command | Result | Notes |
|---|---|---|---|
| Build | `npm run build` | Pending |  |
| Tests | `npm run test` | Pending |  |
| Verify | `npm run verify` | Pending |  |
| Text hygiene | `npm run text:hygiene` | Pending | Active scope only. |

## Current blockers

1. Confirm current build/test/verify status.
2. Keep text hygiene fixes active-scope only.
3. Resolve product-story/lifecycle review queue.
4. Complete production Supabase provisioning.
5. Complete CSRF, secret rotation and monitoring.
6. Complete load test and UAT sign-off.

## Commit guidance

Do not commit `_review/`.

Preferred staged set for this documentation action:

- `docs/CURRENT_STATUS.md`
- `docs/product-data-health.md`
- `docs/launch-readiness-report.md`
- `docs/DOCUMENTATION_MAP.md`
- `tools/audit-text-hygiene.mjs`
- `package.json`
