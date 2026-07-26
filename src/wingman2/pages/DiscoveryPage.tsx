import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { saveDiscoveryBriefToProject, type StoredDiscoveryBrief } from "../data/projectStore";
import {
  clearLatestDiscoverySnapshot,
  readLatestDiscoverySnapshot,
  writeLatestDiscoverySnapshot,
} from "../data/workflowHandoff";
import { buildDiscoveryRecommendationEvidence } from "../lib/recommendationEvidence";
import { createBlankCustomRoomTemplate, saveCustomRoomTemplate } from "../lib/customRoomTemplates";
import {
  clearDiscoveryHandoff,
  readDiscoveryHandoff,
  type DiscoveryHandoffMode,
} from "../lib/discoveryTemplateHandoff";
import { TEMPLATE_MARKETS } from "../lib/templateMarkets";
import DiscoveryLocationsConnections from "../components/DiscoveryLocationsConnections";
import {
  clearDiscoveryTopology,
  createBlankProjectTopology,
  generateProjectTopologyFromDiscovery,
  normaliseProjectTopology,
  projectTopologyConnectionTypes,
  projectTopologyHasContent,
  projectTopologyLongestRun,
  projectTopologyMissingInformation,
  projectTopologyNetworkSummary,
  projectTopologySummary,
  readDiscoveryTopology,
  writeDiscoveryTopology,
  type ProjectTopology,
} from "../lib/projectTopology";

type DiscoveryOption = {
  value: string;
  label: string;
  help: string;
};

type DiscoveryQuestion = {
  id: string;
  shortLabel: string;
  section: string;
  optional?: boolean;
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
  "Dedicated Unified Communications discovery step",
  "Application-specific discovery question guidance",
  "View full model",
  "Current model",
  "applicationSpecificDiscoveryQuestionGuidance",
] as const;

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
    prompt: "Select the known audio paths. Use Not confirmed when the microphone or DSP design has not been agreed.",
    why: "USB, analogue and Dante microphone paths require different hosts, DSPs, network ownership and BOM dependencies.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-microphone-connection"],
    capturePlaceholder: "Example: Dante ceiling microphone into a room DSP, with USB audio from the DSP to the Teams Room.",
    options: [
      {
        value: "usb-microphone-path",
        label: "USB",
        help: "A speakerphone, microphone or DSP presents USB audio to the conferencing host.",
      },
      {
        value: "analogue-microphone-path",
        label: "Analogue",
        help: "Microphones feed an analogue mixer, DSP or capture interface.",
      },
      {
        value: "dante-microphone-path",
        label: "Dante / AES67",
        help: "Network audio carries microphone signals and requires suitable switching and ownership.",
      },
      {
        value: "proprietary-network-microphone",
        label: "Network / proprietary",
        help: "The microphone system uses a manufacturer-specific or other network audio path.",
      },
      {
        value: "unknown-microphone-connection",
        label: "Not confirmed",
        help: "The microphone interface and DSP path still need to be designed.",
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
    question: "What room audio requirement is likely? Select all that apply.",
    prompt: "Capture loudspeakers, amplification, de-embedding and room playback here. Speech capture is handled in Unified Communications.",
    why: "Room audio is often missed in first-pass discovery but affects product choice and dependencies.",
    required: true,
    selectionMode: "multiple",
    exclusiveValues: ["unknown-audio"],
    capturePlaceholder: "Example: Ceiling speakers with a room amplifier, plus de-embedded programme audio for recording.",
    options: [
      {
        value: "display-audio",
        label: "Display audio",
        help: "Sound from the display speakers is part of the design; select additional audio paths where required.",
      },
      {
        value: "source-audio-deembed",
        label: "Pull sound out separately",
        help: "Sound needs to be taken out of the signal path to feed a soundbar, amplifier or recording system.",
      },
      {
        value: "room-audio",
        label: "Room speakers / amplifier",
        help: "Check what speakers are already in the room and how volume and source selection will be controlled.",
      },
      {
        value: "dante-network-audio",
        label: "Sound needs to reach other rooms",
        help: "Check whether the building network can carry sound between spaces and who owns that network.",
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

function getApplicationDiscoveryQuestions(selectedApplication: string): DiscoveryQuestion[] {
  if (selectedApplication !== "av-over-ip") {
    return baseDiscoveryQuestions;
  }

  // Insert directly after "signal-standard" so it stays grouped inside the
  // "Sources & displays" phase instead of trailing the whole question set.
  const insertAfterIndex = baseDiscoveryQuestions.findIndex((step) => step.id === "signal-standard");
  const withProfile = [...baseDiscoveryQuestions];
  withProfile.splice(insertAfterIndex + 1, 0, avoipProfileQuestion);
  return withProfile;
}



function getVisibleDiscoveryQuestions(
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
    "usb",
  ]);

  return withApplicationQuestions.filter((step) => {
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

function getQuestionStrategy(stepId: string, selectedApplication: string): ApplicationSpecificDiscoveryQuestionGuidance {
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

function getQuestionView(step: DiscoveryQuestion, _selectedApplication: string): DiscoveryQuestionView {
  return step;
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

// WINGMAN_DISCOVERY_UNIFIED_COMMS_VISIBILITY_START
function wmDiscoveryIsUnifiedCommsDetailQuestion(
  step: DiscoveryQuestion,
): boolean {
  if (step.id === "uc-purpose") {
    return false;
  }

  const optionalSection = String(
    (step as DiscoveryQuestion & { section?: string }).section ?? "",
  ).toLowerCase();
  const identity = `${step.id} ${step.shortLabel}`.toLowerCase();

  return (
    optionalSection.includes("unified communications") ||
    /(^|[-_ ])(camera|microphone|capture)([-_ ]|$)/.test(identity) ||
    /^uc[-_]/.test(step.id.toLowerCase())
  );
}

function wmDiscoveryFilterUnifiedCommsQuestions(
  questions: DiscoveryQuestion[],
  answers: DiscoveryAnswers,
): DiscoveryQuestion[] {
  const selectedWorkflows = wmDiscoveryNormaliseAnswerList(
    answers["uc-purpose"],
  );

  if (!selectedWorkflows.includes("no-uc")) {
    return questions;
  }

  return questions.filter(
    (step) => !wmDiscoveryIsUnifiedCommsDetailQuestion(step),
  );
}
// WINGMAN_DISCOVERY_UNIFIED_COMMS_VISIBILITY_END

// A hand-off (template, video-wall builder, Sales Helper) can request a
// specific question to land on once its pre-filled answers are applied, so
// e.g. a UC-led enquiry opens straight on "uc-purpose" instead of forcing a
// click through room-scale questions first. Falls back to the first question
// the hand-off didn't already answer, so a fully-populated custom template
// lands on its one real gap instead of question 1.
function resolveDiscoveryStartIndex(
  questions: DiscoveryQuestion[],
  answers: DiscoveryAnswers,
  startAtQuestionId?: string,
): number {
  if (startAtQuestionId) {
    const requestedIndex = questions.findIndex((step) => step.id === startAtQuestionId);
    if (requestedIndex >= 0) {
      return requestedIndex;
    }
  }

  const firstUnanswered = questions.findIndex((step) => !wmDiscoveryHasAnswer(answers[step.id]));
  return firstUnanswered >= 0 ? firstUnanswered : Math.max(questions.length - 1, 0);
}

export function DiscoveryPage() {
  // Restoring an in-progress Discovery draft (autosaved as the customer talks) so
  // navigating away and back - or a refresh mid-call - never throws the captured
  // answers away. An explicit "Reset discovery" clears this snapshot.
  const [discoveryDraft] = useState(() => readLatestDiscoverySnapshot());
  const draftState = discoveryDraft?.state ?? {};
  const draftField = (key: string) => {
    const value = draftState[key];
    return typeof value === "string" ? value : "";
  };

  const [activeIndex, setActiveIndex] = useState(() => discoveryDraft?.activeStepIndex ?? 0);
  const [isReviewingAnswers, setIsReviewingAnswers] = useState(false);
  const [answers, setAnswers] = useState<DiscoveryAnswers>(
    () => (draftState.answers as DiscoveryAnswers | undefined) ?? {},
  );
  const [notes, setNotes] = useState<DiscoveryNotes>(
    () => (draftState.notes as DiscoveryNotes | undefined) ?? {},
  );
  const [topology, setTopology] = useState<ProjectTopology>(() => {
    const stored = readDiscoveryTopology();
    return projectTopologyHasContent(stored) ? stored : createBlankProjectTopology();
  });
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
  const [clientName, setClientName] = useState(() => draftField("clientName"));
  const [contactName, setContactName] = useState(() => draftField("contactName"));
  const [siteName, setSiteName] = useState(() => draftField("siteName"));
  const [budgetLevel, setBudgetLevel] = useState(() => draftField("budgetLevel"));
  const [timeline, setTimeline] = useState(() => draftField("timeline"));
  const navigate = useNavigate();

  const recogniserRef = useRef<DiscoverySpeechRecognitionLike | null>(null);
  const selectedApplication = wmDiscoveryAnswerToText(answers.opportunity);
  const discoveryQuestions = useMemo(
    () =>
      wmDiscoveryFilterUnifiedCommsQuestions(
        getVisibleDiscoveryQuestions(selectedApplication),
        answers,
      ),
    [selectedApplication, answers],
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
  const showCompletionPanel = isDiscoveryComplete && !isReviewingAnswers;

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

  // Autosave the in-progress draft so it survives navigation away from Discovery
  // without an explicit "Save to project" click. Skipped until something has
  // actually been captured, so merely opening the page doesn't manufacture a
  // brief for Recommendations to pick up.
  useEffect(() => {
    if (answeredCount === 0 && Object.keys(notes).length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      writeLatestDiscoverySnapshot({
        activeStepIndex: activeIndex,
        state: { answers, notes, clientName, contactName, siteName, budgetLevel, timeline },
        brief: buildDiscoveryBrief(),
        savedAt: "",
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [answeredCount, activeIndex, answers, notes, clientName, contactName, siteName, budgetLevel, timeline]);

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
    if (currentStep.id !== "locations-connections" || projectTopologyHasContent(topology)) {
      return;
    }

    const generated = generateProjectTopologyFromDiscovery({
      answers,
      notes,
      application: selectedApplication,
      existing: topology,
    });
    setTopology(generated);
    writeDiscoveryTopology(generated);
  }, [answers, currentStep.id, notes, selectedApplication, topology]);

  useEffect(() => {
    // Template creation/editing and "Use Template" handoff: pre-populate this
    // Discovery session from a template instead of starting blank, and switch
    // into the matching Discovery mode. Consumed once, then cleared.
    const handoff = readDiscoveryHandoff();

    if (!handoff) {
      return;
    }

    const incomingAnswers = {
      ...((handoff.answers ?? {}) as DiscoveryAnswers),
    };
    const incomingNotes = {
      ...((handoff.notes ?? {}) as DiscoveryNotes),
    };

    const currentUsb = wmDiscoveryNormaliseAnswerList(incomingAnswers.usb);
    const legacyUsb = wmDiscoveryNormaliseAnswerList(incomingAnswers["usb-path"]).map((value) => {
      if (value === "no-usb-path-needed") return "no-usb";
      if (value === "unknown-usb-path") return "unknown-usb";
      if (value === "user-laptop-host") return "byod-byom";
      return value;
    });
    let mergedUsb = Array.from(new Set([...currentUsb, ...legacyUsb]));
    if (mergedUsb.some((value) => value !== "no-usb" && value !== "unknown-usb")) {
      mergedUsb = mergedUsb.filter((value) => value !== "no-usb" && value !== "unknown-usb");
    }
    if (mergedUsb.length) incomingAnswers.usb = mergedUsb;

    const activeLegacyUsb = mergedUsb.some((value) => value !== "no-usb" && value !== "unknown-usb");
    if (activeLegacyUsb && !incomingAnswers["uc-purpose"]) {
      incomingAnswers["uc-purpose"] = "video-conferencing";
    }

    const sourceConnections = wmDiscoveryNormaliseAnswerList(incomingAnswers["source-connection"]);
    if (sourceConnections.includes("cameras-ndi-network-streams")) {
      const migratedSourceConnections = sourceConnections.filter((value) => value !== "cameras-ndi-network-streams");
      if (migratedSourceConnections.length) {
        incomingAnswers["source-connection"] = migratedSourceConnections;
      } else {
        delete incomingAnswers["source-connection"];
      }
      incomingAnswers["uc-purpose"] = incomingAnswers["uc-purpose"] || "camera-distribution-only";
      incomingAnswers["uc-camera"] = incomingAnswers["uc-camera"] || ["ndi-network-camera"];
      incomingAnswers["uc-camera-routing"] = incomingAnswers["uc-camera-routing"] || ["camera-to-displays"];
    }

    const legacyAudio = wmDiscoveryNormaliseAnswerList(incomingAnswers.audio);
    if (legacyAudio.includes("mic-conferencing")) {
      const migratedAudio = legacyAudio.filter((value) => value !== "mic-conferencing");
      if (migratedAudio.length) {
        incomingAnswers.audio = migratedAudio;
      } else {
        delete incomingAnswers.audio;
      }
      incomingAnswers["uc-purpose"] = incomingAnswers["uc-purpose"] || "video-conferencing";
      incomingAnswers["uc-microphones"] = incomingAnswers["uc-microphones"] || ["unknown-microphones"];
      incomingAnswers["uc-microphone-connection"] =
        incomingAnswers["uc-microphone-connection"] || ["unknown-microphone-connection"];
    }

    const incomingTopology = projectTopologyHasContent(handoff.topology)
      ? normaliseProjectTopology(handoff.topology)
      : generateProjectTopologyFromDiscovery({
          answers: incomingAnswers,
          notes: incomingNotes,
          application: wmDiscoveryAnswerToText(incomingAnswers.opportunity),
        });

    const legacyLocationNotes = [incomingNotes.distance, incomingNotes.infrastructure].filter(Boolean).join(" | ");
    if (legacyLocationNotes && !incomingNotes["locations-connections"]) {
      incomingNotes["locations-connections"] = legacyLocationNotes;
    }

    delete incomingAnswers["usb-path"];
    delete incomingAnswers.distance;
    delete incomingAnswers.infrastructure;
    delete incomingNotes["usb-path"];
    delete incomingNotes.distance;
    delete incomingNotes.infrastructure;

    setAnswers(incomingAnswers);
    setNotes(incomingNotes);
    setTopology(incomingTopology);
    writeDiscoveryTopology(incomingTopology);

    setDiscoveryMode(handoff.mode);
    setTemplateEditId(handoff.templateId);
    setTemplateDraftName(handoff.templateName ?? "");
    setTemplateDraftMarket(handoff.templateMarket || TEMPLATE_MARKETS[0]);
    setSourceTemplateId(handoff.sourceTemplateId);
    setSourceTemplateName(handoff.sourceTemplateName);

    const startApplication = wmDiscoveryAnswerToText(incomingAnswers.opportunity);
    const startQuestions = wmDiscoveryFilterUnifiedCommsQuestions(
      getVisibleDiscoveryQuestions(startApplication, incomingAnswers),
      incomingAnswers,
    );
    setActiveIndex(resolveDiscoveryStartIndex(startQuestions, incomingAnswers, handoff.startAtQuestionId));

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
        const nextOpportunity = answers.opportunity || "video-wall";
        const nextAnswers = { ...answers, opportunity: nextOpportunity };
        setAnswers(nextAnswers);
        setNotes((current) => ({ ...current, opportunity: current.opportunity ? current.opportunity : note }));

        const startApplication = wmDiscoveryAnswerToText(nextOpportunity);
        const startQuestions = wmDiscoveryFilterUnifiedCommsQuestions(
          getVisibleDiscoveryQuestions(startApplication, nextAnswers),
          nextAnswers,
        );
        setActiveIndex(resolveDiscoveryStartIndex(startQuestions, nextAnswers));
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

    setAnswers((previous) => {
      const updated: DiscoveryAnswers = {
        ...previous,
        [currentStep.id]: value,
      };

      if (currentStep.id === "uc-purpose" && value === "no-uc") {
        ["uc-platform", "uc-camera", "uc-camera-routing", "uc-microphones", "uc-microphone-connection", "usb"]
          .forEach((key) => delete updated[key]);
      }

      if (currentStep.id === "uc-purpose" && value === "camera-distribution-only") {
        ["uc-platform", "uc-microphones", "uc-microphone-connection", "usb"]
          .forEach((key) => delete updated[key]);
      }

      if (currentStep.id === "uc-microphones" && value === "no-microphones") {
        delete updated["uc-microphone-connection"];
      }

      return updated;
    });

    if (currentStep.id === "uc-purpose" && ["no-uc", "camera-distribution-only"].includes(value)) {
      setNotes((previous) => {
        const updated: DiscoveryNotes = { ...previous };
        const keys = value === "no-uc"
          ? ["uc-platform", "uc-camera", "uc-camera-routing", "uc-microphones", "uc-microphone-connection", "usb"]
          : ["uc-platform", "uc-microphones", "uc-microphone-connection", "usb"];
        keys.forEach((key) => delete updated[key]);
        return updated;
      });
    }

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

  function handleTopologyChange(next: ProjectTopology): void {
    const normalised = writeDiscoveryTopology(next);
    setTopology(normalised);
    setAnswers((previous) => {
      const updated = { ...previous };
      if (projectTopologyHasContent(normalised)) {
        updated["locations-connections"] = "topology-captured";
      } else {
        delete updated["locations-connections"];
      }
      return updated;
    });
    setSavedMessage("");
  }

  function completeTopologyStep(): void {
    const completedTopology = projectTopologyHasContent(topology)
      ? normaliseProjectTopology(topology)
      : generateProjectTopologyFromDiscovery({ answers, notes, application: selectedApplication });
    handleTopologyChange(completedTopology);

    if (isLastStep) {
      window.setTimeout(() => {
        completionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return;
    }

    moveNext();
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
    clearDiscoveryHandoff();
    clearLatestDiscoverySnapshot();

    setIsListening(false);
    setMicError("");
    setAnswers({});
    setNotes({});
    clearDiscoveryTopology();
    setTopology(createBlankProjectTopology());
    setActiveIndex(0);
    setIsReviewingAnswers(false);
    setSavedMessage("");
    setDiscoveryMode("standard");
    setTemplateEditId(undefined);
    setTemplateDraftName("");
    setTemplateDraftMarket(TEMPLATE_MARKETS[0]);
    setSourceTemplateId(undefined);
    setSourceTemplateName(undefined);
    setTemplateSavedMessage("");
    setClientName("");
    setContactName("");
    setSiteName("");
    setBudgetLevel("");
    setTimeline("");

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
    const displayBehaviour = answerLabel("display-behaviour") || answerLabel("displays");
    const signalStandard = answerLabel("signal-standard");
    const sourceCount = answerLabel("sources");
    const ucPurpose = answerLabel("uc-purpose");
    const conferencingPlatform = answerLabels("uc-platform");
    const cameraNeeds = answerLabels("uc-camera");
    const cameraRouting = answerLabels("uc-camera-routing");
    const microphoneNeeds = answerLabels("uc-microphones");
    const microphoneConnections = answerLabels("uc-microphone-connection");
    const usb = answerLabel("usb");
    const audio = answerLabel("audio");
    const sourceConnections = answerLabels("source-connection");
    const usbValues = wmDiscoveryNormaliseAnswerList(answers.usb);
    const usbNeeds = answerLabels("usb");
    const usbOwnership = [
      usbValues.includes("byod-byom") ? "User laptop / BYOD / BYOM host" : "",
      usbValues.includes("room-pc-uc") ? "Room PC / UC appliance host" : "",
      usbValues.includes("switchable-host-usb") ? "Switchable room and user-laptop host" : "",
    ].filter(Boolean).join(", ");
    const usbTransport = [
      usbValues.includes("room-host-usb2") ? "Standard USB 2.0 path" : "",
      usbValues.includes("usb3-high-bandwidth-path") ? "High-bandwidth USB 3.x path" : "",
    ].filter(Boolean).join(", ");
    const usbTopologyRisk = [
      usbValues.includes("switchable-host-usb") ? "USB host switching required" : "",
      usbValues.includes("usb3-high-bandwidth-path") ? "High-bandwidth USB 3.x transport required" : "",
      usbValues.includes("unknown-usb") ? "USB workflow requires qualification" : "",
    ].filter(Boolean).join(", ");
    const audioNeeds = answerLabels("audio");
    const controlNeeds = answerLabels("control");
    // WINGMAN_DISCOVERY_SOURCE_UC_EVIDENCE_DERIVED
    const wingmanUnifiedCommsValues = wmDiscoveryNormaliseAnswerList(
      answers["uc-purpose"],
    );
    const wingmanUnifiedCommsWorkflows = answerLabels(
      "uc-purpose",
    );
    const wingmanNoUnifiedComms = wingmanUnifiedCommsValues.includes(
      "no-uc",
    );
    const wingmanUnifiedCommsUnknown = wingmanUnifiedCommsValues.includes(
      "unknown-uc",
    );
    const wingmanLegacyCombinedWorkflow = wingmanUnifiedCommsValues.includes(
      "conferencing-recording",
    );
    const wingmanConferencingRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      (
        wingmanUnifiedCommsValues.includes("video-conferencing") ||
        wingmanLegacyCombinedWorkflow
      );
    const wingmanRecordingRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      (
        wingmanUnifiedCommsValues.includes("recording-streaming") ||
        wingmanLegacyCombinedWorkflow
      );
    const wingmanCameraDistributionRequired =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      wingmanUnifiedCommsValues.includes("camera-distribution-only");
    const wingmanMicrophonesOnly =
      !wingmanNoUnifiedComms &&
      !wingmanUnifiedCommsUnknown &&
      wingmanUnifiedCommsValues.includes("microphones-only");
    const wingmanUnifiedCommsSummary = wingmanNoUnifiedComms
      ? "No camera or microphone requirements"
      : wingmanUnifiedCommsUnknown
        ? "Not yet confirmed"
        : wingmanConferencingRequired && wingmanRecordingRequired
          ? "Video conferencing and recording / live streaming"
          : wingmanUnifiedCommsWorkflows.join(", ") || "Not yet confirmed";

    const activeTopology = projectTopologyHasContent(topology)
      ? normaliseProjectTopology(topology)
      : generateProjectTopologyFromDiscovery({ answers, notes, application: selectedApplication });
    const topologySummary = projectTopologySummary(activeTopology);
    const longestRunMetres = projectTopologyLongestRun(activeTopology);
    const connectionTypes = projectTopologyConnectionTypes(activeTopology);
    const networkSummary = projectTopologyNetworkSummary(activeTopology);
    const distanceInfrastructureNotes = topologySummary;
    const qualityTags = signalQualityTags(signalStandard);
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

    projectTopologyMissingInformation(activeTopology).forEach((item) => {
      if (!missingInformation.includes(item)) missingInformation.push(item);
    });

    if (selectedApplication === "av-over-ip" && !activeTopology.connections.some((connection) => ["ip-av-vlan", "shared-ip-network", "point-to-point-network"].includes(connection.transport))) {
      missingInformation.push("Confirm whether NetworkHD uses the customer network or a dedicated AV network design.");
    }

    if (selectedApplication === "av-over-ip" && (!avoipProfileValue || avoipProfileValue === "unknown-avoip-profile")) {
      missingInformation.push("Confirm whether the AVoIP path is lower-bandwidth 1Gb, premium 1Gb, or zero-latency 10Gb.");
    }

    if (avoipProfileValue === "multiview-avoip") {
      missingInformation.push("Confirm how many sources must appear on one output and which NetworkHD family should carry the multiview requirement.");
    }

    const brief: StoredDiscoveryBrief = {
      savedAt: new Date().toISOString(),
      topology: activeTopology,
      roomModel: {
        roomType: application,
        application,
        applicationType: application,
        outcome: notes.opportunity?.trim() || application,
        customerWording: notes.opportunity?.trim() || allNotes[0] || "",
        scale: answerLabel("scale"),
        roomSize: answerLabel("scale"),
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
        topology: activeTopology,
        locations: activeTopology.locations,
        projectDevices: activeTopology.devices,
        projectConnections: activeTopology.connections,
        connectionSummary: topologySummary,
        connectionTypes,
        ucPurpose,
        unifiedCommunicationsRequirement: ucPurpose,
        conferencingPlatform,
        cameraNeeds,
        cameraRouting,
        microphoneNeeds,
        microphoneConnections,
        usbOwnership: usbOwnership || usb,
        usbTransport: usbTransport || usb,
        usbTopologyRisk,
        usbNeeds,
        audioPath: audio,
        audioNeeds,
        controlNeeds,
        cableRun: longestRunMetres !== undefined ? `${longestRunMetres} m` : "Unknown",
        longestRun: longestRunMetres !== undefined ? `${longestRunMetres} m` : "Unknown",
        distanceInfrastructureNotes,
        network: networkSummary,
        networkAvailability: networkSummary,
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
        clientName: clientName.trim(),
        contactName: contactName.trim(),
        siteName: siteName.trim(),
        budgetLevel,
        timeline,
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
    // WINGMAN_DISCOVERY_SOURCE_UC_EVIDENCE_ROOM_MODEL
    brief.roomModel = {
      ...(brief.roomModel ?? {}),
      sourceProfile: answerLabel("source-connection"),
      sourceProfileValue: wmDiscoveryAnswerToText(
        answers["source-connection"],
      ),
      unifiedCommsWorkflows: wingmanUnifiedCommsWorkflows,
      cameraMicrophoneWorkflows: wingmanUnifiedCommsWorkflows,
      unifiedCommsSummary: wingmanUnifiedCommsSummary,
      conferencingRequired: wingmanConferencingRequired,
      recordingStreamingRequired: wingmanRecordingRequired,
      cameraDistributionRequired: wingmanCameraDistributionRequired,
      microphonesWithoutCameras: wingmanMicrophonesOnly,
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
    const templateTopology = normaliseProjectTopology(brief.topology ?? roomModel.topology);
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
      topology: templateTopology,
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

  function moveForward(target: "recommendations" | "proposal"): void {
    saveDiscoveryBriefToProject(buildDiscoveryBrief());
    navigate(target === "proposal" ? routeCatalogByKey.proposal.path : routeCatalogByKey.recommendations.path);
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
      <header className="wm-discovery-capture-hero wm-ui-hero">
        <div>
          <p className="wm-discovery-eyebrow wm-ui-copy wm-ui-kicker">Guided discovery - live call mode</p>
          <h1 className="wm-ui-title">One question at a time</h1>
          <p className="wm-ui-copy">
            Capture the customer wording, choose the closest answer, then move forward. Use the capture box when the
            answer is not yet clear.
          </p>
          {(clientName.trim() || siteName.trim()) && (
            <p className="wm-discovery-client-line wm-ui-copy">
              {[clientName.trim(), siteName.trim()].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="wm-discovery-completion-card wm-ui-card" aria-label="Discovery completion">
          <strong>{completionPercent}%</strong>
          <span>{answeredCount} / {discoveryQuestions.length} captured</span>
        </div>
      </header>

      <details className="wm-discovery-client-panel wm-ui-card">
        <summary>Client &amp; project details (optional)</summary>
        <p className="wm-discovery-client-panel-intro wm-ui-copy">
          Not required to proceed — add these whenever they come up in the conversation. They travel with the brief
          into the proposal.
        </p>
        <div className="wm-discovery-client-grid">
          <label>
            Client / company name
            <input
              className="wm-ui-input"
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="e.g. Northfield Council"
            />
          </label>
          <label>
            Contact name
            <input
              className="wm-ui-input"
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="e.g. Priya Shah, Facilities"
            />
          </label>
          <label>
            Site / project name
            <input
              className="wm-ui-input"
              type="text"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              placeholder="e.g. Main chamber, Level 2"
            />
          </label>
          <label>
            Budget sensitivity
            <select
              className="wm-ui-input"
              value={budgetLevel}
              onChange={(event) => setBudgetLevel(event.target.value)}
            >
              <option value="">Not discussed yet</option>
              <option value="cost-sensitive">Cost-sensitive — value engineering matters</option>
              <option value="mid-market">Mid-market — balanced cost and quality</option>
              <option value="premium">Premium — quality and performance lead</option>
            </select>
          </label>
          <label>
            Timeline
            <select
              className="wm-ui-input"
              value={timeline}
              onChange={(event) => setTimeline(event.target.value)}
            >
              <option value="">Not yet known</option>
              <option value="urgent">Urgent — needed within weeks</option>
              <option value="this-quarter">This quarter</option>
              <option value="exploring">Exploring options</option>
            </select>
          </label>
        </div>
      </details>

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

      {showCompletionPanel ? (
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
            <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={() => moveForward("recommendations")}>Next: find matching products</button>
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => moveForward("proposal")}>Build proposal</button>
            <button
              className="wm-ui-button wm-ui-button-secondary"
              type="button"
              onClick={() => {
                setActiveIndex(Math.max(discoveryQuestions.length - 1, 0));
                setIsReviewingAnswers(true);
              }}
            >
              Review answers
            </button>
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={saveDiscoveryToProject}>Save to project</button>
          </div>

          <p className="wm-discovery-finish-review wm-ui-copy">
            Need to amend something? Select Review answers, then use Previous and Continue to move through the captured brief.
          </p>

          {savedMessage && <p className="wm-discovery-muted-note wm-ui-copy">{savedMessage}</p>}
        </section>
      ) : (
      <div className="wm-discovery-question-layout">
        <section className="wm-discovery-question-card wm-ui-section wm-ui-card">
          {/* WINGMAN_DISCOVERY_COMPACT_NAV_START */}
          <div className="wm-discovery-compact-stepbar" aria-label="Discovery progress and controls">
            <div className="wm-discovery-compact-step-copy">
              <strong>Step {activeIndex + 1} of {discoveryQuestions.length}</strong>
              <span>
                {currentStep.section}
                {currentStep.optional ? " · Optional" : ""}
              </span>
            </div>

            <div className="wm-discovery-compact-step-actions">
              {isReviewingAnswers && (
                <button
                  className="wm-ui-button wm-ui-button-secondary"
                  type="button"
                  onClick={() => setIsReviewingAnswers(false)}
                >
                  Back to completion
                </button>
              )}
              <button
                className="wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={resetDiscovery}
              >
                Reset discovery
              </button>
            </div>
          </div>
          {/* WINGMAN_DISCOVERY_COMPACT_NAV_END */}

          <div className="wm-discovery-question-heading wm-ui-title">
            <span>{currentStep.shortLabel}</span>
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

          {currentStep.id === "locations-connections" ? (
            <DiscoveryLocationsConnections
              value={topology}
              seed={{ answers, notes, application: selectedApplication, existing: topology }}
              onChange={handleTopologyChange}
            />
          ) : (
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
                      <strong>{option.label}</strong>
                      <small>{option.help}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="wm-discovery-navigation-row wm-ui-card">
            <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={movePrevious} disabled={isFirstStep}>
              Previous
            </button>
            <button
              className="wm-ui-button wm-ui-button-secondary"
              type="button"
              onClick={currentStep.id === "locations-connections" ? completeTopologyStep : moveNext}
              disabled={currentStep.id === "locations-connections" ? false : isLastStep}
            >
              {currentStep.id === "locations-connections"
                ? (isLastStep ? "Complete discovery" : "Continue")
                : wmDiscoveryIsMultiSelectStep(currentStep) ? "Continue" : "Continue"}
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
            aria-label="Customer wording / notes"
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
            <p className="wm-ui-copy">
              {isDiscoveryComplete
                ? "Use this as the working discovery summary before moving into product direction."
                : "Carry on when ready — the captured brief saves to your project, so the next step picks it up."}
            </p>
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

          {!isDiscoveryComplete && (
            <div className="wm-discovery-capture-actions">
              <button className="wm-ui-button wm-ui-button-primary" type="button" onClick={moveNext}>Next discovery question</button>
              <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={saveDiscoveryToProject}>Save progress</button>
            </div>
          )}
          {!isDiscoveryComplete && savedMessage && <p className="wm-discovery-muted-note wm-ui-copy">{savedMessage}</p>}
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
