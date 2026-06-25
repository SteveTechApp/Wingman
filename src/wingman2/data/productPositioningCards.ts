import type { ProductPositioningAttachProduct, ProductPositioningCard } from "../types/productPositioning";

import { resolveWyrestormSkuAlias } from "../lib/skuAliasResolver";

const CORE_PRODUCT_POSITIONING_CARDS: ProductPositioningCard[] = [
  {
    sku: "NHD-0401-MV",
    productName: "4-input HDMI multiview processor",
    productFamily: "NetworkHD / Multiview",
    technologyType: "HDMI multiview",
    salientPoint: "A practical way to show several HDMI sources on one display, processor input or confidence monitor.",
    oneLinePositioning: "Use this when the customer needs to see multiple sources together on one output rather than simply switching between them.",
    oneMinuteBrief: "The NHD-0401-MV takes up to four HDMI sources and shows them together on one screen, recorder, streamer or LED processor input. Reach for it when the customer needs to see several feeds at once rather than switch between them - and confirm whether the real job is multiview, matrix switching or a video wall before quoting.",
    bestFitApplications: ["sports bars", "control rooms", "security monitoring", "education preview displays", "LED processor input management", "confidence monitoring"],
    weakFitApplications: ["full matrix replacement", "large distributed AV by itself", "complete video wall processing without confirming layout needs"],
    customerProblems: ["The customer has several feeds but only one display or processor input.", "The operator needs to see more than one source at the same time.", "The current solution relies on switching back and forth between sources."],
    wyrestormFit: ["Helps sales explain the difference between source visibility, switching, AVoIP and video wall processing.", "Can lead into wider matrix, AVoIP or video wall design where the requirement grows."],
    openingQuestions: ["How many sources need to be visible at the same time?", "Is the output feeding a display, matrix, LED processor, recorder or AVoIP encoder?", "Do you need fixed layouts or user-selectable layouts?", "What resolution and refresh rate do the sources need?", "Is this standalone or part of a wider routed AV system?"],
    qualificationQuestions: ["Do any of the sources carry protected content?", "Who needs to control the layout?", "Is audio required from a specific source?", "Is this for operator monitoring or customer-facing display?", "Are there future source expansion plans?"],
    technicalCheckQuestions: ["Confirm HDCP requirements.", "Confirm output resolution.", "Confirm layout expectations.", "Confirm control method.", "Confirm whether this is true multiview or video wall processing."],
    listenForTriggers: ["We need to see all sources at once.", "We need a preview monitor.", "The LED processor only has one spare input.", "The operator wants to monitor several feeds.", "We currently use a cheap quad viewer."],
    disqualifiers: ["Do not present as a full matrix replacement.", "Do not present as a complete video wall processor without checking the requirement.", "Do not assume it replaces an AVoIP decoder."],
    caveats: ["Check HDCP, resolution, layout and control expectations before confirming.", "Clarify whether the need is multiview, switching, video wall processing or AVoIP composition."],
    objectionHandling: [
      { objection: "Can the display do this?", response: "Some displays offer limited PiP or PbP, but a dedicated multiview processor gives a more predictable AV integration path and clearer source handling." },
      { objection: "Can a matrix do this?", response: "A matrix routes different sources to outputs. Multiview is different because it shows several sources on one output at the same time." },
      { objection: "Is this a video wall processor?", response: "It depends on whether the customer needs multiview, wall processing, or both. Confirm layout, outputs and scaling before positioning." }
    ],
    attachProducts: [
      { productFamily: "NetworkHD", reason: "Use when the multiview requirement is part of a wider routed AV or AVoIP system." },
      { sku: "NHD-150-RX", reason: "Use for NetworkHD 100-series multiview composition workflows where appropriate." },
      { sku: "SW-0206-VW", reason: "Consider for non-AVoIP video wall processing conversations." }
    ],
    competitorAngles: [
      { competitorCategory: "quad viewer / multiviewer", positioningNote: "Check whether the competitor device is a true multiviewer, matrix switcher with preview, or video wall processor before claiming equivalence.", compareSearchTerms: ["multiview", "quad viewer", "video wall processor"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Lead with the simple attach opportunity: customers often ask for switching, but actually need source visibility.",
      DEALER: "Use this when preview, LED processor inputs, sports-bar displays or monitoring points need several sources visible at once.",
      INTEGRATOR: "Clarify layout control, signal path, HDCP and whether this is before or after a matrix/AVoIP system.",
      CONSULTANT: "Position as a multiview function, not as a generic switching or wall-processing substitute.",
      END_USER: "Explain that it allows several feeds to be viewed together on one screen."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Use the first five questions to separate multiview from switching and video wall needs.",
      PRODUCT_CALLOUT: "Call dealers with sports bar, monitoring, LED or confidence-display accounts.",
      COMPETITOR_DISPLACEMENT: "Compare function first, then I/O and control. Do not assume every quad viewer is equivalent.",
      PROJECT_DISCOVERY: "Capture source count, output destination, layout needs and control expectations.",
      TRAINING: "Use this SKU to teach the difference between matrix switching and multiview."
    },
    followUpWording: "Based on what you described, this looks like a multiview requirement rather than simply a switching requirement. WyreStorm has options that can help show multiple HDMI sources on a single output, either standalone or as part of a wider AV system. Before confirming the best option, we should check source count, output resolution, required layouts, HDCP expectations and where the output sits in the wider system.",
    reviewGates: ["Confirm this is multiview, not full video wall processing.", "Confirm HDCP and resolution.", "Confirm control/layout expectations."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "NHD-150-RX",
    productName: "NetworkHD 100-series multiview receiver / decoder",
    productFamily: "NetworkHD 100 Series",
    technologyType: "AVoIP multiview receiver",
    salientPoint: "A NetworkHD receiver used when the customer needs composed/multiview output from a 100-series AVoIP workflow.",
    oneLinePositioning: "Use this when multiple NetworkHD 100-series sources need to be composed into a single output view.",
    oneMinuteBrief: "The NHD-150-RX is a NetworkHD 100-series receiver that puts several 100-series network sources together on one screen. It only works inside a NetworkHD 100 system with matching encoders and the controller, so confirm the system family before offering it - it is not a standalone HDMI quad viewer.",
    bestFitApplications: ["AVoIP monitoring", "education source preview", "hospitality operator displays", "NDI/H.265 workflow monitoring where supported", "multi-source room overview"],
    weakFitApplications: ["standalone HDMI-only multiview without NetworkHD context", "10GbE SDVoE systems", "mixed NetworkHD series interoperability"],
    customerProblems: ["The user wants one output that shows several routed AV sources.", "The customer needs a monitoring or confidence view from an AVoIP system.", "They want more context than a single switched source."],
    wyrestormFit: ["Supports an application-led AVoIP conversation.", "Helps bridge product selection between source routing and source monitoring."],
    openingQuestions: ["Is this already a NetworkHD 100-series system?", "How many sources need to be visible together?", "Is the output for monitoring, presentation or onward distribution?", "Are NDI or camera sources involved?", "What does the operator need to control?"],
    qualificationQuestions: ["Which NetworkHD series is being used?", "Are sources HDMI, NDI, H.265 or mixed?", "Does the customer need one composed output or independent routing?", "Is latency sensitivity important?", "Who will manage layouts?"],
    technicalCheckQuestions: ["Do not mix NetworkHD series unless the design specifically supports the workflow.", "Confirm controller requirement.", "Confirm source encoding path.", "Confirm switch/network suitability.", "Confirm output resolution/layout limits."],
    listenForTriggers: ["We need one screen showing several AVoIP sources.", "We need a confidence monitor for the operator.", "We are bringing camera sources into the AV system.", "Can we show camera and presentation together?"],
    disqualifiers: ["Do not position for non-NetworkHD systems without checking architecture.", "Do not assume interoperability across NetworkHD series.", "Do not replace NHD-600 SDVoE requirements with this product."],
    caveats: ["NetworkHD design rules apply.", "Controller, switch and source compatibility must be checked."],
    objectionHandling: [
      { objection: "Can I use this with any AVoIP encoder?", response: "No. Treat NetworkHD series compatibility as a design rule and confirm the specific encoder/decoder family before offering." },
      { objection: "Is this the same as a standalone multiviewer?", response: "No. It is best discussed as part of a NetworkHD 100-series workflow." }
    ],
    attachProducts: [
      { productFamily: "NetworkHD controller", reason: "NetworkHD systems require the correct controller and network design." },
      { sku: "NHD-128-NDI-BRG", reason: "Use where NDI camera sources need to be brought into a 100-series workflow." },
      { sku: "NHD-128-NDI-TRX", reason: "Use where NDI/H.265 workflows are relevant and supported." }
    ],
    competitorAngles: [
      { competitorCategory: "AVoIP multiview decoder", positioningNote: "Compare only against AVoIP multiview receivers/decoders in a similar system architecture.", compareSearchTerms: ["AVoIP multiview receiver", "decoder multiview"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Treat this as part of a NetworkHD design, not a standalone box sale.",
      DEALER: "Useful for monitoring, education and control-room style opportunities.",
      INTEGRATOR: "Check system series, controller, VLAN/network and source compatibility.",
      CONSULTANT: "Frame as a composed output capability inside a defined NetworkHD design.",
      END_USER: "Explain that it lets several system sources be viewed together on one output."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "First check the NetworkHD series and whether the customer really needs multiview.",
      PRODUCT_CALLOUT: "Target dealers with NetworkHD customers that need monitoring or preview outputs.",
      COMPETITOR_DISPLACEMENT: "Match against similar AVoIP multiview decoding, not generic HDMI multiview.",
      PROJECT_DISCOVERY: "Capture system series, source types, switch/network and output use.",
      TRAINING: "Use to explain why AVoIP products are not universally interchangeable."
    },
    followUpWording: "This looks like a NetworkHD multiview or composed-output requirement. Before confirming the exact design, we should confirm the NetworkHD series, source types, controller, network design, required layouts and whether the output is for monitoring, presentation or onward distribution.",
    reviewGates: ["Confirm NetworkHD series.", "Confirm controller/network requirements.", "Confirm layout and output use."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "NHD-600-TRX",
    productName: "NetworkHD 600-series transceiver",
    productFamily: "NetworkHD 600 Series",
    technologyType: "10GbE SDVoE AVoIP transceiver",
    salientPoint: "A high-performance 10GbE AVoIP transceiver for demanding NetworkHD deployments.",
    oneLinePositioning: "Use this when the customer needs premium 10GbE SDVoE AVoIP performance with flexible encode/decode role assignment.",
    oneMinuteBrief: "The NHD-600-TRX is a 10GbE AV-over-IP endpoint that can act as either a source or a screen connection and carries uncompressed 4K with effectively no delay. It suits demanding projects that already have a 10GbE network in scope; it is over-specified and over-budget for a small local switching job.",
    bestFitApplications: ["premium AVoIP", "large venues", "high-end education", "control rooms", "flexible source/display estates", "low-latency distribution"],
    weakFitApplications: ["small local matrix jobs", "budget hospitality", "1GbE-only infrastructure", "simple one-room switching"],
    customerProblems: ["The customer needs scalable AV distribution.", "The system needs flexible source/display routing.", "The project is beyond practical matrix size.", "Low latency and quality are more important than lowest cost."],
    wyrestormFit: ["Positions NetworkHD as a premium AV-over-IP platform.", "Opens network design, control and expansion conversations."],
    openingQuestions: ["How many sources and displays are required now and later?", "Is 10GbE switching available or planned?", "Is low latency important?", "Are sources local to displays or distributed around the site?", "Is this a new design or replacing a matrix?"],
    qualificationQuestions: ["Is the network dedicated to AV?", "Are mixed resolutions expected?", "Is centralised control required?", "Are any endpoints expected to change role?", "What is the customer’s tolerance for network infrastructure cost?"],
    technicalCheckQuestions: ["Confirm 10GbE network design.", "Confirm controller requirement.", "Confirm endpoint count.", "Confirm latency/image-quality expectations.", "Confirm series compatibility."],
    listenForTriggers: ["The matrix is too limiting.", "We need to expand over time.", "Sources and screens are in different parts of the building.", "We need premium AVoIP.", "We need low latency."],
    disqualifiers: ["Do not position for 1GbE-only budgets.", "Do not mix with other NetworkHD series without correct isolation/design.", "Do not recommend for simple small local jobs where matrix is more appropriate."],
    caveats: ["Network switching, controller and design rules must be validated.", "Budget and infrastructure expectations need confirming early."],
    objectionHandling: [
      { objection: "Why not use a matrix?", response: "For smaller local systems a matrix may be right. AVoIP becomes stronger when the system needs scale, distance, flexible routing, expansion or distributed source/display locations." },
      { objection: "Why is this more expensive?", response: "The value is in scalable 10GbE AVoIP performance, flexibility and system architecture rather than simply switching a few local sources." }
    ],
    attachProducts: [
      { productFamily: "NetworkHD controller", reason: "Required for NetworkHD system management." },
      { productFamily: "10GbE network switching", reason: "The infrastructure must match the system design." }
    ],
    competitorAngles: [
      { competitorCategory: "SDVoE AVoIP", positioningNote: "Compare against similar 10GbE SDVoE products, not compressed 1GbE AVoIP or HDBaseT matrix systems.", compareSearchTerms: ["SDVoE", "10GbE AVoIP", "AV over IP transceiver"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Qualify hard before positioning; this is not a casual low-cost switcher conversation.",
      DEALER: "Use where the project needs flexibility, scale and quality.",
      INTEGRATOR: "Network architecture and commissioning capability are central.",
      CONSULTANT: "Frame around 10GbE SDVoE architecture, scalability and endpoint flexibility.",
      END_USER: "Explain that this is for larger, flexible AV distribution rather than a simple room switch."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Start by checking system size, network and why matrix is not enough.",
      PRODUCT_CALLOUT: "Target dealers/integrators with larger venue, education and premium AV distribution opportunities.",
      COMPETITOR_DISPLACEMENT: "Only compare against similar 10GbE AVoIP architecture.",
      PROJECT_DISCOVERY: "Capture endpoint count, network design and expansion expectations.",
      TRAINING: "Use to teach when AVoIP is the correct system shape."
    },
    followUpWording: "The requirement sounds like a scalable AVoIP system rather than a simple matrix or switcher. NHD-600-TRX should be considered where 10GbE infrastructure, endpoint flexibility, quality and low-latency distribution are part of the project requirements. We should confirm endpoint count, network design, control expectations and whether a matrix would be too limiting.",
    reviewGates: ["Confirm 10GbE infrastructure.", "Confirm endpoint count.", "Confirm controller/network design.", "Confirm AVoIP is justified over matrix."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "NHD-500 Series",
    productName: "NetworkHD 500-series JPEG-XS AVoIP platform",
    productFamily: "NetworkHD 500 Series",
    technologyType: "1GbE JPEG-XS AVoIP",
    salientPoint: "A strong 1GbE AVoIP option for high-quality routed AV where NetworkHD 500-series is the correct platform.",
    oneLinePositioning: "Use this when the customer needs scalable 1GbE NetworkHD distribution with strong image-quality positioning.",
    oneMinuteBrief: "NetworkHD 500 sends high-quality 4K over a standard 1GbE network, so any source can reach any screen across a site and the routing can be changed in software. It fits education, campus and growing systems where a fixed matrix runs out of room but full 10GbE is more than the budget needs.",
    bestFitApplications: ["higher education", "campus AV", "teaching spaces", "distributed displays", "mixed room estates"],
    weakFitApplications: ["very small local systems", "10GbE SDVoE-only specifications", "simple display extension"],
    customerProblems: ["The customer needs routing across multiple rooms.", "A matrix is becoming too fixed or too small.", "They need a scalable AV platform over network infrastructure."],
    wyrestormFit: ["Supports education and scalable AV distribution where WyreStorm needs to cover more than one room.", "Works well where salespeople need to move beyond one-room thinking."],
    openingQuestions: ["How many rooms, sources and displays are involved?", "Is this a new NetworkHD system or expansion?", "Is 1GbE infrastructure preferred?", "Are mixed resolutions or future expansion expected?", "Is central management required?"],
    qualificationQuestions: ["Which NetworkHD series is already installed?", "Is the network dedicated or shared?", "What latency and image-quality expectations exist?", "Is USB required?", "Are there legacy products to support?"],
    technicalCheckQuestions: ["Confirm NetworkHD series compatibility.", "Confirm switch requirements.", "Confirm controller requirement.", "Confirm source/display counts.", "Confirm USB/audio/control expectations."],
    listenForTriggers: ["We already have NetworkHD.", "The matrix is not flexible enough.", "The campus wants a repeatable AV platform.", "We need to route AV between rooms."],
    disqualifiers: ["Do not mix NetworkHD series without correct design isolation.", "Do not recommend where a simple switcher/extender is enough.", "Do not assume USB/conferencing capability without checking product variant and system design."],
    caveats: ["NetworkHD architecture must be designed correctly.", "Confirm controller and switch requirements."],
    objectionHandling: [
      { objection: "Why not HDBaseT matrix?", response: "Matrix is still valid for smaller local systems. AVoIP is stronger when the requirement involves scale, flexibility, distributed rooms or future expansion." },
      { objection: "Can it work with other NetworkHD series?", response: "Treat each NetworkHD series as a design family and confirm interoperability rules before offering." }
    ],
    attachProducts: [
      { productFamily: "NetworkHD controller", reason: "Needed for system control and management." },
      { sku: "NHD-0401-MV", reason: "Consider where a standalone multiview output is required." }
    ],
    competitorAngles: [
      { competitorCategory: "1GbE AVoIP", positioningNote: "Compare against similar 1GbE AVoIP platforms and check codec, latency, resolution and control expectations.", compareSearchTerms: ["1GbE AVoIP", "JPEG-XS", "AV over IP"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Useful education/campus story where one-room products are not enough.",
      DEALER: "Lead with flexibility, repeatability and expansion.",
      INTEGRATOR: "Confirm network, control and commissioning capability.",
      CONSULTANT: "Frame as a 1GbE NetworkHD architecture discussion.",
      END_USER: "Explain that it allows AV sources and displays to be managed more flexibly across spaces."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Find out whether this is one room, multiple rooms or a campus estate.",
      PRODUCT_CALLOUT: "Target education and customers with matrix limitations.",
      COMPETITOR_DISPLACEMENT: "Compare like-for-like against AVoIP, not generic HDMI switching.",
      PROJECT_DISCOVERY: "Capture estate size, network, expansion and control needs.",
      TRAINING: "Use to explain 1GbE AVoIP positioning."
    },
    followUpWording: "This appears to be a scalable AV distribution requirement where NetworkHD 500-series may be relevant, especially if the customer needs flexibility across rooms or future expansion beyond a fixed matrix. We should confirm the current NetworkHD series, source/display count, network design, controller requirements and whether any USB or conferencing functionality is required.",
    reviewGates: ["Confirm exact NHD-500 SKUs.", "Confirm network/controller design.", "Confirm compatibility with any existing system."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "MX-1007-HYB",
    productName: "Hybrid education / presentation matrix",
    productFamily: "Hybrid Matrix",
    technologyType: "Hybrid matrix with AV, USB, audio and NetworkHD integration",
    salientPoint: "A strong teaching-space product when the room needs more than simple HDMI switching.",
    oneLinePositioning: "Use this when the teaching room needs AV switching, USB/conferencing, audio and hybrid signal management in one system design.",
    oneMinuteBrief: "The MX-1007-HYB brings switching, USB/conferencing, audio and NetworkHD into one teaching-room system, so a classroom routes its laptops, room PC, cameras and displays without a rack full of separate boxes. Reach for it when a hybrid teaching room needs all of that handled together, not a plain HDMI switch.",
    bestFitApplications: ["higher education teaching rooms", "hybrid classrooms", "training rooms", "lecture spaces", "standardised room upgrades"],
    weakFitApplications: ["basic huddle room", "simple HDMI extension", "large AVoIP estate by itself"],
    customerProblems: ["The room has multiple source types.", "USB/conferencing is part of the requirement.", "The customer wants a repeatable teaching-room standard.", "Audio and control need to be considered together."],
    wyrestormFit: ["Positions WyreStorm as a teaching-room solution provider.", "Helps connect display, USB, audio and NetworkHD discussions."],
    openingQuestions: ["Is this a teaching, training or meeting space?", "How many HDMI and USB-C sources are required?", "Are USB cameras or microphones involved?", "How many displays or projectors are needed?", "Does the room need local switching only or connection to wider AV distribution?"],
    qualificationQuestions: ["Is BYOD/BYOM required?", "What USB devices are in the room?", "Is audio amplification required?", "Is there an existing control system?", "Is NetworkHD integration required?"],
    technicalCheckQuestions: ["Confirm exact source count.", "Confirm USB host/device workflow.", "Confirm display outputs.", "Confirm audio requirements.", "Confirm control and NetworkHD integration."],
    listenForTriggers: ["hybrid teaching", "USB camera", "lecture room", "USB-C laptop", "standard classroom", "we need one system rather than lots of adapters"],
    disqualifiers: ["Do not position as a generic low-cost switcher.", "Do not assume all conferencing workflows without checking USB path.", "Do not ignore audio/control requirements."],
    caveats: ["Teaching-room workflows need careful USB and audio validation.", "Confirm exact variant and system design before quoting."],
    objectionHandling: [
      { objection: "Can we use a simple switcher?", response: "Possibly for basic source selection. This product becomes relevant when the room also needs USB, audio, hybrid workflow or wider system integration." },
      { objection: "Is this only for education?", response: "Education is the strongest fit, but training rooms and more complex presentation spaces can also be relevant." }
    ],
    attachProducts: [
      { productFamily: "APO audio", reason: "Consider if microphones, speakers or room audio are part of the requirement." },
      { productFamily: "CAM cameras", reason: "Attach where USB or NDI camera workflows are required." },
      { productFamily: "NetworkHD", reason: "Use where the room needs to connect into wider AV distribution." }
    ],
    competitorAngles: [
      { competitorCategory: "education matrix / presentation system", positioningNote: "Compare source count, USB workflow, audio, control and network integration rather than HDMI count alone.", compareSearchTerms: ["education matrix", "presentation switcher", "USB-C matrix"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Use as a classroom standardisation conversation, not just a one-box SKU.",
      DEALER: "Lead with simplifying the teaching-room bill of materials.",
      INTEGRATOR: "USB path, audio and control are the key validation areas.",
      CONSULTANT: "Frame around repeatable teaching-room design and integration.",
      END_USER: "Explain that it helps manage laptops, displays, conferencing devices and audio in a teaching room."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Check whether the room has USB/conferencing and audio needs before suggesting a simpler product.",
      PRODUCT_CALLOUT: "Target universities, colleges and training-room projects.",
      COMPETITOR_DISPLACEMENT: "Compare complete room function, not just input count.",
      PROJECT_DISCOVERY: "Capture sources, displays, USB devices, audio and control.",
      TRAINING: "Use to teach hybrid room qualification."
    },
    followUpWording: "This looks like a teaching or hybrid-presentation space where the requirement is broader than simple HDMI switching. MX-1007-HYB may be relevant if the room needs source switching, USB workflow, display routing, audio and potential wider system integration. We should confirm source count, USB devices, display outputs, audio expectations and control requirements before confirming the design.",
    reviewGates: ["Confirm USB workflow.", "Confirm audio/control needs.", "Confirm source and display count."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "MX-0408-EDU",
    productName: "Education-focused matrix switcher",
    productFamily: "Education Matrix",
    technologyType: "Presentation / education matrix",
    salientPoint: "Fits teaching spaces that need structured source and display routing without overcomplicating the room.",
    oneLinePositioning: "Use this when the room needs an education-focused matrix approach but not the full hybrid requirement of MX-1007-HYB.",
    oneMinuteBrief: "The MX-0408-EDU routes a teaching room's sources to its displays cleanly and predictably, without the USB-conferencing, audio and NetworkHD depth of the MX-1007-HYB. Reach for it when the room just needs solid source-to-display switching for lessons.",
    bestFitApplications: ["classrooms", "seminar rooms", "teaching spaces", "training rooms"],
    weakFitApplications: ["large distributed AV", "complex hybrid USB rooms without validation", "simple one-display huddle rooms"],
    customerProblems: ["The customer has several teaching sources and outputs.", "They need a repeatable room pattern.", "They need more control than a basic switcher."],
    wyrestormFit: ["Strong link into education account development.", "Helps position WyreStorm beyond basic HDMI boxes."],
    openingQuestions: ["How many sources are in the room?", "How many displays or projectors need feeds?", "Is USB/conferencing required?", "Is audio handled separately?", "Is this a standard room type across multiple spaces?"],
    qualificationQuestions: ["Are sources fixed or user-provided?", "Is USB-C required?", "Is there a control system?", "Are there confidence monitors?", "Will this connect to wider AV distribution?"],
    technicalCheckQuestions: ["Confirm exact I/O requirement.", "Confirm USB and audio requirements.", "Confirm control expectations.", "Confirm cable distances.", "Confirm display resolution."],
    listenForTriggers: ["standard classroom", "multiple displays", "lectern input", "teaching station", "confidence monitor"],
    disqualifiers: ["Do not position where AVoIP scale is required.", "Do not assume USB/conferencing support without validation.", "Do not oversell as a full hybrid room system."],
    caveats: ["Check exact model capabilities before final selection.", "Education room design depends heavily on source/display count and USB/audio requirements."],
    objectionHandling: [
      { objection: "Why not just use a switcher?", response: "A switcher may be fine for one output. A matrix is stronger when sources need to be routed to multiple displays or room outputs." }
    ],
    attachProducts: [
      { sku: "MX-1007-HYB", reason: "Step up if the room needs fuller hybrid USB/audio/NetworkHD capability." },
      { productFamily: "SW series", reason: "Consider if the room is simpler and presentation-switcher led." }
    ],
    competitorAngles: [
      { competitorCategory: "education matrix", positioningNote: "Compare I/O, USB-C, control, audio and teaching-room workflow.", compareSearchTerms: ["education matrix", "classroom matrix"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Good education account discussion for repeatable rooms.",
      DEALER: "Use where the room has more than basic switching needs.",
      INTEGRATOR: "Check exact I/O, control and USB/audio separation.",
      CONSULTANT: "Frame as an education-room matrix option.",
      END_USER: "Explain that it helps route teaching sources to room displays."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Check whether this is a matrix requirement or just one-output switching.",
      PRODUCT_CALLOUT: "Target teaching-room refresh opportunities.",
      COMPETITOR_DISPLACEMENT: "Compare teaching-room function, not only ports.",
      PROJECT_DISCOVERY: "Capture room standard, sources, displays and control.",
      TRAINING: "Use to explain switcher versus matrix."
    },
    followUpWording: "This appears to be an education-room routing requirement rather than a simple one-output switching need. MX-0408-EDU may be relevant if the room needs several teaching sources routed to multiple outputs. We should confirm I/O count, USB, audio, control and distance requirements before confirming.",
    reviewGates: ["Confirm exact I/O.", "Confirm USB/audio/control.", "Confirm whether MX-1007-HYB is more appropriate."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "MX-0403-MST",
    productName: "Multi-source presentation switcher / matrix",
    productFamily: "Presentation Matrix",
    technologyType: "Presentation switching",
    salientPoint: "A compact way to manage several room sources where a full matrix or AVoIP system is not justified.",
    oneLinePositioning: "Use this for smaller presentation spaces needing structured source switching and output handling.",
    oneMinuteBrief: "The MX-0403-MST switches a handful of room sources to the room outputs in one tidy unit. It suits meeting, education and presentation rooms that need more than a basic switch but do not justify a large matrix or a networked AV system.",
    bestFitApplications: ["meeting rooms", "training rooms", "small classrooms", "presentation spaces"],
    weakFitApplications: ["large multi-room systems", "premium AVoIP", "complex video wall systems"],
    customerProblems: ["The customer has several local sources.", "The room needs a cleaner presentation flow.", "A full matrix is too much for the application."],
    wyrestormFit: ["Keeps WyreStorm relevant in smaller spaces.", "Creates attach opportunities for USB, audio and display extension."],
    openingQuestions: ["How many sources are local to the room?", "How many outputs are needed?", "Is USB-C or wireless required?", "Are there distance constraints?", "Is the room standalone?"],
    qualificationQuestions: ["Are there fixed sources or mainly laptops?", "Is dual display needed?", "Is audio de-embedding required?", "Is control required?", "Will the room need future expansion?"],
    technicalCheckQuestions: ["Confirm I/O.", "Confirm resolution/HDCP.", "Confirm audio/control.", "Confirm cable distance.", "Confirm power and mounting."],
    listenForTriggers: ["small meeting room", "multiple laptops", "presentation switch", "dual display", "simple room upgrade"],
    disqualifiers: ["Do not position for large scalable distribution.", "Do not ignore USB/wireless requirements.", "Do not use where output count is insufficient."],
    caveats: ["Check exact MST model capability and I/O before selection."],
    objectionHandling: [
      { objection: "Can we use a cheaper switch?", response: "A basic switch may work for a very simple room, but this becomes relevant when output handling, control, audio or a more structured user experience matters." }
    ],
    attachProducts: [
      { productFamily: "SW series", reason: "Consider if wireless presentation is a key requirement." },
      { productFamily: "HDBaseT extenders", reason: "Attach where display distance is beyond local HDMI." }
    ],
    competitorAngles: [
      { competitorCategory: "presentation switcher", positioningNote: "Compare source type, output count, USB-C/wireless, audio and control.", compareSearchTerms: ["presentation switcher", "meeting room switcher"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Good everyday meeting/training-room opportunity.",
      DEALER: "Use when a basic HDMI switch is too limited.",
      INTEGRATOR: "Check output topology, control and audio.",
      CONSULTANT: "Frame around room source management.",
      END_USER: "Explain that it makes it easier to connect and present from multiple sources."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Separate simple switching from matrix/AVoIP early.",
      PRODUCT_CALLOUT: "Target small meeting-room upgrades.",
      COMPETITOR_DISPLACEMENT: "Compare user workflow and I/O.",
      PROJECT_DISCOVERY: "Capture source/output count and USB/wireless needs.",
      TRAINING: "Use for small-room qualification."
    },
    followUpWording: "This sounds like a smaller presentation-room requirement where structured source switching may be enough, rather than a full matrix or AVoIP design. We should confirm source types, output count, USB-C or wireless needs, control, audio and distance before selecting the exact product.",
    reviewGates: ["Confirm exact I/O.", "Confirm wireless/USB-C requirement.", "Confirm whether room needs matrix or AVoIP instead."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "MX-0402-MST",
    productName: "Compact multi-source presentation switcher",
    productFamily: "Presentation Matrix",
    technologyType: "Presentation switching",
    salientPoint: "A compact presentation option for small rooms where a few sources need clean routing to room outputs.",
    oneLinePositioning: "Use this for smaller rooms that need reliable source selection without moving into larger matrix or AVoIP territory.",
    oneMinuteBrief: "The MX-0402-MST gives a small room clean source selection to its display outputs in a single compact unit. Reach for it when a professional presentation setup is wanted but a larger matrix or NetworkHD system would be more than the room needs.",
    bestFitApplications: ["small meeting rooms", "small classrooms", "training rooms", "local presentation spaces"],
    weakFitApplications: ["large matrix systems", "multi-room distribution", "advanced conferencing rooms without USB validation"],
    customerProblems: ["The customer has a few sources and one or two outputs.", "The room needs a more professional presentation setup.", "They do not need a large system."],
    wyrestormFit: ["Protects smaller room opportunities from defaulting to generic switchers.", "Provides a stepping stone into wider WyreStorm room standards."],
    openingQuestions: ["How many sources are required?", "How many displays or outputs are needed?", "Is the room mainly HDMI, USB-C or wireless?", "Is audio required?", "Is any control system involved?"],
    qualificationQuestions: ["Are sources fixed or guest devices?", "Do users need simple front-panel operation?", "Is cable distance an issue?", "Are there expansion plans?", "Is BYOD/BYOM involved?"],
    technicalCheckQuestions: ["Confirm port count.", "Confirm resolution and HDCP.", "Confirm audio/control.", "Confirm output needs.", "Confirm mounting/power."],
    listenForTriggers: ["small room", "simple presentation", "two displays", "guest laptop", "cleaner than a basic HDMI switch"],
    disqualifiers: ["Do not use where output count or feature needs exceed the product.", "Do not position as an AVoIP alternative.", "Do not assume wireless or USB features without checking exact requirements."],
    caveats: ["Small rooms still need proper USB, audio and control questions where relevant."],
    objectionHandling: [
      { objection: "Is this overkill?", response: "For a very basic single-source room it may be. It becomes useful when the customer wants a more reliable and repeatable presentation setup." }
    ],
    attachProducts: [
      { productFamily: "SW series", reason: "Step toward wireless presentation if required." },
      { productFamily: "HDBaseT extenders", reason: "Add where outputs are not local." }
    ],
    competitorAngles: [
      { competitorCategory: "small presentation switcher", positioningNote: "Compare actual source/output requirements and user workflow.", compareSearchTerms: ["small presentation switcher", "HDMI switcher"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Good simple room attach conversation.",
      DEALER: "Use to upgrade from commodity switching.",
      INTEGRATOR: "Check actual feature requirements before selecting.",
      CONSULTANT: "Frame as a compact room switching option.",
      END_USER: "Explain that it provides a cleaner way to manage room sources."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Quickly confirm whether the room is small and local.",
      PRODUCT_CALLOUT: "Useful for small room refresh campaigns.",
      COMPETITOR_DISPLACEMENT: "Compare workflow and I/O, not brand alone.",
      PROJECT_DISCOVERY: "Capture simple source/output facts.",
      TRAINING: "Use to teach when not to over-spec."
    },
    followUpWording: "This looks like a compact room presentation requirement. MX-0402-MST may be suitable if the source and output count are modest and the customer needs a professional room switching experience without a larger matrix or AVoIP system. We should confirm I/O, resolution, audio, control and any wireless or USB expectations.",
    reviewGates: ["Confirm exact source/output count.", "Confirm USB/wireless expectations.", "Confirm product is not under-specified."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "SW-620-TX-W",
    productName: "Wireless presentation switcher",
    productFamily: "Presentation Switcher",
    technologyType: "Wireless / wired presentation switching",
    salientPoint: "A strong meeting-room product when users need wired and wireless presentation in a single room workflow.",
    oneLinePositioning: "Use this when the customer wants a meeting-room presentation switcher with wireless sharing support.",
    oneMinuteBrief: "The SW-620-TX-W lets people share in a meeting room either by plugging in a laptop or casting wirelessly, and sends the chosen source to the screen. Reach for it when easy wired-and-wireless sharing is what the room is really about, not routing many sources to many screens.",
    bestFitApplications: ["meeting rooms", "boardrooms", "training rooms", "BYOD presentation spaces", "dealer demo rooms"],
    weakFitApplications: ["large AV distribution", "rooms needing many outputs", "Teams-certified appliance requirement"],
    customerProblems: ["Users want to present wirelessly.", "Guests need easy laptop connection.", "The room has both wired and wireless presentation needs."],
    wyrestormFit: ["Positions WyreStorm in everyday meeting-room user experience.", "Creates attach paths to USB, cameras, audio and display extension."],
    openingQuestions: ["Do users need wired, wireless or both?", "Which wireless platforms are expected?", "How many sources need to connect?", "How many displays are in the room?", "Is USB conferencing required?"],
    qualificationQuestions: ["Is Teams/Zoom appliance certification required or is BYOD acceptable?", "Are guest networks available?", "Is USB-C required?", "Is dual output required?", "What is the room control expectation?"],
    technicalCheckQuestions: ["Confirm wireless platform requirements.", "Confirm USB/BYOD workflow.", "Confirm outputs.", "Confirm network/access policy.", "Confirm resolution and HDCP."],
    listenForTriggers: ["wireless presentation", "AirPlay", "Miracast", "guest laptop", "BYOD meeting room", "simple user experience"],
    disqualifiers: ["Do not present as a Teams-certified appliance.", "Do not ignore customer IT wireless/network policy.", "Do not use where output/source count exceeds the model."],
    caveats: ["Wireless presentation depends on device support and network/customer policy.", "Confirm BYOD versus certified room-system requirement.", "WyreStorm UC is Zoom-certified, not Teams-certified; Teams rooms must be tested before install."],
    objectionHandling: [
      { objection: "Is this a Teams Room?", response: "No. Position this as BYOD/BYOM presentation switching, not as a certified Teams appliance." },
      { objection: "Can users present wirelessly from any device?", response: "Check the required wireless platforms and customer IT policy before confirming." }
    ],
    attachProducts: [
      { sku: "SW-640-TX-W", reason: "Step up where more inputs or dual-output workflow is required." },
      { productFamily: "CAM cameras", reason: "Attach where conferencing cameras are part of BYOD/BYOM." },
      { productFamily: "APO UC audio", reason: "Attach where room audio/microphone support is needed." }
    ],
    competitorAngles: [
      { competitorCategory: "wireless presentation", positioningNote: "Compare wireless platform support, wired I/O, USB workflow, outputs and IT policy.", compareSearchTerms: ["wireless presentation", "BYOD switcher", "AirPlay Miracast"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Easy call-out product for meeting-room refresh and wireless presentation.",
      DEALER: "Lead with user experience and BYOD/BYOM qualification.",
      INTEGRATOR: "Validate IT policy, wireless protocols, USB and control.",
      CONSULTANT: "Frame as a presentation switcher with wireless sharing, not a certified UC appliance.",
      END_USER: "Explain that it helps users connect and present more easily from laptops and supported wireless devices."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Ask whether they need BYOD/BYOM or a certified Teams/Zoom room.",
      PRODUCT_CALLOUT: "Strong call-out day product for meeting-room upgrades.",
      COMPETITOR_DISPLACEMENT: "Compare wireless and wired workflow, not only wireless brand recognition.",
      PROJECT_DISCOVERY: "Capture sources, displays, wireless, USB and network policy.",
      TRAINING: "Use to explain BYOD versus certified UC room."
    },
    followUpWording: "This sounds like a meeting-room presentation requirement with wireless sharing. SW-620-TX-W may be relevant if the customer needs a combination of wired and wireless presentation in a BYOD/BYOM style room. We should confirm required wireless platforms, USB/conferencing expectations, display outputs, network policy and whether a certified UC appliance is required.",
    reviewGates: ["Confirm BYOD/BYOM vs certified UC appliance.", "Confirm wireless platform support.", "Confirm IT/network policy."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "SW-640-TX-W",
    productName: "Wireless presentation switcher with expanded room capability",
    productFamily: "Presentation Switcher",
    technologyType: "Wireless / wired presentation switching",
    salientPoint: "A step-up presentation switcher for rooms needing more inputs, output flexibility or a stronger meeting-room workflow.",
    oneLinePositioning: "Use this when SW-620-TX-W style wireless presentation is relevant but the room needs more capability.",
    oneMinuteBrief: "The SW-640-TX-W does the same wired-and-wireless room sharing as the SW-620-TX-W but takes more inputs and handles busier rooms - for example more sources or a second display. Reach for it when a compact presentation switcher would run short on connections.",
    bestFitApplications: ["larger meeting rooms", "boardrooms", "training rooms", "dual-display presentation", "BYOD/BYOM spaces"],
    weakFitApplications: ["single-input rooms", "large distributed AV", "certified Teams Room appliance replacement"],
    customerProblems: ["Users need flexible wired and wireless presentation.", "The room has more than a basic single-display requirement.", "Guest and fixed sources need to be handled cleanly."],
    wyrestormFit: ["Shows how WyreStorm can cover the meeting-room source, USB and display workflow.", "Provides natural attach paths to cameras, audio and extension."],
    openingQuestions: ["How many wired sources are required?", "Do users need wireless presentation?", "How many displays or outputs are needed?", "Is USB conferencing involved?", "Is the customer expecting BYOD or a certified room appliance?"],
    qualificationQuestions: ["Which wireless platforms are required?", "Are there fixed room PCs or only laptops?", "Is dual display needed?", "What USB devices are in the room?", "Is local control required?"],
    technicalCheckQuestions: ["Confirm inputs/outputs.", "Confirm wireless support.", "Confirm USB workflow.", "Confirm network policy.", "Confirm resolution/HDCP."],
    listenForTriggers: ["larger meeting room", "dual display", "wireless presentation", "BYOD", "USB camera", "guest presenters"],
    disqualifiers: ["Do not present as a Teams-certified endpoint.", "Do not ignore network/wireless policy.", "Do not recommend if a simple smaller switcher fits better."],
    caveats: ["Confirm exact source/output and USB requirements before selection.", "Wireless performance depends on environment and IT policy.", "WyreStorm UC is Zoom-certified, not Teams-certified; Teams rooms must be tested before install."],
    objectionHandling: [
      { objection: "Why not the smaller model?", response: "Use the smaller model where the room is simpler. Step up when the room has more inputs, outputs or workflow requirements." },
      { objection: "Does this replace a UC codec?", response: "No. It supports BYOD/BYOM room workflows; check whether the customer needs a certified UC appliance." }
    ],
    attachProducts: [
      { sku: "SW-620-TX-W", reason: "Use where the requirement is smaller or simpler." },
      { productFamily: "CAM cameras", reason: "Attach for BYOD/BYOM camera needs." },
      { productFamily: "APO UC audio", reason: "Attach for room microphone/speaker needs." }
    ],
    competitorAngles: [
      { competitorCategory: "wireless meeting-room switcher", positioningNote: "Compare full room workflow: sources, displays, wireless, USB, control and IT policy.", compareSearchTerms: ["wireless switcher", "BYOD meeting room", "presentation switcher"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Use as a step-up meeting-room call-out product.",
      DEALER: "Lead with practical room workflow rather than only wireless casting.",
      INTEGRATOR: "Validate USB, wireless, outputs and control.",
      CONSULTANT: "Frame as a BYOD/BYOM presentation switcher.",
      END_USER: "Explain that it makes meeting-room connection easier for wired and supported wireless users."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Check if the room is beyond the smaller wireless switcher.",
      PRODUCT_CALLOUT: "Target boardroom and training-room refresh.",
      COMPETITOR_DISPLACEMENT: "Compare the complete room workflow.",
      PROJECT_DISCOVERY: "Capture input/output, USB, display and wireless policy.",
      TRAINING: "Use to explain step-up selection."
    },
    followUpWording: "This looks like a meeting-room presentation requirement where wireless sharing and a more capable room workflow may be needed. SW-640-TX-W may be relevant if the room has more inputs, output requirements or USB/BYOD expectations than a smaller switcher can handle. We should confirm sources, displays, wireless protocols, USB devices and IT policy before confirming.",
    reviewGates: ["Confirm inputs/outputs.", "Confirm USB/BYOD workflow.", "Confirm wireless/IT policy."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "MX-0808-KIT-V2",
    productName: "8x8 matrix kit",
    productFamily: "HDBaseT Matrix",
    technologyType: "Matrix switching / HDBaseT distribution",
    salientPoint: "A practical local matrix option for smaller venues and systems where AVoIP is not commercially justified.",
    oneLinePositioning: "Use this when the customer needs straightforward 8x8 source-to-display routing and a local matrix remains the right system shape.",
    oneMinuteBrief: "The MX-0808-KIT-V2 connects up to eight sources to eight displays and lets each screen show whichever source you choose, with matching receivers supplied in the kit. It suits bars, smaller venues and local distribution; move to networked AV when the customer needs to grow well beyond eight screens.",
    bestFitApplications: ["small hospitality venues", "pubs", "small bars", "local TV distribution", "simple source/display routing"],
    weakFitApplications: ["large scalable multi-zone AV", "mixed-resolution estate with expansion needs", "campus-wide distribution"],
    customerProblems: ["The venue needs several sources routed to several screens.", "Budget does not justify AVoIP.", "The customer needs a simple matrix replacement."],
    wyrestormFit: ["Keeps WyreStorm relevant in cost-sensitive hospitality.", "Provides a bridge conversation toward AVoIP for larger opportunities."],
    openingQuestions: ["How many sources and displays are required?", "Are all screens local to the rack area or remote?", "Is 8x8 enough now and later?", "What resolutions are required?", "Is control needed?"],
    qualificationQuestions: ["Are there future expansion plans?", "Are screens showing different content at the same time?", "Are there mixed display capabilities?", "Is there existing cabling?", "Is AVoIP being considered?"],
    technicalCheckQuestions: ["Confirm HDMI/HDCP/resolution requirements.", "Confirm cable distances.", "Confirm included receivers and mirrored outputs.", "Confirm control method.", "Confirm whether AVoIP is more suitable."],
    listenForTriggers: ["pub TV system", "8 by 8 matrix", "Sky boxes", "sports bar screens", "emergency matrix replacement"],
    disqualifiers: ["Do not use where more than 8 outputs are required without expansion plan.", "Do not position as more flexible than AVoIP.", "Do not ignore HDMI 2.0/HDR requirements."],
    caveats: ["Check exact display/source resolution requirements.", "For larger or more flexible systems, consider NetworkHD."],
    objectionHandling: [
      { objection: "Why not AVoIP?", response: "AVoIP may be better for larger or more flexible systems. Matrix can still be the right fit where the system is smaller, local and budget-sensitive." },
      { objection: "Will this handle future expansion?", response: "Only within the matrix limits. If expansion is likely, discuss AVoIP early." }
    ],
    attachProducts: [
      { productFamily: "NetworkHD", reason: "Step up where scale, flexibility or multi-room expansion is needed." },
      { productFamily: "Control accessories", reason: "Attach where the venue needs simple source/screen control." }
    ],
    competitorAngles: [
      { competitorCategory: "HDBaseT matrix", positioningNote: "Compare I/O count, HDMI/HDCP version, distance, receiver inclusion, mirrored outputs and control.", compareSearchTerms: ["8x8 HDBaseT matrix", "hospitality matrix"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Strong practical hospitality stock/opportunity conversation.",
      DEALER: "Use where a matrix is still commercially right.",
      INTEGRATOR: "Check resolution, HDCP, distance and expansion.",
      CONSULTANT: "Frame as a smaller local matrix option, not scalable AVoIP.",
      END_USER: "Explain that it routes several sources to several screens."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Check source/display count and whether matrix is still the right shape.",
      PRODUCT_CALLOUT: "Target pubs, small bars and hospitality refresh.",
      COMPETITOR_DISPLACEMENT: "Compare matrix fundamentals and included receivers.",
      PROJECT_DISCOVERY: "Capture source/display count, distance and expansion.",
      TRAINING: "Use to explain matrix versus AVoIP decision."
    },
    followUpWording: "This sounds like a smaller source-to-display routing requirement where an 8x8 matrix may still be the right commercial and technical shape. MX-0808-KIT-V2 can be considered if the source and display count fits, cable distances are suitable and the customer does not need the scale or flexibility of AVoIP. We should confirm resolution, HDCP, distance, control and future expansion before final selection.",
    reviewGates: ["Confirm 8x8 is enough.", "Confirm HDMI/HDCP/resolution.", "Confirm whether AVoIP should be considered."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "SW-0206-VW",
    productName: "4K60 video wall processor",
    productFamily: "Video Wall Processor",
    technologyType: "Standalone video wall processor",
    salientPoint: "A non-AVoIP video wall option for simpler wall-processing opportunities.",
    oneLinePositioning: "Use this when the customer needs a standalone video wall processor rather than a full AVoIP video wall design.",
    oneMinuteBrief: "The SW-0206-VW drives a video wall from a single processor - one picture spread across the screens, or different content on each - without needing a network. Reach for it when the wall layout is known and fixed, and a full networked AV system would add cost and complexity the job does not need.",
    bestFitApplications: ["small video walls", "retail displays", "hospitality feature walls", "simple control-room walls", "LED/LFD wall processing conversations"],
    weakFitApplications: ["large scalable AVoIP distribution", "multi-room AV routing", "complex walls needing specialist processor features"],
    customerProblems: ["The customer needs a video wall layout.", "They do not need a full AVoIP system.", "They need a simpler wall-processing approach."],
    wyrestormFit: ["Keeps WyreStorm relevant when AVoIP is too much.", "Creates a practical alternative for video wall conversations."],
    openingQuestions: ["What wall layout is required?", "How many source inputs are needed?", "Are displays LFD panels or LED processor inputs?", "Is this standalone or part of a wider AV system?", "What resolution and scaling are required?"],
    qualificationQuestions: ["Does the customer need multiview or video wall processing?", "Is bezel compensation needed?", "Are custom layouts required?", "Is control integration required?", "Are sources local or remote?"],
    technicalCheckQuestions: ["Confirm wall layout.", "Confirm input/output count.", "Confirm resolution and scaling.", "Confirm display/LED processor path.", "Confirm control expectations."],
    listenForTriggers: ["video wall", "2x2", "3x3", "LED processor", "feature wall", "not AVoIP"],
    disqualifiers: ["Do not position as a full AVoIP distribution system.", "Do not assume it handles every custom wall layout.", "Do not confuse multiview with video wall processing."],
    caveats: ["Video wall requirements need layout and resolution validation.", "Confirm whether the source is feeding displays directly or an LED processor."],
    objectionHandling: [
      { objection: "Should this be AVoIP?", response: "If the requirement is wider routing and expansion, AVoIP may be better. If it is a contained wall-processing need, a standalone processor may be more appropriate." },
      { objection: "Is this the same as multiview?", response: "No. Multiview shows multiple sources on one output; video wall processing maps content across multiple outputs/displays." }
    ],
    attachProducts: [
      { sku: "NHD-0401-MV", reason: "Consider where multiview into a wall/processor is required." },
      { productFamily: "NetworkHD", reason: "Step up if the wall is part of larger networked AV distribution." }
    ],
    competitorAngles: [
      { competitorCategory: "video wall processor", positioningNote: "Compare wall layout support, input/output count, resolution, scaling, bezel/custom layout and control.", compareSearchTerms: ["video wall processor", "4K60 video wall"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Important because it avoids forcing every wall opportunity into AVoIP.",
      DEALER: "Use for simpler wall projects and feature displays.",
      INTEGRATOR: "Validate layout, scaling and control.",
      CONSULTANT: "Frame as a standalone wall-processing option.",
      END_USER: "Explain that it helps drive content across a multi-screen wall."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Separate multiview, video wall and AVoIP early.",
      PRODUCT_CALLOUT: "Target retail, hospitality and smaller feature-wall projects.",
      COMPETITOR_DISPLACEMENT: "Compare wall processing features precisely.",
      PROJECT_DISCOVERY: "Capture layout, sources, outputs and control.",
      TRAINING: "Use to teach video wall versus multiview."
    },
    followUpWording: "This appears to be a video wall processing requirement rather than general AV routing. SW-0206-VW may be relevant if the wall can be handled as a standalone processor requirement. We should confirm wall layout, source count, output/display path, resolution, scaling and control expectations before confirming the product.",
    reviewGates: ["Confirm wall layout.", "Confirm multiview vs video wall.", "Confirm resolution/scaling/control."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "CAM-210-NDI-PTZ",
    productName: "NDI PTZ camera",
    productFamily: "Camera / NDI",
    technologyType: "PTZ camera with NDI workflow relevance",
    salientPoint: "A camera option for AV workflows where PTZ capture and NDI/network video are part of the conversation.",
    oneLinePositioning: "Use this when the opportunity includes PTZ camera capture and network-friendly video workflows.",
    oneMinuteBrief: "The CAM-210-NDI-PTZ is a pan-tilt-zoom camera that can send its picture over the network as NDI as well as to a USB or HDMI host, so the room can be seen on calls, recordings and streams. Reach for it when the room needs a proper, controllable camera feeding a real workflow, not a basic fixed webcam.",
    bestFitApplications: ["teaching rooms", "lecture capture", "streaming", "training rooms", "hybrid events", "NDI workflows"],
    weakFitApplications: ["simple USB webcam replacement", "rooms without camera/control requirement", "audio-only conferencing"],
    customerProblems: ["The customer needs better camera capture.", "They want PTZ control.", "They are using or considering NDI.", "They need camera sources in a wider AV system."],
    wyrestormFit: ["Extends WyreStorm beyond source/display routing into capture workflows.", "Connects camera conversations to NetworkHD and bridge/mixer products."],
    openingQuestions: ["Is the camera for conferencing, lecture capture, streaming or monitoring?", "Is NDI required?", "How will the camera feed be used?", "Is PTZ control required?", "Is audio being captured separately?"],
    qualificationQuestions: ["What platform is receiving the camera?", "Is USB, HDMI, SDI or NDI needed?", "How many cameras are required?", "Who controls the camera?", "Is recording or streaming involved?"],
    technicalCheckQuestions: ["Confirm camera output path.", "Confirm NDI network requirements.", "Confirm control method.", "Confirm power/mounting.", "Confirm integration with bridge/mixer or AV system."],
    listenForTriggers: ["NDI camera", "lecture capture", "PTZ", "hybrid teaching", "streaming", "camera into AV system"],
    disqualifiers: ["Do not position as a simple USB webcam without checking workflow.", "Do not ignore audio capture.", "Do not assume NDI is allowed on the customer network."],
    caveats: ["Camera workflows depend on platform, network and control path.", "Confirm SKU naming and regional availability before final selection."],
    objectionHandling: [
      { objection: "Can we just use a webcam?", response: "For simple small rooms, yes. PTZ/NDI becomes relevant when capture quality, control, network video or room coverage matters." }
    ],
    attachProducts: [
      { productFamily: "CAM bridge/mixer", reason: "Use where camera sources need to be converted, mixed or presented to a conferencing platform." },
      { productFamily: "NetworkHD", reason: "Consider where camera feeds need to enter wider AV distribution." }
    ],
    competitorAngles: [
      { competitorCategory: "NDI PTZ camera", positioningNote: "Compare output formats, PTZ control, NDI support, mounting and platform workflow.", compareSearchTerms: ["NDI PTZ camera", "lecture capture camera"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Use as an attach conversation with education and conferencing opportunities.",
      DEALER: "Qualify capture workflow before quoting.",
      INTEGRATOR: "Network, control and platform integration are key.",
      CONSULTANT: "Frame as PTZ capture within a defined AV/NDI workflow.",
      END_USER: "Explain that it provides controllable camera coverage for teaching, streaming or hybrid sessions."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Ask what the camera feed is going into.",
      PRODUCT_CALLOUT: "Target education, training and hybrid event accounts.",
      COMPETITOR_DISPLACEMENT: "Compare workflow, not just camera resolution.",
      PROJECT_DISCOVERY: "Capture platform, output, control, audio and network.",
      TRAINING: "Use to explain camera workflow qualification."
    },
    followUpWording: "This looks like a camera capture requirement where PTZ control and possibly NDI/network video may be relevant. We should confirm whether the camera is for conferencing, lecture capture, streaming or monitoring, and check output format, control method, network policy, mounting and audio workflow before confirming the right product.",
    reviewGates: ["Confirm camera workflow.", "Confirm NDI/network policy.", "Confirm control and audio integration."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "CAM-0402-BRG",
    productName: "Camera bridge / mixer",
    productFamily: "Camera Bridge",
    technologyType: "Camera bridge / source integration",
    salientPoint: "A bridge product for bringing camera and AV sources into conferencing or capture workflows.",
    oneLinePositioning: "Use this when the customer needs to combine or bridge AV/camera sources into a usable conferencing or capture path.",
    oneMinuteBrief: "The CAM-0402-BRG takes several cameras and room sources and hands the meeting, recording or streaming platform one combined feed, so the room is not limited to a single fixed camera. Reach for it when more than one camera or source has to reach the same call or capture.",
    bestFitApplications: ["hybrid teaching", "conference rooms", "lecture capture", "multi-camera rooms", "training spaces"],
    weakFitApplications: ["single webcam rooms", "simple display switching", "audio-only systems"],
    customerProblems: ["The customer has more than one camera or source.", "They need to present AV sources to a conferencing platform.", "They need a bridge between AV and UC/capture."],
    wyrestormFit: ["Connects WyreStorm AV routing with conferencing/capture needs.", "Supports richer room workflows than a simple camera."],
    openingQuestions: ["What sources need to be bridged?", "What platform receives the output?", "How many cameras are involved?", "Is NDI required?", "Is audio handled separately?"],
    qualificationQuestions: ["Is this USB, HDMI, NDI or mixed?", "Do sources need switching or mixing?", "Is the output to a PC, recorder or conferencing appliance?", "Who controls the source selection?", "Is lip-sync or latency critical?"],
    technicalCheckQuestions: ["Confirm input formats.", "Confirm output format.", "Confirm platform compatibility.", "Confirm control requirements.", "Confirm audio path."],
    listenForTriggers: ["camera bridge", "multi-camera", "USB into Teams or Zoom", "lecture capture", "AV source into conferencing"],
    disqualifiers: ["Do not position where a single USB camera is enough.", "Do not ignore audio path.", "Do not assume platform compatibility without checking."],
    caveats: ["Bridge workflows require checking platform, format and audio path.", "NDI variants and SKU availability should be validated."],
    objectionHandling: [
      { objection: "Why do we need a bridge?", response: "A bridge becomes relevant when the room has AV or camera sources that need to be presented cleanly to a conferencing, recording or streaming system." }
    ],
    attachProducts: [
      { productFamily: "CAM cameras", reason: "Attach suitable PTZ or room cameras." },
      { productFamily: "APO UC audio", reason: "Attach where microphone/speaker path needs to be solved." },
      { productFamily: "NetworkHD", reason: "Consider when sources are part of wider AV routing." }
    ],
    competitorAngles: [
      { competitorCategory: "camera bridge", positioningNote: "Compare source formats, USB/platform output, NDI support, control and audio path.", compareSearchTerms: ["camera bridge", "USB capture bridge", "multi camera bridge"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Good attach with camera, USB and hybrid room opportunities.",
      DEALER: "Use when the customer asks how to get AV/camera sources into conferencing.",
      INTEGRATOR: "Validate full signal path and platform behaviour.",
      CONSULTANT: "Frame as a bridge between AV sources and UC/capture workflows.",
      END_USER: "Explain that it helps get cameras and room sources into the call or recording system."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Ask what platform receives the bridged output.",
      PRODUCT_CALLOUT: "Target hybrid teaching and multi-camera meeting-room accounts.",
      COMPETITOR_DISPLACEMENT: "Compare workflow and format support.",
      PROJECT_DISCOVERY: "Capture source formats, output platform and audio.",
      TRAINING: "Use to explain AV-to-UC bridging."
    },
    followUpWording: "This looks like an AV-to-conferencing or capture bridge requirement. We should confirm the source formats, number of cameras, output platform, audio path, NDI requirement and control expectations before selecting the right bridge or mixer product.",
    reviewGates: ["Confirm source/output formats.", "Confirm platform compatibility.", "Confirm audio path."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "APO-VX20-UC-V2",
    productName: "Apollo VX20 all-in-one UC video bar",
    productFamily: "Apollo / UC",
    technologyType: "All-in-one UC video bar",
    salientPoint: "An all-in-one camera, microphone and speaker bar for small meeting and BYOD rooms - one neat device instead of separate kit.",
    oneLinePositioning: "Use this when a small room needs camera, microphone and speaker for video calls in one simple device.",
    oneMinuteBrief: "The APO-VX20-UC-V2 is an all-in-one UC video bar - camera, microphone and speaker in a single unit on the screen - that makes a small meeting or BYOD room work properly for video calls. Reach for it when the room wants a neat one-device upgrade over a laptop webcam, without building a full installed AV system.",
    bestFitApplications: ["small huddle rooms", "BYOD meeting rooms", "USB conferencing", "simple UC spaces"],
    weakFitApplications: ["large divisible rooms", "complex DSP audio", "large lecture theatres"],
    customerProblems: ["The room can show video, but call audio is still the weak point.", "They need a simple way to make a small BYOD room usable without designing a full DSP system.", "The rep needs a compact UC audio answer that keeps the opportunity moving."],
    wyrestormFit: ["Lets the rep add a credible room-audio layer to presentation and camera opportunities.", "Keeps the sale focused on whether the room actually works for meetings, not just whether content appears on screen."],
    openingQuestions: ["How many people are in the room?", "Is this for Teams/Zoom/BYOD calls?", "What camera is being used?", "Is the PC/laptop host in the room?", "Is existing audio being reused?"],
    qualificationQuestions: ["What pickup distance is needed?", "Is expansion required?", "Is room noise a concern?", "Does the customer need table or installed audio?", "Is DSP already specified?"],
    technicalCheckQuestions: ["Confirm room size.", "Confirm USB host path.", "Confirm acoustic expectations.", "Confirm camera/platform.", "Confirm whether larger APO audio is required."],
    listenForTriggers: ["The room is fine for presentation but poor on calls.", "They just need a small room to work for BYOD meetings.", "Audio is the weak point, not the display.", "It is a huddle room and they want fewer boxes."],
    disqualifiers: ["Do not position for large rooms without audio design review.", "Do not replace a specified DSP system casually.", "Do not ignore microphone pickup distance."],
    caveats: ["Room audio depends on acoustics, room size and user behaviour.", "WyreStorm UC is Zoom-certified, not Teams-certified; Teams rooms must be tested before install.", "Escalate complex rooms for audio review."],
    objectionHandling: [
      { objection: "Can the display speakers do this?", response: "Display speakers may be enough for playback, but conferencing needs microphone pickup and echo-controlled audio path." }
    ],
    attachProducts: [
      { productFamily: "SW presentation switchers", reason: "Attach to BYOD/BYOM presentation rooms." },
      { productFamily: "CAM cameras", reason: "Attach where video conferencing is also required." }
    ],
    competitorAngles: [
      { competitorCategory: "USB conferencing audio", positioningNote: "Compare room size, pickup range, host path and platform workflow.", compareSearchTerms: ["USB speakerphone", "UC audio"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Good attach to meeting-room switcher/camera opportunities.",
      DEALER: "Use to avoid selling video without audio.",
      INTEGRATOR: "Validate room size and acoustics.",
      CONSULTANT: "Frame as compact UC audio, not a DSP replacement.",
      END_USER: "Explain that it helps people hear and be heard in smaller calls."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Ask about room size and number of users.",
      PRODUCT_CALLOUT: "Attach to BYOD room conversations.",
      COMPETITOR_DISPLACEMENT: "Compare room suitability rather than brand alone.",
      PROJECT_DISCOVERY: "Capture room size, host path, camera and acoustic expectations.",
      TRAINING: "Use to teach why audio must be asked about."
    },
    followUpWording: "This sounds like a small-room meeting problem where video alone is not enough. APO-VX20-UC-V2 is the WyreStorm conversation when the rep needs a compact audio path that makes a BYOD or UC room actually usable. Before quote, confirm participant count, room size, host workflow, camera/platform path and whether the space is still simple enough to avoid a larger audio design.",
    reviewGates: ["Confirm room size.", "Confirm USB host path.", "Confirm audio pickup expectations."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  },
  {
    sku: "APO-210-UC",
    productName: "Table UC microphone / speaker solution",
    productFamily: "APO UC Audio",
    technologyType: "UC table audio",
    salientPoint: "A meeting-room UC audio option where table pickup and speaker coverage are central to the room experience.",
    oneLinePositioning: "Use this when the room needs a more capable table audio experience for UC calls.",
    oneMinuteBrief: "The APO-210-UC handles meeting-room call audio - picking up voices around the table and playing the far end clearly back into the room - so a BYOD or UC space sounds as good as it looks on screen. Pair it with camera, presentation-switcher and BYOD/BYOM conversations where audio would otherwise be the weak point.",
    bestFitApplications: ["meeting rooms", "training rooms", "BYOD/BYOM spaces", "rooms needing table audio pickup"],
    weakFitApplications: ["large DSP-led rooms", "auditoriums", "audio-only installations without UC need"],
    customerProblems: ["Participants cannot be heard clearly.", "The room needs a table microphone/speaker approach.", "The customer is building a BYOD/BYOM room."],
    wyrestormFit: ["Gives the rep a stronger meeting-table audio answer when the room is beyond basic speakerphone pickup.", "Creates a natural reason to qualify the call experience before the project is sold as finished."],
    openingQuestions: ["How many people use the room?", "What is the table size?", "Is the room BYOD/BYOM?", "What camera is specified?", "Is there existing room audio?"],
    qualificationQuestions: ["What pickup range is needed?", "Is expansion needed?", "Is the room acoustically difficult?", "Is a DSP specified?", "What host device is used?"],
    technicalCheckQuestions: ["Confirm pickup distance.", "Confirm USB/audio path.", "Confirm room size.", "Confirm platform/host.", "Confirm whether DSP/audio design is required."],
    listenForTriggers: ["People at the far end of the table are not being heard.", "The room works until more people join the call.", "They need better table coverage, not a whole new system.", "Speakerphone audio is the complaint."],
    disqualifiers: ["Do not position as a full DSP system.", "Do not ignore room acoustics.", "Do not use for large rooms without review."],
    caveats: ["Audio performance depends on room size, acoustics and user placement.", "WyreStorm UC is Zoom-certified, not Teams-certified; Teams rooms must be tested before install.", "Escalate complex spaces."],
    objectionHandling: [
      { objection: "Why not use the laptop microphone?", response: "Laptop microphones are not designed for a meeting table. A room audio product gives a more reliable experience for participants." }
    ],
    attachProducts: [
      { productFamily: "SW wireless/presentation switchers", reason: "Attach to BYOD/BYOM meeting rooms." },
      { productFamily: "CAM cameras", reason: "Attach with room camera requirement." }
    ],
    competitorAngles: [
      { competitorCategory: "UC table audio", positioningNote: "Compare pickup distance, table size, USB path, expansion and room suitability.", compareSearchTerms: ["UC table microphone", "speakerphone"] }
    ],
    audienceNotes: {
      DISTRIBUTOR: "Good attach opportunity with meeting-room products.",
      DEALER: "Lead with meeting experience, not only video.",
      INTEGRATOR: "Validate room acoustics and USB path.",
      CONSULTANT: "Frame as UC table audio, not installed DSP.",
      END_USER: "Explain that it improves how people hear and are heard in calls."
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Ask table size and user count early.",
      PRODUCT_CALLOUT: "Attach to meeting-room refresh campaigns.",
      COMPETITOR_DISPLACEMENT: "Compare real room suitability.",
      PROJECT_DISCOVERY: "Capture room size, user count, host and acoustics.",
      TRAINING: "Use to teach audio qualification."
    },
    followUpWording: "This sounds like a table-coverage issue rather than a switching issue. APO-210-UC is the right WyreStorm path when the room needs a more credible meeting-table audio experience without immediately moving into full DSP audio. Before quote, confirm room size, table layout, participant count, host path and whether the room has really crossed into a larger audio-design requirement.",
    reviewGates: ["Confirm room size/table layout.", "Confirm USB host path.", "Confirm whether DSP/audio design is needed."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  }
];

type CuratedSkuSeed = {
  sku: string;
  productName: string;
  productFamily: string;
  technologyType: string;
  salientPoint: string;
  jobToBeDone: string;
  bestFitApplications: string[];
  weakFitApplications: string[];
  customerProblems?: string[];
  wyrestormFit?: string[];
  openingQuestions?: string[];
  qualificationQuestions?: string[];
  technicalCheckQuestions?: string[];
  listenForTriggers?: string[];
  followUpWording?: string;
  disqualifiers?: string[];
  caveats?: string[];
  attachProducts?: ProductPositioningAttachProduct[];
  competitorCategory?: string;
  competitorSearchTerms?: string[];
  reviewGates?: string[];
};

function createExpandedProductPositioningCard(seed: CuratedSkuSeed): ProductPositioningCard {
  const customerProblems = seed.customerProblems ?? [
    `The customer needs ${seed.jobToBeDone}.`,
    "The salesperson needs to explain the product by room outcome rather than by model number.",
    "The design has at least one dependency that should be checked before quoting.",
  ];
  const openingQuestions = seed.openingQuestions ?? [
    "What is the room or site trying to achieve?",
    "How many sources, displays and users are involved?",
    "Is this standalone, matrix-led, UC-led or AV-over-IP-led?",
    "What is already installed that must be reused?",
    "Who will operate or support the system day to day?",
  ];
  const qualificationQuestions = seed.qualificationQuestions ?? [
    "Which signal formats and resolutions must be supported?",
    "Are USB, audio, control, network or power requirements part of the brief?",
    "Is the requirement fixed now or expected to expand?",
    "Does the customer need a simple user workflow or an integrator-managed system?",
  ];
  const technicalCheckQuestions = seed.technicalCheckQuestions ?? [
    "Confirm source count, display count and signal format.",
    "Confirm distance, cable type and infrastructure.",
    "Confirm USB, audio, control and network requirements.",
    "Confirm the exact SKU and regional availability before quoting.",
  ];
  const listenForTriggers = seed.listenForTriggers ?? [
    "We need a cleaner room workflow.",
    "The current system has too many boxes.",
    "Users struggle to connect reliably.",
    "The room needs to be easier to support.",
  ];
  const disqualifiers = seed.disqualifiers ?? [
    "Do not position where a simpler extender, switcher or accessory is enough.",
    "Do not assume USB, audio, control or network behaviour without checking the signal path.",
    "Do not quote into a governed project without confirming compatibility and dependencies.",
  ];
  const caveats = seed.caveats ?? [
    "Confirm the complete signal path before presenting as quote-ready.",
    "Use the official product page and current stock/region data before final selection.",
  ];
  const reviewGates = seed.reviewGates ?? technicalCheckQuestions.slice(0, 3);
  const compareSearchTerms = seed.competitorSearchTerms ?? [seed.technologyType, seed.productFamily, seed.sku];

  return {
    sku: seed.sku,
    productName: seed.productName,
    productFamily: seed.productFamily,
    technologyType: seed.technologyType,
    salientPoint: seed.salientPoint,
    oneLinePositioning: `Use this when ${seed.jobToBeDone}.`,
    oneMinuteBrief: `${seed.salientPoint} Before quoting, confirm what connects on each side - source, display, USB, audio and control - so the fit is real rather than assumed.`,
    bestFitApplications: seed.bestFitApplications,
    weakFitApplications: seed.weakFitApplications,
    customerProblems,
    wyrestormFit: seed.wyrestormFit ?? [
      "Gives the salesperson a clear WyreStorm option for the application.",
      "Keeps the discussion tied to the room workflow and required checks.",
      "Creates a route into companion products where the project needs a complete signal path.",
    ],
    openingQuestions,
    qualificationQuestions,
    technicalCheckQuestions,
    listenForTriggers,
    disqualifiers,
    caveats,
    objectionHandling: [
      {
        objection: "Is this the right product, or just the nearest SKU?",
        response: "Use it only when the application and signal path match. Confirm the review gates before treating it as quote-ready.",
      },
      {
        objection: "Can we use a cheaper box?",
        response: "Possibly. First check whether the cheaper option covers the same source, display, USB, audio, control and support requirements.",
      },
    ],
    attachProducts: seed.attachProducts ?? [
      { productFamily: "Cables and installation accessories", reason: "Confirm the physical signal path and power approach before quoting." },
      { productFamily: "Control or room interface", reason: "Attach when users need a repeatable room workflow rather than manual source changes." },
    ],
    competitorAngles: [
      {
        competitorCategory: seed.competitorCategory ?? seed.technologyType,
        positioningNote: "Compare the application, I/O, transport, USB/audio/control behaviour and required infrastructure before claiming equivalence.",
        compareSearchTerms,
      },
    ],
    audienceNotes: {
      DISTRIBUTOR: "Lead with the application and the attach opportunity, then check whether the account needs a simpler or larger system shape.",
      DEALER: "Keep the talk track practical: what connects, what the user does, and what must be checked before quote.",
      INTEGRATOR: "Validate signal path, infrastructure, control and commissioning dependencies before committing the SKU.",
      CONSULTANT: "Frame as a product option inside a defined system architecture, not as a generic substitute.",
      END_USER: "Explain the room outcome in plain English and avoid model-number-only language.",
      INTERNAL_SALES: "Use this as a curated starter card; escalate unclear design dependencies before quoting.",
    },
    callModeNotes: {
      INBOUND_SUPPORT: "Start by separating the real application from the product name the caller mentioned.",
      PRODUCT_CALLOUT: "Use this with accounts where the application is common and the product opens useful attach questions.",
      COMPETITOR_DISPLACEMENT: "Compare like-for-like only after checking I/O, transport, USB, audio, control and infrastructure.",
      PROJECT_DISCOVERY: "Capture the review gates before moving the SKU into proposal support.",
      TRAINING: "Use this card to teach when the SKU is a good fit and when to slow down.",
    },
    followUpWording: `Based on the requirement, ${seed.sku} may be relevant where ${seed.jobToBeDone}. Before we treat it as quote-ready, we should confirm ${reviewGates.map((item) => item.replace(/\.$/, "").toLowerCase()).join(", ")}.`,
    reviewGates,
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-07",
  };
}

const EXPANDED_PRODUCT_POSITIONING_SEEDS: CuratedSkuSeed[] = [
  {
    sku: "AMP-2120-DNT",
    productName: "Advanced Dante amplifier",
    productFamily: "Audio / Dante",
    technologyType: "Dante installed audio amplifier",
    salientPoint: "A useful audio product where the room needs installed loudspeaker power and Dante/network audio is part of the design.",
    jobToBeDone: "the room needs installed loudspeaker output with Dante or network-audio coordination",
    bestFitApplications: ["teaching rooms", "training rooms", "meeting rooms", "hospitality audio zones"],
    weakFitApplications: ["USB speakerphone-only rooms", "large DSP-led audio designs without review", "rooms using display speakers only"],
    customerProblems: ["The video path is clear but the loudspeaker/audio path has not been designed.", "The room needs a proper installed audio output, not just monitor speakers.", "The project includes Dante or network audio requirements."],
    openingQuestions: ["How many loudspeakers and zones are required?", "Is Dante already specified or already on site?", "What source feeds the amplifier?", "Who will commission the audio path?"],
    technicalCheckQuestions: ["Confirm loudspeaker load and power requirement.", "Confirm Dante/network audio path.", "Confirm control and commissioning responsibility.", "Confirm whether DSP or AEC is handled elsewhere."],
    attachProducts: [
      { productFamily: "APO UC audio", reason: "Use where the same room also needs conferencing microphone/speaker workflow." },
      { productFamily: "Presentation switchers", reason: "Attach when the amplifier is part of a teaching or meeting-room signal path." },
    ],
    competitorCategory: "Dante amplifier",
    competitorSearchTerms: ["Dante amplifier", "network amplifier", "installed audio amplifier"],
  },
  {
    sku: "AMP-260-DNT",
    productName: "120W network amplifier",
    productFamily: "Audio / Dante",
    technologyType: "Network audio amplifier",
    salientPoint: "A compact network amplifier option where room audio needs to be treated as part of the AV system.",
    jobToBeDone: "the customer needs a network-aware amplifier for installed room audio",
    bestFitApplications: ["small teaching rooms", "meeting rooms", "retail audio zones", "hospitality spaces"],
    weakFitApplications: ["large divisible rooms", "DSP-heavy auditoriums", "rooms needing only USB table audio"],
    openingQuestions: ["What loudspeakers are being driven?", "Is the audio local, networked or Dante-led?", "Is this playback audio, conferencing audio or both?", "How will volume be controlled?"],
    technicalCheckQuestions: ["Confirm speaker impedance/load.", "Confirm audio source and network path.", "Confirm volume/control method.", "Confirm installation location and power."],
    competitorCategory: "network amplifier",
    competitorSearchTerms: ["120W network amplifier", "Dante amplifier", "installed AV amplifier"],
  },
  {
    sku: "APO-COM-MIC",
    productName: "Apollo companion microphone",
    productFamily: "APO UC Audio",
    technologyType: "UC companion microphone",
    salientPoint: "An attach product for rooms where Apollo UC coverage needs to extend across the table.",
    jobToBeDone: "the meeting table needs better microphone coverage than the main UC device alone can provide",
    bestFitApplications: ["meeting rooms", "boardrooms", "BYOD UC spaces", "training rooms"],
    weakFitApplications: ["rooms without Apollo UC products", "large DSP-designed spaces", "audio-only rooms with no UC workflow"],
    customerProblems: ["The call is intelligible near the bar, but not across the full table.", "The customer wants better pickup without redesigning the entire room audio system.", "The rep needs a low-friction way to fix weak UC coverage."],
    wyrestormFit: ["Gives the rep a practical fix for poor table pickup without reopening the whole AV design.", "Useful when the complaint is call intelligibility, not lack of video features."],
    openingQuestions: ["Which Apollo product is in the room?", "How large is the table?", "Where do people sit?", "Is the far end complaining about pickup?"],
    technicalCheckQuestions: ["Confirm Apollo compatibility.", "Confirm pickup coverage and table layout.", "Confirm cable route and placement.", "Confirm Teams rooms are tested before install."],
    caveats: ["WyreStorm UC is Zoom-certified, not Teams-certified; Teams rooms must be tested before install.", "Confirm compatibility with the selected Apollo host product."],
    listenForTriggers: ["People around the table are not being heard clearly.", "The room audio is close, but still missing the far end.", "They need better pickup without rebuilding the room.", "The call problem is the microphone coverage."],
    attachProducts: [
      { sku: "APO-210-UC", reason: "Primary UC table audio context for companion microphone discussions." },
      { sku: "APO-VX20-UC-V2", reason: "Consider where the room needs a compact UC audio path instead." },
    ],
    competitorCategory: "UC expansion microphone",
    competitorSearchTerms: ["companion microphone", "UC expansion microphone", "speakerphone expansion mic"],
    followUpWording: "This sounds like a table-coverage problem rather than a whole-room redesign. APO-COM-MIC is the right conversation when the Apollo host is close to working but still not giving enough pickup across the table. Before quote, confirm host compatibility, seating layout, cable path and whether one companion mic is enough or the room needs a larger audio solution.",
    reviewGates: ["Confirm Apollo compatibility.", "Confirm pickup coverage and table layout.", "Confirm whether one companion mic is enough."],
  },
  {
    sku: "APO-DG2-PRO",
    productName: "Apollo wireless casting and conferencing dongle",
    productFamily: "APO UC / Wireless",
    technologyType: "USB-C wireless presentation and conferencing dongle",
    salientPoint: "A practical accessory when the customer wants a simpler wireless casting or wireless conferencing user action.",
    jobToBeDone: "users need a straightforward wireless presentation or conferencing connection from their laptop",
    bestFitApplications: ["BYOD meeting rooms", "training rooms", "executive spaces", "guest presentation spaces"],
    weakFitApplications: ["fixed PC rooms with no guest laptops", "rooms where wireless is prohibited", "high-security sites without IT approval"],
    customerProblems: ["Guests want to present quickly without learning the room.", "The customer wants a cleaner wireless workflow than passing cables around the table.", "The rep needs an answer for laptop-led collaboration without overcomplicating the room."],
    wyrestormFit: ["Lets the rep lead with user experience instead of another cable-only room story.", "Useful when the sale depends on making guest presentation and BYOD flow feel simpler."],
    openingQuestions: ["Is wireless presentation allowed by IT?", "Is this for casting only or conferencing as well?", "What host laptops are common?", "How many dongles does the site need?"],
    technicalCheckQuestions: ["Confirm Apollo ecosystem compatibility.", "Confirm wireless policy.", "Confirm USB-C host expectations.", "Confirm conferencing platform testing."],
    caveats: ["WyreStorm UC is Zoom-certified, not Teams-certified; Teams rooms must be tested before install.", "Wireless use depends on customer IT policy and room workflow."],
    listenForTriggers: ["Guests hate plugging into the room.", "They want wireless presentation without confusion.", "The room works technically but users still struggle.", "They need a smoother BYOD presentation flow."],
    competitorCategory: "wireless presentation dongle",
    competitorSearchTerms: ["wireless casting dongle", "wireless conferencing dongle", "USB-C presentation dongle"],
    followUpWording: "This sounds like a user-experience problem more than a signal-routing problem. APO-DG2-PRO is worth bringing in when the room needs faster guest presentation, easier BYOD use and less friction around how people connect. Before quote, confirm Apollo ecosystem fit, customer wireless policy, host laptop expectations and whether the workflow is casting only or includes conferencing handoff.",
    reviewGates: ["Confirm Apollo ecosystem compatibility.", "Confirm wireless policy.", "Confirm host and conferencing workflow."],
  },
  {
    sku: "CAM-0402-NDI-BRG",
    productName: "4K multi-camera video bridge with USB, HDMI and NDI",
    productFamily: "Camera / Capture",
    technologyType: "Multi-camera bridge",
    salientPoint: "A stronger answer when the room needs several cameras or AV sources presented into a conferencing or capture workflow.",
    jobToBeDone: "camera and AV sources need to be bridged into USB, HDMI or NDI workflows",
    bestFitApplications: ["hybrid teaching", "lecture capture", "multi-camera training rooms", "conference rooms"],
    weakFitApplications: ["single webcam rooms", "audio-only conferencing", "rooms without camera switching or bridging"],
    openingQuestions: ["How many cameras or sources need to be bridged?", "What platform receives the output?", "Is NDI required on the network?", "Is audio handled separately?"],
    technicalCheckQuestions: ["Confirm input and output formats.", "Confirm USB host and NDI network requirements.", "Confirm control method.", "Confirm audio path and lip-sync expectations."],
    attachProducts: [
      { productFamily: "CAM PTZ cameras", reason: "Attach where the bridge is fed by room cameras." },
      { productFamily: "APO UC audio", reason: "Attach where the room also needs microphone/speaker capture." },
    ],
    competitorCategory: "multi-camera bridge",
    competitorSearchTerms: ["camera bridge", "NDI bridge", "USB capture bridge", "multi camera conference bridge"],
  },
  {
    sku: "CAM-420-PTZ",
    productName: "4K dual-lens AI PTZ camera",
    productFamily: "Camera / Capture",
    technologyType: "AI PTZ camera",
    salientPoint: "A camera option for rooms where coverage, framing and presenter visibility matter more than a basic webcam.",
    jobToBeDone: "the room needs controllable camera coverage with higher-quality capture",
    bestFitApplications: ["teaching rooms", "training spaces", "large meeting rooms", "hybrid events"],
    weakFitApplications: ["small huddle rooms with one close participant", "audio-only rooms", "rooms with no camera control requirement"],
    openingQuestions: ["What area must the camera cover?", "Is the use case conferencing, lecture capture or streaming?", "Who controls camera presets?", "Is audio captured separately?"],
    technicalCheckQuestions: ["Confirm camera output path.", "Confirm mounting and field of view.", "Confirm control method.", "Confirm platform and audio workflow."],
    competitorCategory: "AI PTZ camera",
    competitorSearchTerms: ["4K PTZ camera", "AI PTZ camera", "dual lens PTZ camera"],
  },
  {
    sku: "EX-100-H2",
    productName: "4K60 HDBT 2.0 extender set",
    productFamily: "HDBaseT Extenders",
    technologyType: "HDBaseT extension",
    salientPoint: "A point-to-point extension option when the job is a known source-to-display run rather than a switching or AVoIP design.",
    jobToBeDone: "one HDMI source needs to reach one display over a longer cable run",
    bestFitApplications: ["meeting rooms", "teaching rooms", "signage displays", "simple source extension"],
    weakFitApplications: ["multi-source switching", "matrix routing", "large distributed AV"],
    openingQuestions: ["What is the source and what is the display?", "What is the cable distance and cable grade?", "Is control or IR required?", "Is this one-to-one or part of a wider system?"],
    technicalCheckQuestions: ["Confirm distance and cable category.", "Confirm resolution and HDR/HDCP needs.", "Confirm control, audio and power requirements.", "Confirm whether a switcher or matrix is actually required."],
    competitorCategory: "HDBaseT extender",
    competitorSearchTerms: ["HDBaseT extender", "4K60 extender", "HDMI over Cat extender"],
  },
  {
    sku: "EX-100-USB3",
    productName: "USB 3.2 HDBaseT-USB3 extender",
    productFamily: "USB Extension",
    technologyType: "USB 3 extension",
    salientPoint: "Use when USB peripherals need reliable extension, especially cameras or devices that cannot sit next to the host PC.",
    jobToBeDone: "USB devices need to be extended between the room equipment and host computer",
    bestFitApplications: ["USB camera extension", "UC rooms", "interactive teaching rooms", "KVM-style support workflows"],
    weakFitApplications: ["video-only extension", "USB 2-only low-cost accessory needs", "rooms where the host can be local"],
    openingQuestions: ["Which USB devices are being extended?", "Is USB 3 bandwidth needed?", "Where is the host PC?", "Is video also being extended separately?"],
    technicalCheckQuestions: ["Confirm USB device types and bandwidth.", "Confirm host location and cable route.", "Confirm power requirements.", "Confirm whether video, audio or control also need products."],
    competitorCategory: "USB extender",
    competitorSearchTerms: ["USB 3 extender", "HDBaseT USB extender", "USB camera extender"],
  },
  {
    sku: "EX-100-KVM",
    productName: "KVM-capable HDBaseT extender set",
    productFamily: "KVM / Extension",
    technologyType: "HDBaseT KVM extension",
    salientPoint: "Useful where a user needs keyboard, mouse or USB control of a source from the display or operator position.",
    jobToBeDone: "video and USB control need to be extended together for a workstation or operator workflow",
    bestFitApplications: ["operator desks", "training rooms", "remote PC control", "support and demonstration spaces"],
    weakFitApplications: ["display-only extension", "multi-user KVM matrices", "USB camera-only rooms"],
    openingQuestions: ["What USB devices need to follow the video?", "Where is the PC or source located?", "How far is the operator position?", "Is this one workstation or multiple workstations?"],
    technicalCheckQuestions: ["Confirm USB device type.", "Confirm resolution and distance.", "Confirm latency tolerance.", "Confirm whether a full KVM matrix is required."],
    competitorCategory: "KVM extender",
    competitorSearchTerms: ["KVM extender", "HDBaseT KVM", "USB HDMI extender"],
  },
  {
    sku: "EX-35-8K",
    productName: "35m HDMI 2.1 8K HDBaseT extender",
    productFamily: "8K / HDBaseT Extension",
    technologyType: "HDMI 2.1 / 8K extension",
    salientPoint: "A short-run premium extender where HDMI 2.1 or 8K capability is genuinely part of the brief.",
    jobToBeDone: "a high-bandwidth HDMI 2.1 or 8K signal needs extension over a controlled distance",
    bestFitApplications: ["high-end residential", "premium display rooms", "gaming or simulation spaces", "demonstration spaces"],
    weakFitApplications: ["standard 1080p rooms", "budget signage", "long-run matrix or AVoIP projects"],
    openingQuestions: ["Is HDMI 2.1 or 8K actually required?", "What is the exact distance?", "What source and display are being used?", "Are gaming features or high refresh rates required?"],
    technicalCheckQuestions: ["Confirm resolution, refresh and HDR requirement.", "Confirm distance and cable grade.", "Confirm HDMI 2.1 feature expectations.", "Confirm HDCP and audio requirements."],
    competitorCategory: "8K HDMI extender",
    competitorSearchTerms: ["8K extender", "HDMI 2.1 extender", "35m HDBaseT extender"],
  },
  {
    sku: "EX-70-H2",
    productName: "4K60 HDBT extender set",
    productFamily: "HDBaseT Extenders",
    technologyType: "HDBaseT extension",
    salientPoint: "A practical one-source-to-one-display extender for common 4K60 room runs.",
    jobToBeDone: "a 4K source needs to reach a display over a structured cable run",
    bestFitApplications: ["meeting rooms", "classrooms", "digital signage", "single-display installs"],
    weakFitApplications: ["multi-display routing", "USB-heavy UC rooms", "AVoIP distribution"],
    openingQuestions: ["What distance is required?", "What resolution and refresh rate are needed?", "Is control or audio needed?", "Is a switcher required before the extender?"],
    technicalCheckQuestions: ["Confirm distance and cable category.", "Confirm resolution and HDCP.", "Confirm power method.", "Confirm control and audio requirements."],
    competitorCategory: "HDBaseT extender",
    competitorSearchTerms: ["70m HDBaseT extender", "4K60 extender", "HDMI over Cat extender"],
  },
  {
    sku: "EX3-100-EARC",
    productName: "HDBaseT 3.0 extender with eARC relevance",
    productFamily: "HDBaseT 3.0 Extension",
    technologyType: "HDBaseT 3.0 extension",
    salientPoint: "A stronger extender conversation where modern HDMI, audio-return or premium display workflows must be considered.",
    jobToBeDone: "a premium source/display link needs HDBaseT 3.0-class extension and audio-path checks",
    bestFitApplications: ["premium meeting rooms", "residential media spaces", "boardrooms", "display extension with audio-return needs"],
    weakFitApplications: ["simple low-cost extension", "matrix routing", "rooms where audio return is irrelevant"],
    openingQuestions: ["Is eARC or display audio return required?", "What source and display are involved?", "What distance and cable grade are available?", "Are control and audio de-embed needed?"],
    technicalCheckQuestions: ["Confirm HDMI/audio return requirements.", "Confirm distance and cable category.", "Confirm HDCP and resolution.", "Confirm control and audio routing."],
    competitorCategory: "HDBaseT 3.0 extender",
    competitorSearchTerms: ["HDBaseT 3 extender", "eARC extender", "4K60 HDBaseT extender"],
  },
  {
    sku: "MV-0401-PRO",
    productName: "4-input 4K60 multiview processor",
    productFamily: "Video Wall / Multiview",
    technologyType: "4K multiview processing",
    salientPoint: "Use when the customer needs several sources visible on one screen or processor feed, not just a source switch.",
    jobToBeDone: "multiple sources need to be viewed together on one output canvas",
    bestFitApplications: ["control rooms", "sports bars", "education preview displays", "LED processor feeds"],
    weakFitApplications: ["full matrix routing", "large AVoIP distribution", "simple source switching"],
    openingQuestions: ["How many sources must be visible at once?", "Is the output a display, recorder or LED processor?", "Do users need fixed or selectable layouts?", "Is audio required from one source?"],
    technicalCheckQuestions: ["Confirm source count and output resolution.", "Confirm layout requirements.", "Confirm HDCP and audio expectations.", "Confirm whether video wall processing is also needed."],
    competitorCategory: "multiview processor",
    competitorSearchTerms: ["4K multiviewer", "quad viewer", "multiview processor"],
  },
  {
    sku: "MX-0404-SCL",
    productName: "4x4 HDMI matrix with scaling",
    productFamily: "Matrix / Routing",
    technologyType: "HDMI matrix switching",
    salientPoint: "A matrix option for local source-to-display routing where four sources and four displays need predictable HDMI management.",
    jobToBeDone: "several local HDMI sources need to be routed to several local displays",
    bestFitApplications: ["meeting suites", "training rooms", "small hospitality systems", "retail display control"],
    weakFitApplications: ["distributed building-wide AV", "USB conferencing workflows", "single-display switcher jobs"],
    customerProblems: ["The customer needs a clean local 4x4 routing answer without jumping into AVoIP.", "The rep needs to hold the sale on a contained matrix rather than let it drift into over-designed architecture.", "The job needs predictable routing, not a generic HDMI box guess."],
    wyrestormFit: ["Lets the rep defend a right-sized WyreStorm matrix instead of overselling networked distribution.", "Works well when the job is local, known and margin is protected by staying on the correct system shape."],
    openingQuestions: ["How many sources and displays are required?", "Are displays the same resolution?", "Is scaling needed?", "Who controls the routing?"],
    technicalCheckQuestions: ["Confirm source and display count.", "Confirm resolution and scaling requirements.", "Confirm HDCP and EDID handling.", "Confirm control method."],
    listenForTriggers: ["We need four sources across a few displays.", "This is a local matrix job, not a network project.", "They want reliable routing without IT involvement.", "The system is contained to one rack or room cluster."],
    attachProducts: [
      { productFamily: "Cables and installation accessories", reason: "Confirm the physical signal path and power approach before quoting." },
      { productFamily: "Control or room interface", reason: "Attach when users need repeatable source presets rather than manual routing." },
    ],
    competitorCategory: "HDMI matrix",
    competitorSearchTerms: ["4x4 HDMI matrix", "matrix scaler", "4K60 matrix"],
    followUpWording: "This sounds like a contained matrix sale, not an AVoIP sale. MX-0404-SCL is the WyreStorm path when the customer needs predictable local routing across a known number of sources and displays, and the rep wants to keep the architecture simple and supportable. Before quote, confirm true source/display count, scaling expectations, HDCP/EDID behaviour and how the user will control routing day to day.",
    reviewGates: ["Confirm source and display count.", "Confirm scaling and HDCP/EDID behaviour.", "Confirm user control method."],
  },
  {
    sku: "MX-0808-H2A-MK2",
    productName: "8x8 HDMI matrix",
    productFamily: "Matrix / Routing",
    technologyType: "HDMI matrix switching",
    salientPoint: "A local matrix option where eight HDMI sources and eight display outputs are a better shape than AVoIP.",
    jobToBeDone: "a local AV system needs fixed-size HDMI routing across up to eight inputs and outputs",
    bestFitApplications: ["hospitality head-end rooms", "education AV racks", "training suites", "larger meeting-room clusters"],
    weakFitApplications: ["campus-wide routing", "future endpoint growth beyond matrix size", "USB-first UC rooms"],
    customerProblems: ["The customer needs a bigger fixed-routing system without paying the AVoIP tax.", "The rep needs to keep a hospitality or head-end matrix job on a clear local architecture.", "The project has enough sources and screens to need structure, but not enough complexity to justify networked distribution."],
    wyrestormFit: ["Lets the rep hold margin on a serious fixed matrix job instead of turning it into an unnecessary network design.", "Strong where the source count, display count and rack location are already understood."],
    openingQuestions: ["Is the system local to one rack or distributed around the building?", "Are eight inputs and outputs enough now and later?", "What control system is planned?", "Are mixed resolutions involved?"],
    technicalCheckQuestions: ["Confirm input/output count and future growth.", "Confirm resolution, HDCP and EDID requirements.", "Confirm control method.", "Confirm whether AVoIP would be more flexible."],
    listenForTriggers: ["This is a head-end matrix, not a campus network.", "They need eight sources and eight displays in one contained system.", "Hospitality or bar routing is the driver.", "They want dependable fixed routing, not future IT overhead."],
    attachProducts: [
      { productFamily: "Control or room interface", reason: "Attach when staff need repeatable presets instead of ad-hoc switching." },
      { productFamily: "HDBaseT receivers or cabling", reason: "Attach where remote displays and rack-to-screen distance need to be completed properly." },
    ],
    competitorCategory: "8x8 HDMI matrix",
    competitorSearchTerms: ["8x8 HDMI matrix", "4K60 matrix", "HDMI matrix switch"],
    followUpWording: "This sounds like a substantial but still contained routing job. MX-0808-H2A-MK2 is the WyreStorm path when the customer needs a serious fixed-size matrix without drifting into AVoIP complexity. Before quote, confirm whether eight by eight is the true system size, how far the displays are from the rack, what control experience staff need and whether future growth would force a different architecture.",
    reviewGates: ["Confirm true input/output count and future growth.", "Confirm transport distance and output path.", "Confirm control method and whether AVoIP is really unnecessary."],
  },
  {
    sku: "NHD-500-DNT-TX",
    productName: "NetworkHD 500-series Dante encoder",
    productFamily: "NetworkHD 500 Series",
    technologyType: "1GbE JPEG-XS AVoIP encoder with Dante relevance",
    salientPoint: "Use where NetworkHD 500-series video distribution and Dante-aware audio workflows meet.",
    jobToBeDone: "a source needs to enter a NetworkHD 500-series AVoIP system with audio design requirements checked",
    bestFitApplications: ["higher education", "teaching rooms", "campus AV", "distributed AV with network audio"],
    weakFitApplications: ["standalone point-to-point extension", "10GbE SDVoE-only designs", "non-NetworkHD systems"],
    openingQuestions: ["Is this a NetworkHD 500-series system?", "Is Dante required?", "What source is being encoded?", "What controller and switch are being used?"],
    technicalCheckQuestions: ["Confirm NetworkHD 500-series compatibility.", "Confirm Dante/audio routing.", "Confirm network switch and controller.", "Confirm endpoint count and licensing/commissioning needs."],
    attachProducts: [
      { productFamily: "NetworkHD controller", reason: "Required to manage the NetworkHD system." },
      { productFamily: "Dante audio products", reason: "Attach where network audio is part of the room design." },
    ],
    competitorCategory: "AVoIP encoder with Dante",
    competitorSearchTerms: ["JPEG-XS encoder", "AVoIP Dante encoder", "NetworkHD 500 encoder"],
  },
  {
    sku: "NHD-510-TX",
    productName: "NetworkHD 510 encoder",
    productFamily: "NetworkHD 500 Series",
    technologyType: "1GbE JPEG-XS AVoIP encoder",
    salientPoint: "An encoder option for NetworkHD 500-series designs where sources need to enter the routed AV network.",
    jobToBeDone: "a local source needs to become part of a NetworkHD 500-series distribution system",
    bestFitApplications: ["campus AV", "teaching spaces", "multi-room presentation", "distributed displays"],
    weakFitApplications: ["small local switching", "10GbE SDVoE systems", "standalone HDMI extension"],
    openingQuestions: ["What source is being encoded?", "How many endpoints are in the system?", "Is the network ready for NetworkHD 500-series?", "Is USB or audio follow needed?"],
    technicalCheckQuestions: ["Confirm NetworkHD series.", "Confirm controller and switch requirements.", "Confirm source format and resolution.", "Confirm endpoint count and expansion plan."],
    competitorCategory: "AVoIP encoder",
    competitorSearchTerms: ["JPEG-XS encoder", "1GbE AVoIP encoder", "AV over IP transmitter"],
  },
  {
    sku: "NHD-610-TX",
    productName: "NetworkHD 610 SDVoE encoder",
    productFamily: "NetworkHD 600 Series",
    technologyType: "10GbE SDVoE AVoIP encoder",
    salientPoint: "A 10GbE source encoder for performance-led NetworkHD 600-series systems.",
    jobToBeDone: "a source needs to enter a premium 10GbE SDVoE AVoIP system",
    bestFitApplications: ["control rooms", "premium AVoIP", "large venues", "low-latency distribution"],
    weakFitApplications: ["1GbE-only networks", "small local switcher rooms", "budget signage"],
    openingQuestions: ["Is this a NetworkHD 600-series design?", "Is 10GbE switching available?", "What latency and image quality are required?", "How many endpoints are planned?"],
    technicalCheckQuestions: ["Confirm 10GbE network design.", "Confirm controller requirement.", "Confirm SDVoE series compatibility.", "Confirm source count and expansion."],
    competitorCategory: "SDVoE encoder",
    competitorSearchTerms: ["SDVoE encoder", "10GbE AVoIP transmitter", "AV over IP encoder"],
  },
  {
    sku: "NHD-CTL-PRO-V2",
    productName: "NetworkHD Pro controller",
    productFamily: "NetworkHD Control",
    technologyType: "AVoIP system controller",
    salientPoint: "The control and management component that should be discussed whenever NetworkHD is more than a simple endpoint conversation.",
    jobToBeDone: "a NetworkHD system needs central control, routing management and commissioning structure",
    bestFitApplications: ["NetworkHD systems", "multi-room AVoIP", "campus AV", "large display estates"],
    weakFitApplications: ["non-NetworkHD systems", "single point-to-point extenders", "standalone HDMI matrix jobs"],
    customerProblems: ["The customer has moved beyond buying endpoints and now needs the NetworkHD system to behave like one manageable platform.", "The rep needs to stop the project becoming 'some encoders and decoders' with no control story behind them.", "The job needs routing ownership, commissioning structure and a real control layer before it is safe to quote."],
    wyrestormFit: ["Lets the rep sell the NetworkHD system as a managed platform rather than a pile of endpoints.", "Protects the sale from under-quoting the controller and then discovering the routing story is incomplete."],
    openingQuestions: ["Which NetworkHD series is being designed?", "How many endpoints are involved?", "Who needs routing control?", "Is third-party control integration required?"],
    technicalCheckQuestions: ["Confirm NetworkHD series support.", "Confirm endpoint count.", "Confirm control integration.", "Confirm network and commissioning responsibilities."],
    listenForTriggers: ["Who is controlling all of this?", "We need presets and routing management.", "The endpoints are clear, but the control story is not.", "They want the system to feel managed, not engineered every day."],
    attachProducts: [
      { productFamily: "Control or room interface", reason: "Attach when routing control must be exposed cleanly to users or operators." },
      { productFamily: "NetworkHD switching and commissioning services", reason: "Attach when the controller conversation exposes wider network ownership and setup scope." },
    ],
    competitorCategory: "AVoIP controller",
    competitorSearchTerms: ["AVoIP controller", "NetworkHD controller", "AV over IP control processor"],
    followUpWording: "This sounds like the point where the project stops being an endpoint list and becomes a managed NetworkHD system. NHD-CTL-PRO-V2 is the WyreStorm path when the customer needs routing ownership, presets and commissioning structure to sit behind the AVoIP design. Before quote, confirm the exact NetworkHD series, endpoint count, control exposure, network responsibility and who is commissioning the finished system.",
    reviewGates: ["Confirm NetworkHD series and endpoint count.", "Confirm control exposure and integration.", "Confirm network and commissioning ownership."],
  },
  {
    sku: "NHD-USB-TRX",
    productName: "USB 2.0 over IP transceiver",
    productFamily: "NetworkHD USB",
    technologyType: "USB over IP transceiver",
    salientPoint: "Use where USB needs to follow an AVoIP or networked room workflow rather than staying local to the PC.",
    jobToBeDone: "USB peripherals need to be extended or routed across an IP-based AV workflow",
    bestFitApplications: ["AVoIP UC rooms", "teaching rooms with remote USB", "operator workstations", "interactive displays"],
    weakFitApplications: ["USB 3 camera bandwidth requirements", "video-only AVoIP", "simple local USB cabling"],
    customerProblems: ["The customer wants the room USB devices somewhere different from the host PC.", "The rep needs a way to explain remote USB ownership inside an AVoIP or networked workflow.", "The project works on video, but still has an unsolved keyboard, camera or touch-control path."],
    wyrestormFit: ["Lets the rep keep USB in the system conversation instead of discovering too late that the peripherals cannot follow the workflow.", "Useful when the customer requirement is really about who owns the USB devices at each end of the room."],
    openingQuestions: ["Which USB devices need to be connected?", "Is USB 2 sufficient?", "Where is the host PC?", "Does USB need to follow video routing?"],
    technicalCheckQuestions: ["Confirm USB device type and bandwidth.", "Confirm host/peripheral locations.", "Confirm NetworkHD/control workflow.", "Confirm latency and user expectations."],
    listenForTriggers: ["The camera is remote from the PC.", "Touch or USB control needs to follow the video path.", "We solved video, but not the USB ownership.", "The peripherals cannot stay local to the host."],
    attachProducts: [
      { productFamily: "NetworkHD controller", reason: "Attach when USB routing must sit inside a wider managed NetworkHD workflow." },
      { productFamily: "UC room devices or touch displays", reason: "Attach when remote USB devices are what make the room commercially useful." },
    ],
    competitorCategory: "USB over IP",
    competitorSearchTerms: ["USB over IP", "USB 2 transceiver", "AVoIP USB routing"],
    followUpWording: "This sounds like a USB-ownership problem rather than a pure video problem. NHD-USB-TRX is the WyreStorm path when the host PC and the USB devices cannot live in the same place, but the workflow still has to feel seamless to the user. Before quote, confirm device type, bandwidth, host/peripheral locations and whether the wider NetworkHD control path is already defined.",
    reviewGates: ["Confirm USB device type and bandwidth.", "Confirm host and peripheral locations.", "Confirm wider control and user-workflow expectations."],
  },
  {
    sku: "SW-120-TX3-UK",
    productName: "2-gang HDBaseT 3.0 in-wall transmitter",
    productFamily: "In-Wall Presentation",
    technologyType: "HDBaseT 3.0 in-wall transmitter",
    salientPoint: "A neat wall-plate input point for rooms where the user connects at the wall and the AV rack or display is elsewhere.",
    jobToBeDone: "a room needs a clean in-wall source input with HDBaseT 3.0 extension",
    bestFitApplications: ["teaching rooms", "meeting rooms", "training rooms", "front-of-room inputs"],
    weakFitApplications: ["table-box workflows", "wireless-only rooms", "multi-input matrix requirements without a receiver/design"],
    openingQuestions: ["Where will the user plug in?", "What receiver or switcher is downstream?", "Is UK back-box depth suitable?", "Is control or USB needed?"],
    technicalCheckQuestions: ["Confirm matching receiver/system compatibility.", "Confirm back-box and installation depth.", "Confirm input formats.", "Confirm cable route and power."],
    competitorCategory: "in-wall HDBaseT transmitter",
    competitorSearchTerms: ["HDBaseT 3 wall plate", "in-wall transmitter", "USB-C HDMI wall plate"],
  },
  {
    sku: "SW-130-TX-UK",
    productName: "3-input in-wall HDBaseT switcher",
    productFamily: "In-Wall Presentation",
    technologyType: "In-wall presentation switcher",
    salientPoint: "A useful front-of-room input plate when the customer needs a tidy local source connection point with switching.",
    jobToBeDone: "presenters need a wall-mounted input point with simple local switching",
    bestFitApplications: ["classrooms", "small meeting rooms", "training spaces", "presentation walls"],
    weakFitApplications: ["large multi-display routing", "wireless-first rooms", "rooms needing full UC USB management"],
    openingQuestions: ["How many local inputs are needed at the wall?", "What is downstream of the transmitter?", "Does the user need button control?", "Is UK wall-box fit confirmed?"],
    technicalCheckQuestions: ["Confirm input count and formats.", "Confirm receiver/system compatibility.", "Confirm installation depth.", "Confirm control and power requirements."],
    competitorCategory: "in-wall switcher",
    competitorSearchTerms: ["3 input wall plate switcher", "HDBaseT wall plate", "in-wall presentation switcher"],
  },
  {
    sku: "SW-220-TX-W",
    productName: "Synergy 2-input switcher",
    productFamily: "Synergy Presentation",
    technologyType: "Presentation switcher",
    salientPoint: "A compact Synergy option for smaller rooms where the user needs a simple source connection workflow.",
    jobToBeDone: "a smaller meeting or teaching space needs straightforward source selection",
    bestFitApplications: ["small meeting rooms", "huddle spaces", "teaching rooms", "BYOD presentation"],
    weakFitApplications: ["larger rooms needing four or more inputs", "complex UC rooms", "distributed AV"],
    customerProblems: ["The customer needs a smaller room to feel professional without paying for a bigger switcher than the job needs.", "The rep needs a clean entry product for straightforward presentation spaces.", "The room needs to be easier to use than a basic cable-swap setup."],
    wyrestormFit: ["Lets the rep keep the room on a right-sized Synergy path instead of dropping to a commodity switch.", "Useful when the sale is about simple day-to-day usability, not maximum I/O count."],
    openingQuestions: ["How many sources are used regularly?", "Do users need HDMI, USB-C or wireless?", "Is there a single display?", "Does USB or audio need to be considered?"],
    technicalCheckQuestions: ["Confirm input types.", "Confirm display and extension requirement.", "Confirm USB/audio/control needs.", "Confirm whether a larger Synergy product is required."],
    listenForTriggers: ["It is only a small room, but it still needs to feel tidy.", "They want a cleaner setup than swapping cables.", "A simple presentation room is the job.", "They do not need a bigger switcher unless the workflow proves it."],
    attachProducts: [
      { productFamily: "APO UC audio", reason: "Attach when the room also needs a credible call experience." },
      { productFamily: "HDBaseT extension", reason: "Attach when the display path is not local to the connection point." },
    ],
    competitorCategory: "presentation switcher",
    competitorSearchTerms: ["2 input presentation switcher", "BYOD switcher", "Synergy switcher"],
    followUpWording: "This sounds like a smaller presentation-room sale where the rep needs to keep the workflow clean without over-specifying the system. SW-220-TX-W is the WyreStorm path when the room needs straightforward source selection, cleaner operation and just enough structure to avoid a commodity switcher conversation. Before quote, confirm source types, display path, USB/audio needs and whether the room is still small enough to avoid stepping up to a larger Synergy model.",
    reviewGates: ["Confirm source types and display path.", "Confirm USB/audio/control needs.", "Confirm whether the room has outgrown the compact switcher tier."],
  },
  {
    sku: "SW-640L-TX-W",
    productName: "Synergy 4-input 4K60 presentation switcher",
    productFamily: "Synergy Presentation",
    technologyType: "Presentation switcher",
    salientPoint: "A strong room-workflow product where four inputs and user-friendly presentation switching are central to the brief.",
    jobToBeDone: "a meeting, teaching or training room needs a more complete presentation switching workflow",
    bestFitApplications: ["meeting rooms", "classrooms", "training rooms", "BYOD presentation spaces"],
    weakFitApplications: ["single-source extension", "large matrix routing", "campus-wide AVoIP"],
    customerProblems: ["The customer needs a room that handles regular presentation properly, not a pile of adapters and manual workarounds.", "The rep needs a stronger presentation switcher story once the room is beyond basic source selection.", "The room may look simple on paper, but the workflow depends on inputs, USB and user confidence all working together."],
    wyrestormFit: ["Lets the rep sell a more complete room-workflow answer instead of a bare switcher comparison.", "Creates a strong path into audio, camera and control attach discussion once the main room flow is accepted."],
    openingQuestions: ["Which sources are used every week?", "Do users need wired, wireless or both?", "Is USB part of the room experience?", "What display or receiver is downstream?"],
    technicalCheckQuestions: ["Confirm input types and count.", "Confirm display/extension path.", "Confirm USB, audio and control needs.", "Confirm room operation expectations."],
    attachProducts: [
      { productFamily: "APO UC audio", reason: "Attach when the room also needs meeting audio." },
      { productFamily: "CAM cameras", reason: "Attach when the room includes conferencing or capture." },
    ],
    listenForTriggers: ["The room needs to be easier to support.", "Users struggle to connect reliably.", "We need a cleaner room workflow.", "This is more than a basic switcher job."],
    competitorCategory: "presentation switcher",
    competitorSearchTerms: ["4 input presentation switcher", "wireless presentation switcher", "BYOD room switcher"],
    followUpWording: "This sounds like a room-workflow sale, not just a source-count sale. SW-640L-TX-W is the WyreStorm path when the customer needs presentation to feel reliable, repeatable and easy for everyday users, with the right mix of inputs, USB and downstream display handling. Before quote, confirm the real weekly source mix, display path, USB ownership, audio expectations and whether the room needs a simple user-facing control flow.",
    reviewGates: ["Confirm real source mix and input count.", "Confirm display/extension path.", "Confirm USB, audio and control expectations."],
  },
  {
    sku: "SWX-100-HDBT3",
    productName: "HDBaseT 3 transmitter and receiver kit",
    productFamily: "HDBaseT 3.0 Extension",
    technologyType: "HDBaseT 3.0 extender kit",
    salientPoint: "A kit conversation for projects that need a matched HDBaseT 3.0 transmitter and receiver path.",
    jobToBeDone: "the design needs a known transmitter/receiver extension pair rather than separate unmatched parts",
    bestFitApplications: ["meeting rooms", "classrooms", "premium display extension", "front-of-room AV"],
    weakFitApplications: ["matrix routing", "AVoIP distribution", "simple short HDMI cable runs"],
    openingQuestions: ["Is a matched TX/RX kit preferred?", "What source and display are being connected?", "What distance and cable grade are available?", "Is control, USB or audio needed?"],
    technicalCheckQuestions: ["Confirm distance and cable category.", "Confirm resolution and HDCP.", "Confirm control/audio requirements.", "Confirm whether the room needs switching before extension."],
    competitorCategory: "HDBaseT 3 extender kit",
    competitorSearchTerms: ["HDBaseT 3 kit", "TX RX extender kit", "4K60 HDBaseT extender kit"],
  },
  {
    sku: "SYN-CTL-HUB",
    productName: "Ethernet protocol converter for SYN-TOUCH10",
    productFamily: "Synergy Control",
    technologyType: "Control interface",
    salientPoint: "A control accessory that matters when the room needs the Synergy touch interface to talk to the wider system reliably.",
    jobToBeDone: "a Synergy control workflow needs the correct hub/interface between touch control and room devices",
    bestFitApplications: ["Synergy rooms", "touch-controlled meeting rooms", "teaching spaces", "training rooms"],
    weakFitApplications: ["rooms without SYN-TOUCH10", "manual-only rooms", "third-party control systems already specified"],
    customerProblems: ["The room has a control idea, but still needs the touch interface to talk cleanly to the wider system.", "The rep needs to stop the control conversation from sounding optional when the room experience depends on it.", "The user workflow will fail if the touch layer and room devices are not joined up properly."],
    wyrestormFit: ["Lets the rep explain why the control chain matters instead of treating it as invisible accessory detail.", "Useful when the room sale depends on simple user operation rather than exposing the AV logic underneath."],
    openingQuestions: ["Is SYN-TOUCH10 part of the design?", "What devices need to be controlled?", "Is Ethernet available at the control location?", "Who will commission the control workflow?"],
    technicalCheckQuestions: ["Confirm SYN-TOUCH10 requirement.", "Confirm device/control compatibility.", "Confirm network and power location.", "Confirm commissioning responsibility."],
    attachProducts: [
      { sku: "SYN-TOUCH10", reason: "Primary touch controller context for this hub." },
      { productFamily: "Synergy switchers", reason: "Attach where room control is tied to a Synergy presentation workflow." },
    ],
    listenForTriggers: ["We want one button room control.", "The touch panel is part of the brief.", "They care more about ease of use than the AV logic behind it.", "The control workflow must feel reliable, not improvised."],
    competitorCategory: "control interface",
    competitorSearchTerms: ["touch panel control hub", "Ethernet protocol converter", "room control interface"],
    followUpWording: "This sounds like a control-chain discussion, not just an accessory line item. SYN-CTL-HUB is the WyreStorm path when SYN-TOUCH10 has to talk reliably to the wider room system and the user experience depends on that handoff being clean. Before quote, confirm the touch controller requirement, device compatibility, network/power location and who is commissioning the finished control workflow.",
    reviewGates: ["Confirm SYN-TOUCH10 requirement.", "Confirm device/control compatibility.", "Confirm commissioning ownership."],
  },
  {
    sku: "SYN-TOUCH10",
    productName: "Synergy 10.1-inch all-in-one touchpad IP controller",
    productFamily: "Synergy Control",
    technologyType: "Touch room controller",
    salientPoint: "A room-facing controller for sales conversations where the user experience is as important as the AV signal path.",
    jobToBeDone: "users need a clear touch interface to run the room without learning the AV rack",
    bestFitApplications: ["meeting rooms", "teaching rooms", "training rooms", "executive spaces"],
    weakFitApplications: ["very small rooms with manual source buttons", "third-party control platforms already locked", "systems with no supported device path"],
    customerProblems: ["The user needs the room to behave simply even if the AV system behind it is not simple.", "The rep needs a way to sell user confidence, not just signal transport.", "The room will feel unfinished if users still need to understand the rack to run it."],
    wyrestormFit: ["Lets the rep sell the user experience layer rather than stopping at switching and routing.", "Useful when the room decision depends on confidence, repeatability and reduced support calls."],
    openingQuestions: ["What should the user be able to control?", "Which WyreStorm products are in the room?", "Is a simple touch workflow part of the brief?", "Who maintains the room presets?"],
    technicalCheckQuestions: ["Confirm supported device/control path.", "Confirm network and mounting location.", "Confirm commissioning responsibility.", "Confirm whether SYN-CTL-HUB is required."],
    attachProducts: [
      { sku: "SYN-CTL-HUB", reason: "Use where the control design requires the protocol converter." },
      { productFamily: "Synergy switchers", reason: "Attach when touch control is part of a presentation workflow." },
    ],
    listenForTriggers: ["The room needs one-button operation.", "Users should not have to learn the AV system.", "They want presets, not engineering.", "Ease of use matters as much as the signal path."],
    competitorCategory: "touch room controller",
    competitorSearchTerms: ["touch panel controller", "IP room controller", "presentation room touchpad"],
    followUpWording: "This sounds like a room-usability sale, not only a signal-path sale. SYN-TOUCH10 is the WyreStorm path when the customer wants the room to feel simple, repeatable and safe for everyday users instead of relying on manual switching or operator memory. Before quote, confirm what the user must control, which WyreStorm devices are in scope, where the panel will live and whether SYN-CTL-HUB is part of the control chain.",
    reviewGates: ["Confirm user control scope.", "Confirm supported device/control path.", "Confirm panel location and hub requirement."],
  },
];

const EXPANDED_PRODUCT_POSITIONING_CARDS = EXPANDED_PRODUCT_POSITIONING_SEEDS.map(createExpandedProductPositioningCard);

export const PRODUCT_POSITIONING_CARDS: ProductPositioningCard[] = [
  ...CORE_PRODUCT_POSITIONING_CARDS,
  ...EXPANDED_PRODUCT_POSITIONING_CARDS,
];

export function getProductPositioningCardBySku(sku: string): ProductPositioningCard | undefined {
  const normalisedSku = resolveWyrestormSkuAlias(sku).trim().toLowerCase();

  return PRODUCT_POSITIONING_CARDS.find(
    (card) => resolveWyrestormSkuAlias(card.sku).trim().toLowerCase() === normalisedSku,
  );
}

export function getBestProductPositioningCardForSku(sku: string): ProductPositioningCard | undefined {
  const exact = getProductPositioningCardBySku(sku);
  if (exact) return exact;

  const normalisedSku = resolveWyrestormSkuAlias(sku).trim().toUpperCase();

  if (/^NHD-500[-\s]/.test(normalisedSku)) {
    return getProductPositioningCardBySku("NHD-500 Series");
  }

  if (/^NHD-600[-\s]/.test(normalisedSku)) {
    return getProductPositioningCardBySku("NHD-600-TRX");
  }

  if (/^MX-0403-H3-MST/.test(normalisedSku)) {
    return getProductPositioningCardBySku("MX-0403-MST");
  }

  if (/^MX-040[23]-MST/.test(normalisedSku)) {
    return getProductPositioningCardBySku(normalisedSku.startsWith("MX-0403") ? "MX-0403-MST" : "MX-0402-MST");
  }

  if (/^MX-0808-KIT/.test(normalisedSku)) {
    return getProductPositioningCardBySku("MX-0808-KIT-V2");
  }

  return PRODUCT_POSITIONING_CARDS.find((card) => {
    const cardSku = card.sku.trim().toUpperCase();
    return cardSku.endsWith(" SERIES") && normalisedSku.startsWith(cardSku.replace(/\s+SERIES$/, ""));
  });
}

export function searchProductPositioningCards(query: string): ProductPositioningCard[] {
  const normalisedQuery = query.trim().toLowerCase();

  if (!normalisedQuery) {
    return PRODUCT_POSITIONING_CARDS;
  }

  return PRODUCT_POSITIONING_CARDS.filter((card) => {
    const searchable = [
      card.sku,
      card.productName,
      card.productFamily,
      card.technologyType,
      card.salientPoint,
      card.oneLinePositioning,
      ...card.bestFitApplications,
      ...card.customerProblems,
      ...card.listenForTriggers,
      ...card.attachProducts.map((item) => `${item.sku ?? ""} ${item.productFamily ?? ""} ${item.reason}`),
      ...card.competitorAngles.flatMap((item) => [
        item.competitorBrand ?? "",
        item.competitorCategory ?? "",
        item.positioningNote,
        ...item.compareSearchTerms,
      ]),
    ].join(" ").toLowerCase();

    return searchable.includes(normalisedQuery);
  });
}
