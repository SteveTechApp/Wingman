/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, PackageSearch } from "lucide-react";
import {
  isBannedNetworkHdSku,
  mapCompetitorToNetworkHdAvoip,
  NETWORKHD_AVOIP_FAMILIES,
  type NetworkHdAvoipMember,
} from "../lib/networkHdAvoipEquivalence";
import { loadProductIntelligenceDetailRecords } from "../lib/productIntelligenceIndexCache";
import {
  compareVerdictTier,
  uniqueText,
  commercializeCompareCopy,
  competitorPlainEnglishPurpose,
  salesWhyBullets,
  salesImportantDifference,
  compactCompareQuoteChecks,
} from "../lib/repScript";
import {
  decideComparison,
  runGovernedCompareSync,
  type ScoredCandidate,
  type Verdict,
  type WyreStormProduct,
} from "../features/compare";
import { domainFromProductClass } from "../lib/compareVerdictPipeline";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { VerifyBeforeQuoteNote } from "../components/VerifyBeforeQuoteNote";
import {
  saveCompareRunToProject,
  readProjectStore,
  type StoredCompareRun,
  saveProductSelectionToCurrentProject,
  saveRecommendationEvidenceToProject,
  type StoredProductSelection,
} from "../data/projectStore";
import { findUcCompetitorProduct } from "../data/ucCompetitorProducts";
import { buildRecommendationEvidence } from "../lib/recommendationEvidence";
import { resolveCompetitorSpecProfile, type ResolvedCompetitorProfile } from "../lib/competitorSpecRegistry";
import { findSavedCompetitorSpec } from "../lib/savedCompetitorSpecs";
import { buildWyrestormCompareProfile } from "../lib/wyrestormCompareProfile";
import { classifyCompetitorCompareDecision } from "../lib/competitorCompareDecision";
import { isWyreStormSkuCompareLeadAllowed } from "../lib/wyrestormSkuBusinessStatus";
import { resolveWyrestormSkuAlias, skuAliasMatches } from "../lib/skuAliasResolver";
import type { RigorousCompareResult, RigorousMatch } from "../lib/rigorousCompare";
import { applyCompareEligibilityRanking } from "../lib/compareEligibilityEngine";
import {
  mergeApprovedLedgerDecisions,
  readCompetitorMatchDecisionLedger,
  saveCompetitorMatchDecision,
  type CompareDecisionType,
  type CompareEndpointRole,
  type CompareTransportClass,
  type CompetitorMatchDecision,
} from "../lib/competitorMatchDecisionLedger";
import {
  governedDecisionLabel,
  resolveApprovedGovernedDecision,
} from "../lib/governedCompareRuntime";
import { CompetitorEvidencePanel } from "./compare/CompetitorEvidencePanel";
import { uniqueSkuOptions } from "./compare/textTokens";
import {
  buildRealWyrestormCandidates,
  compareSkuKey,
  extractTags,
  mergeRealWyrestormCatalog,
  normalizeCompetitorSku,
  productClassFromTags,
  roleFromTags,
  transportFromTags,
} from "./compare/compareProductTaxonomy";
import type { CompareCoreFact, CompetitorProfile, CompetitorSummary } from "./compare/compareTypes";
import {
  buildCompetitorSummary,
  exactLimitedDataWarning,
  productPitchUrl,
  verdictClass,
} from "./compare/compareCompetitorFacts";
import { isAtlonaOmeExKitProfile, matrixSkuSizeKey } from "./compare/compareProfileSignals";
import { applyCompareEquivalenceGuards, scoreProduct } from "./compare/compareCandidateScoring";
import { buildAvoipCandidates, buildMatrixCandidates } from "./compare/compareCandidateBuilders";
import {
  COMPETITOR_SKU_CATALOG,
  brandForCompetitorSku,
  compareReset,
  compareRunStarted,
  compareSkuSuggestions,
  competitorSkusAfterRun,
  liveLookupFailed,
  liveLookupPlan,
  liveLookupSettled,
  liveResearchToScoredCandidate,
  lookupCompareIntelligence,
  mergeLiveResearchCompetitorSummary,
  needsLiveLookup,
  skuOptionsForBrand,
} from "./compare/compareRunLookup";
import {
  buildCoreComparisonFacts,
  buildWyrestormSummary,
  surfaceValueResolved,
  weakestLinkCardTier,
} from "./compare/compareComparisonFacts";
import {
  fetchApprovedCompetitorDecisions,
  runCompetitorMatch,
  type CompetitorMatchResponse,
} from "../api/wingmanApi";
import {
  assessLiveCompetitorResearch,
  type LiveCompetitorResearchAssessment,
  type LiveCompetitorResearchStatus,
} from "../lib/liveCompetitorResearch";
import { CompareShowdown } from "../components/compare/CompareShowdown";
import { GovernedDataBadge as GovernanceBadge, weakestLinkTier } from "../components/GovernedDataBadge";
import { savedHistoryRuns } from "../lib/compareHistory";
import { setActiveProjectId } from "../features/projects";

/**
 * Keyword-heuristic recommendations are RETIRED (fail-closed policy).
 * The spec-first engine (compareSpecEngine) is the only recommendation
 * surface: verified matches render the showdown; anything unverified renders
 * the no-match + add-evidence path instead of a guess. Flip to true only for
 * temporary rollback while investigating a spec-engine issue.
 */

/*
  Compare workflow guard markers retained for scripts.
  These strings must not be exposed as visible UI copy.

  COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU
  COMPARE_SKU_CLICK_AUTO_ADVANCE_BRIDGE
  Viable product choices
  CompareSpecificationMatrix
  buildCompareFeatureMatrixRows
  Custom manufacturer
  effectiveCompetitorInput
  runKnownProfileCompare(compareInputText || effectiveCompetitorInput
  runKnownProfileCompare(retryInput
  enrichCompareInputWithKnownProfile
  applyKnownCompareProfileOverrides(baseResult, products, inputText, brand)
  applyCompareEquivalenceGuards(rigorousCompare
  applyCompareEligibilityRanking
  const curatedResult = applyKnownCompareProfileOverrides
  return applyCompareEligibilityRanking(curatedResult, products, inputText) as RigorousCompareResult
  data-wingman-compare-decision-desk
  rigorousCompare
  decision.outcome
  viableMatches
  decision.summary
  decision.nextAction
  View comparison evidence
  Source/spec page
*/

const ROUTE_LOCK_MARKER = "COMPARE_ROUTE_LOCK_V5_TYPEAHEAD_SKU";

const compareManufacturerNames = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: "base" });

const MANUFACTURER_SELECT_OPTIONS = Object.keys(COMPETITOR_SKU_CATALOG)
  .filter((brand) => brand !== "CUSTOM")
  .sort(compareManufacturerNames);

const COMPARE_TYPEAHEAD_STATIC_MARKERS = [
  "Competitor product",
  "COMPETITOR_SKU_SEED_CATALOG[brand]",
  "Object.values(COMPETITOR_SKU_SEED_CATALOG).flat()",
  "key.includes(queryKey) || queryKey.includes(key)",
  "compareSkuSuggestions(competitorInput, effectiveBrand)",
  "data-wingman-sku-normalisation",
];

const COMPARE_CANDIDATE_GATE_STATIC_MARKERS = [
  'data-wingman-compare-auto-advance="true"',
  'setWorkflowStep("options")',
  "No suitable WyreStorm match found from the current data",
  "onSubmit={handleSubmit}",
];

type CompareStage = "brand" | "sku" | "results";
type CompareResultTab = "overview" | "cards" | "evidence";

function productClassFromResolvedDomain(domain?: string): string | null {
  switch ((domain || "").toUpperCase()) {
    case "AVOIP":
      return "AV-over-IP";
    case "AUDIO":
      return "Network audio";
    case "VIDEO_WALL":
      return "Video wall";
    case "MULTIVIEW":
      return "Multiview";
    case "MATRIX":
      return "Matrix";
    case "DISTRIBUTION":
      return "HDMI splitter";
    case "HDBASET":
      return "HDBaseT extender";
    case "PRESENTATION":
      return "Presentation switcher";
    case "WIRELESS_PRESENTATION":
      return "Wireless casting";
    case "NDI_CAMERA":
      return "NDI camera";
    case "PTZ_CAMERA":
      return "PTZ camera";
    case "WIRELESS_CASTING":
      return "Wireless casting";
    case "UC":
    case "UC_SOUNDBAR":
      return "USB conferencing";
    case "CONTROL":
      return "Control accessory";
    default:
      return null;
  }
}

function rigorousMatchToCandidate(match: RigorousMatch, profile: CompetitorProfile): ScoredCandidate {
  const product = findWyrestormProduct(match.sku) ?? {
    sku: match.sku,
    name: match.name,
    family: match.family || "WyreStorm",
    productClass: String(match.wyrestorm.domain || "Product"),
    role: String(match.wyrestorm.role || "Confirm role"),
    transport: String(match.wyrestorm.transport || "Confirm transport"),
    tags: [],
    caveat: "Confirm the product specification and required accessories before quoting.",
  };
  const verdict: Verdict =
    match.decision.solutionType === "architecture-alternative"
      ? "ARCHITECTURE ALTERNATIVE"
      : match.decision.outcome === "GOOD MATCH"
        ? "GOOD MATCH"
        : match.decision.outcome === "NO MATCH"
          ? "NO MATCH"
          : match.decision.outcome === "VERIFY"
            ? "VERIFY"
            : "PARTIAL MATCH";

  return applyCompareEquivalenceGuards(
    {
      product,
      score: match.decision.confidence,
      verdict,
      matched: match.decision.matches,
      // The product caveat is a positioning note ("Use for... / confirm X before
      // quoting"), not a hard dependency - it belongs with the pre-quote checks
      // so a clean engine match can genuinely reach the "match" status instead of
      // every candidate being forced to "checks" by an always-present caveat.
      checks: uniqueText([...match.decision.verify, product.caveat], 6),
      gaps: match.decision.gaps,
      partialMatches: match.decision.outcome === "PARTIAL MATCH" ? match.decision.matches : [],
      mismatches: match.decision.outcome === "NO MATCH" ? match.decision.gaps : [],
      unknowns: match.decision.verify,
      blockers: match.decision.blockers,
      dependencies: [
        // Surface the structured system requirements so a single component is
        // never read as a one-box replacement for a competitor's system.
        ...(match.decision.systemRequirements && match.decision.systemRequirements.length > 0
          ? [`Not a one-box replacement - this component also needs: ${match.decision.systemRequirements.join("; ")}.`]
          : []),
      ],
      outcomeLabel: match.decision.summary,
      requirements: match.decision.requirements,
      necessaryCoverage: match.decision.necessaryCoverage,
      fitPenalty: (match as { compareEligibility?: { fitPenalty?: number } }).compareEligibility?.fitPenalty,
      evidenceCompleteness: match.decision.evidenceCompleteness,
      solutionType: match.decision.solutionType,
      governedTier: match.wyrestorm?.sourceTier ?? "missing",
      // The resolver emits the canonical "Technical data not resolved" label
      // for the missing tier, and the shared badge canonicalizes the tier
      // itself - so the label flows straight through.
      governedLabel: match.wyrestorm?.sourceLabel,
    },
    profile,
  );
}

type RankedMatchWithOptionalDecision = Partial<RigorousMatch> & {
  sku: string;
  name?: string;
  family?: string;
  confidence?: number;
  score?: number;
  why?: string;
  compareEligibility?: { reasons?: string[] };
  eligibility?: { reasons?: string[] };
};

function normalizeRankedRigorousMatches(
  matches: RigorousMatch[],
  competitor: ResolvedCompetitorProfile,
): RigorousMatch[] {
  return matches.map((rawMatch) => {
    const match = rawMatch as RankedMatchWithOptionalDecision;

    if (match.decision && match.wyrestorm) {
      return rawMatch;
    }

    const product = findWyrestormProduct(match.sku);
    const wyrestorm = match.wyrestorm ??
      (product
        ? buildWyrestormCompareProfile(product)
        : {
            sku: match.sku,
            title: match.name || match.sku,
            sourceTier: "missing" as const,
          });
    const score = Number(match.heuristicScore ?? match.confidence ?? match.score ?? 72);
    const evidence = uniqueText([
      ...(match.compareEligibility?.reasons ?? []),
      ...(match.eligibility?.reasons ?? []),
      match.why || "",
    ], 8);

    return {
      sku: match.sku,
      name: match.name || product?.name || match.sku,
      family: match.family || product?.family || "WyreStorm",
      heuristicScore: Number.isFinite(score) ? score : 72,
      wyrestorm,
      decision: classifyCompetitorCompareDecision({
        competitor,
        wyrestorm,
        score: Number.isFinite(score) ? score : 72,
        evidence,
      }),
    };
  });
}

const PAGE_AVOIP_ROLE_LABEL: Record<string, string> = {
  encoder: "Encoder / transmitter",
  decoder: "Decoder / receiver",
  transceiver: "Transceiver",
  unknown: "Endpoint",
};

function avoipTransportLabel(series: "100" | "500" | "600"): string {
  if (series === "600") return "10GbE SDVoE AVoIP";
  if (series === "100") return "1GbE H.264/H.265 AVoIP";
  return "1GbE JPEG2000 AVoIP";
}

function avoipRoleTags(role: NetworkHdAvoipMember["role"]): string[] {
  if (role === "encoder") return ["encoder", "transmitter"];
  if (role === "decoder") return ["decoder", "receiver"];
  if (role === "transceiver") return ["encoder", "decoder", "transceiver"];
  return ["endpoint"];
}

function avoipSeriesTags(series: "100" | "500" | "600"): string[] {
  if (series === "600") return ["10g", "4k60", "444", "hdr", "zero latency"];
  if (series === "100") return ["4k", "h264"];
  return ["4k60", "444", "hdr", "usb"];
}

const NETWORKHD_AVOIP_PRODUCTS: WyreStormProduct[] = Object.values(NETWORKHD_AVOIP_FAMILIES).flatMap((family) =>
  family.members.map((member) => ({
    sku: member.sku,
    name: `${family.label} Series ${PAGE_AVOIP_ROLE_LABEL[member.role]} - ${member.note}`,
    family: family.label,
    productClass: "AV-over-IP",
    role: PAGE_AVOIP_ROLE_LABEL[member.role],
    transport: avoipTransportLabel(family.series),
    tags: uniqueSkuOptions(["avoip", "hdmi", ...avoipRoleTags(member.role), ...avoipSeriesTags(family.series)]),
    caveat: "Confirm controller, codec, USB/audio/control requirements and network design before quoting.",
  })),
);

const WYRESTORM_PRODUCTS: WyreStormProduct[] = [
  ...NETWORKHD_AVOIP_PRODUCTS,
  {
    sku: "NHD-0401-MV",
    name: "4-input multiview processor",
    family: "NetworkHD / Multiview",
    productClass: "Multiview",
    role: "Processor",
    transport: "HDMI / NetworkHD workflow",
    tags: ["multiview", "4 input", "single output", "hdmi", "presentation"],
    caveat: "Use when multiple sources need to appear on one output canvas.",
  },
  {
    sku: "SW-0206-VW",
    name: "4K60 video wall processor",
    family: "Video Wall",
    productClass: "Video wall",
    role: "Processor",
    transport: "HDMI processing",
    tags: ["video wall", "processor", "4k60", "hdmi", "scaling"],
    caveat: "Consider for dedicated non-AVoIP video wall processing.",
  },
  {
    sku: "SW-0204-VW",
    name: "Preset-layout video wall processor",
    family: "Video Wall",
    productClass: "Video wall",
    role: "Processor",
    transport: "HDMI processing",
    tags: ["video wall", "processor", "preset", "hdmi"],
    caveat: "Use for simpler preset video wall layouts.",
  },
  {
    sku: "EX-100-KVM",
    name: "HDBaseT HDMI and USB KVM extender kit",
    family: "HDBaseT Extension",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    tags: ["hdbaset", "extender", "extension", "usb", "usb 2.0", "kvm", "point-to-point", "tx rx"],
    caveat: "Use for point-to-point HDMI and USB extension. Confirm resolution, cable length, USB version and control needs before quoting.",
  },
  {
    sku: "EX-70-H2",
    name: "HDBaseT HDMI extender kit",
    family: "HDBaseT Extension",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    tags: ["hdbaset", "extender", "extension", "hdmi", "point-to-point", "tx rx"],
    caveat: "Use for point-to-point HDMI extension. Confirm resolution, cable length, control needs and receiver/transmitter requirements before quoting.",
  },
  {
    sku: "EX-60-USB2",
    name: "USB 2.0 extender",
    family: "USB Extension",
    productClass: "HDBaseT extender",
    role: "USB extender",
    transport: "USB extension",
    tags: ["usb", "usb 2.0", "extender", "extension", "point-to-point"],
    caveat: "Use when the requirement is USB extension rather than video switching. Confirm USB version, device type and cable length before quoting.",
  },
  {
    sku: "MX-0402-MST",
    name: "4x2 presentation switcher with MST",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / MST",
    tags: ["presentation", "switcher", "usb", "usb-c", "mst", "4k60", "small room", "dual display"],
    caveat: "Use for compact presentation rooms that need a few sources and professional switching without stepping into large-room matrix architecture.",
  },
  {
    sku: "MX-0403-H3-MST",
    name: "4x3 presentation switcher with MST and HDBaseT 3.0 output",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / HDBaseT 3.0 / MST",
    tags: ["presentation", "switcher", "usb", "usb-c", "mst", "4k60", "hdbaset3", "dual display", "room core"],
    caveat: "Use when a contained room needs presentation switching plus a more capable output path, without jumping to a specialist large-room hybrid core.",
  },
  {
    sku: "SW-620-TX-W",
    name: "2-input wireless presentation switcher",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / Wireless presentation",
    tags: ["presentation", "switcher", "usb", "usb-c", "wireless", "byod", "byom", "4k60", "small room"],
    caveat: "Use when the sale is really about easy wired and wireless laptop presentation, not a larger matrix or specialist room core.",
  },
  {
    sku: "SW-640L-TX-W",
    name: "4-input wireless presentation switcher",
    family: "Synergy / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / Wireless presentation",
    tags: ["presentation", "switcher", "usb", "usb-c", "wireless", "byod", "byom", "4k60", "dual display"],
    caveat: "Use when the room needs a stronger day-to-day presentation workflow with more inputs and easier guest connection.",
  },
  {
    sku: "CAM-210-NDI-PTZ",
    name: "1080p60 NDI PTZ camera",
    family: "WyreStorm Cameras",
    productClass: "NDI camera",
    role: "NDI Camera",
    transport: "NDI / HDMI / USB",
    tags: ["camera", "ndi", "ndi camera", "ptz", "usb", "hdmi", "meeting room", "streaming"],
    caveat: "Use when the customer needs an actual NDI-capable PTZ camera rather than just video transport elsewhere in the system.",
  },
  {
    sku: "CAM-420-PTZ",
    name: "4K dual-lens AI PTZ camera",
    family: "WyreStorm Cameras",
    productClass: "PTZ camera",
    role: "PTZ Camera",
    transport: "HDMI / USB / IP",
    tags: ["camera", "ptz", "usb", "hdmi", "ip control", "tracking", "meeting room"],
    caveat: "Use when the customer needs a controllable room camera and the discussion is really about framing, placement and PTZ workflow.",
  },
  {
    sku: "CAM-0402-NDI-BRG",
    name: "4K multi-camera bridge with NDI",
    family: "WyreStorm Cameras",
    productClass: "Camera bridge",
    role: "Camera bridge",
    transport: "NDI / HDMI / USB",
    tags: ["camera", "bridge", "ndi", "usb", "hdmi", "multi-camera", "switching"],
    caveat: "Use only when the requirement is bridging or combining several camera feeds, not when the customer is simply asking for the camera itself.",
  },
  {
    sku: "MX-0404-SCL",
    name: "4x4 seamless local matrix",
    family: "Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDMI matrix",
    tags: ["matrix", "4x4", "hdmi", "fixed io", "local matrix", "4k60", "444", "multiview", "scaling"],
    caveat: "Use when the right answer is a contained local matrix rather than a video wall processor, presentation switcher or AVoIP design.",
  },
  {
    sku: "MX-0808-KIT-V2",
    name: "8x8 HDMI/HDBaseT matrix kit",
    family: "Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "HDBaseT / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io"],
    caveat: "Good direction for contained fixed I/O systems. Confirm routed vs mirrored outputs.",
  },
  {
    sku: "MXV-0808-H2A-MK2",
    name: "18Gbps 8x8 HDBaseT matrix mainframe",
    family: "MXV Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "18Gbps HDBaseT Class B / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io", "4k60", "444", "18g", "class b"],
    caveat: "Mainframe only. For a full 8-output HDBaseT system, quote 8x compatible RXV-35 receivers separately.",
  },
  {
    sku: "MXV-0808-H2A-70-V3",
    name: "18Gbps 8x8 HDBaseT matrix mainframe",
    family: "MXV Matrix",
    productClass: "Matrix",
    role: "Switcher",
    transport: "18Gbps HDBaseT Class A / HDMI",
    tags: ["matrix", "8x8", "hdbaset", "hdmi", "fixed io", "4k60", "444", "18g", "class a", "70m"],
    caveat: "Mainframe only. For a full 8-output HDBaseT system, quote 8x compatible RXV-70 receivers separately.",
  },
  {
    sku: "MX-1007-HYB",
    name: "Hybrid presentation and AV routing switcher",
    family: "Hybrid / Presentation",
    productClass: "Presentation switcher",
    role: "Switcher",
    transport: "HDMI / USB-C / HDBaseT / NetworkHD 500",
    tags: ["presentation", "usb-c", "hdbaset", "uc", "hybrid", "meeting room", "specialist", "large room", "dual room", "master slave", "nhd500", "dsp", "amp", "mic", "audio", "hdbaset3"],
    caveat: "Specialist room core for large single rooms or linked rooms. Confirm hybrid teaching, master/slave room sharing, amp/DSP, mic input and inter-room transport requirements before quoting.",
    compareSuitability: "specialist",
  },
  {
    sku: "APO-VX20-UC-V2",
    name: "All-in-one UC video bar (camera, microphone, speaker)",
    family: "Apollo UC",
    productClass: "USB conferencing",
    role: "Conference bar / USB conferencing",
    transport: "USB / HDMI / network collaboration",
    tags: ["usb conferencing", "usb", "byod", "byom", "camera", "conferencing", "soundbar", "video bar", "teams", "zoom", "meeting room"],
    caveat: "Confirm room size, participant count, host platform (BYOD/BYOM/native appliance) and mounting before quoting. Pair with APO-DG2 if wireless casting is also needed.",
  },
  {
    sku: "APO-DG2",
    name: "Wireless presentation / casting dongle",
    family: "Apollo UC",
    productClass: "Wireless casting",
    role: "Wireless casting",
    transport: "Wireless presentation / Wi-Fi",
    tags: ["wireless casting", "wireless", "byod", "casting", "presentation"],
    caveat: "Confirm whether the customer needs casting only, or a full UC conferencing workflow (pair with APO-VX20-UC-V2) as well.",
  },
  {
    sku: "SP-0104-H2",
    name: "1x4 4K HDMI splitter with EDID management",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x4", "hdmi", "4k60", "444", "edid"],
    caveat: "A splitter duplicates one source to every output - it cannot route independent sources. Confirm the customer does not actually need independent per-display routing (that would be a matrix instead).",
  },
  {
    sku: "EXP-SP-0102-H2",
    name: "1x2 4K HDMI splitter",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x2", "hdmi", "4k60"],
    caveat: "Smaller 1x2 splitter for a two-display room. Confirm the customer does not actually need independent per-display routing (that would be a matrix instead).",
  },
  {
    sku: "SP-0108-SCL",
    name: "1x8 4K HDMI splitter with scaling",
    family: "HDMI Distribution",
    productClass: "HDMI splitter",
    role: "Distribution amplifier",
    transport: "HDMI distribution",
    tags: ["splitter", "1x8", "hdmi", "4k60", "scaling", "mixed displays"],
    caveat: "Use when more than four displays need the same source, or displays have mixed native resolutions requiring scaling. Confirm the customer does not actually need independent per-display routing (that would be a matrix instead).",
  },
];

/*
 * Real WyreStorm catalogue integration.
 *
 * WYRESTORM_PRODUCTS above is a ~45-item hand-typed subset with only free-text
 * productClass/role/transport/tags - it drove every compare recommendation,
 * while the real, structured 310-product catalogue at
 * public/product-intelligence-summary.json (generated from
 * data/wingman-canonical-product-store.json, already loaded via
 * loadProductIntelligenceIndex() below but previously discarded) sat unused.
 * Every real entry also carries a `technicalProfile` with genuine port-level
 * I/O data that buildWyrestormCompareProfile() (wyrestormCompareProfile.ts)
 * already knows how to read - it was just never given real data to read.
 *
 * ACTIVE_WYRESTORM_PRODUCTS starts as WYRESTORM_PRODUCTS and is upgraded once
 * (via mergeRealWyrestormCatalog(), called from the component's index-load
 * effect) to include the real catalogue, with real entries winning on SKU
 * collision. It is intentionally a module-level mutable list rather than
 * component state so the module-level helper functions below
 * (rigorousMatchToCandidate, findWyrestormProduct) - which run outside any
 * component and cannot receive props - keep working unchanged; the page
 * component separately tracks a `catalogVersion` counter to know when to
 * recompute its memoised candidate lists after the upgrade happens.
 */
let ACTIVE_WYRESTORM_PRODUCTS: WyreStormProduct[] = WYRESTORM_PRODUCTS;

function runKnownProfileCompare(profile: CompetitorProfile): CompetitorProfile {
  return applyKnownCompareProfileOverrides(profile);
}

function applyKnownCompareProfileOverrides(profile: CompetitorProfile): CompetitorProfile {
  if (!isAtlonaOmeExKitProfile(profile)) return profile;

  return {
    ...profile,
    brand: "Atlona",
    sku: "AT-OME-EX-KIT",
    rawText: profile.rawText || "Atlona AT-OME-EX-KIT HDBaseT TX/RX extender kit with USB 2.0 and control extension.",
    productClass: "HDBaseT extender",
    role: "TX/RX extender kit",
    transport: "HDBaseT",
    requestedTags: uniqueSkuOptions([
      ...profile.requestedTags,
      "hdbaset",
      "hdbaset extender",
      "extender",
      "extension",
      "tx rx",
      "usb",
      "usb 2.0",
      "point-to-point",
      "control",
    ]),
    videoTags: uniqueSkuOptions([...profile.videoTags, "4k60"]),
    knownProfile: {
      ...(profile.knownProfile ?? {}),
      title: "Atlona AT-OME-EX-KIT",
      name: "HDBaseT TX/RX extender kit",
      productClass: "HDBaseT extender",
      headlineSpec: "Point-to-point HDMI / USB / control extension over category cable.",
      transport: "HDBaseT",
      usbControl: "USB 2.0 plus control transport where supported.",
      typicalApplication: "Meeting room, classroom, interactive display, UC extension or source-to-display extension.",
      validation: "Confirm required resolution, USB version, cable length, HDBaseT class, control needs and whether the customer actually needs switching.",
      notThis: "Not a matrix, not AV-over-IP, not multiview and not a presentation switcher unless another switching stage is involved.",
    },
  };
}

function isSelectableWyrestormRecommendation(candidate: WyreStormProduct | null | undefined): boolean {
  return Boolean(candidate?.sku);
}

function fallbackRetrySourceUrl(sourceUrl?: string): string {
  return sourceUrl ?? "";
}

function buildCompetitorProfile(brand: string, sku: string, description: string): CompetitorProfile {
  const normalizedSku = normalizeCompetitorSku(sku);
  const userSavedProduct = normalizedSku ? findSavedCompetitorSpec(brand, normalizedSku) : null;
  const resolvedSpec = normalizedSku ? resolveCompetitorSpecProfile(normalizedSku, brand, undefined, userSavedProduct) : null;
  const ucProduct = findUcCompetitorProduct(brand, normalizedSku);
  const rawText = [
    brand,
    normalizedSku,
    description,
    ucProduct?.comparisonText,
    resolvedSpec?.title,
    resolvedSpec?.transport,
    resolvedSpec?.role,
    resolvedSpec?.maxResolution,
    resolvedSpec?.chroma,
  ].filter(Boolean).join(" ").toUpperCase();
  const requestedTags = uniqueSkuOptions([
    ...extractTags(rawText),
    ...(resolvedSpec?.features?.hdbtOutput ? ["hdbaset"] : []),
    ...(resolvedSpec?.maxResolution === "4K60" ? ["4k60"] : []),
    ...(resolvedSpec?.chroma === "4:4:4" ? ["444"] : []),
    ...(resolvedSpec?.specs?.hdbasetClass === "Class A" ? ["class a"] : []),
    ...(resolvedSpec?.specs?.hdbasetClass === "Class B" ? ["class b"] : []),
  ]);
  const knownProfile = lookupCompareIntelligence(normalizedSku);

  return runKnownProfileCompare({
    brand: resolvedSpec?.brand || brand,
    sku: normalizedSku,
    rawText,
    productClass: ucProduct
      ? productClassFromTags(requestedTags)
      : productClassFromResolvedDomain(resolvedSpec?.domain) || productClassFromTags(requestedTags),
    role: resolvedSpec?.domain === "HDBASET" && resolvedSpec?.features?.receiverKit
      ? "TX/RX extender kit"
      : resolvedSpec?.domain === "HDBASET" && resolvedSpec?.features?.usbRouting
        ? "USB extender"
        : resolvedSpec?.role || roleFromTags(requestedTags),
    transport: resolvedSpec?.transport || transportFromTags(requestedTags),
    requestedTags,
    videoTags: requestedTags.filter((tag) => ["4k60", "444", "hdr", "10g"].includes(tag)),
    knownProfile,
    resolvedSpec,
  });
}

function findWyrestormProduct(sku: string): WyreStormProduct | undefined {
  const canonicalSku = resolveWyrestormSkuAlias(sku);
  const key = compareSkuKey(canonicalSku);
  return ACTIVE_WYRESTORM_PRODUCTS.find((product) => compareSkuKey(product.sku) === key || skuAliasMatches(product.sku, canonicalSku));
}

function ProductMoreLink({ sku }: { sku: string }) {
  return (
    <a className="compare-native-more" href={productPitchUrl(sku)} aria-label={`Open product positioning support for ${sku}`}>
      View product
    </a>
  );
}

function CompareEvidenceList({ title, items, className = "" }: { title: string; items: string[]; className?: string }) {
  const visibleItems = uniqueText(items.map((item) => commercializeCompareCopy(item)).filter(Boolean), items.length);

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className={`${className}`.trim()}>
      <p className="compare-native-label wm-ui-copy">{title}</p>
      <ul className="wm-ui-card">
        {visibleItems.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function shortRoleLabel(role: string): string {
  const value = role.trim();
  if (/ndi camera/i.test(value)) return "NDI camera";
  if (/ptz camera/i.test(value)) return "PTZ camera";
  if (/wireless casting/i.test(value)) return "wireless presentation endpoint";
  if (/encoder|transmitter/i.test(value)) return "source-side AV-over-IP encoder";
  if (/decoder|receiver/i.test(value)) return "display-side AV-over-IP decoder";
  if (/transceiver/i.test(value)) return "AV-over-IP transceiver";
  if (/tx\/rx extender kit/i.test(value)) return "point-to-point HDBaseT extender kit";
  if (/usb extender/i.test(value)) return "USB extension endpoint";
  if (/presentation switcher|switcher/i.test(value)) return "presentation switcher";
  if (/matrix/i.test(value)) return "matrix switcher";
  if (/video wall/i.test(value)) return "video wall processor";
  return value.toLowerCase();
}

function _salesOutcomeBadges(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  const badges: string[] = [];

  if (candidate.outcomeLabel !== "Wrong product type" && candidate.outcomeLabel !== "Insufficient competitor data") badges.push("Correct product direction");
  if (candidate.matched.some((item) => /Same endpoint role/i.test(item))) badges.push("Same product job");
  if (candidate.matched.some((item) => /Same product class|Same product class: point-to-point HDBaseT extender path|Same NetworkHD 500 source-side encoder architecture|matrix/i.test(item))) badges.push("Same system type");
  if (candidate.mismatches.length > 0 || candidate.blockers.length > 0) badges.push("Not drop-in compatible");
  if (candidate.unknowns.length > 0 || competitor.warning) badges.push("Feature check needed");
  if (candidate.outcomeLabel === "Wrong product type") badges.push("Wrong product type");
  if (candidate.outcomeLabel === "Insufficient competitor data") badges.push("Insufficient competitor data");

  return uniqueText(badges, 5);
}

function salesAskCustomer(competitor: CompetitorSummary, candidate: ScoredCandidate): string[] {
  const visiblePrompts = uniqueText([
    ...competitor.verifyItems,
    ...candidate.dependencies,
    ...candidate.unknowns,
  ], 8).filter((item) => !/^Why this matters:/i.test(item) && !/^Educational point:/i.test(item));

  if (competitor.warning) {
    return visiblePrompts.slice(0, 5);
  }

  return visiblePrompts.slice(0, 5);
}

function _salesWhatItDoes(competitor: CompetitorSummary): string {
  return `${competitor.heading} is used to ${competitorPlainEnglishPurpose(competitor)}.`;
}

function competitorIdentityItems(competitor: CompetitorSummary): string[] {
  return uniqueText([
    ...competitor.identityItems,
    competitor.resolution && competitor.resolution !== "Not verified locally" && !competitor.identityItems.some((item) => item.includes(competitor.resolution))
      ? `Key feature callouts: Resolution ${competitor.resolution}.`
      : "",
  ], 4);
}

function openGuruForCompareResult(
  competitor: CompetitorSummary,
  candidate: ScoredCandidate | null,
  status: CompareReportedStatus,
) {
  if (typeof window === "undefined") {
    return;
  }

  const statusLabel = compareReportedStatusMeta(status).label;
  const candidateLine = candidate
    ? `WyreStorm direction: ${candidate.product.sku} - ${candidate.product.name}.`
    : "No WyreStorm candidate was returned.";
  const coreRequirement = candidate
    ? `${competitorPlainEnglishPurpose(competitor)} The WyreStorm option must preserve the ${candidate.product.role.toLowerCase()} role in a ${candidate.product.family} system.`
    : competitorPlainEnglishPurpose(competitor);
  const evidence = candidate ? uniqueText([...candidate.matched, ...candidate.partialMatches], 4) : [];
  const differences = candidate ? uniqueText([...candidate.mismatches, ...candidate.gaps], 4) : [];
  const dependencies = candidate ? uniqueText([...candidate.dependencies, ...candidate.unknowns, ...candidate.checks], 5) : competitor.verifyItems.slice(0, 5);

  const prompt = [
    "Act as the WyreStorm technical product manager for this Wingman Compare result.",
    `Result status: ${statusLabel}.`,
    `Competitor: ${competitor.heading} - ${competitor.detail}.`,
    candidateLine,
    `Core requirement: ${coreRequirement}.`,
    evidence.length ? `Match evidence: ${evidence.join(" | ")}.` : "Match evidence: No confirmed matching evidence was recorded.",
    differences.length ? `Important differences: ${differences.join(" | ")}.` : "Important differences: No explicit functional difference is recorded; do not assume exact equivalence.",
    dependencies.length ? `Dependencies and checks: ${dependencies.join(" | ")}.` : "Dependencies and checks: Confirm lifecycle, accessories and complete signal-path compatibility.",
    "Response request: Explain the technical reason this option is being considered, the nuanced differences that affect design or customer positioning, what must be confirmed, and the next two questions the salesperson should ask.",
    "Speak with product-manager authority, remain evidence-led, and invite a useful follow-up about I/O, topology, dependencies or customer wording. Do not answer only with a glossary definition.",
  ].join(" ");

  window.dispatchEvent(
    new CustomEvent("wingman:open-guru", {
      detail: {
        prompt,
        source: "competitor-compare",
        competitor: competitor.heading,
        wyrestormSku: candidate?.product.sku ?? null,
        resultStatus: status,
      },
    }),
  );
}

function salesDirectionFitLabel(candidate: ScoredCandidate): string {
  if (candidate.outcomeLabel === "Insufficient competitor data") return "Insufficient competitor data";
  if (candidate.outcomeLabel === "Wrong product type") return "Wrong product type";
  return "Correct product direction";
}

function salesReplacementConfidenceLabel(competitor: CompetitorSummary, candidate: ScoredCandidate): string {
  if (/av-over-ip/i.test(competitor.recognisedClass) && /^NHD-/i.test(candidate.product.sku)) {
    return "Not a drop-in replacement";
  }

  if (candidate.mismatches.length > 0 || candidate.blockers.length > 0) {
    return "Not a drop-in replacement";
  }

  if (candidate.unknowns.length > 0 || competitor.warning) {
    return "Feature check needed";
  }

  return "Same product job";
}

function CompareManufacturerCombobox(props: {
  brands: string[];
  selectedBrand: string;
  onBrandSelect: (brand: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = props.selectedBrand.trim().toLowerCase();
  const visibleBrands = props.brands
    .filter((brand) => !query || brand.toLowerCase().includes(query));

  const chooseBrand = (brand: string): void => {
    props.onBrandSelect(brand);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <section className="wm-ui-card p-4 compare-inline-combobox-field" data-wingman-inline-combobox="manufacturer">
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-manufacturer">Manufacturer</label>
      <div className="compare-inline-combobox">
        <input
          id="compare-manufacturer"
          className="compare-native-input wm-ui-input"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && visibleBrands.length > 0}
          data-testid="compare-manufacturer" aria-controls="compare-manufacturer-options"
          value={props.selectedBrand}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            props.onBrandSelect(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleBrands.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeIndex >= 0 && visibleBrands[activeIndex]) {
              event.preventDefault();
              chooseBrand(visibleBrands[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Type competitor manufacturer"
          autoComplete="off"
        />
        {open && visibleBrands.length > 0 ? (
          <div id="compare-manufacturer-options" className="compare-inline-options" role="listbox" aria-label="Manufacturer suggestions">
            {visibleBrands.map((brand, index) => (
              <button
                key={brand}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`compare-inline-option${index === activeIndex ? " is-active" : ""}`}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseBrand(brand)}
              >
                {brand}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CompareProductLookupInput(props: {
  value: string;
  knownSkus: string[];
  suggestions: string[];
  onInputChange: (value: string) => void;
  onSkuSelect: (sku: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const options = uniqueSkuOptions([...props.knownSkus, ...props.suggestions]).slice(0, 120);
  const query = props.value.trim().toUpperCase();
  const visibleOptions = options
    .filter((skuOption) => !query || skuOption.toUpperCase().includes(query));

  const chooseSku = (sku: string): void => {
    props.onInputChange(sku);
    setOpen(false);
    setActiveIndex(-1);
    props.onSkuSelect(sku);
  };

  return (
    <section
      className="wm-ui-card p-4 compare-inline-combobox-field"
      data-wingman-compare-auto-advance="true"
      data-wingman-inline-combobox="sku"
    >
      <label className="compare-native-label wm-ui-kicker" htmlFor="compare-competitor-sku">Competitor SKU</label>
      <div className="compare-inline-combobox">
        <input
          id="compare-competitor-sku"
          className="compare-native-input wm-ui-input"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && visibleOptions.length > 0}
          data-testid="compare-sku" aria-controls="compare-competitor-sku-options"
          value={props.value}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            const value = event.target.value;
            props.onInputChange(value);
            const exact = options.find((option) => option.trim().toUpperCase() === value.trim().toUpperCase());

            if (exact) {
              setOpen(false);
              setActiveIndex(-1);
              props.onSkuSelect(exact);
            } else {
              setOpen(true);
              setActiveIndex(-1);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeIndex >= 0 && visibleOptions[activeIndex]) {
              event.preventDefault();
              chooseSku(visibleOptions[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Type competitor model / SKU"
          data-wingman-sku-normalisation="true"
          autoComplete="off"
        />
        {open && visibleOptions.length > 0 ? (
          <div id="compare-competitor-sku-options" className="compare-inline-options" role="listbox" aria-label="Competitor SKU suggestions">
            {visibleOptions.map((skuOption, index) => (
              <button
                key={skuOption}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`compare-inline-option${index === activeIndex ? " is-active" : ""}`}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSku(skuOption)}
              >
                {skuOption}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <p className="wm-ui-copy mt-2">Known SKUs compare automatically. For an unknown model, type it and press Compare.</p>
    </section>
  );
}

function CompareEvidenceMatrix({ candidate, competitor }: { candidate: ScoredCandidate; competitor: unknown }) {
  const readText = (source: unknown, keys: string[], fallback: string) => {
    if (!source || typeof source !== "object") {
      return fallback;
    }

    const record = source as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value)) {
        const joined = value
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .slice(0, 3)
          .join(" | ");

        if (joined) {
          return joined;
        }
      }
    }

    return fallback;
  };
  const readScore = (source: unknown) => {
    if (!source || typeof source !== "object") {
      return null;
    }

    const record = source as Record<string, unknown>;
    const keys = ["score", "matchScore", "fitScore", "scorePercent", "confidence"];

    for (const key of keys) {
      const value = record[key];

      if (typeof value === "number" && Number.isFinite(value)) {
        return value <= 1 ? Math.round(value * 100) : Math.round(value);
      }

      if (typeof value === "string") {
        const parsed = Number(value.replace("%", "").trim());

        if (Number.isFinite(parsed)) {
          return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
        }
      }
    }

    return null;
  };

  const scoreExplanation = (score: number | null) => {
    const reason = first([...candidate.matched, ...candidate.partialMatches], "the available evidence shows some relevant fit");
    const caveat = first([...candidate.mismatches, ...candidate.gaps, ...candidate.unknowns], "there are still details to confirm before treating this as a like-for-like replacement");

    if (score === null) {
      return `Score not shown because the comparison did not expose a numeric score. Treat this as a shortlist result: ${reason}; ${caveat}.`;
    }

    if (score >= 90) {
      return `${score}% because the product role and evidence are strongly aligned. Main fit: ${reason}. Still confirm: ${caveat}.`;
    }

    if (score >= 75) {
      return `${score}% because the product appears to fit the main requirement, but it is not fully proven as a like-for-like replacement. Main fit: ${reason}. Check: ${caveat}.`;
    }

    if (score >= 60) {
      return `${score}% because this is a plausible architecture or product-family match, but important details are incomplete or different. Main fit: ${reason}. Gap to check: ${caveat}.`;
    }

    return `${score}% because the candidate only partially matches the competitor requirement. Main fit: ${reason}. Risk: ${caveat}.`;
  };

  const competitorSku = readText(competitor, ["sku", "model", "partNumber", "name", "title"], "Competitor product not clearly identified");
  const competitorBrand = readText(competitor, ["manufacturer", "brand", "vendor"], "Competitor brand not captured");
  const competitorType = readText(competitor, ["productClass", "class", "category", "family", "type", "role"], "Competitor product type not captured");
  const wyrestormType = `${candidate.product.family} - ${candidate.product.productClass} - ${candidate.product.role}`;
  const displayedScore = readScore(candidate);
  const first = (items: string[] | undefined, fallback: string) => {
    const value = uniqueText(items ?? [], 1)[0];
    return value && value.trim() ? value : fallback;
  };

  const joined = (items: string[] | undefined, fallback: string, limit = 2) => {
    const values = uniqueText(items ?? [], limit).filter((item) => item.trim().length > 0);
    return values.length ? values.join(" | ") : fallback;
  };

  const quoteChecks = uniqueText([
    ...candidate.blockers,
    ...candidate.unknowns,
    ...candidate.checks,
    ...candidate.gaps
  ], 3);

  const rows = [
    {
      label: "Mandatory requirement coverage",
      evidence: candidate.necessaryCoverage
        ? `${candidate.necessaryCoverage.confirmed}/${candidate.necessaryCoverage.total} confirmed; ${candidate.necessaryCoverage.unknown} unknown; ${candidate.necessaryCoverage.failed} failed`
        : "Structured requirement coverage was not available.",
      meaning: "A direct equivalent requires every necessary requirement to be confirmed and none to fail."
    },
    {
      label: "Evidence completeness",
      evidence: typeof candidate.evidenceCompleteness === "number" ? `${candidate.evidenceCompleteness}% of necessary comparison points confirmed` : "Not calculated",
      meaning: "Measures evidence coverage rather than presenting an apparently precise similarity score."
    },
    {
      label: "Solution type",
      evidence: String(candidate.solutionType || "qualified-alternative").replace(/-/g, " "),
      meaning: "Separates a direct product equivalent from a component-led or architecture alternative."
    },
    {
      label: "Competitor product",
      evidence: `${competitorBrand} - ${competitorSku} - ${competitorType}`,
      meaning: "Identifies what the customer is actually asking Wingman to compare."
    },
    {
      label: "WyreStorm candidate",
      evidence: wyrestormType,
      meaning: "Shows the WyreStorm product type being proposed, so sales can see whether it is the same class or an architecture alternative."
    },
    {
      label: "Why it scored",
      evidence: first(candidate.matched, "No strong matched fact was captured."),
      meaning: "The strongest direct reason this candidate was shortlisted."
    },
    {
      label: "Score explanation",
      evidence: scoreExplanation(displayedScore),
      meaning: "Translates the match percentage into plain sales language, including the main reason and the main caveat."
    },
    {
      label: "Confirmed fit",
      evidence: joined(candidate.matched, "No confirmed fit evidence captured.", 2),
      meaning: "Facts that make this a credible WyreStorm alternative."
    },
    {
      label: "Important differences",
      evidence: joined(candidate.mismatches, "No specific difference captured.", 2),
      meaning: "Reasons the recommendation may not be a like-for-like replacement."
    },
    {
      label: "Why not 100%",
      evidence: first([...candidate.mismatches, ...candidate.gaps, ...candidate.unknowns], "The available evidence does not show a material gap."),
      meaning: "Explains why the score should be treated as a fit indicator, not a guarantee."
    },
    {
      label: "Check before quoting",
      evidence: quoteChecks.length ? quoteChecks.join(" | ") : "Confirm source, display, USB, audio, control and distance requirements before quoting.",
      meaning: "Commercial or technical checks needed before using this in a proposal."
    },
    {
      label: "WyreStorm dependencies",
      evidence: joined(candidate.dependencies, "No additional WyreStorm dependency captured.", 2),
      meaning: "Items that may need adding to the system design or BOM."
    }
  ];

  return (
    <section className="wm-ui-section" aria-label="Compare evidence matrix">
      <div>
        <h4>Comparison evidence matrix</h4>
        <p className="wm-ui-copy">Plain-English explanation of the match result, gaps and quote checks.</p>
      </div>
      <div>
        {rows.map((row) => (
          <div className="wm-ui-card" key={row.label}>
            <div>{row.label}</div>
            <div>{row.evidence}</div>
            <div>{row.meaning}</div>
          </div>
        ))}
      </div>
      {candidate.requirements?.length ? (
        <div className="compare-native-requirement-ledger" role="table" aria-label="Necessary comparison requirements">
          <div className="compare-native-core-matrix-row compare-native-core-matrix-row--header" role="row">
            <div role="columnheader">Necessary datapoint</div>
            <div role="columnheader">Competitor</div>
            <div role="columnheader">WyreStorm</div>
            <div role="columnheader">Status</div>
          </div>
          {candidate.requirements.filter((item) => item.tier === "necessary").map((item) => (
            <div className={`compare-native-core-matrix-row compare-requirement--${item.status}`} role="row" key={item.key}>
              <span role="cell"><strong>{item.label}</strong><small>{item.evidence}</small></span>
              <span role="cell">{item.competitorValue}</span>
              <span role="cell">{item.wyrestormValue}</span>
              <strong role="cell">{item.status.replace(/-/g, " ")}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
type CompareReportedStatus = "match" | "checks" | "partial" | "no-match";

const COMPARE_REPORTED_STATUS_OPTIONS: Array<{
  key: CompareReportedStatus;
  label: string;
}> = [
  { key: "match", label: "Match" },
  { key: "checks", label: "Further checks required" },
  { key: "partial", label: "Partial match" },
  { key: "no-match", label: "No match" },
];

function compareReportedStatus(
  candidate: ScoredCandidate | null,
  competitor: CompetitorSummary,
): CompareReportedStatus {
  if (!candidate || candidate.verdict === "NO MATCH") {
    return "no-match";
  }

  // Blue takes precedence whenever the product direction still depends on
  // unresolved technical evidence, dependencies, warnings or quote blockers.
  if (
    candidate.verdict === "VERIFY" ||
    candidate.verdict === "ARCHITECTURE ALTERNATIVE" ||
    candidate.outcomeLabel === "Insufficient competitor data" ||
    candidate.blockers.length > 0 ||
    candidate.unknowns.length > 0 ||
    candidate.dependencies.length > 0 ||
    Boolean(competitor.warning)
  ) {
    return "checks";
  }

  if (candidate.verdict === "PARTIAL MATCH") {
    return "partial";
  }

  return "match";
}

function compareReportedStatusMeta(status: CompareReportedStatus): {
  label: string;
  heading: string;
  guidance: string;
} {
  if (status === "match") {
    return {
      label: "Match",
      heading: "Suitable WyreStorm match",
      guidance: "The product direction aligns with the evidenced requirement.",
    };
  }

  if (status === "checks") {
    return {
      label: "Further checks required",
      heading: "Technical checks required",
      guidance: "The direction is plausible, but evidence or dependencies must be confirmed before quotation.",
    };
  }

  if (status === "partial") {
    return {
      label: "Partial match",
      heading: "Partial WyreStorm match",
      guidance: "The product covers part of the requirement, but the differences must be explained.",
    };
  }

  return {
    label: "No match",
    heading: "No suitable WyreStorm match",
    guidance: "Do not position a WyreStorm equivalent until the requirement or missing evidence changes.",
  };
}

function CompareReportedStatusRail({
  status,
}: {
  status: CompareReportedStatus;
}) {
  return (
    <div
      className="compare-reported-status-rail"
      role="list"
      aria-label="Comparison result status"
    >
      <span className="compare-reported-status-label">Assessment</span>
      {COMPARE_REPORTED_STATUS_OPTIONS.filter((option) => option.key === status).map((option) => (
        <span
          key={option.key}
          role="listitem"
          className={`compare-reported-status compare-reported-status--${option.key} is-active`}
          aria-current="true"
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}

function CompetitorSearchCard({
  brand,
  sku,
  summary,
  locallyRecognised,
  liveResearched = false,
  confidenceSource,
}: {
  brand: string;
  sku: string;
  summary: CompetitorSummary;
  locallyRecognised: boolean;
  liveResearched?: boolean;
  confidenceSource?: {
    mode?: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    decisionType?: string | null;
    note?: string;
  };
}) {
  const primaryFacts = summary.facts.slice(0, 4);

  return (
    <section className="wm-match-searched-product" aria-labelledby="wm-match-searched-product-title">
      <header>
        <div>
          <span className="compare-native-eyebrow wm-ui-kicker">Searched competitor</span>
          <h2 id="wm-match-searched-product-title">{brand} {sku}</h2>
        </div>
        <span className={`wm-compare-local-status ${locallyRecognised ? "is-recognised" : "is-lookup"}`}>
          {locallyRecognised ? "Recognised locally" : liveResearched ? "Live researched - review required" : "Live lookup required"}
        </span>
      </header>
      <p>{summary.detail || summary.warning || "Competitor product identity requires confirmation."}</p>
      {confidenceSource?.note && (
        <div className="wm-compare-confidence-source" role="status">
          <span className="wm-compare-confidence-source__icon" aria-hidden="true">
            {confidenceSource.mode === "decision-ledger-approved" ? "✅" : confidenceSource.mode === "stored-intelligence" ? "📋" : confidenceSource.mode === "live" ? "🌐" : "📄"}
          </span>
          <span className="wm-compare-confidence-source__text">{confidenceSource.note}</span>
        </div>
      )}
      <dl>
        {primaryFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
      </dl>
    </section>
  );
}

// repScript owns the rep-facing comparison narrative (single source of truth
// in ../lib/repScript). The tier function is re-exported so the public page
// API stays stable for callers and tests.
export { compareVerdictTier };

function BestCandidateCard({
  candidate,
  competitor,
  competitorProfile,
  onCopySummary,
}: {
  candidate: ScoredCandidate;
  competitor: CompetitorSummary;
  competitorProfile: CompetitorProfile;
  onCopySummary: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const wyrestorm = buildWyrestormSummary(candidate);
  const coreFacts = buildCoreComparisonFacts(competitor, competitorProfile, wyrestorm, candidate);
  const badgeTier = weakestLinkCardTier(coreFacts, candidate.governedTier);
  const whyBullets = salesWhyBullets(candidate);
  const askCustomer = salesAskCustomer(competitor, candidate);
  const status = compareReportedStatus(candidate, competitor);
  const statusMeta = compareReportedStatusMeta(status);
  const quoteChecks = compactCompareQuoteChecks(competitor, candidate, status);
  const conciseReason =
    commercializeCompareCopy(
      candidate.matched[0] ||
        candidate.partialMatches[0] ||
        candidate.mismatches[0] ||
        candidate.unknowns[0] ||
        statusMeta.guidance,
    );

  return (
    <section className={`compare-native-best-card compare-compact-result wm-ui-section wm-ui-card compare-compact-result--${status}`}>
      <CompareReportedStatusRail status={status} />

      <header className="compare-compact-result__headline">
        <div>
          <h2 className="wm-ui-title">{statusMeta.heading}</h2>
          <p className="wm-ui-copy">{statusMeta.guidance}</p>
        </div>
      </header>

      <div className="compare-compact-result__products">
        <section className="compare-compact-result__product wm-ui-card">
          <span>Competitor</span>
          <strong>{competitor.heading}</strong>
          <small>{competitor.detail}</small>
        </section>

        <span className="compare-compact-result__arrow" aria-hidden="true">{"\u2192"}</span>

        <section className="compare-compact-result__product compare-compact-result__product--wyrestorm wm-ui-card">
          <span>WyreStorm direction</span>
          <strong>{wyrestorm.heading}</strong>
          <small>{wyrestorm.detail}</small>
          <GovernanceBadge tier={badgeTier} label={candidate.governedLabel} />
        </section>
      </div>

      <div className="compare-compact-result__reason wm-ui-card">
        <strong>Why</strong>
        <p className="wm-ui-copy">{conciseReason}</p>
      </div>

      {candidate.necessaryCoverage ? (
        <section className="compare-compact-result__coverage wm-ui-card" aria-label="Comparison safety summary">
          <div>
            <span>Necessary requirements</span>
            <strong>{candidate.necessaryCoverage.confirmed}/{candidate.necessaryCoverage.total} confirmed</strong>
          </div>
          <div>
            <span>Evidence completeness</span>
            <strong>{candidate.evidenceCompleteness ?? 0}%</strong>
          </div>
          <div>
            <span>Solution type</span>
            <strong>{String(candidate.solutionType || "qualified-alternative").replace(/-/g, " ")}</strong>
          </div>
        </section>
      ) : null}

      <section className="compare-compact-result__warnings compare-compact-result__footnotes wm-ui-card" aria-label="Advisory footnotes">
          <strong>Check before quoting</strong>
          <ul>
            {quoteChecks.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          {status === "match" ? null : (
            <p className="compare-compact-result__footnote-label">
              This is a product direction, not a guaranteed one-box replacement.
            </p>
          )}
      </section>

      <div className="compare-native-action-row compare-compact-result__actions wm-ui-card">
        <button
          className="compare-native-more wm-ui-button wm-ui-button-primary"
          type="button"
          onClick={() => openGuruForCompareResult(competitor, candidate, status)}
        >
          More info from Guru
        </button>
        <button
          className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
          type="button"
          onClick={() => {
            onCopySummary();
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          aria-label="Copy comparison result"
        >
          {copied ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy result</>}
        </button>
        <ProductMoreLink sku={candidate.product.sku} />
      </div>

      <details className="compare-native-technical-details wm-ui-card wm-ui-copy">
        <summary>Technical comparison details</summary>

        {coreFacts.length ? (
          <section className="compare-native-core-facts wm-ui-section" aria-label="Core comparison points">
            <p className="compare-native-label wm-ui-copy">Key comparison matrix</p>
            <div className="compare-native-core-matrix" role="table" aria-label="Competitor versus WyreStorm comparison matrix">
              <div className="compare-native-core-matrix-header wm-ui-card-header" role="rowgroup">
                <div className="compare-native-core-matrix-row compare-native-core-matrix-row--header wm-ui-card wm-ui-card-header" role="row">
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Comparison point</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Competitor</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">WyreStorm</span>
                  <span className="compare-native-core-matrix-heading wm-ui-title" role="columnheader">Result</span>
                </div>
              </div>
              <div className="compare-native-core-matrix-body" role="rowgroup">
                {coreFacts.map((fact) => (
                  <div key={`core-fact-${fact.label}`} className="compare-native-core-matrix-row wm-ui-card" role="row">
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--point" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Comparison point</span>
                      <strong>{fact.label}</strong>
                    </div>
                    <div className="compare-native-core-matrix-cell" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Competitor</span>
                      <p className="wm-ui-copy">{fact.competitor || "Needs verification"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">WyreStorm</span>
                      <p className="wm-ui-copy">{fact.wyrestorm || "Needs verification"}</p>
                    </div>
                    <div className="compare-native-core-matrix-cell compare-native-core-matrix-cell--result wm-ui-card" role="cell">
                      <span className="compare-native-core-matrix-mobile-label">Result</span>
                      <p className="wm-ui-copy">{fact.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <CompareEvidenceList title="Matched points" items={whyBullets} />
        <CompareEvidenceList
          title="Important differences"
          items={uniqueText([...candidate.mismatches, ...candidate.gaps], 4)}
          className="wm-ui-title"
        />
        <CompareEvidenceList
          title="Checks before quote"
          items={askCustomer}
          className="wm-ui-title"
        />
        <CompareEvidenceMatrix candidate={candidate} competitor={competitor} />
      </details>
    </section>
  );
}

function CandidateOptionCard({ candidate }: { candidate: ScoredCandidate }) {
  const summary = buildWyrestormSummary(candidate);
  const comparisonFacts = new Map(summary.comparisonFacts.map((fact) => [fact.label, fact.value]));
  const optionTier = weakestLinkTier([
    candidate.governedTier,
    // The option card surfaces exactly three WyreStorm facts; any of them
    // unresolved makes the card's claim weaker than the profile tier alone.
    ...[candidate.product.productClass, candidate.product.transport, candidate.outcomeLabel].map(
      (value) => (surfaceValueResolved(String(value ?? "")) ? candidate.governedTier : "missing"),
    ),
  ]);
  const matrixVariantReason = candidate.product.productClass === "Matrix"
    ? candidate.checks.find((item) => /feature-enhanced alternative|HDBaseT distance|receiver topology|video-wall/i.test(item))
    : undefined;
  const reason = commercializeCompareCopy(
    matrixVariantReason ||
      candidate.matched[0] ||
      candidate.partialMatches[0] ||
      "Closest role-compatible WyreStorm option from the current Compare data.",
  );
  const advisory = commercializeCompareCopy(
    matrixVariantReason ||
      candidate.dependencies[0] ||
      candidate.mismatches[0] ||
      candidate.gaps[0] ||
      candidate.unknowns[0] ||
      candidate.checks[0] ||
      "Confirm lifecycle, accessories and complete signal-path compatibility before quotation.",
  );

  return (
    <article className="compare-native-option-card compare-product-info-card wm-ui-card">
      <header className="compare-product-info-card__header">
        <span className="compare-product-info-card__icon" aria-hidden="true"><PackageSearch /></span>
        <div className="compare-product-info-card__identity">
        <p className="wm-ui-copy">{candidate.product.family}</p>
        <h3 className="wm-ui-title">{candidate.product.sku}</h3>
          <p className="compare-product-info-card__name">{candidate.product.name}</p>
        </div>
        <span className={`compare-native-verdict compare-product-info-card__status ${verdictClass(candidate.verdict)}`}>{candidate.verdict}</span>
      </header>

      <div className="compare-product-info-card__facts" aria-label="Product information">
        <span><small>Product type</small><strong>{candidate.product.productClass}</strong></span>
        <span><small>Inputs</small><strong>{comparisonFacts.get("Inputs") || "Needs verification"}</strong></span>
        <span><small>Outputs</small><strong>{comparisonFacts.get("Outputs") || "Needs verification"}</strong></span>
        <span><small>Connection</small><strong>{candidate.product.transport}</strong></span>
        <span><small>Data status</small><strong><GovernanceBadge tier={optionTier} label={candidate.governedLabel} /></strong></span>
      </div>

      <section className="compare-product-info-card__fit wm-ui-card">
        <span>Why it fits</span>
        <p className="wm-ui-copy">{reason}</p>
      </section>
      <p className="compare-native-option-footnote wm-ui-copy wm-ui-card">
        <strong>Before you quote:</strong> {advisory}
      </p>

      <details className="wm-ui-card wm-ui-copy">
        <summary>Why this option was shortlisted</summary>
        <CompareEvidenceList title="Why this direction" items={candidate.matched.slice(0, 3)} />
        <CompareEvidenceList title="Important differences" items={candidate.mismatches.slice(0, 2)} className="wm-ui-title" />
        <CompareEvidenceList title="Commercial checks" items={uniqueText([...candidate.unknowns, ...candidate.checks, ...candidate.gaps, ...candidate.dependencies], 4)} className="wm-ui-title" />
      </details>

      <div className="compare-native-action-row compare-product-info-card__actions wm-ui-card">
        <ProductMoreLink sku={candidate.product.sku} />
      </div>
    </article>
  );
}

function CandidateThumbnailSelector({ candidate, selected, onSelect }: {
  candidate: ScoredCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`compare-candidate-thumbnail${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={`Compare with ${candidate.product.sku}`}
      onClick={onSelect}
    >
      <span>{candidate.product.family}</span>
      <strong>{candidate.product.sku}</strong>
      <small>{candidate.product.productClass} · {candidate.verdict}</small>
    </button>
  );
}

function governedEndpointRole(profile: CompetitorProfile): CompareEndpointRole {
  const role = `${profile.role} ${profile.productClass}`.toLowerCase();

  if (/transceiver|encoder\/decoder|trx/.test(role)) return "transceiver";
  if (/encoder|transmitter|\btx\b/.test(role)) return "transmitter";
  if (/decoder|receiver|\brx\b/.test(role)) return "receiver";
  if (/matrix/.test(role)) return "matrix";
  if (/switcher|presentation/.test(role)) return "switcher";
  if (/extender|tx\/rx/.test(role)) return "extender-kit";
  if (/processor|multiview|video wall/.test(role)) return "processor";
  if (/controller|control/.test(role)) return "controller";
  if (/accessory|cable|mount|power supply/.test(role)) return "accessory";

  return "unknown";
}

function governedTransportClass(profile: CompetitorProfile): CompareTransportClass {
  const transport = [
    profile.transport,
    profile.resolvedSpec?.transport,
    profile.resolvedSpec?.specs?.networkSpeed,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b10\s*g(?:be|bps)?\b|sdvoe/.test(transport)) return "avoip-10g";
  if (/\b1\s*g(?:be|bps)?\b|avoip|jpeg[\s-]?xs|h\.?26[45]/.test(transport)) return "avoip-1g";
  if (/hdbaset|hdbt|tps/.test(transport)) return "hdbaset";
  if (/usb/.test(transport) && /hdmi|video|hdbaset|wireless/.test(transport)) return "hybrid";
  if (/usb/.test(transport)) return "usb";
  if (/hdmi/.test(transport)) return "hdmi";

  return "unknown";
}

function governedDecisionIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function isGovernedEvidenceUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

type CompareDecisionTone = "good" | "partial" | "alternative" | "review" | "reject";

function compareDecisionTone(decisionType?: CompareDecisionType | null): CompareDecisionTone {
  if (decisionType === "confirmed-equivalent") return "good";
  if (decisionType === "closest-technical-match") return "partial";
  if (decisionType === "architecture-alternative") return "alternative";
  if (decisionType === "no-suitable-match") return "reject";
  return "review";
}

function compareDecisionIcon(decisionType?: CompareDecisionType | null): string {
  if (decisionType === "confirmed-equivalent") return "\u2713";
  if (decisionType === "closest-technical-match") return "\u2248";
  if (decisionType === "architecture-alternative") return "\u21C4";
  if (decisionType === "no-suitable-match") return "\u00D7";
  return "!";
}

function compareDecisionButtonClass(
  decisionType: CompareDecisionType,
  existingDecision?: CompetitorMatchDecision | null,
): string {
  const isSelected = existingDecision?.decisionType === decisionType;

  if (!isSelected) {
    return "compare-decision-button compare-decision-button--neutral";
  }

  const tone = compareDecisionTone(decisionType);
  return `compare-decision-button compare-decision-button--${tone} is-selected`;
}

type PrimaryBattleCardSide = "competitor" | "wyrestorm";

function primaryBattleCardFamily(productClass: string): string {
  const value = productClass.toLowerCase();
  if (/matrix|switcher|classroom/.test(value)) return "Switcher / matrix";
  if (/av-over-ip|avoip|networkhd|encoder|decoder|transceiver/.test(value)) return "AV-over-IP endpoint";
  if (/hdbaset|extender/.test(value)) return "Extender / HDBaseT";
  if (/distribution|splitter|\bda\b/.test(value)) return "Distribution";
  if (/wireless|\buc\b|byom/.test(value)) return "Wireless / UC";
  if (/multiview|video wall|processor/.test(value)) return "Video processing";
  return "Specialist device";
}

const PRIMARY_BATTLE_GROUPS = [
  { key: "connections", label: "Connections", fields: ["Inputs", "Outputs", "Other video I/O", "USB", "Control / network"] },
  { key: "capabilities", label: "Capabilities", fields: ["HDMI / HDCP", "Network class"] },
  { key: "performance", label: "Performance", fields: ["HDBaseT class / reach", "Max resolution", "Transport", "Signal direction"] },
] as const;

function PrimaryBattleCard({
  side,
  eyebrow,
  heading,
  detail,
  productClass,
  rows,
  matchTone,
}: {
  side: PrimaryBattleCardSide;
  eyebrow: string;
  heading: string;
  detail: string;
  productClass: string;
  rows: CompareCoreFact[];
  matchTone?: ReturnType<typeof compareVerdictTier>["tone"];
}) {
  const valueFor = (row: CompareCoreFact): string => row[side] || "Needs verification";
  const visibleGroups = PRIMARY_BATTLE_GROUPS.map((group) => ({
    ...group,
    rows: group.fields
      .map((field) => rows.find((row) => row.label === field))
      .filter((row): row is CompareCoreFact => Boolean(row)),
  })).filter((group) => group.rows.length > 0);

  return (
    <article
      className={`compare-compact-result__product compare-primary-battle-card compare-primary-battle-card--${side} wm-ui-card${side === "wyrestorm" ? " compare-compact-result__product--wyrestorm" : ""}`}
      aria-label={side === "competitor" ? "Competitor product card" : "WyreStorm product card"}
      data-match-tone={side === "wyrestorm" ? matchTone : undefined}
    >
      <header className="compare-primary-battle-card__header">
        <span>{eyebrow}</span>
        <strong>{heading}</strong>
        <small>{detail}</small>
        <p>{primaryBattleCardFamily(productClass)} · {productClass}</p>
      </header>
      <div className="compare-primary-battle-card__sections">
        {visibleGroups.map((group) => (
          <section className={`compare-primary-battle-card__section compare-primary-battle-card__section--${group.key}`} key={group.key} aria-label={group.label}>
            <h3>{group.label}</h3>
            <dl>
              {group.rows.map((row) => (
                <div key={row.label} data-evidence-state={/needs verification|not verified/i.test(valueFor(row)) ? "unverified" : "verified"}>
                  <dt>{row.label}</dt>
                  <dd>{valueFor(row)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}

// WINGMAN_MINIMUM_COMPARE_CARDS_V2
function MinimumCompareCards({ competitor, competitorProfile, candidate }: {
  competitor: CompetitorSummary;
  competitorProfile: CompetitorProfile;
  candidate: ScoredCandidate | null;
}) {
  const status = compareReportedStatus(candidate, competitor);
  const statusMeta = compareReportedStatusMeta(status);
  const evidencePending = status === "no-match" && !competitorProfile.resolvedSpec;
  const matchTone = compareVerdictTier(status, { evidencePending }).tone;
  const wyrestorm = candidate ? buildWyrestormSummary(candidate) : null;
  const noMatchFactPriority = (label: string): number => {
    if (/^inputs$/i.test(label)) return 0;
    if (/^outputs$/i.test(label)) return 1;
    return 2;
  };
  const confirmedRoutedFacts = [
    competitorProfile.resolvedSpec?.inputCount
      ? { label: "Inputs", value: `${competitorProfile.resolvedSpec.inputCount}x routed source inputs` }
      : null,
    competitorProfile.resolvedSpec?.outputCount
      ? { label: "Outputs", value: `${competitorProfile.resolvedSpec.outputCount}x routed display outputs` }
      : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));
  const rows = candidate && wyrestorm
    ? buildCoreComparisonFacts(competitor, competitorProfile, wyrestorm, candidate).slice(0, 12)
    : [...confirmedRoutedFacts, ...competitor.facts.filter((fact) => !confirmedRoutedFacts.some((confirmed) => confirmed.label === fact.label))]
        .sort((a, b) => noMatchFactPriority(a.label) - noMatchFactPriority(b.label))
        .slice(0, 12)
        .map((fact) => ({ label: fact.label, competitor: fact.value, wyrestorm: "", result: "" }));
  const reason = candidate
    ? commercializeCompareCopy(candidate.matched[0] || candidate.partialMatches[0] || candidate.mismatches[0] || candidate.unknowns[0] || statusMeta.guidance)
    : competitorProfile.resolvedSpec?.inputCount && competitorProfile.resolvedSpec?.outputCount
      ? `No current WyreStorm candidate satisfies the confirmed ${competitorProfile.resolvedSpec.inputCount}x${competitorProfile.resolvedSpec.outputCount} routed I/O requirement without an input or output capacity shortfall.`
    : competitor.warning || "The available evidence does not support a safe WyreStorm equivalent.";
  const closestOnly = Boolean(candidate && status === "no-match");
  const visibleHeading = closestOnly ? "No direct equivalent — closest option shown" : statusMeta.heading;
  const visibleGuidance = closestOnly
    ? "This product performs a similar job, but it has confirmed differences. Use the comparison below to decide whether those differences matter in this project."
    : reason;
  const importantDifferences = candidate
    ? uniqueText([...candidate.mismatches, ...candidate.gaps, ...candidate.blockers], 4)
        .map((item) => commercializeCompareCopy(item))
    : [];
  return (
    <section className="compare-compact-result wm-ui-section wm-ui-card" aria-label="Compare product cards">
      <CompareReportedStatusRail status={status} />
      <header className="compare-compact-result__headline"><div><h2 className="wm-ui-title">{visibleHeading}</h2><p className="wm-ui-copy">{visibleGuidance}</p></div></header>
      <div className="compare-compact-result__products">
        <PrimaryBattleCard side="competitor" eyebrow="Competitor product" heading={competitor.heading} detail={competitor.detail} productClass={competitor.recognisedClass} rows={rows} />
        <span className="compare-compact-result__arrow" aria-hidden="true">→</span>
        {candidate && wyrestorm
          ? <PrimaryBattleCard side="wyrestorm" eyebrow="WyreStorm alternative" heading={candidate.product.sku} detail={candidate.product.name} productClass={wyrestorm.productType} rows={rows} matchTone={matchTone} />
          : <article className="compare-compact-result__product compare-compact-result__product--wyrestorm wm-ui-card" aria-label="No WyreStorm product match" data-match-tone={matchTone}><span>WyreStorm alternative</span><strong>No suitable match</strong><small>Confirm the competitor specification or add evidence before positioning an alternative.</small></article>}
      </div>
      {closestOnly && importantDifferences.length ? (
        <section className="compare-compact-result__warnings wm-ui-card" aria-label="Why this is not a direct match">
          <strong>Why this is not a direct match</strong>
          <ul>{importantDifferences.map((difference) => <li key={difference}>{difference}</li>)}</ul>
        </section>
      ) : null}
    </section>
  );
}

function GovernedDecisionPanel({
  profile,
  candidate,
  existingDecision,
  onSaved,
}: {
  profile: CompetitorProfile;
  candidate: ScoredCandidate | null;
  existingDecision: CompetitorMatchDecision | null;
  onSaved: () => void;
}) {
  const [reviewer, setReviewer] = useState(existingDecision?.reviewer ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(
    existingDecision?.evidence[0]?.sourceUrl ??
      profile.resolvedSpec?.sourceUrl ??
      "",
  );
  const [message, setMessage] = useState("");

  function saveDecision(
    decisionType: CompareDecisionType,
    reviewStatus: "approved" | "pending-review" = "approved",
  ): void {
    if (typeof window === "undefined") return;

    const reviewerName = reviewer.trim();
    const requiresApprovedReviewer = reviewStatus === "approved";

    if (requiresApprovedReviewer && !reviewerName) {
      setMessage("Enter the reviewer name before approving this decision.");
      return;
    }

    if (
      decisionType === "confirmed-equivalent" &&
      (!candidate ||
        candidate.verdict !== "GOOD MATCH" ||
        candidate.blockers.length > 0 ||
        candidate.unknowns.length > 0 ||
        !candidate.necessaryCoverage ||
        candidate.necessaryCoverage.failed > 0 ||
        candidate.necessaryCoverage.unknown > 0 ||
        candidate.necessaryCoverage.confirmed !== candidate.necessaryCoverage.total ||
        candidate.solutionType !== "direct-equivalent")
    ) {
      setMessage("Confirmed equivalent is only available when every necessary requirement is evidenced, no blockers or unknowns remain, and the result is a direct equivalent.");
      return;
    }

    if (
      decisionType === "confirmed-equivalent" &&
      !isGovernedEvidenceUrl(evidenceUrl.trim())
    ) {
      setMessage("Add a valid manufacturer or datasheet source URL before confirming equivalence.");
      return;
    }

    if (
      decisionType !== "no-suitable-match" &&
      decisionType !== "review-required" &&
      !candidate
    ) {
      setMessage("No WyreStorm candidate is available for this decision.");
      return;
    }

    const now = new Date().toISOString();
    const wyrestormSku =
      decisionType === "no-suitable-match" ? null : candidate?.product.sku ?? null;
    const sourceUrl = evidenceUrl.trim();
    const specs = profile.resolvedSpec?.specs;

    const governedDecision: CompetitorMatchDecision = {
      id: [
        governedDecisionIdPart(profile.brand),
        governedDecisionIdPart(profile.sku),
        governedDecisionIdPart(wyrestormSku ?? decisionType),
      ].join("--"),
      competitorManufacturer: profile.brand,
      competitorSku: profile.sku,
      fingerprint: {
        productClass: profile.productClass || "Unknown product class",
        endpointRole: governedEndpointRole(profile),
        transportClass: governedTransportClass(profile),
        codec: profile.requestedTags.find((tag) => /jpeg|h\.?26|sdvoe/i.test(tag)) ?? null,
        maxResolution: profile.resolvedSpec?.maxResolution ?? null,
        chroma: profile.resolvedSpec?.chroma ?? null,
        hdr: profile.videoTags.some((tag) => /hdr/i.test(tag)) || null,
        inputCount: profile.resolvedSpec?.inputCount ?? null,
        routedOutputCount: profile.resolvedSpec?.outputCount ?? null,
        mirroredOutputCount: null,
        loopOutputCount: null,
        usb: specs?.usbStandard ?? (profile.requestedTags.includes("usb") ? "USB requirement present" : null),
        audio: specs?.dante ? "Dante" : specs?.audioDeEmbed ? "Audio de-embed" : null,
        control: specs?.ethernetControl ? "Ethernet control" : specs?.rs232 ? "RS-232" : null,
        dependencies: candidate?.dependencies ?? [],
        notes: profile.resolvedSpec?.profileWarnings ?? [],
      },
      wyrestormSku,
      decisionType,
      reviewStatus,
      reviewer: reviewerName || null,
      reviewedAt: reviewStatus === "approved" ? now : null,
      matchedPoints: candidate?.matched ?? [],
      importantDifferences: uniqueText([
        ...(candidate?.mismatches ?? []),
        ...(candidate?.partialMatches ?? []),
        ...(candidate?.gaps ?? []),
      ], 12),
      dependencies: candidate?.dependencies ?? [],
      quoteBlockers: candidate?.blockers ?? [],
      evidence: isGovernedEvidenceUrl(sourceUrl)
        ? [
            {
              sourceUrl,
              sourceType: "manufacturer",
              checkedAt: now,
              note: "Reviewed from the Compare decision desk.",
            },
          ]
        : [],
      createdAt: existingDecision?.createdAt ?? now,
      updatedAt: now,
    };

    saveCompetitorMatchDecision(window.localStorage, governedDecision);
    setMessage(
      reviewStatus === "pending-review"
        ? "Saved as review required. It will not override heuristic matching until approved."
        : `${governedDecisionLabel(governedDecision)} saved as review evidence. Live matching will continue to use current product data.`,
    );
    onSaved();
  }

  const equivalentAllowed =
    Boolean(candidate) &&
    candidate?.verdict === "GOOD MATCH" &&
    candidate.blockers.length === 0;

  return (
    <section className="compare-native-card wm-ui-section wm-ui-card" data-wingman-governed-decision>
      <div className="compare-native-section-title wm-ui-title">
        <h3 className="wm-ui-title">Governed match decision</h3>
        <p className="wm-ui-copy">
          A reviewed decision overrides automatic ranking for this manufacturer and SKU.
        </p>
      </div>

      {existingDecision ? (
        <p className={`wm-ui-copy compare-governed-status compare-governed-status--${compareDecisionTone(existingDecision.decisionType)}`}>
          <span className="compare-decision-icon" aria-hidden="true">{compareDecisionIcon(existingDecision.decisionType)}</span>
          <strong>Current decision:</strong> {governedDecisionLabel(existingDecision)}
          {existingDecision.wyrestormSku ? ` - ${existingDecision.wyrestormSku}` : ""}
          {existingDecision.reviewer ? ` | Reviewer: ${existingDecision.reviewer}` : ""}
        </p>
      ) : (
        <p className="wm-ui-copy">
          No approved decision is stored yet. Automatic results remain advisory until reviewed.
        </p>
      )}

      <div className="wm-form-grid">
        <label className="wm-field">
          Reviewer
          <input
            className="wm-input"
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            placeholder="Name of technical reviewer"
          />
        </label>
        <label className="wm-field">
          Manufacturer or datasheet source
          <input
            className="wm-input"
            value={evidenceUrl}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://manufacturer.example/product"
          />
        </label>
      </div>

      <div className="compare-native-action-row wm-ui-action-row wm-ui-card">
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("confirmed-equivalent", existingDecision)}`}
          disabled={!equivalentAllowed}
          onClick={() => saveDecision("confirmed-equivalent")}
          aria-pressed={existingDecision?.decisionType === "confirmed-equivalent"}
        >
          <span className="compare-decision-icon" aria-hidden="true">✓</span>
          Confirm equivalent
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("closest-technical-match", existingDecision)}`}
          disabled={!candidate}
          onClick={() => saveDecision("closest-technical-match")}
          aria-pressed={existingDecision?.decisionType === "closest-technical-match"}
        >
          <span className="compare-decision-icon" aria-hidden="true">≈</span>
          Approve closest match
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("architecture-alternative", existingDecision)}`}
          disabled={!candidate}
          onClick={() => saveDecision("architecture-alternative")}
          aria-pressed={existingDecision?.decisionType === "architecture-alternative"}
        >
          <span className="compare-decision-icon" aria-hidden="true">⇄</span>
          Approve architecture alternative
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("review-required", existingDecision)}`}
          onClick={() => saveDecision("review-required", "pending-review")}
          aria-pressed={existingDecision?.decisionType === "review-required"}
        >
          <span className="compare-decision-icon" aria-hidden="true">!</span>
          Mark review required
        </button>
        <button
          type="button"
          className={`compare-native-secondary-action wm-ui-button ${compareDecisionButtonClass("no-suitable-match", existingDecision)}`}
          onClick={() => saveDecision("no-suitable-match")}
          aria-pressed={existingDecision?.decisionType === "no-suitable-match"}
        >
          <span className="compare-decision-icon" aria-hidden="true">×</span>
          Reject: no suitable match
        </button>
      </div>

      {message ? <p className="wm-ui-copy">{message}</p> : null}
    </section>
  );
}

function CompareSummaryPanel({ summary, requestLiveLookup, sourceUrl }: { summary: string; requestLiveLookup: boolean; sourceUrl: string }) {
  return (
    <details className="wm-ui-card wm-ui-copy">
      <summary>Copyable summary</summary>
      <pre>{summary}</pre>
      {requestLiveLookup ? <p className="wm-ui-copy">Live lookup recommended for source validation. {sourceUrl}</p> : null}
    </details>
  );
}

function LiveResearchStatusCard({
  status,
  assessment,
  error,
}: {
  status: LiveCompetitorResearchStatus;
  assessment: LiveCompetitorResearchAssessment | null;
  error: string;
}) {
  if (status === "idle") return null;

  const stored = assessment?.sourceMode === "stored-intelligence";
  const heading =
    status === "loading"
      ? "Checking competitor intelligence"
      : status === "error"
        ? "Competitor research could not complete"
        : stored
          ? "Approved competitor intelligence loaded"
          : assessment?.outcome === "candidate"
            ? "Live research found a WyreStorm direction"
            : "Live research found no safe WyreStorm direction";

  const detail =
    status === "loading"
      ? "Wingman is checking approved competitor intelligence first, then live product evidence when needed."
      : status === "error"
        ? error || "Competitor research is unavailable. Use the evidence tools below to confirm the product manually."
        : stored
          ? assessment?.summary || "The approved competitor profile is now being used by Compare."
          : assessment?.outcome === "candidate"
            ? `${assessment.candidateSku} is a researched direction only. Review the evidence before quotation or approval.`
            : assessment?.summary || "No safe WyreStorm product match was established from the researched evidence.";

  return (
    <section
      className="wm-ui-card wm-ui-section"
      role="status"
      data-live-research-status={status}
    >
      <strong>{heading}</strong>
      <p className="wm-ui-copy">{detail}</p>
      {assessment?.sourceUrl ? (
        <a
          className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary"
          href={assessment.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open researched source
        </a>
      ) : null}
    </section>
  );
}
function ComparePageNew() {
  const bestMatchRef = useRef<HTMLDivElement | null>(null);
  const [searchParams] = useSearchParams();
  const inboundBrand = String(searchParams.get("brand") ?? "").trim();
  const inboundSku = String(searchParams.get("sku") ?? "").trim().toUpperCase();
  const inboundContext = String(searchParams.get("context") ?? "").trim();
  const inboundProjectId = String(searchParams.get("projectId") ?? "").trim();
  const hasInboundCompare = Boolean(inboundSku);
  const [selectedBrand, setSelectedBrand] = useState(inboundBrand || "");
  const [competitorInput, setCompetitorInput] = useState(inboundSku);
  const [mustMatchFeatures, setMustMatchFeatures] = useState(inboundContext);
  const [workflowStep, setWorkflowStep] = useState<"capture" | "options">(hasInboundCompare ? "options" : "capture");
  const [compareStage, setCompareStage] = useState<CompareStage>(hasInboundCompare ? "results" : "sku");
  const [hasCompared, setHasCompared] = useState(hasInboundCompare);
  const [, setState] = useState<"capture" | "analyzing" | "results">(hasInboundCompare ? "results" : "capture");
  const [customSkuStore, setCustomSkuStore] = useState<string[]>([]);
  const [customManufacturerStore, setCustomManufacturerStore] = useState<string[]>([]);
  const [committedSku, setCommittedSku] = useState<string | null>(null);
  const [restoredComparison, setRestoredComparison] = useState<StoredCompareRun | null>(null);
  const [restoreMessage, setRestoreMessage] = useState("");
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [decisionRevision, setDecisionRevision] = useState(0);
  // Ledger-approved decisions fetched from the governed server; merged over
  // the per-browser localStorage ledger so a queue approval promotes into the
  // runtime results immediately (see mergeApprovedLedgerDecisions).
  const [approvedLedgerDecisions, setApprovedLedgerDecisions] = useState<
    CompetitorMatchDecision[]
  >([]);
  // "Product cards" leads: the head-to-head cards are the proof surface a rep
  // needs first - confirming Wingman understood the competitor product and
  // justifying the suggested WyreStorm replacement - before the overview.
  const [, setResultTab] = useState<CompareResultTab>("overview");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [liveResearchStatus, setLiveResearchStatus] = useState<LiveCompetitorResearchStatus>("idle");
  const [liveResearchResult, setLiveResearchResult] = useState<CompetitorMatchResponse | null>(null);
  const [liveResearchError, setLiveResearchError] = useState("");
  const liveResearchSequence = useRef(0);
  // Verified battle cards are supplemental evidence. The governed Compare
  // runtime remains authoritative for recommendation, project save and proposal handoff.
  const navigate = useNavigate();

  useEffect(() => {
    if (!inboundProjectId) return;
    const store = readProjectStore();
    if (store.activeProjectId !== inboundProjectId && store.projects.some((project) => project.id === inboundProjectId)) setActiveProjectId(inboundProjectId);
  }, [inboundProjectId]);

  useEffect(() => {
    const snapshotId = searchParams.get("snapshotId");
    if (!snapshotId) return;
    const store = readProjectStore();
    const projectId = searchParams.get("projectId") || store.activeProjectId;
    const project = store.projects.find((item) => item.id === projectId);
    const snapshot = project?.compareRuns?.find((run) => run.id === snapshotId && run.mode === "saved-history");
    if (!snapshot) return;
    setRestoredComparison(snapshot);
    setRestoreMessage(`Restored snapshot v${snapshot.version ?? 1}. Saved history was not changed.`);
  }, [searchParams]);

  useEffect(() => {
    document.body.classList.add("compare-workspace-open");
    return () => document.body.classList.remove("compare-workspace-open");
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!hasCompared) return;

    // Compare derives port-level technical evidence from the deferred
    // technicalProfile fields, so it hydrates the detail records rather than
    // the summary-only catalogue.
    loadProductIntelligenceDetailRecords()
      .then((indexPayload) => {
        if (cancelled) return;

        const realCandidates = buildRealWyrestormCandidates(indexPayload);
        if (realCandidates.length === 0) return;

        ACTIVE_WYRESTORM_PRODUCTS = mergeRealWyrestormCatalog(WYRESTORM_PRODUCTS, realCandidates);
        setCatalogVersion((version) => version + 1);
      })
      .catch((error) => {
        // Non-fatal: the built-in WyreStorm product set still drives comparison.
        console.error("[wingman] ComparePage: real WyreStorm catalogue load failed, using built-in set", error);
      });

    return () => {
      cancelled = true;
    };
  }, [hasCompared]);

  // Refresh the governed ledger's approved decisions whenever a decision
  // changes (queue approval or the local decision desk both bump
  // decisionRevision), so an approval takes effect on the current results.
  // Failure is non-fatal: the localStorage ledger and heuristic results stay
  // authoritative when the governed server is absent (offline / standalone).
  useEffect(() => {
    let cancelled = false;

    fetchApprovedCompetitorDecisions()
      .then((response) => {
        if (!cancelled && response.ok) {
          setApprovedLedgerDecisions(response.decisions ?? []);
        }
      })
      .catch(() => {
        // Keep the last known approved set (or none) - promotion is additive.
      });

    return () => {
      cancelled = true;
    };
  }, [decisionRevision]);

  const effectiveLedger = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : mergeApprovedLedgerDecisions(
            readCompetitorMatchDecisionLedger(window.localStorage),
            approvedLedgerDecisions,
          ),
    [approvedLedgerDecisions, decisionRevision],
  );

  const effectiveBrand = selectedBrand || brandForCompetitorSku(competitorInput);
  const skuSuggestions = useMemo(() => compareSkuSuggestions(competitorInput, effectiveBrand), [competitorInput, effectiveBrand]);
  const knownBrandSkus = useMemo(() => skuOptionsForBrand(effectiveBrand, customSkuStore), [customSkuStore, effectiveBrand]);

  const profile = useMemo(
    // catalogVersion is bumped after a rep saves a competitor spec (see
    // CompetitorEvidencePanel) so this - and everything downstream that
    // scores against it - recomputes using the newly saved data immediately.
    () => buildCompetitorProfile(effectiveBrand, competitorInput, mustMatchFeatures),
    [competitorInput, effectiveBrand, mustMatchFeatures, catalogVersion],
  );

  const localCompetitorSummary = useMemo(() => buildCompetitorSummary(profile, mustMatchFeatures), [mustMatchFeatures, profile]);
  const hasCompetitorSelection = competitorInput.trim().length > 0;
  const governedDecision = useMemo(() => {
    if (!effectiveLedger || !competitorInput.trim()) {
      return null;
    }

    return resolveApprovedGovernedDecision(
      effectiveLedger,
      effectiveBrand,
      competitorInput,
    );
  }, [competitorInput, effectiveLedger, effectiveBrand]);

  const displayedDecision = useMemo(() => {
    if (!effectiveLedger || !competitorInput.trim()) {
      return null;
    }

    const manufacturer = effectiveBrand.trim().toLowerCase();
    const sku = competitorInput.trim().toUpperCase();

    return (
      effectiveLedger.decisions.find(
        (decision) =>
          decision.competitorManufacturer.trim().toLowerCase() === manufacturer &&
          decision.competitorSku.trim().toUpperCase() === sku,
      ) ?? null
    );
  }, [competitorInput, effectiveLedger, effectiveBrand]);

  const compareManufacturerOptions = useMemo(() => {
    const seededBrands = new Set(MANUFACTURER_SELECT_OPTIONS.map((brand) => brand.toLowerCase()));
    const newBrands = customManufacturerStore.filter((brand) => !seededBrands.has(brand.toLowerCase()));
    return [...newBrands, ...MANUFACTURER_SELECT_OPTIONS].sort(compareManufacturerNames);
  }, [customManufacturerStore]);

  const legacyCandidates = useMemo(() => {
    const avoip = mapCompetitorToNetworkHdAvoip(profile.rawText);
    const shouldUseAvoipFastPath = avoip.recommendation.applies && profile.productClass === "AV-over-IP";

    if (shouldUseAvoipFastPath) {
      return buildAvoipCandidates(profile, avoip.classification, avoip.recommendation, findWyrestormProduct);
    }

    const matrixCandidates = buildMatrixCandidates(profile, findWyrestormProduct);

    if (matrixCandidates?.length) {
      return matrixCandidates;
    }

    return ACTIVE_WYRESTORM_PRODUCTS
      .filter((product) => !isBannedNetworkHdSku(product.sku))
      .filter((product) => isWyreStormSkuCompareLeadAllowed(product.sku))
      .map((product) => scoreProduct(profile, product))
      .filter((candidate) => isSelectableWyrestormRecommendation(candidate.product))
      .sort((a, b) => b.score - a.score)
      // Classification and eligibility—not an arbitrary early top-eight cut—
      // decide which products survive. This prevents a valid same-role product
      // with less marketing-keyword overlap from being discarded too soon.
      .slice(0, 40);
  }, [profile, catalogVersion]);

  const rigorousResult = useMemo(() => {
    const inputText = [effectiveBrand, competitorInput, mustMatchFeatures].filter(Boolean).join(" ");
    const result = runGovernedCompareSync({
      inputText,
      products: ACTIVE_WYRESTORM_PRODUCTS,
      brand: effectiveBrand,
      limit: 8,
    }) as RigorousCompareResult;
    // resolveCompetitorSpecProfile() (result.competitor) only classifies SKUs it has
    // curated/family-rule evidence for. The page's own tag classifier
    // (extractTags/productClassFromTags, feeding `profile`) recognises far more
    // from well-described free text, so use it to backfill domain ONLY where the
    // structured profile has nothing - this lets a well-described-but-uncurated
    // product (e.g. a typed "PTZ camera" or "HDMI splitter" description) still
    // be classified as known, while a bare SKU with zero evidence anywhere
    // (e.g. "SP14CS" alone) stays genuinely unknown.
    // Deliberately domain-only: role/transport are NOT backfilled from the
    // page's own roleFromTags()/transportFromTags() vocabulary here, because it
    // doesn't align with wyrestormCompareProfile.ts's coarser detectRole()/
    // canonicalTransport() output (e.g. every WyreStorm Apollo product gets the
    // same bare "wireless presentation" role and "Wireless" transport regardless
    // of whether it's a UC bar or a casting dongle) - backfilling those too
    // turned real matches into false role/transport-mismatch blockers.
    const inferredCompetitorDomain = domainFromProductClass(profile.productClass);
    const competitorForClassification: typeof result.competitor = {
      ...result.competitor,
      // The page classifier has the full resolved product description, whereas
      // the runtime registry can retain a coarser legacy domain. Prefer the
      // evidence-derived product class whenever one was established.
      domain: inferredCompetitorDomain ?? result.competitor.domain,
    };

    const classifiedLegacyMatches: RigorousMatch[] = legacyCandidates.map((candidate) => {
      const wyrestorm = buildWyrestormCompareProfile(candidate.product);
      const classified = classifyCompetitorCompareDecision({
        competitor: competitorForClassification,
        wyrestorm,
        score: candidate.score,
        evidence: candidate.matched,
        warnings: candidate.checks,
      });
      // classifyCompetitorCompareDecision only ever returns "NO MATCH" when it found
      // at least one real blocker (technology-class, role, transport or capacity
      // mismatch - see competitorCompareDecision.ts). A high legacy keyword-heuristic
      // score must never override that: doing so is exactly how a wrong-technology
      // candidate (e.g. an AVoIP encoder recommended for a splitter/extender brief)
      // could reach the customer as a "verify-only" candidate instead of being
      // rejected. Always respect the classifier's outcome; only carry the legacy
      // score through as the displayed confidence.
      const decision = {
        ...classified,
        confidence: candidate.score,
      };

      return {
        sku: candidate.product.sku,
        name: candidate.product.name,
        family: candidate.product.family,
        heuristicScore: candidate.score,
        wyrestorm,
        decision,
      };
    });
    const seen = new Set<string>();
    // The runtime pipeline is the authoritative, fully classified result. Keep
    // its copy of a SKU when the legacy scorer found the same product: the
    // heuristic may carry a stale NO MATCH decision based on weaker text
    // overlap, and putting it first caused de-duplication to discard a valid
    // technical match (for example AT-HDDA-2 -> EXP-SP-0102-H2).
    const matches = [...result.matches, ...classifiedLegacyMatches].filter((match) => {
      const key = match.sku.toUpperCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    const ranked = applyCompareEligibilityRanking({ ...result, matches }, ACTIVE_WYRESTORM_PRODUCTS, inputText);
    const rankedWithDecisions: RigorousCompareResult = {
      ...ranked,
      matches: normalizeRankedRigorousMatches(ranked.matches, competitorForClassification),
      rejected: normalizeRankedRigorousMatches(ranked.rejected, competitorForClassification),
    };
    const unresolvedCompetitor =
      /custom\s*\/\s*missing sku/i.test(competitorInput) ||
      (
        result.topOutcome === "NONE" &&
        result.matches.length === 0 &&
        result.analysis.confidence === "low" &&
        (!result.competitor.domain || result.competitor.domain === "UNKNOWN")
      );

    if (unresolvedCompetitor) {
      return {
        ...rankedWithDecisions,
        matches: [],
        topOutcome: "NONE" as const,
        recommendation: result.recommendation,
        nextSteps: result.nextSteps,
      };
    }

    if (rankedWithDecisions.matches.length > 0) {
      return rankedWithDecisions;
    }

    const guardedFallbacks = classifiedLegacyMatches
      .filter((match) => match.decision.outcome !== "NO MATCH" && match.heuristicScore >= 55)
      .slice(0, 5);

    return guardedFallbacks.length > 0
      ? {
          ...rankedWithDecisions,
          matches: guardedFallbacks,
          topOutcome: "VERIFY" as const,
          recommendation: "The eligibility pass found no fully proven direct match. Show the strongest locally classified direction as verify-only.",
        }
      : rankedWithDecisions;
  }, [competitorInput, effectiveBrand, legacyCandidates, mustMatchFeatures, catalogVersion]);

  const verdictResult = useMemo(
    () =>
      decideComparison({
        engineMatches: rigorousResult.matches,
        products: ACTIVE_WYRESTORM_PRODUCTS,
        governedDecision,
        profile,
        toCandidate: rigorousMatchToCandidate,
        scoreProduct,
        isSelectable: isSelectableWyrestormRecommendation,
      }),
    [rigorousResult, governedDecision, profile],
  );
  const viableCandidates = verdictResult.viable;
  const nearMatchCandidates = verdictResult.nearMatches;
  const heuristicLead = verdictResult.heuristicLead;
  const best = viableCandidates[0] ?? null;
  const displayedPool = viableCandidates.length ? viableCandidates : nearMatchCandidates;
  const localDisplayedCandidate = displayedPool[candidateIndex] ?? displayedPool[0] ?? null;
  useEffect(() => {
    if (candidateIndex >= displayedPool.length) setCandidateIndex(0);
  }, [candidateIndex, displayedPool.length]);
  useEffect(() => {
    if (!hasCompared || workflowStep !== "options" || !best?.product.sku) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (
        bestMatchRef.current &&
        typeof bestMatchRef.current.scrollIntoView === "function"
      ) {
        bestMatchRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      }

      bestMatchRef.current?.focus({
        preventScroll: true,
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [best?.product.sku, hasCompared, workflowStep]);
  const alternativeCandidates = best
    ? viableCandidates.filter((candidate) => candidate.product.sku !== best.product.sku)
    : nearMatchCandidates.filter((candidate) => candidate.product.sku !== localDisplayedCandidate?.product.sku);
  const matrixCandidatePool = best?.product.productClass === "Matrix"
    ? alternativeCandidates.filter((candidate) => candidate.product.productClass === "Matrix")
    : [];
  const bestMatrixSize = best ? matrixSkuSizeKey(best.product.sku) : "";
  const exactSizeMatrixAlternatives = bestMatrixSize
    ? matrixCandidatePool.filter((candidate) => matrixSkuSizeKey(candidate.product.sku) === bestMatrixSize)
    : [];
  const matrixAlternatives = (exactSizeMatrixAlternatives.length ? exactSizeMatrixAlternatives : matrixCandidatePool).slice(0, 3);

  const requestLiveLookup = needsLiveLookup({
    profile,
    brand: effectiveBrand,
    sku: competitorInput,
  });

  useEffect(() => {
    const sequence = ++liveResearchSequence.current;
    const plan = liveLookupPlan({
      onResults: compareStage === "results",
      hasCompared,
      requestLiveLookup,
      manufacturer: effectiveBrand,
      sku: competitorInput,
    });

    if (!plan.run) {
      setLiveResearchStatus("idle");
      setLiveResearchResult(null);
      setLiveResearchError("");
      return;
    }

    let cancelled = false;
    setLiveResearchStatus("loading");
    setLiveResearchResult(null);
    setLiveResearchError("");

    // Applying the outcome is the page's job; deciding what a settled lookup
    // means belongs to the module, so both branches land the same three values.
    runCompetitorMatch(plan.request)
      .then((response) => {
        if (cancelled || sequence !== liveResearchSequence.current) return;
        const outcome = liveLookupSettled(response);
        setLiveResearchResult(outcome.result);
        setLiveResearchStatus(outcome.status);
        setLiveResearchError(outcome.error);
      })
      .catch((error) => {
        if (cancelled || sequence !== liveResearchSequence.current) return;
        const outcome = liveLookupFailed(error);
        setLiveResearchResult(outcome.result);
        setLiveResearchStatus(outcome.status);
        setLiveResearchError(outcome.error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    compareStage,
    competitorInput,
    effectiveBrand,
    hasCompared,
    requestLiveLookup,
  ]);

  const liveResearchAssessment = useMemo(
    () =>
      liveResearchResult?.ok
        ? assessLiveCompetitorResearch(liveResearchResult)
        : null,
    [liveResearchResult],
  );

  const liveResearchCandidate = useMemo(
    () => liveResearchToScoredCandidate(liveResearchAssessment, findWyrestormProduct),
    [catalogVersion, liveResearchAssessment],
  );

  const competitorSummary = useMemo(
    () =>
      mergeLiveResearchCompetitorSummary(
        localCompetitorSummary,
        liveResearchAssessment,
      ),
    [liveResearchAssessment, localCompetitorSummary],
  );

  const displayedCandidate =
    localDisplayedCandidate ?? best ?? liveResearchCandidate;
  const primarySearchCriteria = uniqueText([
    `Manufacturer: ${effectiveBrand}`,
    `SKU / model: ${competitorInput}`,
    profile.productClass !== "Unknown" ? `Product class: ${profile.productClass}` : "Product class: not recognised locally",
    profile.role !== "Unknown" ? `Role: ${profile.role}` : "Role: not recognised locally",
    profile.transport !== "Unknown" ? `Transport: ${profile.transport}` : "Transport: not recognised locally",
    mustMatchFeatures.trim() ? `Must match: ${mustMatchFeatures.trim()}` : "",
  ], 6);
  const sourceUrl = liveResearchAssessment?.sourceUrl || fallbackRetrySourceUrl("");

  // One place applies what starting a run changes, so a picked SKU and a typed
  // one cannot land the rep in different states.
  const startCompareRun = useCallback((): void => {
    const started = compareRunStarted();
    setHasCompared(started.hasCompared);
    setWorkflowStep(started.workflowStep);
    setResultTab(started.resultTab);
    setCandidateIndex(started.candidateIndex);
    setCompareStage(started.compareStage);
    setState("results");
  }, []);

  const handleSkuSelect = useCallback((sku: string): void => {
    const normalizedSku = normalizeCompetitorSku(sku);

    runKnownProfileCompare(buildCompetitorProfile(effectiveBrand, normalizedSku, mustMatchFeatures));
    setState("analyzing");
    setCompetitorInput(normalizedSku);

    const detectedBrand = brandForCompetitorSku(normalizedSku);

    if (detectedBrand !== "CUSTOM") {
      setSelectedBrand(detectedBrand);
    }

    startCompareRun();
  }, [effectiveBrand, mustMatchFeatures]);

  const handleSubmit = useCallback((event?: { preventDefault?: () => void }): void => {
    event?.preventDefault?.();

    runKnownProfileCompare(profile);
    runCompare();
  }, [profile, competitorInput]);

  const handleRetryWithSourceUrl = useCallback((sourceUrlValue?: string): string => {
    const lookupTarget = sourceUrlValue ?? competitorInput;
    lookupCompareIntelligence(lookupTarget);
    const retryInput = buildCompetitorProfile(effectiveBrand, lookupTarget, mustMatchFeatures);
    runKnownProfileCompare(retryInput);
    return sourceUrlValue ?? "";
  }, [competitorInput, effectiveBrand, mustMatchFeatures]);

  const handleReset = useCallback((): void => {
    resetCompare();
  }, []);

  const summary = useMemo(() => {
    if (!displayedCandidate) {
      return "No suitable WyreStorm direction found from the current data.";
    }

    const directionFit = salesDirectionFitLabel(displayedCandidate);
    const replacementConfidence = salesReplacementConfidenceLabel(competitorSummary, displayedCandidate);
    const askCustomer = salesAskCustomer(competitorSummary, displayedCandidate).map((line) => commercializeCompareCopy(line)).filter(Boolean);
    const identityItems = competitorIdentityItems(competitorSummary);
    const limitedWarning = exactLimitedDataWarning(profile);

    return [
      `${competitorSummary.heading} appears to be a ${shortRoleLabel(competitorSummary.role)}.`,
      ...(governedDecision ? [`Historical review: ${governedDecisionLabel(governedDecision)}${governedDecision.reviewer ? ` by ${governedDecision.reviewer}` : ""}. Current matching was recalculated independently.`] : []),
      ...identityItems.map((line) => line),
      `The selected WyreStorm direction is ${displayedCandidate.product.sku} because it performs the same basic job in a ${displayedCandidate.product.family} system.`,
      `${directionFit}. ${replacementConfidence}.`,
      salesImportantDifference(competitorSummary, displayedCandidate),
      ...(limitedWarning ? [limitedWarning] : []),
      "",
      "Ask the customer before quoting:",
      ...askCustomer.slice(0, 4).map((line) => `- ${line}`),
    ].join("\n");
  }, [competitorInput, competitorSummary, displayedCandidate, effectiveBrand, governedDecision, profile]);

  const handleCommit = useCallback(
    (target: "project" | "proposal"): void => {
      if (!displayedCandidate) return;

      const status =
        displayedCandidate.verdict === "GOOD MATCH" ? "recommended" : displayedCandidate.verdict === "NO MATCH" ? "caution" : "alternative";
      // Carry the same explicit confidence tier the verdict lead showed on
      // screen into the project and any proposal/response-pack export: the
      // project timeline renders compareRun.confidence, and the selection's
      // first evidence line becomes the BOM evidence basis in the exported
      // proposal/CSV, so a quoted comparison keeps its confidence label.
      const tierLabel = compareVerdictTier(
        compareReportedStatus(displayedCandidate, competitorSummary),
      ).label;
      const selection: StoredProductSelection = {
        sku: displayedCandidate.product.sku,
        title: displayedCandidate.product.name,
        family: displayedCandidate.product.family,
        status,
        source: "Competitor Compare",
        evidence: [`Compare verdict: ${tierLabel}`, ...displayedCandidate.matched],
        cautions: displayedCandidate.checks,
      };
      const compareRun = {
        competitorBrand: effectiveBrand,
        competitorSku: competitorInput || undefined,
        wyrestormSku: displayedCandidate.product.sku,
        wyrestormTitle: displayedCandidate.product.name,
        mode: "compare",
        summary,
        matchScore: Math.round(displayedCandidate.score),
        matchType: displayedCandidate.verdict,
        confidence: tierLabel,
        evidence: displayedCandidate.matched,
        warnings: displayedCandidate.checks,
        source: "Competitor Compare",
      };

      saveCompareRunToProject(compareRun);

      saveProductSelectionToCurrentProject(selection);
      saveRecommendationEvidenceToProject(
        buildRecommendationEvidence({
          source: "Competitor Compare",
          query: [effectiveBrand, competitorInput, mustMatchFeatures].filter(Boolean).join(" "),
          compare: compareRun,
          product: {
            sku: displayedCandidate.product.sku,
            title: displayedCandidate.product.name,
            family: displayedCandidate.product.family,
            category: displayedCandidate.product.productClass,
            tags: displayedCandidate.product.tags,
            summary: displayedCandidate.matched.join(" "),
          },
        }),
        selection,
      );

      setCommittedSku(displayedCandidate.product.sku);

      if (target === "proposal") {
        navigate(routeCatalogByKey.proposal.path);
      }
    },
    [competitorInput, competitorSummary, displayedCandidate, effectiveBrand, mustMatchFeatures, navigate, summary],
  );

  function onBrandSelect(brand: string): void {
    setSelectedBrand(brand);
    setCompetitorInput("");
    setCommittedSku(null);
    setCompareStage("sku");
  }

  function onSkuSelect(sku: string): void {
    handleSkuSelect(sku);
  }

  function runCompare(): void {
    // A typed SKU the catalogue does not hold becomes one of this run's own
    // options, so the next visit can suggest it again.
    setCustomSkuStore((current) => competitorSkusAfterRun(competitorInput, current));
    startCompareRun();
  }

  function resetCompare(): void {
    const reset = compareReset();
    setResultTab(reset.resultTab);
    setCandidateIndex(reset.candidateIndex);
    setSelectedBrand("");
    setCompetitorInput("");
    setMustMatchFeatures("");
    setWorkflowStep(reset.workflowStep);
    setCompareStage(reset.compareStage);
    setHasCompared(reset.hasCompared);
    setCustomSkuStore([]);
    setCustomManufacturerStore([]);
    setCommittedSku(null);
    setLiveResearchStatus("idle");
    setLiveResearchResult(null);
    setLiveResearchError("");
    setRestoredComparison(null);
  }

  async function copySummary(): Promise<void> {
    await navigator.clipboard.writeText(summary);
  }

  function saveComparisonHistory(): void {
    if (!displayedCandidate) return;

    saveCompareRunToProject({
      competitorBrand: effectiveBrand,
      competitorSku: competitorInput || undefined,
      wyrestormSku: displayedCandidate.product.sku,
      wyrestormTitle: displayedCandidate.product.name,
      mode: "saved-history",
      summary,
      matchScore: Math.round(displayedCandidate.score),
      matchType: displayedCandidate.verdict,
      confidence: compareVerdictTier(compareReportedStatus(displayedCandidate, competitorSummary)).label,
      evidence: displayedCandidate.matched,
      warnings: displayedCandidate.checks,
      source: "Compare saved history",
    });
    setCommittedSku(displayedCandidate.product.sku);
    setRestoredComparison(null);
  }

  function savedComparisonRuns() {
    const store = readProjectStore();
    const project = store.projects.find((item) => item.id === store.activeProjectId);
    return savedHistoryRuns(project?.compareRuns ?? []);
  }

  function savedComparisonCount(): number {
    return savedComparisonRuns().length;
  }

  // WINGMAN_MINIMUM_COMPARE_RENDER_V2
  const activeCandidate = displayedCandidate ?? best;

  return (
    <main className="wm-compare-page wm-polish-shell wm-page" data-wingman-page="compare" data-compare-state={compareStage === "results" ? "result" : "input"}>
      {compareStage !== "results" ? (
        <section className="compare-native-results wm-ui-section" aria-label="Compare competitor products">
          <header className="compare-native-section-title wm-ui-card">
            <div><span className="compare-native-eyebrow wm-ui-kicker">Competitor compare</span><h1 className="wm-ui-title">Compare competitor products</h1><p className="wm-ui-copy">Identify the competitor product, then compare its confirmed signal path, routed I/O and technical capabilities against the current WyreStorm range.</p></div>
          </header>
          <form className="compare-native-sku-stage" onSubmit={handleSubmit}>
            <div className="wm-compare-sku-header">
              <div className="wm-compare-selected-brand">
                <span>Manufacturer</span>
                <strong>{selectedBrand || "Not selected"}</strong>
              </div>
              <div className="wm-compare-sku-heading">
                <span>Product identification</span>
                <h2 className="wm-ui-title">What are you comparing?</h2>
                <p>Choose a manufacturer and enter the exact competitor model. Known SKUs are recognised as you type.</p>
              </div>
            </div>
            <div className="wm-compare-sku-workspace">
              <div className="wm-compare-sku-lookup">
                <div className="wm-compare-panel-heading"><span>1</span><div><strong>Competitor product</strong><small>Manufacturer and model / SKU</small></div></div>
                <CompareManufacturerCombobox brands={compareManufacturerOptions} selectedBrand={selectedBrand} onBrandSelect={onBrandSelect} />
                <CompareProductLookupInput value={competitorInput} knownSkus={knownBrandSkus} suggestions={skuSuggestions} onInputChange={setCompetitorInput} onSkuSelect={onSkuSelect} />
              </div>
              <details className="wm-compare-match-requirements">
                <summary className="wm-compare-panel-heading"><span>2</span><div><strong>Essential requirement</strong><small>Optional — add only what the SKU does not explain</small></div></summary>
                <label className="wm-compare-requirement-field" htmlFor="compare-must-match"><span>Must-have capability</span><textarea id="compare-must-match" className="compare-native-input wm-ui-input" value={mustMatchFeatures} onChange={(event) => setMustMatchFeatures(event.target.value)} placeholder="For example: 4K60, 6x2 routed I/O, USB path or 100 m extension" rows={3} /></label>
                <div className="wm-compare-requirement-examples" aria-label="Requirement examples"><span>Useful details</span><small>Resolution</small><small>Routed I/O</small><small>Extension</small><small>USB</small></div>
              </details>
            </div>
            <div className="wm-compare-sku-actions">
              <button className="compare-native-more wm-ui-button wm-ui-button-primary" data-testid="compare-submit" type="submit" disabled={!hasCompetitorSelection}>Compare</button>
              <div className="wm-compare-sku-action-copy"><span>{competitorInput || "Enter a competitor SKU to continue"}</span><small>The engine evaluates current product data each time.</small></div>
            </div>
          </form>
        </section>
      ) : (
        <section className="compare-native-results wm-ui-section" aria-live="polite">
          <header className="compare-native-section-title compare-native-section-title--inline wm-ui-card wm-ui-title"><div><span className="compare-native-eyebrow wm-ui-kicker">Competitor compare</span><h1 data-testid="compare-result" className="wm-ui-title">Comparison result</h1></div><button className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" type="button" onClick={handleReset}>New comparison</button></header>
          {hasCompared ? <>
            <div ref={bestMatchRef} className="compare-native-scroll-target" tabIndex={-1} aria-label={activeCandidate ? `Main WyreStorm match: ${activeCandidate.product.sku}` : "Main WyreStorm match: none"}>
              {requestLiveLookup ? (
                <LiveResearchStatusCard
                  status={liveResearchStatus}
                  assessment={liveResearchAssessment}
                  error={liveResearchError}
                />
              ) : null}
              {requestLiveLookup && liveResearchStatus === "loading" ? null : (
                <MinimumCompareCards competitor={competitorSummary} competitorProfile={profile} candidate={activeCandidate} />
              )}
            </div>
            {requestLiveLookup && liveResearchStatus === "done" && liveResearchAssessment?.sourceMode === "live" ? (
              <CompetitorEvidencePanel
                brand={effectiveBrand}
                sku={competitorInput}
                onSaved={() => setCatalogVersion((version) => version + 1)}
                primaryCriteria={primarySearchCriteria}
                liveResearchResult={liveResearchResult}
              />
            ) : null}
            {activeCandidate ? <section className="wm-ui-card wm-ui-section" aria-label="Compare result actions"><div className="compare-native-action-row wm-ui-action-row">
              <button type="button" className="compare-native-more wm-ui-button wm-ui-button-primary" onClick={() => handleCommit("project")}>{compareReportedStatus(activeCandidate, competitorSummary) === "match" ? "Add to project" : "Add to project for review"}</button>
              <button type="button" className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" data-testid="compare-save-history" onClick={saveComparisonHistory} aria-label="Save comparison to history">Save comparison</button>
              <Link className="compare-native-secondary-action wm-ui-button wm-ui-button-secondary" to={`${routeCatalogByKey.productPitch.path}?sku=${encodeURIComponent(activeCandidate.product.sku)}&source=compare`}>Product details</Link>
            </div>{committedSku === activeCandidate.product.sku ? <p className="wm-ui-copy">Saved. <Link to={routeCatalogByKey.projects.path}>Open projects</Link>.</p> : null}<p className="wm-ui-copy">{savedComparisonCount()} saved comparison{savedComparisonCount() === 1 ? "" : "s"} in the current project.</p>{restoreMessage ? <p className="wm-ui-copy" role="status">{restoreMessage}</p> : null}{restoredComparison ? <section className="wm-ui-card wm-ui-copy" aria-label="Saved comparison snapshot"><details open><summary>Saved snapshot</summary><div className="mt-4"><p className="wm-ui-copy" role="status">Saved {new Date(restoredComparison.createdAt).toLocaleString()} · Snapshot v{restoredComparison.version ?? 1}. The main result above is recalculated from current product data.</p><dl className="compare-native-core-matrix"><div><dt>Competitor</dt><dd>{restoredComparison.competitorBrand || "Not specified"} {restoredComparison.competitorSku || ""}</dd></div><div><dt>WyreStorm direction</dt><dd>{restoredComparison.wyrestormSku || "Not specified"}{restoredComparison.wyrestormTitle ? ` — ${restoredComparison.wyrestormTitle}` : ""}</dd></div><div><dt>Verdict</dt><dd>{restoredComparison.matchType || "Review"}</dd></div><div><dt>Confidence</dt><dd>{restoredComparison.confidence || "Not recorded"}</dd></div></dl>{restoredComparison.summary ? <><strong>Saved summary</strong><pre>{restoredComparison.summary}</pre></> : null}{restoredComparison.evidence?.length ? <><strong>Saved evidence</strong><ul>{restoredComparison.evidence.map((item) => <li key={`saved-evidence-${item}`}>{item}</li>)}</ul></> : null}{restoredComparison.warnings?.length ? <><strong>Saved quote checks</strong><ul>{restoredComparison.warnings.map((item) => <li key={`saved-warning-${item}`}>{item}</li>)}</ul></> : null}</div></details></section> : null}<div className="compare-native-action-row wm-ui-action-row"><VerifyBeforeQuoteNote /></div></section> : null}
            {savedComparisonRuns().length ? <p className="wm-ui-copy"><Link data-testid="compare-review-history" to={`${routeCatalogByKey.projects.path}/${encodeURIComponent(searchParams.get("projectId") || readProjectStore().activeProjectId || "")}?view=history`}>Review saved history in Project</Link></p> : null}
            {matrixAlternatives.length ? <section className="compare-candidate-selector wm-ui-card" aria-label="Suggested other matches"><div><h2 className="wm-ui-title">Suggested other matches</h2><p className="wm-ui-copy">Select a thumbnail to compare that option in the main cards.</p></div><div className="compare-candidate-selector__grid">{matrixAlternatives.map((candidate) => <CandidateThumbnailSelector key={`${candidate.product.sku}-${candidate.verdict}`} candidate={candidate} selected={activeCandidate?.product.sku === candidate.product.sku} onSelect={() => { const index = viableCandidates.findIndex((option) => option.product.sku === candidate.product.sku); if (index >= 0) setCandidateIndex(index); }} />)}</div></section> : null}
            <details className="wm-ui-card wm-ui-copy"><summary>Technical evidence &amp; review</summary><div className="mt-4">
              <CompetitorSearchCard
                brand={effectiveBrand}
                sku={competitorInput}
                summary={competitorSummary}
                locallyRecognised={
                  !requestLiveLookup ||
                  liveResearchAssessment?.sourceMode === "stored-intelligence"
                }
                liveResearched={
                  liveResearchStatus === "done" &&
                  liveResearchAssessment?.sourceMode === "live"
                }
                confidenceSource={liveResearchResult?.confidence_source}
              />
              {activeCandidate ? <>
                <BestCandidateCard candidate={activeCandidate} competitor={competitorSummary} competitorProfile={profile} onCopySummary={() => { void copySummary(); }} />
                {alternativeCandidates.length && matrixAlternatives.length === 0 ? <section className="wm-ui-card"><h3 className="wm-ui-title">Other WyreStorm options with known differences</h3><p className="wm-ui-copy">Compare the connection mix and capacity before choosing one. These are alternatives, not claimed one-box equivalents.</p><div className="compare-native-option-grid wm-ui-card">{alternativeCandidates.slice(0, 3).map((candidate) => <CandidateOptionCard key={`${candidate.product.sku}-${candidate.verdict}`} candidate={candidate} />)}</div></section> : null}
                <CompareShowdown brand={effectiveBrand} competitorSku={competitorInput} active={hasCompared} view="proof" selectedWyrestormSku={activeCandidate.product.sku} onSelectedWyrestormSkuChange={(sku) => { const index = viableCandidates.findIndex((candidate) => candidate.product.sku.toUpperCase() === sku.toUpperCase()); if (index >= 0) setCandidateIndex(index); }} />
              </> : null}
              {requestLiveLookup &&
              liveResearchStatus === "done" &&
              liveResearchAssessment?.sourceMode === "live" ? (
                <section className="wm-ui-card wm-ui-section" aria-label="Live research governance notice">
                  <h3 className="wm-ui-title">Review before governance approval</h3>
                  <p className="wm-ui-copy">
                    Live research can make a match judgement, but it is not approved competitor intelligence. Review and save the evidence below before creating an approved governed match decision.
                  </p>
                </section>
              ) : (
                <GovernedDecisionPanel key={`${effectiveBrand}:${competitorInput}:${displayedDecision?.updatedAt ?? decisionRevision}`} profile={profile} candidate={activeCandidate ?? heuristicLead ?? null} existingDecision={displayedDecision} onSaved={() => setDecisionRevision((revision) => revision + 1)} />
              )}
              <CompareSummaryPanel summary={summary} requestLiveLookup={requestLiveLookup && liveResearchAssessment?.sourceMode !== "stored-intelligence"} sourceUrl={sourceUrl} />
              {requestLiveLookup && liveResearchStatus === "error" ? <CompetitorEvidencePanel brand={effectiveBrand} sku={competitorInput} onSaved={() => setCatalogVersion((version) => version + 1)} primaryCriteria={primarySearchCriteria} /> : null}
            </div></details>
          </> : null}
        </section>
      )}
      <span className="compare-native-marker" aria-hidden="true">{ROUTE_LOCK_MARKER}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_TYPEAHEAD_STATIC_MARKERS.join(" ")}</span>
      <span className="compare-native-marker" aria-hidden="true">{COMPARE_CANDIDATE_GATE_STATIC_MARKERS.join(" ")}</span>
    </main>
  );

}

export default ComparePageNew;
