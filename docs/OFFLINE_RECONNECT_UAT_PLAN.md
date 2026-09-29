# Airplane-mode offline & reconnect UAT protocol

Closes the `offline-reconnect-uat` release criterion in
[`docs/release-evidence/release-evidence-manifest.json`](release-evidence/release-evidence-manifest.json):
_"Attach dated real-device evidence covering reconnect, duplicate update, and
conflict resolution."_

The offline behaviour is already pinned by automation
(`e2e/offline-reconnect.spec.ts`, run via
`node tools/run-windows-critical-e2e.mjs --offline`; result recorded in
[`docs/release-evidence/late-beta-v1-candidate.md`](release-evidence/late-beta-v1-candidate.md)).
Automation is **not** UAT. This criterion closes only when a human performs
the drills below on real devices with real radios switched off, and the signed
result is attached to the manifest.

The drills exercise the two offline persistence systems the app actually ships:

- **Site-survey edits** — cable lengths, device verifications, install
  confirmations. Saved locally (`wingman-site-survey-edits`), pushed and polled
  against `/api/wingman/site-survey/sync`. This is the offline-first surface
  and the one the criterion's wording maps to.
- **Saved projects** — the server-authoritative store with per-sub-document
  merge and revision counters (ADR-0001, `docs/design/0001-project-workspace-persistence.md`).
  Drill D covers its team-change conflict surfaces.

## 1. Scope and pass rule

- **Pass rule per drill:** every "Expected" observation in the drill script
  occurs as written, with a screenshot or the scribe's timestamped note as
  evidence. An observation that differs is a finding, not a footnote.
- **Pass rule overall:** Drills A, C, and D pass on the real-device matrix
  (§3), Drill B passes with its real-device leg plus the facilitated strict
  replay, zero open blockers, and `sign-off.md` attached.
- **Blocking-defect rule:** any of the following is a launch blocker, logged
  before the session ends: a saved edit is lost, a local or server value ends
  up wrong after the stated steps, a device cannot re-enter its data after
  reconnect, or the app crashes.
- **Non-blocking by default:** a missing or late banner/badge **with correct
  data underneath** is a UX defect, logged non-blocking. The value is the
  contract; the banner is the advisory.
- **Scope guard:** a product-data error seen while offline (wrong spec on a
  cached call card) is logged as a data defect with the SKU and triaged by the
  governed-data owners — not fixed live in the session.

## 2. Participants and roles

| Role | Who (named before the session) | Responsibility |
|---|---|---|
| Release owner | _name_ | Accepts the evidence, decides blocker severity, updates the manifest |
| Engineering owner | _name_ | Owns the expedite steps, runs the strict replay check |
| Facilitator | _name_ | Runs the session on script; operates the desktop reference device |
| Scribe | _name_ | Timestamps every finding with device + commit + repro step |
| Testers (2) | Field-facing staff | Perform the drills on their own phone/tablet |

## 3. Devices, accounts, and environment

| Class | Device | Network control | Purpose | Required |
|---|---|---|---|---|
| Small phone | Tester's own phone | **Real airplane mode** | Drills A, B, C | Yes |
| Tablet | iPad/Android tablet | Wi-Fi toggle off | Drill C second seat | Yes |
| Desktop | Facilitator's laptop | DevTools only | Reference, cross-checks, expedite steps, Drill B strict replay | Yes |

- All devices test the **staging** deployment (same URL, same commit). Record
  the commit hash shown on the staging footer or `/api/health` per device.
- **Two named accounts in one UAT workspace**, one per device (owner + an
  editing-role member). Do not share one login across two devices at once: the
  current auth policy maintains one active session per account, so sharing a
  login produces logouts that look like sync defects. If only one account
  exists, sign out and back in between device steps and note it in the result.
- Mobile network note: airplane mode is the honest offline (radio off). Do not
  simulate with "no service" corners or a captive portal.

## 4. What the app promises offline (the expected behaviour, from the code)

Testers judge against these promises; the scribe quotes what actually showed.

| Surface | Promise | Where it lives |
|---|---|---|
| Checklist badge | While offline, an edit sets the badge to "Offline — changes remain on this device" | `siteSurveySync.ts` push guard |
| Global banner | "Offline — Using cached product data. Call cards and battle cards are available." while offline; "Connection restored." for ~4 s after reconnect | `OfflineBanner.tsx` |
| Offline persistence | "You are offline. All changes are saved locally and will persist." Values survive tab close, app switch, and reload | `siteSurveyStorage.ts` (localStorage) |
| Reconnect flush | A pending offline edit reaches the server on the **next edit** or a **page reload** (sync starts with an initial push). Reconnect alone does not flush it — the badge keeps the offline message until a flush gesture | `SiteSurveyChecklist.tsx` online listener; `startSurveySync` initial push |
| Duplicate/replay | Pushing the identical edits payload twice is accepted once (`idempotent`) — no error, no duplicated effects, server timestamp unchanged | `decideSurveySync` hash check |
| Conflict, dirty local | When the server copy is newer and local edits are unsynced: HTTP 409, badge "Sync conflict — local changes were preserved", **local value untouched**, polling never overwrites dirty local | `decideSurveySync`; `pollForUpdates` dirty guard |
| Conflict, clean local | With no unsynced local edits, a server-newer copy is adopted automatically within ~10 s (two poll intervals), badge "Received updates from server" | `pollForUpdates` adoption path |
| Team-change conflict | When a colleague's sync lands between two of yours, the Projects row shows an amber "Team changed: …" badge and the project detail page shows the banner naming the changed lanes; it clears by itself after you reload and your next sync round-trips clean | ADR-0001 §1.2j |

Timing facts used in the scripts: edits push after a 1 s debounce; the
reconnect poll runs every 5 s; a push gives up after 10 s (a hung network shows
an error badge, it does not hang the page).

## 5. Before the session (facilitator checklist)

- [ ] Staging deployed from the nominated commit; `/api/health` green; footer hash recorded.
- [ ] Automation gate run and passing: `node tools/run-windows-critical-e2e.mjs --offline` (4/4 Chromium). Do **not** run the spec with a bare `npx playwright test` — that invocation starts no API and fails on connection-refused (documented in `late-beta-v1-candidate.md`).
- [ ] UAT workspace + two named accounts created; one test project with a topology (cables visible in the site-survey checklist) seeded.
- [ ] Project backend sync enabled on staging (`VITE_WINGMAN_ENABLE_PROJECT_BACKEND_SYNC`) — Drill D needs it.
- [ ] Defect log opened (`defects.csv`); screenshots possible on every device; airplane mode reachable in one gesture on each phone.
- [ ] Consent: testers know the session output is recorded as release evidence.

## 6. Session script (~95 minutes)

### Setup (10 min, facilitator-led)

1. Both testers sign in (account A on phone, account B on tablet/desktop).
2. Confirm the commit hash on screen matches the nominated build; if not, stop and redeploy.
3. Open the seeded project's Site Survey Checklist on every device; confirm each badge reads "Edits synced to server" before any radio is touched.

### Drill A — Airplane-mode edit, reconnect, recovery (25 min, phone)

1. Note the current cable length for the scripted route (the planned value).
2. Switch airplane mode **on**. Toggle one cable confirmation or edit one length.
3. Expected: checklist badge → "Offline — changes remain on this device"; global banner → "Offline — Using cached product data…"; checklist footer → "You are offline. All changes are saved locally and will persist."
4. Still offline: close the tab (or background the app), reopen, return to the checklist. Expected: the edited value is still there (local persistence).
5. Still offline: open one product call card from a cached surface. Expected: cached content or an honest offline page — never wrong data. (Wrong data = data defect with the SKU; no card at all = non-blocking UX defect.)
6. Switch airplane mode **off** and wait without touching anything (~10 s). Expected: the badge may keep the offline message — reconnect alone does not flush (§4). This is correct behaviour; note it.
7. Flush: make one further small edit (e.g. re-confirm the same cable). Expected: badge → "Edits synced to server" within a few seconds, carrying **both** the offline edit and this one.
8. Cross-check: on the desktop, open the same checklist. Expected: the offline-edited value appears within ~10 s.
9. Reload the phone page. Expected: value intact, badge "Edits synced to server".

**Artifact:** the server copy holds the offline-edited value (verified from the desktop).

### Drill B — Duplicate edits and replay (15 min, phone + desktop facilitation)

1. On the phone, repeat the same edit twice quickly (two taps inside one second). Expected: the 1 s debounce coalesces them — no error badge, final value equals the last tap, no duplicated rows in the comparison summary.
2. Reload replay: after a clean sync, reload the page. The initial push re-sends the identical edits. Expected: no error, value intact, badge settles at "Edits synced to server".
3. Strict replay (facilitator, desktop, DevTools console — the same replay
   the automated spec performs, expressed as raw API calls that work against
   any build):

   ```js
   const projectId = "<projectId>";
   const edits = JSON.parse(localStorage.getItem("wingman-site-survey-edits"))[projectId];
   const payload = { projectId, edits, clientTimestamp: new Date().toISOString(), baseServerTimestamp: edits.serverTimestamp };
   const post = () => fetch("/api/wingman/site-survey/sync", { method: "POST",
     headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
   const first = await post(); const second = await post();
   console.log(await first.json(), await second.json());
   ```

   Expected: both responses are `{ ok: true, outcome: "synced" }` with the
   same `serverTimestamp`; the second carries `idempotent: true` (the replay
   was recognised, not re-applied), and a later
   `GET /api/wingman/site-survey/sync?projectId=…` returns the single
   expected value.

**Artifact:** two identical pushes converge; no duplicate effects anywhere.

### Drill C — Conflict: server newer while local is dirty (25 min, phone + second seat)

Uses the same numbers as the automated spec (12 → desktop 18 → phone 42) so
human evidence and automation describe one sequence.

1. Phone (online): set the scripted cable to **12**, confirm; badge → "Edits synced to server" (server revision 1).
2. Phone: airplane mode **on**. Change the same cable to **42**. Expected: offline badge; value shows 42 locally.
3. Tablet or desktop (account B, same workspace, online): change the same cable to **18**; it syncs (server revision 2).
4. Phone: airplane mode **off**. Wait ~10 s without touching anything. Expected: badge → "Sync conflict — local changes were preserved" (arrives via the poll's dirty guard; a manual edit produces the same message via the 409).
5. **The core check:** the phone still shows **42**, every field unchanged. The second seat still shows **18**. Nothing was overwritten on either side.
6. In-app resolution attempt: make one further edit on the phone (e.g. add a note). Expected today: the conflict message persists — the site-survey sync has no in-app resolve control, and a resent push hits the same 409 (the local revision basis still points before revision 2). Log this as a defect with the repro; the release owner decides severity.
7. Expedited resolution (facilitator, phone DevTools — the same revision
   adoption the automated spec performs): read the current server revision,
   write it into the local copy, then let the tester re-make the 42 edit:

   ```js
   const key = "wingman-site-survey-edits";
   const projectId = "<projectId>";
   const record = await (await fetch(`/api/wingman/site-survey/sync?projectId=${encodeURIComponent(projectId)}`, { credentials: "include" })).json();
   const all = JSON.parse(localStorage.getItem(key));
   all[projectId].serverTimestamp = record.serverTimestamp;
   localStorage.setItem(key, JSON.stringify(all));
   ```

   Expected: the tester's next edit (the UI re-reads local state on every
   edit) pushes 42 against the current revision successfully; badge →
   "Edits synced to server"; server now holds **42**.
8. Convergence: on the second seat, wait ≤ two poll intervals. Expected: checklist shows **42** (clean adoption, badge "Received updates from server").
9. Adoption inverse (2 min): with the phone holding **no** unsynced edits, the second seat edits the cable again. Expected: the phone adopts the new value automatically within ~10 s — no conflict message.

**Artifact:** local preserved through the conflict; both devices converge on 42 after the stated resolution; clean seats adopt without prompting.

### Drill D — Team-change conflict on saved projects (15 min, desktop + phone)

1. Both devices open the same project. Desktop (A) edits the project name and waits for its saved state. Phone (B) edits the proposal customer name and waits for its saved state. (B's sync has now landed a revision A has not seen.)
2. Desktop: make one further small edit (e.g. tweak the name again). Expected: the sync response flags the unseen revision — the Projects row shows the amber "Team changed: Proposal" badge and/or the project detail page shows the banner naming the changed lane. The phone shows no badge (it was the last writer). Note: the badge surfaces on the next sync after the colleague's change lands; waiting alone does not surface it.
3. Desktop: reload the page, review the colleague's change, continue editing; next sync round-trips clean. Expected: the badge and banner clear by themselves — no manual dismissal exists or is needed.
4. Disjoint edits survive: desktop edits a discovery answer (discovery brief lane), phone edits a requirement row, both sync in either order. Expected: after a reload on both devices, **both** edits are present (per-sub-document merge, ADR-0001 §1.2b).

**Artifact:** the conflict is visible, names the lane, and clears after review; disjoint edits both survive.

### Exit questions (5 min, scribe records verbatim)

1. What nearly stopped you?
2. Where did the offline state surprise you?
3. What would you not trust to type while offline?

## 7. What gets recorded per drill

For each drill × device row:

- Expected observations met: yes / partially / no (a "partially" is a fail for closure; note what differed).
- The artifact exists and is correct: yes / no.
- Blocking defects encountered: IDs from the defect log.
- Badge/banner strings observed, quoted verbatim (they are the evidence).
- Minutes and the commit hash on screen.

## 8. Evidence pack and manifest wiring

Create one dated folder `docs/release-evidence/offline-reconnect-uat-YYYY-MM-DD/`
containing exactly these files:

| File | Content | Producer |
|---|---|---|
| `uat-summary.md` | The completed result template (§9) with every row filled, the overall pass/fail, blocker list, and the named approver + date | Scribe + release owner |
| `defects.csv` | One row per finding: id, drill, device, OS/browser, app commit, step, severity (blocker/ux/data), description, screenshot filename | Scribe |
| `device-matrix.md` | Every device actually used: model, OS version, browser version, network control, service-worker state, app commit, timestamps | Facilitator |
| `screenshots/` | At minimum: offline badge + banner, preserved 42 after conflict, converged 42 after resolution, team-change badge | Testers |
| `sign-off.md` | Named release-owner acceptance sentence: "I accept this dated evidence for the offline-reconnect-uat criterion" + name + date | Release owner |

Then set
`criteria[id="offline-reconnect-uat"].artifactPath` to the folder's
`uat-summary.md`, `measuredAt` to the session date, `approver` to the release
owner, and `claimedStatus` to `"pass"` — then run
`npm run generate:release-docs` and `npm run check:release-docs`.

Rules the release owner applies:

- **Pass** requires: Drills A/C/D passed on the real-device matrix, Drill B
  passed with its strict replay, zero open launch blockers, `sign-off.md`
  present.
- **Blocked stays blocked** if any core check failed, if a blocker is open, or
  if provenance (device/OS/commit) is missing. Do not infer a pass from a
  partial session.
- The manifest's 90-day expiry applies after closure.

## 9. Result template

> Copy this section to
> `docs/release-evidence/offline-reconnect-uat-<date>/uat-summary.md` and fill
> every cell. Empty cells keep the criterion **blocked**.

### Session provenance

| Field | Value |
|---|---|
| Session date | |
| Staging URL | |
| App commit hash | |
| Storage mode on staging (file / supabase-tables) | |
| Release owner (approver) | |
| Engineering owner | |
| Facilitator / scribe | |
| Accounts used (one per device) | |
| Automation gate (`run-windows-critical-e2e.mjs --offline`) | |

### Device matrix (as actually used)

| Device class | Model | OS version | Browser version | Network control | Service worker active | App commit |
|---|---|---|---|---|---|---|
| Small phone | | | | Airplane mode | | |
| Tablet | | | | Wi-Fi toggle | | |
| Desktop | | | | DevTools | | |

### Drill results

| Drill | Device | Expected observations met | Artifact correct | Minutes | Defect IDs | Notes (verbatim badge/banner strings) |
|---|---|---|---|---|---|---|
| A Offline edit → reconnect → flush | | | | | | |
| B Duplicate edits + strict replay | | | | | | |
| C Conflict preserved + resolved + convergence | | | | | | |
| C adoption inverse (clean seat) | | | | | | |
| D Team-change badge → review → clear | | | | | | |

### Blocking defects open at session end

| ID | Drill | Device | Step | Description |
|---|---|---|---|---|

Full log: `defects.csv`. Screenshots: `screenshots/`.

### Overall result (one box only)

- [ ] **Pass** — all drills met their expected observations, zero open blockers, `sign-off.md` attached.
- [ ] **Blocked** — at least one core check failed, an open blocker, or missing provenance. State the gap:

### Sign-off

See `sign-off.md` (named acceptance sentence + date). Without it this summary
is not closable evidence for `offline-reconnect-uat`.

## 10. Related criteria this does NOT close

- `mobile-sales-uat` — the unaided real-device journeys live in
  [`docs/MOBILE_UAT_PLAN.md`](MOBILE_UAT_PLAN.md); its Journey C backgrounding
  smoke is not this criterion's conflict/replay evidence.
- `production-like-load` — staging load measurement is separate.
- `production-observation-window` — requires live production telemetry after a
  real observation window.
