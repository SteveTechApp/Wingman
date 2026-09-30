# A2 staging record — Render stand-up (2026-09-30)

Launch action **A2** of [LAUNCH_DECISIONS_CHECKLIST.md](../LAUNCH_DECISIONS_CHECKLIST.md) §6,
executed per [RENDER_STANDUP_RUNBOOK.md](../RENDER_STANDUP_RUNBOOK.md). This file is the
"staging record" the runbook's §5 epilogue requires — filed next to the checklist as the
evidence that staging exists and is verified, not just reachable.

## Pre-flight (§0) — done

| Item | Value / state |
|---|---|
| Deploy commit (deploy exactly this) | **`72e1eaf6`** — main HEAD; full `npm run verify` chain green on it in CI (18/18 checks on PR #246) |
| Blueprint ground truth | `render.yaml` — services `wingman` + `wingman-api`, region `frankfurt`, `autoDeploy: false`, health paths `/` and `/api/ready` |
| Schema to paste | `server/migrations/001_initial_schema.sql` (237 lines; 002 included on a fresh DB) |
| Secret hygiene | `git ls-files \| grep -i env` → only `.env.example` ✓ |
| Harness-side sanity at the commit | governed suites + load-harness suite green; size budgets OK |

## Runbook progress

| Step | Owner | State |
|---|---|---|
| §1 Supabase project `wingman-staging` (West EU/London, schema applied, URL + service_role key collected) | Steve (dashboard) | ☐ pending |
| §2 Blueprint apply (branch `main`, both services, secrets entered, plan → Starter, region Frankfurt) | Steve (dashboard) | ☐ pending |
| §3 Environment table verified against the runbook (batch edits; CSRF already `true`) | Steve (dashboard) | ☐ pending |
| §4 `storage.mode.resolved` log line + Events-tab commit == `72e1eaf6` | Steve (dashboard), value ← paste here | ☐ pending |
| §5 Acceptance checks 1–8 | scripted + UI | ☐ pending |
| §6 Monitoring (Render notifications; monitor 1 = `/api/ready` keyword `"ready":true`, monitor 2 = frontend 200; alert after 2 fails) | Steve (dashboard) | ☐ pending |
| §7 Handover table completed | joint | ☐ pending |

## Filled-in values (during execution)

- Frontend URL: `_____________`
- Backend URL: `_____________`
- `storage.mode.resolved` line: `_____________`
- §5 result: `PASS __ / FAIL __` (attach the acceptance-script output)
- Supabase region/plan: `_____________`
- Render plan: `Starter (recommended) / Free`

## Definition of done for A2

Every §5 row PASS, §4 log line shows `"resolved":"supabase-tables","failClosed":true`,
deployed commit == `72e1eaf6`, monitors green. Then: tick A2 in the checklist §6 table
and transfer the staging entry to LAUNCH_CHECKLIST §4 — A3 (load test) and A4 (device
UAT) unblock immediately after.
