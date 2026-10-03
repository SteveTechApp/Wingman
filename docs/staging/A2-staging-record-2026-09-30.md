# A2 staging record — Render stand-up (2026-09-30)

Launch action **A2** of [LAUNCH_DECISIONS_CHECKLIST.md](../LAUNCH_DECISIONS_CHECKLIST.md) §6,
executed per [RENDER_STANDUP_RUNBOOK.md](../RENDER_STANDUP_RUNBOOK.md). This file is the
"staging record" the runbook's §5 epilogue requires — filed next to the checklist as the
evidence that staging exists and is verified, not just reachable.

It doubles as A2's **working log**, same discipline as the A1 triage record: every
runbook step lands a dated entry in the Working log below the moment it happens
dashboard step or script run alike, and the progress table is updated in the same edit.

## Pre-flight (§0) — done

| Item | Value / state |
|---|---|
| Deploy commit (deploy exactly this) | **`51120195`** — main HEAD (merge of PR #251); CI on the merge commit 16/16 success (Lint, Type Check, Test, all three Verify lanes, Build, Browser Smoke, Governed Data Gate, Supabase live gates, Docker ×2, CodeQL, Dependency Audit); `npm run verify` chain was green on PR #246 at `72e1eaf6` (predecessor content) |
| Blueprint ground truth | `render.yaml` — services `wingman` + `wingman-api`, region `frankfurt`, `autoDeploy: false`, health paths `/` and `/api/ready` |
| Schema to paste | `server/migrations/001_initial_schema.sql` (237 lines; 002 included on a fresh DB) |
| Secret hygiene | `git ls-files \| grep -i env` → `.env.example` + `src/vite-env.d.ts` (a TypeScript ambient-types file, not a secret file) ✓ |
| Harness-side sanity at the commit | governed suites + load-harness suite green; size budgets OK |

## Runbook progress

| Step | Owner | State |
|---|---|---|
| §1 Supabase project `wingman-staging` (West EU/London, schema applied, URL + service_role key collected) | Steve (dashboard) | ☐ pending |
| §2 Blueprint apply (branch `main`, both services, secrets entered, plan → Starter, region Frankfurt) | Steve (dashboard) | ☐ pending |
| §3 Environment table verified against the runbook (batch edits; CSRF already `true`) | Steve (dashboard) | ☐ pending |
| §4 `storage.mode.resolved` log line + Events-tab commit == `51120195` | Steve (dashboard), value ← paste here | ☐ pending |
| §5 Acceptance checks 1–8 | scripted + UI | ☐ pending |
| §6 Monitoring (Render notifications; monitor 1 = `/api/ready` keyword `"ready":true`, monitor 2 = frontend 200; alert after 2 fails) | Steve (dashboard) | ☐ pending |
| §7 Handover table completed | joint | ☐ pending |

## Working log

**2026-09-30 — pre-flight complete (agent).** Deploy commit pinned to `51120195`
(main tip after the #251 merge; CI 16/16 green on the merge commit — Lint, Type
Check, Test, all three Verify lanes, Build, Browser Smoke, Governed Data Gate,
Supabase live gates, Docker ×2, CodeQL, Dependency Audit). Secret hygiene:
`git ls-files \| grep -i env` → `.env.example` + `src/vite-env.d.ts` (ambient
types, not a secret file). Blueprint ground truth verified against
[`render.yaml`](../../render.yaml): both services, Frankfurt, `autoDeploy: false`,
health paths `/` + `/api/ready`, exactly three `sync: false` secrets. Schema
ground truth: [`001_initial_schema.sql`](../../server/migrations/001_initial_schema.sql),
237 lines. Harness green (governed suites, load-harness suite, size budgets).

**2026-09-30 — acceptance script + record filed (agent).**
[`A2-acceptance-script-2026-09-30.sh`](A2-acceptance-script-2026-09-30.sh)
parameterized on `A2_APP` / `A2_API` / `A2_SESSION`; runs §5 checks 1, 2, 3, 4,
6, 7 with PASS/FAIL per condition and a summary. The fill-in-the-blank A3
command is staged and fires on an all-green §5.

**2026-09-30 — record refreshed post-merge (agent).** Deploy-commit references
updated `72e1eaf6` → `51120195` after the #251 merge moved main's tip; the
checklist §6 row and critical-path diagram updated to match (one historical
`72e1eaf6` mention kept above as CI provenance).

**Convention for future entries.** Every §1–§7 step lands a dated entry here
the moment it happens — dashboard steps (Steve) and script runs (agent) alike —
with the progress table updated in the same edit, mirroring the A1 triage
record's per-batch log. A2 is done when the last entry reads DONE.

## Filled-in values (during execution)

- Frontend URL: `_____________`
- Backend URL: `_____________`
- `storage.mode.resolved` line: `_____________`
- §5 result: `PASS __ / FAIL __` (attach the acceptance-script output)
- Supabase region/plan: `_____________`
- Render plan: `Starter (recommended) / Free`

## Definition of done for A2

Every §5 row PASS, §4 log line shows `"resolved":"supabase-tables","failClosed":true`,
deployed commit == `51120195`, monitors green. Then: tick A2 in the checklist §6 table
and transfer the staging entry to LAUNCH_CHECKLIST §4 — A3 (load test) and A4 (device
UAT) unblock immediately after.
