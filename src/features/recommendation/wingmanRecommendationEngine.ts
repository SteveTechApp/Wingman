export type RecommendationTier = "Bronze" | "Silver" | "Gold";

export type DiscoverySnapshot = {
  projectName: string;
  projectId: string;
  application: string;
  roomType: string;
  displayCount: number;
  sourceCount: number;
  maxDistanceMeters: number;
  usbRequired: boolean;
  controlRequired: boolean;
  audioRequired: boolean;
  notes: string;
};

export type RecommendationFamily = {
  family: string;
  rationale: string;
  priority: "primary" | "secondary";
};

export type TierBomItem = {
  role: string;
  guidance: string;
  tier: RecommendationTier;
};

export type RecommendationResult = {
  architecture: string;
  architectureReason: string;
  tier: RecommendationTier;
  tierReason: string;
  recommendedFamilies: RecommendationFamily[];
  tieredBom: TierBomItem[];
  risks: string[];
  nextSteps: string[];
  proposalSummary: string;
};

function textHas(value: string, terms: string[]): boolean {
  const hay = String(value || "").trim().toLowerCase();
  return terms.some((term) => hay.includes(term.toLowerCase()));
}

function pickTier(input: DiscoverySnapshot): RecommendationTier {
  let score = 0;

  if (input.displayCount >= 2) score += 1;
  if (input.displayCount >= 6) score += 2;
  if (input.sourceCount >= 3) score += 1;
  if (input.sourceCount >= 6) score += 1;
  if (input.maxDistanceMeters > 20) score += 1;
  if (input.maxDistanceMeters > 60) score += 1;
  if (input.usbRequired) score += 1;
  if (input.controlRequired) score += 1;
  if (input.audioRequired) score += 1;
  if (textHas(input.notes, ["video wall", "led", "operations", "control room", "multi-room"])) score += 2;

  if (score >= 7) return "Gold";
  if (score >= 4) return "Silver";
  return "Bronze";
}

function pickArchitecture(input: DiscoverySnapshot): { name: string; reason: string } {
  const multiDisplay = input.displayCount > 1;
  const manySources = input.sourceCount > 2;
  const longDistance = input.maxDistanceMeters > 20;
  const veryLongDistance = input.maxDistanceMeters > 70;
  const videoWallIntent =
    textHas(input.application, ["video wall", "led", "signage"]) ||
    textHas(input.roomType, ["video wall", "operations", "control"]) ||
    textHas(input.notes, ["video wall", "bezel", "led", "multiview"]);

  if (videoWallIntent && input.displayCount >= 4) {
    return {
      name: "Video wall architecture",
      reason:
        "The discovery profile points to a multi-display visual canvas where wall processing, layout control and scaling matter more than standard room switching alone.",
    };
  }

  if ((multiDisplay && manySources && longDistance) || veryLongDistance) {
    return {
      name: "AV over IP distribution",
      reason:
        "Multiple sources, multiple displays and longer transport distances suggest a distributed architecture will provide stronger flexibility and easier system-wide routing than a fixed local topology.",
    };
  }

  if (manySources && (multiDisplay || longDistance)) {
    return {
      name: "Matrix switching with extension",
      reason:
        "The room requires central source selection with multiple routing possibilities, but does not yet demand a fully distributed network AV architecture.",
    };
  }

  if (longDistance) {
    return {
      name: "HDBaseT extension architecture",
      reason:
        "Signal distance is significant enough that extension technology should drive the design rather than relying on local direct-connect assumptions.",
    };
  }

  return {
    name: "Presentation switching architecture",
    reason:
      "The discovery answers suggest a focused room system where clean source selection and simple user operation are more important than large-scale infrastructure.",
  };
}

function buildFamilies(input: DiscoverySnapshot, architecture: string): RecommendationFamily[] {
  const families: RecommendationFamily[] = [];

  if (architecture === "Presentation switching architecture") {
    families.push({
      family: "Presentation switchers",
      rationale: "Best fit for straightforward room input selection and user-friendly operation.",
      priority: "primary",
    });
  }

  if (architecture === "HDBaseT extension architecture") {
    families.push({
      family: "HDBaseT transmitters and receivers",
      rationale: "Supports longer cable runs with cleaner signal transport for room-based distribution.",
      priority: "primary",
    });
  }

  if (architecture === "Matrix switching with extension") {
    families.push({
      family: "Matrix switchers",
      rationale: "Central routing is important where several sources must feed one or more displays.",
      priority: "primary",
    });
    families.push({
      family: "HDBaseT extension",
      rationale: "Recommended where display distance exceeds practical direct HDMI distance.",
      priority: "secondary",
    });
  }

  if (architecture === "AV over IP distribution") {
    families.push({
      family: "AV over IP endpoints",
      rationale: "Distributed routing and scalability are better aligned to the discovery profile than a fixed matrix alone.",
      priority: "primary",
    });
    families.push({
      family: "Networked control and multiview options",
      rationale: "Helpful where routing flexibility, operator workflows or future growth are likely.",
      priority: "secondary",
    });
  }

  if (architecture === "Video wall architecture") {
    families.push({
      family: "Video wall processors",
      rationale: "Needed where the display surface itself becomes part of the solution logic.",
      priority: "primary",
    });
    families.push({
      family: "AV over IP or matrix distribution",
      rationale: "The content transport layer should be selected around source count, flexibility and scaling needs.",
      priority: "secondary",
    });
  }

  if (input.usbRequired) {
    families.push({
      family: "USB extension / USB-enabled room solutions",
      rationale: "Required to support collaboration peripherals, cameras, speakerphones or interactive devices.",
      priority: "secondary",
    });
  }

  if (input.controlRequired) {
    families.push({
      family: "Control interfaces",
      rationale: "Needed where system simplicity and repeatable user operation matter commercially.",
      priority: "secondary",
    });
  }

  if (input.audioRequired) {
    families.push({
      family: "Audio routing / DSP support",
      rationale: "Recommended where room audio is part of the customer outcome rather than an afterthought.",
      priority: "secondary",
    });
  }

  return families;
}

function buildTierReason(input: DiscoverySnapshot, tier: RecommendationTier): string {
  if (tier === "Bronze") {
    return "The discovery profile supports a core functional solution with limited infrastructure complexity and a stronger focus on straightforward room operation.";
  }

  if (tier === "Silver") {
    return "The room requires a more balanced recommendation where transport method, collaboration support and system flexibility matter, but the design does not yet justify a premium everywhere architecture.";
  }

  return "The discovery profile points to a higher-tier solution because scale, workflow complexity, transport demands or control expectations justify a more capable architecture.";
}

function buildTieredBom(input: DiscoverySnapshot, architecture: string): TierBomItem[] {
  const items: TierBomItem[] = [];

  items.push({
    role: "Core switching / transport",
    guidance: architecture,
    tier: "Bronze",
  });

  if (architecture === "Presentation switching architecture") {
    items.push({
      role: "Room source interface",
      guidance: "Presentation switcher with the correct input mix for laptop and local source workflows.",
      tier: "Bronze",
    });
  }

  if (architecture === "HDBaseT extension architecture") {
    items.push({
      role: "Transport",
      guidance: "HDBaseT transmitter and receiver pair sized to room distance and signal requirements.",
      tier: "Bronze",
    });
  }

  if (architecture === "Matrix switching with extension") {
    items.push({
      role: "Switching core",
      guidance: "Matrix switching platform sized to source count and display routing requirements.",
      tier: "Silver",
    });
    items.push({
      role: "Display transport",
      guidance: "Extension endpoints where display distance exceeds practical direct connection.",
      tier: "Silver",
    });
  }

  if (architecture === "AV over IP distribution") {
    items.push({
      role: "Networked endpoints",
      guidance: "Encoder / decoder endpoint count aligned to source count, display count and routing flexibility.",
      tier: "Gold",
    });
  }

  if (architecture === "Video wall architecture") {
    items.push({
      role: "Wall processing core",
      guidance: "Video wall processor or alternative wall-capable distribution approach aligned to layout and content behaviour.",
      tier: "Gold",
    });
  }

  if (input.usbRequired) {
    items.push({
      role: "USB workflow",
      guidance: "USB extension or USB-capable room platform to support cameras, speakerphones or interactive devices.",
      tier: input.displayCount > 1 ? "Silver" : "Bronze",
    });
  }

  if (input.controlRequired) {
    items.push({
      role: "Control layer",
      guidance: "Simple operator interface or control integration sized to the room workflow.",
      tier: input.displayCount > 1 || input.sourceCount > 2 ? "Silver" : "Bronze",
    });
  }

  if (input.audioRequired) {
    items.push({
      role: "Audio layer",
      guidance: "Audio routing, de-embedding or DSP support based on room audio expectations.",
      tier: input.controlRequired ? "Silver" : "Bronze",
    });
  }

  return items;
}

function buildRisks(input: DiscoverySnapshot, architecture: string): string[] {
  const risks: string[] = [];

  risks.push("Confirm final source count and display count before locking the switching or transport platform.");

  if (input.maxDistanceMeters > 20) {
    risks.push("Confirm the longest real cable path, not just room dimensions, before finalizing transport.");
  }

  if (input.usbRequired) {
    risks.push("Confirm exactly which USB peripherals must be supported and where they sit in the signal path.");
  }

  if (input.controlRequired) {
    risks.push("Confirm the control expectation: local button control, touch panel, API integration or third-party automation.");
  }

  if (architecture === "Video wall architecture") {
    risks.push("Confirm wall layout, content behaviour and scaling expectations before final BOM issue.");
  }

  if (input.notes.trim().length === 0) {
    risks.push("Add customer priorities and room notes so the recommendation can be positioned around outcomes, not only topology.");
  }

  return risks;
}

function buildNextSteps(architecture: string): string[] {
  const steps: string[] = [];

  steps.push("Validate the chosen architecture against the actual room workflow.");
  steps.push("Shortlist the correct WyreStorm product family and tier fit.");
  steps.push("Convert the recommendation into a tiered BOM and proposal summary.");

  if (architecture === "AV over IP distribution") {
    steps.push("Confirm network readiness, endpoint count and any multiview or control expectations.");
  }

  if (architecture === "Video wall architecture") {
    steps.push("Confirm wall dimensions, content layouts and processing behaviour before final product selection.");
  }

  return steps;
}

export function generateRecommendation(input: DiscoverySnapshot): RecommendationResult {
  const architecture = pickArchitecture(input);
  const tier = pickTier(input);
  const recommendedFamilies = buildFamilies(input, architecture.name);
  const tieredBom = buildTieredBom(input, architecture.name);
  const tierReason = buildTierReason(input, tier);
  const risks = buildRisks(input, architecture.name);
  const nextSteps = buildNextSteps(architecture.name);

  const proposalSummary = [
    "Project: " + input.projectName,
    "",
    "Recommended architecture:",
    architecture.name,
    architecture.reason,
    "",
    "Recommended tier:",
    tier,
    tierReason,
    "",
    "Recommended WyreStorm families:",
    ...recommendedFamilies.map((item) => "- " + item.family + ": " + item.rationale),
    "",
    "Tiered BOM guidance:",
    ...tieredBom.map((item) => "- [" + item.tier + "] " + item.role + " — " + item.guidance),
    "",
    "Checks before issue:",
    ...risks.map((item) => "- " + item),
  ].join("\n");

  return {
    architecture: architecture.name,
    architectureReason: architecture.reason,
    tier,
    tierReason,
    recommendedFamilies,
    tieredBom,
    risks,
    nextSteps,
    proposalSummary,
  };
}