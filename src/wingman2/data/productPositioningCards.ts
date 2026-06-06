import type { ProductPositioningCard } from "../types/productPositioning";

export const PRODUCT_POSITIONING_CARDS: ProductPositioningCard[] = [
  {
    sku: "NHD-0401-MV",
    productName: "4-input HDMI multiview processor",
    productFamily: "NetworkHD / Multiview",
    technologyType: "HDMI multiview",
    salientPoint: "A practical way to show several HDMI sources on one display, processor input or confidence monitor.",
    oneLinePositioning: "Use this when the customer needs to see multiple sources together on one output rather than simply switching between them.",
    oneMinuteBrief: "The NHD-0401-MV is useful when the opportunity is about source visibility. It helps frame the conversation around multiview, preview, monitoring and operator confidence rather than standard matrix switching. It can be positioned as a standalone multiview option or as part of a wider WyreStorm signal-management conversation.",
    bestFitApplications: ["sports bars", "control rooms", "security monitoring", "education preview displays", "LED processor input management", "confidence monitoring"],
    weakFitApplications: ["full matrix replacement", "large distributed AV by itself", "complete video wall processing without confirming layout needs"],
    customerProblems: ["The customer has several feeds but only one display or processor input.", "The operator needs to see more than one source at the same time.", "The current solution relies on switching back and forth between sources."],
    wyrestormFit: ["Positions WyreStorm as a signal-management partner, not only a source/display supplier.", "Creates a path into wider matrix, AVoIP or video wall conversations."],
    openingQuestions: ["How many sources need to be visible at the same time?", "Is the output feeding a display, matrix, LED processor, recorder or AVoIP encoder?", "Do you need fixed layouts or user-selectable layouts?", "What resolution and refresh rate do the sources need?", "Is this standalone or part of a wider routed AV system?"],
    qualificationQuestions: ["Do any of the sources carry protected content?", "Who needs to control the layout?", "Is audio required from a specific source?", "Is this for operator monitoring or customer-facing display?", "Are there future source expansion plans?"],
    technicalCheckQuestions: ["Confirm HDCP requirements.", "Confirm output resolution.", "Confirm layout expectations.", "Confirm control method.", "Confirm whether this is true multiview or video wall processing."],
    listenForTriggers: ["We need to see all sources at once.", "We need a preview monitor.", "The LED processor only has one spare input.", "The operator wants to monitor several feeds.", "We currently use a cheap quad viewer."],
    disqualifiers: ["Do not present as a full matrix replacement.", "Do not present as a complete video wall processor without checking the requirement.", "Do not assume it replaces an AVoIP decoder."],
    caveats: ["Check HDCP, resolution, layout and control expectations before confirming.", "Clarify whether the need is multiview, switching, video wall processing or AVoIP composition."],
    objectionHandling: [
      { objection: "Can the display do this?", response: "Some displays offer limited PiP or PbP, but a dedicated multiview processor gives a more predictable AV integration path and clearer source-management conversation." },
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
      DEALER: "Use this to open a system conversation around preview, LED inputs, sports bars and monitoring.",
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
    followUpWording: "Based on what you described, this looks like a multiview requirement rather than simply a switching requirement. WyreStorm has options that can help show multiple HDMI sources on a single output, either standalone or as part of a wider signal-management system. Before confirming the best option, we should check source count, output resolution, required layouts, HDCP expectations and where the output sits in the wider system.",
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
    oneMinuteBrief: "The NHD-150-RX should be positioned where the customer is already in, or is suitable for, a NetworkHD 100-series AVoIP design and needs a multiview style output. It is not a generic HDMI quad viewer and should be discussed in the context of NetworkHD system design.",
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
      DISTRIBUTOR: "Position as a NetworkHD system conversation, not a standalone box sale.",
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
    oneMinuteBrief: "NHD-600-TRX is best positioned for serious AVoIP projects where image quality, low latency, flexible endpoints and 10GbE infrastructure are part of the conversation. It is not the entry-level route for small local switching jobs.",
    bestFitApplications: ["premium AVoIP", "large venues", "high-end education", "control rooms", "flexible source/display estates", "low-latency distribution"],
    weakFitApplications: ["small local matrix jobs", "budget hospitality", "1GbE-only infrastructure", "simple one-room switching"],
    customerProblems: ["The customer needs scalable AV distribution.", "The system needs flexible source/display routing.", "The project is beyond practical matrix size.", "Low latency and quality are more important than lowest cost."],
    wyrestormFit: ["Positions NetworkHD as a premium AV-over-IP platform.", "Opens network design, control and expansion conversations."],
    openingQuestions: ["How many sources and displays are required now and later?", "Is 10GbE switching available or planned?", "Is low latency important?", "Are sources local to displays or distributed around the site?", "Is this a new design or replacing a matrix?"],
    qualificationQuestions: ["Is the network dedicated to AV?", "Are mixed resolutions expected?", "Is centralised control required?", "Are any endpoints expected to change role?", "What is the customerâ€™s tolerance for network infrastructure cost?"],
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
    oneMinuteBrief: "NHD-500 is a strong conversation for education, campus and flexible AV distribution where a matrix becomes limiting but 10GbE SDVoE may not be the right commercial fit.",
    bestFitApplications: ["higher education", "campus AV", "teaching spaces", "distributed displays", "mixed room estates"],
    weakFitApplications: ["very small local systems", "10GbE SDVoE-only specifications", "simple display extension"],
    customerProblems: ["The customer needs routing across multiple rooms.", "A matrix is becoming too fixed or too small.", "They need a scalable AV platform over network infrastructure."],
    wyrestormFit: ["Positions WyreStorm strongly in education and scalable signal management.", "Works well where salespeople need to move beyond one-room thinking."],
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
    oneLinePositioning: "Use this when the teaching room needs AV switching, USB/conferencing, audio and hybrid signal management in one system conversation.",
    oneMinuteBrief: "MX-1007-HYB is a strong education and hybrid-teaching story. It helps simplify conversations where a classroom needs USB-C/HDMI sources, display routing, USB device handling, audio and NetworkHD integration rather than separate boxes everywhere.",
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
    salientPoint: "A practical option for teaching spaces that need structured source and display routing without overcomplicating the room.",
    oneLinePositioning: "Use this when the room needs an education-focused matrix approach but not the full hybrid requirement of MX-1007-HYB.",
    oneMinuteBrief: "MX-0408-EDU fits education spaces where the core need is reliable source/display routing for teaching, but the design does not require the same level of hybrid NetworkHD/audio integration as larger systems.",
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
    oneMinuteBrief: "MX-0403-MST should be positioned for spaces where the customer needs more than a basic switch but not a large matrix or AVoIP platform. It is a practical meeting, education or presentation-room conversation.",
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
    oneMinuteBrief: "MX-0402-MST is a practical small-room positioning product. It is useful when the customer wants a professional presentation setup but the application does not justify a larger matrix or NetworkHD design.",
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
    oneMinuteBrief: "SW-620-TX-W fits rooms where laptops, guest devices and wireless presentation are central to the user experience. It is more of a room workflow product than a pure matrix discussion.",
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
    oneMinuteBrief: "SW-640-TX-W is a stronger room workflow conversation where the customer needs wireless presentation but also has more inputs, display needs or room complexity than a smaller presentation switcher can comfortably handle.",
    bestFitApplications: ["larger meeting rooms", "boardrooms", "training rooms", "dual-display presentation", "BYOD/BYOM spaces"],
    weakFitApplications: ["single-input rooms", "large distributed AV", "certified Teams Room appliance replacement"],
    customerProblems: ["Users need flexible wired and wireless presentation.", "The room has more than a basic single-display requirement.", "Guest and fixed sources need to be handled cleanly."],
    wyrestormFit: ["Positions WyreStorm as a complete meeting-room signal-management option.", "Provides natural attach paths to cameras, audio and extension."],
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
    sku: "MX-0808-KIT",
    productName: "8x8 matrix kit",
    productFamily: "HDBaseT Matrix",
    technologyType: "Matrix switching / HDBaseT distribution",
    salientPoint: "A practical local matrix option for smaller venues and systems where AVoIP is not commercially justified.",
    oneLinePositioning: "Use this when the customer needs straightforward 8x8 source-to-display routing and a local matrix remains the right system shape.",
    oneMinuteBrief: "MX-0808-KIT is useful for smaller hospitality and local distribution opportunities where the customer needs a familiar matrix approach. It should not be oversold where the system really needs the scale and flexibility of AVoIP.",
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
    followUpWording: "This sounds like a smaller source-to-display routing requirement where an 8x8 matrix may still be the right commercial and technical shape. MX-0808-KIT can be considered if the source and display count fits, cable distances are suitable and the customer does not need the scale or flexibility of AVoIP. We should confirm resolution, HDCP, distance, control and future expansion before final selection.",
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
    oneMinuteBrief: "SW-0206-VW gives Wingman a non-AVoIP video wall route. This is important because not every video wall conversation justifies NetworkHD. It should be used when the requirement is wall processing and source handling rather than full networked AV distribution.",
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
    oneMinuteBrief: "CAM-210-NDI-PTZ is useful when the discussion moves from display switching into camera capture, streaming, recording or hybrid teaching. It should be linked to the wider AV workflow, not treated as a simple webcam substitute.",
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
    oneMinuteBrief: "CAM-0402-BRG is useful where the issue is not just the camera, but how the camera and other sources enter a conferencing, streaming or recording workflow. It should be positioned as part of the signal path.",
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
    sku: "APO-VX20-UC",
    productName: "Compact UC audio product",
    productFamily: "APO UC Audio",
    technologyType: "USB conferencing audio",
    salientPoint: "A compact audio option for smaller UC/BYOD spaces where microphone and speaker handling need to be considered.",
    oneLinePositioning: "Use this when the opportunity needs a simple UC audio path rather than only video switching.",
    oneMinuteBrief: "APO-VX20-UC should be used to remind salespeople that meeting-room projects often fail if audio is ignored. It is best positioned in smaller huddle or meeting spaces where UC audio is part of the requirement.",
    bestFitApplications: ["small huddle rooms", "BYOD meeting rooms", "USB conferencing", "simple UC spaces"],
    weakFitApplications: ["large divisible rooms", "complex DSP audio", "large lecture theatres"],
    customerProblems: ["The customer has video sorted but poor audio.", "They need microphone/speaker support for BYOD calls.", "The room needs a simple UC audio path."],
    wyrestormFit: ["Helps attach audio to presentation and camera opportunities.", "Keeps the conversation around complete room usability."],
    openingQuestions: ["How many people are in the room?", "Is this for Teams/Zoom/BYOD calls?", "What camera is being used?", "Is the PC/laptop host in the room?", "Is existing audio being reused?"],
    qualificationQuestions: ["What pickup distance is needed?", "Is expansion required?", "Is room noise a concern?", "Does the customer need table or installed audio?", "Is DSP already specified?"],
    technicalCheckQuestions: ["Confirm room size.", "Confirm USB host path.", "Confirm acoustic expectations.", "Confirm camera/platform.", "Confirm whether larger APO audio is required."],
    listenForTriggers: ["huddle room", "USB audio", "BYOD call", "poor meeting audio", "small room"],
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
    followUpWording: "This looks like a smaller UC or BYOD meeting-room audio requirement. APO-VX20-UC may be relevant if the room needs a compact USB audio path, but we should confirm room size, participant count, host device, camera/platform and whether the space needs a larger audio solution.",
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
    oneMinuteBrief: "APO-210-UC is relevant when the customer needs meeting audio to be part of the room design rather than an afterthought. It should be attached to BYOD/BYOM, camera and presentation-switcher conversations.",
    bestFitApplications: ["meeting rooms", "training rooms", "BYOD/BYOM spaces", "rooms needing table audio pickup"],
    weakFitApplications: ["large DSP-led rooms", "auditoriums", "audio-only installations without UC need"],
    customerProblems: ["Participants cannot be heard clearly.", "The room needs a table microphone/speaker approach.", "The customer is building a BYOD/BYOM room."],
    wyrestormFit: ["Completes the meeting-room story around video, audio and source connection.", "Gives salespeople a reason to ask audio questions."],
    openingQuestions: ["How many people use the room?", "What is the table size?", "Is the room BYOD/BYOM?", "What camera is specified?", "Is there existing room audio?"],
    qualificationQuestions: ["What pickup range is needed?", "Is expansion needed?", "Is the room acoustically difficult?", "Is a DSP specified?", "What host device is used?"],
    technicalCheckQuestions: ["Confirm pickup distance.", "Confirm USB/audio path.", "Confirm room size.", "Confirm platform/host.", "Confirm whether DSP/audio design is required."],
    listenForTriggers: ["table microphone", "speakerphone", "BYOD audio", "people at far end cannot hear us", "meeting room audio"],
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
    followUpWording: "This sounds like a meeting-room UC audio requirement. APO-210-UC may be relevant if the room needs table-based microphone and speaker coverage, but we should confirm room size, table layout, participant count, USB host path, camera/platform and whether a more complex audio design is required.",
    reviewGates: ["Confirm room size/table layout.", "Confirm USB host path.", "Confirm whether DSP/audio design is needed."],
    dataConfidence: "MEDIUM",
    lastReviewed: "2026-06-04"
  }
];

export function getProductPositioningCardBySku(sku: string): ProductPositioningCard | undefined {
  const normalisedSku = sku.trim().toLowerCase();
  return PRODUCT_POSITIONING_CARDS.find((card) => card.sku.toLowerCase() === normalisedSku);
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
