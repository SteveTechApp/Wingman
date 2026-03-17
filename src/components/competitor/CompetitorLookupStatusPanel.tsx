import * as React from "react";
import type { LocalCompetitorLookupMatch } from "@/competitor/localCompetitorLookup";
import type { CompetitorLookupTrace } from "@/competitor/types";

type Props = {
  trace: CompetitorLookupTrace[];
  modeLabel: string;
  localMatches?: LocalCompetitorLookupMatch[];
  brand?: string;
  sku?: string;
};

function stageLabel(stage: CompetitorLookupTrace["stage"]): string {
  switch (stage) {
    case "dataset":
      return "Dataset";
    case "web":
      return "Live check";
    case "extract":
      return "Extract";
    case "match":
      return "Match";
    case "done":
      return "Complete";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function formatTimestamp(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMatchLabel(match: LocalCompetitorLookupMatch): string {
  if (match.wyrestormSku && match.wyrestormName) {
    return `${match.wyrestormSku} - ${match.wyrestormName}`;
  }
  return match.wyrestormSku || match.wyrestormName || "No mapped WyreStorm SKU stored yet in the local catalogue.";
}

export default function CompetitorLookupStatusPanel({
  trace,
  modeLabel,
  localMatches = [],
  brand,
  sku,
}: Props) {
  const hasResults = localMatches.length > 0;

  return (
    <div
      className="wm-card"
      style={{
        display: "grid",
        gap: 14,
        padding: 18,
        border: "1px solid rgba(92, 225, 230, 0.18)",
        background: "linear-gradient(180deg, rgba(10,16,26,0.96), rgba(8,12,20,0.92))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.72 }}>
            Lookup activity
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
            Competitor verification
          </div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            border: "1px solid rgba(92, 225, 230, 0.28)",
            background: "rgba(92, 225, 230, 0.10)",
            color: "#baf8fb",
          }}
        >
          {modeLabel}
        </div>
      </div>

      {trace.length === 0 ? (
        <div style={{ opacity: 0.74, fontSize: 14 }}>
          Enter a competitor brand and SKU to begin verification.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {trace.map((item, index) => (
            <div
              key={`${item.stage}-${index}-${item.message}`}
              style={{
                display: "grid",
                gap: 4,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.78 }}>
                  {stageLabel(item.stage)}
                </div>

                {typeof item.confidence === "number" ? (
                  <div style={{ fontSize: 12, opacity: 0.82 }}>
                    Confidence {Math.round(item.confidence)}%
                  </div>
                ) : null}
              </div>

              <div style={{
  fontSize:14,
  fontWeight:600,
  color: item.active ? "#5ce1e6" : "inherit",
  background: item.active ? "rgba(92,225,230,0.12)" : "transparent",
  padding:"6px 8px",
  borderRadius:6
}}>
                {item.message}
              </div>

              {item.sourceLabel ? (
                <div style={{ fontSize: 12, opacity: 0.76 }}>
                  Source: {item.sourceLabel}{!item.usedLiveData && item.checkedUrl ? " - no structured data extracted" : ""}
                </div>
              ) : null}

              {item.checkedUrl ? (
                <div style={{ fontSize: 12, opacity: 0.76, wordBreak: "break-all" }}>
                  Checked URL: {item.checkedUrl}
                </div>
              ) : null}

              {item.updatedAt ? (
                <div style={{ fontSize: 11, opacity: 0.58 }}>
                  {formatTimestamp(item.updatedAt)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {hasResults ? (
        <div
          style={{
            display: "grid",
            gap: 12,
            paddingTop: 6,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.72,
            }}
          >
            Results
          </div>

          {brand && sku ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(92, 225, 230, 0.16)",
                background: "rgba(92, 225, 230, 0.06)",
                fontSize: 13,
                color: "#dffbff",
              }}
            >
              Showing the top {localMatches.length} local matches for {brand} {sku}.
            </div>
          ) : null}

          {localMatches.map((match, index) => (
            <div
              key={`${match.brand}-${match.sku}-${index}`}
              style={{
                display: "grid",
                gap: 8,
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                background: index === 0 ? "rgba(92, 225, 230, 0.08)" : "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {match.brand} {match.sku}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: index === 0 ? "#9af3f6" : "rgba(255,255,255,0.78)",
                  }}
                >
                  Score {match.score}
                </div>
              </div>

              {match.name ? (
                <div style={{ fontSize: 13, opacity: 0.84 }}>
                  {match.name}
                </div>
              ) : null}

              {(match.category || match.family) ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {[match.category, match.family].filter(Boolean).join(" | ")}
                </div>
              ) : null}

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(92, 225, 230, 0.14)",
                  background: "rgba(8, 20, 36, 0.42)",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                <strong>Suggested WyreStorm match:</strong> {renderMatchLabel(match)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
