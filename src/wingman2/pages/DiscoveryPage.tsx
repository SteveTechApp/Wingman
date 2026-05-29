import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Monitor,
  Save,
  Sparkles,
} from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { saveDiscoveryBriefToProject } from "../data/projectStore";
import {
  buildDiscoveryBriefFromState,
  readLatestDiscoverySnapshot,
  writeLatestDiscoverySnapshot,
} from "../data/workflowHandoff";

type StepId = "outcome" | "room" | "devices" | "displays" | "exceptions" | "review";

type DiscoveryState = {
  outcome: string;
  roomType: string;
  roomSize: string;
  equipmentLocation: string;
  devices: string[];
  locations: string[];
  displayBehaviour: string;
  displayCount: string;
  cableRun: string;
  network: string;
  signalStandard: string;
  usbOwnership: string;
  audioPath: string;
  controlNeeds: string[];
  notes: string;
};

type Step = {
  id: StepId;
  label: string;
  helper: string;
};

type OptionCard = {
  label: string;
  helper: string;
  tags?: string[];
};

type QuestionStrategy = {
  prompt: string;
  customerFrame: string;
  reasoning: string;
};

const steps: Step[] = [
  { id: "outcome", label: "Outcome", helper: "Start with what the customer wants to achieve." },
  { id: "room", label: "Room", helper: "Apply realistic room assumptions." },
  { id: "devices", label: "Devices", helper: "Select actual equipment, not connector jargon." },
  { id: "displays", label: "Displays", helper: "Confirm display behaviour only where it changes the design." },
  { id: "exceptions", label: "Checks", helper: "Only answer questions triggered by the model." },
  { id: "review", label: "Review", helper: "Move into Finder or Proposal." },
];

const outcomeOptions: OptionCard[] = [
  {
    label: "Present device to display",
    helper: "Laptop, USB-C, HDMI, wireless presentation or simple local switching.",
    tags: ["Presentation"],
  },
  {
    label: "Create meeting / UC room",
    helper: "Teams, Zoom, camera, microphone, soundbar, speakerphone or room PC workflow.",
    tags: ["USB", "Audio", "Camera"],
  },
  {
    label: "Route sources to multiple displays",
    helper: "Matrix, AV-over-IP, multi-zone venue, training space or sports bar routing.",
    tags: ["Routing"],
  },
  {
    label: "Build video wall or signage display",
    helper: "LCD wall, LED wall, signage loop, feature wall or canvas processing.",
    tags: ["Wall", "Signage"],
  },
  {
    label: "Capture, stream or record content",
    helper: "Lecture capture, camera bridge, NDI source, recording or monitoring workflow.",
    tags: ["Capture", "NDI"],
  },
  {
    label: "Replace or compare existing product",
    helper: "Known competitor SKU, legacy matrix, extender, switcher or processor replacement.",
    tags: ["Compare"],
  },
  {
    label: "Not sure - guide me",
    helper: "Use simple prompts and let Wingman infer the likely product path.",
    tags: ["Guided"],
  },
];

const roomOptions: OptionCard[] = [
  { label: "Huddle room", helper: "Small meeting space with simple presentation and UC." },
  { label: "Boardroom", helper: "Higher expectation meeting room with presentation, UC and control needs." },
  { label: "Classroom", helper: "Teaching space with repeatable source/display and audio requirements." },
  { label: "Training room", helper: "Flexible learning space, often with dual display or UC." },
  { label: "Lecture theatre", helper: "Larger presentation/capture space with distance and audio risk." },
  { label: "Retail signage", helper: "Media player, signage display, wall or distributed content." },
  { label: "Sports bar / hospitality", helper: "Multiple displays, source routing and simple control." },
  { label: "Control room", helper: "Monitoring, multiview, source routing and uptime considerations." },
  { label: "House of worship", helper: "Camera, projection, streaming and stage display workflows." },
  { label: "Healthcare simulation", helper: "Capture, camera, review and monitoring workflow." },
  { label: "Multi-zone venue", helper: "Several areas with different display/source needs." },
  { label: "Other / not sure", helper: "Keep the discovery generic until more detail is known." },
];

const roomSizeOptions = ["Small <10m", "Medium <25m", "Large <50m", "Extra large 50m+", "Unknown"];

const equipmentLocationOptions = [
  "Behind display",
  "Credenza",
  "Table / floor box",
  "Lectern",
  "Local rack",
  "Central rack",
  "Mixed locations",
  "Unknown",
];

const deviceOptions: OptionCard[] = [
  { label: "Laptop HDMI", helper: "Adds HDMI input. Needs separate USB path if using room camera/audio.", tags: ["HDMI"] },
  { label: "Laptop USB-C", helper: "Adds USB-C video input and possible BYOD USB host path.", tags: ["USB-C", "BYOD"] },
  { label: "Wireless presentation", helper: "Adds wireless/software source path.", tags: ["Wireless"] },
  { label: "Room PC", helper: "Adds HDMI source and fixed USB host candidate.", tags: ["HDMI", "USB host"] },
  { label: "Microsoft Teams Room Device", helper: "Adds UC host, display output and camera/audio ownership questions.", tags: ["MTR", "USB host"] },
  { label: "Media player", helper: "Adds fixed HDMI source.", tags: ["HDMI"] },
  { label: "Signage player", helper: "Adds fixed signage source.", tags: ["Signage"] },
  { label: "USB camera", helper: "Adds USB peripheral; needs clear host ownership.", tags: ["USB peripheral"] },
  { label: "PTZ camera", helper: "Confirm HDMI, USB, NDI and control path.", tags: ["Camera"] },
  { label: "NDI camera", helper: "Adds network video source and NDI bridge/AV-over-IP consideration.", tags: ["NDI"] },
  { label: "Microphone / DSP", helper: "Adds audio path and UC integration requirement.", tags: ["Audio"] },
  { label: "Other source", helper: "Flag for manual review.", tags: ["Review"] },
];

const locationOptions = [
  "Table",
  "Floor box",
  "Wall plate",
  "Lectern",
  "Behind display",
  "Local rack",
  "Central rack",
  "Network",
  "Ceiling",
  "Mixed locations",
  "Unknown",
];

const displayBehaviourOptions: OptionCard[] = [
  { label: "Single display", helper: "One main display or projector." },
  { label: "Dual mirrored displays", helper: "Two displays showing the same content." },
  { label: "Dual independent displays", helper: "Different content or extended desktop/MST consideration." },
  { label: "Presentation plus conferencing display", helper: "Content display and UC display behaviour." },
  { label: "Multiple displays same content", helper: "Distribution amplifier, splitter or mirrored routing." },
  { label: "Different content per display", helper: "Matrix or AV-over-IP routing likely." },
  { label: "Multiview display", helper: "One output canvas showing multiple sources." },
  { label: "LCD video wall", helper: "Dedicated wall processor or AV-over-IP wall routing." },
  { label: "LED wall", helper: "Single canvas feed to LED processor." },
  { label: "Not sure", helper: "Ask what the viewer should see during the main workflow." },
];

const displayCountOptions = ["1", "2", "3-4", "5-8", "9+", "Unknown"];

const cableRunOptions = ["Under 5m", "5-10m", "10-35m", "35-70m", "70-100m", "100m+", "Unknown"];

const networkOptions = [
  "No network needed",
  "Existing IT network",
  "Dedicated AV network possible",
  "Managed switch available",
  "10G available",
  "Unknown",
];

const usbOwnershipOptions: OptionCard[] = [
  {
    label: "Room PC / MTR owns USB",
    helper: "Prioritise fixed UC appliance or room PC as the camera/audio host.",
  },
  {
    label: "BYOD laptop owns USB",
    helper: "User laptop needs access to room camera/audio. Prefer USB-C where practical.",
  },
  {
    label: "Switchable USB host",
    helper: "Room PC/MTR and BYOD laptop both need camera/audio access.",
  },
  {
    label: "APO-DG2 / dongle-style BYOD path",
    helper: "Useful where BYOD should avoid consuming the main switcher USB host path.",
  },
  {
    label: "No room USB required",
    helper: "Video/audio only; no room camera, mic, touch or USB peripheral transport.",
  },
  {
    label: "Not sure",
    helper: "Keep as a validation item.",
  },
];


const signalStandardOptions: OptionCard[] = [
  {
    label: "4K60 4:4:4 HDR10 required",
    helper: "Use when Sky Q, premium streaming or high-quality 4K content must remain intact through the full signal path.",
    tags: ["18Gbps+", "HDR", "HDCP"],
  },
  {
    label: "4K60 SDR is acceptable",
    helper: "Use where 4K resolution matters but HDR is not customer-critical.",
    tags: ["4K60"],
  },
  {
    label: "1080p is acceptable",
    helper: "Use for legacy displays, lower-cost venue zones or simple monitoring.",
    tags: ["1080p"],
  },
  {
    label: "Not sure - validate downstream",
    helper: "Keep HDR, HDCP, EDID and display compatibility as validation items.",
    tags: ["Validate"],
  },
];
const audioPathOptions: OptionCard[] = [
  {
    label: "APO-VX20 / APO-210-UC soundbar",
    helper: "Small/medium UC room with all-in-one camera/audio endpoint.",
  },
  {
    label: "Room microphone + speakers",
    helper: "Separate mic and speaker path, likely needs switching/DSP consideration.",
  },
  {
    label: "AMP-2210 + 100V/low-Z speakers",
    helper: "Larger room speaker reinforcement with amplifier path.",
  },
  {
    label: "Dante / AES67",
    helper: "Network audio or DSP-integrated room path.",
  },
  {
    label: "Display speakers only",
    helper: "Simple audio from display; validate if suitable for the room size.",
  },
  {
    label: "Not sure",
    helper: "Keep as a validation item.",
  },
];

const controlOptions = [
  "No control",
  "Display power control",
  "IR",
  "RS-232",
  "Web UI",
  "Touch panel",
  "Third-party control",
  "Not sure",
];

const initialState: DiscoveryState = {
  outcome: "",
  roomType: "",
  roomSize: "Medium <25m",
  equipmentLocation: "Behind display",
  devices: [],
  locations: [],
  displayBehaviour: "",
  displayCount: "1",
  cableRun: "",
  network: "",
  signalStandard: "",
  usbOwnership: "",
  audioPath: "",
  controlNeeds: [],
  notes: "",
};

const baseQuestionStrategyByStep: Record<StepId, QuestionStrategy> = {
  outcome: {
    prompt: "What does the room need to let people do?",
    customerFrame: "Keep the first question about the job the room has to perform, not the product family.",
    reasoning: "Outcome-first discovery avoids over-specifying AV hardware before the customer has described the experience they recognise.",
  },
  room: {
    prompt: "Where will this be used, and what makes that space awkward?",
    customerFrame: "A meeting room, classroom and training room can be similar sizes but need different defaults for control, source ownership and repeatability.",
    reasoning: "Application context changes the assumed workflow before it changes the SKU shortlist.",
  },
  devices: {
    prompt: "Which real devices do people bring, touch or rely on every day?",
    customerFrame: "Ask for laptops, room PCs, cameras and microphones before translating them into HDMI, USB-C, USB host or NDI paths.",
    reasoning: "Device language keeps the conversation natural while still building a useful engineering model.",
  },
  displays: {
    prompt: "What should each viewer actually see?",
    customerFrame: "The important difference is whether displays mirror, show independent content, support a call, or act as a wall/canvas.",
    reasoning: "Display behaviour drives matrix, AVoIP, MST, scaler and wall-processor decisions.",
  },
  exceptions: {
    prompt: "What could make the simple answer fail?",
    customerFrame: "Only ask deeper questions when the chosen outcome suggests USB ownership, distance, HDR, network or audio risk.",
    reasoning: "Triggered checks keep discovery short for simple rooms and deeper for rooms that need technical validation.",
  },
  review: {
    prompt: "Does this sound like the room the customer described?",
    customerFrame: "Read the inferred path back in plain language before moving to Finder or Proposal.",
    reasoning: "A quick recap catches gaps while the customer still recognises the problem being solved.",
  },
};

function selected(values: string[], option: string) {
  return values.includes(option);
}

function countBand(count: number) {
  if (!Number.isFinite(count) || count <= 0) return "Unknown";
  if (count === 1) return "1";
  if (count === 2) return "2";
  if (count <= 4) return "3-4";
  if (count <= 8) return "5-8";
  return "9+";
}

function includesAny(value: string, terms: string[]) {
  const text = value.toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function getInputModel(state: DiscoveryState) {
  const inputs = {
    hdmi: 0,
    usbC: 0,
    wireless: 0,
    networkVideo: 0,
    usbHostCandidates: [] as string[],
    fixedUsbHosts: [] as string[],
    byodUsbHosts: [] as string[],
    usbPeripherals: [] as string[],
    audioPaths: [] as string[],
    tags: [] as string[],
  };

  if (selected(state.devices, "Laptop HDMI")) {
    inputs.hdmi += 1;
    inputs.tags.push("Laptop HDMI: 1 HDMI input");
  }

  if (selected(state.devices, "Laptop USB-C")) {
    inputs.usbC += 1;
    inputs.tags.push("Laptop USB-C: 1 USB-C video input");
  }

  if (selected(state.devices, "Wireless presentation")) {
    inputs.wireless += 1;
    inputs.tags.push("Wireless presentation: software/network source");
  }

  if (selected(state.devices, "Room PC")) {
    inputs.hdmi += 1;
    inputs.fixedUsbHosts.push("Room PC");
    inputs.usbHostCandidates.push("Room PC USB host");
    inputs.tags.push("Room PC: HDMI source + fixed USB host");
  }

  if (selected(state.devices, "Microsoft Teams Room Device")) {
    inputs.hdmi += 1;
    inputs.fixedUsbHosts.push("Microsoft Teams Room Device");
    inputs.usbHostCandidates.push("MTR USB host");
    inputs.tags.push("MTR: UC host + display output path");
  }

  if (selected(state.devices, "Media player")) {
    inputs.hdmi += 1;
    inputs.tags.push("Media player: 1 HDMI input");
  }

  if (selected(state.devices, "Signage player")) {
    inputs.hdmi += 1;
    inputs.tags.push("Signage player: 1 HDMI input");
  }

  if (selected(state.devices, "PTZ camera")) {
    inputs.hdmi += 1;
    inputs.tags.push("PTZ camera: confirm HDMI / USB / NDI / control path");
  }

  if (selected(state.devices, "NDI camera")) {
    inputs.networkVideo += 1;
    inputs.tags.push("NDI camera: network video source");
  }

  if (selected(state.devices, "USB camera")) {
    inputs.usbPeripherals.push("USB camera");
    inputs.tags.push("USB camera: USB peripheral");
  }

  if (selected(state.devices, "Microphone / DSP")) {
    inputs.usbPeripherals.push("Microphone / DSP or USB audio path");
    inputs.audioPaths.push("Microphone / DSP");
    inputs.tags.push("Microphone / DSP: audio path");
  }

  const ucWorkflow =
    state.outcome === "Create meeting / UC room" ||
    state.displayBehaviour === "Presentation plus conferencing display" ||
    selected(state.devices, "USB camera") ||
    selected(state.devices, "Microphone / DSP") ||
    selected(state.devices, "Microsoft Teams Room Device") ||
    selected(state.devices, "Room PC") ||
    state.audioPath.includes("soundbar") ||
    state.audioPath.includes("Dante");

  if (ucWorkflow && selected(state.devices, "Laptop USB-C")) {
    inputs.byodUsbHosts.push("Laptop USB-C");
    inputs.usbHostCandidates.push("Laptop USB-C BYOD host");
  }

  if (ucWorkflow && selected(state.devices, "Laptop HDMI")) {
    inputs.byodUsbHosts.push("Laptop HDMI");
    inputs.usbHostCandidates.push("Laptop HDMI BYOD host requires separate USB path");
  }

  if (state.audioPath && state.audioPath !== "Not sure") {
    inputs.audioPaths.push(state.audioPath);
  }

  if (inputs.hdmi) inputs.tags.push(`Total HDMI-class inputs: ${inputs.hdmi}`);
  if (inputs.usbC) inputs.tags.push(`Total USB-C video inputs: ${inputs.usbC}`);
  if (inputs.networkVideo) inputs.tags.push(`Network video sources: ${inputs.networkVideo}`);
  if (inputs.usbHostCandidates.length) inputs.tags.push(`USB host candidates: ${inputs.usbHostCandidates.length}`);
  if (inputs.usbPeripherals.length) inputs.tags.push(`USB peripheral/audio paths: ${inputs.usbPeripherals.length}`);

  return inputs;
}

function getQuestionStrategy(stepId: StepId, state: DiscoveryState): QuestionStrategy {
  const base = baseQuestionStrategyByStep[stepId];

  if (stepId === "room" && state.outcome === "Create meeting / UC room") {
    return {
      ...base,
      customerFrame: "For a UC room, find out who owns the call, where people sit, and whether BYOD has to feel as easy as the fixed room system.",
    };
  }

  if (stepId === "room" && state.outcome === "Route sources to multiple displays") {
    return {
      ...base,
      customerFrame: "For routing spaces, frame the room around who chooses content, which displays move together, and what must be simple for staff.",
    };
  }

  if (stepId === "devices" && state.roomType === "Classroom") {
    return {
      ...base,
      customerFrame: "For a classroom, ask what the teacher uses first, then confirm student-facing displays, capture, audio and any visiting-device path.",
    };
  }

  if (stepId === "displays" && state.roomType === "Meeting room") {
    return {
      ...base,
      customerFrame: "For a meeting room, separate presentation display behaviour from conferencing display behaviour so the recommendation matches the user journey.",
    };
  }

  if (stepId === "exceptions" && getUsbTopology(state).risk !== "Low USB design risk") {
    return {
      ...base,
      customerFrame: "Explain the USB question as camera and microphone ownership, not as a technical bus-routing problem.",
    };
  }

  return base;
}

function getUsbTopology(state: DiscoveryState) {
  const inputModel = getInputModel(state);
  const warnings: string[] = [];
  const actions: string[] = [];

  if (selected(state.devices, "Laptop HDMI") && inputModel.byodUsbHosts.includes("Laptop HDMI")) {
    warnings.push("Laptop HDMI does not carry USB. If it must use the room camera/microphone, allow a separate USB path, USB-C alternative, or APO-DG2-style BYOD workflow.");
  }

  if (inputModel.usbHostCandidates.length > 1) {
    warnings.push("Multiple USB host candidates are present. Confirm whether the selected switcher/core can switch USB hosts, or choose a priority host.");
  }

  if (inputModel.fixedUsbHosts.length && inputModel.byodUsbHosts.length) {
    warnings.push("Fixed Room PC/MTR and BYOD laptop hosts are both present. Do not assume every host can own room USB devices at the same time.");
    actions.push("Prioritise Room PC/MTR USB if the room is normally a fixed UC room.");
    actions.push("Use USB-C or APO-DG2-style BYOD path if laptop users need camera/audio without consuming the main USB host path.");
  }

  if (!inputModel.usbHostCandidates.length && inputModel.usbPeripherals.length) {
    warnings.push("USB peripherals are selected but no clear USB host has been identified.");
    actions.push("Ask which device owns camera/audio: laptop, Room PC, MTR, or a UC soundbar/appliance.");
  }

  if (inputModel.usbPeripherals.length > 1) {
    warnings.push("Multiple USB/audio peripheral paths are present. Check bandwidth, hubs, ownership and USB 2.0 vs USB 3.x.");
  }

  if (!actions.length) {
    actions.push(inputModel.usbHostCandidates.length ? "Confirm host ownership and USB bandwidth." : "No USB host conflict detected yet.");
  }

  return {
    risk: warnings.length >= 2 ? "High USB design risk" : warnings.length ? "Medium USB design risk" : "Low USB design risk",
    warnings,
    actions,
    summary: inputModel.usbHostCandidates.length
      ? `${inputModel.usbHostCandidates.length} host candidate${inputModel.usbHostCandidates.length === 1 ? "" : "s"} / ${inputModel.usbPeripherals.length} peripheral path${inputModel.usbPeripherals.length === 1 ? "" : "s"}`
      : inputModel.usbPeripherals.length
        ? `No host selected / ${inputModel.usbPeripherals.length} peripheral path${inputModel.usbPeripherals.length === 1 ? "" : "s"}`
        : "No USB topology requirement captured",
  };
}

function getTriggeredChecks(state: DiscoveryState) {
  const checks: string[] = [];
  const inputModel = getInputModel(state);
  const usb = getUsbTopology(state);

  if (usb.warnings.length) checks.push("USB host ownership");
  if (inputModel.hdmi + inputModel.usbC + inputModel.wireless + inputModel.networkVideo > 3) checks.push("Switcher input capacity");
  if (state.displayBehaviour.includes("independent") || state.displayBehaviour.includes("Different")) checks.push("Independent display routing");
  if (state.displayBehaviour.includes("wall") || state.outcome.includes("video wall")) checks.push("Video wall processing");
  if (state.cableRun.includes("35-70m") || state.cableRun.includes("70-100m") || state.cableRun.includes("100m+")) checks.push("Long cable transport");
  if (state.audioPath.includes("Dante") || state.audioPath.includes("AMP-2210")) checks.push("Audio system design");
  if (state.network.includes("10G")) checks.push("10G network / NHD-600 consideration");
  if (state.signalStandard === "4K60 4:4:4 HDR10 required") checks.push("Premium 4K / HDR signal path");

  return checks.length ? checks : ["No major exception triggered yet"];
}

function getRecommendedProductPath(state: DiscoveryState) {
  const blob = [
    state.outcome,
    state.roomType,
    state.displayBehaviour,
    state.devices.join(" "),
    state.usbOwnership,
    state.audioPath,
    state.network,
  ].join(" ");

  if (includesAny(blob, ["LED wall", "LCD video wall", "video wall", "signage"])) return "Video wall / signage processor path";
  if (includesAny(blob, ["NDI camera", "capture", "stream", "record"])) return "Camera / capture / NDI bridge path";
  if (includesAny(blob, ["Route sources", "multiple displays", "sports bar", "multi-zone", "Different content"])) return "AVoIP or matrix routing path";
  if (includesAny(blob, ["meeting", "UC", "Teams", "MTR", "USB camera", "Microphone", "soundbar"])) return "Presentation / UC switcher path";
  if (includesAny(blob, ["35-70m", "70-100m", "100m+"])) return "HDBaseT or AVoIP transport path";
  return "Presentation switcher / extender path";
}

function getDesignDirection(state: DiscoveryState) {
  return getRecommendedProductPath(state);
}


function getSignalStandardSummary(state: DiscoveryState) {
  if (state.signalStandard) return state.signalStandard;

  if (state.devices.includes("Satellite decoder / Sky Q")) {
    return "Sky Q selected - confirm whether HDR / premium 4K must be preserved.";
  }

  if (
    state.devices.includes("Apple TV") ||
    state.devices.includes("ROKU player") ||
    state.devices.includes("Media player") ||
    state.devices.includes("Signage player")
  ) {
    return "Premium video source selected - confirm 4K/HDR requirement.";
  }

  return "Not triggered yet";
}

function getDownstreamQualityTags(state: DiscoveryState) {
  const tags: string[] = [];

  if (state.signalStandard === "4K60 4:4:4 HDR10 required") {
    tags.push("Require 4K60 4:4:4 HDR10-capable signal path");
    tags.push("Validate HDMI bandwidth / 18Gbps-class or better");
    tags.push("Validate HDCP 2.2/2.3");
    tags.push("Validate EDID management");
    tags.push("Validate scaler/downsample behaviour");
    tags.push("Validate display HDR capability");
  }

  if (state.signalStandard === "4K60 SDR is acceptable") {
    tags.push("Require 4K60-capable signal path");
    tags.push("HDR not critical");
  }

  if (state.signalStandard === "1080p is acceptable") {
    tags.push("1080p acceptable");
    tags.push("Do not over-specify premium 4K path unless future expansion or later 4K upgrade is required");
  }

  if (state.signalStandard === "Not sure - validate downstream") {
    tags.push("Keep resolution/HDR/HDCP/EDID as validation items");
  }

  return tags;
}

function getSignalStandardWarnings(state: DiscoveryState) {
  const warnings: string[] = [];

  if (state.signalStandard === "4K60 4:4:4 HDR10 required") {
    warnings.push("Treat the whole downstream chain as premium 4K/HDR: source, switcher, extender/AVoIP, receivers, displays, cable path and EDID/HDCP handling must all be validated.");
    warnings.push("Do not assume every '4K' product is suitable. Check HDMI bandwidth class, HDR10 support, HDCP 2.2/2.3, EDID management and any scaler/downsample behaviour.");
  }

  if (state.devices.includes("Satellite decoder / Sky Q") && !state.signalStandard) {
    warnings.push("Sky Q selected: ask whether HDR is important before selecting product family or cable/transport path.");
  }

  if (state.signalStandard === "4K60 4:4:4 HDR10 required" && ["35-70m", "70-100m", "100m+"].includes(state.cableRun)) {
    warnings.push("Premium 4K/HDR over distance: verify HDBaseT/AVoIP/fibre path supports the required HDMI bandwidth, HDR metadata, HDCP and display EDID behaviour.");
  }

  if (state.signalStandard === "4K60 4:4:4 HDR10 required" && ["9-16", "17-32", "33-49", "50+"].includes(state.displayCount)) {
    warnings.push("Large venue with premium 4K/HDR: every endpoint and zone may not need HDR. Confirm which displays/zones require full quality and where scaling/downconversion is acceptable.");
  }

  return warnings;
}

function getVenueAssumptions(state: DiscoveryState) {
  const assumptions: string[] = [];

  if (["9-16", "17-32", "33-49", "50+"].includes(state.displayCount)) {
    assumptions.push("Large display count: favour AV-over-IP, matrix zoning or managed distribution rather than simple splitter logic.");
    assumptions.push("Confirm whether all screens show the same content, groups/zones, or independent source selection.");
  }

  if (state.displayCount === "50+") {
    assumptions.push("50+ displays: assume casino/large venue scale. Network design, control, monitoring and staged deployment become design-critical.");
  }

  if (state.devices.includes("Satellite decoder / Sky Q")) {
    assumptions.push("Sky/Satellite source: confirm number of decoders, legal viewing zones, HDCP handling and whether each zone needs independent channel selection.");
  }

  if (state.devices.includes("Apple TV") || state.devices.includes("ROKU player")) {
    assumptions.push("Streaming players: confirm network access, account ownership, control method and whether players are local to displays or centralised.");
  }

  if (state.devices.includes("Visualiser / document camera")) {
    assumptions.push("Visualiser/document camera: confirm HDMI vs USB output and whether it also needs capture/recording.");
  }

  if (state.signalStandard === "4K60 4:4:4 HDR10 required") {
    assumptions.push("Premium 4K/HDR selected: every downstream device must be validated for the required HDMI standard, HDR10, HDCP and EDID behaviour.");
  }

  return assumptions;
}

function getMissingItems(state: DiscoveryState) {
  const missing: string[] = [];

  if (!state.outcome) missing.push("Customer outcome");
  if (!state.roomType) missing.push("Room type");
  if (!state.devices.length) missing.push("Devices involved");
  if (!state.displayBehaviour) missing.push("Display behaviour");
  if (!state.cableRun) missing.push("Longest cable run");

  if (getUsbTopology(state).risk !== "Low USB design risk" && !state.usbOwnership) {
    missing.push("USB host ownership");
  }

  if (state.outcome === "Create meeting / UC room" && !state.audioPath) {
    missing.push("UC audio path");
  }

  return missing;
}

function getConfidence(missingCount: number) {
  if (missingCount <= 1) return "High confidence";
  if (missingCount <= 4) return "Medium confidence";
  return "Low confidence";
}

function capturedPercent(missingCount: number) {
  return Math.max(10, Math.round(((7 - Math.min(missingCount, 7)) / 7) * 100));
}

function OptionButton({
  option,
  active,
  onClick,
  multi,
}: {
  option: OptionCard;
  active: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wm-simple-discovery-card ${active ? "is-active" : ""}`}
    >
      <span className="wm-simple-discovery-check">{active ? <Check className="h-4 w-4" /> : multi ? "+" : ""}</span>
      <strong>{option.label}</strong>
      <small>{option.helper}</small>
      {option.tags?.length ? (
        <span className="wm-simple-discovery-tags">
          {option.tags.map((tag) => (
            <em key={tag}>{tag}</em>
          ))}
        </span>
      ) : null}
    </button>
  );
}

function PillGroup({
  title,
  helper,
  options,
  value,
  values,
  multi,
  onSelect,
}: {
  title: string;
  helper?: string;
  options: string[];
  value?: string;
  values?: string[];
  multi?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="wm-simple-discovery-field">
      <p>{title}</p>
      {helper ? <span>{helper}</span> : null}
      <div>
        {options.map((option) => {
          const active = multi ? Boolean(values?.includes(option)) : value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={active ? "is-active" : ""}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ValueLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <strong>{value || "Not captured yet"}</strong>
    </div>
  );
}

function ListLine({ label, values }: { label: string; values: string[] }) {
  return <ValueLine label={label} value={values.length ? values.join(", ") : "Not captured yet"} />;
}

export function DiscoveryPage() {
  const navigate = useNavigate();
  const restoredDiscovery = readLatestDiscoverySnapshot();

  const [activeStepIndex, setActiveStepIndex] = useState(() => restoredDiscovery?.activeStepIndex ?? 0);
  const [state, setState] = useState<DiscoveryState>(() => ({
    ...initialState,
    ...(restoredDiscovery?.state ?? {}),
  }));
  const [fullModelOpen, setFullModelOpen] = useState(false);

  const currentStep = steps[activeStepIndex];
  const missingItems = useMemo(() => getMissingItems(state), [state]);
  const confidence = getConfidence(missingItems.length);
  const designDirection = getDesignDirection(state);
  const inputModel = getInputModel(state);
  const usbTopology = getUsbTopology(state);
  const triggeredChecks = getTriggeredChecks(state);
  const questionStrategy = useMemo(() => getQuestionStrategy(currentStep.id, state), [currentStep.id, state]);
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === steps.length - 1;

  function setField<K extends keyof DiscoveryState>(key: K, value: DiscoveryState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "devices" | "locations" | "controlNeeds", value: string) {
    setState((current) => {
      const existing = current[key];
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];

      const updated = { ...current, [key]: next };

      if (key === "devices") {
        const ucTriggered =
          next.includes("Room PC") ||
          next.includes("Microsoft Teams Room Device") ||
          next.includes("USB camera") ||
          next.includes("Microphone / DSP");

        return {
          ...updated,
          audioPath: current.audioPath || (ucTriggered ? "APO-VX20 / APO-210-UC soundbar" : current.audioPath),
          usbOwnership: current.usbOwnership || (ucTriggered ? "Room PC / MTR owns USB" : current.usbOwnership),
        };
      }

      return updated;
    });
  }

  function currentBrief() {
    return buildDiscoveryBriefFromState(
      {
        ...state,
        technicalTags: [...inputModel.tags, ...getDownstreamQualityTags(state)],
        usbTopology,
        usbTopologyRisk: usbTopology.risk,
        usbTopologySummary: usbTopology.summary,
        signalStandard: state.signalStandard,
        signalStandardSummary: getSignalStandardSummary(state),
        downstreamQualityTags: getDownstreamQualityTags(state),
        signalStandardWarnings: getSignalStandardWarnings(state),
        triggeredChecks,
        venueAssumptions: getVenueAssumptions(state),
        recommendedProductPath: designDirection,
      },
      {
        designDirection,
        confidence,
        missingItems,
        capturedPercent: capturedPercent(missingItems.length),
        returnRoute: routeCatalogByKey.discovery.path,
      },
    );
  }

  function persist(nextStepIndex = activeStepIndex) {
    const brief = currentBrief();

    writeLatestDiscoverySnapshot({
      activeStepIndex: nextStepIndex,
      state,
      brief,
      savedAt: brief.savedAt ?? new Date().toISOString(),
    });

    return brief;
  }

  function saveDiscoveryBrief() {
    const brief = persist(activeStepIndex);
    return saveDiscoveryBriefToProject(brief);
  }

  function goToStep(index: number) {
    const nextIndex = Math.max(0, Math.min(steps.length - 1, index));
    persist(nextIndex);
    setActiveStepIndex(nextIndex);
  }

  function goBack() {
    goToStep(activeStepIndex - 1);
  }

  function goNext() {
    goToStep(activeStepIndex + 1);
  }

  function openFinder() {
    saveDiscoveryBrief();
    navigate(routeCatalogByKey.finder.path);
  }

  function openProposal() {
    saveDiscoveryBrief();
    navigate(routeCatalogByKey.proposal.path);
  }

  useEffect(() => {
    persist(activeStepIndex);
  }, [activeStepIndex, state, designDirection, confidence]);

  function renderOutcomeStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 1</p>
          <h2>What is the customer trying to do?</h2>
          <span>Start with the recognisable outcome. Wingman will infer the technical path behind the scenes.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {outcomeOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.outcome === option.label}
              onClick={() => setField("outcome", option.label)}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderRoomStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 2</p>
          <h2>What room or application is it?</h2>
          <span>Room type gives Wingman sensible defaults without forcing the user through every technical detail.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {roomOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.roomType === option.label}
              onClick={() => setField("roomType", option.label)}
            />
          ))}
        </div>

        <div className="wm-simple-two-col">
          <PillGroup
            title="Room size"
            helper="Use installed cable path length rather than straight-line room width."
            options={roomSizeOptions}
            value={state.roomSize}
            onSelect={(value) => setField("roomSize", value)}
          />

          <PillGroup
            title="Main equipment position"
            helper="This affects transport, rack position and cable risk."
            options={equipmentLocationOptions}
            value={state.equipmentLocation}
            onSelect={(value) => setField("equipmentLocation", value)}
          />
        </div>
      </div>
    );
  }

  function renderDevicesStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 3</p>
          <h2>Which devices are involved?</h2>
          <span>Select the actual devices. Wingman converts them into HDMI, USB-C, USB host, USB peripheral, NDI and audio requirements.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {deviceOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.devices.includes(option.label)}
              onClick={() => toggleList("devices", option.label)}
              multi
            />
          ))}
        </div>

        <PillGroup
          title="Where are the devices?"
          helper="Select all relevant positions. Keep it simple unless the room is complex."
          options={locationOptions}
          values={state.locations}
          onSelect={(value) => toggleList("locations", value)}
          multi
        />

        <div className="wm-simple-inference-panel">
          <p>Inferred signal model</p>
          <div>
            {inputModel.tags.length ? inputModel.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>No device inputs selected yet</span>}
          </div>
        </div>
      </div>
    );
  }

  function renderDisplaysStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 4</p>
          <h2>What should the displays show?</h2>
          <span>Only capture the behaviour that changes the product path.</span>
        </div>

        <div className="wm-simple-discovery-grid">
          {displayBehaviourOptions.map((option) => (
            <OptionButton
              key={option.label}
              option={option}
              active={state.displayBehaviour === option.label}
              onClick={() => setField("displayBehaviour", option.label)}
            />
          ))}
        </div>

        <div className="wm-simple-two-col">
          <PillGroup
            title="Display count"
            options={displayCountOptions}
            value={state.displayCount}
            onSelect={(value) => setField("displayCount", value)}
          />

          <PillGroup
            title="Longest cable path"
            helper="This is the installed cable route, not the room width."
            options={cableRunOptions}
            value={state.cableRun}
            onSelect={(value) => setField("cableRun", value)}
          />
        </div>
      </div>
    );
  }

  function renderExceptionsStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 5</p>
          <h2>Confirm only the design-critical checks.</h2>
          <span>These questions are triggered by the previous answers. This avoids showing every AV option to every user.</span>
        </div>

        <div className="wm-simple-alert" data-risk={usbTopology.risk.includes("High") ? "high" : usbTopology.risk.includes("Medium") ? "medium" : "low"}>
          <div>
            <p>USB host / peripheral topology</p>
            <h3>{usbTopology.summary}</h3>
            <span>{usbTopology.risk}</span>
          </div>
          <ul>
            {usbTopology.warnings.length ? usbTopology.warnings.map((item) => <li key={item}>{item}</li>) : <li>No USB host conflict detected yet.</li>}
          </ul>
        </div>

        <div className="wm-simple-two-col">
          <div className="wm-simple-option-section">
            <p>Who should own the room USB devices?</p>
            <div className="wm-simple-discovery-grid compact">
              {usbOwnershipOptions.map((option) => (
                <OptionButton
                  key={option.label}
                  option={option}
                  active={state.usbOwnership === option.label}
                  onClick={() => setField("usbOwnership", option.label)}
                />
              ))}
            </div>
          </div>

          <div className="wm-simple-option-section">
            <p>How is room audio handled?</p>
            <div className="wm-simple-discovery-grid compact">
              {audioPathOptions.map((option) => (
                <OptionButton
                  key={option.label}
                  option={option}
                  active={state.audioPath === option.label}
                  onClick={() => setField("audioPath", option.label)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="wm-simple-two-col">
          <PillGroup
            title="Network availability"
            helper="Only important where AVoIP, NDI, Dante, cloud control or networked control may be used."
            options={networkOptions}
            value={state.network}
            onSelect={(value) => setField("network", value)}
          />

          <PillGroup
            title="Control needs"
            helper="Select only if the user mentioned control, display power or third-party integration."
            options={controlOptions}
            values={state.controlNeeds}
            onSelect={(value) => toggleList("controlNeeds", value)}
            multi
          />
        </div>
      </div>
    );
  }

  function renderReviewStep() {
    return (
      <div className="wm-simple-step">
        <div>
          <p>Step 6</p>
          <h2>Review the inferred product path.</h2>
          <span>Wingman now has enough to move into Product Finder, or save this as the start of the proposal workflow.</span>
        </div>

        <div className="wm-simple-review-grid">
          <div>
            <p>Recommended product path</p>
            <h3>{designDirection}</h3>
            <span>{confidence} / {capturedPercent(missingItems.length)}% captured</span>
          </div>
          <div>
            <p>Triggered checks</p>
            <ul>{triggeredChecks.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <p>Open items</p>
            <ul>{missingItems.length ? missingItems.map((item) => <li key={item}>{item}</li>) : <li>Ready for product selection.</li>}</ul>
          </div>
        </div>

        <textarea
          value={state.notes}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="Optional customer wording, site notes, constraints or assumptions."
          className="wm-simple-notes"
        />

        <div className="wm-simple-review-actions">
          <button type="button" onClick={openFinder}>
            Open Product Finder
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={openProposal}>
            Save to project / proposal
            <Save className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  function renderStep() {
    if (currentStep.id === "outcome") return renderOutcomeStep();
    if (currentStep.id === "room") return renderRoomStep();
    if (currentStep.id === "devices") return renderDevicesStep();
    if (currentStep.id === "displays") return renderDisplaysStep();
    if (currentStep.id === "exceptions") return renderExceptionsStep();
    return renderReviewStep();
  }

  return (
    <main className="wm-simple-discovery-page">
      <section className="wm-simple-discovery-shell">
        <header className="wm-simple-discovery-head">
          <div>
            <p>Wingman workspace</p>
            <h1>Simplified Discovery</h1>
            <span>Ask fewer questions. Select recognisable outcomes and devices. Let Wingman infer the engineering model.</span>
          </div>

          <div className="wm-simple-discovery-head-actions">
            <span>{confidence}</span>
            <Link to={routeCatalogByKey.finder.path} onClick={() => persist(activeStepIndex)}>Open Finder</Link>
          </div>
        </header>

        <nav className="wm-simple-discovery-steps">
          {steps.map((step, index) => {
            const active = index === activeStepIndex;
            const complete = index < activeStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                title={step.helper}
                onClick={() => goToStep(index)}
                className={active ? "is-active" : complete ? "is-complete" : ""}
              >
                <span>{complete ? <Check className="h-3 w-3" /> : index + 1}</span>
                {step.label}
              </button>
            );
          })}
        </nav>

        <div className="wm-simple-discovery-body">
          <section className="wm-simple-discovery-main">
            <div className="wm-simple-guidance">
              <Sparkles className="h-4 w-4" />
              <div>
                <p>{currentStep.label} guidance</p>
                <span>{questionStrategy.prompt}</span>
                <small>{questionStrategy.customerFrame}</small>
              </div>
            </div>

            {renderStep()}

            <footer className="wm-simple-discovery-footer">
              <button type="button" disabled={isFirstStep} onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div>
                <button type="button" onClick={() => { saveDiscoveryBrief(); navigate(routeCatalogByKey.callCards.path); }}>
                  Live call mode
                </button>

                <button type="button" onClick={openProposal}>
                  <Save className="h-4 w-4" />
                  Save to project / proposal
                </button>

                {isLastStep ? (
                  <button type="button" onClick={openFinder} className="primary">
                    Open Product Finder
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={goNext} className="primary">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </footer>
          </section>

          <aside className="wm-simple-model-panel">
            <div>
              <Monitor className="h-5 w-5" />
              <p>Current model</p>
              <span>{capturedPercent(missingItems.length)}%</span>
            </div>

            <div className="wm-simple-model-lines">
              <ValueLine label="Outcome" value={state.outcome} />
              <ValueLine label="Room" value={state.roomType || "Not captured yet"} />
              <ValueLine label="Product path" value={designDirection} />
              <ListLine label="Devices" values={state.devices} />
              <ValueLine label="Inputs" value={`${inputModel.hdmi} HDMI / ${inputModel.usbC} USB-C / ${inputModel.networkVideo} network`} />
              <ValueLine label="USB topology" value={usbTopology.summary} />
              <ValueLine label="USB risk" value={usbTopology.risk} />
              <ValueLine label="Audio path" value={state.audioPath} />
              <ValueLine label="Cable run" value={state.cableRun} />
              <ValueLine label="Signal standard" value={getSignalStandardSummary(state)} />
            </div>

            <button type="button" onClick={() => setFullModelOpen((open) => !open)}>
              {fullModelOpen ? "Hide full model" : "View full model"}
            </button>

            {fullModelOpen ? (
              <div className="wm-simple-full-model">
                <p>Technical tags</p>
                <div>
                  {inputModel.tags.length ? inputModel.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>No tags yet</span>}
                </div>
                <p>Triggered checks</p>
                <div>
                  {triggeredChecks.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
            ) : null}

            <div className="wm-simple-missing">
              <div>
                <HelpCircle className="h-4 w-4" />
                <p>Open items</p>
              </div>
              <ul>
                {missingItems.length ? missingItems.slice(0, 5).map((item) => <li key={item}>- {item}</li>) : <li>- Ready for product selection.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default DiscoveryPage;
