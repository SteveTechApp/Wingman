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
