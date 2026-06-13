export type CompareIntentKind =
  | "matrix"
  | "hdbaset-matrix"
  | "av-over-ip"
  | "av-over-ip-encoder"
  | "av-over-ip-decoder"
  | "video-wall-processor"
  | "multiview"
  | "presentation-switcher"
  | "uc-byod"
  | "extender"
  | "controller-accessory"
  | "unknown";

export type CompareEligibilityClass =
  | "direct"
  | "architecture-alternative"
  | "related-only"
  | "blocked";

export type CompareEligibilityResult = {
  sku: string;
  intent: CompareIntentKind;
  eligible: boolean;
  eligibility: CompareEligibilityClass;
  fitPenalty: number;
  blockers: string[];
  warnings: string[];
  requiredFacts: string[];
  matchedFacts: string[];
  missingFacts: string[];
};

type LooseRecord = Record<string, unknown>;

type LooseMatch = LooseRecord & {
  sku?: string;
  name?: string;
  family?: string;
  decision?: LooseRecord;
  eligibility?: CompareEligibilityResult;
  compareEligibility?: CompareEligibilityResult;
};

type LooseCompareResult = LooseRecord & {
  competitor?: LooseRecord;
  matches?: LooseMatch[];
  rejected?: LooseMatch[];
  recommendation?: string;
};

const DIRECT_RANK: Record<CompareEligibilityClass, number> = {
  direct: 0,
  "architecture-alternative": 1,
  "related-only": 2,
  blocked: 3,
};

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value as LooseRecord).map(toText).filter(Boolean).join(" ");
  }

  return "";
}

function normalise(value: unknown): string {
  return toText(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function skuKey(value: unknown): string {
  return toText(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function compactText(value: unknown): string {
  return normalise(value).replace(/[^a-z0-9]+/g, "");
}

function getSku(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as LooseRecord;
  return toText(record.sku || record.SKU || record.partNumber || record.model || record.id).trim();
}

function combineProductText(match: LooseMatch, product?: LooseRecord): string {
  return normalise([
    match,
    product,
    match.decision,
  ]);
}

function extractMatrixSizeFromText(text: string): { inputs?: number; outputs?: number } {
  const readable = text.replace(/[×]/g, "x");

  const explicit = readable.match(/(?:^|[^0-9])(\d{1,2})\s*x\s*(\d{1,2})(?:[^0-9]|$)/i);
  if (explicit) {
    return {
      inputs: Number(explicit[1]),
      outputs: Number(explicit[2]),
    };
  }

  const skuLike = text.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const prefixed = skuLike.match(/(?:MXV|MMX|HMX|MX|VS|C)(\d{2})(\d{2})/);

  if (prefixed) {
    return {
      inputs: Number(prefixed[1]),
      outputs: Number(prefixed[2]),
    };
  }

  const routedInputs = readable.match(/(?:routed\s*)?(?:inputs?|in)\D{0,16}(\d{1,2})/i);
  const routedOutputs = readable.match(/(?:routed\s*)?(?:outputs?|out)\D{0,16}(\d{1,2})/i);

  return {
    inputs: routedInputs ? Number(routedInputs[1]) : undefined,
    outputs: routedOutputs ? Number(routedOutputs[1]) : undefined,
  };
}
function extractCompetitorText(resultOrInput: unknown, inputText = ""): string {
  return normalise([inputText, resultOrInput]);
}

export function classifyCompareIntent(resultOrInput: unknown, inputText = ""): CompareIntentKind {
  const text = extractCompetitorText(resultOrInput, inputText);
  const compact = compactText(text);

  if (/(rack|mount|shelf|psu|power supply|cable|controller|control processor|ctl)/i.test(text)) {
    if (!/(matrix|switcher|processor|encoder|decoder|receiver|transmitter|transceiver|extender)/i.test(text)) {
      return "controller-accessory";
    }
  }

  if (/(video wall|videowall|wall processor|lcd wall|led wall|novastar)/i.test(text)) {
    return "video-wall-processor";
  }

  if (/(multiview|multi-view|quad view|single canvas|picture in picture|pip)/i.test(text)) {
    return "multiview";
  }

  if (/(hdbaset|hdbt|hdbase-t)/i.test(text) && /(matrix|switcher|routing|routed|switch)/i.test(text)) {
    return "hdbaset-matrix";
  }

  if (/(matrix|routing|routed|switcher)/i.test(text) || /\b\d{1,2}\s*x\s*\d{1,2}\b/i.test(text)) {
    return "matrix";
  }

  if (/(nav\s*d|decoder|receiver| rx\b|rx\b|display endpoint)/i.test(text) || /navd\d+/i.test(compact)) {
    return "av-over-ip-decoder";
  }

  if (/(nav\s*e|encoder|transmitter| tx\b|tx\b|source endpoint)/i.test(text) || /nave\d+/i.test(compact)) {
    return "av-over-ip-encoder";
  }

  if (/(av over ip|avoip|av-over-ip|networkhd|sdvoe|jpeg-xs|jpeg xs|10g|1gbe|mxnet|nav)/i.test(text)) {
    return "av-over-ip";
  }

  if (/(byod|byom|teams|zoom|uc|usb camera|speakerphone|conference|conferencing)/i.test(text)) {
    return "uc-byod";
  }

  if (/(presentation|usb-c|usbc|wireless presentation|airplay|miracast|casting)/i.test(text)) {
    return "presentation-switcher";
  }

  if (/(extender|extension|point to point|point-to-point|kvm)/i.test(text)) {
    return "extender";
  }

  return "unknown";
}

function productIsAccessoryOrController(sku: string, text: string): boolean {
  const cleanSku = skuKey(sku);

  if (/CAB|CABLE|RACK|RMK|PSU|PWR|BRACKET|MOUNT|SFP|MOD|CARD/.test(cleanSku)) return true;
  if (/NHD000CTL|NHDCTL|CTLPRO|CTL/.test(cleanSku)) return true;

  if (/(accessory|request-only|rack|mount|cable|power supply|controller|control processor|system-controller)/i.test(text)) {
    if (!/(matrix|switcher|processor|encoder|decoder|receiver|transmitter|transceiver|extender|soundbar|camera)/i.test(text)) {
      return true;
    }
  }

  return false;
}

function productClassHints(sku: string, text: string) {
  const cleanSku = skuKey(sku);

  const isDedicatedVideoWall =
    /^SW020[46]VW/.test(cleanSku) ||
    /\bSW-0204-VW\b/i.test(text) ||
    /\bSW-0206-VW\b/i.test(text) ||
    /(dedicated|standalone).{0,32}(video wall|videowall)/i.test(text);

  const isMatrix =
    /^MX/.test(cleanSku) ||
    /\bmatrix\b/i.test(text) ||
    /(routed|routing).{0,16}(input|output)/i.test(text);

  const isHdbaset =
    /(hdbaset|hdbt|hdbase-t)/i.test(text);

  const isAvoip =
    /^NHD/.test(cleanSku) ||
    /(networkhd|av over ip|avoip|av-over-ip|sdvoe|jpeg-xs|jpeg xs|10g|1gbe)/i.test(text);

  const isEncoder =
    /(^NHD.*TX\b|TX$|encoder|transmitter|source endpoint)/i.test(text) ||
    /^NHD\d+TX/.test(cleanSku);

  const isDecoder =
    /(^NHD.*RX\b|RX$|decoder|receiver|display endpoint)/i.test(text) ||
    /^NHD\d+RX/.test(cleanSku);

  const isTransceiver =
    /TRX|transceiver/i.test(text) ||
    /TRX/.test(cleanSku);

  const isMultiview =
    /0401MV|150RX|multiview|multi-view|quad view/i.test(text + " " + cleanSku);

  const isPresentation =
    /^SW/.test(cleanSku) ||
    /(presentation|usb-c|usbc|wireless presentation|airplay|miracast|casting)/i.test(text);

  const isUc =
    /^APO/.test(cleanSku) ||
    /(byod|byom|teams|zoom|uc|usb camera|speakerphone|conference|conferencing|soundbar)/i.test(text);

  const isExtender =
    /^EX/.test(cleanSku) ||
    /(extender|extension|point to point|point-to-point|kvm)/i.test(text);

  return {
    isDedicatedVideoWall,
    isMatrix,
    isHdbaset,
    isAvoip,
    isEncoder,
    isDecoder,
    isTransceiver,
    isMultiview,
    isPresentation,
    isUc,
    isExtender,
  };
}

function directResult(
  sku: string,
  intent: CompareIntentKind,
  matchedFacts: string[],
  warnings: string[] = [],
  fitPenalty = 0,
): CompareEligibilityResult {
  return {
    sku,
    intent,
    eligible: true,
    eligibility: "direct",
    fitPenalty,
    blockers: [],
    warnings,
    requiredFacts: [],
    matchedFacts,
    missingFacts: [],
  };
}

function architectureAlternative(
  sku: string,
  intent: CompareIntentKind,
  matchedFacts: string[],
  warnings: string[],
  fitPenalty = 20,
): CompareEligibilityResult {
  return {
    sku,
    intent,
    eligible: true,
    eligibility: "architecture-alternative",
    fitPenalty,
    blockers: [],
    warnings,
    requiredFacts: [],
    matchedFacts,
    missingFacts: [],
  };
}

function relatedOnly(
  sku: string,
  intent: CompareIntentKind,
  matchedFacts: string[],
  warnings: string[],
  fitPenalty = 50,
): CompareEligibilityResult {
  return {
    sku,
    intent,
    eligible: true,
    eligibility: "related-only",
    fitPenalty,
    blockers: [],
    warnings,
    requiredFacts: [],
    matchedFacts,
    missingFacts: [],
  };
}

function blocked(
  sku: string,
  intent: CompareIntentKind,
  blockers: string[],
  missingFacts: string[] = [],
): CompareEligibilityResult {
  return {
    sku,
    intent,
    eligible: false,
    eligibility: "blocked",
    fitPenalty: 999,
    blockers,
    warnings: [],
    requiredFacts: [],
    matchedFacts: [],
    missingFacts,
  };
}

export function evaluateProductEligibility(args: {
  intent: CompareIntentKind;
  competitorText: string;
  match: LooseMatch;
  product?: LooseRecord;
}): CompareEligibilityResult {
  const sku = getSku(args.match) || getSku(args.product);
  const text = combineProductText(args.match, args.product);
  const hints = productClassHints(sku, text);

  if (!sku) {
    return blocked("", args.intent, ["Candidate has no SKU."]);
  }

  const isAccessory = productIsAccessoryOrController(sku, text);

  if (isAccessory && args.intent !== "controller-accessory") {
    return blocked(sku, args.intent, ["Accessory, controller, rack, cable or support item cannot be a lead replacement candidate."]);
  }

  if (args.intent === "controller-accessory") {
    if (isAccessory) return directResult(sku, args.intent, ["Candidate is accessory/controller class."]);
    return blocked(sku, args.intent, ["Competitor appears accessory/controller class; candidate is not equivalent accessory/controller class."]);
  }

  if (args.intent === "video-wall-processor") {
    if (hints.isDedicatedVideoWall) {
      return directResult(sku, args.intent, ["Dedicated video wall processor path."], [], 0);
    }

    if (hints.isMultiview && hints.isAvoip) {
      return architectureAlternative(
        sku,
        args.intent,
        ["AV-over-IP multiview/video-wall-capable path."],
        ["Architecture alternative only: confirm wall behaviour, processor output, latency, source count and whether LCD/LED processing is required."],
        18,
      );
    }

    if (hints.isAvoip) {
      return relatedOnly(
        sku,
        args.intent,
        ["NetworkHD/AVoIP product is related to distributed wall architectures."],
        ["Do not lead with this for a dedicated processor replacement unless the system is being redesigned as AV-over-IP."],
        60,
      );
    }

    return blocked(sku, args.intent, ["Not a dedicated video wall processor or valid wall architecture alternative."]);
  }

  if (args.intent === "multiview") {
    if (hints.isMultiview) {
      return directResult(sku, args.intent, ["Candidate supports multiview/single-output multi-source workflow."]);
    }

    return blocked(sku, args.intent, ["Multiview requires multi-source single-output canvas evidence; multiple outputs alone is not enough."]);
  }

  if (args.intent === "av-over-ip-decoder") {
    if (hints.isDecoder || hints.isTransceiver) {
      return directResult(sku, args.intent, ["Candidate is receiver/decoder/transceiver endpoint."]);
    }

    if (hints.isEncoder) {
      return blocked(sku, args.intent, ["Competitor requires decoder/receiver endpoint; candidate is encoder/transmitter only."]);
    }

    if (hints.isAvoip) {
      return relatedOnly(sku, args.intent, ["Candidate is in AV-over-IP family."], ["Confirm encoder/decoder role before quoting."], 40);
    }

    return blocked(sku, args.intent, ["Not an AV-over-IP decoder/receiver/transceiver candidate."]);
  }

  if (args.intent === "av-over-ip-encoder") {
    if (hints.isEncoder || hints.isTransceiver) {
      return directResult(sku, args.intent, ["Candidate is encoder/transmitter/transceiver endpoint."]);
    }

    if (hints.isDecoder) {
      return blocked(sku, args.intent, ["Competitor requires encoder/transmitter endpoint; candidate is decoder/receiver only."]);
    }

    if (hints.isAvoip) {
      return relatedOnly(sku, args.intent, ["Candidate is in AV-over-IP family."], ["Confirm encoder/decoder role before quoting."], 40);
    }

    return blocked(sku, args.intent, ["Not an AV-over-IP encoder/transmitter/transceiver candidate."]);
  }

  if (args.intent === "av-over-ip") {
    if (hints.isAvoip && (hints.isEncoder || hints.isDecoder || hints.isTransceiver || hints.isMultiview)) {
      return directResult(sku, args.intent, ["Candidate is AV-over-IP endpoint or AV-over-IP processing path."]);
    }

    return blocked(sku, args.intent, ["Not an AV-over-IP endpoint/processing candidate."]);
  }

  if (args.intent === "hdbaset-matrix" || args.intent === "matrix") {
    const competitorSize = extractMatrixSizeFromText(args.competitorText);
    const candidateSize = extractMatrixSizeFromText([sku, text].join(" "));

    if (hints.isMatrix) {
      const warnings: string[] = [];
      let fitPenalty = 0;

      if (competitorSize.inputs && candidateSize.inputs) {
        if (candidateSize.inputs < competitorSize.inputs) {
          return blocked(sku, args.intent, [`Candidate routed input count ${candidateSize.inputs} is below required ${competitorSize.inputs}.`]);
        }

        fitPenalty += Math.max(0, candidateSize.inputs - competitorSize.inputs) * 10;
      }

      if (competitorSize.outputs && candidateSize.outputs) {
        if (candidateSize.outputs < competitorSize.outputs) {
          return blocked(sku, args.intent, [`Candidate routed output count ${candidateSize.outputs} is below required ${competitorSize.outputs}.`]);
        }

        fitPenalty += Math.max(0, candidateSize.outputs - competitorSize.outputs) * 10;
      }

      if (args.intent === "hdbaset-matrix" && !hints.isHdbaset) {
        warnings.push("Competitor appears HDBaseT matrix class; confirm candidate output transport and receiver/package requirements.");
        fitPenalty += 8;
      }

      if (!candidateSize.inputs || !candidateSize.outputs) {
        warnings.push("Candidate matrix size needs evidence before quoting.");
        fitPenalty += 6;
      }

      return directResult(sku, args.intent, ["Candidate is matrix-like and passes routed I/O capacity gate."], warnings, fitPenalty);
    }

    if (hints.isAvoip) {
      return architectureAlternative(
        sku,
        args.intent,
        ["AV-over-IP could replace matrix architecture in some designs."],
        ["Architecture alternative only: confirm network, latency, endpoints, controller and expansion requirements."],
        35,
      );
    }

    return blocked(sku, args.intent, ["Not matrix-like and not a declared architecture alternative."]);
  }

  if (args.intent === "presentation-switcher") {
    if (hints.isPresentation || hints.isUc) {
      return directResult(sku, args.intent, ["Candidate supports presentation/room switching workflow."]);
    }

    return blocked(sku, args.intent, ["Not a presentation switcher/room switching candidate."]);
  }

  if (args.intent === "uc-byod") {
    if (hints.isUc || hints.isPresentation) {
      return directResult(sku, args.intent, ["Candidate supports UC/BYOD/presentation workflow."]);
    }

    return blocked(sku, args.intent, ["Not a UC/BYOD-capable candidate."]);
  }

  if (args.intent === "extender") {
    if (hints.isExtender) {
      return directResult(sku, args.intent, ["Candidate is extender/KVM/point-to-point class."]);
    }

    return blocked(sku, args.intent, ["Not an extender/KVM/point-to-point candidate."]);
  }

  return relatedOnly(
    sku,
    args.intent,
    ["No stronger intent gate was identified."],
    ["Verify manually before presenting as a replacement."],
    70,
  );
}

function findProductBySku(products: LooseRecord[], sku: string): LooseRecord | undefined {
  const key = skuKey(sku);

  return products.find((product) => skuKey(getSku(product)) === key);
}

function withEligibility(match: LooseMatch, eligibility: CompareEligibilityResult): LooseMatch {
  return {
    ...match,
    eligibility,
    compareEligibility: eligibility,
  };
}

export function applyCompareEligibilityRanking<T extends LooseCompareResult>(
  result: T,
  products: LooseRecord[],
  inputText = "",
): T {
  const matches = Array.isArray(result.matches) ? result.matches : [];
  const rejected = Array.isArray(result.rejected) ? result.rejected : [];
  const competitorText = extractCompetitorText(result.competitor || result, inputText);
  const intent = classifyCompareIntent(result.competitor || result, inputText);

  const evaluated = matches.map((match, index) => {
    const sku = getSku(match);
    const product = findProductBySku(products, sku);
    const eligibility = evaluateProductEligibility({
      intent,
      competitorText,
      match,
      product,
    });

    return {
      match: withEligibility(match, eligibility),
      eligibility,
      index,
    };
  });

  evaluated.sort((a, b) => {
    const rankDelta = DIRECT_RANK[a.eligibility.eligibility] - DIRECT_RANK[b.eligibility.eligibility];
    if (rankDelta !== 0) return rankDelta;

    const penaltyDelta = a.eligibility.fitPenalty - b.eligibility.fitPenalty;
    if (penaltyDelta !== 0) return penaltyDelta;

    return a.index - b.index;
  });

  const nextMatches = evaluated
    .filter((entry) => entry.eligibility.eligibility !== "blocked")
    .map((entry) => entry.match);

  const newlyRejected = evaluated
    .filter((entry) => entry.eligibility.eligibility === "blocked")
    .map((entry) => entry.match);

  const leadEligibility = nextMatches[0]?.compareEligibility;
  const nextRecommendationPrefix = leadEligibility
    ? `Eligibility gate: ${String(leadEligibility.eligibility).replace("-", " ")} candidate for ${intent}.`
    : `Eligibility gate: no direct candidate confirmed for ${intent}.`;

  return {
    ...result,
    compareIntent: intent,
    matches: nextMatches,
    rejected: [...newlyRejected, ...rejected],
    recommendation: [nextRecommendationPrefix, result.recommendation].filter(Boolean).join(" "),
  };
}