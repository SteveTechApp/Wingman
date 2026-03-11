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
export type GuidedProjectInput = "text" | "number" | "select" | "textarea" | "multiSelect";

export type GuidedProjectRecord = {
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
  controlNeeds: string;
  budgetBand: string;
  urgency: string;
  notes: string;
  recommendedFamilies: GuidedProjectFamily[];
  recommendedNextTool: string;
  createdAt: string;
};

export type GuidedProjectQuestion = {
  id: keyof GuidedProjectRecord;
  step: GuidedProjectStep;
  label: string;
  helper: string;
  input: GuidedProjectInput;
  options?: readonly string[];
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
  ["Customer Brief", "Start with the basic customer and room context."],
  ["Space and Distance", "Capture the physical envelope and the installed route, not just the room size."],
  ["Physical Dynamics", "Work through source origin, first hop, transport medium, and endpoint delivery."],
  ["User Experience", "Capture USB, audio, control, and commercial caveats without overloading the user."],
] as const;

const APPLICATIONS = [
  "Meeting Space",
  "Boardroom",
  "Huddle Space",
  "Training Room",
  "Classroom",
  "Control Room",
  "Reception",
  "Retail",
  "Flexible Space",
  "Custom",
] as const;

const INSTALL_PATHS = [
  "Simple same-room route",
  "Floor box route",
  "Wall plate or wall cavity route",
  "Via local rack or credenza",
  "Via central rack or riser",
  "Across rooms or corridors",
  "Mixed building route",
  "Not sure yet",
] as const;

const TRANSPORT_DISTANCE_BANDS = [
  "<5m",
  "<40m",
  "<70m",
  "100m",
  "Over 100m",
  "Not sure yet",
] as const;

const SOURCE_PLACEMENT = [
  "Mostly BYOD at the table",
  "Fixed devices in the room",
  "Central rack",
  "Local rack or credenza",
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
  "Microphones plus speakers",
  "DSP or Dante ready",
  "USB audio bridge",
] as const;

const CONTROL = [
  "None",
  "Simple room control",
  "IP control",
  "Touch panel or automation",
  "Matrix or multi-zone control",
] as const;

const BUDGET = ["Entry", "Mid", "Performance", "Premium", "Open"] as const;
const URGENCY = ["Immediate", "This month", "This quarter", "Planning stage"] as const;

function num(value: string): number {
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
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toggleGuidedProjectSelection(current: string | undefined, option: string): string {
  const selected = parseGuidedProjectSelections(current);
  return selected.includes(option)
    ? selected.filter((item) => item !== option).join(" | ")
    : [...selected, option].join(" | ");
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
    case "<40m":
      return 40;
    case "<70m":
      return 70;
    case "100m":
      return 100;
    case "over 100m":
      return 120;
    default:
      return 0;
  }
}

function deriveDistanceBand(distanceM: number): string {
  if (distanceM <= 0) return "";
  if (distanceM < 5) return "<5m";
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
  if (selected.some((item) => item.includes("custom"))) return 4;
  if (selected.some((item) => item.includes("5k"))) return 4;
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
  if (selected.some((item) => item.includes("legacy") || item.includes("hid"))) return 1;
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

function needsCapabilityEnvelope(record: GuidedProjectRecord): boolean {
  return (
    hasText(record.sourceConnectionType) ||
    hasText(record.displayConnectionType) ||
    hasText(record.sourceConnectionPath) ||
    hasText(record.displayConnectionPath) ||
    getTransportReachM(record) >= 5
  );
}

export function shouldAskInstallationPath(record: GuidedProjectRecord): boolean {
  return getTransportReachM(record) >= 10 || num(record.roomLengthM) >= 8 || num(record.displayCount) >= 2;
}

export function needsNetworkDetail(record: GuidedProjectRecord): boolean {
  return (
    includesAny(record.sourceConnectionPath, ["network"]) ||
    includesAny(record.sourceConnectionType, ["network", "avoip"]) ||
    includesAny(record.displayConnectionPath, ["decoder"]) ||
    includesAny(record.displayConnectionType, ["decoder", "avoip"]) ||
    getTransportReachM(record) >= 70 ||
    num(record.displayCount) >= 3 ||
    (getSignalDemand(record.signalFormats) >= 4 && getTransportReachM(record) >= 40)
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
    includesAny(record.displayConnectionPath, ["receiver", "decoder", "switcher", "processor"]) ||
    getTransportReachM(record) >= 10
  );
}

function needsUsbStandardDetail(record: GuidedProjectRecord): boolean {
  return (
    !includesAny(record.usbNeeds, ["none"]) &&
    (
      hasText(record.usbNeeds) ||
      includesAny(record.sourceTypes, ["camera", "microphone", "soundbar", "byod"])
    )
  );
}

const QUESTION_DEFS: GuidedProjectQuestion[] = [
  { id: "customer", step: 0, label: "Customer", helper: "Who is the end customer or internal stakeholder?", input: "text", placeholder: "e.g. Acme Ltd" },
  { id: "site", step: 0, label: "Site", helper: "Where is the space physically located?", input: "text", placeholder: "e.g. London HQ" },
  { id: "roomName", step: 0, label: "Room or project name", helper: "Keep this plain and customer-friendly.", input: "text", placeholder: "e.g. Boardroom Refresh" },
  { id: "applicationType", step: 0, label: "Application type", helper: "What kind of environment are we designing for?", input: "select", options: APPLICATIONS },
  { id: "roomLengthM", step: 1, label: "Room length (m)", helper: "Approximate is fine at this stage.", input: "number", placeholder: "10" },
  { id: "roomWidthM", step: 1, label: "Room width (m)", helper: "Enough to understand cable and viewing constraints.", input: "number", placeholder: "5" },
  { id: "roomHeightM", step: 1, label: "Room height (m)", helper: "Helpful for cameras, ceiling equipment, and coverage.", input: "number", placeholder: "2.8" },
  { id: "displayCount", step: 1, label: "Display count", helper: "How many primary displays need feeding?", input: "number", placeholder: "1" },
  { id: "cableDistanceM", step: 1, label: "Longest likely installed route (m)", helper: "Think installed route, not just line-of-sight distance.", input: "number", placeholder: "15" },
  {
    id: "transportDistanceBand",
    step: 1,
    label: "Primary transport reach band",
    helper: "Use the nearest reach band if the exact install length is still unknown.",
    input: "select",
    options: TRANSPORT_DISTANCE_BANDS,
    shouldAsk: (record) => num(record.displayCount) > 0 || num(record.sourceCount) > 0 || num(record.cableDistanceM) > 0,
    branchReason: () => "Reach bands help Wingman compare HDBaseT and extension limits against the real signal envelope.",
  },
  {
    id: "installationPath",
    step: 1,
    label: "Installation route",
    helper: "Does the path stay simple, or does it move through floor boxes, walls, or racks?",
    input: "select",
    options: INSTALL_PATHS,
    shouldAsk: shouldAskInstallationPath,
    branchReason: () => "Longer or multi-endpoint rooms need the real installed route, not just a room dimension.",
  },
  { id: "sourceCount", step: 2, label: "Source count", helper: "How many sources need to enter the system?", input: "number", placeholder: "3" },
  { id: "sourceTypes", step: 2, label: "Typical source types", helper: "Keep this simple: laptops, cameras, PCs, players, or a mix.", input: "text", placeholder: "Laptops, cameras, PC, signage player" },
  { id: "sourcePlacement", step: 2, label: "Where are sources located?", helper: "This is one of the strongest technology signals Wingman can capture.", input: "select", options: SOURCE_PLACEMENT },
  {
    id: "sourceConnectionPath",
    step: 2,
    label: "How do sources enter the system?",
    helper: "Think first hop: direct cable, floor box, wall plate, rack, or network.",
    input: "select",
    options: SOURCE_PATH,
    shouldAsk: (record) => num(record.sourceCount) > 0 || hasText(record.sourcePlacement),
    branchReason: () => "Once we know the sources exist, Wingman needs the first hop into the system.",
  },
  {
    id: "sourceConnectionType",
    step: 2,
    label: "Source-to-system transport",
    helper: "What actually carries the source into the next device or boundary?",
    input: "select",
    options: SOURCE_CONNECTION_TYPES,
    shouldAsk: (record) => hasText(record.sourceConnectionPath) || hasText(record.sourceTypes),
    branchReason: (record) =>
      includesAny(record.sourceTypes, ["laptop", "camera", "pc", "player", "byod"])
        ? "The source mix suggests the connector and transport type should be explicit."
        : "The first hop is known, so Wingman should lock down the transport type next.",
  },
  {
    id: "signalFormats",
    step: 2,
    label: "Signal formats to support",
    helper: "Tick the actual formats the customer may need, not just the lowest common denominator.",
    input: "multiSelect",
    options: SIGNAL_FORMATS,
    fullWidth: true,
    shouldAsk: needsCapabilityEnvelope,
    branchReason: () => "Resolution and frame-rate targets materially change what a 40m or 70m extension path can support.",
  },
  {
    id: "signalHdr",
    step: 2,
    label: "HDR requirement",
    helper: "HDR pushes the transport harder, so capture it explicitly if it matters.",
    input: "select",
    options: HDR_OPTIONS,
    shouldAsk: (record) => hasSelections(record.signalFormats),
    branchReason: () => "HDR can turn a borderline transport into a real risk, especially on structured cabling.",
  },
  {
    id: "sourceCableType",
    step: 2,
    label: "Source-side cable medium or category",
    helper: "Capture the likely cable grade between the source and the next device.",
    input: "select",
    options: CABLE_TYPES,
    shouldAsk: needsSourceCableDetail,
    branchReason: () => "Cable grade matters once resolution, HDR, and USB bandwidth enter the discussion.",
  },
  {
    id: "displayConnectionPath",
    step: 2,
    label: "How do displays receive the signal?",
    helper: "Think final hop: direct, receiver, decoder, processor, or mixed.",
    input: "select",
    options: DISPLAY_PATH,
    shouldAsk: (record) => num(record.displayCount) > 0,
    branchReason: () => "Once displays are present, Wingman needs to understand the final delivery path.",
  },
  {
    id: "displayConnectionType",
    step: 2,
    label: "Display-side transport",
    helper: "What transport arrives at the display or the final endpoint device?",
    input: "select",
    options: DISPLAY_CONNECTION_TYPES,
    shouldAsk: (record) => num(record.displayCount) > 0 || hasText(record.displayConnectionPath),
    branchReason: () => "The final hop often reveals whether the system is direct, switched, extended, or decoded.",
  },
  {
    id: "displayCableType",
    step: 2,
    label: "Display-side cable medium or category",
    helper: "Capture the likely medium and cable grade on the last leg to the display.",
    input: "select",
    options: CABLE_TYPES,
    shouldAsk: needsDisplayCableDetail,
    branchReason: () => "The last leg often exposes cable-grade limits before the design is committed.",
  },
  {
    id: "networkEnvironment",
    step: 2,
    label: "Network environment",
    helper: "Only ask this when the signal path suggests a decoder-led or AVoIP backbone may be involved.",
    input: "select",
    options: NETWORK_ENVIRONMENTS,
    shouldAsk: needsNetworkDetail,
    branchReason: () => "The transport path suggests a network backbone may matter, so Wingman needs LAN readiness.",
  },
  { id: "usbNeeds", step: 3, label: "USB workflow", helper: "Capture the user workflow first, then the actual USB bandwidth if it matters.", input: "select", options: USB },
  {
    id: "usbStandards",
    step: 3,
    label: "USB bandwidth to support",
    helper: "Tick the USB class required by webcams, microphones, touch, or BYOD peripherals.",
    input: "multiSelect",
    options: USB_STANDARDS,
    fullWidth: true,
    shouldAsk: needsUsbStandardDetail,
    branchReason: () => "USB bandwidth changes which extender and transport combinations remain viable.",
  },
  { id: "audioNeeds", step: 3, label: "Audio needs", helper: "Enough to decide whether audio transport changes the design.", input: "select", options: AUDIO },
  { id: "controlNeeds", step: 3, label: "Control needs", helper: "Simple control versus automation materially changes the path.", input: "select", options: CONTROL },
  { id: "budgetBand", step: 3, label: "Budget band", helper: "Useful for early tiering, not just pricing.", input: "select", options: BUDGET },
  { id: "urgency", step: 3, label: "Urgency", helper: "Helps shape how much detail we need immediately.", input: "select", options: URGENCY },
  {
    id: "notes",
    step: 3,
    label: "Notes, caveats, or unknowns",
    helper: "Capture anything that changes the physical design: floor boxes, local racks, consultant preference, existing cabling, or open questions.",
    input: "textarea",
    fullWidth: true,
    placeholder: "Capture anything that changes the physical design or leaves risk open.",
  },
];

export function createEmptyGuidedProjectRecord(): GuidedProjectRecord {
  return {
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
    controlNeeds: "",
    budgetBand: "",
    urgency: "",
    notes: "",
    recommendedFamilies: [],
    recommendedNextTool: WM_ROUTES.catalogue,
    createdAt: new Date().toISOString(),
  };
}

function isQuestionVisible(question: GuidedProjectQuestion, record: GuidedProjectRecord): boolean {
  return question.shouldAsk ? question.shouldAsk(record) : true;
}

export function getVisibleQuestionsForStep(record: GuidedProjectRecord, step: GuidedProjectStep): GuidedProjectQuestionState[] {
  return QUESTION_DEFS
    .filter((question) => question.step === step && isQuestionVisible(question, record))
    .map((question) => {
      const branchReasonText = question.branchReason?.(record);
      return { ...question, activeBranch: Boolean(branchReasonText), branchReasonText };
    });
}

export function getGuidedProjectProgress(record: GuidedProjectRecord): GuidedProjectProgress[] {
  return GUIDED_PROJECT_STEPS.map((_, index) => {
    const questions = getVisibleQuestionsForStep(record, index as GuidedProjectStep);
    return {
      complete: questions.filter((question) => hasText(String(record[question.id] ?? ""))).length,
      total: questions.length,
    };
  });
}

export function buildBranchHighlights(record: GuidedProjectRecord): string[] {
  return uniq(
    QUESTION_DEFS
      .filter((question) => isQuestionVisible(question, record))
      .map((question) => question.branchReason?.(record) ?? "")
      .filter(Boolean),
  ).slice(0, 5);
}

export function buildGuidedProjectLenses(record: GuidedProjectRecord): GuidedProjectLens[] {
  const transportBand = getTransportBand(record);
  const sourceResolved = hasText(record.sourceTypes) && hasText(record.sourcePlacement);
  const firstHopResolved = hasText(record.sourceConnectionPath) && hasText(record.sourceConnectionType);
  const capabilityResolved =
    hasText(transportBand) &&
    hasSelections(record.signalFormats) &&
    hasText(record.signalHdr) &&
    (!needsUsbStandardDetail(record) || hasSelections(record.usbStandards));
  const backboneResolved =
    hasText(record.cableDistanceM) &&
    (!shouldAskInstallationPath(record) || hasText(record.installationPath)) &&
    (!needsSourceCableDetail(record) || hasText(record.sourceCableType)) &&
    (!needsDisplayCableDetail(record) || hasText(record.displayCableType)) &&
    (!needsNetworkDetail(record) || hasText(record.networkEnvironment));
  const endpointResolved = hasText(record.displayConnectionPath) && hasText(record.displayConnectionType);

  return [
    {
      id: "source-origin",
      title: "Source origin",
      state: sourceResolved ? "resolved" : (hasText(record.sourceCount) || hasText(record.sourceTypes) ? "active" : "watch"),
      summary: sourceResolved
        ? `Sources are currently understood as ${record.sourceTypes.toLowerCase()} living ${record.sourcePlacement.toLowerCase()}.`
        : "Wingman still needs the true source mix and where those sources physically live.",
      prompts: uniq([
        hasText(record.sourceTypes) ? `Current source mix: ${record.sourceTypes}.` : "Confirm laptops, cameras, PCs, players, or a mix.",
        hasText(record.sourcePlacement) ? `Current placement: ${record.sourcePlacement}.` : "Confirm whether sources sit at the table, in-room, or in a rack.",
      ]).slice(0, 2),
    },
    {
      id: "first-hop",
      title: "First hop",
      state: firstHopResolved ? "resolved" : (hasText(record.sourceConnectionPath) || hasText(record.sourceConnectionType) ? "active" : "watch"),
      summary: firstHopResolved
        ? `The first hop is currently ${record.sourceConnectionPath.toLowerCase()} using ${record.sourceConnectionType.toLowerCase()}.`
        : "Wingman still needs the first signal handoff into the system.",
      prompts: uniq([
        hasText(record.sourceConnectionPath) ? `Current path: ${record.sourceConnectionPath}.` : "Confirm whether the first hop is direct, via plate, rack, or network.",
        hasText(record.sourceConnectionType) ? `Current transport: ${record.sourceConnectionType}.` : "Lock down HDMI, USB-C, HDBaseT, AVoIP, or mixed transport.",
      ]).slice(0, 2),
    },
    {
      id: "signal-envelope",
      title: "Signal envelope",
      state: capabilityResolved ? "resolved" : (hasText(transportBand) || hasSelections(record.signalFormats) || hasText(record.signalHdr) || hasSelections(record.usbStandards) ? "active" : "watch"),
      summary: capabilityResolved
        ? `Wingman has a working envelope of ${transportBand.toLowerCase()} with ${formatSelections(record.signalFormats, "signal formats").toLowerCase()} and ${record.signalHdr.toLowerCase()}.`
        : "Wingman still needs the real signal envelope before it can judge whether HDBaseT remains viable.",
      prompts: uniq([
        hasText(transportBand) ? `Reach band: ${transportBand}.` : "Capture the practical reach band, not just a generic short or long label.",
        hasSelections(record.signalFormats) ? `Video formats: ${formatSelections(record.signalFormats)}.` : "Tick the real formats: 1080p, 4K30, 4K60, 5K, 8K, or custom.",
        hasText(record.signalHdr) ? `HDR: ${record.signalHdr}.` : "Confirm whether HDR matters because it changes transport tolerance.",
        needsUsbStandardDetail(record)
          ? (hasSelections(record.usbStandards) ? `USB bandwidth: ${formatSelections(record.usbStandards)}.` : "Tick the real USB class if cameras, soundbars, or BYOD peripherals are in play.")
          : "",
      ]).slice(0, 4),
    },
    {
      id: "backbone",
      title: "Backbone",
      state: backboneResolved ? "resolved" : (hasText(record.cableDistanceM) || hasText(record.installationPath) || hasText(record.sourceCableType) || hasText(record.displayCableType) || hasText(record.networkEnvironment) ? "active" : "watch"),
      summary: backboneResolved
        ? "Wingman has enough route, cable, and network detail to reason about extension, switching, and distributed transport."
        : "Wingman still needs route, cable grade, or network detail before it can trust the transport recommendation.",
      prompts: uniq([
        hasText(record.cableDistanceM) ? `Installed route: ${record.cableDistanceM} m.` : "Capture the longest installed route, not just room size.",
        shouldAskInstallationPath(record)
          ? (hasText(record.installationPath) ? `Route style: ${record.installationPath}.` : "Confirm whether the run crosses floor boxes, walls, racks, or corridors.")
          : "",
        needsSourceCableDetail(record)
          ? (hasText(record.sourceCableType) ? `Source-side cable: ${record.sourceCableType}.` : "Confirm the cable category on the source side.")
          : "",
        needsDisplayCableDetail(record)
          ? (hasText(record.displayCableType) ? `Display-side cable: ${record.displayCableType}.` : "Confirm the cable category on the display side.")
          : "",
        needsNetworkDetail(record)
          ? (hasText(record.networkEnvironment) ? `Network: ${record.networkEnvironment}.` : "Confirm whether there is a managed LAN or dedicated AV VLAN available.")
          : "",
      ]).slice(0, 4),
    },
    {
      id: "endpoint-delivery",
      title: "Endpoint delivery",
      state: endpointResolved ? "resolved" : (hasText(record.displayConnectionPath) || hasText(record.displayConnectionType) ? "active" : "watch"),
      summary: endpointResolved
        ? `Displays are currently reached ${record.displayConnectionPath.toLowerCase()} using ${record.displayConnectionType.toLowerCase()}.`
        : "Wingman still needs the final hop into the display or endpoint device.",
      prompts: uniq([
        hasText(record.displayConnectionPath) ? `Current display path: ${record.displayConnectionPath}.` : "Confirm whether displays are direct, receiver-led, decoder-led, or processor-led.",
        hasText(record.displayConnectionType) ? `Current display transport: ${record.displayConnectionType}.` : "Lock down the display transport before finalising the architecture.",
      ]).slice(0, 2),
    },
  ];
}

export function buildGuidedProjectAdvice(record: GuidedProjectRecord): GuidedProjectAdvice {
  const app = lower(record.applicationType);
  const sourceTypes = lower(record.sourceTypes);
  const sourcePlacement = lower(record.sourcePlacement);
  const sourcePath = lower(record.sourceConnectionPath);
  const sourceConnectionType = lower(record.sourceConnectionType);
  const displayPath = lower(record.displayConnectionPath);
  const displayConnectionType = lower(record.displayConnectionType);
  const networkEnvironment = lower(record.networkEnvironment);
  const usb = lower(record.usbNeeds);
  const audio = lower(record.audioNeeds);
  const control = lower(record.controlNeeds);
  const distance = num(record.cableDistanceM);
  const transportBand = getTransportBand(record);
  const transportReachM = getTransportReachM(record);
  const signalDemand = getSignalDemand(record.signalFormats);
  const hdrDemand = getHdrDemand(record.signalHdr);
  const usbDemand = getUsbDemand(record.usbStandards);
  const displays = num(record.displayCount);
  const sources = num(record.sourceCount);

  const families = new Set<GuidedProjectFamily>();
  const familyScores: Record<GuidedProjectFamily, number> = {
    Apollo: 0,
    HDBaseT: 0,
    AVoIP: 0,
    Matrix: 0,
    "USB Extension": 0,
    "Video Wall": 0,
  };
  const cues: string[] = [];
  const reasons: string[] = [];
  const nextActions: string[] = [];

  const cableRanks = [getCableRank(record.sourceCableType), getCableRank(record.displayCableType)];
  const strongestCableRank = Math.max(...cableRanks, 0);
  const lowerGradeCable =
    includesAny(record.sourceCableType, ["cat5e"]) ||
    includesAny(record.displayCableType, ["cat5e"]);
  const structuredCableKnown =
    includesAny(record.sourceCableType, ["cat5e", "cat6", "cat6a", "cat7", "fiber"]) ||
    includesAny(record.displayCableType, ["cat5e", "cat6", "cat6a", "cat7", "fiber"]);
  const premiumCable = strongestCableRank >= 4;
  const cableUnknown =
    (!hasText(record.sourceCableType) && !hasText(record.displayCableType)) ||
    includesAny(record.sourceCableType, ["unknown", "not sure"]) ||
    includesAny(record.displayCableType, ["unknown", "not sure"]);
  const premiumEnvelope = signalDemand >= 4 || hdrDemand >= 2 || usbDemand >= 3;
  const collaborationRoom =
    includesAny(app, ["boardroom", "meeting", "huddle", "training", "flexible"]) ||
    includesAny(usb, ["usb-c", "byod"]);
  const structuredExtension =
    transportReachM >= 10 ||
    includesAny(sourcePath, ["floor box", "wall plate", "central rack", "local rack"]) ||
    includesAny(displayPath, ["receiver"]) ||
    includesAny(sourceConnectionType, ["hdbaset"]) ||
    includesAny(displayConnectionType, ["hdbaset"]) ||
    structuredCableKnown;
  const networkLed =
    includesAny(sourcePath, ["network"]) ||
    includesAny(displayPath, ["decoder"]) ||
    includesAny(sourceConnectionType, ["network", "avoip"]) ||
    includesAny(displayConnectionType, ["decoder", "avoip"]);
  const networkReady = includesAny(networkEnvironment, ["managed", "vlan", "shared"]);

  function registerFamily(family: GuidedProjectFamily, score: number, reason: string) {
    families.add(family);
    familyScores[family] = Math.max(familyScores[family], score);
    reasons.push(reason);
  }

  if (collaborationRoom) {
    registerFamily(
      "Apollo",
      3 + (usb.includes("byod") ? 1 : 0),
      "The room workflow looks collaboration-led, so user experience and BYOD simplicity still matter."
    );
  }

  let hdbasetScore = 0;
  if (structuredExtension) hdbasetScore += 2;
  if (transportReachM > 0 && transportReachM <= 100) hdbasetScore += 2;
  if (transportReachM > 100) hdbasetScore -= 3;
  if (structuredCableKnown) hdbasetScore += 2;
  if (premiumCable) hdbasetScore += 1;
  if (lowerGradeCable) hdbasetScore -= 1;
  if (cableUnknown) hdbasetScore -= 1;
  if (signalDemand <= 2) hdbasetScore += 1;
  else if (signalDemand === 3 && !lowerGradeCable) hdbasetScore += 1;
  else if (signalDemand >= 4) hdbasetScore -= 2;
  if (hdrDemand >= 1 && lowerGradeCable) hdbasetScore -= 1;
  if (usbDemand <= 1) hdbasetScore += 1;
  if (usbDemand >= 3) hdbasetScore -= 2;
  if (transportReachM >= 70 && premiumEnvelope) hdbasetScore -= 1;
  if (includesAny(sourceConnectionType, ["hdbaset"]) || includesAny(displayConnectionType, ["hdbaset"])) hdbasetScore += 1;

  if (hdbasetScore >= 3) {
    registerFamily(
      "HDBaseT",
      hdbasetScore,
      `Structured extension cues fit HDBaseT, especially around ${transportBand || `${transportReachM}m`} with ${formatSelections(record.signalFormats).toLowerCase()} and ${record.signalHdr || "unknown HDR"}.`
    );
  }

  let avoipScore = 0;
  if (transportReachM >= 70) avoipScore += 1;
  if (transportReachM > 100) avoipScore += 2;
  if (networkLed) avoipScore += 2;
  if (networkReady) avoipScore += 2;
  if (sources >= 4 && displays >= 3) avoipScore += 2;
  if (premiumEnvelope && transportReachM >= 40) avoipScore += 1;
  if (signalDemand >= 4) avoipScore += 1;
  if (usbDemand >= 3) avoipScore += 1;

  if (avoipScore >= 3) {
    registerFamily(
      "AVoIP",
      avoipScore,
      "Distributed endpoints, higher capability transport, or longer structured runs suggest a network-led AVoIP backbone may be cleaner."
    );
  }

  let matrixScore = 0;
  if (sources >= 3) matrixScore += 2;
  if (displays >= 2) matrixScore += 1;
  if (includesAny(control, ["matrix"])) matrixScore += 2;
  if (includesAny(sourcePlacement, ["central rack", "mixed", "local rack"])) matrixScore += 1;
  if (includesAny(sourcePath, ["central rack", "local rack", "mixed"])) matrixScore += 1;

  if (matrixScore >= 2) {
    registerFamily(
      "Matrix",
      matrixScore,
      "The I/O density and routing pattern suggest that switching flexibility matters."
    );
  }

  let usbExtensionScore = 0;
  if (!includesAny(record.usbNeeds, ["none"])) usbExtensionScore += 1;
  if (usbDemand >= 2) usbExtensionScore += 2;
  if (includesAny(sourceTypes, ["camera", "soundbar", "microphone"])) usbExtensionScore += 1;
  if (transportReachM >= 5 || includesAny(sourcePlacement, ["rack", "fixed"])) usbExtensionScore += 1;

  if (usbExtensionScore >= 3) {
    registerFamily(
      "USB Extension",
      usbExtensionScore,
      "USB peripherals and room cameras introduce a separate USB transport decision that should not be assumed."
    );
  }

  let videoWallScore = 0;
  if (includesAny(app, ["control room", "reception", "retail"])) videoWallScore += 1;
  if (displays >= 4) videoWallScore += 2;
  if (includesAny(displayPath, ["video wall processor"])) videoWallScore += 2;
  if (includesAny(displayConnectionType, ["processor"])) videoWallScore += 2;

  if (videoWallScore >= 2) {
    registerFamily(
      "Video Wall",
      videoWallScore,
      "The display model looks processor-led or multi-endpoint, not just a simple room display."
    );
  }

  if (families.size === 0) {
    registerFamily(
      "Apollo",
      1,
      "With limited detail, a collaboration-led baseline is the safest starting point."
    );
  }

  cues.push(hasText(record.sourcePlacement) ? `Sources are expected to live ${record.sourcePlacement.toLowerCase()}.` : "Source placement is still unclear.");
  cues.push(hasText(record.sourceConnectionPath) ? `Sources likely join the system ${record.sourceConnectionPath.toLowerCase()}.` : "The first hop into the system is still unclear.");
  cues.push(hasText(record.sourceConnectionType) ? `The source-side transport is currently ${record.sourceConnectionType.toLowerCase()}.` : "The source-side transport is still unclear.");
  cues.push(hasText(record.displayConnectionType) ? `Displays are likely fed using ${record.displayConnectionType.toLowerCase()}.` : "The display-side transport is still unclear.");
  if (hasText(transportBand)) cues.push(`The primary transport reach band is ${transportBand}.`);
  if (hasSelections(record.signalFormats)) cues.push(`Expected signal formats include ${formatSelections(record.signalFormats)}.`);
  if (hasText(record.signalHdr)) cues.push(`HDR expectation: ${record.signalHdr}.`);
  if (hasSelections(record.usbStandards)) cues.push(`USB bandwidth needs include ${formatSelections(record.usbStandards)}.`);
  if (hasText(record.sourceCableType)) cues.push(`Source-side cable is currently assumed to be ${record.sourceCableType.toLowerCase()}.`);
  if (hasText(record.displayCableType)) cues.push(`Display-side cable is currently assumed to be ${record.displayCableType.toLowerCase()}.`);
  if (hasText(record.installationPath)) cues.push(`The installed route currently looks like ${record.installationPath.toLowerCase()}.`);
  if (hasText(record.networkEnvironment)) cues.push(`The network environment is currently ${record.networkEnvironment.toLowerCase()}.`);
  if (distance > 0) cues.push(`The longest likely installed route is about ${distance} m.`);

  if (!hasText(record.sourceTypes)) nextActions.push("Confirm the real source mix: laptops, cameras, PCs, players, or a mix.");
  if (!hasText(record.sourcePlacement)) nextActions.push("Confirm where sources physically live: table, local rack, central rack, or fixed around the room.");
  if (!hasText(record.sourceConnectionPath) || !hasText(record.displayConnectionPath)) nextActions.push("Map the first hop and the final hop before finalising the technology choice.");
  if (!hasText(record.sourceConnectionType) || !hasText(record.displayConnectionType)) nextActions.push("Lock down the transport type on both the source side and display side.");
  if (structuredExtension && !hasText(transportBand)) nextActions.push("Choose the practical reach band so Wingman can compare real extension limits, not just generic distance.");
  if (needsCapabilityEnvelope(record) && !hasSelections(record.signalFormats)) nextActions.push("Tick the actual signal formats required, because 1080p and 4K60 do not behave the same on structured cabling.");
  if (hasSelections(record.signalFormats) && !hasText(record.signalHdr)) nextActions.push("Confirm whether HDR matters before committing to an HDBaseT path.");
  if ((needsSourceCableDetail(record) && !hasText(record.sourceCableType)) || (needsDisplayCableDetail(record) && !hasText(record.displayCableType))) nextActions.push("Confirm the actual cable category because Cat5e, Cat6, Cat6A, and fiber imply very different transport options.");
  if (needsUsbStandardDetail(record) && !hasSelections(record.usbStandards)) nextActions.push("Tick the required USB class so Wingman can separate simple HID control from USB 2.0 or USB 3.0 transport.");
  if (shouldAskInstallationPath(record) && !hasText(record.installationPath)) nextActions.push("Confirm whether the installed route crosses floor boxes, wall plates, racks, or building fabric.");
  if (needsNetworkDetail(record) && !hasText(record.networkEnvironment)) nextActions.push("Validate switch, VLAN, and control of the network before committing to any decoder-led or AVoIP path.");
  if (!hasText(record.usbNeeds) || !hasText(record.controlNeeds)) nextActions.push("Confirm USB and control expectations so the user experience is not under-scoped.");
  if (families.has("HDBaseT") && lowerGradeCable && premiumEnvelope) nextActions.push("Validate whether Cat5e is realistic for the demanded format, HDR, and USB mix before offering HDBaseT as the lead path.");
  if (transportReachM > 100) nextActions.push("Anything beyond 100m should be treated as a distributed or fiber-led conversation, not a routine extender run.");
  if (includesAny(audio, ["dsp", "dante"])) nextActions.push("Validate the audio network and DSP boundary early because it changes transport choices.");

  const order: GuidedProjectFamily[] = ["Apollo", "HDBaseT", "AVoIP", "Matrix", "USB Extension", "Video Wall"];
  const ordered = order.filter((family) => families.has(family));
  const primaryOrder: GuidedProjectFamily[] = ["Video Wall", "AVoIP", "Matrix", "HDBaseT", "Apollo", "USB Extension"];
  const primary =
    [...ordered].sort((left, right) => {
      const scoreDiff = familyScores[right] - familyScores[left];
      return scoreDiff !== 0 ? scoreDiff : primaryOrder.indexOf(left) - primaryOrder.indexOf(right);
    })[0] ?? "Apollo";

  const knownSignals = [
    record.applicationType,
    record.displayCount,
    record.sourceCount,
    record.sourcePlacement,
    record.sourceConnectionPath,
    record.sourceConnectionType,
    record.signalFormats,
    record.signalHdr,
    record.displayConnectionPath,
    record.displayConnectionType,
    record.cableDistanceM,
    transportBand,
    record.sourceCableType,
    record.displayCableType,
    needsUsbStandardDetail(record) ? record.usbStandards : "not-needed",
    shouldAskInstallationPath(record) ? record.installationPath : "not-needed",
    needsNetworkDetail(record) ? record.networkEnvironment : "not-needed",
  ].filter((value) => hasText(value) || value === "not-needed").length;

  const confidence: GuidedProjectConfidence = knownSignals >= 12 ? "High" : knownSignals >= 8 ? "Medium" : "Low";
  const nextToolPath =
    primary === "Video Wall"
      ? WM_ROUTES.videowall
      : primary === "USB Extension"
        ? WM_ROUTES.catalogue
        : WM_ROUTES.templates;

  const summary =
    primary === "AVoIP"
      ? "Wingman currently sees a distributed transport problem where capability and reach are starting to push beyond simple extension."
      : primary === "Matrix"
        ? "Wingman currently sees a switching and routing problem, so central matrix logic is the leading fit."
        : primary === "Video Wall"
          ? "Wingman currently sees a processor-led display problem, so the endpoint strategy leads the design."
          : primary === "Apollo"
            ? "Wingman currently sees a collaboration-led room where BYOD and user workflow should steer the technology."
            : primary === "USB Extension"
              ? "Wingman currently sees a USB transport risk that should be solved explicitly."
              : "Wingman currently sees a structured extension problem where HDBaseT is still a credible lead fit once the capability envelope is confirmed.";

  return {
    primary,
    confidence,
    families: ordered,
    summary,
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
    `Primary fit: ${advice.primary} (${advice.confidence})`,
    `Transport reach band: ${getTransportBand(record) || "Not confirmed"}`,
    `Installed route: ${record.cableDistanceM || "Not confirmed"} m`,
    `Signal formats: ${formatSelections(record.signalFormats)}`,
    `HDR requirement: ${record.signalHdr || "Not confirmed"}`,
    `USB workflow: ${record.usbNeeds || "Not confirmed"}`,
    `USB bandwidth: ${formatSelections(record.usbStandards)}`,
    `Source placement: ${record.sourcePlacement || "Not confirmed"}`,
    `Source ingress: ${record.sourceConnectionPath || "Not confirmed"}`,
    `Source transport: ${record.sourceConnectionType || "Not confirmed"}`,
    `Source cable medium: ${record.sourceCableType || "Not confirmed"}`,
    `Display path: ${record.displayConnectionPath || "Not confirmed"}`,
    `Display transport: ${record.displayConnectionType || "Not confirmed"}`,
    `Display cable medium: ${record.displayCableType || "Not confirmed"}`,
    `Installed route detail: ${record.installationPath || "Not confirmed"}`,
    `Network environment: ${record.networkEnvironment || "Not confirmed"}`,
    `Source types: ${record.sourceTypes || "Not confirmed"}`,
  ].filter(Boolean).join("\n");
}

export function getNextToolLabel(path: string): string {
  if (path === WM_ROUTES.videowall) return "Video Wall Designer";
  if (path === WM_ROUTES.templates) return "Architecture Templates";
  return "Product Catalog";
}
