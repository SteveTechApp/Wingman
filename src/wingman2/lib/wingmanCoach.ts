export type WingmanCoachAudience = "endUser" | "dealer" | "consultant" | "internal";

export type WingmanCoachConversationType = "discover" | "select" | "position" | "validate" | "proposal";

export type WingmanCoachVisualKind =
  | "customer-journey"
  | "room-context"
  | "signal-flow"
  | "product-in-situ"
  | "bom-topology";

export type WingmanSkuFunnelStep = {
  label: string;
  count: number;
  detail: string;
  tone: "neutral" | "active" | "good" | "warning";
};

export type WingmanSkuFunnel = {
  total: number;
  visible: number;
  shortlisted: number;
  selected: number;
  selectedSku?: string;
  steps: WingmanSkuFunnelStep[];
};

export type WingmanCoachVisualBlock = {
  id: string;
  kind: WingmanCoachVisualKind;
  title: string;
  summary: string;
  proposalUse: string;
  exportLabel: string;
};

export type WingmanProposalOutput = {
  audience: WingmanCoachAudience;
  title: string;
  summary: string;
  use: string;
};

export type WingmanRequirementState = {
  known: string[];
  unknown: string[];
  risks: string[];
  nextQuestion: string;
  confidence: number;
};

export type WingmanCoachState = {
  audience: WingmanCoachAudience;
  audienceLabel: string;
  conversationType: WingmanCoachConversationType;
  title: string;
  playback: string;
  nextQuestion: string;
  nextAction: string;
  requirement: WingmanRequirementState;
  skuFunnel: WingmanSkuFunnel;
  visualBlocks: WingmanCoachVisualBlock[];
  proposalOutputs: WingmanProposalOutput[];
  localizationNotes: string[];
};

type ProductLike = {
  sku?: string;
  title?: string;
  family?: string;
  category?: string;
  status?: string;
  score?: number;
  tags?: string[];
  evidence?: string[];
  cautions?: string[];
};

type BomRowLike = {
  sku?: string;
  role?: string;
  qty?: number;
  type?: string;
  notes?: string;
  evidence?: string;
};

type CompareRunLike = {
  competitorBrand?: string;
  competitorSku?: string;
  competitorName?: string;
  summary?: string;
  warnings?: string[];
  matchScore?: number;
};

export type WingmanCoachInput = {
  source?: string;
  audience?: WingmanCoachAudience;
  discovery?: Record<string, unknown>;
  finderNeed?: Record<string, unknown>;
  totalProducts?: number;
  visibleMatches?: ProductLike[];
  shortlistedCount?: number;
  selectedProducts?: ProductLike[];
  bomRows?: BomRowLike[];
  assumptions?: string[];
  readinessScore?: number;
  compareRun?: CompareRunLike | null;
};

const audienceCopy: Record<WingmanCoachAudience, { label: string; stance: string; proof: string }> = {
  endUser: {
    label: "End user",
    stance: "Talk about the job they are trying to get done, the friction they feel, and what changes for them after the system is installed.",
    proof: "Keep proof practical: fewer failed starts, less room support, clearer content sharing, or simpler teaching.",
  },
  dealer: {
    label: "System integrator / reseller",
    stance: "Help the user qualify the integrator or reseller quickly, then give them a handoff story they can repeat to their customer without sounding like a brochure.",
    proof: "Connect the SKU to a room problem, show the install dependency that matters most, and make any display, projector, LED, or UC attachment opportunity feel credible rather than forced.",
  },
  consultant: {
    label: "Technical reviewer",
    stance: "Lead with the design assumption, then explain why the product class is being used.",
    proof: "Call out interfaces, transport, network ownership, validation risks, and where a governed accessory is still needed.",
  },
  internal: {
    label: "Internal account manager",
    stance: "Coach an internal distributor salesperson through the next useful question, the likely WyreStorm product direction, and what can be positioned safely right now.",
    proof: "Show what is known, what is missing, what is risky, and where display, projector, LED, signage, control, or UC attachment opportunities exist before the conversation reaches pre-sales.",
  },
};

const unknownValues = new Set([
  "",
  "any",
  "n/a",
  "na",
  "not available",
  "not confirmed",
  "not set",
  "unknown",
  "unspecified",
  "template-defined",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isUnknown(value: unknown) {
  const text = cleanText(value).toLowerCase();
  if (unknownValues.has(text)) return true;
  return text.includes("not confirmed") || text.includes("not available") || text.includes("no discovery brief");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function firstKnown(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (!isUnknown(value)) return cleanText(value);
  }
  return "";
}

function addKnown(lines: string[], label: string, value: unknown) {
  if (isUnknown(value)) return;
  lines.push(`${label}: ${cleanText(value)}`);
}

function clipped(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function listProducts(products: ProductLike[], limit = 3) {
  return products
    .slice(0, limit)
    .map((product) => [product.sku, product.title || product.family || product.category].filter(Boolean).join(" - "))
    .filter(Boolean)
    .join("; ");
}

function inferConversationType(input: WingmanCoachInput): WingmanCoachConversationType {
  const source = cleanText(input.source).toLowerCase();
  const selectedCount = input.selectedProducts?.length ?? 0;
  const visibleCount = input.visibleMatches?.length ?? 0;
  const riskCount = (input.assumptions?.length ?? 0) + (input.compareRun?.warnings?.length ?? 0);

  if (source.includes("proposal")) return "proposal";
  if (riskCount > 0 && selectedCount > 0) return "validate";
  if (selectedCount > 0) return "position";
  if (visibleCount > 0) return "select";
  return "discover";
}

function buildRequirementState(input: WingmanCoachInput): WingmanRequirementState {
  const discovery = asRecord(input.discovery);
  const roomModel = asRecord(discovery.roomModel);
  const discovered = Object.keys(roomModel).length ? roomModel : discovery;
  const need = asRecord(input.finderNeed);
  const selectedProducts = input.selectedProducts ?? [];
  const visibleMatches = input.visibleMatches ?? [];
  const assumptions = unique([...(input.assumptions ?? []), ...(input.compareRun?.warnings ?? [])]).slice(0, 5);
  const known: string[] = [];
  const unknown: string[] = [];
  const risks: string[] = [];

  addKnown(known, "Customer context", firstKnown(discovered, ["projectTitle", "roomType", "application", "summary"]));
  addKnown(known, "Room size", firstKnown(discovered, ["roomSize", "roomScale"]));
  addKnown(known, "Display need", firstKnown(discovered, ["displays", "displayArrangement", "displayBehaviour", "displayCount"]));
  addKnown(known, "Sources", firstKnown(discovered, ["sourceCount", "sources", "sourceDevices"]));
  addKnown(known, "USB", firstKnown(discovered, ["usb", "usbTransport", "usbOwnership"]));
  addKnown(known, "Longest run", firstKnown(discovered, ["distance", "longestRun", "cableRun"]));
  addKnown(known, "Network", firstKnown(discovered, ["network", "networkAvailability", "networkOwnership"]));
  addKnown(known, "Audio", firstKnown(discovered, ["audio", "audioNeeds", "audioPath"]));
  addKnown(known, "Control", firstKnown(discovered, ["control", "controlNeeds"]));

  addKnown(known, "Technical requirement", need.technicalRequirement);
  addKnown(known, "Product path", need.productPath);
  addKnown(known, "Signal", need.signalType);
  addKnown(known, "Source connector", need.sourceConnector);
  addKnown(known, "Output connector", need.displayConnector);
  addKnown(known, "Inputs", need.inputs);
  addKnown(known, "Outputs", need.outputs);
  addKnown(known, "Distance", need.distance);
  addKnown(known, "Resolution", need.resolution);
  addKnown(known, "Processing", need.processing);

  if (visibleMatches.length) {
    known.push(`Current Finder result set: ${listProducts(visibleMatches)}`);
  }

  if (selectedProducts.length) {
    known.push(`Selected WyreStorm SKU: ${listProducts(selectedProducts, 2)}`);
  }

  if (input.bomRows?.length) {
    known.push(`BOM rows prepared: ${input.bomRows.length}`);
  }

  if (!firstKnown(discovered, ["projectTitle", "roomType", "application", "summary"]) && !need.query) {
    unknown.push("The customer situation in one plain sentence");
  }

  if (!firstKnown(discovered, ["displayArrangement", "displayBehaviour", "displayCount"]) && !need.outputs) {
    unknown.push("Display count and what each display needs to show");
  }

  if (!firstKnown(discovered, ["sourceCount", "sourceDevices"]) && !need.inputs && !need.sourceConnector) {
    unknown.push("Source count and source connector");
  }

  if (!firstKnown(discovered, ["usb", "usbTransport", "usbOwnership"]) && !need.usb) {
    unknown.push("Whether USB is camera, touch, HID, or not required");
  }

  if (!firstKnown(discovered, ["distance", "longestRun", "cableRun"]) && !need.distance) {
    unknown.push("Longest cable run or network path");
  }

  if (!firstKnown(discovered, ["network", "networkAvailability", "networkOwnership"]) && !need.network) {
    unknown.push("Network ownership, VLAN availability, and who will configure it");
  }

  if (!selectedProducts.length && input.source === "proposal") {
    risks.push("No selected WyreStorm core product is attached to this proposal yet.");
  }

  if ((input.visibleMatches?.length ?? 0) > 5 && !selectedProducts.length) {
    risks.push("The SKU list is still broad. Add one more constraint before presenting a recommendation.");
  }

  selectedProducts.forEach((product) => {
    if (product.status === "caution") {
      risks.push(`${product.sku || "Selected product"} is marked as caution and needs validation before customer issue.`);
    }
    product.cautions?.slice(0, 2).forEach((caution) => risks.push(caution));
  });

  assumptions.forEach((assumption) => risks.push(assumption));

  if (Number.isFinite(input.readinessScore) && Number(input.readinessScore) < 75) {
    risks.push(`Proposal readiness is ${input.readinessScore}%, so the output should stay internal until the validation points are closed.`);
  }

  const nextQuestion = buildNextQuestion(unique(unknown), unique(risks));
  const baseConfidence = known.length / Math.max(1, known.length + unknown.length + risks.length * 0.8);
  const readinessBlend = Number.isFinite(input.readinessScore) ? (baseConfidence * 100 + Number(input.readinessScore)) / 2 : baseConfidence * 100;

  return {
    known: unique(known).slice(0, 10),
    unknown: unique(unknown).slice(0, 6),
    risks: unique(risks).slice(0, 6),
    nextQuestion,
    confidence: clipped(Math.round(readinessBlend), selectedProducts.length ? 35 : 18, 96),
  };
}

function buildNextQuestion(unknown: string[], risks: string[]) {
  const firstUnknown = unknown[0] ?? "";
  const firstRisk = risks[0] ?? "";

  if (firstUnknown.toLowerCase().includes("customer situation")) {
    return "What is the customer trying to do in the room that is awkward, unreliable, or slow today?";
  }
  if (firstUnknown.toLowerCase().includes("display")) {
    return "How many displays are involved, and should they mirror, extend, switch independently, or show different content?";
  }
  if (firstUnknown.toLowerCase().includes("source")) {
    return "What sources are connecting, and are they fixed devices, laptops, cameras, or network streams?";
  }
  if (firstUnknown.toLowerCase().includes("usb")) {
    return "Is USB carrying a camera, touch display, room peripheral, or just keyboard and mouse control?";
  }
  if (firstUnknown.toLowerCase().includes("cable")) {
    return "What is the longest real-world run, including the route through walls, floor boxes, or the network?";
  }
  if (firstUnknown.toLowerCase().includes("network")) {
    return "Who owns the network design, and is a dedicated AV network or VLAN available?";
  }
  if (firstRisk) {
    return `Can we validate this before it reaches the customer: ${firstRisk}`;
  }
  return "What is the real application here, and what else around the display, projector, LED wall, or room workflow still needs to be solved?";
}

function buildSkuFunnel(input: WingmanCoachInput): WingmanSkuFunnel {
  const selectedProducts = input.selectedProducts ?? [];
  const visible = input.visibleMatches?.length ?? 0;
  const shortlisted = input.shortlistedCount ?? 0;
  const selected = selectedProducts.length;
  const total = input.totalProducts ?? Math.max(visible, selected, shortlisted, 0);

  return {
    total,
    visible,
    shortlisted,
    selected,
    selectedSku: selectedProducts[0]?.sku,
    steps: [
      {
        label: "Library",
        count: total,
        detail: total ? "WyreStorm products available to search." : "The product index is still loading or not available.",
        tone: total ? "neutral" : "warning",
      },
      {
        label: "Candidates",
        count: visible,
        detail: visible ? "Products that survived the current intent, product class, signal path, and fit checks." : "Capture one useful requirement to create a candidate set.",
        tone: visible ? "active" : "warning",
      },
      {
        label: "Saved",
        count: shortlisted,
        detail: shortlisted ? "Products held for a project-free conversation or later review." : "Save a product when the customer is interested but the project is not ready.",
        tone: shortlisted ? "active" : "neutral",
      },
      {
        label: "Project SKUs",
        count: selected,
        detail: selected ? "Products attached to the live project and available for proposal or BOM output." : "Add the right SKU to a project before exporting customer material.",
        tone: selected ? "good" : "neutral",
      },
    ],
  };
}

function buildVisualBlocks(input: WingmanCoachInput): WingmanCoachVisualBlock[] {
  const selectedProducts = input.selectedProducts ?? [];
  const bomRows = input.bomRows ?? [];
  const discovery = asRecord(input.discovery);
  const need = asRecord(input.finderNeed);
  const context = firstKnown(discovery, ["projectTitle", "roomType", "summary", "application"]) || cleanText(need.technicalRequirement) || "this opportunity";
  const blocks: WingmanCoachVisualBlock[] = [
    {
      id: "customer-journey",
      kind: "customer-journey",
      title: "Customer problem playback",
      summary: `A before-and-after view for ${context}, written around user friction rather than product features.`,
      proposalUse: "Use it near the executive summary to show that the proposal understands the customer challenge.",
      exportLabel: "Proposal story panel",
    },
  ];

  if (selectedProducts.length || cleanText(need.signalType) || cleanText(need.technicalRequirement)) {
    blocks.push({
      id: "signal-flow",
      kind: "signal-flow",
      title: "Signal flow diagram",
      summary: "Source, transport, processing, display, USB, network, and control shown as one simple path.",
      proposalUse: "Use it to help non-technical buyers see how the system fits together and to help technical reviewers validate interfaces.",
      exportLabel: "Transferable system diagram",
    });
  }

  if (selectedProducts.length) {
    blocks.push({
      id: "product-in-situ",
      kind: "product-in-situ",
      title: `${selectedProducts[0]?.sku || "WyreStorm product"} in the room`,
      summary: "A product-in-context visual that explains what the selected SKU is doing in the customer environment.",
      proposalUse: "Use it next to the recommended product so the SKU is anchored to a room outcome, not a catalogue line.",
      exportLabel: "Product context panel",
    });
  }

  if (bomRows.length) {
    blocks.push({
      id: "bom-topology",
      kind: "bom-topology",
      title: "BOM topology",
      summary: "A proposal-ready view of core products, governed dependencies, optional rows, and validation prompts.",
      proposalUse: "Use it before the BOM table to make quantities and dependencies easier to check.",
      exportLabel: "BOM topology visual",
    });
  }

  if (firstKnown(discovery, ["roomSize", "displays", "displayArrangement", "displayBehaviour"])) {
    blocks.push({
      id: "room-context",
      kind: "room-context",
      title: "Room context visual",
      summary: "A room-use visual that separates a meeting room, classroom, divisible space, or signage environment by behavior.",
      proposalUse: "Use it when the customer needs to explain the use case onward to budget holders or site stakeholders.",
      exportLabel: "Room use-case visual",
    });
  }

  return blocks.slice(0, 5);
}

function buildProposalOutputs(input: WingmanCoachInput): WingmanProposalOutput[] {
  const selectedProducts = input.selectedProducts ?? [];
  const primarySku = selectedProducts[0]?.sku || "the selected WyreStorm solution";
  const discovery = asRecord(input.discovery);
  const need = asRecord(input.finderNeed);
  const context = firstKnown(discovery, ["projectTitle", "roomType", "summary", "application"]) || cleanText(need.query) || "the customer requirement";

  return [
    {
      audience: "endUser",
      title: "Customer-facing version",
      summary: `${primarySku} is framed around what becomes easier for the people using ${context}. Keep the language about fewer workarounds, clearer sharing, and less support time.`,
      use: "Use this in emails, proposal summaries, and conversations with budget owners.",
    },
    {
      audience: "dealer",
      title: "Selling-onward version",
      summary: `Explain why ${primarySku} is the practical route, what to validate, and how the integrator, reseller, or salesperson should recognise the fit in the customer's own room.`,
      use: "Use this when the channel partner needs a repeatable story they can sell onward confidently.",
    },
    {
      audience: "consultant",
      title: "Technical reviewer version",
      summary: `State the design assumptions first, then show how ${primarySku} handles signal path, interfaces, dependencies, and validation points.`,
      use: "Use this when the buyer, consultant, or integrator will check the design detail.",
    },
    {
      audience: "internal",
      title: "Wingman workflow version",
      summary: "Show what is known, which application is really in play, what is still open, why the SKU list narrowed, and where display, projector, LED, or UC attachment opportunities exist.",
      use: "Use this for coaching, handoff, and debugging the recommendation path.",
    },
  ];
}

function buildLocalizationNotes() {
  return [
    "Keep the first sentence short and literal so it translates cleanly: customer problem, WyreStorm action, customer outcome.",
    "Avoid idioms and empty sales phrases such as future proof, best in class, or seamless unless the evidence is specific.",
    "Translate product roles by function rather than internal jargon, for example transmitter, receiver, switcher, processor, or controller.",
    "Keep validation questions as questions. They work better across languages than long conditional statements.",
  ];
}

function buildPlayback(input: WingmanCoachInput, requirement: WingmanRequirementState, conversationType: WingmanCoachConversationType, audience: WingmanCoachAudience) {
  const selectedProducts = input.selectedProducts ?? [];
  const visibleMatches = input.visibleMatches ?? [];
  const primarySku = selectedProducts[0]?.sku || visibleMatches[0]?.sku || "";
  const copy = audienceCopy[audience];
  const knownProblem = requirement.known.find((item) => item.startsWith("Customer context")) || requirement.known[0] || "";
  const context = knownProblem.replace(/^Customer context:\s*/i, "");
  const naturalPlayback = context
    ? `Play it back simply: this is about ${context}, so lead with the room behavior before the SKU list.`
    : "Start by capturing the room problem in the customer's words before naming a product.";

  if (audience === "internal") {
    return `${naturalPlayback} Coach the conversation for an internal distributor account manager: identify the likely WyreStorm product family, ask the next qualification question, and spot any display, projector, LED, or UC attachment opportunity before naming a final SKU.`;
  }

  if (conversationType === "proposal") {
    return `${naturalPlayback} ${copy.stance} The proposal should show the reasoning, the visual path, and the validation points before the BOM table.`;
  }

  if (primarySku) {
    return `${naturalPlayback} ${primarySku} is the current product anchor, but the conversation should explain the outcome first and the SKU second. ${copy.proof}`;
  }

  return `${naturalPlayback} ${copy.stance}`;
}

function buildNextAction(conversationType: WingmanCoachConversationType, requirement: WingmanRequirementState, funnel: WingmanSkuFunnel) {
  if (conversationType === "discover") {
    return "Capture one clear room outcome, then choose the signal problem that best matches it.";
  }
  if (conversationType === "select") {
    return funnel.visible > 4
      ? "Reduce the candidate list with one more real-world constraint: display behavior, distance, USB ownership, network ownership, or source count."
      : "Open the leading result, check why it appears, then add it to the active project when the validation points look right.";
  }
  if (conversationType === "position") {
    return "Frame the selected SKU as the reason the customer's day gets easier, then keep one validation question visible.";
  }
  if (conversationType === "validate") {
    return `Resolve the highest-risk assumption first: ${requirement.risks[0] || "confirm accessories, lifecycle, regional suitability, and dependencies."}`;
  }
  return "Use the coach visuals and proposal outputs to make the reasoning transferable, then export only after the selected SKUs and validation notes are clear.";
}

function buildTitle(conversationType: WingmanCoachConversationType, audience: WingmanCoachAudience) {
  const labels: Record<WingmanCoachConversationType, string> = {
    discover: "Capture the real room problem",
    select: "Narrow the SKU list visibly",
    position: "Turn the SKU into a useful story",
    validate: "Close the risky assumptions",
    proposal: "Make the proposal easy to sell onward",
  };

  if (conversationType === "proposal") {
    return labels[conversationType];
  }

  return `${labels[conversationType]} for ${audienceCopy[audience].label.toLowerCase()}`;
}

export function buildWingmanCoachState(input: WingmanCoachInput): WingmanCoachState {
  const audience = input.audience ?? "dealer";
  const conversationType = inferConversationType(input);
  const requirement = buildRequirementState(input);
  const skuFunnel = buildSkuFunnel(input);
  const visualBlocks = buildVisualBlocks(input);

  return {
    audience,
    audienceLabel: audienceCopy[audience].label,
    conversationType,
    title: buildTitle(conversationType, audience),
    playback: buildPlayback(input, requirement, conversationType, audience),
    nextQuestion: requirement.nextQuestion,
    nextAction: buildNextAction(conversationType, requirement, skuFunnel),
    requirement,
    skuFunnel,
    visualBlocks,
    proposalOutputs: buildProposalOutputs(input),
    localizationNotes: buildLocalizationNotes(),
  };
}
