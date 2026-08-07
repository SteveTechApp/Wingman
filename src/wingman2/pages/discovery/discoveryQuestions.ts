// Discovery question definitions, application-specific question sets, and the
// per-step guidance/strategy. Extracted verbatim from DiscoveryPage.tsx so the
// question data and selection logic live outside the React component.
//
// Guard note: check-discovery-topology, workflow-integration-check and
// production-readiness-check assert on the question ids and on
// baseQuestionStrategyByStep / getQuestionStrategy, which now live in this file.

import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";

const baseDiscoveryQuestions: DiscoveryQuestion[] = [
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
        label: "Unknown",
        help: "Capture the customer wording and continue.",
      },
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
        label: "Unknown",
        help: "Ask what the customer needs to connect.",
      },
    ],
  },
  {
    id: "source-connection",
    shortLabel: "Source type",
    section: "Sources & displays",
    question: "Which source profile best describes the room?",
    prompt: "Choose the closest overall source workflow. Camera and microphone requirements are captured separately in Unified Communications.",
    why: "Separating fixed equipment, user presentation and network video avoids overlapping connector-based answers and gives Wingman a clearer architecture direction.",
    required: true,
    selectionMode: "single",
    capturePlaceholder: "Example: Two permanent media players plus laptops connected by USB-C or wireless presentation.",
    options: [
      {
        value: "fixed-hdmi-sources",
        label: "Fixed room sources only",
        help: "Room PCs, media players, signage players, set-top boxes or other permanently installed HDMI devices. Users do not normally connect laptops.",
      },
      {
        value: "laptops-wireless-inputs",
        label: "User presentation sources only",
        help: "Users connect laptops by USB-C, HDMI or wireless presentation. There are no significant permanently installed video sources.",
      },
      {
        value: "mixed-hdmi-usbc",
        label: "Fixed sources plus user presentation",
        help: "The room uses permanently installed HDMI equipment as well as laptops connected by USB-C, HDMI or wireless presentation.",
      },
      {
        value: "network-video-sources",
        label: "Mixed sources including network video",
        help: "Local fixed equipment and/or user laptops are combined with routed AV-over-IP, NDI or other network video streams.",
      },
      {
        value: "unknown-source-connectors",
        label: "Not yet confirmed",
        help: "Confirm whether the room needs fixed equipment, user laptops, wireless presentation or network video before selecting the architecture.",
      },
    ],
  },
  {
    id: "displays",
    shortLabel: "Displays",
    section: "Sources & displays",
    question: "How many displays or outputs are needed?",
    prompt: "Include projectors, confidence monitors, overflow displays, video walls and LED processors.",
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
    id: "display-behaviour",
    shortLabel: "Display behaviour",
    section: "Sources & displays",
    question: "How should the displays behave?",
    prompt: "Capture whether outputs mirror, route independently, feed a wall processor, or show multiple sources on one canvas.",
    why: "Display behaviour is the difference between simple distribution, matrix routing, multiview, and wall-processing conversations.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-display-behaviour"],
    capturePlaceholder: "Example: All TVs show the same source, or each zone routes independently, or one LED processor needs a multiview feed.",
    options: [
      {
        value: "same-content-all-displays",
        label: "Same content on all displays",
        help: "Mirrored distribution or repeated output behaviour.",
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
        label: "Unknown",
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
        label: "Unknown",
        help: "Ask whether the job is 1080p, 4K, HDR, HDCP-sensitive, or likely to have EDID issues.",
      },
    ],
  },
  {
      id: "uc-purpose",
      shortLabel: "UC requirement",
      section: "Unified Communications",
      question: "What camera, microphone or capture workflows are required?",
      prompt: "Select every workflow that applies. Conferencing, recording and camera distribution may be required together.",
      why: "These workflows can coexist but need different USB, audio, routing and capture paths. Capturing them separately prevents an incomplete system design.",
      required: true,
      selectionMode: "multiple",
      exclusiveValues: ["no-uc", "unknown-uc"],
      capturePlaceholder: "Example: Teams conferencing plus lecture recording, using two room cameras and ceiling microphones.",
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
              label: "Not yet confirmed",
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
        label: "Not yet selected",
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
        label: "Not yet confirmed",
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
    exclusiveValues: ["unknown-camera"],
    capturePlaceholder: "Example: Two NDI PTZ cameras at the front and rear, plus one fixed USB camera at the display.",
    options: [
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
        label: "Not yet selected",
        help: "Confirm quantity, interface, resolution, positions and control before quoting.",
      },
    ],
  },
  {
    id: "uc-camera-count",
    shortLabel: "Camera quantity",
    section: "Unified Communications",
    question: "How many cameras must the video-conferencing room use?",
    prompt: "A room with more than one camera needs a camera bridge or compositing path so the conferencing host receives a usable programme feed.",
    why: "Camera quantity is an architecture decision, not just a BOM count. Multi-camera rooms need switching, bridging or compositing before the feed reaches the conferencing host.",
    required: true,
    selectionMode: "single",
    capturePlaceholder: "Example: Three cameras — presenter close-up, audience wide shot and document camera.",
    options: [
      { value: "one-camera", label: "One camera", help: "A single camera feeds the conferencing host directly or through the normal room USB path." },
      { value: "two-cameras", label: "Two cameras", help: "A camera bridge or compositor is required to select or combine the two camera feeds." },
      { value: "three-four-cameras", label: "Three or four cameras", help: "Use a governed multi-camera bridge and define switching, presets or multiview composition." },
      { value: "five-plus-cameras", label: "Five or more cameras", help: "Treat this as a designed production-style camera workflow with explicit network, control and composition requirements." },
      { value: "unknown-camera-count", label: "Not yet confirmed", help: "Confirm the maximum simultaneous camera count before selecting the bridge architecture." },
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
        label: "Not yet confirmed",
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
        label: "Not confirmed",
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
        label: "Not yet selected",
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
        label: "Not confirmed",
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
        label: "Not confirmed",
        help: "Confirm the host, peripherals, switching, distance and USB 2.0 or USB 3.x requirement.",
      },
    ],
  },
  {
    id: "audio",
    shortLabel: "Audio",
    section: "Audio, control & conferencing",
    question: "How should room audio be connected and operated?",
    prompt: "Select playback, amplification, distribution and reinforcement requirements.",
    why: "Audio topology defines amplifier, DSP, loudspeaker, cabling and commissioning scope for other vendors.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-audio"],
    capturePlaceholder: "Example: Ceiling speakers with a room amplifier, plus de-embedded programme audio for recording.",
    options: [
      {
        value: "display-audio",
        label: "Display audio",
      },
      {
        value: "source-audio-deembed",
        label: "Pull sound out separately",
      },
      {
        value: "room-audio",
        label: "Room loudspeakers and amplifier",
      },
      {
        value: "stereo-low-impedance",
        label: "Stereo low-impedance programme sound",
      },
      {
        value: "multichannel-audio",
        label: "Multi-channel or surround audio",
      },
      {
        value: "distributed-70v-100v",
        label: "Distributed 70 V / 100 V loudspeakers",
      },
      {
        value: "separate-programme-voice",
        label: "Separate programme sound and voice reinforcement",
      },
      {
        value: "analogue-audio-override",
        label: "Analogue audio override or fallback",
      },
      {
        value: "digital-audio-interface",
        label: "Digital audio interface",
      },
      {
        value: "dante-network-audio",
        label: "Dante / AES67 network audio",
      },
      {
        value: "unknown-audio",
        label: "Unknown",
      },
    ],
  },
  {
    id: "control",
    shortLabel: "Control",
    section: "Audio, control & conferencing",
    question: "How should people in the room operate the system?",
    prompt: "Think about staff use, wall control, touch panels, third-party control, automation or simple source selection.",
    why: "Control affects usability, supportability and whether the solution is realistic for non-technical users.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-control"],
    capturePlaceholder: "Example: Reception staff need to choose Sky, signage or laptop on each TV without calling IT.",
    options: [
      {
        value: "simple-auto",
        label: "Simple / automatic",
        help: "Minimal user interaction, auto-switching or one-button behaviour.",
      },
      {
        value: "front-panel-remote",
        label: "Remote / front panel",
        help: "Suitable for very simple local systems only.",
      },
      {
        value: "touch-panel",
        label: "Touch panel / room control",
        help: "Useful for meeting rooms, classrooms and staff-operated AV.",
      },
      {
        value: "third-party-control",
        label: "Third-party control",
        help: "Crestron, Q-SYS, AMX, Control4 or similar control system involvement.",
      },
      {
        value: "unknown-control",
        label: "Unknown",
        help: "Ask who operates the system day-to-day.",
      },
    ],
  },
  {
    id: "locations-connections",
    shortLabel: "Positions & distance",
    section: "Room layout & cabling",
    question: "Where is the equipment, and how far must signals travel?",
    prompt: "Choose broad room positions, the longest video route and the likely cable path. Exact measurements can be confirmed during the site survey.",
    why: "Wingman can use simple distance bands to identify when direct cables, HDBaseT, fibre, AV-over-IP or separate USB extension should be considered.",
    required: true,
    capturePlaceholder: "Example: Sources in a local rack, displays across a large room, ceiling route approximately 25–50m, USB camera at the front wall.",
    options: [
      {
        value: "topology-captured",
        label: "Room positions and distances captured",
        help: "Broad route estimates are stored for cable, extender and architecture checks.",
      },
    ],
  },
];

const avoipProfileQuestion: DiscoveryQuestion = {
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
      label: "Unknown",
      help: "If unclear, capture the customer's own words and check cost vs quality vs speed priorities, device connections, and whether several sources need to show at once.",
    },
  ],
};

const operationalWorkflowQuestions: DiscoveryQuestion[] = [
  {
    id: "source-device-workflows", shortLabel: "Source devices", section: "Sources & displays",
    question: "Which devices and feeds will people use?",
    prompt: "Select every source family.",
    why: "Device roles determine routing and control.",
    required: true, selectionMode: "multiple", exclusiveValues: ["unknown-source-devices"],
    capturePlaceholder: "Add device types, quantities and workflows.",
    options: [
      { value: "user-laptops", label: "Visitor or staff laptops" },
      { value: "room-pc-uc-source", label: "Room PC or UC appliance" },
      { value: "signage-media-players", label: "Signage or media players" },
      { value: "broadcast-tv-feeds", label: "Broadcast, TV or live-event feeds" },
      { value: "teaching-visualisers", label: "Lectern, visualiser or teaching sources" },
      { value: "operational-workstations", label: "Operational workstations or dashboards" },
      { value: "cameras-production", label: "Camera or production feeds" },
      { value: "specialist-simulation-medical", label: "Specialist, simulation or clinical equipment" },
      { value: "network-remote-feeds", label: "Network or remote-room feeds" },
      { value: "wireless-casting-source", label: "Wireless presentation or casting" },
      { value: "unknown-source-devices", label: "Not yet confirmed" },
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
      { value: "unknown-wireless-operation", label: "Not yet confirmed" },
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
      { value: "multiview-video-wall", label: "LCD video wall" },
      { value: "multiview-led-processor", label: "LED wall processor" },
      { value: "multiview-confidence-monitor", label: "Confidence or operator monitor" },
      { value: "multiview-record-stream", label: "Recording or streaming output" },
      { value: "multiview-uc-return", label: "Return composite to Teams/Zoom" },
      { value: "unknown-multiview-destination", label: "Not yet confirmed" },
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
      { value: "unknown-multiview-operation", label: "Not yet confirmed" },
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
      { value: "unknown-microphone-count", label: "Not yet confirmed" },
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
      { value: "unknown-audio-processing", label: "Not yet confirmed" },
    ],
  },
];

function insertAfter(questions: DiscoveryQuestion[], afterId: string, additions: DiscoveryQuestion[]) {
  const index = questions.findIndex((step) => step.id === afterId);
  if (index < 0) return questions;
  questions.splice(index + 1, 0, ...additions);
  return questions;
}

function getApplicationDiscoveryQuestions(selectedApplication: string): DiscoveryQuestion[] {
  const questions = [...baseDiscoveryQuestions];
  const byId = (id: string) => operationalWorkflowQuestions.find((step) => step.id === id)!;
  insertAfter(questions, "source-connection", [byId("source-device-workflows"), byId("wireless-presentation-operation")]);
  insertAfter(questions, "display-behaviour", [byId("multiview-destination"), byId("multiview-operation")]);
  insertAfter(questions, "uc-microphones", [byId("uc-microphone-count"), byId("uc-audio-processing")]);

  if (selectedApplication !== "av-over-ip") return questions;

  // Insert directly after "signal-standard" so it stays grouped inside the
  // "Sources & displays" phase instead of trailing the whole question set.
  const insertAfterIndex = questions.findIndex((step) => step.id === "signal-standard");
  const withProfile = [...questions];
  withProfile.splice(insertAfterIndex + 1, 0, avoipProfileQuestion);
  return withProfile;
}



export function getVisibleDiscoveryQuestions(
  selectedApplication: string,
  answers: DiscoveryAnswers = {},
): DiscoveryQuestion[] {
  const withApplicationQuestions = getApplicationDiscoveryQuestions(selectedApplication);
  const ucPurposeValue = Array.isArray(answers["uc-purpose"])
    ? answers["uc-purpose"][0] ?? ""
    : String(answers["uc-purpose"] ?? "");
  const microphoneValues = Array.isArray(answers["uc-microphones"])
    ? answers["uc-microphones"]
    : [String(answers["uc-microphones"] ?? "")].filter(Boolean);

  const detailedUcSteps = new Set([
    "uc-platform",
    "uc-camera",
    "uc-camera-routing",
    "uc-microphones",
    "uc-microphone-connection",
    "uc-microphone-count",
    "uc-audio-processing",
    "usb",
  ]);

  const sourceProfileValues = Array.isArray(answers["source-connection"]) ? answers["source-connection"] : [String(answers["source-connection"] ?? "")];
  const sourceDeviceValues = Array.isArray(answers["source-device-workflows"]) ? answers["source-device-workflows"] : [String(answers["source-device-workflows"] ?? "")];
  const displayBehaviourValues = Array.isArray(answers["display-behaviour"]) ? answers["display-behaviour"] : [String(answers["display-behaviour"] ?? "")];
  const displayValues = Array.isArray(answers.displays) ? answers.displays : [String(answers.displays ?? "")];
  const multiviewRequired = selectedApplication === "video-wall" || displayBehaviourValues.includes("multiview-on-one-output") || displayValues.includes("video-wall-output") || answers["avoip-profile"] === "multiview-avoip";
  const wirelessRelevant = sourceProfileValues.some((value) => ["laptops-wireless-inputs", "mixed-hdmi-usbc", "network-video-sources"].includes(value)) || sourceDeviceValues.includes("wireless-casting-source");

  return withApplicationQuestions.filter((step) => {
    if (step.id === "wireless-presentation-operation" && !wirelessRelevant) return false;
    if (["multiview-destination", "multiview-operation"].includes(step.id) && !multiviewRequired) return false;
    if (!ucPurposeValue || ucPurposeValue === "no-uc") {
      return !detailedUcSteps.has(step.id);
    }

    if (
      ucPurposeValue === "camera-distribution-only" &&
      ["uc-platform", "uc-microphones", "uc-microphone-connection", "usb"].includes(step.id)
    ) {
      return false;
    }

    if (
      step.id === "uc-microphone-connection" &&
      microphoneValues.includes("no-microphones")
    ) {
      return false;
    }

    if (["uc-microphone-count", "uc-audio-processing"].includes(step.id) && microphoneValues.includes("no-microphones")) return false;

    return true;
  });
}

type ApplicationSpecificDiscoveryQuestionGuidance = {
  likelyDirection: string;
  askNext: string;
  checkBeforeProduct: string[];
};

const applicationSpecificDiscoveryQuestionGuidance: Record<string, ApplicationSpecificDiscoveryQuestionGuidance> = {
  "meeting-room": {
    likelyDirection: "Presentation switcher, UC/BYOD workflow, USB ownership and room audio need checking before product selection.",
    askNext: "Will users bring their own laptop for Teams/Zoom, or is there a fixed room PC or UC appliance?",
    checkBeforeProduct: [
      "USB camera and speakerphone ownership",
      "USB-C, HDMI and wireless input needs",
      "Single display, dual display or confidence display behaviour",
    ],
  },
  classroom: {
    likelyDirection: "Lectern switching, display/projector transport, teacher control and audio path should be defined first.",
    askNext: "Where are the teacher inputs located, and does the room need a projector, display, confidence monitor or capture output?",
    checkBeforeProduct: [
      "Lectern source count",
      "Projector or display distance",
      "Room audio, microphone and control needs",
    ],
  },
  hospitality: {
    likelyDirection: "Matrix or NetworkHD direction depends on number of displays, source locations, staff control and expansion need.",
    askNext: "How many TVs/zones need different content, and who needs to control them day-to-day?",
    checkBeforeProduct: [
      "TV/output count",
      "Sky/media/signage source count",
      "Staff control simplicity",
      "Contained matrix vs. an expandable networked system",
    ],
  },
  "video-wall": {
    likelyDirection: "Clarify LCD vs LED, full-canvas vs multiview vs signage before choosing a networked system or a dedicated wall processor.",
    askNext: "Is the wall showing one full image, different content per screen, signage presets, or multiple sources at the same time?",
    checkBeforeProduct: [
      "LCD wall or LED processor feed",
      "Wall layout",
      "Full canvas, per-display routing or multiview",
      "Dedicated processor vs. networked-system trade-off",
    ],
  },
  "av-over-ip": {
    likelyDirection: "Use one extra question to separate the NetworkHD 100, 500, and 600 product families before Finder recommends one.",
    askNext: "Will IT allow this to run on the customer's existing network, or should we plan for a separate dedicated network while we confirm the performance level needed?",
    checkBeforeProduct: [
      "Network ownership",
      "Standard vs. highest-performance network requirement",
      "Cost vs. speed-of-response priority",
      "Multiview requirement",
      "Encoder and decoder count",
      "Device connections, room-to-room sound, and control requirements",
      "Needs one system controller",
    ],
  },
  "not-sure": {
    likelyDirection: "Keep the conversation application-led. Capture customer wording and identify video, USB, audio, control and distance paths.",
    askNext: "What is the customer trying to achieve in plain terms, and what devices need to connect to what displays?",
    checkBeforeProduct: [
      "Application type",
      "Source and display count",
      "USB/conferencing need",
      "Audio and control need",
      "Cable distance or network availability",
    ],
  },
};


// Readiness-required application-specific discovery question guidance.
// production-readiness-check.mjs verifies baseQuestionStrategyByStep and getQuestionStrategy are present.
const baseQuestionStrategyByStep: Record<string, ApplicationSpecificDiscoveryQuestionGuidance> = {
  opportunity: {
    likelyDirection: "Start with the customer application before choosing a product family.",
    askNext: "What is the customer trying to achieve, and what type of space or system is this?",
    checkBeforeProduct: [
      "Application type",
      "Customer wording",
      "Likely room or system category",
    ],
  },
  scale: {
    likelyDirection: "Scale helps decide between a simple local switcher, a bigger matrix switcher, a signal booster/extender, or a networked system.",
    askNext: "Is this one room, several rooms, or a wider building/campus requirement?",
    checkBeforeProduct: [
      "Room count",
      "Approximate distance",
      "Local rack or distributed locations",
    ],
  },
  sources: {
    likelyDirection: "Source quantity and location drive input count, encoder count and switching method.",
    askNext: "What needs to connect: laptops, PCs, signage players, media players, cameras or wireless devices?",
    checkBeforeProduct: [
      "Source count",
      "Source type",
      "Source location",
    ],
  },
  "source-connection": {
    likelyDirection: "Source connector type decides whether the next conversation is HDMI-only, USB-C, wireless input, NDI, or a mixed workflow.",
    askNext: "Are the sources fixed HDMI devices, USB-C laptops, wireless inputs, or cameras and network streams?",
    checkBeforeProduct: [
      "HDMI, USB-C, wireless or network-video sources",
      "Fixed devices versus user-driven inputs",
      "Any NDI, PTZ or camera workflow",
    ],
  },
  displays: {
    likelyDirection: "Display/output count is one of the main dividers between switcher, matrix and networked-system design.",
    askNext: "How many displays, projectors, confidence monitors, overflow displays or wall processor feeds are needed?",
    checkBeforeProduct: [
      "Output count",
      "Independent versus mirrored outputs",
      "Video wall or LED processor requirement",
    ],
  },
  "display-behaviour": {
    likelyDirection: "Display behaviour separates mirrored distribution, routed outputs, multiview, and wall-processing conversations.",
    askNext: "Do the displays all show the same source, route independently, feed a wall processor, or need several sources on one output?",
    checkBeforeProduct: [
      "Mirrored versus independent routing",
      "Wall processor or video wall behaviour",
      "Multiview requirement",
    ],
  },
  "signal-standard": {
    likelyDirection: "Signal standard makes resolution, HDR, HDCP, and EDID compatibility visible before a product is named.",
    askNext: "Is the project standard 1080p, standard 4K60, HDR/HDCP-sensitive 4K, or a mixed EDID-risk environment?",
    checkBeforeProduct: [
      "Resolution",
      "HDR and HDCP requirement",
      "EDID or mixed-display compatibility risk",
    ],
  },
  usb: {
    likelyDirection: "USB and conferencing requirements define host ownership, peripheral location and whether USB 2.0 or USB 3.x transport is required.",
    askNext: "Which device owns the USB session, which peripherals are required, where are they located, and is USB 2.0 or USB 3.x bandwidth needed?",
    checkBeforeProduct: [
      "USB host ownership",
      "Camera, microphone, speakerphone, touch or other peripherals",
      "Peripheral location",
      "BYOD, BYOM, room PC or UC appliance workflow",
      "USB 2.0 versus USB 3.x bandwidth",
    ],
  },
  audio: {
    likelyDirection: "Audio requirements affect product dependencies, amplifier needs and conferencing design.",
    askNext: "Where should sound be heard, and are microphones or conferencing audio required?",
    checkBeforeProduct: [
      "Display audio versus room audio",
      "Microphone requirement",
      "Amplifier requirement, or whether sound needs to reach other rooms",
    ],
  },
  "locations-connections": {
    likelyDirection: "Device locations and connection paths determine whether native HDMI or USB remains practical, or whether HDBaseT, fibre, USB extension or AV-over-IP is required.",
    askNext: "Where is each primary device, what does it connect to, which services cross that path, and is the route length estimated, confirmed or unknown?",
    checkBeforeProduct: [
      "Known source, switching, network and destination devices",
      "Room, rack, ceiling, wall or building location for each device",
      "HDMI, USB-C, HDBaseT, fibre, IP, USB, audio and control paths",
      "Estimated versus confirmed installed cable lengths",
    ],
  },
  control: {
    likelyDirection: "Control defines whether the system is practical for the people who will operate it.",
    askNext: "Who will operate the system day-to-day, and how simple does that control need to be?",
    checkBeforeProduct: [
      "User control method",
      "Touch panel or third-party control",
      "Staff usability requirement",
    ],
  },
  "avoip-profile": {
    likelyDirection: "This choice shapes whether Wingman steers toward the NetworkHD 100, 500, or 600 family, and whether showing several sources on one screen must be part of the conversation.",
    askNext: "Is the driver cost, better quality and device connections, the best possible zero-delay performance, or showing several sources on one screen?",
    checkBeforeProduct: [
      "Cost versus speed-of-response priority",
      "Standard versus highest-performance network availability",
      "USB and audio integration need",
      "Multiview requirement",
    ],
  },
};

export function getQuestionStrategy(stepId: string, selectedApplication: string): ApplicationSpecificDiscoveryQuestionGuidance {
  const baseStrategy = baseQuestionStrategyByStep[stepId] ?? baseQuestionStrategyByStep.opportunity;
  const applicationStrategy = applicationSpecificDiscoveryQuestionGuidance[selectedApplication];

  if (!applicationStrategy) {
    return baseStrategy;
  }

  if (stepId === "opportunity") {
    return applicationStrategy;
  }

  if (stepId === "avoip-profile" && selectedApplication === "av-over-ip") {
    return {
      likelyDirection:
        "Use this single step to separate the standard (NetworkHD 100), premium (NetworkHD 500), and highest-performance (NetworkHD 600) conversations, while keeping the several-sources-on-one-screen option visible.",
      askNext:
        "Is the priority cost, premium quality and device connections, or true top-end zero-delay performance — and does the customer need several sources shown on one screen?",
      checkBeforeProduct: [
        "Standard, most economical path",
        "Premium quality, stronger device connections, or room-to-room sound path",
        "Highest-performance, zero-delay path",
        "Multiview or composed-output requirement",
      ],
    };
  }

  return baseStrategy;
}
