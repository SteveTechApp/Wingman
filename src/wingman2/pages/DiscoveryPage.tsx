import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cable,
  Camera,
  Check,
  Circle,
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
import { SectionCard } from "../components/SectionCard";

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
  displayCount: number;
  displayArrangement: string;
  displayPosition: string;
  displayBehaviour: string;
  wallType: string;
  wallLayout: string;
  wallInputMode: string;
  wallMultiview: string;
  meetingWorkflow: string;
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
    description: "Capture source types, source positions, and connection types.",
  },
  {
    id: "outputs",
    label: "Outputs",
    description: "Define display arrangement, display position, behaviour, and wall requirements.",
  },
  {
    id: "usb",
    label: "USB / Conferencing",
    description: "Capture BYOD, BYOM, cameras, microphones, speakerphones, and USB transport.",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    description: "Confirm distance, cable, network, and installation risk.",
  },
  {
    id: "review",
    label: "Review",
    description: "Review the inferred architecture, missing detail, and recommendation confidence.",
  },
];

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

const roomSizeBase = ["Small <10m", "Medium <25m", "Large <50m", "Extra-large 50m+", "Open / divisible space", "Unknown"];

const layoutFlags = [
  "Fixed orientation",
  "Divisible space",
  "Repeater displays",
  "Future expansion",
  "No rack available",
  "Customer unsure",
];

const allSourceTypes = [
  "Laptop HDMI",
  "Laptop USB-C",
  "Room PC",
  "Media player",
  "Signage player",
  "Wireless presentation",
  "HDMI wall input",
  "USB-C wall input",
  "Document camera",
  "USB camera",
  "NDI camera",
  "PTZ camera",
  "Other source",
];

const allSourceLocations = [
  "Table",
  "Floor box",
  "Wall plate",
  "Lectern",
  "Rack",
  "Credenza",
  "Ceiling",
  "Camera position",
  "Display wall",
  "Zone location",
  "Unknown",
];

const allSourceConnections = [
  "HDMI",
  "USB-C video",
  "USB-C with charging",
  "USB only",
  "NDI",
  "Network",
  "Audio only",
  "Wireless",
  "Unknown",
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

const usbNeedsBase = [
  "No USB required",
  "USB camera",
  "Speakerphone",
  "Microphone",
  "Touch display return",
  "Keyboard / mouse",
  "Multiple USB devices",
  "USB 2.0 enough",
  "USB 3.x required",
  "Not sure",
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

const cableTypes = ["HDMI", "Cat5e", "Cat6", "Cat6A", "Fibre", "Network only", "No cable installed", "Unknown"];

const networkOptions = [
  "No network needed",
  "Existing IT network",
  "Dedicated AV network possible",
  "Managed switch available",
  "10G available",
  "Unknown",
];

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
  displayCount: 1,
  displayArrangement: "",
  displayPosition: "",
  displayBehaviour: "",
  wallType: "",
  wallLayout: "",
  wallInputMode: "",
  wallMultiview: "",
  meetingWorkflow: "",
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

function getRoomProfile(roomType: string): RoomProfile {
  if (roomType === "Multi-zone venue") {
    return {
      note: "Wingman assumes a multi-zone venue is normally extra-large, has distributed displays, and should be treated as a routing / distribution problem rather than a single-room switcher.",
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
      note: "Wingman treats this as an LCD or LED wall qualification first, then either quick-picks a common layout or hands off to the wall wizard for detailed design.",
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
      note: "Wingman assumes signage and hospitality applications are often display-distribution or repeatable-zone systems, so source location, display count, and cable distance become more important than room-table layout.",
      defaults: {
        roomSize: "Large <50m",
        userPosition: "No fixed user position",
        equipmentLocation: "Central rack",
        displayCount: 3,
        displayArrangement: "Distributed displays",
        displayPosition: "Distributed displays",
        displayBehaviour: "Signage loop",
        meetingWorkflow: "Presentation only",
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

  if (roomType === "Classroom" || roomType === "Training room" || roomType === "Lecture space") {
    return {
      note: "Wingman assumes a teaching space is usually lectern or instructor-position driven, with display/projector extension, possible capture, and optional USB teaching peripherals.",
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

  if (roomType === "Control room") {
    return {
      note: "Wingman assumes a control room may need multiview, operator positions, and flexible source selection. This should bias the output step toward multiview and distributed routing choices.",
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
      note: "Wingman assumes a worship space may include long cable paths, cameras, streaming, confidence displays, and central AV control.",
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

  if (roomType === "Boardroom") {
    return {
      note: "Wingman assumes a boardroom may need dual displays, table inputs, conferencing, USB transport, and a cleaner user-facing experience.",
      defaults: {
        roomSize: "Medium <25m",
        userPosition: "Central table",
        equipmentLocation: "Credenza",
        displayCount: 2,
        displayArrangement: "Content display + conferencing display",
        displayPosition: "Content display + conferencing display",
        displayBehaviour: "Presentation on one display, conferencing on the other",
        meetingWorkflow: "BYOM conferencing",
      },
      roomSizeOptions: ["Medium <25m", "Large <50m", "Small <10m", "Unknown"],
      userPositionOptions: ["Central table", "Credenza", "No fixed user position", "Unknown"],
      equipmentLocationOptions: ["Credenza", "Behind display", "Local rack", "Under table", "Unknown"],
      sourceTypeOptions: ["Laptop USB-C", "Laptop HDMI", "Room PC", "Wireless presentation", "USB camera", "PTZ camera", "Other source"],
      sourceLocationOptions: ["Table", "Floor box", "Wall plate", "Credenza", "Camera position", "Unknown"],
      sourceConnectionOptions: ["USB-C with charging", "USB-C video", "HDMI", "USB only", "Wireless", "Unknown"],
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

function isDualArrangement(value: string) {
  return value.includes("Dual") || value.includes("Content display") || value.includes("confidence monitor");
}

function isWallArrangement(value: string) {
  return value === "LCD wall" || value === "LED wall";
}

function isMultiZone(state: DiscoveryState) {
  return state.roomType === "Multi-zone venue" || state.displayArrangement === "Distributed displays" || state.displayArrangement === "Multiple zones" || state.displayArrangement === "Choose source per zone";
}

function hasUsbRequirement(state: DiscoveryState) {
  return (
    state.usbNeeds.length > 0 &&
    !state.usbNeeds.includes("No USB required") &&
    !state.usbNeeds.every((item) => item === "Not sure")
  );
}

function hasConferencing(state: DiscoveryState) {
  return includesAny([state.meetingWorkflow], ["BYOM conferencing", "Room PC conferencing", "MTR / Zoom Room", "Wireless conferencing"]);
}

function distanceRank(longestRun: string) {
  if (longestRun === "Under 5m") {
    return 1;
  }

  if (longestRun === "5-10m") {
    return 2;
  }

  if (longestRun === "10-35m") {
    return 3;
  }

  if (longestRun === "35-70m") {
    return 4;
  }

  if (longestRun === "70-100m") {
    return 5;
  }

  if (longestRun === "100m+") {
    return 6;
  }

  return 0;
}

function getDisplayArrangementOptions(state: DiscoveryState, profile: RoomProfile) {
  if (state.roomType === "Display wall / large format wall") {
    return wallDisplayArrangements;
  }

  if (state.roomType === "Multi-zone venue") {
    return multiZoneDisplayArrangements;
  }

  if (state.roomType === "Control room") {
    return ["Multiview display", "Distributed displays", "LCD wall", "LED wall", "Single display"];
  }

  if (state.roomType === "Retail signage" || state.roomType === "Hospitality") {
    return ["Distributed displays", "Single display", "LCD wall", "LED wall"];
  }

  if (isDualArrangement(state.displayArrangement)) {
    return dualDisplayArrangements;
  }

  return unique([...standardDisplayArrangements, ...profile.defaults.displayArrangement ? [profile.defaults.displayArrangement as string] : []]);
}

function getDisplayPositionOptions(state: DiscoveryState) {
  if (isWallArrangement(state.displayArrangement) || state.wallType) {
    return wallDisplayPositions;
  }

  if (isDualArrangement(state.displayArrangement)) {
    return dualDisplayPositions;
  }

  if (isMultiZone(state)) {
    return multiZoneDisplayPositions;
  }

  return standardDisplayPositions;
}

function getDisplayBehaviourOptions(state: DiscoveryState) {
  if (isWallArrangement(state.displayArrangement) || state.wallType) {
    return wallDisplayBehaviours;
  }

  if (isDualArrangement(state.displayArrangement)) {
    return dualDisplayBehaviours;
  }

  if (isMultiZone(state)) {
    return multiZoneDisplayBehaviours;
  }

  if (state.displayArrangement === "Multiview display") {
    return ["Multiple sources on one screen", "Operator selectable layouts", "Static multiview layout", "Future expansion required"];
  }

  return standardDisplayBehaviours;
}

function getMeetingWorkflowOptions(state: DiscoveryState) {
  if (state.roomType === "Retail signage" || state.roomType === "Hospitality") {
    return ["Presentation only", "Streaming / recording", "Not sure"];
  }

  if (state.roomType === "House of worship") {
    return ["Streaming / recording", "Presentation only", "BYOD presentation", "Not sure"];
  }

  if (state.roomType === "Control room") {
    return ["Presentation only", "Streaming / recording", "Not sure"];
  }

  if (state.roomType === "Display wall / large format wall") {
    return ["Presentation only", "Streaming / recording", "Not sure"];
  }

  return meetingWorkflowBase;
}

function getUsbOptions(state: DiscoveryState) {
  if (state.meetingWorkflow === "Presentation only" || state.roomType === "Retail signage" || state.roomType === "Hospitality") {
    return ["No USB required", "Touch display return", "Keyboard / mouse", "Not sure"];
  }

  if (hasConferencing(state)) {
    return ["USB camera", "Speakerphone", "Microphone", "Multiple USB devices", "USB 2.0 enough", "USB 3.x required", "Not sure"];
  }

  return usbNeedsBase;
}

function defaultDisplayPositionForArrangement(value: string, roomType: string) {
  if (value === "LCD wall" || value === "LED wall") {
    return "Primary feature wall";
  }

  if (value === "Distributed displays" || value === "Multiple zones" || roomType === "Multi-zone venue") {
    return "Distributed displays";
  }

  if (value === "Content display + conferencing display") {
    return "Content display + conferencing display";
  }

  if (value === "Primary display + confidence monitor") {
    return "Front display + confidence monitor";
  }

  if (value.includes("Dual")) {
    return "Dual displays on front wall";
  }

  if (value === "Projector") {
    return "Ceiling projector";
  }

  return "Front wall";
}

function inferDesign(state: DiscoveryState): Inference {
  const missing: string[] = [];
  const risks: string[] = [];
  const productDirection: string[] = [];
  const avoid: string[] = [];

  if (!state.roomType) {
    missing.push("Room/application type");
  }

  if (!state.roomSize) {
    missing.push("Room size");
  }

  if (!state.userPosition) {
    missing.push("Main user/source position");
  }

  if (!state.equipmentLocation) {
    missing.push("Equipment/rack location");
  }

  if (!state.sourceTypes.length) {
    missing.push("Source types");
  }

  if (!state.sourceLocations.length) {
    missing.push("Source locations");
  }

  if (!state.displayArrangement) {
    missing.push("Display arrangement");
  }

  if (!state.displayPosition) {
    missing.push("Display position");
  }

  if (!state.displayBehaviour) {
    missing.push("Display behaviour");
  }

  if (isWallArrangement(state.displayArrangement) && !state.wallLayout) {
    missing.push("LCD/LED wall layout");
  }

  if (isWallArrangement(state.displayArrangement) && !state.wallInputMode) {
    missing.push("Wall input mode");
  }

  if (isWallArrangement(state.displayArrangement) && !state.wallMultiview) {
    missing.push("Wall multiview requirement");
  }

  if (!state.longestRun || state.longestRun === "Unknown") {
    missing.push("Longest cable run");
  }

  if (!state.cableAvailable.length || state.cableAvailable.includes("Unknown")) {
    missing.push("Installed cable type/grade");
  }

  if (hasUsbRequirement(state) && (!state.meetingWorkflow || state.meetingWorkflow === "Not sure")) {
    missing.push("USB/conferencing workflow");
  }

  if (state.cableRisks.includes("Cable not certified")) {
    risks.push("Cable is not certified; verify cable grade before committing to maximum distance/resolution.");
  }

  if (state.cableRisks.includes("Distance not confirmed")) {
    risks.push("Distance is not confirmed; transport method and receiver choice may change.");
  }

  if (state.cableRisks.includes("Shared IT network")) {
    risks.push("Shared IT network may restrict AVoIP multicast, QoS, IGMP, or bandwidth behaviour.");
  }

  if (state.usbNeeds.includes("USB 3.x required")) {
    risks.push("USB 3.x requirement must be verified before selecting USB transport hardware.");
  }

  if (state.networkAvailability === "Existing IT network" && isMultiZone(state)) {
    risks.push("NetworkHD / AVoIP design needs IT confirmation before final hardware selection.");
  }

  let architecture = "Structured presentation / extension system";

  if (state.displayArrangement === "LED wall") {
    architecture =
      state.wallMultiview === "Multiview required"
        ? "LED wall with upstream multiview composition feeding a single LED canvas"
        : "LED wall single-input canvas path";

    productDirection.push("Treat LED as a single input canvas into the LED controller unless multiview composition is required upstream.");
    productDirection.push("Use the wall wizard for LED canvas dimensions, pixel pitch, processor handoff, and source behaviour.");
    avoid.push("Do not treat LED as a normal multi-output LCD tile wall unless the LED processor specifically requires that topology.");
  }

  if (state.displayArrangement === "LCD wall") {
    architecture =
      state.wallInputMode === "Screen-driven / input-per-display"
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
    architecture = "Integrated HDMI/USB or USB-C presentation transport";
    productDirection.push("Use an integrated solution path that carries video and USB together where possible.");
    productDirection.push("Check SW-130-TX-UK / SW-130-TX-US with RX-500 where in-wall HDMI/USB-C plus USB transport is required.");
    productDirection.push("Check SW-120-TX3 family with RX3-100 where HDBaseT 3.0 style performance is more appropriate.");
    avoid.push("Do not treat HDMI and USB as separate extender products unless the installation genuinely requires split paths.");
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

  return {
    architecture,
    productDirection,
    avoid,
    confidence,
    missing,
    risks,
  };
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
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
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
        <p className="mt-1 text-xs text-slate-500">Use quick controls during the live call.</p>
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
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${stateClass}`}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-black">
        {index < activeStepIndex ? <Check className="h-4 w-4" /> : index + 1}
      </span>
      <span>
        <span className="block font-black">{label}</span>
        <span className="mt-1 block text-xs opacity-75">{description}</span>
      </span>
    </button>
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
  const [state, setState] = useState<DiscoveryState>(initialState);

  const profile = useMemo(() => getRoomProfile(state.roomType), [state.roomType]);
  const inference = useMemo(() => inferDesign(state), [state]);
  const currentStep = steps[activeStepIndex];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;

  const displayArrangementOptions = useMemo(() => getDisplayArrangementOptions(state, profile), [state, profile]);
  const displayPositionOptions = useMemo(() => getDisplayPositionOptions(state), [state]);
  const displayBehaviourOptions = useMemo(() => getDisplayBehaviourOptions(state), [state]);
  const meetingWorkflowOptions = useMemo(() => getMeetingWorkflowOptions(state), [state]);
  const usbOptions = useMemo(() => getUsbOptions(state), [state]);
  const isWallMode = isWallArrangement(state.displayArrangement);

  const capturedPercent = useMemo(() => {
    const required = [
      state.roomType,
      state.roomSize,
      state.userPosition,
      state.equipmentLocation,
      state.sourceTypes.length ? "sources" : "",
      state.sourceLocations.length ? "source locations" : "",
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
    window.localStorage.setItem(
      "wingman-workflow-context",
      JSON.stringify({
        source: "discovery",
        savedAt: brief.savedAt,
        projectStage: "Discovery",
        nextRecommendedRoute: routeCatalogByKey.finder.path,
        returnRoute: routeCatalogByKey.discovery.path,
        brief,
      }),
    );

    window.dispatchEvent(new CustomEvent("wingman:discovery-brief-saved", { detail: brief }));
  }

  function renderWallQuickPick() {
    if (!isWallMode) {
      return null;
    }

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
            helper={
              isLedWall
                ? "LED should normally be treated as a single input canvas unless multiview is composed upstream."
                : "Choose a common LCD layout for quick qualification."
            }
            options={wallLayoutOptions}
            value={state.wallLayout}
            onSelect={(value) => setField("wallLayout", value)}
          />

          <ChipGroup
            title="Input mode"
            helper={
              isLedWall
                ? "LED defaults to a single input canvas."
                : "Single input tile-mode is different from screen-driven / input-per-display behaviour."
            }
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
            helper="Select the application. Wingman will apply sensible defaults and filter later options."
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
            helper="Options are filtered by application. For example, multi-zone venues default to extra-large or open spaces."
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
            value={state.sourceCount}
            onChange={(value) => setField("sourceCount", value)}
          />

          <ChipGroup
            title="Source types"
            helper="Source options are filtered by application so users are not shown irrelevant choices."
            options={profile.sourceTypeOptions}
            value={state.sourceTypes}
            onSelect={(value) => toggleMulti("sourceTypes", value)}
            multi
          />

          <ChipGroup
            title="Source locations"
            helper="Where the sources live physically is essential to product selection."
            options={profile.sourceLocationOptions}
            value={state.sourceLocations}
            onSelect={(value) => toggleMulti("sourceLocations", value)}
            multi
          />

          <ChipGroup
            title="Source connection types"
            helper="Connection type affects USB-C, HDMI, HDBaseT, AVoIP, NDI, and wireless product paths."
            options={profile.sourceConnectionOptions}
            value={state.sourceConnections}
            onSelect={(value) => toggleMulti("sourceConnections", value)}
            multi
          />
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
            helper="This list is filtered by the selected application. Multi-zone, wall, control room, signage, and boardroom applications get different choices."
            options={displayArrangementOptions}
            value={state.displayArrangement}
            onSelect={chooseDisplayArrangement}
          />

          <ChipGroup
            title="Display position"
            helper="This question is now responsive. Dual-display arrangements show dual-screen positions; wall arrangements show wall positions; multi-zone shows distributed positions."
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
            title="Meeting / user workflow"
            helper="Options are filtered by application. Signage and wall spaces do not show the same workflow choices as meeting rooms."
            options={meetingWorkflowOptions}
            value={state.meetingWorkflow}
            onSelect={(value) => setField("meetingWorkflow", value)}
          />

          <ChipGroup
            title="USB requirement"
            helper="USB choices respond to the meeting workflow. BYOM/conferencing exposes camera, speakerphone, microphone, and USB bandwidth choices."
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
            helper="This should drive transport recommendation. Multi-zone and worship spaces are pre-biased toward longer runs, but confirm the actual distance."
            options={runBands}
            value={state.longestRun}
            onSelect={(value) => setField("longestRun", value)}
          />

          <ChipGroup
            title="Available cable / pathway"
            helper="Select what is installed or what can realistically be installed."
            options={cableTypes}
            value={state.cableAvailable}
            onSelect={(value) => toggleMulti("cableAvailable", value)}
            multi
          />

          <ChipGroup
            title="Network availability"
            helper="This matters for NetworkHD, NDI, control, streaming, Dante/AES67, and multi-zone routing."
            options={networkOptions}
            value={state.networkAvailability}
            onSelect={(value) => setField("networkAvailability", value)}
          />

          <ChipGroup
            title="Known infrastructure risks"
            helper="These directly affect confidence and whether the rep should quote or request more information."
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
          title="Commercial direction"
          helper="Used to avoid over-engineering or under-specifying."
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
                  inference.productDirection.map((item) => <li key={item}>• {item}</li>)
                ) : (
                  <li>• More information is required before a reliable product direction can be stated.</li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-sm font-black text-slate-900">Avoid / do not assume</p>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {inference.avoid.length ? (
                  inference.avoid.map((item) => <li key={item}>• {item}</li>)
                ) : (
                  <li>• No avoid flags yet. Continue validating distance, USB, resolution, and behaviour.</li>
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
        title="Wingman now responds to the application, not a static form."
        purpose="This workflow applies real-world AV assumptions and dynamically filters each next choice. A multi-zone venue behaves like a multi-zone venue; a display wall exposes wall logic; dual displays expose dual-screen positions and behaviours."
        nextMove="Select the use case, let Wingman apply smart defaults, then refine only the details that matter for equipment selection."
        actions={[
          { label: "Open Product Finder", to: routeCatalogByKey.finder.path },
          { label: "Save to Projects", to: routeCatalogByKey.projects.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Dynamic discovery workflow"
        subtitle="The choices shown are filtered by previous answers so the workflow feels like a live AV design assistant, not a generic checklist."
      >
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">Current step: {currentStep.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{currentStep.description}</p>
              </div>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                {capturedPercent}% design model captured
              </span>
            </div>

            <div className="mt-6">{renderStep(currentStep.id)}</div>

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

          <div className="grid gap-4">
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
                <ValueLine label="Display arrangement" value={state.displayArrangement} />
                <ValueLine label="Display position" value={state.displayPosition} />
                <ValueLine label="Display behaviour" value={state.displayBehaviour} />
                <ValueLine label="Wall layout" value={state.wallLayout} />
                <ValueLine label="Wall input mode" value={state.wallInputMode} />
                <ValueLine label="Wall multiview" value={state.wallMultiview} />
                <ListLine label="USB" values={state.usbNeeds} />
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
                      inference.missing.slice(0, 6).map((item) => <li key={item}>• {item}</li>)
                    ) : (
                      <li>• No major missing details detected.</li>
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
                      inference.risks.slice(0, 6).map((item) => <li key={item}>• {item}</li>)
                    ) : (
                      <li>• No major risk flags yet.</li>
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