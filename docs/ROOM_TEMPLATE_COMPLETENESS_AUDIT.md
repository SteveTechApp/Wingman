# Predefined Room Template Completeness Audit

Audited on 2026-10-01 against 59 predefined templates and the whole-room design requirement: a room context, WyreStorm signal path, and visible scope for the other equipment, infrastructure and work needed to complete the system.

## Findings

- Every template has a whole-room concept, physical room/occupancy assumptions, scheduled sources and outputs, a WyreStorm transport design, design notes, assumptions and site validation items.
- The authored schedules contain 1,095 third-party or integrator scope rows across 59 templates, covering endpoint products and supporting installation scope.
- 0 of those rows name both a third-party manufacturer and model. The schedules therefore describe the equipment roles and design allowances, but they do not yet provide real third-party SKU selections.
- 0 third-party rows remain incorrectly labelled as included. Before this refinement, all 1,095 generic allowances were presented that way; the refinement changes them to “Validate” until an actual product is selected and checked.
- Do not treat a BY-OTHERS-* identifier as a purchasable SKU. It is a scope key that identifies an unselected item. Manufacturer and model fields remain empty until selected from a supplier catalogue or the integrator’s equipment library.
- The generic whole-room scope should be treated as a starting schedule. Site-specific source/display models, mount fixings, cable lengths, connector transitions, network switch configuration/PoE, acoustic treatment and installation quantities still require survey or customer confirmation.

## Template inventory

| Template | Market | WyreStorm rows | Other-scope rows | Named other-brand models | Assumptions | Site checks |
|---|---|---:|---:|---:|---:|---:|
| Corporate Huddle Room — Single-Screen BYOD | Corporate | 1 | 13 | 0 | 5 | 4 |
| Executive Boardroom — Local 4×4 Matrix | Corporate | 3 | 22 | 0 | 5 | 5 |
| Teaching Classroom — Local HDBaseT | Education | 2 | 15 | 0 | 5 | 4 |
| Lecture Capture Theatre — Local Presentation Matrix | Education | 2 | 25 | 0 | 5 | 5 |
| Retail Store — Eight-Zone Content Matrix | Retail | 1 | 11 | 0 | 6 | 4 |
| Retail Feature Wall — Four-Panel LCD Canvas | Retail | 1 | 11 | 0 | 6 | 4 |
| Sports Bar — Twelve Independently Routed Screens | Hospitality | 3 | 17 | 0 | 6 | 4 |
| Divisible Ballroom — Two-Room Presentation System | Hospitality | 3 | 22 | 0 | 5 | 5 |
| Clinical Simulation — Local Observation and Debrief | Healthcare | 3 | 20 | 0 | 5 | 5 |
| Government Control Suite — Ten-Feed Display Routing | Government | 3 | 18 | 0 | 5 | 4 |
| Worship Venue — Main Hall and Distributed Overflow | Venue | 3 | 30 | 0 | 6 | 5 |
| Transport Operations Office — Local Status Routing | Transport | 1 | 12 | 0 | 6 | 4 |
| Residential Media Room — Local Source Selection | Residential | 2 | 15 | 0 | 5 | 5 |
| Multi-Camera Meeting Room — Local Camera Production | Corporate | 1 | 18 | 0 | 5 | 5 |
| School Assembly Hall — Single Projector HDBaseT | Education | 2 | 16 | 0 | 5 | 5 |
| Flexible Learning — Five Sources and Four Team Displays | Education | 2 | 15 | 0 | 5 | 5 |
| Hybrid Seminar Room — Local Presentation and Conferencing | Education | 3 | 21 | 0 | 5 | 4 |
| Active Learning Lab — Six Teams and Tutor Routing | Education | 2 | 16 | 0 | 5 | 5 |
| Large Sports Bar — Twenty-Four Independent Screens | Hospitality | 4 | 19 | 0 | 6 | 4 |
| Local Pub — Eight-Zone HDBaseT Matrix | Hospitality | 1 | 16 | 0 | 6 | 4 |
| Casino Floor — Forty-Eight Zone Routing | Hospitality | 3 | 26 | 0 | 6 | 4 |
| Bingo Hall — Programme and Repeater Distribution | Hospitality | 4 | 23 | 0 | 6 | 4 |
| Stadium — Concourse and VIP Distribution | Hospitality | 3 | 31 | 0 | 6 | 5 |
| Security Command Room — Approved VMS Display Feeds | Government | 1 | 17 | 0 | 5 | 4 |
| Situation Room — Twelve-Feed Operational Wall | Government | 3 | 23 | 0 | 5 | 5 |
| Medium Meeting Room — Dedicated Conferencing | Corporate | 1 | 13 | 0 | 5 | 5 |
| Experience Centre — Flexible High-Detail Demonstration | Corporate | 3 | 20 | 0 | 5 | 5 |
| Agile Office — Four Independent Collaboration Pods | Corporate | 2 | 10 | 0 | 5 | 4 |
| Primary Classroom — Interactive Teaching Display | Education | 2 | 15 | 0 | 5 | 4 |
| University Theatre — Main Room and Overflow | Education | 3 | 29 | 0 | 6 | 5 |
| STEM Laboratory — Two Demonstration Feeds | Education | 1 | 15 | 0 | 6 | 4 |
| Security Operations Centre — Twenty-Screen Estate | Control Rooms | 3 | 21 | 0 | 6 | 5 |
| Utility Network Operations — Local Dashboard Matrix | Control Rooms | 1 | 15 | 0 | 5 | 4 |
| Traffic Management — Eight Shared Display Routes | Control Rooms | 1 | 17 | 0 | 6 | 4 |
| Council Chamber — Local Presentation and Public Record | Government | 3 | 33 | 0 | 5 | 5 |
| Clinical MDT — Local Review Presentation | Healthcare | 3 | 21 | 0 | 5 | 4 |
| Clinic Waiting Area — Six Information Screens | Healthcare | 1 | 11 | 0 | 6 | 4 |
| Fitness Club — Ten Programme Zones | Sports & Leisure | 3 | 21 | 0 | 6 | 4 |
| Private Screening Room — Local Cinema System | Hospitality | 2 | 15 | 0 | 5 | 5 |
| Airport Gate Zone — Local FIDS and Boarding Routing | Transportation | 1 | 13 | 0 | 6 | 4 |
| Podcast Studio — Two-Camera Production | Broadcast / Media | 1 | 18 | 0 | 5 | 4 |
| Bank Branch — Rate and Queue Display Matrix | Retail | 1 | 12 | 0 | 6 | 4 |
| Large Worship Auditorium — Production and Overflow | House of Worship | 3 | 29 | 0 | 6 | 6 |
| Reception and Town Hall — Six Local Display Zones | Corporate | 2 | 22 | 0 | 6 | 4 |
| Training Suite — Local Presentation, UC and Capture | Corporate | 3 | 25 | 0 | 5 | 4 |
| Library Learning Commons — Seven Information Zones | Education | 1 | 12 | 0 | 6 | 4 |
| Esports Teaching Lab — Spectator and Analysis Distribution | Education | 3 | 20 | 0 | 5 | 5 |
| Hotel Meeting Room — Single-Screen BYOD | Hospitality | 1 | 13 | 0 | 5 | 4 |
| Restaurant and Bar — Six-Zone Fixed Matrix | Hospitality | 1 | 18 | 0 | 6 | 4 |
| Quick-Service Restaurant — Four Menu Feeds, Eight Screens | Retail | 1 | 11 | 0 | 6 | 5 |
| Car Showroom — Configurator and Brand Routing | Retail | 2 | 18 | 0 | 6 | 5 |
| Courtroom — Controlled Evidence Presentation | Government | 4 | 27 | 0 | 6 | 5 |
| Incident Briefing Room — Five-Feed Local Matrix | Government | 1 | 23 | 0 | 5 | 4 |
| Telemedicine Consultation — Local Video Visit | Healthcare | 1 | 13 | 0 | 5 | 4 |
| Procedure Observation — Approved Training Feeds | Healthcare | 3 | 26 | 0 | 6 | 5 |
| Station Briefing Room — Local HDBaseT | Emergency Services | 2 | 15 | 0 | 5 | 4 |
| Tactical Coordination Room — Local 4×4 Matrix | Emergency Services | 3 | 22 | 0 | 5 | 4 |
| Dispatch Review Room — Three-Feed Local Routing | Emergency Services | 2 | 17 | 0 | 5 | 5 |
| Station Shared Status — Four Local Displays | Emergency Services | 2 | 13 | 0 | 6 | 4 |

## Template counts by market label

- Broadcast / Media: 1
- Control Rooms: 3
- Corporate: 8
- Education: 11
- Emergency Services: 4
- Government: 6
- Healthcare: 5
- Hospitality: 10
- House of Worship: 1
- Residential: 1
- Retail: 5
- Sports & Leisure: 1
- Transport: 1
- Transportation: 1
- Venue: 1

## Refinement applied

All generated non-WyreStorm and room-completion allowance rows are now typed and shown as requiring validation, with explicit evidence that a real manufacturer/model must be selected before quotation. Existing role descriptions, locations, quantities, cable/network/power notes and WyreStorm routing remain available for completing the room design.

## Remaining work to meet the SKU-specific standard

Research and add compatible third-party candidate SKUs only where the design basis supports the choice. Product selections need a source URL, checked date, technical fit notes and compatibility/dependency information. Where room geometry, customer standards, supplier availability or site conditions decide the model, leave it as an explicit validate item and let the reusable equipment library capture the integrator’s approved choice.
