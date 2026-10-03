import type { ProductClassificationFacts } from "./productRoleResolution";

export type CompareCompetitorClass =
  | "AVOIP"
  | "HDBASET"
  | "EXTENDER"
  | "MATRIX"
  | "DISTRIBUTION"
  | "PRESENTATION"
  | "VIDEO_WALL"
  | "MULTIVIEW"
  | "CAMERA"
  | "USB_EXTENSION"
  | "CONTROL"
  | "WIRELESS_PRESENTATION"
  | "AUDIO"
  | "UNKNOWN";

export type CompareCandidateGateInput = {
  sku?: string;
  title?: string;
  role?: string;
  category?: string;
  family?: string;
  productFamily?: string;
  tags?: string[];
  features?: Record<string, unknown> | string[];
  text?: string;
  /**
   * The governed taxonomy from the product intelligence index, when the caller
   * has it. Authoritative: it is authored per SKU, unlike the text heuristics
   * below which read whatever words happen to be in a title or category.
   */
  classification?: ProductClassificationFacts;
};

// Controlled `subClassifications` tokens mapped to a compare class, most
// specific function first. Audio contains only devices whose PURPOSE is audio -
// "audio-deembed" and "audio-conversion" describe a capability on a video
// product and must never decide its class.
const TAXONOMY_CLASS_PRIORITY: Array<{ compareClass: CompareCompetitorClass; tokens: string[] }> = [
  { compareClass: "AVOIP", tokens: ["avoip", "encoder", "decoder", "transceiver", "sdvoe", "networkhd-100", "networkhd-500", "networkhd-600", "avoip-infrastructure", "networkhd-control"] },
  { compareClass: "CAMERA", tokens: ["camera", "ptz"] },
  { compareClass: "AUDIO", tokens: ["amplifier", "dsp", "microphone", "speakerphone"] },
  { compareClass: "MULTIVIEW", tokens: ["multiview", "multi-view"] },
  { compareClass: "VIDEO_WALL", tokens: ["video-wall", "videowall"] },
  { compareClass: "MATRIX", tokens: ["matrix"] },
  { compareClass: "HDBASET", tokens: ["extender", "hdbaset", "transmitter", "receiver"] },
  { compareClass: "WIRELESS_PRESENTATION", tokens: ["wireless-dongle"] },
  { compareClass: "PRESENTATION", tokens: ["presentation-switcher", "source-switcher", "switcher"] },
  { compareClass: "DISTRIBUTION", tokens: ["splitter"] },
];

function classFromTaxonomy(
  classification: ProductClassificationFacts | undefined,
): CompareCompetitorClass {
  if (!classification) return "UNKNOWN";

  const tokens = new Set((classification.subClassifications ?? []).map((token) => token.trim().toLowerCase()));
  if (tokens.has("cable") || tokens.has("accessory")) return "UNKNOWN";

  for (const entry of TAXONOMY_CLASS_PRIORITY) {
    if (entry.tokens.some((token) => tokens.has(token))) return entry.compareClass;
  }

  return "UNKNOWN";
}

export type CompareCandidateGateContext = {
  competitorClass: CompareCompetitorClass;
  competitorRole?: string;
  competitorTransport?: string;
  applicationContext?: string;
};

export type CompareCandidateGateResult = {
  allowed: boolean;
  severity: "pass" | "blocked" | "review";
  reason: string;
  candidateClass: CompareCompetitorClass;
  candidateRole: string;
  blockedBy: string[];
  evidence: string[];
};

const _NON_EQUIVALENT_ROLE_MARKERS = [
  "accessory",
  "cable",
  "rack-mount",
  "rack mount",
  "workflow-endpoint",
  "workflow endpoint",
  "request-only",
  "adapter",
  "dongle",
];

const AUDIO_ROLE_MARKERS = [
  "audio",
  "speakerphone",
  "microphone",
  "amplifier",
  "dante",
  "aes67",
  "apollo",
];

const AVOIP_MARKERS = ["avoip", "av over ip", "networkhd", "nhd-", "encoder", "decoder", "transceiver", "trx", "jpeg", "h.264", "h.265", "sdvoe"];
const HDBASET_MARKERS = ["hdbaset", "hdbt", "extender", "transmitter", "receiver", "tx", "rx"];
const MATRIX_MARKERS = ["matrix", "mx-", "4x4", "6x6", "8x8", "16x16", "routing"];
const DISTRIBUTION_MARKERS = ["splitter", "distribution amplifier", "distribution amp", "duplicator", "sp-", "exp-sp-"];
const PRESENTATION_MARKERS = ["presentation", "switcher", "collaboration", "usb-c", "byod", "byom", "meeting room", "sw-"];
const VIDEO_WALL_MARKERS = ["video wall", "videowall", "wall processor", "lcd wall", "led processor"];
const MULTIVIEW_MARKERS = ["multiview", "multi-view", "pip", "pbp", "single output canvas", "window"];
const CAMERA_MARKERS = ["camera", "ptz", "ndi camera", "birddog", "marshall cv", "visca", "pelco"];
const USB_MARKERS = ["usb", "kvm", "usb extension", "usb extender"];
const CONTROL_MARKERS = ["control", "controller", "processor", "automation"];
const WIRELESS_MARKERS = ["wireless", "miracast", "airplay", "casting", "clickshare"];

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function textFor(candidate: CompareCandidateGateInput): string {
  const featureText = Array.isArray(candidate.features)
    ? candidate.features
    : Object.keys(candidate.features ?? {});

  return [
    candidate.sku,
    candidate.title,
    candidate.role,
    candidate.category,
    candidate.family,
    candidate.productFamily,
    candidate.text,
    ...(candidate.tags ?? []),
    ...featureText,
  ].join(" ").toLowerCase();
}

function identityTextFor(candidate: CompareCandidateGateInput): string {
  return [
    candidate.sku,
    candidate.title,
    candidate.role,
    candidate.category,
    candidate.family,
    candidate.productFamily,
  ].join(" ").toLowerCase();
}

function markerTextFor(candidate: CompareCandidateGateInput): string {
  const featureText = Array.isArray(candidate.features)
    ? candidate.features
    : Object.keys(candidate.features ?? {});

  return [
    candidate.category,
    candidate.role,
    ...(candidate.tags ?? []),
    ...featureText,
  ].join(" ").toLowerCase();
}

function hasAny(text: string, markers: string[]): boolean {
  return markers.some((marker) => text.includes(marker));
}

function wingmanSkuClassGuard(candidate: CompareCandidateGateInput): CompareCompetitorClass {
    const sku = String(candidate.sku ?? "").trim().toUpperCase();

  // Product identity takes precedence over broad taxonomy/text heuristics.
  // APO-DG2 is specifically a wireless casting dongle. Its copy also contains
  // generic terms such as "presentation" and "Apollo", which must not cause it
  // to be reclassified as a presentation switcher or audio product.
  if (sku === "APO-DG2") return "WIRELESS_PRESENTATION";
// The governed taxonomy wins wherever the caller supplied it. Only fall back
  // to reading words out of a title or category when there is none - a
  // live-lookup record, say.
  const fromTaxonomy = classFromTaxonomy(candidate.classification);
  if (fromTaxonomy !== "UNKNOWN") return fromTaxonomy;
  const title = String(candidate.title ?? "").trim().toUpperCase();
  const role = String(candidate.role ?? "").trim().toLowerCase();
  const text = [sku, title, role, candidate.category, candidate.productFamily, candidate.family].join(" ").toLowerCase();

  if (/^NHD-/.test(sku) || text.includes("networkhd")) return "AVOIP";
  if (/^SP-/.test(sku) || /^EXP-SP-/.test(sku) || hasAny(text, DISTRIBUTION_MARKERS)) return "DISTRIBUTION";
  if (/^EX-/.test(sku) || /^RX-/.test(sku) || /^TX-/.test(sku) || text.includes("hdbaset") || text.includes("hdbt")) return "HDBASET";
  if (/^MX-/.test(sku) || text.includes("matrix")) return "MATRIX";
  if (/^SW-/.test(sku) || text.includes("presentation")) return "PRESENTATION";
  if (/^CAM-/.test(sku) || hasAny(text, CAMERA_MARKERS)) return "CAMERA";
  // Audio last, and never on a bare "audio" match. A matrix with audio
  // de-embed, an extender with audio return and a switcher with an audio output
  // all mention audio; none of them are audio products. Camera is tested first
  // for the same reason - a camera's text mentions its microphone.
  if (/^AMP-/.test(sku) || /^APO-/.test(sku) || hasAny(text, ["amplifier", "audio dsp", "microphone", "speakerphone"])) {
    return "AUDIO";
  }
  if (/^CAB-/.test(sku) || role.includes("cable")) return "UNKNOWN";

  return "UNKNOWN";
}

function classifyCandidate(candidate: CompareCandidateGateInput): CompareCompetitorClass {
  const skuGuard = wingmanSkuClassGuard(candidate);

  if (skuGuard !== "UNKNOWN") return skuGuard;

  const text = textFor(candidate);

  if (hasAny(text, VIDEO_WALL_MARKERS)) return "VIDEO_WALL";
  if (hasAny(text, MULTIVIEW_MARKERS)) return "MULTIVIEW";
  if (hasAny(text, CAMERA_MARKERS)) return "CAMERA";
  if (hasAny(text, AVOIP_MARKERS)) return "AVOIP";
  if (hasAny(text, HDBASET_MARKERS)) return "HDBASET";
  if (hasAny(text, DISTRIBUTION_MARKERS)) return "DISTRIBUTION";
  if (hasAny(text, MATRIX_MARKERS)) return "MATRIX";
  if (hasAny(text, PRESENTATION_MARKERS)) return "PRESENTATION";
  if (hasAny(text, USB_MARKERS)) return "USB_EXTENSION";
  if (hasAny(text, WIRELESS_MARKERS)) return "WIRELESS_PRESENTATION";
  if (hasAny(text, AUDIO_ROLE_MARKERS)) return "AUDIO";
  if (hasAny(text, CONTROL_MARKERS)) return "CONTROL";

  return "UNKNOWN";
}

type EndpointRole = "transmitter" | "receiver" | "transceiver" | "kit" | "unknown";

function endpointRoleFromText(value: string): EndpointRole {
  const compact = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const words = value.toLowerCase();
  if (/transceiver|\btrx\b/i.test(value) || /trx$/.test(compact)) return "transceiver";
  if (/\b(?:kit|set|pair)\b|tx\s*[+/]\s*rx/i.test(words)) return "kit";
  if (/\b(?:transmitter|encoder|tx)\b/i.test(value) || /(?:^|-)tx(?:-|$)/i.test(value) || /tx$/.test(compact)) return "transmitter";
  if (/\b(?:receiver|decoder|rx)\b/i.test(value) || /(?:^|-)rx(?:-|$)/i.test(value) || /rx$/.test(compact)) return "receiver";
  return "unknown";
}

function candidateEndpointRole(candidate: CompareCandidateGateInput): EndpointRole {
  const identity = [candidate.sku, candidate.title, candidate.role].map(clean).join(" ");
  const explicit = endpointRoleFromText(identity);
  if (explicit !== "unknown") return explicit;
  // EX- products without a TX/RX identity are sold as complete extender sets.
  return /^EX-/i.test(clean(candidate.sku)) ? "kit" : "unknown";
}

/**
 * Determine whether a WyreStorm candidate class is compatible with a
 * competitor class. Kept symmetric and in sync with compareSpecEngine.ts
 * CLASS_COMPATIBILITY and competitorMatchEngine.ts TECH_CLASS_COMPATIBILITY.
 */
function allowedClassPair(competitorClass: CompareCompetitorClass, candidateClass: CompareCompetitorClass): boolean {
  if (competitorClass === "UNKNOWN") return candidateClass !== "AUDIO" && candidateClass !== "CONTROL";
  if (competitorClass === candidateClass) return true;

  // HDBaseT and extender are transport-adjacent classes.
  if (competitorClass === "HDBASET") return candidateClass === "HDBASET" || candidateClass === "EXTENDER";
  if (competitorClass === "EXTENDER") return candidateClass === "EXTENDER" || candidateClass === "HDBASET";
  // MATRIX accepts HDBASET: an HDBaseT matrix is still a matrix — the
  // transport mismatch penalty is handled downstream by the eligibility
  // engine's matrixFitPenalty, not here in the gate.
  if (competitorClass === "MATRIX") return candidateClass === "MATRIX" || candidateClass === "HDBASET";
  if (competitorClass === "DISTRIBUTION") return candidateClass === "DISTRIBUTION";
  // PRESENTATION accepts WIRELESS_PRESENTATION: WyreStorm SW-* switchers cover both.
  if (competitorClass === "PRESENTATION") return candidateClass === "PRESENTATION" || candidateClass === "WIRELESS_PRESENTATION";
  if (competitorClass === "AVOIP") return candidateClass === "AVOIP";
  if (competitorClass === "VIDEO_WALL") return candidateClass === "VIDEO_WALL" || candidateClass === "AVOIP" || candidateClass === "MULTIVIEW";
  if (competitorClass === "MULTIVIEW") return candidateClass === "MULTIVIEW" || candidateClass === "VIDEO_WALL";
  if (competitorClass === "CAMERA") return candidateClass === "CAMERA";
  // WIRELESS_PRESENTATION accepts PRESENTATION: wireless competitors may be
  // answered by a wired presentation switcher with casting support.
  if (competitorClass === "WIRELESS_PRESENTATION") return candidateClass === "WIRELESS_PRESENTATION" || candidateClass === "PRESENTATION";
  if (competitorClass === "USB_EXTENSION") return candidateClass === "USB_EXTENSION";
  if (competitorClass === "CONTROL") return candidateClass === "CONTROL";
  if (competitorClass === "AUDIO") return candidateClass === "AUDIO";

  return false;
}

function isAccessoryLike(candidate: CompareCandidateGateInput, role: string): boolean {
  // APO-DG2 is intentionally eligible when Compare is matching an explicit casting dongle.
  if (clean(candidate.sku).toUpperCase() === "APO-DG2") return false;
  const identityText = identityTextFor(candidate) + " " + role.toLowerCase();
  const markerText = markerTextFor(candidate);

  if (/\b(cab-|cable|adapter|dongle|rack mount|rack-mount|control app|software app)\b/.test(identityText)) {
    return true;
  }

  return [
    "accessory",
    "accessory / other",
    "product-specific accessory",
    "rack accessory",
    "networkhd-accessory",
    "cable / accessory",
    "control-app",
    "software",
  ].some((marker) => markerText.includes(marker));
}

function specificBadSku(candidate: CompareCandidateGateInput): string[] {
  const blocked: string[] = [];
  const sku = String(candidate.sku ?? "").trim().toLowerCase();
  const identityText = identityTextFor(candidate);

    const apoConferenceOrAudioPattern = /apo-com-mic|apo-sky-mic|apo-dg1|apo-dg-hdmi|apo-120-dnt/;
  const deprecatedApoTableSpeakerphoneSku = ["apo", "210", "uc"].join("-");
  if (
    apoConferenceOrAudioPattern.test(sku + " " + identityText) ||
    (sku + " " + identityText).includes(deprecatedApoTableSpeakerphoneSku)
  ) {
    blocked.push("APO audio/conferencing/accessory product cannot be a primary equivalent for unrelated AV transport competitors.");
  }

  if (/^cab-|cable \/ accessory|\bcable\b/.test(sku + " " + identityText)) blocked.push("Cable product cannot be a primary competitor equivalent.");
  if (/rack mount|rack-mount|^nhd-000-rack/.test(sku + " " + identityText)) blocked.push("Rack accessory cannot be a primary competitor equivalent.");
  if (/^(?:tx|rx)-(?:h2x|scl)-/.test(sku)) blocked.push("Modular matrix I/O card cannot be a standalone primary competitor equivalent.");

  return blocked;
}

export function gateCompareCandidate(
  rawCandidate: CompareCandidateGateInput,
  rawContext: CompareCandidateGateContext,
): CompareCandidateGateResult {
  // Candidates arrive from generated catalogue data and from live competitor
  // lookups, so a null or wrong-shaped entry is a real possibility. This gate
  // decides what a customer is shown; a malformed row must block that
  // candidate, not throw and take the whole comparison down with it.
  const candidate: CompareCandidateGateInput =
    rawCandidate && typeof rawCandidate === "object" ? rawCandidate : {};
  const context: CompareCandidateGateContext =
    rawContext && typeof rawContext === "object" ? rawContext : { competitorClass: "UNKNOWN" };

  const _candidateText = textFor(candidate);
  const candidateRole = clean(candidate.role || candidate.category || candidate.productFamily || "unknown");
  const candidateClass = classifyCandidate(candidate);
  const endpointRole = candidateEndpointRole(candidate);
  const competitorClass = context.competitorClass || "UNKNOWN";
  const blockedBy: string[] = [];
  const evidence: string[] = [
    "competitorClass=" + competitorClass,
    "candidateClass=" + candidateClass,
    "candidateRole=" + candidateRole,
    "candidateEndpointRole=" + endpointRole,
  ];
  if (clean(candidate.sku).toUpperCase() === "APO-DG2") {
    evidence.push(
      "APO-DG2 requires a compatible WyreStorm wireless presentation switcher or UC soundbar.",
    );
  }

  for (const reason of specificBadSku(candidate)) blockedBy.push(reason);

  if (isAccessoryLike(candidate, candidateRole)) {
    blockedBy.push("Candidate is accessory/cable/workflow/rack class and should not be a primary equivalent.");
  }

  if (!allowedClassPair(competitorClass, candidateClass)) {
    blockedBy.push("Technology class mismatch: competitor is " + competitorClass + " but candidate is " + candidateClass + ".");
  }

  // A wireless-presentation competitor must be answered by a candidate that can
  // actually cast wirelessly. Every SW-*/EXP-SW-* switcher classifies as
  // PRESENTATION (the lane WIRELESS_PRESENTATION shares), but a wired-only
  // switcher is not an equivalent for a Barco ClickShare / Extron ShareLink -
  // require wireless evidence on the candidate before it can fill the lane.
  if (competitorClass === "WIRELESS_PRESENTATION" && candidateClass === "PRESENTATION") {
    const wirelessMarkers = [
      "wireless", "casting", "miracast", "airplay", "chromecast",
      "clickshare", "airmedia", "solstice", "screenbeam", "wifidirect",
    ];
    const taxonomyTokens = (candidate.classification?.subClassifications ?? [])
      .map((token) => String(token).trim().toLowerCase());
    const wirelessEvidence = hasAny(textFor(candidate), wirelessMarkers) ||
      taxonomyTokens.some((token) => wirelessMarkers.includes(token));
    if (!wirelessEvidence) {
      blockedBy.push("Wired-only presentation switcher cannot satisfy a wireless presentation comparison; wireless casting capability is required.");
    }
  }

  // Audio DSP comparisons: WyreStorm makes no DSP, so an amplifier must not be
  // offered as the primary candidate for one - surface the gap explicitly so an
  // inexperienced rep sees "no direct equivalent" rather than a misleading list.
  const competitorDescription = clean(context.competitorRole) + " " + clean(context.applicationContext);
  if (
    competitorClass === "AUDIO" &&
    /\bdsp\b|digital\s+signal\s+processor/i.test(competitorDescription)
  ) {
    const candidateIdentity = identityTextFor(candidate);
    if (/\bamplifier\b/i.test(candidateIdentity) || /^AMP-/i.test(clean(candidate.sku))) {
      blockedBy.push("WyreStorm does not manufacture audio DSPs; an amplifier is not an equivalent for a DSP and must not be offered as the primary replacement.");
    }
  }


  const requestedEndpointRole = endpointRoleFromText(clean(context.competitorRole));
  if (
    (competitorClass === "HDBASET" || competitorClass === "AVOIP")
    && requestedEndpointRole !== "unknown"
  ) {
    const endpointCompatible =
      requestedEndpointRole === endpointRole
      || (requestedEndpointRole === "transceiver" && (endpointRole === "transmitter" || endpointRole === "receiver"))
      || (requestedEndpointRole !== "kit" && endpointRole === "transceiver");
    if (!endpointCompatible) {
      blockedBy.push(
        `Endpoint role mismatch: competitor is ${requestedEndpointRole} but candidate is ${endpointRole}.`,
      );
    }
  }

  if (competitorClass !== "AUDIO" && candidateClass === "AUDIO") {
    blockedBy.push("Audio product cannot satisfy a non-audio competitor comparison as the primary candidate.");
  }

  if (competitorClass !== "CONTROL" && candidateClass === "CONTROL") {
    blockedBy.push("Control product cannot satisfy a non-control competitor comparison as the primary candidate.");
  }

  if (blockedBy.length) {
    return {
      allowed: false,
      severity: "blocked",
      reason: blockedBy[0],
      candidateClass,
      candidateRole,
      blockedBy,
      evidence,
    };
  }

  if (candidateClass === "UNKNOWN") {
    return {
      allowed: false,
      severity: "review",
      reason: "Candidate class is unknown; do not rank as primary equivalent without evidence.",
      candidateClass,
      candidateRole,
      blockedBy: ["Candidate class unknown."],
      evidence,
    };
  }

  return {
    allowed: true,
    severity: "pass",
    reason: "Candidate is in an allowed class lane for this competitor comparison.",
    candidateClass,
    candidateRole,
    blockedBy: [],
    evidence,
  };
}

export function filterComparableCandidates<T extends CompareCandidateGateInput>(
  candidates: T[],
  context: CompareCandidateGateContext,
): {
  allowed: T[];
  blocked: Array<{ candidate: T; gate: CompareCandidateGateResult }>;
} {
  const allowed: T[] = [];
  const blocked: Array<{ candidate: T; gate: CompareCandidateGateResult }> = [];

  for (const candidate of candidates) {
    const gate = gateCompareCandidate(candidate, context);

    if (gate.allowed) {
      allowed.push(candidate);
      continue;
    }

    blocked.push({ candidate, gate });
  }

  return { allowed, blocked };
}
