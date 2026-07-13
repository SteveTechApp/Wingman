import { buildCompetitorDecisionEvidence } from "./competitorProductIntelligence";
export type CompareDecisionOutcome = "GOOD MATCH" | "PARTIAL MATCH" | "NO MATCH" | "VERIFY";

export type CompareSpecFacts = {
  hdmiInputs?: number;
  hdmiOutputs?: number;
  hdmiVersion?: string;
  hdcpVersion?: string;
  displayPortInputs?: number;
  displayPortOutputs?: number;
  dviInputs?: number;
  dviOutputs?: number;
  vgaInputs?: number;
  vgaOutputs?: number;
  sdiInputs?: number;
  sdiOutputs?: number;
  compositeInputs?: number;
  compositeOutputs?: number;
  componentInputs?: number;
  componentOutputs?: number;
  usbHostPorts?: number;
  usbDevicePorts?: number;
  usbTotalPorts?: number;
  usbCPorts?: number;
  usbStandard?: string;
  audioInputs?: number;
  audioOutputs?: number;
  networkPorts?: number;
  controlPorts?: number;
  rs232?: boolean;
  ir?: boolean;
  cec?: boolean;
  relay?: boolean;
  gpio?: boolean;
  ethernetControl?: boolean;
  audioEmbed?: boolean;
  audioDeEmbed?: boolean;
  analogAudio?: boolean;
  arc?: boolean;
  earc?: boolean;
  dante?: boolean;
  dedicatedDantePort?: boolean;
  aes67?: boolean;
  wirelessCasting?: boolean;
  castingDongleSupport?: string;
  poe?: boolean;
  poc?: boolean;
  poh?: boolean;
  powerDelivery?: boolean;
  internalPsu?: boolean;
  externalPsu?: boolean;
  powerSupply?: string;
  gpioPortCount?: number;
  relayPortCount?: number;
  hdbasetVersion?: string;
  hdbasetClass?: string;
  hdbasetDistance?: number;
  networkSpeed?: string;
  networkSpeedConfidence?: "confirmed" | "inferred" | "verify";
  networkSpeedEvidence?: string;
  avoipChip?: string | null;
  avoipChipStatus?: "known" | "not-publicly-confirmed" | "verify";
  avoipCodec?: string;
  ndiVersion?: string;
  ptzProtocol?: string;
  wirelessStandard?: string;
  cableCategory?: string;
};

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
  specs?: CompareSpecFacts;
  sourceUrl?: string;
  sourceTier?: "verified-profile" | "official-structured" | "text-inferred" | "missing";
  sourceLabel?: string;
  profileEvidence?: string[];
  profileWarnings?: string[];
  specTier?: string;
  readiness?: string;
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
  transceiver: ["encoder", "decoder", "transmitter", "receiver", "encoder/decoder", "trx"],
  matrix: ["matrix switcher"],
  "distribution amplifier": ["splitter", "hdmi splitter", "distribution amp"],
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
  "control",
  "poe",
  "poc",
  "poh",
  "audioDeEmbed",
  "audioEmbed",
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

type CompareNetworkClass = "1g" | "10g";
type CompareNetworkConfidence = "confirmed" | "inferred" | "verify";

type CompareNetworkClassResult = {
  value: CompareNetworkClass | null;
  confidence: CompareNetworkConfidence;
  evidence: string;
};

function normaliseNetworkConfidence(value: unknown): CompareNetworkConfidence {
  const confidence = lower(value);
  if (confidence === "confirmed" || confidence === "inferred") return confidence;
  return "verify";
}

function compareNetworkClass(profile: CompareDecisionProfile): CompareNetworkClassResult {
  const declaredSpeed = lower(profile.specs?.networkSpeed);
  const transport = lower(profile.transport);
  const declaredConfidence = profile.specs?.networkSpeedConfidence
    ? normaliseNetworkConfidence(profile.specs.networkSpeedConfidence)
    : "confirmed";
  const declaredEvidence = clean(profile.specs?.networkSpeedEvidence);

  const declaredText = [declaredSpeed, transport].filter(Boolean).join(" ");

  if (/\b10\s*g(?:be|bit ethernet|igabit ethernet)\b|\b10gbe\b|\b10-gigabit ethernet\b|\b10\s*gb(?:e|ps)?\s+(?:managed\s+)?network\b/.test(declaredText)) {
    return {
      value: "10g",
      confidence: declaredConfidence,
      evidence: declaredEvidence || "Explicit 10GbE network requirement.",
    };
  }

  if (/\b1\s*g(?:be|bit ethernet|igabit ethernet)\b|\b1gbe\b|\bgigabit ethernet\b|\b1000base(?:-t|x)?\b|\b1\s*gb(?:e|ps)?\s+(?:managed\s+)?network\b/.test(declaredText)) {
    return {
      value: "1g",
      confidence: declaredConfidence,
      evidence: declaredEvidence || "Explicit 1GbE network requirement.",
    };
  }

  const codec = lower(profile.specs?.avoipCodec || profile.transport);

  if (/\bipmx\b/.test(codec)) {
    return {
      value: null,
      confidence: "verify",
      evidence: "IPMX can be deployed across different network rates; confirm the product requirement.",
    };
  }

  if (/\bsdvoe\b/.test(codec)) {
    return {
      value: "10g",
      confidence: "inferred",
      evidence: "Inferred from SDVoE.",
    };
  }

  if (/jpeg\s*-?\s*2000|jpeg2000|jpeg\s*-?\s*xs|jpegxs|h\.?26[45]|hevc|avc/.test(codec)) {
    const codecLabel = clean(profile.specs?.avoipCodec) || "the stated AVoIP codec";
    return {
      value: "1g",
      confidence: "inferred",
      evidence: `Inferred from ${codecLabel}.`,
    };
  }

  return {
    value: null,
    confidence: "verify",
    evidence: "Network class is not stated and cannot be safely inferred.",
  };
}

function networkClassText(result: CompareNetworkClassResult): string {
  if (!result.value) return "network class not verified";
  const speed = result.value === "10g" ? "10GbE" : "1GbE";
  return `${speed} (${result.confidence})`;
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
    control: "control connections",
    poe: "PoE / remote power",
    poc: "PoC",
    poh: "PoH",
    audioDeEmbed: "audio de-embed",
    audioEmbed: "audio embed",
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
  info: string[],
): void {
  const competitorCount = numberValue(competitorValue);
  const wyrestormCount = numberValue(wyrestormValue);
  const noun = countNoun(label);

  if (competitorCount === null && wyrestormCount === null) {
    // Neither side states a fixed count (normal for AVoIP / single-stream
    // endpoints). This is not an actionable difference, so it is recorded as an
    // informational note and must not block a GOOD MATCH.
    addUnique(info, label + " count not stated for either product.");
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
  const wyrestormSourcePenalty = sourceTierPenalty(input.wyrestorm);
  const competitorSourcePenalty = competitorTierPenalty(input.competitor);

  return Math.max(5, Math.min(98, Math.round(base - blockerPenalty - gapPenalty - verifyPenalty - wyrestormSourcePenalty - competitorSourcePenalty)));
}

function sourceTierPenalty(profile: CompareDecisionProfile): number {
  if (profile.sourceTier === "verified-profile") return 0;
  if (profile.sourceTier === "official-structured") return (profile.profileWarnings?.length ?? 0) > 0 ? 8 : 3;
  if (profile.sourceTier === "text-inferred") return 14;
  if (profile.sourceTier === "missing") return 24;
  return 8;
}

function competitorTierPenalty(profile: CompareDecisionProfile): number {
  if (profile.specTier === "verified-profile") return 0;
  if (profile.specTier === "family-rule") return 12;
  if (profile.specTier === "sku-only") return 26;
  return 8;
}

function profileSourceLabel(profile: CompareDecisionProfile, fallback: string): string {
  if (profile.sourceLabel) return profile.sourceLabel;
  if (profile.sourceTier === "verified-profile") return fallback + " verified profile";
  if (profile.sourceTier === "official-structured") return fallback + " official-page extracted facts";
  if (profile.sourceTier === "text-inferred") return fallback + " text-inferred facts";
  if (profile.sourceTier === "missing") return fallback + " facts missing";
  return fallback + " evidence tier unknown";
}

function hasTrustedCompetitorProfile(profile: CompareDecisionProfile): boolean {
  return profile.specTier === "verified-profile";
}

function hasUsableWyrestormProfile(profile: CompareDecisionProfile): boolean {
  if (profile.readiness && profile.readiness !== "compare-ready") return false;

  return profile.sourceTier === "verified-profile" ||
    (profile.sourceTier === "official-structured" && (profile.profileWarnings?.length ?? 0) <= 1);
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
  // Administrative / evidence-tier notes: surfaced for transparency but excluded
  // from the GOOD MATCH gate and the confidence penalty, because they are always
  // present and previously made GOOD MATCH unreachable even with strong data.
  const info: string[] = [];

  const competitor = input.competitor;
  const wyrestorm = input.wyrestorm;
  const competitorTrusted = hasTrustedCompetitorProfile(competitor);
  const competitorIntelligence = buildCompetitorDecisionEvidence(competitor);

  const domainKnown = !isUnknown(competitor.domain) && !isUnknown(wyrestorm.domain);
  const domainMatches = domainKnown && lower(competitor.domain) === lower(wyrestorm.domain);

  if (!domainKnown) {
    addUnique(verify, "Technology class needs verification.");
  } else if (!domainMatches) {
    addUnique(blockers, "Technology class mismatch: competitor is " + clean(competitor.domain) + ", WyreStorm candidate is " + clean(wyrestorm.domain) + ".");
  } else {
    addUnique(matches, "Technology class matches.");
  }

  const roleKnown = !isUnknown(competitor.role) && !isUnknown(wyrestorm.role);
  const roleMatchesFlag = roleKnown && rolesMatch(competitor.role, wyrestorm.role);

  if (!roleKnown) {
    addUnique(verify, "Product role needs verification.");
  } else if (!roleMatchesFlag) {
    addUnique(blockers, "Product role mismatch: competitor is " + clean(competitor.role) + ", WyreStorm candidate is " + clean(wyrestorm.role) + ".");
  } else {
    addUnique(matches, "Product role matches.");
  }

  const competitorNetworkClass = compareNetworkClass(competitor);
  const wyrestormNetworkClass = compareNetworkClass(wyrestorm);
  const networkClassMismatch =
    competitorNetworkClass.value !== null &&
    wyrestormNetworkClass.value !== null &&
    competitorNetworkClass.value !== wyrestormNetworkClass.value;
  const networkClassConfirmedMismatch =
    networkClassMismatch &&
    competitorNetworkClass.confidence === "confirmed" &&
    wyrestormNetworkClass.confidence === "confirmed";

  if (networkClassConfirmedMismatch) {
    addUnique(
      blockers,
      "Network class mismatch: competitor requires " +
        networkClassText(competitorNetworkClass) +
        ", WyreStorm candidate is " +
        networkClassText(wyrestormNetworkClass) +
        ".",
    );
  } else if (networkClassMismatch) {
    addUnique(
      gaps,
      "Potential network class mismatch: competitor is " +
        networkClassText(competitorNetworkClass) +
        ", WyreStorm candidate is " +
        networkClassText(wyrestormNetworkClass) +
        ".",
    );
    addUnique(
      verify,
      "At least one network class is inferred; confirm the manufacturer network requirement before approval.",
    );
  } else {
    if (competitorNetworkClass.value && wyrestormNetworkClass.value) {
      addUnique(
        matches,
        "Network class aligns: " +
          networkClassText(competitorNetworkClass) +
          " versus " +
          networkClassText(wyrestormNetworkClass) +
          ".",
      );
    } else if (
      lower(competitor.domain) === "avoip" ||
      lower(wyrestorm.domain) === "avoip"
    ) {
      addUnique(verify, "AVoIP network class needs verification.");
    }

    if (isUnknown(competitor.transport) || isUnknown(wyrestorm.transport)) {
      addUnique(verify, "Transport needs verification.");
    } else if (!transportMatches(competitor.transport, wyrestorm.transport)) {
      // Transport wording is brand-specific. If technology class and role agree,
      // a wording difference remains a review item rather than a hard rejection.
      if (domainMatches && roleMatchesFlag) {
        addUnique(gaps, "Transport wording differs: competitor uses " + clean(competitor.transport) + ", WyreStorm candidate uses " + clean(wyrestorm.transport) + ". Confirm the underlying transport is compatible.");
      } else {
        addUnique(blockers, "Transport mismatch: competitor uses " + clean(competitor.transport) + ", WyreStorm candidate uses " + clean(wyrestorm.transport) + ".");
      }
    } else {
      addUnique(matches, "Transport path matches required competitor transport.");
    }
  }

  // If Wingman has NO classification signal at all for the competitor product -
  // no domain, no role, and no transport - there is nothing to compare against,
  // and no specific WyreStorm SKU should be presented as even a partial match.
  // Callers are expected to backfill domain/role/transport from any classifier
  // they have available (e.g. keyword/tag matching on free text) before calling
  // this function, so reaching this branch means every available signal - both
  // the curated/structured lookup AND any free-text fallback - came up empty.
  // Without this gate, an unrecognised bare SKU (no curated fingerprint, no
  // keyword evidence anywhere) could still reach PARTIAL MATCH purely because
  // the WyreStorm side of the comparison happens to have good data.
  const competitorCompletelyUnclassified =
    isUnknown(competitor.domain) && isUnknown(competitor.role) && isUnknown(competitor.transport);

  if (competitorCompletelyUnclassified) {
    addUnique(blockers, "Competitor product could not be classified at all (no technology class, role or transport evidence) - run a live lookup or confirm the product type before recommending any WyreStorm SKU.");
  }

  // Single-stream endpoints (encoder/decoder/transceiver/transmitter/receiver) do
  // not have a meaningful fixed I/O count, so a count comparison there only creates
  // false gaps. Counts are compared for matrices/switchers, where they matter.
  const endpointRoles = new Set(["encoder", "decoder", "transceiver", "transmitter", "receiver"]);
  const endpointComparison =
    endpointRoles.has(normaliseRole(competitor.role)) || endpointRoles.has(normaliseRole(wyrestorm.role));

  if (endpointComparison) {
    addUnique(info, "Single-stream endpoint: fixed input/output count comparison not applicable.");
  } else {
    compareCounts("Input", competitor.inputCount, wyrestorm.inputCount, blockers, gaps, matches, verify, info);
    compareCounts("Output", competitor.outputCount, wyrestorm.outputCount, blockers, gaps, matches, verify, info);
  }

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

  addUnique(info, "WyreStorm evidence tier: " + profileSourceLabel(wyrestorm, "WyreStorm") + ".");

  for (const warning of wyrestorm.profileWarnings ?? []) {
    addUnique(verify, "WyreStorm data warning: " + warning);
  }

  for (const evidence of wyrestorm.profileEvidence ?? []) {
    addUnique(matches, "WyreStorm evidence: " + evidence);
  }

  addUnique(info, "Competitor intelligence tier: " + competitorIntelligence.tier + ".");
  addUnique(info, "Competitor intelligence readiness: " + competitorIntelligence.readiness + ".");

  // A verified competitor profile already carries real specs, so the heuristic
  // family-rule "missing facts" / "why not equivalent" notes (and their penalty)
  // are applied only when we do NOT have a verified profile. This stops verified
  // comparisons being flooded with false gaps and an unwarranted penalty.
  if (!competitorTrusted) {
    for (const fact of competitorIntelligence.missingFacts) {
      addUnique(verify, "Competitor data missing: " + fact + ".");
    }

    for (const reason of competitorIntelligence.whyNotDirectEquivalent) {
      addUnique(gaps, "Why not direct equivalent: " + reason);
    }
  } else {
    addUnique(matches, "Competitor profile: verified structured specs.");
  }

  const competitorPenalty = competitorTrusted ? 0 : competitorIntelligence.confidencePenalty;
  // Confidence and the GOOD MATCH gate are scored on substantive findings only;
  // administrative `info` notes are surfaced but never penalise or block.
  const confidence = Math.max(5, scoreConfidence(input, blockers, gaps, verify) - competitorPenalty);
  const trustedCompetitor = competitorTrusted;
  const usableWyrestorm = hasUsableWyrestormProfile(wyrestorm);

  if (!trustedCompetitor) {
    addUnique(verify, "Competitor technical profile is not verified; automatic equivalence is blocked.");
  }

  if (!usableWyrestorm) {
    addUnique(verify, "WyreStorm technical profile is incomplete or review-only; automatic equivalence is blocked.");
  }

  let outcome: CompareDecisionOutcome = "VERIFY";

  if (blockers.length > 0) {
    outcome = "NO MATCH";
  } else if (trustedCompetitor && usableWyrestorm && confidence >= 78 && gaps.length === 0 && verify.length <= 3) {
    outcome = "GOOD MATCH";
  } else if (confidence >= 55 && gaps.length <= 4 && trustedCompetitor && usableWyrestorm) {
    outcome = "PARTIAL MATCH";
  }

  if ((!trustedCompetitor || !usableWyrestorm || verify.length >= 5) && outcome !== "NO MATCH" && outcome !== "PARTIAL MATCH") {
    outcome = "VERIFY";
  }

  return {
    outcome,
    confidence,
    blockers,
    gaps,
    matches,
    verify: verify.concat(info),
    summary: summaryFor(outcome, input),
    nextAction: nextActionFor(outcome),
  };
}
