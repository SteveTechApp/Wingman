import {
  applyReadinessCap,
  classifyNetworkSpeed,
  classifyWyreStormNetworkHdTier,
  createGapItem,
  createNetworkSpeedGap,
  getDomainWeights,
  getReadinessMessage,
  getRoutedInputCount,
  getRoutedOutputCount,
  outcomeFromConfidence,
  type ArchitectureAlternative,
  type CandidateMatch,
  type CompareAttributeKey,
  type CompareResult,
  type GapItem,
  type GapSeverity,
  type OutcomeTier,
  type ProductDomainTag,
  type ProductProfile,
} from "./compareEngineModel";

/**
 * Wingman Compare Engine Scoring
 *
 * Phase 2:
 * - Weighted attribute scoring
 * - Blocking gap handling
 * - Readiness confidence caps
 * - Routed-output protection
 * - Architecture alternatives
 *
 * This module is intentionally UI-free.
 * Do not add CSS, React components, Guru logic, microphone logic, or route logic here.
 */

const OUTCOME_RANK: Record<OutcomeTier, number> = {
  "GOOD MATCH": 4,
  "PARTIAL MATCH": 3,
  VERIFY: 2,
  "NO MATCH": 1,
};

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalise(value: unknown): string {
  return toText(value).toLowerCase();
}

function asArray(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function arraysOverlap(left: string[] | undefined, right: string[] | undefined): boolean {
  const leftNormalised = asArray(left).map(normalise);
  const rightNormalised = asArray(right).map(normalise);

  return leftNormalised.some((leftItem) =>
    rightNormalised.some((rightItem) => leftItem === rightItem || leftItem.includes(rightItem) || rightItem.includes(leftItem)),
  );
}

function valueKnown(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function resolutionRank(value: unknown): number {
  const text = normalise(value);

  if (!text) {
    return 0;
  }

  if (text.includes("8k")) {
    return 5;
  }

  if (text.includes("4k120")) {
    return 5;
  }

  if (text.includes("4k60") || text.includes("2160p60") || text.includes("uhd60")) {
    return 4;
  }

  if (text.includes("4k30") || text.includes("2160p30") || text.includes("uhd30") || text.includes("4k")) {
    return 3;
  }

  if (text.includes("1080") || text.includes("full hd")) {
    return 2;
  }

  if (text.includes("720")) {
    return 1;
  }

  return 0;
}

function latencyRank(value: unknown): number {
  const text = normalise(value);

  if (!text) {
    return 0;
  }

  if (text.includes("zero") || text.includes("<1") || text.includes("0 frame") || text.includes("zero-frame")) {
    return 5;
  }

  if (text.includes("ultra")) {
    return 4;
  }

  if (text.includes("low")) {
    return 3;
  }

  if (text.includes("standard")) {
    return 2;
  }

  if (text.includes("variable") || text.includes("stream")) {
    return 1;
  }

  return 0;
}

function hdcpRank(value: unknown): number {
  const text = normalise(value);

  if (text.includes("2.3")) {
    return 4;
  }

  if (text.includes("2.2")) {
    return 3;
  }

  if (text.includes("2.0")) {
    return 2;
  }

  if (text.includes("1.4")) {
    return 1;
  }

  return 0;
}

function hdbasetClassRank(value: unknown): number {
  const text = normalise(value);

  if (text.includes("3.0")) {
    return 4;
  }

  if (text.includes("class a")) {
    return 3;
  }

  if (text.includes("class b")) {
    return 2;
  }

  if (text.includes("lite") || text.includes("class c")) {
    return 1;
  }

  return 0;
}

function addUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function dedupeGaps(gaps: GapItem[]): GapItem[] {
  const seen = new Set<string>();
  const result: GapItem[] = [];

  for (const gap of gaps) {
    const key = `${gap.attribute}|${gap.severity}|${gap.description}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(gap);
  }

  return result;
}

function isAvoip(domainTag: ProductDomainTag): boolean {
  return domainTag === "avoip_encoder" || domainTag === "avoip_decoder";
}

function hasNdiOutput(profile: ProductProfile): boolean {
  return profile.domainTag === "ndi_camera" || profile.subTags.includes("ndi_output") || valueKnown(profile.ndiVersion);
}

function compareBooleanRequirement(args: {
  competitor: boolean | undefined;
  candidate: boolean | undefined;
  attribute: CompareAttributeKey;
  label: string;
  severity: GapSeverity;
  matches: string[];
  gaps: GapItem[];
  matchedAttributes: Set<CompareAttributeKey>;
  competitorValue?: unknown;
  candidateValue?: unknown;
}): void {
  if (args.competitor !== true) {
    return;
  }

  if (args.candidate === true) {
    addUnique(args.matches, `${args.label} aligns`);
    args.matchedAttributes.add(args.attribute);
    return;
  }

  args.gaps.push(
    createGapItem({
      attribute: args.attribute,
      severity: args.severity,
      description: `${args.label} is required by the competitor profile but is not confirmed on the WyreStorm candidate.`,
      competitorValue: args.competitorValue ?? "Required",
      candidateValue: args.candidateValue ?? "Not confirmed",
    }),
  );
}

function calculateConfidenceFromAttributes(args: {
  domainTag: ProductDomainTag;
  matchedAttributes: Set<CompareAttributeKey>;
  readiness: ProductProfile["readiness"];
}): number {
  const weights = getDomainWeights(args.domainTag);
  const totalWeight = Object.values(weights).reduce((total, weight) => total + weight, 0);
  const achievedScore = Array.from(args.matchedAttributes).reduce((total, attribute) => total + weights[attribute], 0);
  const rawConfidence = totalWeight > 0 ? Math.round((achievedScore / totalWeight) * 100) : 0;

  return applyReadinessCap(rawConfidence, args.readiness);
}

export function compareProfiles(competitor: ProductProfile, candidate: ProductProfile): CandidateMatch {
  const domainWeights = getDomainWeights(competitor.domainTag);
  const matchedAttributes = new Set<CompareAttributeKey>();
  const matches: string[] = [];
  const gaps: GapItem[] = [];
  const verify: string[] = [];

  if (competitor.domainTag === candidate.domainTag) {
    matchedAttributes.add("domainMatch");
    matches.push(`Product domain aligns: ${competitor.domainTag}`);
  } else {
    gaps.push(
      createGapItem({
        attribute: "domainMatch",
        severity: 5,
        description: "Product domain does not match. Treat this as an architecture alternative, not a direct replacement.",
        competitorValue: competitor.domainTag,
        candidateValue: candidate.domainTag,
      }),
    );
  }

  const competitorInputs = getRoutedInputCount(competitor);
  const competitorOutputs = getRoutedOutputCount(competitor);
  const candidateInputs = getRoutedInputCount(candidate);
  const candidateOutputs = getRoutedOutputCount(candidate);

  if (competitorInputs > 0 && candidateInputs > 0 && competitor.domainTag !== "avoip_decoder") {
    if (candidateInputs >= competitorInputs) {
      matchedAttributes.add("ioCountMatch");
      matches.push(`Routed input count supports requirement: ${candidateInputs} >= ${competitorInputs}`);
    } else {
      gaps.push(
        createGapItem({
          attribute: "ioCountMatch",
          severity: domainWeights.ioCountMatch,
          description: "WyreStorm candidate has fewer routed inputs than the competitor requirement.",
          competitorValue: competitorInputs,
          candidateValue: candidateInputs,
        }),
      );
    }
  }

  if (competitorOutputs > 0 && candidateOutputs > 0 && competitor.domainTag !== "avoip_encoder") {
    if (candidateOutputs >= competitorOutputs) {
      matchedAttributes.add("ioCountMatch");
      matches.push(`Routed output count supports requirement: ${candidateOutputs} >= ${competitorOutputs}`);
    } else {
      gaps.push(
        createGapItem({
          attribute: "ioCountMatch",
          severity: domainWeights.ioCountMatch,
          description: "WyreStorm candidate has fewer routed outputs than the competitor requirement. Mirror or loop outputs are not counted as routed outputs.",
          competitorValue: competitorOutputs,
          candidateValue: candidateOutputs,
        }),
      );
    }
  }

  if (arraysOverlap(competitor.inputTypes, candidate.inputTypes) || arraysOverlap(competitor.outputTypes, candidate.outputTypes)) {
    matchedAttributes.add("transportMatch");
    matches.push("Transport or signal type overlaps");
  } else if (valueKnown(competitor.inputTypes) || valueKnown(competitor.outputTypes)) {
    gaps.push(
      createGapItem({
        attribute: "transportMatch",
        severity: domainWeights.transportMatch,
        description: "Transport or signal type is not confirmed as equivalent.",
        competitorValue: [...asArray(competitor.inputTypes), ...asArray(competitor.outputTypes)].join(", "),
        candidateValue: [...asArray(candidate.inputTypes), ...asArray(candidate.outputTypes)].join(", ") || "Not confirmed",
      }),
    );
  }

  const competitorResolution = resolutionRank(competitor.maxResolution);
  const candidateResolution = resolutionRank(candidate.maxResolution);

  if (competitorResolution > 0 && candidateResolution > 0) {
    if (candidateResolution >= competitorResolution) {
      matchedAttributes.add("resolutionChroma");
      matches.push(`Resolution class supports requirement: ${candidate.maxResolution}`);
    } else {
      gaps.push(
        createGapItem({
          attribute: "resolutionChroma",
          severity: domainWeights.resolutionChroma,
          description: "WyreStorm candidate is below the competitor resolution class.",
          competitorValue: competitor.maxResolution,
          candidateValue: candidate.maxResolution,
        }),
      );
    }
  }

  if (valueKnown(competitor.chromaSubsampling) && valueKnown(candidate.chromaSubsampling)) {
    if (normalise(competitor.chromaSubsampling) === normalise(candidate.chromaSubsampling)) {
      matchedAttributes.add("resolutionChroma");
      matches.push(`Chroma aligns: ${candidate.chromaSubsampling}`);
    } else {
      gaps.push(
        createGapItem({
          attribute: "resolutionChroma",
          severity: domainWeights.resolutionChroma,
          description: "Chroma subsampling differs; verify image-quality requirement before quoting.",
          competitorValue: competitor.chromaSubsampling,
          candidateValue: candidate.chromaSubsampling,
        }),
      );
    }
  }

  const competitorHdcp = hdcpRank(competitor.hdcpVersion);
  const candidateHdcp = hdcpRank(candidate.hdcpVersion);

  if (competitorHdcp > 0 && candidateHdcp > 0) {
    if (candidateHdcp >= competitorHdcp) {
      matchedAttributes.add("hdcpVersion");
      matches.push(`HDCP support is equal or higher: ${candidate.hdcpVersion}`);
    } else {
      gaps.push(
        createGapItem({
          attribute: "hdcpVersion",
          severity: domainWeights.hdcpVersion,
          description: "WyreStorm candidate has a lower confirmed HDCP version.",
          competitorValue: competitor.hdcpVersion,
          candidateValue: candidate.hdcpVersion,
        }),
      );
    }
  }

  const networkSpeedGap = createNetworkSpeedGap(competitor, candidate);

  if (networkSpeedGap) {
    gaps.push(networkSpeedGap);
  } else if (isAvoip(competitor.domainTag) || isAvoip(candidate.domainTag)) {
    const competitorSpeed = classifyNetworkSpeed(competitor.networkInterface);
    const candidateTier = classifyWyreStormNetworkHdTier(candidate);
    const candidateSpeed = candidateTier?.networkSpeed ?? classifyNetworkSpeed(candidate.networkInterface);

    if (competitorSpeed !== "unknown" && candidateSpeed !== "unknown" && competitorSpeed === candidateSpeed) {
      matchedAttributes.add("networkSpeed");
      matches.push(`AVoIP network speed class aligns: ${candidateSpeed}`);
    }

    if (competitorSpeed !== "unknown" && candidateSpeed !== "unknown" && competitorSpeed !== candidateSpeed) {
      gaps.push(
        createGapItem({
          attribute: "networkSpeed",
          severity: domainWeights.networkSpeed,
          description: "AVoIP network speed class differs. Do not present as direct endpoint replacement without architecture review.",
          competitorValue: competitorSpeed,
          candidateValue: candidateSpeed,
        }),
      );
    }
  }

  const competitorLatency = latencyRank(competitor.compressionLatency);
  const candidateLatency = latencyRank(candidate.compressionLatency);

  if (competitorLatency > 0 && candidateLatency > 0) {
    if (candidateLatency >= competitorLatency) {
      matchedAttributes.add("latencyClass");
      matches.push(`Latency class supports requirement: ${candidate.compressionLatency}`);
    } else {
      gaps.push(
        createGapItem({
          attribute: "latencyClass",
          severity: domainWeights.latencyClass,
          description: "WyreStorm candidate has a weaker confirmed latency class.",
          competitorValue: competitor.compressionLatency,
          candidateValue: candidate.compressionLatency,
        }),
      );
    }
  }

  const competitorHdbaset = Math.max(hdbasetClassRank(competitor.hdbasetClass), hdbasetClassRank(competitor.hdbasetVersion));
  const candidateHdbaset = Math.max(hdbasetClassRank(candidate.hdbasetClass), hdbasetClassRank(candidate.hdbasetVersion));

  if (competitorHdbaset > 0 && candidateHdbaset > 0) {
    if (candidateHdbaset >= competitorHdbaset) {
      matchedAttributes.add("hdbasetClassDistance");
      matches.push("HDBaseT class/version is equal or higher");
    } else {
      gaps.push(
        createGapItem({
          attribute: "hdbasetClassDistance",
          severity: domainWeights.hdbasetClassDistance,
          description: "HDBaseT class/version is lower than the competitor requirement.",
          competitorValue: competitor.hdbasetClass ?? competitor.hdbasetVersion,
          candidateValue: candidate.hdbasetClass ?? candidate.hdbasetVersion,
        }),
      );
    }
  }

  if (valueKnown(competitor.hdbasetDistance) && valueKnown(candidate.hdbasetDistance)) {
    if ((candidate.hdbasetDistance ?? 0) >= (competitor.hdbasetDistance ?? 0)) {
      matchedAttributes.add("hdbasetClassDistance");
      matches.push(`HDBaseT distance supports requirement: ${candidate.hdbasetDistance}m`);
    } else {
      gaps.push(
        createGapItem({
          attribute: "hdbasetClassDistance",
          severity: domainWeights.hdbasetClassDistance,
          description: "HDBaseT distance is below the competitor requirement.",
          competitorValue: competitor.hdbasetDistance,
          candidateValue: candidate.hdbasetDistance,
        }),
      );
    }
  }

  compareBooleanRequirement({
    competitor: competitor.audioDeEmbed,
    candidate: candidate.audioDeEmbed,
    attribute: "audioDeEmbed",
    label: "Audio de-embed",
    severity: domainWeights.audioDeEmbed,
    matches,
    gaps,
    matchedAttributes,
  });

  compareBooleanRequirement({
    competitor: competitor.usbcInput,
    candidate: candidate.usbcInput,
    attribute: "usbcMst",
    label: "USB-C video input",
    severity: domainWeights.usbcMst,
    matches,
    gaps,
    matchedAttributes,
  });

  compareBooleanRequirement({
    competitor: competitor.mstSupport,
    candidate: candidate.mstSupport,
    attribute: "usbcMst",
    label: "MST support",
    severity: domainWeights.usbcMst,
    matches,
    gaps,
    matchedAttributes,
  });

  compareBooleanRequirement({
    competitor: competitor.scalingOutput,
    candidate: candidate.scalingOutput,
    attribute: "scalingOutput",
    label: "Scaling output",
    severity: domainWeights.scalingOutput,
    matches,
    gaps,
    matchedAttributes,
  });

  compareBooleanRequirement({
    competitor: competitor.videowallOutput,
    candidate: candidate.videowallOutput,
    attribute: "videowallOutput",
    label: "Videowall output",
    severity: domainWeights.videowallOutput,
    matches,
    gaps,
    matchedAttributes,
  });

  compareBooleanRequirement({
    competitor: competitor.serialControl,
    candidate: candidate.serialControl,
    attribute: "serialControl",
    label: "RS-232 serial control",
    severity: domainWeights.serialControl,
    matches,
    gaps,
    matchedAttributes,
  });

  compareBooleanRequirement({
    competitor: competitor.irControl,
    candidate: candidate.irControl,
    attribute: "irControl",
    label: "IR control",
    severity: domainWeights.irControl,
    matches,
    gaps,
    matchedAttributes,
  });

  if (asArray(competitor.lanControl).length > 0) {
    if (arraysOverlap(competitor.lanControl, candidate.lanControl)) {
      matchedAttributes.add("ipControl");
      matches.push("LAN control protocol overlaps");
    } else {
      gaps.push(
        createGapItem({
          attribute: "ipControl",
          severity: domainWeights.ipControl,
          description: "LAN control protocol is not confirmed as equivalent.",
          competitorValue: asArray(competitor.lanControl).join(", "),
          candidateValue: asArray(candidate.lanControl).join(", ") || "Not confirmed",
        }),
      );
    }
  }

  if ((competitor.gpioPortCount ?? 0) > 0) {
    if ((candidate.gpioPortCount ?? 0) >= (competitor.gpioPortCount ?? 0)) {
      matchedAttributes.add("gpioRelay");
      matches.push("GPIO port count supports requirement");
    } else {
      gaps.push(
        createGapItem({
          attribute: "gpioRelay",
          severity: domainWeights.gpioRelay,
          description: "GPIO port count is below the competitor requirement.",
          competitorValue: competitor.gpioPortCount,
          candidateValue: candidate.gpioPortCount,
        }),
      );
    }
  }

  if ((competitor.relayPortCount ?? 0) > 0) {
    if ((candidate.relayPortCount ?? 0) >= (competitor.relayPortCount ?? 0)) {
      matchedAttributes.add("gpioRelay");
      matches.push("Relay port count supports requirement");
    } else {
      gaps.push(
        createGapItem({
          attribute: "gpioRelay",
          severity: domainWeights.gpioRelay,
          description: "Relay port count is below the competitor requirement.",
          competitorValue: competitor.relayPortCount,
          candidateValue: candidate.relayPortCount,
        }),
      );
    }
  }

  if (hasNdiOutput(competitor)) {
    if (hasNdiOutput(candidate)) {
      matchedAttributes.add("ndiOutput");
      matches.push("NDI output/workflow is confirmed");
    } else {
      gaps.push(
        createGapItem({
          attribute: "ndiOutput",
          severity: domainWeights.ndiOutput,
          description: "Competitor profile includes NDI output/workflow but the WyreStorm candidate is not confirmed as NDI-capable.",
          competitorValue: competitor.ndiVersion ?? "NDI workflow",
          candidateValue: candidate.ndiVersion ?? "Not confirmed",
        }),
      );
    }
  }

  if (asArray(competitor.ptzProtocol).length > 0) {
    if (arraysOverlap(competitor.ptzProtocol, candidate.ptzProtocol)) {
      matchedAttributes.add("ptzProtocol");
      matches.push("PTZ control protocol overlaps");
    } else {
      gaps.push(
        createGapItem({
          attribute: "ptzProtocol",
          severity: domainWeights.ptzProtocol,
          description: "PTZ control protocol is not confirmed as equivalent.",
          competitorValue: asArray(competitor.ptzProtocol).join(", "),
          candidateValue: asArray(candidate.ptzProtocol).join(", ") || "Not confirmed",
        }),
      );
    }
  }

  if (valueKnown(competitor.powerSupply)) {
    const competitorPower = normalise(competitor.powerSupply);
    const candidatePower = normalise(candidate.powerSupply);

    if (competitorPower && candidatePower && competitorPower === candidatePower) {
      matchedAttributes.add("powerSupplyType");
      matches.push(`Power supply method aligns: ${candidate.powerSupply}`);
    }

    if (competitorPower === "poe" && candidatePower === "external") {
      gaps.push(
        createGapItem({
          attribute: "powerSupplyType",
          severity: 3,
          description: "Competitor is PoE-powered but candidate requires an external PSU.",
          competitorValue: competitor.powerSupply,
          candidateValue: candidate.powerSupply,
        }),
      );
    }

    if (competitorPower === "poh" && candidatePower !== "poh") {
      gaps.push(
        createGapItem({
          attribute: "powerSupplyType",
          severity: 5,
          description: "Competitor uses PoH for remote installation but candidate is not confirmed as PoH-powered.",
          competitorValue: competitor.powerSupply,
          candidateValue: candidate.powerSupply ?? "Not confirmed",
        }),
      );
    }
  }

  if (valueKnown(competitor.poeClass)) {
    const competitorPoe = normalise(competitor.poeClass);
    const candidatePoe = normalise(candidate.poeClass);

    if (competitorPoe && candidatePoe && competitorPoe === candidatePoe) {
      matchedAttributes.add("poePohClass");
      matches.push(`PoE/PoH class aligns: ${candidate.poeClass}`);
    }

    if (competitorPoe.includes("poh") && !candidatePoe.includes("poh")) {
      gaps.push(
        createGapItem({
          attribute: "poePohClass",
          severity: 5,
          description: "Competitor requires PoH class power but candidate does not confirm PoH support.",
          competitorValue: competitor.poeClass,
          candidateValue: candidate.poeClass ?? "Not confirmed",
        }),
      );
    }
  }

  if (candidate.readiness !== "approved") {
    verify.push(getReadinessMessage(candidate.readiness));
  }

  if (candidate.readiness === "approved") {
    verify.push("Verify against the current datasheet before external quote positioning.");
  }

  if (isAvoip(candidate.domainTag)) {
    verify.push("Confirm NetworkHD series, endpoint role, network speed, multicast/IGMP and switch requirements.");
  }

  let confidence = calculateConfidenceFromAttributes({
    domainTag: competitor.domainTag,
    matchedAttributes,
    readiness: candidate.readiness,
  });

  /*
   * Sparse profiles should not cause a correct direct AVoIP candidate to disappear.
   * If the core replacement facts align — same domain, no blockers, network speed,
   * I/O count, resolution and latency — keep it as a visible VERIFY/PARTIAL candidate.
   */
  const hasBlockingGap = gaps.some((gap) => gap.severity === 5);
  const isDirectAvoipCandidate =
    isAvoip(competitor.domainTag) &&
    isAvoip(candidate.domainTag) &&
    competitor.domainTag === candidate.domainTag;

  const coreAvoipFactsAlign =
    matchedAttributes.has("networkSpeed") &&
    matchedAttributes.has("ioCountMatch") &&
    matchedAttributes.has("resolutionChroma");

  const strongAvoipFactsAlign =
    coreAvoipFactsAlign &&
    matchedAttributes.has("latencyClass");

  if (isDirectAvoipCandidate && !hasBlockingGap && coreAvoipFactsAlign) {
    const directAvoipFloor = strongAvoipFactsAlign ? 78 : 72;
    confidence = Math.max(confidence, applyReadinessCap(directAvoipFloor, candidate.readiness));
  }

  if (candidate.readiness === "sku-only") {
    confidence = 0;
  }

  const outcome = outcomeFromConfidence(confidence, gaps);
  const blockers = gaps.filter((gap) => gap.severity === 5).map((gap) => gap.description);

  return {
    sku: candidate.sku,
    name: candidate.name ?? candidate.productClass ?? candidate.sku,
    decision: {
      outcome,
      confidence,
      relationship: competitor.domainTag === candidate.domainTag ? "direct_candidate" : "related_package",
      matches,
      gaps: dedupeGaps(gaps),
      verify,
      blockers,
      nextAction: blockers.length > 0
        ? "Do not position as a direct replacement. Review architecture alternative or request datasheet evidence."
        : "Verify current datasheet and project requirements before external customer positioning.",
    },
  };
}

export function getArchitectureAlternative(
  competitor: ProductProfile,
  candidates: ProductProfile[] = [],
): ArchitectureAlternative | undefined {
  const sameDomainCandidates = candidates.filter((candidate) => candidate.domainTag === competitor.domainTag);
  const competitorOutputs = getRoutedOutputCount(competitor);
  const competitorNetworkSpeed = classifyNetworkSpeed(competitor.networkInterface);

  /*
   * Same-domain does not automatically mean safe.
   * A 1G NetworkHD candidate is still the wrong architecture for a 10G AVoIP competitor.
   * Only suppress the 10G architecture alternative when a confirmed 10G candidate exists.
   */
  if (isAvoip(competitor.domainTag) && competitorNetworkSpeed === "10GbE") {
    const hasConfirmed10GCandidate = sameDomainCandidates.some((candidate) => {
      const candidateTier = classifyWyreStormNetworkHdTier(candidate);
      const candidateSpeed = candidateTier?.networkSpeed ?? classifyNetworkSpeed(candidate.networkInterface);
      return candidateSpeed === "10GbE";
    });

    if (!hasConfirmed10GCandidate) {
      return {
        fromDomain: competitor.domainTag,
        toDomain: competitor.domainTag,
        reason:
          "The competitor is a 10G AVoIP product. WyreStorm's 10G architecture should be NetworkHD 600, not NetworkHD 100 or NetworkHD 500.",
        tradeoffs: [
          "Requires 10G network infrastructure.",
          "Confirm switch platform, optics/copper, multicast control and endpoint role.",
          "Do not substitute a 1G endpoint into a 10G AVoIP system.",
        ],
        skus: ["NHD-600-TRX", "NHD-CTL-PRO"],
      };
    }

    return undefined;
  }

  if (sameDomainCandidates.length > 0) {
    return undefined;
  }

  if ((competitor.domainTag === "hdmi_matrix" || competitor.domainTag === "hdbaset_matrix") && competitorOutputs >= 16) {
    return {
      fromDomain: competitor.domainTag,
      toDomain: "avoip_decoder",
      reason:
        "A fixed high-output matrix can often be replaced architecturally with NetworkHD AVoIP when many displays need flexible routing.",
      tradeoffs: [
        "Requires one encoder per source and one decoder per display.",
        "Requires NHD-CTL-PRO and a suitable managed network switch.",
        "Network design, multicast/IGMP and endpoint series must be confirmed before quoting.",
      ],
      skus: ["NHD-CTL-PRO", "NHD-120-RX", "NHD-124-TX", "NHD-500-TX", "NHD-500-RX"],
    };
  }

  if (competitor.domainTag === "videowall_processor") {
    return {
      fromDomain: "videowall_processor",
      toDomain: "videowall_processor",
      reason:
        "Dedicated video wall processing should be considered before defaulting to AVoIP where the requirement is a fixed wall or preset layouts.",
      tradeoffs: [
        "Confirm LCD vs LED wall behaviour.",
        "Confirm full canvas, per-display content, multiview or mixed layouts.",
        "Consider AVoIP only where routing flexibility or distributed sources justify it.",
      ],
      skus: ["SW-0206-VW", "SW-0204-VW", "NHD-CTL-PRO"],
    };
  }

  if (competitor.domainTag === "ndi_camera" || competitor.domainTag === "ptz_camera") {
    return {
      fromDomain: competitor.domainTag,
      toDomain: "avoip_encoder",
      reason:
        "WyreStorm does not currently manufacture NDI or PTZ cameras. The closest architecture path is a NetworkHD encoder capturing the camera's HDMI/SDI output, combined with NHD-CTL-PRO for routing and control.",
      tradeoffs: [
        "A WyreStorm encoder captures camera output over HDMI but does not replace PTZ control protocols natively.",
        "PTZ control (VISCA-over-IP, Pelco-D) must be handled separately by the control system.",
        "NDI-native cameras should be evaluated alongside the NetworkHD AVoIP platform for integration.",
        "Confirm whether the requirement is camera replacement or camera-plus-distribution architecture.",
      ],
      skus: ["NHD-124-TX", "NHD-500-TX", "NHD-CTL-PRO"],
    };
  }

  if (competitor.domainTag === "wireless_casting") {
    return {
      fromDomain: "wireless_casting",
      toDomain: "wireless_casting",
      reason:
        "WyreStorm Apollo series covers wireless presentation and casting. Confirm the Apollo variant matches the required protocols (Miracast, AirPlay, Chromecast), simultaneous user count, and moderator control requirements.",
      tradeoffs: [
        "Confirm Wi-Fi standard (Wi-Fi 5 vs Wi-Fi 6) and band (2.4GHz / 5GHz) against the competitor.",
        "Confirm 4K wireless delivery if required.",
        "Confirm IT/network security policy compatibility.",
        "Confirm whether a moderation or approval workflow is required.",
      ],
      skus: ["APO-100-UC", "APO-200-UC", "APO-210-UC", "APO-VX20-UC"],
    };
  }

  if (competitor.domainTag === "usb_audio") {
    return {
      fromDomain: "usb_audio",
      toDomain: "usb_audio",
      reason:
        "WyreStorm UC/audio products (Apollo series) cover USB speakerphones and conferencing audio. For USB microphones without conferencing use, confirm whether a WyreStorm product fits or if a specialist audio manufacturer is the right path.",
      tradeoffs: [
        "Confirm whether the requirement is a standalone USB microphone or an integrated conferencing speakerphone.",
        "Confirm USB standard (USB 2.0, USB-C) and driver-free operation.",
        "Confirm sample rate and polar pattern requirements.",
        "WyreStorm Apollo UC products combine audio and UC rather than being pure microphone replacements.",
      ],
      skus: ["APO-100-UC", "APO-200-UC"],
    };
  }

  if (competitor.domainTag === "relay_gpio") {
    return {
      fromDomain: "relay_gpio",
      toDomain: "control_system",
      reason:
        "GPIO and relay expansion modules are typically used alongside a control system. Confirm whether a WyreStorm product carries native GPIO/relay ports or whether a third-party relay module (Crestron, AMX, Global Caché) is required alongside WyreStorm hardware.",
      tradeoffs: [
        "Many WyreStorm matrix and presentation products carry GPIO or relay ports natively — check the datasheet first.",
        "Standalone relay/GPIO expansion modules are not manufactured by WyreStorm.",
        "Confirm voltage levels, current ratings, and NO/NC requirements before recommending a relay path.",
      ],
      skus: [],
    };
  }

  if (competitor.domainTag === "copper_cable" || competitor.domainTag === "fiber_cable" || competitor.domainTag === "hdmi_cable") {
    return {
      fromDomain: competitor.domainTag,
      toDomain: competitor.domainTag,
      reason:
        "Cable comparison should be treated as an accessory match rather than a product comparison. Confirm the cable category, shielding, distance rating, and connector type from the project specification.",
      tradeoffs: [
        "Cat6A STP is required for HDBaseT 3.0 and 10G runs — do not substitute Cat5e or Cat6 UTP.",
        "OM4 or OS2 single-mode fibre is required for long-distance AOC runs.",
        "Plenum (CMP) rating is required for in-ceiling or air-handling space installations.",
        "Confirm whether the cable is a WyreStorm-supplied accessory or a third-party structured cabling product.",
      ],
      skus: [],
    };
  }

  return undefined;
}

function sortCandidateMatches(matches: CandidateMatch[]): CandidateMatch[] {
  return [...matches].sort((left, right) => {
    const outcomeDifference = OUTCOME_RANK[right.decision.outcome] - OUTCOME_RANK[left.decision.outcome];

    if (outcomeDifference !== 0) {
      return outcomeDifference;
    }

    return right.decision.confidence - left.decision.confidence;
  });
}

function buildNetworkNote(competitor: ProductProfile, candidates: ProductProfile[]): string | undefined {
  if (!isAvoip(competitor.domainTag)) {
    return undefined;
  }

  const competitorSpeed = classifyNetworkSpeed(competitor.networkInterface);

  if (competitorSpeed === "10GbE") {
    return "Competitor is classified as 10G AVoIP. Only NetworkHD 600 should be considered as the WyreStorm 10G architecture; NetworkHD 100 and NetworkHD 500 are not direct 10G endpoint replacements.";
  }

  const candidateTiers = candidates
    .map((candidate) => classifyWyreStormNetworkHdTier(candidate))
    .filter(Boolean)
    .map((tier) => `${tier?.family}: ${tier?.tier}`);

  if (candidateTiers.length > 0) {
    return `WyreStorm NetworkHD candidate tiers: ${Array.from(new Set(candidateTiers)).join("; ")}.`;
  }

  return undefined;
}

function buildRecommendation(args: {
  competitor: ProductProfile;
  topMatch?: CandidateMatch;
  architectureAlternative?: ArchitectureAlternative;
}): string {
  const competitorLabel = `${args.competitor.brand} ${args.competitor.sku}`;

  if (args.topMatch && args.topMatch.decision.outcome !== "NO MATCH") {
    return `${args.topMatch.sku} is currently the strongest WyreStorm candidate for ${competitorLabel}, with a ${args.topMatch.decision.outcome.toLowerCase()} result at ${args.topMatch.decision.confidence}% confidence. Verify the listed gaps and datasheet evidence before external positioning.`;
  }

  if (args.architectureAlternative) {
    return `No safe direct WyreStorm replacement is confirmed for ${competitorLabel}. Use the architecture alternative as the next review path and validate the trade-offs before customer positioning.`;
  }

  return `No suitable WyreStorm match is confirmed for ${competitorLabel} from the current data. Search wider, add datasheet evidence, or request pre-sales review.`;
}

export function buildCompareResult(competitor: ProductProfile, candidates: ProductProfile[]): CompareResult {
  const evaluated = sortCandidateMatches(candidates.map((candidate) => compareProfiles(competitor, candidate)));
  const viableMatches = evaluated.filter((candidate) => candidate.decision.outcome !== "NO MATCH");
  const rejected = evaluated.filter((candidate) => candidate.decision.outcome === "NO MATCH");
  const architectureAlternative = getArchitectureAlternative(competitor, candidates);
  const topMatch = viableMatches[0];
  const allGaps = dedupeGaps(evaluated.flatMap((candidate) => candidate.decision.gaps));

  let topOutcome: OutcomeTier = topMatch?.decision.outcome ?? "NO MATCH";

  if (!topMatch && architectureAlternative) {
    topOutcome = "VERIFY";
  }

  return {
    competitor,
    matches: viableMatches,
    rejected,
    topOutcome,
    recommendation: buildRecommendation({
      competitor,
      topMatch,
      architectureAlternative,
    }),
    architectureAlternative,
    networkNote: buildNetworkNote(competitor, candidates),
    videowallNote: allGaps.some((gap) => gap.attribute === "videowallOutput")
      ? "Videowall/scaling capability differs. Confirm wall layout, source behaviour and whether dedicated processing or AVoIP wall mode is required."
      : undefined,
    powerNote: allGaps.some((gap) => gap.attribute === "powerSupplyType" || gap.attribute === "poePohClass")
      ? "Power method differs or is incomplete. Confirm PSU, PoE or PoH requirement before quoting."
      : undefined,
    controlNote: allGaps.some((gap) => gap.attribute === "serialControl" || gap.attribute === "irControl" || gap.attribute === "ipControl")
      ? "Control interfaces differ or are incomplete. Confirm RS-232, IR and IP control requirements."
      : undefined,
    gapSummary: allGaps,
  };
}