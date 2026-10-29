/**
 * The candidate pool a compare run is allowed to consider.
 *
 * The shared selector and the pipeline propose candidates; this module makes sure the
 * pool actually contains the products a comparison needs — the truth-resolved NetworkHD
 * series for an AVoIP competitor, the correctly sized matrix or splitter, the extender or
 * switcher family the intent is about — and it is the only place a candidate is built
 * after the verdict, which is why the reason strings name the correction rather than a
 * product. A correction never removes a candidate: it inserts, and the gate then decides.
 */
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";
import { AVOIP_ENDPOINT_INTENTS } from "./compareEligibilityIntent";
import { extractMatrixSizeFromText } from "./compareEligibilityMatrix";
import {
  findProductBySku,
  getSku,
  isExplicitCastingAccessoryComparison,
  productNameFromRecord,
  productText,
  skuKey,
  skuLookupKeys,
} from "./compareEligibilityText";
import type { NetworkHdAvoipRecommendation } from "./networkHdAvoipEquivalence";
import type { CompareIntentKind, LooseMatch, LooseRecord } from "./compareEligibilityTypes";

function makeEligibilityCandidateFromProduct(product: LooseRecord, reason: string, confidence = 72, displaySku?: string): LooseMatch {
  const sku = String(displaySku || product.sku || product.model || product.partNumber || "");
  const name = productNameFromRecord(product) || sku;

  return {
    sku,
    name,
    family: product.family ?? product.productFamily ?? product.category ?? "WyreStorm",
    // A real compare profile (not the raw catalogue row) so the match card can
    // surface the governed data tier - sourceTier/sourceLabel are set from the
    // governed registry, never carried as bare product fields.
    wyrestorm: buildWyrestormCompareProfile(product as any),
    summary: reason,
    matches: [reason],
    gaps: [],
    verify: ["Verify datasheet-level requirements before external quote positioning."],
    nextAction: "Use eligibility-injected candidate as the corrected comparison path.",
    decision: {
      outcome: "VERIFY",
      confidence,
      relationship: "eligibility_injected_candidate",
      blockers: [],
      gaps: [],
      matches: [reason],
      verify: ["Verify datasheet-level requirements before external quote positioning."],
      summary: reason,
      nextAction: "Use eligibility-injected candidate as the corrected comparison path.",
    },
  };
}

function addCandidateBySku(matches: LooseMatch[], products: LooseRecord[], sku: string, reason: string, confidence = 72): void {
  const wanted = skuKey(sku);
  const wantedKeys = skuLookupKeys(sku);

  if (!wanted) {
    return;
  }

  const existingMatch = matches.find((match) => wantedKeys.includes(skuKey(getSku(match))));
  if (existingMatch) {
    existingMatch.sku = sku;
    return;
  }

  const product = findProductBySku(products, sku);

  if (!product) {
    return;
  }

  matches.push(makeEligibilityCandidateFromProduct(product, reason, confidence, sku));
}

function addCandidatesByPredicate(
  matches: LooseMatch[],
  products: LooseRecord[],
  predicate: (product: LooseRecord) => boolean,
  reason: string,
  limit = 4,
  confidence = 66,
): void {
  let added = 0;
  const present = new Set(matches.map((match) => skuKey(getSku(match))));

  for (const product of products) {
    const sku = skuKey(product?.sku ?? product?.model ?? product?.partNumber);

    if (!sku || present.has(sku)) {
      continue;
    }

    if (!predicate(product)) {
      continue;
    }

    matches.push(makeEligibilityCandidateFromProduct(product, reason, confidence));
    present.add(sku);
    added += 1;

    if (added >= limit) {
      return;
    }
  }
}


export function ensureEligibilityCandidatePool(
  matches: LooseMatch[],
  products: LooseRecord[],
  intent: CompareIntentKind,
  competitorText: string,
  avoipRecommendation: NetworkHdAvoipRecommendation,
): LooseMatch[] {
  const nextMatches = [...matches];

  // AVoIP endpoints: inject only the truth-resolved series (correct network class
  // + codec + role, banned SKUs already removed). This never mixes 10G and 1G.
  if (AVOIP_ENDPOINT_INTENTS.has(intent) && avoipRecommendation.applies) {
    let added = 0;

    for (const sku of avoipRecommendation.candidateSkus) {
      addCandidateBySku(
        nextMatches,
        products,
        sku,
        `Eligibility correction: NetworkHD ${avoipRecommendation.series} (${avoipRecommendation.networkClass.toUpperCase()}) candidate inserted for AVoIP comparison.`,
        80,
      );

      added += 1;

      if (added >= 6) {
        break;
      }
    }
  }

  if (intent === "matrix" || intent === "hdbaset-matrix") {
    const size = extractMatrixSizeFromText(competitorText);
    const prefersHdBaseTMatrix = /\bhdbaset\b|\bhdbt\b|\btps\b/i.test(competitorText);

    if (size.inputs === 4 && size.outputs === 4) {
      addCandidateBySku(nextMatches, products, "MXV-0404-H2A-KIT", "Eligibility correction: correctly sized 4x4 HDBaseT matrix candidate inserted for routed matrix comparison.", 90);
      addCandidateBySku(nextMatches, products, "MX-0404-HDMI", "Eligibility correction: correctly sized 4x4 HDMI matrix candidate inserted for routed matrix comparison.", 84);
      addCandidateBySku(nextMatches, products, "MX-0404-SCL", "Eligibility correction: correctly sized 4x4 scaling matrix candidate inserted for routed matrix comparison.", 82);
    }

    if (size.inputs === 4 && size.outputs === 2) {
      addCandidateBySku(nextMatches, products, "MX-0402-MST", "Eligibility correction: correctly sized 4x2 WyreStorm matrix candidate inserted ahead of oversized 8x8 options.", 86);
      addCandidatesByPredicate(
        nextMatches,
        products,
        (product) => /0402|4X2/.test(skuKey(product.sku)) && (/^MX/.test(skuKey(product.sku)) || /\b(matrix|switcher|routed)\b/i.test(productText(product))),
        "Eligibility correction: correctly sized 4x2 matrix/switching candidate inserted ahead of oversized 8x8 options.",
        4,
        82,
      );
    }

    if (size.inputs === 8 && size.outputs === 8) {
      addCandidateBySku(nextMatches, products, "MXV-0808-H2A-KIT", "Eligibility correction: correctly sized 8x8 HDBaseT matrix candidate inserted for routed matrix comparison.", 90);
      addCandidateBySku(nextMatches, products, "MXV-0808-H2A-70-V3", "Eligibility correction: correctly sized 8x8 long-reach HDBaseT matrix candidate inserted for routed matrix comparison.", 88);
      addCandidateBySku(nextMatches, products, "MX-0808-H2A-MK2", "Eligibility correction: correctly sized 8x8 HDMI matrix candidate inserted for routed matrix comparison.", 86);
      addCandidateBySku(nextMatches, products, "MX-0808-SCL-V2", "Eligibility correction: correctly sized 8x8 scaling matrix candidate inserted for routed matrix comparison.", 84);
    }

    if (
      size.inputs &&
      size.outputs &&
      size.inputs <= 8 &&
      size.outputs <= 8 &&
      !(size.inputs === 4 && size.outputs === 2) &&
      !(size.inputs === 4 && size.outputs === 4) &&
      !(size.inputs === 8 && size.outputs === 8)
    ) {
      const overCapacityReason = `Eligibility correction: nearest larger fixed matrix candidates inserted because WyreStorm does not offer an exact ${size.inputs}x${size.outputs} routed matrix. More I/O is acceptable only if the room still stays in the same matrix architecture.`;

      if (prefersHdBaseTMatrix) {
        addCandidateBySku(nextMatches, products, "MXV-0808-H2A-KIT", overCapacityReason, 88);
        addCandidateBySku(nextMatches, products, "MXV-0808-H2A-70-V3", `${overCapacityReason} Use the longer-reach path only when distance requires it.`, 84);
        addCandidateBySku(nextMatches, products, "MX-0808-KIT-V2", `${overCapacityReason} Older kit path, so verify bandwidth and topology before quote.`, 80);
      }

      addCandidateBySku(nextMatches, products, "MX-0808-H2A-MK2", overCapacityReason, prefersHdBaseTMatrix ? 82 : 88);
      addCandidateBySku(nextMatches, products, "MX-0808-SCL-V2", `${overCapacityReason} Only keep the scaling path in play if scaling is commercially useful.`, prefersHdBaseTMatrix ? 78 : 84);
    }
  }

  if (intent === "distribution-amplifier") {
    addCandidateBySku(nextMatches, products, "SP-0104-H2", "Eligibility correction: four-output HDMI distribution amplifier inserted for mirrored distribution.", 88);
    addCandidateBySku(nextMatches, products, "SP-0108-SCL", "Eligibility correction: eight-output HDMI distribution amplifier inserted for mirrored distribution.", 90);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^SP|^EXPSP/.test(skuKey(product.sku)) || /\b(splitter|distribution amplifier)\b/i.test(productText(product)),
      "Eligibility correction: same-topology HDMI distribution candidate inserted.",
      4,
      84,
    );
  }

  if (intent === "presentation-switcher" || intent === "uc-byod") {
    addCandidateBySku(nextMatches, products, "MX-0402-MST", "Eligibility correction: presentation switcher candidate inserted for compact meeting-room switching workflow.", 86);
    addCandidateBySku(nextMatches, products, "MX-0403-H3-MST", "Eligibility correction: presentation switcher candidate inserted for presentation rooms that also need a stronger room-core output path.", 84);
    addCandidateBySku(nextMatches, products, "SW-620-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for meeting-room collaboration workflow.", 84);
    addCandidateBySku(nextMatches, products, "SW-640L-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for BYOD/BYOM workflow.", 82);
    addCandidateBySku(nextMatches, products, "APO-VX20-UC-V2", "Eligibility correction: UC room hardware candidate inserted for conferencing workflow comparison.", 78);
  }

  if (intent === "extender") {
    addCandidateBySku(nextMatches, products, "EX-70-H2", "Eligibility correction: HDBaseT extender candidate inserted for point-to-point transport comparison.", 84);
    addCandidateBySku(nextMatches, products, "EX-35-H2", "Eligibility correction: compact HDBaseT extender candidate inserted for shorter point-to-point transport comparison.", 82);
    addCandidateBySku(nextMatches, products, "EX-100-USB3", "Eligibility correction: USB 3 extension candidate inserted for USB/KVM workflow comparison.", 84);
    addCandidateBySku(nextMatches, products, "EX-100-KVM", "Eligibility correction: KVM-capable HDBaseT extender candidate inserted for point-to-point transport comparison.", 82);
    addCandidateBySku(nextMatches, products, "EX-60-USB2", "Eligibility correction: USB 2 extension candidate inserted for USB workflow comparison.", 80);
    addCandidateBySku(nextMatches, products, "NHD-USB-TRX", "Eligibility correction: USB over IP transceiver inserted for USB extension workflow comparison.", 78);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^EX/.test(skuKey(product.sku)) && /\b(hdbaset|hdbt|extender|extension)\b/i.test(productText(product)),
      "Eligibility correction: current HDBaseT extender candidate inserted for class, reach and bandwidth evaluation.",
      20,
      80,
    );
  }

  if (intent === "video-wall-processor") {
    addCandidateBySku(nextMatches, products, "SW-0206-VW", "Eligibility correction: dedicated video wall processor inserted ahead of generic AVoIP or multiview alternatives.", 88);
    addCandidateBySku(nextMatches, products, "SW-0204-VW", "Eligibility correction: simpler preset-layout video wall processor inserted for basic wall requirements.", 84);
  }

  if (intent === "multiview") {
    addCandidateBySku(nextMatches, products, "NHD-0401-MV", "Eligibility correction: dedicated multiview processor inserted for a multi-source single-output canvas.", 88);
    addCandidateBySku(nextMatches, products, "NHD-150-RX", "Eligibility correction: NetworkHD multiview receiver inserted for AVoIP multiview workflow.", 84);
  }

  if (intent === "ndi-camera") {
    addCandidateBySku(nextMatches, products, "CAM-210-NDI-PTZ", "Eligibility correction: WyreStorm NDI PTZ camera inserted for an NDI camera comparison.", 90);
    addCandidateBySku(nextMatches, products, "CAM-0402-NDI-BRG", "Eligibility correction: NDI camera bridge inserted as an architecture alternative where several cameras must become one feed.", 78);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^CAM/.test(skuKey(product.sku)) && /\bndi\b/i.test(productText(product)),
      "Eligibility correction: current WyreStorm NDI camera candidate inserted for camera-role comparison.",
      4,
      86,
    );
  }

  if (intent === "ptz-camera") {
    addCandidateBySku(nextMatches, products, "CAM-420-PTZ", "Eligibility correction: current WyreStorm PTZ camera inserted for camera-role comparison.", 90);
    addCandidateBySku(nextMatches, products, "CAM-210-PTZ", "Eligibility correction: WyreStorm PTZ camera inserted for camera-role comparison.", 86);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^CAM/.test(skuKey(product.sku)) && /\bptz\b/i.test(productText(product)),
      "Eligibility correction: current WyreStorm PTZ camera candidate inserted for camera-role comparison.",
      4,
      84,
    );
  }

  if (intent === "wireless-casting") {
    const competitorIsDongle = isExplicitCastingAccessoryComparison(competitorText);

    addCandidateBySku(nextMatches, products, "SW-620-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for wireless casting comparison.", 88);
    addCandidateBySku(nextMatches, products, "SW-640L-TX-W", "Eligibility correction: wireless presentation switcher candidate inserted for multi-source wireless presentation comparison.", 86);

    // DG2 is not a generic wireless-presentation match. Add it only when the
    // compared competitor is explicitly a casting dongle. A compatible room
    // core remains in the pool so the UI can present the required paired path.
    if (competitorIsDongle) {
      addCandidateBySku(
        nextMatches,
        products,
        "APO-DG2",
        "Eligibility correction: explicit casting-dongle comparison inserts APO-DG2 alongside a compatible WyreStorm room core.",
        92,
      );
    }

    addCandidateBySku(nextMatches, products, "APO-VX20-UC-V2", "Eligibility correction: Apollo collaboration product retained as a UC-room alternative, not the default switcher match.", 70);
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => {
        const candidateKey = skuKey(product.sku ?? product.model ?? product.partNumber);

        if (/^APODG2/.test(candidateKey)) {
          return competitorIsDongle;
        }

        return /^APO/.test(candidateKey) || /\b(apollo|wireless|casting)\b/i.test(productText(product));
      },
      "Eligibility correction: WyreStorm Apollo or wireless collaboration product inserted for wireless casting comparison.",
      4,
      76,
    );
  }

  if (intent === "usb-audio") {
    addCandidatesByPredicate(
      nextMatches,
      products,
      (product) => /^APO/.test(String(product.sku ?? "")) || /\b(usb|audio|mic|conferenc)\b/i.test(productText(product)),
      "Eligibility correction: WyreStorm USB audio or conferencing candidate inserted for USB audio comparison.",
      4,
      72,
    );
  }

  if (intent === "controller-accessory") {
    addCandidateBySku(
      nextMatches,
      products,
      "NHD-CTL-PRO-V2",
      "Eligibility correction: current NetworkHD system controller inserted as the closest ecosystem-role equivalent for AVoIP control and management.",
      90,
    );
  }

  return nextMatches;
}

