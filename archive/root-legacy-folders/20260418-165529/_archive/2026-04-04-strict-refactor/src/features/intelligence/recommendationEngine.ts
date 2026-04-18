import type {
  ParsedRequirement,
  RecommendationCandidate,
  RecommendationResult,
  SolutionCategory,
} from "./types";

type RuleContext = {
  parsed: ParsedRequirement;
};

type RecommendationRule = {
  category: SolutionCategory;
  when: (context: RuleContext) => boolean;
  score: (context: RuleContext) => number;
  need: (context: RuleContext) => string;
  reasons: (context: RuleContext) => string[];
};

const RULES: RecommendationRule[] = [
  {
    category: "HDBaseT Extension",
    when: ({ parsed }) => (parsed.infrastructure.longestDistanceM ?? 0) >= 10 || parsed.infrastructure.rackMentioned,
    score: ({ parsed }) =>
      ((parsed.infrastructure.longestDistanceM ?? 0) >= 20 ? 5 : 3) +
      ((parsed.display.displayCount ?? 1) <= 2 ? 1 : 0),
    need: () => "Reliable source-to-display extension over a non-trivial route",
    reasons: ({ parsed }) => [
      parsed.infrastructure.longestDistanceM ? `Route distance appears to be about ${parsed.infrastructure.longestDistanceM}m.` : "A remote rack or comms-room location is mentioned.",
      "The enquiry still looks room-centric rather than estate-wide.",
    ],
  },
  {
    category: "Matrix Switching",
    when: ({ parsed }) =>
      (parsed.display.displayCount ?? 0) > 1 ||
      parsed.display.requiresIndependentContent ||
      (parsed.sourceInput.sourceCount ?? 0) >= 2,
    score: ({ parsed }) =>
      ((parsed.display.displayCount ?? 0) > 1 ? 3 : 0) +
      (parsed.display.requiresIndependentContent ? 3 : 0) +
      Math.min(parsed.sourceInput.sourceTypes.length, 2),
    need: () => "Routing multiple inputs across one or more displays",
    reasons: ({ parsed }) => [
      (parsed.display.displayCount ?? 0) > 1 ? "More than one display is implied." : "The enquiry references content-routing behavior.",
      parsed.display.requiresIndependentContent ? "Independent content on different displays is explicitly requested." : "Multiple source paths are likely.",
    ],
  },
  {
    category: "AV over IP",
    when: ({ parsed }) =>
      parsed.infrastructure.deploymentScale !== "Single space" ||
      parsed.flags.includes("network-infrastructure-available") ||
      parsed.display.displayType === "Video Wall" ||
      parsed.vertical === "Control Room",
    score: ({ parsed }) =>
      (parsed.infrastructure.deploymentScale !== "Single space" ? 4 : 0) +
      (parsed.flags.includes("network-infrastructure-available") ? 2 : 0) +
      (parsed.vertical === "Control Room" ? 3 : 0),
    need: () => "Scalable transport across rooms, racks, or wider infrastructure",
    reasons: ({ parsed }) => [
      parsed.infrastructure.deploymentScale !== "Single space"
        ? `The project reads like a ${parsed.infrastructure.deploymentScale.toLowerCase()} opportunity.`
        : "The enquiry hints at distributed transport.",
      parsed.infrastructure.networkMentioned ? "Managed network availability is already referenced." : "Distributed transport may suit future growth and central support.",
    ],
  },
  {
    category: "Wireless Presentation",
    when: ({ parsed }) => parsed.sourceInput.wirelessPresentation,
    score: ({ parsed }) => 4 + (parsed.control.simpleOperationImportant ? 1 : 0),
    need: () => "Low-friction content sharing from user devices",
    reasons: ({ parsed }) => [
      "Wireless sharing is explicitly mentioned.",
      parsed.control.simpleOperationImportant ? "Ease of use is commercially important here." : "Users are likely to want casual walk-in sharing.",
    ],
  },
  {
    category: "USB Extension / Routing",
    when: ({ parsed }) =>
      parsed.conferencing.byom ||
      parsed.conferencing.peripherals.length > 0 ||
      (parsed.cameras?.length ?? 0) > 0,
    score: ({ parsed }) =>
      (parsed.conferencing.byom ? 4 : 0) +
      Math.min(parsed.conferencing.peripherals.length, 3) +
      ((parsed.infrastructure.longestDistanceM ?? 0) >= 10 ? 1 : 0),
    need: () => "Room USB device access for cameras, mics, or BYOM workflows",
    reasons: ({ parsed }) => [
      parsed.conferencing.byom ? "Users are expected to bring their own laptop into the room workflow." : "Room USB peripherals are part of the scope.",
      parsed.conferencing.peripherals.length > 0
        ? `Detected peripherals: ${parsed.conferencing.peripherals.join(", ")}.`
        : "USB transport will likely need validating early.",
    ],
  },
  {
    category: "Video Wall Processing",
    when: ({ parsed }) => parsed.display.displayType === "Video Wall" || parsed.display.displayType === "LED Wall",
    score: ({ parsed }) => 6 + (parsed.vertical === "Control Room" ? 2 : 0),
    need: () => "Wall processing, scaling, and multi-window display control",
    reasons: ({ parsed }) => [
      `${parsed.display.displayType} language is explicit in the enquiry.`,
      parsed.vertical === "Control Room" ? "Control-room workflows often add source-windowing expectations." : "Large-format display processing should be treated as a first-order design topic.",
    ],
  },
  {
    category: "Digital Signage Distribution",
    when: ({ parsed }) =>
      parsed.display.displayType === "Digital Signage" ||
      parsed.roomType === "Retail Signage" ||
      parsed.flags.includes("digital-signage"),
    score: ({ parsed }) =>
      5 + (parsed.infrastructure.deploymentScale !== "Single space" ? 2 : 0),
    need: () => "Scheduled content distribution and signage control",
    reasons: ({ parsed }) => [
      "The enquiry is clearly signage-led rather than only room-collaboration-led.",
      parsed.infrastructure.deploymentScale !== "Single space"
        ? "The scale suggests central content governance will matter."
        : "Local override and day-to-day operation are commercially relevant.",
    ],
  },
  {
    category: "UC Room Integration",
    when: ({ parsed }) => parsed.conferencing.required,
    score: ({ parsed }) =>
      5 + (parsed.conferencing.platform !== "Unknown" && parsed.conferencing.platform !== "None" ? 1 : 0),
    need: () => "Unified meeting-room conferencing workflow",
    reasons: ({ parsed }) => [
      parsed.conferencing.platform !== "None"
        ? `The enquiry suggests a ${parsed.conferencing.platform} conferencing workflow.`
        : "Hybrid or remote-participation language is present.",
      parsed.conferencing.peripherals.length > 0 ? "Room camera and audio peripherals are expected." : "Conferencing support is part of the room brief.",
    ],
  },
  {
    category: "Lecture Capture Support",
    when: ({ parsed }) => Boolean(parsed.conferencing.lectureCapture || (parsed.vertical === "Education" && (parsed.conferencing.streaming || parsed.recording))),
    score: ({ parsed }) => 5 + (parsed.vertical === "Education" ? 2 : 0),
    need: () => "Teaching, capture, and remote learning workflow support",
    reasons: ({ parsed }) => [
      parsed.conferencing.lectureCapture ? "Lecture capture is explicitly mentioned." : "Education workflow plus streaming/recording is present.",
      "Capture workflows usually bring content, audio, and camera considerations together.",
    ],
  },
  {
    category: "Control System / Touch Panel",
    when: ({ parsed }) => parsed.control.controlRequired || parsed.control.touchPanelRequired || parsed.control.simpleOperationImportant,
    score: ({ parsed }) =>
      (parsed.control.touchPanelRequired ? 4 : 0) +
      (parsed.control.simpleOperationImportant ? 3 : 1),
    need: () => "Simple, guided operation for non-technical users",
    reasons: ({ parsed }) => [
      parsed.control.touchPanelRequired ? "Touch-panel style control is explicitly requested." : "The room needs guided control rather than exposed technical routing.",
      parsed.control.simpleOperationImportant ? "Ease of use is a commercial requirement." : "Control expectations are part of the brief.",
    ],
  },
  {
    category: "Audio DSP / Reinforcement",
    when: ({ parsed }) => parsed.audio.reinforcementLikely || parsed.audio.microphonesLikely,
    score: ({ parsed }) =>
      (parsed.audio.reinforcementLikely ? 3 : 0) +
      (parsed.audio.microphonesLikely ? 2 : 0) +
      (parsed.audio.dspLikely ? 1 : 0),
    need: () => "Managed room audio, reinforcement, or speech capture",
    reasons: ({ parsed }) => [
      parsed.audio.reinforcementLikely ? "Room audio reproduction or reinforcement appears necessary." : "Microphone capture is likely to matter.",
      parsed.audio.dspLikely ? "The workflow likely benefits from DSP-style audio handling." : "Audio should be treated as part of the room solution, not an afterthought.",
    ],
  },
  {
    category: "Streaming / Recording",
    when: ({ parsed }) => Boolean(parsed.streaming || parsed.recording),
    score: ({ parsed }) => (parsed.streaming ? 3 : 0) + (parsed.recording ? 3 : 0),
    need: () => "Content capture, live streaming, or recording workflow",
    reasons: ({ parsed }) => [
      parsed.streaming ? "Streaming is referenced." : "Recording is referenced.",
      "Capture workflows often need boundaries defined against the core AV system early.",
    ],
  },
  {
    category: "Central Monitoring / Management",
    when: ({ parsed }) =>
      parsed.infrastructure.deploymentScale !== "Single space" ||
      parsed.flags.includes("high-reliability") ||
      parsed.complexity === "Tender",
    score: ({ parsed }) =>
      (parsed.infrastructure.deploymentScale !== "Single space" ? 4 : 0) +
      (parsed.flags.includes("high-reliability") ? 2 : 0) +
      (parsed.complexity === "Tender" ? 2 : 0),
    need: () => "Ongoing support, monitoring, and governance for deployed systems",
    reasons: ({ parsed }) => [
      parsed.infrastructure.deploymentScale !== "Single space"
        ? "Rollout scale makes support and governance part of the solution story."
        : "Operational resilience is called out directly.",
      parsed.complexity === "Tender" ? "Tender response should address long-term management, not just hardware." : "Monitoring value may help de-risk the opportunity commercially.",
    ],
  },
];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function summarizeScenario(parsed: ParsedRequirement): string {
  const parts = [
    parsed.roomType && parsed.roomType !== "General AV Space" ? `${parsed.roomType} scenario detected.` : "General AV scenario detected.",
    parsed.capacity ? `Typical occupancy appears to be around ${parsed.capacity}.` : "Occupancy is still approximate.",
    parsed.display.displayType !== "Unknown" ? `Display direction looks like ${parsed.display.displayType.toLowerCase()}.` : "Display topology is still open.",
    parsed.conferencing.required
      ? `Conferencing is likely, with ${parsed.conferencing.platform === "Unknown" ? "platform still to confirm" : parsed.conferencing.platform}.`
      : "Conferencing is not yet clearly required.",
  ];
  return parts.join(" ");
}

function buildSalespersonActions(parsed: ParsedRequirement, categories: SolutionCategory[]): string[] {
  const actions = [
    "Confirm room layout, display locations, and any remote rack or comms-room positions.",
    "Confirm daily user source devices and whether the customer expects wired, wireless, or both workflows.",
    "Use the interpreted requirement set to position one primary architecture path and one fallback commercial option.",
  ];

  if (categories.includes("UC Room Integration")) {
    actions.push("Confirm the conferencing platform and whether the room is appliance-based, room-PC based, or BYOM.");
  }
  if (categories.includes("USB Extension / Routing")) {
    actions.push("Validate the USB device path early, especially if the customer expects room camera and audio peripherals on user laptops.");
  }
  if (categories.includes("Digital Signage Distribution")) {
    actions.push("Clarify content ownership, scheduling, local override, and central approval workflow.");
  }
  if (categories.includes("AV over IP")) {
    actions.push("Validate the network boundary, support model, and whether the customer will allow AV traffic on managed infrastructure.");
  }
  if (parsed.display.displayType === "Video Wall" || parsed.display.displayType === "LED Wall") {
    actions.push("Confirm content layout, windowing, scaling, and resilience expectations before discussing processor choices.");
  }

  return unique(actions);
}

export function recommendSolution(parsed: ParsedRequirement): RecommendationResult {
  const candidates: RecommendationCandidate[] = RULES
    .filter((rule) => rule.when({ parsed }))
    .map((rule) => ({
      category: rule.category,
      score: Math.max(1, rule.score({ parsed })),
      reasons: rule.reasons({ parsed }),
    }))
    .sort((left, right) => right.score - left.score);

  const likelySolutionCategories = unique(
    candidates
      .filter((candidate) => candidate.score >= 3)
      .map((candidate) => candidate.category),
  );

  const detectedNeeds = unique(
    RULES.filter((rule) => likelySolutionCategories.includes(rule.category)).map((rule) => rule.need({ parsed })),
  );

  const rationale = unique(candidates.slice(0, 5).flatMap((candidate) => candidate.reasons));
  const risks = unique(parsed.riskFlagsDetailed.map((risk) => `${risk.title}: ${risk.detail}`));
  const clarificationQuestions = unique(parsed.clarificationQuestionsDetailed.map((question) => question.question));
  const salespersonActions = buildSalespersonActions(parsed, likelySolutionCategories);

  if (likelySolutionCategories.length === 0) {
    likelySolutionCategories.push("Matrix Switching");
    detectedNeeds.push("A commercially safe starting point for room switching and display control");
    rationale.push("The request is still incomplete, so Wingman is defaulting to a room-switching style starting point until the signal path is clearer.");
  }

  const confidence = Math.max(
    0.2,
    Math.min(
      0.97,
      Number((parsed.confidence + Math.min(candidates[0]?.score ?? 0, 6) * 0.02).toFixed(2)),
    ),
  );

  return {
    summary: summarizeScenario(parsed),
    detectedNeeds,
    likelySolutionCategories,
    rankedCategories: candidates,
    risks,
    clarificationQuestions,
    salespersonActions,
    rationale,
    confidence,
  };
}
