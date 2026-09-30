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
| R1 | Commodity cables, HDMI/optical patch leads | 23 | 36d | ≈ 45 min | any engineering reviewer | ☐ |
| R2 | Power supplies, fibre optics, format converters | 18 | 31d | ≈ 35 min | any engineering reviewer | ☐ |
| R3 | Apollo, Halo and UC accessories | 15 | 36d | ≈ 45 min | UC-familiar reviewer | ☐ |
| R4 | Interactive displays, caddies, racks | 16 | 31d | ≈ 50 min | display-workstream reviewer | ☐ |
| R5 | Cameras, wallplate switchers, KVM extenders, control | 18 | 31d | ≈ 60 min | senior reviewer (highest field counts) | ☐ |

Confirm per batch, then npm run govern:wyrestorm re-runs the strict gate; the
unblock condition for PR #246 is check:technical-data:strict exiting 0 with zero
profiles past the 30-day fail threshold.

## R1 — Commodity cables, HDMI/optical patch leads

Reviewer: any engineering reviewer. Spec-critical fields to confirm: length, gauge, connector gender, resolution rating, fibre mode.

- [ ] CAB-HAOC-20 (36d)
- [ ] CAB-HAOC-10 (31d)
- [ ] CAB-HAOC-15 (31d)
- [ ] CAB-HAOC-15-C (31d)
- [ ] CAB-HAOC-20-C (31d)
- [ ] CAB-HAOC-30-C (31d)
- [ ] CAB-HAOC-FRL-10 (31d)
- [ ] CAB-HAOC-FRL-15 (31d)
- [ ] CAB-UAOC-15-C (31d)
- [ ] CAB-UAOC-USBC-10 (31d)
- [ ] CAB-USBC-15 (31d)
- [ ] EXP-4KUHD-05 (31d)
- [ ] EXP-4KUHD-10 (31d)
- [ ] EXP-4KUHD-20 (31d)
- [ ] EXP-4KUHD-30 (31d)
- [ ] EXP-4KUHD-50 (31d)
- [ ] EXP-8KUHD-05 (31d)
- [ ] EXP-8KUHD-1.0 (31d)
- [ ] EXP-8KUHD-2.0 (31d)
- [ ] EXP-8KUHD-3.0 (31d)
- [ ] EXP-CAB-USBC-1M (31d)
- [ ] EXP-CAB-USBC-2M (31d)
- [ ] EXP-CAB-USBC-5M (31d)

## R2 — Power supplies, fibre optics, format converters

Reviewer: any engineering reviewer. Spec-critical fields to confirm: voltage/amperage, wattage, SFP type, conversion direction.

- [ ] CON-ANLG-DNT (31d)
- [ ] CON-DNT-ANLG (31d)
- [ ] CON-DNT-XLR (31d)
- [ ] CON-USBC-DNT (31d)
- [ ] CON-XLR-DNT (31d)
- [ ] DSP-88-DNT (31d)
- [ ] EXP-CON-AUD-H2 (31d)
- [ ] PSU-12V-1A (31d)
- [ ] PSU-12V-2A (31d)
- [ ] PSU-12V-3A (31d)
- [ ] PSU-18V-1A (31d)
- [ ] PSU-20V-6A-BOX (31d)
- [ ] PSU-20V-6A-WP (31d)
- [ ] SR-10G-MM-SFPP (31d)
- [ ] SR-1G-MM-SFP (31d)
- [ ] SW-0402N-INK (31d)
- [ ] TX-SCL-HDBT (31d)
- [ ] TX-SCL-HDMI (31d)

## R3 — Apollo, Halo and UC accessories

Reviewer: UC-familiar reviewer. Spec-critical fields to confirm: pickup radius, connectivity, mount compatibility, platform certification.

- [ ] APO-COM-MIC (36d)
- [ ] APO-VX20-MNT (36d)
- [ ] APO-DG-DOCK (31d)
- [ ] APO-DG-HDMI (31d)
- [ ] APO-DG1 (31d)
- [ ] APO-DG2-PRO (31d)
- [ ] APO-MIC-EXT (31d)
- [ ] APO-SKY-MIC (31d)
- [ ] APO-VX20-UC (31d)
- [ ] HALO-30 (31d)
- [ ] HALO-60 (31d)
- [ ] HALO-90 (31d)
- [ ] HALO-COM-MIC (31d)
- [ ] HALO-VX10-V2 (31d)
- [ ] NETWORKHDTOUCHTM (31d)

## R4 — Interactive displays, caddies, racks

Reviewer: display-workstream reviewer. Spec-critical fields to confirm: panel size, touch points, power/lock connector types, rack units.

- [ ] IDB-200-MS (31d)
- [ ] IDB-300 (31d)
- [ ] IDB-400-MS (31d)
- [ ] IDB-400-MS-C (31d)
- [ ] IDB-CBL-SPINE (31d)
- [ ] IDB-HDMI-C (31d)
- [ ] IDB-K2-C (31d)
- [ ] IDB-PWR-SCH (31d)
- [ ] IDB-PWR-UK (31d)
- [ ] IDB-RJ45-C (31d)
- [ ] IDB-USBA-C (31d)
- [ ] IDB-USBC-C (31d)
- [ ] NHD-140-RACK-1U (31d)
- [ ] NHD-610-TX (31d)
- [ ] NHD-RACK-1U (31d)
- [ ] NHD-RACK4-BLK (31d)

## R5 — Cameras, wallplate switchers, KVM extenders, control

Reviewer: senior reviewer (highest field counts). Spec-critical fields to confirm: sensor/resolution, FOV, HDMI versions, control ports, keymap/region.

- [ ] EX-100-KVM-H2 (31d)
- [ ] EX-40-KVM-H2 (31d)
- [ ] EX-80-KVM (31d)
- [ ] FOCUS-100 (31d)
- [ ] FOCUS-180A (31d)
- [ ] FOCUS-200 (31d)
- [ ] FOCUS-200-PRO (31d)
- [ ] FOCUS-210 (31d)
- [ ] SW-130-TX (31d)
- [ ] SW-620L-TX-W (31d)
- [ ] SW-660-TX-W (31d)
- [ ] SYN-CTL-FL10 (31d)
- [ ] SYN-CTL-HUB-IO-10 (31d)
- [ ] SYN-CTL-HUB-IR-06 (31d)
- [ ] SYN-CTL-HUB-RL-04 (31d)
- [ ] SYN-CTL-HUB-RS-03 (31d)
- [ ] SYN-KEY12-UK-EU (31d)
- [ ] SYN-TP10-B (31d)

