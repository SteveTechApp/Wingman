import * as React from "react";
import { enrichCompetitorRecord } from "@/competitor/quality";
import type { CompetitorItem } from "@/competitor/types";

type Props = {
  item: CompetitorItem;
  compact?: boolean;
};
function unwrapSpecValue(input: unknown): unknown {
  if (input && typeof input === "object" && "value" in (input as Record<string, unknown>)) {
    return (input as Record<string, unknown>).value;
  }
  return input;
}

function unwrapConfidence(input: unknown): "high" | "medium" | "low" {
  if (input && typeof input === "object" && "confidence" in (input as Record<string, unknown>)) {
    const c = (input as Record<string, unknown>).confidence;
    if (c === "high" || c === "medium" || c === "low") return c;
  }
  return "low";
}


function badgeTone(confidence: "high" | "medium" | "low"): React.CSSProperties {
  if (confidence === "high") {
    return { background: "rgba(34,197,94,0.18)", color: "#dcfce7", border: "1px solid rgba(34,197,94,0.35)" };
  }
  if (confidence === "medium") {
    return { background: "rgba(250,204,21,0.16)", color: "#fef3c7", border: "1px solid rgba(250,204,21,0.35)" };
  }
  return { background: "rgba(239,68,68,0.16)", color: "#fecaca", border: "1px solid rgba(239,68,68,0.35)" };
}

function bandTone(band: "complete" | "usable" | "needs-enrichment"): React.CSSProperties {
  if (band === "complete") {
    return { background: "rgba(34,197,94,0.18)", color: "#dcfce7", border: "1px solid rgba(34,197,94,0.35)" };
  }
  if (band === "usable") {
    return { background: "rgba(59,130,246,0.18)", color: "#dbeafe", border: "1px solid rgba(59,130,246,0.35)" };
  }
  return { background: "rgba(249,115,22,0.16)", color: "#fed7aa", border: "1px solid rgba(249,115,22,0.35)" };
}

function formatValue(field: unknown): string {
  const value = unwrapSpecValue(field);

  if (Array.isArray(value)) return value.length ? value.join(", ") : "Missing";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === undefined || value === null || value === "") return "Missing";

  return String(value);
}

function SpecRow(props: { label: string; field: unknown }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)"
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>{props.label}</div>
      <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{formatValue(props.field)}</div>
      <div
        style={{
          ...badgeTone(unwrapConfidence(props.field)),
          padding: "4px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0.4
        }}
      >
        {unwrapConfidence(props.field)}
      </div>
    </div>
  );
}

export default function CompetitorSpecQualityPanel({ item, compact = false }: Props) {
  const enriched = React.useMemo(() => enrichCompetitorRecord(item), [item]);

  return (
    <section
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(10,14,24,0.96), rgba(16,22,36,0.92))",
        padding: compact ? 16 : 20,
        boxShadow: "0 24px 60px rgba(0,0,0,0.28)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
            Competitor data quality
          </div>
          <div style={{ color: "white", fontSize: 18, fontWeight: 900 }}>
            {item.brand} {item.sku}
          </div>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
            {item.name || item.category}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              ...bandTone(enriched.completenessBand),
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.4
            }}
          >
            {enriched.completenessBand.replace("-", " ")}
          </div>

          <div
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 800,
              color: "white",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)"
            }}
          >
            Score {enriched.qualityScore}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 2 }}>
        <SpecRow label="Max resolution" field={item.video?.maxResolution} />
        <SpecRow label="Bandwidth" field={item.video?.bandwidthGbps} />
        <SpecRow label="HDCP" field={item.video?.hdcp} />
        <SpecRow label="Inputs" field={item.connectivity?.inputs} />
        <SpecRow label="Outputs" field={item.connectivity?.outputs} />
        <SpecRow label="Transport" field={item.connectivity?.transport} />
        <SpecRow label="4K distance" field={item.distance?.maxMeters4k} />
        <SpecRow label="1080p distance" field={item.distance?.maxMeters1080p} />
        <SpecRow label="Audio formats" field={item.audio?.audioFormats} />
        <SpecRow label="Street price GBP" field={item.commercial?.estimatedStreetPriceGbp} />
      </div>

      {enriched.warnings.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Enrichment warnings
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {enriched.warnings.map((warning) => (
              <div
                key={warning.code}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "10px 12px"
                }}
              >
                <div style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{warning.message}</div>
                <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, marginTop: 3 }}>
                  {warning.severity.toUpperCase()} / {warning.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}