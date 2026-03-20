import React, { useMemo, useState } from "react";

import { findRecommendationCatalogItemBySku } from "@/catalog/recommendationCatalog";
import {
  getTierSkusForFamily,
  type SolutionRecommendationTier,
} from "@/catalog/serviceRecommendations";

type WallGoal = "single" | "grid" | "pip" | "custom";
type BuildMethod = "tile-mode" | "per-display";
type BezelPreset = "none" | "thin" | "standard" | "thick";
type SourceProfile = "player" | "matrix-feed" | "direct-hdmi" | "mixed";

type BomLine = {
  sku: string;
  qty: number;
  note?: string;
};

type Recommendation = {
  title: string;
  architecture: string;
  product: string;
  reason: string;
  bom: BomLine[];
  sourceSummary: string;
  customerSummary: string;
  engineeringSummary: string;
};

const bezelValues: Record<BezelPreset, number> = {
  none: 0,
  thin: 4,
  standard: 8,
  thick: 14,
};

const tierCopy: Record<
  SolutionRecommendationTier,
  { label: string; sublabel: string }
> = {
  Bronze: {
    label: "Bronze",
    sublabel: "Lean wall design using the entry-level processor or NetworkHD path.",
  },
  Silver: {
    label: "Silver",
    sublabel: "Balanced wall design for day-to-day commercial installs.",
  },
  Gold: {
    label: "Gold",
    sublabel: "Highest flexibility for demanding walls, multiview, and premium control.",
  },
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
  mixed: {
    label: "Mixed source set",
    sublabel: "A blend of source types with more flexible staging or switching.",
  },
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatMm(value: number): string {
  return `${Math.round(value)} mm`;
}

function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function firstAvailableSku(candidates: string[], fallback: string): string {
  for (const candidate of candidates) {
    if (findRecommendationCatalogItemBySku(candidate)) return candidate;
  }

  return candidates[0] || fallback;
}

function findSkuByPattern(
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

function createBomLine(sku: string, qty: number, note?: string): BomLine {
  const description = describeSku(sku);
  const fullNote = [note, description].filter(Boolean).join(" ");
  return {
    sku,
    qty,
    note: fullNote || undefined,
  };
}

function getProcessorSku(tier: SolutionRecommendationTier): string {
  const candidates = getTierSkusForFamily("Video Wall", tier, 4);
  if (tier === "Bronze") {
    return findSkuByPattern(candidates, /^SW-0204-VW$/i, "SW-0204-VW");
  }

  return findSkuByPattern(candidates, /^SW-0206-VW$/i, "SW-0206-VW");
}

function getMultiviewSku(): string {
  return firstAvailableSku(["NHD-0401-MV"], "NHD-0401-MV");
}

function getMatrixSku(tier: SolutionRecommendationTier, sourceCount: number): string {
  const candidates = getTierSkusForFamily("Matrix", tier, 4);
  if (tier === "Bronze" && sourceCount <= 4) {
    return findSkuByPattern(candidates, /^MX-0404-HDMI$/i, "MX-0404-HDMI");
  }

  return findSkuByPattern(candidates, /^MX-0808-H2A-MK2$/i, "MX-0808-H2A-MK2");
}

function getAvoipSourceSku(tier: SolutionRecommendationTier): string {
  const candidates = getTierSkusForFamily("AVoIP", tier, 6);

  if (tier === "Gold") {
    return findSkuByPattern(candidates, /^NHD-600-TRX$/i, "NHD-600-TRX");
  }

  return findSkuByPattern(
    candidates,
    /-TX$/i,
    tier === "Bronze" ? "NHD-120-TX" : "NHD-500-TX",
  );
}

function getAvoipDisplaySku(tier: SolutionRecommendationTier): string {
  const candidates = getTierSkusForFamily("AVoIP", tier, 6);

  if (tier === "Gold") {
    return findSkuByPattern(candidates, /^NHD-610-RX$/i, "NHD-610-RX");
  }

  return findSkuByPattern(
    candidates,
    /-RX$/i,
    tier === "Bronze" ? "NHD-120-RX" : "NHD-500-RX",
  );
}

function getAvoipControllerSku(): string {
  return firstAvailableSku(["NHD-CTL-PRO-V2"], "NHD-CTL-PRO-V2");
}

function recommendationFor(args: {
  tier: SolutionRecommendationTier;
  goal: WallGoal;
  buildMethod: BuildMethod;
  rows: number;
  cols: number;
  sourceCount: number;
  sourceProfile: SourceProfile;
}): Recommendation {
  const { tier, goal, buildMethod, rows, cols, sourceCount, sourceProfile } = args;
  const displays = rows * cols;
  const processorSku = getProcessorSku(tier);
  const multiviewSku = getMultiviewSku();
  const matrixSku = getMatrixSku(tier, sourceCount);
  const sourceSku = getAvoipSourceSku(tier);
  const displaySku = getAvoipDisplaySku(tier);
  const controllerSku = getAvoipControllerSku();
  const processorCapacity = processorSku === "SW-0204-VW" ? 4 : 6;
  const processorQty = Math.max(1, Math.ceil(displays / processorCapacity));
  const sourceTypeLabel = sourceProfileCopy[sourceProfile].label;
  const needsFlexibleSourceStage =
    sourceCount > 1 || goal !== "single" || sourceProfile === "direct-hdmi" || sourceProfile === "mixed";
  const usesDirectSources = sourceProfile === "direct-hdmi" || sourceProfile === "mixed";

  if (buildMethod === "per-display") {
    const bom: BomLine[] = [
      createBomLine(
        sourceSku,
        sourceCount,
        `${formatCount(sourceCount, "source")} encoded onto the NetworkHD fabric.`,
      ),
      createBomLine(
        displaySku,
        displays,
        `${formatCount(displays, "display")} driven individually for wall control and recall.`,
      ),
      createBomLine(
        controllerSku,
        1,
        "Central controller for wall presets, endpoint management, and grouped behavior.",
      ),
    ];

    if (usesDirectSources && sourceCount > 4) {
      bom.unshift(
        createBomLine(
          matrixSku,
          1,
          "Front-end staging for a larger direct-source set before it enters the addressed wall workflow.",
        ),
      );
    }

    return {
      title: goal === "single" ? "Addressed wall design" : "Addressed wall with flexible zoning",
      architecture: `${tierCopy[tier].label} AVoIP wall with addressed displays`,
      product: `${displaySku} + ${controllerSku}`,
      reason:
        goal === "single"
          ? "This path keeps each display addressable, which is the safer choice once the wall has multiple live sources or needs future layout flexibility."
          : "This path gives every display its own endpoint so the wall can support grouped zones, multiview behavior, and more flexible future recalls.",
      bom,
      sourceSummary: `${formatCount(sourceCount, "source")} from ${sourceTypeLabel.toLowerCase()} will be handled as individual feeds rather than one fixed wall feed.`,
      customerSummary: `The ${rows} x ${cols} wall stays flexible at the ${tier.toLowerCase()} tier, with each display addressable so the design can grow beyond one fixed layout.`,
      engineeringSummary: `Allow ${sourceCount} source endpoints, ${displays} display endpoints, and one controller. This is the correct path when source diversity matters more than a simple single-feed wall processor.`,
    };
  }

  const bom: BomLine[] = [];

  if (usesDirectSources && sourceCount > 1) {
    bom.push(
      createBomLine(
        matrixSku,
        1,
        "Stages multiple direct HDMI sources before they land in the wall path.",
      ),
    );
  }

  if (needsFlexibleSourceStage) {
    bom.push(
      createBomLine(
        multiviewSku,
        1,
        sourceCount > 4
          ? "First multiview stage for the wall. Add upstream switching if more than four live sources must be visible or recalled."
          : "Builds the wall feed when more than one source or a multiview layout is required.",
      ),
    );
  }

  bom.push(
    createBomLine(
      processorSku,
      processorQty,
      processorQty > 1
        ? `Processor-led wall path sized for ${formatCount(displays, "display")} across ${processorQty} chassis.`
        : `Processor-led wall path sized for ${formatCount(displays, "display")}.`,
    ),
  );

  return {
    title: needsFlexibleSourceStage ? "Processor-led wall with source staging" : "Single-feed processor wall",
    architecture: `${tierCopy[tier].label} dedicated video wall path`,
    product: needsFlexibleSourceStage ? `${processorSku} + ${multiviewSku}` : processorSku,
    reason:
      needsFlexibleSourceStage
        ? "The wall is still being treated as one tiled destination, but the source side now needs staging before that feed reaches the processor."
        : "This is the cleanest path when the wall behaves as one destination with one prepared source image across the full display surface.",
    bom,
    sourceSummary: needsFlexibleSourceStage
      ? `${formatCount(sourceCount, "source")} from ${sourceTypeLabel.toLowerCase()} will be collapsed into one prepared wall feed before distribution.`
      : `${formatCount(sourceCount, "source")} from ${sourceTypeLabel.toLowerCase()} can feed the wall directly as one prepared canvas.`,
    customerSummary: `The ${rows} x ${cols} wall is being treated as one tiled surface at the ${tier.toLowerCase()} tier, which keeps the design simpler and more cost-controlled.`,
    engineeringSummary: `Size the wall processor for ${formatCount(displays, "display")}. Add source staging only where multiple live inputs, multiview, or custom layouts need to be resolved before the wall feed.`,
  };
}

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

function ChoiceButton(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 14,
        border: props.active
          ? "1px solid rgba(126,192,255,0.45)"
          : "1px solid rgba(97,162,255,0.18)",
        background: props.active
          ? "linear-gradient(180deg, rgba(26,74,130,0.9) 0%, rgba(12,42,84,0.92) 100%)"
          : "rgba(9,20,40,0.86)",
        color: "#f5f9ff",
        padding: "12px 14px",
        cursor: "pointer",
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800 }}>{props.label}</div>
      {props.sublabel ? (
        <div style={{ fontSize: 12, color: "rgba(214,228,255,0.74)", lineHeight: 1.4 }}>
          {props.sublabel}
        </div>
      ) : null}
    </button>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
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
        onChange={(e) => props.onChange(clamp(Number(e.target.value) || props.value, props.min, props.max))}
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
      />
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

function PreviewOverlay(props: {
  goal: WallGoal;
  buildMethod: BuildMethod;
  rows: number;
  cols: number;
}) {
  const base: React.CSSProperties = {
    position: "absolute",
    border: "2px solid rgba(255,255,255,0.74)",
    background: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
    display: "grid",
    placeItems: "center",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };

  if (props.buildMethod === "per-display") {
    if (props.rows === 2 && props.cols === 4 && props.goal !== "single") {
      return (
        <>
          <div style={{ ...base, left: "25%", top: "6%", width: "50%", height: "88%" }}>Main zone</div>
          <div style={{ ...base, left: "3%", top: "6%", width: "18%", height: "40%" }}>Side 1</div>
          <div style={{ ...base, left: "3%", bottom: "6%", width: "18%", height: "40%" }}>Side 2</div>
          <div style={{ ...base, right: "3%", top: "6%", width: "18%", height: "40%" }}>Side 3</div>
          <div style={{ ...base, right: "3%", bottom: "6%", width: "18%", height: "40%" }}>Side 4</div>
        </>
      );
    }

    const cells: React.ReactNode[] = [];
    const cellW = 100 / props.cols;
    const cellH = 100 / props.rows;

    for (let r = 0; r < props.rows; r += 1) {
      for (let c = 0; c < props.cols; c += 1) {
        cells.push(
          <div
            key={`${r}-${c}`}
            style={{
              ...base,
              left: `${c * cellW + 2}%`,
              top: `${r * cellH + 3}%`,
              width: `${cellW - 4}%`,
              height: `${cellH - 6}%`,
            }}
          >
            {r * props.cols + c + 1}
          </div>
        );
      }
    }

    return <>{cells}</>;
  }

  if (props.goal === "single") {
    return <div style={{ ...base, inset: "6%" }}>Wall image</div>;
  }

  if (props.goal === "grid") {
    return (
      <>
        <div style={{ ...base, left: "6%", top: "8%", width: "42%", height: "38%" }}>1</div>
        <div style={{ ...base, right: "6%", top: "8%", width: "42%", height: "38%" }}>2</div>
        <div style={{ ...base, left: "6%", bottom: "8%", width: "42%", height: "38%" }}>3</div>
        <div style={{ ...base, right: "6%", bottom: "8%", width: "42%", height: "38%" }}>4</div>
      </>
    );
  }

  if (props.goal === "pip") {
    return (
      <>
        <div style={{ ...base, inset: "6%" }}>Main</div>
        <div style={{ ...base, right: "9%", bottom: "11%", width: "24%", height: "24%" }}>Inset</div>
      </>
    );
  }

  return (
    <>
      <div style={{ ...base, left: "5%", top: "8%", width: "52%", height: "44%" }}>Main</div>
      <div style={{ ...base, right: "7%", top: "12%", width: "24%", height: "20%" }}>A</div>
      <div style={{ ...base, right: "10%", bottom: "10%", width: "28%", height: "24%" }}>B</div>
    </>
  );
}

export default function VideoWallPlannerPage() {
  const [tier, setTier] = useState<SolutionRecommendationTier>("Silver");
  const [goal, setGoal] = useState<WallGoal>("single");
  const [buildMethod, setBuildMethod] = useState<BuildMethod>("tile-mode");
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [sourceCount, setSourceCount] = useState(1);
  const [sourceProfile, setSourceProfile] = useState<SourceProfile>("player");
  const [bezelPreset, setBezelPreset] = useState<BezelPreset>("thin");

  const totalDisplays = rows * cols;
  const bezel = bezelValues[bezelPreset];
  const wallAspectRatio = `${cols * 16} / ${rows * 9}`;

  const recommendation = useMemo(() => {
    return recommendationFor({
      tier,
      goal,
      buildMethod,
      rows,
      cols,
      sourceCount,
      sourceProfile,
    });
  }, [tier, goal, buildMethod, rows, cols, sourceCount, sourceProfile]);

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
                maxWidth: 920,
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
          <div style={{ display: "grid", gap: 10 }}>
            <SectionCard title="1. Which design tier fits the wall?">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                {(["Bronze", "Silver", "Gold"] as const).map((option) => (
                  <ChoiceButton
                    key={option}
                    active={tier === option}
                    onClick={() => setTier(option)}
                    label={tierCopy[option].label}
                    sublabel={tierCopy[option].sublabel}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard title="2. What should the wall do?">
              <div style={{ display: "grid", gap: 10 }}>
                <ChoiceButton
                  active={goal === "single"}
                  onClick={() => setGoal("single")}
                  label="One big image"
                  sublabel="One image across the whole wall."
                />
                <ChoiceButton
                  active={goal === "grid"}
                  onClick={() => setGoal("grid")}
                  label="Several equal windows"
                  sublabel="Best for regular multiview grids."
                />
                <ChoiceButton
                  active={goal === "pip"}
                  onClick={() => setGoal("pip")}
                  label="One main image + small windows"
                  sublabel="Main presentation with inset or support windows."
                />
                <ChoiceButton
                  active={goal === "custom"}
                  onClick={() => setGoal("custom")}
                  label="Mixed custom layout"
                  sublabel="More advanced custom composition."
                />
              </div>
            </SectionCard>

            <SectionCard title="3. How big is the wall?">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

            <SectionCard title="4. What sources need to hit the wall?">
              <div style={{ display: "grid", gap: 10 }}>
                <NumberField
                  label="Source devices"
                  value={sourceCount}
                  min={1}
                  max={12}
                  onChange={setSourceCount}
                />

                <SelectField
                  label="Source profile"
                  value={sourceProfile}
                  options={[
                    { value: "player", label: sourceProfileCopy.player.label },
                    { value: "matrix-feed", label: sourceProfileCopy["matrix-feed"].label },
                    { value: "direct-hdmi", label: sourceProfileCopy["direct-hdmi"].label },
                    { value: "mixed", label: sourceProfileCopy.mixed.label },
                  ]}
                  onChange={setSourceProfile}
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
                  {sourceProfileCopy[sourceProfile].sublabel}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="5. How will it be driven?">
              <div style={{ display: "grid", gap: 10 }}>
                <ChoiceButton
                  active={buildMethod === "tile-mode"}
                  onClick={() => setBuildMethod("tile-mode")}
                  label="Single wall feed using screen tile mode"
                  sublabel="Fastest and simplest when the wall behaves as one destination."
                />
                <ChoiceButton
                  active={buildMethod === "per-display"}
                  onClick={() => setBuildMethod("per-display")}
                  label="Independent screens / grouped zones"
                  sublabel="Best when screens or wall sections need separate behavior."
                />
              </div>
            </SectionCard>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <SectionCard title="Recommended solution">
              <div className="wm-video-wall-lite__recommendationGrid">
                <div className="wm-video-wall-lite__recommendationCopy">
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(124,191,255,0.3)",
                      background:
                        "linear-gradient(180deg, rgba(18,52,94,0.72) 0%, rgba(10,28,54,0.82) 100%)",
                      padding: "12px 14px",
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
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "12px 14px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Source strategy
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(233,240,255,0.82)" }}>
                      {recommendation.sourceSummary}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "12px 14px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Starter BOM
                    </div>
                    {recommendation.bom.map((line, index) => (
                      <div key={`${line.sku}-${index}`} style={{ display: "grid", gap: 2 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
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
                      padding: "12px 14px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Customer-facing summary
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(233,240,255,0.82)" }}>
                      {recommendation.customerSummary}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(97,162,255,0.12)",
                      background: "rgba(8,19,36,0.6)",
                      padding: "12px 14px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(201,227,255,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Engineering summary
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(233,240,255,0.82)" }}>
                      {recommendation.engineeringSummary}
                    </div>
                  </div>
                </div>

                <div className="wm-video-wall-lite__previewPanel">
                  <div
                    className="wm-video-wall-lite__previewSurface"
                    style={{
                      width: "100%",
                      aspectRatio: wallAspectRatio,
                      minHeight: 300,
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
                            background: "linear-gradient(180deg, rgba(18,20,28,1) 0%, rgba(9,10,15,1) 100%)",
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
                      <PreviewOverlay goal={goal} buildMethod={buildMethod} rows={rows} cols={cols} />
                    </div>
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
