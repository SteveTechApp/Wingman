import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  type AvoipNetworkClass,
} from "./networkHdAvoipEquivalence";
import { selectWingmanProducts } from "./productSelectorEngine";
import { getWyreStormCompareLeadBlockReason } from "./wyrestormSkuBusinessStatus";
import { AVOIP_ENDPOINT_INTENTS, classifyCompareIntent } from "./compareEligibilityIntent";
import { extractMatrixSizeFromText, structuredMatrixText } from "./compareEligibilityMatrix";
import { ensureEligibilityCandidatePool } from "./compareEligibilityPool";
import {
  alternative,
  avoipNetworkMismatch,
  blocked,
  candidateProductTransportText,
  deriveExtenderStructuralFitFacts,
  direct,
  invalidLeadReasonForIntent,
  matrixFitPenalty,
  networkHdEndpointRoleFromSku,
  productHasNetworkHdEndpointRole,
  productIsSupportOnly,
  related,
  scoreExtenderStructuralFit,
} from "./compareEligibilityFit";
import {
  extractCompetitorText,
  getProduct,
  getSku,
  isExplicitCastingAccessoryComparison,
  normalise,
  productText,
  skuKey,
} from "./compareEligibilityText";
import {
  MULTIVIEW_CANVAS_BLOCKER,
  type CompareEligibilityClass,
  type CompareEligibilityResult,
  type CompareIntentKind,
  type LooseMatch,
  type LooseRecord,
} from "./compareEligibilityTypes";

export { classifyCompareIntent };
export type { CompareEligibilityClass, CompareEligibilityResult, CompareIntentKind };

export function evaluateProductEligibility(args: {
  intent: CompareIntentKind;
  competitorText: string;
  match: LooseMatch;
  product?: LooseRecord;
  competitorNetworkClass?: AvoipNetworkClass;
}): CompareEligibilityResult {
  const product = args.product || args.match;
  const sku = getSku(product || args.match);
  const key = skuKey(sku);
  const text = productText(product || args.match);
  const combined = `${sku} ${text}`;

  // Retired NetworkHD platforms (NHD-100/110/220/300/400) must never be specified.
  if (isBannedNetworkHdSku(sku)) {
    return blocked(sku, args.intent, [
      `${sku} is a retired NetworkHD platform and must never be specified in a comparison. Use a current 100/500/600 series SKU.`,
    ]);
  }

  const businessStatusBlockReason = getWyreStormCompareLeadBlockReason(sku);

  if (businessStatusBlockReason) {
    return blocked(sku, args.intent, [businessStatusBlockReason]);
  }

  // Never mix 10G and 1G NetworkHD families against an AVoIP endpoint competitor.
  if (AVOIP_ENDPOINT_INTENTS.has(args.intent)) {
    const networkMismatch = avoipNetworkMismatch(args.competitorNetworkClass ?? "unknown", sku);

    if (networkMismatch) {
      return blocked(sku, args.intent, [networkMismatch]);
    }
  }

  const supportOnlyReason = productIsSupportOnly(sku, combined);

  // COMPARE_PRIMARY_ROLE_ISOLATION_V1
  // Do not let keyword score promote a fundamentally different primary product.
  const explicitCandidateRoleText = normalise([
    product?.category,
    product?.role,
    product?.governanceRole,
    product?.productClass,
    product?.family,
    product?.name,
    product?.title,
  ]);
  // Product descriptions and tags include downstream applications (for
  // example a splitter may mention feeding a UC room or an integrated camera).
  // Those fields must not redefine the candidate's primary hardware class.
  // Use only the curated identity fields above for the hard UC/camera gate.
  const isUcRoomHardware =
    /\b(video\s*bar|conference\s*bar|conferencing\s*bar|uc\s*room\s*(?:product|endpoint)|all-in-one.*(?:camera|conferencing)|integrated\s+camera)\b/i.test(explicitCandidateRoleText);
  const isRoleMatchedPrimaryProduct =
    ((args.intent === "ndi-camera" || args.intent === "ptz-camera") && /^CAM/.test(key)) ||
    ((args.intent === "uc-byod" || args.intent === "usb-audio") && isUcRoomHardware);
  const isCameraPrimaryHardware =
    /^CAM/.test(key) ||
    /\b(?:ptz|ndi)\s*camera\b/i.test(explicitCandidateRoleText) ||
    /\bcamera\s*(?:endpoint|source|product)\b/i.test(explicitCandidateRoleText);
  const strictFixedSignalIntent =
    args.intent === "matrix" ||
    args.intent === "hdbaset-matrix" ||
    args.intent === "distribution-amplifier" ||
    args.intent === "presentation-switcher" ||
    args.intent === "extender";

  if (strictFixedSignalIntent && (isCameraPrimaryHardware || isUcRoomHardware)) {
    return blocked(sku, args.intent, [
      "Primary product class / role mismatch: camera or UC room hardware cannot lead a matrix, presentation-switcher, distribution or extender comparison.",
    ]);
  }
  const invalidLeadReason = isRoleMatchedPrimaryProduct
    ? null
    : invalidLeadReasonForIntent(supportOnlyReason, args.intent);

  if (invalidLeadReason) {
    return blocked(sku, args.intent, [invalidLeadReason]);
  }

  if (args.intent === "av-over-ip") {
    if (/^NHD600TRX$/.test(key)) {
      return direct(args.intent, ["NetworkHD 600 transceiver candidate for high-performance AVoIP endpoint comparison."], -120);
    }

    if (productHasNetworkHdEndpointRole(sku, combined)) {
      const priority = /600TRX|TRX/.test(key) ? -30 : /^NHD/.test(key) ? -15 : 0;
      return direct(args.intent, ["NetworkHD endpoint/transceiver candidate for AVoIP comparison."], priority);
    }

    if (/^NHD/.test(key)) {
      return related(args.intent, ["NetworkHD product is related, but not confirmed as an endpoint replacement."], 60);
    }

    return blocked(sku, args.intent, ["Non-NetworkHD product cannot lead a direct AVoIP endpoint replacement."]);
  }

  if (args.intent === "av-over-ip-decoder") {
    const endpointRole = networkHdEndpointRoleFromSku(key);

    if (/^NHD/.test(key) && (endpointRole === "rx" || endpointRole === "trx" || (!endpointRole && /\b(receiver|decoder|rx|trx)\b/i.test(combined)))) {
      return direct(args.intent, ["Decoder/receiver/transceiver candidate for AVoIP display-side requirement."], /TRX/.test(key) ? -25 : -10);
    }

    if (/^NHD/.test(key) && endpointRole === "tx") {
      return blocked(sku, args.intent, ["Transmitter/encoder-only product cannot lead a decoder comparison."]);
    }

    return blocked(sku, args.intent, ["Candidate is not a decoder, receiver or transceiver."]);
  }

  if (args.intent === "av-over-ip-encoder") {
    const endpointRole = networkHdEndpointRoleFromSku(key);

    if (/^NHD/.test(key) && (endpointRole === "tx" || endpointRole === "trx" || (!endpointRole && /\b(transmitter|encoder|tx|trx)\b/i.test(combined)))) {
      return direct(args.intent, ["Encoder/transmitter/transceiver candidate for AVoIP source-side requirement."], /TRX/.test(key) ? -25 : -10);
    }

    if (/^NHD/.test(key) && endpointRole === "rx") {
      return blocked(sku, args.intent, ["Receiver/decoder-only product cannot lead an encoder comparison."]);
    }

    return blocked(sku, args.intent, ["Candidate is not an encoder, transmitter or transceiver."]);
  }

  if (args.intent === "video-wall-processor") {
    if (/^SW0206VW$|^SW0204VW$/.test(key)) {
      return direct(args.intent, ["Dedicated WyreStorm video wall processor candidate."], key === "SW0206VW" ? -100 : -90);
    }

    if (/^NHD/.test(key) || /\b(av-over-ip|networkhd|multiview)\b/i.test(combined) || /MV/.test(key)) {
      return alternative(args.intent, ["AV-over-IP or multiview product may be an architecture alternative, not the dedicated processor lead."], 40);
    }

    return related(args.intent, ["Not a dedicated video wall processor."], 90);
  }

  if (args.intent === "multiview") {
    if (/^NHD0401MV$/.test(key)) {
      return direct(args.intent, ["Dedicated four-source multiview processor for a single-output canvas."], -100);
    }

    if (/^NHD150RX$/.test(key)) {
      return direct(args.intent, ["NetworkHD 100-series multiview receiver path for AVoIP multiview workflows."], -90);
    }

    if (/\b(multiview|multi-view|single output canvas|pip|pbp)\b/i.test(combined) || /MV/.test(key)) {
      return direct(args.intent, ["Multiview-capable candidate; confirm it provides a multi-source single-output canvas."], 20);
    }

    return blocked(sku, args.intent, [MULTIVIEW_CANVAS_BLOCKER]);
  }

  if (args.intent === "matrix" || args.intent === "hdbaset-matrix") {
    const matrixLike = /^MX/.test(key) ||
      /\b(matrix|routed|switching matrix)\b/i.test(combined) ||
      /0402|4X2|0808|8X8|0404|4X4/.test(key);

    if (!matrixLike) {
      if (/^NHD/.test(key)) {
        return alternative(args.intent, ["NetworkHD may be an architecture alternative to a fixed matrix."], 55);
      }

      return blocked(sku, args.intent, ["Candidate is not a matrix/switching product."]);
    }

    const penalty = matrixFitPenalty(args.competitorText, sku, combined, product);

    if (penalty >= 200) {
      return blocked(sku, args.intent, ["Matrix candidate is undersized for the confirmed routed I/O requirement."]);
    }

    const size = extractMatrixSizeFromText(args.competitorText);
    const matrixBonus = size.inputs === 4 && size.outputs === 2 && (/0402|4X2/.test(key)) ? -100 : 0;

    return direct(args.intent, ["Matrix/switching candidate with compatible routed I/O direction."], penalty + matrixBonus);
  }

  if (args.intent === "distribution-amplifier") {
    if (/^SP|^EXPSP/.test(key) || /\b(splitter|distribution amplifier|distribution amp|duplicator)\b/i.test(combined)) {
      const requiredFanout = extractMatrixSizeFromText(args.competitorText).outputs;
      const offeredFanout = extractMatrixSizeFromText(sku).outputs;
      const calculatedPenalty = matrixFitPenalty(args.competitorText, sku, combined, product);
      const penalty = requiredFanout && offeredFanout && offeredFanout < requiredFanout
        ? Math.max(200, calculatedPenalty)
        : calculatedPenalty;
      if (penalty >= 200) {
        return related(
          args.intent,
          ["HDMI distribution candidate has the correct mirrored topology but is undersized for the required source/output fan-out."],
          penalty,
        );
      }

      return direct(
        args.intent,
        ["HDMI distribution amplifier candidate with a one-source, mirrored-output topology."],
        penalty,
      );
    }

    if (/^MX|^NHD/.test(key) || /\b(matrix|routed|networkhd|av-over-ip)\b/i.test(combined)) {
      return alternative(args.intent, ["Architecture alternative only: routed switching is not a direct replacement for a mirrored HDMI distribution amplifier."], 100);
    }

    return blocked(sku, args.intent, ["Candidate is not an HDMI splitter or distribution amplifier."]);
  }

  if (args.intent === "presentation-switcher" || args.intent === "uc-byod") {
    const competitorNeedsUcHardware = /\b(byom|teams|zoom|unified\s*communications?|uc\s*room|video\s*bar|conference\s*(bar|room|system)|speakerphone)\b/i.test(args.competitorText);
    const wirelessPresentationSwitcher = /^SW/.test(key) && /\b(wireless|casting|miracast|airplay|chromecast|presentation|switcher|byod|byom)\b/i.test(combined);
    const capacityPenalty = matrixFitPenalty(args.competitorText, sku, combined, product);

    // Product-family similarity never compensates for insufficient confirmed
    // routed capacity. Unknown capacity remains reviewable; known undersizing
    // is a functional mismatch and must not enter the viable candidate list.
    if (capacityPenalty >= 200) {
      return blocked(sku, args.intent, [
        "Candidate is undersized for the confirmed presentation-switcher routed I/O requirement.",
      ]);
    }

    if (args.intent === "uc-byod" && competitorNeedsUcHardware && !isUcRoomHardware) {
      return blocked(sku, args.intent, [
        "Candidate does not provide the integrated camera, microphones and speakers required for an all-in-one UC video-bar comparison.",
      ]);
    }

    if (args.intent === "uc-byod" && competitorNeedsUcHardware && wirelessPresentationSwitcher) {
      return blocked(sku, args.intent, [
        "A wireless presentation transmitter does not replace an all-in-one UC video bar with an integrated camera, microphones and speakers.",
      ]);
    }

    if (wirelessPresentationSwitcher) {
      const size = extractMatrixSizeFromText(args.competitorText);
      const prefersCompactSwitcher = Boolean(size.inputs && size.inputs <= 2);
      const prefersLargerSwitcher = Boolean(size.inputs && size.inputs >= 4);
      const is620 = key === "SW620TXW" || key === "SW620LTXW";
      const is640 = key === "SW640LTXW" || key === "SW640TXW";
      const fitPenalty = (prefersCompactSwitcher && is620) || (prefersLargerSwitcher && is640) ? -110 : -90;
      return direct(args.intent, ["Wireless presentation switcher candidate."], fitPenalty + capacityPenalty);
    }

    if (args.intent === "presentation-switcher" && isUcRoomHardware && !competitorNeedsUcHardware) {
      return blocked(sku, args.intent, [
        "UC room hardware is a different primary product class and cannot replace a presentation switcher.",
      ]);
    }

    if (/^SW|^MX/.test(key) || (args.intent === "uc-byod" && isUcRoomHardware) || /\b(presentation|switcher|usb-c|byod|byom|unified communications?|video bar)\b/i.test(combined)) {
      return direct(args.intent, ["Presentation/switching candidate for meeting-room workflow."], capacityPenalty);
    }

    return related(args.intent, ["Related product, but not a direct presentation switcher lead."], 80);
  }

  if (args.intent === "extender") {
    if (/^MX|^SW/.test(key) || /\b(presentation|matrix|switcher)\b/i.test(combined)) {
      return alternative(
        args.intent,
        [
          "ARCHITECTURE ALTERNATIVE: candidate changes the room architecture rather than replacing the point-to-point HDBaseT extender path.",
        ],
        65,
      );
    }

    const requiredExtenderFit = deriveExtenderStructuralFitFacts(
      args.competitorText,
    );

    const candidateExtenderFit = deriveExtenderStructuralFitFacts(
      product,
      combined,
    );

    const structuralFit = scoreExtenderStructuralFit(
      requiredExtenderFit,
      candidateExtenderFit,
    );

    if (/^NHDUSBTRX$/.test(key) && /\busb\b/i.test(args.competitorText)) {
      if (!structuralFit.directCapable) {
        return related(
          args.intent,
          structuralFit.reasons,
          Math.max(90, structuralFit.fitPenalty),
        );
      }

      return direct(
        args.intent,
        [
          "USB extension-over-IP candidate for USB/KVM workflow.",
          ...structuralFit.reasons,
        ],
        -20 + structuralFit.fitPenalty,
      );
    }

    if (
      /^EX|^RX|^TX/.test(key) ||
      /\b(extender|extension|hdbaset|hdbt|transmitter|receiver|usb\s*(2\.0|3\.0|extension|extender))\b/i.test(
        combined,
      )
    ) {
      if (!structuralFit.directCapable) {
        return related(
          args.intent,
          [
            "Extender architecture is relevant, but the candidate does not have enough evidenced capability for a direct replacement.",
            ...structuralFit.reasons,
          ],
          Math.max(90, structuralFit.fitPenalty),
        );
      }

      return direct(
        args.intent,
        [
          "Extension candidate for point-to-point transport.",
          ...structuralFit.reasons,
        ],
        structuralFit.fitPenalty,
      );
    }

    return related(
      args.intent,
      ["Related product, but not a direct extender lead."],
      80,
    );
  }
  if (args.intent === "ndi-camera") {
    if (/^CAM/.test(key) && /NDI/.test(key)) {
      return direct(args.intent, ["WyreStorm NDI camera candidate for a camera-role comparison."], -120);
    }

    if (/\b(ndi|birddog|networkhd\s*cam)\b/i.test(combined)) {
      return direct(args.intent, ["NDI-capable camera or NDI workflow candidate."], 20);
    }

    return blocked(sku, args.intent, ["Candidate is not an NDI camera or NDI-capable endpoint."]);
  }

  if (args.intent === "ptz-camera") {
    if (/^CAM/.test(key) && /\b(ptz|pan[\s-]tilt|visca)\b/i.test(combined)) {
      return direct(args.intent, ["WyreStorm PTZ camera candidate for a camera-role comparison."], -120);
    }

    if (/\b(ptz|pan[\s-]tilt|visca|pelco|cam)\b/i.test(combined)) {
      return direct(args.intent, ["PTZ or controllable camera candidate."], 20);
    }

    return blocked(sku, args.intent, ["Candidate is not a PTZ or controllable camera."]);
  }

  if (args.intent === "wireless-casting") {
    // A competitor described specifically as a "dongle" is a simple casting
    // accessory, not a multi-input switcher or a full UC room bar - lead with
    // APO-DG2 (the WyreStorm casting dongle) instead of a switcher/video-bar
    // nudge in that specific case.
    const competitorIsDongle = isExplicitCastingAccessoryComparison(args.competitorText);

    // SW-* wireless presentation switchers are the lead answer for this lane,
    // and must be checked BEFORE the AVoIP-endpoint wording block below: their
    // catalogue copy routinely contains generic "encoder / transmitter" and
    // "receiver" words (search terms, application questions) that would
    // otherwise flip the actual wireless switcher into a blocked NetworkHD
    // impostor - see SW-640L-TX-W.
    if (/^SW/.test(key) && /\b(wireless|casting|miracast|airplay|chromecast|presentation)\b/i.test(combined)) {
      return direct(args.intent, ["Wireless presentation switcher candidate."], competitorIsDongle ? 30 : -90);
    }

    // NetworkHD endpoints are never the answer to a wireless-presentation
    // brief, regardless of what their catalogue copy says.
    if (/^NHD/.test(key)) {
      return blocked(sku, args.intent, ["This is a wireless presentation workflow, not an AVoIP endpoint comparison. Do not lead with NetworkHD here."]);
    }

    // Apollo / wireless / casting products are the wireless collaboration line
    // themselves. Check them BEFORE the generic AVoIP-word block: their
    // enriched catalogue copy routinely contains generic "endpoint / decoder /
    // transceiver"-style words (applications, search terms) that would
    // otherwise flip the actual casting dongle (APO-DG2) or UC bar into a
    // blocked NetworkHD impostor - same root cause as the SW-640L-TX-W case.
    if (/\b(apollo|wireless|casting|miracast|airplay|chromecast)\b/i.test(combined) || /^APO/.test(key)) {
      const isDg2 = /^APODG2/.test(key);
      const isVx20Uc = /^APOVX20UC/.test(key);

      // APO-DG2 is a casting dongle accessory. It is only a valid compare
      // candidate when the competitor itself is explicitly a casting dongle.
      // Generic ClickShare / wireless-presentation room-hub comparisons must
      // lead with the compatible room core or wireless switcher instead.
      if (isDg2 && !competitorIsDongle) {
        return blocked(sku, args.intent, [
          "APO-DG2 is a casting dongle accessory and may only be recommended when the competitor comparison explicitly requests a casting dongle.",
        ]);
      }

      if (isDg2 && competitorIsDongle) {
        return direct(
          args.intent,
          ["Explicit casting-dongle comparison: APO-DG2 is the matching dongle role."],
          -120,
        );
      }

      const fitPenalty = isVx20Uc ? 15 : 45;
      return direct(args.intent, ["Wireless casting or collaboration candidate."], fitPenalty);
    }

    if (/\b(avoip|networkhd|av-over-ip|encoder|decoder|transceiver)\b/i.test(combined)) {
      return blocked(sku, args.intent, ["This is a wireless presentation workflow, not an AVoIP endpoint comparison. Do not lead with NetworkHD here."]);
    }

    return related(args.intent, ["No confirmed wireless casting capability."], 75);
  }

  if (args.intent === "network-audio") {
    if (/^NHD/.test(key) || /\b(avoip|networkhd|encoder|decoder|transceiver|transmitter|receiver)\b/i.test(combined)) {
      return blocked(sku, args.intent, ["This is network audio, not network video. Do not lead with an AVoIP endpoint for an audio DSP / Dante comparison."]);
    }

    if (/^AMP/.test(key) || /\b(dante|aes67|audio|dsp|amplifier|speakerphone|conference)\b/i.test(combined)) {
      return direct(args.intent, ["Audio / DSP / network-audio candidate."], 0);
    }

    return related(args.intent, ["No confirmed audio / DSP / network-audio capability noted."], 75);
  }

  if (args.intent === "usb-audio") {
    if (/\b(usb|audio|mic|speakerphone|conference)\b/i.test(combined) || /^APO/.test(key)) {
      return direct(args.intent, ["USB audio or conferencing audio candidate."], 0);
    }

    return blocked(sku, args.intent, ["Candidate is not a USB audio or conferencing audio product."]);
  }

  if (args.intent === "gpio-relay") {
    if (/\b(gpio|relay|contact\s*closure|i\/o)\b/i.test(combined)) {
      return direct(args.intent, ["GPIO or relay candidate."], 0);
    }

    return related(args.intent, ["No confirmed GPIO or relay capability noted."], 70);
  }

  if (args.intent === "cable") {
    if (/^CAB/.test(key) || /\b(cable|cat\s*\d|fiber|fibre|optical|aoc)\b/i.test(combined)) {
      return direct(args.intent, ["Cable or passive cabling accessory candidate."], 0);
    }

    return blocked(sku, args.intent, ["Candidate is not a cable or passive cabling product."]);
  }

  if (args.intent === "controller-accessory") {
    const isControllerRoleProduct =
      /^NHDCTL/.test(key) ||
      /\b(system[\s-]*controller|controller|control processor|control hub|management appliance)\b/i.test(combined);

    if (isControllerRoleProduct) {
      return direct(args.intent, ["Controller-role comparison requested."], 0);
    }

    return blocked(sku, args.intent, ["AV endpoint hardware cannot replace a controller or management appliance."]);
  }

  if (args.intent === "control-system") {
    return blocked(sku, args.intent, ["Dedicated control or software platforms require an explicit reviewed equivalent; AV transport hardware cannot be substituted."]);
  }

  return related(args.intent, ["No strict intent gate applied."], 80);
}


function eligibilityRank(value: CompareEligibilityClass): number {
  if (value === "direct") return 0;
  if (value === "architecture-alternative") return 1;
  if (value === "related-only") return 2;
  return 3;
}

function decisionConfidence(match: LooseMatch): number {
  const value = Number(match?.decision?.confidence ?? match?.confidence ?? match?.score ?? 0);
  return Number.isFinite(value) ? value : 0;
}

const DG2_COMPANION_REQUIREMENT =
  "APO-DG2 requires one compatible WyreStorm room core: SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2.";

const DG2_COMPANION_SKUS = [
  "SW-620-TX-W",
  "SW-640L-TX-W",
  "APO-VX20-UC-V2",
] as const;

function applyCastingAccessoryCompanionRequirement(
  match: LooseMatch,
  intent: CompareIntentKind,
  competitorText: string,
): LooseMatch {
  if (
    intent !== "wireless-casting" ||
    !isExplicitCastingAccessoryComparison(competitorText) ||
    skuKey(getSku(match)) !== "APODG2"
  ) {
    return match;
  }

  const decision: LooseRecord =
    match?.decision && typeof match.decision === "object"
      ? match.decision
      : {};

  const systemRequirements = Array.from(
    new Set([
      ...(Array.isArray(decision.systemRequirements)
        ? decision.systemRequirements
        : []),
      DG2_COMPANION_REQUIREMENT,
    ]),
  );

  const verify = Array.from(
    new Set([
      ...(Array.isArray(decision.verify) ? decision.verify : []),
      "Confirm which compatible room core is required for the application before quoting APO-DG2.",
    ]),
  );

  return {
    ...match,
    requiredCompanionSkus: [...DG2_COMPANION_SKUS],
    companionRequirement: DG2_COMPANION_REQUIREMENT,
    decision: {
      ...decision,
      systemRequirements,
      verify,
      nextAction:
        "Lead with APO-DG2 for the casting accessory, then pair it with SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2 as the compatible WyreStorm room core.",
    },
    nextAction:
      "Lead with APO-DG2 for the casting accessory, then pair it with SW-620-TX-W, SW-640L-TX-W, or APO-VX20-UC-V2 as the compatible WyreStorm room core.",
  };
}

export function applyCompareEligibilityRanking<T extends { matches?: LooseMatch[]; rejected?: LooseMatch[]; competitor?: LooseRecord; topOutcome?: string; recommendation?: string; nextSteps?: string[] }>(
  result: T,
  products: LooseRecord[],
  inputText = "",
): T {
  const rawMatches = Array.isArray(result.matches) ? result.matches : [];
  const intent = classifyCompareIntent(result.competitor || result, inputText);
  const competitorText = [
    structuredMatrixText(result.competitor || result),
    extractCompetitorText(result.competitor || result, inputText),
  ].filter(Boolean).join(" ");

  // Resolve the competitor's AVoIP network class + correct NetworkHD series once,
  // so the eligibility layer obeys the same "never mix 10G and 1G" + ban rules.
  const { classification: avoipClassification, recommendation: avoipRecommendation } =
    mapCompetitorToNetworkHdAvoip(competitorText);
  const competitorNetworkClass: AvoipNetworkClass = avoipClassification.isAvoip
    ? avoipClassification.networkClass
    : "unknown";
  const recommendedSkuKeys = new Set(avoipRecommendation.candidateSkus.map((sku) => skuKey(sku)));

  const matches = ensureEligibilityCandidatePool(rawMatches, products, intent, competitorText, avoipRecommendation);
  const selectorDecisions = selectWingmanProducts(products, {
    mode: "compare",
    query: competitorText,
    technicalRequirement: competitorText,
    includeArchitectureAlternatives: true,
  });
  const selectorDecisionBySku = new Map(selectorDecisions.map((decision) => [skuKey(decision.sku), decision]));

  const evaluated = matches.map((match, index) => {
    const product = getProduct(match, products);
    const baseEligibility = evaluateProductEligibility({
      intent,
      competitorText,
      match,
      product,
      competitorNetworkClass,
    });

    // Within the allowed network class, prefer the truth-resolved series/role
    // (e.g. 500 over 100 for a visually-lossless 1G competitor) so it leads.
    const compareEligibility =
      AVOIP_ENDPOINT_INTENTS.has(intent) &&
      baseEligibility.eligibility === "direct" &&
      recommendedSkuKeys.has(skuKey(getSku(match)))
        ? { ...baseEligibility, fitPenalty: baseEligibility.fitPenalty - 40 }
        : baseEligibility;
    const selectorDecision = selectorDecisionBySku.get(skuKey(getSku(match))) || selectorDecisionBySku.get(skuKey(getSku(product)));
    const selectorGatedEligibility = selectorDecision && !selectorDecision.eligible
      ? {
          ...compareEligibility,
          eligibility: "blocked" as const,
          fitPenalty: Math.max(compareEligibility.fitPenalty, 900),
          reasons: [
            ...compareEligibility.reasons,
            ...selectorDecision.rejectionReasons.map((reason) => `Shared selector gate: ${reason}`),
          ],
        }
      : compareEligibility;

    const candidateKey = skuKey(getSku(match) || getSku(product));
    const explicitCastingAccessory =
      intent === "wireless-casting" &&
      isExplicitCastingAccessoryComparison(competitorText);

    // Final authoritative DG2 rule.
    //
    // 1) Generic wireless room-hub / presentation comparisons must NEVER surface
    //    APO-DG2 as a candidate.
    //
    // 2) When the competitor itself is an explicit casting accessory (dongle,
    //    ClickShare Button, AirMedia Connect Adapter, etc.), APO-DG2 is the
    //    correct role-equivalent lead. In that narrow case we are allowed to
    //    override a generic shared-selector "accessory" rejection, provided the
    //    core Compare eligibility gate did not itself block DG2 for lifecycle,
    //    business-status, or another hard safety reason.
    //
    // This is deliberately applied after the shared selector because that
    // selector cannot know whether an accessory is the thing actually being
    // compared. The Compare engine can.
    let finalEligibility = selectorGatedEligibility;

    if (intent === "wireless-casting" && candidateKey === "APODG2") {
      if (explicitCastingAccessory && compareEligibility.eligibility !== "blocked") {
        finalEligibility = {
          ...compareEligibility,
          eligibility: "direct" as const,
          fitPenalty: Math.min(compareEligibility.fitPenalty, -220),
          reasons: Array.from(new Set([
            ...compareEligibility.reasons,
            "Explicit casting-accessory role match: APO-DG2 is the correct WyreStorm dongle/button/adapter equivalent.",
          ])),
        };
      } else {
        finalEligibility = {
          ...selectorGatedEligibility,
          eligibility: "blocked" as const,
          fitPenalty: Math.max(selectorGatedEligibility.fitPenalty, 950),
          reasons: Array.from(new Set([
            ...selectorGatedEligibility.reasons,
            "APO-DG2 is not a generic wireless room-core recommendation; only surface it when the competitor itself is an explicit casting accessory.",
          ])),
        };
      }
    }

    return {
      match: {
        ...match,
        compareEligibility: finalEligibility,
        eligibility: finalEligibility,
      },
      compareEligibility: finalEligibility,
      index,
    };
  });

  const accepted = evaluated
    .filter((item) => item.compareEligibility.eligibility !== "blocked")
    .sort((a, b) => {
      const rankDelta = eligibilityRank(a.compareEligibility.eligibility) - eligibilityRank(b.compareEligibility.eligibility);
      if (rankDelta !== 0) return rankDelta;

      const fitDelta = a.compareEligibility.fitPenalty - b.compareEligibility.fitPenalty;
      if (fitDelta !== 0) return fitDelta;

      const confidenceDelta = decisionConfidence(b.match) - decisionConfidence(a.match);
      if (confidenceDelta !== 0) return confidenceDelta;

      return a.index - b.index;
    })
    .map((item) =>
      applyCastingAccessoryCompanionRequirement(
        item.match,
        intent,
        competitorText,
      ),
    );

  const blockedMatches = evaluated
    .filter((item) => item.compareEligibility.eligibility === "blocked")
    .map((item) => ({
      ...item.match,
      rejectedReason: item.compareEligibility.reasons.join(" "),
    }));

  const existingRejected = Array.isArray(result.rejected) ? result.rejected : [];
  const nextRejected = [...existingRejected, ...blockedMatches];

  const leadEligibility = accepted[0]?.compareEligibility as CompareEligibilityResult | undefined;
  const nextRecommendationPrefix = leadEligibility
    ? `Eligibility gate: ${String(leadEligibility.eligibility).replace("-", " ")} candidate for ${intent}.`
    : `Eligibility gate: no direct candidate confirmed for ${intent}.`;

  const nextTopOutcome = accepted.length > 0 && result.topOutcome === "NONE"
    ? "VERIFY"
    : result.topOutcome;
  const lead = accepted[0] as LooseMatch | undefined;
  const leadSku = lead ? getSku(lead) : "";
  const leadNextAction = String(lead?.decision?.nextAction ?? lead?.nextAction ?? "").trim();
  const nextRecommendation = leadSku
    ? `${nextRecommendationPrefix} ${leadSku} is the current WyreStorm direction.${leadNextAction ? ` ${leadNextAction}` : ""}`
    : [nextRecommendationPrefix, result.recommendation].filter(Boolean).join(" ");

  return {
    ...result,
    compareIntent: intent,
    matches: accepted,
    rejected: nextRejected,
    topOutcome: nextTopOutcome,
    recommendation: nextRecommendation,
  } as T;
}
