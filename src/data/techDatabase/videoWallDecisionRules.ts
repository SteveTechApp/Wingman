import type { SolutionRecommendationTier } from "@/catalog/serviceRecommendations";

export type WallGoal = "single" | "grid" | "pip" | "custom";
export type BuildMethod = "tile-mode" | "per-display";
export type SourceProfile = "player" | "matrix-feed" | "direct-hdmi" | "camera" | "mixed";
export type SourceLandingStyle = "standard" | "wallplate";
export type VideoWallMultiviewStyle =
  | "equal-tiles"
  | "floating-windows"
  | "fixed-windows";
export type VideoWallPathMode =
  | "auto"
  | "local-processor"
  | "networkhd-120"
  | "networkhd-500"
  | "sdvoe-600";
export type VideoWallPerformancePriority =
  | "auto"
  | "low-bandwidth"
  | "low-latency"
  | "best-image";

export type VideoWallState = "direct-local" | "entry-avoip" | "balanced-avoip" | "premium-sdvoe";
export type VideoWallUseCase = "single-wall-image" | "multiview" | "per-panel";

export type VideoWallDesignState = {
  label: string;
  summary: string;
  guardrails: string[];
};

export type VideoWallDecisionArgs = {
  tier: SolutionRecommendationTier;
  goal: WallGoal;
  buildMethod: BuildMethod;
  rows: number;
  cols: number;
  sourceCount: number;
  sourceProfile: SourceProfile;
  sourceLandingStyle?: SourceLandingStyle;
  requiresDanteAudio?: boolean;
  requiresUsbKvmLink?: boolean;
  multiviewStyle?: VideoWallMultiviewStyle;
  pathMode?: VideoWallPathMode;
  performancePriority?: VideoWallPerformancePriority;
};

export type VideoWallDecisionRule = {
  id: string;
  state: VideoWallState;
  useCase: VideoWallUseCase;
  tier: SolutionRecommendationTier;
  matches: (args: VideoWallDecisionArgs) => boolean;
  designState: VideoWallDesignState;
};

function getWallIngressCount(sourceCount: number, sourceProfile: SourceProfile): number {
  if (sourceProfile === "matrix-feed") return 1;
  return sourceCount;
}

export const VIDEO_WALL_DECISION_RULES: VideoWallDecisionRule[] = [
  {
    id: "direct-local-multiview",
    state: "direct-local",
    useCase: "multiview",
    tier: "Bronze",
    matches: ({ tier, goal, buildMethod, sourceProfile, sourceCount, rows, cols }) =>
      tier === "Bronze" &&
      buildMethod === "tile-mode" &&
      goal !== "single" &&
      (sourceProfile === "direct-hdmi" || sourceProfile === "matrix-feed") &&
      getWallIngressCount(sourceCount, sourceProfile) <= 4 &&
      rows * cols <= 6,
    designState: {
      label: "Local direct-HDMI multiview wall",
      summary:
        "Treat the wall as one local destination and let the dedicated HDMI multiview processor build the canvas before it reaches the displays.",
      guardrails: [
        "Do not use this path when each panel needs to be addressed independently across the network.",
        "Do not use this path when the sources are remote and should stay on AVoIP transport end to end.",
      ],
    },
  },
  {
    id: "direct-local-single",
    state: "direct-local",
    useCase: "single-wall-image",
    tier: "Bronze",
    matches: ({ tier, goal, buildMethod, sourceProfile, sourceCount, rows, cols }) =>
      tier === "Bronze" &&
      buildMethod === "tile-mode" &&
      goal === "single" &&
      (sourceProfile === "direct-hdmi" || sourceProfile === "matrix-feed") &&
      getWallIngressCount(sourceCount, sourceProfile) <= 4 &&
      rows * cols <= 6,
    designState: {
      label: "Local direct-HDMI wall processor",
      summary:
        "This is the cleanest wall state when a prepared HDMI feed or a handful of local HDMI sources need to drive one tiled LCD wall without distributed endpoints.",
      guardrails: [
        "Do not use this path when the job needs remote network transport or wall-wide KVM workflows.",
        "Do not use this path when each panel needs separate content rather than one prepared wall canvas.",
      ],
    },
  },
  {
    id: "bronze-avoip-per-panel",
    state: "entry-avoip",
    useCase: "per-panel",
    tier: "Bronze",
    matches: ({ tier, buildMethod }) => tier === "Bronze" && buildMethod === "per-display",
    designState: {
      label: "Entry addressed 1Gb AVoIP wall",
      summary:
        "Each display gets its own decoder, keeping the lowest-cost true addressed-wall architecture on the 120-series path.",
      guardrails: [
        "Do not use this path when image quality and latency are mission-critical compared with the budget.",
        "Do not use this path when the wall can behave as one destination and a single-feed processor path would stay simpler.",
      ],
    },
  },
  {
    id: "bronze-avoip-multiview",
    state: "entry-avoip",
    useCase: "multiview",
    tier: "Bronze",
    matches: ({ tier, goal, buildMethod }) => tier === "Bronze" && buildMethod === "tile-mode" && goal !== "single",
    designState: {
      label: "Entry single-feed multiview wall",
      summary:
        "The 120-series handles source ingest, then a dedicated multiview stage builds one wall feed for the tiled displays.",
      guardrails: [
        "Do not assume the standard 120 wall decoder is a native multiview engine; use NHD-150-RX for this state.",
        "Do not use this path when the wall needs premium image quality, lower latency, or richer endpoint behavior.",
      ],
    },
  },
  {
    id: "bronze-avoip-single",
    state: "entry-avoip",
    useCase: "single-wall-image",
    tier: "Bronze",
    matches: ({ tier, goal, buildMethod }) => tier === "Bronze" && buildMethod === "tile-mode" && goal === "single",
    designState: {
      label: "Entry single-feed 1Gb AVoIP wall",
      summary:
        "This keeps one encoded wall feed on the entry NetworkHD path and is the lowest-cost distributed answer once the job moves beyond direct local HDMI.",
      guardrails: [
        "Do not use this path when each display needs independent content or grouped zoning.",
        "Do not use this path when the client expects the stronger image quality and lower latency of the 500 or 600 series.",
      ],
    },
  },
  {
    id: "silver-avoip-per-panel",
    state: "balanced-avoip",
    useCase: "per-panel",
    tier: "Silver",
    matches: ({ tier, buildMethod }) => tier === "Silver" && buildMethod === "per-display",
    designState: {
      label: "Balanced addressed 1Gb AVoIP wall",
      summary:
        "This keeps the same one-decoder-per-panel idea as Bronze but steps up to the cleaner, lower-latency 500-series transport layer.",
      guardrails: [
        "Do not use E-TX/E-RX by default when the design really needs USB host-device KVM workflow; move to the full 500 TX/RX path.",
        "Do not use this path when the job needs the premium SDVoE tier or native 600-series multiview behavior.",
      ],
    },
  },
  {
    id: "silver-avoip-multiview",
    state: "balanced-avoip",
    useCase: "multiview",
    tier: "Silver",
    matches: ({ tier, goal, buildMethod }) => tier === "Silver" && buildMethod === "tile-mode" && goal !== "single",
    designState: {
      label: "Balanced staged multiview wall",
      summary:
        "The 500 series transports the sources, then NHD-0401-MV handles the actual multiview composition before the wall feed returns to the network.",
      guardrails: [
        "Do not treat 500-series endpoints as if they have a native multiview engine; the multiview stage is separate here.",
        "Do not use this path when the wall should stay entirely local HDMI or when premium SDVoE is the real target.",
      ],
    },
  },
  {
    id: "silver-avoip-single",
    state: "balanced-avoip",
    useCase: "single-wall-image",
    tier: "Silver",
    matches: ({ tier, goal, buildMethod }) => tier === "Silver" && buildMethod === "tile-mode" && goal === "single",
    designState: {
      label: "Balanced single-feed 1Gb AVoIP wall",
      summary:
        "This is the higher-quality version of the same single-wall-feed concept, using 500-series transport for better visual quality and faster response.",
      guardrails: [
        "Do not use this path when the wall needs one decoder behind every display rather than one wall endpoint.",
        "Do not use this path when the design should stay on the simpler local processor route instead of moving onto the network.",
      ],
    },
  },
  {
    id: "gold-avoip-per-panel",
    state: "premium-sdvoe",
    useCase: "per-panel",
    tier: "Gold",
    matches: ({ tier, buildMethod }) => tier === "Gold" && buildMethod === "per-display",
    designState: {
      label: "Premium addressed SDVoE wall",
      summary:
        "This is the top-end addressed wall state, with one premium transceiver per source and per display for the strongest sync, image quality, and control behavior.",
      guardrails: [
        "Do not use this path when the room is fundamentally cost-led and the 120 or 500 tiers already solve the use case.",
        "Do not collapse this into a simple processor-led wall if the user actually needs addressed, per-panel behavior.",
      ],
    },
  },
  {
    id: "gold-avoip-multiview",
    state: "premium-sdvoe",
    useCase: "multiview",
    tier: "Gold",
    matches: ({ tier, goal, buildMethod }) => tier === "Gold" && buildMethod === "tile-mode" && goal !== "single",
    designState: {
      label: "Premium SDVoE multiview wall",
      summary:
        "This keeps the same wall state but upgrades to the 600-series SDVoE layer, where multiview is native to the premium endpoint.",
      guardrails: [
        "Do not use this path when a local direct-HDMI processor already satisfies the wall without adding distributed transport cost.",
        "Do not treat this as the right answer for every multiview wall; it is the premium answer only when the extra performance and flexibility matter.",
      ],
    },
  },
  {
    id: "gold-avoip-single",
    state: "premium-sdvoe",
    useCase: "single-wall-image",
    tier: "Gold",
    matches: ({ tier, buildMethod }) => tier === "Gold" && buildMethod === "tile-mode",
    designState: {
      label: "Premium SDVoE wall feed",
      summary:
        "This keeps the same single-feed wall concept as the lower tiers but upgrades the endpoint and transport to the premium 600-series SDVoE layer.",
      guardrails: [
        "Do not use this path when a local direct-HDMI processor already satisfies the wall without adding distributed transport cost.",
        "Do not treat this as the right answer for every multiview wall; it is the premium answer only when the extra performance and flexibility matter.",
      ],
    },
  },
];

export function resolveVideoWallDecision(args: VideoWallDecisionArgs): VideoWallDecisionRule {
  return (
    VIDEO_WALL_DECISION_RULES.find((rule) => rule.matches(args)) ??
    VIDEO_WALL_DECISION_RULES[VIDEO_WALL_DECISION_RULES.length - 1]
  );
}
