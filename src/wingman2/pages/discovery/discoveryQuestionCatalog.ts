// Governed Discovery question content. Selection and visibility logic stays in
// discoveryQuestions.ts; this module owns the question definitions.
import type { DiscoveryQuestion } from "./discoveryTypes";
import { discoveryAudioQuestions } from "./discoveryAudioQuestions";
export const baseDiscoveryQuestions: DiscoveryQuestion[] = [
  {
    id: "opportunity",
    shortLabel: "Opportunity",
    section: "About the space",
    question: "What type of opportunity is this?",
    prompt: "Select the closest customer application.",
    why: "The application narrows the likely system shape before Wingman thinks about products.",
    required: true,
    capturePlaceholder: "Example: Customer needs a Teams room with laptop input, display, camera and table audio.",
    options: [
      {
        value: "meeting-room",
        label: "Meeting room / boardroom",
        help: "Presentation, Teams/Zoom, USB-C, dual display or BYOD/BYOM.",
      },
      {
        value: "classroom",
        label: "Classroom / teaching space",
        help: "Lectern sources, display/projector, room audio, simple teacher control.",
      },
      {
        value: "hospitality",
        label: "Hospitality / bar / venue",
        help: "Multiple TVs, distributed sources, staff control, sport/signage/audio zones.",
      },
      {
        value: "video-wall",
        label: "Video wall / LED wall",
        help: "LCD wall, LED processor feed, multiview, signage or full-canvas output.",
      },
      {
        value: "av-over-ip",
        label: "Distributed video (many rooms or long distances)",
        help: "Many-to-many routing, long distance, campus, flexible source/display routing.",
      },
      {
        value: "not-sure",
        label: "Not sure yet",
        help: "Use this when the customer wording is still loose or incomplete.",
      },
    ],
  },
  {
    id: "scale",
    shortLabel: "Scale",
    section: "About the space",
    question: "What is the approximate room or system scale?",
    prompt: "Pick the closest scale. Exact dimensions can be captured in the notes box.",
    why: "Scale affects whether this needs a simple cable run, a local switcher, or a networked system reaching more rooms.",
    required: true,
    capturePlaceholder: "Example: Single boardroom, 8 people, one display around 10 metres from the table.",
    options: [
      {
        value: "single-small-room",
        label: "Single small room",
        help: "Huddle room, small teaching room or contained presentation space.",
      },
      {
        value: "single-large-room",
        label: "Single large room",
        help: "Boardroom, classroom, lecture room, divisible room or larger venue space.",
      },
      {
        value: "multi-room",
        label: "Multiple rooms / zones",
        help: "Several spaces or displays need shared source routing.",
      },
      {
        value: "building-wide",
        label: "Building-wide / campus",
        help: "Distributed system, comms room, network switching or central source rack likely.",
      },
      {
        value: "unknown-scale",
        label: "Unknown — room scale",
        help: "Capture the customer wording and continue.",
      },
    ],
  },
  {
    id: "network-path",
    shortLabel: "AV network path",
    section: "About the space",
    question: "What network path would carry the AV signals?",
    prompt: "Confirm this with the customer's IT or network team. Building size alone does not decide it.",
    why: "An AV VLAN on the organisation's network and a dedicated physical AV LAN have different approval, switching, security and support requirements.",
    required: true,
    capturePlaceholder: "Example: University IT will provide an AV VLAN on the campus network; multicast and switch capacity still need confirmation.",
    options: [
      { value: "corporate-av-vlan", label: "Existing organisation network with a dedicated AV VLAN", help: "IT-managed network and switching; confirm permissions, capacity, multicast/QoS, security boundaries and support ownership." },
      { value: "dedicated-av-lan", label: "Dedicated physical AV network", help: "Separate switching for AV; confirm cabling, uplinks, management and support ownership." },
      { value: "unknown-network-path", label: "Network approach not agreed yet", help: "Keep both paths open and involve the network owner before specifying equipment." },
      { value: "no-network-distribution", label: "No network distribution planned", help: "Confirm whether local switching or point-to-point extension meets the brief." },
    ],
  },
  {
    id: "sources",
    shortLabel: "Sources",
    section: "Sources & displays",
    question: "How many source positions are likely?",
    prompt: "Think about laptops, PCs, media players, signage players and wireless presentation inputs.",
    why: "Source count and location drive input selection, switching, encoder count and cable paths.",
    required: true,
    capturePlaceholder: "Example: 2 HDMI laptops at table, 1 room PC, 1 signage player in rack.",
    options: [
      {
        value: "one-source",
        label: "1 source",
        help: "Usually simple extension or local switching.",
      },
      {
        value: "two-four-sources",
        label: "2-4 sources",
        help: "Common meeting room, classroom or small venue input count.",
      },
      {
        value: "five-eight-sources",
        label: "5-8 sources",
        help: "Matrix, presentation switcher or structured source routing likely.",
      },
      {
        value: "nine-plus-sources",
        label: "9+ sources",
        help: "A matrix switcher or a networked system should be considered.",
      },
      {
        value: "unknown-sources",
        label: "Unknown — source count",
        help: "Ask what the customer needs to connect.",
      },
    ],
  },
  {
    id: "source-connection",
    shortLabel: "Source workflow",
    section: "Sources & displays",
    question: "How will people get video sources into this room?",
    prompt: "Choose the closest starting point. You can add the actual devices, where they live, and how people choose them in the next questions. Cameras and microphones are covered separately in Unified Communications.",
    why: "This separates permanently installed equipment, devices people bring, and video arriving over the network. Device types, physical positions and operating method are captured separately so the design can account for each.",
    required: true,
    selectionMode: "single",
    // The "not yet confirmed" marker is declared exclusive so value-keyed
    // consumers (integrity contradiction rules, hidden-answer scans) can key
    // off the question's own exclusiveValues instead of hard-coding the
    // option value. Inert for single-select answers but keeps the declaration
    // model uniform with display-behaviour's unknown marker.
    exclusiveValues: ["unknown-source-connectors"],
    capturePlaceholder: "Example: A room PC and signage player in the central rack, with visitors connecting laptops at the table; staff select the source from a wall panel.",
    options: [
      {
        value: "fixed-hdmi-sources",
        label: "Installed room equipment only",
        help: "Room PCs, media players, signage players, set-top boxes or other permanently installed HDMI devices. Users do not normally connect laptops.",
      },
      {
        value: "laptops-wireless-inputs",
        label: "People bring devices to present",
        help: "Users connect laptops by USB-C, HDMI or wireless presentation. There are no significant permanently installed video sources.",
      },
      {
        value: "mixed-hdmi-usbc",
        label: "Installed equipment plus user devices",
        help: "The room uses permanently installed HDMI equipment as well as laptops connected by USB-C, HDMI or wireless presentation.",
      },
      {
        value: "network-video-sources",
        label: "Local sources plus network video feeds",
        help: "Local fixed equipment and/or user laptops are combined with routed AV-over-IP, NDI or other network video streams.",
      },
      {
        value: "unknown-source-connectors",
        label: "Not decided — what sources are needed?",
        help: "Confirm whether the room needs fixed equipment, user laptops, wireless presentation or network video before selecting the architecture.",
      },
    ],
  },
  {
    id: "primary-display",
    shortLabel: "Primary display",
    section: "Sources & displays",
    question: "What are the room's primary display(s)?",
    prompt: "Choose the main display arrangement. Count repeaters separately, then include all video feed endpoints in the total below.",
    why: "Display technology and arrangement affect image size, signal processing, mounting and the number of feeds the system must deliver.",
    required: true,
    capturePlaceholder: "Add screen sizes, projection surface details, wall dimensions or seating-specific requirements.",
    options: [
      { value: "single-large-flat-panel", label: "One large flat panel display" },
      { value: "dual-large-flat-panels", label: "Two large flat panel displays" },
      { value: "three-large-flat-panels", label: "Three large flat panel displays" },
      { value: "single-projector", label: "One projector" },
      { value: "dual-projectors", label: "Two projectors", help: "Confirm whether they blend onto one canvas or serve separate screens." },
      { value: "lcd-video-wall", label: "LCD video wall", help: "The wall processor or display group may count as one system feed endpoint." },
      { value: "led-video-wall", label: "LED video wall", help: "The LED processor may count as one system feed endpoint, regardless of cabinet count." },
      { value: "other-primary-display", label: "Another primary display arrangement" },
      { value: "unknown-primary-display", label: "Not yet confirmed — primary display" },
    ],
  },
  {
    id: "displays",
    shortLabel: "Displays",
    section: "Sources & displays",
    question: "How many video feed endpoints are needed in total?",
    prompt: "Count all primary and repeater display feeds. A video wall or blended projection surface may use one processor feed; count separate projector feeds when they need different signals.",
    why: "Output count is a major divider between simple switching, matrix and a networked system.",
    required: true,
    capturePlaceholder: "Example: 1 main display, 1 confidence display and 4 overflow TVs.",
    options: [
      {
        value: "one-display",
        label: "1 display / output",
        help: "Usually simple presentation, extension or local switcher architecture.",
      },
      {
        value: "two-displays",
        label: "2 displays / outputs",
        help: "Dual display, projector plus confidence, or mirrored/independent output check needed.",
      },
      {
        value: "three-eight-displays",
        label: "3-8 displays / outputs",
        help: "Matrix switching or a small networked system should be considered.",
      },
      {
        value: "nine-plus-displays",
        label: "9+ displays / outputs",
        help: "A networked system or a larger matrix design likely.",
      },
      {
        value: "video-wall-output",
        label: "Video wall / LED processor",
        help: "Clarify full canvas, per-display content, signage or multiview behaviour.",
      },
    ],
  },
  {
    id: "repeater-displays",
    shortLabel: "Repeater screens",
    section: "Sources & displays",
    question: "How many repeater screens are needed around the room?",
    prompt: "Count screens that repeat or extend the primary viewing area. Leave them at none if every viewer uses the primary display(s).",
    why: "Repeater count and placement determine additional outputs, receiver endpoints and cable routes.",
    required: true,
    capturePlaceholder: "Add repeater positions, screen sizes or sightline notes.",
    options: [
      { value: "no-repeater-displays", label: "No repeater screens" },
      { value: "one-two-repeater-displays", label: "1–2 repeater screens" },
      { value: "three-four-repeater-displays", label: "3–4 repeater screens" },
      { value: "five-eight-repeater-displays", label: "5–8 repeater screens" },
      { value: "nine-plus-repeater-displays", label: "9+ repeater screens" },
      { value: "unknown-repeater-displays", label: "Not yet confirmed — repeater count" },
    ],
  },
  {
    id: "display-behaviour",
    shortLabel: "Display behaviour",
    section: "Sources & displays",
    question: "How should the primary and repeater displays behave?",
    prompt: "Capture whether screens mirror the primary picture, route independently, feed a wall processor, or show multiple sources on one canvas. If repeaters are needed, select overflow or room-wide visibility too.",
    why: "Display behaviour is the difference between simple distribution, matrix routing, multiview, and wall-processing conversations.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-display-behaviour"],
    capturePlaceholder: "Example: All TVs show the same source, or each zone routes independently, or one LED processor needs a multiview feed.",
    options: [
      {
        value: "same-content-all-displays",
        label: "Same content on all displays",
        help: "Mirror the same picture to every screen; repeaters can improve sightlines or support overflow seating.",
      },
      {
        value: "overflow-viewing",
        label: "Repeater screens for overflow seating",
        help: "Extend viewing to overflow seating or additional viewing areas.",
      },
      {
        value: "room-wide-visibility",
        label: "Repeat the primary picture for room-wide visibility",
        help: "Help people see the main picture from anywhere in the room.",
      },
      {
        value: "independent-routing-per-display",
        label: "Different content by display or zone",
        help: "Any source to any display or zone-by-zone routing is needed.",
      },
      {
        value: "video-wall-or-processor-feed",
        label: "Video wall or LED processor feed",
        help: "Wall processor, full canvas, or processor input path needs confirming.",
      },
      {
        value: "multiview-on-one-output",
        label: "Several sources on one output",
        help: "Multiview or composed-output behaviour is required.",
      },
      {
        value: "unknown-display-behaviour",
        label: "Unknown — display behaviour",
        help: "Ask whether outputs mirror, route independently, feed a wall processor, or need multiview.",
      },
    ],
  },
  {
    id: "signal-standard",
    shortLabel: "Picture quality",
    section: "Sources & displays",
    question: "How sharp does the picture need to be?",
    prompt: "Pick the closest picture quality. If displays are a mix of old and new, or very high-end, say so below — the technical checks (HDR, HDCP, EDID) are handled behind the scenes.",
    why: "Resolution, HDR, HDCP, and EDID expectations often decide whether a proposal is actually safe to quote.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-signal-standard"],
    capturePlaceholder: "Example: 4K60 HDR with HDCP 2.2 displays, or mixed legacy screens with EDID sensitivity.",
    options: [
      {
        value: "1080p-standard-hdmi",
        label: "Standard HD (1080p / standard HDMI)",
        help: "Standard HD video with no strong HDR or HDCP complexity indicated.",
      },
      {
        value: "4k60-standard",
        label: "Standard 4K (4K60 / standard 4K)",
        help: "4K routing is required but HDR or special compatibility constraints are not yet dominant.",
      },
      {
        value: "4k60-hdr-hdcp",
        label: "Premium 4K with HDR (4K60 HDR / HDCP-sensitive)",
        help: "Premium signal path where HDR, HDCP 2.2+, and EDID management must be treated carefully — flag this for the design team.",
      },
      {
        value: "legacy-edid-risk",
        label: "Mix of older & newer screens (legacy / EDID risk)",
        help: "Older displays, mixed resolutions, or compatibility-sensitive sinks are part of the requirement — worth a compatibility check.",
      },
      {
        value: "unknown-signal-standard",
        label: "Unknown — picture quality",
        help: "Ask whether the job is 1080p, 4K, HDR, HDCP-sensitive, or likely to have EDID issues.",
      },
    ],
  },
  {
      id: "uc-purpose",
      shortLabel: "UC requirement",
      section: "Unified Communications",
      question: "What camera, microphone or capture workflows are required?",
      prompt: "Select every workflow that applies. Two-way conferencing, recording, one-way streaming and camera distribution are different paths and may coexist.",
      why: "These workflows can coexist but need different USB, audio, routing and capture paths. Capturing them separately prevents an incomplete system design.",
      required: true,
      selectionMode: "multiple",
      exclusiveValues: ["no-uc", "unknown-uc"],
      capturePlaceholder: "Example: Teams calls plus a live stream of the camera and presentation mix to YouTube Live or private campus viewers; confirm the source, audio mix, platform and network.",
      options: [
          {
              value: "video-conferencing",
              label: "Video conferencing",
              help: "Two-way Teams, Zoom or other calls requiring room cameras, microphones, far-end audio and a USB or UC connection."
          },
          {
              value: "recording-streaming",
              label: "Recording or live streaming",
              help: "Camera and microphone feeds must be captured for recording, lecture capture, webcast or live production."
          },
          {
              value: "live-stream-out",
              label: "Send a one-way live stream out",
              help: "Send an HDMI programme feed to a public platform or private audience. This is an outbound stream, not a two-way call; confirm the feed, destination, format and network."
          },
          {
              value: "camera-distribution-only",
              label: "Camera routing or distribution",
              help: "Camera feeds must be sent to displays, production equipment, processors or monitoring positions independently of a conferencing call."
          },
          {
              value: "microphones-only",
              label: "Microphones without cameras",
              help: "The room requires speech reinforcement, audio capture or microphone distribution but does not need a room camera."
          },
          {
              value: "no-uc",
              label: "No camera or microphone requirements",
              help: "Skip the detailed Unified Communications camera, microphone and capture questions."
          },
          {
              value: "unknown-uc",
              label: "Not yet confirmed — UC scope",
              help: "Record the requirement as unresolved and qualify the conferencing, recording, camera and microphone workflow before product selection."
          }
      ]
  },
  {
    id: "uc-platform",
    shortLabel: "UC platform",
    section: "Unified Communications",
    question: "What will run the call or capture workflow?",
    prompt: "Identify the conferencing or capture platform before deciding USB ownership and host switching.",
    why: "A user laptop, room PC, UC appliance and hardware codec each create a different peripheral and switching requirement.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-uc-platform"],
    capturePlaceholder: "Example: Microsoft Teams Room with optional BYOM from a visitor laptop.",
    options: [
      {
        value: "byom-user-laptop",
        label: "User laptop / BYOM",
        help: "A visitor laptop runs the call and must use the room camera and microphones.",
      },
      {
        value: "microsoft-teams-room",
        label: "Microsoft Teams Room",
        help: "A dedicated Teams room appliance or room PC owns the normal conferencing session.",
      },
      {
        value: "zoom-room",
        label: "Zoom Room",
        help: "A dedicated Zoom Room appliance or room PC owns the normal conferencing session.",
      },
      {
        value: "room-pc-conferencing",
        label: "Room PC / software conferencing",
        help: "A fixed computer runs the conferencing, recording or streaming application.",
      },
      {
        value: "hardware-codec",
        label: "Hardware codec",
        help: "A dedicated conferencing codec owns the room peripherals.",
      },
      {
        value: "unknown-uc-platform",
        label: "Not yet selected — UC platform",
        help: "The platform or host device still needs to be confirmed.",
      },
    ],
  },
  {
    id: "mtr-av-integration",
    shortLabel: "Teams Room integration",
    section: "Unified Communications",
    question: "How must the Microsoft Teams Room connect to the AV system?",
    prompt: "Confirm both signal directions. A Teams Room commonly needs an AV-system feed into the MTR for sharing or capture, plus an MTR output back into the AV system for distribution to the room displays.",
    why: "Treating the MTR as only a source or only a destination leaves half of the conferencing path undesigned. Capturing both directions exposes the required switching, capture, USB and return-feed interfaces.",
    required: true,
    selectionMode: "single",
    capturePlaceholder: "Example: AV matrix output feeds the MTR HDMI ingest, while the MTR HDMI output returns to the matrix for both room displays.",
    options: [
      {
        value: "mtr-bidirectional-av",
        label: "Two-way AV integration",
        help: "The AV system feeds content or camera video into the MTR, and the MTR sends its meeting output back into the AV system.",
      },
      {
        value: "av-feed-to-mtr-only",
        label: "AV system feeds the MTR only",
        help: "The MTR needs an input from the AV system, but its display output does not return through the AV distribution system.",
      },
      {
        value: "mtr-feed-to-av-only",
        label: "MTR feeds the AV system only",
        help: "The MTR is treated as an AV source for room distribution, with no separate AV-system feed into the MTR.",
      },
      {
        value: "standalone-mtr",
        label: "Standalone Teams Room",
        help: "The MTR connects directly to its displays and peripherals without exchanging video feeds with the wider AV system.",
      },
      {
        value: "unknown-mtr-integration",
        label: "Not yet confirmed — Teams Room integration",
        help: "Confirm the MTR input/capture feed and its output/return feed before completing the system design or proposal.",
      },
    ],
  },
  {
    id: "uc-camera",
    shortLabel: "Cameras",
    section: "Unified Communications",
    question: "What camera types are required?",
    prompt: "Select every camera type that applies. Camera quantity, positions and exact models can be captured in the notes.",
    why: "USB, HDMI and NDI cameras create different transport, bridge, control and bandwidth requirements.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-camera", "no-camera-source"],
    capturePlaceholder: "Example: Two NDI PTZ cameras at the front and rear, plus one fixed USB camera at the display.",
    options: [
      {
        value: "no-camera-source",
        label: "No camera — stream the presentation or programme feed only",
        help: "This workflow has no camera source. The live stream uses a presentation, player or other programme feed instead.",
      },
      {
        value: "fixed-usb-camera",
        label: "Fixed USB camera",
        help: "A fixed webcam or conferencing camera connects directly over USB.",
      },
      {
        value: "usb-ptz-camera",
        label: "USB PTZ camera",
        help: "A pan-tilt-zoom conferencing camera requires USB transport and camera control.",
      },
      {
        value: "hdmi-ptz-camera",
        label: "HDMI PTZ camera",
        help: "The camera provides HDMI video and may also require IP or RS-232 control.",
      },
      {
        value: "ndi-network-camera",
        label: "NDI / network PTZ camera",
        help: "The camera provides a network stream and needs a validated NDI, bridge or decoding workflow.",
      },
      {
        value: "other-camera",
        label: "Other camera type",
        help: "Use the notes to capture SDI, proprietary, existing or undecided camera requirements.",
      },
      {
        value: "unknown-camera",
        label: "Not yet selected — camera type",
        help: "Confirm quantity, interface, resolution, positions and control before quoting.",
      },
    ],
  },
  {
    id: "uc-camera-count",
    shortLabel: "Camera quantity",
    section: "Unified Communications",
    question: "How many cameras must this room use?",
    prompt: "A room with more than one camera needs a bridge or composition path for its call, recording, display or live-stream workflow.",
    why: "Camera quantity is an architecture decision, not just a BOM count. Multi-camera rooms need switching, bridging or compositing before the feed reaches the conferencing host.",
    required: true,
    selectionMode: "single",
    capturePlaceholder: "Example: Three cameras — presenter close-up, audience wide shot and document camera.",
    options: [
      { value: "one-camera", label: "One camera", help: "A single camera feeds the conferencing host directly or through the normal room USB path." },
      { value: "two-cameras", label: "Two cameras", help: "A camera bridge or compositor is required to select or combine the two camera feeds." },
      { value: "three-four-cameras", label: "Three or four cameras", help: "Use a governed multi-camera bridge and define switching, presets or multiview composition." },
      { value: "five-plus-cameras", label: "Five or more cameras", help: "Treat this as a designed production-style camera workflow with explicit network, control and composition requirements." },
      { value: "unknown-camera-count", label: "Not yet confirmed — camera count", help: "Confirm the maximum simultaneous camera count before selecting the bridge architecture." },
    ],
  },
  {
    id: "uc-multi-camera-path",
    shortLabel: "Camera bridge",
    section: "Unified Communications",
    question: "Will the multi-camera room use NDI cameras?",
    prompt: "Choose the camera transport so Wingman can apply the correct bridge architecture.",
    why: "NDI cameras join the NetworkHD source pool and need a network bridge/decoder workflow. Non-NDI cameras use a dedicated HDMI camera bridge.",
    required: true,
    selectionMode: "single",
    capturePlaceholder: "Example: Three CAM-210-NDI-PTZ cameras bridged into NetworkHD, with NHD-150-RX multiview on the main display and a separately validated encode/capture return to Teams.",
    options: [
      {
        value: "multi-camera-ndi",
        label: "Yes — NDI camera architecture",
        help: "Use CAM-210-NDI-PTZ cameras, NHD-128-NDI-TRX as the NDI/NetworkHD bridge and NHD-150-RX as the main display decoder. Each NDI stream becomes part of the NetworkHD source pool.",
      },
      {
        value: "multi-camera-non-ndi",
        label: "No — standard camera architecture",
        help: "Use CAM-420-PTZ cameras over USB/HDMI with CAM-0402-BRG for multi-camera switching and bridging into the conferencing host.",
      },
      {
        value: "unknown-multi-camera-path",
        label: "Not yet confirmed — camera transport",
        help: "Confirm NDI versus standard camera transport before quoting the bridge, decoder and network dependencies.",
      },
    ],
  },
  {
    id: "uc-camera-routing",
    shortLabel: "Camera use",
    section: "Unified Communications",
    question: "Where must the camera feeds be used?",
    prompt: "A camera is only counted as a routed AV source when its feed must leave the conferencing peripheral path.",
    why: "Conferencing-only USB cameras should not increase the normal source count, while feeds for displays, recording, streaming or multiview require video routing.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-camera-routing"],
    capturePlaceholder: "Example: Camera 1 feeds Teams and the recorder; both cameras also appear in a confidence multiview.",
    options: [
      {
        value: "camera-to-conferencing",
        label: "Conferencing only",
        help: "The camera is used by the room conferencing host and is not routed as a separate AV source.",
      },
      {
        value: "camera-to-displays",
        label: "Route to room displays",
        help: "The camera feed must be switched or distributed to one or more displays.",
      },
      {
        value: "camera-to-recording",
        label: "Recording or capture",
        help: "The camera feed must reach a recorder, capture device or production system.",
      },
      {
        value: "camera-to-streaming",
        label: "Streaming",
        help: "The camera feed must reach a streaming encoder or software production host.",
      },
      {
        value: "camera-to-multiview",
        label: "Multiview or monitoring",
        help: "One or more camera feeds must appear simultaneously in a monitoring layout.",
      },
      {
        value: "unknown-camera-routing",
        label: "Not confirmed — camera use",
        help: "Confirm whether each camera is conferencing-only or must be routed elsewhere.",
      },
    ],
  },
  {
    id: "uc-microphones",
    shortLabel: "Microphones",
    section: "Unified Communications",
    question: "What microphone types are required?",
    prompt: "Capture speech inputs here. Loudspeakers, amplification and general room audio remain in the separate Audio step.",
    why: "Speech capture affects USB ownership, echo cancellation, DSP, Dante and recording dependencies.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["no-microphones", "unknown-microphones"],
    capturePlaceholder: "Example: One ceiling array for Teams, two wireless microphones for presenters and a feed to the recorder.",
    options: [
      {
        value: "speakerphone",
        label: "Speakerphone",
        help: "A combined tabletop microphone and loudspeaker connects to the conferencing host.",
      },
      {
        value: "table-microphone",
        label: "Table microphone",
        help: "One or more table microphones provide speech capture.",
      },
      {
        value: "ceiling-microphone-array",
        label: "Ceiling microphone array",
        help: "A ceiling array normally requires DSP, echo cancellation and a defined audio transport.",
      },
      {
        value: "wireless-microphone",
        label: "Wireless microphone",
        help: "Presenter, handheld or lapel microphones are required.",
      },
      {
        value: "lectern-microphone",
        label: "Lectern microphone",
        help: "A fixed teaching or presentation microphone is required.",
      },
      {
        value: "existing-microphone-system",
        label: "Existing microphone system",
        help: "The design must interface with an existing microphone or DSP system.",
      },
      {
        value: "no-microphones",
        label: "No microphones required",
        help: "The selected camera or capture workflow does not require speech capture.",
      },
      {
        value: "unknown-microphones",
        label: "Not yet selected — microphone type",
        help: "Confirm microphone type, quantity, coverage and local reinforcement needs.",
      },
    ],
  },
  {
    id: "uc-microphone-connection",
    shortLabel: "Microphone connection",
    section: "Unified Communications",
    question: "How will the microphones connect?",
    prompt: "Select every microphone interface, power and signal path that applies.",
    why: "USB, mic-level, line-level, phantom-powered, digital and Dante paths require different DSP inputs, hosts and network ownership.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-microphone-connection"],
    capturePlaceholder: "Example: Dante ceiling microphone into a room DSP, with USB audio from the DSP to the Teams Room.",
    options: [
      {
        value: "usb-microphone-path",
        label: "USB",
      },
      {
        value: "analogue-microphone-path",
        label: "Analogue mic-level output",
      },
      {
        value: "analogue-line-level-path",
        label: "Analogue line-level output",
      },
      {
        value: "phantom-powered-microphone",
        label: "Phantom-powered microphone",
      },
      {
        value: "digital-audio-microphone-path",
        label: "Digital audio (AES/EBU or S/PDIF)",
      },
      {
        value: "dante-microphone-path",
        label: "Dante / AES67",
      },
      {
        value: "proprietary-network-microphone",
        label: "Network / proprietary",
      },
      {
        value: "unknown-microphone-connection",
        label: "Not confirmed — microphone connection",
      },
    ],
  },
  {
    id: "usb",
    shortLabel: "USB host & transport",
    section: "Audio, control & conferencing",
    question: "Who owns the USB devices, and how must USB travel?",
    prompt: "Select the host, switching and bandwidth requirements for cameras, speakerphones, touch displays and capture devices.",
    why: "USB host ownership, switching, distance and bandwidth can change the complete architecture. HDMI-only designs are unsafe when these peripherals are involved.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["no-usb", "unknown-usb"],
    capturePlaceholder: "Example: Teams Room normally owns the USB camera and DSP, but a visitor laptop can take over through switched USB 3.x.",
    options: [
      {
        value: "no-usb",
        label: "No USB transport required",
        help: "The camera, microphone and capture workflow genuinely uses non-USB interfaces.",
      },
      {
        value: "byod-byom",
        label: "User laptop owns the room USB devices",
        help: "A visitor laptop must use the room camera, microphone, speakerphone or touch devices.",
      },
      {
        value: "room-pc-uc",
        label: "Room PC or UC appliance owns USB",
        help: "A fixed room PC, Teams device, Zoom device or codec owns the USB peripherals.",
      },
      {
        value: "switchable-host-usb",
        label: "USB host must switch",
        help: "USB ownership must switch between the room system and a user laptop.",
      },
      {
        value: "room-host-usb2",
        label: "Standard USB 2.0 path",
        help: "Standard conferencing, touch, keyboard, mouse or USB 2.0 transport is sufficient.",
      },
      {
        value: "usb3-high-bandwidth-path",
        label: "High-bandwidth USB 3.x path",
        help: "High-resolution cameras, capture devices or other peripherals require USB 3.x bandwidth.",
      },
      {
        value: "usb-extension-required",
        label: "USB extension required",
        help: "The peripheral-to-host distance exceeds a practical direct USB cable run.",
      },
      {
        value: "interactive-usb",
        label: "Touch or interactive USB required",
        help: "A touch display or other interactive USB return path is required.",
      },
      {
        value: "unknown-usb",
        label: "Not confirmed — USB scope",
        help: "Confirm the host, peripherals, switching, distance and USB 2.0 or USB 3.x requirement.",
      },
    ],
  },
  {
    id: "audio",
    shortLabel: "Audio",
    section: "Audio, control & conferencing",
    // One question about where sound comes out, and nothing about speaker
    // technology: low impedance, 70/100 V, surround, a separate speech mix and a
    // fallback feed were twelve cards a rep had to choose between, and every one
    // of them is already asked by the follow-ups that appear once the room has
    // its own sound (the listening-experience question, the listening-area
    // question and the programme-audio route). A card list that asks a rep to
    // pick a loudspeaker circuit before anyone knows whether the room needs
    // speakers is the complexity, not the answer.
    question: "Where should the room's sound come out?",
    prompt: "Pick the closest answer. Speaker type, loudness, listening areas and where the sound is taken from are asked next, and only when the room needs its own sound.",
    why: "Where sound comes out decides whether the room needs an amplifier, a processor, a network audio path or nothing at all; every other audio question follows from it.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["no-room-audio", "unknown-audio", "audio-by-others"],
    capturePlaceholder: "Example: Ceiling speakers on a room amplifier, with a feed to the building's audio network.",
    options: [
      {
        value: "room-audio",
        label: "Room speakers and amplifier",
        help: "The sound plays through loudspeakers in the room rather than through the screens.",
      },
      {
        value: "display-audio",
        label: "The screens' own speakers",
        help: "The displays play the sound; no separate room audio system is needed.",
      },
      {
        value: "dante-network-audio",
        label: "The building's audio network",
        help: "Sound is shared as network audio (Dante or AES67) with the rest of the building.",
      },
      {
        value: "audio-by-others",
        label: "Audio system designed by others",
        help: "Skip the room audio design questions. We will only confirm the audio feed needed from video switching.",
      },
      {
        value: "no-room-audio",
        label: "No separate room sound",
        help: "No separate room audio system is required; sound stays with the source or uses the display speakers.",
      },
      {
        value: "unknown-audio",
        label: "Unknown — audio scope",
        help: "Confirm what people need to hear before selecting speakers, amplifiers or interfaces.",
      },
    ],
  },
  {
    id: "control",
    shortLabel: "Control",
    section: "Audio, control & conferencing",
    question: "How should people choose sources and operate the room?",
    prompt: "Select the actions and controls people need. Consider who operates it, where they do so, whether each screen can show a different source, and whether the room should run automatically.",
    why: "The source-selection workflow determines whether users need a local button, keypad, touch panel, app or operator, and whether the system must route different content to separate screens.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-control", "no-user-control"],
    capturePlaceholder: "Example: Staff select Sky or signage from a wall keypad; the meeting room touch panel can route a laptop to either display independently.",
    options: [
      {
        value: "simple-auto",
        label: "Automatic switching or one-button start",
        help: "The room follows an agreed automatic rule or starts with one action; users do not pick among several sources.",
      },
      {
        value: "no-user-control",
        label: "No user control needed",
        help: "Content is fixed or controlled elsewhere. Do not assume a room control interface.",
      },
      {
        value: "front-panel-remote",
        label: "Buttons on equipment or a handheld remote",
        help: "Users make simple local selections at the equipment or with a remote.",
      },
      {
        value: "wall-keypad",
        label: "Wall keypad or button panel",
        help: "Users select a source or a small set of actions from a fixed room position.",
      },
      {
        value: "touch-panel",
        label: "Touch panel / room control",
        help: "Useful for meeting rooms, classrooms and staff-operated AV.",
      },
      {
        value: "source-selection-at-display",
        label: "Choose a source beside each display",
        help: "A user at each screen selects what that display should show.",
      },
      {
        value: "independent-display-routing",
        label: "Route different sources to different screens or zones",
        help: "Confirm which screens can be independent and whether they also need a room-wide mode.",
      },
      {
        value: "central-operator-control",
        label: "A central operator chooses and routes sources",
        help: "A control-room or AV operator manages sources for one or more rooms.",
      },
      {
        value: "presets-schedules",
        label: "Saved layouts, presets or scheduled changes",
        help: "The system recalls repeatable source and display states or changes them on a schedule.",
      },
      {
        value: "software-app-control",
        label: "Software / app control",
        help: "Operate the system from a browser, desktop application, tablet or mobile app.",
      },
      {
        value: "staff-mobile-control",
        label: "Staff phone or tablet",
        help: "Staff need a mobile interface; confirm the approved device, access method and network policy.",
      },
      {
        value: "third-party-control",
        label: "Third-party control",
        help: "Crestron, Q-SYS, AMX, Control4 or similar control system involvement.",
      },
      {
        value: "unknown-control",
        label: "Not decided — who controls what, and how?",
        help: "Keep the control interface, operator and source-routing behaviour open for follow-up.",
      },
    ],
  },
  {
    id: "locations-connections",
    shortLabel: "Positions & distance",
    section: "Room layout & cabling",
    question: "Where are the sources, displays and connection points?",
    prompt: "Select every position that applies, including central or room racks and sources in another room or building. Add the source-to-display routes and approximate distances in the note; exact measurements can wait for the site survey.",
    why: "Source and destination positions determine whether a direct cable, HDBaseT, fibre, AV-over-IP or a remote-room connection should be considered. Central racks and remote feeds can change the architecture as well as the cable route.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-source-positions"],
    capturePlaceholder: "Example: Room PC and signage in the central communications rack; visitor laptops at the lectern; two displays in the room and one remote screen over the network.",
    options: [
      { value: "source-position-central-rack", label: "Central communications room / AV rack", help: "Sources are housed outside this room in a central rack or comms room." },
      { value: "source-position-room-rack", label: "Equipment rack inside this room", help: "Sources or AV equipment are kept in a local room rack." },
      { value: "source-position-local-cupboard", label: "Local cupboard or equipment cabinet", help: "Equipment is in a cupboard or cabinet rather than an open rack." },
      { value: "source-position-lectern", label: "Lectern or teaching position", help: "People connect or operate sources at a lectern." },
      { value: "source-position-table", label: "Table or floor-box connection", help: "People connect devices at a table or floor box." },
      { value: "source-position-display", label: "At or near a display", help: "A source or control point is beside a screen, projector or display wall." },
      { value: "source-position-other-room", label: "Another room on this site", help: "The source or destination is in another room; identify the room and route." },
      { value: "source-position-other-building", label: "Another building or remote site", help: "The source or destination is remote; confirm network ownership and service." },
      { value: "source-position-network", label: "AV network / VLAN feed", help: "The source or destination connects through the customer's network." },
      { value: "topology-captured", label: "Positions and routes detailed in room layout", help: "Detailed equipment positions and approximate routes are recorded separately." },
      { value: "unknown-source-positions", label: "Not decided — source and display positions", help: "Keep locations and distances open for the site survey." },
    ],
  },
];

export const avoipProfileQuestion: DiscoveryQuestion = {
  id: "avoip-profile",
  shortLabel: "Performance fit",
  section: "Sources & displays",
  question: "Which of these sounds closest to what the customer needs?",
  prompt: "Keep this in plain terms — pick whichever is closest to what matters most: cost, image quality, connecting devices, or showing several sources on one screen at once.",
  why: "This is the shortest reliable way to separate NetworkHD 100, 500, and 600 conversations before Finder recommends a family.",
  required: true,
  capturePlaceholder:
    "Example: the standard option is fine on cost, or they want better image quality and device connections, or they need the very best zero-delay option. Note if several sources need to show on one screen at once.",
  options: [
    {
      value: "networkhd-100",
      label: "Standard / most economical",
      help: "Best when cost matters more than an ultra-fast response, and a standard network connection is fine.",
    },
    {
      value: "networkhd-500",
      label: "Premium quality / faster response",
      help: "Use when image quality, a faster response, better device connections, or keeping sound in sync across rooms matter, while still using a standard network connection.",
    },
    {
      value: "networkhd-600",
      label: "Highest performance / zero delay",
      help: "Use when the project genuinely needs the very best, zero-delay picture quality and a higher-capacity network is available.",
    },
    {
      value: "multiview-avoip",
      label: "Several sources on one screen",
      help: "Use when several sources must appear on one screen or monitoring wall at once; exactly which product family still needs confirming.",
    },
    {
      value: "unknown-avoip-profile",
      label: "Unknown — performance fit",
      help: "If unclear, capture the customer's own words and check cost vs quality vs speed priorities, device connections, and whether several sources need to show at once.",
    },
  ],
};

export const operationalWorkflowQuestions: DiscoveryQuestion[] = [
  {
    id: "video-wall-technology", shortLabel: "Wall technology", section: "Video wall intent",
    question: "What kind of video wall is being planned?",
    prompt: "Choose the physical display technology. If it is not confirmed, Wingman will keep both design paths open.",
    why: "LCD arrays and direct-view LED walls use different processing, layout, mounting and commissioning workflows.",
    required: true, selectionMode: "single",
    capturePlaceholder: "Example: 3 × 3 narrow-bezel LCD wall, or a 5 m × 2 m indoor direct-view LED canvas.",
    options: [
      { value: "lcd-array", label: "LCD screen array", help: "Multiple flat panels arranged as one wall or as independently addressed tiles." },
      { value: "direct-view-led", label: "Direct-view LED wall", help: "LED cabinets driven by an LED processor or controller." },
      { value: "projection-canvas", label: "Blended projection canvas", help: "Multiple projectors forming a larger blended image." },
      { value: "wall-technology-unknown", label: "Not confirmed yet — wall technology", help: "Keep LCD, LED and processing decisions open for comparison." },
    ],
  },
  {
    id: "video-wall-purpose", shortLabel: "Wall purpose", section: "Video wall intent",
    question: "How should the wall present content?",
    prompt: "Select the closest operating model. This decision controls whether detailed multiview questions are necessary.",
    why: "A single canvas, signage wall, independently routed tiles and a true multiview canvas require materially different processing.",
    required: true, selectionMode: "single",
    capturePlaceholder: "Example: One presentation stretched across the whole wall, with an occasional four-source preset.",
    options: [
      { value: "single-canvas", label: "One image across the full wall", help: "The wall behaves as one large display canvas." },
      { value: "independent-tiles", label: "Different content on individual screens", help: "Each LCD tile or zone needs independent routing." },
      { value: "signage-presets", label: "Signage layouts and scheduled presets", help: "Content follows repeatable branded or operational layouts." },
      { value: "multi-source-canvas", label: "Several live sources composed together", help: "A multiview or windowing processor is required." },
      { value: "wall-purpose-unknown", label: "Not confirmed yet — wall purpose", help: "Capture the uncertainty without forcing a processor choice." },
    ],
  },
  {
    id: "source-device-workflows", shortLabel: "Source devices", section: "Sources & displays",
    question: "What kinds of sources must the room support?",
    prompt: "Select every type of device or feed, whether it is customer-owned or supplied with the room. Add counts, connectors and exact positions in the note or room layout.",
    why: "The device family affects input format, signal conversion, routing and whether equipment is at the table, lectern, display, local rack or central rack.",
    required: true, selectionMode: "multiple", exclusiveValues: ["unknown-source-devices"],
    capturePlaceholder: "Example: 2 staff laptops (HDMI/USB-C) at the lectern, 1 room PC and 2 signage players in a central rack, plus an existing NDI feed from another building.",
    options: [
      { value: "user-laptops", label: "Visitor or staff laptops" },
      { value: "mobile-tablet-sources", label: "Phones or tablets used as picture sources" },
      { value: "room-pc-uc-source", label: "Room PC or UC appliance" },
      { value: "signage-media-players", label: "Signage or media players" },
      { value: "broadcast-tv-feeds", label: "Broadcast, TV or live-event feeds" },
      { value: "teaching-visualisers", label: "Lectern, visualiser or teaching sources" },
      { value: "operational-workstations", label: "Operational workstations or dashboards" },
      { value: "cameras-production", label: "Camera or production feeds" },
      { value: "specialist-simulation-medical", label: "Specialist, simulation or clinical equipment" },
      { value: "network-remote-feeds", label: "Network or remote-room feeds" },
      { value: "wireless-casting-source", label: "Wireless presentation or casting" },
      { value: "customer-existing-source", label: "Existing customer equipment or a source not listed" },
      { value: "other-source", label: "Another source type — describe it" },
      { value: "unknown-source-devices", label: "Not yet confirmed — source devices" },
    ],
  },
  {
    id: "wireless-presentation-operation", shortLabel: "Wireless operation", section: "Sources & displays",
    question: "How should wireless presentation operate?",
    prompt: "Choose joining, security and sharing behaviour.",
    why: "Define a reliable staff and guest workflow.",
    required: true, selectionMode: "multiple", exclusiveValues: ["no-wireless-presentation", "unknown-wireless-operation"],
    capturePlaceholder: "Add guest, network and moderation details.",
    options: [
      { value: "guest-no-network", label: "Guests present without corporate network access" },
      { value: "managed-staff-casting", label: "Managed staff casting" },
      { value: "button-dongle-workflow", label: "Button or dongle workflow" },
      { value: "moderated-presenters", label: "Host moderation or preview" },
      { value: "simultaneous-wireless-multiview", label: "Several contributors shown together" },
      { value: "wireless-touchback", label: "Touchback or annotation" },
      { value: "wireless-room-routing", label: "Cast content routes beyond one display" },
      { value: "no-wireless-presentation", label: "No wireless presentation" },
      { value: "unknown-wireless-operation", label: "Not yet confirmed — wireless operation" },
    ],
  },
  {
    id: "multiview-destination", shortLabel: "Multiview destination", section: "Sources & displays",
    question: "Where must multiview appear?",
    prompt: "Select every destination.",
    why: "Destinations determine composition paths.",
    required: true, selectionMode: "multiple", exclusiveValues: ["unknown-multiview-destination"],
    capturePlaceholder: "Add canvases, resolutions and return paths.",
    options: [
      { value: "multiview-single-display", label: "Single flat-panel display" },
      { value: "multiview-projector", label: "Projector or projection canvas" },
      { value: "multiview-video-wall", label: "LCD video wall output" },
      { value: "multiview-led-processor", label: "LED wall processor" },
      { value: "multiview-confidence-monitor", label: "Confidence or operator monitor" },
      { value: "multiview-record-stream", label: "Recording or streaming output" },
      { value: "multiview-uc-return", label: "Return composite to Teams/Zoom" },
      { value: "unknown-multiview-destination", label: "Not yet confirmed — multiview destination" },
    ],
  },
  {
    id: "multiview-operation", shortLabel: "Multiview operation", section: "Sources & displays",
    question: "How should multiview layouts operate?",
    prompt: "Define source count, layout and control.",
    why: "Operation determines processing and control.",
    required: true, selectionMode: "multiple", exclusiveValues: ["unknown-multiview-operation"],
    capturePlaceholder: "Add presets, operators and clean feeds.",
    options: [
      { value: "fixed-layout-presets", label: "Fixed named layouts or presets" },
      { value: "operator-dynamic-layout", label: "Operator builds layouts dynamically" },
      { value: "automatic-layout", label: "Automatic or active-speaker layout" },
      { value: "two-four-simultaneous", label: "2–4 simultaneous sources" },
      { value: "five-nine-simultaneous", label: "5–9 simultaneous sources" },
      { value: "ten-plus-simultaneous", label: "10+ simultaneous sources" },
      { value: "independent-compositions", label: "Different compositions on different outputs" },
      { value: "unknown-multiview-operation", label: "Not yet confirmed — multiview operation" },
    ],
  },
  {
    id: "uc-microphone-count", shortLabel: "Microphone quantity", section: "Unified Communications",
    question: "How many microphone feeds or pickup zones are required?",
    prompt: "Count independent arrays, channels and zones.",
    why: "Feed count determines mixing, DSP and AEC.",
    required: true, selectionMode: "single", capturePlaceholder: "Add microphone and zone details.",
    options: [
      { value: "one-microphone-feed", label: "One microphone feed or integrated device" },
      { value: "two-four-microphone-feeds", label: "2–4 feeds or pickup zones" },
      { value: "five-eight-microphone-feeds", label: "5–8 feeds or pickup zones" },
      { value: "nine-plus-microphone-feeds", label: "9+ feeds or pickup zones" },
      { value: "unknown-microphone-count", label: "Not yet confirmed — microphone count" },
    ],
  },
  {
    id: "uc-audio-processing", shortLabel: "Audio processing", section: "Unified Communications",
    question: "How must microphone and programme audio operate?",
    prompt: "Select mixing, bridging, DSP and output outcomes.",
    why: "Each destination may require a different mix.",
    required: true, selectionMode: "multiple", exclusiveValues: ["unknown-audio-processing"],
    capturePlaceholder: "Add mixes, bridges and commissioning needs.",
    options: [
      { value: "direct-integrated-audio", label: "Direct integrated device—no external DSP" },
      { value: "dsp-aec-automix", label: "DSP, AEC and automixing" },
      { value: "local-voice-reinforcement", label: "Local voice reinforcement" },
      { value: "independent-record-mix", label: "Independent recording or streaming mix" },
      { value: "audio-bridge-usb-dante-analogue", label: "Bridge USB, Dante and/or analogue audio" },
      { value: "multiple-audio-zones", label: "Different audio zones or outputs" },
      { value: "operator-audio-control", label: "Operator mixing or mute control" },
      { value: "unknown-audio-processing", label: "Not yet confirmed — audio processing" },
    ],
  },
];

// The full, unfiltered option set per question id (base + operational + avoip).
// The interview's visible list is answer-filtered, so a stored answer can name
// a REAL option that is currently hidden by those filters. This index is what
// lets consumers tell rule-hidden defaults apart from non-option junk.

// The complete canonical question set: base questions plus the operational
// inserts and the AVoIP profile question that getApplicationDiscoveryQuestions
// wires in per application. Consumers that must validate the WHOLE option
// vocabulary (label uniqueness, i18n coverage) iterate this list.
export const canonicalDiscoveryQuestions: DiscoveryQuestion[] = [
  ...baseDiscoveryQuestions,
  ...operationalWorkflowQuestions,
  ...discoveryAudioQuestions,
  avoipProfileQuestion,
];
