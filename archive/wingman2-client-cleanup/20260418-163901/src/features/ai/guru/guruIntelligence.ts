import type { GuruProjectSnapshot } from "./guruProjectBridge";

export type GuruConfidence = "low" | "medium" | "high";

export type GuruNextStep = {
  label: string;
  href: string;
  reason: string;
};

export type GuruAdvice = {
  contextLabel: string;
  summary: string;
  confidence: GuruConfidence;
  architecture: string;
  productDirection: string[];
  missingItems: string[];
  notes: string[];
  nextSteps: GuruNextStep[];
  prompts: string[];
};

type ParsedFacts = {
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  mentionsVideoWall: boolean;
  mentionsAvoip: boolean;
  mentionsMatrix: boolean;
  mentionsUsb: boolean;
  mentionsControl: boolean;
  mentionsMultiroom: boolean;
  mentionsEducation: boolean;
  mentionsMeetingRoom: boolean;
  mentionsKvm: boolean;
  mentionsLed: boolean;
};

function detectContext(pathname: string): string {
  const path = pathname.toLowerCase();

  if (path.includes("/discovery")) return "Discovery";
  if (path.includes("/catalog")) return "Catalogue";
  if (path.includes("/proposal")) return "Proposal";
  if (path.includes("/video-wall")) return "Video Wall";
  if (path.includes("/dashboard")) return "Dashboard";
  return "Guru";
}

function detectFacts(input: string): ParsedFacts {
  const text = input.toLowerCase();

  const sourceMatch = text.match(/(\d+)\s*(source|sources)/);
  const displayMatch = text.match(/(\d+)\s*(display|displays|screen|screens)/);
  const distanceMatch =
    text.match(/(\d+)\s*m\b/) ||
    text.match(/(\d+)\s*meter/) ||
    text.match(/(\d+)\s*metre/) ||
    text.match(/(\d+)\s*ft\b/);

  let distanceM: number | undefined;
  if (distanceMatch) {
    const raw = Number(distanceMatch[1]);
    if (!Number.isNaN(raw)) {
      distanceM = distanceMatch[0].includes("ft") ? Math.round(raw * 0.3048) : raw;
    }
  }

  return {
    sourceCount: sourceMatch ? Number(sourceMatch[1]) : undefined,
    displayCount: displayMatch ? Number(displayMatch[1]) : undefined,
    distanceM,
    mentionsVideoWall: /(video wall|2x2|3x3|4x4|bezel|multiview wall)/.test(text),
    mentionsAvoip: /(avoip|av over ip|networked video|decoder|encoder|many displays|scalable)/.test(text),
    mentionsMatrix: /(matrix|presentation switch|switching system|multiple sources to multiple displays)/.test(text),
    mentionsUsb: /\busb\b/.test(text),
    mentionsControl: /(control|rs-232|ir|api|tcp\/ip)/.test(text),
    mentionsMultiroom: /(multi room|multiple rooms|campus|many zones)/.test(text),
    mentionsEducation: /(education|campus|classroom|lecture)/.test(text),
    mentionsMeetingRoom: /(meeting room|boardroom|conference room|huddle)/.test(text),
    mentionsKvm: /\bkvm\b/.test(text),
    mentionsLed: /\bled\b/.test(text),
  };
}

function detectMissingItems(input: string, facts: ParsedFacts, snapshot?: GuruProjectSnapshot): string[] {
  const text = input.toLowerCase();
  const missing: string[] = [];

  if (!facts.sourceCount && snapshot?.sourceCount === undefined) missing.push("Source count is not defined.");
  if (!facts.displayCount && !facts.mentionsVideoWall && snapshot?.displayCount === undefined) missing.push("Display count is not defined.");
  if (!facts.distanceM && snapshot?.distanceM === undefined) missing.push("Transport distance is not defined.");
  if (!/(4k|1080p|resolution|60hz|refresh)/.test(text)) missing.push("Video format or performance target is not defined.");
  if (!facts.mentionsControl && snapshot?.controlRequired !== true) missing.push("Control requirement is not defined.");
  if (!facts.mentionsUsb && !facts.mentionsKvm && snapshot?.usbRequired !== true) missing.push("USB or KVM requirement is not defined.");
  if (!/(audio|de-embed|mic|speaker|dante)/.test(text) && !snapshot?.audioNotes) missing.push("Audio requirement is not defined.");
  if (!/(budget|cost|price|value engineered)/.test(text)) missing.push("Budget position is not defined.");

  return missing;
}

function recommendArchitecture(
  input: string,
  facts: ParsedFacts,
  snapshot?: GuruProjectSnapshot,
): { architecture: string; notes: string[]; productDirection: string[] } {
  const notes: string[] = [];
  const productDirection: string[] = [];
  const architectureHint = snapshot?.architecture?.toLowerCase() ?? "";

  if (facts.mentionsVideoWall || architectureHint.includes("video wall")) {
    notes.push("Video wall language or project architecture indicates wall-specific design logic should take priority.");
    if (facts.mentionsLed || architectureHint.includes("led")) {
      notes.push("LED workflow normally needs processor and resolution planning separate from standard flat panel wall logic.");
    }
    productDirection.push("Consider video wall workflow first.");
    productDirection.push("For non-AVoIP wall option, review SW-0206-VW.");
    productDirection.push("For flexible AVoIP wall paths, review NHD-150-RX and NHD-600-TRX based options.");
    return {
      architecture: "Video Wall",
      notes,
      productDirection,
    };
  }

  if (
    facts.mentionsAvoip ||
    architectureHint.includes("avoip") ||
    facts.mentionsMultiroom ||
    ((facts.sourceCount ?? snapshot?.sourceCount ?? 0) >= 4 &&
      (facts.displayCount ?? snapshot?.displayCount ?? 0) >= 4)
  ) {
    notes.push("Scale or distributed routing suggests AVoIP is likely the strongest fit.");
    productDirection.push("Review AVoIP architecture and encoder/decoder count.");
    productDirection.push("Check expansion, network and control requirements.");
    return {
      architecture: "AVoIP",
      notes,
      productDirection,
    };
  }

  if (
    facts.mentionsMatrix ||
    architectureHint.includes("matrix") ||
    (((facts.sourceCount ?? snapshot?.sourceCount ?? 0) > 1) &&
      ((facts.displayCount ?? snapshot?.displayCount ?? 0) > 1) &&
      ((facts.displayCount ?? snapshot?.displayCount ?? 0) <= 4) &&
      !facts.mentionsMultiroom)
  ) {
    notes.push("Multiple sources and displays in a contained room often indicate matrix or presentation switching.");
    productDirection.push("Review matrix or presentation-switching path.");
    productDirection.push("Confirm whether USB-C, wireless presentation or table connectivity is needed.");
    return {
      architecture: "Matrix / Presentation Switching",
      notes,
      productDirection,
    };
  }

  if (
    ((facts.displayCount ?? snapshot?.displayCount ?? 0) <= 2) &&
    ((facts.sourceCount ?? snapshot?.sourceCount ?? 0) <= 2) &&
    ((facts.sourceCount ?? snapshot?.sourceCount ?? 0) > 0 || (facts.displayCount ?? snapshot?.displayCount ?? 0) > 0)
  ) {
    notes.push("Small source and display counts suggest extender, switcher or simple room system logic.");
    productDirection.push("Review point-to-point extender or simple switcher path.");
    if ((facts.distanceM ?? snapshot?.distanceM ?? 0) > 20) {
      productDirection.push("Distance suggests HDBaseT or longer-reach transport should be checked.");
    }
    return {
      architecture: "Extender / Simple Room System",
      notes,
      productDirection,
    };
  }

  notes.push("Brief is not specific enough for a confident architecture recommendation.");
  productDirection.push("Start in Discovery and complete core requirement capture.");
  return {
    architecture: "Needs More Discovery",
    notes,
    productDirection,
  };
}

function buildNextSteps(contextLabel: string, architecture: string): GuruNextStep[] {
  const steps: GuruNextStep[] = [];

  if (contextLabel !== "Discovery") {
    steps.push({
      label: "Open Discovery Wizard",
      href: "/app/tools/discovery",
      reason: "Use Discovery to capture the requirement cleanly before product selection.",
    });
  }

  if (
    architecture === "AVoIP" ||
    architecture === "Matrix / Presentation Switching" ||
    architecture === "Extender / Simple Room System" ||
    architecture === "Needs More Discovery"
  ) {
    steps.push({
      label: "Open Catalogue",
      href: "/app/tools/catalog",
      reason: "Move into the product path once the technical direction is clear.",
    });
  }

  if (architecture === "Video Wall") {
    steps.push({
      label: "Open Video Wall Planner",
      href: "/app/tools/video-wall",
      reason: "Use the wall planner to model topology, layout and wall behaviour.",
    });
  }

  steps.push({
    label: "Open Proposal Builder",
    href: "/app/tools/proposal",
    reason: "Turn the technical direction into customer-facing output.",
  });

  return steps;
}

function buildPrompts(contextLabel: string, architecture: string, missingItems: string[]): string[] {
  const prompts: string[] = [];

  if (contextLabel === "Discovery") {
    prompts.push("How many sources and displays are involved?");
    prompts.push("What is the longest transport distance?");
    prompts.push("Is USB, control or audio breakaway required?");
  }

  if (contextLabel === "Catalogue") {
    prompts.push("Which WyreStorm family best matches this architecture?");
    prompts.push("Is the current path scalable if the project grows?");
  }

  if (contextLabel === "Proposal") {
    prompts.push("How should this design be explained in plain customer language?");
    prompts.push("What assumptions should be stated clearly in the proposal?");
  }

  if (architecture === "Video Wall") {
    prompts.push("Does the wall need single-canvas, multiview or per-display control?");
  }

  if (missingItems.length > 0) {
    prompts.push("Which missing inputs are blockers versus nice-to-have details?");
  }

  return prompts.slice(0, 5);
}

export function buildGuruAdvice(
  input: string,
  pathname: string,
  snapshot?: GuruProjectSnapshot,
): GuruAdvice {
  const contextLabel = detectContext(pathname);
  const facts = detectFacts(input);
  const missingItems = detectMissingItems(input, facts, snapshot);
  const recommendation = recommendArchitecture(input, facts, snapshot);
  const nextSteps = buildNextSteps(contextLabel, recommendation.architecture);
  const prompts = buildPrompts(contextLabel, recommendation.architecture, missingItems);

  let confidence: GuruConfidence = "medium";

  if (input.trim().length === 0 && !snapshot) {
    confidence = "low";
  } else if (missingItems.length <= 2) {
    confidence = "high";
  } else if (missingItems.length <= 4) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const summary =
    recommendation.architecture === "Needs More Discovery"
      ? "Guru needs a better brief before recommending a confident solution path."
      : "Guru recommends " + recommendation.architecture + " as the current best-fit direction based on the information provided.";

  return {
    contextLabel,
    summary,
    confidence,
    architecture: recommendation.architecture,
    productDirection: recommendation.productDirection,
    missingItems,
    notes: recommendation.notes,
    nextSteps,
    prompts,
  };
}