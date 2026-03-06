import * as React from "react";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

type WallType = "LCD" | "LED";
type Layout = "2x2" | "3x3" | "4x4" | "Custom";
type MultiViewMode = "None" | "Fixed Windows" | "Active Windowing";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.62)",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px minmax(0,1fr)",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.60)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function VideoWallPlannerPage() {
  const [wallType, setWallType] = React.useState<WallType>("LED");
  const [layout, setLayout] = React.useState<Layout>("3x3");
  const [customRows, setCustomRows] = React.useState(2);
  const [customCols, setCustomCols] = React.useState(3);
  const [diagonalInches, setDiagonalInches] = React.useState(136);
  const [pixelPitch, setPixelPitch] = React.useState(1.2);
  const [multiview, setMultiview] = React.useState<MultiViewMode>("Fixed Windows");

  const grid = React.useMemo(() => {
    if (layout === "2x2") return { r: 2, c: 2 };
    if (layout === "3x3") return { r: 3, c: 3 };
    if (layout === "4x4") return { r: 4, c: 4 };
    return { r: Math.max(1, customRows), c: Math.max(1, customCols) };
  }, [layout, customRows, customCols]);

  const layoutLabel = React.useMemo(() => {
    return layout === "Custom" ? `${grid.r}x${grid.c}` : layout;
  }, [layout, grid.r, grid.c]);

  const displayCount = wallType === "LCD" ? grid.r * grid.c : 1;

  const planningNote = React.useMemo(() => {
    if (wallType === "LED") {
      return multiview === "None"
        ? "LED wall with a single-canvas presentation flow."
        : "LED wall with processor-led windowing or multiview handling.";
    }

    return multiview === "None"
      ? "LCD wall with standard tiled display routing."
      : "LCD wall with video-wall processing and multi-window source handling.";
  }, [wallType, multiview]);

  return (
    <div
      className="wm-page wm-animate-in"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">TOOL</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Video Wall Planner
          </h1>
          <div
            style={{
              maxWidth: 760,
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.45,
            }}
          >
            Define the wall type, layout, and viewing behaviour first, then use that as the basis for processing and BOM decisions.
          </div>
        </div>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Planner inputs</div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(255,255,255,0.80)",
              lineHeight: 1.45,
            }}
          >
            Enter only the core planning inputs first.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            <label>
              <FieldLabel>Wall type</FieldLabel>
              <select
                value={wallType}
                onChange={(e) => setWallType(e.target.value as WallType)}
                style={{ width: "100%", padding: 10, borderRadius: 12 }}
              >
                <option>LED</option>
                <option>LCD</option>
              </select>
            </label>

            <label>
              <FieldLabel>Layout</FieldLabel>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as Layout)}
                style={{ width: "100%", padding: 10, borderRadius: 12 }}
              >
                <option>2x2</option>
                <option>3x3</option>
                <option>4x4</option>
                <option>Custom</option>
              </select>
            </label>

            <label>
              <FieldLabel>Approx. size (diagonal inches)</FieldLabel>
              <input
                type="number"
                min={40}
                value={diagonalInches}
                onChange={(e) => setDiagonalInches(Number(e.target.value || 0))}
                style={{ width: "100%", padding: 10, borderRadius: 12 }}
              />
            </label>

            <label>
              <FieldLabel>Multiview</FieldLabel>
              <select
                value={multiview}
                onChange={(e) => setMultiview(e.target.value as MultiViewMode)}
                style={{ width: "100%", padding: 10, borderRadius: 12 }}
              >
                <option>None</option>
                <option>Fixed Windows</option>
                <option>Active Windowing</option>
              </select>
            </label>
          </div>

          {layout === "Custom" && (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(140px, 220px))",
                gap: 14,
              }}
            >
              <label>
                <FieldLabel>Rows</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={customRows}
                  onChange={(e) => setCustomRows(Math.max(1, Number(e.target.value || 1)))}
                  style={{ width: "100%", padding: 10, borderRadius: 12 }}
                />
              </label>

              <label>
                <FieldLabel>Columns</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={customCols}
                  onChange={(e) => setCustomCols(Math.max(1, Number(e.target.value || 1)))}
                  style={{ width: "100%", padding: 10, borderRadius: 12 }}
                />
              </label>
            </div>
          )}

          {wallType === "LED" && (
            <div style={{ marginTop: 14, maxWidth: 260 }}>
              <label>
                <FieldLabel>Pixel pitch (mm)</FieldLabel>
                <input
                  type="number"
                  step="0.1"
                  min={0.5}
                  value={pixelPitch}
                  onChange={(e) => setPixelPitch(Number(e.target.value || 0))}
                  style={{ width: "100%", padding: 10, borderRadius: 12 }}
                />
              </label>
            </div>
          )}
        </section>

        <section className="wm-card" style={{ padding: 16, borderRadius: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Planning summary</div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(255,255,255,0.80)",
              lineHeight: 1.45,
            }}
          >
            Use this as the starting point for processor, distribution, and BOM decisions.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <SummaryRow label="Wall type" value={wallType} />
            <SummaryRow label="Layout" value={layoutLabel} />
            <SummaryRow
              label={wallType === "LCD" ? "Panels" : "Display object"}
              value={String(displayCount)}
            />
            <SummaryRow label="Approx. size" value={`${diagonalInches}"`} />
            {wallType === "LED" ? (
              <SummaryRow label="Pixel pitch" value={`${pixelPitch} mm`} />
            ) : null}
            <SummaryRow label="Multiview" value={multiview} />
            <SummaryRow label="Planning note" value={planningNote} />
          </div>
        </section>

        <CollapsibleCard
          id="videowall_next_steps"
          title="Next step"
          subtitle="Use this summary as the basis for BOM and processing logic."
          defaultCollapsed
        >
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.86)",
            }}
          >
            Next, split LED vs LCD workflows and apply WyreStorm processing, routing, and multiview rules from this configuration.
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}