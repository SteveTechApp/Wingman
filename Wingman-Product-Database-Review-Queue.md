# Wingman Product-Database Review Queue — export & review

_Generated 2026-09-03 from `Wingman-Product-Database-Review-Queue.xlsx` (last modified 2026-08-16). Item-level verdicts are computed against the current `data-sources/wyrestorm/lifecycle.csv` (336 rows) and `public/product-intelligence-index.json`._

**Queue size: 443 items across 4 sheets** — 75 new candidates · 47 ports/IO gaps · 143 lifecycle confirmations · 178 commercial confirmations. Each item is one SKU. No per-item priority or status column exists in the source; the ordering below is the workbook's own.

| Sheet | Purpose | Items | Now resolved | Verdict |
|---|---|---|---|---|
| 1. New Candidates | WyreStorm SKUs found on the vendor site but missing from the Wingman index | 75 | 3 indexed since | **Relevant — 72 still open**; NHD-500-TX-RX-V2, NHD-600-E-TX-RX, SYN-TP10-B are stale rows now in the index |
| 2. Ports & IO Gaps | Indexed products lacking structured ports/connectors data | 47 | 0 | **Relevant** — no automation regenerates this; drives the technical-profile work |
| 3. Lifecycle Review | SKUs whose lifecycle status needs human confirmation | 143 | 3 now active | **Mostly superseded** — the reconcile tool + successor/arch guards now enforce these |
| 4. Commercial Review | SKUs whose proposal-approval is not yet confirmed | 178 | n/a | **Questionable as a queue** — proposal approval is a workflow state, not a data fix |

## Review: purpose, effectiveness, relevance, ordering

### Sheet 1 — New Candidates (75)
- **Purpose:** triage list of WyreStorm catalogue entries absent from the Wingman index (the ADD bucket of the reconcile report).
- **Effectiveness:** good signal, but the 404-status rows (e.g. CAB-HAOC-50-P-2, EX-100-USBC-2) are page-access checks, not product evidence — a page 404 does not prove the SKU exists or sells. The `page fetched` rows are real candidates.
- **Relevance:** 72 of 75 still open. NHD-500-TX-RX-V2, NHD-600-E-TX-RX, SYN-TP10-B are already in the index — the file predates that work and those rows are stale.
- **Ordering:** alphabetical by SKU, reasonable for a completeness sweep; none of this is more urgent than the sheets below (missing products are worse than missing ports).

### Sheet 2 — Ports & IO Gaps (47)
- **Purpose:** products whose technical profiles lack structured ports/connectors — the raw material for the governed technical-profiles work.
- **Effectiveness:** good; the confidence column separates solid (`EXP-HDMI-H2-*` at 85) from speculative (most at 20).
- **Relevance:** all 47 still open; the `check:technical-data` coverage gate measures how much of this remains.
- **Ordering:** alphabetical; grouping by confidence tier (85+ first) would be more effective.

### Sheet 3 — Lifecycle Review (143)
- **Purpose:** confirm each SKU's lifecycle status flag. This is exactly what `tools/reconcile-wyrestorm-lifecycle.mjs` now computes and what the successor/architecture/reference guards enforce.
- **Effectiveness:** overtaken by automation. The reconcile run today reports BLOCKED 135 / REVIEW 5 / STORIES 4, and the REFUSED gate stops invalid promotions. Confirming statuses is now a data-edit + gate-green workflow, not a review queue.
- **Relevance:** 3 stale rows — `APO-VX20-MNT`, `IDB-300`, `NHD-RACK-1U` are now `active` (flagged do-not-spec/discontinued in the queue). The remaining ~140 flags match current data — the queue is redundant with the reconcile report.
- **Ordering:** alphabetical; superseded as a queue — keep only the high-confidence (`75`+) review items (APO-VX20-UC, MX-0808-SCL, NHD-610-TX, SW-0X01-8K, SW-130-TX).

### Sheet 4 — Commercial Review (178)
- **Purpose:** SKUs whose proposal-approval is unconfirmed.
- **Effectiveness:** weakest sheet. Approval is a runtime workflow state tracked by the compare/quote-safety approval ledger, not a property this workbook can fix; the file cannot be 'worked down' like the others. Confidence values are copied from the lifecycle audit and mean nothing here.
- **Relevance:** low as a queue. If commercial approval still needs human sign-off per SKU, it belongs in the approval-ledger tooling, not a static xlsx.
- **Ordering:** not meaningful until it becomes a workflow-backed list.

### Cross-cutting observations
1. **Stale source:** dated 2026-08-16; the counts (75/47/143/178) no longer match the repo state (3 candidates and 3 lifecycle flags already resolved). Regenerate from whichever audit produced it (no generator is checked in) or replace with live reports.
2. **No priority column** — ordering is alphabetical per sheet, so nothing distinguishes 'sells today, missing from Wingman' (blocking) from 'was 404 on the vendor page' (noise).
3. **Automation overlap:** Sheets 3 and 4 duplicate the reconcile tool's BLOCKED/REVIEW output and the quote-safety approval flow. Sheets 1 and 2 are the only ones that still represent genuinely manual, valuable triage.
4. **Recommended order of attack:** Sheet 2 (technical data, gate-measured) → Sheet 1 404-filtered candidates (add real products) → Sheet 3 high-confidence review rows only → drop Sheet 4 as a spreadsheet queue.

---

## Full item list

### New Candidates (75)

1. `CAB-HAOC-50-P-2` — https://www.wyrestorm.com/product/cab-haoc-50-p-2/ returned 404
2. `CAB-HAOC-50-P-3` — https://www.wyrestorm.com/product/cab-haoc-50-p-3/ returned 404
3. `CAB-USBC-15-ENDS` — https://www.wyrestorm.com/product/cab-usbc-15-ends/ returned 404
4. `CAM-200` — page fetched
5. `CAM-210` — page fetched
6. `COM-MIC` — page fetched
7. `EX-100` — page fetched
8. `EX-100-USBC-2` — https://www.wyrestorm.com/product/ex-100-usbc-2/ returned 404
9. `EX-100-USBC-3` — https://www.wyrestorm.com/product/ex-100-usbc-3/ returned 404
10. `EX-100-USBC-4` — https://www.wyrestorm.com/product/ex-100-usbc-4/ returned 404
11. `EX-35` — page fetched
12. `EX-40-H2` — page fetched
13. `EX-60` — page fetched
14. `EX-70` — page fetched
15. `EX-80-KVM5` — https://www.wyrestorm.com/product/ex-80-kvm5/ returned 404
16. `EXA-100` — page fetched
17. `EXA-100-KVM` — https://www.wyrestorm.com/product/exa-100-kvm/ returned 404
18. `EXP-CAB-HAOC-8` — page fetched
19. `EXP-CAB-USBC-XM` — page fetched
20. `EXP-CAB-USBC-XM-COILED-CABLE` — https://www.wyrestorm.com/product/exp-cab-usbc-xm-coiled-cable/ returned 404
21. `EXP-EX-35-G2` — page fetched
22. `EXP-EX-80-KVM` — page fetched
23. `EXP-MX-0404-HDMI-41` — https://www.wyrestorm.com/product/exp-mx-0404-hdmi-41/ returned 404
24. `EXP-MX-0404-HDMI-43` — https://www.wyrestorm.com/product/exp-mx-0404-hdmi-43/ returned 404
25. `EXP-SW-0X01-8K` — page fetched
26. `FOCUS-200-WECAM` — https://www.wyrestorm.com/product/focus-200-wecam/ returned 404
27. `HALO-60-SPEAKERPHONE` — page fetched
28. `HALO-VX10-VIDEO-BAR-PIC-2` — https://www.wyrestorm.com/product/halo-vx10-video-bar-pic-2/ returned 404
29. `HALO-VX10-VIDEO-BAR-PIC-3` — https://www.wyrestorm.com/product/halo-vx10-video-bar-pic-3/ returned 404
30. `HALO-VX101V1` — page fetched
31. `IDB-200` — queued for review
32. `IDB-400` — queued for review
33. `IDB-CBL` — queued for review
34. `MX-0804` — queued for review
35. `MX-0808` — queued for review
36. `MX-0808-H2A` — queued for review
37. `MX-0812` — queued for review
38. `MX-1007` — queued for review
39. `MX-1616` — queued for review
40. `MXV-0404-H2-KIT-2` — queued for review
41. `MXV-0404-H2-KIT-3` — queued for review
42. `MXV-0404-H2-KIT-4` — queued for review
43. `MXV-0408` — queued for review
44. `MXV-0606-H2A-38` — queued for review
45. `MXV-0606-H2A-40` — queued for review
46. `MXV-0606-H2A-41` — queued for review
47. `MXV-0808-H2A` — queued for review
48. `NHD-400-RX-V3-2` — queued for review
49. `NHD-400-RX-V3-3` — queued for review
50. `NHD-400-TX-V2-2` — queued for review
51. `NHD-400-TX-V2-3` — queued for review
52. `NHD-500-TAA-2` — queued for review
53. `NHD-500-TX-IW-2` — queued for review
54. `NHD-500-TX-RX-V2` — queued for review ⚠ now resolved
55. `NHD-600` — queued for review
56. `NHD-600-E-TX-RX` — queued for review ⚠ now resolved
57. `NHD-CTL-PRO-TAA-V2-2` — queued for review
58. `NHD-CTL-PRO-TAA-V2-3` — queued for review
59. `NHD-CTL-PRO-TAA-V2-4` — queued for review
60. `RX-300-4K-33` — queued for review
61. `RX-300-4K-35` — queued for review
62. `RX-35-SCL-37` — queued for review
63. `RXV-35` — queued for review
64. `SP-0120-H2-5` — queued for review
65. `SW-0204` — queued for review
66. `SW-0206` — queued for review
67. `SW-130-TX-U-11` — queued for review
68. `SW-130-TX-U-12` — queued for review
69. `SW-540-TX` — queued for review
70. `SWX-100-HDBT3-BACKS` — queued for review
71. `SWX-100-IW-UK-BACKS` — queued for review
72. `SWX-100-IW-US-BACKS` — queued for review
73. `SYN-CTL-FL10` — queued for review
74. `SYN-TP10-B` — queued for review ⚠ now resolved
75. `TX-35-IWC-KVMU` — queued for review

### Ports & IO Gaps (47)

1. `APO-VX20-MNT` — Display Mount for Apollo VX20 Video Bars - WyreStorm (confidence 20)
2. `CAB-DAOC-10-C` — 32Gbps 8K 60Hz DisplayPort 1.4 Active Optical Cable with DP++ Support (10m/32ft) CPR, CL3 Approvals - WyreStorm (confidence 20)
3. `CAB-DAOC-10-P` — 32Gbps 8K 60Hz DisplayPort 1.4 Active Optical Cable with DP++ Support (10m/32ft) Plenum, FT6 Approvals - WyreStorm (confidence 20)
4. `CAB-UAOC-15-P` — 15 Meter USB 3.2 GEN 2 10Gbps Active Optical Extension Cable - WyreStorm (confidence 20)
5. `EX-70-H2X` — 70m 4K60 HDBaseT Extender with Ethernet - WyreStorm (confidence 20)
6. `EXP-CON-DAC` — WyreStorm Essentials? Digital to Analog Audio Converter| WyreStorm (confidence 20)
7. `EXP-CON-DAC-D` — WyreStorm Essentials? Dolby? 5.1 Downmixer| WyreStorm (confidence 20)
8. `EXP-CON-H2-DD` — WyreStorm Essentials? Dolby? & DTS? 7.1 Downmixer| WyreStorm (confidence 20)
9. `EXP-HDMI-H2-05M` — HDMI Cable with CL3 Rating (0.5m/1.6ft)| WyreStorm (confidence 85)
10. `EXP-HDMI-H2-1M` — HDMI Cable with CL3 Rating (1m/3.2ft)| WyreStorm (confidence 85)
11. `EXP-HDMI-H2-2M` — HDMI Cable with CL3 Rating (2m/6.5ft)| WyreStorm (confidence 85)
12. `EXP-HDMI-H2-3M` — HDMI Cable with CL3 Rating (3m/9.8ft)| WyreStorm (confidence 85)
13. `EXP-HDMI-H2-5M` — HDMI Cable with CL3 Rating | WyreStorm (confidence 85)
14. `EXP-HDMI-XM-8K` — WyreStorm EXP‑HDMI‑XM‑8K 8K HDMI Cable – Ultra‑High Speed HDMI 2.1 (confidence 20)
15. `EXP-MX-0404-H2` — WyreStorm Essentials 4 Input and 4 Scaling Output 4K HDR HDMI Matrix Switcher W/ Digital S/PDIF Audio De-Embed - WyreStorm (confidence 20)
16. `EXP-MX-0808-KIT` — 4K 8x8 HDBaseT Matrix with Receivers - WyreStorm (confidence 20)
17. `HALO-VX10-V1` — WyreStorm Video Bar w/ 4K Camera, Stereo Speaker & Mic (confidence 20)
18. `HALO-WFA-130` — 1080P HD Webcam - Business USB Webcam w/ Mic | WyreStorm FOCUS 100 Webcam (confidence 20)
19. `IDB-CBL-SPINE` — Under Desk Cable Management 'SPINE' for IDB Series (Adjustable up to 36") (confidence 20)
20. `IDB-K2-C` — Carrier Keystone 2 ports (confidence 20)
21. `IDB-SPINE` — Under-Desk Cable Management Spine with Adjustable Height (confidence 20)
22. `M4250-GSM4212PX-10P` — Netgear Pre-configured 1GbE 10-port Switch with 1G/10G Uplinks for use with NetworkHD 100, 400 & 500 Series - WyreStorm (confidence 20)
23. `M4250-GSM4230PX-26P` — Netgear Pre-configured 1GbE 26-port Switch with 1G/10G Uplinks for use with NetworkHD 100, 400 & 500 Series - WyreStorm (confidence 20)
24. `M4250-GSM4248PX-40P` — Netgear Pre-configured 1GbE 48-port Switch with 1G/10G Uplinks for use with NetworkHD 100, 400 & 500 Series - WyreStorm (confidence 20)
25. `M4300-XSM4316PA-16X` — Netgear Pre-configured 10GbE 16-port Switch for use with NetworkHD 600 Series - WyreStorm (confidence 20)
26. `M4300-XSM4324CS-24X` — Netgear Pre-configured 10GbE 24-port Switch for use with NetworkHD 600 Series - WyreStorm (confidence 20)
27. `MX-1010-H2XC` — 10 Slot 18Gbps 4K HDR Modular Matrix Switch Chassis - WyreStorm (confidence 20)
28. `MXV-0408-H2A-KIT` — 4K60 4x8 HDBaseT Matrix with 6x Receivers - WyreStorm (confidence 20)
29. `NHD-124-RACK-1U` — 1U 2-Slot Rack Mount for NetworkHD NHD-124-TX (confidence 70)
30. `NHD-600-RX` — NetworkHD 600 Series 4K HDR Premium AV over IP SDVoE Decoder - WyreStorm (confidence 20)
31. `NHD-600-TX` — NetworkHD 600 Series 4K HDR Premium AV over IP SDVoE Encoder - WyreStorm (confidence 20)
32. `OFFICE-KIT` — WyreStorm FOCUS Webcam & HALO Speakerphone, Office Kits (confidence 20)
33. `PSU-12V-3A` — External Universal 12W Power Supply - 12V 3A - WyreStorm (confidence 20)
34. `RXV-70-4K` — 70m 4K60 HDBaseT Receiver - WyreStorm (confidence 20)
35. `SP-0102-H2` — 4K60 1:2 HDMI Splitter - WyreStorm (confidence 20)
36. `SR-10G-MM-SFPP` — 10G SFP+ Multimode Transceiver - WyreStorm (confidence 20)
37. `SR-1G-MM-SFP` — 1G SFP Multimode Transceiver - WyreStorm (confidence 20)
38. `SWX-100-HDBT3` — SW-120-TX3 Transmitter and RX3-100 Receiver Kit - WyreStorm (confidence 20)
39. `SWX-100-IW-UK` — In-Wall Kit with the SW-120-TX3-UK Transmitter and RX3-100 Receiver - WyreStorm (confidence 20)
40. `SWX-100-IW-US` — In-Wall Kit with the SW-120-TX3-US Transmitter and RX3-100 Receiver - WyreStorm (confidence 20)
41. `SYN-KIT-130-EU` — In-Wall Presentation Kit with Control (EU) - WyreStorm (confidence 20)
42. `SYN-KIT-130-US` — In-Wall Presentation Kit with Control - WyreStorm (confidence 20)
43. `SYN-KIT-510-EU` — Advanced Presentation Kit with Control (EU) - WyreStorm (confidence 20)
44. `SYN-KIT-510-US` — Advanced Presentation Kit with Control - WyreStorm (confidence 20)
45. `TS-280-EU` — 2.8" Serial Control Color Touchscreen - WyreStorm (confidence 20)
46. `TS-280-US` — 2.8" Serial Control Color Touchscreen - WyreStorm (confidence 20)
47. `TX-H2X-ADZ` — H2XC Card: HDMI In, HDMI Out - WyreStorm (confidence 20)

### Lifecycle Review (143)

1. `APO-100-UC` — flagged discontinued — Apollo Series Conference Speakerphone - WyreStorm ✅ confirmed in data
2. `APO-200-UC` — flagged discontinued — Apollo Series Conference Speakerphone & Switcher - WyreStorm ✅ confirmed in data
3. `APO-DG1` — flagged do-not-spec — Apollo TM 1080p USB-C(DP Atl mode) dongle for wireless casti ✅ confirmed in data
4. `APO-DG2-PRO` — flagged do-not-spec — Apollo USB-C Wireless Casting Dongle - WyreStorm ✅ confirmed in data
5. `APO-VX20-MNT` — flagged do-not-spec — Display Mount for Apollo VX20 Video Bars - WyreStorm ⚠ now active
6. `APO-VX20-UC` — flagged review — Apollo TM Video Bar & Switcher ✅ confirmed in data
7. `CAB-DAOC-10-C` — flagged discontinued — 32Gbps 8K 60Hz DisplayPort 1.4 Active Optical Cable with DP+ ✅ confirmed in data
8. `CAB-DAOC-10-P` — flagged discontinued — 32Gbps 8K 60Hz DisplayPort 1.4 Active Optical Cable with DP+ ✅ confirmed in data
9. `CAB-HAOC-15-P` — flagged do-not-spec — 24Gbps 4-core Active Optical HDMI Cable | WyreStorm ✅ confirmed in data
10. `CAB-HAOC-2` — flagged discontinued — 24Gbps 4-Core Active Optical HDMI Cable | 4K HDR 4:4:4/60, A ✅ confirmed in data
11. `CAB-HAOC-30-P` — flagged discontinued — 24Gbps 4-core Active Optical HDMI Cable | 4K HDR 4:4:4/60 |  ✅ confirmed in data
12. `CAB-HAOC-4` — flagged discontinued — 24Gbps 4-Core Active Optical HDMI Cable | 4K HDR 4:4:4/60, A ✅ confirmed in data
13. `CAB-HAOC-6` — flagged discontinued — 24Gbps 4-Core Active Optical HDMI Cable | 4K HDR 4:4:4/60, A ✅ confirmed in data
14. `CAB-UAOC-15-P` — flagged do-not-spec — 15 Meter USB 3.2 GEN 2 10Gbps Active Optical Extension Cable ✅ confirmed in data
15. `CAM-200-PTZ` — flagged discontinued — 1080p HD PTZ Conference Camera with USB 3.0 & Network Output ✅ confirmed in data
16. `CON-H2-DD-EARC` — flagged discontinued — 4K/60 In-line HDMI Scaler with DSP-Controlled Audio Breakout ✅ confirmed in data
17. `CON-H2-EDID` — flagged discontinued — 4K60 In-line Signal Re-Clocker with EDID Management - WyreSt ✅ confirmed in data
18. `CON-H2-SCL` — flagged discontinued — 4K60 In-Line HDMI Scaler with Audio Breakout - WyreStorm ✅ confirmed in data
19. `EX-100-H2` — flagged discontinued — 100m 4K HDBaseT Extender with USB - WyreStorm ✅ confirmed in data
20. `EX-70-H2X` — flagged discontinued — 70m 4K60 HDBaseT Extender with Ethernet - WyreStorm ✅ confirmed in data
21. `EX-80-KVM` — flagged discontinued — WyreStorm Essentials 80m KVM UTP Extender - WyreStorm ✅ confirmed in data
22. `EXP-4KUHD-X` — flagged do-not-spec — 4K HDR 4:4:4 60Hz HDMI Cable with VW-1 Rating - WyreStorm ✅ confirmed in data
23. `EXP-8KUHD-05` — flagged do-not-spec — 0.5m/1.6ft HDMI 2.1 Cable ✅ confirmed in data
24. `EXP-8KUHD-X` — flagged do-not-spec — 8K 60Hz HDMI 2.1 Cable with VW-1 Rating - WyreStorm ✅ confirmed in data
25. `EXP-CON-AUD-H2` — flagged do-not-spec — WyreStorm Essentials™ HDMI Audio Extractor| WyreStorm ✅ confirmed in data
26. `EXP-CON-DAC` — flagged do-not-spec — WyreStorm Essentials? Digital to Analog Audio Converter| Wyr ✅ confirmed in data
27. `EXP-CON-DAC-D` — flagged do-not-spec — WyreStorm Essentials? Dolby? 5.1 Downmixer| WyreStorm ✅ confirmed in data
28. `EXP-CON-H2-DD` — flagged do-not-spec — WyreStorm Essentials? Dolby? & DTS? 7.1 Downmixer| WyreStorm ✅ confirmed in data
29. `EXP-HDMI-100M` — flagged do-not-spec — 10 Meter High Speed HDMI Cable | WyreStorm ✅ confirmed in data
30. `EXP-HDMI-150M` — flagged do-not-spec — WyreStorm Essentials? 15 Meter High Speed HDMI Cable| WyreSt ✅ confirmed in data
31. `EXP-HDMI-CPL` — flagged discontinued — WyreStorm Essentials HDMI Coupler - WyreStorm ✅ confirmed in data
32. `EXP-HDMI-DVI` — flagged do-not-spec — WyreStorm Essentials DVI to HDMI - WyreStorm ✅ confirmed in data
33. `EXP-HDMI-RTA` — flagged discontinued — WyreStorm Essentials Right Angle HDMI Adapter - WyreStorm ✅ confirmed in data
34. `EXP-HDMI-USBC` — flagged do-not-spec — WyreStorm Essentials USB-C to HDMI - WyreStorm ✅ confirmed in data
35. `EXP-HDMI-VGA` — flagged do-not-spec — HDMI VGA Extender Essentials VGA to HDMI | WyreStorm ✅ confirmed in data
36. `EXP-HDMI-XM-8K` — flagged do-not-spec — WyreStorm EXP‑HDMI‑XM‑8K 8K HDMI Cable – Ultra‑High Speed HD ✅ confirmed in data
37. `EXP-MX-0404-H2` — flagged discontinued — WyreStorm Essentials 4 Input and 4 Scaling Output 4K HDR HDM ✅ confirmed in data
38. `EXP-MX-0808-KIT` — flagged discontinued — 4K 8x8 HDBaseT Matrix with Receivers - WyreStorm ✅ confirmed in data
39. `HALO-COM-MIC` — flagged do-not-spec — Add-On Microphone for Halo Video Bar - WyreStorm ✅ confirmed in data
40. `HALO-VX10-V1` — flagged do-not-spec — WyreStorm Video Bar w/ 4K Camera, Stereo Speaker & Mic ✅ confirmed in data
41. `HALO-WFA-130` — flagged do-not-spec — 1080P HD Webcam - Business USB Webcam w/ Mic | WyreStorm FOC ✅ confirmed in data
42. `HALO-WFA-290` — flagged do-not-spec — 1080P HD Webcam - Business USB Webcam w/ Mic | WyreStorm FOC ✅ confirmed in data
43. `IDB-200-MS` — flagged do-not-spec — Compact In-Desk Connectivity ✅ confirmed in data
44. `IDB-200-NA` — flagged do-not-spec — Flip-Up In-Desk Box with USB-C, HDMI, USB Charging and Mains ✅ confirmed in data
45. `IDB-200-XX` — flagged do-not-spec — Compact In-Desk Connectivity with Power - WyreStorm ✅ confirmed in data
46. `IDB-300` — flagged do-not-spec — Dual Channel CableBox ⚠ now active
47. `IDB-400-EU-C` — flagged do-not-spec — Flip-Up In-Desk Box with USB-C, HDMI, USB Charging and RJ-45 ✅ confirmed in data
48. `IDB-400-MS` — flagged do-not-spec — Flip Up In-Desk Connectivity with Power - WyreStorm ✅ confirmed in data
49. `IDB-400-MS-C` — flagged do-not-spec — Flip Up In-Desk Connectivity with Power - WyreStorm ✅ confirmed in data
50. `IDB-400-NA` — flagged do-not-spec — Flip Up In-Desk Connectivity with Power - WyreStorm ✅ confirmed in data
51. `IDB-CBL-SPINE` — flagged do-not-spec — Under Desk Cable Management 'SPINE' for IDB Series (Adjustab ✅ confirmed in data
52. `IDB-HDMI-C` — flagged do-not-spec — HDMI ✅ confirmed in data
53. `IDB-K2-C` — flagged do-not-spec — Carrier Keystone 2 ports ✅ confirmed in data
54. `IDB-PWR-SCH` — flagged do-not-spec — 2m Wieland to Schuko Power Supply Cable For IDB-MS Series (S ✅ confirmed in data
55. `IDB-PWR-UK` — flagged do-not-spec — 2m Wieland to UK Power Supply Cable For IDB-MS Series (UK Pl ✅ confirmed in data
56. `IDB-RJ45-C` — flagged do-not-spec — RJ45 CAT6 ✅ confirmed in data
57. `IDB-SPINE` — flagged do-not-spec — Under-Desk Cable Management Spine with Adjustable Height ✅ confirmed in data
58. `M4250-GSM4212PX-10P` — flagged do-not-spec — Netgear Pre-configured 1GbE 10-port Switch with 1G/10G Uplin ✅ confirmed in data
59. `M4250-GSM4230PX-26P` — flagged do-not-spec — Netgear Pre-configured 1GbE 26-port Switch with 1G/10G Uplin ✅ confirmed in data
60. `M4250-GSM4248PX-40P` — flagged do-not-spec — Netgear Pre-configured 1GbE 48-port Switch with 1G/10G Uplin ✅ confirmed in data
61. `M4300-XSM4316PA-16X` — flagged do-not-spec — Netgear Pre-configured 10GbE 16-port Switch for use with Net ✅ confirmed in data
62. `M4300-XSM4324CS-24X` — flagged do-not-spec — Netgear Pre-configured 10GbE 24-port Switch for use with Net ✅ confirmed in data
63. `MV-0401-PRO` — flagged do-not-spec — 4-Input 4K60 Multiview Processor for NetworkHD ✅ confirmed in data
64. `MX-0404-HDBT-H2A-KIT` — flagged discontinued — 4K 4x4 HDBaseT Matrix with Receivers - WyreStorm ✅ confirmed in data
65. `MX-0808-SCL` — flagged review — 4K60 8x8 Seamless Scaling HDMI Matrix with USB-C Support - W ✅ confirmed in data
66. `MX-1010-H2XC` — flagged discontinued — 10 Slot 18Gbps 4K HDR Modular Matrix Switch Chassis - WyreSt ✅ confirmed in data
67. `MX-1616-H2XC` — flagged discontinued — 16 Slot 18Gbps 4K HDR Modular Matrix Switch Chassis - WyreSt ✅ confirmed in data
68. `MXV-0408-H2A` — flagged discontinued — 4K60 4x8 HDBaseT Matrix - WyreStorm ✅ confirmed in data
69. `MXV-0408-H2A-KIT` — flagged discontinued — 4K60 4x8 HDBaseT Matrix with 6x Receivers - WyreStorm ✅ confirmed in data
70. `MXV-0606-H2A-70` — flagged do-not-spec — 70m 4K60 HDBaseT Receiver for MXV - WyreStorm ✅ confirmed in data
71. `MXV-0606-H2A-V2` — flagged discontinued — 4K HDR 4:4:4 60Hz HDBaseT 6x6 Matrix Switch with 6x Toslink  ✅ confirmed in data
72. `MXV-0606-H2A-V3` — flagged discontinued — 4K60 6x6 HDBaseT Matrix - WyreStorm ✅ confirmed in data
73. `MXV-0808-H2A-70-V2` — flagged discontinued — 4K HDR 4:4:4 60Hz HDBaseT 8x8 Matrix Switch with Zone Audio  ✅ confirmed in data
74. `MXV-0808-H2A-V2` — flagged discontinued — 4K HDR 4:4:4 60Hz HDBaseT 8x8 Matrix Switch with Assignable  ✅ confirmed in data
75. `MXV-0808-H2A-V3` — flagged discontinued — 4K60 8x8 HDBaseT Matrix - WyreStorm ✅ confirmed in data
76. `MXV-0808-H2L` — flagged discontinued — 8x8 4K60 'Lite' HDBaseT Matrix - WyreStorm ✅ confirmed in data
77. `MXV-70` — flagged do-not-spec — Scaling 70m 4K60 HDBaseT Receiver for MX - WyreStorm ✅ confirmed in data
78. `NETWORKHDTOUCHTM` — flagged discontinued — Free iPad & Android Control App for NetworkHD 100, 200 & 400 ✅ confirmed in data
79. `NHD-000-CTL` — flagged discontinued — Controller for NetworkHD Systems - WyreStorm ✅ confirmed in data
80. `NHD-000-RACK3` — flagged discontinued — 7U/8 Slot Rack Mount for NetworkHD 600 TX/RX - WyreStorm ✅ confirmed in data
81. `NHD-100` — flagged discontinued — Companion Control App for NetworkHD 100, 400, 500 & 600 Seri ✅ confirmed in data
82. `NHD-110-RX` — flagged discontinued — 1080p HD Low Bandwidth AV over IP Decoder - WyreStorm ✅ confirmed in data
83. `NHD-110-RX-S` — flagged discontinued — 1080p HD Low Bandwidth AV over IP Decoder with Sealoc Protec ✅ confirmed in data
84. `NHD-110-TX` — flagged discontinued — 1080p HD Low Bandwidth AV over IP Encoder - WyreStorm ✅ confirmed in data
85. `NHD-120-RX-S` — flagged do-not-spec — NetworkHD 120 Series 4K30 4:2:0 Decoder with Sealoc Protecti ✅ confirmed in data
86. `NHD-140-RACK-1U` — flagged discontinued — 1U/2 Slot Rack Mount for NetworkHD NHD-140-TX - WyreStorm ✅ confirmed in data
87. `NHD-250-RX` — flagged discontinued — NetworkHD 200 Series AV over IP H.264 MultiView Processor -  ✅ confirmed in data
88. `NHD-300-TX` — flagged discontinued — NetworkHD 300 Series 1080p AV over IP H.264 Open Standards E ✅ confirmed in data
89. `NHD-400-DNT-TX` — flagged discontinued — NetworkHD 400 Series 4K AV over IP JPEG 2000 Encoder with Da ✅ confirmed in data
90. `NHD-400-E-RX` — flagged discontinued — NetworkHD 400 Series 4K AV over IP JPEG 2000 Decoder - WyreS ✅ confirmed in data
91. `NHD-400-E-TX` — flagged discontinued — NetworkHD 400 Series 4K AV over IP JPEG 2000 Encoder - WyreS ✅ confirmed in data
92. `NHD-400-RX` — flagged discontinued — 4K AV Over IP - NetworkHD™ 400 Series| WyreStorm ✅ confirmed in data
93. `NHD-400-TX` — flagged discontinued — NetworkHD 400 Series 4K AV over IP JPEG 2000 Encoder - WyreS ✅ confirmed in data
94. `NHD-400-TX-IW` — flagged discontinued — NetworkHD 400 Series In-Wall 4K AV over IP JPEG 2000 Encoder ✅ confirmed in data
95. `NHD-500` — flagged do-not-spec — NetworkHD 500 Series 4K60 4:4:4 JPEG2000 Encoder & Decoder - ✅ confirmed in data
96. `NHD-500-E` — flagged do-not-spec — NetworkHD 500 Series Lite 4K60 4:4:4 JPEG2000 Encoder & Deco ✅ confirmed in data
97. `NHD-500-IW-TX` — flagged discontinued — NetworkHD 500 Series 4K60 4:4:4 JPEG2000 In-Wall Encoder - W ✅ confirmed in data
98. `NHD-500-T` — flagged do-not-spec — NetworkHD 500 Series 4K60 4:4:4 JPEG2000 TAA Compliant Encod ✅ confirmed in data
99. `NHD-500-TXRX-V2` — flagged do-not-spec — WyreStorm NHD-500-TX/RX V2 4K60 Encoder & Decoder with JPEG2 ✅ confirmed in data
100. `NHD-600-RX` — flagged discontinued — NetworkHD 600 Series 4K HDR Premium AV over IP SDVoE Decoder ✅ confirmed in data
101. `NHD-600-TX` — flagged discontinued — NetworkHD 600 Series 4K HDR Premium AV over IP SDVoE Encoder ✅ confirmed in data
102. `NHD-610` — flagged discontinued — NetworkHD 610 Series 4K60 10GbE SDVoE Encoder & Decoder - Wy ✅ confirmed in data
103. `NHD-610-TX` — flagged review — 4K60Hz 4:4:4 SDVoE Encoder ✅ confirmed in data
104. `NHD-CTL-PRO` — flagged discontinued — Pro Controller for NetworkHD - WyreStorm ✅ confirmed in data
105. `NHD-CTL-PRO-T` — flagged discontinued — Pro Controller for NetworkHD Series TAA Compliant - WyreStor ✅ confirmed in data
106. `NHD-RACK-1U` — flagged discontinued — 1U/2 Slot Rack Mount for NetworkHD 100/500/600 Series - Wyre ⚠ now active
107. `NHD-RACK4-BLK` — flagged discontinued — Accessory for the NHD-000-RACK4 6U/12 Slot Rack Mount - Wyre ✅ confirmed in data
108. `NHD-TOUCH` — flagged discontinued — Touchscreen Control for NetworkHD 100, 400, 500 & 600 Series ✅ confirmed in data
109. `NHD-TOUCHPLUS` — flagged discontinued — Touchscreen control application for NetworkHD 110 Series - W ✅ confirmed in data
110. `OFFICE-KIT` — flagged do-not-spec — WyreStorm FOCUS Webcam & HALO Speakerphone, Office Kits ✅ confirmed in data
111. `PSU-12V-3A` — flagged do-not-spec — External Universal 12W Power Supply - 12V 3A - WyreStorm ✅ confirmed in data
112. `RX-70-4K-SCL` — flagged discontinued — 70m 4K HDBaseT Scaling Receiver with Downscaling - WyreStorm ✅ confirmed in data
113. `RXF-300-4K` — flagged discontinued — 4K HDR 4:4:4 60Hz HDBaseT Receiver with 2-Way IR and PoH (4K ✅ confirmed in data
114. `RXV-70-4K` — flagged discontinued — 70m 4K60 HDBaseT Receiver - WyreStorm ✅ confirmed in data
115. `SP-0102-H2` — flagged discontinued — 4K60 1:2 HDMI Splitter - WyreStorm ✅ confirmed in data
116. `SP-618` — flagged discontinued — 4K60 1:8 Scaling HDMI Splitter - WyreStorm ✅ confirmed in data
117. `SR-10G-MM-SFPP` — flagged do-not-spec — 10G SFP+ Multimode Transceiver - WyreStorm ✅ confirmed in data
118. `SR-1G-MM-SFP` — flagged do-not-spec — 1G SFP Multimode Transceiver - WyreStorm ✅ confirmed in data
119. `SW-0X01-8K` — flagged review — WyreStorm Essentials 8K60 HDMI Switcher - WyreStorm ✅ confirmed in data
120. `SW-120-TX3-US` — flagged do-not-spec — Synergy 2-Input 4K60Hz HDBaseT 3.0 In-Wall Transmitter - Wyr ✅ confirmed in data
121. `SW-130-TX` — flagged review — 3-Input In-wall HDBaseT Transmitter (SW-130-TX family) - Wyr ✅ confirmed in data
122. `SW-130-TX-US` — flagged do-not-spec — 3-Input In-wall HDBaseT Transmitter (2-gang US) - WyreStorm ✅ confirmed in data
123. `SW-540-TX-W` — flagged discontinued — 4x2 4K HDBaseT Switcher with Wireless Casting - WyreStorm ✅ confirmed in data
124. `SWX-100-HDBT3` — flagged do-not-spec — SW-120-TX3 Transmitter and RX3-100 Receiver Kit - WyreStorm ✅ confirmed in data
125. `SWX-100-IW-UK` — flagged do-not-spec — In-Wall Kit with the SW-120-TX3-UK Transmitter and RX3-100 R ✅ confirmed in data
126. `SWX-100-IW-US` — flagged do-not-spec — In-Wall Kit with the SW-120-TX3-US Transmitter and RX3-100 R ✅ confirmed in data
127. `SWX-100-IW-UX` — flagged do-not-spec — 100m 4K60 HDBaseT 3.0 In-Wall KVM Extender with USB-C and HD ✅ confirmed in data
128. `SYN-KIT-130-EU` — flagged do-not-spec — In-Wall Presentation Kit with Control (EU) - WyreStorm ✅ confirmed in data
129. `SYN-KIT-130-US` — flagged do-not-spec — In-Wall Presentation Kit with Control - WyreStorm ✅ confirmed in data
130. `SYN-KIT-510-EU` — flagged do-not-spec — Advanced Presentation Kit with Control (EU) - WyreStorm ✅ confirmed in data
131. `SYN-KIT-510-US` — flagged do-not-spec — Advanced Presentation Kit with Control - WyreStorm ✅ confirmed in data
132. `SYN-TOUCH10` — flagged discontinued — Synergy 10.1" All-In-One Touchpad Controller - WyreStorm ✅ confirmed in data
133. `TS-280-EU` — flagged discontinued — 2.8" Serial Control Color Touchscreen - WyreStorm ✅ confirmed in data
134. `TS-280-US` — flagged discontinued — 2.8" Serial Control Color Touchscreen - WyreStorm ✅ confirmed in data
135. `TX-70-4K` — flagged discontinued — 70m 4K HDBaseT Transmitter - WyreStorm ✅ confirmed in data
136. `TX-H2X-ADZ` — flagged discontinued — H2XC Card: HDMI In, HDMI Out - WyreStorm ✅ confirmed in data
137. `TX-H2X-HDBT` — flagged discontinued — H2XC Card: 4K HDBaseT In, 4K HDBaseT Out, Mirrored HDMI Out  ✅ confirmed in data
138. `TX-H2X-HDMI` — flagged discontinued — H2XC Card: HDMI In, 4K HDBaseT Out, Mirrored HDMI Out - Wyre ✅ confirmed in data
139. `TX-H2X-OM3` — flagged discontinued — H2XC Card: HDMI In, 4K60 Fiber Out, Mirrored HDMI Out - Wyre ✅ confirmed in data
140. `TX-H2X-VLC` — flagged discontinued — H2XC Card: HDMI In, 4K60 HDBaseT Out - WyreStorm ✅ confirmed in data
141. `TX-SCL-HDBT` — flagged discontinued — 4K60Hz 4:2:0 HDBaseT TM Scaling Output Card for MX-1616-SCL ✅ confirmed in data
142. `TX-SCL-HDMI` — flagged discontinued — 4K60Hz 4:4:4HDMI Scaling Output Card for MX-1616-SCL ✅ confirmed in data
143. `WYRERING` — flagged do-not-spec — Adapter Ring with USB-C, DisplayPort & Mini DisplayPort to H ✅ confirmed in data

### Commercial Review (178)

1. `APO-100-UC` — Apollo Series Conference Speakerphone - WyreStorm
2. `APO-200-UC` — Apollo Series Conference Speakerphone & Switcher - WyreStorm
3. `APO-DG1` — Apollo TM 1080p USB-C(DP Atl mode) dongle for wireless casti
4. `APO-DG2-PRO` — Apollo USB-C Wireless Casting Dongle - WyreStorm
5. `APO-VX20-MNT` — Display Mount for Apollo VX20 Video Bars - WyreStorm
6. `APO-VX20-UC` — Apollo TM Video Bar & Switcher
7. `CAB-DAOC-10-C` — 32Gbps 8K 60Hz DisplayPort 1.4 Active Optical Cable with DP+
8. `CAB-DAOC-10-P` — 32Gbps 8K 60Hz DisplayPort 1.4 Active Optical Cable with DP+
9. `CAB-HAOC-10` — 10m/32ft HDMI 2.0 AOC
10. `CAB-HAOC-15` — 15m/49ft HDMI 2.0 AOC
11. `CAB-HAOC-15-C` — Active Optical HDMI Cable | 4K HDR 4:4:4/60| WyreStorm
12. `CAB-HAOC-15-P` — 24Gbps 4-core Active Optical HDMI Cable | WyreStorm
13. `CAB-HAOC-2` — 24Gbps 4-Core Active Optical HDMI Cable | 4K HDR 4:4:4/60, A
14. `CAB-HAOC-20` — Active Optical HDMI Cable | 4K HDR 4:4:4/60, ARC, CEC, ALLM 
15. `CAB-HAOC-20-C` — Active Optical HDMI Cable | 4K HDR| WyreStorm
16. `CAB-HAOC-20-P` — Active Optical HDMI Cable | Plenum & FT6 Rated| WyreStorm
17. `CAB-HAOC-30-C` — 24Gbps 4-core Active Optical HDMI Cable | 4K HDR 4:4:4/60 | 
18. `CAB-HAOC-30-P` — 24Gbps 4-core Active Optical HDMI Cable | 4K HDR 4:4:4/60 | 
19. `CAB-HAOC-4` — 24Gbps 4-Core Active Optical HDMI Cable | 4K HDR 4:4:4/60, A
20. `CAB-HAOC-6` — 24Gbps 4-Core Active Optical HDMI Cable | 4K HDR 4:4:4/60, A
21. `CAB-HAOC-8` — Active Optical HDMI Cable | 4K HDR 4:4:4/60, ARC, CEC, ALLM 
22. `CAB-HAOC-FRL-10` — 10m/32ft HDMI 2.1 AOC
23. `CAB-HAOC-FRL-15` — 15m/49ft HDMI 2.1 AOC
24. `CAB-HAOC-FRL-XX` — 8K HDMI Cable - CAB‑HAOC‑FRL‑XX HDMI 2.1 Bandwidth 48Gbps | 
25. `CAB-HAOC-XX` — 24Gbps 4-core Active Optical HDMI Cable | 4K HDR 4:4:4/60, A
26. `CAB-HAOC-XX-C` — 24Gbps 4-core Active Optical HDMI Cable | 4K HDR 4:4:4/60 | 
27. `CAB-HAOC-XX-P` — 24Gbps 4-core Active Optical HDMI Cable | 4K HDR 4:4:4/60 | 
28. `CAB-IR-LINK` — IR Link Cable for Control System Integration - WyreStorm
29. `CAB-UAOC-15` — 4-Port USB 3.0 Superspeed Hub - WyreStorm
30. `CAB-UAOC-15-C` — 15 Meter USB 3.2 GEN 2 10Gbps Active Optical Extension Cable
31. `CAB-UAOC-15-P` — 15 Meter USB 3.2 GEN 2 10Gbps Active Optical Extension Cable
32. `CAB-UAOC-USBC-10` — USB 3.2 USB-C to USB-C Cable| WyreStorm
33. `CAB-USBC-15` — USB-C Active Optical Cable (15m/49ft) - WyreStorm
34. `CAB-USBC-5M` — USB 3.2 USB-C to USB-C Cable| WyreStorm
35. `CAB-USBC-XM` — USB 3.2 USB-C to USB-C Cable| WyreStorm
36. `CAM-200-PTZ` — 1080p HD PTZ Conference Camera with USB 3.0 & Network Output
37. `CON-H2-DD-EARC` — 4K/60 In-line HDMI Scaler with DSP-Controlled Audio Breakout
38. `CON-H2-EDID` — 4K60 In-line Signal Re-Clocker with EDID Management - WyreSt
39. `CON-H2-SCL` — 4K60 In-Line HDMI Scaler with Audio Breakout - WyreStorm
40. `EX-100-H2` — 100m 4K HDBaseT Extender with USB - WyreStorm
41. `EX-70-H2X` — 70m 4K60 HDBaseT Extender with Ethernet - WyreStorm
42. `EX-80-KVM` — WyreStorm Essentials 80m KVM UTP Extender - WyreStorm
43. `EXP-4KUHD-05` — 0.5m/1.6ft HDMI 2.0 Cable
44. `EXP-4KUHD-10` — 1m/3ft HDMI 2.0 Cable
45. `EXP-4KUHD-20` — 2m/6.5ft HDMI 2.0 Cable
46. `EXP-4KUHD-30` — 3m/10ft HDMI 2.0 Cable
47. `EXP-4KUHD-50` — 5m/15ft HDMI 2.0 Cable
48. `EXP-4KUHD-X` — 4K HDR 4:4:4 60Hz HDMI Cable with VW-1 Rating - WyreStorm
49. `EXP-8KUHD-05` — 0.5m/1.6ft HDMI 2.1 Cable
50. `EXP-8KUHD-X` — 8K 60Hz HDMI 2.1 Cable with VW-1 Rating - WyreStorm
51. `EXP-CAB-USBC-1M` — 1m/3.2ft USB-C to C Cable
52. `EXP-CAB-USBC-2M` — 2m/6.5ft USB-C to C Cable
53. `EXP-CAB-USBC-5M` — 5m/16.40ft USB-C to C cable
54. `EXP-CON-AUD-H2` — WyreStorm Essentials™ HDMI Audio Extractor| WyreStorm
55. `EXP-CON-DAC` — WyreStorm Essentials? Digital to Analog Audio Converter| Wyr
56. `EXP-CON-DAC-D` — WyreStorm Essentials? Dolby? 5.1 Downmixer| WyreStorm
57. `EXP-CON-H2-DD` — WyreStorm Essentials? Dolby? & DTS? 7.1 Downmixer| WyreStorm
58. `EXP-HDMI-100M` — 10 Meter High Speed HDMI Cable | WyreStorm
59. `EXP-HDMI-150M` — WyreStorm Essentials? 15 Meter High Speed HDMI Cable| WyreSt
60. `EXP-HDMI-CPL` — WyreStorm Essentials HDMI Coupler - WyreStorm
61. `EXP-HDMI-DVI` — WyreStorm Essentials DVI to HDMI - WyreStorm
62. `EXP-HDMI-H2-05M` — HDMI Cable with CL3 Rating (0.5m/1.6ft)| WyreStorm
63. `EXP-HDMI-H2-1M` — HDMI Cable with CL3 Rating (1m/3.2ft)| WyreStorm
64. `EXP-HDMI-H2-2M` — HDMI Cable with CL3 Rating (2m/6.5ft)| WyreStorm
65. `EXP-HDMI-H2-3M` — HDMI Cable with CL3 Rating (3m/9.8ft)| WyreStorm
66. `EXP-HDMI-H2-5M` — HDMI Cable with CL3 Rating | WyreStorm
67. `EXP-HDMI-RTA` — WyreStorm Essentials Right Angle HDMI Adapter - WyreStorm
68. `EXP-HDMI-USBC` — WyreStorm Essentials USB-C to HDMI - WyreStorm
69. `EXP-HDMI-VGA` — HDMI VGA Extender Essentials VGA to HDMI | WyreStorm
70. `EXP-HDMI-XM-8K` — WyreStorm EXP‑HDMI‑XM‑8K 8K HDMI Cable – Ultra‑High Speed HD
71. `EXP-MX-0404-H2` — WyreStorm Essentials 4 Input and 4 Scaling Output 4K HDR HDM
72. `EXP-MX-0808-KIT` — 4K 8x8 HDBaseT Matrix with Receivers - WyreStorm
73. `HALO-COM-MIC` — Add-On Microphone for Halo Video Bar - WyreStorm
74. `HALO-VX10-V1` — WyreStorm Video Bar w/ 4K Camera, Stereo Speaker & Mic
75. `HALO-WFA-130` — 1080P HD Webcam - Business USB Webcam w/ Mic | WyreStorm FOC
76. `HALO-WFA-290` — 1080P HD Webcam - Business USB Webcam w/ Mic | WyreStorm FOC
77. `IDB-200-MS` — Compact In-Desk Connectivity
78. `IDB-200-NA` — Flip-Up In-Desk Box with USB-C, HDMI, USB Charging and Mains
79. `IDB-200-XX` — Compact In-Desk Connectivity with Power - WyreStorm
80. `IDB-300` — Dual Channel CableBox
81. `IDB-400-EU-C` — Flip-Up In-Desk Box with USB-C, HDMI, USB Charging and RJ-45
82. `IDB-400-MS` — Flip Up In-Desk Connectivity with Power - WyreStorm
83. `IDB-400-MS-C` — Flip Up In-Desk Connectivity with Power - WyreStorm
84. `IDB-400-NA` — Flip Up In-Desk Connectivity with Power - WyreStorm
85. `IDB-CBL-SPINE` — Under Desk Cable Management 'SPINE' for IDB Series (Adjustab
86. `IDB-HDMI-C` — HDMI
87. `IDB-K2-C` — Carrier Keystone 2 ports
88. `IDB-PWR-SCH` — 2m Wieland to Schuko Power Supply Cable For IDB-MS Series (S
89. `IDB-PWR-UK` — 2m Wieland to UK Power Supply Cable For IDB-MS Series (UK Pl
90. `IDB-RJ45-C` — RJ45 CAT6
91. `IDB-SPINE` — Under-Desk Cable Management Spine with Adjustable Height
92. `M4250-GSM4212PX-10P` — Netgear Pre-configured 1GbE 10-port Switch with 1G/10G Uplin
93. `M4250-GSM4230PX-26P` — Netgear Pre-configured 1GbE 26-port Switch with 1G/10G Uplin
94. `M4250-GSM4248PX-40P` — Netgear Pre-configured 1GbE 48-port Switch with 1G/10G Uplin
95. `M4300-XSM4316PA-16X` — Netgear Pre-configured 10GbE 16-port Switch for use with Net
96. `M4300-XSM4324CS-24X` — Netgear Pre-configured 10GbE 24-port Switch for use with Net
97. `MV-0401-PRO` — 4-Input 4K60 Multiview Processor for NetworkHD
98. `MX-0404-HDBT-H2A-KIT` — 4K 4x4 HDBaseT Matrix with Receivers - WyreStorm
99. `MX-0808-SCL` — 4K60 8x8 Seamless Scaling HDMI Matrix with USB-C Support - W
100. `MX-1010-H2XC` — 10 Slot 18Gbps 4K HDR Modular Matrix Switch Chassis - WyreSt
101. `MX-1616-H2XC` — 16 Slot 18Gbps 4K HDR Modular Matrix Switch Chassis - WyreSt
102. `MXV-0408-H2A` — 4K60 4x8 HDBaseT Matrix - WyreStorm
103. `MXV-0408-H2A-KIT` — 4K60 4x8 HDBaseT Matrix with 6x Receivers - WyreStorm
104. `MXV-0606-H2A-70` — 70m 4K60 HDBaseT Receiver for MXV - WyreStorm
105. `MXV-0606-H2A-V2` — 4K HDR 4:4:4 60Hz HDBaseT 6x6 Matrix Switch with 6x Toslink 
106. `MXV-0606-H2A-V3` — 4K60 6x6 HDBaseT Matrix - WyreStorm
107. `MXV-0808-H2A-70-V2` — 4K HDR 4:4:4 60Hz HDBaseT 8x8 Matrix Switch with Zone Audio 
108. `MXV-0808-H2A-V2` — 4K HDR 4:4:4 60Hz HDBaseT 8x8 Matrix Switch with Assignable 
109. `MXV-0808-H2A-V3` — 4K60 8x8 HDBaseT Matrix - WyreStorm
110. `MXV-0808-H2L` — 8x8 4K60 'Lite' HDBaseT Matrix - WyreStorm
111. `MXV-70` — Scaling 70m 4K60 HDBaseT Receiver for MX - WyreStorm
112. `NETWORKHDTOUCHTM` — Free iPad & Android Control App for NetworkHD 100, 200 & 400
113. `NHD-000-CTL` — Controller for NetworkHD Systems - WyreStorm
114. `NHD-000-RACK3` — 7U/8 Slot Rack Mount for NetworkHD 600 TX/RX - WyreStorm
115. `NHD-100` — Companion Control App for NetworkHD 100, 400, 500 & 600 Seri
116. `NHD-110-RX` — 1080p HD Low Bandwidth AV over IP Decoder - WyreStorm
117. `NHD-110-RX-S` — 1080p HD Low Bandwidth AV over IP Decoder with Sealoc Protec
118. `NHD-110-TX` — 1080p HD Low Bandwidth AV over IP Encoder - WyreStorm
119. `NHD-120-RX-S` — NetworkHD 120 Series 4K30 4:2:0 Decoder with Sealoc Protecti
120. `NHD-124-RACK-1U` — 1U 2-Slot Rack Mount for NetworkHD NHD-124-TX
121. `NHD-140-RACK-1U` — 1U/2 Slot Rack Mount for NetworkHD NHD-140-TX - WyreStorm
122. `NHD-250-RX` — NetworkHD 200 Series AV over IP H.264 MultiView Processor - 
123. `NHD-300-TX` — NetworkHD 300 Series 1080p AV over IP H.264 Open Standards E
124. `NHD-400-DNT-TX` — NetworkHD 400 Series 4K AV over IP JPEG 2000 Encoder with Da
125. `NHD-400-E-RX` — NetworkHD 400 Series 4K AV over IP JPEG 2000 Decoder - WyreS
126. `NHD-400-E-TX` — NetworkHD 400 Series 4K AV over IP JPEG 2000 Encoder - WyreS
127. `NHD-400-RX` — 4K AV Over IP - NetworkHD™ 400 Series| WyreStorm
128. `NHD-400-TX` — NetworkHD 400 Series 4K AV over IP JPEG 2000 Encoder - WyreS
129. `NHD-400-TX-IW` — NetworkHD 400 Series In-Wall 4K AV over IP JPEG 2000 Encoder
130. `NHD-500` — NetworkHD 500 Series 4K60 4:4:4 JPEG2000 Encoder & Decoder -
131. `NHD-500-E` — NetworkHD 500 Series Lite 4K60 4:4:4 JPEG2000 Encoder & Deco
132. `NHD-500-IW-TX` — NetworkHD 500 Series 4K60 4:4:4 JPEG2000 In-Wall Encoder - W
133. `NHD-500-T` — NetworkHD 500 Series 4K60 4:4:4 JPEG2000 TAA Compliant Encod
134. `NHD-500-TXRX-V2` — WyreStorm NHD-500-TX/RX V2 4K60 Encoder & Decoder with JPEG2
135. `NHD-600-RX` — NetworkHD 600 Series 4K HDR Premium AV over IP SDVoE Decoder
136. `NHD-600-TX` — NetworkHD 600 Series 4K HDR Premium AV over IP SDVoE Encoder
137. `NHD-610` — NetworkHD 610 Series 4K60 10GbE SDVoE Encoder & Decoder - Wy
138. `NHD-610-TX` — 4K60Hz 4:4:4 SDVoE Encoder
139. `NHD-CTL-PRO` — Pro Controller for NetworkHD - WyreStorm
140. `NHD-CTL-PRO-T` — Pro Controller for NetworkHD Series TAA Compliant - WyreStor
141. `NHD-RACK-1U` — 1U/2 Slot Rack Mount for NetworkHD 100/500/600 Series - Wyre
142. `NHD-RACK4-BLK` — Accessory for the NHD-000-RACK4 6U/12 Slot Rack Mount - Wyre
143. `NHD-TOUCH` — Touchscreen Control for NetworkHD 100, 400, 500 & 600 Series
144. `NHD-TOUCHPLUS` — Touchscreen control application for NetworkHD 110 Series - W
145. `OFFICE-KIT` — WyreStorm FOCUS Webcam & HALO Speakerphone, Office Kits
146. `PSU-12V-3A` — External Universal 12W Power Supply - 12V 3A - WyreStorm
147. `RX-70-4K-SCL` — 70m 4K HDBaseT Scaling Receiver with Downscaling - WyreStorm
148. `RXF-300-4K` — 4K HDR 4:4:4 60Hz HDBaseT Receiver with 2-Way IR and PoH (4K
149. `RXV-70-4K` — 70m 4K60 HDBaseT Receiver - WyreStorm
150. `SP-0102-H2` — 4K60 1:2 HDMI Splitter - WyreStorm
151. `SP-618` — 4K60 1:8 Scaling HDMI Splitter - WyreStorm
152. `SR-10G-MM-SFPP` — 10G SFP+ Multimode Transceiver - WyreStorm
153. `SR-1G-MM-SFP` — 1G SFP Multimode Transceiver - WyreStorm
154. `SW-0X01-8K` — WyreStorm Essentials 8K60 HDMI Switcher - WyreStorm
155. `SW-120-TX3-US` — Synergy 2-Input 4K60Hz HDBaseT 3.0 In-Wall Transmitter - Wyr
156. `SW-130-TX` — 3-Input In-wall HDBaseT Transmitter (SW-130-TX family) - Wyr
157. `SW-130-TX-US` — 3-Input In-wall HDBaseT Transmitter (2-gang US) - WyreStorm
158. `SW-540-TX-W` — 4x2 4K HDBaseT Switcher with Wireless Casting - WyreStorm
159. `SWX-100-HDBT3` — SW-120-TX3 Transmitter and RX3-100 Receiver Kit - WyreStorm
160. `SWX-100-IW-UK` — In-Wall Kit with the SW-120-TX3-UK Transmitter and RX3-100 R
161. `SWX-100-IW-US` — In-Wall Kit with the SW-120-TX3-US Transmitter and RX3-100 R
162. `SWX-100-IW-UX` — 100m 4K60 HDBaseT 3.0 In-Wall KVM Extender with USB-C and HD
163. `SYN-KIT-130-EU` — In-Wall Presentation Kit with Control (EU) - WyreStorm
164. `SYN-KIT-130-US` — In-Wall Presentation Kit with Control - WyreStorm
165. `SYN-KIT-510-EU` — Advanced Presentation Kit with Control (EU) - WyreStorm
166. `SYN-KIT-510-US` — Advanced Presentation Kit with Control - WyreStorm
167. `SYN-TOUCH10` — Synergy 10.1" All-In-One Touchpad Controller - WyreStorm
168. `TS-280-EU` — 2.8" Serial Control Color Touchscreen - WyreStorm
169. `TS-280-US` — 2.8" Serial Control Color Touchscreen - WyreStorm
170. `TX-70-4K` — 70m 4K HDBaseT Transmitter - WyreStorm
171. `TX-H2X-ADZ` — H2XC Card: HDMI In, HDMI Out - WyreStorm
172. `TX-H2X-HDBT` — H2XC Card: 4K HDBaseT In, 4K HDBaseT Out, Mirrored HDMI Out 
173. `TX-H2X-HDMI` — H2XC Card: HDMI In, 4K HDBaseT Out, Mirrored HDMI Out - Wyre
174. `TX-H2X-OM3` — H2XC Card: HDMI In, 4K60 Fiber Out, Mirrored HDMI Out - Wyre
175. `TX-H2X-VLC` — H2XC Card: HDMI In, 4K60 HDBaseT Out - WyreStorm
176. `TX-SCL-HDBT` — 4K60Hz 4:2:0 HDBaseT TM Scaling Output Card for MX-1616-SCL
177. `TX-SCL-HDMI` — 4K60Hz 4:4:4HDMI Scaling Output Card for MX-1616-SCL
178. `WYRERING` — Adapter Ring with USB-C, DisplayPort & Mini DisplayPort to H
