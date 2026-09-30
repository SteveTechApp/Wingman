# Offline sync resilience — measured 2026-09-30

Evidence for release criterion `offline-sync-resilience`. The offline/reconnect
sync path is exercised end-to-end against a real server on every critical-e2e
run: airplane-mode edits, reconnect, 409 conflict surfacing, in-app resolution
through both banner paths, and a clean re-sync afterwards. Core fix committed
as `2a772676` (revision trail), variant coverage as `f4022e13` (Keep-my-edits).

## Measured behaviour (Chromium, `node tools/run-windows-critical-e2e.mjs --offline`)

| # | Scenario | Result |
|---|---|---|
| 1 | Desktop + tablet preserve the offline edit when the server is newer | pass (4.3 s) |
| 2 | 409 surfaces the in-app banner; **Keep server copy** adopts revision 18, record synced, input shows 18, zero redundant re-pushes past the debounce | pass (4.5 s) |
| 3 | **Keep my edits** re-bases the dirty 42 on the server revision, pushes once; server ends at 42, banner cleared, project clean | pass (4.4 s) |
| 4–6 | Responsive UAT at mobile / tablet / desktop viewports | pass (7.4 / 8.3 / 8.5 s) |

Suite total: **6 passed (37.9 s)** against a real server, measured 2026-09-30.

## Revision-trail guarantee (one revision per edit)

Before `2a772676`, every conflict adoption minted a phantom server revision:
server-source saves re-announced themselves as local edits, and the payload's
volatile bookkeeping (`lastModified`, `synced`, `serverTimestamp`) defeated the
server's whole-JSON fingerprint. Now:

- the server fingerprint hashes **content only**, so identical-content replays
  are idempotent regardless of bookkeeping (`server/site-survey-sync.test.mjs`);
- server-source saves are silent — the adoption echo schedules no re-push
  (regression test waits past the 1 s debounce and asserts zero fetches,
  `src/wingman2/lib/siteSurveySync.test.ts`).

## Manual UAT remains a separate, human criterion

`offline-reconnect-uat` (two named accounts, real phones/tablets, evidence
pack) stays blocked as its own manifest row; this criterion attests the
automation layer only.
