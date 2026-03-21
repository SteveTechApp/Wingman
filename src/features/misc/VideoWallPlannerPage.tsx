import React, { useMemo, useState } from "react";

import { type SolutionRecommendationTier } from "@/catalog/serviceRecommendations";
import {
  getMinimumSourceCountForRecommendation as getVideoWallMinimumSourceCount,
  recommendationFor as buildVideoWallRecommendation,
} from "@/data/techDatabase/videoWallRecommendationEngine";
import {
  resolveVideoWallDecision as resolveVideoWallDecisionRule,
  type VideoWallDecisionArgs,
  type VideoWallDesignState,
  type VideoWallMultiviewStyle,
  type VideoWallPathMode,
  type VideoWallPerformancePriority,
} from "@/data/techDatabase/videoWallDecisionRules";
import {
  sourceLandingCopy,
  sourceProfileCopy,
  tierCopy,
  type SourceLandingStyle,
  type SourceProfile,
} from "@/data/techDatabase/videoWallCopy";
import {
  applyVideoWallToProject,
  getActiveProject,
  subscribeProjects,
} from "@/features/projects/projectStore";

type WallGoal = "single" | "grid" | "pip" | "custom";
type BuildMethod = "tile-mode" | "per-display";
type BezelPreset = "none" | "thin" | "standard" | "thick";
type WallBehavior = "single-canvas" | "multiview" | "addressed-panels";

const bezelValues: Record<BezelPreset, number> = {
  none: 0,
  thin: 4,
  standard: 8,
  thick: 14,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatMm(value: number): string {
  return `${Math.round(value)} mm`;
}

function deriveVideoWallDesignState(args: VideoWallDecisionArgs): VideoWallDesignState {
  return resolveVideoWallDecisionRule(args).designState;
}

function getWallBehavior(goal: WallGoal, buildMethod: BuildMethod): WallBehavior {
  if (buildMethod === "per-display") return "addressed-panels";
  if (goal === "single") return "single-canvas";
  return "multiview";
}

function getWallGoal(
  wallBehavior: WallBehavior,
  multiviewStyle: VideoWallMultiviewStyle,
): WallGoal {
  if (wallBehavior === "single-canvas" || wallBehavior === "addressed-panels") {
    return "single";
  }

  if (multiviewStyle === "floating-windows") return "pip";
  if (multiviewStyle === "fixed-windows") return "custom";
  return "grid";
}

function getBuildMethod(wallBehavior: WallBehavior): BuildMethod {
  return wallBehavior === "addressed-panels" ? "per-display" : "tile-mode";
}

const wallBehaviorCopy: Record<
  WallBehavior,
  { label: string; shortLabel: string; sublabel: string }
> = {
  "single-canvas": {
    label: "Single canvas",
    shortLabel: "Single",
    sublabel: "One wall image or one prepared wall feed.",
  },
  multiview: {
    label: "Multiview canvas",
    shortLabel: "Multi",
    sublabel: "Multiple windows on one wall canvas.",
  },
  "addressed-panels": {
    label: "Addressed panels",
    shortLabel: "Panels",
    sublabel: "One decoder or TRX behind each display.",
  },
};

const multiviewStyleCopy: Record<
  VideoWallMultiviewStyle,
  { label: string; shortLabel: string; sublabel: string }
> = {
  "equal-tiles": {
    label: "Equal tiles",
    shortLabel: "Grid",
    sublabel: "Regular multiview grid across one wall feed.",
  },
  "floating-windows": {
    label: "Floating windows",
    shortLabel: "Float",
    sublabel: "Overlay or pinch-style windows on one wall feed.",
  },
  "fixed-windows": {
    label: "Fixed XY windows",
    shortLabel: "Fixed",
    sublabel: "Non-overlapping windows placed by fixed coordinates.",
  },
};

const pathModeCopy: Record<
  VideoWallPathMode,
  { label: string; shortLabel: string; sublabel: string }
> = {
  auto: {
    label: "Auto path",
    shortLabel: "Auto",
    sublabel: "Let Wingman resolve the path from the brief.",
  },
  "local-processor": {
    label: "Local processor",
    shortLabel: "Direct",
    sublabel: "SW-0204/0206-VW or local HDMI processor path.",
  },
  "networkhd-120": {
    label: "120-series",
    shortLabel: "120",
    sublabel: "Lowest-cost 1Gb NetworkHD path.",
  },
  "networkhd-500": {
    label: "500-series",
    shortLabel: "500",
    sublabel: "Higher-quality 1Gb NetworkHD path.",
  },
  "sdvoe-600": {
    label: "600-series SDVoE",
    shortLabel: "600",
    sublabel: "Premium 10Gb SDVoE path.",
  },
};

const performancePriorityCopy: Record<
  VideoWallPerformancePriority,
  { label: string; shortLabel: string; sublabel: string }
> = {
  auto: {
    label: "Balanced",
    shortLabel: "Auto",
    sublabel: "Use the default path logic for the selected tier and wall state.",
  },
  "low-bandwidth": {
    label: "Low bandwidth",
    shortLabel: "BW",
    sublabel: "Leanest network footprint and cost-led path.",
  },
  "low-latency": {
    label: "Low latency",
    shortLabel: "Fast",
    sublabel: "Prefer faster response and stronger wall sync.",
  },
  "best-image": {
    label: "Best image",
    shortLabel: "IQ",
    sublabel: "Bias toward premium image quality and transport.",
  },
};

function SectionCard(props: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(80,145,255,0.18)",
        background:
          "linear-gradient(180deg, rgba(7,20,40,0.96) 0%, rgba(3,14,30,0.98) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        padding: 14,
        ...props.style,
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(214,228,255,0.64)",
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

function ControlOption(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  shortLabel?: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        width: "100%",
        minHeight: props.sublabel ? 72 : 58,
        textAlign: "left",
        borderRadius: 12,
        border: props.active
          ? "1px solid rgba(126,192,255,0.5)"
          : "1px solid rgba(97,162,255,0.18)",
        background: props.active
          ? "linear-gradient(180deg, rgba(26,74,130,0.92) 0%, rgba(12,42,84,0.94) 100%)"
          : "rgba(9,20,40,0.84)",
        color: "#f5f9ff",
        padding: "10px 12px",
        cursor: "pointer",
        display: "grid",
        alignContent: "start",
        gap: 3,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {props.shortLabel ? (
          <span
            style={{
              minWidth: 30,
              height: 24,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              display: "inline-grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(238,245,255,0.86)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {props.shortLabel}
          </span>
        ) : null}
        <span style={{ fontSize: 13, fontWeight: 800 }}>{props.label}</span>
      </div>
      {props.sublabel ? (
        <div style={{ fontSize: 11, lineHeight: 1.4, color: "rgba(214,228,255,0.72)" }}>
          {props.sublabel}
        </div>
      ) : null}
    </button>
  );
}

function CompactTierButton(props: {
  active: boolean;
  onClick: () => void;
  shortLabel: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        minHeight: 54,
        borderRadius: 12,
        border: props.active
          ? "1px solid rgba(126,192,255,0.55)"
          : "1px solid rgba(97,162,255,0.18)",
        background: props.active
          ? "linear-gradient(180deg, rgba(26,74,130,0.92) 0%, rgba(12,42,84,0.94) 100%)"
          : "rgba(9,20,40,0.82)",
        color: "#f5f9ff",
        padding: "10px 12px",
        cursor: "pointer",
        display: "grid",
        justifyItems: "center",
        alignContent: "center",
        gap: 2,
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{props.shortLabel}</span>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: props.active ? "rgba(243,248,255,0.96)" : "rgba(201,227,255,0.72)" }}>
        {props.label}
      </span>
    </button>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "rgba(214,228,255,0.72)", fontWeight: 700 }}>
        {props.label}
      </span>
      <input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        disabled={props.disabled}
        onChange={(e) => props.onChange(clamp(Number(e.target.value) || props.value, props.min, props.max))}
        style={{
          borderRadius: 12,
          border: props.disabled ? "1px solid rgba(97,162,255,0.12)" : "1px solid rgba(97,162,255,0.18)",
          background: props.disabled ? "rgba(9,20,40,0.58)" : "rgba(9,20,40,0.9)",
          color: props.disabled ? "rgba(245,249,255,0.72)" : "#f5f9ff",
          padding: "10px 12px",
          fontSize: 14,
          fontWeight: 700,
          outline: "none",
        }}
      />
      {props.helperText ? (
        <span style={{ fontSize: 11, lineHeight: 1.4, color: "rgba(201,227,255,0.66)" }}>
          {props.helperText}
        </span>
      ) : null}
    </label>
  );
}

function SelectField<T extends string>(props: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "rgba(214,228,255,0.72)", fontWeight: 700 }}>
        {props.label}
      </span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        style={{
          borderRadius: 12,
          border: "1px solid rgba(97,162,255,0.18)",
          background: "rgba(9,20,40,0.9)",
          color: "#f5f9ff",
          padding: "10px 12px",
          fontSize: 14,
          fontWeight: 700,
          outline: "none",
        }}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreviewBadge(props: {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  label: string;
  accent: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: props.left,
        right: props.right,
        top: props.top,
        bottom: props.bottom,
        zIndex: 4,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${props.accent}`,
        background: "rgba(4,13,27,0.86)",
        color: "#eef5ff",
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
        pointerEvents: "none",
      }}
    >
      {props.label}
    </div>
  );
}

function PreviewOverlay(props: {
  goal: WallGoal;
  buildMethod: BuildMethod;
  wallBehavior: WallBehavior;
  multiviewStyle: VideoWallMultiviewStyle;
  pathMode: VideoWallPathMode;
  rows: number;
  cols: number;
  contentSourceCount: number;
  ingressCount: number;
}) {
  const accentMap: Record<VideoWallPathMode, string> = {
    auto: "rgba(145,205,255,0.55)",
    "local-processor": "rgba(255,196,118,0.58)",
    "networkhd-120": "rgba(120,199,255,0.6)",
    "networkhd-500": "rgba(103,229,208,0.6)",
    "sdvoe-600": "rgba(104,214,255,0.65)",
  };
  const accent = accentMap[props.pathMode];
  const base: React.CSSProperties = {
    position: "absolute",
    border: `1px solid ${accent}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)",
    boxShadow: "0 16px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.1)",
    backdropFilter: "blur(4px)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    display: "grid",
    placeItems: "center",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    overflow: "hidden",
  };
  const detailText: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "rgba(234,242,255,0.7)",
  };
  const renderFrame = (
    label: string,
    detail?: string,
    style?: React.CSSProperties,
    tone: "primary" | "support" = "support",
  ) => (
    <div
      style={{
        ...base,
        background:
          tone === "primary"
            ? "linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.14) 100%)"
            : base.background,
        ...style,
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
        <span>{label}</span>
        {detail ? <span style={detailText}>{detail}</span> : null}
      </div>
    </div>
  );

  const badges = (
    <>
      <PreviewBadge left="12px" top="12px" label={pathModeCopy[props.pathMode].shortLabel} accent={accent} />
      <PreviewBadge
        right="12px"
        top="12px"
        label={
          props.wallBehavior === "multiview"
            ? multiviewStyleCopy[props.multiviewStyle].shortLabel
            : wallBehaviorCopy[props.wallBehavior].shortLabel
        }
        accent={accent}
      />
      <PreviewBadge left="12px" bottom="12px" label={`${props.ingressCount} in`} accent={accent} />
      <PreviewBadge
        right="12px"
        bottom="12px"
        label={
          props.buildMethod === "per-display"
            ? `${props.rows * props.cols} out`
            : "1 feed"
        }
        accent={accent}
      />
    </>
  );

  if (props.buildMethod === "per-display") {
    const cells: React.ReactNode[] = [];
    const cellW = 100 / props.cols;
    const cellH = 100 / props.rows;
    const endpointLabel = props.pathMode === "sdvoe-600" ? "TRX" : "RX";

    for (let r = 0; r < props.rows; r += 1) {
      for (let c = 0; c < props.cols; c += 1) {
        cells.push(
          <div
            key={`${r}-${c}`}
            style={{
              ...base,
              left: `${c * cellW + 1.8}%`,
              top: `${r * cellH + 2.4}%`,
              width: `${cellW - 3.6}%`,
              height: `${cellH - 4.8}%`,
            }}
          >
            <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
              <span>{r * props.cols + c + 1}</span>
              <span style={detailText}>{endpointLabel}</span>
            </div>
          </div>,
        );
      }
    }

    return (
      <>
        {badges}
        {cells}
      </>
    );
  }

  if (props.goal === "single") {
    return (
      <>
        {badges}
        {renderFrame("Wall feed", props.ingressCount === 1 ? "Prepared output" : `${props.ingressCount} inputs`, { inset: "8%" }, "primary")}
      </>
    );
  }

  if (props.goal === "grid") {
    const tileCount = clamp(props.contentSourceCount, 2, props.pathMode === "sdvoe-600" ? 16 : 9);
    const tileCols = Math.ceil(Math.sqrt(tileCount));
    const tileRows = Math.ceil(tileCount / tileCols);
    const pad = 8;
    const gap = 3;
    const tileW = (100 - pad * 2 - gap * (tileCols - 1)) / tileCols;
    const tileH = (100 - pad * 2 - gap * (tileRows - 1)) / tileRows;
    const tiles: React.ReactNode[] = [];

    for (let index = 0; index < tileCount; index += 1) {
      const r = Math.floor(index / tileCols);
      const c = index % tileCols;
      tiles.push(
        renderFrame(
          `${index + 1}`,
          "Tile",
          {
            left: `${pad + c * (tileW + gap)}%`,
            top: `${pad + r * (tileH + gap)}%`,
            width: `${tileW}%`,
            height: `${tileH}%`,
          },
          index === 0 ? "primary" : "support",
        ),
      );
    }

    return (
      <>
        {badges}
        {tiles}
      </>
    );
  }

  if (props.goal === "pip") {
    const floatingCount = clamp(props.contentSourceCount, 1, props.pathMode === "networkhd-500" ? 4 : 6);
    const overlayRects = [
      { right: "8%", top: "11%", width: "24%", height: "18%" },
      { left: "11%", bottom: "12%", width: "22%", height: "17%" },
      { right: "14%", bottom: "10%", width: "20%", height: "15%" },
      { left: "18%", top: "15%", width: "18%", height: "14%" },
      { right: "30%", top: "58%", width: "16%", height: "13%" },
    ];

    return (
      <>
        {badges}
        {renderFrame("Main", "Floating canvas", { left: "8%", top: "10%", width: "58%", height: "64%" }, "primary")}
        {overlayRects.slice(0, Math.max(0, floatingCount - 1)).map((rect, index) =>
          renderFrame(
            `Pin ${index + 1}`,
            "Overlay",
            {
              ...rect,
              zIndex: 2 + index,
            },
          ),
        )}
      </>
    );
  }

  const fixedCount = clamp(props.contentSourceCount, 2, props.pathMode === "sdvoe-600" ? 16 : 9);
  const fixedGuides = Array.from({ length: 3 }).map((_, index) => (
    <React.Fragment key={index}>
      <div
        style={{
          position: "absolute",
          left: `${25 * (index + 1)}%`,
          top: "0%",
          bottom: "0%",
          width: 1,
          background: "rgba(186,219,255,0.12)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: `${25 * (index + 1)}%`,
          left: "0%",
          right: "0%",
          height: 1,
          background: "rgba(186,219,255,0.12)",
          zIndex: 0,
        }}
      />
    </React.Fragment>
  ));
  const fixedPresets =
    fixedCount <= 6
      ? [
          { left: "8%", top: "10%", width: "38%", height: "32%" },
          { left: "52%", top: "10%", width: "28%", height: "15%" },
          { left: "52%", top: "29%", width: "28%", height: "13%" },
          { left: "8%", top: "50%", width: "18%", height: "25%" },
          { left: "29%", top: "50%", width: "17%", height: "25%" },
          { left: "52%", top: "50%", width: "28%", height: "25%" },
        ]
      : null;

  const fixedWindows = fixedPresets
    ? fixedPresets.slice(0, fixedCount).map((rect, index) =>
        renderFrame(
          `S${index + 1}`,
          "Fixed XY",
          {
            ...rect,
            zIndex: 1,
          },
          index === 0 ? "primary" : "support",
        ),
      )
    : Array.from({ length: fixedCount }).map((_, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        return renderFrame(
          `S${index + 1}`,
          "Fixed XY",
          {
            left: `${8 + col * 21}%`,
            top: `${10 + row * 18}%`,
            width: "18%",
            height: "14%",
            zIndex: 1,
          },
          index === 0 ? "primary" : "support",
        );
      });

  return (
    <>
      {badges}
      {fixedGuides}
      {fixedWindows}
    </>
  );
}

export default function VideoWallPlannerPage() {
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );
  const [tier, setTier] = useState<SolutionRecommendationTier>("Silver");
  const [wallBehavior, setWallBehavior] = useState<WallBehavior>("single-canvas");
  const [multiviewStyle, setMultiviewStyle] =
    useState<VideoWallMultiviewStyle>("equal-tiles");
  const [pathMode, setPathMode] = useState<VideoWallPathMode>("auto");
  const [performancePriority, setPerformancePriority] =
    useState<VideoWallPerformancePriority>("auto");
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [sourceCount, setSourceCount] = useState(1);
  const [sourceProfile, setSourceProfile] = useState<SourceProfile>("player");
  const [sourceLandingStyle, setSourceLandingStyle] =
    useState<SourceLandingStyle>("standard");
  const [requiresDanteAudio, setRequiresDanteAudio] = useState(false);
  const [requiresUsbKvmLink, setRequiresUsbKvmLink] = useState(false);
  const [bezelPreset, setBezelPreset] = useState<BezelPreset>("thin");
  const hydratedProjectIdRef = React.useRef<string | null>(null);
  const persistedSnapshotRef = React.useRef<string>("");

  const totalDisplays = rows * cols;
  const bezel = bezelValues[bezelPreset];
  const goal = useMemo(
    () => getWallGoal(wallBehavior, multiviewStyle),
    [multiviewStyle, wallBehavior],
  );
  const buildMethod = useMemo(() => getBuildMethod(wallBehavior), [wallBehavior]);
  const wallIngressCount = sourceProfile === "matrix-feed" ? 1 : sourceCount;

  const recommendation = useMemo(() => {
    return buildVideoWallRecommendation({
      tier,
      goal,
      buildMethod,
      rows,
      cols,
      sourceCount,
      sourceProfile,
      sourceLandingStyle,
      requiresDanteAudio,
      requiresUsbKvmLink,
      multiviewStyle,
      pathMode,
      performancePriority,
    });
  }, [
    tier,
    goal,
    buildMethod,
    rows,
    cols,
    sourceCount,
    sourceProfile,
    sourceLandingStyle,
    requiresDanteAudio,
    requiresUsbKvmLink,
    multiviewStyle,
    pathMode,
    performancePriority,
  ]);
  const resolvedTier = recommendation?.resolvedTier ?? tier;
  const resolvedPathMode = (recommendation?.resolvedPathMode ?? pathMode) as VideoWallPathMode;

  const minimumRecommendedSourceCount = useMemo(
    () => getVideoWallMinimumSourceCount(recommendation),
    [recommendation],
  );
  const quadInputSourceState = (recommendation?.product ?? "").includes("NHD-124");
  const displayedSourceCount = quadInputSourceState ? 4 : sourceCount;
  const designState = useMemo(
    () =>
      deriveVideoWallDesignState({
        cols,
        rows,
        tier: resolvedTier,
        goal,
        buildMethod,
        sourceProfile,
        sourceCount,
        sourceLandingStyle,
        requiresDanteAudio,
        requiresUsbKvmLink,
        multiviewStyle,
        pathMode: resolvedPathMode,
        performancePriority,
      }),
    [
      buildMethod,
      goal,
      multiviewStyle,
      pathMode,
      performancePriority,
      requiresDanteAudio,
      requiresUsbKvmLink,
      resolvedPathMode,
      resolvedTier,
      sourceCount,
      sourceLandingStyle,
      sourceProfile,
      cols,
      rows,
    ],
  );

  React.useEffect(() => {
    if (quadInputSourceState && sourceCount !== 4) {
      setSourceCount(4);
      return;
    }

    if (sourceCount >= minimumRecommendedSourceCount) return;
    setSourceCount(minimumRecommendedSourceCount);
  }, [minimumRecommendedSourceCount, quadInputSourceState, sourceCount]);

  React.useEffect(() => {
    if (!activeProject?.id || hydratedProjectIdRef.current === activeProject.id) return;

    hydratedProjectIdRef.current = activeProject.id;

    const savedWall = activeProject.videowall;
    if (savedWall) {
      if (savedWall.designTier) setTier(savedWall.designTier);
      if (savedWall.wallGoal || savedWall.buildMethod) {
        setWallBehavior(
          getWallBehavior(
            savedWall.wallGoal ?? "single",
            savedWall.buildMethod ?? "tile-mode",
          ),
        );
      }
      if (savedWall.multiviewStyle) setMultiviewStyle(savedWall.multiviewStyle);
      else if (savedWall.wallGoal) {
        setMultiviewStyle(
          savedWall.wallGoal === "pip"
            ? "floating-windows"
            : savedWall.wallGoal === "custom"
            ? "fixed-windows"
            : "equal-tiles",
        );
      }
      if (savedWall.pathMode) setPathMode(savedWall.pathMode);
      if (savedWall.performancePriority) {
        setPerformancePriority(savedWall.performancePriority);
      }
      if (savedWall.rows) setRows(savedWall.rows);
      if (savedWall.cols) setCols(savedWall.cols);
      if (savedWall.sourceCount != null) setSourceCount(Math.max(1, savedWall.sourceCount));
      if (savedWall.sourceProfile) setSourceProfile(savedWall.sourceProfile);
      if (savedWall.sourceLandingStyle) setSourceLandingStyle(savedWall.sourceLandingStyle);
      if (typeof savedWall.requiresDanteAudio === "boolean") {
        setRequiresDanteAudio(savedWall.requiresDanteAudio);
      }
      if (typeof savedWall.requiresUsbKvmLink === "boolean") {
        setRequiresUsbKvmLink(savedWall.requiresUsbKvmLink);
      }
      if (savedWall.bezelMm === 0) {
        setBezelPreset("none");
      } else if (savedWall.bezelMm != null && savedWall.bezelMm <= 4) {
        setBezelPreset("thin");
      } else if (savedWall.bezelMm != null && savedWall.bezelMm <= 8) {
        setBezelPreset("standard");
      } else if (savedWall.bezelMm != null) {
        setBezelPreset("thick");
      }
      return;
    }

    const proposalTier = activeProject.proposal?.selectedTier;
    if (proposalTier === "Bronze" || proposalTier === "Silver" || proposalTier === "Gold") {
      setTier(proposalTier);
    }

    const discoverySourceCount = Number(activeProject.discovery?.sourceCount);
    if (Number.isFinite(discoverySourceCount) && discoverySourceCount > 0) {
      setSourceCount(discoverySourceCount);
    }
  }, [activeProject]);

  const projectVideoWallSnapshot = useMemo(
    () => ({
      technology: "LCD" as const,
      designTier: resolvedTier,
      wallGoal: goal,
      buildMethod,
      multiviewStyle,
      pathMode,
      performancePriority,
      sourceProfile,
      sourceLandingStyle,
      requiresDanteAudio,
      requiresUsbKvmLink,
      rows,
      cols,
      widthM: 0,
      heightM: 0,
      diagonalIn: 0,
      bezelMm: bezel,
      sourceCount: wallIngressCount,
      outputRows: rows,
      outputCols: cols,
      panelCount: totalDisplays,
      contentAspectRatio: `${cols * 16}:${rows * 9}`,
      lcdDriveStrategy:
        buildMethod === "per-display"
          ? ("decoder-per-screen" as const)
          : ("tile-loop-multiview" as const),
      recommendedSku: recommendation?.bom?.[0]?.sku ?? recommendation.product,
      recommendedSkuQty: recommendation?.bom?.[0]?.qty ?? 1,
      recommendedItems: (recommendation?.bom ?? []).map((line) => ({
        sku: line.sku,
        quantity: line.qty,
        role: line.role,
      })),
      processorRecommendation: recommendation.product,
      summary: recommendation.customerSummary,
      warnings: [recommendation.reason, ...designState.guardrails],
      mountingNotes: [
        designState.summary,
        recommendation.transportSummary,
        recommendation.performanceSummary,
        recommendation.sourceSummary,
        recommendation.engineeringSummary,
      ],
    }),
    [
      bezel,
      buildMethod,
      cols,
      designState,
      goal,
      multiviewStyle,
      pathMode,
      performancePriority,
      recommendation,
      requiresDanteAudio,
      requiresUsbKvmLink,
      resolvedTier,
      rows,
      sourceCount,
      sourceLandingStyle,
      sourceProfile,
      totalDisplays,
    ],
  );

  React.useEffect(() => {
    if (!activeProject?.id) return;
    const snapshot = JSON.stringify(projectVideoWallSnapshot);
    if (persistedSnapshotRef.current === snapshot) return;
    persistedSnapshotRef.current = snapshot;
    applyVideoWallToProject(activeProject.id, projectVideoWallSnapshot);
  }, [activeProject?.id, projectVideoWallSnapshot]);

  return (
    <div className="wm-page wm-video-wall-page" style={{ padding: 14 }}>
      <div className="wm-video-wall-lite__canvas">
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(80,145,255,0.18)",
            background:
              "linear-gradient(180deg, rgba(8,23,44,0.98) 0%, rgba(3,13,28,1) 100%)",
            padding: 14,
            boxShadow:
              "0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(214,228,255,0.62)",
                fontWeight: 800,
              }}
            >
              Quick video wall builder
            </div>
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.05,
                fontWeight: 900,
                color: "#f6fbff",
              }}
            >
              Faster wall design workflow
            </div>
            <div
              style={{
                
                fontSize: 13,
                lineHeight: 1.42,
                color: "rgba(225,235,255,0.76)",
              }}
            >
              Set the wall intent, source plan, and Bronze, Silver, or Gold design tier, then let
              Wingman propose a real WyreStorm product path with live SKUs.
            </div>
          </div>
        </div>

        <div className="wm-video-wall-lite__layout">
          <div style={{ display: "grid", gap: 6 }}>
            <SectionCard title="Wall control panel">
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(214,228,255,0.64)" }}>
                  Wall behavior
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 6 }}>
                  {(Object.entries(wallBehaviorCopy) as Array<
                    [WallBehavior, (typeof wallBehaviorCopy)[WallBehavior]]
                  >).map(([value, option]) => (
                    <ControlOption
                      key={value}
                      active={wallBehavior === value}
                      onClick={() => setWallBehavior(value)}
                      shortLabel={option.shortLabel}
                      label={option.label}
                      sublabel={option.sublabel}
                    />
                  ))}
                </div>

                {wallBehavior === "multiview" ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(214,228,255,0.64)", marginTop: 4 }}>
                      Window style
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 6 }}>
                      {(Object.entries(multiviewStyleCopy) as Array<
                        [VideoWallMultiviewStyle, (typeof multiviewStyleCopy)[VideoWallMultiviewStyle]]
                      >).map(([value, option]) => (
                        <ControlOption
                          key={value}
                          active={multiviewStyle === value}
                          onClick={() => setMultiviewStyle(value)}
                          shortLabel={option.shortLabel}
                          label={option.label}
                          sublabel={option.sublabel}
                        />
                      ))}
                    </div>
                  </>
                ) : null}

                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(214,228,255,0.64)", marginTop: 4 }}>
                  Design tier
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))",
                    gap: 6,
                  }}
                >
                  {([
                    { value: "Bronze", shortLabel: "B" },
                    { value: "Silver", shortLabel: "S" },
                    { value: "Gold", shortLabel: "G" },
                  ] as const).map((option) => (
                    <CompactTierButton
                      key={option.value}
                      active={tier === option.value}
                      onClick={() => setTier(option.value)}
                      shortLabel={option.shortLabel}
                      label={tierCopy[option.value].label}
                    />
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(214,228,255,0.64)", marginTop: 4 }}>
                  Path override
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))", gap: 6 }}>
                  {(Object.entries(pathModeCopy) as Array<
                    [VideoWallPathMode, (typeof pathModeCopy)[VideoWallPathMode]]
                  >).map(([value, option]) => (
                    <ControlOption
                      key={value}
                      active={pathMode === value}
                      onClick={() => setPathMode(value)}
                      shortLabel={option.shortLabel}
                      label={option.label}
                    />
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(214,228,255,0.64)", marginTop: 4 }}>
                  Priority
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))", gap: 6 }}>
                  {(Object.entries(performancePriorityCopy) as Array<
                    [
                      VideoWallPerformancePriority,
                      (typeof performancePriorityCopy)[VideoWallPerformancePriority],
                    ]
                  >).map(([value, option]) => (
                    <ControlOption
                      key={value}
                      active={performancePriority === value}
                      onClick={() => setPerformancePriority(value)}
                      shortLabel={option.shortLabel}
                      label={option.label}
                    />
                  ))}
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(97,162,255,0.14)",
                    background: "rgba(8,19,36,0.65)",
                    padding: "10px 12px",
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "rgba(225,235,255,0.72)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Resolved architecture
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "5px 9px", borderRadius: 999, border: "1px solid rgba(97,162,255,0.16)", background: "rgba(255,255,255,0.04)", fontWeight: 800, color: "#ffffff" }}>
                      {tierCopy[resolvedTier].label}
                    </span>
                    <span style={{ padding: "5px 9px", borderRadius: 999, border: "1px solid rgba(97,162,255,0.16)", background: "rgba(255,255,255,0.04)", color: "rgba(225,235,255,0.84)" }}>
                      {pathModeCopy[resolvedPathMode].label}
                    </span>
                    {wallBehavior === "multiview" ? (
                      <span style={{ padding: "5px 9px", borderRadius: 999, border: "1px solid rgba(97,162,255,0.16)", background: "rgba(255,255,255,0.04)", color: "rgba(225,235,255,0.84)" }}>
                        {multiviewStyleCopy[multiviewStyle].label}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    {pathMode === "auto"
                      ? "Priority steers the auto path. Pick a fixed path when you want to force the architecture."
                      : "Path override is active, so priority is advisory rather than decisive."}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Wall geometry">
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  <NumberField label="Rows" value={rows} min={1} max={8} onChange={setRows} />
                  <NumberField label="Columns" value={cols} min={1} max={8} onChange={setCols} />
                </div>

                <SelectField
                  label="Bezel preset"
                  value={bezelPreset}
                  options={[
                    { value: "none", label: "None" },
                    { value: "thin", label: "Thin" },
                    { value: "standard", label: "Standard" },
                    { value: "thick", label: "Thick" },
                  ]}
                  onChange={setBezelPreset}
                />

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(97,162,255,0.14)",
                    background: "rgba(8,19,36,0.65)",
                    padding: 10,
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: "rgba(225,235,255,0.72)",
                  }}
                >
                  {rows} x {cols} wall | {totalDisplays} displays | bezel {formatMm(bezel)}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Sources and connectivity">
              <div style={{ display: "grid", gap: 6 }}>
                <NumberField
                  label="Source devices"
                  value={displayedSourceCount}
                  min={1}
                  max={12}
                  onChange={setSourceCount}
                  disabled={quadInputSourceState}
                  helperText={
                    quadInputSourceState
                      ? "Locked to 4 because NHD-124-TX is a quad-input encoder."
                      : undefined
                  }
                />

                <SelectField
                  label="Source profile"
                  value={sourceProfile}
                  options={[
                    { value: "player", label: sourceProfileCopy.player.label },
                    { value: "matrix-feed", label: sourceProfileCopy["matrix-feed"].label },
                    { value: "direct-hdmi", label: sourceProfileCopy["direct-hdmi"].label },
                    { value: "camera", label: sourceProfileCopy.camera.label },
                    { value: "mixed", label: sourceProfileCopy.mixed.label },
                  ]}
                  onChange={setSourceProfile}
                />

                <SelectField
                  label="Source landing"
                  value={sourceLandingStyle}
                  options={[
                    { value: "standard", label: sourceLandingCopy.standard.label },
                    { value: "wallplate", label: sourceLandingCopy.wallplate.label },
                  ]}
                  onChange={setSourceLandingStyle}
                />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                  <ControlOption
                    active={requiresDanteAudio}
                    onClick={() => setRequiresDanteAudio((value) => !value)}
                    shortLabel="D"
                    label="Dante / AES67"
                    sublabel="Only pick networked audio when the brief actually needs it."
                  />
                  <ControlOption
                    active={requiresUsbKvmLink}
                    onClick={() => setRequiresUsbKvmLink((value) => !value)}
                    shortLabel="USB"
                    label="USB / KVM"
                    sublabel="Push 500-series paths from 500-E to full TX/RX when needed."
                  />
                </div>

                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(97,162,255,0.14)",
                    background: "rgba(8,19,36,0.65)",
                    padding: "10px 12px",
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "rgba(225,235,255,0.72)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Effective wall ingress
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
                    {wallIngressCount} sources
                  </div>
                  <div>{sourceProfileCopy[sourceProfile].sublabel}</div>
                  <div>{sourceLandingCopy[sourceLandingStyle].sublabel}</div>
                </div>

                {minimumRecommendedSourceCount > 1 && !quadInputSourceState ? (
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.14)",
                      background: "rgba(8,19,36,0.65)",
                      padding: "10px 12px",
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "rgba(225,235,255,0.72)",
                    }}
                  >
                    <strong style={{ color: "#f5f9ff" }}>NHD-124-TX</strong> resolves to {minimumRecommendedSourceCount} source inputs in one box, so the wall ingress is raised automatically for this path.
                  </div>
                ) : null}

                {sourceProfile === "matrix-feed" && sourceCount > 1 ? (
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.14)",
                      background: "rgba(8,19,36,0.65)",
                      padding: "10px 12px",
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "rgba(225,235,255,0.72)",
                    }}
                  >
                    Upstream switching collapses {sourceCount} sources into <strong style={{ color: "#f5f9ff" }}>1 prepared wall feed</strong> before the wall path begins.
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <SectionCard title="Resolved solution">
              <div style={{ display: "grid", gap: 14 }}>
                <div className="wm-video-wall-lite__decisionGrid">
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.16)",
                      background: "rgba(8,19,36,0.62)",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.75)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Selected fit
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(145,205,255,0.22)", background: "rgba(8,19,36,0.42)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(218,234,255,0.82)" }}>
                        {tierCopy[resolvedTier].label}
                      </span>
                      <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(145,205,255,0.22)", background: "rgba(8,19,36,0.42)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(218,234,255,0.82)" }}>
                        {pathModeCopy[resolvedPathMode].label}
                      </span>
                      <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(145,205,255,0.22)", background: "rgba(8,19,36,0.42)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(218,234,255,0.82)" }}>
                        {recommendation.windowModeSummary}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(225,235,255,0.74)" }}>
                      {recommendation.transportSummary}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(214,228,255,0.68)" }}>
                      {recommendation.performanceSummary}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(124,191,255,0.3)",
                      background:
                        "linear-gradient(180deg, rgba(18,52,94,0.72) 0%, rgba(10,28,54,0.82) 100%)",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.75)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Recommended path
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#ffffff" }}>
                      {recommendation.title}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>
                      {recommendation.product}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(201,227,255,0.75)", fontWeight: 700 }}>
                      {recommendation.architecture}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(233,240,255,0.86)" }}>
                      {recommendation.reason}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(218,234,255,0.72)" }}>
                      {designState.summary}
                    </div>
                  </div>
                </div>

                <div
                  className="wm-video-wall-lite__previewPanel"
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        label: "Canvas",
                        value:
                          wallBehavior === "addressed-panels"
                            ? `${rows} x ${cols} panels`
                            : wallBehavior === "multiview"
                              ? multiviewStyleCopy[multiviewStyle].label
                              : "Single wall feed",
                      },
                      {
                        label: "Content",
                        value:
                          wallBehavior === "multiview"
                            ? `${displayedSourceCount} sources on wall`
                            : `${Math.max(1, displayedSourceCount)} source${displayedSourceCount === 1 ? "" : "s"}`,
                      },
                      {
                        label: "Ingress",
                        value:
                          wallIngressCount === 1
                            ? "1 prepared feed"
                            : `${wallIngressCount} wall inputs`,
                      },
                      {
                        label: "Endpoints",
                        value:
                          buildMethod === "per-display"
                            ? `${totalDisplays} ${resolvedPathMode === "sdvoe-600" ? "TRX" : "RX"}`
                            : "1 wall output",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(97,162,255,0.14)",
                          background: "rgba(8,19,36,0.58)",
                          padding: "10px 12px",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(201,227,255,0.66)",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="wm-video-wall-lite__previewSurface"
                    style={{
                      width: "min(100%, 760px)",
                      aspectRatio: `${cols * 16} / ${rows * 9}`,
                      position: "relative",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "rgba(9,12,18,0.95)",
                      boxShadow:
                        "0 20px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                      }}
                    >
                      {Array.from({ length: totalDisplays }).map((_, index) => (
                        <div
                          key={index}
                          style={{
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                            background:
                              "linear-gradient(180deg, rgba(18,20,28,1) 0%, rgba(9,10,15,1) 100%)",
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ position: "absolute", inset: 0 }}>
                      <PreviewOverlay
                        goal={goal}
                        buildMethod={buildMethod}
                        wallBehavior={wallBehavior}
                        multiviewStyle={multiviewStyle}
                        pathMode={resolvedPathMode}
                        rows={rows}
                        cols={cols}
                        contentSourceCount={Math.max(1, displayedSourceCount)}
                        ingressCount={Math.max(1, wallIngressCount)}
                      />
                    </div>
                  </div>
                </div>

                <div className="wm-video-wall-lite__detailGrid" style={{ alignItems: "start" }}>
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Path fit
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>
                      {designState.label}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(233,240,255,0.84)" }}>
                      {designState.summary}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Source strategy
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(233,240,255,0.84)" }}>
                      {recommendation.sourceSummary}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Capability fit
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(233,240,255,0.84)" }}>
                      {recommendation.windowModeSummary}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(218,234,255,0.74)" }}>
                      {recommendation.transportSummary}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(218,234,255,0.74)" }}>
                      {recommendation.performanceSummary}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(218,234,255,0.74)" }}>
                      {recommendation.engineeringSummary}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Starter BOM
                    </div>
                    {(recommendation?.bom ?? []).map((line, index) => (
                      <div key={`${line.sku}-${index}`} style={{ display: "grid", gap: 2 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>{line.sku}</div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>Qty {line.qty}</div>
                        </div>
                        {line.note ? (
                          <div style={{ fontSize: 12, lineHeight: 1.4, color: "rgba(201,227,255,0.68)" }}>
                            {line.note}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Guardrails
                    </div>
                    {(designState?.guardrails ?? []).map((guardrail, index) => (
                      <div
                        key={`${designState.label}-${index}`}
                        style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(218,234,255,0.74)" }}
                      >
                        {guardrail}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
