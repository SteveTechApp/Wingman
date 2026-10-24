import type { CompetitorAvoipClassification, NetworkHdAvoipRecommendation } from "../../lib/networkHdAvoipEquivalence";
import { isBannedNetworkHdSku } from "../../lib/networkHdAvoipEquivalence";
import { isWyreStormSkuCompareLeadAllowed } from "../../lib/wyrestormSkuBusinessStatus";
import type { ScoredCandidate, Verdict, WyreStormProduct } from "../../features/compare";
import { uniqueSkuOptions } from "./textTokens";
import { candidateRequiredDependencies, plainLanguageOutcome } from "./compareCompetitorFacts";
import {
  isEighteenGigMatrix,
  isHdBaseTMatrix,
  matrixInputCount,
  matrixOutputCount,
  matrixReceiverRequirement,
  wantsClassA,
} from "./compareProfileSignals";
import type { CompetitorProfile } from "./compareTypes";

/**
 * The two catalogue shortcuts that answer a brief directly instead of scoring
 * every product: the AVoIP endpoint pair and the 18Gbps 8x8 HDBaseT matrix.
 *
 * This was the candidate-building half of `ComparePageNew.advanced.tsx`. Both
 * builders are pure; the product catalogue they look SKUs up in is not, because
 * the page swaps it for the real catalogue once it loads — so the lookup is
 * passed in rather than imported, and the page keeps owning the mutable list.
 */

/** Where a builder resolves a SKU: the page's current WyreStorm catalogue. */
export type WyrestormProductLookup = (sku: string) => WyreStormProduct | undefined;


function synthAvoipProduct(sku: string): WyreStormProduct {
  const upper = sku.toUpperCase();

  return {
    sku,
    name: sku,
    family: "NetworkHD",
    productClass: "AV-over-IP",
    role: upper.endsWith("-RX") ? "Decoder / receiver" : upper.endsWith("-TX") ? "Encoder / transmitter" : "Transceiver",
    transport: "AVoIP",
    tags: ["avoip"],
    caveat: "Confirm controller, codec, USB/audio/control requirements and network design before quoting.",
  };
}

function avoipCandidateSpecificEvidence(product: WyreStormProduct): {
  matched: string[];
  partial: string[];
  mismatches: string[];
  unknowns: string[];
  dependencies: string[];
} {
  const upper = product.sku.toUpperCase();

  if (upper === "NHD-500-TX") {
    return {
      matched: [
        "Standard NetworkHD 500 source-side encoder path.",
        "Fits the 1GbE visually-lossless / 4K60 4:4:4 WyreStorm AVoIP lane.",
      ],
      partial: [],
      mismatches: [],
      unknowns: ["Verify whether the competitor also expects USB, audio-network or wall-plate behaviour beyond the base encoder role."],
      dependencies: [
        "Specify one NHD-CTL-PRO-V2 controller per system unless the site already has one.",
        "Quote matching decoder endpoints separately for the display side.",
      ],
    };
  }

  if (upper === "NHD-500-E-TX") {
    return {
      matched: [
        "Same NetworkHD 500 encoder family and same source-side AVoIP role.",
        "Useful when the brief only needs a simpler encoder endpoint rather than a richer feature set.",
      ],
      partial: ["This is a lighter NetworkHD 500 encoder path, so confirm that no additional endpoint features are expected."],
      mismatches: [],
      unknowns: ["Verify whether the competitor endpoint expects any feature beyond the lighter encoder role before using this as the lead answer."],
      dependencies: [
        "Specify one NHD-CTL-PRO-V2 controller per system unless the site already has one.",
        "Quote matching decoder endpoints separately for the display side.",
      ],
    };
  }

  if (upper === "NHD-510-TX") {
    return {
      matched: [
        "Same NetworkHD 500 source-side encoder architecture.",
        "Only makes commercial sense when the competitor brief points toward Dante / network-audio workflow value.",
      ],
      partial: ["This is the stronger audio-network encoder option, so it is only a better fit if Dante-style audio handling matters."],
      mismatches: [],
      unknowns: ["Verify whether the competitor sale actually includes Dante / audio-network expectations before leading with NHD-510-TX."],
      dependencies: [
        "Specify one NHD-CTL-PRO-V2 controller per system unless the site already has one.",
        "Quote matching decoder endpoints separately for the display side.",
        "Confirm the audio-network design and who owns Dante configuration before quoting.",
      ],
    };
  }

  if (upper.includes("-IW-")) {
    return {
      matched: ["Same AVoIP endpoint direction with an in-wall installation form factor."],
      partial: ["Only a better fit if the physical wall-plate format is actually required."],
      mismatches: [],
      unknowns: ["Verify whether the project truly needs an in-wall endpoint rather than a standard chassis."],
      dependencies: [],
    };
  }

  return {
    matched: [product.name],
    partial: [],
    mismatches: [],
    unknowns: ["Verify endpoint feature detail before quoting."],
    dependencies: [],
  };
}

export function buildAvoipCandidates(
  profile: CompetitorProfile,
  classification: CompetitorAvoipClassification,
  recommendation: NetworkHdAvoipRecommendation,
  findProduct: WyrestormProductLookup,
): ScoredCandidate[] {
  const networkNote = `Same network class: ${recommendation.networkClass.toUpperCase()}.`;
  const identityNote = classification.knownFamily ? `Competitor identified as ${classification.knownFamily}.` : `Detected endpoint role: ${classification.role}.`;
  const verifyGap = recommendation.verifyCodec ? ["Confirm the video transport method before choosing between NetworkHD 500 and NetworkHD 100."] : [];
  const bandwidthNote = classification.signals.includes("explicit 4K60 4:4:4 signal")
    ? "4K60 4:4:4 requirement detected. Stay in NetworkHD 500 or 600; do not drop to NetworkHD 100."
    : "";

  return recommendation.candidateSkus
    .filter((sku) => !isBannedNetworkHdSku(sku))
    .map((sku, index) => {
      const product = findProduct(sku) ?? synthAvoipProduct(sku);
      const specific = avoipCandidateSpecificEvidence(product);
      const isLead = index === 0;
      const score = recommendation.verifyCodec ? (isLead ? 70 : 60) : isLead ? 94 : 82;
      const verdict: Verdict = score >= 72 ? "GOOD MATCH" : score >= 42 ? "PARTIAL MATCH" : "NO MATCH";

      const candidate: ScoredCandidate = {
        product,
        score,
        verdict,
        matched: uniqueSkuOptions([recommendation.reason, networkNote, identityNote, bandwidthNote, ...specific.matched]),
        checks: uniqueSkuOptions([
          recommendation.controllerReminder,
          product.caveat,
          classification.signals.includes("explicit 4K60 4:4:4 signal")
            ? "Confirm whether the customer expects 4K60 4:4:4 on every endpoint, because that rules out the NetworkHD 100 series."
            : "",
        ]),
        gaps: uniqueSkuOptions(verifyGap),
        partialMatches: uniqueSkuOptions(specific.partial),
        mismatches: uniqueSkuOptions(specific.mismatches),
        unknowns: uniqueSkuOptions([
          ...specific.unknowns,
          recommendation.verifyCodec ? "Competitor video transport method is not proven from local evidence." : "",
          "Verify USB, audio, control and any non-video feature expectations before quoting.",
        ]),
        blockers: uniqueSkuOptions([
          classification.role === "encoder" && product.role.includes("Decoder") ? "Wrong endpoint direction for a direct replacement." : "",
          classification.role === "decoder" && product.role.includes("Encoder") ? "Wrong endpoint direction for a direct replacement." : "",
        ]),
        dependencies: uniqueSkuOptions([
          ...specific.dependencies,
          recommendation.controllerReminder,
          ...candidateRequiredDependencies(product, profile),
        ]),
        outcomeLabel: "Feature check needed",
      };

      return {
        ...candidate,
        outcomeLabel: plainLanguageOutcome(profile, candidate),
      };
    })
    .slice(0, 8);
}

export function buildMatrixCandidates(
  profile: CompetitorProfile,
  findProduct: WyrestormProductLookup,
): ScoredCandidate[] | null {
  if (!isHdBaseTMatrix(profile) || !isEighteenGigMatrix(profile)) {
    return null;
  }

  const inputs = matrixInputCount(profile);
  const outputs = matrixOutputCount(profile);
  const is8x8 = inputs === 8 && outputs === 8;

  if (!is8x8) {
    return null;
  }

  const classA = wantsClassA(profile);
  const leadSku = classA ? "MXV-0808-H2A-70-V3" : "MXV-0808-H2A-MK2";
  const alternateSku = classA ? "MXV-0808-H2A-MK2" : "MXV-0808-H2A-70-V3";
  // Unlike the generic scoring path below, this hardcoded matrix shortcut built its
  // own candidates without the isWyreStormSkuCompareLeadAllowed business-status
  // gate - a future discontinued/do-not-spec matrix SKU would still be shown as a
  // lead. Guard it the same way here.
  const lead = isWyreStormSkuCompareLeadAllowed(leadSku) ? findProduct(leadSku) : undefined;
  const alternate = isWyreStormSkuCompareLeadAllowed(alternateSku) ? findProduct(alternateSku) : undefined;
  const fallback = isWyreStormSkuCompareLeadAllowed("MX-0808-KIT-V2") ? findProduct("MX-0808-KIT-V2") : undefined;

  const leadMatched = [
        `18Gbps 8x8 HDBaseT matrix path is a closer WyreStorm fit than the kit-style MX matrix path.`,
    classA
      ? "Class A / 70m brief detected. Use the MXV-70 path rather than the shorter Class B matrix."
      : "No Class A requirement detected. Default to the standard MXV Class B / 35m matrix path.",
    `Mainframe recommendation: ${leadSku}. ${matrixReceiverRequirement(profile, classA)}`,
  ];

  const leadChecks = [
    matrixReceiverRequirement(profile, classA),
    classA
      ? "WyreStorm Class A HDBaseT is denoted by '70' in the SKU. Confirm distance really needs the longer Class A path."
      : "If the room needs longer Class A HDBaseT distance, step up to the '70' MXV path instead.",
    "Confirm the actual CAT cable run and whether the quoted distance must hold at 4K60 4:4:4 or only at 1080p.",
    "Commercial reminder: getting HDBaseT class or transmitted resolution wrong can either push price up unnecessarily or stop the signal transporting reliably.",
    "Confirm mirrored outputs, audio breakouts and scaler requirements before quote.",
  ];

  const candidates: ScoredCandidate[] = [];

  if (lead) {
    const leadCandidate: ScoredCandidate = {
      product: lead,
      score: 95,
      verdict: "GOOD MATCH",
      matched: uniqueSkuOptions(leadMatched),
      checks: uniqueSkuOptions(leadChecks),
      gaps: [],
      partialMatches: [],
      mismatches: [],
      unknowns: uniqueSkuOptions([
        "Verify HDMI version, HDCP version and control behaviour before quoting.",
        "Verify whether every destination really needs HDBaseT and at what resolution over distance.",
      ]),
      blockers: [],
      dependencies: uniqueSkuOptions(candidateRequiredDependencies(lead, profile)),
      outcomeLabel: "Same product job",
    };
    candidates.push(leadCandidate);
  }

  if (alternate) {
    const alternateCandidate: ScoredCandidate = {
      product: alternate,
      score: 83,
      verdict: "PARTIAL MATCH",
      matched: uniqueSkuOptions([
        classA
          ? "Alternative shorter-distance Class B MXV path if Class A distance is not actually required."
          : "Alternative longer-distance Class A MXV path if the brief later proves to need it.",
        `Mainframe recommendation: ${alternateSku}. ${matrixReceiverRequirement(profile, !classA)}`,
      ]),
      checks: uniqueSkuOptions([
        matrixReceiverRequirement(profile, !classA),
        "Choose this path only if the HDBaseT class and distance requirement justify it.",
      ]),
      gaps: uniqueSkuOptions([
        classA ? "Shorter Class B distance may be wrong for this brief." : "Longer Class A path may add cost if distance does not require it.",
      ]),
      partialMatches: uniqueSkuOptions([
        "Same 8x8 MXV architecture, but the HDBaseT class/distance assumption differs from the current lead path.",
      ]),
      mismatches: [],
      unknowns: uniqueSkuOptions([
        "Verify actual cable distance and transmitted signal requirement before switching HDBaseT class.",
      ]),
      blockers: [],
      dependencies: uniqueSkuOptions(candidateRequiredDependencies(alternate, profile)),
      outcomeLabel: "Feature check needed",
    };
    candidates.push(alternateCandidate);
  }

  if (fallback) {
    const fallbackCandidate: ScoredCandidate = {
      product: fallback,
      score: 34,
      verdict: "NO MATCH",
      matched: ["Older fixed-I/O matrix family only."],
      checks: uniqueSkuOptions([
        "Avoid using MX-0808-KIT-V2 as the lead answer for an 18Gbps 8x8 HDBaseT matrix brief.",
        "If 18Gbps / 4K60 4:4:4 matters, stay in the MXV family instead.",
      ]),
      gaps: uniqueSkuOptions([
        "MX-0808-KIT-V2 is not the right 18Gbps matrix path for this competitor brief.",
      ]),
      partialMatches: [],
      mismatches: ["Kit-style matrix path does not satisfy the evidenced 18Gbps / 4K60 4:4:4 HDBaseT requirement."],
      unknowns: [],
      blockers: ["Do not quote MX-0808-KIT-V2 as the direct replacement for this brief."],
      dependencies: [],
      outcomeLabel: "Wrong product type",
    };
    candidates.push(fallbackCandidate);
  }

  return candidates;
}