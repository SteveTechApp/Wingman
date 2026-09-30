# Governed-profile confirmation triage — 2026-09-30

Working list for launch action **A1** in
[LAUNCH_DECISIONS_CHECKLIST.md](LAUNCH_DECISIONS_CHECKLIST.md) §6: the 90 machine-transcribed
profiles the confirmation-aging gate reports as overdue
(3 at 36 days, 87 at 31 days on 2026-09-30). Confirmation records
status "verified", verifiedBy, verifiedAt, confirmedFields and an official-page
evidence entry — through the dashboard confirmation card or the batch path in
[tools/apply-governed-review-pass.mjs](../tools/apply-governed-review-pass.mjs).
A reviewer confirms the corrected value, never a known-wrong one: re-run the
drift review first where the review found drift.

Ages come from the gate output on the dated header line; they grow daily until
each profile is confirmed. Regenerate with:
node tools/check-wyrestorm-technical-data.mjs --strict.

| Batch | Scope | SKUs | Oldest | Effort | Reviewer | Done |
|---|---|---|---|---|---|---|
| R1 | Commodity cables, HDMI/optical patch leads | 23 | 36d | ≈ 45 min | any engineering reviewer | ☑ |
| R2 | Power supplies, fibre optics, format converters | 18 | 31d | ≈ 35 min | any engineering reviewer | ☑ |
| R3 | Apollo, Halo and UC accessories | 15 | 36d | ≈ 45 min | UC-familiar reviewer | ☑ |
| R4 | Interactive displays, caddies, racks | 16 | 31d | ≈ 50 min | display-workstream reviewer | ☑ |
| R5 | Cameras, wallplate switchers, KVM extenders, control | 18 | 31d | ≈ 60 min | senior reviewer (highest field counts) | ☑ |

Confirm per batch, then npm run govern:wyrestorm re-runs the strict gate; the
unblock condition for PR #246 is check:technical-data:strict exiting 0 with zero
profiles past the 30-day fail threshold.

**Worked 2026-09-30**: all five batches applied batch-wise (R1→R5) through the
pass tool's `--only` scoped runs, each signed by the reviewer of record —
90 confirmations at `verifiedBy: "Steve Goodwin"`, dated 2026-09-30, plus the
five max-resolution prose normalizations the drift gate required before
sign-off. The strict gate reports zero overdue profiles; the backlog this
document tracked is cleared and the per-SKU checkboxes above are the record.
(On the same day, the earlier 2026-08-16 passes — originally recorded under
the bare "Steve" — were re-signed to "Steve Goodwin" so every attribution in
the tracked store names one reviewer of record; the confirmation dates and
confirmed values are unchanged.)

**Outcome — the unblock condition was met and the merge happened** (status
recorded 2026-09-30): CI re-ran on the confirmation commits and both `Verify
(data)` and the `Governed Data Gate` flipped green (gate runs 11:42 and 11:53
UTC, success), after which **PR #246 merged at 11:57 UTC** (`72e1eaf6`) with
all checks green — including main's own post-merge gate run at 11:57:48 UTC.
`main` now carries all 206 human-verified profiles, so the calendar-driven
aging gate has nothing to flag on any future merge. What remained before the
merge was only the second, independent debt ratchet — the CSS size budget,
cleared by its reviewed exception (`34a43c91`) — and nothing data-side. This
document is now the historical record of A1; its groupings (R1–R5 sittings,
T1–T10 families in the appendix) remain the working pattern for the next
pass whenever new unconfirmed profiles land.

## R1 — Commodity cables, HDMI/optical patch leads

Reviewer: any engineering reviewer. Spec-critical fields to confirm: length, gauge, connector gender, resolution rating, fibre mode.

- [x] CAB-HAOC-20 (36d)
- [x] CAB-HAOC-10 (31d)
- [x] CAB-HAOC-15 (31d)
- [x] CAB-HAOC-15-C (31d)
- [x] CAB-HAOC-20-C (31d)
- [x] CAB-HAOC-30-C (31d)
- [x] CAB-HAOC-FRL-10 (31d)
- [x] CAB-HAOC-FRL-15 (31d)
- [x] CAB-UAOC-15-C (31d)
- [x] CAB-UAOC-USBC-10 (31d)
- [x] CAB-USBC-15 (31d)
- [x] EXP-4KUHD-05 (31d)
- [x] EXP-4KUHD-10 (31d)
- [x] EXP-4KUHD-20 (31d)
- [x] EXP-4KUHD-30 (31d)
- [x] EXP-4KUHD-50 (31d)
- [x] EXP-8KUHD-05 (31d)
- [x] EXP-8KUHD-1.0 (31d)
- [x] EXP-8KUHD-2.0 (31d)
- [x] EXP-8KUHD-3.0 (31d)
- [x] EXP-CAB-USBC-1M (31d)
- [x] EXP-CAB-USBC-2M (31d)
- [x] EXP-CAB-USBC-5M (31d)

## R2 — Power supplies, fibre optics, format converters

Reviewer: any engineering reviewer. Spec-critical fields to confirm: voltage/amperage, wattage, SFP type, conversion direction.

- [x] CON-ANLG-DNT (31d)
- [x] CON-DNT-ANLG (31d)
- [x] CON-DNT-XLR (31d)
- [x] CON-USBC-DNT (31d)
- [x] CON-XLR-DNT (31d)
- [x] DSP-88-DNT (31d)
- [x] EXP-CON-AUD-H2 (31d)
- [x] PSU-12V-1A (31d)
- [x] PSU-12V-2A (31d)
- [x] PSU-12V-3A (31d)
- [x] PSU-18V-1A (31d)
- [x] PSU-20V-6A-BOX (31d)
- [x] PSU-20V-6A-WP (31d)
- [x] SR-10G-MM-SFPP (31d)
- [x] SR-1G-MM-SFP (31d)
- [x] SW-0402N-INK (31d)
- [x] TX-SCL-HDBT (31d)
- [x] TX-SCL-HDMI (31d)

## R3 — Apollo, Halo and UC accessories

Reviewer: UC-familiar reviewer. Spec-critical fields to confirm: pickup radius, connectivity, mount compatibility, platform certification.

- [x] APO-COM-MIC (36d)
- [x] APO-VX20-MNT (36d)
- [x] APO-DG-DOCK (31d)
- [x] APO-DG-HDMI (31d)
- [x] APO-DG1 (31d)
- [x] APO-DG2-PRO (31d)
- [x] APO-MIC-EXT (31d)
- [x] APO-SKY-MIC (31d)
- [x] APO-VX20-UC (31d)
- [x] HALO-30 (31d)
- [x] HALO-60 (31d)
- [x] HALO-90 (31d)
- [x] HALO-COM-MIC (31d)
- [x] HALO-VX10-V2 (31d)
- [x] NETWORKHDTOUCHTM (31d)

## R4 — Interactive displays, caddies, racks

Reviewer: display-workstream reviewer. Spec-critical fields to confirm: panel size, touch points, power/lock connector types, rack units.

- [x] IDB-200-MS (31d)
- [x] IDB-300 (31d)
- [x] IDB-400-MS (31d)
- [x] IDB-400-MS-C (31d)
- [x] IDB-CBL-SPINE (31d)
- [x] IDB-HDMI-C (31d)
- [x] IDB-K2-C (31d)
- [x] IDB-PWR-SCH (31d)
- [x] IDB-PWR-UK (31d)
- [x] IDB-RJ45-C (31d)
- [x] IDB-USBA-C (31d)
- [x] IDB-USBC-C (31d)
- [x] NHD-140-RACK-1U (31d)
- [x] NHD-610-TX (31d)
- [x] NHD-RACK-1U (31d)
- [x] NHD-RACK4-BLK (31d)

## R5 — Cameras, wallplate switchers, KVM extenders, control

Reviewer: senior reviewer (highest field counts). Spec-critical fields to confirm: sensor/resolution, FOV, HDMI versions, control ports, keymap/region.

- [x] EX-100-KVM-H2 (31d)
- [x] EX-40-KVM-H2 (31d)
- [x] EX-80-KVM (31d)
- [x] FOCUS-100 (31d)
- [x] FOCUS-180A (31d)
- [x] FOCUS-200 (31d)
- [x] FOCUS-200-PRO (31d)
- [x] FOCUS-210 (31d)
- [x] SW-130-TX (31d)
- [x] SW-620L-TX-W (31d)
- [x] SW-660-TX-W (31d)
- [x] SYN-CTL-FL10 (31d)
- [x] SYN-CTL-HUB-IO-10 (31d)
- [x] SYN-CTL-HUB-IR-06 (31d)
- [x] SYN-CTL-HUB-RL-04 (31d)
- [x] SYN-CTL-HUB-RS-03 (31d)
- [x] SYN-KEY12-UK-EU (31d)
- [x] SYN-TP10-B (31d)


---

## Pass 4 staging — store SKUs without governed profiles (added 2026-09-30)

Passes 1–3 confirmed profiles that already existed. Pass 4 covers the opposite
gap: the **129 store SKUs (of 314) that have no governed profile at all**. The
confirmation-aging gate never sees these SKUs — there is no profile to age —
so they are staged here for an explicit decision per batch, not for automatic
confirmation (the batch apply tool requires an existing profile; these first
need profile creation, an exclusion record, or a successor annotation).

Distribution was computed mechanically from the tracked sources
(`data-sources/wyrestorm/products.csv` × `lifecycle.csv` minus the governed
profile set) and re-verified by
`src/wingman2/lib/governedConfirmationBatches.staging.test.ts`. The machine
readable grouping lives in
`src/wingman2/lib/governedConfirmationBatches.json` under `stagingGroupings`.

The lifecycle split reframes the work honestly — most of the 129 are retired
assortment, not an active backlog:

| Lifecycle | Count | Meaning |
|---|---|---|
| active | 17 | the real pass-4 backlog — request-only cables/hub/rack, no active lead product is uncovered |
| do-not-spec | 46 | retired from specification; decide per batch: draft a retired profile for the record, or exclude with a successor note |
| discontinued | 66 | no profile by design; retirement record only |

### S-grouping (lifecycle-first) — the staging batches

| Batch | Lifecycle | Scope | SKUs | Decision |
|---|---|---|---|---|
| S1 | active | Request-only cables (HDMI/AOC/USB-C/IR), USB hub, NHD rack mount — live official captures (HTTP 200) for all 17 | 17 | **Profile creation then confirmation** (R1–R5 pattern; option D: successor-only annotation for the five configure-to-order SKUs) |
| S2 | do-not-spec | Matrix/presentation switchers + splitters (incl. `MXV-70`, `SW-120-TX3-US`/`SW-130-TX-US` region twins of batch-2-verified SKUs) | 4 | Decide: draft retired profile or exclude with successor note |
| S3 | do-not-spec | NetworkHD 500/AVoIP endpoints + the five WyreStorm-branded Netgear switches (M4250/M4300) | 10 | Decide: profile creation or exclusion record |
| S4 | do-not-spec | Extenders, converters, in-desk boxes, presentation kits, wireless kits — includes the four dead-capture SKUs (IDB-200-NA, IDB-400-EU-C, IDB-SPINE, SWX-100-IW-UX) | 32 | Decide per SKU; dead captures need re-sourcing or explicit exclusion |
| S5 | discontinued | Matrix/presentation switchers + splitters | 16 | No profile; retirement record only |
| S6 | discontinued | NetworkHD/AVoIP endpoints and control | 22 | No profile; retirement record only |
| S7 | discontinued | Apollo/Halo UC, cameras, extenders, control, legacy cables | 28 | No profile; retirement record only |

17 + 4 + 10 + 32 + 16 + 22 + 28 = 129.

S1 (work order — 17 SKUs, ≈45 min: live-capture cross-check field-by-field,
then apply via the R1–R5 tooling pattern):

- [ ] CAB-HAOC-20-P
- [ ] CAB-HAOC-8
- [ ] CAB-HAOC-FRL-XX
- [ ] CAB-HAOC-XX
- [ ] CAB-HAOC-XX-C
- [ ] CAB-HAOC-XX-P
- [ ] CAB-IR-LINK
- [ ] CAB-UAOC-15
- [ ] CAB-USBC-5M
- [ ] CAB-USBC-XM
- [ ] EXP-HDMI-H2-05M
- [ ] EXP-HDMI-H2-1M
- [ ] EXP-HDMI-H2-2M
- [ ] EXP-HDMI-H2-3M
- [ ] EXP-HDMI-H2-5M
- [ ] NHD-124-RACK-1U
- [ ] USB-HUB4

S2 (4 SKUs — decide per SKU: draft a retired profile for the record, or an
exclusion note naming the successor):

- [ ] MXV-0606-H2A-70
- [ ] MXV-70
- [ ] SW-120-TX3-US
- [ ] SW-130-TX-US

S3 (10 SKUs — decide: profile creation or an exclusion record):

- [ ] M4250-GSM4212PX-10P
- [ ] M4250-GSM4230PX-26P
- [ ] M4250-GSM4248PX-40P
- [ ] M4300-XSM4316PA-16X
- [ ] M4300-XSM4324CS-24X
- [ ] NHD-120-RX-S
- [ ] NHD-500
- [ ] NHD-500-E
- [ ] NHD-500-T
- [ ] NHD-500-TXRX-V2

S4 (32 SKUs — decide per SKU; the four dead-capture SKUs need re-sourcing or
an explicit exclusion):

- [ ] CAB-HAOC-15-P
- [ ] CAB-UAOC-15-P
- [ ] EXP-4KUHD-X
- [ ] EXP-8KUHD-X
- [ ] EXP-CON-DAC
- [ ] EXP-CON-DAC-D
- [ ] EXP-CON-H2-DD
- [ ] EXP-HDMI-100M
- [ ] EXP-HDMI-150M
- [ ] EXP-HDMI-DVI
- [ ] EXP-HDMI-USBC
- [ ] EXP-HDMI-VGA
- [ ] EXP-HDMI-XM-8K
- [ ] HALO-VX10-V1
- [ ] HALO-WFA-130
- [ ] HALO-WFA-290
- [ ] IDB-200-NA
- [ ] IDB-200-XX
- [ ] IDB-400-EU-C
- [ ] IDB-400-NA
- [ ] IDB-SPINE
- [ ] MV-0401-PRO
- [ ] OFFICE-KIT
- [ ] SWX-100-HDBT3
- [ ] SWX-100-IW-UK
- [ ] SWX-100-IW-US
- [ ] SWX-100-IW-UX
- [ ] SYN-KIT-130-EU
- [ ] SYN-KIT-130-US
- [ ] SYN-KIT-510-EU
- [ ] SYN-KIT-510-US
- [ ] WYRERING

S5–S7 (66 discontinued SKUs — no per-SKU decision is required; the batch
tables above and `stagingGroupings.batches` in
`src/wingman2/lib/governedConfirmationBatches.json` are the record):

- [ ] S5 retirement record reviewed (16 SKUs)
- [ ] S6 retirement record reviewed (22 SKUs)
- [ ] S7 retirement record reviewed (28 SKUs)

### Family lens over the same 129

The lifecycle-blind family cut, for working by product type. Each family is a
union of the S batches above, so the S grouping stays the single source of
truth:

| Family | Scope | SKUs | Overlap |
|---|---|---|---|
| F1 | Active cables — HDMI/AOC/USB-C/IR (incl. the five configure-to-order `-XX`/`-XM` SKU patterns) | 15 | S1 |
| F2 | Active rack mount (NHD-124-RACK-1U) | 1 | S1 |
| F3 | Active USB hub (USB-HUB4) | 1 | S1 |
| F4 | Retired switchers + splitters | 20 | S2 + S5 |
| F5 | Retired AVoIP/NetworkHD endpoints + Netgear-branded switches | 32 | S3 + S6 |
| F6 | Retired extenders, converters, in-desk, kits, bags | 60 | S4 + S7 |

15 + 1 + 1 + 20 + 32 + 60 = 129.

### Tools and flags

The staging grouping is data (`stagingGroupings.batches` in
`src/wingman2/lib/governedConfirmationBatches.json`, source pointer above);
`confirmationGroups("staging")` / `confirmationGroupForSku(sku, "staging")`
serve it the same way "batches"/"families" are served. The batch apply tool
is unchanged for pass 4: once an S1 SKU has a created profile, it can be added
to `CONFIRMATION_BATCH` and confirmed through the standard
`node tools/apply-governed-review-pass.mjs` path with the reviewer of record.

## Evidence re-sourcing — the liveness gate's first catch (recorded 2026-09-30)

The nightly WyreStorm Evidence Freshness workflow found 28 governed profiles
carrying pruned official pages (27 dead — 404/410 — and 1 redirected to a
different product slug): the first real catch for `check:evidence-liveness`
since it landed. The reviewer of record re-sourced every affected profile the
same day, in the tracked store:

| Cure | SKUs | Replacement evidence |
|---|---|---|
| Archive snapshot | 6 | CAB-HAOC-FRL-10, CAB-HAOC-FRL-15, IDB-200-MS, IDB-PWR-SCH, IDB-PWR-UK, PSU-12V-1A → Wayback captures of each SKU's own pruned page |
| Verbatim live page | 7 | EXP-8KUHD-1.0/2.0/3.0 → `exp-8kuhd-x`; EXP-CAB-USBC-1M/2M → `exp-cab-usbc-xm`; TX-SCL-HDBT + TX-SCL-HDMI → the live MX-1616-SCL chassis page, whose card list names both order codes verbatim |
| Family page | 14 | IDB-HDMI-C/K2-C/RJ45-C → `idb-400-na`; SYN-CTL-HUB-IR-06/RL-04/RS-03/IO-10 → `syn-ctl-hub`; EXP-4KUHD-05/10/20/30/50 → `exp-4kuhd-x`; EXP-8KUHD-05 → `exp-8kuhd-x`; NETWORKHDTOUCHTM → `nhd-touch` |

55 stale evidence entries were removed across the 28 affected profiles
(duplicates included; dead URLs must leave the evidence arrays, not be
superseded). One removed entry needed no replacement — SW-620L-TX-W's second,
live evidence entry already covers that profile. Family-page cures are honest
by construction: each entry note states the replacement page documents the
product line and "does not enumerate every retired order code by SKU"; the
liveness gate flags such pages `suspicious` (a warning for the human reviewer,
never a failure) so they stay visible. No Wayback snapshot exists for the
pruned EXP-* expander, IDB-* accessory or TX-SCL card pages (availability API,
checked across slug variants), which is why those SKUs took live-page or
family cures instead of archives.

Gate state after re-sourcing (all run 2026-09-30):
`check:evidence-liveness` — 203/203 unique URLs live, 0 dead, 0 redirected,
3 suspicious (the designed family-page warnings: EXP-4KUHD-05, IDB-RJ45-C,
NETWORKHDTOUCHTM); `check:governed-review-pass` — 206/206 confirmable;
`check:technical-data:strict` — zero awaiting/overdue, evidence freshness
clean; the attribution gate reports 206 clean sign-offs.

## Appendix — T1–T10 product-family grouping

The same 90 SKUs grouped by product family (the assignment the original
triage tables used). The dashboard batch-confirmation view offers both
groupings; SKUs carry their R-batch membership for the apply tool.

| Family | Scope | SKUs | R-batch overlap |
|---|---|---|---|
| T1 | Commodity HDMI / USB-C cables | 11 | R1 |
| T2 | HDMI/optical patch leads + audio converter | 13 | R1, R2 |
| T3 | Power supplies + fibre optics | 8 | R2 |
| T4 | Format converters (analog ↔ Dante/XLR/USB-C) | 5 | R2 |
| T5 | Apollo / UC accessories | 9 | R3 |
| T6 | Halo bars, microphones + NetworkHD Touch | 6 | R3 |
| T7 | Interactive displays + caddies | 12 | R4 |
| T8 | Cameras | 5 | R5 |
| T9 | NetworkHD + racks + wallplates + extenders | 10 | R4, R5 |
| T10 | Control + DSP + scalers + multiview | 11 | R2, R5 |
