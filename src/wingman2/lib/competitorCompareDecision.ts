import { buildCompetitorDecisionEvidence } from "./competitorProductIntelligence";
export type CompareDecisionOutcome = "GOOD MATCH" | "PARTIAL MATCH" | "NO MATCH" | "VERIFY";

export type CompareDecisionProfile = {
  sku?: string;
  title?: string;
  domain?: string;
  role?: string;
  transport?: string;
  inputCount?: number;
  outputCount?: number;
  maxResolution?: string;
  chroma?: string;
  latency?: string;
  features?: Record<string, boolean | undefined>;
};

export type CompareDecisionInput = {
  competitor: CompareDecisionProfile;
  wyrestorm: CompareDecisionProfile;
  score?: number;
  evidence?: string[];
  warnings?: string[];
};

export type CompareDecisionResult = {
  outcome: CompareDecisionOutcome;
  confidence: number;
  blockers: string[];
  gaps: string[];
  matches: string[];
  verify: string[];
  summary: string;
  nextAction: string;
};

const ROLE_EQUIVALENTS: Record<string, string[]> = {
  encoder: ["transmitter", "source endpoint", "tx"],
  decoder: ["receiver", "display endpoint", "rx"],
  transmitter: ["encoder", "source endpoint", "tx"],
  receiver: ["decoder", "display endpoint", "rx"],
  transceiver: ["encoder/decoder", "trx"],
  matrix: ["matrix switcher"],
  controller: ["control processor", "control module"],
  "presentation switcher": ["presentation scaler", "room switcher", "collaboration switcher"],
  "video wall processor": ["wall processor", "videowall processor"],
  "multiview processor": ["windowing processor", "multi-view processor"],
};

const HARD_FEATURES = [
  "usbRouting",
  "usbC",
  "wireless",
  "dante",
  "aes67",
  "multiview",
  "videoWall",
  "hdbtOutput",
  "receiverKit",
  "tenGig",
  "zeroLatency",
  "lossless",
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function lower(value: unknown): string {
  return clean(value).toLowerCase();
}

function yes(value: unknown): boolean {
  return Boolean(value);
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isUnknown(value: unknown): boolean {
  const text = lower(value);
  return !text || text === "unknown" || text === "verify" || text === "n/a";
}

function normaliseRole(value: unknown): string {
  const role = lower(value);

  for (const [canonical, equivalents] of Object.entries(ROLE_EQUIVALENTS)) {
    if (role === canonical || equivalents.includes(role)) return canonical;
  }

  return role;
}

function rolesMatch(a: unknown, b: unknown): boolean {
  const left = normaliseRole(a);
  const right = normaliseRole(b);

  if (!left || !right) return false;
  if (left === right) return true;

  const leftEquivalents = ROLE_EQUIVALENTS[left] ?? [];
  const rightEquivalents = ROLE_EQUIVALENTS[right] ?? [];

  return leftEquivalents.includes(right) || rightEquivalents.includes(left);
}

function transportTokens(value: unknown): string[] {
  const text = lower(value)
    .replace(/av over ip/g, "avoip")
    .replace(/av-over-ip/g, "avoip")
    .replace(/hdbaset/g, "hdbt")
    .replace(/hdbase t/g, "hdbt")
    .replace(/usb-c/g, "usbc")
    .replace(/usb c/g, "usbc");

  return text
    .split(/[^a-z0-9]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 1 && !["and", "with", "plus", "output", "outputs", "input", "inputs"].includes(item));
}

function transportMatches(competitorTransport: unknown, wyrestormTransport: unknown): boolean {
  const competitor = transportTokens(competitorTransport);
  const wyrestorm = new Set(transportTokens(wyrestormTransport));

  if (!competitor.length || !wyrestorm.size) return false;

  return competitor.every((token) => wyrestorm.has(token));
}

function resolutionRank(value: unknown): number {
  const text = lower(value);

  if (/8k|4320/.test(text)) return 5;
  if (/4k60|2160p60|uhd.*60/.test(text)) return 4;
  if (/4k30|2160p30|uhd/.test(text)) return 3;
  if (/1080p|1920/.test(text)) return 2;
  if (/720p/.test(text)) return 1;

  return 0;
}

function featureLabel(key: string): string {
  const labels: Record<string, string> = {
    usbRouting: "USB/KVM routing",
    usbC: "USB-C",
    wireless: "wireless presentation",
    dante: "Dante",
    aes67: "AES67",
    multiview: "multiview",
    videoWall: "video wall",
    hdbtOutput: "HDBaseT output",
    receiverKit: "receiver kit",
    tenGig: "10G network class",
    zeroLatency: "zero latency",
    lossless: "lossless transport",
  };

  return labels[key] || key;
}

function addUnique(target: string[], value: string): void {
  const cleanValue = clean(value);

  if (!cleanValue || target.includes(cleanValue)) return;

  target.push(cleanValue);
}

function countNoun(label: string): string {
  const normalised = lower(label);

  if (normalised === "input") return "inputs";
  if (normalised === "output") return "outputs";

  return normalised + "s";
}

function compareCounts(
  label: string,
  competitorValue: unknown,
  wyrestormValue: unknown,
  blockers: string[],
  gaps: string[],
  matches: string[],
  verify: string[],
): void {
  const competitorCount = numberValue(competitorValue);
  const wyrestormCount = numberValue(wyrestormValue);
  const noun = countNoun(label);

  if (competitorCount === null && wyrestormCount === null) {
    addUnique(verify, label + " count unknown for both products.");
    return;
  }

  if (competitorCount !== null && wyrestormCount === null) {
    addUnique(gaps, "WyreStorm candidate has unknown " + noun + " while competitor requires " + competitorCount + ".");
    return;
  }

  if (competitorCount === null && wyrestormCount !== null) {
    addUnique(verify, "Competitor " + noun + " unknown; WyreStorm candidate provides " + wyrestormCount + ".");
    return;
  }

  if (competitorCount === null || wyrestormCount === null) {
    addUnique(verify, label + " count needs verification.");
    return;
  }

  if (wyrestormCount < competitorCount) {
    addUnique(blockers, "WyreStorm candidate has fewer " + noun + " (" + wyrestormCount + ") than competitor (" + competitorCount + ").");
    return;
  }

  if (wyrestormCount > competitorCount) {
    addUnique(matches, "WyreStorm candidate exceeds competitor " + noun + ".");
    return;
  }

  addUnique(matches, label + " count matches.");
}

function scoreConfidence(input: CompareDecisionInput, blockers: string[], gaps: string[], verify: string[]): number {
  const base = Number.isFinite(Number(input.score)) ? Number(input.score) : 72;
  const blockerPenalty = blockers.length * 28;
  const gapPenalty = gaps.length * 11;
  const verifyPenalty = verify.length * 4;

  return Math.max(5, Math.min(98, Math.round(base - blockerPenalty - gapPenalty - verifyPenalty)));
}

function summaryFor(outcome: CompareDecisionOutcome, input: CompareDecisionInput): string {
  const competitor = clean(input.competitor.sku || input.competitor.title || "competitor product");
  const wyrestorm = clean(input.wyrestorm.sku || input.wyrestorm.title || "WyreStorm candidate");

  if (outcome === "GOOD MATCH") {
    return wyrestorm + " is a credible comparison candidate for " + competitor + " based on product class, role, transport and critical capability checks.";
  }

  if (outcome === "PARTIAL MATCH") {
    return wyrestorm + " may be a usable alternative to " + competitor + ", but the differences must be explained before it is presented as an equivalent.";
  }

  if (outcome === "NO MATCH") {
    return wyrestorm + " should not be presented as an equivalent to " + competitor + " because at least one blocking product-class, role, transport, capacity or critical-feature issue exists.";
  }

  return "More evidence is required before Wingman can classify the comparison between " + wyrestorm + " and " + competitor + ".";
}

function nextActionFor(outcome: CompareDecisionOutcome): string {
  if (outcome === "GOOD MATCH") return "Use as the primary comparison candidate, then validate datasheet, lifecycle, region and accessory dependencies.";
  if (outcome === "PARTIAL MATCH") return "Show the candidate as a partial alternative and make the functional differences visible before proposal use.";
  if (outcome === "NO MATCH") return "Do not recommend as an equivalent; choose another WyreStorm family or classify the requirement as no direct match.";
  return "Add datasheet/product URL, I/O counts, transport type, role and critical feature evidence.";
}

export function classifyCompetitorCompareDecision(input: CompareDecisionInput): CompareDecisionResult {
  const blockers: string[] = [];
  const gaps: string[] = [];
  const matches: string[] = [];
  const verify: string[] = [];

  const competitor = input.competitor;
  const wyrestorm = input.wyrestorm;
  const competitorIntelligence = buildCompetitorDecisionEvidence(competitor);

  if (isUnknown(competitor.domain) || isUnknown(wyrestorm.domain)) {
    addUnique(verify, "Technology class needs verification.");
  } else if (lower(competitor.domain) !== lower(wyrestorm.domain)) {
    addUnique(blockers, "Technology class mismatch: competitor is " + clean(competitor.domain) + ", WyreStorm candidate is " + clean(wyrestorm.domain) + ".");
  } else {
    addUnique(matches, "Technology class matches.");
  }

  if (isUnknown(competitor.role) || isUnknown(wyrestorm.role)) {
    addUnique(verify, "Product role needs verification.");
  } else if (!rolesMatch(competitor.role, wyrestorm.role)) {
    addUnique(blockers, "Product role mismatch: competitor is " + clean(competitor.role) + ", WyreStorm candidate is " + clean(wyrestorm.role) + ".");
  } else {
    addUnique(matches, "Product role matches.");
  }

  if (isUnknown(competitor.transport) || isUnknown(wyrestorm.transport)) {
    addUnique(verify, "Transport needs verification.");
  } else if (!transportMatches(competitor.transport, wyrestorm.transport)) {
    addUnique(blockers, "Transport mismatch: competitor uses " + clean(competitor.transport) + ", WyreStorm candidate uses " + clean(wyrestorm.transport) + ".");
  } else {
    addUnique(matches, "Transport path matches required competitor transport.");
  }

  compareCounts("Input", competitor.inputCount, wyrestorm.inputCount, blockers, gaps, matches, verify);
  compareCounts("Output", competitor.outputCount, wyrestorm.outputCount, blockers, gaps, matches, verify);

  const competitorResolution = resolutionRank(competitor.maxResolution);
  const wyrestormResolution = resolutionRank(wyrestorm.maxResolution);

  if (competitorResolution > 0 && wyrestormResolution > 0) {
    if (wyrestormResolution < competitorResolution) {
      addUnique(blockers, "WyreStorm candidate has lower stated resolution capability.");
    } else {
      addUnique(matches, "Resolution capability meets or exceeds competitor.");
    }
  } else {
    addUnique(verify, "Resolution capability needs verification.");
  }

  for (const feature of HARD_FEATURES) {
    const competitorHas = yes(competitor.features?.[feature]);
    const wyrestormHas = yes(wyrestorm.features?.[feature]);

    if (competitorHas && !wyrestormHas) {
      addUnique(gaps, "Competitor has " + featureLabel(feature) + " but WyreStorm candidate does not show it.");
    }

    if (competitorHas && wyrestormHas) {
      addUnique(matches, featureLabel(feature) + " matches.");
    }
  }

  const warningItems = input.warnings ?? [];

  warningItems.forEach((warning) => addUnique(verify, "Compare warning: " + warning));

  
  addUnique(verify, "Competitor intelligence tier: " + competitorIntelligence.tier + ".");
  addUnique(verify, "Competitor intelligence readiness: " + competitorIntelligence.readiness + ".");

  for (const fact of competitorIntelligence.missingFacts) {
    addUnique(verify, "Competitor data missing: " + fact + ".");
  }

  for (const reason of competitorIntelligence.whyNotDirectEquivalent) {
    addUnique(gaps, "Why not direct equivalent: " + reason);
  }

const confidence = Math.max(5, scoreConfidence(input, blockers, gaps, verify) - competitorIntelligence.confidencePenalty);

  let outcome: CompareDecisionOutcome = "VERIFY";

  if (blockers.length > 0) {
    outcome = "NO MATCH";
  } else if (confidence >= 82 && gaps.length === 0 && verify.length <= 2) {
    outcome = "GOOD MATCH";
  } else if (confidence >= 55 && gaps.length <= 4) {
    outcome = "PARTIAL MATCH";
  }

  if (verify.length >= 5 && outcome !== "NO MATCH") {
    outcome = "VERIFY";
  }

  return {
    outcome,
    confidence,
    blockers,
    gaps,
    matches,
    verify,
    summary: summaryFor(outcome, input),
    nextAction: nextActionFor(outcome),
  };
}
