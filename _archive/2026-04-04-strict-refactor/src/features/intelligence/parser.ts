import type {
  AudioRequirement,
  ClarificationQuestion,
  CommercialRequirement,
  Complexity,
  ConferencingRequirement,
  ControlRequirement,
  CustomerRequestRecord,
  DeploymentScale,
  DisplayRequirement,
  DisplayType,
  EnquiryEvidence,
  InfrastructureRequirement,
  ParsedRequirement,
  RiskFlag,
  SignalFlag,
  SourceRequirement,
  UCPlatform,
  Vertical,
} from "./types";

type KeywordRule<T> = {
  value: T;
  label: string;
  terms: readonly string[];
};

type ParseHints = {
  verticalHint?: Vertical;
  complexityHint?: Complexity;
};

const VERTICAL_RULES: KeywordRule<Vertical>[] = [
  { value: "Consultant / Tender", label: "consultant/tender", terms: ["tender", "consultant", "specification", "performance specification"] },
  { value: "Education", label: "education", terms: ["classroom", "lecture theatre", "lecture theater", "seminar room", "university", "teaching room", "lecturer", "students"] },
  { value: "Hospitality", label: "hospitality", terms: ["hotel", "ballroom", "banquet", "guest", "restaurant", "bar", "cafe"] },
  { value: "Retail", label: "retail", terms: ["retail", "store", "showroom", "window display", "flagship", "head office content"] },
  { value: "Government", label: "government", terms: ["council", "committee", "chamber", "police", "emergency operations", "civic"] },
  { value: "Control Room", label: "control room", terms: ["control room", "operations room", "monitoring room", "operator positions", "overview wall"] },
  { value: "Healthcare", label: "healthcare", terms: ["hospital", "healthcare", "clinical", "simulation suite", "pathology"] },
  { value: "Broadcast", label: "broadcast", terms: ["studio", "podcast", "webcast", "program output", "preview monitors"] },
  { value: "Corporate", label: "corporate", terms: ["boardroom", "meeting room", "huddle", "executive", "office", "teams room"] },
] as const;

const ROOM_RULES: KeywordRule<string>[] = [
  { value: "Boardroom", label: "boardroom", terms: ["boardroom", "executive boardroom"] },
  { value: "Huddle Room", label: "huddle room", terms: ["huddle room", "small meeting room"] },
  { value: "Meeting Room", label: "meeting room", terms: ["meeting room", "teams room", "zoom room", "committee room"] },
  { value: "Training Room", label: "training room", terms: ["training suite", "training room"] },
  { value: "Classroom", label: "classroom", terms: ["classroom", "teaching room"] },
  { value: "Lecture Theatre", label: "lecture theatre", terms: ["lecture theatre", "lecture theater"] },
  { value: "Reception / Lobby", label: "reception", terms: ["reception", "lobby"] },
  { value: "Retail Signage", label: "retail signage", terms: ["promotional displays", "menu boards", "window-facing video wall"] },
  { value: "Council Chamber", label: "council chamber", terms: ["council chamber", "committee chamber"] },
  { value: "Control Room", label: "control room", terms: ["control room", "operations room", "monitoring room"] },
  { value: "Simulation Suite", label: "simulation suite", terms: ["simulation suite", "observation room", "procedure cameras"] },
  { value: "Collaboration Space", label: "collaboration", terms: ["collaboration room", "collaboration space", "open collaboration room"] },
  { value: "Ballroom", label: "ballroom", terms: ["ballroom", "banquet suite"] },
  { value: "Mixed-Use Civic Building", label: "mixed-use civic building", terms: ["mixed-use civic building", "civic building"] },
  { value: "Teaching Spaces", label: "teaching spaces", terms: ["teaching rooms", "seminar rooms", "standard teaching rooms"] },
] as const;

const DISPLAY_RULES: KeywordRule<DisplayType>[] = [
  { value: "Video Wall", label: "video wall", terms: ["video wall", "overview wall", "display wall"] },
  { value: "LED Wall", label: "led wall", terms: ["led wall", "feature wall"] },
  { value: "Digital Signage", label: "digital signage", terms: ["digital signage", "signage displays", "menu boards", "promotional displays"] },
  { value: "Dual Projection", label: "dual projection", terms: ["dual projection"] },
  { value: "Projector", label: "projector", terms: ["projector", "projection"] },
  { value: "Dual Display", label: "dual display", terms: ["dual display", "dual displays", "two screens", "two displays", "dual screens"] },
  { value: "Single Display", label: "single display", terms: ["single display", "one screen", "one display"] },
] as const;

const CONNECTIVITY_RULES: KeywordRule<string>[] = [
  { value: "HDMI", label: "hdmi", terms: ["hdmi"] },
  { value: "USB-C", label: "usb-c", terms: ["usb-c", "usbc"] },
  { value: "DisplayPort", label: "displayport", terms: ["displayport"] },
  { value: "Wireless Presentation", label: "wireless", terms: ["wireless presentation", "wireless sharing", "share wirelessly"] },
  { value: "USB", label: "usb", terms: ["usb peripherals", "usb devices", "usb routing"] },
  { value: "IP Video", label: "ip video", terms: ["ip video", "ip sources"] },
] as const;

const SOURCE_RULES: KeywordRule<string>[] = [
  { value: "Laptop", label: "laptop", terms: ["laptop", "laptops"] },
  { value: "Room PC", label: "room pc", terms: ["room pc", "in-room pc", "dedicated room pc"] },
  { value: "Document Camera", label: "document camera", terms: ["document camera"] },
  { value: "Camera", label: "camera", terms: ["camera", "cameras", "ptz"] },
  { value: "Media Player", label: "media player", terms: ["media player", "signage player"] },
  { value: "CCTV / Security Feed", label: "cctv", terms: ["cctv", "security feed"] },
  { value: "TV / Broadcast Feed", label: "tv feed", terms: ["live tv", "tv channels", "event feeds"] },
  { value: "PC Sources", label: "pc", terms: ["pc", "pcs"] },
] as const;

const PERIPHERAL_RULES: KeywordRule<string>[] = [
  { value: "Camera", label: "camera", terms: ["camera", "cameras", "ptz"] },
  { value: "Table Microphones", label: "table mics", terms: ["table microphones", "table mics"] },
  { value: "Ceiling Microphones", label: "ceiling mics", terms: ["ceiling microphones", "ceiling mics"] },
  { value: "Soundbar", label: "soundbar", terms: ["soundbar"] },
  { value: "Speakers", label: "speakers", terms: ["speakers", "speech reinforcement"] },
] as const;

const UC_RULES: KeywordRule<UCPlatform>[] = [
  { value: "Microsoft Teams", label: "teams", terms: ["microsoft teams", "teams room", "teams rooms", "teams"] },
  { value: "Zoom", label: "zoom", terms: ["zoom room", "zoom"] },
  { value: "Google Meet", label: "google meet", terms: ["google meet"] },
  { value: "Webex", label: "webex", terms: ["webex"] },
  { value: "BYOM", label: "byom", terms: ["byom", "bring your own meeting", "bring-your-own-meeting"] },
] as const;

const BUDGET_RULES: KeywordRule<string>[] = [
  { value: "Budget sensitivity indicated", label: "budget sensitivity", terms: ["budget", "cost effective", "cost-sensitive", "value-engineer"] },
  { value: "Flexible budget", label: "flexible budget", terms: ["budget is flexible", "premium finish", "high-end finish"] },
] as const;

const URGENCY_RULES: KeywordRule<string>[] = [
  { value: "Urgent delivery or fast turnaround expected", label: "urgent", terms: ["urgent", "asap", "quick turnaround", "delivery this month"] },
  { value: "Phased rollout or programme delivery expected", label: "phased", terms: ["phased rollout", "phased delivery"] },
] as const;

const USABILITY_RULES: KeywordRule<string>[] = [
  { value: "Ease of use is commercially important", label: "easy to use", terms: ["easy to use", "simple to use", "dead easy", "non-technical staff", "visitors use the room"] },
  { value: "Standardised user experience is expected", label: "standardised", terms: ["standardised user experience", "standardized user experience", "standard av package", "common user experience"] },
] as const;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function findMatchedTerms(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

function collectMatches<T>(text: string, rules: readonly KeywordRule<T>[]): Array<{ rule: KeywordRule<T>; matched: string[] }> {
  return rules
    .map((rule) => ({ rule, matched: findMatchedTerms(text, rule.terms) }))
    .filter((entry) => entry.matched.length > 0);
}

function collectEvidence(matches: Array<{ rule: KeywordRule<unknown>; matched: string[] }>): EnquiryEvidence[] {
  return matches.map((entry) => ({
    label: entry.rule.label,
    matchedText: entry.matched[0],
    source: "keyword",
  }));
}

function extractAllNumbers(text: string, pattern: RegExp): number[] {
  return Array.from(text.matchAll(pattern))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
}

function extractCapacity(text: string): number | undefined {
  return (
    extractAllNumbers(text, /(\d+)\s*(?:people|persons|students|delegates|operators|seats?)/g)[0] ??
    extractAllNumbers(text, /for\s+(\d+)\s*(?:people|students|users)?/g)[0]
  );
}

function extractRoomCount(text: string): number | undefined {
  return extractAllNumbers(text, /(\d+)\s*(?:meeting rooms|teaching rooms|seminar rooms|committee rooms|classrooms|stores|sites|operator positions)/g)[0];
}

function extractDisplaySizes(text: string): number[] {
  return unique(extractAllNumbers(text, /(\d{2,3})\s*(?:inch|inches|")/g));
}

function extractDistanceNumbers(text: string): number[] {
  return unique(extractAllNumbers(text, /(\d+)\s*(?:m|metres|meters)\b/g));
}

function extractDisplayCount(text: string, displayType: DisplayType): number | undefined {
  if (text.includes("3x3")) return 9;
  if (text.includes("2x3")) return 6;
  if (text.includes("dual") || text.includes("two displays") || text.includes("two screens")) return 2;
  const explicit = extractAllNumbers(text, /(\d+)\s*(?:displays|screens|projectors)/g)[0];
  if (explicit) return explicit;
  if (displayType === "Single Display" || displayType === "Projector") return 1;
  return undefined;
}

function extractSourceCount(text: string): number | undefined {
  return (
    extractAllNumbers(text, /(\d+)\s*(?:sources|inputs)/g)[0] ??
    (text.includes("same image on both") || text.includes("split content") ? 2 : undefined)
  );
}

function detectVertical(text: string, hint?: Vertical): { value: Vertical; evidence: EnquiryEvidence[] } {
  const matches = collectMatches(text, VERTICAL_RULES);
  if (matches.length > 0) {
    return { value: matches[0].rule.value, evidence: collectEvidence(matches) };
  }
  return {
    value: hint ?? "Unknown",
    evidence: hint ? [{ label: "seed vertical hint", matchedText: hint, source: "fallback" }] : [],
  };
}

function detectRoomType(text: string): { value: string; evidence: EnquiryEvidence[] } {
  const matches = collectMatches(text, ROOM_RULES);
  if (matches.length > 0) {
    return { value: matches[0].rule.value, evidence: collectEvidence(matches) };
  }
  return {
    value: "General AV Space",
    evidence: [{ label: "room fallback", matchedText: "general av space", source: "fallback" }],
  };
}

function detectDisplay(text: string): { requirement: DisplayRequirement; evidence: EnquiryEvidence[] } {
  const matches = collectMatches(text, DISPLAY_RULES);
  const displayType = matches[0]?.rule.value ?? "Unknown";
  return {
    requirement: {
      displayType,
      displayCount: extractDisplayCount(text, displayType),
      displaySizesInches: extractDisplaySizes(text),
      requiresIndependentContent: text.includes("different content") || text.includes("split content"),
      notes: unique([
        text.includes("same image on both") || text.includes("mirror") ? "Mirrored display mode is requested." : "",
        text.includes("different content") || text.includes("split content") ? "Independent content on multiple displays is requested." : "",
        text.includes("confidence display") || text.includes("confidence monitor") ? "Confidence monitoring is mentioned." : "",
      ].filter(Boolean)),
    },
    evidence: collectEvidence(matches),
  };
}

function detectSourceInput(text: string): { requirement: SourceRequirement; evidence: EnquiryEvidence[] } {
  const sourceMatches = collectMatches(text, SOURCE_RULES);
  const connectivityMatches = collectMatches(text, CONNECTIVITY_RULES);
  return {
    requirement: {
      sourceCount: extractSourceCount(text),
      sourceTypes: unique(sourceMatches.map((entry) => entry.rule.value)),
      connectivity: unique(connectivityMatches.map((entry) => entry.rule.value)),
      wirelessPresentation: text.includes("wireless presentation") || text.includes("wireless sharing") || text.includes("share wirelessly"),
      notes: unique([
        text.includes("at the table") || text.includes("table input") ? "User input point appears to be at the table." : "",
        text.includes("lectern") ? "Lectern input is mentioned." : "",
        text.includes("local override") ? "Local override requirement is present." : "",
      ].filter(Boolean)),
    },
    evidence: [...collectEvidence(sourceMatches), ...collectEvidence(connectivityMatches)],
  };
}

function detectConferencing(text: string): { requirement: ConferencingRequirement; evidence: EnquiryEvidence[] } {
  const matches = collectMatches(text, UC_RULES);
  const peripheralMatches = collectMatches(text, PERIPHERAL_RULES);
  const platform = matches[0]?.rule.value ?? (text.includes("hybrid") || text.includes("remote participant") || text.includes("remote consultation") ? "Unknown" : "None");
  return {
    requirement: {
      required: platform !== "None" || text.includes("video conference") || text.includes("hybrid") || text.includes("remote consultation"),
      platform,
      byom: platform === "BYOM" || text.includes("bring their own laptop"),
      roomPcLikely: platform !== "None" && platform !== "BYOM" && !text.includes("do not want a dedicated in-room pc"),
      peripherals: unique(peripheralMatches.map((entry) => entry.rule.value)),
      lectureCapture: text.includes("lecture capture") || text.includes("recording for review"),
      streaming: text.includes("stream") || text.includes("remote learners") || text.includes("webcast"),
      recording: text.includes("recording") || text.includes("record"),
      notes: unique([
        text.includes("remote participants") || text.includes("remote attendees") ? "Remote participation is part of the workflow." : "",
        text.includes("no dedicated in-room pc") ? "BYOM workflow is preferred over room-PC ownership." : "",
      ].filter(Boolean)),
    },
    evidence: [...collectEvidence(matches), ...collectEvidence(peripheralMatches)],
  };
}

function detectAudio(text: string, roomType: string, vertical: Vertical): AudioRequirement {
  const reinforcementLikely =
    text.includes("speech reinforcement") ||
    text.includes("delegate microphones") ||
    text.includes("soundbar") ||
    text.includes("speakers") ||
    roomType === "Ballroom";
  const microphonesLikely = text.includes("microphone") || text.includes("mics");
  return {
    reinforcementLikely,
    microphonesLikely,
    dspLikely: text.includes("dsp") || text.includes("delegate microphones") || roomType === "Council Chamber" || vertical === "Hospitality",
    speechPrivacyLikely: text.includes("speech privacy"),
    notes: unique([
      reinforcementLikely ? "Audio reproduction or reinforcement is likely to matter." : "",
      microphonesLikely ? "Capture microphones are likely part of scope." : "",
    ].filter(Boolean)),
  };
}

function detectControl(text: string): ControlRequirement {
  const simpleOperationImportant =
    text.includes("easy to use") ||
    text.includes("simple") ||
    text.includes("non-technical") ||
    text.includes("visitors use the room");
  return {
    controlRequired: text.includes("control") || text.includes("staff control") || text.includes("manual override") || simpleOperationImportant,
    touchPanelRequired: text.includes("touch control") || text.includes("touch panel"),
    simpleOperationImportant,
    notes: unique([
      simpleOperationImportant ? "Low-friction operation is a commercial requirement." : "",
      text.includes("manual override") ? "Manual override requirement is mentioned." : "",
    ].filter(Boolean)),
  };
}

function deriveDeploymentScale(text: string, complexity: Complexity, roomCount?: number): DeploymentScale {
  if (complexity === "Tender" || text.includes("phased rollout")) return "Programme / Tender";
  if (text.includes("campus") || text.includes("estate") || text.includes("multiple buildings")) return "Campus / Estate";
  if (text.includes("stores") || text.includes("sites") || (roomCount ?? 0) >= 20) return "Portfolio rollout";
  if ((roomCount ?? 0) >= 2) return text.includes("office floor") ? "Multi-room" : "Multi-site";
  return "Single space";
}

function detectInfrastructure(text: string, complexity: Complexity): InfrastructureRequirement {
  const distances = extractDistanceNumbers(text);
  const roomCount = extractRoomCount(text);
  return {
    distancesM: distances,
    longestDistanceM: distances.length > 0 ? Math.max(...distances) : undefined,
    rackMentioned: text.includes("rack") || text.includes("comms room") || text.includes("side room"),
    networkMentioned: text.includes("network") || text.includes("vlan") || text.includes("ip video"),
    deploymentScale: deriveDeploymentScale(text, complexity, roomCount),
    roomCount,
    notes: unique([
      text.includes("future expansion") ? "Future expansion is explicitly requested." : "",
      text.includes("central support") || text.includes("central monitoring") ? "Central support or monitoring is expected." : "",
      text.includes("phased rollout") ? "Phased rollout is referenced." : "",
    ].filter(Boolean)),
  };
}

function detectCommercial(text: string): CommercialRequirement {
  const budget = collectMatches(text, BUDGET_RULES)[0]?.rule.value;
  const urgency = collectMatches(text, URGENCY_RULES)[0]?.rule.value;
  const usability = collectMatches(text, USABILITY_RULES)[0]?.rule.value;
  return {
    budgetNotes: budget,
    urgencyNotes: urgency,
    usabilityNotes: usability,
    notes: unique([budget ?? "", urgency ?? "", usability ?? ""].filter(Boolean)),
  };
}

function detectComplexity(
  text: string,
  sourceInput: SourceRequirement,
  conferencing: ConferencingRequirement,
  infrastructure: InfrastructureRequirement,
  hint?: Complexity,
): Complexity {
  if (hint) return hint;
  if (text.includes("tender") || text.includes("consultant") || text.includes("proposal for")) return "Tender";
  const complexSignals = [
    infrastructure.deploymentScale !== "Single space",
    (infrastructure.longestDistanceM ?? 0) >= 20,
    conferencing.recording,
    conferencing.streaming,
    sourceInput.wirelessPresentation,
    (sourceInput.sourceCount ?? 0) >= 3,
    text.includes("video wall"),
    text.includes("divisible"),
  ].filter(Boolean).length;
  if (complexSignals >= 4) return "Complex";
  if (complexSignals >= 2) return "Medium";
  return "Simple";
}

function detectFlags(parsed: {
  rawRequest: string;
  display: DisplayRequirement;
  sourceInput: SourceRequirement;
  conferencing: ConferencingRequirement;
  control: ControlRequirement;
  infrastructure: InfrastructureRequirement;
  commercial: CommercialRequirement;
  vertical: Vertical;
  complexity: Complexity;
}): SignalFlag[] {
  const flags: SignalFlag[] = [];
  if ((parsed.infrastructure.longestDistanceM ?? 0) >= 10 || parsed.infrastructure.rackMentioned) flags.push("distance-sensitive");
  if (parsed.infrastructure.deploymentScale !== "Single space") flags.push("multi-room");
  if ((parsed.display.displayCount ?? 0) > 1 || parsed.display.displayType === "Dual Display") flags.push("dual-screen");
  if (parsed.conferencing.required) flags.push("video-conferencing");
  if (parsed.conferencing.lectureCapture || parsed.conferencing.streaming) flags.push("hybrid-learning");
  if (parsed.display.displayType === "Digital Signage") flags.push("digital-signage");
  if (parsed.display.displayType === "Video Wall" || parsed.display.displayType === "LED Wall") flags.push("video-wall");
  if (parsed.vertical === "Consultant / Tender" || parsed.complexity === "Tender") flags.push("consultant-spec");
  if (parsed.commercial.usabilityNotes?.toLowerCase().includes("ease of use")) flags.push("guest-friendly");
  if (parsed.rawRequest.includes("24/7")) flags.push("high-reliability");
  if (parsed.infrastructure.networkMentioned) flags.push("network-infrastructure-available");
  if (parsed.commercial.budgetNotes) flags.push("budget-sensitive");
  if (parsed.control.simpleOperationImportant) flags.push("easy-to-use-required");
  if (parsed.control.controlRequired) flags.push("control-sensitive");
  if (parsed.commercial.usabilityNotes?.toLowerCase().includes("standardised")) flags.push("standardisation-required");
  return unique(flags);
}

function buildMissingInformation(parsed: {
  vertical: Vertical;
  display: DisplayRequirement;
  sourceInput: SourceRequirement;
  conferencing: ConferencingRequirement;
  control: ControlRequirement;
  infrastructure: InfrastructureRequirement;
  commercial: CommercialRequirement;
}): string[] {
  return unique([
    parsed.display.displayType === "Unknown" ? "Display type and quantity still need to be confirmed." : "",
    parsed.display.displaySizesInches.length === 0 && parsed.display.displayType !== "Digital Signage"
      ? "Screen size or projection size is not yet defined."
      : "",
    parsed.sourceInput.sourceTypes.length === 0 ? "Source devices and user connection methods are not fully defined." : "",
    parsed.conferencing.required && parsed.conferencing.platform === "Unknown"
      ? "Conferencing platform is still unclear."
      : "",
    parsed.conferencing.required && parsed.conferencing.peripherals.length === 0
      ? "Camera, microphone, and speaker expectations need clarifying."
      : "",
    !parsed.infrastructure.longestDistanceM && (parsed.infrastructure.rackMentioned || parsed.sourceInput.connectivity.includes("USB-C"))
      ? "Cable path and distance are still missing."
      : "",
    parsed.infrastructure.deploymentScale !== "Single space" && !parsed.commercial.usabilityNotes
      ? "Standardisation and support expectations across the rollout are not yet explicit."
      : "",
    parsed.vertical === "Retail" && !parsed.commercial.notes.some((item) => item.toLowerCase().includes("content"))
      ? "Content ownership and scheduling are not yet defined."
      : "",
    parsed.control.controlRequired && !parsed.control.touchPanelRequired && !parsed.control.simpleOperationImportant
      ? "Required control interface is not fully described."
      : "",
  ].filter(Boolean));
}

function buildClarificationQuestions(parsed: {
  display: DisplayRequirement;
  sourceInput: SourceRequirement;
  conferencing: ConferencingRequirement;
  infrastructure: InfrastructureRequirement;
  commercial: CommercialRequirement;
}): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  if (parsed.display.displayType === "Unknown") {
    questions.push({
      id: "display-type",
      question: "What display approach is expected: single display, dual display, projector, signage, or video wall?",
      reason: "Display topology drives switching, extension, and control strategy.",
      priority: "high",
    });
  }
  if (parsed.display.displaySizesInches.length === 0 && parsed.display.displayType !== "Digital Signage") {
    questions.push({
      id: "display-size",
      question: "Do we know the intended screen size or projection image size yet?",
      reason: "Screen size affects viewing, budget, and physical mounting assumptions.",
      priority: "medium",
    });
  }
  if (parsed.sourceInput.sourceTypes.length === 0) {
    questions.push({
      id: "source-types",
      question: "What source devices need to be connected day to day: laptops, room PC, document camera, signage player, TV feed, or something else?",
      reason: "Input types determine switching, connectivity, and user workflow.",
      priority: "high",
    });
  }
  if (parsed.conferencing.required && parsed.conferencing.platform === "Unknown") {
    questions.push({
      id: "uc-platform",
      question: "Which conferencing workflow is expected: Microsoft Teams, Zoom, BYOM, or another platform?",
      reason: "UC platform choice changes USB, camera, and room control design.",
      priority: "high",
    });
  }
  if (!parsed.infrastructure.longestDistanceM) {
    questions.push({
      id: "distance",
      question: "What are the likely cable routes and distances between table, display wall, and any rack or comms-room position?",
      reason: "Distance and route often determine whether extension, matrix, or network transport is the right commercial path.",
      priority: "high",
    });
  }
  if (parsed.infrastructure.deploymentScale !== "Single space") {
    questions.push({
      id: "standardisation",
      question: "Should the rooms or sites share a standard user experience and common support model?",
      reason: "Standardisation changes architecture, rollout planning, and commercial positioning.",
      priority: "medium",
    });
  }
  if (parsed.commercial.budgetNotes == null) {
    questions.push({
      id: "budget",
      question: "Is this opportunity cost-sensitive, performance-led, or still open at this stage?",
      reason: "Budget posture helps frame the first response and shortlist.",
      priority: "medium",
    });
  }

  return questions;
}

function buildRiskFlags(parsed: {
  display: DisplayRequirement;
  sourceInput: SourceRequirement;
  conferencing: ConferencingRequirement;
  infrastructure: InfrastructureRequirement;
  control: ControlRequirement;
  complexity: Complexity;
}): RiskFlag[] {
  const risks: RiskFlag[] = [];

  if (parsed.display.displayType === "Unknown") {
    risks.push({
      id: "unknown-display",
      title: "Display scope still vague",
      detail: "The enquiry does not yet make clear whether this is a simple screen, projector, signage, or wall-processing scenario.",
      severity: "medium",
    });
  }
  if (!parsed.infrastructure.longestDistanceM && parsed.infrastructure.rackMentioned) {
    risks.push({
      id: "distance-unknown",
      title: "Rack route not quantified",
      detail: "A rack or remote equipment location is mentioned, but no route distance is given yet.",
      severity: "high",
    });
  }
  if (parsed.conferencing.required && parsed.conferencing.platform === "Unknown") {
    risks.push({
      id: "uc-platform-open",
      title: "UC workflow still open",
      detail: "The room appears to need conferencing, but the platform and operating model are not defined yet.",
      severity: "high",
    });
  }
  if (parsed.conferencing.byom && parsed.conferencing.peripherals.length > 0) {
    risks.push({
      id: "byom-usb-risk",
      title: "BYOM USB path needs validating",
      detail: "Bring-your-own-meeting with room peripherals can create hidden USB extension and switching complexity.",
      severity: "medium",
    });
  }
  if (parsed.infrastructure.deploymentScale !== "Single space") {
    risks.push({
      id: "scale-governance",
      title: "Rollout governance matters",
      detail: "Multi-room or multi-site opportunities need standardisation, monitoring, and support expectations agreed early.",
      severity: "medium",
    });
  }
  if (parsed.control.simpleOperationImportant && parsed.control.controlRequired) {
    risks.push({
      id: "ux-sensitive",
      title: "User experience is commercially sensitive",
      detail: "The customer expects simple operation, so technical flexibility should not leak into the day-to-day user workflow.",
      severity: "medium",
    });
  }
  if (parsed.complexity === "Tender") {
    risks.push({
      id: "tender-assumptions",
      title: "Tender assumptions need documenting",
      detail: "Consultant and tender enquiries often omit key room details, so Wingman should carry explicit assumptions into the commercial response.",
      severity: "high",
    });
  }

  return risks;
}

function estimateConfidence(parsed: {
  roomType: string;
  display: DisplayRequirement;
  sourceInput: SourceRequirement;
  conferencing: ConferencingRequirement;
  infrastructure: InfrastructureRequirement;
  commercial: CommercialRequirement;
  clarificationQuestionsDetailed: ClarificationQuestion[];
  riskFlagsDetailed: RiskFlag[];
}): number {
  let score = 0.42;
  if (parsed.roomType !== "General AV Space") score += 0.1;
  if (parsed.display.displayType !== "Unknown") score += 0.1;
  if ((parsed.display.displayCount ?? 0) > 0) score += 0.06;
  if (parsed.sourceInput.sourceTypes.length > 0 || parsed.sourceInput.connectivity.length > 0) score += 0.1;
  if (parsed.conferencing.required) score += 0.06;
  if (parsed.conferencing.platform !== "Unknown") score += 0.06;
  if (parsed.infrastructure.longestDistanceM != null) score += 0.08;
  if (parsed.commercial.budgetNotes != null || parsed.commercial.usabilityNotes != null) score += 0.04;
  score -= Math.min(parsed.clarificationQuestionsDetailed.length * 0.03, 0.18);
  score -= Math.min(parsed.riskFlagsDetailed.filter((item) => item.severity === "high").length * 0.03, 0.12);
  return Math.max(0.22, Math.min(0.96, Number(score.toFixed(2))));
}

export function parseCustomerRequest(customerRequest: string, hints: ParseHints = {}): ParsedRequirement {
  const normalized = normalizeText(customerRequest);
  const verticalResult = detectVertical(normalized, hints.verticalHint);
  const roomResult = detectRoomType(normalized);
  const displayResult = detectDisplay(normalized);
  const sourceInputResult = detectSourceInput(normalized);
  const conferencingResult = detectConferencing(normalized);
  const provisionalInfrastructure = detectInfrastructure(normalized, hints.complexityHint ?? "Simple");
  const complexity = detectComplexity(
    normalized,
    sourceInputResult.requirement,
    conferencingResult.requirement,
    provisionalInfrastructure,
    hints.complexityHint,
  );
  const infrastructure = detectInfrastructure(normalized, complexity);
  const commercial = detectCommercial(normalized);
  const audio = detectAudio(normalized, roomResult.value, verticalResult.value);
  const control = detectControl(normalized);

  const evidence = unique([
    ...verticalResult.evidence.map((item) => JSON.stringify(item)),
    ...roomResult.evidence.map((item) => JSON.stringify(item)),
    ...displayResult.evidence.map((item) => JSON.stringify(item)),
    ...sourceInputResult.evidence.map((item) => JSON.stringify(item)),
    ...conferencingResult.evidence.map((item) => JSON.stringify(item)),
  ]).map((item) => JSON.parse(item) as EnquiryEvidence);

  const missingInformation = buildMissingInformation({
    vertical: verticalResult.value,
    display: displayResult.requirement,
    sourceInput: sourceInputResult.requirement,
    conferencing: conferencingResult.requirement,
    control,
    infrastructure,
    commercial,
  });

  const clarificationQuestionsDetailed = buildClarificationQuestions({
    display: displayResult.requirement,
    sourceInput: sourceInputResult.requirement,
    conferencing: conferencingResult.requirement,
    infrastructure,
    commercial,
  });

  const riskFlagsDetailed = buildRiskFlags({
    display: displayResult.requirement,
    sourceInput: sourceInputResult.requirement,
    conferencing: conferencingResult.requirement,
    infrastructure,
    control,
    complexity,
  });

  const confidence = estimateConfidence({
    roomType: roomResult.value,
    display: displayResult.requirement,
    sourceInput: sourceInputResult.requirement,
    conferencing: conferencingResult.requirement,
    infrastructure,
    commercial,
    clarificationQuestionsDetailed,
    riskFlagsDetailed,
  });

  const flags = detectFlags({
    rawRequest: normalized,
    display: displayResult.requirement,
    sourceInput: sourceInputResult.requirement,
    conferencing: conferencingResult.requirement,
    control,
    infrastructure,
    commercial,
    vertical: verticalResult.value,
    complexity,
  });

  const capacity = extractCapacity(normalized);
  const cameras = conferencingResult.requirement.peripherals.filter((item) => item.toLowerCase().includes("camera"));
  const microphones = conferencingResult.requirement.peripherals.filter((item) => item.toLowerCase().includes("micro"));

  return {
    rawRequest: customerRequest,
    normalizedRequest: normalized,
    roomType: roomResult.value,
    roomCount: infrastructure.roomCount,
    capacity,
    vertical: verticalResult.value,
    complexity,
    displayType: displayResult.requirement.displayType,
    displayCount: displayResult.requirement.displayCount,
    displaySizesInches: displayResult.requirement.displaySizesInches,
    sources: sourceInputResult.requirement.sourceTypes,
    connectivity: sourceInputResult.requirement.connectivity,
    wirelessPresentation: sourceInputResult.requirement.wirelessPresentation,
    ucPlatform: conferencingResult.requirement.platform,
    videoConferencing: conferencingResult.requirement.required,
    cameras,
    microphones,
    speakers: audio.reinforcementLikely,
    lectureCapture: conferencingResult.requirement.lectureCapture,
    streaming: conferencingResult.requirement.streaming,
    recording: conferencingResult.requirement.recording,
    controlRequired: control.controlRequired,
    touchPanelRequired: control.touchPanelRequired,
    rackDistanceM: infrastructure.longestDistanceM,
    infrastructureNotes: infrastructure.notes,
    deploymentScale: infrastructure.deploymentScale,
    budgetNotes: commercial.budgetNotes,
    urgencyNotes: commercial.urgencyNotes,
    usabilityNotes: commercial.usabilityNotes,
    openQuestions: clarificationQuestionsDetailed.map((item) => item.question),
    flags,
    confidence,
    evidence,
    roomApplication: {
      roomType: roomResult.value,
      vertical: verticalResult.value,
      complexity,
      capacity,
    },
    display: displayResult.requirement,
    sourceInput: sourceInputResult.requirement,
    conferencing: conferencingResult.requirement,
    audio,
    control,
    infrastructure,
    commercial,
    missingInformation,
    clarificationQuestionsDetailed,
    riskFlagsDetailed,
  };
}

export function parseSeedRecord(record: CustomerRequestRecord): ParsedRequirement {
  return parseCustomerRequest(record.customerRequest, {
    verticalHint: record.vertical,
    complexityHint: record.complexity,
  });
}
