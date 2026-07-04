import {
  UC_CATEGORY_LABELS,
  UC_COMPETITOR_PRODUCTS,
  type UcCompetitorProduct,
} from "../data/ucCompetitorProducts";
import {
  mapCompetitorToNetworkHdAvoip,
  type AvoipEndpointRole,
  type CompetitorAvoipClassification,
  type NetworkHdAvoipRecommendation,
} from "./networkHdAvoipEquivalence";

export type CompareAutoIdentifyConfidence = "none" | "low" | "medium" | "high";

export interface CompareMatchCandidate {
  product: UcCompetitorProduct;
  score: number;
  reasons: string[];
}

export interface CompareAutoIdentifySummary {
  detectedLabel: string;
  manufacturer: string;
  model: string;
  productType: string;
  purpose: string;
  keyTechnicalPoints: string[];
  categories: string[];
  warnings: string[];
  notComparableWith: string[];
}

export interface CompareAutoWyrestormMatch {
  lane: string;
  candidates: string[];
  optionalAddOns: string[];
  notes: string[];
  warnings: string[];
}

export interface CompareAutoIdentifyResult {
  input: string;
  confidence: CompareAutoIdentifyConfidence;
  detectedProduct: UcCompetitorProduct | null;
  candidates: CompareMatchCandidate[];
  competitorSummary: CompareAutoIdentifySummary;
  wyrestormMatch: CompareAutoWyrestormMatch;
  nextQuestion: string | null;
}

interface FallbackCategory {
  category: string;
  label: string;
  productType: string;
  purpose: string;
  wyrestormLane: string;
  wyrestormCandidates: string[];
  optionalAddOns: string[];
  warnings: string[];
  matchWords: string[];
}

const GENERIC_UC_COMPARE_TOKENS = new Set([
  "a",
  "all",
  "and",
  "android",
  "appliance",
  "bar",
  "bring",
  "byod",
  "camera",
  "conference",
  "conferencing",
  "customer",
  "device",
  "for",
  "huddle",
  "meeting",
  "microphone",
  "native",
  "need",
  "needs",
  "product",
  "room",
  "rooms",
  "speaker",
  "speakerphone",
  "system",
  "teams",
  "they",
  "uc",
  "usb",
  "video",
  "want",
  "wants",
  "webcam",
  "wireless",
  "zoom",
]);

const SHORT_SPECIFIC_PRODUCT_TOKENS = new Set([
  "iq",
  "s1",
  "l1",
  "r30",
  "x30",
  "x52",
  "x70",
  "a10",
  "a20",
  "a30",
  "a40",
  "a50",
  "vb1",
  "vbs",
]);

const fallbackCategories: FallbackCategory[] = [
  {
    category: "uc-room-appliance",
    label: UC_CATEGORY_LABELS["uc-room-appliance"],
    productType: "Native UC room appliance",
    purpose: "Meeting-room device that may run Teams/Zoom/Webex natively without a laptop.",
    wyrestormLane: "UC room workflow alternative",
    wyrestormCandidates: ["APO-VX20-UC-V2"],
    optionalAddOns: ["Room PC or UC host if native appliance operation is required", "APO-DG2", "Presentation switcher"],
    warnings: [
      "Exact model not confirmed. Native room appliance products are not direct BYOD-only equivalents.",
    ],
    matchWords: ["teams room", "zoom room", "room appliance", "appliance", "android bar", "native teams"],
  },
  {
    category: "uc-video-bar",
    label: UC_CATEGORY_LABELS["uc-video-bar"],
    productType: "UC video bar / soundbar",
    purpose: "Meeting-room camera, microphone and speaker in one device.",
    wyrestormLane: "UC soundbar / BYOD meeting room",
    wyrestormCandidates: ["APO-VX20-UC-V2"],
    optionalAddOns: ["APO-DG2", "Presentation switcher", "USB extension"],
    warnings: [
      "Exact model not confirmed. Check whether this is BYOD USB, room PC or native appliance-led.",
    ],
    matchWords: ["video bar", "videobar", "soundbar", "meeting bar", "conference bar"],
  },
  {
    category: "uc-camera-ptz",
    label: UC_CATEGORY_LABELS["uc-camera-ptz"],
    productType: "PTZ / optical zoom UC camera",
    purpose: "Meeting-room camera where the microphone and speaker path is separate.",
    wyrestormLane: "Meeting-room camera / PTZ camera",
    wyrestormCandidates: ["CAM-210-NDI-PTZ", "CAM-420-PTZ"],
    optionalAddOns: ["USB extension", "CAM-0402-BRG / bridge path where required", "Separate UC audio path"],
    warnings: [
      "Exact model not confirmed. Camera-only products do not include the full room audio path.",
    ],
    matchWords: ["ptz", "optical zoom", "rally camera", "uvc84", "uvc86", "cam550"],
  },
  {
    category: "uc-camera-fixed",
    label: UC_CATEGORY_LABELS["uc-camera-fixed"],
    productType: "Fixed UC camera",
    purpose: "Meeting-room camera where room audio is handled separately.",
    wyrestormLane: "Meeting-room camera",
    wyrestormCandidates: ["CAM-210-NDI-PTZ", "CAM-420-PTZ"],
    optionalAddOns: ["USB extension", "Separate microphone/speaker", "Room PC or UC host"],
    warnings: [
      "Exact model not confirmed. Camera-only products require separate audio and USB path checks.",
    ],
    matchWords: ["webcam", "fixed camera", "usb camera", "huddly"],
  },
  {
    category: "wireless-casting",
    label: "Wireless presentation / casting device",
    productType: "Wireless presentation / casting device",
    purpose: "Lets a laptop or phone share its screen to the room display without a cable.",
    wyrestormLane: "Wireless presentation / casting alternative",
    wyrestormCandidates: ["APO-DG2"],
    optionalAddOns: [
      "APO-VX20-UC-V2 if the room also needs a UC camera, microphone and speaker in one device",
      "SW-640L-TX-W if the room needs both wired and wireless inputs on one switcher",
    ],
    warnings: [
      "Exact model not confirmed. Confirm whether the customer needs casting only, or a full UC conferencing workflow as well.",
    ],
    matchWords: [
      "clickshare",
      "click share",
      "solstice",
      "airtame",
      "screenbeam",
      "wireless presentation",
      "wireless casting",
      "casting dongle",
      "screen mirroring",
    ],
  },
  {
    // Checked ahead of hdbaset-extender below: "hdbaset" alone is ambiguous -
    // it describes both point-to-point extenders AND HDBaseT-based matrix
    // switchers (WyreStorm's own MXV matrix mainframes are described exactly
    // that way). A bare "matrix" word is a strong, specific signal that this
    // is routing/switching, not a point-to-point extender kit, so it must win
    // before the generic "hdbaset" token below gets a chance to match.
    category: "av-matrix",
    label: "HDMI / AV matrix switcher",
    productType: "HDMI / AV matrix switcher",
    purpose: "Routes multiple sources to multiple displays from a central switcher.",
    wyrestormLane: "Matrix switcher alternative",
    wyrestormCandidates: ["MX-0808-KIT-V2"],
    optionalAddOns: [
      "MXV-0808-H2A-MK2 if HDBaseT distance is required to the displays",
      "MX-0404-SCL for a smaller 4x4 room",
    ],
    warnings: [
      "Exact model, input/output count and HDBaseT distance not confirmed. Confirm the real matrix size before quoting.",
    ],
    matchWords: [
      "matrix",
      "matrix switch",
      "matrix switcher",
      "hdmi matrix",
      "av matrix",
      "video matrix",
      "presentation switcher",
    ],
  },
  {
    category: "hdbaset-extender",
    label: "HDBaseT / HDMI extender",
    productType: "Point-to-point HDMI/HDBaseT extender",
    purpose: "Carries a single HDMI source to one display over a CAT cable run.",
    wyrestormLane: "HDBaseT extender alternative",
    wyrestormCandidates: ["EX-70-H2"],
    optionalAddOns: [
      "EX-100-KVM if USB/KVM control is also required over the same run",
      "MX-0808-KIT-V2 if more than one source or display is really needed",
    ],
    warnings: [
      "Exact model not confirmed. Confirm cable distance, HDBaseT class and whether USB/KVM is required before quoting.",
    ],
    matchWords: [
      "extender",
      "extender kit",
      "ex kit",
      "hdbaset",
      "hdbase-t",
      "hdbase t",
      "cat6 extender",
      "cat5e extender",
      "transmitter receiver kit",
      "balun",
      "dtp",
    ],
  },
  {
    category: "videowall",
    label: "Video wall processor",
    productType: "Video wall processor",
    purpose: "Splits and scales sources across a grid of displays to form one large video wall image.",
    wyrestormLane: "Video wall processor alternative",
    wyrestormCandidates: ["SW-0206-VW"],
    optionalAddOns: ["SW-0204-VW for a fixed preset-layout wall"],
    warnings: [
      "Exact model, wall size and layout not confirmed. Confirm the grid size before quoting.",
    ],
    matchWords: ["video wall", "videowall", "wall processor"],
  },
  {
    category: "hdmi-splitter",
    label: "HDMI splitter / distribution amplifier",
    productType: "HDMI splitter / distribution amplifier",
    purpose: "Sends the same single source to every connected display. Unlike a matrix, every output always shows the same picture.",
    wyrestormLane: "HDMI splitter / distribution amplifier alternative",
    wyrestormCandidates: ["SP-0104-H2"],
    optionalAddOns: [
      "EXP-SP-0102-H2 for a smaller 1x2 room",
      "SP-0108-SCL for an eight-output room with mixed displays",
    ],
    warnings: [
      "Exact model and output count not confirmed. Confirm every display really needs the same source (splitter) rather than independent routing (matrix) before quoting.",
    ],
    matchWords: [
      "splitter",
      "distribution amplifier",
      "distribution amp",
      "duplicator",
      "hdmi duplicator",
      "av distribution",
    ],
  },
];

const MATRIX_IO_CANDIDATES: Array<{ inputs: number; outputs: number; sku: string; note: string }> = [
  { inputs: 4, outputs: 2, sku: "MX-0402-MST", note: "4x2 presentation switcher with MST" },
  { inputs: 4, outputs: 3, sku: "MX-0403-H3-MST", note: "4x3 presentation switcher with MST and HDBaseT 3.0 output" },
  { inputs: 4, outputs: 4, sku: "MX-0404-SCL", note: "4x4 seamless local matrix" },
  { inputs: 8, outputs: 8, sku: "MX-0808-KIT-V2", note: "8x8 HDMI/HDBaseT matrix kit" },
];

function parseIoCount(text: string): { inputs: number; outputs: number } | null {
  // Deliberately excludes runs where the digit groups are part of a longer digit
  // sequence, so resolution strings like "3840x2160" or "1920x1080" are never
  // misread as an input/output count.
  const match = text.match(/(?<!\d)(\d{1,2})\s*x\s*(\d{1,2})(?!\d)/);
  if (!match) {
    return null;
  }

  return { inputs: Number(match[1]), outputs: Number(match[2]) };
}

type SizedCandidate = { inputs: number; outputs: number; sku: string; note: string };

/**
 * Picks the closest sized candidate that can actually cover the requested
 * input/output count. A pure nearest-distance metric can under-size (e.g. a
 * 6x2 requirement is numerically "closer" to a 4x2 candidate than an 8x8 one,
 * but a 4x2 product cannot serve 6 inputs) - restrict to candidates that meet
 * or exceed both counts first, and only fall back to the overall nearest
 * (flagged for review) when nothing in the list is big enough.
 */
function pickSizedCandidate(
  candidates: SizedCandidate[],
  io: { inputs: number; outputs: number },
): SizedCandidate {
  const covering = candidates.filter((candidate) => candidate.inputs >= io.inputs && candidate.outputs >= io.outputs);
  const pool = covering.length > 0 ? covering : candidates;

  let best = pool[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of pool) {
    const distance = Math.abs(candidate.inputs - io.inputs) + Math.abs(candidate.outputs - io.outputs);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  if (covering.length === 0) {
    return {
      ...best,
      note: `${best.note} (largest known option; it does not cover the full ${io.inputs}x${io.outputs} requirement - this needs review before quoting)`,
    };
  }

  return best;
}

function closestMatrixCandidate(io: { inputs: number; outputs: number } | null): { sku: string; note: string } {
  if (!io) {
    return {
      sku: "MX-0808-KIT-V2",
      note: "8x8 HDMI/HDBaseT matrix kit (size assumed as no input/output count was given; confirm the real count before quoting)",
    };
  }

  return pickSizedCandidate(MATRIX_IO_CANDIDATES, io);
}

const SPLITTER_IO_CANDIDATES: Array<{ inputs: number; outputs: number; sku: string; note: string }> = [
  { inputs: 1, outputs: 2, sku: "EXP-SP-0102-H2", note: "1x2 4K HDMI splitter" },
  { inputs: 1, outputs: 4, sku: "SP-0104-H2", note: "1x4 4K HDMI splitter with EDID management" },
  { inputs: 1, outputs: 8, sku: "SP-0108-SCL", note: "1x8 4K HDMI splitter with scaling" },
];

function closestSplitterCandidate(io: { inputs: number; outputs: number } | null): { sku: string; note: string } {
  if (!io) {
    return {
      sku: "SP-0104-H2",
      note: "1x4 4K HDMI splitter with EDID management (size assumed as no output count was given; confirm the real count before quoting)",
    };
  }

  return pickSizedCandidate(SPLITTER_IO_CANDIDATES, io);
}

/**
 * Blustream's SP-series splitter naming embeds the input/output count directly
 * in the SKU with no separator (e.g. "SP14CS" = 1 input, 4 outputs), unlike the
 * generic "NxM" phrasing parseIoCount handles. Only matches an "sp" token
 * followed by exactly two digits (+ known suffix) to avoid misreading unrelated
 * model numbers.
 */
function parseBlustreamSplitterIo(input: string): { inputs: number; outputs: number } | null {
  for (const token of tokenise(input)) {
    const match = token.match(/^sp(\d)(\d)(?:cs|scl|h2)?$/);
    if (match) {
      return { inputs: Number(match[1]), outputs: Number(match[2]) };
    }
  }

  return null;
}

export function normalizeCompareSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(value: string): string[] {
  const normalised = normalizeCompareSearchText(value);
  if (!normalised) {
    return [];
  }

  return normalised.split(" ").filter((token) => token.length > 1);
}

function containsPhrase(input: string, phrase: string): boolean {
  const normalisedPhrase = normalizeCompareSearchText(phrase);
  if (!normalisedPhrase) {
    return false;
  }

  return ` ${input} `.includes(` ${normalisedPhrase} `);
}

function isSpecificProductToken(token: string): boolean {
  if (SHORT_SPECIFIC_PRODUCT_TOKENS.has(token)) {
    return true;
  }

  if (GENERIC_UC_COMPARE_TOKENS.has(token)) {
    return false;
  }

  if (/^[a-z]+\d+[a-z0-9]*$/.test(token)) {
    return true;
  }

  if (/^\d+[a-z]+[a-z0-9]*$/.test(token)) {
    return true;
  }

  if (/^\d{2,}$/.test(token)) {
    return true;
  }

  return token.length >= 3;
}

function manufacturerSearchTerms(product: UcCompetitorProduct): string[] {
  return [product.manufacturer, ...product.manufacturerAliases].filter(Boolean);
}

function productModelSearchTerms(product: UcCompetitorProduct): string[] {
  return [product.model, ...product.aliases].filter(Boolean);
}

function termHasSpecificEvidence(term: string): boolean {
  return tokenise(term).some(isSpecificProductToken);
}

function productSpecificTokens(product: UcCompetitorProduct): Set<string> {
  const tokens = new Set<string>();

  // Manufacturer-name tokens (e.g. "crestron") must never count as model-specific
  // evidence: they only prove the brand, not the exact product line, and a brand
  // whose catalogue has one entry here would otherwise false-match every other
  // product from that brand (e.g. an unrelated Crestron AVoIP/matrix SKU wrongly
  // matching the single Crestron UC video bar entry).
  const manufacturerTokens = new Set<string>();
  for (const term of manufacturerSearchTerms(product)) {
    for (const token of tokenise(term)) {
      manufacturerTokens.add(token);
    }
  }

  for (const term of productModelSearchTerms(product)) {
    for (const token of tokenise(term)) {
      if (manufacturerTokens.has(token)) {
        continue;
      }

      if (isSpecificProductToken(token)) {
        tokens.add(token);
      }
    }
  }

  return tokens;
}

function scoreProduct(input: string, product: UcCompetitorProduct): CompareMatchCandidate {
  const reasons = new Set<string>();
  let score = 0;

  const inputTokens = new Set(tokenise(input));
  const matchedBrand = manufacturerSearchTerms(product).some((manufacturerAlias) =>
    containsPhrase(input, manufacturerAlias),
  );

  if (matchedBrand) {
    score += 25;
    reasons.add("Matched competitor brand");
  }

  for (const term of productModelSearchTerms(product)) {
    const normalisedTerm = normalizeCompareSearchText(term);
    if (!normalisedTerm || !termHasSpecificEvidence(normalisedTerm)) {
      continue;
    }

    if (input === normalisedTerm) {
      score += 155;
      reasons.add(`Exact product/model match "${term}"`);
      continue;
    }

    if (containsPhrase(input, normalisedTerm)) {
      score += normalisedTerm.length <= 3 ? 85 : 115;
      reasons.add(`Matched product/model phrase "${term}"`);
    }
  }

  for (const token of productSpecificTokens(product)) {
    if (!inputTokens.has(token)) {
      continue;
    }

    const tokenScore = /^[a-z]+\d/.test(token) || SHORT_SPECIFIC_PRODUCT_TOKENS.has(token) ? 55 : 32;
    score += tokenScore;
    reasons.add(`Matched specific product token "${token}"`);
  }

  const categoryText = normalizeCompareSearchText([
    product.productType,
    product.primaryPurpose,
    product.categories.map((category) => UC_CATEGORY_LABELS[category]).join(" "),
  ].join(" "));

  if (matchedBrand || hasSpecificEvidenceReason(Array.from(reasons))) {
    for (const token of inputTokens) {
      if (token.length > 3 && !GENERIC_UC_COMPARE_TOKENS.has(token) && categoryText.includes(token)) {
        score += 4;
      }
    }
  }

  return {
    product,
    score,
    reasons: Array.from(reasons),
  };
}

function hasSpecificEvidenceReason(reasons: string[]): boolean {
  return reasons.some(
    (reason) =>
      reason.startsWith("Exact product/model match") ||
      reason.startsWith("Matched product/model phrase") ||
      reason.startsWith("Matched specific product token"),
  );
}

function hasSpecificProductEvidence(candidate: CompareMatchCandidate): boolean {
  return hasSpecificEvidenceReason(candidate.reasons);
}

function confidenceFromScore(score: number): CompareAutoIdentifyConfidence {
  if (score >= 130) {
    return "high";
  }
  if (score >= 80) {
    return "medium";
  }
  if (score >= 35) {
    return "low";
  }
  return "none";
}

function buildSummary(product: UcCompetitorProduct): CompareAutoIdentifySummary {
  return {
    detectedLabel: `${product.manufacturer} ${product.model}`,
    manufacturer: product.manufacturer,
    model: product.model,
    productType: product.productType,
    purpose: product.primaryPurpose,
    keyTechnicalPoints: product.keyTechnicalPoints,
    categories: product.categories.map((category) => UC_CATEGORY_LABELS[category]),
    warnings: product.warnings,
    notComparableWith: product.notComparableWith,
  };
}

function buildWyrestormMatch(product: UcCompetitorProduct): CompareAutoWyrestormMatch {
  return {
    lane: product.wyrestormLane,
    candidates: product.wyrestormCandidates,
    optionalAddOns: product.optionalWyrestormAddOns,
    notes: product.matchNotes,
    warnings: product.warnings,
  };
}

function inferFallback(input: string): FallbackCategory | null {
  for (const fallback of fallbackCategories) {
    if (fallback.matchWords.some((word) => containsPhrase(input, word))) {
      return fallback;
    }
  }

  // Weak last-resort signal: a bare "NxM" count (e.g. "8x8", "4x4") with no other
  // product-class words matched overwhelmingly describes a matrix/switcher or
  // splitter requirement in an AV context. A single input feeding several
  // outputs (1x4, 1x8...) reads as a splitter/distribution amplifier - a real
  // matrix needs more than one input to switch between - so route those to the
  // splitter lane and everything else to the matrix lane, rather than giving up.
  const bareIoCount = parseIoCount(input);
  if (bareIoCount) {
    const category = bareIoCount.inputs === 1 && bareIoCount.outputs > 1 ? "hdmi-splitter" : "av-matrix";
    return fallbackCategories.find((fallback) => fallback.category === category) ?? null;
  }

  return null;
}

function ioAwareCandidate(
  category: string | undefined,
  io: { inputs: number; outputs: number } | null,
): { sku: string; note: string } | null {
  if (category === "av-matrix") {
    return closestMatrixCandidate(io);
  }

  if (category === "hdmi-splitter") {
    return closestSplitterCandidate(io);
  }

  return null;
}

function buildFallbackResult(rawInput: string, fallback: FallbackCategory | null): CompareAutoIdentifyResult {
  const label = fallback?.label ?? "Unconfirmed competitor product";
  const normalisedInput = normalizeCompareSearchText(rawInput);
  const io =
    fallback?.category === "av-matrix" || fallback?.category === "hdmi-splitter"
      ? parseIoCount(normalisedInput) ?? parseBlustreamSplitterIo(normalisedInput)
      : null;
  const sizedPick = ioAwareCandidate(fallback?.category, io);
  const wyrestormCandidates = sizedPick ? [sizedPick.sku] : fallback?.wyrestormCandidates ?? [];

  return {
    input: rawInput,
    confidence: fallback ? "low" : "none",
    detectedProduct: null,
    candidates: [],
    competitorSummary: {
      detectedLabel: fallback ? `Likely ${label}` : "No confident competitor match",
      manufacturer: "Unknown",
      model: "Unknown",
      productType: fallback?.productType ?? "Unknown product type",
      purpose:
        fallback?.purpose ??
        "Wingman needs a brand, model, SKU or clearer description before suggesting a safe WyreStorm direction.",
      keyTechnicalPoints: fallback
        ? [
            "Product class inferred from the words entered.",
            io
              ? `Detected ${io.inputs}x${io.outputs} input/output count from the text entered.`
              : "Exact manufacturer/model was not confirmed.",
            "Use Advanced compare or add the missing product if this is not correct.",
          ]
        : [
            "No known competitor model or product class was found.",
            "Ask for the brand, model, SKU or a clearer description of the customer requirement.",
          ],
      categories: fallback ? [label] : [],
      warnings:
        fallback?.warnings ??
        ["Do not quote from this result. Identify the competitor product or product class first."],
      notComparableWith: [
        "AV-over-IP encoder",
        "AV-over-IP decoder",
        "HDBaseT extender",
        "HDMI matrix",
      ],
    },
    wyrestormMatch: {
      lane: fallback?.wyrestormLane ?? "Needs product classification",
      candidates: wyrestormCandidates,
      optionalAddOns: fallback?.optionalAddOns ?? [],
      notes: fallback
        ? [
            sizedPick
              ? `Closest size match: ${sizedPick.note}.`
              : "This is an inferred lane. Confirm the exact competitor model before using in a customer comparison.",
          ]
        : ["No WyreStorm lane selected because the competitor product could not be classified."],
      warnings:
        fallback?.warnings ??
        ["Ask one clarification question before comparing: is it a soundbar, camera, speakerphone, appliance, extender, matrix or AVoIP product?"],
    },
    nextQuestion: fallback
      ? "Is this definitely the correct product class, or do you know the exact model?"
      : "What brand and model did the customer mention?",
  };
}

function buildAvoipFallbackResult(
  rawInput: string,
  classification: CompetitorAvoipClassification,
  recommendation: NetworkHdAvoipRecommendation,
): CompareAutoIdentifyResult {
  const seriesLabel = recommendation.series ? `NetworkHD ${recommendation.series}` : "NetworkHD";
  const roleLabel = describeAvoipRole(classification.role);
  const confidence: CompareAutoIdentifyConfidence = recommendation.verifyCodec ? "low" : "medium";

  const warnings = [recommendation.reason];
  if (recommendation.verifyCodec) {
    warnings.push(
      "Codec class not confirmed from the text entered. Confirm before quoting in case the endpoint actually needs the NetworkHD 100 (H.264/H.265) series instead of 500.",
    );
  }
  warnings.push(recommendation.controllerReminder);

  return {
    input: rawInput,
    confidence,
    detectedProduct: null,
    candidates: [],
    competitorSummary: {
      detectedLabel: classification.knownFamily
        ? `Likely ${classification.knownFamily} (${roleLabel})`
        : `Likely competitor ${roleLabel}`,
      manufacturer: "Unknown",
      model: "Unknown",
      productType: roleLabel,
      purpose:
        "Sends or receives video/audio/USB/control over a standard network switch instead of point-to-point cabling.",
      keyTechnicalPoints: [
        classification.networkClass === "10g"
          ? "10GbE / SDVoE-class network requirement."
          : "1GbE network requirement.",
        classification.codec === "uncompressed-sdvoe"
          ? "Uncompressed, zero-latency class codec."
          : classification.codec === "h264_h265"
            ? "H.264/H.265 (HEVC) compressed codec."
            : classification.codec === "visually-lossless"
              ? "Visually-lossless (JPEG2000/JPEG-XS/PURE3-class) codec."
              : "Codec class not confirmed from the text entered.",
        "Exact manufacturer/model was not confirmed - identified from AV-over-IP product signals only.",
      ],
      categories: ["AV-over-IP endpoint"],
      warnings,
      notComparableWith: ["UC video bar", "UC camera", "HDBaseT point-to-point extender", "Standalone HDMI matrix switcher"],
    },
    wyrestormMatch: {
      lane: `${seriesLabel} AV-over-IP direction`,
      candidates: recommendation.candidateSkus,
      optionalAddOns: [],
      notes: [recommendation.reason],
      warnings,
    },
    nextQuestion: "Confirm the exact competitor model, and whether this network is 1GbE or 10GbE, before quoting.",
  };
}

function describeAvoipRole(role: AvoipEndpointRole): string {
  if (role === "encoder") return "AV-over-IP encoder / transmitter";
  if (role === "decoder") return "AV-over-IP decoder / receiver";
  if (role === "transceiver") return "AV-over-IP transceiver";
  return "AV-over-IP endpoint";
}

function buildNonUcFallback(rawInput: string, input: string): CompareAutoIdentifyResult {
  // AVoIP family/signal detection runs ahead of the generic keyword fallback
  // categories below: a competitor description can legitimately combine a
  // known AVoIP family marker with generic hardware wording (e.g. "Crestron
  // DM-NVX-350 extender", "SDVoE extender") - if the keyword fallback ran
  // first, a generic word like "extender" would win the category loop and
  // the curated NetworkHD series truth table would never be consulted.
  const avoip = mapCompetitorToNetworkHdAvoip(rawInput);
  if (avoip.classification.isAvoip && avoip.recommendation.applies) {
    return buildAvoipFallbackResult(rawInput, avoip.classification, avoip.recommendation);
  }

  const keywordFallback = inferFallback(input);
  if (keywordFallback) {
    return buildFallbackResult(rawInput, keywordFallback);
  }

  // Blustream's SP-series splitter naming (e.g. "SP14CS") has no descriptive
  // keyword and no AVoIP signal, so it needs its own SKU-shape check before
  // falling through to "no confident match".
  if (parseBlustreamSplitterIo(input)) {
    return buildFallbackResult(
      rawInput,
      fallbackCategories.find((fallback) => fallback.category === "hdmi-splitter") ?? null,
    );
  }

  return buildFallbackResult(rawInput, null);
}

export function identifyCompetitorProduct(rawInput: string): CompareAutoIdentifyResult {
  const input = normalizeCompareSearchText(rawInput);

  if (!input) {
    return buildFallbackResult(rawInput, null);
  }

  const candidates = UC_COMPETITOR_PRODUCTS
    .map((product) => scoreProduct(input, product))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const best = candidates[0];
  const confidence = best ? confidenceFromScore(best.score) : "none";

  if (!best || confidence === "none" || !hasSpecificProductEvidence(best)) {
    return buildNonUcFallback(rawInput, input);
  }

  return {
    input: rawInput,
    confidence,
    detectedProduct: best.product,
    candidates,
    competitorSummary: buildSummary(best.product),
    wyrestormMatch: buildWyrestormMatch(best.product),
    nextQuestion:
      confidence === "high"
        ? null
        : "This is the closest likely product. Confirm the model before using this comparison with a customer.",
  };
}

export function describeAutoIdentifyResult(result: CompareAutoIdentifyResult): string {
  const competitor = result.competitorSummary;
  const match = result.wyrestormMatch;
  const detection = `This looks like ${competitor.detectedLabel}.`;

  return [
    detection,
    match.candidates.length > 0 ? `Closest WyreStorm direction: ${match.candidates.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
