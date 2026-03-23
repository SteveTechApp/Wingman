import React, { useMemo, useState } from "react";

import "@/features/misc/videoWall/videoWallPlannerPage.css";
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
type DetailTabKey = "overview" | "bom" | "signal" | "moreInfo";
type PreviewMode = "canvas" | "signal";

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

const architectureGuidance: Record<
  Exclude<VideoWallPathMode, "auto">,
  { title: string; summary: string; bestFor: string }
> = {
  "local-processor": {
    title: "Local processor wall",
    summary: "Dedicated HDMI wall processor path for fixed-format layouts without a full AV network.",
    bestFor: "Close-range, fixed-layout walls where simplicity matters more than scale.",
  },
  "networkhd-120": {
    title: "120-series wall",
    summary: "Entry 1Gb NetworkHD architecture focused on value and straightforward wall canvases.",
    bestFor: "Budget-led multi-display jobs that still need network flexibility.",
  },
  "networkhd-500": {
    title: "500-series wall",
    summary: "Higher-spec 1Gb path with stronger image handling and optional USB-driven workflows.",
    bestFor: "Mixed-source walls where image quality and feature depth both matter.",
  },
  "sdvoe-600": {
    title: "600-series SDVoE wall",
    summary: "Premium 10Gb SDVoE path when latency, sync, and picture quality lead the brief.",
    bestFor: "High-pressure control, broadcast-adjacent, or flagship experience walls.",
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
      aria-pressed={props.active}
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
      aria-pressed={props.active}
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
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: props.active ? "rgba(243,248,255,0.96)" : "rgba(201,227,255,0.72)",
        }}
      >
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
        onChange={(e) =>
          props.onChange(clamp(Number(e.target.value) || props.value, props.min, props.max))
        }
        style={{
          borderRadius: 12,
          border: props.disabled
            ? "1px solid rgba(97,162,255,0.12)"
            : "1px solid rgba(97,162,255,0.18)",
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
  showLabels?: boolean;
}) {
  const accentMap: Record<VideoWallPathMode, string> = {
    auto: "rgba(145,205,255,0.55)",
    "local-processor": "rgba(255,196,118,0.58)",
    "networkhd-120": "rgba(120,199,255,0.6)",
    "networkhd-500": "rgba(103,229,208,0.6)",
    "sdvoe-600": "rgba(104,214,255,0.65)",
  };
  const accent = accentMap[props.pathMode];
  const showLabels = props.showLabels ?? true;
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
      {showLabels ? (
        <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
          <span>{label}</span>
          {detail ? <span style={detailText}>{detail}</span> : null}
        </div>
      ) : (
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accent,
            boxShadow: `0 0 24px ${accent}`,
          }}
        />
      )}
    </div>
  );

  const badges = showLabels ? (
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
        label={props.buildMethod === "per-display" ? `${props.rows * props.cols} out` : "1 feed"}
        accent={accent}
      />
    </>
  ) : null;

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
            {showLabels ? (
              <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
                <span>{r * props.cols + c + 1}</span>
                <span style={detailText}>{endpointLabel}</span>
              </div>
            ) : (
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: accent,
                  boxShadow: `0 0 24px ${accent}`,
                }}
              />
            )}
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
        {renderFrame(
          "Wall feed",
          props.ingressCount === 1 ? "Prepared output" : `${props.ingressCount} inputs`,
          { inset: "8%" },
          "primary",
        )}
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
    const floatingCount = clamp(
      props.contentSourceCount,
      1,
      props.pathMode === "networkhd-500" ? 4 : 6,
    );
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
        {renderFrame(
          "Main",
          "Floating canvas",
          { left: "8%", top: "10%", width: "58%", height: "64%" },
          "primary",
        )}
        {overlayRects.slice(0, Math.max(0, floatingCount - 1)).map((rect, index) =>
          renderFrame(`Pin ${index + 1}`, "Overlay", { ...rect, zIndex: 2 + index }),
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
          { ...rect, zIndex: 1 },
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

function RecommendationPill(props: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="wm-vw-pill">
      <div className="wm-vw-pill__label">{props.label}</div>
      <div className="wm-vw-pill__value">{props.value}</div>
      {props.detail ? <div className="wm-vw-pill__detail">{props.detail}</div> : null}
    </div>
  );
}

function DetailTabButton(props: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={`wm-vw-tabButton${props.active ? " is-active" : ""}`}
    >
      {props.label}
    </button>
  );
}

function PreviewModeToggle(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      disabled={props.disabled}
      className={`wm-vw-toggle${props.active ? " is-active" : ""}`}
    >
      {props.label}
    </button>
  );
}

function InsightCard(props: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`wm-vw-detailCard${props.className ? ` ${props.className}` : ""}`}>
      <div className="wm-vw-detailCard__title">{props.title}</div>
      <div className="wm-vw-detailCard__body">{props.children}</div>
    </div>
  );
}

function SignalStageCard(props: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="wm-vw-signalStep">
      <div className="wm-vw-signalStep__title">{props.title}</div>
      <div className="wm-vw-signalStep__value">{props.value}</div>
      <div className="wm-vw-signalStep__detail">{props.detail}</div>
    </div>
  );
}

export default function VideoWallPlannerRebuild() {
  const [activeTab, setActiveTab] = useState<DetailTabKey>("overview");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("canvas");
  const [showPreviewLabels, setShowPreviewLabels] = useState(true);
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

  const recommendation = useMemo(
    () =>
      buildVideoWallRecommendation({
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
      }),
    [
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
    ],
  );

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
      sourceLandingStyle,
      sourceProfile,
      totalDisplays,
      wallIngressCount,
    ],
  );

  React.useEffect(() => {
    if (!activeProject?.id) return;
    const snapshot = JSON.stringify(projectVideoWallSnapshot);
    if (persistedSnapshotRef.current === snapshot) return;
    persistedSnapshotRef.current = snapshot;
    applyVideoWallToProject(activeProject.id, projectVideoWallSnapshot);
  }, [activeProject?.id, projectVideoWallSnapshot]);

  const endpointLabel = resolvedPathMode === "sdvoe-600" ? "TRX" : "RX";
  const projectSyncLabel = activeProject?.id ? "Active project sync" : "Standalone planning";
  const projectSyncDetail = activeProject?.id
    ? "Every change on this page is written back into the active project."
    : "No active project is open, so this planner is running as a standalone workspace.";
  const addonSummary = requiresDanteAudio && requiresUsbKvmLink
    ? "Dante + USB/KVM"
    : requiresDanteAudio
      ? "Dante / AES67"
      : requiresUsbKvmLink
        ? "USB / KVM"
        : "Standard AV";
  const wallFormatSummary = `${rows} x ${cols} layout with ${totalDisplays} display${totalDisplays === 1 ? "" : "s"}`;
  const endpointSummary =
    buildMethod === "per-display"
      ? `${totalDisplays} ${endpointLabel} endpoint${totalDisplays === 1 ? "" : "s"}`
      : "1 shared wall output";
  const selectionPills = [
    wallBehaviorCopy[wallBehavior].label,
    wallBehavior === "multiview" ? multiviewStyleCopy[multiviewStyle].label : null,
    pathModeCopy[resolvedPathMode].label,
    addonSummary,
  ].filter((value): value is string => Boolean(value));
  const heroPills = [
    {
      label: "Resolved tier",
      value: tierCopy[resolvedTier].label,
      detail: tierCopy[resolvedTier].sublabel,
    },
    {
      label: "Wall format",
      value: `${rows} x ${cols}`,
      detail: `${totalDisplays} display${totalDisplays === 1 ? "" : "s"} with ${formatMm(bezel)} bezels`,
    },
    {
      label: "Ingress",
      value: wallIngressCount === 1 ? "1 wall input" : `${wallIngressCount} wall inputs`,
      detail: sourceProfileCopy[sourceProfile].label,
    },
    {
      label: "Project mode",
      value: projectSyncLabel,
      detail: projectSyncDetail,
    },
  ];
  const workspacePills = [
    {
      label: "Path fit",
      value: designState.label,
      detail: recommendation.architecture,
    },
    {
      label: "Window mode",
      value: recommendation.windowModeSummary,
      detail: recommendation.performanceSummary,
    },
    {
      label: "Drive strategy",
      value: endpointSummary,
      detail:
        buildMethod === "per-display"
          ? "One decoder or TRX sits behind each panel."
          : "A processor or prepared wall feed drives the entire canvas.",
    },
    {
      label: "Add-ons",
      value: addonSummary,
      detail: sourceLandingCopy[sourceLandingStyle].label,
    },
  ];
  const designSnapshotPills = [
    {
      label: "Wall format",
      value: `${rows} x ${cols}`,
      detail: wallBehaviorCopy[wallBehavior].label,
    },
    {
      label: "Outputs",
      value: endpointSummary,
      detail: pathModeCopy[resolvedPathMode].label,
    },
    {
      label: "Sources",
      value:
        displayedSourceCount === 1
          ? "1 live source"
          : `${displayedSourceCount} live sources`,
      detail: sourceProfileCopy[sourceProfile].label,
    },
    {
      label: "Add-ons",
      value: addonSummary,
      detail: recommendation.windowModeSummary,
    },
  ];
  const recommendationReasons = [
    recommendation.reason,
    recommendation.sourceSummary,
    recommendation.transportSummary,
  ];
  const mountingNotes = [
    designState.summary,
    recommendation.transportSummary,
    recommendation.performanceSummary,
    recommendation.sourceSummary,
    recommendation.engineeringSummary,
  ].filter((note) => Boolean(note));
  const signalStages = [
    {
      title: "Sources",
      value:
        displayedSourceCount === 1 ? "1 source" : `${displayedSourceCount} sources`,
      detail: sourceProfileCopy[sourceProfile].sublabel,
    },
    {
      title: "Ingress",
      value: wallIngressCount === 1 ? "1 wall feed" : `${wallIngressCount} wall feeds`,
      detail: sourceLandingCopy[sourceLandingStyle].sublabel,
    },
    {
      title: "Transport",
      value: recommendation.product,
      detail: recommendation.architecture,
    },
    {
      title: "Outputs",
      value: endpointSummary,
      detail:
        buildMethod === "per-display"
          ? `${endpointLabel} behind each display`
          : "Single processor-led canvas output",
    },
  ];
  const bomLines = recommendation?.bom ?? [];
  const bomUnitCount = bomLines.reduce((sum, line) => sum + line.qty, 0);
  const hasBom = bomLines.length > 0;
  const bomPreviewLines = bomLines.slice(0, 6);
  const bomOverflowCount = Math.max(0, bomLines.length - bomPreviewLines.length);
  const architectureAlternatives = useMemo(
    () =>
      (
        Object.entries(architectureGuidance) as Array<
          [Exclude<VideoWallPathMode, "auto">, (typeof architectureGuidance)[Exclude<VideoWallPathMode, "auto">]]
        >
      )
        .filter(([key]) => key !== resolvedPathMode)
        .slice(0, 3)
        .map(([key, item]) => ({
          key,
          title: item.title,
          label: pathModeCopy[key].label,
          summary: item.summary,
          bestFor: item.bestFor,
        })),
    [resolvedPathMode],
  );
  const compactAlternatives = architectureAlternatives.slice(0, 2);

  let tabContent: React.ReactNode;

  if (activeTab === "bom") {
    tabContent = (
      <div className="wm-vw-tabGrid">
        <InsightCard title="Starter BOM" className="wm-vw-detailCard--span-2">
          {bomLines.length > 0 ? (
            <>
              <div className="wm-vw-bomSummary">
                {bomLines.length} line item{bomLines.length === 1 ? "" : "s"} and {bomUnitCount} total unit{bomUnitCount === 1 ? "" : "s"}.
              </div>
              <div className="wm-vw-bomList">
                {bomLines.map((line, index) => (
                  <div key={`${line.sku}-${index}`} className="wm-vw-bomRow">
                    <div className="wm-vw-bomRow__main">
                      <div className="wm-vw-bomRow__sku">{line.sku}</div>
                      <div className="wm-vw-bomRow__role">{line.role}</div>
                    </div>
                    <div className="wm-vw-bomRow__qty">Qty {line.qty}</div>
                    {line.note ? <div className="wm-vw-bomRow__note">{line.note}</div> : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="wm-vw-emptyState">
              The current path does not expose a starter BOM yet.
            </div>
          )}
        </InsightCard>
        <InsightCard title="Procurement note">
          <p>{recommendation.reason}</p>
          <p>Validate mounting, containment, and the final source schedule before pricing is issued.</p>
        </InsightCard>
        <InsightCard title="Delivery focus">
          <p>{recommendation.engineeringSummary}</p>
        </InsightCard>
      </div>
    );
  } else if (activeTab === "signal") {
    tabContent = (
      <div className="wm-vw-tabGrid">
        <InsightCard title="Signal route" className="wm-vw-detailCard--span-2">
          <div className="wm-vw-signalFlow">
            {signalStages.map((stage, index) => (
              <React.Fragment key={stage.title}>
                <SignalStageCard {...stage} />
                {index < signalStages.length - 1 ? <div className="wm-vw-signalArrow">→</div> : null}
              </React.Fragment>
            ))}
          </div>
        </InsightCard>
        <InsightCard title="Ingress behavior">
          <p>
            {sourceProfile === "matrix-feed" && sourceCount > 1
              ? `Upstream switching collapses ${sourceCount} sources into one prepared wall feed before the wall path starts.`
              : sourceProfileCopy[sourceProfile].sublabel}
          </p>
          <p>{sourceLandingCopy[sourceLandingStyle].sublabel}</p>
        </InsightCard>
        <InsightCard title="Output behavior">
          <p>
            {buildMethod === "per-display"
              ? `Each display receives its own ${endpointLabel} endpoint, which is the simplest way to keep a large wall aligned panel by panel.`
              : "The wall is treated as one shared canvas, so the output side stays much simpler for fixed wall feeds."}
          </p>
        </InsightCard>
      </div>
    );
  } else if (activeTab === "moreInfo") {
    tabContent = (
      <div className="wm-vw-tabGrid">
        <InsightCard title="Why this path fits">
          <div className="wm-vw-list">
            {recommendationReasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="wm-vw-listItem">
                {reason}
              </div>
            ))}
          </div>
        </InsightCard>
        <InsightCard title="Engineering notes" className="wm-vw-detailCard--span-2">
          <div className="wm-vw-list">
            {mountingNotes.map((note, index) => (
              <div key={`${note}-${index}`} className="wm-vw-listItem">
                {note}
              </div>
            ))}
          </div>
        </InsightCard>
        <InsightCard title="Guardrails">
          <div className="wm-vw-list">
            {designState.guardrails.map((guardrail, index) => (
              <div key={`${guardrail}-${index}`} className="wm-vw-listItem">
                {guardrail}
              </div>
            ))}
          </div>
        </InsightCard>
        <InsightCard title="Alternative paths" className="wm-vw-detailCard--span-2">
          <div className="wm-vw-altGrid">
            {architectureAlternatives.map((item) => (
              <div key={item.key} className="wm-vw-altCard">
                <div className="wm-vw-altCard__label">{item.label}</div>
                <div className="wm-vw-altCard__title">{item.title}</div>
                <div className="wm-vw-altCard__summary">{item.summary}</div>
                <div className="wm-vw-altCard__bestFor">Best for: {item.bestFor}</div>
              </div>
            ))}
          </div>
        </InsightCard>
      </div>
    );
  } else {
    tabContent = (
      <div className="wm-vw-tabGrid">
        <InsightCard title="Selected fit">
          <p>{designState.summary}</p>
          <p>{recommendation.customerSummary}</p>
        </InsightCard>
        <InsightCard title="Source strategy">
          <p>{recommendation.sourceSummary}</p>
          <p>{wallFormatSummary}</p>
        </InsightCard>
        <InsightCard title="Transport path">
          <p>{recommendation.transportSummary}</p>
          <p>{recommendation.performanceSummary}</p>
        </InsightCard>
        <InsightCard title="Wall behavior">
          <p>{wallBehaviorCopy[wallBehavior].sublabel}</p>
          {wallBehavior === "multiview" ? (
            <p>{multiviewStyleCopy[multiviewStyle].sublabel}</p>
          ) : null}
        </InsightCard>
      </div>
    );
  }

  return (
    <div className="wm-page wm-video-wall-page wm-vw-page">
      <div className="wm-vw-page__inner">
        <section className="wm-vw-hero">
          <div className="wm-vw-hero__copy">
            <div className="wm-vw-eyebrow">Video wall planner</div>
            <h1 className="wm-vw-hero__title">Design the wall first, then lock the transport.</h1>
            <p className="wm-vw-hero__summary">{recommendation.customerSummary}</p>
            <p className="wm-vw-hero__summary wm-vw-hero__summary--muted">
              Tune the wall intent, source strategy, and performance target on the left. Wingman keeps the recommendation live while you work.
            </p>
            <div className="wm-vw-chipRow">
              {selectionPills.map((pill) => (
                <span key={pill} className="wm-vw-chip">
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="wm-vw-pillGrid">
            {heroPills.map((item) => (
              <RecommendationPill
                key={item.label}
                label={item.label}
                value={item.value}
                detail={item.detail}
              />
            ))}
          </div>
        </section>

        <div className="wm-vw-shell">
          <aside className="wm-vw-sidebar">
            <div className="wm-vw-sidebar__sticky">
              <SectionCard title="1. Wall intent">
                <div className="wm-vw-panelStack">
                  <div className="wm-vw-panelLead">
                    Pick how the wall behaves before worrying about hardware.
                  </div>
                  <div className="wm-vw-optionGrid">
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
                      <div className="wm-vw-subheading">Window style</div>
                      <div className="wm-vw-optionGrid">
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

                  <div className="wm-vw-subheading">Design tier</div>
                  <div className="wm-vw-tierGrid">
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
                </div>
              </SectionCard>

              <SectionCard title="2. Wall geometry">
                <div className="wm-vw-panelStack">
                  <div className="wm-vw-panelLead">
                    Keep the physical wall definition simple and visible.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
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
                  <div className="wm-vw-note">
                    <strong>{wallFormatSummary}</strong>
                    <span>Bezel allowance: {formatMm(bezel)}</span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="3. Sources and features">
                <div className="wm-vw-panelStack">
                  <div className="wm-vw-panelLead">
                    Capture what is feeding the wall and which extras the brief really needs.
                  </div>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                    <ControlOption
                      active={requiresDanteAudio}
                      onClick={() => setRequiresDanteAudio((value) => !value)}
                      shortLabel="D"
                      label="Dante / AES67"
                      sublabel="Only enable networked audio when it is genuinely in scope."
                    />
                    <ControlOption
                      active={requiresUsbKvmLink}
                      onClick={() => setRequiresUsbKvmLink((value) => !value)}
                      shortLabel="USB"
                      label="USB / KVM"
                      sublabel="Use when operators or sources need routed USB alongside video."
                    />
                  </div>
                  <div className="wm-vw-note">
                    <strong>
                      Effective wall ingress: {wallIngressCount === 1 ? "1 feed" : `${wallIngressCount} feeds`}
                    </strong>
                    <span>{sourceProfileCopy[sourceProfile].sublabel}</span>
                    <span>{sourceLandingCopy[sourceLandingStyle].sublabel}</span>
                  </div>
                  {minimumRecommendedSourceCount > 1 && !quadInputSourceState ? (
                    <div className="wm-vw-note wm-vw-note--highlight">
                      <strong>NHD-124-TX can consolidate the front end.</strong>
                      <span>
                        This path raises the recommended ingress to {minimumRecommendedSourceCount} source inputs in one encoder.
                      </span>
                    </div>
                  ) : null}
                  {sourceProfile === "matrix-feed" && sourceCount > 1 ? (
                    <div className="wm-vw-note">
                      <strong>Prepared wall feed active.</strong>
                      <span>
                        Upstream switching collapses {sourceCount} sources into one prepared wall feed before the wall path begins.
                      </span>
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard title="4. Transport tuning">
                <div className="wm-vw-panelStack">
                  <div className="wm-vw-panelLead">
                    Stay on Auto unless the brief really needs a forced architecture.
                  </div>
                  <div className="wm-vw-subheading">Path override</div>
                  <div className="wm-vw-optionGrid wm-vw-optionGrid--compact">
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
                  <div className="wm-vw-subheading">Priority</div>
                  <div className="wm-vw-optionGrid wm-vw-optionGrid--compact">
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
                  <div className="wm-vw-note wm-vw-note--accent">
                    <strong>Resolved architecture: {pathModeCopy[resolvedPathMode].label}</strong>
                    <span>{recommendation.transportSummary}</span>
                    <span>
                      {pathMode === "auto"
                        ? "Priority steers the auto path. Force a path only when the brief has already committed to it."
                        : "A manual path override is active, so priority is now advisory."}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </aside>
          <main className="wm-vw-main">
            <section className="wm-vw-spotlight">
              <div className="wm-vw-spotlight__hero">
                <div className="wm-vw-eyebrow">Recommendation spotlight</div>
                <h2 className="wm-vw-spotlight__title">{recommendation.title}</h2>
                <div className="wm-vw-spotlight__product">{recommendation.product}</div>
                <p className="wm-vw-spotlight__summary">{recommendation.customerSummary}</p>
                <div className="wm-vw-chipRow">
                  <span className="wm-vw-chip">{tierCopy[resolvedTier].label}</span>
                  <span className="wm-vw-chip">{pathModeCopy[resolvedPathMode].label}</span>
                  <span className="wm-vw-chip">{recommendation.windowModeSummary}</span>
                </div>
              </div>

              <div className="wm-vw-spotlight__aside">
                <div className="wm-vw-spotlight__reason">
                  <div className="wm-vw-spotlight__reasonLabel">Why this path fits</div>
                  <div className="wm-vw-spotlight__reasonBody">{recommendation.reason}</div>
                </div>
                <div className="wm-vw-pillGrid wm-vw-pillGrid--tight">
                  {workspacePills.map((item) => (
                    <RecommendationPill
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      detail={item.detail}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="wm-vw-priorityGrid">
              <SectionCard title="Starter BOM" style={{ height: "100%" }}>
                <div className="wm-vw-priorityCard">
                  <div className="wm-vw-priorityCard__header">
                    <div className="wm-vw-priorityCard__copy">
                      <div className="wm-vw-priorityCard__title">
                        {hasBom
                          ? `${bomLines.length} line item${bomLines.length === 1 ? "" : "s"} and ${bomUnitCount} total unit${bomUnitCount === 1 ? "" : "s"}.`
                          : "No starter BOM exposed for this path yet."}
                      </div>
                      <div className="wm-vw-priorityCard__summary">
                        {hasBom
                          ? "Keep the priceable stack visible while you validate the wall behavior and transport."
                          : "Use the supporting detail below to review the engineering path before pricing is committed."}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="wm-vw-linkButton"
                      onClick={() => setActiveTab("bom")}
                    >
                      Open BOM details
                    </button>
                  </div>

                  {hasBom ? (
                    <div className="wm-vw-bomList wm-vw-bomList--priority">
                      {bomPreviewLines.map((line, index) => (
                        <div key={`${line.sku}-${index}`} className="wm-vw-bomRow">
                          <div className="wm-vw-bomRow__main">
                            <div className="wm-vw-bomRow__sku">{line.sku}</div>
                            <div className="wm-vw-bomRow__role">{line.role}</div>
                          </div>
                          <div className="wm-vw-bomRow__qty">Qty {line.qty}</div>
                          {line.note ? <div className="wm-vw-bomRow__note">{line.note}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="wm-vw-emptyState">
                      The current path does not expose a starter BOM yet.
                    </div>
                  )}

                  {bomOverflowCount > 0 ? (
                    <div className="wm-vw-miniBom__more">
                      + {bomOverflowCount} more line item{bomOverflowCount === 1 ? "" : "s"} in BOM details
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <div className="wm-vw-priorityStack">
                <SectionCard title="Design snapshot">
                  <div className="wm-vw-panelStack">
                    <div className="wm-vw-pillGrid wm-vw-pillGrid--tight">
                      {designSnapshotPills.map((item) => (
                        <RecommendationPill
                          key={item.label}
                          label={item.label}
                          value={item.value}
                          detail={item.detail}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="wm-vw-linkButton"
                      onClick={() => setActiveTab("moreInfo")}
                    >
                      Open more information
                    </button>
                  </div>
                </SectionCard>
              </div>
            </section>

            <section className="wm-vw-workspace">
              <div className="wm-vw-workspace__header">
                <div>
                  <div className="wm-vw-eyebrow">Visual validation</div>
                  <h3 className="wm-vw-workspace__title">Validate the wall shape and route after the BOM is set.</h3>
                  <p className="wm-vw-workspace__summary">
                    Use the canvas and signal views to check the chosen path, not to hunt for the core answer.
                  </p>
                </div>
                <div className="wm-vw-toolbar">
                  <PreviewModeToggle
                    active={previewMode === "canvas"}
                    onClick={() => setPreviewMode("canvas")}
                    label="Canvas"
                  />
                  <PreviewModeToggle
                    active={previewMode === "signal"}
                    onClick={() => setPreviewMode("signal")}
                    label="Signal"
                  />
                  <PreviewModeToggle
                    active={showPreviewLabels}
                    onClick={() => setShowPreviewLabels((value) => !value)}
                    label={showPreviewLabels ? "Labels on" : "Labels off"}
                    disabled={previewMode !== "canvas"}
                  />
                </div>
              </div>

              <div className="wm-vw-workspace__body">
                <div className="wm-vw-previewPanel">
                  <div className="wm-vw-pillGrid wm-vw-pillGrid--tight">
                    {[
                      {
                        label: "Canvas",
                        value:
                          wallBehavior === "addressed-panels"
                            ? `${rows} x ${cols} panels`
                            : wallBehavior === "multiview"
                              ? multiviewStyleCopy[multiviewStyle].label
                              : "Single wall feed",
                        detail: wallBehaviorCopy[wallBehavior].sublabel,
                      },
                      {
                        label: "Content",
                        value:
                          wallBehavior === "multiview"
                            ? `${displayedSourceCount} live windows`
                            : `${Math.max(1, displayedSourceCount)} source${displayedSourceCount === 1 ? "" : "s"}`,
                        detail: recommendation.sourceSummary,
                      },
                      {
                        label: "Transport",
                        value: pathModeCopy[resolvedPathMode].label,
                        detail: recommendation.architecture,
                      },
                      {
                        label: "Endpoints",
                        value: endpointSummary,
                        detail: recommendation.windowModeSummary,
                      },
                    ].map((item) => (
                      <RecommendationPill
                        key={item.label}
                        label={item.label}
                        value={item.value}
                        detail={item.detail}
                      />
                    ))}
                  </div>

                  {previewMode === "canvas" ? (
                    <div className="wm-vw-previewSurfaceWrap">
                      <div
                        className="wm-vw-previewSurface"
                        style={{ aspectRatio: `${cols * 16} / ${rows * 9}` }}
                      >
                        <div
                          className="wm-vw-previewSurface__grid"
                          style={{
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                          }}
                        >
                          {Array.from({ length: totalDisplays }).map((_, index) => (
                            <div key={index} className="wm-vw-previewSurface__cell" />
                          ))}
                        </div>
                        <div className="wm-vw-previewSurface__overlay">
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
                            showLabels={showPreviewLabels}
                          />
                        </div>
                      </div>
                      <div className="wm-vw-previewCaption">
                        Physical grid shown as {rows} x {cols} with bezel allowance set to {formatMm(bezel)}.
                      </div>
                    </div>
                  ) : (
                    <div className="wm-vw-signalCanvas">
                      <div className="wm-vw-signalFlow">
                        {signalStages.map((stage, index) => (
                          <React.Fragment key={stage.title}>
                            <SignalStageCard {...stage} />
                            {index < signalStages.length - 1 ? <div className="wm-vw-signalArrow">→</div> : null}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="wm-vw-previewCaption">
                        {buildMethod === "per-display"
                          ? `Per-display addressing means the wall finishes with ${totalDisplays} independent ${endpointLabel} legs.`
                          : "Processor-led mode keeps the output side simpler by treating the wall as one destination canvas."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="wm-vw-tabPanel">
              <div className="wm-vw-tabPanel__header">
                <div>
                  <div className="wm-vw-eyebrow">Supporting detail</div>
                  <h3 className="wm-vw-tabPanel__title">Keep BOM, signal, and more information below the main design decision.</h3>
                </div>
                <div className="wm-vw-tabBar" role="tablist" aria-label="Video wall detail tabs">
                  <DetailTabButton
                    active={activeTab === "overview"}
                    onClick={() => setActiveTab("overview")}
                    label="Overview"
                  />
                  <DetailTabButton
                    active={activeTab === "bom"}
                    onClick={() => setActiveTab("bom")}
                    label="BOM"
                  />
                  <DetailTabButton
                    active={activeTab === "signal"}
                    onClick={() => setActiveTab("signal")}
                    label="Signal"
                  />
                  <DetailTabButton
                    active={activeTab === "moreInfo"}
                    onClick={() => setActiveTab("moreInfo")}
                    label="More information"
                  />
                </div>
              </div>
              <div className="wm-vw-tabPanel__lead">
                {compactAlternatives.map((item) => (
                  <div key={item.key} className="wm-vw-altCard wm-vw-altCard--compact">
                    <div className="wm-vw-altCard__label">{item.label}</div>
                    <div className="wm-vw-altCard__title">{item.title}</div>
                    <div className="wm-vw-altCard__summary">{item.bestFor}</div>
                  </div>
                ))}
              </div>
              <div className="wm-vw-tabPanel__body">{tabContent}</div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
