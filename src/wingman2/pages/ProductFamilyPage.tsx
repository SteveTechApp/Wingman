import { useMemo, useState, type ReactNode } from "react";
import { BookOpenCheck, Cable, CheckCircle2, HelpCircle, MapPin, Network, Search, Sparkles, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

type ProductFamilyGuide = {
  id: string;
  name: string;
  shortPosition: string;
  customerPitch: string;
  whatItIs: string;
  whyItExists: string;
  howItWorks: string;
  roomFit: string;
  connectivity: string[];
  usefulFunctionality: string[];
  specialFeatures: string[];
  bestFit: string[];
  discoveryQuestions: string[];
  positionAgainst: string;
  whenNotToLead: string[];
  salesRule: string;
  productSkus: string[];
  pitchQuery: string;
};

const familyGuides: ProductFamilyGuide[] = [
  {
    id: "networkhd-100",
    name: "NetworkHD 100",
    shortPosition: "Cost-effective AV-over-IP for flexible 4K distribution where low bandwidth and simple expansion matter.",
    productSkus: ["NHD-110-TX", "NHD-110-RX", "NHD-120-TX", "NHD-120-RX", "NHD-150-RX", "NHD-128-NDI-TRX"],
    pitchQuery: "NetworkHD 100",
    customerPitch:
      "NetworkHD 100 is the practical entry point into WyreStorm AV-over-IP. Use it when the customer needs flexible source-to-display routing across rooms or zones, but the project does not justify a premium ultra-low-latency or 10G architecture.",
    whatItIs:
      "A lower-bandwidth NetworkHD AV-over-IP family built around encoders, decoders and control.",
    whyItExists:
      "It gives dealers a scalable alternative to fixed matrix switching when budget matters and the system still needs network-routed AV.",
    howItWorks:
      "Sources are connected to encoders, displays are connected to decoders, and the AV network plus control layer decides which content appears where.",
    roomFit:
      "Encoders sit at each source - the rack, a media player, a laptop input - and decoders sit behind each display. The network switch and controller are the hub everything plugs into, so the 'room' for AVoIP is really the whole building's cabling.",
    connectivity: [
      "Source-side encoders for HDMI sources.",
      "Display-side decoders behind screens or at display zones.",
      "Network connection to the AV switch infrastructure.",
      "Control layer for routing, presets and system management.",
    ],
    usefulFunctionality: [
      "Flexible routing between multiple sources and displays.",
      "Lower-bandwidth network transport for cost-sensitive distribution.",
      "Useful for signage, hospitality, education and general multi-display AV.",
      "NHD-150-RX can be positioned when multiview decoding is needed inside NetworkHD 100 designs.",
    ],
    specialFeatures: [
      "A practical first step into scalable AV-over-IP.",
      "Good for projects that may grow beyond a small matrix later.",
      "Multiview option available through NHD-150-RX where the workflow requires it.",
    ],
    bestFit: [
      "Budget-conscious distributed AV.",
      "Hospitality and signage zones.",
      "Education rooms with multiple displays.",
      "Projects where flexibility matters more than premium latency or lossless performance.",
    ],
    discoveryQuestions: [
      "How many sources and displays are needed now, and what could be added later?",
      "Does the customer need any-source-to-any-display routing or mostly fixed presets?",
      "Is there suitable network infrastructure and ownership for AV-over-IP?",
    ],
    positionAgainst:
      "Compare against matrix when outputs are under around 12 and the design is fixed. Compare against NetworkHD 500 or 600 when latency, USB, image quality or performance requirements are higher.",
    whenNotToLead: [
      "Simple one-source-to-one-display extension.",
      "Small fixed systems where a matrix is simpler and cheaper.",
      "Premium 4K60 4:4:4, strong USB, or lossless zero-latency requirements.",
      "Sites where the network cannot be used or adapted for AV.",
    ],
    salesRule:
      "Sell NetworkHD 100 as flexible and commercially efficient, not as the highest-performance NetworkHD option.",
  },
  {
    id: "networkhd-500",
    name: "NetworkHD 500",
    shortPosition: "Premium 4K60 4:4:4 AV-over-IP with low latency, strong USB support and Dante-ready workflows.",
    productSkus: ["NHD-500-TX", "NHD-500-RX", "NHD-0401-MV"],
    pitchQuery: "NetworkHD 500",
    customerPitch:
      "NetworkHD 500 is the stronger AV-over-IP conversation when the customer wants flexible distribution without treating image quality, USB or latency as afterthoughts.",
    whatItIs:
      "WyreStorm's premium NetworkHD platform for high-quality routed AV systems over suitable managed network infrastructure.",
    whyItExists:
      "It bridges the gap between cost-focused AV-over-IP and high-end 10G lossless systems, giving integrators a strong mainstream platform for serious commercial AV.",
    howItWorks:
      "Encoders put sources onto the AV network, decoders feed displays, and the control layer manages routing, presets, USB and system behaviour.",
    roomFit:
      "Same shape as the rest of the range: small encoders at the sources, decoders behind the displays, and a managed switch plus NHD-CTL-PRO at the centre. The endpoints live at the edges; plan rack and switch space for the core.",
    connectivity: [
      "Encoders at source locations.",
      "Decoders at display locations.",
      "Managed AV network switching.",
      "USB paths where the workflow needs peripheral extension or host/device routing.",
      "Audio and Dante-ready workflows where supported by the design.",
    ],
    usefulFunctionality: [
      "High-quality 4K60 4:4:4 routing.",
      "Low-latency AV distribution for interactive or operational spaces.",
      "Stronger USB story for BYOD, KVM-style and room-peripheral workflows.",
      "NHD-0401-MV is the correct NetworkHD 500 multiview processor discussion point.",
    ],
    specialFeatures: [
      "A strong default for premium commercial AV-over-IP.",
      "Better fit than basic AVoIP when text clarity, motion, USB or control confidence matters.",
      "Can support multiview conversations through NHD-0401-MV.",
    ],
    bestFit: [
      "Corporate meeting floors and divisible spaces.",
      "Education and training rooms.",
      "Hospitality venues with premium routing needs.",
      "Control, operations and monitoring spaces that do not require 10G lossless transport.",
    ],
    discoveryQuestions: [
      "Is USB transport part of the user workflow?",
      "Is 4K60 4:4:4 or clear text/graphics important?",
      "Does the site allow a properly configured AV network?",
    ],
    positionAgainst:
      "Use it above NetworkHD 100 when quality, USB or latency matter. Use NetworkHD 600 when the customer explicitly needs lossless zero-latency 10G performance.",
    whenNotToLead: [
      "Small fixed systems where a matrix is cleaner.",
      "Lowest-budget distribution where NetworkHD 100 is acceptable.",
      "10G lossless zero-latency requirements.",
      "Sites where network deployment is blocked.",
    ],
    salesRule:
      "Position NetworkHD 500 as the premium mainstream AVoIP platform for serious routed AV, especially where USB and image quality influence user experience.",
  },
  {
    id: "networkhd-600",
    name: "NetworkHD 600",
    shortPosition: "Highest-performance NetworkHD architecture for lossless zero-latency AV-over-IP over 10G.",
    productSkus: ["NHD-600-TRX"],
    pitchQuery: "NetworkHD 600",
    customerPitch:
      "NetworkHD 600 is for customers who need the flexibility of AV-over-IP but cannot accept the compromises of lower-bandwidth systems.",
    whatItIs:
      "A high-performance 10G NetworkHD platform using transceiver-style endpoints for premium routed AV.",
    whyItExists:
      "Some environments need AVoIP flexibility with uncompromised image performance and extremely low delay, especially where operators interact with content in real time.",
    howItWorks:
      "NetworkHD 600 endpoints sit at source and display positions, a 10G AV network carries the signals, and the control layer selects the active routing and presets.",
    roomFit:
      "10G endpoints sit at sources and displays just like the other families, but the 10G switch and cabling at the centre are the part that needs the most planning, space and budget.",
    connectivity: [
      "10G network infrastructure.",
      "Transceiver endpoints at sources, displays or mixed local positions.",
      "HDMI source/display connections at endpoints.",
      "Control path for routing, presets and system behaviour.",
    ],
    usefulFunctionality: [
      "Lossless zero-latency AV-over-IP positioning.",
      "High-performance routing for demanding visual workflows.",
      "Transceiver architecture for flexible endpoint roles.",
      "Strong fit for critical operations and premium AV spaces.",
    ],
    specialFeatures: [
      "Top-tier NetworkHD performance story.",
      "Best family when image quality and latency are the core buying reason.",
      "Useful when the customer wants AVoIP but the application behaves more like real-time production or control.",
    ],
    bestFit: [
      "Command and control.",
      "Simulation or high-detail visualisation.",
      "Premium boardrooms and specialist rooms.",
      "Applications where latency and image fidelity are commercial risks.",
    ],
    discoveryQuestions: [
      "Is zero-latency/lossless performance a genuine requirement or just a preference?",
      "Is 10G switching, cabling and commissioning access available?",
      "What is the business impact if latency or compression is visible?",
    ],
    positionAgainst:
      "Use it above NetworkHD 500 only when the performance case is clear. The 10G infrastructure and budget must be justified by the application.",
    whenNotToLead: [
      "Budget-sensitive general distribution.",
      "Projects without 10G network approval.",
      "Simple meeting rooms or signage zones.",
      "Systems where NetworkHD 500 already satisfies the user experience.",
    ],
    salesRule:
      "Lead with NetworkHD 600 only when performance is the reason the customer will buy the system.",
  },
  {
    id: "matrix",
    name: "Matrix and seamless matrix",
    shortPosition: "Centralised source-to-display routing for fixed or predictable systems, often stronger than AVoIP below around 12 outputs.",
    productSkus: ["MX-0404-HDBT-H2A-KIT", "MX-0808-HDBT-H2-KIT", "MX-1007-HYB", "MXV-0808-H2A", "MXV-0404-H2A"],
    pitchQuery: "WyreStorm matrix seamless matrix MX SCL",
    customerPitch:
      "A matrix is often the cleanest way to route multiple sources to multiple displays when the system is centralised, predictable and not expected to expand heavily.",
    whatItIs:
      "A central switcher that takes multiple inputs and feeds multiple outputs, with seamless and scaling options where the application needs more polished processing.",
    whyItExists:
      "Not every multi-display system needs AV-over-IP. Matrix products keep many projects simpler, easier to support and more cost-effective.",
    howItWorks:
      "Sources and display paths connect to a central chassis or switcher. The customer selects which input feeds each output, often through presets or control.",
    roomFit:
      "Central kit - the chassis lives in the rack or AV cupboard, with every source cabled into its inputs and every display (or its receiver) cabled out of its outputs. The whole system fans out from this one box.",
    connectivity: [
      "HDMI, HDBaseT or mixed input/output paths depending on product.",
      "Display receivers where HDBaseT or extension outputs are used.",
      "Audio de-embedding or routing where supported and required.",
      "Control connections for third-party control or simple presets.",
    ],
    usefulFunctionality: [
      "Fixed-I/O routing.",
      "Scaling or seamless switching where supported.",
      "Multiview or video wall processing on suitable matrix families.",
      "Simpler support model than AVoIP for stable systems.",
    ],
    specialFeatures: [
      "Commercially strong for smaller fixed systems.",
      "Avoids network approval issues.",
      "Can be easier for traditional AV teams to install and maintain.",
    ],
    bestFit: [
      "Boardrooms and training rooms.",
      "Small hospitality systems.",
      "Classrooms with fixed source/display counts.",
      "Central racks feeding a known number of displays.",
    ],
    discoveryQuestions: [
      "How many inputs and outputs are required now?",
      "Are displays local, remote, or a mixture?",
      "Does the system need scaling, seamless switching, multiview or wall processing?",
    ],
    positionAgainst:
      "For fewer than around 12 outputs, compare matrix before AVoIP. Move to AVoIP when expansion, distributed locations or flexible routing are the bigger value.",
    whenNotToLead: [
      "Many rooms or zones spread around a building.",
      "Frequent future expansion.",
      "Any source could appear anywhere across a large estate.",
      "Network-managed routing is part of the customer's operational requirement.",
    ],
    salesRule:
      "Do not let AVoIP win by habit. For smaller fixed systems, matrix may be the better WyreStorm answer.",
  },
  {
    id: "video-wall",
    name: "Video wall processors",
    shortPosition: "Dedicated wall processing for LCD/LED feature walls, with SW-0206-VW and SW-0204-VW considered alongside AVoIP wall options.",
    productSkus: ["SW-0206-VW", "SW-0204-VW", "NHD-150-RX", "NHD-0401-MV"],
    pitchQuery: "WyreStorm video wall processor",
    customerPitch:
      "Video wall processors are for customers who need several displays to behave as one visual system without necessarily building a full AV-over-IP estate.",
    whatItIs:
      "A dedicated processing layer for arranging content across multiple displays or feeding a wall processor path.",
    whyItExists:
      "Video walls have different behaviours: single canvas, per-display content, multiview, signage and mixed layouts. The processor choice depends on that behaviour.",
    howItWorks:
      "Sources feed the processor, the processor creates the required wall layout, and outputs feed the displays or downstream wall path.",
    roomFit:
      "The processor sits in the rack or near the wall, between the sources and the wall screens (or LED processor). Sources go in, the shaped layout comes out to the displays.",
    connectivity: [
      "Source inputs into the wall processor.",
      "Outputs to wall displays or the next processing stage.",
      "Control for selecting layouts and presets.",
      "Possible integration with matrix or AV-over-IP systems where the wall is part of a larger system.",
    ],
    usefulFunctionality: [
      "Creates one large visual area from multiple displays.",
      "Supports preset wall layouts on simpler processors.",
      "Supports more flexible wall processing where the selected processor allows it.",
      "Can keep a wall project simpler than full AVoIP when routing scope is limited.",
    ],
    specialFeatures: [
      "SW-0206-VW should be considered as a dedicated non-AVoIP video wall processor.",
      "SW-0204-VW suits simpler preset-layout wall conversations.",
      "AVoIP wall designs remain valid when routing flexibility and expansion justify the architecture.",
    ],
    bestFit: [
      "Retail and hospitality feature walls.",
      "Reception and signage walls.",
      "Sports or venue feature displays.",
      "Simple control-room style display groups where the behaviour is known.",
    ],
    discoveryQuestions: [
      "What is the wall size and layout?",
      "Should the wall show one canvas, different content per screen, multiview or mixed layouts?",
      "How many sources feed the wall, and do they need to route elsewhere too?",
    ],
    positionAgainst:
      "Compare dedicated processors against AVoIP wall approaches. Choose based on flexibility, latency, image quality, complexity and budget.",
    whenNotToLead: [
      "The wall is only one part of a larger flexible routed AV estate.",
      "Every display must independently route many sources across a building.",
      "The customer needs high-performance AVoIP wall behaviour.",
      "The source/display behaviour has not been clarified.",
    ],
    salesRule:
      "Always define the wall behaviour before choosing processor, matrix or AVoIP.",
  },
  {
    id: "presentation-uc",
    name: "Presentation switchers and UC",
    shortPosition: "Meeting-room and classroom products for USB-C, wireless presentation, BYOD/BYOM and conferencing-led spaces.",
    productSkus: ["MX-0402-MST", "MX-0403-H3-MST", "SW-640L-TX-W", "APO-VX20-UC", "IDB-300"],
    pitchQuery: "WyreStorm presentation UC USB-C BYOD",
    customerPitch:
      "Presentation and UC products are about making the room easy for users, especially where laptops, USB-C, wireless sharing and conferencing devices all need to work together.",
    whatItIs:
      "A family of room-local switching, collaboration and conferencing products for everyday presentation and meeting workflows.",
    whyItExists:
      "Most meeting rooms fail because the user experience is messy, not because the video specification is exotic.",
    howItWorks:
      "Laptop, room source, camera, microphone and display paths are brought into a simpler room workflow, often with automatic or user-friendly switching.",
    roomFit:
      "Room-local kit - at the table, lectern, credenza or behind the front display, wherever people plug in or sit. Its position follows the users and the screen, not the rack.",
    connectivity: [
      "USB-C and HDMI source inputs where supported.",
      "Display outputs for single or dual-screen rooms depending on product.",
      "USB paths for cameras, microphones, speakerphones or touch devices.",
      "Network or control connections for management and room integration.",
    ],
    usefulFunctionality: [
      "BYOD and BYOM workflows.",
      "USB-C laptop connection and charging where supported.",
      "Wireless presentation or wireless conferencing where supported.",
      "Cleaner user operation for meeting rooms and classrooms.",
    ],
    specialFeatures: [
      "Strong sales story around reducing support calls.",
      "Easy to explain to non-technical customers.",
      "Fits real meeting-room pain points better than a generic matrix conversation.",
    ],
    bestFit: [
      "Huddle rooms and meeting rooms.",
      "Classrooms and training rooms.",
      "BYOD/BYOM spaces.",
      "Rooms where ease of use is the main buying reason.",
    ],
    discoveryQuestions: [
      "Will users bring laptops, use a room PC, or both?",
      "Are cameras, microphones, speakerphones or touch displays involved?",
      "Is wireless sharing, wireless conferencing, USB-C charging or dual display needed?",
    ],
    positionAgainst:
      "Use this family before matrix or AVoIP when the real problem is the meeting workflow, not building-wide routing.",
    whenNotToLead: [
      "The requirement is mostly distributed AV across many rooms.",
      "The customer needs a large routed matrix or AVoIP system.",
      "The room has no user-facing laptop, USB or conferencing workflow.",
      "A simple extender solves the whole requirement.",
    ],
    salesRule:
      "For meeting rooms, sell the user workflow first and the transport technology second.",
  },
  {
    id: "hdbaset-extension",
    name: "HDBaseT extenders and switchers",
    shortPosition: "Reliable point-to-point or local switching transport when HDMI distance is impractical.",
    productSkus: ["EX-70-H2", "EX-70-H2X", "EX-100-H2", "EX-100-H2-PRO", "RX-70-4K"],
    pitchQuery: "WyreStorm HDBaseT extender",
    customerPitch:
      "HDBaseT is the practical choice when the source and display are too far apart for normal HDMI, but the system does not need full network-routed AV.",
    whatItIs:
      "A transport family that carries AV and related signals over category-style cabling in a point-to-point AV installation.",
    whyItExists:
      "Many AV problems are distance and cable-route problems, not routing-platform problems.",
    howItWorks:
      "A transmitter sends the AV signal over the installed cable route to a receiver at the display or destination.",
    roomFit:
      "One end at the source position, the other behind the display, joined by the installed category cable between them. The rest of the room never sees it.",
    connectivity: [
      "Source connection at the transmitter.",
      "Category cable path between transmitter and receiver.",
      "Receiver connection at the display.",
      "Control, audio, USB or power features where supported by the selected model.",
    ],
    usefulFunctionality: [
      "Extends AV beyond practical HDMI cable length.",
      "Keeps source equipment centralised while displays sit remotely.",
      "Can combine local switching and extension in some products.",
      "Avoids using the customer's IT network for AV routing.",
    ],
    specialFeatures: [
      "Simple story for installers and customers.",
      "Good for medium-distance room transport.",
      "Useful when network access is restricted.",
    ],
    bestFit: [
      "Classrooms with projector/display runs.",
      "Meeting rooms with rack-to-display extension.",
      "Simple source-to-display transport.",
      "Fixed rooms where AVoIP would be unnecessary.",
    ],
    discoveryQuestions: [
      "What is the real installed cable distance?",
      "What cable type and route already exist?",
      "Does USB, audio, Ethernet, IR, RS-232 or power need to travel too?",
    ],
    positionAgainst:
      "Use HDBaseT instead of AVoIP when the need is point-to-point distance rather than flexible network routing.",
    whenNotToLead: [
      "Many sources must route freely to many displays.",
      "The system needs major future expansion.",
      "The cable route cannot support the required signal.",
      "USB bandwidth or video bandwidth exceeds the chosen extender's role.",
    ],
    salesRule:
      "If the problem is distance, start with extension. If the problem is flexible routing, then consider matrix or AVoIP.",
  },
  {
    id: "usb-kvm",
    name: "USB and KVM extenders",
    shortPosition: "Peripheral transport for cameras, speakerphones, touch displays, room PCs and interactive workflows.",
    productSkus: ["EX-100-USB", "CAB-USB-3M", "CAB-USB-5M"],
    pitchQuery: "WyreStorm USB KVM extender",
    customerPitch:
      "USB extension protects the user experience in conferencing and control rooms because cameras, microphones and touch devices must work from the correct host location.",
    whatItIs:
      "A family for carrying USB or KVM-style interaction between users, host devices and peripherals.",
    whyItExists:
      "Video can look right while the room still fails because the USB path is missing, too slow or connected to the wrong host.",
    howItWorks:
      "USB host and USB device locations are separated, then linked using an extender path suitable for the required distance and bandwidth.",
    roomFit:
      "One end at the USB host (laptop, room PC or codec), the other at the peripheral (camera, microphone or touch display). It bridges the gap when the host and the device are not in the same place.",
    connectivity: [
      "USB host connection at the laptop, room PC or codec.",
      "USB device connection for camera, microphone, speakerphone, touch or keyboard/mouse.",
      "Transport link between transmitter and receiver.",
      "Video path where KVM or combined extender products include it.",
    ],
    usefulFunctionality: [
      "Extends conferencing peripherals.",
      "Supports touch display return USB.",
      "Supports keyboard/mouse control where required.",
      "Can sit alongside matrix, HDBaseT, AVoIP or UC systems.",
    ],
    specialFeatures: [
      "Turns a video-only design into a usable meeting or control workflow.",
      "Good add-on conversation for BYOD and room PC projects.",
      "Useful independently of the main video architecture.",
    ],
    bestFit: [
      "BYOD rooms with remote cameras or microphones.",
      "Touch displays.",
      "Rack-mounted room PCs.",
      "Operator workstations and KVM-style environments.",
    ],
    discoveryQuestions: [
      "Where is the USB host?",
      "Where are the USB devices?",
      "What USB speed and device type are required?",
    ],
    positionAgainst:
      "Do not assume the video product carries USB. Confirm the USB path separately and add USB extension where the architecture needs it.",
    whenNotToLead: [
      "There are no USB devices or interactive peripherals.",
      "All USB devices are already local to the host.",
      "The requirement is only display extension.",
      "Wireless conferencing is the preferred workflow and meets the customer's need.",
    ],
    salesRule:
      "Every conferencing-led design needs a deliberate USB answer.",
  },
  {
    id: "cameras-bridges",
    name: "Cameras, bridges and NDI",
    shortPosition: "Capture and bridging products for meetings, teaching, streaming, recording and multi-camera rooms.",
    productSkus: ["APO-CAM210-NDI-PTZ", "CAM-210-NDI-PTZ", "CAM-420-PTZ", "CAM-0402-BRG", "CAM-0402-NDI-BRG", "NHD-128-NDI-TRX"],
    pitchQuery: "WyreStorm camera bridge NDI PTZ",
    customerPitch:
      "Camera and bridge products help the customer capture the right people or content and deliver it into the platform that needs it, such as USB conferencing, HDMI display, streaming or NDI workflows.",
    whatItIs:
      "A capture and conversion family for PTZ cameras, camera switching, USB bridge workflows and network-video integration.",
    whyItExists:
      "Hybrid meetings, lectures and events often need more than one camera or more than one output format.",
    howItWorks:
      "Camera or video sources are captured, switched or bridged into the required output path for conferencing, production, display, recording or AV-over-IP integration.",
    roomFit:
      "Cameras mount where the shot needs them - front, rear, ceiling or lectern; bridges live in the rack or near the room PC. Always trace the cable back to where the video has to arrive.",
    connectivity: [
      "Camera inputs such as USB, HDMI or network video depending on the product.",
      "USB output to conferencing platforms where bridge workflows are used.",
      "HDMI or network outputs where display, recording or NDI workflows are required.",
      "Control connections for camera selection or preset operation where supported.",
    ],
    usefulFunctionality: [
      "Improves meeting, teaching or event capture.",
      "Combines multiple cameras or source types in bridge workflows.",
      "Supports NDI conversations where network video is part of the system.",
      "Can turn professional cameras into a conferencing-friendly source.",
    ],
    specialFeatures: [
      "Strong fit for hybrid work and education.",
      "CAM-0402-BRG and CAM-0402-NDI-BRG style conversations simplify multi-camera bridging.",
      "NHD-128-NDI-TRX can support NetworkHD/NDI bridge discussions where appropriate.",
    ],
    bestFit: [
      "Hybrid classrooms.",
      "Council chambers and training rooms.",
      "Streaming and recording rooms.",
      "Meeting spaces where a laptop webcam is not enough.",
    ],
    discoveryQuestions: [
      "How many cameras or video sources need to be captured?",
      "Where does the output need to go: USB, HDMI, NDI, recording, streaming or AVoIP?",
      "Does the user need camera switching, presets or multiview?",
    ],
    positionAgainst:
      "Position camera products by workflow: capture, switch, bridge, stream, record or route. Do not sell a camera SKU before the destination is known.",
    whenNotToLead: [
      "The room already has a suitable camera and only needs AV transport.",
      "The customer only needs presentation switching.",
      "Audio and microphone requirements are unresolved.",
      "The output platform is not known.",
    ],
    salesRule:
      "Camera selection starts with where the image must end up, not just how good the camera looks.",
  },
  {
    id: "audio-dante",
    name: "Audio, microphones and Dante",
    shortPosition: "Audio products and network-audio workflows that complete the room experience beyond video.",
    productSkus: ["AMP-260-DNT", "APO-VX20-UC"],
    pitchQuery: "WyreStorm audio Dante amplifier microphone",
    customerPitch:
      "Audio is often the part users judge first. WyreStorm audio products help connect, process, amplify or network the sound path so the room works properly.",
    whatItIs:
      "A supporting family for room audio, amplification, audio extraction, microphones, conferencing audio and Dante/AES67-style network audio workflows.",
    whyItExists:
      "Video switching alone does not make a working room. Speech, programme audio and conferencing audio need their own signal path.",
    howItWorks:
      "Audio is taken from sources, microphones or conferencing devices, then routed, processed, amplified or handed into the wider room audio system.",
    roomFit:
      "Amplifiers and DSP live in the rack or a local cabinet; microphones and speakers sit out in the room. Back-of-house kit the customer hears but never sees.",
    connectivity: [
      "Analogue audio where the product supports local audio I/O.",
      "Dante or network audio where the selected design requires it.",
      "Speaker outputs on amplifier products.",
      "USB audio where conferencing devices are part of the workflow.",
    ],
    usefulFunctionality: [
      "Powers installed speakers where amplifier products are used.",
      "Helps extract or route audio separately from video.",
      "Supports conferencing audio paths.",
      "Connects into Dante-ready designs where required.",
    ],
    specialFeatures: [
      "Turns a video quote into a complete room design.",
      "Important for education, meeting and hybrid rooms.",
      "Useful when DSP, microphones or network audio are already specified.",
    ],
    bestFit: [
      "Meeting rooms with installed speakers.",
      "Teaching spaces with speech reinforcement.",
      "Hybrid conferencing rooms.",
      "Rooms with Dante or network-audio infrastructure.",
    ],
    discoveryQuestions: [
      "Is audio for speech, programme sound, conferencing, recording or all of these?",
      "Are microphones, DSP, speakers or Dante devices already involved?",
      "Where does the audio need to enter and leave the system?",
    ],
    positionAgainst:
      "Treat audio as part of the design, not as an accessory after the video product has been chosen.",
    whenNotToLead: [
      "The customer only needs video transport and already has audio solved.",
      "Speaker load, DSP or microphone requirements are unknown.",
      "A third-party audio system owns the complete audio path and no WyreStorm audio role is needed.",
    ],
    salesRule:
      "If the room involves people speaking, audio discovery is mandatory.",
  },
  {
    id: "cables-aoc",
    name: "Cables and active optical",
    shortPosition: "Reliable signal-path products for high-bandwidth and awkward cable-run requirements.",
    productSkus: ["CAB-HAOC-10", "CAB-HAOC-15", "CAB-HAOC-20", "CAB-HAOC-30"],
    pitchQuery: "WyreStorm cable active optical HDMI",
    customerPitch:
      "Cables and active optical products are not glamorous, but they protect the system from avoidable signal problems when a passive cable is not the right answer.",
    whatItIs:
      "A signal-path family for connecting sources, displays and equipment where the cable itself affects system reliability.",
    whyItExists:
      "Many support issues come from the wrong cable for the distance, bandwidth or installation route.",
    howItWorks:
      "The correct cable carries the required video, audio or data signal between devices while respecting distance, bandwidth and installation constraints.",
    roomFit:
      "Between any two devices - source to display, rack to screen, or patched within the rack itself. The cable is the quiet link the rest of the system depends on.",
    connectivity: [
      "Source-to-display or source-to-equipment links.",
      "Rack patching and display connections.",
      "Active optical paths for longer or higher-bandwidth runs where appropriate.",
      "Adapter or accessory use where the system design requires it.",
    ],
    usefulFunctionality: [
      "Protects high-resolution signal paths.",
      "Helps avoid unreliable long passive HDMI runs.",
      "Supports clean installation and serviceability.",
      "Can be the right answer before adding active electronics.",
    ],
    specialFeatures: [
      "Commercially useful add-on for reliability.",
      "Helps reps talk about risk reduction, not just accessories.",
      "Often simpler than an extender when the distance and route fit.",
    ],
    bestFit: [
      "Rack-to-display or local equipment links.",
      "High-resolution display connections.",
      "Installations where cable quality is a known risk.",
      "Projects where active electronics are unnecessary.",
    ],
    discoveryQuestions: [
      "What signal, resolution and refresh rate need to pass?",
      "What is the cable distance and route?",
      "Is this permanent installation, user-facing cable, rack patching or display connection?",
    ],
    positionAgainst:
      "Use cable products when the problem is a reliable physical connection. Use extenders, matrix or AVoIP when the requirement is distance, routing or system behaviour.",
    whenNotToLead: [
      "The distance exceeds the cable's practical role.",
      "The customer needs switching or routing.",
      "USB, control or audio paths also need active transport.",
      "The installation route requires a different transport technology.",
    ],
    salesRule:
      "A cable is part of the system design when the signal path depends on it.",
  },
  {
    id: "control-management",
    name: "Control and management",
    shortPosition: "Control interfaces and management tools that make the AV system usable, supportable and easier to operate.",
    productSkus: ["SYGMA", "NHD-CTL-PRO", "NHD-000-CTL"],
    pitchQuery: "WyreStorm control management SYGMA touch",
    customerPitch:
      "Control and management products help the customer operate the system confidently after installation, reducing confusion and support effort.",
    whatItIs:
      "A supporting family for touch panels, keypads, control gateways, presets and management workflows such as SYGMA where applicable.",
    whyItExists:
      "A technically correct AV system can still fail if users do not know how to operate it or support teams cannot see what is happening.",
    howItWorks:
      "Control devices and management tools sit above the signal path, triggering presets, display control, source selection or support visibility.",
    roomFit:
      "Touch panels and keypads go where the user operates the room - table, wall or lectern; gateways and management kit sit in the rack. The interface is what people see; the brains stay hidden.",
    connectivity: [
      "Network control connections.",
      "RS-232, IR, relay or other control paths where required by the device and system.",
      "Touch panel or keypad interfaces for users.",
      "Cloud or management connection where the selected workflow supports it.",
    ],
    usefulFunctionality: [
      "Simplifies room operation.",
      "Triggers routing and display presets.",
      "Supports remote visibility or service workflows where available.",
      "Helps dealers sell a more complete and supportable system.",
    ],
    specialFeatures: [
      "Turns technical capability into a user-friendly room.",
      "Useful for repeatable room types and multi-room estates.",
      "Supports stronger proposal wording around support and operation.",
    ],
    bestFit: [
      "Rooms used by non-technical staff.",
      "Multi-room deployments.",
      "AV-over-IP systems with routing presets.",
      "Projects where support and handover matter commercially.",
    ],
    discoveryQuestions: [
      "Who operates the room day to day?",
      "What should one button or preset do?",
      "Who supports the system after handover, and do they need visibility?",
    ],
    positionAgainst:
      "Control is not a substitute for the right transport architecture. It makes the selected architecture usable and supportable.",
    whenNotToLead: [
      "The system is a very simple always-on path.",
      "A third-party control system already owns the full interface.",
      "The room behaviour has not been defined.",
      "The customer only asked for hardware replacement and no control change is allowed.",
    ],
    salesRule:
      "Control should match the user journey: what does the person in the room need to press, see or avoid thinking about?",
  },
];

const decisionRules = [
  "Use AVoIP when flexibility, expansion, distributed locations or shared sources are the value.",
  "Check matrix for fewer than around 12 outputs, fixed routing or tight budgets.",
  "Use HDBaseT or extension when the main problem is distance, not routing.",
  "Use presentation/UC when the room workflow is laptops, USB-C, BYOD/BYOM or conferencing.",
  "Treat USB, audio and control as design paths, not afterthoughts.",
];

function findGuide(id: string) {
  return familyGuides.find((guide) => guide.id === id) ?? familyGuides[0];
}

function productPitchSkuPath(sku: string) {
  return `${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(sku)}`;
}

function productPitchRangePath(query: string) {
  return `${routeCatalogByKey.productPitch.path}?q=${encodeURIComponent(query)}`;
}
export function ProductFamilyPage() {
  const [activeFamilyId, setActiveFamilyId] = useState(familyGuides[0].id);
  const activeFamily = useMemo(() => findGuide(activeFamilyId), [activeFamilyId]);

  return (
    <div className="space-y-5 pb-6">
      <PageHero
        eyebrow="Product families"
        title="WyreStorm range positioning for sales conversations"
        purpose="Use this page to explain what each WyreStorm product family does, why it exists, how it connects, and when to position it."
        nextMove="Start with the application and room behaviour, choose the right family, then move into Product Pitch or Finder for SKU-level output."
        actions={[
          { label: "Open Product Pitch", to: routeCatalogByKey.productPitch.path },
          { label: "Open Finder", to: routeCatalogByKey.finder.path, variant: "secondary" },
          { label: "Build proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Fast architecture rules"
        subtitle="Use these before choosing a family, especially when deciding between AVoIP, matrix, HDBaseT and UC products."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {decisionRules.map((rule, index) => (
            <div key={rule} className="rounded-2xl border border-[#29465e] bg-[#0d2133] p-4">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs text-white">{index + 1}</span>
                Rule
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/70">{rule}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <SectionCard title="Choose family" subtitle="Pick the family that best matches the customer application before discussing SKUs.">
          <div className="space-y-2">
            {familyGuides.map((guide) => {
              const active = guide.id === activeFamily.id;

              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setActiveFamilyId(guide.id)}
                  className={[
                    "w-full rounded-2xl border p-4 text-left transition",
                    active ? "border-cyan-300 bg-[#10263a] text-white" : "border-[#29465e] bg-[#0d2133] text-white/70 hover:border-[#29465e] hover:bg-[#0d2133]",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2 text-sm font-black">
                    {active ? <CheckCircle2 className="h-4 w-4 text-cyan-600" /> : <BookOpenCheck className="h-4 w-4 text-slate-400" />}
                    {guide.name}
                  </span>
                  <span className="mt-2 block text-xs font-semibold leading-5 text-white/60">{guide.shortPosition}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <section className="wingman-section-card wingman-surface overflow-hidden rounded-3xl">
          <header className="border-b border-[#29465e] p-5">
            <p className="wingman-kicker">Family crib sheet</p>
            <h2 className="mt-2 text-3xl font-black text-white">{activeFamily.name}</h2>
            <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-white/70">{activeFamily.customerPitch}</p>
          </header>

          <div className="space-y-5 p-5">
            <div className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="wingman-kicker">Representative SKUs</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Products to start the conversation</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                    Use this as a quick range view. Open a specific SKU for a one-page pitch, or pitch the whole range when the exact model is not fixed yet.
                  </p>
                </div>

                <Link
                  to={productPitchRangePath(activeFamily.pitchQuery)}
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#29465e] bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Pitch this range
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {activeFamily.productSkus.map((sku) => (
                  <Link
                    key={sku}
                    to={productPitchSkuPath(sku)}
                    className="group rounded-2xl border border-[#29465e] bg-[#0d2133] p-4 text-left transition hover:border-cyan-300 hover:bg-[#10263a]"
                  >
                    <span className="block text-xs font-medium uppercase tracking-[0.22em] text-white/55">SKU</span>
                    <strong className="mt-1 block text-base font-semibold text-white">{sku}</strong>
                    <span className="mt-3 inline-flex text-sm font-medium text-cyan-700 group-hover:text-cyan-800">
                      Open pitch
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <FamilyTextBlock icon={<Sparkles className="h-4 w-4 text-cyan-600" />} title="What it is" text={activeFamily.whatItIs} />
              <FamilyTextBlock icon={<HelpCircle className="h-4 w-4 text-sky-600" />} title="Why it exists" text={activeFamily.whyItExists} />
              <FamilyTextBlock icon={<Workflow className="h-4 w-4 text-emerald-600" />} title="How it works" text={activeFamily.howItWorks} />
            </div>

            <FamilyTextBlock icon={<MapPin className="h-4 w-4 text-cyan-600" />} title="Where it sits in the room" text={activeFamily.roomFit} />

            <details className="wm-decision-details">
              <summary>More product detail</summary>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <FamilyListBlock icon={<Cable className="h-4 w-4 text-cyan-600" />} title="Connectivity" items={activeFamily.connectivity} />
                <FamilyListBlock icon={<Network className="h-4 w-4 text-sky-600" />} title="Useful functionality" items={activeFamily.usefulFunctionality} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <FamilyListBlock title="Special features" items={activeFamily.specialFeatures} />
                <FamilyListBlock title="Best-fit applications" items={activeFamily.bestFit} />
                <FamilyListBlock title="When not to lead" items={activeFamily.whenNotToLead} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
                <div className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-5">
                  <h3 className="flex items-center gap-2 text-sm font-black text-white">
                    <Search className="h-4 w-4 text-cyan-600" />
                    Discovery questions
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {activeFamily.discoveryQuestions.map((question) => (
                      <li key={question} className="flex gap-2 text-sm font-semibold leading-6 text-white/70">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-cyan-300" />
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-[#29465e] bg-slate-950 p-5 text-white">
                    <h3 className="text-sm font-black">Position against alternatives</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">{activeFamily.positionAgainst}</p>
                  </div>

                  <div className="rounded-3xl border border-cyan-200 bg-[#10263a] p-5">
                    <h3 className="text-sm font-black text-white">Sales rule</h3>
                    <p className="mt-3 text-sm font-black leading-6 text-[#edf6ff]">{activeFamily.salesRule}</p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
}

function FamilyTextBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-5">
      <h3 className="flex items-center gap-2 text-sm font-black text-white">
        {icon}
        {title}
      </h3>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/70">{text}</p>
    </div>
  );
}

function FamilyListBlock({ icon, title, items }: { icon?: ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-[#29465e] bg-[#0d2133] p-5">
      <h3 className="flex items-center gap-2 text-sm font-black text-white">
        {icon}
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-white/70">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductFamilyPage;

