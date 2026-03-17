import React from "react";

import type {
  CompetitorCompareCandidate,
  CompetitorCompareLiveResult,
  CompetitorCompareSearchResult,
} from "@/services/competitorCompareSearch";

type CompetitorCompareResultsPanelProps = {
  result: CompetitorCompareSearchResult;
  selectedCandidateId?: string;
  liveResult?: CompetitorCompareLiveResult | null;
  onSelectCandidate?: (candidate: CompetitorCompareCandidate) => void;
  onVerifyCandidate?: (candidate: CompetitorCompareCandidate) => void;
};

function chipStyle(accent: "blue" | "green" | "amber" | "gray"): React.CSSProperties {
  if (accent === "green") {
    return {
      border: "1px solid rgba(122,236,160,0.24)",
      background: "rgba(122,236,160,0.12)",
      color: "#d6ffe4",
    };
  }

  if (accent === "amber") {
    return {
      border: "1px solid rgba(255,190,92,0.26)",
      background: "rgba(255,190,92,0.12)",
      color: "#ffe6b7",
    };
  }

  if (accent === "gray") {
    return {
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.05)",
      color: "rgba(255,255,255,0.72)",
    };
  }

  return {
    border: "1px solid rgba(92,225,230,0.24)",
    background: "rgba(92,225,230,0.12)",
    color: "#dffcff",
  };
}

function confidenceAccent(confidence: "High" | "Medium" | "Low"): "green" | "amber" | "gray" {
  if (confidence === "High") return "green";
  if (confidence === "Medium") return "amber";
  return "gray";
}

function selectedCandidate(
  result: CompetitorCompareSearchResult,
  selectedCandidateId?: string,
): CompetitorCompareCandidate | undefined {
  return (
    result.candidates.find((candidate) => candidate.id === selectedCandidateId) ||
    result.bestCandidate
  );
}

function sectionTitle(title: string, subtitle: string) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", lineHeight: 1.5 }}>
        {subtitle}
      </div>
    </div>
  );
}

export default function CompetitorCompareResultsPanel(
  props: CompetitorCompareResultsPanelProps,
) {
  const {
    result,
    selectedCandidateId,
    liveResult,
    onSelectCandidate,
    onVerifyCandidate,
  } = props;

  const activeCandidate = selectedCandidate(result, selectedCandidateId);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {sectionTitle(
        "Match shortlist",
        "Search partial competitor SKUs, inspect the nearest WyreStorm options, then verify the chosen target live.",
      )}

      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>{result.summary}</div>

        {result.suggestedWyrestormSkus.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {result.suggestedWyrestormSkus.map((sku) => (
              <span
                key={sku}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  ...chipStyle("blue"),
                }}
              >
                {sku}
              </span>
            ))}
          </div>
        ) : null}

        {result.clarifyingQuestions.length > 0 ? (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ffe6b7" }}>
              Clarify before quoting
            </div>
            {result.clarifyingQuestions.map((question) => (
              <div key={question} style={{ fontSize: 12, color: "rgba(255,255,255,0.76)" }}>
                - {question}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {result.candidates.length === 0 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px dashed rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.54)",
            fontSize: 13,
          }}
        >
          No comparison candidates yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {result.candidates.map((candidate) => {
            const active = candidate.id === activeCandidate?.id;
            const comparison = candidate.comparison;

            return (
              <div
                key={candidate.id}
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  border: active
                    ? "1px solid rgba(92,225,230,0.28)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(92,225,230,0.08)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>
                        {comparison.brand} {comparison.competitorSku}
                      </div>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          ...chipStyle(confidenceAccent(candidate.searchConfidence)),
                        }}
                      >
                        Search {candidate.searchConfidence}
                      </span>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          ...chipStyle(candidate.sourceType === "manual" ? "amber" : "gray"),
                        }}
                      >
                        {candidate.sourceLabel}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                      {comparison.competitorName || comparison.summary}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
                      {comparison.category}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6, justifyItems: "end", minWidth: 180 }}>
                    <div style={{ fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.62 }}>
                      Nearest WyreStorm
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#dffcff" }}>
                      {comparison.wyrestormSku}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", textAlign: "right" }}>
                      {comparison.wyrestormName || comparison.wyrestormCategory}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                  {candidate.searchReasons.join(" ")}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => onSelectCandidate?.(candidate)}
                    style={{
                      height: 36,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#eef5ff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {active ? "Selected" : "Review Match"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerifyCandidate?.(candidate)}
                    style={{
                      height: 36,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(92,225,230,0.24)",
                      background: "rgba(92,225,230,0.12)",
                      color: "#dffcff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Verify Live
                  </button>
                </div>

                {active ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
                      {comparison.rationale}
                    </div>

                    {comparison.notes?.length ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        {comparison.notes.slice(0, 3).map((note) => (
                          <div key={note} style={{ fontSize: 12, color: "rgba(255,255,255,0.68)" }}>
                            - {note}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {liveResult?.record ? (
        <div
          style={{
            display: "grid",
            gap: 10,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(122,236,160,0.24)",
            background: "rgba(122,236,160,0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Live verification</div>
            <span
              style={{
                padding: "5px 9px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                ...chipStyle("green"),
              }}
            >
              {liveResult.sourceLabel}
            </span>
          </div>

          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}>
            {liveResult.record.brand} {liveResult.record.competitorSku} compares closest to{" "}
            <strong>{liveResult.record.wyrestormSku}</strong>
            {liveResult.record.wyrestormName ? ` (${liveResult.record.wyrestormName})` : ""}.
          </div>

          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
            {liveResult.record.rationale}
          </div>

          {liveResult.intelligence?.summary ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
              {liveResult.intelligence.summary}
            </div>
          ) : null}

          {liveResult.warnings.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              {liveResult.warnings.map((warning) => (
                <div key={warning} style={{ fontSize: 12, color: "#ffe6b7" }}>
                  - {warning}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 8,
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800 }}>Sales decode</div>
        {result.salesAdvice.map((item) => (
          <div key={item} style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
            - {item}
          </div>
        ))}
      </div>
    </div>
  );
}
