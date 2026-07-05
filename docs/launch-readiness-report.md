# Wingman launch-readiness report

_Last updated: 2026-07-05_

## Decision

Current decision: **No external launch until verification, infrastructure, security and UAT gates are complete.**

## Readiness gates

| Gate | Status | Evidence required |
|---|---|---|
| Build passes | Pending | `npm run build` output. |
| Tests pass | Pending | `npm run test` or agreed test command output. |
| Verify gate passes | Pending | `npm run verify` output if script exists. |
| Product recommendation guardrails pass | Pending | Compare/finder/product-story tests. |
| Text hygiene active scan passes | Pending | `npm run text:hygiene`. |
| Supabase production ready | Pending | Project provisioned, migration applied, data path tested. |
| CSRF/security ready | Pending | CSRF implemented/tested, secrets rotated. |
| Monitoring ready | Pending | Monitoring path and owner defined. |
| Load test complete | Pending | Load-test report. |
| UAT complete | Pending | 2-3 user sessions and issue triage. |
| Go/no-go sign-off complete | Pending | Dated sign-off. |

## P0 actions

1. Run build/test/verify and record the results in `docs/CURRENT_STATUS.md`.
2. Narrow text hygiene to active files only.
3. Do not commit broad archive/worktree/generated hygiene changes.
4. Confirm product recommendation lifecycle gates.
5. Resolve blocking security and production infra tasks.

## P1 actions

1. Resolve product data review queue.
2. Refresh production tracker from current repo state.
3. Run load testing.
4. Complete UAT.

## P2 actions

1. Update documentation map.
2. Archive stale readiness/action-plan material.
3. Create dated launch sign-off artefact.
