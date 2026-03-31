import { findRecommendationCatalogItemBySku } from "@/catalog/recommendationCatalog";
import {
  type BuildMethod,
  type SourceProfile,
  type SourceLandingStyle,
  type VideoWallDecisionArgs,
  type VideoWallMultiviewStyle,
  type VideoWallPathMode,
  type VideoWallPerformancePriority,
  type WallGoal,
} from "@/data/techDatabase/videoWallDecisionRules";

type BomLine = {
  sku: string;
  qty: number;
  role?: string;
  note?: string;
};

const sourceProfileCopy: Record<
  SourceProfile,
  { label: string; sublabel: string }
> = {
  player: {
    label: "Signage player / media server",
    sublabel: "One or more dedicated playback devices feeding the wall.",
  },
  "matrix-feed": {
    label: "One feed from matrix or processor",
    sublabel: "The wall receives a prepared feed from upstream switching.",
  },
  "direct-hdmi": {
    label: "Direct HDMI sources",
    sublabel: "Laptops, players, or boxes need to land in the wall workflow directly.",
  },
  camera: {
    label: "Camera / vision sources",
    sublabel: "Live camera chains or vision-mixed feeds are driving the wall outcome.",
  },
  mixed: {
    label: "Mixed source set",
    sublabel: "A blend of source types with more flexible staging or switching.",
  },
};

function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function firstAvailableSku(candidates: string[], fallback: string): string {
  for (const candidate of candidates) {
    if (findRecommendationCatalogItemBySku(candidate)) return candidate;
  }

  return candidates[0] || fallback;
}

function _findSkuByPattern(
  candidates: string[],
  pattern: RegExp,
  fallback: string,
): string {
  return firstAvailableSku(
    candidates.filter((sku) => pattern.test(sku)),
    fallback,
  );
}

function describeSku(sku: string): string {
  return findRecommendationCatalogItemBySku(sku)?.description || "";
}

function createBomLine(
  sku: string,
  qty: number,
  note?: string,
  role?: string,
): BomLine {
  const description = describeSku(sku);
  const fullNote = [note, description].filter(Boolean).join(" ");
  return {
    sku,
    qty,
    role,
    note: fullNote || undefined,
  };
}

function getAvoipControllerSku(): string {
  return firstAvailableSku(["NHD-CTL-PRO-V2"], "NHD-CTL-PRO-V2");
}

function build120EncoderBom(
  sourceCount: number,
  sourceLandingStyle: SourceLandingStyle = "standard",
): BomLine[] {
  if (sourceLandingStyle === "wallplate") {
    return [
      createBomLine(
        "NHD-120-IW-TX",
        sourceCount,
        "One in-wall encoder per source landing for 120-series ingress.",
        "Source encoder",
      ),
    ];
  }

  const lines: BomLine[] = [];
  const quadEncoders = Math.floor(sourceCount / 4);
  const singleEncoders = sourceCount % 4;

  if (quadEncoders > 0) {
    lines.push(
      createBomLine(
        "NHD-124-TX",
        quadEncoders,
        "Quad encoder block for the lowest-cost 120-series source ingest.",
        "Source encoder",
      ),
    );
  }

  if (singleEncoders > 0 || lines.length === 0) {
    lines.push(
      createBomLine(
        "NHD-120-TX",
        singleEncoders > 0 ? singleEncoders : 1,
        "Single encoder path for 120-series source ingest.",
        "Source encoder",
      ),
    );
  }

  return lines;
}

function getWallIngressCount(sourceCount: number, sourceProfile: SourceProfile): number {
  if (sourceProfile === "matrix-feed") return 1;
  return sourceCount;
}

function build500EncoderBom(args: {
  sourceCount: number;
  sourceLandingStyle?: SourceLandingStyle;
  requiresDanteAudio?: boolean;
  requiresUsbKvmLink?: boolean;
  preferLite?: boolean;
}): BomLine[] {
  const {
    sourceCount,
    sourceLandingStyle = "standard",
    requiresDanteAudio = false,
    requiresUsbKvmLink = false,
    preferLite = true,
  } = args;

  if (requiresUsbKvmLink) {
    return [
      createBomLine(
        "NHD-500-TX",
        sourceCount,
        "Full 500-series source encoding with host USB / KVM workflow support.",
        "Source encoder",
      ),
    ];
  }

  if (requiresDanteAudio) {
    return [
      createBomLine(
        "NHD-500-DNT-TX",
        sourceCount,
        "Dante / AES67-capable source encoding for 500-series ingress.",
        "Source encoder",
      ),
    ];
  }

  if (sourceLandingStyle === "wallplate") {
    return [
      createBomLine(
        "NHD-500-IW-TX",
        sourceCount,
        "One in-wall encoder per source landing for 500-series ingress.",
        "Source encoder",
      ),
    ];
  }

  const sku = preferLite ? "NHD-500-E-TX" : "NHD-500-TX";
  const note = preferLite
    ? "Source encoding for the balanced 500-series wall path."
    : "Full-feature 500-series source encoding for KVM and richer transport workflows.";

  return [createBomLine(sku, sourceCount, note, "Source encoder")];
}

function get500DisplayEndpointSku(requiresUsbKvmLink = false): string {
  return requiresUsbKvmLink ? "NHD-500-RX" : "NHD-500-E-RX";
}

function get500DisplayEndpointNote(args: {
  requiresUsbKvmLink?: boolean;
  singleWallFeed?: boolean;
  decodeStage?: boolean;
  perPanel?: boolean;
}): string {
  if (args.decodeStage) {
    return args.requiresUsbKvmLink
      ? "Full 500-series decode stage to preserve USB / KVM-capable endpoint behavior ahead of the multiview processor."
      : "Decode stage to bring up to four 500-series sources into the HDMI multiview processor.";
  }

  if (args.perPanel) {
    return args.requiresUsbKvmLink
      ? "One full 500-series decoder behind each display for addressed panel control plus USB / KVM-capable endpoint behavior."
      : "One decoder behind each display for addressed panel control.";
  }

  if (args.singleWallFeed) {
    return args.requiresUsbKvmLink
      ? "Single full 500-series wall endpoint for the tiled display wall with USB / KVM-capable endpoint behavior."
      : "Single wall endpoint feeding the tiled display wall.";
  }

  return args.requiresUsbKvmLink
    ? "Full 500-series decoder endpoint selected for USB / KVM-capable wall behavior."
    : "500-series decoder endpoint.";
}

function buildSourceVariantAdvisory(args: {
  tier: BuildMethod | string;
  sourceLandingStyle?: SourceLandingStyle;
  requiresDanteAudio?: boolean;
  requiresUsbKvmLink?: boolean;
  sourceProfile: SourceProfile;
}): string {
  const notes: string[] = [];

  if (args.sourceLandingStyle === "wallplate") {
    notes.push("Source-side ingress is using in-wall encoder variants to match wallplate-style landings.");
  }

  if (args.requiresDanteAudio) {
    if (args.tier === "Bronze") {
      notes.push("Dante / AES67 is not native on the Bronze 120-series source path, so step to Silver when networked audio is mandatory.");
    } else if (args.tier === "Silver") {
      notes.push("Dante / AES67 is active on the Silver source side, so Wingman is selecting NHD-500-DNT-TX rather than the standard 500 encoder.");
    } else {
      notes.push("Validate the wider audio-network design separately rather than assuming every premium wall path replaces a dedicated Dante brief.");
    }
  }

  if (args.requiresUsbKvmLink) {
    if (args.tier === "Bronze") {
      notes.push("Host USB / KVM workflow is not a natural Bronze 120-series fit, so step to Silver 500 TX/RX when the source must stay live and interactive remotely.");
    } else if (args.tier === "Silver") {
      notes.push("USB / KVM host-device workflow is active, so Wingman is selecting the full NHD-500-TX / NHD-500-RX path instead of the lighter 500-E pair.");
    } else {
      notes.push("Validate the wider USB routing design separately so the premium wall path still reflects the real host-device workflow.");
    }
  }

  if (args.requiresDanteAudio && args.requiresUsbKvmLink) {
    notes.push("Both Dante / AES67 audio and USB / KVM have been requested, so validate the exact source-side variant mix rather than assuming one encoder SKU covers every requirement.");
  }

  if (args.sourceProfile === "matrix-feed") {
    notes.push("The wall only sees one prepared feed after upstream switching, so source-side encoder quantity follows wall ingress, not total upstream source count.");
  }

  return notes.join(" ");
}

export function buildSourceSideSummary(sourceCount: number, sourceProfile: SourceProfile): string {
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);

  if (sourceProfile === "matrix-feed") {
    return `${formatCount(sourceCount, "source")} are being staged upstream and collapsed into ${formatCount(
      wallIngressCount,
      "prepared wall feed",
    )}`;
  }

  return `${formatCount(wallIngressCount, "source")} from ${sourceProfileCopy[sourceProfile].label.toLowerCase()}`;
}

export function getMinimumSourceCountForRecommendation(recommendation: any): number {
  if (!recommendation || typeof recommendation !== "object") {
    return 1;
  }

  const productText =
    typeof recommendation.product === "string"
      ? recommendation.product
      : "";

  const productsText = Array.isArray(recommendation.products)
    ? recommendation.products
        .map((item: any) => {
          if (typeof item === "string") return item;
          if (item && typeof item.sku === "string") return item.sku;
          if (item && typeof item.name === "string") return item.name;
          return "";
        })
        .join(" ")
    : "";

  const bomItems = Array.isArray(recommendation.bom) ? recommendation.bom : [];
  const combinedText = `${productText} ${productsText}`.trim();

  const has124 =
    combinedText.includes("NHD-124") ||
    bomItems.some((line: any) => line?.sku === "NHD-124-TX");

  if (has124) {
    return 4;
  }

  if (typeof recommendation.sourceCount === "number" && recommendation.sourceCount > 0) {
    return recommendation.sourceCount;
  }

  if (typeof recommendation.encoderCount === "number" && recommendation.encoderCount > 0) {
    return recommendation.encoderCount;
  }

  return 1;
}

function getDefaultMultiviewStyle(goal: WallGoal): VideoWallMultiviewStyle {
  if (goal === "pip") return "floating-windows";
  if (goal === "custom") return "fixed-windows";
  return "equal-tiles";
}

function tierForPathMode(pathMode: VideoWallPathMode): VideoWallDecisionArgs["tier"] {
  switch (pathMode) {
    case "networkhd-500":
      return "Silver";
    case "sdvoe-600":
      return "Gold";
    default:
      return "Bronze";
  }
}

function transportSummaryForPathMode(pathMode: VideoWallPathMode): string {
  switch (pathMode) {
    case "local-processor":
      return "Local HDMI processor-led path";
    case "networkhd-120":
      return "1Gb NetworkHD 120-series path";
    case "networkhd-500":
      return "1Gb NetworkHD 500-series path";
    case "sdvoe-600":
      return "10Gb SDVoE 600-series path";
    default:
      return "Auto-selected path";
  }
}

function performanceSummaryForPriority(
  priority: VideoWallPerformancePriority | undefined,
  resolvedPathMode: VideoWallPathMode,
): string {
  switch (priority) {
    case "low-bandwidth":
      return "Priority: leanest bandwidth footprint and lowest-cost transport.";
    case "low-latency":
      return "Priority: lower latency, faster response, and tighter wall sync.";
    case "best-image":
      return "Priority: strongest image integrity and premium transport behavior.";
    default:
      return resolvedPathMode === "local-processor"
        ? "Priority: keep the wall local and simple when the job does not need distributed transport."
        : "Priority: balanced default for the selected wall architecture.";
  }
}

function isLocalProcessorEligible(args: VideoWallDecisionArgs): boolean {
  return (
    args.buildMethod === "tile-mode" &&
    args.goal === "single" &&
    (args.sourceProfile === "direct-hdmi" || args.sourceProfile === "matrix-feed") &&
    getWallIngressCount(args.sourceCount, args.sourceProfile) <= 4 &&
    args.rows * args.cols <= 6
  );
}

function resolveRecommendationPathMode(args: VideoWallDecisionArgs): VideoWallPathMode {
  const explicitPath = args.pathMode ?? "auto";
  const multiviewStyle = args.multiviewStyle ?? getDefaultMultiviewStyle(args.goal);
  const priority = args.performancePriority ?? "auto";

  if (explicitPath !== "auto") {
    return explicitPath;
  }

  if (args.goal !== "single" && multiviewStyle === "fixed-windows") {
    return "sdvoe-600";
  }

  if (args.goal !== "single" && multiviewStyle === "floating-windows") {
    return args.tier === "Gold" && priority === "best-image"
      ? "sdvoe-600"
      : "networkhd-120";
  }

  if (priority === "low-bandwidth") {
    return isLocalProcessorEligible(args) ? "local-processor" : "networkhd-120";
  }

  if (priority === "low-latency" || priority === "best-image") {
    return args.tier === "Bronze" ? "networkhd-500" : "sdvoe-600";
  }

  if (isLocalProcessorEligible(args)) {
    return "local-processor";
  }

  switch (args.tier) {
    case "Gold":
      return "sdvoe-600";
    case "Silver":
      return "networkhd-500";
    default:
      return "networkhd-120";
  }
}

function applyRecommendationPreferences(
  recommendation: any,
  args: VideoWallDecisionArgs,
  resolvedPathMode: VideoWallPathMode,
): any {
  const multiviewStyle = args.multiviewStyle ?? getDefaultMultiviewStyle(args.goal);
  const transportSummary = transportSummaryForPathMode(resolvedPathMode);
  const performanceSummary = performanceSummaryForPriority(
    args.performancePriority,
    resolvedPathMode,
  );

  const nextRecommendation = {
    ...recommendation,
    resolvedPathMode,
    resolvedTier: tierForPathMode(resolvedPathMode),
    transportSummary,
    performanceSummary,
    multiviewStyle,
    windowModeSummary:
      args.goal === "single"
        ? "Single wall canvas"
        : multiviewStyle === "floating-windows"
        ? "Floating or overlay windows"
        : multiviewStyle === "fixed-windows"
        ? "Fixed-coordinate windows"
        : "Equal tile grid",
  };

  if (args.goal === "single") {
    return nextRecommendation;
  }

  if (multiviewStyle === "floating-windows") {
    if (resolvedPathMode === "networkhd-120") {
      return {
        ...nextRecommendation,
        title: "120-series floating-window wall",
        reason:
          "Floating or overlay windows point to NHD-150-RX on the 120-series path when the wall needs the lowest-bandwidth multiview architecture.",
        engineeringSummary: `${recommendation.engineeringSummary} NHD-150-RX supports up to 9 windows, can run tile or overlay modes, and overlay mode is limited to 30Hz.`,
      };
    }

    if (resolvedPathMode === "networkhd-500") {
      return {
        ...nextRecommendation,
        title: "500-series staged multiview wall",
        reason:
          "500-series does not have native endpoint multiview, so a floating-window wall needs the staged NHD-0401-MV composition path.",
        engineeringSummary: `${recommendation.engineeringSummary} Use the external NHD-0401-MV processor when the 500-series transport layer still needs a composed wall canvas.`,
      };
    }

    if (resolvedPathMode === "sdvoe-600") {
      return {
        ...nextRecommendation,
        title: "600-series fixed-window SDVoE wall",
        reason:
          "SDVoE gives the premium native multiview path, but it uses fixed X/Y window coordinates rather than overlapping floating windows.",
        engineeringSummary: `${recommendation.engineeringSummary} NHD-600-TRX supports up to 16 windows on one TRX, but they are fixed-coordinate windows with no overlap.`,
      };
    }
  }

  if (multiviewStyle === "fixed-windows" && resolvedPathMode === "sdvoe-600") {
    return {
      ...nextRecommendation,
      title: "600-series fixed-window SDVoE wall",
      reason:
        "Fixed-coordinate multiview is the natural 600-series state, keeping the wall on one premium TRX endpoint with up to 16 non-overlapping windows.",
      engineeringSummary: `${recommendation.engineeringSummary} NHD-600-TRX native multiview uses fixed X/Y coordinates with no overlapping windows and supports up to 16 windows on one TRX.`,
    };
  }

  return nextRecommendation;
}

function directLocalRecommendation(args: VideoWallDecisionArgs): any {
  const { rows, cols, sourceCount, sourceProfile } = args;
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const multiviewNeeded = args.goal !== "single";

  if (multiviewNeeded) {
    return {
      title: "Standalone direct-HDMI multiview wall",
      architecture: "Bronze direct wall processor",
      product: "NHD-0401-MV",
      reason:
        "A simple local HDMI wall with up to four live sources should stay on a direct processor path instead of adding AVoIP complexity too early.",
      bom: [
        createBomLine(
          "NHD-0401-MV",
          1,
          "Direct HDMI multiview processor for a tiled wall feed.",
          "Primary wall processor",
        ),
      ],
      sourceSummary: `${sourceSummaryPrefix} can land directly in the wall processor without moving to an AVoIP architecture.`,
      customerSummary: `The ${rows} x ${cols} wall is staying on the simplest direct-HDMI processor path, which suits a local multiview wall without adding network complexity.`,
      engineeringSummary:
        "Use NHD-0401-MV when the wall behaves as one local HDMI-fed canvas and the design needs multiview rather than addressed AVoIP endpoints.",
    };
  }

  const processorSku = rows * cols <= 4 ? "SW-0204-VW" : "SW-0206-VW";
  return {
    title: "Standalone direct-HDMI wall processor",
    architecture: "Bronze direct wall processor",
    product: processorSku,
    reason:
      "A single-source tiled wall with local HDMI handoff should use the dedicated wall processor first, not a networked system that adds cost without changing the outcome.",
    bom: [
      createBomLine(
        processorSku,
        1,
        "Direct processor path for a single prepared wall feed to the display outputs.",
        "Primary wall processor",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} can feed the wall directly through a local processor path.`,
    customerSummary: `The ${rows} x ${cols} wall is being treated as one direct-HDMI canvas, which is the cleanest Bronze option for a straightforward single-image wall.`,
    engineeringSummary:
      "Use SW-0204-VW or SW-0206-VW when the wall is a local processor-led canvas with direct HDMI input and no need for per-panel AVoIP distribution.",
  };
}

function bronzeAvoipSingleRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Bronze",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "120-series single wall feed",
    architecture: "Bronze 120-series AVoIP wall",
    product: "NHD-120 encoders + NHD-120-RX",
    reason:
      "Once the wall leaves the standalone processor state, Bronze should move to the 120-series AVoIP concept: simple network transport with one wall endpoint.",
    bom: [
      ...build120EncoderBom(wallIngressCount, sourceLandingStyle),
      createBomLine(
        "NHD-120-RX",
        1,
        "Single wall endpoint feeding a tiled or looped display wall.",
        "Wall endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will be encoded into a low-cost 120-series wall feed.`,
    customerSummary: `The ${rows} x ${cols} wall is using the Bronze AVoIP concept: one encoded wall feed and one decoder at the wall input side.`,
    engineeringSummary:
      `Use NHD-120-RX for a single-feed 120-series wall, and step to one decoder per panel only when the wall must be truly addressed display by display.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function bronzeAvoipMultiviewRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Bronze",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "120-series single-feed multiview wall",
    architecture: "Bronze 120-series wall feed",
    product: "NHD-124-TX + NHD-150-RX",
    reason:
      "Bronze multiview should stay on the 120-series path, using NHD-150-RX for multiview output rather than pretending a standard wall decoder is a multiview engine.",
    bom: [
      ...build120EncoderBom(wallIngressCount, sourceLandingStyle),
      createBomLine(
        "NHD-150-RX",
        1,
        "100-series multiview receiver for a single tiled wall feed.",
        "Wall feed processor",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will be composed into one wall feed on the 120-series multiview path.`,
    customerSummary: `The ${rows} x ${cols} wall stays on the lowest-cost AVoIP concept, using 120-series encoders and an NHD-150-RX to build one multiview wall feed.`,
    engineeringSummary:
      `NHD-150-RX is the native 100-series multiview endpoint. Use it for Bronze single-feed multiview walls, not as a generic replacement for per-panel wall decoders.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function bronzeAvoipPerDisplayRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const displays = rows * cols;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Bronze",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "120-series addressed wall",
    architecture: "Bronze 120-series AVoIP wall",
    product: "NHD-120 encoders + NHD-120-RX",
    reason:
      "The wall needs addressed endpoints at the lowest cost point, so the 120 series is the right entry AVoIP platform for panel-by-panel delivery.",
    bom: [
      ...build120EncoderBom(wallIngressCount, sourceLandingStyle),
      createBomLine(
        "NHD-120-RX",
        displays,
        "One wall-capable decoder per physical panel.",
        "Display endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will be encoded into the 120-series network and decoded behind each panel.`,
    customerSummary: `The ${rows} x ${cols} wall uses the Bronze AVoIP architecture: low-cost 120-series transport with one decoder behind each display.`,
    engineeringSummary:
      `120-series walls use one encoder path at the sources, one NHD-120-RX per display, and one controller. This is the correct low-cost addressed wall path, not a direct processor guess.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function silverAvoipSingleRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Silver",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "500-series single wall feed",
    architecture: "Silver 500-series AVoIP wall",
    product: "NHD-500-E-TX + NHD-500-E-RX",
    reason:
      "This keeps the same single-feed wall concept as Bronze but upgrades to the 500 series for better image quality and lower latency without moving all the way to SDVoE.",
    bom: [
      ...build500EncoderBom({
        sourceCount: wallIngressCount,
        sourceLandingStyle,
        requiresDanteAudio,
        requiresUsbKvmLink,
        preferLite: true,
      }),
      createBomLine(
        get500DisplayEndpointSku(requiresUsbKvmLink),
        1,
        get500DisplayEndpointNote({
          requiresUsbKvmLink,
          singleWallFeed: true,
        }),
        "Wall endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will feed the wall over the higher-quality 500-series transport path.`,
    customerSummary: `The ${rows} x ${cols} wall keeps the same single-feed idea as Bronze, but uses the higher-quality 500-series platform for a stronger visual result.`,
    engineeringSummary:
      `Use 500-E as the balanced default wall path. Move to NHD-500-TX and one or more NHD-500-RX units when the design also needs USB/KVM host-device workflow.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function silverAvoipMultiviewRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const decodeStageCount = Math.min(wallIngressCount, 4);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Silver",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "500-series multiview wall feed",
    architecture: "Silver 500-series AVoIP wall",
    product: "NHD-500-E + NHD-0401-MV",
    reason:
      "The 500 series is the balanced higher-quality wall path, but it has no native multiview block, so NHD-0401-MV becomes the correct composition layer instead of guessing a non-existent feature.",
    bom: [
      ...build500EncoderBom({
        sourceCount: wallIngressCount,
        sourceLandingStyle,
        requiresDanteAudio,
        requiresUsbKvmLink,
        preferLite: true,
      }),
      createBomLine(
        get500DisplayEndpointSku(requiresUsbKvmLink),
        decodeStageCount,
        get500DisplayEndpointNote({
          requiresUsbKvmLink,
          decodeStage: true,
        }),
        "Multiview decode stage",
      ),
      createBomLine(
        "NHD-0401-MV",
        1,
        "Dedicated HDMI multiview processor for the 500-series wall feed.",
        "Wall feed processor",
      ),
      createBomLine(
        requiresUsbKvmLink ? "NHD-500-TX" : "NHD-500-E-TX",
        1,
        requiresUsbKvmLink
          ? "Returns the composed multiview wall canvas back onto the 500-series network with full USB / KVM-capable transport."
          : "Returns the composed multiview wall canvas back onto the 500-series network.",
        "Wall feed return",
      ),
      createBomLine(
        get500DisplayEndpointSku(requiresUsbKvmLink),
        1,
        get500DisplayEndpointNote({
          requiresUsbKvmLink,
          singleWallFeed: true,
        }),
        "Wall endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will be composed into one higher-quality 500-series wall feed using NHD-0401-MV.`,
    customerSummary: `The ${rows} x ${cols} wall keeps the same single-feed concept as Bronze, but steps up to the 500 series for cleaner image quality and lower latency, with NHD-0401-MV handling multiview.`,
    engineeringSummary:
      `500-series multiview requires NHD-0401-MV plus a decode stage and one re-encode path back onto the network. Do not guess native multiview on 500-series endpoints because it is not there.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function silverAvoipPerDisplayRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Silver",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "500-series addressed wall",
    architecture: "Silver 500-series AVoIP wall",
    product: "NHD-500-E-TX + NHD-500-E-RX",
    reason:
      "This keeps the same addressed-wall concept as Bronze but moves to the 500 series for visibly better image quality and lower latency on the wall.",
    bom: [
      ...build500EncoderBom({
        sourceCount: wallIngressCount,
        sourceLandingStyle,
        requiresDanteAudio,
        requiresUsbKvmLink,
        preferLite: true,
      }),
      createBomLine(
        get500DisplayEndpointSku(requiresUsbKvmLink),
        rows * cols,
        get500DisplayEndpointNote({
          requiresUsbKvmLink,
          perPanel: true,
        }),
        "Display endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will run on the 500-series transport path to improve image quality and response time.`,
    customerSummary: `The ${rows} x ${cols} wall keeps the addressed-panel design but steps up to 500-series NetworkHD for a cleaner, lower-latency wall.`,
    engineeringSummary:
      `500-series per-panel walls use E-TX/E-RX as the balanced default. Move to NHD-500-TX and at least one NHD-500-RX when the design also needs host-USB / KVM workflow.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function goldAvoipSingleRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Gold",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "600-series premium wall feed",
    architecture: "Gold 600-series SDVoE wall",
    product: "NHD-600-TRX",
    reason:
      "Gold keeps the same single-feed wall concept but moves to 600-series SDVoE for the strongest image, the lowest latency, and the most advanced transport layer.",
    bom: [
      createBomLine(
        "NHD-600-TRX",
        wallIngressCount,
        "Source-side SDVoE transceivers for the premium wall path.",
        "Source transceiver",
      ),
      createBomLine(
        "NHD-600-TRX",
        1,
        "Single wall endpoint for the premium SDVoE wall feed.",
        "Wall endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will feed the wall over the premium 600-series SDVoE platform.`,
    customerSummary: `The ${rows} x ${cols} wall keeps the same core concept as the lower tiers, but Gold upgrades the transport and processing to the premium 600-series SDVoE layer.`,
    engineeringSummary:
      `NHD-600-TRX can be used as the premium single-wall endpoint, can participate in multiview mode, or can be placed behind every panel when the design moves to a full addressed wall.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function goldAvoipMultiviewRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Gold",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "600-series premium multiview wall",
    architecture: "Gold 600-series SDVoE wall",
    product: "NHD-600-TRX",
    reason:
      "Gold keeps the same wall state but upgrades to the 600-series SDVoE layer, where multiview is native to the premium endpoint.",
    bom: [
      createBomLine(
        "NHD-600-TRX",
        wallIngressCount,
        "Source-side SDVoE transceivers for the premium wall path.",
        "Source transceiver",
      ),
      createBomLine(
        "NHD-600-TRX",
        1,
        "Single wall endpoint with native premium multiview capability.",
        "Wall endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will feed the wall over the premium 600-series SDVoE platform.`,
    customerSummary: `The ${rows} x ${cols} wall keeps the same core concept as the lower tiers, but Gold upgrades the transport and processing to the premium 600-series SDVoE layer.`,
    engineeringSummary:
      `NHD-600-TRX can be used as the premium single-wall endpoint, can participate in multiview mode, or can be placed behind every panel when the design moves to a full addressed wall.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

function goldAvoipPerDisplayRecommendation(args: VideoWallDecisionArgs): any {
  const {
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
  } = args;
  const sourceSummaryPrefix = buildSourceSideSummary(sourceCount, sourceProfile);
  const wallIngressCount = getWallIngressCount(sourceCount, sourceProfile);
  const variantAdvisory = buildSourceVariantAdvisory({
    tier: "Gold",
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    sourceProfile,
  });
  return {
    title: "600-series premium addressed wall",
    architecture: "Gold 600-series SDVoE wall",
    product: "NHD-600-TRX",
    reason:
      "This is the top-end addressed wall state, with one premium transceiver per source and per display for the strongest sync, image quality, and control behavior.",
    bom: [
      createBomLine(
        "NHD-600-TRX",
        wallIngressCount,
        "Source-side SDVoE transceivers for the premium wall path.",
        "Source transceiver",
      ),
      createBomLine(
        "NHD-600-TRX",
        rows * cols,
        "One SDVoE transceiver behind each display for premium addressed wall delivery.",
        "Display endpoint",
      ),
      createBomLine(
        getAvoipControllerSku(),
        1,
        "NetworkHD controller for routing, wall presets, and endpoint orchestration.",
        "Wall control",
      ),
    ],
    sourceSummary: `${sourceSummaryPrefix} will move through the 600-series SDVoE layer for the highest-performance addressed wall.`,
    customerSummary: `The ${rows} x ${cols} wall keeps the same addressed-display concept but moves to the premium 600-series SDVoE path for the strongest image and sync performance.`,
    engineeringSummary:
      `600-series TRX can cover source, display, and multiview roles in the same platform. Use one TRX per panel when the wall needs the highest-performance addressed design.${variantAdvisory ? ` ${variantAdvisory}` : ""}`,
  };
}

export function recommendationFor(args: VideoWallDecisionArgs): any {
  const resolvedPathMode = resolveRecommendationPathMode(args);
  let recommendation: any;

  switch (resolvedPathMode) {
    case "local-processor":
      recommendation = directLocalRecommendation(args);
      break;
    case "networkhd-120":
      recommendation =
        args.buildMethod === "per-display"
          ? bronzeAvoipPerDisplayRecommendation(args)
          : args.goal === "single"
          ? bronzeAvoipSingleRecommendation(args)
          : bronzeAvoipMultiviewRecommendation(args);
      break;
    case "networkhd-500":
      recommendation =
        args.buildMethod === "per-display"
          ? silverAvoipPerDisplayRecommendation(args)
          : args.goal === "single"
          ? silverAvoipSingleRecommendation(args)
          : silverAvoipMultiviewRecommendation(args);
      break;
    case "sdvoe-600":
      recommendation =
        args.buildMethod === "per-display"
          ? goldAvoipPerDisplayRecommendation(args)
          : args.goal === "single"
          ? goldAvoipSingleRecommendation(args)
          : goldAvoipMultiviewRecommendation(args);
      break;
    default:
      recommendation = directLocalRecommendation(args);
      break;
  }

  return applyRecommendationPreferences(recommendation, args, resolvedPathMode);
}
