/**
 * Wingman Compare Engine Model
 *
 * Phase 1 foundation:
 * - Product domain taxonomy
 * - Universal technical attribute model
 * - Readiness tiers
 * - Weighted comparison attributes
 * - Gap severity labels
 * - NetworkHD family safety helpers
 *
 * This file is intentionally UI-free.
 * Do not add CSS, React components, Guru logic, or microphone logic here.
 */

export const PRODUCT_DOMAIN_TAGS = [
  "avoip_encoder",
  "avoip_decoder",
  "avoip_controller",
  "hdbaset_matrix",
  "hdmi_matrix",
  "hdbaset_extender",
  "hdmi_splitter",
  "presentation_switcher",
  "matrix_switcher_scaling",
  "videowall_processor",
  "ndi_camera",
  "ptz_camera",
  "usb_audio",
  "wireless_casting",
  "copper_cable",
  "fiber_cable",
  "hdmi_cable",
  "control_system",
  "relay_gpio",
] as const;

export type ProductDomainTag = (typeof PRODUCT_DOMAIN_TAGS)[number];

export const PRODUCT_SUB_TAGS = [
  "poe_powered",
  "poh_powered",
  "usb_c_input",
  "mst_capable",
  "multiview_capable",
  "videowall_output",
  "ndi_output",
  "dante_audio",
  "hdbaset_2",
  "hdbaset_3",
  "serial_control",
  "ir_control",
  "lan_control",
  "gpio_relay",
  "psu_internal",
  "psu_external",
  "rack_mount",
  "4k60",
  "8k",
  "hdr10",
  "dolby_vision",
  "arc",
  "earc",
  "fiber_input",
  "copper_input",
] as const;

export type ProductSubTag = (typeof PRODUCT_SUB_TAGS)[number];

export type CompareReadinessTier =
  | "approved"
  | "usable-with-review"
  | "needs-evidence"
  | "sku-only";

export type OutcomeTier =
  | "GOOD MATCH"
  | "PARTIAL MATCH"
  | "VERIFY"
  | "NO MATCH";

export type GapSeverity = 1 | 2 | 3 | 4 | 5;

export type GapSeverityLabel =
  | "COSMETIC"
  | "MINOR"
  | "NOTABLE"
  | "SIGNIFICANT"
  | "BLOCKING";

export type NetworkSpeedClass =
  | "1GbE"
  | "10GbE"
  | "SFP+"
  | "unknown";

export type NetworkHdFamily =
  | "NetworkHD 100"
  | "NetworkHD 500"
  | "NetworkHD 600";

export type NetworkHdTier =
  | "1G cost-effective"
  | "1G premium"
  | "10G zero-latency";

export type CompareAttributeKey =
  | "domainMatch"
  | "ioCountMatch"
  | "resolutionChroma"
  | "transportMatch"
  | "networkSpeed"
  | "latencyClass"
  | "hdcpVersion"
  | "audioDeEmbed"
  | "hdbasetClassDistance"
  | "usbcMst"
  | "scalingOutput"
  | "videowallOutput"
  | "serialControl"
  | "ipControl"
  | "irControl"
  | "gpioRelay"
  | "ndiOutput"
  | "ptzProtocol"
  | "powerSupplyType"
  | "poePohClass";

export interface CompareTechnicalAttributes {
  aliases?: string[];
  productClass?: string;
  domainTag?: ProductDomainTag;
  subTags?: ProductSubTag[];

  inputTypes?: string[];
  outputTypes?: string[];
  inputCount?: number;
  outputCount?: number;
  routedInputCount?: number;
  routedOutputCount?: number;
  mirroredOutputCount?: number;
  loopOutputCount?: number;

  maxResolution?: string;
  hdrSupport?: string[];
  chromaSubsampling?: string;
  colorDepth?: string;
  hdcpVersion?: string;
  hdmiVersion?: string;

  scalingOutput?: boolean;
  multiviewOutput?: boolean;
  videowallOutput?: boolean;
  videowallMaxCols?: number;
  videowallMaxRows?: number;
  matrixSize?: string;

  audioInputTypes?: string[];
  audioOutputTypes?: string[];
  audioDeEmbed?: boolean;
  audioEmbed?: boolean;
  arcSupport?: boolean;
  earcSupport?: boolean;
  danteNetwork?: boolean;
  avbNetwork?: boolean;
  dolbyAtmos?: boolean;

  networkInterface?: string[];
  networkProtocol?: string[];
  compressionLatency?: string;
  multicastSupport?: boolean;
  unicastSupport?: boolean;
  vlanTagging?: boolean;
  qosSupport?: boolean;
  igmpVersion?: string;
  switchRecommended?: string;
  poeClass?: string;

  hdbasetClass?: string;
  hdbasetVersion?: string;
  hdbasetDistance?: number;
  pohSupport?: boolean;
  pohWatts?: number;

  usbcInput?: boolean;
  usbcAltMode?: string[];
  mstSupport?: boolean;
  usbcDataPassthrough?: boolean;
  usbcPowerDelivery?: boolean;
  usbcPdWatts?: number;

  usbHostPorts?: number;
  usbDevicePorts?: number;
  usbOverIP?: boolean;
  usbKVM?: boolean;

  serialControl?: boolean;
  serialBaud?: string;
  irControl?: boolean;
  lanControl?: string[];
  crestronControl?: boolean;
  amxControl?: boolean;
  savantControl?: boolean;
  controlFourControl?: boolean;
  buttonPanel?: boolean;
  apiSdk?: boolean;

  gpioPortCount?: number;
  gpioVoltage?: string;
  relayPortCount?: number;
  relayType?: string;
  relayMaxAmps?: number;

  powerSupply?: "internal" | "external" | "PoE" | "PoH" | "unknown";
  psuWatts?: number;
  formFactor?: string;
  rackUnits?: number;
  dimensions?: string;
  weightKg?: number;
  operatingTempC?: string;

  ndiVersion?: string;
  ndiHX?: boolean;
  panRange?: number;
  tiltRange?: number;
  zoomOptical?: number;
  sensorSize?: string;
  sensorResolution?: string;
  frameRate?: string;
  ptzProtocol?: string[];

  wirelessStandard?: string[];
  screenMirroring?: string[];
  simultaneousUsers?: number;
  moderatorControl?: boolean;
  wireless4k?: boolean;

  cableCategory?: string;
  cableShielding?: string;
  fiberType?: string;
  fiberConnector?: string[];
  cableMaxLength?: number;
  plenum?: boolean;

  readiness?: CompareReadinessTier;
}

export type ExtendedKnownCompareProfile<TBase extends object = Record<string, unknown>> =
  TBase & CompareTechnicalAttributes;

export interface ProductProfile extends CompareTechnicalAttributes {
  brand: string;
  sku: string;
  name?: string;
  productClass: string;
  domainTag: ProductDomainTag;
  subTags: ProductSubTag[];
  readiness: CompareReadinessTier;
}

export interface GapItem {
  attribute: string;
  severity: GapSeverity;
  description: string;
  competitorValue: string;
  candidateValue: string;
}

export interface ArchitectureAlternative {
  fromDomain: ProductDomainTag | string;
  toDomain: ProductDomainTag | string;
  reason: string;
  tradeoffs: string[];
  skus: string[];
}

export interface CandidateMatch {
  sku: string;
  name: string;
  decision: {
    outcome: OutcomeTier;
    confidence: number;
    relationship: "direct_candidate" | "related_package" | "upgrade" | "downgrade" | string;
    matches: string[];
    gaps: GapItem[];
    verify: string[];
    blockers: string[];
    nextAction: string;
  };
}

export interface CompareResult {
  competitor: ProductProfile;
  matches: CandidateMatch[];
  rejected: CandidateMatch[];
  topOutcome: OutcomeTier;
  recommendation: string;
  architectureAlternative?: ArchitectureAlternative;
  networkNote?: string;
  videowallNote?: string;
  powerNote?: string;
  controlNote?: string;
  gapSummary: GapItem[];
}

export const GAP_SEVERITY_LABELS: Record<GapSeverity, GapSeverityLabel> = {
  1: "COSMETIC",
  2: "MINOR",
  3: "NOTABLE",
  4: "SIGNIFICANT",
  5: "BLOCKING",
};

export const DOMAIN_TAXONOMY: Record<ProductDomainTag, { label: string; description: string }> = {
  avoip_encoder: {
    label: "AVoIP encoder / transmitter",
    description: "Source-side network video encoder or transmitter.",
  },
  avoip_decoder: {
    label: "AVoIP decoder / receiver",
    description: "Display-side network video decoder or receiver.",
  },
  avoip_controller: {
    label: "AVoIP controller",
    description: "Management controller, gateway or system controller for AVoIP endpoints.",
  },
  hdbaset_matrix: {
    label: "HDBaseT matrix",
    description: "Fixed matrix switcher with HDBaseT zone outputs.",
  },
  hdmi_matrix: {
    label: "HDMI matrix",
    description: "Fixed matrix switcher with local HDMI outputs.",
  },
  hdbaset_extender: {
    label: "HDBaseT extender",
    description: "Point-to-point HDMI extension over category cable.",
  },
  hdmi_splitter: {
    label: "HDMI splitter",
    description: "One-to-many HDMI distribution device.",
  },
  presentation_switcher: {
    label: "Presentation switcher",
    description: "Multi-input presentation, collaboration or auto-switching device.",
  },
  matrix_switcher_scaling: {
    label: "Scaling matrix",
    description: "Matrix switcher with scaling, multiview or output processing capability.",
  },
  videowall_processor: {
    label: "Videowall processor",
    description: "Dedicated processor for LCD, LED or mixed layout wall processing.",
  },
  ndi_camera: {
    label: "NDI camera",
    description: "NDI-native or NDI-ready PTZ/camera endpoint.",
  },
  ptz_camera: {
    label: "PTZ camera",
    description: "Pan-tilt-zoom camera without native NDI as the primary output.",
  },
  usb_audio: {
    label: "USB audio",
    description: "USB microphone, speakerphone, audio interface or USB audio endpoint.",
  },
  wireless_casting: {
    label: "Wireless casting",
    description: "Wireless presentation, mirroring or collaboration endpoint.",
  },
  copper_cable: {
    label: "Copper cable",
    description: "Structured copper cabling such as Cat5e, Cat6 or Cat6A.",
  },
  fiber_cable: {
    label: "Fibre cable",
    description: "Optical fibre or active optical cable.",
  },
  hdmi_cable: {
    label: "HDMI cable",
    description: "Passive or active HDMI cable.",
  },
  control_system: {
    label: "Control system",
    description: "Dedicated AV control processor or control interface.",
  },
  relay_gpio: {
    label: "Relay / GPIO",
    description: "Relay, GPIO or contact-closure expansion device.",
  },
};

export const BASE_COMPARE_WEIGHTS: Record<CompareAttributeKey, GapSeverity> = {
  domainMatch: 5,
  ioCountMatch: 5,
  resolutionChroma: 4,
  transportMatch: 4,
  networkSpeed: 1,
  latencyClass: 1,
  hdcpVersion: 3,
  audioDeEmbed: 3,
  hdbasetClassDistance: 1,
  usbcMst: 2,
  scalingOutput: 3,
  videowallOutput: 3,
  serialControl: 2,
  ipControl: 3,
  irControl: 2,
  gpioRelay: 2,
  ndiOutput: 1,
  ptzProtocol: 1,
  powerSupplyType: 2,
  poePohClass: 2,
};

export const DOMAIN_WEIGHT_OVERRIDES: Partial<
  Record<ProductDomainTag, Partial<Record<CompareAttributeKey, GapSeverity>>>
> = {
  avoip_encoder: {
    networkSpeed: 5,
    latencyClass: 5,
    transportMatch: 5,
    ioCountMatch: 5,
    videowallOutput: 4,
    poePohClass: 3,
  },
  avoip_decoder: {
    networkSpeed: 5,
    latencyClass: 5,
    transportMatch: 5,
    ioCountMatch: 5,
    videowallOutput: 4,
    poePohClass: 3,
  },
  hdbaset_matrix: {
    hdbasetClassDistance: 5,
    transportMatch: 5,
    ioCountMatch: 5,
    serialControl: 3,
    ipControl: 3,
  },
  hdmi_matrix: {
    ioCountMatch: 5,
    resolutionChroma: 4,
    transportMatch: 4,
  },
  presentation_switcher: {
    ioCountMatch: 4,
    usbcMst: 4,
    audioDeEmbed: 4,
    powerSupplyType: 3,
    poePohClass: 3,
  },
  ndi_camera: {
    ndiOutput: 5,
    ptzProtocol: 4,
    resolutionChroma: 4,
    networkSpeed: 3,
  },
};

export function getDomainWeights(domainTag: ProductDomainTag): Record<CompareAttributeKey, GapSeverity> {
  return {
    ...BASE_COMPARE_WEIGHTS,
    ...(DOMAIN_WEIGHT_OVERRIDES[domainTag] ?? {}),
  };
}

export function getSeverityLabel(severity: GapSeverity): GapSeverityLabel {
  return GAP_SEVERITY_LABELS[severity];
}

export function normaliseText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function classifyNetworkSpeed(value: unknown): NetworkSpeedClass {
  const text = Array.isArray(value)
    ? value.map((item) => normaliseText(item)).join(" ")
    : normaliseText(value);

  if (text.includes("sfp+")) {
    return "SFP+";
  }

  if (text.includes("10gbe") || text.includes("10g") || text.includes("10 gb")) {
    return "10GbE";
  }

  if (text.includes("1gbe") || text.includes("1g") || text.includes("gigabit")) {
    return "1GbE";
  }

  return "unknown";
}

export function classifyWyreStormNetworkHdTier(profile: Pick<ProductProfile, "sku" | "name" | "networkInterface">): {
  family: NetworkHdFamily;
  tier: NetworkHdTier;
  networkSpeed: NetworkSpeedClass;
} | undefined {
  const haystack = `${profile.sku} ${profile.name ?? ""}`.toLowerCase();

  if (haystack.includes("nhd-600") || haystack.includes("networkhd 600")) {
    return {
      family: "NetworkHD 600",
      tier: "10G zero-latency",
      networkSpeed: "10GbE",
    };
  }

  if (haystack.includes("nhd-500") || haystack.includes("networkhd 500")) {
    return {
      family: "NetworkHD 500",
      tier: "1G premium",
      networkSpeed: "1GbE",
    };
  }

  if (
    haystack.includes("nhd-100") ||
    haystack.includes("networkhd 100") ||
    haystack.includes("nhd-120") ||
    haystack.includes("nhd-124") ||
    haystack.includes("nhd-128") ||
    haystack.includes("nhd-150")
  ) {
    return {
      family: "NetworkHD 100",
      tier: "1G cost-effective",
      networkSpeed: "1GbE",
    };
  }

  const speed = classifyNetworkSpeed(profile.networkInterface);

  if (speed === "10GbE") {
    return {
      family: "NetworkHD 600",
      tier: "10G zero-latency",
      networkSpeed: "10GbE",
    };
  }

  return undefined;
}

export function getRoutedInputCount(profile: CompareTechnicalAttributes): number {
  return profile.routedInputCount ?? profile.inputCount ?? 0;
}

export function getRoutedOutputCount(profile: CompareTechnicalAttributes): number {
  return profile.routedOutputCount ?? profile.outputCount ?? 0;
}

export function createGapItem(args: {
  attribute: string;
  severity: GapSeverity;
  description: string;
  competitorValue: unknown;
  candidateValue: unknown;
}): GapItem {
  return {
    attribute: args.attribute,
    severity: args.severity,
    description: args.description,
    competitorValue: String(args.competitorValue ?? "Unknown"),
    candidateValue: String(args.candidateValue ?? "Unknown"),
  };
}

export function createNetworkSpeedGap(
  competitor: Pick<ProductProfile, "networkInterface" | "domainTag" | "sku">,
  candidate: Pick<ProductProfile, "networkInterface" | "domainTag" | "sku" | "name">,
): GapItem | undefined {
  const competitorSpeed = classifyNetworkSpeed(competitor.networkInterface);
  const candidateTier = classifyWyreStormNetworkHdTier(candidate);
  const candidateSpeed = candidateTier?.networkSpeed ?? classifyNetworkSpeed(candidate.networkInterface);

  const isAvoip =
    competitor.domainTag === "avoip_encoder" ||
    competitor.domainTag === "avoip_decoder" ||
    candidate.domainTag === "avoip_encoder" ||
    candidate.domainTag === "avoip_decoder";

  if (!isAvoip) {
    return undefined;
  }

  if (competitorSpeed !== "10GbE") {
    return undefined;
  }

  if (candidateSpeed === "10GbE") {
    return undefined;
  }

  return createGapItem({
    attribute: "networkSpeed",
    severity: 5,
    description:
      "Competitor is a 10G AVoIP product. Candidate is not confirmed as 10G, so it must not be presented as a direct replacement.",
    competitorValue: competitorSpeed,
    candidateValue: candidateSpeed,
  });
}

export function hasBlockingGap(gaps: GapItem[]): boolean {
  return gaps.some((gap) => gap.severity === 5);
}

export function outcomeFromConfidence(
  confidence: number,
  gaps: GapItem[] = [],
  hasArchitectureAlternative = false,
): OutcomeTier {
  if (hasBlockingGap(gaps) && !hasArchitectureAlternative) {
    return "NO MATCH";
  }

  if (hasBlockingGap(gaps) && hasArchitectureAlternative) {
    return "VERIFY";
  }

  if (confidence >= 85) {
    return "GOOD MATCH";
  }

  if (confidence >= 70) {
    return "PARTIAL MATCH";
  }

  if (confidence >= 50) {
    return "VERIFY";
  }

  return "NO MATCH";
}

export function applyReadinessCap(confidence: number, readiness: CompareReadinessTier): number {
  if (readiness === "sku-only") {
    return 0;
  }

  if (readiness === "needs-evidence") {
    return Math.min(confidence, 65);
  }

  if (readiness === "usable-with-review") {
    return Math.min(confidence, 85);
  }

  return confidence;
}

export function getReadinessMessage(readiness: CompareReadinessTier): string {
  if (readiness === "approved") {
    return "Profile is approved for internal comparison. Verify against the current datasheet before external issue.";
  }

  if (readiness === "usable-with-review") {
    return "Profile has useful comparison data but needs a short datasheet review before customer positioning.";
  }

  if (readiness === "needs-evidence") {
    return "Profile is inferred from partial data. Confidence is capped and evidence should be added before external use.";
  }

  return "SKU is recognised but no specification profile is available. Do not recommend externally until a datasheet is added.";
}

export function calculateWeightedConfidence(args: {
  domainTag: ProductDomainTag;
  matchedAttributes: CompareAttributeKey[];
  gapAttributes: CompareAttributeKey[];
  readiness?: CompareReadinessTier;
}): number {
  const weights = getDomainWeights(args.domainTag);
  const totalWeight = Object.values(weights).reduce((total, weight) => total + weight, 0);
  const achievedScore = args.matchedAttributes.reduce((total, attribute) => total + weights[attribute], 0);
  const rawConfidence = totalWeight > 0 ? Math.round((achievedScore / totalWeight) * 100) : 0;

  return applyReadinessCap(rawConfidence, args.readiness ?? "needs-evidence");
}

export function makeQuoteSafetyVerifyList(profile: ProductProfile): string[] {
  const verify: string[] = [];

  if (profile.readiness !== "approved") {
    verify.push(getReadinessMessage(profile.readiness));
  }

  if (!profile.hdcpVersion && ["hdmi_matrix", "hdbaset_matrix", "presentation_switcher"].includes(profile.domainTag)) {
    verify.push("Confirm HDCP version against the current datasheet.");
  }

  if (!profile.powerSupply) {
    verify.push("Confirm power supply method and whether PSU, PoE or PoH is required.");
  }

  if (profile.domainTag === "avoip_encoder" || profile.domainTag === "avoip_decoder") {
    verify.push("Confirm NetworkHD series, network speed, switch requirements, multicast/IGMP and endpoint compatibility.");
  }

  return verify;
}