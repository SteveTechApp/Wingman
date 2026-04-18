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
  switchSolutionType: string;
  matrixIoPreset: string;
  featureRequirements: string;
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
  transportCableType: string;
  displayCount: string;
  sourceCount: string;
  sourceInventory: string;
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


const HIDDEN_QUESTION_IDS_BY_PATH: Record<string, Array<keyof GuidedProjectRecord>> = {
  extend: [
    "sourceCount",
    "sourceConnectionType",
    "displayCount",
    "displayConnectionType",
    "outputBehaviour",
    "featureRequirements",
    "networkEnvironment",
    "usbNeeds",
    "audioNeeds",
    "controlNeeds",
    "roomLengthM",
    "roomWidthM",
    "roomHeightM",
  ],
  duplicate: [
    "sourceCount",
    "sourceConnectionType",
    "displayConnectionType",
    "outputBehaviour",
    "networkEnvironment",
    "usbNeeds",
    "usbStandards",
    "audioNeeds",
    "controlNeeds",
    "powerPreference",
    "roomLengthM",
    "roomWidthM",
    "roomHeightM",
  ],
  switch: [
    "networkEnvironment",
    "roomLengthM",
    "roomWidthM",
    "roomHeightM",
  ],
  network: [
    "sourceConnectionType",
    "displayConnectionType",
    "cableDistanceM",
    "transportDistanceBand",
    "installationPath",
    "audioBreakout",
    "powerPreference",
    "passthroughNeeds",
    "roomLengthM",
    "roomWidthM",
    "roomHeightM",
  ],
  videowall: [
    "sourceConnectionType",
    "displayConnectionType",
    "outputBehaviour",
    "cableDistanceM",
    "transportDistanceBand",
    "installationPath",
    "networkEnvironment",
    "usbStandards",
    "audioBreakout",
    "powerPreference",
    "passthroughNeeds",
    "roomLengthM",
    "roomWidthM",
    "roomHeightM",
  ],
};

export function getHiddenQuestionIdsForTrack(track: string) {
  const path = normalizeDiscoveryPath(track);
  return HIDDEN_QUESTION_IDS_BY_PATH[path] ?? [];
}

function shouldHideQuestionIdForTrack(track: string, questionId: keyof GuidedProjectRecord) {
  return getHiddenQuestionIdsForTrack(track).includes(questionId);
}

function normalizeDiscoveryPath(value?: string) {
  const v = (value ?? "").trim().toLowerCase();

  if (v.includes("extend")) return "extend";
  if (v.includes("duplicate")) return "duplicate";
  if (v.includes("switch")) return "switch";
  if (v.includes("network") || v.includes("avoip") || v.includes("distribute")) return "network";
  if (v.includes("video wall") || v.includes("videowall") || v.includes("wall")) return "videowall";

  return "";
}
export type GuidedProjectQuestionOptionDetail = {
  value: string;
  eyebrow?: string;
  title?: string;
  summary: string;
  outcome?: string;
  tags?: readonly string[];
  accentRgb?: string;
};

type GuidedProjectQuestionOptions =
  | readonly string[]
  | ((record: GuidedProjectRecord) => readonly string[]);

export type GuidedProjectQuestion = {
  id: keyof GuidedProjectRecord;
  step: GuidedProjectStep;
  label: string;
  helper: string;
  input: GuidedProjectInput;
  options?: GuidedProjectQuestionOptions;
  optionDetails?: readonly GuidedProjectQuestionOptionDetail[];
  placeholder?: string;
  fullWidth?: boolean;
  shouldAsk?: (record: GuidedProjectRecord) => boolean;
  branchReason?: (record: GuidedProjectRecord) => string | undefined;
};

export type GuidedProjectQuestionState = Omit<GuidedProjectQuestion, "options"> & {
  options?: readonly string[];
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
    "Lead with the outcome type and keep the shortlist focused on the product path.",
  ],
  [
    "",
    "Capture the fit questions that matter for this path so the likely WyreStorm product category becomes obvious.",
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
    summary: "Send one source to one destination over distance.",
    outcome: "Extender kit",
    tags: ["Distance", "HDMI", "USB"],
    accentRgb: "98, 210, 255",
  },
  {
    value: "Duplicate a signal",
    eyebrow: "Directional start",
    summary: "Take one source and mirror it to multiple destinations.",
    outcome: "Splitter / distribution amplifier",
    tags: ["1-to-many", "Mirrored outputs"],
    accentRgb: "102, 222, 172",
  },
  {
    value: "Switch between devices",
    eyebrow: "Directional start",
    summary: "Let the user switch between multiple sources.",
    outcome: "Presentation switcher or matrix switch",
    tags: ["Multi-source", "Routing"],
    accentRgb: "112, 154, 255",
  },
  {
    value: "Distribute over network",
    eyebrow: "Directional start",
    summary: "Move AV around the site over a managed network rather than a point-to-point link.",
    outcome: "AVoIP encoder / decoder / controller",
    tags: ["Network", "AVoIP"],
    accentRgb: "255, 164, 96",
  },
  {
    value: "Build a video wall",
    eyebrow: "Directional start",
    summary: "Start with the display canvas and processor strategy rather than generic room prompts.",
    outcome: "Video wall processor",
    tags: ["Display canvas", "Processing"],
    accentRgb: "245, 114, 88",
  },
] as const;

const SWITCH_SOLUTION_DETAILS: ReadonlyArray<GuidedProjectQuestionOptionDetail> = [
  {
    value: "Presentation switcher",
    eyebrow: "Switch fit",
    summary: "User-facing switching with multi-format inputs, workflow features, and collaboration support.",
    outcome: "Presentation switcher",
    tags: ["Multi-format", "Wireless", "USB-C / MST"],
    accentRgb: "112, 154, 255",
  },
  {
    value: "Matrix switcher",
    eyebrow: "Matrix routing",
    summary: "Preset HDMI or HDBaseT matrix routing with fixed I/O layouts and independent zone switching.",
    outcome: "Matrix switcher",
    tags: ["Preset I/O", "HDMI matrix", "HDBaseT matrix"],
    accentRgb: "76, 132, 255",
  },
  {
    value: "Matrix kit",
    eyebrow: "Matrix routing",
    summary: "Preset matrix kit with HDBaseT zones, local mirrored HDMI outputs, and receiver-led room endpoints.",
    outcome: "Matrix kit",
    tags: ["Preset kit", "HDBaseT", "Mirrored HDMI"],
    accentRgb: "76, 132, 255",
  },
] as const;

type MatrixIoPreset = {
  value: string;
  switchSolutionType: "Matrix switcher" | "Matrix kit";
  inputCount: number;
  zoneCount: number;
  mirroredHdmiCount: number;
  outputMode: "hdmi" | "hdbaset";
};

const MATRIX_IO_PRESETS: readonly MatrixIoPreset[] = [
  {
    value: "4x2 HDMI",
    switchSolutionType: "Matrix switcher",
    inputCount: 4,
    zoneCount: 2,
    mirroredHdmiCount: 0,
    outputMode: "hdmi",
  },
  {
    value: "4x4 HDMI",
    switchSolutionType: "Matrix switcher",
    inputCount: 4,
    zoneCount: 4,
    mirroredHdmiCount: 0,
    outputMode: "hdmi",
  },
  {
    value: "8x8 HDMI",
    switchSolutionType: "Matrix switcher",
    inputCount: 8,
    zoneCount: 8,
    mirroredHdmiCount: 0,
    outputMode: "hdmi",
  },
  {
    value: "8x8+8 HDBaseT",
    switchSolutionType: "Matrix switcher",
    inputCount: 8,
    zoneCount: 8,
    mirroredHdmiCount: 8,
    outputMode: "hdbaset",
  },
  {
    value: "4x3+1 kit",
    switchSolutionType: "Matrix kit",
    inputCount: 4,
    zoneCount: 4,
    mirroredHdmiCount: 1,
    outputMode: "hdbaset",
  },
  {
    value: "8x8+4 kit",
    switchSolutionType: "Matrix kit",
    inputCount: 8,
    zoneCount: 8,
    mirroredHdmiCount: 4,
    outputMode: "hdbaset",
  },
] as const;

const OUTPUT_BEHAVIOUR = [
  "One destination only",
  "Same content everywhere",
  "Independent switching per display",
  "Mixed or unsure",
] as const;

const FEATURE_REQUIREMENTS = [
  "None",
  "USB support",
  "Audio breakout",
  "Control ports / pass-through",
  "PoH / remote power",
  "Network / AVoIP",
  "Video wall processing",
] as const;

const DUPLICATE_FEATURE_REQUIREMENTS = [
  "Scaled / mixed resolution output",
  "Audio breakout",
  "RS-232 control",
  "5Gb HDMI cable capability",
  "10Gb HDMI cable capability",
  "18Gb HDMI cable capability",
  "ALLM support",
  "eARC support",
  "HDR support",
  "Multichannel audio support",
] as const;

const PRESENTATION_SWITCH_FEATURE_REQUIREMENTS = [
  "Multi-format inputs",
  "Relays",
  "Control ports",
  "Audio breakout",
  "Ethernet support",
  "Wireless presentation",
  "AirPlay",
  "Miracast",
  "MST (USB-C)",
] as const;

const MATRIX_SWITCH_FEATURE_REQUIREMENTS = ["Audio breakout", "RS-232 control"] as const;

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
  "Up to 40m",
  "Up to 70m",
  "Up to 100m",
  "More than 100m",
  "Not sure yet",
] as const;

const TRANSPORT_CABLE_TYPES = ["Cat5e", "Cat6", "Cat6A", "Cat7", "Fibre", "Not sure yet"] as const;
const DUPLICATE_TRANSPORT_CABLE_TYPES = [
  "HDMI copper lead",
  "HAOC optical HDMI lead",
  "Add HDMI extender line item",
] as const;
const DUPLICATE_HDMI_COPPER_LENGTHS = ["0.5m", "1m", "2m", "3m", "5m", "10m"] as const;
const DUPLICATE_HDMI_FIBRE_LENGTHS = ["10m", "15m", "20m", "30m"] as const;

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
  "4K 30Hz 4:4:4",
  "4K 60Hz 4:4:4",
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
  "HDMI (Direct)",
  "HDMI Optical (Direct)",
  "USB-C (Direct)",
  "Cat5e",
  "Cat6",
  "Cat6A",
  "Cat7",
  "Fibre (Direct)",
  "IP (Network)",
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
  "HDBaseT",
  "IP / Stream",
  "Not sure yet",
] as const;

const MATRIX_DISPLAY_CONNECTION_TYPES = [
  "HDMI",
  "HDBaseT Class B (35m @ 4K)",
  "HDBaseT Class A (70m @ 4K)",
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

const EXTEND_USB_STANDARDS = ["KVM USB 2.0", "High-speed / bandwidth USB 3.0 support"] as const;

const AUDIO = [
  "None",
  "Display audio only",
  "Audio breakout only",
  "Microphones plus speakers",
  "DSP or Dante ready",
  "USB audio bridge",
] as const;

const AUDIO_BREAKOUT = [
  "Analog stereo breakout",
  "Digital audio breakout",
  "Mic line or mixed audio breakout",
] as const;

const EXTEND_AUDIO_BREAKOUT = ["TX audio breakout", "RX audio breakout"] as const;
const DUPLICATE_AUDIO_BREAKOUT = ["Output audio breakout"] as const;

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

const PASSTHROUGH = ["RS-232", "IR pass-through", "CEC", "Ethernet passthrough", "USB/KVM"] as const;
const EXTEND_PASSTHROUGH = ["RS-232", "IR pass-through", "Ethernet passthrough"] as const;
const DUPLICATE_PASSTHROUGH = ["RS-232 control"] as const;
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

function featureRequested(record: GuidedProjectRecord, token: string): boolean {
  return parseGuidedProjectSelections(record.featureRequirements)
    .map((item) => item.toLowerCase())
    .some((item) => item.includes(token));
}

function formatSelections(value: string | undefined, fallback = "Not confirmed"): string {
  const selected = parseGuidedProjectSelections(value);
  return selected.length > 0 ? selected.join(", ") : fallback;
}

function resolveQuestionOptions(
  record: GuidedProjectRecord,
  options: GuidedProjectQuestion["options"],
): readonly string[] | undefined {
  if (typeof options === "function") return options(record);
  return options;
}

function getFeatureRequirementOptions(record: GuidedProjectRecord): readonly string[] {
  const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
  if (path === "duplicate") return DUPLICATE_FEATURE_REQUIREMENTS;
  if (path === "switch") {
    return isMatrixSwitch(record)
      ? MATRIX_SWITCH_FEATURE_REQUIREMENTS
      : PRESENTATION_SWITCH_FEATURE_REQUIREMENTS;
  }
  return FEATURE_REQUIREMENTS;
}

function getFeatureRequirementPrompt(record: GuidedProjectRecord): string {
  const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
  if (path === "duplicate") {
    return "Tick the HDMI-specific requirements: scaler behaviour, cable capability, and features like HDR, ALLM, eARC, or multichannel audio.";
  }
  if (path === "switch") {
    return isMatrixSwitch(record)
      ? "Confirm whether the matrix also needs audio breakout or RS-232 control."
      : "Tick the workflow features the presentation switcher must support.";
  }
  return "Tick any must-have device features before moving into transport detail.";
}

function getTransportCableTypeOptions(record: GuidedProjectRecord): readonly string[] {
  return normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "duplicate"
    ? DUPLICATE_TRANSPORT_CABLE_TYPES
    : TRANSPORT_CABLE_TYPES;
}

function getTransportDistanceBandOptions(record: GuidedProjectRecord): readonly string[] {
  if (normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) !== "duplicate") {
    return TRANSPORT_DISTANCE_BANDS;
  }
  if (includesAny(record.transportCableType, ["fibre", "fiber", "optical"])) {
    return DUPLICATE_HDMI_FIBRE_LENGTHS;
  }
  if (includesAny(record.transportCableType, ["extender"])) {
    return TRANSPORT_DISTANCE_BANDS;
  }
  return DUPLICATE_HDMI_COPPER_LENGTHS;
}

function getTransportCablePrompt(record: GuidedProjectRecord): string {
  return normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "duplicate"
    ? "Choose whether the mirrored outputs stay on direct HDMI copper, HAOC optical HDMI, or need a separate HDMI extender line item."
    : "Confirm whether the main run is Cat5e, Cat6, Cat6A, Cat7, or fibre before trusting long-distance video claims.";
}

function getTransportDistancePrompt(record: GuidedProjectRecord): string {
  return normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "duplicate"
    ? "Choose the direct HDMI lead length, HAOC optical HDMI lead length, or the extender reach band that best matches the job."
    : "Get the real installed distance to separate patching, extension, and network-led options.";
}

function getTypicalInputCableLength(record: GuidedProjectRecord): string {
  if (includesAny(record.sourcePlacement, ["rack"])) return "0.5m";
  if (
    includesAny(record.sourcePlacement, ["table", "byod"]) ||
    includesAny(record.sourceConnectionPath, ["floor box", "wall plate"])
  ) {
    return "2m";
  }
  return "1m";
}

function getDirectOutputCableLength(record: GuidedProjectRecord): string {
  const selected = record.transportDistanceBand;
  if (hasText(selected)) return selected;
  if (includesAny(record.transportCableType, ["haoc", "fibre", "fiber", "optical"])) return "10m-30m to suit route";
  if (includesAny(record.transportCableType, ["copper"])) return "1m-2m local, or a direct long HDMI lead if viable";
  return "1m-2m local";
}

export function buildSuggestedCableList(record: GuidedProjectRecord): string[] {
  const track = lower(getWorkflowTrack(record));
  const sourceCount =
    num(record.sourceCount) > 0
      ? num(record.sourceCount)
      : track === "extend a signal" || track === "duplicate a signal"
        ? 1
        : 0;
  const displayCount =
    num(record.displayCount) > 0
      ? num(record.displayCount)
      : track === "extend a signal"
        ? 1
        : track === "duplicate a signal"
          ? 2
          : 0;
  const inputLeadType = includesAny(record.sourceConnectionType, ["usb-c"]) ? "USB-C" : "HDMI";
  const outputLeadType = includesAny(record.displayConnectionType, ["usb-c"]) ? "USB-C" : "HDMI";
  const outputLabel = outputLeadType === "USB-C" ? "USB-C output cable" : "HDMI output cable";
  const suggestions: string[] = [];
  const duplicateExtender = track === "duplicate a signal" && includesAny(record.transportCableType, ["extender"]);
  const duplicateHaoc = track === "duplicate a signal" && includesAny(record.transportCableType, ["haoc", "fibre", "fiber", "optical"]);

  if (sourceCount > 0) {
    suggestions.push(`${sourceCount} x ${inputLeadType} input cable (${getTypicalInputCableLength(record)} typical).`);
  }

  if (displayCount > 0) {
    if (duplicateExtender) {
      suggestions.push(`${displayCount} x HDMI extender output path (${getTransportBand(record) || "reach to confirm"}).`);
      suggestions.push(`${displayCount * 2} x short HDMI patch lead for the extender TX/RX ends.`);
    } else if (duplicateHaoc) {
      suggestions.push(`${displayCount} x HAOC HDMI output cable (${getDirectOutputCableLength(record)}).`);
    } else {
      suggestions.push(`${displayCount} x ${outputLabel} (${getDirectOutputCableLength(record)}).`);
    }
  }

  if (track === "duplicate a signal" && displayCount > 0) {
    const hdmiLeadCount = sourceCount + displayCount + (duplicateExtender ? displayCount * 2 : 0);
    suggestions.push(
      duplicateExtender
        ? `Duplicate path checkpoint: ${hdmiLeadCount} HDMI leads plus ${displayCount} extender link${displayCount === 1 ? "" : "s"}.`
        : `Duplicate path checkpoint: ${hdmiLeadCount} HDMI leads for the splitter path.`,
    );
  }

  return uniq(suggestions).slice(0, 4);
}

function getUsbStandardOptions(record: GuidedProjectRecord): readonly string[] {
  return normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "extend"
    ? EXTEND_USB_STANDARDS
    : USB_STANDARDS;
}

function getAudioBreakoutOptions(record: GuidedProjectRecord): readonly string[] {
  const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
  if (path === "extend") return EXTEND_AUDIO_BREAKOUT;
  if (path === "duplicate") return DUPLICATE_AUDIO_BREAKOUT;
  return AUDIO_BREAKOUT;
}

function getPassthroughOptions(record: GuidedProjectRecord): readonly string[] {
  const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
  if (path === "extend") return EXTEND_PASSTHROUGH;
  if (path === "duplicate") return DUPLICATE_PASSTHROUGH;
  if (isMatrixSwitch(record)) return DUPLICATE_PASSTHROUGH;
  return PASSTHROUGH;
}

function getPassthroughPrompt(record: GuidedProjectRecord): string {
  const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
  if (path === "extend") return "Confirm RS-232, IR pass-through, or Ethernet passthrough requirements.";
  if (path === "duplicate") return "Confirm whether RS-232 control is required.";
  if (isMatrixSwitch(record)) return "Confirm whether RS-232 control is required.";
  return "Confirm the required pass-through detail.";
}

function getDisplayConnectionOptions(record: GuidedProjectRecord): readonly string[] {
  const matrixPreset = findMatrixIoPreset(record.matrixIoPreset);
  if (matrixPreset?.outputMode === "hdmi") return ["HDMI"];
  if (matrixPreset?.outputMode === "hdbaset") {
    return MATRIX_DISPLAY_CONNECTION_TYPES.filter((option) => option !== "HDMI");
  }
  return isMatrixSwitch(record) ? MATRIX_DISPLAY_CONNECTION_TYPES : DISPLAY_CONNECTION_TYPES;
}

function getDisplayConnectionPrompt(record: GuidedProjectRecord): string {
  const matrixPreset = findMatrixIoPreset(record.matrixIoPreset);
  return isMatrixSwitch(record)
    ? matrixPreset?.outputMode === "hdbaset"
      ? "Pick the HDBaseT class for the matrix outputs: Class B for 35m at 4K or Class A for 70m at 4K."
      : "Confirm whether the matrix outputs stay on HDMI or need an HDBaseT output class."
    : "Confirm whether the output side needs HDMI, HDBaseT, or IP / Stream.";
}

function isPresentationSwitch(record: GuidedProjectRecord): boolean {
  return (
    normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "switch" &&
    lower(record.switchSolutionType).includes("presentation")
  );
}

function isMatrixSwitch(record: GuidedProjectRecord): boolean {
  return (
    normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "switch" &&
    lower(record.switchSolutionType).includes("matrix")
  );
}

function isMatrixKit(record: GuidedProjectRecord): boolean {
  return isMatrixSwitch(record) && lower(record.switchSolutionType).includes("kit");
}

export function findMatrixIoPreset(value: string | undefined): MatrixIoPreset | undefined {
  return MATRIX_IO_PRESETS.find((preset) => preset.value === value);
}

function getMatrixIoPresetOptions(record: GuidedProjectRecord): readonly string[] {
  if (!isMatrixSwitch(record)) return [];
  const type = isMatrixKit(record) ? "Matrix kit" : "Matrix switcher";
  return MATRIX_IO_PRESETS.filter((preset) => preset.switchSolutionType === type).map((preset) => preset.value);
}

function distanceBandLimit(value: string | undefined): number {
  switch (lower(value)) {
    case "up to 40m":
      return 40;
    case "up to 70m":
      return 70;
    case "up to 100m":
      return 100;
    case "more than 100m":
      return 140;
    default:
      break;
  }
  const numeric = Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function deriveDistanceBand(distanceM: number): string {
  if (distanceM <= 0) return "";
  if (distanceM <= 40) return "Up to 40m";
  if (distanceM <= 70) return "Up to 70m";
  if (distanceM <= 100) return "Up to 100m";
  return "More than 100m";
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
  if (includesAny(value, ["fibre", "fiber", "optical"])) return 6;
  if (includesAny(value, ["cat7"])) return 5;
  if (includesAny(value, ["cat6a"])) return 4;
  if (includesAny(value, ["cat6"])) return 3;
  if (includesAny(value, ["cat5e"])) return 2;
  if (includesAny(value, ["hdmi copper", "hdmi (direct)", "usb-c (direct)", "ip (network)"])) return 1;
  return 0;
}

function getTransportCableRank(record: GuidedProjectRecord): number {
  if (hasText(record.transportCableType)) return getCableRank(record.transportCableType);
  return Math.max(getCableRank(record.sourceCableType), getCableRank(record.displayCableType));
}

function needsTransportCableType(record: GuidedProjectRecord): boolean {
  return (
    includesAny(getWorkflowTrack(record), ["extend", "duplicate"]) ||
    getTransportReachM(record) >= 40 ||
    getSignalDemand(record.signalFormats) >= 2
  );
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
  return "Extend a signal";
}

function isTrack(record: GuidedProjectRecord, token: string): boolean {
  return lower(getWorkflowTrack(record)) === token;
}

function isSingleDeviceScope(record: GuidedProjectRecord): boolean {
  return !hasText(record.projectScope) || includesAny(record.projectScope, ["single device", "refresh or replacement"]);
}

function isRoomScope(record: GuidedProjectRecord): boolean {
  return includesAny(record.projectScope, ["wider room", "complete room"]);
}

function needsRoomEnvelope(record: GuidedProjectRecord): boolean {
  return isTrack(record, "build a video wall") || isRoomScope(record);
}

export function shouldAskInstallationPath(record: GuidedProjectRecord): boolean {
  if (normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "duplicate") {
    return includesAny(record.transportCableType, ["extender"]) || getTransportReachM(record) > 10;
  }
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
    includesAny(record.displayConnectionType, ["decoder", "avoip", "ip", "stream"]) ||
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
  if (normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "duplicate") return false;
  return (
    hasText(record.sourceConnectionType) ||
    includesAny(record.sourceConnectionPath, ["floor box", "wall plate", "rack"]) ||
    shouldAskInstallationPath(record)
  );
}

function needsDisplayCableDetail(record: GuidedProjectRecord): boolean {
  if (normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "duplicate") return false;
  return (
    hasText(record.displayConnectionType) ||
    includesAny(record.displayConnectionPath, ["receiver", "decoder", "switcher", "matrix", "processor"]) ||
    getTransportReachM(record) >= 10
  );
}

function needsUsbStandardDetail(record: GuidedProjectRecord): boolean {
  return (
    includesAny(getWorkflowTrack(record), ["extend"]) ||
    !includesAny(record.usbNeeds, ["none"]) &&
    (hasText(record.usbNeeds) ||
      includesAny(record.sourceTypes, ["camera", "microphone", "soundbar", "byod"]) ||
      featureRequested(record, "usb") ||
      featureRequested(record, "kvm") ||
      featureRequested(record, "mst"))
  );
}

function needsAudioBreakout(record: GuidedProjectRecord): boolean {
  return (
    includesAny(getWorkflowTrack(record), ["extend", "duplicate"]) ||
    featureRequested(record, "audio breakout") ||
    (!includesAny(record.audioNeeds, ["none", "display audio only"]) && hasText(record.audioNeeds))
  );
}

function needsPassthroughDetail(record: GuidedProjectRecord): boolean {
  return (
    includesAny(getWorkflowTrack(record), ["extend", "duplicate", "distribute"]) ||
    includesAny(record.controlNeeds, ["ip control", "automation", "matrix"]) ||
    featureRequested(record, "pass-through") ||
    featureRequested(record, "rs-232") ||
    featureRequested(record, "ethernet passthrough")
  );
}

function needsPowerPreference(record: GuidedProjectRecord): boolean {
  return (
    includesAny(getWorkflowTrack(record), ["extend"]) ||
    includesAny(record.sourceConnectionType, ["hdbaset"]) ||
    includesAny(record.displayConnectionType, ["hdbaset"]) ||
    featureRequested(record, "poh") ||
    featureRequested(record, "remote power")
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
    id: "switchSolutionType",
    step: 1,
    label: "What kind of switching is needed?",
    helper: "Separate workflow-led presentation switching from preset matrix routing before narrowing the shortlist.",
    input: "cards",
    options: SWITCH_SOLUTION_DETAILS.map((item) => item.value),
    optionDetails: SWITCH_SOLUTION_DETAILS,
    fullWidth: true,
    shouldAsk: (record) => normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) === "switch",
    branchReason: () => "This split decides whether the shortlist should protect user workflow or focus on pure routing.",
  },
  {
    id: "matrixIoPreset",
    step: 1,
    label: "Matrix I/O preset",
    helper: "Pick the fixed matrix layout first so the guide can lock the source count, destination count, and mirrored-output behaviour.",
    input: "select",
    options: getMatrixIoPresetOptions,
    shouldAsk: (record) => isMatrixSwitch(record),
    branchReason: () => "Preset matrix layouts narrow the real product family faster than open-ended I/O counting.",
  },
  {
    id: "sourceCount",
    step: 1,
    label: "Source count",
    helper: "Confirm the source total once the switching fit is clear, or label each fixed matrix input after the preset is chosen.",
    input: "number",
    placeholder: "1",
    shouldAsk: (record) => {
      const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
      if (!path) return false;
      if (path !== "switch") return true;
      return hasText(record.switchSolutionType) && (!isMatrixSwitch(record) || hasText(record.matrixIoPreset));
    },
    branchReason: () => "Count the active sources only after the switching path is clear.",
  },
  {
    id: "sourceConnectionType",
    step: 1,
    label: "Source connection type",
    helper: "Confirm whether those sources hand off over HDMI, USB-C, or another transport.",
    input: "select",
    options: SOURCE_CONNECTION_TYPES,
    shouldAsk: (record) =>
      !isMatrixSwitch(record) &&
      (num(record.sourceCount) > 0 ||
        hasText(record.workflowTrack) ||
        hasText(record.sourceTypes) ||
        !isTrack(record, "not sure yet")),
    branchReason: () => "Lock down HDMI, USB-C, HDBaseT, encoder, or fiber before comparing SKUs.",
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
    id: "displayConnectionType",
    step: 1,
    label: "Output connection type",
    helper: "Confirm the output handoff. HDBaseT matrix presets should use Class B (35m @ 4K) or Class A (70m @ 4K).",
    input: "select",
    options: getDisplayConnectionOptions,
    shouldAsk: (record) =>
      isMatrixSwitch(record)
        ? hasText(record.matrixIoPreset) &&
          findMatrixIoPreset(record.matrixIoPreset)?.outputMode !== "hdmi"
        : num(record.displayCount) > 0 ||
          hasText(record.workflowTrack) ||
          hasText(record.displayConnectionPath) ||
          !isTrack(record, "not sure yet"),
    branchReason: () => "Lock down whether the destination side stays direct, HDBaseT-led, or stream-led before comparing SKUs.",
  },
  {
    id: "outputBehaviour",
    step: 1,
    label: "Output behaviour",
    helper: "This separates one-to-one extension, mirrored distribution, and true switching.",
    input: "select",
    options: OUTPUT_BEHAVIOUR,
    shouldAsk: (record) =>
      !isMatrixSwitch(record) &&
      (num(record.displayCount) > 0 ||
        num(record.sourceCount) > 0 ||
        !isTrack(record, "not sure yet")),
    branchReason: () => "Output behaviour is the fastest way to avoid recommending a matrix for a simple splitter job.",
  },
    {
      id: "featureRequirements",
      step: 1,
      label: "Feature requirements",
      helper: "Tick the specific device capabilities the customer already knows they need.",
      input: "multiSelect",
      options: getFeatureRequirementOptions,
      fullWidth: true,
      shouldAsk: (record) =>
        hasText(record.workflowTrack) &&
        (normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record)) !== "switch" ||
          hasText(record.switchSolutionType)),
      branchReason: () => "Known must-have features help narrow the shortlist before transport detail gets too deep.",
    },
  {
    id: "cableDistanceM",
    step: 1,
    label: "Longest installed route (m)",
    helper: "Use the real installed route, not line-of-sight distance.",
    input: "number",
    placeholder: "35",
    shouldAsk: () => false,
    branchReason: (record) =>
      isTrack(record, "extend a signal")
        ? "Extension workflows need a real distance early because it changes the shortlist immediately."
        : "Installed distance helps separate patching, extension, and network distribution paths.",
  },
  {
    id: "transportCableType",
    step: 1,
    label: "Main cable type",
    helper: "Capture the delivery medium because direct HDMI copper, optical HDMI, and extender-led paths behave very differently.",
    input: "select",
    options: getTransportCableTypeOptions,
    shouldAsk: needsTransportCableType,
    branchReason: () => "The same distance can be safe or risky depending on whether the installed run is Cat5e, Cat6, Cat6A, Cat7, or fibre.",
  },
  {
    id: "transportDistanceBand",
    step: 1,
    label: "Estimated cable run",
    helper: "Choose the nearest direct-cable length or extender reach band rather than typing an exact meter figure.",
    input: "select",
    options: getTransportDistanceBandOptions,
    shouldAsk: (record) =>
      getTransportReachM(record) > 0 ||
      num(record.displayCount) > 0 ||
      num(record.sourceCount) > 0 ||
      !isTrack(record, "not sure yet"),
    branchReason: () => "Route-length bands keep the shortlist practical when the customer only knows an approximate cable run.",
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
      id: "signalFormats",
      step: 1,
      label: "Signal formats to support",
      helper: "Tick the real I/O formats required because resolution and chroma depth change the safe reach over CAT6, CAT6a, and CAT7.",
      input: "multiSelect",
      options: SIGNAL_FORMATS,
      fullWidth: true,
      shouldAsk: needsSignalEnvelope,
      branchReason: () => "Resolution and chroma depth materially change which extenders and switchers stay credible over distance.",
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
    step: 1,
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
      step: 1,
      label: "USB / KVM support",
      helper: "Tick the USB capability that must ride with the video path.",
      input: "multiSelect",
      options: getUsbStandardOptions,
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
      step: 1,
      label: "Audio breakout requirement",
      helper: "Tick where audio breakout is needed in the signal path.",
      input: "multiSelect",
      options: getAudioBreakoutOptions,
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
      step: 1,
      label: "Pass-through requirements",
      helper: "Tick only the control or utility pass-through the customer actually needs.",
      input: "multiSelect",
      options: getPassthroughOptions,
      shouldAsk: needsPassthroughDetail,
      branchReason: () => "Pass-through can be the minimum spec that separates similar extenders and switchers.",
    },
    {
      id: "powerPreference",
      step: 1,
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

const DEFAULT_CORE_FIELDS_BY_STEP: Record<GuidedProjectStep, ReadonlyArray<keyof GuidedProjectRecord>> = {
  0: ["workflowTrack"],
  1: [
    "switchSolutionType",
    "sourceConnectionType",
    "displayCount",
    "displayConnectionType",
    "outputBehaviour",
    "featureRequirements",
    "transportDistanceBand",
    "transportCableType",
  ],
  2: ["sourceCount", "sourcePlacement", "sourceConnectionPath", "displayConnectionPath"],
  3: ["usbNeeds", "audioNeeds", "controlNeeds", "budgetBand", "urgency"],
};

const FIT_CORE_FIELDS_BY_PATH: Record<string, ReadonlyArray<keyof GuidedProjectRecord>> = {
  extend: [
    "signalFormats",
    "transportDistanceBand",
    "transportCableType",
    "installationPath",
    "usbStandards",
    "audioBreakout",
    "powerPreference",
    "passthroughNeeds",
  ],
  duplicate: [
    "displayCount",
    "featureRequirements",
    "transportCableType",
    "transportDistanceBand",
    "signalFormats",
    "audioBreakout",
    "passthroughNeeds",
  ],
  switch: [
    "switchSolutionType",
    "matrixIoPreset",
    "sourceCount",
    "displayCount",
    "displayConnectionType",
    "featureRequirements",
  ],
  network: [
    "displayCount",
    "outputBehaviour",
    "networkEnvironment",
    "featureRequirements",
    "signalFormats",
    "transportDistanceBand",
  ],
  videowall: [
    "displayCount",
    "featureRequirements",
    "signalFormats",
  ],
};

const STEP_SUBTITLES_DEFAULT: Record<GuidedProjectStep, string> = {
  0: "Choose the outcome type.",
  1: "Confirm the key fit questions for this path.",
  2: "Lock transport and signal path.",
  3: "Final checks before shortlist.",
};

const FIT_SUBTITLES_BY_PATH: Record<string, string> = {
  extend: "Capture the extender capability set, signal envelope, and real route length.",
  duplicate: "Confirm the mirrored HDMI outputs, the cable or extender approach, and the HDMI capability needed on every leg.",
  switch: "Decide whether this is presentation switching, a matrix switcher, or a matrix kit, then lock the fit.",
  network: "Confirm scale, routing behavior, and network readiness.",
  videowall: "Confirm source count, display scale, and processor fit.",
};

function isQuestionVisible(record: GuidedProjectRecord, question: GuidedProjectQuestion) {
  if (typeof question.shouldAsk === "function" && !question.shouldAsk(record)) return false;
  if (shouldHideQuestionIdForTrack(record.workflowTrack || getWorkflowTrack(record), question.id)) return false;
  return true;
}

function isQuestionVisibleForStep(
  record: GuidedProjectRecord,
  step: GuidedProjectStep,
  id: keyof GuidedProjectRecord,
) {
  const question = QUESTION_DEFS.find((item) => item.step === step && item.id === id);
  return question ? isQuestionVisible(record, question) : false;
}

export function getCoreFieldsForStep(
  record: GuidedProjectRecord,
  step: GuidedProjectStep,
): ReadonlyArray<keyof GuidedProjectRecord> {
  if (step !== 1) return DEFAULT_CORE_FIELDS_BY_STEP[step];

  const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
  return FIT_CORE_FIELDS_BY_PATH[path] ?? DEFAULT_CORE_FIELDS_BY_STEP[step];
}

export function getGuidedProjectStepSubtitle(
  record: GuidedProjectRecord,
  step: GuidedProjectStep,
) {
  if (step !== 1) return STEP_SUBTITLES_DEFAULT[step];

  const path = normalizeDiscoveryPath(record.workflowTrack || getWorkflowTrack(record));
  return FIT_SUBTITLES_BY_PATH[path] ?? STEP_SUBTITLES_DEFAULT[step];
}

export function createEmptyGuidedProjectRecord(): GuidedProjectRecord {
  return {
    workflowTrack: "",
    projectScope: "Single device or signal path",
    customerOutcome: "",
    switchSolutionType: "",
    matrixIoPreset: "",
    featureRequirements: "",
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
    transportCableType: "",
    displayCount: "",
    sourceCount: "",
    sourceInventory: "",
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

export function getVisibleQuestionsForStep(record: GuidedProjectRecord, step: GuidedProjectStep) {
  return QUESTION_DEFS
    .filter((question) => {
      if (question.step !== step) return false;
      return isQuestionVisible(record, question);
    })
    .map((question) => ({
      ...question,
      options: resolveQuestionOptions(record, question.options),
      activeBranch: typeof question.shouldAsk === "function" ? question.shouldAsk(record) : false,
      branchReasonText: typeof question.branchReason === "function" ? question.branchReason(record) : undefined,
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
  const needsSourceCount = isQuestionVisibleForStep(record, 1, "sourceCount");
  const needsSwitchSolutionType = isQuestionVisibleForStep(record, 1, "switchSolutionType");
  const needsSourceConnectionType = isQuestionVisibleForStep(record, 1, "sourceConnectionType");
  const needsDisplayCount = isQuestionVisibleForStep(record, 1, "displayCount");
  const needsDisplayConnectionType = isQuestionVisibleForStep(record, 1, "displayConnectionType");
  const needsOutputBehaviour = isQuestionVisibleForStep(record, 1, "outputBehaviour");
  const needsFeatureRequirements = isQuestionVisibleForStep(record, 1, "featureRequirements");
  const needsTransportCable = isQuestionVisibleForStep(record, 1, "transportCableType");
  const needsReach =
    isQuestionVisibleForStep(record, 1, "cableDistanceM") ||
    isQuestionVisibleForStep(record, 1, "transportDistanceBand");

  if (!hasText(record.workflowTrack)) {
    items.push("Choose the direction card that best matches the customer outcome before talking about room scope.");
  }
  if (!hasText(record.projectScope)) {
    items.push("Keep the shortlist focused on a single device or signal path unless the brief expands.");
  }
  if (needsSwitchSolutionType && !hasText(record.switchSolutionType)) {
    items.push("Decide whether this is a presentation switcher or a matrix switch before comparing SKUs.");
  }
  if (needsFeatureRequirements && !hasSelections(record.featureRequirements)) {
    items.push(getFeatureRequirementPrompt(record));
  }
  if (needsSourceCount && !hasText(record.sourceCount)) {
    items.push("Confirm how many source devices need support.");
  }
  if (needsSourceConnectionType && !hasText(record.sourceConnectionType)) {
    items.push("Confirm whether the source side needs HDMI, USB-C, or another handoff.");
  }
  if (needsDisplayCount && !hasText(record.displayCount)) {
    items.push("Confirm how many displays or endpoints must be fed.");
  }
  if (needsDisplayConnectionType && !hasText(record.displayConnectionType)) {
    items.push(getDisplayConnectionPrompt(record));
  }
  if (
    needsOutputBehaviour &&
    !hasText(record.outputBehaviour) &&
    (num(record.displayCount) >= 2 || num(record.sourceCount) >= 2 || !isTrack(record, "not sure yet"))
  ) {
    items.push("Clarify whether outputs are mirrored or independently switched.");
  }
  if (
    needsReach &&
    !hasText(record.cableDistanceM) &&
    !hasText(record.transportDistanceBand) &&
    !isTrack(record, "build a video wall")
  ) {
    items.push(getTransportDistancePrompt(record));
  }
  if (needsTransportCable && !hasText(record.transportCableType)) {
    items.push(getTransportCablePrompt(record));
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
  if (needsAudioBreakout(record) && !hasSelections(record.audioBreakout)) {
    items.push("Audio breakout needs are still unclear.");
  }
  if (needsPowerPreference(record) && !hasText(record.powerPreference)) {
    items.push("Confirm whether local power, 1-way PoH, or 2-way PoH is preferred.");
  }
  if (needsPassthroughDetail(record) && !hasSelections(record.passthroughNeeds)) {
    items.push(getPassthroughPrompt(record));
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
  const needsSourceCount = isQuestionVisibleForStep(record, 1, "sourceCount");
  const needsSwitchSolutionType = isQuestionVisibleForStep(record, 1, "switchSolutionType");
  const needsSourceConnectionType = isQuestionVisibleForStep(record, 1, "sourceConnectionType");
  const needsDisplayCount = isQuestionVisibleForStep(record, 1, "displayCount");
  const needsDisplayConnectionType = isQuestionVisibleForStep(record, 1, "displayConnectionType");
  const needsOutputBehaviour = isQuestionVisibleForStep(record, 1, "outputBehaviour");
  const needsNetworkEnvironment = isQuestionVisibleForStep(record, 1, "networkEnvironment");
  const needsFeatureRequirements = isQuestionVisibleForStep(record, 1, "featureRequirements");
  const needsTransportCable = isQuestionVisibleForStep(record, 1, "transportCableType");
  const _needsUsbNeeds = isQuestionVisibleForStep(record, 3, "usbNeeds");
  const needsAudioNeeds = isQuestionVisibleForStep(record, 3, "audioNeeds");
  const needsControlNeeds = isQuestionVisibleForStep(record, 3, "controlNeeds");
  const needsReach =
    isQuestionVisibleForStep(record, 1, "cableDistanceM") ||
    isQuestionVisibleForStep(record, 1, "transportDistanceBand");
  const pathConfirmed =
    (!needsSourceCount || hasText(record.sourceCount)) &&
    (!needsSwitchSolutionType || hasText(record.switchSolutionType)) &&
    (!needsSourceConnectionType || hasText(record.sourceConnectionType)) &&
    (!needsDisplayCount || hasText(record.displayCount)) &&
    (!needsDisplayConnectionType || hasText(record.displayConnectionType)) &&
    (!needsOutputBehaviour || hasText(record.outputBehaviour)) &&
    (!needsNetworkEnvironment || hasText(record.networkEnvironment)) &&
    (!needsReach || hasText(record.cableDistanceM) || hasText(transportBand) || isTrack(record, "build a video wall")) &&
    (!needsTransportCable || hasText(record.transportCableType));
  const signalConfirmed =
    hasSelections(record.signalFormats) &&
    (!hasSelections(record.signalFormats) || hasText(record.signalHdr)) &&
    (!needsUsbStandardDetail(record) || hasSelections(record.usbStandards));
  const deploymentConfirmed =
    (!needsAudioNeeds || hasText(record.audioNeeds)) &&
    (!needsControlNeeds || hasText(record.controlNeeds)) &&
    (!needsAudioBreakout(record) || hasSelections(record.audioBreakout)) &&
    (!needsPassthroughDetail(record) || hasSelections(record.passthroughNeeds)) &&
    (!needsPowerPreference(record) || hasText(record.powerPreference)) &&
    (!needsNetworkDetail(record) || hasText(record.networkEnvironment));

  return [
    {
      id: "customer-outcome",
      title: "Customer outcome",
      state: lensState(trackConfirmed && scopeConfirmed, trackConfirmed || scopeConfirmed),
      summary:
        trackConfirmed && scopeConfirmed
          ? `${workflowTrack} is the active path for a ${record.projectScope.toLowerCase()} conversation.`
          : "Wingman is keeping this on a narrow product-shortlist path unless the brief expands into room design.",
      prompts: uniq([
        trackConfirmed ? `Direction chosen: ${record.workflowTrack}.` : "Choose the direction card that best matches the customer ask.",
        scopeConfirmed ? `Scope: ${record.projectScope}.` : "Keep the conversation focused on a single device or signal path.",
      ]).slice(0, 3),
    },
    {
      id: "path-shape",
      title: "Path shape",
        state: lensState(
          pathConfirmed,
          (needsSourceCount && hasText(record.sourceCount)) ||
            (needsSwitchSolutionType && hasText(record.switchSolutionType)) ||
            (needsSourceConnectionType && hasText(record.sourceConnectionType)) ||
            (needsDisplayCount && hasText(record.displayCount)) ||
            (needsDisplayConnectionType && hasText(record.displayConnectionType)) ||
            (needsNetworkEnvironment && hasText(record.networkEnvironment)) ||
            (needsTransportCable && hasText(record.transportCableType)) ||
            (needsReach && hasText(transportBand)),
      ),
      summary:
        pathConfirmed
          ? [
              needsSourceCount ? `${record.sourceCount || "1"} source(s)` : "",
              needsSwitchSolutionType ? `${record.switchSolutionType.toLowerCase()}` : "",
              needsSourceConnectionType ? `source side on ${record.sourceConnectionType.toLowerCase()}` : "",
              needsDisplayCount ? `${record.displayCount || "1"} destination(s)` : "",
              needsDisplayConnectionType ? `output side on ${record.displayConnectionType.toLowerCase()}` : "",
              needsOutputBehaviour ? record.outputBehaviour.toLowerCase() : "",
              needsTransportCable ? `${record.transportCableType.toLowerCase()} main run` : "",
              needsNetworkEnvironment ? `network ${record.networkEnvironment.toLowerCase()}` : "",
              needsReach ? `${transportBand || `${record.cableDistanceM}m`} reach` : "",
            ]
              .filter(Boolean)
              .join(", ") + " are now defined."
          : "Wingman still needs the key fit details for this path before it can trust the product category.",
      prompts: uniq([
        needsSourceCount
          ? hasText(record.sourceCount)
            ? `Sources: ${record.sourceCount}.`
            : "Confirm the number of source devices."
          : "",
        needsSwitchSolutionType
          ? hasText(record.switchSolutionType)
            ? `Switch fit: ${record.switchSolutionType}.`
            : "Confirm whether the user needs a presentation switcher or a matrix switch."
          : "",
        needsSourceConnectionType && hasText(record.sourceConnectionType)
          ? `Source connection: ${record.sourceConnectionType}.`
          : needsSourceConnectionType
            ? "Confirm whether the source side needs HDMI, USB-C, or another handoff."
            : "",
        needsDisplayCount
          ? hasText(record.displayCount)
            ? `Destinations: ${record.displayCount}.`
            : "Confirm the number of displays or endpoints."
          : "",
        needsDisplayConnectionType && hasText(record.displayConnectionType)
          ? `Output connection: ${record.displayConnectionType}.`
          : needsDisplayConnectionType
            ? getDisplayConnectionPrompt(record)
            : "",
        needsTransportCable
          ? hasText(record.transportCableType)
            ? `Main cable: ${record.transportCableType}.`
            : getTransportCablePrompt(record)
          : "",
        needsOutputBehaviour
          ? hasText(record.outputBehaviour)
            ? `Output behaviour: ${record.outputBehaviour}.`
            : "Confirm whether outputs are mirrored or independently switched."
          : "",
        needsNetworkEnvironment
          ? hasText(record.networkEnvironment)
            ? `Network: ${record.networkEnvironment}.`
            : "Confirm the network environment."
          : "",
        needsFeatureRequirements && hasSelections(record.featureRequirements)
          ? `Required features: ${formatSelections(record.featureRequirements)}.`
          : needsFeatureRequirements
            ? getFeatureRequirementPrompt(record)
            : "",
        needsReach
          ? hasText(transportBand)
            ? `Reach band: ${transportBand}.`
            : "Capture the practical reach band or installed distance."
          : "",
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
        hasSelections(record.signalFormats)
          ? `Video formats: ${formatSelections(record.signalFormats)}.`
          : "Tick the real signal formats: 1080p, 4K 30Hz 4:4:4, 4K 60Hz 4:4:4, 5K, 8K, or custom.",
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
        (needsAudioNeeds && hasText(record.audioNeeds)) ||
          (needsControlNeeds && hasText(record.controlNeeds)) ||
          hasSelections(record.audioBreakout) ||
          hasText(record.powerPreference) ||
          hasText(record.networkEnvironment),
      ),
      summary:
        deploymentConfirmed
          ? "Wingman has enough deployment detail to separate similar-looking SKUs by control, power, and breakout requirements."
          : "Wingman still needs the deployment detail that often decides between the last two product options.",
      prompts: uniq([
        needsAudioNeeds
          ? (hasText(record.audioNeeds) ? `Audio: ${record.audioNeeds}.` : "Confirm whether audio is incidental, broken out, or part of a larger DSP path.")
          : "",
        needsAudioBreakout(record)
          ? (hasSelections(record.audioBreakout)
              ? `Audio breakout: ${formatSelections(record.audioBreakout)}.`
              : "Confirm the audio breakout requirement.")
          : "",
        needsControlNeeds
          ? (hasText(record.controlNeeds) ? `Control: ${record.controlNeeds}.` : "Confirm the control expectation.")
          : "",
        needsPassthroughDetail(record)
          ? (hasSelections(record.passthroughNeeds)
              ? `Pass-through: ${formatSelections(record.passthroughNeeds)}.`
              : getPassthroughPrompt(record))
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
  const needsSourceCount = isQuestionVisibleForStep(record, 1, "sourceCount");
  const needsSwitchSolutionType = isQuestionVisibleForStep(record, 1, "switchSolutionType");
  const needsSourceConnectionType = isQuestionVisibleForStep(record, 1, "sourceConnectionType");
  const needsDisplayCount = isQuestionVisibleForStep(record, 1, "displayCount");
  const needsDisplayConnectionType = isQuestionVisibleForStep(record, 1, "displayConnectionType");
  const needsOutputBehaviour = isQuestionVisibleForStep(record, 1, "outputBehaviour");
  const needsFeatureRequirements = isQuestionVisibleForStep(record, 1, "featureRequirements");
  const needsTransportCable = isQuestionVisibleForStep(record, 1, "transportCableType");
  const needsUsbNeeds = isQuestionVisibleForStep(record, 3, "usbNeeds");
  const needsAudioNeeds = isQuestionVisibleForStep(record, 3, "audioNeeds");
  const needsControlNeeds = isQuestionVisibleForStep(record, 3, "controlNeeds");
  const needsReach =
    isQuestionVisibleForStep(record, 1, "cableDistanceM") ||
    isQuestionVisibleForStep(record, 1, "transportDistanceBand");
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
  const featureRequirements = parseGuidedProjectSelections(record.featureRequirements);
  const sources = num(record.sourceCount);
  const displays = num(record.displayCount);
  const sameContent = includesAny(outputBehaviour, ["same content"]);
  const independentSwitching = includesAny(outputBehaviour, ["independent"]);
  const _passthroughSelections = parseGuidedProjectSelections(record.passthroughNeeds);
  const transportCableRank = getTransportCableRank(record);
  const duplicateDirectCopper = track === "duplicate a signal" && includesAny(record.transportCableType, ["hdmi copper"]);
  const duplicateHaoc = track === "duplicate a signal" && includesAny(record.transportCableType, ["haoc", "fibre", "fiber", "optical"]);
  const duplicateExtenderLineItem = track === "duplicate a signal" && includesAny(record.transportCableType, ["extender"]);
  const structuredCableKnown =
    transportCableRank >= 2 ||
    includesAny(record.sourceCableType, ["cat5e", "cat6", "cat6a", "cat7", "fibre", "fiber", "optical"]) ||
    includesAny(record.displayCableType, ["cat5e", "cat6", "cat6a", "cat7", "fibre", "fiber", "optical"]);
  const premiumCable = transportCableRank >= 4;
  const networkLed =
    includesAny(sourcePath, ["network"]) ||
    includesAny(sourceConnectionType, ["network", "avoip"]) ||
    includesAny(displayPath, ["decoder"]) ||
    includesAny(displayConnectionType, ["decoder", "avoip", "ip", "stream"]);
  const usbcSource = includesAny(sourceConnectionType, ["usb-c"]);
  const collaborationRoom =
    includesAny(record.applicationType, ["meeting", "boardroom", "huddle", "training", "classroom", "flexible"]) ||
    includesAny(usbNeeds, ["usb-c", "soundbar", "webcam", "microphone", "byod"]) ||
    usbcSource;

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
      usbDemand >= 1 || usbcSource || (hasText(record.usbNeeds) && !includesAny(record.usbNeeds, ["none"]))
        ? "USB-capable extender kit"
        : "Point-to-point extender kit";
    workflowSummary =
      "Treat this as an extension problem first, then narrow by distance, signal envelope, USB class, power, and pass-through detail.";
    addScore("HDBaseT", 5, "The customer outcome is a point-to-point extension path, so HDBaseT remains the lead family until the capability envelope rules it out.");
    if (usbDemand >= 1 || (hasText(record.usbNeeds) && !includesAny(record.usbNeeds, ["none"]))) {
      addScore("USB Extension", 4, "USB devices are part of the path, so USB transport needs to be solved explicitly rather than assumed.");
    }
  } else if (track === "duplicate a signal") {
    focusCategory =
      featureRequested(record, "scaled") || featureRequested(record, "mixed resolution")
        ? "Scaler-equipped distribution amplifier"
        : duplicateExtenderLineItem || transportReachM > 10
          ? "Distribution amplifier plus HDMI extender line item"
          : duplicateHaoc
            ? "Distribution amplifier with HAOC HDMI leads"
            : "Splitter / distribution amplifier";
    workflowSummary =
      "Keep this in distribution language until the questions prove the customer needs short copper HDMI, HAOC optical HDMI, or a separate mirrored extender path.";
    addScore("Matrix", 2, "A one-to-many signal flow points to distribution logic, even if the final product is a splitter rather than a full matrix.");
    if (duplicateExtenderLineItem || transportReachM > 10) {
      addScore("HDBaseT", 3, "Longer mirrored output delivery suggests the shortlist should include distribution products plus a dedicated extender path.");
    }
    if (duplicateHaoc) {
      addScore("Matrix", 1, "HAOC optical HDMI keeps the solution in simple distribution language without forcing a full matrix conversation.");
    }
    if (duplicateDirectCopper && transportReachM <= 10) {
      addScore("Matrix", 1, "Short direct HDMI copper runs still favour simple splitter or distribution-amplifier logic.");
    }
  } else if (track === "switch between devices") {
    const presentationLed =
      isPresentationSwitch(record) ||
      (!isMatrixSwitch(record) &&
        ((sources <= 3 && displays <= 2) ||
          collaborationRoom ||
          includesAny(record.sourceTypes, ["laptop", "byod", "usb-c"]) ||
          usbcSource));
    focusCategory = presentationLed ? "Multi-format presentation switcher" : "Matrix switch";
    workflowSummary = presentationLed
      ? "This switching path is workflow-led, so the shortlist should protect user experience, multi-format inputs, and collaboration features."
      : "This switching path is routing-led, so the shortlist should focus on HDMI matrix behavior and the right HDMI or HDBaseT output class.";
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
  if (usbDemand >= 2 || (hasText(record.usbNeeds) && !includesAny(record.usbNeeds, ["none"]))) {
    addScore("USB Extension", 2, "USB support is part of the outcome, so the shortlist must respect the actual USB class.");
  }
  if (usbcSource) {
    addScore("Apollo", 2, "A USB-C source handoff suggests a presentation-led source experience rather than a generic AV-only input.");
    addScore("USB Extension", 1, "USB-C at the source edge keeps USB-aware products relevant in the shortlist.");
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
  if (featureRequested(record, "usb") || featureRequested(record, "kvm") || featureRequested(record, "mst")) {
    addScore("USB Extension", 2, "USB support is already a declared must-have feature, so USB-capable products stay high in the shortlist.");
    addScore("Apollo", 1, "USB support often signals collaboration-led workflows.");
  }
  if (featureRequested(record, "audio breakout")) {
    addScore("HDBaseT", 1, "Audio breakout is a declared requirement, which favours products with stronger I/O utility.");
    addScore("Matrix", 1, "Audio breakout can also keep switchers and matrix-style products in play.");
  }
  if (featureRequested(record, "control ports") || featureRequested(record, "ethernet support")) {
    addScore(
      isPresentationSwitch(record) ? "Apollo" : "HDBaseT",
      1,
      isPresentationSwitch(record)
        ? "Control and Ethernet-facing workflow features keep presentation switchers relevant."
        : "Control and Ethernet utility features help separate richer transport products from simpler options.",
    );
  }
  if (
    featureRequested(record, "pass-through") ||
    featureRequested(record, "rs-232") ||
    featureRequested(record, "ethernet passthrough")
  ) {
    addScore("HDBaseT", 1, "Control ports or pass-through are known requirements, which helps separate utility-rich products from simple transport-only devices.");
  }
  if (featureRequested(record, "wireless") || featureRequested(record, "airplay") || featureRequested(record, "miracast")) {
    addScore("Apollo", 3, "Wireless presentation features keep the shortlist in presentation-switcher territory.");
  }
  if (featureRequested(record, "multi-format") || featureRequested(record, "mst")) {
    addScore("Apollo", 2, "Multi-format or MST-ready inputs strongly favor presentation switchers over fixed-format matrix products.");
  }
  if (featureRequested(record, "scaled") || featureRequested(record, "mixed resolution")) {
    addScore("Matrix", 2, "Mixed-resolution output handling keeps scaler-capable distribution and matrix products relevant.");
  }
  if (featureRequested(record, "poh") || featureRequested(record, "remote power")) {
    addScore("HDBaseT", 2, "PoH or remote power keeps powered extension products high on the shortlist.");
  }
  if (featureRequested(record, "network") || featureRequested(record, "avoip")) {
    addScore("AVoIP", 3, "A network-ready requirement pushes the shortlist toward distributed AV options.");
  }
  if (featureRequested(record, "video wall")) {
    addScore("Video Wall", 3, "Video wall processing is already identified as a must-have capability.");
  }
  if (audioNeeds.includes("dsp") || audioNeeds.includes("dante")) {
    addScore("AVoIP", 1, "A network-aware audio path often pairs naturally with distributed AV conversations.");
  }
  if (transportCableRank >= 4 && signalDemand >= 3 && transportReachM <= 100 && track !== "distribute over network") {
    addScore("HDBaseT", 1, "Higher-grade structured cabling keeps demanding video formats more credible over distance.");
  }
  if (transportCableRank > 0 && transportCableRank <= 2 && signalDemand >= 3 && transportReachM >= 40) {
    addScore("AVoIP", 1, "Higher-demand video over longer Cat5e-class cabling deserves more transport headroom.");
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
  if (includesAny(displayConnectionType, ["class a", "class b"])) {
    addScore("Matrix", 2, "The required HDBaseT output class is a strong matrix-switch filter.");
    addScore("HDBaseT", 1, "HDBaseT output class requirements keep extender-backed matrix options relevant.");
  }

  if (!hasText(record.workflowTrack)) {
    nextActions.push("Choose the top-line direction card that best matches the customer outcome.");
  }
  if (!hasText(record.projectScope)) {
    nextActions.push("Keep the shortlist focused on a single device or signal path unless the customer expands the brief.");
  }
  if (needsSourceCount && !hasText(record.sourceCount)) {
    nextActions.push("Confirm the number of source devices.");
  }
  if (needsSwitchSolutionType && !hasText(record.switchSolutionType)) {
    nextActions.push("Confirm whether the user needs a presentation switcher, matrix switcher, or matrix kit.");
  }
  if (isMatrixSwitch(record) && !hasText(record.matrixIoPreset)) {
    nextActions.push("Lock the preset matrix I/O layout before confirming outputs.");
  }
  if (needsSourceConnectionType && !hasText(record.sourceConnectionType)) {
    nextActions.push("Confirm whether the sources need HDMI, USB-C, or another handoff.");
  }
  if (needsFeatureRequirements && !hasSelections(record.featureRequirements)) {
    nextActions.push(getFeatureRequirementPrompt(record));
  }
  if (needsDisplayCount && !hasText(record.displayCount)) {
    nextActions.push("Confirm the number of displays or destinations.");
  }
  if (needsDisplayConnectionType && !hasText(record.displayConnectionType)) {
    nextActions.push(getDisplayConnectionPrompt(record));
  }
  if (
    needsOutputBehaviour &&
    !hasText(record.outputBehaviour) &&
    (sources >= 1 || displays >= 1 || track === "duplicate a signal" || track === "switch between devices")
  ) {
    nextActions.push("Confirm whether the outputs are mirrored or independently switched.");
  }
  if (
    needsReach &&
    !hasText(record.cableDistanceM) &&
    !hasText(record.transportDistanceBand) &&
    track !== "build a video wall"
  ) {
    nextActions.push(getTransportDistancePrompt(record));
  }
  if (needsTransportCable && !hasText(record.transportCableType)) {
    nextActions.push(getTransportCablePrompt(record));
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
  if (needsAudioBreakout(record) && !hasSelections(record.audioBreakout)) {
    nextActions.push("Confirm the audio breakout requirement.");
  }
  if (needsPowerPreference(record) && !hasText(record.powerPreference)) {
    nextActions.push("Confirm whether local power, 1-way PoH, or 2-way PoH is preferred.");
  }
  if (needsPassthroughDetail(record) && !hasSelections(record.passthroughNeeds)) {
    nextActions.push(getPassthroughPrompt(record));
  }
  if (needsNetworkDetail(record) && !hasText(record.networkEnvironment)) {
    nextActions.push("Validate whether the customer has a suitable managed AV network or VLAN.");
  }
  if (needsRoomEnvelope(record) && (!hasText(record.roomLengthM) || !hasText(record.roomWidthM))) {
    nextActions.push("Capture the room envelope because this path now affects the wider design.");
  }
  if (transportCableRank > 0 && transportCableRank <= 2 && signalDemand >= 3 && transportReachM >= 40) {
    nextActions.push("Sanity-check the cable grade against the requested resolution because longer Cat5e-class runs can narrow the viable transport options.");
  }

  cues.push(`Current direction: ${workflowTrack}.`);
  if (hasText(record.projectScope)) cues.push(`Scope: ${record.projectScope}.`);
  if (hasText(record.customerOutcome)) cues.push(`Outcome: ${record.customerOutcome}.`);
  if (hasText(record.switchSolutionType)) cues.push(`Switch fit: ${record.switchSolutionType}.`);
  if (hasText(record.matrixIoPreset)) cues.push(`Matrix I/O: ${record.matrixIoPreset}.`);
  if (featureRequirements.length > 0) cues.push(`Required features: ${featureRequirements.join(", ")}.`);
  if (hasText(record.outputBehaviour)) cues.push(`Output behaviour: ${record.outputBehaviour}.`);
  if (sources > 0) cues.push(`Sources: ${sources}.`);
  if (hasText(record.sourceConnectionType)) cues.push(`Source connection: ${record.sourceConnectionType}.`);
  if (displays > 0) cues.push(`Destinations: ${displays}.`);
  if (hasText(record.displayConnectionType)) cues.push(`Output connection: ${record.displayConnectionType}.`);
  if (hasText(transportBand)) cues.push(`Reach band: ${transportBand}.`);
  if (hasText(record.transportCableType)) cues.push(`Main cable: ${record.transportCableType}.`);
  if (hasSelections(record.signalFormats)) cues.push(`Video formats: ${formatSelections(record.signalFormats)}.`);
  if (hasText(record.signalHdr)) cues.push(`HDR: ${record.signalHdr}.`);
  if (hasSelections(record.usbStandards)) cues.push(`USB class: ${formatSelections(record.usbStandards)}.`);
  if (hasText(record.powerPreference)) cues.push(`Power preference: ${record.powerPreference}.`);
  if (hasSelections(record.passthroughNeeds)) cues.push(`Pass-through: ${formatSelections(record.passthroughNeeds)}.`);
  if (hasText(record.networkEnvironment)) cues.push(`Network: ${record.networkEnvironment}.`);
  if (hasSelections(record.audioBreakout)) cues.push(`Audio breakout: ${formatSelections(record.audioBreakout)}.`);
  const cableSuggestions = buildSuggestedCableList(record);
  if (cableSuggestions.length > 0) cues.push(`Cable add-ons: ${cableSuggestions.join(" ")}`);

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
    hasText(record.switchSolutionType) || !needsSwitchSolutionType ? "switchFit" : "",
    hasSelections(record.featureRequirements) || !needsFeatureRequirements ? "features" : "",
    hasText(record.sourceCount) || !needsSourceCount ? "sources" : "",
    hasText(record.displayCount) || !needsDisplayCount ? "displays" : "",
    hasText(record.outputBehaviour) || !needsOutputBehaviour ? "output" : "",
    hasText(record.cableDistanceM) || hasText(transportBand) ? "distance" : "",
    hasText(record.transportCableType) || !needsTransportCable ? "transportCable" : "",
    hasText(record.sourceConnectionType) || !needsSourceConnectionType ? "sourceTransport" : "",
    hasText(record.displayConnectionType) || !needsDisplayConnectionType ? "displayTransport" : "",
    hasSelections(record.signalFormats) ? "formats" : "",
    hasText(record.signalHdr) || !hasSelections(record.signalFormats) ? "hdr" : "",
    hasText(record.usbNeeds) || !needsUsbNeeds ? "usbNeeds" : "",
    hasSelections(record.usbStandards) || !needsUsbStandardDetail(record) ? "usbClass" : "",
    hasText(record.audioNeeds) || !needsAudioNeeds ? "audioNeeds" : "",
    hasSelections(record.audioBreakout) || !needsAudioBreakout(record) ? "audioBreakout" : "",
    hasText(record.controlNeeds) || !needsControlNeeds ? "control" : "",
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
  const cableSuggestions = buildSuggestedCableList(record);
  return [
    record.notes.trim(),
    "Guided Project summary:",
    `Direction: ${hasText(record.workflowTrack) ? record.workflowTrack : getWorkflowTrack(record)}`,
    `Scope: ${record.projectScope || "Not confirmed"}`,
    `Likely category: ${advice.focusCategory}`,
    `Primary family: ${advice.primary} (${advice.confidence})`,
    `Customer outcome: ${record.customerOutcome || record.workflowTrack || "Not confirmed"}`,
    `Switch fit: ${record.switchSolutionType || "Not confirmed"}`,
    `Matrix I/O: ${record.matrixIoPreset || "Not confirmed"}`,
    `Required features: ${formatSelections(record.featureRequirements)}`,
    `Application: ${record.applicationType || "Not confirmed"}`,
    `Sources: ${record.sourceCount || "Not confirmed"}`,
    `Destinations: ${record.displayCount || "Not confirmed"}`,
    `Output behaviour: ${record.outputBehaviour || "Not confirmed"}`,
    `Reach band: ${getTransportBand(record) || "Not confirmed"}`,
    `Installed route: ${record.cableDistanceM || "Not confirmed"} m`,
    `Main cable type: ${record.transportCableType || "Not confirmed"}`,
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
    `Audio breakout: ${formatSelections(record.audioBreakout)}`,
    `Control needs: ${record.controlNeeds || "Not confirmed"}`,
    `Pass-through: ${formatSelections(record.passthroughNeeds)}`,
    `Power preference: ${record.powerPreference || "Not confirmed"}`,
    `Network environment: ${record.networkEnvironment || "Not confirmed"}`,
    cableSuggestions.length > 0 ? "Suggested cable add-ons:" : "",
    ...cableSuggestions,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getNextToolLabel(path: string): string {
  if (path === WM_ROUTES.videowall) return "Video Wall Designer";
  if (path === WM_ROUTES.templates) return "Architecture Templates";
  return "Product Catalog";
}
