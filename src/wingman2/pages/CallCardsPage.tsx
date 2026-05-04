import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SalesToneQuickSetter } from "../components/SalesToneQuickSetter";

const CARD_STORAGE_KEY = "wingman.callCards.selected";
const WORKFLOW_STORAGE_KEY = "wingman.callCards.workflowPage";
const CUSTOMER_STORAGE_KEY = "wingman.callCards.customer";
const ROOM_STORAGE_KEY = "wingman.callCards.room";
const RISK_STORAGE_KEY = "wingman.callCards.risks";
const NEXT_STORAGE_KEY = "wingman.callCards.next";
const QUESTION_RESPONSE_STORAGE_KEY = "wingman.callCards.questionResponses";

const ANSWER_OPTIONS = [
  { value: "not-asked", label: "Not asked yet" },
  { value: "confirmed", label: "Confirmed / required" },
  { value: "not-required", label: "Not required" },
  { value: "unknown", label: "Unknown / needs checking" },
  { value: "follow-up", label: "Follow-up required" },
  { value: "risk", label: "Risk / design flag" }
] as const;

type WorkflowPage = "select" | "qa";

type QuestionResponse = {
  status: string;
  note: string;
};

type QuestionResponseMap = Record<string, QuestionResponse>;

const CALL_CARD_DECKS = [
  {
    id: "new-opportunity",
    title: "Start a new opportunity",
    eyebrow: "Discovery opener",
    intent: "Use this when the customer asks for a product before the real room requirement is clear.",
    route: "/discovery",
    nextMove: "Open Discovery",
    conversation: {
      goal: "Slow the call down and uncover the room behaviour before choosing hardware.",
      say: "Before we pick hardware, let me understand what the room needs to let people do.",
      position: "This keeps the recommendation accurate and avoids quoting a box that does not match the real workflow.",
      outcome: "A clear room/application brief that can move into Discovery."
    },
    qa: [
      {
        question: "What type of space is this?",
        answerPrompt: "Meeting room, classroom, hospitality, retail, control room, event space or something else.",
        capture: "Room type and business purpose."
      },
      {
        question: "What should users be able to do in the room?",
        answerPrompt: "Present, meet, teach, monitor, stream, control content or route content between spaces.",
        capture: "Primary workflow."
      },
      {
        question: "How many sources and displays are involved?",
        answerPrompt: "Include source/display locations, not just the count.",
        capture: "I/O count and physical layout."
      },
      {
        question: "Is USB, camera, microphone, audio or control required?",
        answerPrompt: "Look for BYOD, BYOM, conferencing, touch displays, speakerphones and control panels.",
        capture: "Non-video requirements."
      }
    ],
    listenFor: ["Unclear source/display count", "Remote equipment locations", "USB/camera requirement", "Need for simple operation", "Future expansion"],
    wyrestormCue: "Start with Discovery, then decide whether this is a switcher, extender, matrix, AVoIP, UC, video wall or proposal workflow."
  },
  {
    id: "meeting-room",
    title: "Meeting room / BYOD / BYOM",
    eyebrow: "Conference room",
    intent: "Use this for laptops, USB-C, wireless presentation, Teams/Zoom, cameras or room audio.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Separate presentation, conferencing, USB and room control into a clean user workflow.",
      say: "Let us separate the presentation workflow from the conferencing workflow so the system is easy for users.",
      position: "A good meeting room is not just video switching. It needs the laptop, camera, microphone, display and control experience to feel joined-up.",
      outcome: "A shortlist for UC, presentation switcher, camera, audio and cable-management products."
    },
    qa: [
      {
        question: "Will users bring laptops, use a room PC, or need both?",
        answerPrompt: "Check BYOD, BYOM and MTR/Zoom Room style operation.",
        capture: "Host device model."
      },
      {
        question: "Is this single display, dual display or MST?",
        answerPrompt: "Ask whether they want duplicate content, extended desktop, content plus people, or independent outputs.",
        capture: "Display behaviour."
      },
      {
        question: "Is wireless presentation or wireless conferencing required?",
        answerPrompt: "Wireless presentation shares content. Wireless conferencing also brings USB camera/audio back to the laptop.",
        capture: "Wireless requirement."
      },
      {
        question: "What USB devices are in the room?",
        answerPrompt: "Camera, video bar, speakerphone, microphone hub, touch display, keyboard or mouse.",
        capture: "USB device list and locations."
      }
    ],
    listenFor: ["USB-C with charging", "Dual display or MST", "Wireless conferencing dongles", "Camera/mic locations", "Table cable management"],
    wyrestormCue: "Likely paths: SW-620/SW-640, MX-0402-MST, MX-0403-H3-MST, Apollo video bars, HALO, cameras, speakerphones and IDB-300."
  },
  {
    id: "sell-against-competitors",
    title: "Sell WyreStorm against competitors",
    eyebrow: "Competitive positioning",
    intent: "Use this when WyreStorm is being compared against another manufacturer.",
    route: "/compare",
    nextMove: "Open Compare",
    conversation: {
      goal: "Move the discussion from brand comparison to requirement, risk and application fit.",
      say: "Let us compare the requirement, not just the logo on the box.",
      position: "The right answer depends on workflow, reliability, support, availability, ecosystem fit and total system risk.",
      outcome: "A clear comparison angle without putting competitor products into a WyreStorm proposal."
    },
    qa: [
      {
        question: "Which competitor product or family is being considered?",
        answerPrompt: "Get the exact model if possible, not just the brand.",
        capture: "Competitor model and reason it is being considered."
      },
      {
        question: "Is the comparison technical, commercial or familiarity-led?",
        answerPrompt: "Price, feature match, stock, consultant spec, dealer preference or support concern.",
        capture: "Decision driver."
      },
      {
        question: "Which features are essential?",
        answerPrompt: "USB, Dante, multiview, video wall, scaling, wireless, control, security, management or expansion.",
        capture: "Must-have features."
      },
      {
        question: "What would make the customer confident enough to choose WyreStorm?",
        answerPrompt: "Evidence, diagram, demo, support statement, warranty position, availability or technical explanation.",
        capture: "Confidence requirement."
      }
    ],
    listenFor: ["Price-only comparison", "Missing feature match", "Unsupported workflow", "Support concern", "Consultant pressure"],
    wyrestormCue: "Competitor data is for positioning only. Keep the BOM and proposal WyreStorm-first unless the user explicitly asks for comparison-only output."
  },
  {
    id: "ndi-camera-bridges",
    title: "NDI cameras and camera bridges",
    eyebrow: "Camera workflow",
    intent: "Use this for conferencing, lecture capture, streaming, NDI, multi-camera rooms and camera bridging.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Map capture, switching, bridging, distribution and conferencing before choosing the camera product.",
      say: "Let us map the camera workflow first: capture, switch, bridge, distribute, record or send into a meeting platform.",
      position: "Camera projects often fail when the camera output format and the user workflow are not matched.",
      outcome: "A camera / bridge / NDI / USB workflow that can be specified clearly."
    },
    qa: [
      {
        question: "How many cameras are needed and what type are they?",
        answerPrompt: "USB webcam, HDMI camera, PTZ camera, NDI camera or mixed sources.",
        capture: "Camera count and formats."
      },
      {
        question: "Where does the camera signal need to go?",
        answerPrompt: "Laptop over USB, display over HDMI, NDI network, recording/streaming system or AVoIP.",
        capture: "Output destinations."
      },
      {
        question: "Does the user need camera switching or multiview?",
        answerPrompt: "Ask whether multiple cameras must be previewed, selected or combined.",
        capture: "Switching and multiview need."
      },
      {
        question: "Is this part of a NetworkHD system?",
        answerPrompt: "NDI can be brought into NetworkHD workflows where the right gateway and decoder path is used.",
        capture: "AVoIP integration requirement."
      }
    ],
    listenFor: ["Multiple camera sources", "NDI network present", "USB bridge to conferencing", "Streaming/recording", "Presenter tracking"],
    wyrestormCue: "Likely paths: CAM-210-NDI-PTZ, CAM-420-PTZ, CAM-0402-NDI-BRG, CAM-0402-BRG, NHD-128-NDI-TRX and NHD-150-RX workflows."
  },
  {
    id: "matrix-switches-kits",
    title: "Matrix switches and kits",
    eyebrow: "Fixed routing",
    intent: "Use this when source/display count is known and the customer does not need full AVoIP flexibility.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Decide whether a fixed matrix, HDBaseT kit or seamless matrix is cleaner than AVoIP.",
      say: "A matrix is often the cleanest answer when the I/O count is known and the system does not need distributed network expansion.",
      position: "Fixed routing can be simpler, cheaper and easier to support than AVoIP when the requirement is stable.",
      outcome: "A matrix family recommendation with receivers, scaling and control needs identified."
    },
    qa: [
      {
        question: "How many sources and displays are needed now?",
        answerPrompt: "Confirm whether every source needs to route to every display.",
        capture: "Matrix size and routing requirement."
      },
      {
        question: "Are displays local HDMI, remote HDBaseT or mixed?",
        answerPrompt: "Distance and cable route determine whether a kit or matrix plus receivers is required.",
        capture: "Output transport type."
      },
      {
        question: "Is scaling or seamless switching needed?",
        answerPrompt: "Ask about mixed display resolutions, black-screen avoidance and professional switching behaviour.",
        capture: "Processing requirement."
      },
      {
        question: "Is multiview or video wall required?",
        answerPrompt: "Multiple outputs do not automatically mean multiview. Confirm if one output must show multiple sources at once.",
        capture: "Processing behaviour."
      }
    ],
    listenFor: ["Fixed I/O", "Remote display runs", "HDBaseT receivers", "Scaling", "Audio de-embed", "Budget-sensitive replacement"],
    wyrestormCue: "Likely paths: HDMI matrix, HDBaseT matrix kits, seamless matrix products, or AVoIP only if flexibility and expansion justify it."
  },
  {
    id: "sygma-cloud",
    title: "SYGMA Cloud / remote management",
    eyebrow: "Management",
    intent: "Use this with IT-led customers, managed estates, education and support-led opportunities.",
    route: "/proposal",
    nextMove: "Open Proposal",
    conversation: {
      goal: "Move the discussion from installation to long-term management and support.",
      say: "The discussion is not just switching video. It is how the customer manages, monitors and supports the system after installation.",
      position: "Remote visibility can reduce support effort, improve confidence and help dealers offer a stronger managed service.",
      outcome: "A proposal angle around monitoring, diagnostics, maintenance and operational confidence."
    },
    qa: [
      {
        question: "Who supports the system after handover?",
        answerPrompt: "AV team, IT, facilities, integrator, managed service provider or venue staff.",
        capture: "Support owner."
      },
      {
        question: "Is this one room or an estate?",
        answerPrompt: "Multi-room and multi-site deployments benefit most from management visibility.",
        capture: "Deployment scale."
      },
      {
        question: "What support problems are they trying to avoid?",
        answerPrompt: "Downtime, truck rolls, firmware uncertainty, device status checks or slow fault diagnosis.",
        capture: "Operational pain points."
      },
      {
        question: "Could remote management support a service contract?",
        answerPrompt: "This can help the dealer sell ongoing value rather than only hardware.",
        capture: "Managed service opportunity."
      }
    ],
    listenFor: ["Multi-room estate", "IT ownership", "Support cost concern", "Remote diagnostics", "Managed service opportunity"],
    wyrestormCue: "Position SYGMA as operational value: visibility, diagnostics, maintenance support and reduced service effort where supported."
  },
  {
    id: "warranty-support",
    title: "Warranty and support confidence",
    eyebrow: "Risk reduction",
    intent: "Use this when the customer, dealer or procurement team is nervous about risk.",
    route: "/proposal",
    nextMove: "Open Proposal",
    conversation: {
      goal: "Capture the support concern and avoid inventing warranty terms.",
      say: "Let us make sure the customer understands the support route and protection behind the system, not just the hardware price.",
      position: "Warranty and support are confidence topics. They must be accurate, region-specific and customer-safe.",
      outcome: "A support/warranty note to verify before it goes into customer-facing wording."
    },
    qa: [
      {
        question: "Who is asking about warranty?",
        answerPrompt: "End user, dealer, consultant, procurement or internal sales.",
        capture: "Stakeholder and reason."
      },
      {
        question: "What is the actual concern?",
        answerPrompt: "Past failure, SLA, tender wording, replacement route, repair route or firmware support.",
        capture: "Support risk."
      },
      {
        question: "Which products and region are involved?",
        answerPrompt: "Warranty position may vary by product, region and commercial route.",
        capture: "Products and region."
      },
      {
        question: "Do they need formal wording?",
        answerPrompt: "If yes, verify against the current official WyreStorm warranty/support position.",
        capture: "Proposal wording requirement."
      }
    ],
    listenFor: ["Tender requirement", "Procurement risk", "Previous failure", "SLA expectation", "Regional variation"],
    wyrestormCue: "Do not invent warranty terms. Capture the concern, then confirm the current official wording before issuing a proposal statement."
  },
  {
    id: "extension",
    title: "Signal extension",
    eyebrow: "Point-to-point transport",
    intent: "Use this when the source and display are too far apart for a normal HDMI or USB cable.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Choose transport based on distance, bandwidth, cable route and USB/control needs.",
      say: "The right extender depends on distance, signal type and whether USB needs to travel with the video.",
      position: "The site route often decides the product family before preference or price does.",
      outcome: "A clear HDMI, HDBaseT, USB, KVM, fibre or AVoIP transport direction."
    },
    qa: [
      {
        question: "What is the source, display and physical distance?",
        answerPrompt: "Capture the actual cable route, not just the room size.",
        capture: "Point-to-point path."
      },
      {
        question: "What signal type must be extended?",
        answerPrompt: "HDMI, USB-C, DisplayPort, USB, audio, control or multiple signals.",
        capture: "Signal types."
      },
      {
        question: "What resolution and refresh rate are required?",
        answerPrompt: "4K30, 4K60, 5K, 8K and HDR requirements change the answer.",
        capture: "Video bandwidth."
      },
      {
        question: "Does USB need to travel with the video?",
        answerPrompt: "Camera, speakerphone, keyboard/mouse, touch display or storage.",
        capture: "USB requirement."
      }
    ],
    listenFor: ["Distance above HDMI limit", "USB extension", "4K60 / 5K / 8K", "Control pass-through", "Existing cable type"],
    wyrestormCue: "Likely paths: HDMI/USB-C cables for short runs, HDBaseT or KVM extenders for room transport, USB extenders for peripheral-only extension, fibre or AOC for longer paths."
  },
  {
    id: "usb-kvm",
    title: "USB / KVM extension",
    eyebrow: "Peripheral transport",
    intent: "Use this when cameras, speakerphones, touch displays, keyboard/mouse or room PCs are involved.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Clarify USB host, devices, distance and bandwidth before selecting video transport.",
      say: "USB is often the part that breaks the user experience. Let us confirm host, device, distance and bandwidth first.",
      position: "Video may look simple, but USB determines whether conferencing, control and user interaction actually work.",
      outcome: "A USB/KVM transport choice that matches the room behaviour."
    },
    qa: [
      {
        question: "Where is the USB host?",
        answerPrompt: "Laptop, room PC, codec, capture device or control computer.",
        capture: "USB host location."
      },
      {
        question: "Where are the USB devices?",
        answerPrompt: "Camera, speakerphone, microphone hub, touch display, keyboard/mouse or storage.",
        capture: "USB device locations."
      },
      {
        question: "What USB speed is required?",
        answerPrompt: "USB 2.0 may suit audio/control. USB 3.x may be required for higher-bandwidth cameras.",
        capture: "USB bandwidth."
      },
      {
        question: "Does USB need to follow video switching?",
        answerPrompt: "Fixed USB, switched USB and routed USB are different system behaviours.",
        capture: "USB routing behaviour."
      }
    ],
    listenFor: ["USB camera distance", "Room PC in rack", "Touch display return USB", "BYOM switching", "Bandwidth mismatch"],
    wyrestormCue: "Likely paths: USB extenders, KVM extenders, NetworkHD 500 USB over IP, or UC/presentation switchers for room-local BYOM."
  },
  {
    id: "audio-microphones-dante",
    title: "Audio, microphones and Dante",
    eyebrow: "Room audio",
    intent: "Use this when the room needs microphones, speakerphones, audio de-embedding, Dante, amplification or USB audio.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Treat audio as part of the workflow, not an afterthought.",
      say: "Poor audio is usually the first thing users complain about, so let us define the audio path properly.",
      position: "The correct microphone, DSP, USB audio and speaker path protects the meeting experience.",
      outcome: "A clear audio requirement for conferencing, local playback, amplification or network audio."
    },
    qa: [
      {
        question: "What is the audio for?",
        answerPrompt: "Conferencing, local reinforcement, program audio, streaming, recording or all of these.",
        capture: "Audio use case."
      },
      {
        question: "Where will people speak from?",
        answerPrompt: "Room size and speaking positions determine microphone approach.",
        capture: "Pickup area."
      },
      {
        question: "Where does audio need to go?",
        answerPrompt: "Laptop over USB, speakers over analog, Dante/AES67 network, HDMI displays or amplifier.",
        capture: "Audio destinations."
      },
      {
        question: "Is DSP, AEC or noise suppression required?",
        answerPrompt: "Important for conferencing and larger rooms.",
        capture: "Processing requirement."
      }
    ],
    listenFor: ["Larger pickup area", "Hybrid meeting complaints", "Dante/AES67", "AEC/DSP", "USB audio bridge"],
    wyrestormCue: "Likely paths: Apollo/HALO UC audio, APO-SKY-MIC, COM-MIC-HUB, HALO speakerphones, AMP-260-DNT or audio de-embed solutions."
  },
  {
    id: "control-touch-panels",
    title: "Control and simple operation",
    eyebrow: "User experience",
    intent: "Use this when the customer wants one-button operation, presets, display control or simpler room operation.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Define the user journey before choosing control hardware.",
      say: "A technically good system still fails if users cannot operate it.",
      position: "Simple control reduces support calls and makes the system feel professional.",
      outcome: "A control requirement for touch panel, keypad, tablet app, Web GUI, API or third-party control."
    },
    qa: [
      {
        question: "What should happen when the user walks in?",
        answerPrompt: "Display on, source selected, audio ready, camera active, room mode recalled.",
        capture: "Start-up workflow."
      },
      {
        question: "What should the user control?",
        answerPrompt: "Source, display power, volume, mute, camera, presets, room mode or video wall layouts.",
        capture: "Control functions."
      },
      {
        question: "What interface is preferred?",
        answerPrompt: "Touch panel, keypad, tablet app, web page, third-party control or automation.",
        capture: "Control interface."
      },
      {
        question: "What needs to be controlled behind the scenes?",
        answerPrompt: "Displays, amplifiers, screens, blinds, RS-232, IR, relay, CEC or IP devices.",
        capture: "Control protocols."
      }
    ],
    listenFor: ["Confusing current room", "One-button startup", "Third-party control", "Preset recall", "No-programming requirement"],
    wyrestormCue: "Likely paths: SYN-TOUCH10, SYN-KEY10, SYN-CTL-HUB, NetworkHD Touch, Companion Control, Web GUI/API, RS-232, IR, CEC and relay."
  },
  {
    id: "cables-distance",
    title: "Cables, distance and infrastructure",
    eyebrow: "Site reality",
    intent: "Use this when the issue is cable route, bandwidth, distance, conduit, rack position or installation risk.",
    route: "/discovery",
    nextMove: "Open Discovery",
    conversation: {
      goal: "Stop assumptions about cable routes from damaging the design.",
      say: "The hardware choice depends on the cable route. Let us check what can actually be installed before we specify the system.",
      position: "Distance, cable type and bandwidth often decide the architecture before product preference does.",
      outcome: "A transport decision based on real site constraints."
    },
    qa: [
      {
        question: "Where are the source, display, rack and user connection points?",
        answerPrompt: "Map the physical locations first.",
        capture: "Location map."
      },
      {
        question: "What are the cable distances and routes?",
        answerPrompt: "Include wall, floor, ceiling, conduit and rack paths.",
        capture: "Distance and route."
      },
      {
        question: "What cable type is available or allowed?",
        answerPrompt: "HDMI, USB-C, Cat cable, fibre, active optical, plenum or CPR requirement.",
        capture: "Infrastructure type."
      },
      {
        question: "What signal bandwidth is needed?",
        answerPrompt: "4K60, 5K, 8K, USB 3.x, Dante, control, Ethernet or combinations.",
        capture: "Bandwidth requirement."
      }
    ],
    listenFor: ["Unverified route", "Distance beyond HDMI", "Need for AOC/fibre", "USB-C length issue", "Compliance requirement"],
    wyrestormCue: "Likely paths: passive cables, active optical cables, HDBaseT, fibre, USB extenders or AVoIP depending on infrastructure."
  },
  {
    id: "avoip",
    title: "AV-over-IP distribution",
    eyebrow: "Flexible routing",
    intent: "Use this for many sources/displays, future expansion, hospitality, education, venues or control workflows.",
    route: "/finder",
    nextMove: "Open Finder",
    conversation: {
      goal: "Decide whether distributed routing justifies AV-over-IP over a fixed matrix.",
      say: "If the system needs flexibility, let us check whether fixed matrix switching or AV-over-IP is the better architecture.",
      position: "AV-over-IP is strongest when routing, scale, flexibility and future expansion matter.",
      outcome: "A NetworkHD family direction and network readiness check."
    },
    qa: [
      {
        question: "How many sources and displays are required on day one?",
        answerPrompt: "Include all rooms/zones, not only the first display area.",
        capture: "System scale."
      },
      {
        question: "Will the system expand or change later?",
        answerPrompt: "AVoIP is often justified by future flexibility.",
        capture: "Expansion requirement."
      },
      {
        question: "What matters most?",
        answerPrompt: "Cost, image quality, latency, USB, Dante/audio, control, scalability or support.",
        capture: "Priority driver."
      },
      {
        question: "Does any location need multiview, video wall, preview or tablet control?",
        answerPrompt: "These features affect NetworkHD family and accessory selection.",
        capture: "Advanced features."
      }
    ],
    listenFor: ["Many-to-many routing", "Future expansion", "USB over IP", "Dante/network audio", "Video wall/multiview"],
    wyrestormCue: "NetworkHD 100 for cost-effective low-bandwidth 4K, NetworkHD 500 for premium 4K60 4:4:4 with strong USB and Dante-ready workflows, NetworkHD 600 for 10G lossless zero-latency."
  },
  {
    id: "video-wall",
    title: "Video wall / LED wall",
    eyebrow: "Processing workflow",
    intent: "Use this for LCD walls, LED walls, menu boards, control visuals, hospitality and multi-source display canvases.",
    route: "/videowall",
    nextMove: "Open Video Wall",
    conversation: {
      goal: "Define the wall behaviour before choosing processor, matrix or AVoIP.",
      say: "A wall can be a single canvas, separate displays, a multiview canvas or a mixture. That behaviour decides the architecture.",
      position: "Do not assume AVoIP is always the answer. Dedicated processors, matrices and AVoIP all have valid places.",
      outcome: "A wall architecture direction with source count, layout and processing behaviour captured."
    },
    qa: [
      {
        question: "What is the wall size and layout?",
        answerPrompt: "2x2, 3x3, 1x4, LED canvas, mosaic or custom.",
        capture: "Wall geometry."
      },
      {
        question: "What should the wall show?",
        answerPrompt: "One large image, individual sources, signage, multiview or mixed layouts.",
        capture: "Wall behaviour."
      },
      {
        question: "How many sources must be visible at once?",
        answerPrompt: "This identifies whether true multiview is required.",
        capture: "Simultaneous source count."
      },
      {
        question: "Is it LCD or LED?",
        answerPrompt: "LED may require custom resolutions and different processing logic.",
        capture: "Display technology."
      }
    ],
    listenFor: ["Full canvas versus multiview", "LED custom resolution", "Simple presets", "Large expandable wall", "AVoIP flexibility"],
    wyrestormCue: "Consider SW-0204-VW, SW-0206-VW, seamless matrix products, NetworkHD 500/600, and NHD-0401-MV where true multiview is required."
  },
  {
    id: "upgrade-refresh",
    title: "Upgrade or replace legacy system",
    eyebrow: "Refresh project",
    intent: "Use this for old HDMI, VGA, HDBaseT, matrix or meeting room systems that no longer meet expectations.",
    route: "/discovery",
    nextMove: "Open Discovery",
    conversation: {
      goal: "Identify what can stay, what must change and what new workflow is required.",
      say: "Let us identify what still works, what is causing pain and what the upgraded room needs to do.",
      position: "A refresh should solve the user problem, not just replace old boxes with new boxes.",
      outcome: "A migration-friendly requirement with reuse, risk and upgrade scope captured."
    },
    qa: [
      {
        question: "What system is installed today?",
        answerPrompt: "Capture source, matrix, extenders, displays, control, audio and cabling.",
        capture: "Existing system."
      },
      {
        question: "What problem is driving the upgrade?",
        answerPrompt: "Failure, compatibility, user complaints, new laptop standards, USB-C, 4K or conferencing.",
        capture: "Upgrade driver."
      },
      {
        question: "What must remain?",
        answerPrompt: "Displays, cabling, rack, speakers, control, cameras or network.",
        capture: "Reuse constraints."
      },
      {
        question: "Is this like-for-like or capability upgrade?",
        answerPrompt: "This separates budget replacement from value-added redesign.",
        capture: "Commercial scope."
      }
    ],
    listenFor: ["Legacy VGA/HDMI", "Old matrix replacement", "USB-C need", "Reliability issues", "Existing cable reuse"],
    wyrestormCue: "Position around reduced support calls, modern laptop compatibility, improved conferencing workflow, signal reliability and clean migration."
  },
  {
    id: "consultant-specification",
    title: "Consultant or specification call",
    eyebrow: "Design influence",
    intent: "Use this when a consultant or technical stakeholder needs confidence before a product is specified.",
    route: "/proposal",
    nextMove: "Open Proposal",
    conversation: {
      goal: "Make the system easy to specify with clear requirement-led wording.",
      say: "Let us make the design easy to specify by describing the requirement, architecture and reason for the product choice.",
      position: "A good specification explains performance, dependencies and why the selected architecture fits.",
      outcome: "Proposal-ready technical narrative and evidence requirements."
    },
    qa: [
      {
        question: "Are they asking for a named product or performance spec?",
        answerPrompt: "Named product, equivalent-approved, basis-of-design or generic performance language.",
        capture: "Specification type."
      },
      {
        question: "What performance criteria must be documented?",
        answerPrompt: "Resolution, latency, USB, audio, Dante, control, security, management or scaling.",
        capture: "Technical criteria."
      },
      {
        question: "Is this single-room or estate-wide?",
        answerPrompt: "Standards often matter more than one-off feature fit.",
        capture: "Deployment standard."
      },
      {
        question: "What would prevent acceptance?",
        answerPrompt: "Network policy, cable type, warranty, lack of evidence, control protocol or availability.",
        capture: "Acceptance risks."
      }
    ],
    listenFor: ["Tender wording", "Equivalent approval", "Performance criteria", "Network/security", "Need for diagrams"],
    wyrestormCue: "Use architecture-led wording. Explain why the WyreStorm family fits, then list dependencies and exclusions clearly."
  },
  {
    id: "dealer-attachment",
    title: "Dealer add-on opportunity",
    eyebrow: "Attach sale",
    intent: "Use this when a dealer is selling displays, LED, UC, furniture or installation but has not considered the AV path.",
    route: "/proposal",
    nextMove: "Open Proposal",
    conversation: {
      goal: "Find the missing signal path around the product the dealer is already selling.",
      say: "The display is only one part of the job. Let us check what needs to feed it, control it and make it usable every day.",
      position: "This protects the dealer from underquoting and creates a more complete customer solution.",
      outcome: "A higher-value project scope with required and optional items separated."
    },
    qa: [
      {
        question: "What is the dealer already selling?",
        answerPrompt: "Displays, LED wall, UC kit, furniture, installation or service.",
        capture: "Primary deal."
      },
      {
        question: "What sources feed the system?",
        answerPrompt: "Laptops, signage players, media players, cameras, room PCs, TV boxes or network streams.",
        capture: "Source list."
      },
      {
        question: "What is missing from the quote?",
        answerPrompt: "Switching, extension, multiview, video wall processing, USB, audio, control or cables.",
        capture: "Attach opportunity."
      },
      {
        question: "Can this become a complete room or wall package?",
        answerPrompt: "Separate must-have items from useful upgrades.",
        capture: "Package opportunity."
      }
    ],
    listenFor: ["Display-only quote", "Missing source plan", "No control strategy", "Unspecified cable route", "No audio/USB discussion"],
    wyrestormCue: "Use this to uncover hidden AV path value, then move into Finder or Proposal with required and optional items separated."
  },
  {
    id: "commercial",
    title: "Commercial objection",
    eyebrow: "Sales support",
    intent: "Use this when the customer is hesitating on price, complexity, timing or value.",
    route: "/proposal",
    nextMove: "Open Proposal",
    conversation: {
      goal: "Separate essential requirements from optional upgrades and defend the architecture.",
      say: "Let us separate what is essential from what is optional, then protect the part of the design that removes the customer risk.",
      position: "The cheapest approach is not always the lowest-risk approach.",
      outcome: "A good/better/best or required/optional proposal structure."
    },
    qa: [
      {
        question: "What outcome must the system deliver?",
        answerPrompt: "Tie the hardware back to the customer success criteria.",
        capture: "Success definition."
      },
      {
        question: "Which requirement is non-negotiable?",
        answerPrompt: "Reliability, simplicity, distance, image quality, USB, control, expansion or budget.",
        capture: "Protected requirement."
      },
      {
        question: "What happens if they buy the cheaper route?",
        answerPrompt: "Explore support calls, missing features, future replacement or user frustration.",
        capture: "Cost of compromise."
      },
      {
        question: "What can be phased?",
        answerPrompt: "Separate core design from optional enhancements.",
        capture: "Phasing plan."
      }
    ],
    listenFor: ["Budget pressure", "Over-specified options", "Hidden support cost", "Reliability concern", "Need for phased design"],
    wyrestormCue: "Use good/better/best positioning. Keep required hardware separate from optional upgrades."
  },
  {
    id: "close-next-step",
    title: "Close the next step",
    eyebrow: "Action close",
    intent: "Use this when the call has useful information but needs converting into a project action.",
    route: "/proposal",
    nextMove: "Open Proposal",
    conversation: {
      goal: "Stop useful sales conversations disappearing into notes.",
      say: "To move this forward properly, let us agree the next action and what information is still missing.",
      position: "A clear next step is more valuable than a vague product suggestion.",
      outcome: "A defined handoff into Discovery, Finder, Compare, Video Wall or Proposal."
    },
    qa: [
      {
        question: "Do we have enough information to recommend a product family?",
        answerPrompt: "If not, identify the missing inputs.",
        capture: "Readiness level."
      },
      {
        question: "What information is still missing?",
        answerPrompt: "Drawings, distances, source list, display list, USB devices, network details or budget.",
        capture: "Missing information."
      },
      {
        question: "What output helps most now?",
        answerPrompt: "Shortlist, system sketch, BOM, proposal wording or technical validation.",
        capture: "Required output."
      },
      {
        question: "Where should this go next?",
        answerPrompt: "Discovery, Finder, Compare, Video Wall or Proposal.",
        capture: "Workflow handoff."
      }
    ],
    listenFor: ["Missing technical detail", "Decision-maker not involved", "Urgent quote", "Need for proposal wording", "Need for validation"],
    wyrestormCue: "Capture the summary, agree the action and move the opportunity into the right Wingman workflow."
  }
] as const;

type CallCardId = (typeof CALL_CARD_DECKS)[number]["id"];

function safeRead(key: string, fallback: string) {
  try {
    if (typeof window === "undefined") {
      return fallback;
    }

    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: string) {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function safeReadJson<T>(key: string, fallback: T): T {
  const raw = safeRead(key, "");

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function usePersistedText(key: string, fallback = "") {
  const [value, setValue] = useState(() => safeRead(key, fallback));

  useEffect(() => {
    safeWrite(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

function getAnswerLabel(value: string) {
  const found = ANSWER_OPTIONS.find((option) => option.value === value);

  if (found) {
    return found.label;
  }

  return "Not asked yet";
}

function makeResponseKey(cardId: string, index: number) {
  return `${cardId}:${index}`;
}

export function CallCardsPage() {
  const navigate = useNavigate();

  const [workflowPage, setWorkflowPage] = useState<WorkflowPage>(() => {
    const saved = safeRead(WORKFLOW_STORAGE_KEY, "select");

    if (saved === "qa") {
      return "qa";
    }

    return "select";
  });

  const [selectedCardId, setSelectedCardId] = useState<CallCardId>(() => {
    const saved = safeRead(CARD_STORAGE_KEY, "new-opportunity");
    const found = CALL_CARD_DECKS.find((card) => card.id === saved);

    if (found) {
      return found.id;
    }

    return "new-opportunity";
  });

  const [customer, setCustomer] = usePersistedText(CUSTOMER_STORAGE_KEY);
  const [room, setRoom] = usePersistedText(ROOM_STORAGE_KEY);
  const [risks, setRisks] = usePersistedText(RISK_STORAGE_KEY);
  const [nextStep, setNextStep] = usePersistedText(NEXT_STORAGE_KEY);
  const [copied, setCopied] = useState(false);
  const [responses, setResponses] = useState<QuestionResponseMap>(() => safeReadJson<QuestionResponseMap>(QUESTION_RESPONSE_STORAGE_KEY, {}));

  const selectedCard = useMemo(() => {
    return CALL_CARD_DECKS.find((card) => card.id === selectedCardId) ?? CALL_CARD_DECKS[0];
  }, [selectedCardId]);

  useEffect(() => {
    safeWrite(CARD_STORAGE_KEY, selectedCardId);
  }, [selectedCardId]);

  useEffect(() => {
    safeWrite(WORKFLOW_STORAGE_KEY, workflowPage);
  }, [workflowPage]);

  useEffect(() => {
    safeWrite(QUESTION_RESPONSE_STORAGE_KEY, JSON.stringify(responses));
  }, [responses]);

  const selectedAnswers = useMemo(() => {
    return selectedCard.qa.map((item, index) => {
      const key = makeResponseKey(selectedCard.id, index);
      const response = responses[key] ?? { status: "not-asked", note: "" };

      return {
        ...item,
        index,
        key,
        response
      };
    });
  }, [responses, selectedCard]);

  const quickSummary = useMemo(() => {
    const answerLines = selectedAnswers
      .map((item) => {
        const status = getAnswerLabel(item.response.status);
        const note = item.response.note.trim();

        if (!note && item.response.status === "not-asked") {
          return "";
        }

        return `Q${item.index + 1}: ${item.question}\nStatus: ${status}${note ? `\nAnswer: ${note}` : ""}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return [
      `Call Card: ${selectedCard.title}`,
      customer.trim() ? `Customer / contact: ${customer.trim()}` : "",
      room.trim() ? `Room / opportunity: ${room.trim()}` : "",
      answerLines ? `Structured Q&A:\n${answerLines}` : "",
      risks.trim() ? `Risks / design flags:\n${risks.trim()}` : "",
      nextStep.trim() ? `Recommended next step:\n${nextStep.trim()}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [customer, nextStep, risks, room, selectedAnswers, selectedCard.title]);

  const updateQuestionResponse = (key: string, patch: Partial<QuestionResponse>) => {
    setResponses((current) => {
      const previous = current[key] ?? { status: "not-asked", note: "" };

      return {
        ...current,
        [key]: {
          ...previous,
          ...patch
        }
      };
    });
  };

  const clearCurrentQuestionResponses = () => {
    setResponses((current) => {
      const next: QuestionResponseMap = {};

      Object.keys(current).forEach((key) => {
        if (!key.startsWith(`${selectedCard.id}:`)) {
          next[key] = current[key];
        }
      });

      return next;
    });
  };

  const flashCopied = () => {
    setCopied(true);

    if (typeof window === "undefined") {
      return;
    }

    window.setTimeout(() => setCopied(false), 1600);
  };

  const fallbackCopy = (text: string) => {
    if (typeof document === "undefined") {
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "true");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      flashCopied();
    } catch {
      return;
    }

    if (textArea.parentNode) {
      textArea.parentNode.removeChild(textArea);
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(quickSummary).then(flashCopied).catch(() => fallbackCopy(quickSummary));
      return;
    }

    fallbackCopy(quickSummary);
  };

  const handleReset = () => {
    setCustomer("");
    setRoom("");
    setRisks("");
    setNextStep("");
    clearCurrentQuestionResponses();
  };

  const selectCard = (cardId: CallCardId) => {
    setSelectedCardId(cardId);
    setWorkflowPage("qa");
  };

  const goToSelectedWorkflow = () => {
    navigate(selectedCard.route);
  };

  return (
    <main className="ccs-page">
      <style>{pageStyles}</style>

      <section className="ccs-hero">
        <div>
          <p className="ccs-kicker">Conversation-first sales support</p>
          <h1>Call Cards</h1>
          <p>
            Choose the call subject first, then work through a focused Q&A screen with answer selectors and notes beside every question.
          </p>
        </div>

        <div className="ccs-progress">
          <button type="button" className={workflowPage === "select" ? "is-active" : ""} onClick={() => setWorkflowPage("select")}>
            1. Select subject
          </button>
          <button type="button" className={workflowPage === "qa" ? "is-active" : ""} onClick={() => setWorkflowPage("qa")}>
            2. Q&A capture
          </button>
        </div>
      </section>

      <SalesToneQuickSetter context="callCards" surface="dark" className="max-w-none" />

      {workflowPage === "select" ? (
        <section className="ccs-selectPage" aria-label="Select call subject">
          <div className="ccs-pageHeader">
            <span>1</span>
            <div>
              <h2>Select the call subject / type</h2>
              <p>
                Start here. The user should not see all the detail until they have selected the conversation they are having.
              </p>
            </div>
          </div>

          <div className="ccs-subjectGrid">
            {CALL_CARD_DECKS.map((card) => (
              <button type="button" key={card.id} className={`ccs-subjectCard ccs-subject-${card.id}`} onClick={() => selectCard(card.id)}>
                <span>{card.eyebrow}</span>
                <strong>{card.title}</strong>
                <p>{card.intent}</p>
                <em>Start Q&A</em>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="ccs-qaPage" aria-label="Call card Q and A capture">
          <div className="ccs-qaTopBar">
            <button type="button" className="ccs-backButton" onClick={() => setWorkflowPage("select")}>Change call subject
            </button>

            <div>
              <span>{selectedCard.eyebrow}</span>
              <h2>{selectedCard.title}</h2>
            </div>

            <button type="button" className="ccs-primaryButton" onClick={goToSelectedWorkflow}>
              {selectedCard.nextMove}
            </button>
          </div>

          <section className="ccs-conversationPanel">
            <div className="ccs-pageHeader">
              <span>2</span>
              <div>
                <h2>Start with the conversation</h2>
                <p>{selectedCard.intent}</p>
              </div>
            </div>

            <div className="ccs-talkTrack">
              <div className="ccs-sayThis">
                <span>Say this first</span>
                <p>{selectedCard.conversation.say}</p>
              </div>

              <div className="ccs-talkTrackGrid">
                <div>
                  <span>Goal</span>
                  <p>{selectedCard.conversation.goal}</p>
                </div>
                <div>
                  <span>Position it as</span>
                  <p>{selectedCard.conversation.position}</p>
                </div>
                <div>
                  <span>Expected outcome</span>
                  <p>{selectedCard.conversation.outcome}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="ccs-questionPanel">
            <div className="ccs-pageHeader">
              <span>3</span>
              <div>
                <h2>Q&A capture</h2>
                <p>Each question now has a structured answer selector and an input field beside it.</p>
              </div>
            </div>

            <div className="ccs-questionList">
              {selectedAnswers.map((item) => (
                <article className={`ccs-questionRow ccs-questionStatus-${item.response.status}`} key={item.key}>
                  <div className="ccs-questionNumberBadge">{item.index + 1}</div>

                  <div className="ccs-questionText">
                    <div className="ccs-questionMeta">
                      <span>Question {item.index + 1}</span>
                      <em>{getAnswerLabel(item.response.status)}</em>
                    </div>
                    <h3>{item.question}</h3>
                    <p>{item.answerPrompt}</p>
                    <strong>Capture: {item.capture}</strong>
                  </div>

                  <div className="ccs-answerCapture">
                    <label>
                      Answer status
                      <select
                        value={item.response.status}
                        onChange={(event) => updateQuestionResponse(item.key, { status: event.target.value })}
                      >
                        {ANSWER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Customer answer / notes
                      <textarea
                        value={item.response.note}
                        onChange={(event) => updateQuestionResponse(item.key, { note: event.target.value })}
                        placeholder="Type the customer's answer or your note here..."
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="ccs-bottomActions" aria-label="Call card actions">
            <div>
              <strong>Ready to move on?</strong>
              <p>Use the captured Q&A above to continue in the recommended Wingman workflow.</p>
            </div>

            <div className="ccs-bottomActionButtons">
              <button type="button" onClick={handleCopy}>
                {copied ? "Copied" : "Copy Q&A summary"}
              </button>
              <button type="button" className="ccs-primaryButton" onClick={goToSelectedWorkflow}>
                {selectedCard.nextMove}
              </button>
              <button type="button" onClick={handleReset}>
                Clear answers
              </button>
            </div>
          </section>
</section>
      )}
    </main>
  );
}

export default CallCardsPage;

const pageStyles = `
.ccs-page {
  min-height: 100%;
  padding: 14px;
  color: #f8fafc;
  background: linear-gradient(135deg, #07111f 0%, #0b1320 52%, #101827 100%);
}

.ccs-page * {
  box-sizing: border-box;
}

.ccs-hero,
.ccs-selectPage,
.ccs-conversationPanel,
.ccs-questionPanel,
.ccs-guidancePanel,
.ccs-notesPanel,
.ccs-qaTopBar {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.58);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
}

.ccs-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: end;
  max-width: 1120px;
  margin: 0 auto 12px;
  padding: 14px 16px;
}

.ccs-kicker {
  margin: 0 0 4px;
  color: rgba(251, 191, 36, 0.78);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ccs-hero h1 {
  margin: 0;
  color: #ffffff;
  font-size: clamp(1.9rem, 2.8vw, 2.55rem);
  font-weight: 520;
  line-height: 1;
  letter-spacing: -0.045em;
}

.ccs-hero p {
  max-width: 780px;
  margin: 7px 0 0;
  color: rgba(226, 232, 240, 0.68);
  font-size: 0.9rem;
  line-height: 1.42;
}

.ccs-progress {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
}

.ccs-progress button,
.ccs-backButton,
.ccs-primaryButton,
.ccs-noteActions button {
  min-height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  padding: 0 12px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 680;
}

.ccs-progress button.is-active,
.ccs-primaryButton {
  color: #111827;
  border-color: rgba(251, 191, 36, 0.68);
  background: #f59e0b;
}

.ccs-selectPage,
.ccs-qaPage {
  max-width: 1120px;
  margin: 0 auto;
}

.ccs-selectPage,
.ccs-conversationPanel,
.ccs-questionPanel,
.ccs-guidancePanel,
.ccs-notesPanel {
  padding: 12px;
}

.ccs-qaPage {
  display: grid;
  gap: 10px;
}

.ccs-pageHeader {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.ccs-pageHeader > span {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 999px;
  color: #111827;
  background: rgba(245, 158, 11, 0.92);
  font-size: 0.75rem;
  font-weight: 700;
}

.ccs-pageHeader h2 {
  margin: 0;
  color: #ffffff;
  font-size: 0.98rem;
  font-weight: 520;
  line-height: 1.15;
}

.ccs-pageHeader p {
  margin: 3px 0 0;
  color: rgba(203, 213, 225, 0.62);
  font-size: 0.78rem;
  line-height: 1.32;
}

.ccs-subjectGrid {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 7px;
}

.ccs-subjectCard {
  --ccs-card-accent: #f59e0b;
  --ccs-card-border: rgba(245, 158, 11, 0.3);
  --ccs-card-bg: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(2, 6, 23, 0.24));
  position: relative;
  display: grid;
  align-content: start;
  min-height: 96px;
  border: 1px solid var(--ccs-card-border);
  border-radius: 15px;
  padding: 10px 11px;
  color: #e2e8f0;
  background: var(--ccs-card-bg);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.13);
}

.ccs-subjectCard::before {
  content: "";
  position: absolute;
  top: 10px;
  left: 10px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--ccs-card-accent);
}

.ccs-subjectCard span,
.ccs-qaTopBar span,
.ccs-sayThis span,
.ccs-talkTrackGrid span,
.ccs-questionText span {
  display: block;
  color: rgba(251, 191, 36, 0.72);
  font-size: 0.62rem;
  font-weight: 650;
  letter-spacing: 0.085em;
  text-transform: uppercase;
}

.ccs-subjectCard span {
  margin-left: 16px;
  margin-bottom: 5px;
}

.ccs-subjectCard strong {
  display: block;
  color: rgba(248, 250, 252, 0.94);
  font-size: 0.82rem;
  font-weight: 520;
  line-height: 1.15;
}

.ccs-subjectCard p {
  display: -webkit-box;
  margin: 5px 0 7px;
  color: rgba(226, 232, 240, 0.62);
  font-size: 0.7rem;
  font-weight: 400;
  line-height: 1.22;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ccs-subjectCard em {
  align-self: end;
  justify-self: start;
  margin-top: auto;
  border-radius: 999px;
  padding: 3px 7px;
  color: #07111f;
  background: var(--ccs-card-accent);
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 650;
}

.ccs-subject-new-opportunity { --ccs-card-accent: #f59e0b; --ccs-card-border: rgba(245, 158, 11, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-meeting-room { --ccs-card-accent: #38bdf8; --ccs-card-border: rgba(56, 189, 248, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-sell-against-competitors { --ccs-card-accent: #fb7185; --ccs-card-border: rgba(251, 113, 133, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(251, 113, 133, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-ndi-camera-bridges { --ccs-card-accent: #22c55e; --ccs-card-border: rgba(34, 197, 94, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-matrix-switches-kits { --ccs-card-accent: #a78bfa; --ccs-card-border: rgba(167, 139, 250, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-sygma-cloud { --ccs-card-accent: #2dd4bf; --ccs-card-border: rgba(45, 212, 191, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-warranty-support { --ccs-card-accent: #cbd5e1; --ccs-card-border: rgba(203, 213, 225, 0.28); --ccs-card-bg: linear-gradient(135deg, rgba(203, 213, 225, 0.08), rgba(2, 6, 23, 0.26)); }
.ccs-subject-extension { --ccs-card-accent: #f97316; --ccs-card-border: rgba(249, 115, 22, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-usb-kvm { --ccs-card-accent: #60a5fa; --ccs-card-border: rgba(96, 165, 250, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-audio-microphones-dante { --ccs-card-accent: #f472b6; --ccs-card-border: rgba(244, 114, 182, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(244, 114, 182, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-control-touch-panels { --ccs-card-accent: #eab308; --ccs-card-border: rgba(234, 179, 8, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-cables-distance { --ccs-card-accent: #94a3b8; --ccs-card-border: rgba(148, 163, 184, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(148, 163, 184, 0.08), rgba(2, 6, 23, 0.26)); }
.ccs-subject-avoip { --ccs-card-accent: #06b6d4; --ccs-card-border: rgba(6, 182, 212, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-video-wall { --ccs-card-accent: #ef4444; --ccs-card-border: rgba(239, 68, 68, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-upgrade-refresh { --ccs-card-accent: #84cc16; --ccs-card-border: rgba(132, 204, 22, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(132, 204, 22, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-consultant-specification { --ccs-card-accent: #818cf8; --ccs-card-border: rgba(129, 140, 248, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(129, 140, 248, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-dealer-attachment { --ccs-card-accent: #10b981; --ccs-card-border: rgba(16, 185, 129, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-commercial { --ccs-card-accent: #f43f5e; --ccs-card-border: rgba(244, 63, 94, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(2, 6, 23, 0.26)); }
.ccs-subject-close-next-step { --ccs-card-accent: #14b8a6; --ccs-card-border: rgba(20, 184, 166, 0.3); --ccs-card-bg: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(2, 6, 23, 0.26)); }

.ccs-qaTopBar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
}

.ccs-qaTopBar h2 {
  margin: 2px 0 0;
  color: #ffffff;
  font-size: 1.18rem;
  font-weight: 520;
  line-height: 1.05;
}

.ccs-talkTrack {
  display: grid;
  gap: 10px;
}

.ccs-sayThis {
  padding: 13px 15px;
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(2, 6, 23, 0.16));
}

.ccs-sayThis p {
  margin: 6px 0 0;
  color: rgba(248, 250, 252, 0.92);
  font-size: clamp(1rem, 1.35vw, 1.22rem);
  font-weight: 520;
  line-height: 1.34;
}

.ccs-talkTrackGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.ccs-talkTrackGrid div,
.ccs-questionRow {
  border: 1px solid rgba(148, 163, 184, 0.11);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.14);
}

.ccs-talkTrackGrid div {
  padding: 10px 11px;
}

.ccs-talkTrackGrid p {
  margin: 5px 0 0;
  color: rgba(226, 232, 240, 0.68);
  font-size: 0.8rem;
  line-height: 1.36;
}

.ccs-questionList {
  display: grid;
  gap: 8px;
}

.ccs-questionRow {
  display: grid;
  grid-template-columns: minmax(260px, 0.92fr) minmax(340px, 1.08fr);
  gap: 10px;
  padding: 10px 11px;
}

.ccs-questionText h3 {
  margin: 5px 0;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 520;
  line-height: 1.22;
}

.ccs-questionText p {
  margin: 0 0 6px;
  color: rgba(226, 232, 240, 0.62);
  font-size: 0.78rem;
  line-height: 1.34;
}

.ccs-questionText strong {
  color: rgba(147, 197, 253, 0.76);
  font-size: 0.74rem;
  font-weight: 600;
}

.ccs-answerCapture {
  display: grid;
  grid-template-columns: minmax(170px, 0.42fr) minmax(220px, 0.58fr);
  gap: 8px;
  align-items: start;
}

.ccs-answerCapture label,
.ccs-notesPanel label {
  display: grid;
  gap: 5px;
  color: rgba(226, 232, 240, 0.64);
  font-size: 0.66rem;
  font-weight: 650;
  letter-spacing: 0.075em;
  text-transform: uppercase;
}

.ccs-answerCapture select,
.ccs-answerCapture textarea,
.ccs-notesPanel input,
.ccs-notesPanel textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 11px;
  padding: 8px 9px;
  color: #0f172a;
  background: #f8fafc;
  outline: none;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1.35;
  text-transform: none;
}

.ccs-answerCapture textarea {
  min-height: 64px;
  resize: vertical;
}

.ccs-notesPanel textarea {
  min-height: 78px;
  resize: vertical;
}

.ccs-handoffGrid {
  display: grid;
  grid-template-columns: minmax(220px, 0.75fr) minmax(280px, 1fr) minmax(340px, 1.1fr);
  gap: 10px;
  align-items: start;
}

.ccs-guidancePanel h3,
.ccs-notesPanel h3 {
  margin: 0 0 8px;
  color: rgba(248, 250, 252, 0.78);
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ccs-guidancePanel ul {
  margin: 0;
  padding-left: 1.1rem;
  color: rgba(226, 232, 240, 0.66);
  font-size: 0.78rem;
  line-height: 1.36;
}

.ccs-directionPanel {
  border-color: rgba(34, 197, 94, 0.18);
  background: rgba(22, 163, 74, 0.06);
}

.ccs-directionPanel p {
  margin: 0;
  color: rgba(226, 232, 240, 0.68);
  font-size: 0.8rem;
  line-height: 1.42;
}

.ccs-notesPanel {
  display: grid;
  gap: 8px;
}

.ccs-noteActions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1420px) {
  .ccs-subjectGrid {
    grid-template-columns: repeat(4, minmax(140px, 1fr));
  }

  .ccs-handoffGrid {
    grid-template-columns: 1fr 1fr;
  }

  .ccs-notesPanel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1120px) {
  .ccs-hero,
  .ccs-qaTopBar,
  .ccs-questionRow,
  .ccs-answerCapture,
  .ccs-talkTrackGrid,
  .ccs-handoffGrid {
    grid-template-columns: 1fr;
  }

  .ccs-progress {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .ccs-subjectGrid {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }
}

@media (max-width: 760px) {
  .ccs-subjectGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .ccs-page {
    padding: 10px;
  }

  .ccs-subjectGrid {
    grid-template-columns: 1fr;
  }
}


/* CALL CARDS MINIMAL Q&A WORKSPACE */
.ccs-handoffGrid {
  display: none !important;
}

.ccs-qaPage {
  max-width: 1080px !important;
  gap: 8px !important;
}

.ccs-conversationPanel {
  padding: 10px 12px !important;
}

.ccs-questionPanel {
  padding: 10px 12px 12px !important;
}

.ccs-questionList {
  gap: 7px !important;
}

.ccs-questionRow {
  grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.1fr) !important;
  gap: 10px !important;
  padding: 9px 10px !important;
  border-radius: 14px !important;
  background: rgba(2, 6, 23, 0.12) !important;
}

.ccs-questionText span {
  color: rgba(251, 191, 36, 0.68) !important;
  font-size: 0.58rem !important;
  font-weight: 620 !important;
}

.ccs-questionText h3 {
  font-size: 0.86rem !important;
  font-weight: 500 !important;
}

.ccs-questionText p {
  font-size: 0.75rem !important;
  color: rgba(226, 232, 240, 0.58) !important;
}

.ccs-questionText strong {
  font-size: 0.7rem !important;
  color: rgba(147, 197, 253, 0.68) !important;
}

.ccs-answerCapture {
  grid-template-columns: minmax(160px, 0.38fr) minmax(260px, 0.62fr) !important;
  gap: 8px !important;
}

.ccs-answerCapture label {
  font-size: 0.62rem !important;
  color: rgba(226, 232, 240, 0.58) !important;
}

.ccs-answerCapture select,
.ccs-answerCapture textarea {
  min-height: 38px !important;
  border-radius: 10px !important;
  background: rgba(248, 250, 252, 0.94) !important;
  font-size: 0.78rem !important;
}

.ccs-answerCapture textarea {
  min-height: 50px !important;
}

.ccs-bottomActions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.48);
}

.ccs-bottomActions strong {
  display: block;
  color: rgba(248, 250, 252, 0.88);
  font-size: 0.86rem;
  font-weight: 560;
}

.ccs-bottomActions p {
  margin: 3px 0 0;
  color: rgba(203, 213, 225, 0.58);
  font-size: 0.76rem;
  line-height: 1.32;
}

.ccs-bottomActionButtons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.ccs-bottomActionButtons button {
  min-height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  padding: 0 11px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 620;
}

.ccs-bottomActionButtons .ccs-primaryButton {
  color: #111827;
  border-color: rgba(251, 191, 36, 0.68);
  background: #f59e0b;
}

@media (max-width: 1120px) {
  .ccs-questionRow,
  .ccs-answerCapture,
  .ccs-bottomActions {
    grid-template-columns: 1fr !important;
  }

  .ccs-bottomActionButtons {
    justify-content: flex-start;
  }
}


/* CALL CARDS Q&A VISUAL SEPARATION */
.ccs-questionList {
  gap: 12px !important;
}

.ccs-questionRow {
  position: relative !important;
  overflow: hidden !important;
  gap: 12px !important;
  padding: 10px !important;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  border-radius: 18px !important;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(2, 6, 23, 0.48)) !important;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14) !important;
}

.ccs-questionRow::before {
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  top: 10px !important;
  bottom: 10px !important;
  width: 4px !important;
  border-radius: 999px !important;
  background: #f59e0b !important;
}

.ccs-questionRow:nth-child(4n+1)::before {
  background: #f59e0b !important;
}

.ccs-questionRow:nth-child(4n+2)::before {
  background: #38bdf8 !important;
}

.ccs-questionRow:nth-child(4n+3)::before {
  background: #22c55e !important;
}

.ccs-questionRow:nth-child(4n+4)::before {
  background: #a78bfa !important;
}

.ccs-questionRow:hover {
  border-color: rgba(251, 191, 36, 0.28) !important;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18) !important;
}

.ccs-questionText {
  padding: 12px 14px 12px 18px !important;
  border: 1px solid rgba(148, 163, 184, 0.12) !important;
  border-radius: 14px !important;
  background: rgba(15, 23, 42, 0.34) !important;
}

.ccs-questionText span {
  margin-bottom: 6px !important;
  color: rgba(251, 191, 36, 0.78) !important;
  font-size: 0.58rem !important;
  font-weight: 650 !important;
  letter-spacing: 0.09em !important;
}

.ccs-questionText h3 {
  margin: 0 0 6px !important;
  font-size: 0.88rem !important;
  font-weight: 540 !important;
  line-height: 1.24 !important;
}

.ccs-questionText p {
  margin: 0 0 8px !important;
  color: rgba(226, 232, 240, 0.6) !important;
  font-size: 0.76rem !important;
  line-height: 1.36 !important;
}

.ccs-questionText strong {
  display: block !important;
  margin-top: 2px !important;
  color: rgba(147, 197, 253, 0.74) !important;
  font-size: 0.71rem !important;
  font-weight: 600 !important;
}

.ccs-answerCapture {
  padding: 10px !important;
  border: 1px solid rgba(148, 163, 184, 0.12) !important;
  border-radius: 14px !important;
  background: rgba(2, 6, 23, 0.26) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02) !important;
  gap: 10px !important;
}

.ccs-answerCapture > label {
  padding: 8px 9px !important;
  border: 1px solid rgba(148, 163, 184, 0.1) !important;
  border-radius: 12px !important;
  background: rgba(15, 23, 42, 0.3) !important;
}

.ccs-answerCapture label {
  gap: 6px !important;
  color: rgba(226, 232, 240, 0.62) !important;
  font-size: 0.62rem !important;
  font-weight: 650 !important;
  letter-spacing: 0.08em !important;
}

.ccs-answerCapture select,
.ccs-answerCapture textarea {
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  border-radius: 10px !important;
  background: rgba(248, 250, 252, 0.96) !important;
  font-size: 0.78rem !important;
}

.ccs-answerCapture textarea {
  min-height: 52px !important;
}

@media (max-width: 1120px) {
  .ccs-questionRow {
    gap: 10px !important;
  }

  .ccs-questionText,
  .ccs-answerCapture {
    padding: 10px 12px !important;
  }
}


/* CALL CARDS Q&A STATUS BADGES */
.ccs-questionRow {
  grid-template-columns: 36px minmax(260px, 0.88fr) minmax(360px, 1.12fr) !important;
  align-items: stretch !important;
}

.ccs-questionNumberBadge {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  align-self: start;
  margin-top: 2px;
  border-radius: 12px;
  color: #07111f;
  background: #f59e0b;
  font-size: 0.82rem;
  font-weight: 760;
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.18);
}

.ccs-questionMeta {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ccs-questionMeta span {
  margin: 0 !important;
}

.ccs-questionMeta em {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  padding: 0 8px;
  color: rgba(226, 232, 240, 0.72);
  background: rgba(15, 23, 42, 0.58);
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 650;
  line-height: 1;
  white-space: nowrap;
}

.ccs-questionStatus-confirmed {
  border-color: rgba(34, 197, 94, 0.3) !important;
}

.ccs-questionStatus-confirmed::before,
.ccs-questionStatus-confirmed .ccs-questionNumberBadge {
  background: #22c55e !important;
}

.ccs-questionStatus-confirmed .ccs-questionMeta em {
  color: #dcfce7;
  border-color: rgba(34, 197, 94, 0.32);
  background: rgba(22, 163, 74, 0.16);
}

.ccs-questionStatus-not-required {
  border-color: rgba(148, 163, 184, 0.18) !important;
}

.ccs-questionStatus-not-required::before,
.ccs-questionStatus-not-required .ccs-questionNumberBadge {
  background: #94a3b8 !important;
}

.ccs-questionStatus-not-required .ccs-questionMeta em {
  color: rgba(226, 232, 240, 0.7);
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(148, 163, 184, 0.1);
}

.ccs-questionStatus-unknown {
  border-color: rgba(56, 189, 248, 0.28) !important;
}

.ccs-questionStatus-unknown::before,
.ccs-questionStatus-unknown .ccs-questionNumberBadge {
  background: #38bdf8 !important;
}

.ccs-questionStatus-unknown .ccs-questionMeta em {
  color: #e0f2fe;
  border-color: rgba(56, 189, 248, 0.28);
  background: rgba(14, 165, 233, 0.14);
}

.ccs-questionStatus-follow-up {
  border-color: rgba(251, 191, 36, 0.34) !important;
}

.ccs-questionStatus-follow-up::before,
.ccs-questionStatus-follow-up .ccs-questionNumberBadge {
  background: #f59e0b !important;
}

.ccs-questionStatus-follow-up .ccs-questionMeta em {
  color: #fef3c7;
  border-color: rgba(251, 191, 36, 0.34);
  background: rgba(245, 158, 11, 0.16);
}

.ccs-questionStatus-risk {
  border-color: rgba(248, 113, 113, 0.38) !important;
}

.ccs-questionStatus-risk::before,
.ccs-questionStatus-risk .ccs-questionNumberBadge {
  background: #ef4444 !important;
}

.ccs-questionStatus-risk .ccs-questionMeta em {
  color: #fee2e2;
  border-color: rgba(248, 113, 113, 0.36);
  background: rgba(239, 68, 68, 0.16);
}

.ccs-questionStatus-not-asked .ccs-questionMeta em {
  color: rgba(226, 232, 240, 0.62);
}

@media (max-width: 1120px) {
  .ccs-questionRow {
    grid-template-columns: 1fr !important;
  }

  .ccs-questionNumberBadge {
    width: 28px;
    height: 28px;
  }

  .ccs-questionMeta {
    align-items: flex-start;
    flex-direction: column;
  }
}


/* CALL CARDS COMPACT LIVE WORKFLOW */
.ccs-page {
  padding-top: 10px !important;
}

.ccs-hero {
  max-width: 1080px !important;
  margin-bottom: 8px !important;
  padding: 10px 12px !important;
  border-radius: 16px !important;
  background: rgba(15, 23, 42, 0.48) !important;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12) !important;
}

.ccs-kicker {
  margin-bottom: 2px !important;
  font-size: 0.58rem !important;
  font-weight: 620 !important;
  opacity: 0.82 !important;
}

.ccs-hero h1 {
  font-size: clamp(1.45rem, 2vw, 1.9rem) !important;
  font-weight: 480 !important;
  letter-spacing: -0.035em !important;
}

.ccs-hero p {
  max-width: 760px !important;
  margin-top: 4px !important;
  font-size: 0.78rem !important;
  line-height: 1.28 !important;
  color: rgba(203, 213, 225, 0.6) !important;
}

.ccs-progress button {
  min-height: 30px !important;
  padding: 0 10px !important;
  font-size: 0.72rem !important;
  font-weight: 620 !important;
}

.ccs-qaPage {
  max-width: 1080px !important;
  gap: 8px !important;
}

.ccs-qaTopBar {
  padding: 8px 10px !important;
  border-radius: 15px !important;
  background: rgba(15, 23, 42, 0.44) !important;
}

.ccs-qaTopBar h2 {
  font-size: 1rem !important;
  font-weight: 500 !important;
}

.ccs-backButton,
.ccs-primaryButton {
  min-height: 30px !important;
  padding: 0 10px !important;
  font-size: 0.72rem !important;
}

.ccs-conversationPanel {
  padding: 9px 10px !important;
  border-radius: 15px !important;
  background: rgba(15, 23, 42, 0.46) !important;
}

.ccs-conversationPanel .ccs-pageHeader {
  margin-bottom: 7px !important;
}

.ccs-pageHeader > span {
  width: 22px !important;
  height: 22px !important;
  flex-basis: 22px !important;
  font-size: 0.68rem !important;
}

.ccs-pageHeader h2 {
  font-size: 0.88rem !important;
  font-weight: 500 !important;
}

.ccs-pageHeader p {
  font-size: 0.72rem !important;
  line-height: 1.24 !important;
}

.ccs-talkTrack {
  gap: 7px !important;
}

.ccs-sayThis {
  padding: 10px 12px !important;
  border-radius: 13px !important;
  border-color: rgba(251, 191, 36, 0.14) !important;
  background: rgba(245, 158, 11, 0.055) !important;
}

.ccs-sayThis span {
  font-size: 0.54rem !important;
  font-weight: 600 !important;
}

.ccs-sayThis p {
  margin-top: 4px !important;
  font-size: clamp(0.9rem, 1.1vw, 1.05rem) !important;
  font-weight: 480 !important;
  line-height: 1.28 !important;
}

.ccs-talkTrackGrid {
  gap: 7px !important;
}

.ccs-talkTrackGrid div {
  padding: 8px 9px !important;
  border-radius: 12px !important;
  background: rgba(2, 6, 23, 0.1) !important;
}

.ccs-talkTrackGrid span {
  font-size: 0.52rem !important;
  font-weight: 600 !important;
}

.ccs-talkTrackGrid p {
  margin-top: 3px !important;
  font-size: 0.72rem !important;
  line-height: 1.28 !important;
}

.ccs-questionPanel {
  padding: 9px 10px 10px !important;
  border-radius: 15px !important;
  background: rgba(15, 23, 42, 0.5) !important;
}

.ccs-questionPanel .ccs-pageHeader {
  margin-bottom: 7px !important;
}

.ccs-questionList {
  gap: 9px !important;
}

.ccs-questionRow {
  grid-template-columns: 32px minmax(260px, 0.9fr) minmax(360px, 1.1fr) !important;
  padding: 8px !important;
  gap: 9px !important;
  border-radius: 15px !important;
}

.ccs-questionNumberBadge {
  width: 26px !important;
  height: 26px !important;
  border-radius: 10px !important;
  font-size: 0.72rem !important;
}

.ccs-questionText {
  padding: 9px 11px 9px 12px !important;
  border-radius: 12px !important;
}

.ccs-questionMeta {
  margin-bottom: 5px !important;
}

.ccs-questionMeta em {
  min-height: 20px !important;
  padding: 0 7px !important;
  font-size: 0.56rem !important;
}

.ccs-questionText h3 {
  font-size: 0.82rem !important;
  line-height: 1.2 !important;
}

.ccs-questionText p {
  font-size: 0.72rem !important;
  line-height: 1.28 !important;
}

.ccs-questionText strong {
  font-size: 0.68rem !important;
}

.ccs-answerCapture {
  padding: 8px !important;
  border-radius: 12px !important;
}

.ccs-answerCapture > label {
  padding: 7px !important;
  border-radius: 10px !important;
}

.ccs-answerCapture label {
  font-size: 0.58rem !important;
}

.ccs-answerCapture select,
.ccs-answerCapture textarea {
  min-height: 34px !important;
  padding: 7px 8px !important;
  font-size: 0.74rem !important;
}

.ccs-answerCapture textarea {
  min-height: 44px !important;
}

.ccs-bottomActions {
  max-width: 1080px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding: 8px 10px !important;
  border-radius: 14px !important;
}

.ccs-bottomActions strong {
  font-size: 0.78rem !important;
}

.ccs-bottomActions p {
  font-size: 0.7rem !important;
}

.ccs-bottomActionButtons button {
  min-height: 29px !important;
  padding: 0 10px !important;
  font-size: 0.7rem !important;
}

@media (max-width: 1120px) {
  .ccs-questionRow,
  .ccs-answerCapture,
  .ccs-talkTrackGrid,
  .ccs-hero,
  .ccs-qaTopBar {
    grid-template-columns: 1fr !important;
  }
}
`;
