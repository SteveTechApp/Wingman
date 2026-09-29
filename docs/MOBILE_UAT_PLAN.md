# Mobile sales representative UAT plan (real devices)

Closes the `mobile-sales-uat` release criterion in
[`docs/release-evidence/release-evidence-manifest.json`](release-evidence/release-evidence-manifest.json):
_"Attach a dated, signed result from the agreed phones and tablets."_

A desktop browser pass, the Playwright mobile-width specs, and the axe
accessibility suite are **not** UAT. This criterion closes only when real
sales representatives complete the agreed journeys on the agreed physical
devices against the staging deployment, and the signed result is attached to
the manifest.

## 1. Scope and pass rule

- **Journeys under test:** the three money-path journeys the release owner
  agrees in writing before the session (default set in §4).
- **Pass rule per journey:** the tester completes every step unaided — no
  help from the facilitator except scripted prompts — and the artifact the
  journey exists to produce is correct (proposal sections, quote blockers,
  saved project state).
- **Pass rule overall:** every journey passes on every agreed device class
  (one small phone, one large phone, one tablet). A journey that passes on
  tablet but not phone is a fail, not a footnote.
- **Blocking-defect rule:** any defect that stops a journey, loses saved
  work, or shows wrong product/quote data is a launch blocker and is logged
  before the session ends. Cosmetic issues are logged non-blocking.
- **Scope guard:** discovery of a product-data error (wrong spec, dead
  evidence link) is logged as a data defect with the SKU — it is triaged by
  the governed-data owners, not fixed live in the session.

## 2. Participants and roles

| Role | Who (named before the session) | Responsibility |
|---|---|---|
| Release owner | _name_ | Agrees the journey list, accepts the evidence, updates the manifest |
| Sales lead | _name_ | Recruits the testers, protects their time, signs the summary |
| Facilitator | _name_ | Runs the session, keeps it on script, never touches the device |
| Scribe | _name_ | Timestamps every defect with device + app version + repro step |
| Testers (3) | 2–3 working salespeople | Complete the journeys on their own device; speak their thinking |

Recruiting bar: testers must have quoted a real customer in the last quarter.
A tester who has never used the desktop tool is acceptable — the point is to
learn what a rep actually experiences — but note which testers are new so
their results are not averaged away.

## 3. Device matrix (agreed minimum)

| Class | Example device | OS at test time | Network path | Required |
|---|---|---|---|---|
| Small phone | iPhone SE-class or Android ≤6.1" | Current shipping iOS/Android | Staging via HTTPS on office Wi-Fi | Yes |
| Large phone | iPhone Pro Max-class / Android ≥6.7" | Current shipping | Cellular (not Wi-Fi) for at least one journey | Yes |
| Tablet | iPad-class or Android tablet, one landscape run | Current shipping | Office Wi-Fi | Yes |

Before the session: record OS version, browser (Safari/Chrome), app commit
hash (shown on the staging footer or `/api/health`), date, and network for
every device in the result template (§6). Evidence without this provenance is
not closable evidence.

## 4. Session script (per tester, ~90 minutes)

### Setup (10 min, facilitator-led)

1. Tester opens the **staging** URL (never local, never production) in their
   device browser and signs in with the UAT workspace account created for the
   session (`wingman-uat-<date>` workspace, throwaway credentials).
2. Facilitator confirms the app version hash on screen matches the build the
   release owner nominated. If it does not match, stop and redeploy.
3. Tester bookmarks / adds to home screen. Facilitator notes how many taps
   this took (finding, not defect).

### Journey A — Discovery to proposal (35 min, phone)

1. Start a Discovery interview from the dashboard.
2. Work through the guided questions for the scripted customer brief
   (facilitator reads the brief; it uses a **3-display sports bar** so the
   topology is non-trivial).
3. Accept the recommendation; review the product list on the phone.
4. Open the proposal completion flow; fill customer name and contact.
5. **Artifact:** export/save the proposal. Confirm the seven safety sections
   render and the quote blockers shown on screen match the open questions.
6. Answer the exit questions (§5).

### Journey B — Call card to compare (25 min, large phone, one journey on cellular)

1. Open the product call cards; find the scripted SKU (a known competitor
   match, e.g. a HDBaseT transmitter comparison).
2. Open quick compare for that SKU. Confirm the WyreStorm match shows
   evidence-led connections, not placeholders.
3. Add the matched product to the current project.
4. **Artifact:** the project shows the product selection in its saved state
   after a full page reload.

### Journey C — Saved project recovery (20 min, tablet, landscape)

1. Reopen the project created in Journey A (by the same tester, or seeded by
   the facilitator for the first tester).
2. Change one requirement; save; reload; confirm the change persisted.
3. Background the browser tab for 60 seconds (screen lock is fine), return,
   and continue editing. Confirm no duplicate or lost edit appears.
4. **Artifact:** the project history shows both edits in order.

### Exit questions (5 min, scribe records verbatim)

1. What nearly stopped you?
2. What would you not trust on a customer site?
3. What did you reach for that was not there?

## 5. What gets recorded per journey (the evidence, not the vibes)

For each tester × device × journey row:

- Completed unaided: yes / partially / no (a "partially" is a fail for
  closure purposes; note what the facilitator had to do).
- Minutes to complete (rough timing is fine).
- Blocking defects encountered: IDs from the defect log.
- The artifact exists and is correct: yes / no.
- One-sentence trust verdict from the tester ("would you read this proposal
  to a customer?").

## 6. Evidence pack (what the manifest links to)

Create one dated folder `docs/release-evidence/mobile-uat-YYYY-MM-DD/`
containing exactly these files, then set
`criteria[id="mobile-sales-uat"].artifactPath` to the folder's
`uat-summary.md`, `measuredAt` to the session date, `approver` to the release
owner, and `claimedStatus` to `"pass"` — then run
`npm run generate:release-docs` and `npm run check:release-docs`.

| File | Content | Producer |
|---|---|---|
| `uat-summary.md` | The completed result template (`MOBILE_UAT_RESULT_TEMPLATE.md`) with every row filled, the overall pass/fail, blocker list, and the named approver + date | Scribe + release owner |
| `defects.csv` | One row per defect: id, journey, device, OS/browser, app commit, step, severity (blocker/cosmetic), description, screenshot filename | Scribe |
| `device-matrix.md` | Every device actually used: model, OS version, browser version, network, app commit, session timestamps | Facilitator |
| `screenshots/` | At minimum: proposal export render, compare card, saved-project reload — one set per device class | Testers |
| `sign-off.md` | Named release-owner acceptance sentence: "I accept this dated evidence for the mobile-sales-uat criterion" + name + date | Release owner |

Rules the release owner applies when filling the manifest:

- **Pass** requires: all journeys passed unaided on all device classes, zero
  open launch blockers from the session, `sign-off.md` present.
- **Blocked stays blocked** if any row is "partially"/"no", if a blocker is
  still open, or if provenance (device/OS/commit) is missing. Do not infer a
  pass from a partial session.
- The manifest's 90-day expiry applies after closure: a stale UAT is not
  evidence for a later release.

## 7. Before the session (facilitator checklist)

- [ ] Staging deployed from the nominated commit; `/api/health` green; footer hash matches.
- [ ] UAT workspace account created; test project seeds prepared (Journey C seed).
- [ ] Journey list and scripted customer brief agreed in writing by the release owner.
- [ ] Device matrix confirmed; large phone has cellular service; tablets charged.
- [ ] Defect log opened (`defects.csv` template ready); screenshots possible on every device.
- [ ] Consent: testers know their session output is recorded as release evidence.

## 8. Related criteria this does NOT close

- `offline-reconnect-uat` — Journey C step 3 is a smoke of backgrounding, not
  the offline/reconnect/conflict criterion. That closes via the airplane-mode
  drills in [`docs/OFFLINE_RECONNECT_UAT_PLAN.md`](OFFLINE_RECONNECT_UAT_PLAN.md).
- `production-like-load` — staging load measurement is separate.
- `production-observation-window` — requires live production telemetry after
  a real observation window.
