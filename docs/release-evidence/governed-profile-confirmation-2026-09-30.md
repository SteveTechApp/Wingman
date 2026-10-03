# Governed-profile confirmation — measured 2026-09-30

Evidence for release criterion `governed-profile-confirmation` (launch action
A1). Every governed technical profile in the tracked store
(`data/governance/wyrestorm-technical-profiles.json`) is human-verified: 206 of
206 with a named reviewer and a confirmation date. The confirmation-aging gate
(`check:technical-data:strict`) reports zero profiles awaiting or overdue for
confirmation on that data.

## Confirmation ledger (the dates are the artifact)

| Confirmation date | Reviewer of record | Profiles | Scope |
|---|---|---|
| 2026-08-16 | Steve Goodwin | 116 | Batches 1–2: full catalogue pass |
| 2026-09-30 | Steve Goodwin | 90 | Batches R1–R5: machine-transcribed profiles the aging gate flagged (3 at 36d, 87 at 31d) — triaged and confirmed batch-wise, plus five max-resolution prose normalizations the drift gate required before sign-off |
| **Total** | | **206 / 206 verified** | zero awaiting, zero overdue |

Both dates are recorded per-profile in the tracked store as
`verification.verifiedBy` + `verification.verifiedAt`; the two rows above are
the aggregate of those fields, not a separate claim. The 2026-08-16 pass was
originally recorded under the bare "Steve" and re-signed to "Steve Goodwin" on
2026-09-30 — same reviewer of record, same confirmed values, attribution only:
the apply tool refuses to mutate already-verified profiles, so this was a
deterministic migration of the attribution fields, not a re-run of the pass.

## How each pass was recorded

- 2026-08-16 (batches 1–2): dashboard confirmation card, per-profile, reviewer
  of record Steve Goodwin (recorded "Steve" at the time; re-signed 2026-09-30).
- 2026-09-30 (R1–R5): `node tools/apply-governed-review-pass.mjs` with
  `--only` scoped batch runs, reviewer of record "Steve Goodwin" — the tool
  refuses to mutate anything without a reviewer attribution; the batch scopes
  and the per-SKU record live in
  [`docs/governed-profile-confirmation-triage-2026-09-30.md`](../governed-profile-confirmation-triage-2026-09-30.md).

## Gate status at measurement

- `check:technical-data:strict` — exit 0, zero awaiting / overdue confirmations
  (also green as CI `Verify (data)` + `Governed Data Gate` on the confirmation
  commits and main's post-merge run, 2026-09-30).
- `check:governed-review-pass` — exit 0 (full 206-profile pass, reviewer of
  record attributed).
- Confirmation-aging: warn threshold 14 d, fail 30 d (machine-tier profiles) —
  nothing to flag.

## Ongoing validity (why this criterion does not expire)

The confirmation ledger above is durable: verification of spec-critical fields
does not decay the way a performance measurement does. What does run on a
clock is enforced elsewhere, and this criterion stays closed while those
standing gates stay green:

- **Confirmation coverage** — any *new* machine-transcribed profile must be
  confirmed within 30 days (calendar-driven `Verify (data)` /
  `Governed Data Gate` on every merge).
- **Evidence freshness** — the official-page evidence behind a confirmed
  profile is refreshed on its own clock: warn at 60 d, hard-fail at 120 d
  (thresholds in `data/governance/profile-confirmation-aging.json`). First
  refresh pass due around **2026-11-29** for the 2026-09-30 confirmations.
- **Evidence liveness** — the daily URL liveness gate catches official pages
  that rot or redirect elsewhere. Its first nightly run found 27 dead + 1
  redirected official pages (2026-09-30); all were re-sourced the same day and
  the gate is green again (203/203 unique URLs live, 3 designed family-page
  warnings) — see the re-sourcing section in
  [governed-profile-confirmation-triage-2026-09-30.md](../governed-profile-confirmation-triage-2026-09-30.md).
  This is evidence-source hygiene, not a confirmation gap.

This criterion therefore claims the confirmations **as of the two dates
above**; the standing gates above carry the ongoing-honesty burden, and a
future launch that needs a *fresher* confirmation date should run a new pass
and file a new dated artifact, not silently extend this one.

## Evidence liveness after re-sourcing (recorded 2026-09-30)

The nightly liveness gate found 27 dead and 1 redirected official page across
28 governed profiles; every affected profile was re-sourced the same day
(6 archive snapshots, 7 verbatim live pages, 14 family pages; 55 stale
evidence entries removed). Post-cure state: `check:evidence-liveness` — 203
unique URLs across 206 profiles, 203 live, 0 dead, 0 redirected, 3 suspicious
warnings (the gate's designed flag for family pages that do not enumerate
every retired order code); `check:governed-review-pass` — 206/206 confirmable,
every profile carrying an official evidence URL.

## Reproduction

```bash
node tools/check-wyrestorm-technical-data.mjs --strict   # zero awaiting/overdue
npm run check:governed-review-pass                       # full-pass attribution
```
