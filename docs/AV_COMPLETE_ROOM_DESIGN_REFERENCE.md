# Complete-room AV design reference for Wingman templates

**Audience:** Wingman developers and content authors building the sample/template design catalogue. **Not** customer-facing copy.
**Stance:** Written from the CTS-D seat: what a complete, defensible AV system design contains per market, and where the current template model — which nails *signal switching and distribution* — must widen so an inexperienced user is guided toward a *whole room*, not just a matrix.

---

## 1. Where the catalogue stands (audited 24–27 Sep 2026)

The 60 published templates (45 base + 11 extra + 4 emergency) already do several things genuinely well, per `WINGMAN_ROOM_DESIGN_AUDIT_2026-09-24.md` and `WINGMAN_TEMPLATE_DEPLOYMENT_REVIEW_2026-09-27.md`:

- Authored concepts with environment, construction, occupancy, source/output *schedules with locations*, and an architecture rationale + alternative
- A transport taxonomy with honest per-transport descriptions (Apollo BYOD, HDBaseT, 4×4/8×8 matrix, hybrid, NetworkHD 100/500/600, LCD wall processor, camera bridge, pods)
- A `completeScope()` manifest that already includes: source devices, displays, mounts, audio zones + amplifiers, UC camera/host/USB path, recording platform + ingest, CMS licences, control interface, AV-network switches with a port-math allowance (endpoints +20% expansion), uplinks/fibre, rack/PDU/ventilation, cabling allowance, UPS/resilience, assistive listening, labour, commissioning, and design documentation
- Audio design depth (zones, 100V vs low-Z, AEC/mix-minus, acoustic treatment scope) that is better than most sales-stage tooling

**The insufficiency is structural, not additive.** The template describes a *signal chain with accessories*. A complete AV design — the thing AVIXA standards and the CTS-D body of knowledge define — is a *room* with six interacting layers, and layers 2–6 are where an inexperienced user gets no guidance. They are the reason a "correct" matrix choice still produces a room that fails acceptance: the image is too small from the back row, the far end can't hear the board table, the button panel does nothing, the rack overheats, and nobody owns the helpdesk contract.

## 2. What "complete" means: the six layers every room needs

A defensible design answers six questions in order. Templates currently answer #1 richly and #3 partially; the rest are implicit or missing.

| # | Layer | Question it answers | What the user must be told |
|---|-------|--------------------|-----------------------------|
| 1 | **Signal transport** | How does content get from sources to destinations? | ✅ Already the catalogue's strength (matrix vs HDBaseT vs AVoIP vs bar) |
| 2 | **Experience & human factors** | Can every occupant *see, hear, be heard and be seen*? | Image size/viewing distance, audio coverage uniformity, speech privacy, camera FOV — with numbers, not vibes |
| 3 | **Control & user experience** | How does a non-technical human operate it? | Control processor, user interface, scheduling, monitoring, the "5-minute rule" |
| 4 | **Environment & infrastructure** | Does the building support it? | Power/heat, illumination, acoustics, network/security, structure, containment |
| 5 | **Services & assurance** | Who keeps it working, and what happens when it fails? | Warranty tiers, monitoring/NOC, spares, failover, documentation, training, acceptance testing |
| 6 | **Compliance & governance** | Is it legal, safe, and appropriate? | Accessibility/assistive listening, emergency-muted audio, privacy/consent, data governance |

**Design-rule consequence:** every template should state, in one place, the *whole-system manifest* across all six layers — which lines are WyreStorm, which are BY-OTHERS with an open spec, and which are site-survey deliverables. The current model does this for layer 1 + parts of 3/4/5; the guidance below closes the rest.

## 3. Hardware taxonomy: the complete equipment classes

A complete design considers every applicable class. Per-market defaults follow in §4.

### 3.1 Input & sources
- **Presentation inputs:** laptop tiles (USB-C full-function vs HDMI-only), wireless presentation gateways, document cameras, mobile-device casting
- **Content sources:** room PCs, media players, digital-signage players (CMS-licensed), set-top/IPTV tuners, VMS/CCTV decoders, video-conferencing compute
- **Cameras:** PTZ (auto-framing), fixed-FOV bars, bridged NDI/SDI production cameras, medical/document imaging; consider privacy shutters and policy
- **Microphones:** boundary/table, ceiling array, ceiling tile, gooseneck (council/court), wireless handheld/lav/headset, beam-steering arrays; DSP-based AEC is a *processing* decision, not a mic feature
- **Legacy/analogue:** SCART/Component/S-Video adapters (hospitality/retro venues), audio-only line inputs (stage boxes, mixing desks)

### 3.2 Signal management (the catalogue's current core)
- Switchers (presentation, matrix, hybrid), scalers, DA/splitters
- Extension: HDBaseT TX/RX pairs, optical extenders (long runs), AVoIP encoders/decoders/controllers (1Gb vs 10Gb classes), USB extension (host-side, device-side, optical for >10 m), KVM-over-IP for operator desks
- Video-wall processors (LCD canvas, LED controllers), multiviewers, windowing processors
- Converters/format guards: HDMI→SDI, audio de-embedders/embedders, DAC/ADC, EDID managers, HDCP straddles

### 3.3 Display & output
- Commercial LCD (consumer panels are not 16/7 or 24/7 rated), direct-view LED (pixel pitch by viewing distance), projection (lamp/laser, throw ratio, screens: fixed/motorised/ambient-rejecting)
- Interactive flat panels (IFPs) for education; confidence monitors; repeater/overflow displays
- Video walls: LCD bezel vs LED canvas vs projection blend; brightness by ambient light (nits), thermal and service access
- Projector lifts, mirror mounts, floor boxes, table portals, wallplate transmitters at user positions

### 3.4 Audio output & DSP
- Loudspeakers: ceiling (100V/70V vs low-Z), surface, pendant, column/line arrays, subwoofers, stage monitors, horns (stadium), sound-masking emitters
- Amplifiers: channel count × impedance class (low-Z per-speaker channels; 100V with a tap schedule ≤80% of channel rating), Dante/AVB-networked vs analogue
- DSP: AEC (conferencing), automixers, feedback suppression, zoning/matrix, paging/priority (fire-mute interface), delay for distributed fills; Dante/AES67 routing where justified
- Acoustic treatment: absorption panels, baffles, clouds, bass traps; *survey + treat, don't assume DSP fixes the room*

### 3.5 Conferencing & collaboration (UC)
- Codec/console per platform (MTR/Zoom Room), USB bars, room compute + licences
- Camera framing rules (FOV to farthest seat, auto-framing vs manual presets), second-camera support
- Touch controllers, room scheduling panels (ad-hoc + booked), wireless content share (with security review)
- BYOD: USB-C table solutions, single-cable host switching (video + USB + charging policy)

### 3.6 Control, automation & monitoring
- Control processors, touch panels, keypads, button panels; driver coverage (display, audio, UC, lighting, shades, HVAC)
- AV/IT monitoring (device health, licence expiry, call stats), remote management
- Occupancy/sensors, people counting (privacy-reviewed), scheduling integration (Microsoft/Google)
- **Policy controls:** emergency/audio mute interface, digital signage emergency override (campus/venue standard)

### 3.7 Infrastructure & power
- AV-dedicated network switches (PoE budgets per endpoint class), VLANs/multicast (IGMP snooping/QoS), dedicated AV LAN vs AV-VLAN, fibre uplinks/optics
- Racks (thermal calc), PDU (metered/switched), UPS (runtime by criticality), ventilation (passive vs forced)
- Cable: category (rated for HDBaseT), fibre (OS2), coax legacy, HDMI/DP/USB cables (passive length limits), containment (trunking, floor boxes, fire-stopping), labelling (TIA-606 class practice)
- Power: dedicated circuits, clean earth, outlet schedules at every source/display position; electrical works ownership

### 3.8 Services, compliance & governance
- Assistive listening (induction loop/IR/radio — jurisdictional accessibility law), captioning interfaces
- Security: network access control, HDCP policy, secure VMS walls, physical device security, camera privacy compliance, recording consent & retention
- Project services: survey, design documentation (elevations, schematics, cable schedules, rack elevations), installation labour, commissioning (with acceptance test procedure), training, warranty tiers, monitoring/NOC, spares, refresh planning

## 4. Per-market complete-room patterns (what "whole system" looks like)

Each entry: the *room programme*, the *complete system stack* (all six layers), and *what an inexperienced user will miss*.

### 4.1 UC-enabled boardroom (Corporate)
- **Programme:** 10–16 seats, dual displays or single large, room-system conferencing, laptop presentation, privacy for sensitive calls
- **Complete stack:** matrix or hybrid switcher; 2× 75" commercial displays (DISCAS Basic Decision Making: farthest viewer ~10–12 m → 75–90" class at 4K); ceiling mic arrays ×2–4 + DSP with AEC/mix-minus; ceiling speakers 4–6 (low-Z or 100V via DSP amp); MTR console/codec + touch controller + scheduling panel; PTZ camera(s) with FOV to the farthest seat; control processor + 8" panel (source/call/lighting scenes); wireless share gateway (IT-approved); AV rack with UPS + PDU; dedicated AV VLAN if networked; acoustic treatment (RT60 target ≤0.6 s for speech)
- **Inexperienced-user misses:** far-end echo from untreated reflective table; no scheduling panel → ghost bookings; camera FOV crops the head of table; single display forces content-vs-gallery choice with no confidence monitor; no mute policy

### 4.2 Classroom / active learning (Education)
- **Programme:** 24–30 learners, teacher mobility, multiple displays for sightlines, lecture capture optional, hybrid participation
- **Complete stack:** IFP or 86"+ display at the teaching wall; wireless share for BYOD; wallplate transmitter for laptop; ceiling speakers + voice-lift mic (teacher mic → DSP → room speakers, gain-before-feedback); room PC + guest input; lecture-capture appliance + camera + ceiling mic (consent-managed); simple wallplate control (volume/input) — teacher-friendly, not touch-panel-complex; campus AV-VLAN; mounts; hearing-aid loop where legally required
- **Inexperienced-user misses:** voice-lift feedback without DSP automix; IFP mount height wrong for seated sightlines; no document camera; lecture-capture consent policy omitted; front row blocks the display's lower third

### 4.3 Lecture theatre / auditorium (Education/Venue)
- **Programme:** 80–400+ seats, lectern-driven, projection or LED, speech reinforcement + programme, capture/stream, overflow/foyer
- **Complete stack:** laser projection + ambient-rejecting screen (or direct-view LED by ambient light); presentation switcher at lectern (HDMI/USB-C/document cam); lectern confidence monitor; line/column loudspeakers (predictive modelling: ArrayCalc/EASE-class), delayed under-balcony fills with DSP delay; wireless handheld/lav + lectern gooseneck into DSP with automix + AEC for hybrid; PTZ cameras ×2–3 for capture/stream; recording appliance/streaming encoder; control touch panel with scene presets (lecture/event/exam); assistive listening (IR/loop); accessible positions + captioning; DSP paging priority; UPS on the lectern chain; house-light scene interface
- **Inexperienced-user misses:** speech intelligibility in a reflective hall without predictive modelling; no delay on fills → echo; confidence monitor forgotten; accessibility assumed not specified; no presets → a volunteer can't run an event

### 4.4 Digital signage & TV distribution (Retail/Hospitality/Transport)
- **Programme:** many screens across zones, centrally managed content, live TV mix (sports bars), menu boards (QSR), FIDS (airport), queue/bank, waiting rooms (healthcare)
- **Complete stack:** CMS server/licences (per player) + players at each screen; AVoIP (NetworkHD 100/500) or matrix + HDBaseT by screen count; live TV headend (satellite/IPTV tuners) as scheduled sources; long-run cable plant; commercial 16/7 or 24/7 panels (brightness by ambient — shopfront 2,500+ nits); mounts (wall/ceiling/window); silent audio or multi-zone programme audio; network switches with PoE for players + AV VLAN; CMS offline playback mode; remote monitoring (dark-screen detection); content template governance
- **Inexperienced-user misses:** consumer panels die under 16/7; shopfront daylight readability; CMS offline fallback unowned; per-screen licence costs omitted; no monitoring → dark screens unnoticed for days

### 4.5 Command & control / SOC (Government/Energy/Transport/Emergency)
- **Programme:** 24/7 monitoring of VMS/CCTV, SCADA dashboards, incident walls, multiview layouts, role-based access, no single point of failure
- **Complete stack:** AVoIP 600-series (10Gb) or KVM-over-IP for operator desks; LED or LCD video wall with windowing/multiview processor (or 600-series built-in wall mode, mode-latency validated); VMS decoders with approved feeds only; operator consoles with KVM extension; redundant PSU/UPS + generator changeover; dual switches (no SPOF) on segregated management/AV VLANs; operator touch panel + programmable incident presets; 24/7-rated panels + thermal design; 24/7 monitoring/NOC + SLA + spares + failover drills; dim, low-glare lighting scenes; acoustic treatment for comms intelligibility
- **Inexperienced-user misses:** consumer panels + no hot spares = dark wall mid-incident; no role-based access on layouts; one switch = SPOF; latency vs genlock mode confusion; 24/7 thermal load not designed

### 4.6 Courtroom (Government/Judicial)
- **Programme:** evidence presentation (document camera, laptop, VMS feed), bench/jury/counsel displays, public-gallery overflow, remote witness link, recording/streaming, accessibility
- **Complete stack:** hybrid matrix (local + one secure remote feed); evidence presentation switcher at the clerk position; document camera; monitors at bench, witness box, jury, counsel (some mirrored, some independent); public-gallery repeater; assistive listening (legally mandated); gooseneck mics at bench/witness/counsel into DSP (AEC for remote witness); secure VMS feed with access policy; recording/streaming with jurisdiction compliance; clerk touch control with presets (evidence/remote-witness/all-screens); privacy-kill mode (drop all feeds); UPS on the recording chain
- **Inexperienced-user misses:** evidence confidentiality (which screens see which feed when); jury feeds ≠ public feed; assistive listening legally required; recording retention/consent varies by jurisdiction; remote-witness latency/AEC quality

### 4.7 Sports stadium / fan zone (Venue)
- **Programme:** scoreboard/video displays, concourse & concession TVs, suites, VIP/press overflow, live TV/IPTV distribution, event PA with life-safety priority, event operations comms
- **Complete stack:** outdoor-rated direct-view LED (high-nit, rear-service) + LED processors; IPTV/AVoIP distribution across concourse/suites; satellite/IPTV headend; PA/VA system (voice-alarm certified, life-safety priority over programme audio — legally governed); distributed 100V speakers by zone with DSP delay per zone; commentary/event mixer; match-day operator room with matrix + presets; digital signage CMS for wayfinding + sponsors; UPS/backup power for the life-safety chain; remote monitoring; spares programme
- **Inexperienced-user misses:** PA/VA is life-safety governed (fire officer + jurisdiction) — not a "nice to have"; outdoor LED brightness/servicing; per-zone delay; sponsor content workflow; event-day ops runbook

### 4.8 House of worship (Venue)
- **Programme:** congregation speech + programme, overflow/foyer, children's rooms, livestream, band/vocal reinforcement, accessibility
- **Complete stack:** line/column loudspeakers (predictive coverage); DSP with automix + AEC (livestream needs clean mix-minus); wireless mic packages (frequency-coordinated); stage box/monitors + IEM; livestream cameras + streaming encoder + lyric/projection feed (preacher confidence); overflow/foyer displays + delayed audio; control surface with scene presets (service/event/wedding); hearing assistance; UPS on the streaming chain; acoustic treatment (high ceilings, hard walls)
- **Inexperienced-user misses:** livestream mix ≠ house mix (mix-minus); wireless frequency coordination (regulatory); volunteer operability via presets; acoustic treatment vs DSP misconception; lyric feed ≠ livestream feed

### 4.9 Hospitality (bar/restaurant/ballroom/casino)
- **Programme:** multi-zone background + event audio, sports TV distribution, divisible ballrooms, DJ/live inputs, casino floor
- **Complete stack:** 8×8 matrix or AVoIP by screen count; multi-zone DSP + 100V speakers by zone with independent source/mute (bar ≠ dining ≠ terrace); DJ/live inputs with compressor/limiter; sports headend (satellite/IPTV); CMS for promos; control keypads per zone; scheduling panel for ballroom (two-room vs combined); portable AV trolley option; acoustic separation between divisible rooms (operable partition + independent audio)
- **Inexperienced-user misses:** zone control *is* the product — one global volume knob is a design failure; commercial TV licensing; ballroom split/combine mode that forgets to re-route audio; DJ input priority

### 4.10 Retail (flagship/store/QSR)
- **Programme:** brand video walls, promo screens, menu boards, queue management, ambient audio, fitting-room AV
- **Complete stack:** LCD wall processor or direct-view LED for the feature wall; CMS per player; AVoIP/matrix for promo screens; 100V audio zones (entrance/fitting/till) with daypart scheduling; shopfront high-nit panels; menu-board CMS integration (price/POS feed where required); mounts; network PoE + VLAN; CMS monitoring; brand-governed content templates; queue-call displays
- **Inexperienced-user misses:** shopfront daylight readability; menu-board licensing/POS integration; daypart audio scheduling; brand content governance; screen-off detection

### 4.11 Healthcare (clinic/hospital/telemedicine)
- **Programme:** waiting-room info, clinical MDT review, procedure observation/training, telemedicine consults, wayfinding
- **Complete stack:** matrix/AVoIP for clinical displays; MDT room with camera + mics + AEC for remote specialists; procedure observation (operatories → observation/debrief) with patient-privacy governance; telemedicine carts/rooms (platform-certified bar + display + scheduling); waiting-room CMS (silent or low-level, infection-control-cleanable panels); assistive listening; clinical network segregation; UPS on the clinical chain; camera/recording privacy policy; infection-control-rated surfaces/mounts in clinical zones
- **Inexperienced-user misses:** patient privacy/consent; clinical network segregation; infection-control material ratings; waiting-room audio liability; telemedicine platform certification

### 4.12 Emergency services (station/dispatch/tactical)
- **Programme:** station briefing, tactical coordination, 24/7 dispatch (CAD/VMS), shared status across stations
- **Complete stack:** station = local HDBaseT + display + PC; dispatch = 600-series 10Gb + KVM + redundant power + failover + NOC SLA; tactical = hybrid matrix + secure remote feed on an AV-VLAN with IT/security sign-off; shared status = NetworkHD 100 + multiview on approved 1Gb; alerting/paging integration with station tone; UPS/generator for 24/7 rooms; monitoring/NOC; access policy (who can push to which wall); IT-approved security boundary
- **Inexperienced-user misses:** information classification; 24/7 failover; alerting integration; security boundary between operational network and AV

## 5. Cross-cutting design mathematics the templates should surface

| Rule | What it decides | Where it's codified |
|---|---|---|
| **DISCAS (AVIXA V202.01)** | Image size from farthest viewer + content type (Basic vs Analytical Decision Making) | Boardroom 75" vs 98"; classroom 86"; auditorium projection/LED |
| **%BDM / %EDM character height** | Legibility of critical detail at distance — drives display size, not resolution | Control-room operator displays, sub-4K content |
| **Audio coverage uniformity (AVIXA A102.01:2017)** | Speaker count/position for ±3 dB (±2 dB critical) across the listener area | Ceiling-speaker counts |
| **RT60 / speech intelligibility (STIPA)** | Acoustic treatment quantity + DSP tuning; AEC does not fix reverb | Boardrooms/classrooms/auditoriums |
| **Nits vs ambient light** | Panel brightness: shopfront 2,500+ nits; conference 400–500; control room 200–400 dim-adapted | Retail vs boardroom vs SOC |
| **Viewing distance → LED pixel pitch** | ≈1.2 mm for ≤3 m; 2.5 mm for 5–8 m; 4–10 mm stadium concourse | LED walls per market |
| **Network bandwidth** | 1 Gb (NHD 100/500) vs 10 Gb (600) per concurrent stream; port math + 20% expansion; PoE budget per endpoint | AVoIP fabric design |
| **Thermal load** | Rack BTU → ventilation (passive/forced/AC); 24/7 rooms need designed airflow | Rack/PDU/ventilation allowance |
| **Mute/priority hierarchy** | Life-safety > paging > programme > local | VA/PA, emergency mute interface |
| **Cable distance budgets** | HDBaseT ≤35 m @1080p60; passive HDMI ≤5 m; USB 3 ≤3 m without optical; fibre beyond | Source/display placement |

## 6. Translating this into Wingman: template schema changes that close the gap

`RoomTemplate` already has `bom`, `designNotes`, `assumptions`, `validationItems`, `upgradePaths`, `concept`. To make it *complete-room*, extend the authored data (`RoomDeploymentDesign` in `roomTemplateDeployment.ts`) with optional guidance keys — `completeScope()` then emits them as additional BY-OTHERS rows + design notes. Zero breaking change to existing data.

```ts
// Proposed additions to RoomDeploymentDesign (all optional; absence = not applicable)
type RoomCompletionDesign = {
  // Layer 2 — Experience & human factors
  humanFactors?: {
    farthestViewerMetres?: number;         // drives DISCAS hint + %BDM note
    contentClass?: "bdm" | "adm";          // Basic vs Analytical Decision Making
    ambientLight?: "controlled" | "daylight" | "high-ambient" | "outdoor";
    speechPrivacy?: boolean;               // sound-masking/isolation row
    cameraFov?: string;                    // e.g. "FOV to farthest seat at table head"
  };
  // Layer 3 — Control & UX
  controlExperience?: {
    operator: "teacher" | "facilitator" | "volunteer" | "professional" | "public";
    scheduling?: boolean;                  // room booking panel integration
    monitoring?: "none" | "basic" | "24-7-noc";
  };
  // Layer 4 — Environment
  environment?: {
    rt60Target?: string;                   // e.g. "≤0.6 s"
    acousticTreatment?: "none" | "light" | "moderate" | "heavy";
    illuminationControls?: boolean;        // blinds/scene lighting integration
    rackThermal?: "passive" | "forced" | "hvac-cooled";
  };
  // Layer 5 — Services & assurance
  assurance?: {
    acceptanceTest?: boolean;
    trainingAudience?: string;
    warrantyTier?: "return-to-base" | "advance-replacement" | "on-site-nbd" | "24-7-mission-critical";
    monitoringContract?: boolean;
    sparesHeld?: string;
  };
  // Layer 6 — Compliance
  compliance?: {
    assistiveListening?: "required" | "recommended" | "not-required";
    lifeSafetyAudioPriority?: boolean;     // VA/PA integration
    recordingConsentPolicy?: string;
    cameraPrivacy?: string;
    informationClassification?: string;    // courtroom/SOC/emergency services
  };
};
```

**Generator behaviour** (`completeScope()`): each populated block adds a *labelled design note* (teaching-oriented) **and**, where hardware/allowance follows, a BY-OTHERS row (e.g. `BY-OTHERS-ASSISTIVE-LISTENING`, `BY-OTHERS-SOUND-MASKING`, `BY-OTHERS-SCHEDULING-PANEL`, `BY-OTHERS-MONITORING-NOC`). Unpopulated keys emit nothing — no template regresses.

**UI surface** (`TemplateReviewPage.tsx`): add a "Complete-room checklist" section/tab rendering the six layers — green for covered (WyreStorm SKU), amber for BY-OTHERS with open spec, grey for not-applicable — plus a "Before you quote" list synthesised from populated guidance keys. This is the inexperienced user's map from "which matrix" to "this is a whole room".

**Catalogue-level next steps** (from the audit's own "next design opportunity" column):
- Fill thin verticals with authored room types: airport FIDS depth, stadium suite/concourse, hotel guest-room cast/IPTV, museum/exhibition, industrial/training, courtroom evidence depth, transportation concourse
- De-duplicate the three overlapping Government "control-room-like" templates into distinct security operations / civic deliberation / judicial evidence workflows
- ✅ The six-layer `complete-room scorecard` now ships inside `check:template-realism` (see §7), so catalogue quality measures whole-room coverage, not just SKU realism

## 7. If you only fix one thing

Make every template show **"what else this room needs"** — a single, visible, honest list of the non-WyreStorm scope (displays, mounts, cameras, mics/DSP, control, network, power, labour, compliance, services) with quantity drivers and an open spec. `completeScope()` already generates most of that; the missing 20% is the six-layer experience/control/environment/assurance/compliance guidance that turns a switching bill of materials into a design a beginner can defend to their client.

**The catalogue now measures this.** `check:template-realism` scores every published template against all six layers using the same derivation the review page's Complete-room checklist renders, and prints the per-layer coverage line (transport 59/59, guidance layers still unspecified at baseline). Per-layer floors live in `tools/template-coverage-floors.json`: falling below a floor fails `verify:data`; authoring `completion` blocks raises the measured coverage and lets the floors rise — the ratchet that turns "a correct matrix in an unwatchable room still fails acceptance" from advice into a gate.

Sources grounding the standards and market claims: [AVIXA Standards overview](https://www.avixa.org/resources/standards), [AVIXA DISCAS / V202.01 display image size](https://www.avixa.org/resources/display-image-size-calculators/analytical-and-basic-decision-making-calculations), [ANSI/AVIXA A102.01:2017 audio coverage uniformity](https://webstore.ansi.org/preview-pages/InfoComm/preview_AVIXA+A102.01-2017.pdf), [CTS-D certification scope](https://www.avixa.org/training-certification/certification/cts-d-certification), [AVIXA command & control design considerations](https://www.avixa.org/explore/articles/designing-effective-control-command-centre-audio-visual-system-key-considerations), plus internal audits `docs/WINGMAN_ROOM_DESIGN_AUDIT_2026-09-24.md` and `docs/WINGMAN_TEMPLATE_DEPLOYMENT_REVIEW_2026-09-27.md`.
