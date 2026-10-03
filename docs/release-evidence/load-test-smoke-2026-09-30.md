# Load test evidence — production-like-load — measured 2026-09-30

Evidence for release criterion 'production-like-load'. Dated '--strict' load run against
a real server: every budgeted scenario met its recorded p95/p99/error budget,
so the run is attributable evidence, not a best-effort sample.

## Run configuration

- Level: **smoke** (concurrency per level), 3 virtual workspace session(s)
- project-save payload preset: **standard**
- Server storage mode (server /api/wingman/health): configured=file active=file
- Measured at: 2026-09-30T09:08:41.143Z

## Measured results (--strict budgets enforced)

| Scenario | Requests OK | p95 (ms) | p99 (ms) | Error rate | Budget |
|---|---|---|---|---|---|
| health | 20/20 | 3 | 4 | 0.00% | pass |
| project-list | 20/20 | 9 | 9 | 0.00% | pass |
| project-save | 20/20 | 78 | 80 | 0.00% | pass |
| compare | 20/20 | 17 | 17 | 0.00% | pass |

Budgets recorded in docs/LOAD_TESTING.md and mirrored by the manifest's
maxP95Ms / maxP99Ms / maxErrorRate fields; the '--strict' gate exits non-zero
on any violation, so this artifact cannot exist for a red run.

## Verification

- Command: 'node tools/load-test.mjs --strict --evidence production-like-load' (full argv in the run log)
- All budgeted scenarios met their recorded budgets: **yes**
- Harness enforces authenticated sessions, warm-up-excluded steady-state
  measurement, and (supabase-tables mode) direct-from-Postgres persistence
  read-back before a run can pass.
