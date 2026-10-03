# Wingman room-template design and BoM audit

Date: 24 September 2026. Scope: the 59 published room templates in `src/wingman2/lib/roomTemplates*.ts`, the market-first Discovery selector, and the governed product store. This is a template-quality audit, not a sign-off of any customer installation.

## Decision

The catalogue has useful breadth in corporate, education and hospitality, but it is not yet consistently diverse or quote-ready across markets. Emergency Services previously had **zero native designs**, so the first four Discovery choices were related Government/Control Rooms templates, three dominated by NetworkHD 600. Four native Emergency Services concepts now replace those choices: local station briefing, hybrid tactical coordination, low-latency dispatch, and NetworkHD 100 shared-status distribution. They intentionally differ in room scale, source location, network dependence, output behaviour and core WyreStorm SKU family.

An authored template is a *priced-system starting point*, not a final quotation. Every project still needs a site survey, source/output schedule, network/security sign-off, tested signal flow, and a quantity- and price-complete schedule for third-party equipment and labour. Generic `BY-OTHERS` rows currently have placeholder quantities and cannot be treated as priced line items.

## What the technical research changed

- A small station room can use local HDBaseT rather than automatically inheriting a 10Gb AV fabric. The [SW-130-TX-UK](https://www.wyrestorm.com/product/sw-130-tx-uk/) accepts local HDMI/USB-C and is documented with RX-700 PoH compatibility.
- A medium coordination room can combine local HDMI/USB-C with one remote NetworkHD 500 feed through [MX-1007-HYB](https://www.wyrestorm.com/global/product/mx-1007-hyb/). Its built-in NHD 500 input/output does not make remote NDI a native NHD 500 source: the optional [CAM-0402-NDI-BRG](https://www.wyrestorm.com/global/product/cam-0402-ndi-brg/) has an HDMI handoff and specific NDI input limits.
- NetworkHD 600 is appropriate when its 10Gb transport and latency characteristics are justified. The [NHD-600-TRX](https://www.wyrestorm.com/global/product/nhd-600-trx/) supports *built-in* multiview and video-wall processing; a separate processor is **not inherently required**. Genlock and fast-switch latency are different modes, and display/window count must be engineered. Its 10Gb stream cannot be assumed to interoperate natively with a NetworkHD 100 NDI gateway.
- [NHD-128-NDI-TRX](https://www.wyrestorm.com/product/nhd-128-ndi-trx/) is documented for NDI HX (NDI 6) and NetworkHD 100/120/150, while [NHD-150-RX](https://www.wyrestorm.com/global/product/nhd-150-rx/) provides 100-series multiview. The shared-status design uses that combination only on an approved 1Gb path.
- Corporate AV-VLAN and dedicated AV LAN are alternatives, not assumptions. WyreStorm's [NetworkHD technical guide](https://www.wyrestorm.com/networkhd-technical-reference-guide/) identifies multicast, PoE, connectivity and switch design as system requirements. IT approval, routing boundaries and source permissions are especially material for emergency services.
- A true emergency operations centre integrates varied information channels, visualisation, robust communications, training and fault logging; it is not just a display wall. This comes from [UK Civil Contingencies Secretariat guidance](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/207227/the_lead_Government_department_and_its_role_-_guidance_and_best_practice.pdf). The application to these four AV templates is our design inference.

## New Emergency Services choices

| Room concept | Physical and remote source basis | Required WyreStorm baseline | Network/output design | Still to price and validate |
| --- | --- | --- | --- | --- |
| Station briefing, 6–12 people | Laptop and station PC in room; central feed is a separately scoped option | 1 × SW-130-TX-UK, 1 × RX-700 | Point-to-point HDBaseT to one display; no AV LAN in base scope | Display/mount, station PC, cable distance/PoH, audio, power, labour |
| Tactical coordination, 12–24 people | Local incident PC and visiting laptop; one approved HDMI source encoded at another room; optional NDI HX camera bridge to HDMI | 1 × MX-1007-HYB, 1 × NHD-500-TX, 1 × NHD-CTL-PRO-V2 | Two local displays; approved 1Gb AV-VLAN or dedicated LAN; optional overflow RX | Display and room audio/UC, security boundary, multicast, remote-source rights, actual I/O map |
| Dispatch control, large 24/7 room | Three authorised workstation HDMI outputs; NDI HX requires optional bridge plus spare 600 input endpoint | 6 × NHD-600-TRX (3 source + 3 display positions), 1 × NHD-CTL-PRO-V2 | IT-approved 10Gb fabric; three display endpoints; 600 multiview/wall layout and latency mode to engineer | CAD/VMS outputs, panels/structure, switches, PoE+, UPS, failover, control permissions, monitoring |
| Shared status and overflow | Two centrally located approved outputs; optional NDI HX feed restricted to staffed zone | 1 × NHD-CTL-PRO-V2, 2 × NHD-120-TX, 3 × NHD-120-RX, 1 × NHD-150-RX | Three single-feed displays and one staffed multiview screen on approved 1Gb network | CMS/content PC, moderation, information zoning, displays/mounts, network, audio/alerting, labour |

Optional WyreStorm rows are retained in the relevant BoMs rather than silently counted as required: NHD-500-RX for tactical overflow; CAM-0402-NDI-BRG for tactical/dispatch NDI HX handoff; NHD-128-NDI-TRX for shared-area NetworkHD 100 integration. Their prerequisites must be added before quotation.

## Whole-catalogue variance audit

Counts include all published templates; distinct SKU counts include required and optional WyreStorm rows, excluding `BY-OTHERS`. They indicate *catalogue exposure*, not design quality, price readiness or compatible cross-family interoperability. Legacy `Venue` is grouped with House of Worship and `Transport` with Transportation.

| Market | Templates / distinct WyreStorm SKUs | Actual room/environment span and principal SKUs | Assessment / next design opportunity |
| --- | ---: | --- | --- |
| Corporate | 8 / 22 | Huddle, boardroom, multi-camera, Teams room, experience centre, agile zone, reception/town hall, training; Apollo, NHD 100/500/600, MX-1007-HYB | Good equipment diversity; validate room-level UC/audio/USB topology and avoid overselling AVoIP for small rooms. |
| Education | 11 / 16 | Classroom, lecture capture, school hall, flexible/active learning, hybrid, STEM, commons, esports; HDBaseT, NHD 100/500/600, MX-1007-HYB | Strong application span but first-four Discovery shortlist hides later, more novel rooms. Institutional AV-VLAN assumptions need IT sign-off. |
| Government | 6 / 19 | Control/security/situation rooms, council chamber, courtroom, emergency briefing; NHD 100/500/600, MX-1007-HYB | Three control-room-like narratives still overlap; separate security operations, civic deliberation and judicial evidence workflows. |
| Emergency Services | 4 / 12 | Station briefing, tactical coordination, dispatch, shared status; SW-130/RX-700, MX-1007/NHD 500, NHD 600, NHD 100/150 | Newly differentiated. Validate field terminology, operational resilience and information-classification policy with actual users/integrators. |
| Energy / Oil & Gas | **0 / 0** | Discovery currently borrows Control Rooms designs, mainly NHD 500/600 | Highest content gap. Add site-control, safety briefing, remote monitoring and visitor/permit spaces; address OT/IT isolation and hazardous-area restrictions. |
| Manufacturing / Logistics | **0 / 0** | Discovery borrows Control Rooms/Corporate designs | Highest content gap. Add production visualisation, line-side instruction, warehouse operations and training; assess environmental protection and OT/IT separation. |
| Healthcare | 5 / 11 | Simulation, MDT/imaging, patient calling, telemedicine, theatre observation; NHD 100/500 and Apollo | Meaningful spread; clinical signal quality, privacy, infection-control and patient data remain site-specific blockers. |
| Hospitality | 10 / 25 | Bar, ballroom, casino, bingo, stadium/VIP, cinema, hotel meeting and restaurant; NHD 100/500, matrices, MX-1007, Apollo | Broadest SKU diversity; rationalise near-duplicate sports-bar/casino distribution patterns and show room-size/output-count basis. |
| Retail | 5 / 10 | Signage, LCD wall, bank branch, QSR menus, car showroom; NHD 100/500 and SW video-wall processors | Useful contexts, but signage/NHD 100 repeats; add small single-screen and multi-site content-management design boundaries. |
| Sports & Leisure | 1 / 4 | Gym/fitness club; NHD 100 | Thin. Sports venue examples are currently in Hospitality; consider cross-market surfacing without duplicating BoMs. |
| House of Worship | 2 / 7 | Overflow and large auditorium/IMAG; NHD 500/600 and CAM-420-PTZ | Scale difference is clear; add small multipurpose community room and streaming/recording scope if demand warrants. |
| Control Rooms | 3 / 8 | Security operations, network operations and traffic management; NHD 500/600 | Role narratives vary but hardware clusters. Clarify CCTV/VMS versus NOC feed location, operator KVM, wall layouts and failover. |
| Transportation | 2 / 6 | Operations signage and airport lounge/FIDS; NHD 100/500 | Thin and signage-heavy. Add passenger concourse, transport operations and incident coordination with different criticality/content rights. |
| Broadcast / Media | 1 / 4 | Podcast/NDI content studio; CAM-0402-NDI-BRG and NHD 500 | Thin. Studio confidence monitoring, remote contribution and edit/review rooms would create legitimate SKU variety. |
| Residential | 1 / 3 | Whole-home media matrix | Narrow by intent; expanding only makes sense if residential remains a target market. |

## Release and quotation gates

1. **Source/output schedule:** each physical source, connector, location, resolution, audio/USB/control path, concurrent route and display/window must be named. An NDI or remote AVoIP feed needs an explicit gateway/encoder and supported protocol, not just a narrative claim.
2. **Network/security design:** choose corporate AV-VLAN or dedicated AV LAN; confirm multicast, switch/uplink capacity, PoE/PoE+, VLAN boundaries, remote-source rights, cyber approval and operational recovery.
3. **Complete BoM:** replace `BY-OTHERS` placeholders with actual display/projector/LED wall and processor models (where needed), mounts, cables and materials, racks, switches, optics, power/UPS, audio/UC, licences and content systems. Capture exact quantities and supplier ownership.
4. **Delivery schedule:** survey, drawings, access, installation labour, configuration, programming, testing, training, as-builts, warranty and spares must be costed. A template with unresolved validation items should not be represented as a final price-ready design.
5. **Technical review:** check current SKU lifecycle, endpoint compatibility, signal format, routing modes and practical installation constraints against current manufacturer documentation before customer issue.

Priority next work: create native Energy and Manufacturing concepts, then revise the Discovery shortlist so markets with more than four templates show diverse room/architecture choices rather than simply the first four in file order. After that, review Government/Control Rooms overlap and implement a quotation-readiness gate that distinguishes a conceptual WyreStorm baseline from a fully priced project BoM.
