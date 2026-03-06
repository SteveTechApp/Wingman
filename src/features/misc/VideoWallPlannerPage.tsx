import * as React from "react";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  Field,
} from "@/ui2/page/PageChrome";

type WallType = "LCD" | "LED";
type Layout = "2x2" | "3x3" | "4x4" | "Custom";
type MultiViewMode = "None" | "Fixed Windows" | "Active Windowing";

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
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
      <div style={stackStyle(14)}>
        <PageHeader
          eyebrow="TOOL"
          title="Video Wall Planner"
          description="Define the wall type, layout and viewing behaviour first, then use that as the basis for processing and BOM decisions."
        />

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Planner inputs</div>
          <div style={sectionTextStyle()}>
            Enter only the core planning inputs first.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0,1fr))",
              gap: 14,
            }}
          >
            <Field label="Wall type">
              <select value={wallType} onChange={(e) => setWallType(e.target.value as WallType)} style={inputStyle()}>
                <option>LED</option>
                <option>LCD</option>
              </select>
            </Field>

            <Field label="Layout">
              <select value={layout} onChange={(e) => setLayout(e.target.value as Layout)} style={inputStyle()}>
                <option>2x2</option>
                <option>3x3</option>
                <option>4x4</option>
                <option>Custom</option>
              </select>
            </Field>

            <Field label="Approx. size (diagonal inches)">
              <input type="number" min={40} value={diagonalInches} onChange={(e) => setDiagonalInches(Number(e.target.value || 0))} style={inputStyle()} />
            </Field>

            <Field label="Multiview">
              <select value={multiview} onChange={(e) => setMultiview(e.target.value as MultiViewMode)} style={inputStyle()}>
                <option>None</option>
                <option>Fixed Windows</option>
                <option>Active Windowing</option>
              </select>
            </Field>
          </div>

          {layout === "Custom" ? (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(180px, 280px))",
                gap: 14,
              }}
            >
              <Field label="Rows">
                <input type="number" min={1} value={customRows} onChange={(e) => setCustomRows(Math.max(1, Number(e.target.value || 1)))} style={inputStyle()} />
              </Field>
              <Field label="Columns">
                <input type="number" min={1} value={customCols} onChange={(e) => setCustomCols(Math.max(1, Number(e.target.value || 1)))} style={inputStyle()} />
              </Field>
            </div>
          ) : null}

          {wallType === "LED" ? (
            <div style={{ marginTop: 14, maxWidth: 280 }}>
              <Field label="Pixel pitch (mm)">
                <input type="number" step="0.1" min={0.5} value={pixelPitch} onChange={(e) => setPixelPitch(Number(e.target.value || 0))} style={inputStyle()} />
              </Field>
            </div>
          ) : null}
        </section>

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Planning summary</div>
          <div style={sectionTextStyle()}>
            Use this as the starting point for processor, distribution and BOM decisions.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <SummaryRow label="Wall type" value={wallType} />
            <SummaryRow label="Layout" value={layoutLabel} />
            <SummaryRow label={wallType === "LCD" ? "Panels" : "Display object"} value={String(displayCount)} />
            <SummaryRow label="Approx. size" value={`${diagonalInches}"`} />
            {wallType === "LED" ? <SummaryRow label="Pixel pitch" value={`${pixelPitch} mm`} /> : null}
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
            Next, split LED vs LCD workflows and apply WyreStorm processing, routing and multiview rules from this configuration.
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}