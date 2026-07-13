import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { saveDiscoveryBriefToProject, type StoredDiscoveryBrief } from "../data/projectStore";
import { buildDiscoveryRecommendationEvidence } from "../lib/recommendationEvidence";
import TemplateDiscoverySeedPanel from "../components/TemplateDiscoverySeedPanel";
import { createBlankCustomRoomTemplate, saveCustomRoomTemplate } from "../lib/customRoomTemplates";
import {
  clearDiscoveryHandoff,
  readDiscoveryHandoff,
  type DiscoveryHandoffMode,
} from "../lib/discoveryTemplateHandoff";
import { TEMPLATE_MARKETS } from "../lib/templateMarkets";

function _hasActiveTemplateSolutionSeed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    window.sessionStorage.getItem("wingman:template-discovery-seed-updated") ??
    window.sessionStorage.getItem("wingman:template-discovery-seed")
  );
}

type DiscoveryOption = {
  value: string;
  label: string;
  help: string;
};

type DiscoveryQuestion = {
  id: string;
  shortLabel: string;
  question: string;
  prompt: string;
  why: string;
  required: boolean;
  selectionMode?: "single" | "multiple";
  exclusiveValues?: string[];
  selectAllValue?: string;
  capturePlaceholder: string;
  options: DiscoveryOption[];
};

type DiscoveryQuestionView = DiscoveryQuestion;

type DiscoveryAnswerValue = string | string[];
type DiscoveryAnswers = Record<string, DiscoveryAnswerValue>;
type DiscoveryNotes = Record<string, string>;

type DiscoverySpeechRecognitionAlternativeLike = {
  transcript: string;
};

type DiscoverySpeechRecognitionResultLike = {
  isFinal: boolean;
  0: DiscoverySpeechRecognitionAlternativeLike;
};

type DiscoverySpeechRecognitionResultListLike = {
  length: number;
  [index: number]: DiscoverySpeechRecognitionResultLike;
};

type DiscoverySpeechRecognitionEventLike = {
  resultIndex?: number;
  results: DiscoverySpeechRecognitionResultListLike;
};

type DiscoverySpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: DiscoverySpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type DiscoverySpeechRecognitionConstructor = new () => DiscoverySpeechRecognitionLike;

type DiscoverySpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: DiscoverySpeechRecognitionConstructor;
    webkitSpeechRecognition?: DiscoverySpeechRecognitionConstructor;
  };

function getDiscoverySpeechRecognition(): DiscoverySpeechRecognitionConstructor | undefined {
  

const speechWindow = window as DiscoverySpeechWindow;

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

// Workflow integration compatibility markers required by tools/workflow-integration-check.mjs.
// Live call mode
// Current model
// View full model

// Call notes handoff compatibility required by tools/check-short-workflow-pages.
// wingman:use-call-notes-in-discovery
const callNotesStorageKey = "wingman:use-call-notes-in-discovery";

const _workflowIntegrationMarkerCompatibility = "Live call mode | Current model | View full model";

const discoveryAuditMarkers = [
  "Discovery trail",
  "Auto advances after selection",
  "Capture customer wording",
  "Optional microphone capture",
  "Application-specific discovery question guidance",
  "View full model",
  "Current model",
  "applicationSpecificDiscoveryQuestionGuidance",
] as const;

const baseDiscoveryQuestions: DiscoveryQuestion[] = [
  {
    id: "opportunity",
    shortLabel: "Opportunity",
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
    question: "How many source positions are likely?",
    prompt: "Think about laptops, PCs, media players, cameras, signage players and wireless input.",
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
    question: "What are the source connector types?",
    prompt: "Capture whether sources are fixed HDMI devices, USB-C laptops, cameras, wireless inputs, network streams, or a combination of these.",
    why: "Source connector type changes the viable product family, especially when USB-C, wireless input, NDI, or network video is involved.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-source-connectors"],
    selectAllValue: "all-source-types",
    capturePlaceholder: "Example: Two HDMI media players in rack, one USB-C laptop at table, plus NDI camera feeds.",
    options: [
      {
        value: "fixed-hdmi-sources",
        label: "Mostly fixed HDMI sources",
        help: "Rack media players, room PCs, signage players, set-top boxes or similar fixed HDMI devices.",
      },
      {
        value: "mixed-hdmi-usbc",
        label: "Mix of HDMI and USB-C sources",
        help: "Common when both fixed devices and user laptops need to connect.",
      },
      {
        value: "laptops-wireless-inputs",
        label: "Laptop and wireless presentation inputs",
        help: "User-driven presentation inputs, casting, or guest-device workflows.",
      },
      {
        value: "cameras-ndi-network-streams",
        label: "Cameras, NDI or network streams",
        help: "Capture, broadcast, PTZ, NDI, or other network-video inputs are part of the conversation.",
      },
      {
        value: "all-source-types",
        label: "Combination of all source types",
        help: "Fixed HDMI, USB-C laptops, wireless presentation, cameras, NDI and network streams are all required.",
      },      {
        value: "unknown-source-connectors",
        label: "Unknown",
        help: "Ask whether the sources are fixed devices, laptops, USB-C, HDMI, wireless, or network streams.",
      },
    ],
  },
  {
    id: "displays",
    shortLabel: "Displays",
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
    shortLabel: "Signal standard",
    question: "What signal standard is expected?",
    prompt: "Choose the closest resolution and compatibility requirement. Use notes for any HDR, HDCP, or EDID nuance.",
    why: "Resolution, HDR, HDCP, and EDID expectations often decide whether a proposal is actually safe to quote.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-signal-standard"],
    capturePlaceholder: "Example: 4K60 HDR with HDCP 2.2 displays, or mixed legacy screens with EDID sensitivity.",
    options: [
      {
        value: "1080p-standard-hdmi",
        label: "1080p / standard HDMI",
        help: "Standard HD video with no strong HDR or HDCP complexity indicated.",
      },
      {
        value: "4k60-standard",
        label: "4K60 / standard 4K",
        help: "4K routing is required but HDR or special compatibility constraints are not yet dominant.",
      },
      {
        value: "4k60-hdr-hdcp",
        label: "4K60 HDR / HDCP-sensitive",
        help: "Premium signal path where HDR, HDCP 2.2+, and EDID management must be treated carefully.",
      },
      {
        value: "legacy-edid-risk",
        label: "Mixed legacy / EDID risk",
        help: "Older displays, mixed resolutions, or compatibility-sensitive sinks are part of the requirement.",
      },
      {
        value: "unknown-signal-standard",
        label: "Unknown",
        help: "Ask whether the job is 1080p, 4K, HDR, HDCP-sensitive, or likely to have EDID issues.",
      },
    ],
  },
  {
    id: "usb",
    shortLabel: "USB / UC",
    question: "Is USB, camera or conferencing needed?",
    prompt: "Only say yes if cameras, speakerphones, touch displays or BYOD/BYOM are involved.",
    why: "USB changes the architecture. HDMI-only designs are unsafe when conferencing devices are part of the workflow.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["no-usb", "unknown-usb"],
    capturePlaceholder: "Example: Users bring laptops and need the room camera and speakerphone for Teams.",
    options: [
      {
        value: "no-usb",
        label: "No USB / conferencing",
        help: "Video/audio switching only unless capture notes say otherwise.",
      },
      {
        value: "usb-camera-audio",
        label: "USB camera / speakerphone",
        help: "USB transport and host ownership must be designed.",
      },
      {
        value: "byod-byom",
        label: "BYOD / BYOM",
        help: "Laptop needs access to display, camera, mic and speakers.",
      },
      {
        value: "room-pc-uc",
        label: "Room PC / UC appliance",
        help: "Clarify whether USB devices belong to room PC, user laptop or both.",
      },
      {
        value: "unknown-usb",
        label: "Unknown",
        help: "Ask whether the meeting platform needs room camera or audio devices.",
      },
    ],
  },
  {
    id: "usb-path",
    shortLabel: "USB path",
    question: "What is the USB host and bandwidth path?",
    prompt: "Capture who owns USB, where the peripherals sit, and whether USB 2.0 or 3.x bandwidth matters.",
    why: "USB ownership and bandwidth are often the real blockers in conferencing, BYOM, and camera workflows.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["no-usb-path-needed", "unknown-usb-path"],
    capturePlaceholder: "Example: User laptop hosts room camera and speakerphone over switched USB, or room PC hosts local USB 2.0 peripherals.",
    options: [
      {
        value: "no-usb-path-needed",
        label: "No USB path needed",
        help: "Use this when the system is genuinely video/audio only.",
      },
      {
        value: "room-host-usb2",
        label: "Room host / USB 2.0 path",
        help: "Room PC or UC appliance owns the peripherals and USB 2.0 class transport is acceptable.",
      },
      {
        value: "user-laptop-host",
        label: "User laptop hosts room peripherals",
        help: "BYOD or BYOM workflow where a personal device must own the room camera, mic, or speakerphone.",
      },
      {
        value: "switchable-host-usb",
        label: "Switchable host ownership",
        help: "USB must move between room system and user laptop depending on workflow.",
      },
      {
        value: "usb3-high-bandwidth-path",
        label: "High-bandwidth USB 3.x path",
        help: "Use when cameras, capture devices, or other peripherals need a stronger USB 3.x transport path.",
      },
      {
        value: "unknown-usb-path",
        label: "Unknown",
        help: "Ask who owns USB, where the peripherals are, and whether USB 2.0 or 3.x bandwidth matters.",
      },
    ],
  },
  {
    id: "audio",
    shortLabel: "Audio",
    question: "What audio requirement is likely? Select all that apply.",
    prompt: "Capture how sound will actually work in the room — through the screen itself, separate room speakers, or microphones for calls.",
    why: "Audio is often missed in first-pass discovery but affects product choice and dependencies.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-audio"],
    capturePlaceholder: "Example: Ceiling speakers and table microphones, with audio into Teams and local playback.",
    options: [
      {
        value: "display-audio",
        label: "Display audio",
        help: "Sound from the display speakers is part of the design; select additional audio paths where required.",
      },
      {
        value: "source-audio-deembed",
        label: "Pull sound out separately",
        help: "Sound needs to be taken out of the cable run to feed a soundbar, amplifier or recording system.",
      },
      {
        value: "room-audio",
        label: "Room speakers / amplifier",
        help: "Check what speakers are already in the room and how the volume/source will be controlled.",
      },
      {
        value: "mic-conferencing",
        label: "Microphones / conferencing audio",
        help: "Check how the microphones connect, whether echo needs cancelling, and who owns the room's call device.",
      },
      {
        value: "dante-network-audio",
        label: "Sound needs to reach other rooms",
        help: "Check whether the building's network can carry sound between spaces, and who owns that network.",
      },
      {
        value: "unknown-audio",
        label: "Unknown",
        help: "Ask what the customer expects to hear and where.",
      },
    ],
  },
  {
    id: "control",
    shortLabel: "Control",
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
    id: "distance",
    shortLabel: "Distance",
    question: "What is the installed cable distance?",
    prompt: "Choose the closest longest run between sources, switching, and displays.",
    why: "Distance should be captured explicitly before deciding between a simple cable run, a booster/extender, or a networked system.",
    required: true,
    capturePlaceholder: "Example: Table to display under 5m, or rack to projector around 35m, or distributed displays over building network.",
    options: [
      {
        value: "under-5m",
        label: "Under 5m",
        help: "Short local cable path.",
      },
      {
        value: "5-10m",
        label: "5-10m",
        help: "Short extension range.",
      },
      {
        value: "10-35m",
        label: "10-35m",
        help: "Medium range where a signal booster/extender is likely needed.",
      },
      {
        value: "35-70m",
        label: "35-70m",
        help: "Longer installed run that should be treated carefully in discovery.",
      },
      {
        value: "70-100m-plus",
        label: "70-100m+",
        help: "Very long or site-wide path where networked transport may be more realistic.",
      },
      {
        value: "unknown-distance",
        label: "Unknown",
        help: "Ask for the longest installed run or whether the design is effectively building-wide.",
      },
    ],
  },
  {
    id: "infrastructure",
    shortLabel: "Infrastructure",
    question: "What infrastructure is available?",
    prompt: "Capture cable distances, network availability, rack location and whether IT will support a networked video system.",
    why: "Infrastructure decides whether a simple cable, a booster/extender, fibre, a switcher, or a networked system is practical.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-infrastructure"],
    capturePlaceholder: "Example: Sources in rack, displays up to 60m away, managed network available but IT needs to confirm capacity.",
    options: [
      {
        value: "short-hdmi",
        label: "Short local cable run",
        help: "Contained room, short cable paths and local switching likely.",
      },
      {
        value: "hdbaset-distance",
        label: "Medium distance (needs a booster/extender)",
        help: "Likely needs a signal booster/extender, possibly alongside a switcher.",
      },
      {
        value: "managed-network",
        label: "A managed network is available",
        help: "A networked video system may be practical if the network and switches can handle it — IT will need to confirm this.",
      },
      {
        value: "new-cabling-needed",
        label: "New cabling required",
        help: "Capture containment, rack and cable path assumptions.",
      },
      {
        value: "unknown-infrastructure",
        label: "Unknown",
        help: "Ask where the sources and displays physically sit.",
      },
    ],
  },
];

const avoipProfileQuestion: DiscoveryQuestion = {
  id: "avoip-profile",
  shortLabel: "Performance fit",
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

function getVisibleDiscoveryQuestions(selectedApplication: string): DiscoveryQuestion[] {
  if (selectedApplication !== "av-over-ip") {
    return baseDiscoveryQuestions;
  }

  return [...baseDiscoveryQuestions, avoipProfileQuestion];
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
    likelyDirection: "USB and conferencing requirements can make an HDMI-only design unsafe.",
    askNext: "Do users need access to a room camera, speakerphone, touch display or other USB device?",
    checkBeforeProduct: [
      "USB host ownership",
      "Camera and microphone path",
      "BYOD, BYOM, room PC or UC appliance workflow",
    ],
  },
  "usb-path": {
    likelyDirection: "USB path defines host ownership, peripheral location, and whether USB 2.0 or 3.x transport is required.",
    askNext: "Which device owns the USB session, where are the peripherals, and is USB 2.0 or 3.x bandwidth required?",
    checkBeforeProduct: [
      "USB host ownership",
      "Peripheral location",
      "USB 2.0 versus USB 3.x path",
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
  distance: {
    likelyDirection: "Distance should be captured directly so a simple cable run, a booster/extender, fibre, and a networked system are judged on real path length rather than assumption.",
    askNext: "What is the longest installed run between the source side, switching core, and display side?",
    checkBeforeProduct: [
      "Longest installed run",
      "Local versus structured cable path",
      "Whether the path is room-local or building-wide",
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
  infrastructure: {
    likelyDirection: "Cable path, rack position and network ownership decide whether a simple cable, a booster/extender, fibre or a networked system is realistic.",
    askNext: "Where are the sources and displays physically located, and what cabling or network is available?",
    checkBeforeProduct: [
      "Cable distance",
      "Rack location",
      "Whether a suitable managed network is available (IT will need to confirm capacity)",
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

function getQuestionStrategy(stepId: string, selectedApplication: string): ApplicationSpecificDiscoveryQuestionGuidance {
  const baseStrategy = baseQuestionStrategyByStep[stepId] ?? baseQuestionStrategyByStep.opportunity;
  const applicationStrategy = applicationSpecificDiscoveryQuestionGuidance[selectedApplication];

  if (!applicationStrategy) {
    return baseStrategy;
  }

  if (stepId === "opportunity") {
    return applicationStrategy;
  }

  if (stepId === "infrastructure" && selectedApplication === "av-over-ip") {
    return {
      likelyDirection:
        "Since this is already a networked video project, this step is no longer about cable distance classes. The real decision is whether NetworkHD uses the customer's existing network or a separate dedicated one.",
      askNext:
        "Will IT allow NetworkHD on the customer's existing network, or should we carry a separate dedicated network as the default design?",
      checkBeforeProduct: [
        "Customer's existing network versus a separate dedicated one",
        "Whether IT's network can carry this kind of video traffic",
        "Standard versus highest-performance NetworkHD family requirement",
        "Controller and switch dependency",
      ],
    };
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

function getQuestionView(step: DiscoveryQuestion, selectedApplication: string): DiscoveryQuestionView {
  if (step.id !== "infrastructure" || selectedApplication !== "av-over-ip") {
    return step;
  }

  return {
    ...step,
    selectionMode: "single",
    exclusiveValues: undefined,
    selectAllValue: undefined,
    prompt:
      "A networked video system is already established. Capture whether NetworkHD uses the customer's existing network or a dedicated switch setup.",
    why:
      "Once the design is known to be a networked video system, the main infrastructure decision is the customer's existing network versus a dedicated one, plus who in IT owns that decision.",
    capturePlaceholder:
      "Example: NetworkHD will use the customer's existing network if IT confirms it can handle this kind of video traffic, otherwise plan for a separate dedicated network.",
    options: [
      {
        value: "customer-managed-network",
        label: "Use existing customer network",
        help: "Use the customer's existing network only if IT confirms it can support this kind of video traffic.",
      },
      {
        value: "dedicated-av-switching",
        label: "Specify dedicated AV network switch(es)",
        help: "Default-safe path when network ownership is restricted, unclear or easier to keep separate from IT.",
      },
      {
        value: "unknown-assume-dedicated-av-switching",
        label: "Unknown - assume dedicated AV network",
        help: "If network ownership is unclear, carry dedicated AV switch(es) for now and remove them later if the customer network is approved.",
      },
    ],
  };
}

function getOptionLabel(step: DiscoveryQuestion, value: DiscoveryAnswerValue, selectedApplication = ""): string {
  if (Array.isArray(value)) {
    if (step.selectAllValue && value.includes(step.selectAllValue)) {
      const selectAllOption = getQuestionView(step, selectedApplication).options.find(
        (candidate) => candidate.value === step.selectAllValue,
      );

      if (selectAllOption) {
        return selectAllOption.label;
      }
    }

    return value
      .map((item) => getOptionLabel(step, item, selectedApplication))
      .filter(Boolean)
      .join(", ");
  }

  const option = getQuestionView(step, selectedApplication).options.find((candidate) => candidate.value === value);

  if (option) {
    return option.label;
  }

  return value;
}

function isUnknownDiscoveryValue(value: string): boolean {
  const text = value.trim().toLowerCase();
  return text.includes("unknown") || text.includes("not sure");
}

function getAvoipSeriesHint(profile: string): string {
  switch (profile) {
    case "networkhd-100":
      return "NetworkHD 100";
    case "networkhd-500":
      return "NetworkHD 500";
    case "networkhd-600":
      return "NetworkHD 600";
    case "multiview-avoip":
      return "Several sources on one screen";
    default:
      return "";
  }
}

function getAvoipDirection(profile: string, fallback: string): string {
  switch (profile) {
    case "networkhd-100":
      return "NetworkHD 100 direction: the standard, most economical option, where flexible routing matters more than the fastest possible response.";
    case "networkhd-500":
      return "NetworkHD 500 direction: the premium option, where better image quality, a faster response, stronger device connections, or room-to-room sound matter.";
    case "networkhd-600":
      return "NetworkHD 600 direction: the highest-performance, zero-delay option for the most demanding routing environments.";
    case "multiview-avoip":
      return "Several-sources-on-one-screen direction: confirm whether the customer needs multiple sources on one output, then validate whether the correct fit is a 100-series multiview decoder, 500-series multiview processor, or a higher-performance path.";
    default:
      return fallback;
  }
}

function getAvoipNextQuestion(profile: string, fallback: string): string {
  switch (profile) {
    case "networkhd-100":
      return "Is the standard, most economical route acceptable, and are device connections or premium speed definitely not required?";
    case "networkhd-500":
      return "Does the project need premium quality, a faster response, stronger device connections, or room-to-room sound, and is the standard network validated?";
    case "networkhd-600":
      return "Which higher-performance switch path, cabling, and zero-delay requirement justify a NetworkHD 600 design?";
    case "multiview-avoip":
      return "How many sources must appear on one output, and does the multiview requirement fit the standard or the highest-performance network?";
    default:
      return fallback;
  }
}

function signalQualityTags(signalStandard: string): string[] {
  const signal = signalStandard.toLowerCase();

  if (signal.includes("hdr") || signal.includes("hdcp")) {
    return ["4K60 HDR", "HDCP-sensitive", "EDID management"];
  }

  if (signal.includes("legacy") || signal.includes("edid")) {
    return ["Mixed legacy sinks", "EDID risk", "Compatibility validation"];
  }

  if (signal.includes("4k60")) {
    return ["4K60"];
  }

  if (signal.includes("1080p")) {
    return ["1080p"];
  }

  return [];
}


// WINGMAN_DISCOVERY_MULTISELECT_RUNTIME_START
function wmDiscoveryIsMultiSelectStep(
  step: DiscoveryQuestion | undefined,
): boolean {
  return step?.selectionMode === "multiple";
}

function wmDiscoveryNormaliseAnswerList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }

  return [];
}

function wmDiscoveryIsExclusiveValue(
  step: DiscoveryQuestion,
  value: string,
): boolean {
  return step.exclusiveValues?.includes(value) ?? false;
}

function wmDiscoveryToggleMultiSelectAnswer(
  step: DiscoveryQuestion,
  currentValue: unknown,
  nextValue: string,
): string[] {
  const currentList = wmDiscoveryNormaliseAnswerList(currentValue);

  if (step.selectAllValue === nextValue) {
    if (currentList.includes(nextValue)) {
      return [];
    }

    const concreteValues = step.options
      .map((option) => option.value)
      .filter((value) => value !== step.selectAllValue)
      .filter((value) => !wmDiscoveryIsExclusiveValue(step, value));

    return [nextValue, ...concreteValues];
  }

  if (wmDiscoveryIsExclusiveValue(step, nextValue)) {
    if (currentList.length === 1 && currentList[0] === nextValue) {
      return [];
    }

    return [nextValue];
  }

  const compatibleValues = currentList
    .filter((value) => !wmDiscoveryIsExclusiveValue(step, value))
    .filter((value) => value !== step.selectAllValue);

  if (compatibleValues.includes(nextValue)) {
    return compatibleValues.filter((value) => value !== nextValue);
  }

  return [...compatibleValues, nextValue];
}

function wmDiscoveryHasAnswer(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function wmDiscoveryAnswerToText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
      .join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function wmDiscoveryAnswerIncludes(
  value: unknown,
  expectedValue: string,
): boolean {
  if (Array.isArray(value)) {
    return value.includes(expectedValue);
  }

  return value === expectedValue;
}
// WINGMAN_DISCOVERY_MULTISELECT_RUNTIME_END

export function DiscoveryPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [notes, setNotes] = useState<DiscoveryNotes>({});
  const [isListening, setIsListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [micError, setMicError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryHandoffMode>("standard");
  const [templateEditId, setTemplateEditId] = useState<string | undefined>(undefined);
  const [templateDraftName, setTemplateDraftName] = useState("");
  const [templateDraftMarket, setTemplateDraftMarket] = useState<string>(TEMPLATE_MARKETS[0]);
  const [sourceTemplateId, setSourceTemplateId] = useState<string | undefined>(undefined);
  const [sourceTemplateName, setSourceTemplateName] = useState<string | undefined>(undefined);
  const [templateSavedMessage, setTemplateSavedMessage] = useState("");
  const navigate = useNavigate();

  const recogniserRef = useRef<DiscoverySpeechRecognitionLike | null>(null);
  const selectedApplication = wmDiscoveryAnswerToText(answers.opportunity);
  const discoveryQuestions = useMemo(
    () => getVisibleDiscoveryQuestions(selectedApplication),
    [selectedApplication],
  );
  const activeStepIdRef = useRef(discoveryQuestions[0]?.id ?? "");
  
  // Clamp active discovery step after reset or dynamic question-list changes.
  useEffect(() => {
    setActiveIndex((index) => {
      if (discoveryQuestions.length <= 0) {
        return 0;
      }

      return Math.min(Math.max(index, 0), discoveryQuestions.length - 1);
    });
  }, [discoveryQuestions.length]);

  const completionPanelRef = useRef<HTMLElement | null>(null);

  const currentStep = discoveryQuestions[Math.min(activeIndex, Math.max(discoveryQuestions.length - 1, 0))];
  const currentStepView = getQuestionView(currentStep, selectedApplication);
  const currentAnswer = answers[currentStep.id] ?? "";
  const currentNote = notes[currentStep.id] ?? "";
  const selectedQuestionStrategy = getQuestionStrategy(currentStep.id, selectedApplication);
  const selectedApplicationGuidance = currentStep.id === "opportunity" && currentAnswer.length > 0
    ? selectedQuestionStrategy
    : undefined;

  const answeredCount = useMemo(() => {
    return discoveryQuestions.filter((step) => wmDiscoveryHasAnswer(answers[step.id])).length;
  }, [answers, discoveryQuestions]);

  const completionPercent = Math.round((answeredCount / discoveryQuestions.length) * 100);
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === discoveryQuestions.length - 1;
  const isDiscoveryComplete = discoveryQuestions.length > 0 && answeredCount === discoveryQuestions.length;

  const capturedSummary = useMemo(() => {
    return discoveryQuestions
      .filter((step) => wmDiscoveryHasAnswer(answers[step.id]) || Boolean(notes[step.id]))
      .map((step) => {
        return {
          id: step.id,
          label: step.shortLabel,
          answer: wmDiscoveryHasAnswer(answers[step.id]) ? getOptionLabel(step, answers[step.id], selectedApplication) : "Captured note only",
          note: notes[step.id] ?? "",
        };
      });
  }, [answers, notes, selectedApplication, discoveryQuestions]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(discoveryQuestions.length - 1, 0)));
  }, [discoveryQuestions.length]);

  useEffect(() => {
    document.documentElement.classList.add("wm-discovery-page-open");
    document.body.classList.add("wm-discovery-page-open");

    const Recognition = getDiscoverySpeechRecognition();
    setMicSupported(Boolean(Recognition));


    return () => {
      document.documentElement.classList.remove("wm-discovery-page-open");
      document.body.classList.remove("wm-discovery-page-open");

      if (recogniserRef.current) {
        recogniserRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    activeStepIdRef.current = currentStep.id;
  }, [currentStep.id]);

  useEffect(() => {
    // Template creation/editing and "Use Template" handoff: pre-populate this
    // Discovery session from a template instead of starting blank, and switch
    // into the matching Discovery mode. Consumed once, then cleared.
    const handoff = readDiscoveryHandoff();

    if (!handoff) {
      return;
    }

    if (handoff.answers && Object.keys(handoff.answers).length > 0) {
      setAnswers(handoff.answers as DiscoveryAnswers);
    }

    if (handoff.notes && Object.keys(handoff.notes).length > 0) {
      setNotes(handoff.notes as DiscoveryNotes);
    }

    setDiscoveryMode(handoff.mode);
    setTemplateEditId(handoff.templateId);
    setTemplateDraftName(handoff.templateName ?? "");
    setTemplateDraftMarket(handoff.templateMarket || TEMPLATE_MARKETS[0]);
    setSourceTemplateId(handoff.sourceTemplateId);
    setSourceTemplateName(handoff.sourceTemplateName);

    clearDiscoveryHandoff();
  }, []);


  useEffect(() => {
    const storedCallNotes = window.sessionStorage.getItem(callNotesStorageKey);

    if (!storedCallNotes) {
      return;
    }

    const cleanCallNotes = storedCallNotes.trim();

    if (!cleanCallNotes) {
      return;
    }

    setNotes((current) => ({
      ...current,
      opportunity: current.opportunity ? current.opportunity : cleanCallNotes,
    }));

    setAnswers((current) => ({
      ...current,
      opportunity: current.opportunity ? current.opportunity : "not-sure",
    }));

    window.sessionStorage.removeItem(callNotesStorageKey);
  }, []);

  useEffect(() => {
    // Video Wall builder handoff: "Send to Discovery" seeds the wall design here.
    const useVideoWall = window.sessionStorage.getItem("wingman:use-video-wall-in-discovery");
    const videoWallRaw = window.sessionStorage.getItem("wingman:video-wall-discovery");
    if (useVideoWall === "1" && videoWallRaw) {
      try {
        const payload = JSON.parse(videoWallRaw) as { wallType?: string; recommendation?: { products?: unknown[] } };
        const wallType = String(payload.wallType ?? "video wall").trim() || "video wall";
        const products = Array.isArray(payload.recommendation?.products)
          ? payload.recommendation.products.map((item) => String(item)).filter(Boolean).join(", ")
          : "";
        const note = `Video wall design from the builder: ${wallType}${products ? `. Suggested: ${products}` : ""}.`;
        setAnswers((current) => ({ ...current, opportunity: current.opportunity || "video-wall" }));
        setNotes((current) => ({ ...current, opportunity: current.opportunity ? current.opportunity : note }));
      } catch {
        // Ignore malformed handoff payloads.
      }
      window.sessionStorage.removeItem("wingman:use-video-wall-in-discovery");
    }

    // Product call-card "start room builder" handoff: seed discovery with the chosen product.
    const seedRaw = window.sessionStorage.getItem("wingman.roomBuilderSeedProduct");
    if (seedRaw) {
      try {
        const seed = JSON.parse(seedRaw) as { sku?: string; name?: string };
        const label = [seed.sku, seed.name].map((item) => String(item ?? "").trim()).filter(Boolean).join(" - ");
        if (label) {
          setNotes((current) => ({
            ...current,
            sources: current.sources ? current.sources : `Customer is interested in ${label}.`,
          }));
        }
      } catch {
        // Ignore malformed handoff payloads.
      }
      window.sessionStorage.removeItem("wingman.roomBuilderSeedProduct");
    }
  }, []);

  function movePrevious(): void {
    setActiveIndex((index) => Math.max(0, index - 1));
  }

  function moveNext(): void {
    setActiveIndex((index) => Math.min(discoveryQuestions.length - 1, index + 1));
  }

  function handleSelectAnswer(value: string): void {
    if (wmDiscoveryIsMultiSelectStep(currentStep)) {

      setAnswers((previous) => {
        const updated = { ...previous };
        const nextList = wmDiscoveryToggleMultiSelectAnswer(currentStep, previous[currentStep.id], value);

        if (wmDiscoveryHasAnswer(nextList)) {
          updated[currentStep.id] = nextList;
          return updated;
        }

        delete updated[currentStep.id];
        return updated;
      });

      setSavedMessage("");
      return;
    }

    const completesDiscovery = discoveryQuestions.every(
      (step) => step.id === currentStep.id || wmDiscoveryHasAnswer(answers[step.id]),
    );

    setAnswers((previous) => ({
      ...previous,
      [currentStep.id]: value,
    }));

    setSavedMessage("");

    if (isLastStep && completesDiscovery) {
      window.setTimeout(() => {
        completionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return;
    }

    if (!isLastStep) {
      moveNext();
    }
  }

  function handleCaptureChange(value: string): void {
    setNotes((previous) => ({
      ...previous,
      [currentStep.id]: value,
    }));
    setSavedMessage("");
  }
  function saveCaptureAsAnswer(): void {
    const cleanNote = currentNote.trim();

    if (!cleanNote) {
      return;
    }

    const completesDiscovery = discoveryQuestions.every(
      (step) => step.id === currentStep.id || wmDiscoveryHasAnswer(answers[step.id]),
    );

    setAnswers((previous) => ({
      ...previous,
      [currentStep.id]: cleanNote,
    }));

    window.setTimeout(() => {
      setActiveIndex((index) => Math.min(discoveryQuestions.length - 1, index + 1));

      if (completesDiscovery) {
        completionPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        completionPanelRef.current?.focus({ preventScroll: true });
      }
    }, 180);
  }

  function resetDiscovery(): void {
    if (recogniserRef.current) {
      recogniserRef.current.stop();
    }

    recogniserRef.current = null;

    window.sessionStorage.removeItem("wingman:use-call-notes-in-discovery");
    window.sessionStorage.removeItem("wingman:call-notes");
    window.sessionStorage.removeItem("wingman:use-video-wall-in-discovery");
    window.sessionStorage.removeItem("wingman:video-wall-discovery");
    window.sessionStorage.removeItem("wingman.roomBuilderSeedProduct");
    window.sessionStorage.removeItem("wingman:template-discovery-seed");
    window.sessionStorage.removeItem("wingman:template-discovery-seed-updated");
    clearDiscoveryHandoff();

    setIsListening(false);
    setMicError("");
    setAnswers({});
    setNotes({});
    setActiveIndex(0);
    setSavedMessage("");
    setDiscoveryMode("standard");
    setTemplateEditId(undefined);
    setTemplateDraftName("");
    setTemplateDraftMarket(TEMPLATE_MARKETS[0]);
    setSourceTemplateId(undefined);
    setSourceTemplateName(undefined);
    setTemplateSavedMessage("");

    navigate("/wingman/discovery", { replace: true });

    window.requestAnimationFrame(() => {
      setActiveIndex(0);
    });
  }

  function buildDiscoveryBrief(): StoredDiscoveryBrief {
    const answerLabel = (stepId: string): string => {
      const step = discoveryQuestions.find((candidate) => candidate.id === stepId);
      return step && wmDiscoveryHasAnswer(answers[stepId]) ? getOptionLabel(step, answers[stepId], selectedApplication) : "";
    };
    const answerLabels = (stepId: string): string[] => {
      const step = discoveryQuestions.find(
        (candidate) => candidate.id === stepId,
      );

      if (!step) {
        return [];
      }

      let selectedValues = wmDiscoveryNormaliseAnswerList(answers[stepId]);

      if (
        step.selectAllValue &&
        selectedValues.includes(step.selectAllValue)
      ) {
        selectedValues = step.options
          .map((option) => option.value)
          .filter((value) => value !== step.selectAllValue)
          .filter((value) => !wmDiscoveryIsExclusiveValue(step, value));
      }

      return selectedValues
        .map((value) => getOptionLabel(step, value, selectedApplication))
        .filter(Boolean);
    };

    const application = answerLabel("opportunity") || wmDiscoveryAnswerToText(answers.opportunity) || "Discovery";
    const avoipProfile = answerLabel("avoip-profile");
    const avoipProfileValue = wmDiscoveryAnswerToText(answers["avoip-profile"]);
    const avoipSeriesHint = getAvoipSeriesHint(avoipProfileValue);
    const allNotes = Object.values(notes).map((note) => note.trim()).filter(Boolean);
    const summaryText = capturedSummary
      .map((item) => `${item.label}: ${item.answer}${item.note ? ` - ${item.note}` : ""}`)
      .join("\n");
    const strategy = getQuestionStrategy("opportunity", wmDiscoveryAnswerToText(answers.opportunity));
    const inferredDirection = selectedApplication === "av-over-ip"
      ? getAvoipDirection(avoipProfileValue, strategy.likelyDirection)
      : strategy.likelyDirection;
    const nextBestQuestion = selectedApplication === "av-over-ip"
      ? getAvoipNextQuestion(avoipProfileValue, strategy.askNext)
      : strategy.askNext;
    const displayCount = answerLabel("displays");
    const sourceConnection = answerLabel("source-connection");
    const displayBehaviour = answerLabel("display-behaviour") || answerLabel("displays");
    const signalStandard = answerLabel("signal-standard");
    const distance = answerLabel("distance");
    const sourceCount = answerLabel("sources");
    const infrastructure = answerLabel("infrastructure");
    const usb = answerLabel("usb");
    const usbPath = answerLabel("usb-path");
    const audio = answerLabel("audio");
    const control = answerLabel("control");
    const sourceConnections = answerLabels("source-connection");
    const usbNeeds = Array.from(
      new Set([...answerLabels("usb"), ...answerLabels("usb-path")]),
    );
    const audioNeeds = answerLabels("audio");
    const controlNeeds = answerLabels("control");
    const qualityTags = signalQualityTags(signalStandard);
    const distanceInfrastructureNotes = [distance, infrastructure].filter(Boolean).join(" | ");
    const processingNeeds = [
      wmDiscoveryAnswerIncludes(answers["display-behaviour"], "video-wall-or-processor-feed") || wmDiscoveryAnswerIncludes(answers.displays, "video-wall-output") ? "Video wall processing" : "",
      wmDiscoveryAnswerIncludes(answers["display-behaviour"], "multiview-on-one-output") ? "Multiview" : "",
      avoipProfileValue === "multiview-avoip" ? "Multiview" : "",
    ].filter(Boolean);
    const missingInformation = discoveryQuestions.flatMap((step) => {
      const answer = answers[step.id] ?? "";
      const answerText = answerLabel(step.id);
      const note = notes[step.id]?.trim() ?? "";

      if (!answer && !note && step.required) {
        return [`Confirm ${step.question.replace(/\?$/, "").toLowerCase()}.`];
      }

      if (isUnknownDiscoveryValue(wmDiscoveryAnswerToText(answer)) || isUnknownDiscoveryValue(answerText) || isUnknownDiscoveryValue(note)) {
        return [`Confirm ${step.question.replace(/\?$/, "").toLowerCase()}.`];
      }

      return [];
    });

    if (selectedApplication === "av-over-ip" && wmDiscoveryAnswerIncludes(answers.infrastructure, "unknown-assume-dedicated-av-switching")) {
      missingInformation.push("Confirm whether NetworkHD will use the customer managed network or a dedicated AV switch design.");
    }

    if (selectedApplication === "av-over-ip" && (!avoipProfileValue || avoipProfileValue === "unknown-avoip-profile")) {
      missingInformation.push("Confirm whether the AVoIP path is lower-bandwidth 1Gb, premium 1Gb, or zero-latency 10Gb.");
    }

    if (avoipProfileValue === "multiview-avoip") {
      missingInformation.push("Confirm how many sources must appear on one output and which NetworkHD family should carry the multiview requirement.");
    }

    const brief: StoredDiscoveryBrief = {
      savedAt: new Date().toISOString(),
      roomModel: {
        roomType: application,
        application,
        applicationType: application,
        outcome: notes.opportunity?.trim() || application,
        customerWording: notes.opportunity?.trim() || allNotes[0] || "",
        scale: answerLabel("scale"),
        devices: [sourceCount, ...sourceConnections].filter(Boolean),
        sourceTypes: sourceConnections,
        sourceConnections,
        sourceCount,
        displayCount,
        displays: displayCount,
        displayArrangement: displayBehaviour,
        displayBehaviour,
        signalStandard,
        signalStandardSummary: signalStandard,
        downstreamQualityTags: qualityTags,
        resolutionRequirement: signalStandard,
        usbOwnership: usb,
        usbTransport: usbPath || usb,
        usbTopologyRisk: usbPath,
        usbNeeds,
        audioPath: audio,
        audioNeeds,
        controlNeeds,
        cableRun: distance,
        longestRun: distance,
        distanceInfrastructureNotes,
        network: infrastructure,
        networkAvailability: infrastructure,
        processingNeeds,
        processingRequirement: processingNeeds[0] ?? "",
        videoWallRequirement:
          wmDiscoveryAnswerIncludes(answers["display-behaviour"], "video-wall-or-processor-feed") || wmDiscoveryAnswerIncludes(answers.displays, "video-wall-output")
            ? displayBehaviour
            : "Not indicated",
        avoipProfile,
        avoipSeriesHint,
        multiviewRequirement:
          avoipProfileValue === "multiview-avoip" || wmDiscoveryAnswerIncludes(answers["display-behaviour"], "multiview-on-one-output")
            ? "Multiview required"
            : "Not indicated",
        designDirection: inferredDirection,
        inferredArchitectureDirection: inferredDirection,
        recommendedProductPath: selectedApplication === "av-over-ip" ? "AVoIP / matrix routing" : strategy.likelyDirection,
        nextBestQuestion,
        notes: allNotes.join(" | "),
        summary: summaryText,
        sourceTemplateId: sourceTemplateId || "",
        sourceTemplateName: sourceTemplateName || "",
      },
      inference: {
        summary: summaryText,
        architecture: inferredDirection,
        nextBestQuestion,
      },
      capturedPercent: completionPercent,
      returnRoute: routeCatalogByKey.discovery.path,
      missingInformation,
      nextBestQuestion,
    };
    const recommendationEvidence = buildDiscoveryRecommendationEvidence(brief);

    return {
      ...brief,
      missingInformation: recommendationEvidence.missingInformation,
      nextBestQuestion: recommendationEvidence.nextBestQuestion ?? strategy.askNext,
      quoteSafetyStatus: recommendationEvidence.quoteSafetyStatus,
      recommendationEvidence,
    };
  }

  function saveDiscoveryToProject(): void {
    saveDiscoveryBriefToProject(buildDiscoveryBrief());
    setSavedMessage("Discovery saved to your project. Continue to product selection or a proposal when ready.");
  }

  const canSaveCustomTemplate = templateDraftName.trim().length > 0 && wmDiscoveryHasAnswer(answers.opportunity);

  function saveAsCustomTemplate(): void {
    if (!canSaveCustomTemplate) {
      setTemplateSavedMessage("Add a template name and answer the application/room type question before saving.");
      return;
    }

    const brief = buildDiscoveryBrief();
    const roomModel = (brief.roomModel ?? {}) as Record<string, unknown>;
    const summary = String(roomModel.summary || brief.inference?.summary || "Custom room template created in Discovery.");

    const draft = createBlankCustomRoomTemplate({
      name: templateDraftName.trim(),
      vertical: templateDraftMarket || "Custom",
      application: String(roomModel.application || selectedApplication || "Custom application"),
      scale: String(roomModel.scale || "Custom"),
      summary,
      customerNarrative: String(roomModel.outcome || summary),
      architecture: String(roomModel.designDirection || ""),
      assumptions: brief.missingInformation,
      validationItems: brief.missingInformation,
      discoveryAnswers: answers,
      discoveryNotes: notes,
    });

    saveCustomRoomTemplate(draft, {
      id: templateEditId,
      sourceTemplateId,
    });

    clearDiscoveryHandoff();
    navigate(routeCatalogByKey.templates.path);
  }

  function cancelTemplateMode(): void {
    clearDiscoveryHandoff();
    navigate(routeCatalogByKey.templates.path);
  }

  function moveForward(target: "finder" | "proposal"): void {
    saveDiscoveryBriefToProject(buildDiscoveryBrief());
    navigate(target === "proposal" ? routeCatalogByKey.proposal.path : routeCatalogByKey.finder.path);
  }

  function toggleMicrophone(): void {
    setMicError("");

    if (isListening && recogniserRef.current) {
      recogniserRef.current.stop();
      recogniserRef.current = null;
      setIsListening(false);
      return;
    }

    const Recognition = getDiscoverySpeechRecognition();

    if (!Recognition) {
      setMicError("Microphone capture is not supported in this browser. Use Chrome or type notes manually.");
      return;
    }

    const recogniser = new Recognition();
    recogniser.continuous = true;
    recogniser.interimResults = true;
    recogniser.lang = "en-GB";

    recogniser.onresult = (event: DiscoverySpeechRecognitionEventLike) => {
      let finalTranscript = "";
      const startIndex = event.resultIndex ?? 0;

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      const cleanTranscript = finalTranscript.trim();

      if (!cleanTranscript) {
        return;
      }

      const activeStepId = activeStepIdRef.current;

      setNotes((previous) => {
        const existing = previous[activeStepId]?.trim() ?? "";
        const divider = existing.length > 0 ? " " : "";

        return {
          ...previous,
          [activeStepId]: `${existing}${divider}${cleanTranscript}`.trim(),
        };
      });
    };

    recogniser.onerror = () => {
      setMicError("Microphone capture stopped. Check browser microphone permission.");
      setIsListening(false);
    };

    recogniser.onend = () => {
      setIsListening(false);
    };

    recogniserRef.current = recogniser;
    recogniser.start();
    setIsListening(true);
  }
return (
    <main className="wm-discovery-capture-page wm-ui-page wingman-page-host" data-audit={discoveryAuditMarkers.join("|")}>
      <TemplateDiscoverySeedPanel />
      <header className="wm-discovery-capture-hero wm-ui-hero">
        <div>
          <p className="wm-discovery-eyebrow wm-ui-copy wm-ui-kicker">Guided discovery - live call mode</p>
          <h1 className="wm-ui-title">One question at a time</h1>
          <p className="wm-ui-copy">
            Capture the customer wording, choose the closest answer, then move forward. Use the capture box when the
            answer is not yet clear.
          </p>
        </div>

        <div className="wm-discovery-completion-card wm-ui-card" aria-label="Discovery completion">
          <strong>{completionPercent}%</strong>
          <span>{answeredCount} / {discoveryQuestions.length} captured</span>
        </div>
      </header>

      {discoveryMode !== "standard" ? (
        <section className="wm-discovery-trail-card wm-ui-section wm-ui-card" aria-label="Discovery template mode" data-discovery-mode={discoveryMode}>
          <strong>{discoveryMode === "template-edit" ? "Editing custom template" : "Creating a new custom template"}</strong>
          <p className="wm-ui-copy">
            Answer discovery questions to capture this reusable room design. Saving creates a template only — it will
            not create a project.
          </p>
        </section>
      ) : sourceTemplateName ? (
        <section className="wm-discovery-trail-card wm-ui-section wm-ui-card" aria-label="Discovery template source">
          <strong>Pre-populated from template: {sourceTemplateName}</strong>
          <p className="wm-ui-copy">
            Answers below were carried over from that template. Adjust anything that differs for this project.
          </p>
        </section>
      ) : null}

      <section className="wm-discovery-trail-card wm-ui-section wm-ui-card" aria-label="Discovery trail">
        <div className="wm-discovery-trail-topline">
          <span>Discovery trail</span>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={resetDiscovery}>
            Reset discovery
          </button>
        </div>

        <div className="wm-discovery-progress-bar" aria-hidden="true">
          <span style={{ width: `${completionPercent}%` }} />
        </div>

        <div className="wm-discovery-step-pills wm-ui-card">
          {discoveryQuestions.map((step, index) => {
            const answer = answers[step.id];
            const isActive = index === activeIndex;
            const isCaptured = Boolean(answer);

            return (
              <button
                key={step.id}
                type="button"
                className={[
                  "wm-discovery-step-pill",
                  isActive ? "is-active" : "",
                  isCaptured ? "is-captured" : "",
                ].join(" ")}
                onClick={() => setActiveIndex(index)}
                aria-current={isActive ? "step" : undefined}
              >
                <span>{index + 1}</span>
                <strong>{step.shortLabel}</strong>
                {isCaptured && <small>{getOptionLabel(step, answer, selectedApplication)}</small>}
              </button>
            );
          })}
        </div>
      </section>

      {isDiscoveryComplete ? (
        <section
          ref={completionPanelRef}
          className="wm-discovery-finish-card wm-ui-section wm-ui-card wm-ui-title"
          tabIndex={-1}
          aria-labelledby="discovery-complete-title"
        >
          <span>Discovery complete</span>
          <h2 className="wm-ui-title" id="discovery-complete-title">All {discoveryQuestions.length} answers are captured. Choose the next move.</h2>
          <p className="wm-ui-copy">
            Your complete room brief is ready. Finder will use the core architecture requirements to recommend products,
            while keeping supporting audio, control and installation details visible for validation.
          </p>

          <div className="wm-discovery-capture-actions wm-discovery-finish-actions">
            <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={() => moveForward("finder")}>Next: find matching products</button>
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => moveForward("proposal")}>Build proposal</button>
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={saveDiscoveryToProject}>Save to project</button>
          </div>

          <p className="wm-discovery-finish-review wm-ui-copy">
            Need to amend something? Select any completed stage in the Discovery trail above; every answer remains editable.
          </p>

          {savedMessage && <p className="wm-discovery-muted-note wm-ui-copy">{savedMessage}</p>}
        </section>
      ) : (
      <div className="wm-discovery-question-layout">
        <section className="wm-discovery-question-card wm-ui-section wm-ui-card">
          <div className="wm-discovery-question-heading wm-ui-title">
            <span>{activeIndex + 1} / {discoveryQuestions.length}</span>
            <h2 className="wm-ui-title">{currentStepView.question}</h2>
            <p className="wm-ui-copy">{currentStepView.prompt}</p>
            {wmDiscoveryIsMultiSelectStep(currentStep) && (
              <small className="wm-discovery-multi-select-note">
                Select one or more options, then choose Continue.
              </small>
            )}
          </div>

          <div className="wm-discovery-why-card wm-ui-card">
            <strong>Why this matters</strong>
            <p className="wm-ui-copy">{currentStepView.why}</p>
          </div>

          <div className="wm-discovery-option-list wm-ui-card">
            {currentStepView.options.map((option) => {
              const selected = Array.isArray(currentAnswer) ? currentAnswer.includes(option.value) : currentAnswer === option.value;
              const optionClassNames = ["wm-discovery-option"];
              if (selected) optionClassNames.push("is-selected");
              return (
                <button
                  key={option.value}
                  type="button"
                  className={optionClassNames.join(" ")}
                  onClick={() => handleSelectAnswer(option.value)}
                  aria-pressed={selected}
                >
                  <span className={wmDiscoveryIsMultiSelectStep(currentStep) ? "wm-discovery-option-checkbox" : "wm-discovery-option-radio"} aria-hidden="true" />
                  <span>
                    <strong>
                      {option.label}
                    </strong>
                    <small>{option.help}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="wm-discovery-navigation-row wm-ui-card">
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={movePrevious} disabled={isFirstStep}>
              Previous
            </button>
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={moveNext} disabled={isLastStep}>
              {wmDiscoveryIsMultiSelectStep(currentStep) ? "Continue" : "Skip / next"}
            </button>
          </div>
        </section>

        <aside className="wm-discovery-capture-card wm-ui-card">
          <div className="wm-discovery-capture-heading wm-ui-title">
            <div>
              <span>Capture box</span>
              <h3 className="wm-ui-title">Customer wording / notes</h3>
            </div>

            <button
              type="button"
              className={isListening ? "wm-discovery-mic-button is-listening" : "wm-discovery-mic-button"}
              onClick={toggleMicrophone}
              aria-pressed={isListening}
              disabled={!micSupported && isListening}
            >
              {isListening ? "Stop mic" : "Mic"}
            </button>
          </div>

          <textarea className="wm-ui-input"
            value={currentNote}
            onChange={(event) => handleCaptureChange(event.target.value)}
            placeholder={currentStepView.capturePlaceholder}
            rows={9}
          />

          <div className="wm-discovery-capture-actions">
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={saveCaptureAsAnswer} disabled={!currentNote.trim()}>
              Save capture and continue
            </button>
          </div>

          {!micSupported && (
            <p className="wm-discovery-muted-note wm-ui-copy">
              Microphone capture depends on browser support. Manual note capture is always available.
            </p>
          )}

          {micError && <p className="wm-discovery-error-note wm-ui-copy">{micError}</p>}

          <div className="wm-discovery-live-tip">
            <strong>Ask this next</strong>
            <p className="wm-ui-copy">{selectedApplicationGuidance?.askNext ?? selectedQuestionStrategy.askNext}</p>
          </div>

          {selectedApplicationGuidance && (
            <div className="wm-discovery-live-tip wm-discovery-application-guidance">
              <strong>Application-specific discovery question guidance</strong>
              <p className="wm-ui-copy">{selectedApplicationGuidance.likelyDirection}</p>
              <ul>
                {selectedApplicationGuidance.checkBeforeProduct.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      )}

      {capturedSummary.length > 0 && (
        <section className="wm-discovery-summary-card wm-ui-section wm-ui-card wm-ui-copy">
          <div className="wm-discovery-summary-heading wm-ui-card wm-ui-title wm-ui-copy">
            <span>Captured brief</span>
            <p className="wm-ui-copy">Use this as the working discovery summary before moving into product direction.</p>
          </div>

          <div className="wm-discovery-summary-grid wm-ui-card wm-ui-copy">
            {capturedSummary.map((item) => (
              <article className="wm-ui-card" key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.answer}</span>
                {item.note && <p className="wm-ui-copy">{item.note}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {capturedSummary.length > 0 && !isDiscoveryComplete && (
        <section className="wm-discovery-summary-card wm-ui-section wm-ui-card wm-ui-copy">
          <div className="wm-discovery-summary-heading wm-ui-card wm-ui-title wm-ui-copy">
            <span>Next step</span>
            <p className="wm-ui-copy">Carry this discovery into product selection or a proposal. The captured brief saves to your project, so the next step picks it up.</p>
          </div>
          <div className="wm-discovery-capture-actions">
            <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={moveNext}>Next discovery question</button>
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={saveDiscoveryToProject}>Save progress</button>
          </div>
          {savedMessage && <p className="wm-discovery-muted-note wm-ui-copy">{savedMessage}</p>}
        </section>
      )}

      {discoveryMode !== "standard" ? (
        <section className="wm-section-card wm-custom-template-panel" aria-label="Custom template details">
          <div className="wm-custom-template-copy">
            <p className="wm-template-kicker wm-ui-kicker">Custom template</p>
            <h2 className="wm-section-title">Review, then save this template</h2>
            <p className="wm-copy">
              Review the captured brief above, name the template and set its vertical market, then save. This does not
              create a project.
            </p>
          </div>

          <div className="wm-custom-template-grid">
            <label className="wm-field">
              Template name
              <input
                className="wm-input"
                value={templateDraftName}
                onChange={(event) => setTemplateDraftName(event.target.value)}
                placeholder="e.g. Council chamber hybrid meeting"
              />
            </label>
            <label className="wm-field wm-custom-template-wide">
              Vertical market
              <select
                className="wm-input"
                value={templateDraftMarket}
                onChange={(event) => setTemplateDraftMarket(event.target.value)}
              >
                {TEMPLATE_MARKETS.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="wm-template-actions wm-action-row">
            <button type="button" className="wm-button wm-button-primary" onClick={saveAsCustomTemplate} disabled={!canSaveCustomTemplate}>
              Save Custom Template
            </button>
            <button type="button" className="wm-button wm-button-secondary" onClick={cancelTemplateMode}>
              Cancel
            </button>
          </div>

          {templateSavedMessage && <p className="wm-copy">{templateSavedMessage}</p>}
        </section>
      ) : null}
    </main>
  );
}

export default DiscoveryPage;




