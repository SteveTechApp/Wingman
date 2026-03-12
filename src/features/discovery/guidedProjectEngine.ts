import { WM_ROUTES } from "@/core/wingman/routeMap";

export type GuidedProjectFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

export type GuidedProjectConfidence = "Low" | "Medium" | "High";
export type GuidedProjectStep = 0 | 1 | 2 | 3;
export type GuidedProjectInput =
  | "text"
  | "number"
  | "select"
  | "textarea"
  | "multiSelect"
  | "cards";

export type GuidedProjectRecord = {
  workflowTrack: string;
  projectScope: string;
  customerOutcome: string;
  customer: string;
  site: string;
  roomName: string;
  applicationType: string;
  roomLengthM: string;
  roomWidthM: string;
  roomHeightM: string;
  installationPath: string;
  cableDistanceM: string;
  transportDistanceBand: string;
  displayCount: string;
  sourceCount: string;
  outputBehaviour: string;
  sourceTypes: string;
  sourcePlacement: string;
  sourceConnectionPath: string;
  sourceConnectionType: string;
  signalFormats: string;
  signalHdr: string;
  sourceCableType: string;
  displayConnectionPath: string;
  displayConnectionType: string;
  displayCableType: string;
  networkEnvironment: string;
  usbNeeds: string;
  usbStandards: string;
  audioNeeds: string;
  audioBreakout: string;
  controlNeeds: string;
  powerPreference: string;
  passthroughNeeds: string;
  budgetBand: string;
  urgency: string;
  notes: string;
  recommendedFamilies: GuidedProjectFamily[];
  recommendedNextTool: string;
  createdAt: string;
};

export type GuidedProjectQuestionOptionDetail = {
  value: string;
  eyebrow?: string;
  title?: string;
  summary: string;
  outcome?: string;
  tags?: readonly string[];
};

export type GuidedProjectQuestion = {
  id: keyof GuidedProjectRecord;
  step: GuidedProjectStep;
  label: string;
  helper: string;
  input: GuidedProjectInput;
  options?: readonly string[];
  optionDetails?: readonly GuidedProjectQuestionOptionDetail[];
  placeholder?: string;
  fullWidth?: boolean;
  shouldAsk?: (record: GuidedProjectRecord) => boolean;
  branchReason?: (record: GuidedProjectRecord) => string | undefined;
};

export type GuidedProjectQuestionState = GuidedProjectQuestion & {
  activeBranch: boolean;
  branchReasonText?: string;
};

export type GuidedProjectProgress = {
  complete: number;
  total: number;
};

export type GuidedProjectAdvice = {
  primary: GuidedProjectFamily;
  confidence: GuidedProjectConfidence;
  families: GuidedProjectFamily[];
  focusCategory: string;
  workflowSummary: string;
  summary: string;
  cues: string[];
  reasons: string[];
  nextActions: string[];
  nextToolPath: string;
};

export type GuidedProjectLens = {
  id: string;
  title: string;
  state: "watch" | "active" | "resolved";
  summary: string;
  prompts: string[];
};

export const GUIDED_PROJECT_STEPS: ReadonlyArray<readonly [string, string]> = [
  [
    "Starting Point",
    "Lead with the customer outcome, then decide whether this is a single-device ask or a wider room conversation.",
  ],
  [
    "Core Fit",
    "Capture counts, output behaviour, and reach so the likely WyreStorm product category becomes obvious.",
  ],
  [
    "Signal Path",
    "Only ask the transport and endpoint questions that materially narrow the shortlist.",
  ],
  [
    "Critical Checks",
    "Confirm USB, audio, power, control, and commercial detail until only one or two options remain.",
  ],
] as const;

const WORKFLOW_TRACK_DETAILS: ReadonlyArray<GuidedProjectQuestionOptionDetail> = [
  {
    value: "Extend a signal",
    eyebrow: "Directional start",
    summary: "Send one source to one destination over distance without assuming a whole-room system.",
    outcome: "Extender kit",
    tags: ["Distance", "HDMI", "USB"],
  },
  {
    value: "Duplicate a signal",
    eyebrow: "Directional start",
    summary: "Take one source and mirror it to multiple displays or endpoints.",
    outcome: "Splitter / distribution amplifier",
    tags: ["1-to-many", "Mirrored outputs"],
  },
  {
    value: "Switch between devices",
    eyebrow: "Directional start",
    summary: "Let the user choose between multiple sources or input formats.",
    outcome: "Presentation switcher or matrix switch",
    tags: ["Multi-source", "Routing"],
  },
  {
    value: "Distribute over network",
    eyebrow: "Directional start",
    summary: "Move AV around the site over a managed network rather than a point-to-point link.",
    outcome: "AVoIP encoder / decoder / controller",
    tags: ["Network", "AVoIP"],
  },
  {
    value: "Build a video wall",
    eyebrow: "Directional start",
    summary: "Start with the display canvas and processor strategy rather than generic room prompts.",
    outcome: "Video wall processor",
    tags: ["Display canvas", "Processing"],
  },
  {
    value: "Add USB or BYOD",
    eyebrow: "Directional start",
    summary: "Solve the USB-C, conferencing, or room peripheral problem explicitly.",
    outcome: "USB extension or presentation switcher",
    tags: ["BYOD", "USB"],
  },
  {
    value: "Not sure yet",
    eyebrow: "Directional start",
    summary: "Use a guided discovery path when the customer has described a problem but not the product type.",
    outcome: "Needs guided narrowing",
    tags: ["Discovery", "Triage"],
  },
] as const;

const PROJECT_SCOPE_DETAILS: ReadonlyArray<GuidedProjectQuestionOptionDetail> = [
  {
    value: "Single device or signal path",
    eyebrow: "Scope",
    summary: "Focus on a specific AV outcome rather than a whole-room bill of materials.",
    outcome: "Product shortlist first",
    tags: ["Fast path"],
  },
  {
    value: "Part of a wider room workflow",
    eyebrow: "Scope",
    summary: "Solve one AV problem while keeping sight of the room workflow around it.",
    outcome: "Product with room context",
    tags: ["Balanced"],
  },
  {
    value: "Complete room or system",
    eyebrow: "Scope",
    summary: "Treat this as a broader architecture conversation spanning sources, displays, control, and user flow.",
    outcome: "Architecture-led path",
    tags: ["System design"],
  },
  {
    value: "Refresh or replacement",
    eyebrow: "Scope",
    summary: "Replace or upgrade an existing device while checking compatibility with the installed environment.",
    outcome: "Compatibility-led shortlist",
    tags: ["Existing system"],
  },
  {
    value: "Not sure yet",
    eyebrow: "Scope",
    summary: "Use discovery prompts to reveal whether this is a simple product ask or a broader design problem.",
    outcome: "Clarify scope",
    tags: ["Discovery"],
  },
] as const;

const APPLICATIONS = [
  "Meeting Space",
  "Boardroom",
  "Huddle Space",
  "Training Room",
  "Classroom",
  "Lecture Space",
  "Control Room",
  "Reception",
  "Retail",
  "Digital Signage",
  "Hospitality",
  "Flexible Space",
  "Custom",
] as const;

const OUTPUT_BEHAVIOUR = [
  "One destination only",
  "Same content everywhere",
  "Independent switching per display",
  "Mixed or unsure",
] as const;

const INSTALL_PATHS = [
  "Simple same-room route",
  "Floor box route",
  "Wall plate or wall cavity route",
  "Via local rack or credenza",
  "Via central rack or riser",
  "Across rooms or corridors",
  "Mixed building route",
  "Existing route to be reused",
  "Not sure yet",
] as const;

const TRANSPORT_DISTANCE_BANDS = [
  "<5m",
  "<15m",
  "<40m",
  "<70m",
  "100m",
  "Over 100m",
  "Not sure yet",
] as const;

const SOURCE_PLACEMENT = [
  "Mostly BYOD at the table",
  "Fixed devices in the room",
  "Behind the display",
  "Local rack or credenza",
  "Central rack",
  "Mixed local and central",
  "Not sure yet",
] as const;

const SOURCE_PATH = [
  "Direct cable to the next device",
  "Via floor box or wall plate",
  "Via local rack",
  "Via central rack",
  "Via network drop",
  "Mixed path",
  "Not sure yet",
] as const;

const SOURCE_CONNECTION_TYPES = [
  "HDMI",
  "USB-C",
  "HDMI plus USB",
  "HDBaseT handoff",
  "AVoIP or network encoder",
  "Fiber handoff",
  "Mixed transport",
  "Not sure yet",
] as const;

const SIGNAL_FORMATS = [
  "1080p",
  "4K 30",
  "4K 60",
  "5K",
  "8K",
  "Custom",
] as const;

const HDR_OPTIONS = [
  "No HDR / SDR only",
  "HDR10 or HLG",
  "Dolby Vision or advanced HDR",
  "Mixed or customer-defined HDR",
  "Not sure yet",
] as const;

const CABLE_TYPES = [
  "Direct local patch under 5m",
  "Cat5e",
  "Cat6",
  "Cat6A",
  "Cat7",
  "Fiber",
  "Existing installed cable - grade unknown",
  "Mixed media",
  "Not sure yet",
] as const;

const DISPLAY_PATH = [
  "Direct to the display",
  "Via receiver or decoder",
  "Via switcher then display",
  "Via matrix output",
  "Via video wall processor",
  "Mixed display path",
  "Not sure yet",
] as const;

const DISPLAY_CONNECTION_TYPES = [
  "HDMI",
  "USB-C",
  "HDBaseT receiver",
  "AVoIP decoder",
  "Direct matrix output",
  "Processor output",
  "Fiber handoff",
  "Mixed transport",
  "Not sure yet",
] as const;

const NETWORK_ENVIRONMENTS = [
  "No managed AV network needed",
  "Existing managed LAN",
  "Dedicated AV LAN or VLAN",
  "Shared LAN with limited control",
  "Network environment unknown",
] as const;

const USB = [
  "None",
  "HID control only",
  "USB 2.0 peripherals",
  "USB 3.0 peripherals",
  "USB-C BYOD docking",
  "Webcam, microphone, or UC soundbar",
  "Mixed peripherals",
] as const;

const USB_STANDARDS = [
  "Legacy USB / HID",
  "USB 2.0",
  "USB 3.0",
  "Mixed USB speeds",
] as const;

const AUDIO = [
  "None",
  "Display audio only",
  "Audio breakout only",
  "Microphones plus speakers",
  "DSP or Dante ready",
  "USB audio bridge",
] as const;

const AUDIO_BREAKOUT = [
  "No dedicated audio breakout",
  "Analog stereo breakout",
  "Digital audio breakout",
  "Mic line or mixed audio breakout",
] as const;

const CONTROL = [
  "None",
  "Simple room control",
  "IP control",
  "Touch panel or automation",
  "Matrix or multi-zone control",
] as const;

const POWER_PREFERENCE = [
  "Local power is fine",
  "1-way PoH preferred",
  "2-way PoH preferred",
  "No power preference yet",
] as const;

const PASSTHROUGH = ["None", "RS-232", "IR", "CEC", "USB/KVM"] as const;
const BUDGET = ["Entry", "Mid", "Performance", "Premium", "Open"] as const;
const URGENCY = ["Immediate", "This month", "This quarter", "Planning stage"] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function num(value: string | undefined): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function lower(value: string | undefined): string {
  return String(value ?? "").toLowerCase();
}

function includesAny(value: string | undefined, tokens: readonly string[]): boolean {
  const text = lower(value);
  return tokens.some((token) => text.includes(token));
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.filter((item) => item.trim())));
}

export function parseGuidedProjectSelections(value: string | undefined): string[] {
  return uniq(
    String(value ?? "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function toggleGuidedProjectSelection(current: string | undefined, option: string): string {
  const selected = parseGuidedProjectSelections(current);
  const choosingNone = option === "None";
  if (choosingNone && selected.includes("None")) {
    return "";
  }
  const base = choosingNone ? [] : selected.filter((item) => item !== "None");
  const next = base.includes(option)
    ? base.filter((item) => item !== option)
    : [...base, option];
  return (choosingNone ? ["None"] : next).join(" | ");
}

function hasSelections(value: string | undefined): boolean {
  return parseGuidedProjectSelections(value).length > 0;
}

function formatSelections(value: string | undefined, fallback = "Not confirmed"): string {
  const selected = parseGuidedProjectSelections(value);
  return selected.length > 0 ? selected.join(", ") : fallback;
}

function distanceBandLimit(value: string | undefined): number {
  switch (lower(value)) {
    case "<5m":
      return 5;
    case "<15m":
      return 15;
    case "<40m":
      return 40;
    case "<70m":
      return 70;
    case "100m":
      return 100;
    case "over 100m":
      return 140;
    default:
      return 0;
  }
}

function deriveDistanceBand(distanceM: number): string {
  if (distanceM <= 0) return "";
  if (distanceM < 5) return "<5m";
  if (distanceM < 15) return "<15m";
  if (distanceM < 40) return "<40m";
  if (distanceM < 70) return "<70m";
  if (distanceM <= 100) return "100m";
  return "Over 100m";
}

function getTransportBand(record: GuidedProjectRecord): string {
  return hasText(record.transportDistanceBand)
    ? record.transportDistanceBand
    : deriveDistanceBand(num(record.cableDistanceM));
}

function getTransportReachM(record: GuidedProjectRecord): number {
  return Math.max(num(record.cableDistanceM), distanceBandLimit(getTransportBand(record)));
}

function getSignalDemand(value: string | undefined): number {
  const selected = parseGuidedProjectSelections(value).map((item) => item.toLowerCase());
  if (selected.some((item) => item.includes("8k"))) return 5;
  if (selected.some((item) => item.includes("5k") || item.includes("custom"))) return 4;
  if (selected.some((item) => item.includes("4k 60"))) return 3;
  if (selected.some((item) => item.includes("4k 30"))) return 2;
  if (selected.some((item) => item.includes("1080"))) return 1;
  return 0;
}

function getHdrDemand(value: string | undefined): number {
  if (includesAny(value, ["dolby", "advanced"])) return 2;
  if (includesAny(value, ["hdr"])) return 1;
  return 0;
}

function getUsbDemand(value: string | undefined): number {
  const selected = parseGuidedProjectSelections(value).map((item) => item.toLowerCase());
  if (selected.some((item) => item.includes("3.0"))) return 3;
  if (selected.some((item) => item.includes("2.0"))) return 2;
  if (selected.some((item) => item.includes("hid") || item.includes("legacy"))) return 1;
  return 0;
}

function getCableRank(value: string | undefined): number {
  if (includesAny(value, ["fiber"])) return 6;
  if (includesAny(value, ["cat7"])) return 5;
  if (includesAny(value, ["cat6a"])) return 4;
  if (includesAny(value, ["cat6"])) return 3;
  if (includesAny(value, ["cat5e"])) return 2;
  if (includesAny(value, ["direct local patch"])) return 1;
  return 0;
}

function getWorkflowTrack(record: GuidedProjectRecord): string {
  if (hasText(record.workflowTrack)) return record.workflowTrack;

  const displays = num(record.displayCount);
  const sources = num(record.sourceCount);
  const output = lower(record.outputBehaviour);
  const usbDemand = getUsbDemand(record.usbStandards);

  if (displays >= 4 || includesAny(record.displayConnectionPath, ["video wall processor"])) {
    return "Build a video wall";
  }
  if (needsNetworkDetail(record)) {
    return "Distribute over network";
  }
  if (includesAny(record.usbNeeds, ["usb-c", "webcam", "microphone", "soundbar"]) || usbDemand >= 2) {
    return "Add USB or BYOD";
  }
  if (sources >= 2 || includesAny(output, ["independent"])) {
    return "Switch between devices";
  }
  if (displays >= 2 || includesAny(output, ["same content"])) {
    return "Duplicate a signal";
  }
  if (getTransportReachM(record) > 0 || hasText(record.sourceConnectionType) || hasText(record.displayConnectionType)) {
    return "Extend a signal";
  }
  return "Not sure yet";
}

function isTrack(record: GuidedProjectRecord, token: string): boolean {
  return lower(getWorkflowTrack(record)) === token;
}

function isSingleDeviceScope(record: GuidedProjectRecord): boolean {
  return includesAny(record.projectScope, ["single device", "refresh or replacement"]);
}

function isRoomScope(record: GuidedProjectRecord): boolean {
  return includesAny(record.projectScope, ["wider room", "complete room"]);
}

function needsRoomEnvelope(record: GuidedProjectRecord): boolean {
  return isTrack(record, "build a video wall") || isRoomScope(record);
}

export function shouldAskInstallationPath(record: GuidedProjectRecord): boolean {
  return (
    getTransportReachM(record) >= 10 ||
    num(record.displayCount) >= 2 ||
    isRoomScope(record) ||
    includesAny(getWorkflowTrack(record), ["extend", "duplicate", "switch", "distribute"])
  );
}

export function needsNetworkDetail(record: GuidedProjectRecord): boolean {
  return (
    lower(record.workflowTrack) === "distribute over network" ||
    includesAny(record.sourceConnectionPath, ["network"]) ||
    includesAny(record.sourceConnectionType, ["network", "avoip"]) ||
    includesAny(record.displayConnectionPath, ["decoder"]) ||
    includesAny(record.displayConnectionType, ["decoder", "avoip"]) ||
    getTransportReachM(record) > 100 ||
    (getTransportReachM(record) >= 70 && getSignalDemand(record.signalFormats) >= 3) ||
    num(record.displayCount) >= 4
  );
}

function needsSignalEnvelope(record: GuidedProjectRecord): boolean {
  return (
    hasText(record.workflowTrack) ||
    num(record.sourceCount) > 0 ||
    num(record.displayCount) > 0 ||
    getTransportReachM(record) > 0 ||
    hasText(record.sourceConnectionType) ||
    hasText(record.displayConnectionType)
  );
}

function needsSourceCableDetail(record: GuidedProjectRecord): boolean {
  return (
    hasText(record.sourceConnectionType) ||
    includesAny(record.sourceConnectionPath, ["floor box", "wall plate", "rack"]) ||
    shouldAskInstallationPath(record)
  );
}

function needsDisplayCableDetail(record: GuidedProjectRecord): boolean {
  return (
    hasText(record.displayConnectionType) ||
    includesAny(record.displayConnectionPath, ["receiver", "decoder", "switcher", "matrix", "processor"]) ||
    getTransportReachM(record) >= 10
  );
}

function needsUsbStandardDetail(record: GuidedProjectRecord): boolean {
  return (
    !includesAny(record.usbNeeds, ["none"]) &&
    (hasText(record.usbNeeds) || includesAny(record.sourceTypes, ["camera", "microphone", "soundbar", "byod"]))
  );
}

function needsAudioBreakout(record: GuidedProjectRecord): boolean {
  return !includesAny(record.audioNeeds, ["none", "display audio only"]) && hasText(record.audioNeeds);
}

function needsPassthroughDetail(record: GuidedProjectRecord): boolean {
  return (
    includesAny(getWorkflowTrack(record), ["extend", "duplicate", "switch", "distribute"]) ||
    includesAny(record.controlNeeds, ["ip control", "automation", "matrix"])
  );
}

function needsPowerPreference(record: GuidedProjectRecord): boolean {
  return (
    includesAny(getWorkflowTrack(record), ["extend", "duplicate"]) ||
    includesAny(record.sourceConnectionType, ["hdbaset"]) ||
    includesAny(record.displayConnectionType, ["hdbaset"])
  );
}

const QUESTION_DEFS: GuidedProjectQuestion[] = [
  {
    id: "workflowTrack",
    step: 0,
    label: "What is the customer actually trying to do?",
    helper: "Pick the direction that best fits the outcome before assuming a full room design.",
    input: "cards",
    options: WORKFLOW_TRACK_DETAILS.map((item) => item.value),
    optionDetails: WORKFLOW_TRACK_DETAILS,
    fullWidth: true,
  },
  {
    id: "projectScope",
    step: 0,
    label: "How wide is this conversation?",
    helper: "This keeps the workflow focused on a product shortlist when the customer only needs one device.",
    input: "cards",
    options: PROJECT_SCOPE_DETAILS.map((item) => item.value),
    optionDetails: PROJECT_SCOPE_DETAILS,
    fullWidth: true,
  },
  {
    id: "customerOutcome",
    step: 0,
    label: "Customer outcome in plain English",
    helper: "Write the actual ask, for example: send a laptop 35m to a display with USB camera support.",
    input: "textarea",
    fullWidth: true,
    placeholder: "Describe the outcome the customer is trying to achieve.",
  },
  {
    id: "applicationType",
    step: 0,
    label: "Application",
    helper: "Capture the environment, but only after the product direction is clear.",
    input: "select",
    options: APPLICATIONS,
  },
  {
    id: "sourceCount",
    step: 1,
    label: "Source count",
    helper: "How many source devices need to be supported?",
    input: "number",
    placeholder: "1",
  },
  {
    id: "displayCount",
    step: 1,
    label: "Destination count",
    helper: "How many displays or endpoints need feeding?",
    input: "number",
    placeholder: "1",
  },
  {
    id: "outputBehaviour",
    step: 1,
    label: "Output behaviour",
    helper: "This separates one-to-one extension, mirrored distribution, and true switching.",
    input: "select",
    options: OUTPUT_BEHAVIOUR,
    shouldAsk: (record) =>
      num(record.displayCount) > 0 ||
      num(record.sourceCount) > 0 ||
      !isTrack(record, "not sure yet"),
    branchReason: () => "Output behaviour is the fastest way to avoid recommending a matrix for a simple splitter job.",
  },
  {
    id: "cableDistanceM",
    step: 1,
    label: "Longest installed route (m)",
    helper: "Use the real installed route, not line-of-sight distance.",
    input: "number",
    placeholder: "35",
    shouldAsk: (record) => !isTrack(record, "build a video wall") || isSingleDeviceScope(record),
    branchReason: (record) =>
      isTrack(record, "extend a signal")
        ? "Extension workflows need a real distance early because it changes the shortlist immediately."
        : "Installed distance helps separate patching, extension, and network distribution paths.",
  },
  {
    id: "transportDistanceBand",
    step: 1,
    label: "Primary reach band",
    helper: "Choose the nearest band if the exact route length is still unknown.",
    input: "select",
    options: TRANSPORT_DISTANCE_BANDS,
    shouldAsk: (record) =>
      getTransportReachM(record) > 0 ||
      num(record.displayCount) > 0 ||
      num(record.sourceCount) > 0 ||
      !isTrack(record, "not sure yet"),
    branchReason: () => "Reach bands help keep the shortlist honest when exact site measurements are not available yet.",
  },
  {
    id: "roomLengthM",
    step: 1,
    label: "Room length (m)",
    helper: "Only needed when the broader room envelope affects the recommendation.",
    input: "number",
    placeholder: "10",
    shouldAsk: needsRoomEnvelope,
    branchReason: () => "Whole-room and video-wall paths need room dimensions; simple device asks usually do not.",
  },
  {
    id: "roomWidthM",
    step: 1,
    label: "Room width (m)",
    helper: "Useful for coverage, wall placement, and system planning.",
    input: "number",
    placeholder: "5",
    shouldAsk: needsRoomEnvelope,
    branchReason: () => "The room envelope only appears when the wider design actually depends on it.",
  },
  {
    id: "roomHeightM",
    step: 1,
    label: "Room height (m)",
    helper: "Helpful for cameras, ceiling devices, or video wall placement.",
    input: "number",
    placeholder: "2.8",
    shouldAsk: needsRoomEnvelope,
    branchReason: () => "Height matters for room-scale design but should stay out of simple product conversations.",
  },
  {
    id: "installationPath",
    step: 1,
    label: "Installation route",
    helper: "Confirm whether the signal passes through floor boxes, wall plates, racks, or reused cabling.",
    input: "select",
    options: INSTALL_PATHS,
    shouldAsk: shouldAskInstallationPath,
    branchReason: () => "The physical route often rules products out faster than the room name does.",
  },
  {
    id: "sourceTypes",
    step: 2,
    label: "Typical source types",
    helper: "Describe the source mix simply: laptops, signage players, cameras, PCs, or a mix.",
    input: "text",
    placeholder: "Laptops, PC, camera, signage player",
  },
  {
    id: "sourcePlacement",
    step: 2,
    label: "Where do the sources live?",
    helper: "Source location is one of the strongest signals for the right product family.",
    input: "select",
    options: SOURCE_PLACEMENT,
    shouldAsk: (record) => num(record.sourceCount) > 0 || !isTrack(record, "not sure yet"),
    branchReason: () => "A table source, a rack source, and a fixed behind-display source lead to very different WyreStorm paths.",
  },
  {
    id: "sourceConnectionPath",
    step: 2,
    label: "How do sources enter the system?",
    helper: "Think about the first hop: direct, via floor box, via rack, or via network.",
    input: "select",
    options: SOURCE_PATH,
    shouldAsk: (record) => num(record.sourceCount) > 0 || hasText(record.sourcePlacement) || !isTrack(record, "not sure yet"),
    branchReason: () => "The first hop tells Wingman whether this is a local switch, extender, or distributed transport question.",
  },
  {
    id: "sourceConnectionType",
    step: 2,
    label: "Source-side transport",
    helper: "What actually carries the signal into the next device boundary?",
    input: "select",
    options: SOURCE_CONNECTION_TYPES,
    shouldAsk: (record) =>
      hasText(record.sourceConnectionPath) ||
      hasText(record.sourceTypes) ||
      !isTrack(record, "not sure yet"),
    branchReason: () => "Lock down HDMI, USB-C, HDBaseT, encoder, or fiber before comparing SKUs.",
  },
  {
    id: "signalFormats",
    step: 2,
    label: "Signal formats to support",
    helper: "Tick the real formats required by the customer, not just the lowest common denominator.",
    input: "multiSelect",
    options: SIGNAL_FORMATS,
    fullWidth: true,
    shouldAsk: needsSignalEnvelope,
    branchReason: () => "Resolution and frame rate materially change which extenders and switchers stay credible.",
  },
  {
    id: "signalHdr",
    step: 2,
    label: "HDR requirement",
    helper: "HDR often changes transport viability, so capture it explicitly when it matters.",
    input: "select",
    options: HDR_OPTIONS,
    shouldAsk: (record) => hasSelections(record.signalFormats),
    branchReason: () => "HDR can be the difference between a safe shortlist and a risky one.",
  },
  {
    id: "sourceCableType",
    step: 2,
    label: "Source-side cable medium",
    helper: "Capture the likely cable grade between the source and the next device.",
    input: "select",
    options: CABLE_TYPES,
    shouldAsk: needsSourceCableDetail,
    branchReason: () => "Cable grade matters once distance, USB, and 4K60 enter the conversation.",
  },
  {
    id: "displayConnectionPath",
    step: 2,
    label: "How do destinations receive the signal?",
    helper: "Think about the final hop: direct, receiver, decoder, switcher, matrix, or processor.",
    input: "select",
    options: DISPLAY_PATH,
    shouldAsk: (record) => num(record.displayCount) > 0 || !isTrack(record, "not sure yet"),
    branchReason: () => "The endpoint path often reveals whether this is extension, switching, or processing.",
  },
  {
    id: "displayConnectionType",
    step: 2,
    label: "Destination-side transport",
    helper: "What transport arrives at the display or endpoint device?",
    input: "select",
    options: DISPLAY_CONNECTION_TYPES,
    shouldAsk: (record) => num(record.displayCount) > 0 || hasText(record.displayConnectionPath),
    branchReason: () => "Final transport tells Wingman whether it should keep looking at receivers, decoders, or direct outputs.",
  },
  {
    id: "displayCableType",
    step: 2,
    label: "Destination-side cable medium",
    helper: "Capture the likely cable grade on the last leg to the display or endpoint.",
    input: "select",
    options: CABLE_TYPES,
    shouldAsk: needsDisplayCableDetail,
    branchReason: () => "The last leg can rule out a product even when the core path looks viable.",
  },
  {
    id: "networkEnvironment",
    step: 2,
    label: "Network environment",
    helper: "Only appears when the workflow points to AVoIP or decoder-led transport.",
    input: "select",
    options: NETWORK_ENVIRONMENTS,
    shouldAsk: needsNetworkDetail,
    branchReason: () => "A network-led recommendation is only valuable if the customer actually has the right network environment.",
  },
  {
    id: "usbNeeds",
    step: 3,
    label: "USB workflow",
    helper: "Capture the use case first, then the USB class if bandwidth matters.",
    input: "select",
    options: USB,
  },
  {
    id: "usbStandards",
    step: 3,
    label: "USB bandwidth to support",
    helper: "Tick the USB class required by cameras, microphones, touch, or BYOD peripherals.",
    input: "multiSelect",
    options: USB_STANDARDS,
    fullWidth: true,
    shouldAsk: needsUsbStandardDetail,
    branchReason: () => "USB bandwidth is often the detail that takes the shortlist from five SKUs down to two.",
  },
  {
    id: "audioNeeds",
    step: 3,
    label: "Audio needs",
    helper: "Capture whether audio is incidental, broken out, or part of a larger DSP path.",
    input: "select",
    options: AUDIO,
  },
  {
    id: "audioBreakout",
    step: 3,
    label: "Audio breakout requirement",
    helper: "Confirm whether the product needs analog or digital audio extraction.",
    input: "select",
    options: AUDIO_BREAKOUT,
    shouldAsk: needsAudioBreakout,
    branchReason: () => "Audio breakout is often a hard product filter, not a nice-to-have.",
  },
  {
    id: "controlNeeds",
    step: 3,
    label: "Control needs",
    helper: "Simple control versus automation changes the shortlist.",
    input: "select",
    options: CONTROL,
  },
  {
    id: "passthroughNeeds",
    step: 3,
    label: "Pass-through requirements",
    helper: "Only confirm what the customer actually needs: RS-232, IR, CEC, or USB/KVM.",
    input: "multiSelect",
    options: PASSTHROUGH,
    fullWidth: true,
    shouldAsk: needsPassthroughDetail,
    branchReason: () => "Pass-through can be the minimum spec that separates similar extenders and switchers.",
  },
  {
    id: "powerPreference",
    step: 3,
    label: "Power preference",
    helper: "Confirm whether local power is acceptable or PoH matters.",
    input: "select",
    options: POWER_PREFERENCE,
    shouldAsk: needsPowerPreference,
    branchReason: () => "Powering strategy can eliminate otherwise similar point-to-point products.",
  },
  {
    id: "budgetBand",
    step: 3,
    label: "Budget band",
    helper: "Useful for tiering without forcing a full commercial exercise.",
    input: "select",
    options: BUDGET,
  },
  {
    id: "urgency",
    step: 3,
    label: "Urgency",
    helper: "Helps decide how much detail is needed immediately.",
    input: "select",
    options: URGENCY,
  },
  {
    id: "notes",
    step: 3,
    label: "Notes, caveats, or unknowns",
    helper: "Capture anything that materially changes the shortlist or leaves risk open.",
    input: "textarea",
    fullWidth: true,
    placeholder: "Existing cabling, consultant preferences, open questions, or unusual constraints.",
  },
];

export function createEmptyGuidedProjectRecord(): GuidedProjectRecord {
  return {
    workflowTrack: "",
    projectScope: "",
    customerOutcome: "",
    customer: "",
    site: "",
    roomName: "",
    applicationType: "",
    roomLengthM: "",
    roomWidthM: "",
    roomHeightM: "",
    installationPath: "",
    cableDistanceM: "",
    transportDistanceBand: "",
    displayCount: "",
    sourceCount: "",
    outputBehaviour: "",
    sourceTypes: "",
    sourcePlacement: "",
    sourceConnectionPath: "",
    sourceConnectionType: "",
    signalFormats: "",
    signalHdr: "",
    sourceCableType: "",
    displayConnectionPath: "",
    displayConnectionType: "",
    displayCableType: "",
    networkEnvironment: "",
    usbNeeds: "",
    usbStandards: "",
    audioNeeds: "",
    audioBreakout: "",
    controlNeeds: "",
    powerPreference: "",
    passthroughNeeds: "",
    budgetBand: "",
    urgency: "",
    notes: "",
    recommendedFamilies: [],
    recommendedNextTool: "",
    createdAt: nowIso(),
  };
}

export function getVisibleQuestionsForStep(
  record: GuidedProjectRecord,
  step: GuidedProjectStep,
): GuidedProjectQuestionState[] {
  return QUESTION_DEFS.filter((question) => {
    if (question.step !== step) return false;
    return question.shouldAsk ? question.shouldAsk(record) : true;
  }).map((question) => ({
    ...question,
    activeBranch: Boolean(question.shouldAsk),
    branchReasonText: question.branchReason?.(record),
  }));
}

export function getGuidedProjectProgress(record: GuidedProjectRecord): GuidedProjectProgress[] {
  return ([0, 1, 2, 3] as GuidedProjectStep[]).map((step) => {
    const questions = getVisibleQuestionsForStep(record, step);
    const complete = questions.filter((question) => hasText(String(record[question.id] ?? ""))).length;
    return {
      complete,
      total: questions.length,
    };
  });
}

export function buildBranchHighlights(record: GuidedProjectRecord): string[] {
  const items: string[] = [];

  if (!hasText(record.workflowTrack)) {
    items.push("Choose the direction card that best matches the customer outcome before talking about room scope.");
  }
  if (!hasText(record.projectScope)) {
    items.push("Confirm whether this is a single-device need, part of a room workflow, or a complete system.");
  }
  if (!hasText(record.customerOutcome)) {
    items.push("Capture the customer ask in one plain-English sentence so the workflow stays outcome-led.");
  }
  if (!hasText(record.sourceCount)) {
    items.push("Confirm how many source devices need support.");
  }
  if (!hasText(record.displayCount)) {
    items.push("Confirm how many displays or endpoints must be fed.");
  }
  if (
    !hasText(record.outputBehaviour) &&
    (num(record.displayCount) >= 2 || num(record.sourceCount) >= 2 || !isTrack(record, "not sure yet"))
  ) {
    items.push("Clarify whether outputs are mirrored or independently switched.");
  }
  if (
    !hasText(record.cableDistanceM) &&
    !hasText(record.transportDistanceBand) &&
    !isTrack(record, "build a video wall")
  ) {
    items.push("Get the real installed distance to separate patching, extension, and network-led options.");
  }
  if (!hasSelections(record.signalFormats)) {
    items.push("Resolution and frame-rate requirements are still open.");
  }
  if (hasSelections(record.signalFormats) && !hasText(record.signalHdr)) {
    items.push("HDR is still unconfirmed, which can change the viable transport options.");
  }
  if (needsUsbStandardDetail(record) && !hasSelections(record.usbStandards)) {
    items.push("USB class is still open; USB 2.0 and USB 3.0 should not be treated as equivalent.");
  }
  if (needsAudioBreakout(record) && !hasText(record.audioBreakout)) {
    items.push("Audio breakout needs are still unclear.");
  }
  if (needsPowerPreference(record) && !hasText(record.powerPreference)) {
    items.push("Confirm whether local power, 1-way PoH, or 2-way PoH is preferred.");
  }
  if (needsPassthroughDetail(record) && !hasSelections(record.passthroughNeeds)) {
    items.push("Pass-through detail is still missing: RS-232, IR, CEC, or USB/KVM.");
  }
  if (needsNetworkDetail(record) && !hasText(record.networkEnvironment)) {
    items.push("Validate the network environment before treating AVoIP as safe.");
  }
  if (
    needsRoomEnvelope(record) &&
    (!hasText(record.roomLengthM) || !hasText(record.roomWidthM) || !hasText(record.roomHeightM))
  ) {
    items.push("The wider room envelope is still incomplete for this architecture-led path.");
  }

  return uniq(items).slice(0, 6);
}

function lensState(resolved: boolean, active: boolean): GuidedProjectLens["state"] {
  if (resolved) return "resolved";
  if (active) return "active";
  return "watch";
}

export function buildGuidedProjectLenses(record: GuidedProjectRecord): GuidedProjectLens[] {
  const workflowTrack = getWorkflowTrack(record);
  const transportBand = getTransportBand(record);
  const trackConfirmed = hasText(record.workflowTrack);
  const scopeConfirmed = hasText(record.projectScope);
  const pathConfirmed =
    hasText(record.sourceCount) &&
    hasText(record.displayCount) &&
    hasText(record.outputBehaviour) &&
    (hasText(record.cableDistanceM) || hasText(transportBand) || isTrack(record, "build a video wall"));
  const signalConfirmed =
    hasSelections(record.signalFormats) &&
    (!hasSelections(record.signalFormats) || hasText(record.signalHdr)) &&
    (!needsUsbStandardDetail(record) || hasSelections(record.usbStandards));
  const deploymentConfirmed =
    hasText(record.controlNeeds) &&
    (!needsAudioBreakout(record) || hasText(record.audioBreakout)) &&
    (!needsPassthroughDetail(record) || hasSelections(record.passthroughNeeds)) &&
    (!needsPowerPreference(record) || hasText(record.powerPreference)) &&
    (!needsNetworkDetail(record) || hasText(record.networkEnvironment));

  return [
    {
      id: "customer-outcome",
      title: "Customer outcome",
      state: lensState(trackConfirmed && scopeConfirmed && hasText(record.customerOutcome), trackConfirmed || scopeConfirmed),
      summary:
        trackConfirmed && scopeConfirmed
          ? `${workflowTrack} is the active path for a ${record.projectScope.toLowerCase()} conversation.`
          : "Wingman still needs the directional outcome and the true project scope before it should assume a system design.",
      prompts: uniq([
        trackConfirmed ? `Direction chosen: ${record.workflowTrack}.` : "Choose the direction card that best matches the customer ask.",
        scopeConfirmed ? `Scope: ${record.projectScope}.` : "Confirm whether this is a single-device need or a broader room/system conversation.",
        hasText(record.customerOutcome) ? `Outcome: ${record.customerOutcome}.` : "Capture the customer outcome in one plain-English sentence.",
      ]).slice(0, 3),
    },
    {
      id: "path-shape",
      title: "Path shape",
      state: lensState(pathConfirmed, hasText(record.sourceCount) || hasText(record.displayCount) || hasText(transportBand)),
      summary:
        pathConfirmed
          ? `${record.sourceCount || "1"} source(s), ${record.displayCount || "1"} destination(s), ${record.outputBehaviour.toLowerCase()}, and ${transportBand || `${record.cableDistanceM}m`} reach are now defined.`
          : "Wingman still needs counts, output behaviour, or reach before it can trust the product category.",
      prompts: uniq([
        hasText(record.sourceCount) ? `Sources: ${record.sourceCount}.` : "Confirm the number of source devices.",
        hasText(record.displayCount) ? `Destinations: ${record.displayCount}.` : "Confirm the number of displays or endpoints.",
        hasText(record.outputBehaviour) ? `Output behaviour: ${record.outputBehaviour}.` : "Confirm whether outputs are mirrored or independently switched.",
        hasText(transportBand) ? `Reach band: ${transportBand}.` : "Capture the practical reach band or installed distance.",
      ]).slice(0, 4),
    },
    {
      id: "signal-envelope",
      title: "Signal envelope",
      state: lensState(signalConfirmed, hasSelections(record.signalFormats) || hasSelections(record.usbStandards) || hasText(record.signalHdr)),
      summary:
        signalConfirmed
          ? `The working envelope is ${formatSelections(record.signalFormats).toLowerCase()} with ${record.signalHdr.toLowerCase()}${needsUsbStandardDetail(record) ? ` and ${formatSelections(record.usbStandards).toLowerCase()} USB` : ""}.`
          : "Wingman still needs the real video and USB envelope before it can narrow the shortlist with confidence.",
      prompts: uniq([
        hasSelections(record.signalFormats) ? `Video formats: ${formatSelections(record.signalFormats)}.` : "Tick the real signal formats: 1080p, 4K30, 4K60, 5K, 8K, or custom.",
        hasText(record.signalHdr) ? `HDR: ${record.signalHdr}.` : hasSelections(record.signalFormats) ? "Confirm whether HDR matters." : "",
        needsUsbStandardDetail(record)
          ? (hasSelections(record.usbStandards) ? `USB class: ${formatSelections(record.usbStandards)}.` : "Tick the required USB class.")
          : "",
      ]).slice(0, 3),
    },
    {
      id: "deployment-detail",
      title: "Deployment detail",
      state: lensState(
        deploymentConfirmed,
        hasText(record.audioNeeds) || hasText(record.controlNeeds) || hasText(record.powerPreference) || hasText(record.networkEnvironment),
      ),
      summary:
        deploymentConfirmed
          ? "Wingman has enough deployment detail to separate similar-looking SKUs by control, power, and breakout requirements."
          : "Wingman still needs the deployment detail that often decides between the last two product options.",
      prompts: uniq([
        hasText(record.audioNeeds) ? `Audio: ${record.audioNeeds}.` : "Confirm whether audio is incidental, broken out, or part of a larger DSP path.",
        needsAudioBreakout(record) ? (hasText(record.audioBreakout) ? `Audio breakout: ${record.audioBreakout}.` : "Confirm the audio breakout requirement.") : "",
        hasText(record.controlNeeds) ? `Control: ${record.controlNeeds}.` : "Confirm the control expectation.",
        needsPassthroughDetail(record)
          ? (hasSelections(record.passthroughNeeds) ? `Pass-through: ${formatSelections(record.passthroughNeeds)}.` : "Confirm RS-232, IR, CEC, or USB/KVM pass-through.")
          : "",
        needsPowerPreference(record)
          ? (hasText(record.powerPreference) ? `Power: ${record.powerPreference}.` : "Confirm the power preference.")
          : "",
        needsNetworkDetail(record)
          ? (hasText(record.networkEnvironment) ? `Network: ${record.networkEnvironment}.` : "Confirm the network environment.")
          : "",
      ]).slice(0, 5),
    },
  ];
}

export function buildGuidedProjectAdvice(record: GuidedProjectRecord): GuidedProjectAdvice {
  const workflowTrack = getWorkflowTrack(record);
  const track = lower(workflowTrack);
  const scope = lower(record.projectScope);
  const outputBehaviour = lower(record.outputBehaviour);
  const sourcePlacement = lower(record.sourcePlacement);
  const sourcePath = lower(record.sourceConnectionPath);
  const sourceConnectionType = lower(record.sourceConnectionType);
  const displayPath = lower(record.displayConnectionPath);
  const displayConnectionType = lower(record.displayConnectionType);
  const usbNeeds = lower(record.usbNeeds);
  const audioNeeds = lower(record.audioNeeds);
  const controlNeeds = lower(record.controlNeeds);
  const transportBand = getTransportBand(record);
  const transportReachM = getTransportReachM(record);
  const signalDemand = getSignalDemand(record.signalFormats);
  const hdrDemand = getHdrDemand(record.signalHdr);
  const usbDemand = getUsbDemand(record.usbStandards);
  const sources = num(record.sourceCount);
  const displays = num(record.displayCount);
  const sameContent = includesAny(outputBehaviour, ["same content"]);
  const independentSwitching = includesAny(outputBehaviour, ["independent"]);
  const passthroughSelections = parseGuidedProjectSelections(record.passthroughNeeds);
  const structuredCableKnown =
    includesAny(record.sourceCableType, ["cat5e", "cat6", "cat6a", "cat7", "fiber"]) ||
    includesAny(record.displayCableType, ["cat5e", "cat6", "cat6a", "cat7", "fiber"]);
  const premiumCable = Math.max(getCableRank(record.sourceCableType), getCableRank(record.displayCableType)) >= 4;
  const networkLed =
    includesAny(sourcePath, ["network"]) ||
    includesAny(sourceConnectionType, ["network", "avoip"]) ||
    includesAny(displayPath, ["decoder"]) ||
    includesAny(displayConnectionType, ["decoder", "avoip"]);
  const collaborationRoom =
    includesAny(record.applicationType, ["meeting", "boardroom", "huddle", "training", "classroom", "flexible"]) ||
    includesAny(usbNeeds, ["usb-c", "soundbar", "webcam", "microphone", "byod"]);

  const scores: Record<GuidedProjectFamily, number> = {
    Apollo: 0,
    HDBaseT: 0,
    AVoIP: 0,
    Matrix: 0,
    "USB Extension": 0,
    "Video Wall": 0,
  };
  const reasons: string[] = [];
  const cues: string[] = [];
  const nextActions: string[] = [];

  function addScore(family: GuidedProjectFamily, score: number, reason: string) {
    scores[family] += score;
    if (score > 0) reasons.push(reason);
  }

  let focusCategory = "AV product shortlist";
  let workflowSummary =
    "Wingman is still turning the customer outcome into a product category, so the next questions should stay practical and specific.";

  if (track === "extend a signal") {
    focusCategory =
      usbDemand >= 2 || !includesAny(record.usbNeeds, ["none"]) || passthroughSelections.includes("USB/KVM")
        ? "USB-capable extender kit"
        : "Point-to-point extender kit";
    workflowSummary =
      "Treat this as an extension problem first, then narrow by distance, signal envelope, USB class, power, and pass-through detail.";
    addScore("HDBaseT", 5, "The customer outcome is a point-to-point extension path, so HDBaseT remains the lead family until the capability envelope rules it out.");
    if (usbDemand >= 2 || !includesAny(record.usbNeeds, ["none"])) {
      addScore("USB Extension", 4, "USB devices are part of the path, so USB transport needs to be solved explicitly rather than assumed.");
    }
  } else if (track === "duplicate a signal") {
    focusCategory =
      transportReachM >= 15
        ? "Distribution amplifier or mirrored extender set"
        : "Splitter / distribution amplifier";
    workflowSummary =
      "Keep this in distribution language until the questions prove the customer really needs switching, matrix routing, or network transport.";
    addScore("Matrix", 2, "A one-to-many signal flow points to distribution logic, even if the final product is a splitter rather than a full matrix.");
    if (transportReachM >= 10) {
      addScore("HDBaseT", 3, "Mirroring over distance suggests the shortlist should include distribution products that solve transport as well as duplication.");
    }
  } else if (track === "switch between devices") {
    const presentationLed =
      (sources <= 3 && displays <= 2) ||
      collaborationRoom ||
      includesAny(record.sourceTypes, ["laptop", "byod", "usb-c"]);
    focusCategory = presentationLed ? "Multi-format presentation switcher" : "Matrix switch";
    workflowSummary =
      "This is a switching conversation, so the key split is between a presentation switcher for a user workflow and a matrix switch for routing flexibility.";
    addScore(
      presentationLed ? "Apollo" : "Matrix",
      5,
      presentationLed
        ? "The source mix and room workflow look presentation-led, which favours a multi-format switcher."
        : "The number of sources and routing behaviour point toward matrix switching.",
    );
    if (transportReachM >= 10) {
      addScore("HDBaseT", 2, "Distance still matters because the switching product may also need to solve the transport path.");
    }
  } else if (track === "distribute over network") {
    const networkScale = sources + displays;
    focusCategory =
      networkScale >= 6 || includesAny(controlNeeds, ["automation", "matrix", "ip"])
        ? "AVoIP controller"
        : "AVoIP encoder / decoder system";
    workflowSummary =
      "This is a distributed AV problem, so the next questions should validate network readiness and then narrow between endpoint devices and controller requirements.";
    addScore("AVoIP", 6, "The customer outcome is network-led, which makes AVoIP the lead family.");
  } else if (track === "build a video wall") {
    focusCategory = "Video wall processor";
    workflowSummary =
      "Treat this as a processor-led display design rather than a generic switching or extension workflow.";
    addScore("Video Wall", 6, "The active path is explicitly video-wall-led, so processing and display topology should drive the recommendation.");
    addScore("Matrix", 1, "Video wall projects can still need source routing, but processing remains the lead category.");
  } else if (track === "add usb or byod") {
    const switcherLed =
      collaborationRoom ||
      sources >= 2 ||
      includesAny(record.usbNeeds, ["usb-c", "byod", "soundbar"]);
    focusCategory = switcherLed ? "Multi-format presentation switcher" : "USB extension kit";
    workflowSummary =
      "The shortlist should stay focused on collaboration workflow, USB transport class, and room peripheral support instead of generic room architecture.";
    addScore("Apollo", switcherLed ? 5 : 2, "The customer outcome is collaboration-led, so the shortlist should protect the user experience first.");
    addScore("USB Extension", 4, "USB transport is a first-order requirement in this workflow.");
  } else {
    workflowSummary =
      "Wingman is still determining whether this is an extension, distribution, switching, or USB-led problem, so the first priority is choosing the right direction card.";
    addScore("Apollo", 1, "With limited direction, a presentation-led baseline is the safest placeholder.");
  }

  if (transportReachM > 0 && transportReachM <= 100 && track !== "distribute over network") {
    addScore("HDBaseT", 2, "The installed reach still fits a structured-cable extension conversation.");
  }
  if (transportReachM > 100 || networkLed) {
    addScore("AVoIP", 3, "The transport cues are starting to look distributed or decoder-led rather than purely point-to-point.");
  }
  if (sources >= 3 || independentSwitching) {
    addScore("Matrix", 3, "The routing behaviour suggests the shortlist should keep matrix-style switching options in play.");
  }
  if (displays >= 4 || includesAny(displayPath, ["video wall processor"]) || includesAny(displayConnectionType, ["processor"])) {
    addScore("Video Wall", 4, "The destination model looks processor-led rather than a simple display handoff.");
  }
  if (usbDemand >= 2 || !includesAny(record.usbNeeds, ["none"])) {
    addScore("USB Extension", 2, "USB support is part of the outcome, so the shortlist must respect the actual USB class.");
  }
  if (collaborationRoom || includesAny(sourcePlacement, ["mostly byod at the table"])) {
    addScore("Apollo", 2, "The environment looks collaboration-led, so user workflow still matters even when the device category is narrow.");
  }
  if (sameContent && displays >= 2) {
    addScore("Matrix", 1, "Multiple mirrored outputs create a distribution question even if the final product is not a full matrix.");
  }
  if (structuredCableKnown && premiumCable && track !== "distribute over network") {
    addScore("HDBaseT", 1, "Known structured cabling supports a credible HDBaseT shortlist.");
  }
  if (audioNeeds.includes("dsp") || audioNeeds.includes("dante")) {
    addScore("AVoIP", 1, "A network-aware audio path often pairs naturally with distributed AV conversations.");
  }
  if (signalDemand >= 4 && transportReachM >= 70) {
    addScore("AVoIP", 1, "Higher capability video over longer reach starts to favour distributed transport.");
  }
  if (hdrDemand >= 1 && transportReachM >= 40) {
    addScore("AVoIP", 1, "HDR over longer structured runs deserves a transport path with more headroom.");
  }
  if (hdrDemand === 0 && track === "extend a signal" && transportReachM <= 70) {
    addScore("HDBaseT", 1, "A simpler SDR envelope keeps point-to-point extension highly credible.");
  }

  if (!hasText(record.workflowTrack)) {
    nextActions.push("Choose the top-line direction card that best matches the customer outcome.");
  }
  if (!hasText(record.projectScope)) {
    nextActions.push("Confirm whether this is a single-device ask, part of a room workflow, or a full-system design.");
  }
  if (!hasText(record.customerOutcome)) {
    nextActions.push("Write the customer ask in one plain-English sentence.");
  }
  if (!hasText(record.sourceCount)) {
    nextActions.push("Confirm the number of source devices.");
  }
  if (!hasText(record.displayCount)) {
    nextActions.push("Confirm the number of displays or destinations.");
  }
  if (
    !hasText(record.outputBehaviour) &&
    (sources >= 1 || displays >= 1 || track === "duplicate a signal" || track === "switch between devices")
  ) {
    nextActions.push("Confirm whether the outputs are mirrored or independently switched.");
  }
  if (!hasText(record.cableDistanceM) && !hasText(record.transportDistanceBand) && track !== "build a video wall") {
    nextActions.push("Capture the installed route length or reach band.");
  }
  if (!hasSelections(record.signalFormats)) {
    nextActions.push("Tick the real signal formats required by the customer.");
  }
  if (hasSelections(record.signalFormats) && !hasText(record.signalHdr)) {
    nextActions.push("Confirm whether HDR matters.");
  }
  if (needsUsbStandardDetail(record) && !hasSelections(record.usbStandards)) {
    nextActions.push("Confirm whether the workflow needs HID, USB 2.0, or USB 3.0.");
  }
  if (needsAudioBreakout(record) && !hasText(record.audioBreakout)) {
    nextActions.push("Confirm the audio breakout requirement.");
  }
  if (needsPowerPreference(record) && !hasText(record.powerPreference)) {
    nextActions.push("Confirm whether local power, 1-way PoH, or 2-way PoH is preferred.");
  }
  if (needsPassthroughDetail(record) && !hasSelections(record.passthroughNeeds)) {
    nextActions.push("Confirm pass-through needs such as RS-232, IR, CEC, or USB/KVM.");
  }
  if (needsNetworkDetail(record) && !hasText(record.networkEnvironment)) {
    nextActions.push("Validate whether the customer has a suitable managed AV network or VLAN.");
  }
  if (needsRoomEnvelope(record) && (!hasText(record.roomLengthM) || !hasText(record.roomWidthM))) {
    nextActions.push("Capture the room envelope because this path now affects the wider design.");
  }

  cues.push(`Current direction: ${workflowTrack}.`);
  if (hasText(record.projectScope)) cues.push(`Scope: ${record.projectScope}.`);
  if (hasText(record.customerOutcome)) cues.push(`Outcome: ${record.customerOutcome}.`);
  if (hasText(record.outputBehaviour)) cues.push(`Output behaviour: ${record.outputBehaviour}.`);
  if (sources > 0) cues.push(`Sources: ${sources}.`);
  if (displays > 0) cues.push(`Destinations: ${displays}.`);
  if (hasText(transportBand)) cues.push(`Reach band: ${transportBand}.`);
  if (hasSelections(record.signalFormats)) cues.push(`Video formats: ${formatSelections(record.signalFormats)}.`);
  if (hasText(record.signalHdr)) cues.push(`HDR: ${record.signalHdr}.`);
  if (hasSelections(record.usbStandards)) cues.push(`USB class: ${formatSelections(record.usbStandards)}.`);
  if (hasText(record.powerPreference)) cues.push(`Power preference: ${record.powerPreference}.`);
  if (hasSelections(record.passthroughNeeds)) cues.push(`Pass-through: ${formatSelections(record.passthroughNeeds)}.`);
  if (hasText(record.networkEnvironment)) cues.push(`Network: ${record.networkEnvironment}.`);
  if (hasText(record.audioBreakout)) cues.push(`Audio breakout: ${record.audioBreakout}.`);

  const order: GuidedProjectFamily[] = ["Video Wall", "AVoIP", "Matrix", "HDBaseT", "Apollo", "USB Extension"];
  const positiveFamilies = order.filter((family) => scores[family] > 0);
  const fallbackByTrack: GuidedProjectFamily =
    track === "build a video wall"
      ? "Video Wall"
      : track === "distribute over network"
        ? "AVoIP"
        : track === "switch between devices" || track === "duplicate a signal"
          ? "Matrix"
          : track === "add usb or byod"
            ? "Apollo"
            : "HDBaseT";

  const families =
    positiveFamilies.length > 0
      ? [...positiveFamilies].sort((left, right) => {
          const diff = scores[right] - scores[left];
          return diff !== 0 ? diff : order.indexOf(left) - order.indexOf(right);
        })
      : [fallbackByTrack];

  const primary = families[0] ?? fallbackByTrack;
  const targetedCategory =
    isSingleDeviceScope(record) ||
    includesAny(scope, ["refresh or replacement"]) ||
    track === "extend a signal" ||
    track === "duplicate a signal" ||
    track === "switch between devices" ||
    track === "add usb or byod";
  const networkArchitecture = track === "distribute over network" && sources + displays >= 4 && !isSingleDeviceScope(record);
  const nextToolPath =
    primary === "Video Wall"
      ? WM_ROUTES.videowall
      : targetedCategory || !isRoomScope(record)
        ? WM_ROUTES.catalogue
        : networkArchitecture
          ? WM_ROUTES.templates
          : WM_ROUTES.catalogue;

  const coreSignals = [
    hasText(record.workflowTrack) ? "track" : "",
    hasText(record.projectScope) ? "scope" : "",
    hasText(record.customerOutcome) ? "outcome" : "",
    hasText(record.applicationType) ? "application" : "",
    hasText(record.sourceCount) ? "sources" : "",
    hasText(record.displayCount) ? "displays" : "",
    hasText(record.outputBehaviour) ? "output" : "",
    hasText(record.cableDistanceM) || hasText(transportBand) ? "distance" : "",
    hasText(record.sourceConnectionType) ? "sourceTransport" : "",
    hasText(record.displayConnectionType) ? "displayTransport" : "",
    hasSelections(record.signalFormats) ? "formats" : "",
    hasText(record.signalHdr) || !hasSelections(record.signalFormats) ? "hdr" : "",
    hasText(record.usbNeeds) ? "usbNeeds" : "",
    hasSelections(record.usbStandards) || !needsUsbStandardDetail(record) ? "usbClass" : "",
    hasText(record.audioNeeds) ? "audioNeeds" : "",
    hasText(record.audioBreakout) || !needsAudioBreakout(record) ? "audioBreakout" : "",
    hasText(record.controlNeeds) ? "control" : "",
    hasText(record.powerPreference) || !needsPowerPreference(record) ? "power" : "",
    hasSelections(record.passthroughNeeds) || !needsPassthroughDetail(record) ? "passthrough" : "",
    hasText(record.networkEnvironment) || !needsNetworkDetail(record) ? "network" : "",
  ].filter(Boolean).length;

  const confidence: GuidedProjectConfidence =
    coreSignals >= 15 ? "High" : coreSignals >= 10 ? "Medium" : "Low";

  return {
    primary,
    confidence,
    families,
    focusCategory,
    workflowSummary,
    summary: `${focusCategory} is the lead category right now. ${workflowSummary}`,
    cues: uniq(cues).slice(0, 7),
    reasons: uniq(reasons).slice(0, 6),
    nextActions: uniq(nextActions).slice(0, 6),
    nextToolPath,
  };
}

export function buildGuidedProjectNotes(record: GuidedProjectRecord, advice: GuidedProjectAdvice): string {
  return [
    record.notes.trim(),
    "Guided Project summary:",
    `Direction: ${hasText(record.workflowTrack) ? record.workflowTrack : getWorkflowTrack(record)}`,
    `Scope: ${record.projectScope || "Not confirmed"}`,
    `Likely category: ${advice.focusCategory}`,
    `Primary family: ${advice.primary} (${advice.confidence})`,
    `Customer outcome: ${record.customerOutcome || "Not confirmed"}`,
    `Application: ${record.applicationType || "Not confirmed"}`,
    `Sources: ${record.sourceCount || "Not confirmed"}`,
    `Destinations: ${record.displayCount || "Not confirmed"}`,
    `Output behaviour: ${record.outputBehaviour || "Not confirmed"}`,
    `Reach band: ${getTransportBand(record) || "Not confirmed"}`,
    `Installed route: ${record.cableDistanceM || "Not confirmed"} m`,
    `Installation path: ${record.installationPath || "Not confirmed"}`,
    `Source placement: ${record.sourcePlacement || "Not confirmed"}`,
    `Source ingress: ${record.sourceConnectionPath || "Not confirmed"}`,
    `Source transport: ${record.sourceConnectionType || "Not confirmed"}`,
    `Source cable medium: ${record.sourceCableType || "Not confirmed"}`,
    `Destination path: ${record.displayConnectionPath || "Not confirmed"}`,
    `Destination transport: ${record.displayConnectionType || "Not confirmed"}`,
    `Destination cable medium: ${record.displayCableType || "Not confirmed"}`,
    `Signal formats: ${formatSelections(record.signalFormats)}`,
    `HDR requirement: ${record.signalHdr || "Not confirmed"}`,
    `USB workflow: ${record.usbNeeds || "Not confirmed"}`,
    `USB bandwidth: ${formatSelections(record.usbStandards)}`,
    `Audio needs: ${record.audioNeeds || "Not confirmed"}`,
    `Audio breakout: ${record.audioBreakout || "Not confirmed"}`,
    `Control needs: ${record.controlNeeds || "Not confirmed"}`,
    `Pass-through: ${formatSelections(record.passthroughNeeds)}`,
    `Power preference: ${record.powerPreference || "Not confirmed"}`,
    `Network environment: ${record.networkEnvironment || "Not confirmed"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getNextToolLabel(path: string): string {
  if (path === WM_ROUTES.videowall) return "Video Wall Designer";
  if (path === WM_ROUTES.templates) return "Architecture Templates";
  return "Product Catalog";
}
