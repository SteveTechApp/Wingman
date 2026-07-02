import {
  UC_CATEGORY_LABELS,
  UC_COMPETITOR_PRODUCTS,
  type UcCompetitorCategory,
  type UcCompetitorProduct,
} from "../data/ucCompetitorProducts";

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
  category: UcCompetitorCategory;
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
    productType: "Native UC room appliance",
    purpose: "Meeting-room device that may run Teams/Zoom/Webex natively without a laptop.",
    wyrestormLane: "UC room workflow alternative",
    wyrestormCandidates: ["APO-VX20-UC v2"],
    optionalAddOns: ["Room PC or UC host if native appliance operation is required", "APO-DG2", "Presentation switcher"],
    warnings: [
      "Exact model not confirmed. Native room appliance products are not direct BYOD-only equivalents.",
    ],
    matchWords: ["teams room", "zoom room", "room appliance", "appliance", "android bar", "native teams"],
  },
  {
    category: "uc-video-bar",
    productType: "UC video bar / soundbar",
    purpose: "Meeting-room camera, microphone and speaker in one device.",
    wyrestormLane: "UC soundbar / BYOD meeting room",
    wyrestormCandidates: ["APO-VX20-UC v2"],
    optionalAddOns: ["APO-DG2", "Presentation switcher", "USB extension"],
    warnings: [
      "Exact model not confirmed. Check whether this is BYOD USB, room PC or native appliance-led.",
    ],
    matchWords: ["video bar", "videobar", "soundbar", "meeting bar", "conference bar"],
  },
  {
    category: "uc-camera-ptz",
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
];

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

  for (const term of productModelSearchTerms(product)) {
    for (const token of tokenise(term)) {
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

  return null;
}

function buildFallbackResult(rawInput: string, fallback: FallbackCategory | null): CompareAutoIdentifyResult {
  const label = fallback ? UC_CATEGORY_LABELS[fallback.category] : "Unconfirmed competitor product";

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
            "Exact manufacturer/model was not confirmed.",
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
      candidates: fallback?.wyrestormCandidates ?? [],
      optionalAddOns: fallback?.optionalAddOns ?? [],
      notes: fallback
        ? ["This is an inferred lane. Confirm the exact competitor model before using in a customer comparison."]
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
    return buildFallbackResult(rawInput, inferFallback(input));
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
  const detection = result.detectedProduct
    ? `OK, this looks like ${competitor.detectedLabel}.`
    : `OK, I can infer the likely product class: ${competitor.detectedLabel}.`;

  return [
    detection,
    `Product type: ${competitor.productType}.`,
    `Purpose: ${competitor.purpose}`,
    `WyreStorm comparison lane: ${match.lane}.`,
    match.candidates.length > 0 ? `Closest WyreStorm direction: ${match.candidates.join(", ")}.` : "",
    match.warnings.length > 0 ? `Warning: ${match.warnings[0]}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}