# Room deployment and complete AV system review

Reviewed 27 September 2026. Covers all 59 published template IDs; saved links and image associations remain intact. 41 previous templates contained required NetworkHD equipment; 15 revised concepts retain NetworkHD. The other 44 use bounded local designs. This is an authored sales design basis, not a surveyed construction specification.

## Design basis

Each concept states environment, construction, occupancy, source/output locations, use and architecture rationale. All hardware needed to deliver that concept is included either as a named WyreStorm product or required third-party scope. Supplier/model fields remain open for the salesperson and integrator to complete. Measured installation, control, cabling, power and commissioning allowances must be priced; a quantity of one allowance is not a claim that one cable or one labour day completes the work.

Video endpoint counts follow physical HDMI handoffs and displays, not spare matrix ports. Source-to-rack extensions are additional to output extensions. Existing equipment can fulfil a scheduled line after its interfaces and condition are confirmed. Shared feeds are stated explicitly; independent screen content requires enough content sources.

## Audio approach

Speech intelligibility and coverage determine the commercial audio system. Small rooms can use one modest pair; 100V ceiling/surface speakers often cover all required speech and programme playback. Lecture and production spaces may separate programme speakers from delayed speech fills. Only the two cinema concepts assume a 5.1 system and subwoofer. Integrated conferencing bars do not acquire redundant external speakers or amplifiers. Silent signage remains silent.

Each zone has a speaker count, circuit topology, amplifier channel/power and independent level/mute. Bar, dining, lounge, concourse and partitioned-room designs explicitly describe independent feed selection or linked event presets. Audio matrix inputs and outputs, programme interfaces and zone controls are required scope. A 100V circuit uses a stated tap schedule with connected load no greater than 80% of channel rating as a preliminary design allowance; final coverage, SPL, cable loss and local installation requirements govern selection. Low-impedance speakers each have an independent amplifier channel, avoiding unstated parallel loads.

Conferencing designs define microphone send, far-end return, AEC reference, mix-minus and USB host connectivity. Amplifier EQ is not assumed to provide AEC. Dante appears only where multiple distributed mixes or production interfaces justify it, with explicit compatible endpoints, clocking, managed network and channel licences. Video networking does not automatically supply Dante audio.

Acoustic survey and treatment packages are required where speech pickup, teaching, production or reflective large-room assumptions warrant them. These packages explicitly include measured wall/ceiling absorption, panel performance and mounting/labour. They distinguish room absorption from sound isolation and do not claim that AEC, DSP or steerable arrays solve reverberation. Existing treatment may fulfil the scope only after it is verified.

## Manufacturer evidence and selection limits

- The [MX-0808-KIT-V2](https://www.wyrestorm.com/product/mx-0808-kit-v2/) includes eight HDBaseT receivers. Mirrored HDMI connectors are not extra independent destinations; confirm format and cable limits before quoting.
- The [MX-1007-HYB](https://www.wyrestorm.com/product/mx-1007-hyb/) supports a bounded local design using its HDMI and native HDBaseT outputs; the base concepts do not assume its NHD ports are populated.
- The [SW-130-TX-UK](https://www.wyrestorm.com/product/sw-130-tx-uk/) is the limiting component in the matched teaching-room path: the concept uses 1080p60/4K30 and does not promise laptop charging.
- [NetworkHD family guidance](https://www.wyrestorm.com/global/networkhd-av-over-ip-solution/) and [NHD-600-TRX](https://www.wyrestorm.com/global/product/nhd-600-trx/) support family-specific fabrics. The 600-series needs engineered 10Gb links; latency and layout capabilities must be validated in the selected mode across the complete system.
- The [camera bridge launch details](https://www.wyrestorm.com/blog/4k-multi-camera-video-bridges-launch/) describe a local mixed-camera production device. Its programme output is not an independent preview bus or a general CCTV ingestion gateway.
- The [AMP-2120-DNT technical table](https://www.wyrestorm.com/product/amp-2120-dnt/) specifies 240W mono in 70/100V mode or two 120W low-impedance channels. These are alternative modes; separate programme and 100V systems need separate channels/amplifiers. The revised templates select it for specific 100V zones and include transformer loudspeakers.
- The [DSP-88-DNT](https://www.wyrestorm.com/global/product/dsp-88-dnt/) is an option to assess for AEC and USB/Dante processing after supply status, channels and platform compatibility are confirmed. No template assumes availability merely from a product announcement; required AEC processing remains supplier-neutral.

Specialist loudspeaker systems are specified by others where the assumed room warrants them: the two lecture theatres and school hall now nominate powered steerable columns, replacing their generic main-room speaker/amplifier packages. The large worship auditorium nominates two complete modular array/subwoofer assemblies. Final module count, fills, amplification and installation method are part of the specialist package, not omitted extras. [Renkus-Heinz beam-steering guidance](https://renkus-heinz.com/beam-steering/) supports controlled coverage in acoustically difficult spaces; [d&b ArrayCalc](https://www.dbaudio.com/global/en/products/software/arraycalc/) supports predictive coverage and system planning for arrays, point sources and subwoofers. These references establish the selection method, not an endorsement of a specific unverified SKU.

## Catalogue decisions

| Template | Previous required video core | Revised approach | Video I/O | Audio zones / system |
|---|---|---|---|---|
| Corporate Huddle Room — Single-Screen BYOD | APO-VX20-UC-V2 | Local UC | 1 / 1 | integrated |
| Executive Boardroom — Local 4×4 Matrix | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 4×4 matrix | 4 / 3 | Meeting room ceiling |
| Teaching Classroom — Local HDBaseT | SW-130-TX-UK | HDBaseT | 2 / 1 | Programme zone |
| Lecture Capture Theatre — Local Presentation Matrix | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX, NHD-150-RX | 4×4 matrix | 3 / 3 | Powered digitally steerable column array assembly |
| Retail Store — Eight-Zone Content Matrix | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 2 / 8 | silent |
| Retail Feature Wall — Four-Panel LCD Canvas | SW-0204-VW | LCD wall processor | 2 / 4 | silent |
| Sports Bar — Twelve Independently Routed Screens | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | NHD 100-series | 6 / 12 | Bar zone; Seating zone |
| Divisible Ballroom — Two-Room Presentation System | MX-1007-HYB | Local hybrid matrix | 4 / 4 | Ballroom partition A; Ballroom partition B |
| Clinical Simulation — Local Observation and Debrief | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 4×4 matrix | 3 / 3 | Simulation teaching room |
| Government Control Suite — Ten-Feed Display Routing | NHD-CTL-PRO-V2, NHD-600-TRX | NHD 600-series | 10 / 10 | Operational briefing audio |
| Worship Venue — Main Hall and Distributed Overflow | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | NHD 500-series | 3 / 5 | Main congregation PA; Rear speech fill; Overflow and foyer |
| Transport Operations Office — Local Status Routing | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 4 / 6 | silent |
| Residential Media Room — Local Source Selection | MX-0404-HDMI | 4×4 matrix | 3 / 1 | cinema |
| Multi-Camera Meeting Room — Local Camera Production | APO-VX20-UC-V2, CAM-420-PTZ | Camera production bridge | 2 / 1 | Presentation playback pair |
| School Assembly Hall — Single Projector HDBaseT | SW-130-TX-UK | HDBaseT | 2 / 1 | Powered digitally steerable column array assembly |
| Flexible Learning — Five Sources and Four Team Displays | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 8×8 matrix kit | 5 / 4 | Programme zone |
| Hybrid Seminar Room — Local Presentation and Conferencing | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 4×4 matrix | 3 / 2 | Meeting room ceiling |
| Active Learning Lab — Six Teams and Tutor Routing | NHD-600-TRX | 8×8 matrix kit | 7 / 7 | Programme zone |
| Large Sports Bar — Twenty-Four Independent Screens | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | NHD 500-series | 8 / 24 | Main bar; Lounge; Dining |
| Local Pub — Eight-Zone HDBaseT Matrix | MX-0808-KIT-V2 | 8×8 matrix kit | 4 / 8 | Bar; Dining |
| Casino Floor — Forty-Eight Zone Routing | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | NHD 500-series | 16 / 48 | Gaming area A; Gaming area B; Hospitality; Circulation |
| Bingo Hall — Programme and Repeater Distribution | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX, NHD-150-RX | NHD 100-series | 4 / 9 | Audience speech zone |
| Stadium — Concourse and VIP Distribution | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | NHD 500-series | 12 / 64 | Concourse 1; Concourse 2; Concourse 3; Concourse 4; Hospitality background |
| Security Command Room — Approved VMS Display Feeds | NHD-CTL-PRO-V2, NHD-120-TX, NHD-150-RX | 8×8 matrix kit | 6 / 6 | Operational briefing audio |
| Situation Room — Twelve-Feed Operational Wall | NHD-600-TRX | NHD 600-series | 12 / 12 | Meeting room ceiling |
| Medium Meeting Room — Dedicated Conferencing | APO-VX20-UC-V2 | Local UC | 1 / 1 | integrated |
| Experience Centre — Flexible High-Detail Demonstration | NHD-CTL-PRO-V2, NHD-600-TRX | NHD 600-series | 5 / 5 | Demo programme pair; Tour speech |
| Agile Office — Four Independent Collaboration Pods | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | Independent HDBaseT pods | 4 / 4 | silent |
| Primary Classroom — Interactive Teaching Display | SW-130-TX-UK | HDBaseT | 2 / 1 | Programme zone |
| University Theatre — Main Room and Overflow | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | NHD 500-series | 4 / 5 | Overflow A; Overflow B; Powered digitally steerable column array assembly |
| STEM Laboratory — Two Demonstration Feeds | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 2 / 8 | Bench teaching area |
| Security Operations Centre — Twenty-Screen Estate | NHD-CTL-PRO-V2, NHD-600-TRX, AMP-2120-DNT | NHD 600-series | 10 / 20 | Operational briefing audio |
| Utility Network Operations — Local Dashboard Matrix | NHD-CTL-PRO-V2, NHD-600-TRX | 8×8 matrix kit | 6 / 6 | Operational briefing audio |
| Traffic Management — Eight Shared Display Routes | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 8×8 matrix kit | 6 / 8 | Operational briefing audio |
| Council Chamber — Local Presentation and Public Record | MX-1007-HYB | Local hybrid matrix | 4 / 4 | Council chamber |
| Clinical MDT — Local Review Presentation | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 4×4 matrix | 3 / 3 | Meeting room ceiling |
| Clinic Waiting Area — Six Information Screens | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 2 / 6 | silent |
| Fitness Club — Ten Programme Zones | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | NHD 100-series | 4 / 10 | Exercise floor; Circulation |
| Private Screening Room — Local Cinema System | MX-0404-HDMI | 4×4 matrix | 3 / 1 | cinema |
| Airport Gate Zone — Local FIDS and Boarding Routing | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 8×8 matrix kit | 4 / 8 | silent |
| Podcast Studio — Two-Camera Production | NHD-CTL-PRO-V2, CAM-0402-NDI-BRG, NHD-500-TX, NHD-500-RX | Camera production bridge | 2 / 1 | studio |
| Bank Branch — Rate and Queue Display Matrix | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 3 / 6 | silent |
| Large Worship Auditorium — Production and Overflow | NHD-CTL-PRO-V2, NHD-600-TRX | NHD 600-series | 3 / 7 | Rear speech fill; Overflow and foyer; Modular main-array and subwoofer assembly |
| Reception and Town Hall — Six Local Display Zones | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 3 / 6 | All-hands speech; Reception background |
| Training Suite — Local Presentation, UC and Capture | MX-1007-HYB | 4×4 matrix | 4 / 3 | Meeting room ceiling |
| Library Learning Commons — Seven Information Zones | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 3 / 7 | silent |
| Esports Teaching Lab — Spectator and Analysis Distribution | NHD-CTL-PRO-V2, NHD-500-RX | NHD 500-series | 6 / 6 | Shared teaching audio |
| Hotel Meeting Room — Single-Screen BYOD | APO-VX20-UC-V2 | Local UC | 1 / 1 | integrated |
| Restaurant and Bar — Six-Zone Fixed Matrix | MX-0808-KIT-V2 | 8×8 matrix kit | 4 / 6 | Bar programme; Dining background |
| Quick-Service Restaurant — Four Menu Feeds, Eight Screens | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX | 8×8 matrix kit | 4 / 8 | silent |
| Car Showroom — Configurator and Brand Routing | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 8×8 matrix kit | 5 / 8 | Sales desks; Vehicle floor |
| Courtroom — Controlled Evidence Presentation | MX-1007-HYB | Local hybrid matrix | 4 / 5 | Meeting room ceiling |
| Incident Briefing Room — Five-Feed Local Matrix | NHD-CTL-PRO-V2, NHD-500-TX, NHD-500-RX | 8×8 matrix kit | 5 / 5 | Meeting room ceiling |
| Telemedicine Consultation — Local Video Visit | APO-VX20-UC-V2 | Local UC | 1 / 1 | integrated |
| Procedure Observation — Approved Training Feeds | NHD-CTL-PRO-V2, NHD-500-RX | NHD 500-series | 4 / 5 | Observation; Seminar |
| Station Briefing Room — Local HDBaseT | SW-130-TX-UK, RX-700 | HDBaseT | 2 / 1 | Programme zone |
| Tactical Coordination Room — Local 4×4 Matrix | MX-1007-HYB, NHD-500-TX, NHD-CTL-PRO-V2 | 4×4 matrix | 4 / 2 | Meeting room ceiling |
| Dispatch Review Room — Three-Feed Local Routing | NHD-600-TRX, NHD-CTL-PRO-V2 | 4×4 matrix | 3 / 3 | Operational briefing audio |
| Station Shared Status — Four Local Displays | NHD-CTL-PRO-V2, NHD-120-TX, NHD-120-RX, NHD-150-RX | 4×4 matrix | 2 / 4 | silent |

## Corporate Huddle Room — Single-Screen BYOD

Template ID: `corporate-huddle-apollo` · Market: Corporate

**Concept.** A 4m × 3.5m enclosed huddle room with a four-seat table and a 2.7m ceiling. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 4–6 people. A colleague connects a laptop, shares a document and joins a call using the room camera and audio; one screen keeps operation straightforward.

**Sources.** 1 × Visiting laptop with USB-C video and USB host support (table).

**Destinations.** 1 × 55–65-inch commercial display (front wall above the bar).

**Hardware decision.** Local UC. One source position and one screen need a local conferencing bar, not network video transport. If the room needs two independent screens or multiple cameras, redesign around a local presentation switcher and a separately selected conferencing package.

**Audio experience.** The integrated bar provides two-way call audio and everyday presentation playback for the stated seating area; no external speaker or amplifier system is required.





One USB conferencing return and the selected presentation audio use the integrated bar; no external zone matrix is required. Integrated microphone array; confirm pickup in the actual room. Use the bar’s integrated conferencing processing and verify microphone pickup at the furthest seat; do not cascade an external AEC processor. The bar is the USB microphone and loudspeaker device for the connected host. Call return and microphone send travel over USB; use one active audio device.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Prove camera framing and voice pickup at the furthest seat; confirm laptop USB-C support. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Executive Boardroom — Local 4×4 Matrix

Template ID: `corporate-boardroom-networkhd500` · Market: Corporate

**Concept.** A 9m × 6m boardroom with a central table, two front screens and a side confidence display. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 12–16 people. Presenters can place a laptop, room PC or approved guest feed on any screen while a separate room conferencing system handles remote participants.

**Sources.** 1 × Room PC HDMI output (ventilated credenza); 1 × Guest laptop HDMI presentation connection (table); 1 × Room conferencing compute HDMI output (credenza); 1 × Approved visitor HDMI feed (credenza patch panel).

**Destinations.** 2 × 75-inch front display (front wall); 1 × 55-inch confidence display (side wall).

**Hardware decision.** 4×4 matrix. Four sources and three local outputs fit a fixed 4×4 matrix; no campus sharing or AV network is assumed. 1 additional complete source-to-rack extender sets are included. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 6 100V speakers × 6W = 36W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 2. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Limit each surveyed output route to 35m at the specified signal format. Confirm whether the conferencing platform needs a separate content-ingest connection. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Teaching Classroom — Local HDBaseT

Template ID: `education-classroom-hdbaset` · Market: Education

**Concept.** An 8m × 7m teaching room with a front teaching wall, desk and accessible ceiling. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 24–30 learners. The teacher selects the room PC or a visiting laptop and sends one readable picture and programme audio to the front display.

**Sources.** 1 × Teaching PC HDMI output (teacher desk); 1 × Visiting laptop USB-C input (teacher desk).

**Destinations.** 1 × 86-inch teaching display (front wall).

**Hardware decision.** HDBaseT. A single teaching destination needs one switched HDBaseT link; video networking adds no room function. For a short table-to-screen route, compare direct HDMI/USB-C switching; use a newer matched transmitter/receiver if 4K60 or higher USB bandwidth is required.

**Audio experience.** A modest room speaker system handles selected programme and speech playback. Size it for intelligibility and the stated audience rather than cinema output.

- Programme zone: 2 8-ohm speakers on 2 independent 30W channels. Front-of-room programme playback with one loudspeaker per amplifier channel.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Check 4K30/1080p compatibility and any touch-panel USB return. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Lecture Capture Theatre — Local Presentation Matrix

Template ID: `education-lecture-capture-networkhd` · Market: Education

**Concept.** A 15m × 12m tiered theatre with a lectern, front projection, confidence monitor and rear repeater. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. For this audio concept, assume reflective upper walls, a hard/high ceiling and limited access for a distributed ceiling system; confirm these conditions on survey. Designed for 80–120 students. The lecturer selects a teaching PC, document camera or laptop. The audience sees the teaching content while a dedicated capture platform records it with a camera and microphone feed.

**Sources.** 1 × Teaching PC HDMI output (lectern rack); 1 × Document camera HDMI output (lectern); 1 × Guest laptop HDMI connection (lectern).

**Destinations.** 1 × Lecture projector and motorised screen (front ceiling/wall); 1 × Lectern confidence monitor (lectern); 1 × Rear repeater display (rear wall).

**Hardware decision.** 4×4 matrix. Three teaching sources and three destinations in one room fit a local matrix. Lecture recording alone does not require NetworkHD. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Digitally steerable column arrays direct speech and everyday programme towards the seating, limiting excitation of reflective walls and ceiling. This is a speech-led system, not a concert or cinema PA.



**By others: 2 × Powered digitally steerable column array assembly.** The assumed long audience depth, reflective upper surfaces and restricted ceiling access make controlled vertical coverage a credible starting point. Confirm reverberation and coverage prediction; a treated room may instead suit conventional distributed speakers. Two provisional front column positions. Each complete assembly includes the required array modules, integrated amplification/beam-steering DSP, approved mounting, mains isolation, signal/network interface and commissioning software. Model array height, aiming and coverage against every seating tier; add priced fills only where prediction requires them. These columns replace the generic main-room speaker/amp package; they are not connected to a 100V output.

One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Lectern/gooseneck and presenter wireless microphone positions Pickup positions: 2. Microphone automixing, gain levelling, limiting and source mixing feed the array system. The array supplier configures beam steering and internal delays; the room processor supplies separately aligned recording, assistive-listening and overflow sends where scheduled. No conferencing/AEC function is inferred from beam steering. Microphones and selected programme enter the room DSP; two balanced line outputs feed the powered front columns (or compatible Dante interfaces where selected). Provide local mains and control/data to each array. Keep the local audio path analogue unless networked audio provides a demonstrated benefit.

**Acoustic treatment by others.** The assumed reflective surfaces and audience depth warrant an acoustic study. Beam steering improves coverage but does not remove the need to control reverberation and late reflections. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include a lecture camera, capture input and agreed split/loop of presentation video; verify recorded audio/video synchronisation. Specialist audio contractor to predict speech intelligibility and coverage, confirm array positions/model/module count and compare conventional loudspeakers if the measured acoustics are favourable. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Retail Store — Eight-Zone Content Matrix

Template ID: `retail-signage-networkhd100` · Market: Retail

**Concept.** A 25m × 18m store with eight screen positions grouped around entrances and departments. Assume a public commercial interior with solid mounting structure, concealed cable routes, lockable equipment storage and bright ambient light. Designed for One store, eight displays. Staff schedule two authorised content feeds and route either to the relevant department, with displays starting and stopping to store hours.

**Sources.** 1 × Promotions CMS player (secure store rack); 1 × Product information CMS player (secure store rack).

**Destinations.** 8 × 43–55-inch commercial signage display (entrance and departmental positions).

**Hardware decision.** 8×8 matrix kit. Two sources and eight fixed outputs fit one matrix kit when the cable schedule stays within 35m. WAN-managed content does not imply AV over IP. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Survey every route; use local players if independent content per screen is required. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Retail Feature Wall — Four-Panel LCD Canvas

Template ID: `retail-lcd-wall-processor` · Market: Retail

**Concept.** A 6m-wide shopfront feature zone with a 2×2 LCD wall viewed from 3–8m. Assume a public commercial interior with solid mounting structure, concealed cable routes, lockable equipment storage and bright ambient light. Designed for Public retail circulation. A branded content player supplies one composed canvas; a second input permits an occasional live demonstration, and staff select the active presentation.

**Sources.** 1 × Canvas-format CMS player (adjacent locked cupboard); 1 × Demonstration HDMI input (adjacent demonstration counter).

**Destinations.** 4 × Matching narrow-bezel LCD panel (2×2 front wall).

**Hardware decision.** LCD wall processor. Four panels displaying one composition need a wall processor, not four independently networked decoders. For one uninterrupted image, compare a single large-format display; for LED, select the LED vendor receiving/processing system rather than assuming this LCD processor is suitable.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Check identical panel timings, bezel layout, service access and whether portrait artwork is needed. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Sports Bar — Twelve Independently Routed Screens

Template ID: `hospitality-sports-bar-networkhd` · Market: Hospitality

**Concept.** A 30m × 20m bar with booths, bar counter and two distinct viewing zones. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 80–120 guests. The manager routes six licensed sports feeds to twelve screens and chooses a featured match for each audio zone without changing every screen together.

**Sources.** 6 × Licensed receiver/player HDMI output (central AV rack).

**Destinations.** 12 × Commercial sports display (bar and seating zones).

**Hardware decision.** NHD 100-series. Twelve independently routed outputs exceed the compact eight-zone matrix kit; NetworkHD provides a practical expandable distribution fabric. Compare a fixed HDBaseT matrix or local CMS players if the display estate becomes a compact single-room installation. Do not add encoders merely for internet-managed signage.

**Audio experience.** Staff select television programme for the bar and a lower dining/seating level independently. Distributed 100V speakers suit commentary and background music without a cinema system.

- Bar zone: 4 100V speakers × 12W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Seating zone: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



6 available programme feeds enter the audio matrix. Each of the 2 zones independently selects a feed, with local volume/mute and an agreed maximum level; stereo feeds are downmixed for mono 100V zones. Presets may link zones for an event and restore independent service afterwards. Video route changes must not silently change unrelated audio zones. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Confirm content licensing, decoder delay tolerance and the audio-zone control map. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Divisible Ballroom — Two-Room Presentation System

Template ID: `hospitality-ballroom-hybrid` · Market: Hospitality

**Concept.** An 18m × 12m ballroom divisible into two 9m × 12m rooms by an acoustic operable partition. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 60–120 delegates. Each half selects its own local presentation in divided mode. In combined mode both front screens and confidence monitors follow the event feed, with audio zones recalled together.

**Sources.** 1 × Room A HDMI presentation feed (local rack input via complete input extension); 1 × Room B HDMI presentation feed (local rack input via complete input extension); 1 × Event playback PC (rack); 1 × Production desk programme HDMI (rack patch panel).

**Destinations.** 2 × Projection system with screen (one per room); 2 × Confidence monitor (one per lectern).

**Hardware decision.** Local hybrid matrix. Four source feeds and four displays remain a bounded room system. A local hybrid matrix supports the operating modes without an AV fabric. 2 additional complete source-to-rack extender sets are included. A smaller local presentation switcher may suffice if the final input/output count falls. Add NetworkHD only for a separately specified remote source or destination.

**Audio experience.** Two separately controlled 100V zones support speech and background programme in divided mode, or the same event in combined mode. No dance-floor PA or subwoofer system is implied.

- Ballroom partition A: 4 100V speakers × 12W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Ballroom partition B: 4 100V speakers × 12W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



Two programme feeds support independent partition A/B selection, level and mute. Combined mode links the selected programme and speech mix; divided mode keeps microphones local to their assigned partition. Programme and microphone assignments are saved in room-combine presets. Handheld/lavalier presenter microphone position Pickup positions: 4. Room-combining DSP with partition-state presets, microphone automixing, EQ, limiting, independent zone gains and delay; commission feedback stability in each partition mode. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Add two complete input extension paths from the floor boxes to rack HDMI; do not connect two transmitters to the single native HDBaseT input. Specify partition sensor, mode interlock, divided-room audio isolation and feedback commissioning. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Clinical Simulation — Local Observation and Debrief

Template ID: `healthcare-simulation-lab` · Market: Healthcare

**Concept.** A 6m × 5m simulation bay adjoining a 5m × 4m observation room and a small debrief space. Assume cleanable solid partitions and sealed ceiling penetrations, service access outside the treatment zone and an approved infection-control installation method. Designed for 6 learners and 4 observers. Observers can select the simulator output or either camera view while the training platform records consented sessions for later debrief.

**Sources.** 1 × Simulator workstation HDMI output (simulation bay); 2 × Training camera HDMI output (bay overview and procedure view).

**Destinations.** 1 × Observation display (observation room); 1 × Debrief display (debrief room); 1 × Facilitator monitor (control desk).

**Hardware decision.** 4×4 matrix. Three source feeds and three nearby outputs fit a fixed matrix with explicit camera/input extension. Recording is a separate training-platform function. 3 additional complete source-to-rack extender sets are included. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Ceiling speech and programme coverage supports simulation debriefs; operational simulator audio remains on its approved local system.

- Simulation teaching room: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Lectern/table microphones for the scheduled speech positions Pickup positions: 2. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include approved simulator output adapters and isolated interfaces; the system is for training, not clinical diagnosis. Provide camera input extension and a recording split/loop for the agreed views. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Government Control Suite — Ten-Feed Display Routing

Template ID: `government-control-room-networkhd600` · Market: Government

**Concept.** A 16m × 10m control suite with a six-panel wall and four supervisor/review screens. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 12 operators. Operators select authorised workstation feeds and approved composite views for the wall while supervisors call up detail on local review screens.

**Sources.** 8 × Authorised workstation HDMI output (operator desks); 2 × Approved incident dashboard HDMI output (secure rack).

**Destinations.** 6 × Wall panel (3×2 display wall); 4 × Supervisor/review monitor (desks and side room).

**Hardware decision.** NHD 600-series. Ten independently placed source feeds and ten outputs justify an engineered 10Gb routing fabric and selectable wall layouts. Compare a correctly sized fixed matrix/wall processor and point-to-point links if arbitrary source placement and output layouts are not needed; test latency with the selected screens.

**Audio experience.** Low-level shared briefing playback is distributed for intelligibility. Operator headsets, dispatch radio and critical alarm systems remain independent of the AV speakers.

- Operational briefing audio: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Budget separate endpoints per workstation output, not per operator; validate multiview modes, display latency and recovery. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Worship Venue — Main Hall and Distributed Overflow

Template ID: `venue-worship-overflow-networkhd500` · Market: Venue

**Concept.** A 24m × 16m worship hall with adjacent nursery, foyer and overflow rooms on a 60m cable estate. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 200 congregants plus overflow. The production team sends camera programme, lyrics or announcements to the main screens and appropriate overflow spaces; audio is delayed and zoned with the venue PA.

**Sources.** 1 × Vision mixer programme HDMI (production booth); 1 × Lyrics computer HDMI (production booth); 1 × Announcement player HDMI (rack).

**Destinations.** 2 × Main-hall projection system (front hall); 1 × Overflow display (overflow room); 1 × Foyer display (foyer); 1 × Nursery display (nursery).

**Hardware decision.** NHD 500-series. Five destinations across separate rooms and long existing network routes justify shared routing; simple mirrored overflow alone could use distribution amplifiers. Compare a fixed matrix and matched extension if all sources and destinations can be cabled back to one rack. Retain AV over IP only while distributed routing remains a requirement.

**Audio experience.** The main congregation uses a dedicated programme PA; separate delayed 100V fills and overflow speakers prioritise speech intelligibility. Performer monitors and the broadcast mix are separately scheduled; a subwoofer is not assumed.

- Main congregation PA: 2 8-ohm speakers on 2 independent 250W channels. Main speech and worship programme; select controlled-directivity loudspeakers and prove coverage.
- Rear speech fill: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Overflow and foyer: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



Zones carry the same selected event programme unless an independent source is explicitly scheduled; each circuit retains independent level, mute, delay and speech/programme mixing. Room-combine presets must respect partition state and microphone routing. Worship presenter/vocal microphone position Pickup positions: 2. Use the separately scheduled production console for microphone preamps and mixes; include DSP output EQ, limiting and delay, plus any additional interfaces required for three independent zones. Do not duplicate the console in this processing allowance. Stage microphones and playback enter the console; Dante-capable output interfaces feed main PA amplification, delayed 100V fills, overflow and the separate capture mix. Performer monitors remain a separate console bus and speaker package.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** 2 × Production cameras with mounts, power and video links: Two camera positions into the separately scheduled vision mixer; include lenses, camera control and HDMI/SDI conversion where needed. 1 × Venue audio console, stage interfaces and monitor system: System allowance: microphone stage inputs, playback returns, main/overflow mixes, performer monitors and a separate recording/stream mix. Match the microphone and loudspeaker schedules.

**Site checks.** Provide the upstream cameras/vision mixer and venue audio console; these source functions are required, not capabilities of an encoder. Measure lip sync at every listening zone; agree content/privacy control for nursery. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Transport Operations Office — Local Status Routing

Template ID: `transport-operations-signage` · Market: Transport

**Concept.** A 12m × 8m operations office with six wall displays visible from dispatch desks. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 8–12 staff. Supervisors place timetables, incident dashboards and authorised maps on any screen, using named presets for routine service and incident response.

**Sources.** 2 × Operations dashboard PC HDMI output (secure rack); 1 × Mapping PC HDMI output (rack); 1 × Authorised information feed HDMI (rack).

**Destinations.** 6 × 55-inch status display (front and side walls).

**Hardware decision.** 8×8 matrix kit. Four HDMI feeds and six outputs within one office do not need a NetworkHD installation. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Keep the AV system outside safety-critical control loops and obtain source-owner permission. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Residential Media Room — Local Source Selection

Template ID: `residential-media-matrix` · Market: Residential

**Concept.** A 7m × 5m media room with blackout blinds, front screen and equipment cabinet. Assume reinforced front mounting structure, acoustic finishes, a ventilated cabinet and a short accessible cable route. Designed for 4–8 viewers. The household selects a streaming box, disc player or games console on the main screen; a dedicated AV receiver handles surround sound.

**Sources.** 1 × Streaming player (equipment cabinet); 1 × Disc player (equipment cabinet); 1 × Games console (equipment cabinet).

**Destinations.** 1 × Large television or projection system (front wall).

**Hardware decision.** 4×4 matrix. A local matrix provides source selection and a spare output for future use; a suitable AV receiver may replace its switching function entirely. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** This cinema-focused room warrants a real 5.1 system: five matched speakers, a powered subwoofer and an AV receiver. Its programme requirement differs from speech-focused commercial spaces.





One selected surround programme feeds the 5.1 AVR; there is no independent second listening zone. No room reinforcement microphones are included. The AVR decodes the agreed multichannel formats and applies speaker distance/level calibration and bass management. Each selected source reaches the AVR through the nominated HDMI matrix feed; AVR amplification drives five speakers and line-level LFE feeds the powered subwoofer. Prove source/EDID/audio-format compatibility across the complete route.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Measure listening/recording positions and room decay; include broadband wall panels, ceiling absorption and low-frequency treatment where analysis requires it. Specify fabric/finish, mounting depth and coverage for the room; keep ventilation and sightlines clear. Separately scope sound isolation if adjacent spaces or external noise must be excluded. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Select and include the AV receiver, surround speakers/subwoofer and speaker cables; do not infer them from HDMI audio support. For 4K120 gaming select an end-to-end 48Gbps route; this base extension path is not that design. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Multi-Camera Meeting Room — Local Camera Production

Template ID: `corporate-multi-camera-meeting-bridge` · Market: Corporate

**Concept.** A 10m × 6m meeting room with a U-shaped table and presentation position. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 10–18 participants. Remote colleagues can see either the speaker or the room view while local participants share content on one front screen; an operator selects the camera view.

**Sources.** 1 × Presenter camera HDMI output (front wall); 1 × Room overview camera HDMI output (rear wall).

**Destinations.** 1 × 65–75-inch conferencing display (front wall).

**Hardware decision.** Camera production bridge. Two camera sources need a camera bridge and a conferencing host; a separate Apollo bar is not needed as a second camera/audio system. Use a dedicated production switcher when independent preview/programme, tally, frame synchronisation or live-event redundancy is required.

**Audio experience.** The production desk selects camera views for remote participants; a modest room pair plays the far-end return and presentation audio while two microphones serve the presenters.

- Presentation playback pair: 2 8-ohm speakers on 2 independent 30W channels. Front-of-room programme playback with one loudspeaker per amplifier channel.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Presenter desk/lavalier microphone position Pickup positions: 2. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include the laptop/room host and its separate HDMI presentation connection to the display. Agree camera preset operation and USB/video/audio compatibility; add a production switcher if independent views are needed. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## School Assembly Hall — Single Projector HDBaseT

Template ID: `education-school-hall-hdbaset-projector` · Market: Education

**Concept.** A 20m × 12m assembly hall with a 5m ceiling, small stage and lockable AV cupboard. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. For this audio concept, assume reflective upper walls, a hard/high ceiling and limited access for a distributed ceiling system; confirm these conditions on survey. Designed for 120–180 pupils. Staff connect a laptop or school PC and select one picture for the hall projector; a dedicated PA carries speech and programme sound.

**Sources.** 1 × School PC HDMI output (stage input point); 1 × Guest laptop USB-C input (stage input point).

**Destinations.** 1 × High-brightness projector and large screen (ceiling/front stage).

**Hardware decision.** HDBaseT. One distant projector requires one presentation link; a video network offers no additional function in this assembly layout. For a short table-to-screen route, compare direct HDMI/USB-C switching; use a newer matched transmitter/receiver if 4K60 or higher USB bandwidth is required.

**Audio experience.** Digitally steerable column arrays direct speech and everyday programme towards the seating, limiting excitation of reflective walls and ceiling. This is a speech-led system, not a concert or cinema PA.



**By others: 2 × Powered digitally steerable column array assembly.** The assumed long audience depth, reflective upper surfaces and restricted ceiling access make controlled vertical coverage a credible starting point. Confirm reverberation and coverage prediction; a treated room may instead suit conventional distributed speakers. Two provisional front column positions. Each complete assembly includes the required array modules, integrated amplification/beam-steering DSP, approved mounting, mains isolation, signal/network interface and commissioning software. Model array height, aiming and coverage against every seating tier; add priced fills only where prediction requires them. These columns replace the generic main-room speaker/amp package; they are not connected to a 100V output.

One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Lectern/table microphones for the scheduled speech positions Pickup positions: 2. Microphone automixing, gain levelling, limiting and source mixing feed the array system. The array supplier configures beam steering and internal delays; the room processor supplies separately aligned recording, assistive-listening and overflow sends where scheduled. No conferencing/AEC function is inferred from beam steering. Microphones and selected programme enter the room DSP; two balanced line outputs feed the powered front columns (or compatible Dante interfaces where selected). Provide local mains and control/data to each array. Keep the local audio path analogue unless networked audio provides a demonstrated benefit.

**Acoustic treatment by others.** The assumed reflective surfaces and audience depth warrant an acoustic study. Beam steering improves coverage but does not remove the need to control reverberation and late reflections. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Check projector throw/lumens, screen sightlines, safe suspension and speech intelligibility. Specialist audio contractor to predict speech intelligibility and coverage, confirm array positions/model/module count and compare conventional loudspeakers if the measured acoustics are favourable. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Flexible Learning — Five Sources and Four Team Displays

Template ID: `education-flexible-learning-networkhd500` · Market: Education

**Concept.** A 12m × 10m teaching room with four team tables and a teacher station. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 24–32 learners. The tutor selects a team laptop or teaching PC and routes it to any team display for discussion; team audio is managed to avoid competing loudspeakers.

**Sources.** 1 × Teacher workstation HDMI output (teaching rack); 4 × Team laptop HDMI feed (table boxes to rack input extensions).

**Destinations.** 4 × 65-inch team display (one per team table).

**Hardware decision.** 8×8 matrix kit. Five inputs and four outputs in one room fit an eight-zone fixed matrix; flexible furniture alone is not a reason for NetworkHD. 4 additional complete source-to-rack extender sets are included. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** A modest room speaker system handles selected programme and speech playback. Size it for intelligibility and the stated audience rather than cinema output.

- Programme zone: 4 8-ohm speakers on 4 independent 30W channels. Front-of-room programme playback with one loudspeaker per amplifier channel.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include four complete input extension sets and floor-box containment; validate USB touch requirements separately. Define teaching presets and who can interrupt a team display. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Hybrid Seminar Room — Local Presentation and Conferencing

Template ID: `education-hybrid-collaboration-nhd500-dante` · Market: Education

**Concept.** A 10m × 8m seminar room with a teaching desk and two front screens. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 20–24 learners. The tutor presents local content and includes remote participants using an AEC audio system and camera; local teaching and far-end views occupy the two screens.

**Sources.** 1 × Teaching PC HDMI output (rack); 1 × Guest laptop HDMI presentation feed (teaching desk); 1 × Conferencing compute HDMI output (rack).

**Destinations.** 2 × 75-inch front display (front wall).

**Hardware decision.** 4×4 matrix. Three sources and two screens are a local matrix job; network audio may be useful for the microphone design but does not require network video. 1 additional complete source-to-rack extender sets are included. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 6 100V speakers × 6W = 36W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 2. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Provide USB audio/camera and content-ingest paths, microphone coverage and AEC reference routing. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Active Learning Lab — Six Teams and Tutor Routing

Template ID: `education-active-learning-nhd600-local-inputs` · Market: Education

**Concept.** A 15m × 12m laboratory with six fixed team benches and a tutor demonstration position. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 30–36 learners. Each team can work locally and the tutor can select a bench result for any or all screens using labelled source/destination controls.

**Sources.** 6 × Team workstation HDMI output (benches via input extensions); 1 × Tutor workstation HDMI output (rack).

**Destinations.** 6 × 55-inch team display (bench positions); 1 × 75-inch tutor display (teaching wall).

**Hardware decision.** 8×8 matrix kit. Seven inputs and seven outputs fit an 8×8 fixed matrix. Standard teaching content does not justify a 10Gb SDVoE fabric. 6 additional complete source-to-rack extender sets are included. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** A modest room speaker system handles selected programme and speech playback. Size it for intelligibility and the stated audience rather than cinema output.

- Programme zone: 6 8-ohm speakers on 6 independent 30W channels. Front-of-room programme playback with one loudspeaker per amplifier channel.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include six complete source extension sets, secure bench connections and touch/USB return if specified. Use a higher-bandwidth matrix if assessment requires 4K60 4:4:4 detail or gaming refresh. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Large Sports Bar — Twenty-Four Independent Screens

Template ID: `hospitality-large-sportsbar-nhd500` · Market: Hospitality

**Concept.** A two-level 45m × 25m venue with bar, dining and private viewing areas. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 180–250 guests. Managers choose eight licensed live feeds across twenty-four screens and recall match-day presets for each area, with independently selected audio zones.

**Sources.** 8 × Licensed sports receiver/player HDMI output (central rack).

**Destinations.** 24 × Commercial sports display (bar, dining and private zones).

**Hardware decision.** NHD 500-series. Twenty-four independent destinations, multiple floors and changing zone groups are a substantive AV-over-IP use case. Compare a fixed matrix and matched extension if all sources and destinations can be cabled back to one rack. Retain AV over IP only while distributed routing remains a requirement.

**Audio experience.** Three audio zones let staff feature match commentary in the bar while keeping the lounge and dining areas comfortable. The main bar uses a dedicated WyreStorm 100V amplifier and third-party transformer speakers.

- Main bar: 8 100V speakers × 12W = 96W on a 240W channel (AMP-2120-DNT). Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Lounge: 4 100V speakers × 12W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Dining: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



8 available programme feeds enter the audio matrix. Each of the 3 zones independently selects a feed, with local volume/mute and an agreed maximum level; stereo feeds are downmixed for mono 100V zones. Presets may link zones for an event and restore independent service afterwards. Video route changes must not silently change unrelated audio zones. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. A Dante-capable source extraction/DSP interface supplies independent mono bar, lounge and dining mixes. One AMP-2120-DNT drives the main bar in 100V mono mode; separately specified Dante-capable amplifiers/interfaces drive the other two zones. No direct Dante output is assumed from NHD-500 receivers.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Engineer AV switch/uplink capacity and content licences; reserve microphone/paging priority in the audio system. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Local Pub — Eight-Zone HDBaseT Matrix

Template ID: `hospitality-local-pub-8x8-matrix` · Market: Hospitality

**Concept.** A 20m × 15m pub with bar and two seating areas; output cable routes stay within 35m. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 50–80 guests. Staff send any of four licensed sports/entertainment feeds to eight televisions and choose the audible programme at the bar.

**Sources.** 3 × Licensed receiver HDMI output (back-bar rack); 1 × Digital signage/player HDMI (back-bar rack).

**Destinations.** 8 × Commercial television (bar and seating areas).

**Hardware decision.** 8×8 matrix kit. Four sources and eight fixed zones suit the complete matrix kit; eight matched receivers are already supplied. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Separate 100V bar and dining zones carry selected television or background programme at appropriate levels, with no subwoofer or full-range movie requirement.

- Bar: 4 100V speakers × 12W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Dining: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



4 available programme feeds enter the audio matrix. Each of the 2 zones independently selects a feed, with local volume/mute and an agreed maximum level; stereo feeds are downmixed for mono 100V zones. Presets may link zones for an event and restore independent service afterwards. Video route changes must not silently change unrelated audio zones. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Verify longest route, source format, licensed playback and remote-control access. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Casino Floor — Forty-Eight Zone Routing

Template ID: `hospitality-large-casino-nhd500` · Market: Hospitality

**Concept.** A 60m × 40m gaming floor with separated VIP rooms and multiple AV distribution cupboards. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for Large venue, 48 display positions. Operators route approved entertainment and promotional channels by zone while supervisors lock sensitive routes and isolate VIP programmes.

**Sources.** 12 × Licensed receiver/player HDMI output (head-end rack); 4 × Approved promotions PC HDMI output (content rack).

**Destinations.** 40 × Commercial floor display (gaming floor); 8 × VIP-room display (VIP rooms).

**Hardware decision.** NHD 500-series. Sixteen feeds and forty-eight destinations across several cupboards justify multicast distribution and an engineered fibre backbone. Compare a fixed matrix and matched extension if all sources and destinations can be cabled back to one rack. Retain AV over IP only while distributed routing remains a requirement.

**Audio experience.** Four 100V zones provide restrained background programme across the gaming and hospitality estate; authorised announcements have priority over entertainment.

- Gaming area A: 8 100V speakers × 6W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Gaming area B: 8 100V speakers × 6W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Hospitality: 8 100V speakers × 6W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Circulation: 8 100V speakers × 6W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



16 available programme feeds enter the audio matrix. Each of the 4 zones independently selects a feed, with local volume/mute and an agreed maximum level; stereo feeds are downmixed for mono 100V zones. Presets may link zones for an event and restore independent service afterwards. Video route changes must not silently change unrelated audio zones. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Dante DSP distributes four independently controlled mixes to Dante-capable zone amplifiers or interfaces. Agree the interface to existing paging without replacing the certified emergency system.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include content rights, access-controlled presets, distributed switch/PoE budgets and documented recovery. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Bingo Hall — Programme and Repeater Distribution

Template ID: `hospitality-bingo-club-nhd100-led-wall` · Market: Hospitality

**Concept.** A 30m × 20m club hall with a front LED canvas and eight repeater screens. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 150–250 players. Players follow the caller, number board and approved promotions; the LED processor receives the composed programme while repeaters show the chosen information feed.

**Sources.** 1 × Bingo game programme HDMI (caller desk); 1 × Caller camera programme HDMI (production rack); 1 × Promotion player HDMI (rack); 1 × Results/number-board PC HDMI (rack).

**Destinations.** 8 × Commercial repeater display (hall walls); 1 × LED wall with vendor processor and receiving system (front wall).

**Hardware decision.** NHD 100-series. Nine destinations exceed a compact eight-zone kit and include separately selected repeater content. LED composition belongs to the LED/production system, not to a standard decoder. Compare a fixed HDBaseT matrix or local CMS players if the display estate becomes a compact single-room installation. Do not add encoders merely for internet-managed signage.

**Audio experience.** A single 100V audience circuit carries clear caller speech and modest programme playback. Twelve 12W transformer speakers present a 144W load to the 240W WyreStorm amplifier.

- Audience speech zone: 12 100V speakers × 12W = 144W on a 240W channel (AMP-2120-DNT). Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Caller/chair speech microphone position Pickup positions: 2. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Caller microphones and extracted programme audio enter the speech mixer; its balanced line output feeds AMP-2120-DNT in 100V mono mode. Dante is unused in this local design.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** 1 × Caller camera and programme composition workstation: One camera with mount/power and one composition/capture workstation; supply a confirmed HDMI programme to the LED processor, including input/format conversion.

**Site checks.** Specify caller camera, production composition and LED processor input timing; one HDMI output feeds the complete LED canvas. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Stadium — Concourse and VIP Distribution

Template ID: `hospitality-stadium-concourse-vip-nhd500` · Market: Hospitality

**Concept.** A stadium concourse estate with four distribution cupboards and adjacent hospitality rooms. Assume concrete circulation spaces and service risers, protected mounts and equipment cupboards; outdoor/exposed positions need separately rated equipment. Designed for 64 display positions across concourses and VIP rooms. Venue staff distribute licensed live action and signage to public screens while VIP rooms select approved channels independently; public information has a defined override workflow.

**Sources.** 8 × Licensed event/television HDMI feed (head end); 4 × Approved signage/player HDMI (content rack).

**Destinations.** 40 × Concourse display (four public zones); 24 × VIP-room display (hospitality rooms).

**Hardware decision.** NHD 500-series. Twelve feeds and sixty-four destinations across an estate justify network routing and a designed fibre backbone. Compare a fixed matrix and matched extension if all sources and destinations can be cabled back to one rack. Retain AV over IP only while distributed routing remains a requirement.

**Audio experience.** Four concourse zones provide intelligible event commentary; a separate hospitality circuit carries background programme. VIP screen audio is muted unless an independently engineered local room system is added.

- Concourse 1: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Concourse 2: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Concourse 3: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Concourse 4: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Hospitality background: 8 100V speakers × 6W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



12 available programme feeds enter the audio matrix. Each of the 5 zones independently selects a feed, with local volume/mute and an agreed maximum level; stereo feeds are downmixed for mono 100V zones. Presets may link zones for an event and restore independent service afterwards. Video route changes must not silently change unrelated audio zones. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Dante DSP sends five independent mixes to distributed Dante-capable amplifiers/interfaces. Include the copper/fibre audio network and environmental protection for public circulation positions; certified evacuation remains separate.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** AV screens are not a substitute for certified evacuation or life-safety systems. Engineer every fibre uplink, switch placement, environmental rating and public-message authorisation. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Security Command Room — Approved VMS Display Feeds

Template ID: `government-security-command-nhd100-bridge` · Market: Government

**Concept.** A 14m × 10m security room with six shared information screens and a secure equipment rack. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 8–12 operators. Operators select authorised VMS composite views, incident maps and dashboards; the VMS provides the camera windows before those pictures enter the AV system.

**Sources.** 4 × Approved VMS workstation composite HDMI (secure rack); 1 × Incident dashboard HDMI (rack); 1 × Mapping workstation HDMI (rack).

**Destinations.** 6 × 65-inch shared display (front and side walls).

**Hardware decision.** 8×8 matrix kit. Six ready-composed feeds and six nearby displays fit a fixed matrix; raw CCTV streams do not justify an NDI bridge or multiple network-video processors. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Low-level shared briefing playback is distributed for intelligibility. Operator headsets, dispatch radio and critical alarm systems remain independent of the AV speakers.

- Operational briefing audio: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Confirm VMS licences and authorised HDMI outputs; separately engineer a wall processor if a spanning canvas is required. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Situation Room — Twelve-Feed Operational Wall

Template ID: `government-situation-control-room-nhd600` · Market: Government

**Concept.** An 18m × 12m situation room with eight wall panels and four decision-table monitors. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 16–24 staff. Teams compare approved workstation outputs, maps and incident feeds using controlled wall layouts while the chair calls up detail on table monitors.

**Sources.** 8 × Authorised workstation HDMI (operator positions); 4 × Incident/media dashboard HDMI (secure rack).

**Destinations.** 8 × Wall panel (4×2 wall); 4 × Decision-table monitor (table positions).

**Hardware decision.** NHD 600-series. Twelve feeds and twelve outputs, including a configurable wall, justify the 10Gb transport and processing choice. Compare a correctly sized fixed matrix/wall processor and point-to-point links if arbitrary source placement and output layouts are not needed; test latency with the selected screens.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 8 100V speakers × 6W = 48W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 4. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Specify a conferencing camera/AEC package separately; approve every information boundary. Test latency in the selected wall/multiview mode rather than claiming zero system latency. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Medium Meeting Room — Dedicated Conferencing

Template ID: `corporate-teams-room-medium-apollo` · Market: Corporate

**Concept.** A 7m × 5m enclosed meeting room with a central table and front display. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 6–10 participants. Staff start a booked meeting from a console; the room computer uses the Apollo camera and audio, and shared content is presented through the approved meeting-platform ingest.

**Sources.** 1 × Room conferencing compute with HDMI and USB host (front credenza).

**Destinations.** 1 × 75-inch conferencing display (front wall).

**Hardware decision.** Local UC. A single-screen room needs local conferencing peripherals and a licensed room computer, not AV routing. If the room needs two independent screens or multiple cameras, redesign around a local presentation switcher and a separately selected conferencing package.

**Audio experience.** The integrated bar provides two-way call audio and everyday presentation playback for the stated seating area; no external speaker or amplifier system is required.





One USB conferencing return and the selected presentation audio use the integrated bar; no external zone matrix is required. Integrated microphone array; confirm pickup in the actual room. Use the bar’s integrated conferencing processing and verify microphone pickup at the furthest seat; do not cascade an external AEC processor. The bar is the USB microphone and loudspeaker device for the connected host. Call return and microphone send travel over USB; use one active audio device.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Supply a supported compute/console bundle and platform licence; the Apollo bar does not run the room operating system. Verify pickup at the end of the table; add a compatible extension microphone only if coverage testing requires it. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Experience Centre — Flexible High-Detail Demonstration

Template ID: `corporate-experience-centre-networkhd600` · Market: Corporate

**Concept.** A 20m × 12m executive demonstration suite with five display positions and movable demonstration stations. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 20–30 visitors. Presenters send any of five demonstration feeds to independently configured displays and recall scene layouts as the visit moves through product stories.

**Sources.** 4 × Demonstration workstation HDMI (movable but pre-cabled stations); 1 × Presentation PC HDMI (rack).

**Destinations.** 5 × High-detail commercial display (demonstration zones).

**Hardware decision.** NHD 600-series. Retain 600-series only because five distributed demonstration positions need arbitrary routing, high-detail 4:4:4 content and configurable multi-source views; room size alone is insufficient. Compare a correctly sized fixed matrix/wall processor and point-to-point links if arbitrary source placement and output layouts are not needed; test latency with the selected screens.

**Audio experience.** A front pair demonstrates programme material while a separate ceiling circuit reinforces the guide’s voice across the tour area.

- Demo programme pair: 2 8-ohm speakers on 2 independent 100W channels. Front-of-room programme playback with one loudspeaker per amplifier channel.
- Tour speech: 6 100V speakers × 6W = 36W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



Zones carry the same selected event programme unless an independent source is explicitly scheduled; each circuit retains independent level, mute, delay and speech/programme mixing. Room-combine presets must respect partition state and microphone routing. Tour presenter wireless microphone position Pickup positions: 2. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Prove required 4:4:4 detail and layout modes with actual demonstrations. If sources are rack-local and layouts fixed, use a 5×5-or-larger matrix with extension instead. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Agile Office — Four Independent Collaboration Pods

Template ID: `corporate-agile-collaboration-zone-networkhd500` · Market: Corporate

**Concept.** Four 4m × 3m open-sided pods along a 25m office floor. Assume acoustic screens, reinforced display posts and accessible floor/ceiling containment; manage noise bleed and avoid shared open-plan voice reinforcement. Designed for 4 people per pod. Each team connects its own laptop to a nearby display for local discussion. Activities in one pod do not interrupt another.

**Sources.** 4 × Team laptop USB-C/HDMI position (one per pod).

**Destinations.** 4 × 55-inch pod display (one per pod).

**Hardware decision.** Independent HDBaseT pods. Independent 1×1 rooms need four local presentation links, not a four-source shared NetworkHD fabric. Only add shared AV routing if teams must send content between pods; independent rooms do not need an AV multicast fabric.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Acoustic treatment by others.** Open-sided collaboration pods need local absorption to reduce reverberation and speech spill; screens alone do not create private meeting rooms. Specify absorptive pod wall/screen surfaces and overhead treatment where feasible, and review desk spacing and background noise. If confidential calls are required, redesign as enclosed rooms with appropriate sound isolation and ventilation rather than adding more speaker level. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** No cross-pod routing or conferencing microphone system is included. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Primary Classroom — Interactive Teaching Display

Template ID: `education-primary-classroom-interactive-panel` · Market: Education

**Concept.** An 8m × 7m classroom with child-safe teaching wall and teacher desk. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 25–30 pupils. The teacher presents from a classroom PC or laptop and uses touch annotation on the front panel; pupils see the same selected lesson content.

**Sources.** 1 × Classroom PC HDMI and USB host (teacher desk); 1 × Guest laptop USB-C (teacher desk).

**Destinations.** 1 × 86-inch interactive teaching panel (front wall).

**Hardware decision.** HDBaseT. One interactive destination needs a matched video/USB extension path, with no matrix or video network. For a short table-to-screen route, compare direct HDMI/USB-C switching; use a newer matched transmitter/receiver if 4K60 or higher USB bandwidth is required.

**Audio experience.** A modest room speaker system handles selected programme and speech playback. Size it for intelligibility and the stated audience rather than cinema output.

- Programme zone: 2 8-ohm speakers on 2 independent 30W channels. Front-of-room programme playback with one loudspeaker per amplifier channel.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Confirm interactive-panel USB compatibility and child-safe display height/cable containment. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## University Theatre — Main Room and Overflow

Template ID: `education-university-lecture-theatre-networkhd500` · Market: Education

**Concept.** A 24m × 18m tiered theatre with a lectern and two adjacent overflow rooms on a 70m route estate. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. For this audio concept, assume reflective upper walls, a hard/high ceiling and limited access for a distributed ceiling system; confirm these conditions on survey. Designed for 150–300 students plus overflow. Lecturers select local teaching sources and send the programme to the main screens, confidence monitor and approved overflow rooms; recording is supplied by the lecture-capture platform.

**Sources.** 1 × Teaching PC HDMI (lectern); 1 × Guest laptop HDMI (lectern); 1 × Document camera HDMI (lectern); 1 × Approved lecture programme HDMI (production rack).

**Destinations.** 2 × Main projection system (front theatre); 1 × Lectern confidence monitor (lectern); 2 × Overflow display (adjacent rooms).

**Hardware decision.** NHD 500-series. Five destinations across separate rooms and longer routed paths justify distribution flexibility; a single-room theatre with the same count could use a fixed matrix. Compare a fixed matrix and matched extension if all sources and destinations can be cabled back to one rack. Retain AV over IP only while distributed routing remains a requirement.

**Audio experience.** Digitally steerable column arrays direct speech and everyday programme towards the seating, limiting excitation of reflective walls and ceiling. This is a speech-led system, not a concert or cinema PA. Each overflow room retains its own 100V speaker circuit and independent level.

- Overflow A: 2 100V speakers × 6W = 12W on a 30W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Overflow B: 2 100V speakers × 6W = 12W on a 30W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.

**By others: 2 × Powered digitally steerable column array assembly.** The assumed long audience depth, reflective upper surfaces and restricted ceiling access make controlled vertical coverage a credible starting point. Confirm reverberation and coverage prediction; a treated room may instead suit conventional distributed speakers. Two provisional front column positions. Each complete assembly includes the required array modules, integrated amplification/beam-steering DSP, approved mounting, mains isolation, signal/network interface and commissioning software. Model array height, aiming and coverage against every seating tier; add priced fills only where prediction requires them. These columns replace the generic main-room speaker/amp package; they are not connected to a 100V output.

Zones carry the same selected event programme unless an independent source is explicitly scheduled; each circuit retains independent level, mute, delay and speech/programme mixing. Room-combine presets must respect partition state and microphone routing. Lectern and presenter wireless microphone positions Pickup positions: 2. Microphone automixing, gain levelling, limiting and source mixing feed the array system. The array supplier configures beam steering and internal delays; the room processor supplies separately aligned recording, assistive-listening and overflow sends where scheduled. No conferencing/AEC function is inferred from beam steering. Microphones and selected programme enter the room DSP; two balanced line outputs feed the powered front columns (or compatible Dante interfaces where selected). Provide local mains and control/data to each array. Dante interfaces separately serve the two overflow 100V amplifiers and the capture mix.

**Acoustic treatment by others.** The assumed reflective surfaces and audience depth warrant an acoustic study. Beam steering improves coverage but does not remove the need to control reverberation and late reflections. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Provide the production/camera and capture hardware, timetable integration and audio delay per room. Specialist audio contractor to predict speech intelligibility and coverage, confirm array positions/model/module count and compare conventional loudspeakers if the measured acoustics are favourable. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## STEM Laboratory — Two Demonstration Feeds

Template ID: `education-stem-science-lab-networkhd100` · Market: Education

**Concept.** A 14m × 10m teaching lab with eight bench viewing positions and a protected teacher demonstration zone. Assume solid laboratory partitions, cleanable protected mounts and segregated cable routes clear of wet or chemical work areas. Designed for 24–32 learners. The tutor chooses a computer lesson or close-up demonstration for each bench display, keeping important detail visible without crowding around the experiment.

**Sources.** 1 × Teaching PC HDMI (teacher rack); 1 × Demonstration/document camera HDMI (teacher bench).

**Destinations.** 8 × 32–43-inch bench display (eight bench zones).

**Hardware decision.** 8×8 matrix kit. Two feeds repeated across eight fixed bench screens fit an 8×8 matrix kit. NetworkHD is not needed for this bounded layout. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Four protected 100V speakers provide even lesson playback around the benches at modest levels; teacher speech is unamplified in this baseline.

- Bench teaching area: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Protect AV equipment from spills and chemicals; verify camera lighting and laboratory safety separation. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Security Operations Centre — Twenty-Screen Estate

Template ID: `control-room-security-operations-networkhd600` · Market: Control Rooms

**Concept.** A 24m × 15m secure operations floor with a sixteen-panel wall and four supervisor monitors. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 20 operators. Approved VMS and dashboard outputs are routed to wall layouts or supervisor screens; the VMS retains camera selection, recording and permissions.

**Sources.** 8 × Licensed VMS composite HDMI output (operator/source workstations); 2 × Incident dashboard HDMI output (secure rack).

**Destinations.** 16 × Wall display panel (8×2 wall); 4 × Supervisor monitor (review desks).

**Hardware decision.** NHD 600-series. Ten input feeds and twenty physical outputs, including a large wall, justify 600-series transport. Additional workstation monitor outputs require additional encoders. Compare a correctly sized fixed matrix/wall processor and point-to-point links if arbitrary source placement and output layouts are not needed; test latency with the selected screens.

**Audio experience.** Low-level shared briefing playback is distributed for intelligibility. Operator headsets, dispatch radio and critical alarm systems remain independent of the AV speakers.

- Operational briefing audio: 8 100V speakers × 6W = 48W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Design wall viewing angles, multiview/window limits, source licences and auditable route permissions. KVM control is excluded unless a separately approved host/device switching system is specified. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Utility Network Operations — Local Dashboard Matrix

Template ID: `control-room-network-operations-centre-networkhd600` · Market: Control Rooms

**Concept.** A 14m × 9m operations room with six shared screens and a secure AV cupboard. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 8–12 operators. Staff compare six authorised dashboard or workstation outputs using named normal-service and incident presets, without introducing AV multicast into the operational network.

**Sources.** 6 × Approved monitoring/dashboard HDMI output (secure source rack).

**Destinations.** 6 × 65-inch status display (front and side walls).

**Hardware decision.** 8×8 matrix kit. Six inputs and six outputs fit one fixed matrix; low source/display count does not justify 10Gb transport. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Low-level shared briefing playback is distributed for intelligibility. Operator headsets, dispatch radio and critical alarm systems remain independent of the AV speakers.

- Operational briefing audio: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Use authorised isolated display outputs only; the AV installation must not bridge OT/control-system security boundaries. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Traffic Management — Eight Shared Display Routes

Template ID: `control-room-traffic-management-networkhd500` · Market: Control Rooms

**Concept.** A 16m × 10m highways room with eight shared screens and fixed source positions. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 10–16 operators. Operators select approved CCTV composites, maps and traffic-status dashboards on eight screens using operational presets.

**Sources.** 3 × Approved VMS composite HDMI (source rack); 2 × Traffic dashboard HDMI (source rack); 1 × Mapping workstation HDMI (source rack).

**Destinations.** 8 × 65-inch operations display (front and side walls).

**Hardware decision.** 8×8 matrix kit. Six sources and eight outputs fit a fixed matrix at the assumed distances; CCTV software supplies the composite views. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Low-level shared briefing playback is distributed for intelligibility. Operator headsets, dispatch radio and critical alarm systems remain independent of the AV speakers.

- Operational briefing audio: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Verify 35m output routes and information authorisation; do not connect road-control systems directly to the AV LAN. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Council Chamber — Local Presentation and Public Record

Template ID: `government-council-chamber-hybrid-streaming` · Market: Government

**Concept.** A 16m × 12m chamber with horseshoe seating, clerk desk and public gallery. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 30 councillors and 30 visitors. The clerk routes reports and approved evidence to chamber screens while a dedicated discussion, voting and recording system manages microphones and the public record.

**Sources.** 1 × Clerk PC HDMI (rack); 1 × Guest presentation HDMI (lectern); 1 × Remote-attendance platform HDMI (rack); 1 × Approved evidence/document camera HDMI (clerk desk).

**Destinations.** 2 × Chamber display (front sides); 1 × Public-gallery display (gallery); 1 × Chair confidence monitor (chair desk).

**Hardware decision.** Local hybrid matrix. Four video sources and four local screens fit the hybrid matrix; the conferencing and discussion systems have separate audio/control responsibilities. 2 additional complete source-to-rack extender sets are included. A smaller local presentation switcher may suffice if the final input/output count falls. Add NetworkHD only for a separately specified remote source or destination.

**Audio experience.** Distributed ceiling audio supports intelligible proceedings and remote participants. The thirty-seat discussion system controls delegate microphones; additional lectern/chair inputs enter the conferencing DSP.

- Council chamber: 8 100V speakers × 6W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Additional lectern/chair/clerk microphone position Pickup positions: 4. AEC conferencing DSP with USB, automixing and an approved discussion-controller interface. Thirty delegate seat microphones are mixed by the separately scheduled discussion controller; do not assume four DSP inputs directly serve thirty seats. Build a far-end-free transmit mix and reference all room playback for AEC. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** 1 × Delegated discussion/voting system: 30 seat units and controller: Base allowance for 30 councillor microphone/voting positions, central discussion controller, power/data cabling and official recording interface; coordinate with four additional lectern/chair/clerk microphone positions to prevent duplicate purchase.

**Site checks.** Four microphone positions are chair, clerk and two lecterns; add a complete delegated discussion/voting system if every seat requires a microphone. Specify privacy mute, consent, public/private sessions and hearing assistance. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Clinical MDT — Local Review Presentation

Template ID: `healthcare-mdt-imaging-review-networkhd500` · Market: Healthcare

**Concept.** A 9m × 6m multidisciplinary meeting room with front presentation screens and a review monitor. Assume cleanable solid partitions and sealed ceiling penetrations, service access outside the treatment zone and an approved infection-control installation method. Designed for 10–14 clinical staff. Staff discuss authorised images, patient summaries and remote participants on shared screens; diagnostic interpretation remains on the separately approved clinical workstation and display.

**Sources.** 1 × Authorised clinical workstation presentation HDMI (credenza); 1 × Room collaboration PC HDMI (credenza); 1 × Visiting laptop HDMI (table).

**Destinations.** 2 × Shared clinical-discussion display (front wall); 1 × Chair review monitor (table).

**Hardware decision.** 4×4 matrix. Three local feeds and three displays fit a fixed matrix. Clinical subject matter does not itself justify NetworkHD or confer diagnostic certification. 1 additional complete source-to-rack extender sets are included. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 2. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Confirm privacy, access controls and clinical approval; the shared compressed/processed path is for discussion, not a diagnostic display claim. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Clinic Waiting Area — Six Information Screens

Template ID: `healthcare-clinic-waiting-patient-calling-networkhd100` · Market: Healthcare

**Concept.** A 20m × 12m waiting suite with two linked seating areas and six public screens. Assume cleanable solid partitions and sealed ceiling penetrations, service access outside the treatment zone and an approved infection-control installation method. Designed for 30–50 visitors. Visitors see authorised patient-call identifiers and service information on screens assigned to their waiting zone; staff manage content centrally.

**Sources.** 1 × Approved patient-call HDMI output (staff-only cupboard); 1 × Information CMS player HDMI (staff-only cupboard).

**Destinations.** 6 × 43–55-inch waiting-area display (two waiting zones).

**Hardware decision.** 8×8 matrix kit. Two feeds and six fixed screens fit a local matrix. Patient-call software and information governance remain separate from AV distribution. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Show only approved identifiers; audible calling and accessibility integration need the separately scoped calling platform. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Fitness Club — Ten Programme Zones

Template ID: `leisure-gym-fitness-club-networkhd100` · Market: Sports & Leisure

**Concept.** A 35m × 20m gym with cardio floor and two separate exercise studios. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 80–120 members. Staff choose entertainment on cardio screens and instructor-approved programmes in the studios; each studio has independent audio and local level control.

**Sources.** 3 × Licensed television/player HDMI (rack); 1 × Studio programme source HDMI (rack).

**Destinations.** 8 × Cardio display (fitness floor); 2 × Studio display (exercise studios).

**Hardware decision.** NHD 100-series. Ten independently selected outputs across separated spaces exceed a compact eight-zone matrix and benefit from extensible distribution. Compare a fixed HDBaseT matrix or local CMS players if the display estate becomes a compact single-room installation. Do not add encoders merely for internet-managed signage.

**Audio experience.** Two 100V zones provide background entertainment at different levels. Instructor-led high-output classes need a separate PA and microphone system; they are not assumed in this general gym layout.

- Exercise floor: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Circulation: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



Zones carry the same selected event programme unless an independent source is explicitly scheduled; each circuit retains independent level, mute, delay and speech/programme mixing. Room-combine presets must respect partition state and microphone routing. Lectern/table microphones for the scheduled speech positions Pickup positions: 2. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Instructor headset systems require two complete wireless channels; verify sweat protection and feedback control. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Private Screening Room — Local Cinema System

Template ID: `hospitality-private-cinema-screening-room-matrix` · Market: Hospitality

**Concept.** A 9m × 6m blacked-out screening room with a front projection wall and rear equipment cupboard. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 12–20 viewers. An operator selects disc, streaming or review content; a dedicated cinema audio processor/receiver supplies surround sound while the projector shows one programme.

**Sources.** 1 × Disc player HDMI (rack); 1 × Streaming player HDMI (rack); 1 × Review workstation HDMI (rack).

**Destinations.** 1 × Cinema projector and acoustically suitable screen (front wall/ceiling).

**Hardware decision.** 4×4 matrix. A local switching path meets the single-screen requirement; compare AV-receiver switching before retaining a separate matrix. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** This cinema-focused room warrants a real 5.1 system: five matched speakers, a powered subwoofer and an AV receiver. Its programme requirement differs from speech-focused commercial spaces.





One selected surround programme feeds the 5.1 AVR; there is no independent second listening zone. No room reinforcement microphones are included. The AVR decodes the agreed multichannel formats and applies speaker distance/level calibration and bass management. Each selected source reaches the AVR through the nominated HDMI matrix feed; AVR amplification drives five speakers and line-level LFE feeds the powered subwoofer. Prove source/EDID/audio-format compatibility across the complete route.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Measure listening/recording positions and room decay; include broadband wall panels, ceiling absorption and low-frequency treatment where analysis requires it. Specify fabric/finish, mounting depth and coverage for the room; keep ventilation and sightlines clear. Separately scope sound isolation if adjacent spaces or external noise must be excluded. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include AVR/processor, surround amplification, speakers, subwoofers and acoustic treatment as a complete cinema audio package. Confirm HDR/HDCP chain, projector noise, lens throw and dark-room contrast. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Airport Gate Zone — Local FIDS and Boarding Routing

Template ID: `transport-airport-lounge-fids-networkhd500` · Market: Transportation

**Concept.** A 25m × 18m indoor gate lounge with eight display positions and one local equipment cupboard. Assume a public commercial interior with solid mounting structure, concealed cable routes, lockable equipment storage and bright ambient light. Designed for 100–180 passengers. Approved flight information and boarding feeds are assigned to nominated screens; airline staff retain control of the upstream information systems.

**Sources.** 2 × Approved FIDS HDMI output (local cupboard); 1 × Boarding information HDMI output (local cupboard); 1 × Authorised service-message HDMI output (local cupboard).

**Destinations.** 8 × Passenger information display (gate desk and seating zones).

**Hardware decision.** 8×8 matrix kit. Four feeds and eight nearby outputs fit a matrix. Airport information networks do not automatically require an AV-over-IP layer. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Verify 35m routes, 24/7 display ratings and information ownership. Public address and safety messaging remain separately approved systems. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Podcast Studio — Two-Camera Production

Template ID: `broadcast-podcast-content-studio-ndi-networkhd500` · Market: Broadcast / Media

**Concept.** A 6m × 5m treated studio with a two-person desk, two cameras and a small production position. Assume acoustic wall treatment, controlled lighting, quiet ventilation and surface/floor cable routes with no trip hazards. Designed for 2 presenters and 1 operator. The producer selects or composes two camera views, monitors the programme locally and records it with separately mixed microphones on a production computer.

**Sources.** 1 × Presenter camera HDMI (tripod at desk); 1 × Wide camera HDMI (rear tripod).

**Destinations.** 1 × Production confidence monitor (operator desk).

**Hardware decision.** Camera production bridge. A camera bridge, USB production host and short HDMI links provide the required function. A two-camera studio does not need four NetworkHD decoders. Use a dedicated production switcher when independent preview/programme, tally, frame synchronisation or live-event redundancy is required.

**Audio experience.** Presenters record close-miked speech while monitoring on headphones; active nearfield monitors are used for replay and muted during recording.





Separate recording, headphone and control-room monitor buses provide mix-minus and independent monitoring levels. Close-address broadcast microphone with arm and pop filter Pickup positions: 2. Two microphone preamps, gain levelling/compression, headphone mix-minus and a USB audio interface/production mixer; use the captured audio/video timing reference for lip-sync. Microphones enter the production mixer/interface and feed the recording computer over USB. Camera bridge video and the separate audio device are aligned in the recording software; headphone monitoring avoids acoustic feedback.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Measure listening/recording positions and room decay; include broadband wall panels, ceiling absorption and low-frequency treatment where analysis requires it. Specify fabric/finish, mounting depth and coverage for the room; keep ventilation and sightlines clear. Separately scope sound isolation if adjacent spaces or external noise must be excluded. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** 1 × Studio lighting, stands and headphone monitoring: Two soft-light fixtures with stands and power, two presenter headphones and one operator headset with compatible headphone distribution.

**Site checks.** Include camera power/mounts, lighting, audio interface, headphones and recording software. NDI cameras are an optional redesign with explicit network requirements. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Bank Branch — Rate and Queue Display Matrix

Template ID: `retail-bank-branch-networkhd100` · Market: Retail

**Concept.** An 18m × 12m branch with secure back office, waiting zone and six screen positions. Assume a public commercial interior with solid mounting structure, concealed cable routes, lockable equipment storage and bright ambient light. Designed for 15–30 visitors. Approved rates, service information and queue status are assigned to the relevant public screens, with publishing access restricted to nominated staff.

**Sources.** 1 × Rate-board CMS player HDMI (secure cupboard); 1 × Queue-system HDMI output (secure cupboard); 1 × Service-information player HDMI (secure cupboard).

**Destinations.** 6 × 43–55-inch branch display (window, waiting and counter zones).

**Hardware decision.** 8×8 matrix kit. Three approved feeds and six fixed outputs need no additional AV multicast fabric. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Confirm content approval, privacy and brightness at window positions; secure all service access. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Large Worship Auditorium — Production and Overflow

Template ID: `worship-large-auditorium-imag-networkhd600` · Market: House of Worship

**Concept.** A 35m × 25m auditorium with three main IMAG destinations and four overflow/lobby screens. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 500–800 congregants. The production team sends live programme, lyrics and confidence content to independently assigned destinations, keeping audio and image timing aligned for the congregation.

**Sources.** 1 × Vision switcher programme HDMI (production booth); 1 × Lyrics workstation HDMI (production booth); 1 × Stage confidence HDMI (production booth).

**Destinations.** 3 × Main IMAG projection/display destination (front and side stage); 4 × Overflow/lobby display (separate rooms).

**Hardware decision.** NHD 600-series. Retain 600-series for the distributed production estate and tested live-IMAG latency requirement, not simply the audience size. Compare a correctly sized fixed matrix/wall processor and point-to-point links if arbitrary source placement and output layouts are not needed; test latency with the selected screens.

**Audio experience.** A specialist modular array system covers the deep 500–800-seat auditorium for speech and live worship music. Independently delayed 100V circuits serve rear speech fills and overflow; stage monitors and broadcast mixes remain separate.

- Rear speech fill: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Overflow and foyer: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.

**By others: 2 × Modular main-array and subwoofer assembly.** A 35m-deep auditorium with live music and tiered audience coverage warrants a specialist array study. Use a manufacturer-approved flown or ground-stacked configuration; seating capacity alone does not determine module count. Two provisional left/right assemblies, each with a modelled array/module schedule, one matched subwoofer, dedicated manufacturer-approved amplification and processing, front-fill provision where prediction requires it, signal/power distribution and all mounting accessories. Select the final module count, trim height/splay and amplifier channels from acoustic prediction. Ground stacks need rated frames/outriggers, stability and audience separation; flown arrays need rated rigging, approved structural points and lifting/access provision. The array supplier owns the complete assembly schedule, commissioning and handover; do not power it from a generic room amplifier.

Zones carry the same selected event programme unless an independent source is explicitly scheduled; each circuit retains independent level, mute, delay and speech/programme mixing. Room-combine presets must respect partition state and microphone routing. Worship presenter/vocal microphone position Pickup positions: 6. Use the separately scheduled production console for microphone preamps and mixes; include DSP output EQ, limiting and delay, plus any additional interfaces required for three independent zones. Do not duplicate the console in this processing allowance. The production console sends independent main and subwoofer feeds to the specialist array processing over compatible Dante/analogue interfaces. Separate mixes feed delayed 100V rear/overflow circuits, stage monitors and capture. Align every circuit to the array and video timing; include all endpoint interfaces and mains feeds.

**Acoustic treatment by others.** The assumed reflective surfaces and audience depth warrant an acoustic study. Beam steering improves coverage but does not remove the need to control reverberation and late reflections. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** 2 × Production cameras with mounts, power and video links: Two camera positions into the separately scheduled vision mixer; include lenses, camera control and HDMI/SDI conversion where needed. 1 × Venue audio console, stage interfaces and monitor system: System allowance: microphone stage inputs, playback returns, main/overflow mixes, performer monitors and a separate recording/stream mix. Match the microphone and loudspeaker schedules.

**Site checks.** Include cameras, vision switcher, stage monitors and venue/broadcast audio systems. Validate the selected latency mode with all displays and PA delays; a low transport delay is not a zero-latency system guarantee. Specialist audio prediction must resolve flown versus ground-stacked arrays, all modules, fills/subwoofers, amplifier channels, audience sightlines, structural loads and safe maintenance access. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Reception and Town Hall — Six Local Display Zones

Template ID: `corporate-reception-townhall-networkhd100` · Market: Corporate

**Concept.** A 20m × 15m all-hands area adjoining a reception, with all six display routes within 35m of one rack. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 60–100 staff plus reception visitors. Staff show corporate information during normal hours and route the approved event programme to selected screens for an all-hands meeting.

**Sources.** 1 × Corporate information player HDMI (rack); 1 × Event programme HDMI (rack); 1 × Guest presentation HDMI (presentation point).

**Destinations.** 4 × All-hands display (event area); 2 × Reception display (front desk/waiting).

**Hardware decision.** 8×8 matrix kit. Three sources and six local zones fit a fixed matrix. A separate campus-wide estate would justify revisiting network distribution. 1 additional complete source-to-rack extender sets are included. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Staff hear presenters clearly in the event area while reception retains its own background feed and level. Both zones use 100V speakers suited to speech and modest programme.

- All-hands speech: 6 100V speakers × 12W = 72W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Reception background: 2 100V speakers × 6W = 12W on a 30W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



Two feeds support independent event programme in the all-hands area and reception background content, with separate source, volume and mute controls. An event preset may link the zones only when authorised. Event presenter wireless microphone position Pickup positions: 2. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include event camera/mixer if live production is required; segregate reception content from private meetings. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Training Suite — Local Presentation, UC and Capture

Template ID: `corporate-training-suite-matrix-uc` · Market: Corporate

**Concept.** A 12m × 9m training room with twenty-four desks and a front instructor position. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 24 trainees and 1 instructor. The instructor combines PC, laptop and document-camera teaching with remote attendance; two front screens and a confidence monitor support delivery.

**Sources.** 1 × Instructor PC HDMI (rack); 1 × Guest laptop HDMI (instructor desk); 1 × Document camera HDMI (instructor desk); 1 × Conferencing compute HDMI (rack).

**Destinations.** 2 × 75–86-inch teaching display (front wall); 1 × Confidence monitor (instructor desk).

**Hardware decision.** 4×4 matrix. Four sources and three displays fit a local 4×4 matrix; capture and conferencing are separately scoped host functions. 2 additional complete source-to-rack extender sets are included. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 6 100V speakers × 6W = 36W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 2. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Provide HDMI content ingest, lecture camera and consent/retention controls; confirm USB switching and AEC routing. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Library Learning Commons — Seven Information Zones

Template ID: `education-library-learning-commons-networkhd100` · Market: Education

**Concept.** A 24m × 18m single-floor library with information, bookable group and event zones. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for Seven display positions. Library staff route opening information, room status and event content to nominated screens; group-room personal content remains local and private.

**Sources.** 1 × Library CMS player HDMI (communications cupboard); 1 × Room-status player HDMI (cupboard); 1 × Event programme HDMI (cupboard).

**Destinations.** 7 × Commercial information display (entrance and circulation zones).

**Hardware decision.** 8×8 matrix kit. Three shared information feeds and seven fixed destinations fit a matrix if routes are within 35m; local CMS players are the alternative for longer routes. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** No shared microphone system is included; preserve the library quiet zones and separate group-room BYOD needs. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Esports Teaching Lab — Spectator and Analysis Distribution

Template ID: `education-esports-media-lab-networkhd500` · Market: Education

**Concept.** A 15m × 10m lab with six gaming stations and six shared teaching/spectator screens. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 12–18 learners. Players use direct local gaming monitors while the tutor sends approved capture outputs to shared review screens. The AV fabric supports analysis and spectators, not the competitive input-to-display loop.

**Sources.** 6 × Station spectator HDMI output or supported capture loop (gaming desks).

**Destinations.** 6 × Shared analysis/spectator display (perimeter walls).

**Hardware decision.** NHD 500-series. Six distributed stations and six flexibly routed analysis screens justify sharing; primary low-latency/high-refresh gaming remains directly connected. Compare a fixed matrix and matched extension if all sources and destinations can be cabled back to one rack. Retain AV over IP only while distributed routing remains a requirement.

**Audio experience.** Distributed 100V speakers carry tutor speech and selected spectator programme. Players use separate station headsets; those personal chat circuits are not mixed into the teaching speakers.

- Shared teaching audio: 6 100V speakers × 6W = 36W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Tutor headset/lavalier microphone position Pickup positions: 1. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** 6 × Direct-connected gaming monitors: One monitor at each gaming station; connect directly at the required refresh rate. These local playing screens are separate from the six AV-distributed spectator outputs. 6 × Supported spectator capture/loop interfaces: One per station: preserve the direct local gaming path and deliver a compatible HDMI feed to the NHD encoder; include scalers/adapters only where required and test delay/EDID. 6 × Gaming headsets with station audio interfaces: One personal headset per gaming station; verify game/chat mixing, connector compatibility and hygiene provision.

**Site checks.** Include six local gaming monitors and compliant capture/loop interfaces; do not promise 4K120 through the spectator fabric. Verify game/content permissions, HDCP behaviour and acceptable spectator delay. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Hotel Meeting Room — Single-Screen BYOD

Template ID: `hospitality-hotel-meeting-room-apollo-hdbaset` · Market: Hospitality

**Concept.** An 8m × 6m hotel meeting room with reconfigurable tables and a front display. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 6–10 delegates. A guest connects a laptop to present or run a call through the room bar; hotel staff can reset the room without operating a video network.

**Sources.** 1 × Guest laptop USB-C host (front table connection).

**Destinations.** 1 × 75-inch meeting display (front wall).

**Hardware decision.** Local UC. One laptop and one display need a local bar with a tested USB-C route; adding unrelated HDBaseT switching duplicates the core function. If the room needs two independent screens or multiple cameras, redesign around a local presentation switcher and a separately selected conferencing package.

**Audio experience.** The integrated bar provides two-way call audio and everyday presentation playback for the stated seating area; no external speaker or amplifier system is required.





One USB conferencing return and the selected presentation audio use the integrated bar; no external zone matrix is required. Integrated microphone array; confirm pickup in the actual room. Use the bar’s integrated conferencing processing and verify microphone pickup at the furthest seat; do not cascade an external AEC processor. The bar is the USB microphone and loudspeaker device for the connected host. Call return and microphone send travel over USB; use one active audio device.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Confirm cable reach for each furniture layout and guest device support; provide an approved extension only where required. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Restaurant and Bar — Six-Zone Fixed Matrix

Template ID: `hospitality-restaurant-bar-matrix` · Market: Hospitality

**Concept.** A 25m × 15m restaurant with a bar, dining room and six television positions. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 60–90 diners. Staff choose licensed entertainment or menus for each display, with low-level background audio in dining and a separately controlled bar programme.

**Sources.** 2 × Licensed receiver HDMI (back-office rack); 1 × Menu/promotions player HDMI (rack); 1 × Event HDMI feed (rack).

**Destinations.** 6 × Commercial television (bar and dining zones).

**Hardware decision.** 8×8 matrix kit. Four sources and six fixed zones fit the matrix kit; an optional NetworkHD controller/decoder package is not necessary for normal operation. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Staff can feature television commentary in the bar while dining retains low-level background music; two 100V circuits provide appropriate commercial coverage.

- Bar programme: 4 100V speakers × 12W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Dining background: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



4 available programme feeds enter the audio matrix. Each of the 2 zones independently selects a feed, with local volume/mute and an agreed maximum level; stereo feeds are downmixed for mono 100V zones. Presets may link zones for an event and restore independent service afterwards. Video route changes must not silently change unrelated audio zones. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Confirm 35m cable routes, content rights and audio spill between dining and bar. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Quick-Service Restaurant — Four Menu Feeds, Eight Screens

Template ID: `retail-qsr-menu-boards-networkhd100` · Market: Retail

**Concept.** A 15m × 10m restaurant with four over-counter menu screens and four corresponding repeats in the queue area. Assume a public commercial interior with solid mounting structure, concealed cable routes, lockable equipment storage and bright ambient light. Designed for Single restaurant, two four-screen banks. The menu system supplies four distinct menu pages. Each page repeats in both screen banks; scheduled updates and pricing remain in the CMS.

**Sources.** 4 × Menu CMS player HDMI channel (secure counter cabinet).

**Destinations.** 4 × High-brightness menu display (counter menu bank); 4 × Queue repeat display (queue bank).

**Hardware decision.** 8×8 matrix kit. Four feeds mirrored by routing presets onto eight outputs fit a fixed matrix. No cross-site video transport is needed for centrally managed menus. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Explicitly pair outputs 1/5, 2/6, 3/7 and 4/8; eight different menu pages need eight content feeds. Confirm heat/grease protection, orientation, brightness and 35m routes. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Car Showroom — Configurator and Brand Routing

Template ID: `retail-car-showroom-customer-experience-networkhd500` · Market: Retail

**Concept.** A 30m × 20m showroom with eight display destinations in sales and vehicle zones. Assume a public commercial interior with solid mounting structure, concealed cable routes, lockable equipment storage and bright ambient light. Designed for Eight presentation positions. Sales staff route approved configurator, launch-video and branded content to the relevant customer area while other screens retain scheduled messaging.

**Sources.** 3 × Vehicle configurator PC HDMI (sales desks via input extension); 1 × Brand content player HDMI (rack); 1 × Launch/event programme HDMI (rack).

**Destinations.** 8 × Commercial showroom display (sales and vehicle zones).

**Hardware decision.** 8×8 matrix kit. Five feeds and eight fixed outputs fit one local matrix if cable routes remain within 35m; showroom branding alone does not require NetworkHD. 3 additional complete source-to-rack extender sets are included. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Separate 100V sales and vehicle-floor zones support restrained brand programme; the salesperson controls levels so nearby conversations remain comfortable.

- Sales desks: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Vehicle floor: 4 100V speakers × 12W = 48W on a 120W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



5 available programme feeds enter the audio matrix. Each of the 2 zones independently selects a feed, with local volume/mute and an agreed maximum level; stereo feeds are downmixed for mono 100V zones. Presets may link zones for an event and restore independent service afterwards. Video route changes must not silently change unrelated audio zones. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include three complete configurator input extension paths; use direct local high-detail outputs if interactive rendering needs exceed the matrix format. Reconsider distributed routing only when the measured estate exceeds these fixed routes. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Courtroom — Controlled Evidence Presentation

Template ID: `government-courtroom-hearing-room-matrix` · Market: Government

**Concept.** A 14m × 10m hearing room with judge/clerk positions, two advocate desks and a public gallery. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for 20–35 participants. The clerk previews and releases approved evidence to nominated screens; remote participation, microphones and official recording have separate controlled workflows.

**Sources.** 1 × Court evidence PC HDMI (secure rack); 2 × Advocate HDMI feed (desk boxes via input extension); 1 × Remote witness platform HDMI (secure rack).

**Destinations.** 1 × Judge monitor (bench); 1 × Clerk preview monitor (clerk desk); 2 × Participant display (room sides); 1 × Public gallery display (gallery).

**Hardware decision.** Local hybrid matrix. Five local outputs use four HDMI extension paths and one native HDBaseT receiver; a local hybrid matrix provides the required bounded routing. 2 additional complete source-to-rack extender sets are included. A smaller local presentation switcher may suffice if the final input/output count falls. Add NetworkHD only for a separately specified remote source or destination.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 8 100V speakers × 6W = 48W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 4. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include two complete advocate-to-rack input extensions; one matrix HDBaseT input cannot accept two transmitters. Engineer preview/release interlock, private-session mute and secure recording retention with the court. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Incident Briefing Room — Five-Feed Local Matrix

Template ID: `government-emergency-briefing-room-networkhd500` · Market: Government

**Concept.** A 14m × 10m briefing room with five shared displays and a central decision table. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 18–24 staff. The chair selects incident maps, dashboards and authorised liaison feeds for each display while a separate conferencing system supports remote agencies.

**Sources.** 2 × Incident management PC HDMI (secure rack); 1 × Map workstation HDMI (rack); 1 × Authorised liaison feed HDMI (rack); 1 × Conferencing compute HDMI (rack).

**Destinations.** 4 × 75-inch briefing display (front and side walls); 1 × Chair confidence monitor (table).

**Hardware decision.** 8×8 matrix kit. Five feeds and five local destinations fit an 8×8 matrix; an incident-response application does not inherently need a network-video fabric. If displays need only repeated scheduled signage, use local managed players or splitters. Reconsider AV over IP only for long distributed routes, substantial expansion or campus sharing.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 6 100V speakers × 6W = 36W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 2. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Verify secure source boundaries, USB/camera paths and 35m output routes; specify recovery procedures. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Telemedicine Consultation — Local Video Visit

Template ID: `healthcare-telemedicine-consult-room-apollo` · Market: Healthcare

**Concept.** A 4.5m × 4m private consultation room with a desk and patient seating. Assume cleanable solid partitions and sealed ceiling penetrations, service access outside the treatment zone and an approved infection-control installation method. Designed for Clinician and 1–2 visitors. The clinician starts a remote consultation from an approved laptop, using the room camera and audio while sharing authorised documents on one screen.

**Sources.** 1 × Approved clinical laptop USB-C host (consultation desk).

**Destinations.** 1 × 55-inch consultation display (front wall).

**Hardware decision.** Local UC. One consultation endpoint needs local conferencing; the AV system is not a diagnostic camera or examination instrument. If the room needs two independent screens or multiple cameras, redesign around a local presentation switcher and a separately selected conferencing package.

**Audio experience.** The integrated bar provides two-way call audio and everyday presentation playback for the stated seating area; no external speaker or amplifier system is required.





One USB conferencing return and the selected presentation audio use the integrated bar; no external zone matrix is required. Integrated microphone array; confirm pickup in the actual room. Use the bar’s integrated conferencing processing and verify microphone pickup at the furthest seat; do not cascade an external AEC processor. The bar is the USB microphone and loudspeaker device for the connected host. Call return and microphone send travel over USB; use one active audio device.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Approve privacy, cleaning, patient consent and platform policy; separately scope medical peripherals and any clinical certification. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Procedure Observation — Approved Training Feeds

Template ID: `healthcare-theatre-observation-networkhd500` · Market: Healthcare

**Concept.** A procedure room adjoining observation and seminar rooms, with protected service routes between them. Assume cleanable solid partitions and sealed ceiling penetrations, service access outside the treatment zone and an approved infection-control installation method. Designed for 4 observers and 12 trainees. Authorised procedure-camera and workstation presentation feeds are distributed for observation and teaching; clinical control and diagnostic displays remain on their original approved systems.

**Sources.** 2 × Approved procedure camera interface HDMI (isolated AV handoff); 1 × Authorised clinical presentation HDMI (isolated handoff); 1 × Teaching PC HDMI (seminar room).

**Destinations.** 2 × Observation display (observation room); 2 × Seminar display (teaching room); 1 × Facilitator monitor (staff desk).

**Hardware decision.** NHD 500-series. Five destinations across clinical boundaries and separate teaching spaces justify distributed routing, subject to isolation and explicit authorised video handoffs. Compare a fixed matrix and matched extension if all sources and destinations can be cabled back to one rack. Retain AV over IP only while distributed routing remains a requirement.

**Audio experience.** Teaching speech and approved procedure programme are heard in observation and seminar rooms on independently controlled 100V circuits. No clinical alarm or treatment-room communications path is replaced.

- Observation: 2 100V speakers × 6W = 12W on a 30W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.
- Seminar: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



Zones carry the same selected event programme unless an independent source is explicitly scheduled; each circuit retains independent level, mute, delay and speech/programme mixing. Room-combine presets must respect partition state and microphone routing. Teaching/facilitator microphone position Pickup positions: 2. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Include approved clinical isolation/conversion interfaces; no unapproved tap into medical devices. Obtain privacy/consent and recording approval; shared AV pictures are not primary diagnostic outputs. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Station Briefing Room — Local HDBaseT

Template ID: `emergency-station-briefing-hdbaset` · Market: Emergency Services

**Concept.** An 8m × 5m station briefing room with a table, front screen and lockable cupboard. Assume reinforced stud or masonry display walls, an accessible suspended ceiling, carpet and controlled daylight; provide cable containment and acoustic absorption. Designed for 6–12 staff. The duty team briefs from a station PC or visiting laptop on one screen, with clear speech and programme audio for shift handover.

**Sources.** 1 × Station PC HDMI (briefing input point); 1 × Guest laptop USB-C (briefing input point).

**Destinations.** 1 × 75-inch briefing display (front wall).

**Hardware decision.** HDBaseT. Two selectable sources and one screen need a single HDBaseT path, not control-room infrastructure. For a short table-to-screen route, compare direct HDMI/USB-C switching; use a newer matched transmitter/receiver if 4K60 or higher USB bandwidth is required.

**Audio experience.** A modest room speaker system handles selected programme and speech playback. Size it for intelligibility and the stated audience rather than cinema output.

- Programme zone: 2 8-ohm speakers on 2 independent 30W channels. Front-of-room programme playback with one loudspeaker per amplifier channel.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Any central incident feed is an added source with an explicitly approved handoff, not an assumed IP connection. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Tactical Coordination Room — Local 4×4 Matrix

Template ID: `emergency-tactical-coordination-hybrid` · Market: Emergency Services

**Concept.** A 10m × 8m coordination room with a U-shaped table and two front displays. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 12–20 staff. The chair compares incident information and maps while liaison officers share a laptop; a room conferencing platform connects authorised remote teams.

**Sources.** 1 × Incident PC HDMI (secure rack); 1 × Mapping PC HDMI (rack); 1 × Liaison laptop HDMI (table); 1 × Conferencing compute HDMI (rack).

**Destinations.** 2 × 75–86-inch coordination display (front wall).

**Hardware decision.** 4×4 matrix. Four local sources and two outputs fit a fixed matrix; a remote AV-over-IP source is not presumed simply because teams collaborate remotely. 1 additional complete source-to-rack extender sets are included. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Distributed ceiling speakers carry remote participants and presentation audio evenly across the table or seating area. AEC microphones provide clear two-way calls; full-range movie sound is unnecessary.

- Meeting room ceiling: 6 100V speakers × 6W = 36W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. Table/ceiling conferencing pickup position with compatible DSP input Pickup positions: 2. AEC on each conferencing microphone input, automixing, gain levelling, EQ and limiting; size channels for every pickup position. Far-end return feeds the room loudspeakers and AEC reference; near-end AEC microphone mix feeds USB transmit. Keep far-end audio out of the return send (mix-minus). Local voice lift, where needed, has separately commissioned gain and delay. Selected programme audio and microphone inputs enter the DSP; DSP USB connects bidirectionally to the active conferencing host, and balanced outputs feed the room amplifiers. Commission double-talk, echo cancellation, lip-sync and content-audio sharing.

**Acoustic treatment by others.** Reflections from glazing, table surfaces and hard walls can reduce microphone clarity and make remote speech tiring. AEC controls echo in the signal path but does not shorten the room reverberation. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Remote agencies connect through the approved conferencing platform; any separate video feed needs a security-approved interface. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Dispatch Review Room — Three-Feed Local Routing

Template ID: `emergency-dispatch-control-networkhd600` · Market: Emergency Services

**Concept.** A 10m × 7m dispatch review room with three shared wall screens and six desk positions. Assume a secure continuously staffed room with reinforced display structure, raised-floor or overhead containment, controlled light and a ventilated equipment room. Designed for 6 dispatch/supervisory staff. Supervisors route three authorised CAD, mapping or VMS composite outputs to the shared screens; workstation operation and incident communications remain independent.

**Sources.** 1 × Authorised dispatch/CAD HDMI output (secure rack); 1 × Mapping HDMI output (rack); 1 × Approved VMS composite HDMI (rack).

**Destinations.** 3 × 65-inch review display (front wall).

**Hardware decision.** 4×4 matrix. Three feeds and three outputs fit a 4×4 matrix. The earlier six-transceiver 10Gb design did not justify its fabric from this I/O count. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Low-level shared briefing playback is distributed for intelligibility. Operator headsets, dispatch radio and critical alarm systems remain independent of the AV speakers.

- Operational briefing audio: 4 100V speakers × 6W = 24W on a 60W channel. Even speech and background-audio coverage; full-range cinema reproduction is not assumed.



One selected programme feed serves this room; conferencing return and microphone processing remain separately defined where provided. No room reinforcement microphones are included. Provide source selection, gain structure, EQ, limiting and independently controlled output zones; apply delay where coverage overlaps. No AEC or conferencing function is inferred from an amplifier or video decoder. Selected programme audio is extracted at the nominated source/receiver and mixed with the scheduled microphones, then sent by balanced line to each amplifier. Mute display loudspeakers to prevent duplicate delayed sound.

**Acoustic treatment by others.** Clear teaching, briefing or recorded speech depends on a controlled acoustic environment; confirm whether the existing finishes provide enough absorption for the stated use. Survey reverberation, background/HVAC noise and early/late reflections in furnished and occupied conditions. Include appropriately rated wall panels and ceiling clouds/baffles or absorptive finishes where needed, with measured areas and safe structural fixing. Coordinate cleaning, fire performance, lighting, sprinklers and maintenance access with the venue. Set the speech/UC performance target with the acoustic specialist and verify after installation; reduce or omit new panels only where existing treatment meets that target. One measured package allowance includes panel type, performance, area, fixings and installation; quantity one does not mean one panel.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Keep dispatch/communications functions independent; define source permissions and failure recovery. For a larger operational wall, use a separately sized source/output schedule rather than scaling by job title. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Station Shared Status — Four Local Displays

Template ID: `emergency-shared-status-networkhd100` · Market: Emergency Services

**Concept.** A station with a briefing corridor, welfare room and staffed status desk, all within 35m cable routes of a secure rack. Assume masonry perimeter walls, a serviceable ceiling and secure rack space; verify structural suspension points, daylight control, ventilation and room acoustics. Designed for Four shared display positions. Two approved status/briefing feeds are routed to four displays using named presets; the public-facing position receives only cleared content.

**Sources.** 1 × Approved status CMS player HDMI (secure rack); 1 × Briefing programme HDMI (secure rack).

**Destinations.** 3 × Commercial status display (corridor and welfare zones); 1 × Staffed status monitor (staff desk).

**Hardware decision.** 4×4 matrix. Two sources and four local destinations fit a fixed matrix. The base design uses full-screen feeds and does not promise a multiview function. If only one shared picture is needed, a switcher and splitter can replace the matrix. Move to a larger fixed matrix before proposing AV over IP for extra local I/O.

**Audio experience.** Visual information is silent in this concept. Keep display audio muted; any paging, conferencing or room sound requirement needs a separately agreed audio scope.





No programme-audio routing is included; the visual feeds remain silent. No room reinforcement microphones are included. No audio processing is required in the base scope. Video-only programme; display speakers remain muted.

**Additional application scope.** Required display mounting, source devices, control, mains/rack, signal cabling and delivery allowances accompany the equipment schedule.

**Site checks.** Document content zoning and permissions; a separately specified multiview processor is needed only if simultaneous windows are required. Confirm survey dimensions, speaker coverage, cable routes, structure, power, acoustic conditions and completed supplier/model assignments before issue.

## Discovery and interface follow-up (28 September)

Essential Discovery captures listening zones, audience programme requirements and physical/acoustic conditions. Conditional guidance covers 70/100V coverage, independent sources and amplifier channels, separate voice reinforcement, bidirectional UC and AEC, justified Dante networking, steerable columns, modular arrays, and treatment by others. Required supplier packages and unresolved engineering checks are retained in the saved brief and proposal. Silent signage avoids unnecessary audio scope.

The template header context is compact, and the floating Guru launcher has a keyboard-accessible close button for the current session.

The Equipment view now uses one scope selector with item counts. Repeated step cards and status totals were removed; instructions are available in the collapsed Equipment guide. Concepts and technical detail remain in Overview and exports. Browser checks confirm supplier groups, Guru dismissal/restoration and responsive layout.
