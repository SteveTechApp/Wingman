# Mobile UAT result — `<session date>`

> Copy this file to `docs/release-evidence/mobile-uat-<date>/uat-summary.md`
> and fill every cell. Empty cells keep the criterion **blocked**.
> Plan: [`docs/MOBILE_UAT_PLAN.md`](MOBILE_UAT_PLAN.md).

## Session provenance

| Field | Value |
|---|---|
| Session date | |
| Staging URL | |
| App commit hash | |
| Release owner (approver) | |
| Sales lead | |
| Facilitator / scribe | |
| Journeys agreed in advance | A Discovery→proposal · B Call card→compare · C Saved project recovery |

## Device matrix (as actually used)

| Device class | Model | OS version | Browser version | Network | App commit on screen |
|---|---|---|---|---|---|
| Small phone | | | | | |
| Large phone | | | | | |
| Tablet | | | | | |

## Tester × device × journey results

One row per tester per device. A journey that needed facilitator help is
"partially" and fails closure.

| Tester | Role / experience | Device class | Journey | Completed unaided | Minutes | Blocking defect IDs | Artifact correct | Trust verdict (verbatim) |
|---|---|---|---|---|---|---|---|---|
| | | | A | | | | | |
| | | | B | | | | | |
| | | | C | | | | | |

## Exit questions (verbatim, per tester)

| Tester | Nearly stopped them | Would not trust on site | Reached for but missing |
|---|---|---|---|

## Blocking defects open at session end

| ID | Journey | Device | Step | Description |
|---|---|---|---|---|

Full log: `defects.csv`. Screenshots: `screenshots/`.

## Overall result (one box only)

- [ ] **Pass** — every journey unaided on every device class, zero open blockers, `sign-off.md` attached.
- [ ] **Blocked** — at least one row not unaided, an open blocker, or missing provenance. State the gap:

## Sign-off

See `sign-off.md` (named acceptance sentence + date). Without it this
summary is not closable evidence for `mobile-sales-uat`.
