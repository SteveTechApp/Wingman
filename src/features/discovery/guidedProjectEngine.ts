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
export type GuidedProjectInput = "text" | "number" | "select" | "textarea";

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
  displayCount: string;
  sourceCount: string;
  sourceTypes: string;
  sourcePlacement: string;
  sourceConnectionPath: string;
  sourceConnectionType: string;
  sourceCableType: string;
  displayConnectionPath: string;
  displayConnectionType: string;
  displayCableType: string;
  networkEnvironment: string;
  usbNeeds: string;
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

const CABLE_TYPES = [
  "Short local patch",
  "Passive copper",
  "Active copper",
  "Cat6 or Cat6A",
  "Fiber",
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
  "Basic USB only",
  "USB-C BYOD",
  "Camera plus audio peripherals",
  "Mixed peripherals",
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

export function shouldAskInstallationPath(record: GuidedProjectRecord): boolean {
  return num(record.cableDistanceM) >= 10 || num(record.roomLengthM) >= 8 || num(record.displayCount) >= 2;
}

export function needsNetworkDetail(record: GuidedProjectRecord): boolean {
  return (
    includesAny(record.sourceConnectionPath, ["network"]) ||
    includesAny(record.sourceConnectionType, ["network", "avoip"]) ||
    includesAny(record.displayConnectionPath, ["decoder"]) ||
    includesAny(record.displayConnectionType, ["decoder", "avoip"]) ||
    num(record.cableDistanceM) >= 60 ||
    num(record.displayCount) >= 3
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
    num(record.cableDistanceM) >= 10
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
    id: "sourceCableType",
    step: 2,
    label: "Likely source cable medium",
    helper: "Capture the likely cable media between the source and the next device.",
    input: "select",
    options: CABLE_TYPES,
    shouldAsk: needsSourceCableDetail,
    branchReason: () => "Terminations, rack hops, or longer runs change what cable media is realistic.",
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
    label: "Likely display cable medium",
    helper: "Capture the likely medium on the last leg to the display.",
    input: "select",
    options: CABLE_TYPES,
    shouldAsk: needsDisplayCableDetail,
    branchReason: () => "The last leg often exposes media limits and extension risk.",
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
  { id: "usbNeeds", step: 3, label: "USB needs", helper: "Only ask what the user workflow really demands.", input: "select", options: USB },
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
    displayCount: "",
    sourceCount: "",
    sourceTypes: "",
    sourcePlacement: "",
    sourceConnectionPath: "",
    sourceConnectionType: "",
    sourceCableType: "",
    displayConnectionPath: "",
    displayConnectionType: "",
    displayCableType: "",
    networkEnvironment: "",
    usbNeeds: "",
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
  const sourceResolved = hasText(record.sourceTypes) && hasText(record.sourcePlacement);
  const firstHopResolved = hasText(record.sourceConnectionPath) && hasText(record.sourceConnectionType);
  const backboneResolved =
    hasText(record.cableDistanceM) &&
    (!shouldAskInstallationPath(record) || hasText(record.installationPath)) &&
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
      id: "backbone",
      title: "Backbone",
      state: backboneResolved ? "resolved" : (hasText(record.cableDistanceM) || hasText(record.installationPath) || hasText(record.networkEnvironment) ? "active" : "watch"),
      summary: backboneResolved
        ? "Wingman has enough route detail to reason about extension, switching, and network transport."
        : "Wingman still needs route, media, or network detail before it can trust the transport recommendation.",
      prompts: uniq([
        hasText(record.cableDistanceM) ? `Installed route: ${record.cableDistanceM} m.` : "Capture the longest installed route, not just room size.",
        shouldAskInstallationPath(record)
          ? (hasText(record.installationPath) ? `Route style: ${record.installationPath}.` : "Confirm whether the run crosses floor boxes, walls, racks, or corridors.")
          : "",
        needsNetworkDetail(record)
          ? (hasText(record.networkEnvironment) ? `Network: ${record.networkEnvironment}.` : "Confirm whether there is a managed LAN or dedicated AV VLAN available.")
          : "",
      ]).slice(0, 3),
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
  const sourceCableType = lower(record.sourceCableType);
  const displayPath = lower(record.displayConnectionPath);
  const displayConnectionType = lower(record.displayConnectionType);
  const displayCableType = lower(record.displayCableType);
  const networkEnvironment = lower(record.networkEnvironment);
  const usb = lower(record.usbNeeds);
  const audio = lower(record.audioNeeds);
  const control = lower(record.controlNeeds);
  const distance = num(record.cableDistanceM);
  const displays = num(record.displayCount);
  const sources = num(record.sourceCount);

  const families = new Set<GuidedProjectFamily>();
  const cues: string[] = [];
  const reasons: string[] = [];
  const nextActions: string[] = [];

  const collaborationRoom =
    includesAny(app, ["boardroom", "meeting", "huddle", "training", "flexible"]) ||
    includesAny(usb, ["usb-c", "byod"]);

  if (collaborationRoom) {
    families.add("Apollo");
    reasons.push("The room workflow looks collaboration-led, so user experience matters as much as transport.");
  }

  if (
    distance >= 15 ||
    includesAny(sourcePath, ["floor box", "wall plate", "central rack", "local rack"]) ||
    includesAny(displayPath, ["receiver"]) ||
    includesAny(sourceConnectionType, ["hdbaset"]) ||
    includesAny(displayConnectionType, ["hdbaset"]) ||
    includesAny(sourceCableType, ["cat6"]) ||
    includesAny(displayCableType, ["cat6"])
  ) {
    families.add("HDBaseT");
    reasons.push("Structured extension cues are present, so HDBaseT is a credible transport candidate.");
  }

  if (
    distance >= 60 ||
    includesAny(sourcePath, ["network"]) ||
    includesAny(displayPath, ["decoder"]) ||
    includesAny(sourceConnectionType, ["network", "avoip"]) ||
    includesAny(displayConnectionType, ["decoder", "avoip"]) ||
    includesAny(networkEnvironment, ["managed", "vlan", "shared"]) ||
    (sources >= 4 && displays >= 3)
  ) {
    families.add("AVoIP");
    reasons.push("Distributed endpoints or network-led transport cues suggest an AVoIP backbone may be cleaner.");
  }

  if (
    sources >= 3 ||
    displays >= 2 ||
    includesAny(control, ["matrix"]) ||
    includesAny(sourcePlacement, ["central rack", "mixed", "local rack"]) ||
    includesAny(sourcePath, ["central rack", "local rack", "mixed"])
  ) {
    families.add("Matrix");
    reasons.push("The I/O density and routing pattern suggest that switching flexibility matters.");
  }

  if (
    (includesAny(usb, ["camera", "peripheral"]) || includesAny(sourceTypes, ["camera"])) &&
    (distance >= 5 || includesAny(sourcePlacement, ["rack", "fixed"]))
  ) {
    families.add("USB Extension");
    reasons.push("USB peripherals and room cameras introduce a separate USB transport decision.");
  }

  if (
    includesAny(app, ["control room", "reception", "retail"]) ||
    displays >= 4 ||
    includesAny(displayPath, ["video wall processor"]) ||
    includesAny(displayConnectionType, ["processor"])
  ) {
    families.add("Video Wall");
    reasons.push("The display model looks processor-led or multi-endpoint, not just a simple room display.");
  }

  if (families.size === 0) {
    families.add("Apollo");
    reasons.push("With limited detail, a collaboration-led baseline is the safest starting point.");
  }

  cues.push(hasText(record.sourcePlacement) ? `Sources are expected to live ${record.sourcePlacement.toLowerCase()}.` : "Source placement is still unclear.");
  cues.push(hasText(record.sourceConnectionPath) ? `Sources likely join the system ${record.sourceConnectionPath.toLowerCase()}.` : "The first hop into the system is still unclear.");
  cues.push(hasText(record.sourceConnectionType) ? `The source-side transport is currently ${record.sourceConnectionType.toLowerCase()}.` : "The source-side transport is still unclear.");
  cues.push(hasText(record.displayConnectionType) ? `Displays are likely fed using ${record.displayConnectionType.toLowerCase()}.` : "The display-side transport is still unclear.");
  if (hasText(record.installationPath)) cues.push(`The installed route currently looks like ${record.installationPath.toLowerCase()}.`);
  if (hasText(record.networkEnvironment)) cues.push(`The network environment is currently ${record.networkEnvironment.toLowerCase()}.`);
  if (distance > 0) cues.push(`The longest likely installed route is about ${distance} m.`);

  if (!hasText(record.sourceTypes)) nextActions.push("Confirm the real source mix: laptops, cameras, PCs, players, or a mix.");
  if (!hasText(record.sourcePlacement)) nextActions.push("Confirm where sources physically live: table, local rack, central rack, or fixed around the room.");
  if (!hasText(record.sourceConnectionPath) || !hasText(record.displayConnectionPath)) nextActions.push("Map the first hop and the final hop before finalising the technology choice.");
  if (!hasText(record.sourceConnectionType) || !hasText(record.displayConnectionType)) nextActions.push("Lock down the transport type on both the source side and display side.");
  if ((needsSourceCableDetail(record) && !hasText(record.sourceCableType)) || (needsDisplayCableDetail(record) && !hasText(record.displayCableType))) nextActions.push("Confirm the likely cable media because route length and terminations make the medium a real design decision.");
  if (shouldAskInstallationPath(record) && !hasText(record.installationPath)) nextActions.push("Confirm whether the installed route crosses floor boxes, wall plates, racks, or building fabric.");
  if (needsNetworkDetail(record) && !hasText(record.networkEnvironment)) nextActions.push("Validate switch, VLAN, and control of the network before committing to any decoder-led or AVoIP path.");
  if (!hasText(record.usbNeeds) || !hasText(record.controlNeeds)) nextActions.push("Confirm USB and control expectations so the user experience is not under-scoped.");
  if (includesAny(audio, ["dsp", "dante"])) nextActions.push("Validate the audio network and DSP boundary early because it changes transport choices.");

  const order: GuidedProjectFamily[] = ["Apollo", "HDBaseT", "AVoIP", "Matrix", "USB Extension", "Video Wall"];
  const ordered = order.filter((family) => families.has(family));
  const primaryOrder: GuidedProjectFamily[] = ["Video Wall", "AVoIP", "Matrix", "Apollo", "HDBaseT", "USB Extension"];
  const primary = primaryOrder.find((family) => ordered.includes(family)) ?? "Apollo";

  const knownSignals = [
    record.applicationType,
    record.displayCount,
    record.sourceCount,
    record.sourcePlacement,
    record.sourceConnectionPath,
    record.sourceConnectionType,
    record.displayConnectionPath,
    record.displayConnectionType,
    record.cableDistanceM,
    record.installationPath,
    needsNetworkDetail(record) ? record.networkEnvironment : "not-needed",
  ].filter((value) => hasText(value) || value === "not-needed").length;

  const confidence: GuidedProjectConfidence = knownSignals >= 9 ? "High" : knownSignals >= 6 ? "Medium" : "Low";
  const nextToolPath =
    primary === "Video Wall"
      ? WM_ROUTES.videowall
      : primary === "USB Extension"
        ? WM_ROUTES.catalogue
        : WM_ROUTES.templates;

  const summary =
    primary === "AVoIP"
      ? "Wingman currently sees a distributed transport problem, so a managed network backbone is the leading fit."
      : primary === "Matrix"
        ? "Wingman currently sees a switching and routing problem, so central matrix logic is the leading fit."
        : primary === "Video Wall"
          ? "Wingman currently sees a processor-led display problem, so the endpoint strategy leads the design."
          : primary === "Apollo"
            ? "Wingman currently sees a collaboration-led room where BYOD and user workflow should steer the technology."
            : primary === "USB Extension"
              ? "Wingman currently sees a USB transport risk that should be solved explicitly."
              : "Wingman currently sees a structured extension problem where HDBaseT is the leading fit.";

  return {
    primary,
    confidence,
    families: ordered,
    summary,
    cues: uniq(cues).slice(0, 5),
    reasons: uniq(reasons).slice(0, 5),
    nextActions: uniq(nextActions).slice(0, 5),
    nextToolPath,
  };
}

export function buildGuidedProjectNotes(record: GuidedProjectRecord, advice: GuidedProjectAdvice): string {
  return [
    record.notes.trim(),
    "Guided Project summary:",
    `Primary fit: ${advice.primary} (${advice.confidence})`,
    `Source placement: ${record.sourcePlacement || "Not confirmed"}`,
    `Source ingress: ${record.sourceConnectionPath || "Not confirmed"}`,
    `Source transport: ${record.sourceConnectionType || "Not confirmed"}`,
    `Source cable medium: ${record.sourceCableType || "Not confirmed"}`,
    `Display path: ${record.displayConnectionPath || "Not confirmed"}`,
    `Display transport: ${record.displayConnectionType || "Not confirmed"}`,
    `Display cable medium: ${record.displayCableType || "Not confirmed"}`,
    `Installed route: ${record.installationPath || "Not confirmed"}`,
    `Network environment: ${record.networkEnvironment || "Not confirmed"}`,
    `Source types: ${record.sourceTypes || "Not confirmed"}`,
  ].filter(Boolean).join("\n");
}

export function getNextToolLabel(path: string): string {
  if (path === WM_ROUTES.videowall) return "Video Wall Designer";
  if (path === WM_ROUTES.templates) return "Architecture Templates";
  return "Product Catalog";
}
