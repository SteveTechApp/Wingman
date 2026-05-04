import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cable,
  Camera,
  Check,
  Circle,
  HelpCircle,
  Layers,
  MapPin,
  Minus,
  Monitor,
  Network,
  Plus,
  Save,
  Wand2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SalesToneQuickSetter } from "../components/SalesToneQuickSetter";
import { SectionCard } from "../components/SectionCard";
import { saveDiscoveryBriefToProject } from "../data/projectStore";

import { SourceDeviceCollator } from "../components/discovery/SourceDeviceCollator";
type StepId =
  | "useCase"
  | "layout"
  | "sources"
  | "outputs"
  | "usb"
  | "infrastructure"
  | "review";

type DiscoveryState = {
  roomType: string;
  roomSize: string;
  userPosition: string;
  equipmentLocation: string;
  layoutFlags: string[];
  sourceCount: number;
  sourceTypes: string[];
  sourceLocations: string[];
  sourceConnections: string[];
  sourcePaths: SourcePath[];
  displayCount: number;
  displayArrangement: string;
  displayPosition: string;
  displayBehaviour: string;
  wallType: string;
  wallLayout: string;
  wallInputMode: string;
  wallMultiview: string;
  meetingWorkflow: string;
  usbTransport: string;
  usbNeeds: string[];
  cameraPosition: string;
  audioNeeds: string[];
  longestRun: string;
  cableAvailable: string[];
  networkAvailability: string;
  cableRisks: string[];
  controlNeeds: string[];
  budgetStyle: string;
  confidenceFlags: string[];
  notes: string;
};

type Inference = {
  architecture: string;
  productDirection: string[];
  avoid: string[];
  confidence: "High" | "Medium" | "Low";
  missing: string[];
  risks: string[];
};

type SourcePath = {
  id: string;
  name: string;
  deviceType: string;
  location: string;
  outputConnection: string;
  destination: string;
  transport: string;
  distance: string;
  usbRole: string;
  notes: string;
};

type SourcePathField = keyof SourcePath;
type RoomProfile = {
  note: string;
  defaults: Partial<DiscoveryState>;
  roomSizeOptions: string[];
  userPositionOptions: string[];
  equipmentLocationOptions: string[];
  sourceTypeOptions: string[];
  sourceLocationOptions: string[];
  sourceConnectionOptions: string[];
};

const steps: { id: StepId; label: string; description: string }[] = [
  {
    id: "useCase",
    label: "Use case",
    description: "Identify the application so Wingman can apply real-world assumptions.",
  },
  {
    id: "layout",
    label: "Layout",
    description: "Confirm the spatial model: room scale, user position, rack position, and constraints.",
  },
  {
    id: "sources",
    label: "Sources",
    description: "Capture source types, source positions, and compatible connection types.",
  },
  {
    id: "outputs",
    label: "Outputs",
    description: "Define display arrangement, display position, behaviour, and wall requirements.",
  },
  {
    id: "usb",
    label: "USB / Conferencing",
    description: "Choose the USB transport class first, then only compatible USB devices are shown.",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    description: "Confirm distance, cable, network, and installation risk using filtered options.",
  },
  {
    id: "review",
    label: "Review",
    description: "Review the inferred architecture, missing detail, and recommendation confidence.",
  },
];

type QuestionStrategy = {
  askFirst: string;
  why: string;
  ifUnknown: string;
};

const baseQuestionStrategyByStep = {
  useCase: {
    askFirst: "What is the customer trying to make happen in this space?",
    why: "The application narrows the whole design before any product discussion starts.",
    ifUnknown: "Pick the closest room type and use notes for the customer's own wording.",
  },
  layout: {
    askFirst: "Where are the user, displays, and equipment likely to sit?",
    why: "Physical layout decides whether the design can stay local or needs extension, routing, or network AV.",
    ifUnknown: "Use Unknown or the closest default. Wingman will keep confidence lower until the site layout is confirmed.",
  },
  sources: {
    askFirst: "What devices create the content, and where do they connect from?",
    why: "A source is a signal path, not just a device name. This decides connector, transport, USB, and endpoint count.",
    ifUnknown: "Capture the source type only, then leave connector, distance, or transport as Unknown.",
  },
  outputs: {
    askFirst: "What should the displays actually show?",
    why: "Same content, independent displays, multiview, and video walls require different architectures.",
    ifUnknown: "Choose the closest behaviour and mark display spec or layout as a validation item.",
  },
  usb: {
    askFirst: "Does the laptop or room PC need to use cameras, microphones, touch, or keyboard/mouse?",
    why: "USB changes product family, cable path, host/device direction, and whether an extender or integrated path is required.",
    ifUnknown: "Select Not sure. Wingman should not assume USB is available just because video works.",
  },
  infrastructure: {
    askFirst: "How far is the longest signal run, and what cable or network path exists?",
    why: "Distance and pathway decide HDMI, HDBaseT, fibre, AV-over-IP, or USB extension feasibility.",
    ifUnknown: "Use Unknown and keep the recommendation as a design direction until cable or network details are confirmed.",
  },
  review: {
    askFirst: "Is there anything here that would make the rep uncomfortable presenting the recommendation?",
    why: "Confidence flags stop Wingman from presenting assumptions as final design facts.",
    ifUnknown: "Request review or save the brief as a partial direction rather than forcing a final answer.",
  },
} satisfies Record<StepId, QuestionStrategy>;

function getQuestionStrategy(stepId: StepId, state: DiscoveryState): QuestionStrategy {
  const base = baseQuestionStrategyByStep[stepId];

  if (state.roomType === "Display wall / large format wall" || isWallArrangement(state.displayArrangement)) {
    if (stepId === "useCase" || stepId === "outputs") {
      return {
        askFirst: "Should the wall show one big image, separate content per display, multiview, or mixed layouts?",
        why: "Wall behaviour decides whether the design needs a simple wall processor, a matrix/scaler path, or AV-over-IP flexibility.",
        ifUnknown: "Start with the closest behaviour and hand off to the Videowall Builder before selecting processor SKUs.",
      };
    }

    if (stepId === "infrastructure") {
      return {
        askFirst: "Where are the wall sources and processor/controller compared with the displays?",
        why: "Source and processor location decide whether the wall needs local HDMI, HDBaseT, fibre, or network transport.",
        ifUnknown: "Mark distance and processor location as validation items. Do not assume all wall products fit all layouts.",
      };
    }
  }

  if (state.roomType === "Multi-zone venue" || isMultiZone(state)) {
    if (stepId === "outputs" || stepId === "infrastructure") {
      return {
        askFirst: "Do zones need the same content, independent content, or operator-controlled presets?",
        why: "Zone behaviour decides whether the system is simple distribution, matrix switching, or AV-over-IP routing.",
        ifUnknown: "Capture the number of zones and use a routing/flexibility assumption until source-to-zone behaviour is confirmed.",
      };
    }
  }

  if (["Meeting room", "Boardroom", "Training room", "Classroom"].includes(state.roomType)) {
    if (stepId === "usb") {
      return {
        askFirst: "Does the user's laptop need to use the room camera, microphone, speakerphone, or touch display?",
        why: "This separates presentation-only rooms from BYOM/BYOD conferencing rooms and prevents missing USB transport.",
        ifUnknown: "Choose Not sure and ask whether Teams/Zoom calls must use room peripherals.",
      };
    }

    if (stepId === "sources") {
      return {
        askFirst: "Where does the presenter connect: table, wall plate, lectern, room PC, or wireless?",
        why: "The user connection point determines switcher style, USB-C needs, extension distance, and cable path.",
        ifUnknown: "Use the most likely user position and validate the source connector before customer issue.",
      };
    }
  }

  if (state.roomType === "Retail signage" || state.roomType === "Hospitality") {
    if (stepId === "outputs" || stepId === "sources") {
      return {
        askFirst: "How many displays or zones need signage, and do they all show the same content?",
        why: "Signage usually depends on repeatable distribution, source location, and zone count rather than conferencing features.",
        ifUnknown: "Capture display count and assume signage loop until zone-specific content is confirmed.",
      };
    }
  }

  if (state.roomType === "Control room") {
    if (stepId === "outputs" || stepId === "sources") {
      return {
        askFirst: "How many live sources must operators see at once, and who changes the layout?",
        why: "Control-room systems often need multiview, flexible routing, low latency, and operator control.",
        ifUnknown: "Mark source count and layout control as validation items before selecting multiview or AVoIP paths.",
      };
    }
  }

  if (state.roomType === "House of worship" || state.roomType === "Lecture space") {
    if (stepId === "sources" || stepId === "usb") {
      return {
        askFirst: "Are the key sources presentation, camera, streaming/recording, or confidence monitor feeds?",
        why: "Teaching and worship spaces often mix presentation, camera, streaming, display, and audio handoff requirements.",
        ifUnknown: "Capture the known source types first and flag camera/streaming workflow for review.",
      };
    }
  }

  return base;
}

const roomTypes = [
  "Meeting room",
  "Boardroom",
  "Classroom",
  "Training room",
  "Lecture space",
  "Retail signage",
  "Hospitality",
  "House of worship",
  "Control room",
  "Multi-zone venue",
  "Display wall / large format wall",
  "Other / not sure",
];

const layoutFlags = [
  "Fixed orientation",
  "Divisible space",
  "Repeater displays",
  "Future expansion",
  "No rack available",
  "Customer unsure",
];

const standardDisplayArrangements = [
  "Single display",
  "Dual mirrored displays",
  "Dual independent displays",
  "Content display + conferencing display",
  "Primary display + confidence monitor",
  "Projector",
  "Distributed displays",
  "Multiview display",
];

const dualDisplayArrangements = [
  "Dual mirrored displays",
  "Dual independent displays",
  "Content display + conferencing display",
  "Primary display + confidence monitor",
];

const wallDisplayArrangements = ["LCD wall", "LED wall"];

const multiZoneDisplayArrangements = [
  "Distributed displays",
  "Multiple zones",
  "Choose source per zone",
  "LCD wall",
  "LED wall",
];

const standardDisplayBehaviours = [
  "Same content everywhere",
  "Choose source per display",
  "Presentation plus conferencing",
  "Signage loop",
  "Future expansion required",
];

const dualDisplayBehaviours = [
  "Mirror same content on both displays",
  "Independent content per display",
  "Laptop dual extended desktop",
  "Presentation on one display, conferencing on the other",
  "Confidence monitor follows presenter",
];

const wallDisplayBehaviours = [
  "Single full-screen input",
  "Single input tile-mode",
  "Screen-driven / input-per-display",
  "Multiview required",
  "Non-multiview",
];

const multiZoneDisplayBehaviours = [
  "Same content to all zones",
  "Choose source per zone/display",
  "Scheduled signage loop",
  "Central routing with presets",
  "Future expansion required",
];

const standardDisplayPositions = [
  "Front wall",
  "Side wall",
  "Rear wall",
  "Ceiling projector",
  "Multiple walls",
  "Unknown",
];

const dualDisplayPositions = [
  "Dual displays on front wall",
  "Left and right of camera",
  "Content display + conferencing display",
  "Front display + side display",
  "Front display + confidence monitor",
  "Mirrored displays in same room",
  "Independent displays in same room",
  "Unknown dual-display position",
];

const wallDisplayPositions = [
  "Primary feature wall",
  "Front wall display wall",
  "Retail display wall",
  "Reception / atrium wall",
  "Control room wall",
  "Stage / event wall",
  "Unknown wall position",
];

const multiZoneDisplayPositions = [
  "Distributed displays",
  "Multiple walls",
  "Multiple zones",
  "Central venue zones",
  "Remote displays",
  "Unknown zone layout",
];

const lcdWallLayouts = ["2x2 LCD wall", "3x3 LCD wall", "4x4 LCD wall", "1x3 LCD ribbon", "1x4 LCD ribbon", "Custom LCD layout"];
const ledWallLayouts = ["Single LED canvas", "Custom LED canvas"];
const lcdWallInputModes = ["Single input tile-mode", "Screen-driven / input-per-display"];
const ledWallInputModes = ["Single input canvas"];
const wallMultiviewModes = ["Multiview required", "Non-multiview"];

const meetingWorkflowBase = [
  "Presentation only",
  "BYOD presentation",
  "BYOM conferencing",
  "Room PC conferencing",
  "MTR / Zoom Room",
  "Wireless conferencing",
  "Streaming / recording",
  "Not sure",
];

const usbTransportOptions = [
  "No USB required",
  "USB 2.0 is enough",
  "USB 3.x / high-bandwidth required",
  "Not sure",
];

const usbNoTransportDevices = ["No USB required"];

const usbLowBandwidthDevices = [
  "USB camera",
  "Speakerphone",
  "Microphone",
  "Touch display return",
  "Keyboard / mouse",
  "Multiple low-bandwidth USB devices",
  "Not sure",
];

const usbHighBandwidthDevices = [
  "USB camera",
  "USB 3.x camera",
  "Speakerphone",
  "Microphone",
  "Touch display return",
  "Keyboard / mouse",
  "Multiple USB devices",
  "USB 3.x required",
  "Not sure",
];

const highBandwidthUsbNeeds = [
  "USB 3.x camera",
  "Multiple USB devices",
  "USB 3.x required",
];

const cameraPositions = ["No camera", "Above display", "Ceiling", "Rear of room", "Table camera", "Multiple cameras", "NDI camera", "Unknown"];

const audioNeedsBase = [
  "Display speakers only",
  "Speakerphone",
  "Microphones",
  "Audio de-embed",
  "Amplifier",
  "DSP integration",
  "Dante / AES67",
  "Hearing loop",
  "Unknown",
];

const runBands = ["Under 5m", "5-10m", "10-35m", "35-70m", "70-100m", "100m+", "Unknown"];

const cableTypesShort = ["HDMI", "Cat5e", "Cat6", "Cat6A", "Fibre", "Unknown"];
const cableTypesMedium = ["Cat5e", "Cat6", "Cat6A", "Fibre", "Unknown"];
const cableTypesLong = ["Cat6A", "Fibre", "Network only", "Unknown"];
const cableTypesNetwork = ["Cat6", "Cat6A", "Fibre", "Network only", "Unknown"];

const networkOptionsSimple = ["No network needed", "Existing IT network", "Unknown"];
const networkOptionsRouted = ["Dedicated AV network possible", "Managed switch available", "10G available", "Existing IT network", "Unknown"];

const cableRiskOptions = [
  "Cable not certified",
  "Distance not confirmed",
  "No new cable route",
  "Shared IT network",
  "Old installed cable",
  "Customer drawings needed",
  "None known",
];

const controlOptions = [
  "No control",
  "Display auto power",
  "IR",
  "RS-232",
  "Relay / contact closure",
  "Web UI",
  "Touch panel",
  "Button panel",
  "Third-party control",
];

const budgetOptions = ["Cost-sensitive", "Balanced", "Premium", "Expansion-led", "No budget yet", "Quote required quickly"];

const confidenceOptions = [
  "Enough to recommend",
  "Need site survey",
  "Need cable confirmation",
  "Need USB test",
  "Need network confirmation",
  "Need display spec",
  "Need customer drawings",
];

const initialState: DiscoveryState = {
  roomType: "Meeting room",
  roomSize: "Medium <25m",
  userPosition: "Central table",
  equipmentLocation: "Behind display",
  layoutFlags: [],
  sourceCount: 1,
  sourceTypes: [],
  sourceLocations: [],
  sourceConnections: [],
  sourcePaths: [
    {
      id: "source-1",
      name: "Source 1",
      deviceType: "",
      location: "",
      outputConnection: "",
      destination: "",
      transport: "",
      distance: "",
      usbRole: "",
      notes: "",
    },
  ],  displayCount: 1,
  displayArrangement: "Single display",
  displayPosition: "Front wall",
  displayBehaviour: "Presentation plus conferencing",
  wallType: "",
  wallLayout: "",
  wallInputMode: "",
  wallMultiview: "",
  meetingWorkflow: "",
  usbTransport: "",
  usbNeeds: [],
  cameraPosition: "",
  audioNeeds: [],
  longestRun: "",
  cableAvailable: [],
  networkAvailability: "",
  cableRisks: [],
  controlNeeds: [],
  budgetStyle: "",
  confidenceFlags: [],
  notes: "",
};


function normaliseDiscoveryState(state: DiscoveryState): DiscoveryState {
  const fallbackSourcePaths =
    Array.isArray(state.sourcePaths) && state.sourcePaths.length > 0
      ? state.sourcePaths
      : [getEmptySourcePath(0)];

  const summary = summarizeSourcePaths(fallbackSourcePaths);

  return {
    ...state,
    sourcePaths: fallbackSourcePaths,
    sourceCount: fallbackSourcePaths.length,
    sourceTypes: Array.isArray(state.sourceTypes) && state.sourceTypes.length ? state.sourceTypes : summary.sourceTypes,
    sourceLocations:
      Array.isArray(state.sourceLocations) && state.sourceLocations.length ? state.sourceLocations : summary.sourceLocations,
    sourceConnections:
      Array.isArray(state.sourceConnections) && state.sourceConnections.length
        ? state.sourceConnections
        : summary.sourceConnections,
    layoutFlags: Array.isArray(state.layoutFlags) ? state.layoutFlags : [],
    usbNeeds: Array.isArray(state.usbNeeds) ? state.usbNeeds : [],
    audioNeeds: Array.isArray(state.audioNeeds) ? state.audioNeeds : [],
    cableAvailable: Array.isArray(state.cableAvailable) ? state.cableAvailable : [],
    cableRisks: Array.isArray(state.cableRisks) ? state.cableRisks : [],
    controlNeeds: Array.isArray(state.controlNeeds) ? state.controlNeeds : [],
    confidenceFlags: Array.isArray(state.confidenceFlags) ? state.confidenceFlags : [],
  };
}

type MultiSelectKey =
  | "layoutFlags"
  | "sourceTypes"
  | "sourceLocations"
  | "sourceConnections"
  | "usbNeeds"
  | "audioNeeds"
  | "cableAvailable"
  | "cableRisks"
  | "controlNeeds"
  | "confidenceFlags";

function includesAny(values: string[], tests: string[]) {
  return values.some((value) => tests.includes(value));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function isDualArrangement(value: string) {
  return value.includes("Dual") || value.includes("Content display") || value.includes("confidence monitor");
}

function isWallArrangement(value: string) {
  return value === "LCD wall" || value === "LED wall";
}

function isMultiZone(state: DiscoveryState) {
  return (
    state.roomType === "Multi-zone venue" ||
    state.displayArrangement === "Distributed displays" ||
    state.displayArrangement === "Multiple zones" ||
    state.displayArrangement === "Choose source per zone"
  );
}

function isNetworkLedOrCameraSource(state: DiscoveryState) {
  return (
    state.sourceTypes.includes("NDI camera") ||
    state.sourceConnections.includes("NDI") ||
    state.sourceConnections.includes("Network")
  );
}

function distanceRank(longestRun: string) {
  if (longestRun === "Under 5m") return 1;
  if (longestRun === "5-10m") return 2;
  if (longestRun === "10-35m") return 3;
  if (longestRun === "35-70m") return 4;
  if (longestRun === "70-100m") return 5;
  if (longestRun === "100m+") return 6;
  return 0;
}

function getRoomProfile(roomType: string): RoomProfile {
  if (roomType === "Multi-zone venue") {
    return {
      note: "Wingman assumes a multi-zone venue is normally extra-large, has distributed displays, longer cable paths, and should be treated as a routing / distribution problem rather than a single-room switcher.",
      defaults: {
        roomSize: "Extra-large 50m+",
        userPosition: "No fixed user position",
        equipmentLocation: "Central rack",
        displayCount: 4,
        displayArrangement: "Distributed displays",
        displayPosition: "Distributed displays",
        displayBehaviour: "Choose source per zone/display",
        longestRun: "70-100m",
        networkAvailability: "Dedicated AV network possible",
        layoutFlags: ["Future expansion"],
      },
      roomSizeOptions: ["Extra-large 50m+", "Open / divisible space", "Large <50m", "Unknown"],
      userPositionOptions: ["No fixed user position", "Operator desk", "Reception / counter", "Front-of-house", "Unknown"],
      equipmentLocationOptions: ["Central rack", "Local rack", "Credenza", "Unknown"],
      sourceTypeOptions: ["Media player", "Signage player", "Room PC", "Wireless presentation", "HDMI wall input", "USB-C wall input", "Other source"],
      sourceLocationOptions: ["Rack", "Zone location", "Wall plate", "Reception / counter", "Unknown"],
      sourceConnectionOptions: ["HDMI", "USB-C video", "Network", "Wireless", "Unknown"],
    };
  }

  if (roomType === "Display wall / large format wall") {
    return {
      note: "Wingman treats this as LCD or LED wall qualification first, then either quick-picks a common layout or hands off to the wall wizard for detailed design.",
      defaults: {
        roomSize: "Large <50m",
        userPosition: "No fixed user position",
        equipmentLocation: "Local rack",
        displayCount: 4,
        displayArrangement: "LCD wall",
        displayPosition: "Primary feature wall",
        displayBehaviour: "Single input tile-mode",
        wallType: "LCD wall",
        wallLayout: "2x2 LCD wall",
        wallInputMode: "Single input tile-mode",
        wallMultiview: "Non-multiview",
        meetingWorkflow: "Presentation only",
        usbTransport: "No USB required",
        usbNeeds: ["No USB required"],
      },
      roomSizeOptions: ["Large <50m", "Extra-large 50m+", "Open / divisible space", "Medium <25m", "Unknown"],
      userPositionOptions: ["No fixed user position", "Front-of-house", "Operator desk", "Reception / counter", "Unknown"],
      equipmentLocationOptions: ["Local rack", "Behind display", "Central rack", "Unknown"],
      sourceTypeOptions: ["Media player", "Signage player", "Room PC", "Wireless presentation", "HDMI wall input", "Other source"],
      sourceLocationOptions: ["Rack", "Display wall", "Wall plate", "Operator desk", "Unknown"],
      sourceConnectionOptions: ["HDMI", "Network", "Wireless", "Unknown"],
    };
  }

  if (roomType === "Retail signage" || roomType === "Hospitality") {
    return {
      note: "Wingman assumes signage and hospitality applications are normally display-distribution or repeatable-zone systems. USB is normally not required unless touch or keyboard/mouse is specifically requested.",
      defaults: {
        roomSize: "Large <50m",
        userPosition: "No fixed user position",
        equipmentLocation: "Central rack",
        displayCount: 3,
        displayArrangement: "Distributed displays",
        displayPosition: "Distributed displays",
        displayBehaviour: "Signage loop",
        meetingWorkflow: "Presentation only",
        usbTransport: "No USB required",
        usbNeeds: ["No USB required"],
      },
      roomSizeOptions: ["Large <50m", "Extra-large 50m+", "Open / divisible space", "Medium <25m", "Unknown"],
      userPositionOptions: ["No fixed user position", "Reception / counter", "Operator desk", "Unknown"],
      equipmentLocationOptions: ["Central rack", "Local rack", "Behind display", "Unknown"],
      sourceTypeOptions: ["Signage player", "Media player", "Room PC", "Wireless presentation", "Other source"],
      sourceLocationOptions: ["Rack", "Display wall", "Zone location", "Unknown"],
      sourceConnectionOptions: ["HDMI", "Network", "Wireless", "Unknown"],
    };
  }

  if (roomType === "Boardroom") {
    return {
      note: "Wingman assumes a boardroom often needs dual display behaviour, table inputs, conferencing, USB transport, and a clean user-facing connection point.",
      defaults: {
        roomSize: "Medium <25m",
        userPosition: "Central table",
        equipmentLocation: "Credenza",
        displayCount: 2,
        displayArrangement: "Content display + conferencing display",
        displayPosition: "Content display + conferencing display",
        displayBehaviour: "Presentation on one display, conferencing on the other",
        meetingWorkflow: "BYOM conferencing",
        usbTransport: "USB 2.0 is enough",
        usbNeeds: ["USB camera", "Speakerphone"],
      },
      roomSizeOptions: ["Medium <25m", "Large <50m", "Small <10m", "Unknown"],
      userPositionOptions: ["Central table", "Credenza", "No fixed user position", "Unknown"],
      equipmentLocationOptions: ["Credenza", "Behind display", "Local rack", "Under table", "Unknown"],
      sourceTypeOptions: ["Laptop USB-C", "Laptop HDMI", "Room PC", "Wireless presentation", "USB camera", "PTZ camera", "Other source"],
      sourceLocationOptions: ["Table", "Floor box", "Wall plate", "Credenza", "Camera position", "Unknown"],
      sourceConnectionOptions: ["USB-C with charging", "USB-C video", "HDMI", "USB only", "Wireless", "Unknown"],
    };
  }

  if (roomType === "Control room") {
    return {
      note: "Wingman assumes a control room may need operator positions, multiview, networked sources, and flexible source selection.",
      defaults: {
        roomSize: "Large <50m",
        userPosition: "Operator desk",
        equipmentLocation: "Central rack",
        displayCount: 4,
        displayArrangement: "Multiview display",
        displayPosition: "Control room wall",
        displayBehaviour: "Choose source per display",
        networkAvailability: "Dedicated AV network possible",
      },
      roomSizeOptions: ["Large <50m", "Extra-large 50m+", "Medium <25m", "Unknown"],
      userPositionOptions: ["Operator desk", "No fixed user position", "Unknown"],
      equipmentLocationOptions: ["Central rack", "Local rack", "Unknown"],
      sourceTypeOptions: ["Room PC", "Media player", "NDI camera", "PTZ camera", "HDMI wall input", "Other source"],
      sourceLocationOptions: ["Rack", "Operator desk", "Camera position", "Zone location", "Unknown"],
      sourceConnectionOptions: ["HDMI", "Network", "NDI", "USB only", "Unknown"],
    };
  }

  if (roomType === "House of worship") {
    return {
      note: "Wingman assumes worship spaces often include longer cable paths, cameras, streaming, confidence displays, and central AV control.",
      defaults: {
        roomSize: "Extra-large 50m+",
        userPosition: "Front-of-house",
        equipmentLocation: "Central rack",
        displayCount: 2,
        displayArrangement: "Primary display + confidence monitor",
        displayPosition: "Front display + confidence monitor",
        displayBehaviour: "Confidence monitor follows presenter",
        meetingWorkflow: "Streaming / recording",
        longestRun: "70-100m",
      },
      roomSizeOptions: ["Extra-large 50m+", "Large <50m", "Open / divisible space", "Unknown"],
      userPositionOptions: ["Front-of-house", "Lectern", "Operator desk", "No fixed user position", "Unknown"],
      equipmentLocationOptions: ["Central rack", "Local rack", "Front-of-house", "Unknown"],
      sourceTypeOptions: ["Room PC", "Media player", "PTZ camera", "NDI camera", "Laptop HDMI", "Other source"],
      sourceLocationOptions: ["Front-of-house", "Rack", "Camera position", "Ceiling", "Unknown"],
      sourceConnectionOptions: ["HDMI", "Network", "NDI", "USB only", "Unknown"],
    };
  }

  if (roomType === "Classroom" || roomType === "Training room" || roomType === "Lecture space") {
    return {
      note: "Wingman assumes teaching spaces are usually lectern or instructor-position driven, with display/projector extension and optional capture or USB teaching peripherals.",
      defaults: {
        roomSize: roomType === "Lecture space" ? "Large <50m" : "Medium <25m",
        userPosition: "Lectern",
        equipmentLocation: "Lectern",
        displayCount: roomType === "Lecture space" ? 2 : 1,
        displayArrangement: roomType === "Lecture space" ? "Primary display + confidence monitor" : "Single display",
        displayPosition: roomType === "Lecture space" ? "Front display + confidence monitor" : "Front wall",
        displayBehaviour: roomType === "Lecture space" ? "Confidence monitor follows presenter" : "Same content everywhere",
      },
      roomSizeOptions: roomType === "Lecture space" ? ["Large <50m", "Extra-large 50m+", "Medium <25m", "Unknown"] : ["Medium <25m", "Small <10m", "Large <50m", "Unknown"],
      userPositionOptions: ["Lectern", "Central table", "Front-of-house", "Unknown"],
      equipmentLocationOptions: ["Lectern", "Local rack", "Behind display", "Central rack", "Unknown"],
      sourceTypeOptions: ["Laptop HDMI", "Laptop USB-C", "Room PC", "Document camera", "Wireless presentation", "USB camera", "PTZ camera", "Other source"],
      sourceLocationOptions: ["Lectern", "Wall plate", "Rack", "Ceiling", "Camera position", "Unknown"],
      sourceConnectionOptions: ["HDMI", "USB-C video", "USB-C with charging", "USB only", "Network", "Wireless", "Unknown"],
    };
  }

  return {
    note: "Wingman assumes a standard meeting-room style starting point, then narrows the options as layout, outputs, USB, and infrastructure are captured.",
    defaults: {
      roomSize: "Medium <25m",
      userPosition: "Central table",
      equipmentLocation: "Behind display",
      displayCount: 1,
      displayArrangement: "Single display",
      displayPosition: "Front wall",
      displayBehaviour: "Presentation plus conferencing",
    },
    roomSizeOptions: ["Medium <25m", "Small <10m", "Large <50m", "Unknown"],
    userPositionOptions: ["Central table", "No fixed user position", "Lectern", "Unknown"],
    equipmentLocationOptions: ["Behind display", "Local rack", "Credenza", "Under table", "Unknown"],
    sourceTypeOptions: ["Laptop USB-C", "Laptop HDMI", "Room PC", "Wireless presentation", "USB camera", "Other source"],
    sourceLocationOptions: ["Table", "Floor box", "Wall plate", "Rack", "Camera position", "Unknown"],
    sourceConnectionOptions: ["USB-C with charging", "USB-C video", "HDMI", "USB only", "Wireless", "Unknown"],
  };
}

function getDisplayArrangementOptions(state: DiscoveryState, profile: RoomProfile) {
  if (state.roomType === "Display wall / large format wall") return wallDisplayArrangements;
  if (state.roomType === "Multi-zone venue") return multiZoneDisplayArrangements;
  if (state.roomType === "Control room") return ["Multiview display", "Distributed displays", "LCD wall", "LED wall", "Single display"];
  if (state.roomType === "Retail signage" || state.roomType === "Hospitality") return ["Distributed displays", "Single display", "LCD wall", "LED wall"];

  const preferred = typeof profile.defaults.displayArrangement === "string" ? [profile.defaults.displayArrangement] : [];

  if (isDualArrangement(state.displayArrangement)) return unique([...preferred, ...dualDisplayArrangements]);

  return unique([...preferred, ...standardDisplayArrangements]);
}

function getDisplayPositionOptions(state: DiscoveryState) {
  if (isWallArrangement(state.displayArrangement)) return wallDisplayPositions;
  if (isDualArrangement(state.displayArrangement)) return dualDisplayPositions;
  if (isMultiZone(state)) return multiZoneDisplayPositions;
  return standardDisplayPositions;
}

function getDisplayBehaviourOptions(state: DiscoveryState) {
  if (isWallArrangement(state.displayArrangement)) return wallDisplayBehaviours;
  if (isDualArrangement(state.displayArrangement)) return dualDisplayBehaviours;
  if (isMultiZone(state)) return multiZoneDisplayBehaviours;
  if (state.displayArrangement === "Multiview display") return ["Multiple sources on one screen", "Operator selectable layouts", "Static multiview layout", "Future expansion required"];
  return standardDisplayBehaviours;
}

function getMeetingWorkflowOptions(state: DiscoveryState) {
  if (state.roomType === "Retail signage" || state.roomType === "Hospitality") return ["Presentation only", "Streaming / recording", "Not sure"];
  if (state.roomType === "House of worship") return ["Streaming / recording", "Presentation only", "BYOD presentation", "Not sure"];
  if (state.roomType === "Control room") return ["Presentation only", "Streaming / recording", "Not sure"];
  if (state.roomType === "Display wall / large format wall") return ["Presentation only", "Streaming / recording", "Not sure"];
  return meetingWorkflowBase;
}

function getUsbOptions(state: DiscoveryState) {
  if (state.usbTransport === "No USB required") return usbNoTransportDevices;
  if (state.usbTransport === "USB 2.0 is enough") return usbLowBandwidthDevices;
  if (state.usbTransport === "USB 3.x / high-bandwidth required") return usbHighBandwidthDevices;

  if (state.meetingWorkflow === "Presentation only" || state.roomType === "Retail signage" || state.roomType === "Hospitality") {
    return ["No USB required", "Touch display return", "Keyboard / mouse", "Not sure"];
  }

  return usbLowBandwidthDevices;
}

function getCableTypeOptions(state: DiscoveryState) {
  if (isMultiZone(state) || isNetworkLedOrCameraSource(state)) return cableTypesNetwork;

  const rank = distanceRank(state.longestRun);

  if (rank >= 5) return cableTypesLong;
  if (rank >= 3) return cableTypesMedium;
  return cableTypesShort;
}

function getNetworkOptions(state: DiscoveryState) {
  if (isMultiZone(state) || isNetworkLedOrCameraSource(state) || state.displayArrangement === "LED wall" || state.displayBehaviour.includes("Multiview")) {
    return networkOptionsRouted;
  }

  return networkOptionsSimple;
}

function defaultDisplayPositionForArrangement(value: string, roomType: string) {
  if (value === "LCD wall" || value === "LED wall") return "Primary feature wall";
  if (value === "Distributed displays" || value === "Multiple zones" || roomType === "Multi-zone venue") return "Distributed displays";
  if (value === "Content display + conferencing display") return "Content display + conferencing display";
  if (value === "Primary display + confidence monitor") return "Front display + confidence monitor";
  if (value.includes("Dual")) return "Dual displays on front wall";
  if (value === "Projector") return "Ceiling projector";
  return "Front wall";
}

function filterCompatibleUsbNeeds(usbTransport: string, usbNeeds: string[]) {
  const allowed = getUsbOptions({ ...initialState, usbTransport });

  if (usbTransport === "No USB required") return ["No USB required"];

  return usbNeeds.filter((need) => allowed.includes(need) && !highBandwidthUsbNeeds.includes(need));
}

function hasUsbRequirement(state: DiscoveryState) {
  if (state.usbTransport === "No USB required") return false;

  return (
    state.usbTransport === "USB 2.0 is enough" ||
    state.usbTransport === "USB 3.x / high-bandwidth required" ||
    (state.usbNeeds.length > 0 && !state.usbNeeds.includes("No USB required"))
  );
}

function hasConferencing(state: DiscoveryState) {
  return includesAny([state.meetingWorkflow], ["BYOM conferencing", "Room PC conferencing", "MTR / Zoom Room", "Wireless conferencing"]);
}

function getEmptySourcePath(index: number): SourcePath {
  return {
    id: `source-${index + 1}-${Math.random().toString(16).slice(2)}`,
    name: `Source ${index + 1}`,
    deviceType: "",
    location: "",
    outputConnection: "",
    destination: "",
    transport: "",
    distance: "",
    usbRole: "",
    notes: "",
  };
}

function summarizeSourcePaths(sourcePaths: SourcePath[]) {
  return {
    sourceTypes: unique(sourcePaths.map((source) => source.deviceType).filter(Boolean)),
    sourceLocations: unique(sourcePaths.map((source) => source.location).filter(Boolean)),
    sourceConnections: unique(sourcePaths.map((source) => source.outputConnection).filter(Boolean)),
  };
}

function getSourceConnectionOptionsForSourcePath(source: SourcePath, state: DiscoveryState, profile: RoomProfile) {
  if (!source.deviceType) {
    return profile.sourceConnectionOptions;
  }

  const options: string[] = [];

  if (["Laptop HDMI", "HDMI wall input", "Media player", "Signage player", "Room PC", "Document camera"].includes(source.deviceType)) {
    options.push("HDMI");
  }

  if (["Laptop USB-C", "USB-C wall input"].includes(source.deviceType)) {
    options.push("USB-C video", "USB-C with charging");
  }

  if (source.deviceType === "USB camera") {
    options.push("USB only");
  }

  if (source.deviceType === "NDI camera") {
    options.push("NDI", "Network");
  }

  if (source.deviceType === "PTZ camera") {
    options.push("HDMI", "USB only", "NDI", "Network");
  }

  if (source.deviceType === "Wireless presentation") {
    options.push("Wireless", "Network", "HDMI");
  }

  if (source.deviceType === "Other source") {
    options.push("HDMI", "USB-C video", "USB only", "Network", "Wireless", "Unknown");
  }

  if (state.usbTransport === "No USB required") {
    return unique(options.filter((option) => option !== "USB only"));
  }

  options.push("Unknown");

  return unique(options);
}

function getSourceDestinationOptions(state: DiscoveryState) {
  const options = [
    "Display / local display input",
    "Local switcher",
    "HDBaseT transmitter",
    "AVoIP encoder",
    "Central rack",
    "Room PC / conferencing host",
    "USB bridge / camera bridge",
    "DSP / audio system",
    "Unknown",
  ];

  if (isMultiZone(state)) {
    return unique(["Central rack", "AVoIP encoder", "Zone display input", "Local switcher", "Unknown"]);
  }

  if (isWallArrangement(state.displayArrangement)) {
    return unique(["Wall processor / controller", "AVoIP encoder", "Local switcher", "Central rack", "Unknown"]);
  }

  if (hasUsbRequirement(state)) {
    return unique(["Local switcher", "Room PC / conferencing host", "USB bridge / camera bridge", "HDBaseT transmitter", "Unknown"]);
  }

  return options;
}

function getSourceTransportOptionsForSourcePath(source: SourcePath, state: DiscoveryState) {
  const rank = distanceRank(source.distance || state.longestRun);

  if (source.outputConnection === "USB only") {
    if (state.usbTransport === "USB 3.x / high-bandwidth required") {
      return ["USB 3.x extender", "Local USB", "USB 3.x over supported integrated path", "Unknown"];
    }

    if (state.usbTransport === "USB 2.0 is enough") {
      return ["Primary HDBaseT / integrated USB 2.0 path", "USB 2.0 extender", "Local USB", "Unknown"];
    }

    return ["Local USB", "USB 2.0 extender", "Unknown"];
  }

  if (source.outputConnection === "NDI") {
    return ["Network / NDI", "NDI to AVoIP bridge", "Unknown"];
  }

  if (source.outputConnection === "Network") {
    return ["Network", "AVoIP encoder", "NDI / IP workflow", "Unknown"];
  }

  if (source.outputConnection === "Wireless") {
    return ["Wireless presentation receiver", "Network", "Local HDMI from receiver", "Unknown"];
  }

  if (isMultiZone(state)) {
    return ["AVoIP encoder", "HDBaseT to central rack", "Fibre / network transport", "Unknown"];
  }

  if (rank >= 5) {
    return ["AVoIP encoder", "Fibre extender", "HDBaseT long-run path", "Unknown"];
  }

  if (rank >= 3) {
    return ["HDBaseT", "AVoIP encoder", "Active optical HDMI", "Unknown"];
  }

  if (rank > 0 && rank <= 2) {
    return ["Short HDMI / local switch", "HDBaseT if cable route requires it", "Unknown"];
  }

  return ["Short HDMI / local switch", "HDBaseT", "AVoIP encoder", "Active optical HDMI", "Unknown"];
}

function getUsbRoleOptionsForSourcePath(source: SourcePath, state: DiscoveryState) {
  if (source.outputConnection !== "USB only" && source.deviceType !== "USB camera" && source.deviceType !== "PTZ camera") {
    return ["Video only / no USB", "Unknown"];
  }

  if (state.usbTransport === "USB 3.x / high-bandwidth required") {
    return ["USB 3.x camera/peripheral", "USB 2.0 camera/peripheral", "Keyboard / mouse", "Touch return", "Unknown"];
  }

  if (state.usbTransport === "USB 2.0 is enough") {
    return ["USB 2.0 camera/peripheral", "Keyboard / mouse", "Touch return", "Unknown"];
  }

  return ["USB role not confirmed", "USB 2.0 camera/peripheral", "Keyboard / mouse", "Touch return", "Unknown"];
}

function defaultConnectionForSourceType(deviceType: string) {
  if (deviceType === "Laptop USB-C") return "USB-C video";
  if (deviceType === "Laptop HDMI") return "HDMI";
  if (deviceType === "Room PC") return "HDMI";
  if (deviceType === "USB camera") return "USB only";
  if (deviceType === "NDI camera") return "NDI";
  if (deviceType === "PTZ camera") return "HDMI";
  if (deviceType === "Wireless presentation") return "Wireless";
  if (deviceType === "Media player") return "HDMI";
  if (deviceType === "Signage player") return "HDMI";
  if (deviceType === "Document camera") return "HDMI";
  return "";
}

function defaultDestinationForSource(state: DiscoveryState) {
  if (isMultiZone(state)) return "Central rack";
  if (isWallArrangement(state.displayArrangement)) return "Wall processor / controller";
  if (hasUsbRequirement(state)) return "Local switcher";
  return "Display / local display input";
}
function inferDesign(state: DiscoveryState): Inference {
  const missing: string[] = [];
  const risks: string[] = [];
  const productDirection: string[] = [];
  const avoid: string[] = [];

  if (!state.roomType) missing.push("Room/application type");
  if (!state.roomSize) missing.push("Room size");
  if (!state.userPosition) missing.push("Main user/source position");
  if (!state.equipmentLocation) missing.push("Equipment/rack location");
  if (!state.sourceTypes.length) missing.push("Source types");
  if (!state.sourceLocations.length) missing.push("Source locations");
  if (!state.sourceConnections.length) missing.push("Source connection type");
  if (!state.displayArrangement) missing.push("Display arrangement");
  if (!state.displayPosition) missing.push("Display position");
  if (!state.displayBehaviour) missing.push("Display behaviour");
  if (!state.longestRun || state.longestRun === "Unknown") missing.push("Longest cable run");
  if (!state.cableAvailable.length || state.cableAvailable.includes("Unknown")) missing.push("Installed cable type/grade");

  if (isWallArrangement(state.displayArrangement) && !state.wallLayout) missing.push("LCD/LED wall layout");
  if (isWallArrangement(state.displayArrangement) && !state.wallInputMode) missing.push("Wall input mode");
  if (isWallArrangement(state.displayArrangement) && !state.wallMultiview) missing.push("Wall multiview requirement");

  if (hasUsbRequirement(state) && !state.usbTransport) missing.push("USB transport class");
  if (hasUsbRequirement(state) && (!state.meetingWorkflow || state.meetingWorkflow === "Not sure")) missing.push("USB/conferencing workflow");

  if (state.usbTransport === "USB 2.0 is enough" && includesAny(state.usbNeeds, highBandwidthUsbNeeds)) {
    risks.push("USB 2.0 was selected but high-bandwidth USB devices are still present.");
  }

  if (state.cableRisks.includes("Cable not certified")) risks.push("Cable is not certified; verify cable grade before committing to maximum distance/resolution.");
  if (state.cableRisks.includes("Distance not confirmed")) risks.push("Distance is not confirmed; transport method and receiver choice may change.");
  if (state.cableRisks.includes("Shared IT network")) risks.push("Shared IT network may restrict AVoIP multicast, QoS, IGMP, or bandwidth behaviour.");
  if (state.usbNeeds.includes("USB 3.x required")) risks.push("USB 3.x requirement must be verified before selecting USB transport hardware.");
  if (state.networkAvailability === "Existing IT network" && isMultiZone(state)) risks.push("NetworkHD / AVoIP design needs IT confirmation before final hardware selection.");

  let architecture = "Structured presentation / extension system";

  if (state.displayArrangement === "LED wall") {
    architecture = state.wallMultiview === "Multiview required"
      ? "LED wall with upstream multiview composition feeding a single LED canvas"
      : "LED wall single-input canvas path";

    productDirection.push("Treat LED as a single input canvas into the LED controller unless multiview composition is required upstream.");
    productDirection.push("Use the wall wizard for LED canvas dimensions, pixel pitch, processor handoff, and source behaviour.");
    avoid.push("Do not treat LED as a normal multi-output LCD tile wall unless the LED processor specifically requires that topology.");
  }

  if (state.displayArrangement === "LCD wall") {
    architecture = state.wallInputMode === "Screen-driven / input-per-display"
      ? "LCD wall with screen-driven / input-per-display processing"
      : "LCD wall single-input tile-mode processing";

    productDirection.push("Use quick-pick LCD layouts such as 2x2, 3x3, or 4x4 to size the wall before detailed design.");
    productDirection.push("For fixed tile-mode walls, consider SW-0204-VW or SW-0206-VW before escalating to AVoIP.");
    productDirection.push("If multiview or flexible source routing is required, consider NetworkHD / AVoIP or multiview processing.");
    avoid.push("Do not assume AVoIP is automatically required until wall layout, input mode, and multiview need are confirmed.");
  }

  if (!isWallArrangement(state.displayArrangement) && isMultiZone(state)) {
    architecture = "Distributed AV routing architecture";
    productDirection.push("Consider NetworkHD 100 for cost-effective flexible distribution.");
    productDirection.push("Consider NetworkHD 500 where 4K60 4:4:4, lower latency, stronger USB, or Dante-ready workflows matter.");
    productDirection.push("Consider NetworkHD 600 where lossless zero-latency 10G performance is required.");
    avoid.push("Avoid fixed small switchers if many-to-many routing, zone control, or future expansion is required.");
  }

  if (!isWallArrangement(state.displayArrangement) && !isMultiZone(state) && hasUsbRequirement(state)) {
    architecture = state.usbTransport === "USB 2.0 is enough"
      ? "Primary HDBaseT / integrated HDMI + USB 2.0 transport"
      : "Integrated HDMI/USB or USB-C presentation transport";

    productDirection.push("Use an integrated solution path that carries video and USB together where possible.");
    productDirection.push("If USB 2.0 is enough, prioritise HDBaseT-style integrated transport before higher-bandwidth USB-only options.");
    productDirection.push("Only select USB 3.x-capable paths if high-bandwidth USB devices are confirmed.");
    avoid.push("Do not allow USB 3.x camera or high-bandwidth USB device choices when USB 2.0 is confirmed as sufficient.");
  }

  if (!isWallArrangement(state.displayArrangement) && !isMultiZone(state) && !hasUsbRequirement(state) && distanceRank(state.longestRun) >= 3) {
    architecture = "HDBaseT video transport";
    productDirection.push("Use HDBaseT when the source/display run exceeds practical HDMI distance.");
    productDirection.push("If video-only, select receiver family by distance: RX-35 for shorter HDBaseT runs, RX-70 for longer runs.");
    avoid.push("Avoid over-specifying USB-capable receiver paths if USB transport is not required.");
  }

  if (!isWallArrangement(state.displayArrangement) && !isMultiZone(state) && !hasUsbRequirement(state) && distanceRank(state.longestRun) > 0 && distanceRank(state.longestRun) <= 2) {
    architecture = "Local HDMI / presentation switching";
    productDirection.push("Use a simpler local switching or short HDMI path where distance and behaviour allow.");
    avoid.push("Avoid AVoIP or HDBaseT where a local switcher and short HDMI connection is enough.");
  }

  if (isDualArrangement(state.displayArrangement)) {
    productDirection.push("Dual-screen selection should drive whether mirrored output, independent output, MST, or presentation-plus-conferencing mode is required.");
  }

  if (state.displayArrangement === "Multiview display" || state.displayBehaviour.includes("Multiview") || state.wallMultiview === "Multiview required") {
    productDirection.push("Confirm whether multiview is source composition on one display/canvas or flexible source-per-display routing.");
  }

  if (hasConferencing(state) && !hasUsbRequirement(state)) {
    risks.push("Conferencing selected but USB devices are not yet captured; camera/microphone path is likely missing.");
  }

  const confidence =
    missing.length <= 2 && risks.length <= 2
      ? "High"
      : missing.length <= 5
        ? "Medium"
        : "Low";

  return { architecture, productDirection, avoid, confidence, missing, risks };
}

function ChipButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[34px] items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function ChipGroup({
  title,
  helper,
  options,
  value,
  onSelect,
  multi = false,
}: {
  title: string;
  helper: string;
  options: string[];
  value: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <details className="wm-inline-help">
          <summary aria-label={`Show guidance for ${title}`}>
            <HelpCircle className="h-3.5 w-3.5" />
          </summary>
          <p>{helper}</p>
        </details>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = multi ? Array.isArray(value) && value.includes(option) : value === option;
          return <ChipButton key={option} active={active} label={option} onClick={() => onSelect(option)} />;
        })}
      </div>
    </div>
  );
}

function CountControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-sm font-black text-slate-900">{label}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
        >
          <Minus className="h-4 w-4" />
        </button>

        <span className="min-w-10 rounded-full bg-slate-900 px-3 py-1 text-center text-sm font-black text-white">
          {value}
        </span>

        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StepBadge({
  index,
  activeStepIndex,
  label,
  description,
  onClick,
}: {
  index: number;
  activeStepIndex: number;
  label: string;
  description: string;
  onClick: () => void;
}) {
  const stateClass =
    index < activeStepIndex
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : index === activeStepIndex
        ? "border-amber-300 bg-amber-100 text-amber-900"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      title={description}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${stateClass}`}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-black">
        {index < activeStepIndex ? <Check className="h-4 w-4" /> : index + 1}
      </span>
      <span>
        <span className="block font-black">{label}</span>
      </span>
    </button>
  );
}

function QuestionStrategyCard({
  askFirst,
  why,
  ifUnknown,
  unresolvedCount,
}: {
  askFirst: string;
  why: string;
  ifUnknown: string;
  unresolvedCount: number;
}) {
  return (
    <div className="wm-question-focus rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-sky-700" />
          <p className="text-sm font-black">Ask less, explain more</p>
        </div>
        <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-black text-sky-700">
          {unresolvedCount} validation item{unresolvedCount === 1 ? "" : "s"}
        </span>
      </div>

      <p className="mt-3 text-base font-black leading-6">{askFirst}</p>

      <details className="wm-question-reasoning">
        <summary>Why / unknown path</summary>
        <div>
          <p>
            <strong>Why:</strong> {why}
          </p>
          <p>
            <strong>If unknown:</strong> {ifUnknown}
          </p>
        </div>
      </details>
    </div>
  );
}

function ValueLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "Not captured yet"}</p>
    </div>
  );
}

function ListLine({ label, values }: { label: string; values: string[] }) {
  return <ValueLine label={label} value={values.length ? values.join(", ") : "Not captured yet"} />;
}

export function DiscoveryPage() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [state, setState] = useState<DiscoveryState>(() => normaliseDiscoveryState(initialState));


  useEffect(() => {
    if (!Array.isArray(state.sourcePaths) || state.sourcePaths.length === 0) {
      setState((current) => normaliseDiscoveryState(current));
    }
  }, [state.sourcePaths]);

  const sourcePaths = useMemo(
    () => (Array.isArray(state.sourcePaths) && state.sourcePaths.length > 0 ? state.sourcePaths : [getEmptySourcePath(0)]),
    [state.sourcePaths],
  );
  // wingman: normalise sourcePaths after HMR
  const profile = useMemo(() => getRoomProfile(state.roomType), [state.roomType]);
  const inference = useMemo(() => inferDesign(state), [state]);
  const currentStep = steps[activeStepIndex];
  const currentQuestionStrategy = useMemo(() => getQuestionStrategy(currentStep.id, state), [currentStep.id, state]);
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;

  const displayArrangementOptions = useMemo(() => getDisplayArrangementOptions(state, profile), [state, profile]);
  const displayPositionOptions = useMemo(() => getDisplayPositionOptions(state), [state]);
  const displayBehaviourOptions = useMemo(() => getDisplayBehaviourOptions(state), [state]);
  const meetingWorkflowOptions = useMemo(() => getMeetingWorkflowOptions(state), [state]);
  const usbOptions = useMemo(() => getUsbOptions(state), [state]);
  const cableTypeOptions = useMemo(() => getCableTypeOptions(state), [state]);
  const networkAvailabilityOptions = useMemo(() => getNetworkOptions(state), [state]);
  const isWallMode = isWallArrangement(state.displayArrangement);

  const capturedPercent = useMemo(() => {
    const required = [
      state.roomType,
      state.roomSize,
      state.userPosition,
      state.equipmentLocation,
      state.sourceTypes.length ? "sources" : "",
      state.sourceLocations.length ? "source locations" : "",
      state.sourceConnections.length ? "connections" : "",
      state.displayArrangement,
      state.displayPosition,
      state.displayBehaviour,
      state.longestRun,
      state.cableAvailable.length ? "cable" : "",
      state.budgetStyle,
    ];

    const wallRequired = isWallArrangement(state.displayArrangement)
      ? [state.wallLayout, state.wallInputMode, state.wallMultiview]
      : [];

    const filled = [...required, ...wallRequired].filter(Boolean).length;
    return Math.round((filled / (required.length + wallRequired.length)) * 100);
  }, [state]);

  function setField<K extends keyof DiscoveryState>(key: K, value: DiscoveryState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function applyRoomType(roomType: string) {
    const nextProfile = getRoomProfile(roomType);

    setState((current) => ({
      ...current,
      roomType,
      ...nextProfile.defaults,
    }));
  }

  function chooseDisplayArrangement(value: string) {
    setState((current) => {
      const wallType = isWallArrangement(value) ? value : "";
      const nextDisplayCount = isDualArrangement(value)
        ? Math.max(2, current.displayCount)
        : value === "LCD wall"
          ? Math.max(4, current.displayCount)
          : value === "LED wall"
            ? 1
            : current.displayCount;

      return {
        ...current,
        displayArrangement: value,
        displayCount: nextDisplayCount,
        displayPosition: defaultDisplayPositionForArrangement(value, current.roomType),
        displayBehaviour: "",
        wallType,
        wallLayout: value === "LED wall" ? "Single LED canvas" : value === "LCD wall" ? "2x2 LCD wall" : "",
        wallInputMode: value === "LED wall" ? "Single input canvas" : value === "LCD wall" ? "Single input tile-mode" : "",
        wallMultiview: isWallArrangement(value) ? "Non-multiview" : "",
      };
    });
  }

  function resizeSourcePaths(nextCount: number) {
    setState((current) => {
      const safeCount = Math.max(1, nextCount);
      const sourcePaths = Array.isArray(current.sourcePaths) && current.sourcePaths.length > 0 ? [...current.sourcePaths] : [getEmptySourcePath(0)];

      while (sourcePaths.length < safeCount) {
        sourcePaths.push(getEmptySourcePath(sourcePaths.length));
      }

      const trimmedSourcePaths = sourcePaths.slice(0, safeCount);
      const summary = summarizeSourcePaths(trimmedSourcePaths);

      return {
        ...current,
        sourceCount: safeCount,
        sourcePaths: trimmedSourcePaths,
        ...summary,
      };
    });
  }

  function updateSourcePath(id: string, field: SourcePathField, value: string) {
    setState((current) => {
      const currentSourcePaths = Array.isArray(current.sourcePaths) && current.sourcePaths.length > 0 ? current.sourcePaths : [getEmptySourcePath(0)];
      const nextSourcePaths = currentSourcePaths.map((source) => {
        if (source.id !== id) {
          return source;
        }

        const nextSource = {
          ...source,
          [field]: value,
        };

        if (field === "deviceType") {
          const defaultConnection = defaultConnectionForSourceType(value);
          const connectionOptions = getSourceConnectionOptionsForSourcePath(
            { ...nextSource, outputConnection: defaultConnection },
            current,
            getRoomProfile(current.roomType),
          );

          nextSource.outputConnection = connectionOptions.includes(defaultConnection) ? defaultConnection : "";
          nextSource.destination = source.destination || defaultDestinationForSource(current);
          nextSource.transport = "";
          nextSource.usbRole = "";
        }

        if (field === "outputConnection") {
          nextSource.transport = "";
          nextSource.usbRole = "";
        }

        if (field === "distance") {
          const transportOptions = getSourceTransportOptionsForSourcePath(nextSource, current);

          if (!transportOptions.includes(nextSource.transport)) {
            nextSource.transport = "";
          }
        }

        const compatibleConnections = getSourceConnectionOptionsForSourcePath(nextSource, current, getRoomProfile(current.roomType));

        if (nextSource.outputConnection && !compatibleConnections.includes(nextSource.outputConnection)) {
          nextSource.outputConnection = "";
          nextSource.transport = "";
          nextSource.usbRole = "";
        }

        const compatibleTransport = getSourceTransportOptionsForSourcePath(nextSource, current);

        if (nextSource.transport && !compatibleTransport.includes(nextSource.transport)) {
          nextSource.transport = "";
        }

        const compatibleUsbRoles = getUsbRoleOptionsForSourcePath(nextSource, current);

        if (nextSource.usbRole && !compatibleUsbRoles.includes(nextSource.usbRole)) {
          nextSource.usbRole = "";
        }

        return nextSource;
      });

      const summary = summarizeSourcePaths(nextSourcePaths);
      const hasUsbCameraSource = nextSourcePaths.some((source) => source.deviceType === "USB camera" || source.outputConnection === "USB only");

      return {
        ...current,
        sourcePaths: nextSourcePaths,
        sourceCount: nextSourcePaths.length,
        ...summary,
        usbTransport:
          hasUsbCameraSource && (!current.usbTransport || current.usbTransport === "No USB required")
            ? "USB 2.0 is enough"
            : current.usbTransport,
        usbNeeds:
          hasUsbCameraSource && !current.usbNeeds.includes("USB camera")
            ? unique([...current.usbNeeds.filter((need) => need !== "No USB required"), "USB camera"])
            : current.usbNeeds,
      };
    });
  }
  function chooseMeetingWorkflow(value: string) {
    setState((current) => {
      if (value === "Presentation only") {
        return {
          ...current,
          meetingWorkflow: value,
          usbTransport: current.usbTransport || "No USB required",
          usbNeeds: current.usbTransport ? current.usbNeeds : ["No USB required"],
          cameraPosition: current.usbTransport ? current.cameraPosition : "No camera",
        };
      }

      if (["BYOM conferencing", "Room PC conferencing", "MTR / Zoom Room", "Wireless conferencing"].includes(value)) {
        return {
          ...current,
          meetingWorkflow: value,
          usbTransport: current.usbTransport && current.usbTransport !== "No USB required" ? current.usbTransport : "USB 2.0 is enough",
          usbNeeds: current.usbNeeds.filter((need) => need !== "No USB required"),
        };
      }

      return { ...current, meetingWorkflow: value };
    });
  }

  function chooseUsbTransport(value: string) {
    setState((current) => {
      if (value === "No USB required") {
        const currentSourcePaths = Array.isArray(current.sourcePaths) && current.sourcePaths.length > 0 ? current.sourcePaths : [getEmptySourcePath(0)];
        const sourcePaths = currentSourcePaths.map((source) => {
          if (source.deviceType === "USB camera" || source.outputConnection === "USB only") {
            return {
              ...source,
              deviceType: "",
              outputConnection: "",
              transport: "",
              usbRole: "",
            };
          }

          return source;
        });

        const summary = summarizeSourcePaths(sourcePaths);

        return {
          ...current,
          usbTransport: value,
          usbNeeds: ["No USB required"],
          cameraPosition: "No camera",
          sourcePaths,
          ...summary,
        };
      }

      const sourcePaths = current.sourcePaths.map((source) => {
        const transportOptions = getSourceTransportOptionsForSourcePath(source, { ...current, usbTransport: value });

        return {
          ...source,
          transport: transportOptions.includes(source.transport) ? source.transport : "",
          usbRole: getUsbRoleOptionsForSourcePath(source, { ...current, usbTransport: value }).includes(source.usbRole)
            ? source.usbRole
            : "",
        };
      });

      const summary = summarizeSourcePaths(sourcePaths);

      return {
        ...current,
        usbTransport: value,
        usbNeeds: filterCompatibleUsbNeeds(value, current.usbNeeds.filter((need) => need !== "No USB required")),
        sourcePaths,
        ...summary,
      };
    });
  }

  function chooseLongestRun(value: string) {
    setState((current) => {
      const virtualState = { ...current, longestRun: value };
      const allowedCable = getCableTypeOptions(virtualState);
      return {
        ...current,
        longestRun: value,
        cableAvailable: current.cableAvailable.filter((cable) => allowedCable.includes(cable)),
      };
    });
  }

  function toggleMulti(key: MultiSelectKey, value: string) {
    setState((current) => {
      const existing = current[key];
      const nextValues = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      return {
        ...current,
        [key]: nextValues,
      } as DiscoveryState;
    });
  }

  function saveDiscoveryBrief() {
    const brief = {
      savedAt: new Date().toISOString(),
      roomModel: state,
      inference,
      capturedPercent,
      returnRoute: routeCatalogByKey.discovery.path,
    };

    window.localStorage.setItem("wingman-discovery-brief", JSON.stringify(brief));
    const project = saveDiscoveryBriefToProject(brief);
    window.localStorage.setItem(
      "wingman-workflow-context",
      JSON.stringify({
        source: "discovery",
        savedAt: brief.savedAt,
        projectStage: "Discovery",
        projectId: project.id,
        nextRecommendedRoute: routeCatalogByKey.finder.path,
        returnRoute: routeCatalogByKey.discovery.path,
        brief,
      }),
    );

    window.dispatchEvent(new CustomEvent("wingman:discovery-brief-saved", { detail: brief }));
  }

  function renderSourcePathCard(source: SourcePath, index: number) {
    const connectionOptions = getSourceConnectionOptionsForSourcePath(source, state, profile);
    const destinationOptions = getSourceDestinationOptions(state);
    const transportOptions = getSourceTransportOptionsForSourcePath(source, state);
    const usbRoleOptions = getUsbRoleOptionsForSourcePath(source, state);

    return (
      <div key={source.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">{source.name || `Source ${index + 1}`}</p>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
            Path {index + 1}
          </span>
        </div>

        <div className="grid gap-5">
          <ChipGroup
            title="Source device"
            helper="What is physically generating the signal?"
            options={profile.sourceTypeOptions}
            value={source.deviceType}
            onSelect={(value) => updateSourcePath(source.id, "deviceType", value)}
          />

          <ChipGroup
            title="Source location"
            helper="Where is this source located in the room or venue?"
            options={profile.sourceLocationOptions}
            value={source.location}
            onSelect={(value) => updateSourcePath(source.id, "location", value)}
          />

          <ChipGroup
            title="Source output connector"
            helper="This is filtered from the selected source device and USB transport choice."
            options={connectionOptions}
            value={source.outputConnection}
            onSelect={(value) => updateSourcePath(source.id, "outputConnection", value)}
          />

          <ChipGroup
            title="Destination / system input"
            helper="Where does this source feed first?"
            options={destinationOptions}
            value={source.destination}
            onSelect={(value) => updateSourcePath(source.id, "destination", value)}
          />

          <ChipGroup
            title="Source-to-destination distance"
            helper="This helps Wingman choose HDMI, HDBaseT, AVoIP, fibre, or USB extension correctly."
            options={runBands}
            value={source.distance}
            onSelect={(value) => updateSourcePath(source.id, "distance", value)}
          />

          <ChipGroup
            title="Transport method"
            helper="This is filtered by connector, distance, USB class, and application type."
            options={transportOptions}
            value={source.transport}
            onSelect={(value) => updateSourcePath(source.id, "transport", value)}
          />

          <ChipGroup
            title="USB role for this source"
            helper="Only relevant when this source carries USB or is a USB peripheral."
            options={usbRoleOptions}
            value={source.usbRole}
            onSelect={(value) => updateSourcePath(source.id, "usbRole", value)}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Signal path summary</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
              {(source.deviceType || "Source")} at {(source.location || "unknown location")} outputs{" "}
              {(source.outputConnection || "unknown connection")} to {(source.destination || "unknown destination")} over{" "}
              {(source.transport || "unconfirmed transport")}.
            </p>
          </div>
        </div>
      </div>
    );
  }
  function renderWallQuickPick() {
    if (!isWallMode) return null;

    const isLedWall = state.displayArrangement === "LED wall";
    const wallLayoutOptions = isLedWall ? ledWallLayouts : lcdWallLayouts;
    const wallInputOptions = isLedWall ? ledWallInputModes : lcdWallInputModes;

    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-700" />
              <p className="text-sm font-black text-amber-950">Wall quick pick</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              Quick-pick captures enough to qualify the opportunity. Use the wall wizard for detailed layout, source,
              multiview, processor, bezel, or LED canvas sizing.
            </p>
          </div>

          <Link
            to={routeCatalogByKey.videowall.path}
            onClick={saveDiscoveryBrief}
            className="rounded-full bg-amber-600 px-4 py-2 text-xs font-black text-white transition hover:bg-amber-700"
          >
            Open wall wizard
          </Link>
        </div>

        <div className="mt-4 grid gap-4">
          <ChipGroup
            title={isLedWall ? "LED wall canvas" : "LCD wall layout"}
            helper={isLedWall ? "LED should normally be treated as a single input canvas unless multiview is composed upstream." : "Choose a common LCD layout for quick qualification."}
            options={wallLayoutOptions}
            value={state.wallLayout}
            onSelect={(value) => setField("wallLayout", value)}
          />

          <ChipGroup
            title="Input mode"
            helper={isLedWall ? "LED defaults to a single input canvas." : "Single input tile-mode is different from screen-driven / input-per-display behaviour."}
            options={wallInputOptions}
            value={state.wallInputMode}
            onSelect={(value) => setField("wallInputMode", value)}
          />

          <ChipGroup
            title="Multiview requirement"
            helper="This changes whether simple tile/canvas handling is enough or whether upstream composition/routing is required."
            options={wallMultiviewModes}
            value={state.wallMultiview}
            onSelect={(value) => setField("wallMultiview", value)}
          />
        </div>
      </div>
    );
  }

  function renderStep(stepId: StepId) {
    if (stepId === "useCase") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="Room / application type"
            helper="Select the application. Wingman applies sensible defaults and filters later options."
            options={roomTypes}
            value={state.roomType}
            onSelect={applyRoomType}
          />

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-amber-700" />
              <p className="text-sm font-black text-amber-950">Wingman assumption</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-900">{profile.note}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">Customer wording / unusual notes</p>
            <textarea
              value={state.notes}
              onChange={(event) => setField("notes", event.target.value)}
              placeholder="Optional. Capture anything the customer says that does not fit the quick-click options."
              className="mt-3 min-h-[88px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
          </div>
        </div>
      );
    }

    if (stepId === "layout") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="Room size"
            helper="Options are filtered by application. Multi-zone venues default to extra-large or open spaces."
            options={profile.roomSizeOptions}
            value={state.roomSize}
            onSelect={(value) => setField("roomSize", value)}
          />

          <ChipGroup
            title="Main user / source position"
            helper="Where does the user normally present, operate, or connect from?"
            options={profile.userPositionOptions}
            value={state.userPosition}
            onSelect={(value) => setField("userPosition", value)}
          />

          <ChipGroup
            title="Equipment position"
            helper="This affects whether the system is local switching, HDBaseT, AVoIP, or mixed transport."
            options={profile.equipmentLocationOptions}
            value={state.equipmentLocation}
            onSelect={(value) => setField("equipmentLocation", value)}
          />

          <ChipGroup
            title="Layout flags"
            helper="Only select flags that change architecture, risk, or future expansion."
            options={layoutFlags}
            value={state.layoutFlags}
            onSelect={(value) => toggleMulti("layoutFlags", value)}
            multi
          />
        </div>
      );
    }

    if (stepId === "sources") {
      return (
        <div className="grid gap-5">
          <CountControl
            label="Number of source positions"
            value={sourcePaths.length}
            onChange={resizeSourcePaths}
          />

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Cable className="h-5 w-5 text-amber-700" />
              <p className="text-sm font-black text-amber-950">Source path logic</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Each source is now captured as a signal path: device, location, output connector, destination, distance,
              transport method, and USB role. This prevents Wingman from collecting disconnected tags that cannot drive
              accurate product selection.
            </p>
          </div>

          {sourcePaths.map((source, index) => renderSourcePathCard(source, index))}
        </div>
      );
    }
    if (stepId === "outputs") {
      return (
        <div className="grid gap-5">
          <CountControl
            label="Number of display/output positions"
            value={state.displayCount}
            onChange={(value) => setField("displayCount", value)}
          />

          <ChipGroup
            title="Display arrangement"
            helper="This list is filtered by the selected application."
            options={displayArrangementOptions}
            value={state.displayArrangement}
            onSelect={chooseDisplayArrangement}
          />

          <ChipGroup
            title="Display position"
            helper="Dual displays show dual-screen positions; walls show wall positions; multi-zone shows distributed positions."
            options={displayPositionOptions}
            value={state.displayPosition}
            onSelect={(value) => setField("displayPosition", value)}
          />

          <ChipGroup
            title="Display behaviour"
            helper="Behaviour options are based on the display arrangement selected above."
            options={displayBehaviourOptions}
            value={state.displayBehaviour}
            onSelect={(value) => setField("displayBehaviour", value)}
          />

          {renderWallQuickPick()}
        </div>
      );
    }

    if (stepId === "usb") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="USB transport class"
            helper="Choose this first. USB 2.0 removes high-bandwidth devices and keeps the design on the primary HDBaseT / integrated-transport path."
            options={usbTransportOptions}
            value={state.usbTransport}
            onSelect={chooseUsbTransport}
          />

          <ChipGroup
            title="Meeting / user workflow"
            helper="Workflow choices are filtered by application."
            options={meetingWorkflowOptions}
            value={state.meetingWorkflow}
            onSelect={chooseMeetingWorkflow}
          />

          <ChipGroup
            title="Compatible USB devices"
            helper="This list is filtered by the USB transport class. High-bandwidth options only appear when USB 3.x is selected."
            options={usbOptions}
            value={state.usbNeeds}
            onSelect={(value) => toggleMulti("usbNeeds", value)}
            multi
          />

          <ChipGroup
            title="Camera position"
            helper="Camera position affects USB, NDI, HDMI, and cable routing."
            options={cameraPositions}
            value={state.cameraPosition}
            onSelect={(value) => setField("cameraPosition", value)}
          />

          <ChipGroup
            title="Audio requirement"
            helper="Audio can change product family, DSP handoff, and proposal scope."
            options={audioNeedsBase}
            value={state.audioNeeds}
            onSelect={(value) => toggleMulti("audioNeeds", value)}
            multi
          />
        </div>
      );
    }

    if (stepId === "infrastructure") {
      return (
        <div className="grid gap-5">
          <ChipGroup
            title="Longest signal run"
            helper="This drives transport. Longer runs automatically remove unsuitable short-distance cable assumptions."
            options={runBands}
            value={state.longestRun}
            onSelect={chooseLongestRun}
          />

          <ChipGroup
            title="Compatible cable / pathway"
            helper="This list is filtered by distance, AVoIP/NDI need, and multi-zone logic."
            options={cableTypeOptions}
            value={state.cableAvailable}
            onSelect={(value) => toggleMulti("cableAvailable", value)}
            multi
          />

          <ChipGroup
            title="Network availability"
            helper="Network options change when NetworkHD, NDI, control, streaming, or multi-zone routing is likely."
            options={networkAvailabilityOptions}
            value={state.networkAvailability}
            onSelect={(value) => setField("networkAvailability", value)}
          />

          <ChipGroup
            title="Known infrastructure risks"
            helper="These directly affect confidence and whether the rep should present the design or request more information."
            options={cableRiskOptions}
            value={state.cableRisks}
            onSelect={(value) => toggleMulti("cableRisks", value)}
            multi
          />
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        <ChipGroup
          title="Control needs"
          helper="Control and operation should be included before product recommendation."
          options={controlOptions}
          value={state.controlNeeds}
          onSelect={(value) => toggleMulti("controlNeeds", value)}
          multi
        />

        <ChipGroup
          title="Budget posture"
          helper="Used only to avoid over-engineering or under-specifying the technical recommendation."
          options={budgetOptions}
          value={state.budgetStyle}
          onSelect={(value) => setField("budgetStyle", value)}
        />

        <ChipGroup
          title="Confidence / validation flags"
          helper="Select anything that should stop Wingman from producing an over-confident recommendation."
          options={confidenceOptions}
          value={state.confidenceFlags}
          onSelect={(value) => toggleMulti("confidenceFlags", value)}
          multi
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-slate-900">
            <Network className="h-5 w-5 text-amber-600" />
            <p className="font-black">Inferred architecture</p>
          </div>

          <p className="mt-3 text-lg font-black text-slate-950">{inference.architecture}</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black text-slate-900">Likely product direction</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {inference.productDirection.length ? (
                  inference.productDirection.map((item) => <li key={item}>- {item}</li>)
                ) : (
                  <li>- More information is required before a reliable product direction can be stated.</li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">Avoid / do not assume</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {inference.avoid.length ? (
                  inference.avoid.map((item) => <li key={item}>- {item}</li>)
                ) : (
                  <li>- No avoid flags yet. Continue validating distance, USB, resolution, and behaviour.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Guided Customer Discovery"
        title="Ask only the questions that move the design forward."
        purpose="Wingman now adapts discovery questions to the selected application and likely technical path, then explains why each answer matters so sales users are not forced through a blind AV checklist."
        nextMove="Select the use case, follow the ask-first guidance, and leave unknown details as validation items instead of guessing."
        actions={[
          { label: "Open Product Finder", to: routeCatalogByKey.finder.path },
          { label: "Save to Projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SalesToneQuickSetter context="discovery" />

      
      <SourceDeviceCollator />
<SectionCard
        title="Dynamic discovery workflow"
        subtitle="The workflow behaves like a guided conversation: application-specific questions, filtered choices, visible assumptions, and a safe path when the customer does not know."
      >
        <div className="wm-discovery-workflow grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <div className="wm-workflow-rail rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">Workflow path</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                {activeStepIndex + 1} / {steps.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {steps.map((step, index) => (
                <StepBadge
                  key={step.id}
                  index={index}
                  activeStepIndex={activeStepIndex}
                  label={step.label}
                  description={step.description}
                  onClick={() => setActiveStepIndex(index)}
                />
              ))}
            </div>
          </div>

          <div className="wm-workflow-main rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Current step: {currentStep.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{currentStep.description}</p>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                {capturedPercent}% design model captured
              </span>
            </div>

            <div className="mt-6 grid gap-5">
              <QuestionStrategyCard
                askFirst={currentQuestionStrategy.askFirst}
                why={currentQuestionStrategy.why}
                ifUnknown={currentQuestionStrategy.ifUnknown}
                unresolvedCount={inference.missing.length + inference.risks.length}
              />
              {renderStep(currentStep.id)}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
                disabled={isFirstStep}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={routeCatalogByKey.callCards.path}
                  onClick={saveDiscoveryBrief}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Open call cards
                </Link>

                {isLastStep ? (
                  <Link
                    to={routeCatalogByKey.finder.path}
                    onClick={saveDiscoveryBrief}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4" />
                    Save & push to Finder
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveStepIndex((current) => Math.min(steps.length - 1, current + 1))}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="wm-workflow-insight grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-slate-500" />
                <p className="text-sm font-black text-slate-900">Live room model</p>
              </div>

              <div className="mt-4 space-y-4 text-sm">
                <ValueLine label="Room type" value={state.roomType} />
                <ValueLine label="Room size" value={state.roomSize} />
                <ValueLine label="User position" value={state.userPosition} />
                <ValueLine label="Equipment position" value={state.equipmentLocation} />
                <ListLine label="Sources" values={state.sourceTypes} />
                <ListLine label="Source locations" values={state.sourceLocations} />
                <ListLine label="Source connections" values={state.sourceConnections} />
                <ValueLine label="Display arrangement" value={state.displayArrangement} />
                <ValueLine label="Display position" value={state.displayPosition} />
                <ValueLine label="Display behaviour" value={state.displayBehaviour} />
                <ValueLine label="USB transport" value={state.usbTransport} />
                <ListLine label="USB devices" values={state.usbNeeds} />
                <ValueLine label="Longest run" value={state.longestRun} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Cable className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-black text-slate-900">Architecture direction</p>
              </div>

              <p className="mt-3 text-base font-black text-slate-950">{inference.architecture}</p>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Confidence</p>
                <p
                  className={`mt-1 text-lg font-black ${
                    inference.confidence === "High"
                      ? "text-emerald-700"
                      : inference.confidence === "Medium"
                        ? "text-amber-700"
                        : "text-red-700"
                  }`}
                >
                  {inference.confidence}
                </p>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    Missing detail
                  </div>
                  <ul className="mt-2 space-y-1 text-slate-600">
                    {inference.missing.length ? (
                      inference.missing.slice(0, 6).map((item) => <li key={item}>- {item}</li>)
                    ) : (
                      <li>- No major missing details detected.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Risks
                  </div>
                  <ul className="mt-2 space-y-1 text-slate-600">
                    {inference.risks.length ? (
                      inference.risks.slice(0, 6).map((item) => <li key={item}>- {item}</li>)
                    ) : (
                      <li>- No major risk flags yet.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <Camera className="h-4 w-4 text-slate-500" />
                    Next design move
                  </div>
                  <p className="mt-2 text-slate-600">
                    {isLastStep
                      ? "Save the structured brief and continue into Product Finder."
                      : "Continue the dynamic workflow until the room model is complete enough to recommend with confidence."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default DiscoveryPage;
