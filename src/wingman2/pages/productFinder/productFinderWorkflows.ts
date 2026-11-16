import type { FinderNeed } from "./productFinderRanking";

export type FinderWorkflowOption = {
  id: string;
  label: string;
  detail: string;
  matchTerms?: string[];
  requiredProductTerms?: string[];
  capacity?: {
    inputs?: { min?: number; max?: number };
    outputs?: { min?: number; max?: number };
    mode?: "all" | "any";
  };
};

export type FinderWorkflowQuestion = {
  id: string;
  prompt: string;
  help: string;
  options: FinderWorkflowOption[];
};

export const finderWorkflows: Record<FinderNeed, FinderWorkflowQuestion[]> = {
  wall: [
    {
      id: "wall-layout",
      prompt: "How should the displays present content?",
      help: "This decides whether to look for a wall processor, multiview system or straightforward display routing.",
      options: [
        { id: "single-canvas", label: "One image across the wall", detail: "Join displays into one large canvas.", matchTerms: ["video wall", "videowall", "wall processor", "scaling"] },
        { id: "independent-displays", label: "Separate content on each display", detail: "Route different sources to individual screens.", matchTerms: ["matrix", "routed", "independent outputs"] },
        { id: "multiview", label: "Several sources in windows", detail: "Compose multiple live feeds on one canvas.", matchTerms: ["multiview", "multi-view", "windowing", "video wall"] },
        { id: "led-canvas", label: "Direct-view LED canvas", detail: "Feed an LED processor at its required canvas format.", requiredProductTerms: ["direct-view led", "led processor", "led wall processor"] },
      ],
    },
    {
      id: "wall-size",
      prompt: "How many display outputs does the layout need?",
      help: "Use the number of separately connected panels or processor outputs; confirm the exact mapping during system design.",
      options: [
        { id: "wall-up-to-four", label: "Up to 4 outputs", detail: "Compact wall or small multi-display layout.", capacity: { outputs: { min: 1, max: 4 } } },
        { id: "wall-five-to-eight", label: "5–8 outputs", detail: "Larger display group with more output paths.", capacity: { outputs: { min: 5, max: 8 } } },
        { id: "wall-more-than-eight", label: "More than 8", detail: "Large or expandable display canvas.", capacity: { outputs: { min: 9 } } },
        { id: "wall-size-unknown", label: "Not confirmed yet", detail: "Keep output scale open until the screen plan is known." },
      ],
    },
  ],
  matrix: [
    {
      id: "matrix-capacity",
      prompt: "How many sources and displays must the matrix connect?",
      help: "Choose the closest I/O scale. Exact input and output counts still need confirming before specification.",
      options: [
        { id: "matrix-small", label: "Up to 4 × 4", detail: "A few sources and displays.", capacity: { inputs: { min: 1, max: 4 }, outputs: { min: 1, max: 4 } } },
        { id: "matrix-medium", label: "5–8 inputs or outputs", detail: "A mid-size matrix with multiple routes.", capacity: { inputs: { min: 5, max: 8 }, outputs: { min: 5, max: 8 }, mode: "any" } },
        { id: "matrix-large", label: "More than 8", detail: "Large I/O count or room to grow.", capacity: { inputs: { min: 9 }, outputs: { min: 9 }, mode: "any" } },
        { id: "matrix-capacity-unknown", label: "Not confirmed yet", detail: "Keep the size open until the source and display count is known." },
      ],
    },
    {
      id: "matrix-routing",
      prompt: "How should the outputs behave?",
      help: "This separates independent matrix routing from mirrored distribution and hybrid use.",
      options: [
        { id: "matrix-independent", label: "Route sources independently", detail: "Each display can show a different selected source.", matchTerms: ["matrix", "routed", "independent", "multi-input"] },
        { id: "matrix-mirrored", label: "Show the same source on all displays", detail: "One source is distributed to several outputs.", matchTerms: ["splitter", "distribution amplifier", "mirrored", "1x4", "1x8"] },
        { id: "matrix-hybrid", label: "Both, depending on the display", detail: "Some outputs mirror while others route independently.", matchTerms: ["matrix", "mirrored", "routed", "hybrid"] },
        { id: "matrix-routing-unknown", label: "Not confirmed yet", detail: "Keep output behaviour open for review." },
      ],
    },
  ],
  extend: [
    {
      id: "extend-signal",
      prompt: "Which signal needs to travel farther?",
      help: "AV, USB and combined KVM paths use different extension products and distance limits.",
      options: [
        { id: "extend-video", label: "Video only", detail: "Carry HDMI or another video signal to a remote display.", matchTerms: ["hdmi extender", "video extender", "hdbaset", "transmitter", "receiver"] },
        { id: "extend-usb", label: "USB peripherals", detail: "Reach a camera, touch display or other remote USB device.", matchTerms: ["usb extender", "usb extension", "usb host", "usb device", "usb 3"] },
        { id: "extend-av-usb", label: "Video and USB together", detail: "Extend a laptop or PC connection with KVM.", matchTerms: ["kvm extender", "usb kvm", "usb 2.0", "hdbaset"] },
        { id: "extend-other", label: "Audio or control", detail: "Carry an audio or control connection to another location.", matchTerms: ["audio extension", "rs-232", "ir passthrough", "control"] },
      ],
    },
    {
      id: "extend-distance",
      prompt: "What is the approximate cable distance?",
      help: "Choose a rough range. Verify the product’s supported distance at the required resolution and cable type.",
      options: [
        { id: "extend-short", label: "Up to 15 m", detail: "Short in-room run.", matchTerms: ["15m", "15 m", "10m", "10 m", "5m", "5 m"] },
        { id: "extend-medium", label: "15–100 m", detail: "Across a room or between nearby spaces.", matchTerms: ["35m", "35 m", "70m", "70 m", "100m", "100 m"] },
        { id: "extend-long", label: "More than 100 m", detail: "Long run; fibre or network transport may be needed.", matchTerms: ["fibre", "fiber", "optical", "networkhd", "av over ip"] },
        { id: "extend-distance-unknown", label: "Not measured yet", detail: "Confirm the route and length on site." },
      ],
    },
  ],
  duplicate: [
    {
      id: "duplicate-outputs",
      prompt: "How many displays need the same source?",
      help: "Output count helps distinguish a small distribution amplifier from a larger distribution system.",
      options: [
        { id: "duplicate-two", label: "2 displays", detail: "One source sent to two screens.", capacity: { outputs: { min: 2 } } },
        { id: "duplicate-three-four", label: "3–4 displays", detail: "Small multi-screen distribution.", capacity: { outputs: { min: 3, max: 4 } } },
        { id: "duplicate-five-plus", label: "5 or more", detail: "Larger distribution or a networked approach.", capacity: { outputs: { min: 5 } } },
        { id: "duplicate-count-unknown", label: "Not confirmed yet", detail: "Keep output quantity open until the display count is known." },
      ],
    },
    {
      id: "duplicate-behaviour",
      prompt: "Should every display show the same thing?",
      help: "If displays need different sources, a matrix may fit better than a duplicator.",
      options: [
        { id: "duplicate-same", label: "Yes, identical picture everywhere", detail: "One selected source is mirrored to all outputs.", matchTerms: ["splitter", "duplicator", "distribution amplifier", "mirrored"] },
        { id: "duplicate-different", label: "No, displays need different sources", detail: "Each output must select its own source.", matchTerms: ["matrix", "routed", "independent outputs"] },
        { id: "duplicate-some", label: "A mix of shared and separate feeds", detail: "Some screens mirror; others need independent selection.", matchTerms: ["matrix", "hybrid", "routed", "mirrored"] },
        { id: "duplicate-behaviour-unknown", label: "Not confirmed yet", detail: "Confirm whether the picture is shared or independently selected." },
      ],
    },
  ],
  network: [
    {
      id: "network-topology",
      prompt: "How should AV travel across the network?",
      help: "This narrows the job to a point-to-point link, distributed endpoints or a composed display system.",
      options: [
        { id: "network-point-to-point", label: "One source to one destination", detail: "A simple encoder-to-decoder path.", matchTerms: ["encoder", "decoder", "networkhd", "av over ip"] },
        { id: "network-many-endpoints", label: "Sources and displays across spaces", detail: "Route streams among multiple network endpoints.", matchTerms: ["networkhd", "av over ip", "ip video", "encoder", "decoder"] },
        { id: "network-wall", label: "Video wall or multiview over IP", detail: "Compose network sources on a display canvas.", matchTerms: ["video wall", "multiview", "networkhd", "decoder"] },
        { id: "network-topology-unknown", label: "Not confirmed yet", detail: "Map the source and destination endpoints first." },
      ],
    },
    {
      id: "network-performance",
      prompt: "Is there a network performance requirement?",
      help: "Confirm bandwidth, latency and switch requirements with the customer’s IT team.",
      options: [
        { id: "network-one-gig", label: "Standard 1 Gb network", detail: "Use a system designed for the available network capacity.", matchTerms: ["1gb", "1 gb", "gigabit", "networkhd 100"] },
        { id: "network-ten-gig", label: "10 Gb or higher", detail: "Higher-bandwidth network infrastructure is available.", matchTerms: ["10gb", "10 gb", "10-gigabit", "networkhd 600"] },
        { id: "network-latency", label: "Very low latency is essential", detail: "Prioritize latency and image performance.", matchTerms: ["zero delay", "zero latency", "uncompressed", "10gb"] },
        { id: "network-performance-unknown", label: "Not confirmed yet", detail: "Ask IT to confirm switch and bandwidth capability." },
      ],
    },
  ],
  camera: [
    {
      id: "camera-interface",
      prompt: "How does the camera connect to the system?",
      help: "Choose the camera interface; this determines whether to look for USB, HDMI or network video products.",
      options: [
        { id: "camera-usb", label: "USB to a computer or room system", detail: "Typical for conferencing cameras and video bars.", matchTerms: ["usb camera", "usb", "webcam", "video bar"] },
        { id: "camera-hdmi", label: "HDMI video", detail: "Camera or production feed enters as a local video source.", matchTerms: ["hdmi", "camera", "video input"] },
        { id: "camera-ndi", label: "IP / NDI stream", detail: "Camera video arrives over the network.", matchTerms: ["ndi", "ip camera", "network camera", "networkhd"] },
        { id: "camera-interface-unknown", label: "Not confirmed yet", detail: "Check the camera’s available outputs and destination." },
      ],
    },
    {
      id: "camera-operation",
      prompt: "What camera operation is needed?",
      help: "Control, tracking and conferencing requirements can change the product choice.",
      options: [
        { id: "camera-fixed", label: "Fixed view", detail: "A stationary camera feed with no remote movement.", matchTerms: ["fixed camera", "camera", "hdmi"] },
        { id: "camera-ptz", label: "Remote pan, tilt and zoom", detail: "Operators need to move and zoom the camera remotely.", matchTerms: ["ptz", "camera control", "rs-232", "ip control"] },
        { id: "camera-conference", label: "Conferencing or auto-tracking", detail: "Camera must work with a room or UC workflow.", matchTerms: ["conference camera", "auto-tracking", "tracking", "usb camera"] },
        { id: "camera-operation-unknown", label: "Not confirmed yet", detail: "Confirm camera control and conferencing needs." },
      ],
    },
  ],
  present: [
    {
      id: "presentation-connection",
      prompt: "How will people connect their devices?",
      help: "Choose the expected presentation inputs; this drives the required switching or collaboration product.",
      options: [
        { id: "presentation-usbc", label: "USB-C cable", detail: "One cable for video and, if supported, laptop charging or USB data.", matchTerms: ["usb-c", "usbc", "power delivery", "charging"] },
        { id: "presentation-hdmi", label: "HDMI cable", detail: "A direct wired video input from a laptop or source.", matchTerms: ["hdmi", "presentation switcher"] },
        { id: "presentation-wireless", label: "Wireless sharing", detail: "Users present without plugging in a video cable.", matchTerms: ["wireless presentation", "wireless", "casting", "byod"] },
        { id: "presentation-mixed", label: "A mix of wired and wireless", detail: "Support several ways to present in one system.", matchTerms: ["wireless", "usb-c", "hdmi", "byod"] },
      ],
    },
    {
      id: "presentation-sharing",
      prompt: "What should happen when more than one person presents?",
      help: "This distinguishes a simple input switch from a system that manages multiple contributors.",
      options: [
        { id: "presentation-one-at-time", label: "One presenter at a time", detail: "Users take turns sharing to the display.", matchTerms: ["switcher", "presentation"] },
        { id: "presentation-multiple", label: "Several sources visible together", detail: "Show multiple contributors on one screen.", matchTerms: ["multiview", "multi-view", "windowing"] },
        { id: "presentation-usb-room", label: "Share room USB devices too", detail: "Connect cameras or room peripherals to the user’s laptop.", matchTerms: ["usb-c", "usb host", "usb device", "kvm"] },
        { id: "presentation-sharing-unknown", label: "Not confirmed yet", detail: "Confirm the presenter workflow with the customer." },
      ],
    },
  ],
  sound: [
    {
      id: "audio-function",
      prompt: "What does the audio product need to do?",
      help: "Separate amplification, processing and distribution so the shortlist fits the signal path.",
      options: [
        { id: "audio-amplify", label: "Power passive loudspeakers", detail: "Drive speakers directly from an amplifier.", matchTerms: ["amplifier", "amplification", "watt", "speaker"] },
        { id: "audio-process", label: "Mix or process audio", detail: "Manage sources, microphones, EQ or DSP.", matchTerms: ["audio dsp", "processor", "mixing", "microphone"] },
        { id: "audio-distribute", label: "Distribute audio to zones", detail: "Send audio to several rooms or listening areas.", matchTerms: ["dante", "aes67", "zone", "distribution"] },
        { id: "audio-deembed", label: "Extract audio from video", detail: "Break out audio from HDMI or a video switcher.", matchTerms: ["audio de-embed", "de-embed", "audio breakout", "hdmi audio"] },
      ],
    },
    {
      id: "audio-transport",
      prompt: "Which audio connection is required?",
      help: "Choose the connection that must be present on the product.",
      options: [
        { id: "audio-analog", label: "Analogue audio", detail: "Balanced or unbalanced line-level connections.", matchTerms: ["analogue audio", "analog audio", "balanced", "line level"] },
        { id: "audio-dante", label: "Dante / AES67 network audio", detail: "Audio travels over a managed network.", matchTerms: ["dante", "aes67", "network audio"] },
        { id: "audio-hdmi", label: "HDMI embedded audio", detail: "Audio stays with the HDMI video signal or is extracted from it.", matchTerms: ["hdmi audio", "audio de-embed", "embedded audio"] },
        { id: "audio-transport-unknown", label: "Not confirmed yet", detail: "Confirm the source, speaker and transport connections." },
      ],
    },
  ],
  usb: [
    {
      id: "usb-standard",
      prompt: "What kind of USB devices must work?",
      help: "Bandwidth and device type matter: a keyboard, camera and storage device do not have the same USB requirements.",
      options: [
        { id: "usb-two", label: "USB 2.0 peripherals", detail: "Keyboard, mouse, touch control or basic conferencing devices.", matchTerms: ["usb 2.0", "usb 2", "usb peripheral", "usb host"] },
        { id: "usb-three", label: "USB 3.x camera or storage", detail: "Higher-speed devices need a compatible USB path.", matchTerms: ["usb 3", "5gbps", "10gbps", "usb 3.0"] },
        { id: "usb-c-dock", label: "USB-C laptop connection", detail: "Check whether video, USB data and charging must share the link.", matchTerms: ["usb-c", "usbc", "power delivery", "charging"] },
        { id: "usb-standard-unknown", label: "Not confirmed yet", detail: "Identify the device and its USB speed requirement." },
      ],
    },
    {
      id: "usb-topology",
      prompt: "How should hosts and USB devices connect?",
      help: "This separates a simple extender pair from KVM switching and multi-host sharing.",
      options: [
        { id: "usb-one-host", label: "Extend one host to remote devices", detail: "One computer connects to a remote camera or peripherals.", matchTerms: ["usb extender", "usb extension", "usb host", "usb device"] },
        { id: "usb-switch-hosts", label: "Switch devices between computers", detail: "A keyboard, camera or other USB device changes host.", matchTerms: ["kvm", "usb switching", "usb switch", "host switching"] },
        { id: "usb-many-hosts", label: "Share across several rooms or hosts", detail: "Multiple endpoints or systems need access to USB devices.", matchTerms: ["usb over ip", "network usb", "multiple host", "kvm"] },
        { id: "usb-topology-unknown", label: "Not confirmed yet", detail: "Map the computer, device and switching points first." },
      ],
    },
  ],
  control: [
    {
      id: "control-targets",
      prompt: "What equipment needs to be controlled?",
      help: "Start with the controlled devices; the interface determines which controller or gateway fits.",
      options: [
        { id: "control-display", label: "Displays or projectors", detail: "Power, input selection, lift or screen commands.", matchTerms: ["display control", "projector", "rs-232", "ir control"] },
        { id: "control-av", label: "AV switchers or processors", detail: "Select sources, routes, presets or signal processing.", matchTerms: ["matrix control", "switcher control", "rs-232", "telnet"] },
        { id: "control-room", label: "A complete room system", detail: "Coordinate displays, audio and AV actions together.", matchTerms: ["control system", "controller", "touchscreen", "automation"] },
        { id: "control-targets-unknown", label: "Not confirmed yet", detail: "List the devices and actions the customer needs." },
      ],
    },
    {
      id: "control-interface",
      prompt: "Which control interface is required?",
      help: "Check the exact interface on both the controller and the equipment being operated.",
      options: [
        { id: "control-serial", label: "RS-232 serial", detail: "Direct serial commands between products.", matchTerms: ["rs-232", "rs232", "serial control"] },
        { id: "control-ir", label: "IR or relay", detail: "Infrared commands, contact closure or GPIO.", matchTerms: ["ir control", "infrared", "relay", "gpio"] },
        { id: "control-ip", label: "IP / Ethernet", detail: "Commands travel over the network.", matchTerms: ["telnet", "ip control", "ethernet control", "web ui"] },
        { id: "control-interface-unknown", label: "Not confirmed yet", detail: "Confirm available control ports and protocols." },
      ],
    },
  ],
  "not-sure": [
    {
      id: "unsure-system-job",
      prompt: "Which part of the product job is clearest?",
      help: "Choose a starting point; the matches remain broad until the exact signal path is known.",
      options: [
        { id: "unsure-connect", label: "Connect a source to a display", detail: "Focus on signal format and the physical connections.", matchTerms: ["hdmi", "usb-c", "switcher"] },
        { id: "unsure-distance", label: "Carry a signal farther", detail: "Focus on cable type and distance.", matchTerms: ["extender", "hdbaset", "fibre", "fiber"] },
        { id: "unsure-routing", label: "Choose or share sources", detail: "Focus on switching, routing or distribution.", matchTerms: ["matrix", "switcher", "splitter", "distribution"] },
        { id: "unsure-display", label: "Shape what appears on screens", detail: "Focus on video wall, scaling or multiview processing.", matchTerms: ["video wall", "multiview", "scaling", "processor"] },
      ],
    },
    {
      id: "unsure-next-fact",
      prompt: "What can you confirm about the product connection?",
      help: "This helps narrow the range without asking for a room type or market.",
      options: [
        { id: "unsure-video", label: "Video connection", detail: "HDMI, USB-C video, HDBaseT or fibre.", matchTerms: ["hdmi", "usb-c", "hdbaset", "fibre", "fiber"] },
        { id: "unsure-network", label: "Network connection", detail: "AV over IP or network-based audio/video.", matchTerms: ["networkhd", "av over ip", "dante", "aes67"] },
        { id: "unsure-usb", label: "USB or KVM connection", detail: "USB extension, switching or host/device sharing.", matchTerms: ["usb", "kvm", "usb host", "usb device"] },
        { id: "unsure-no-detail", label: "Nothing confirmed yet", detail: "Show the broad eligible product range.", matchTerms: [] },
      ],
    },
  ],
};
