import React from "react";

import type {
  CompetitorCompareCandidate,
  CompetitorCompareLiveResult,
  CompetitorCompareSearchResult,
} from "@/services/competitorCompareSearch";
import type {
  CompetitorCompareMatrixStatus,
  CompetitorCompareOption,
} from "@/services/competitorCompareFit";

type CompetitorCompareResultsPanelProps = {
  result: CompetitorCompareSearchResult;
  selectedCandidateId?: string;
  selectedOptionId?: string;
  liveResult?: CompetitorCompareLiveResult | null;
  onSelectCandidate?: (candidate: CompetitorCompareCandidate) => void;
  onVerifyCandidate?: (candidate: CompetitorCompareCandidate) => void;
  onSelectOption?: (
    candidate: CompetitorCompareCandidate,
    option: CompetitorCompareOption,
  ) => void;
};

function chipStyle(
  accent: "blue" | "green" | "amber" | "gray",
): React.CSSProperties {
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

function confidenceAccent(
  confidence: "High" | "Medium" | "Low",
): "green" | "amber" | "gray" {
  if (confidence === "High") return "green";
  if (confidence === "Medium") return "amber";
  return "gray";
}

function matrixAccent(
  status: CompetitorCompareMatrixStatus,
): React.CSSProperties {
  if (status === "better") {
    return {
      color: "#d6ffe4",
      background: "rgba(122,236,160,0.08)",
      border: "1px solid rgba(122,236,160,0.18)",
    };
  }
  if (status === "match") {
    return {
      color: "#dffcff",
      background: "rgba(92,225,230,0.08)",
      border: "1px solid rgba(92,225,230,0.18)",
    };
  }
  if (status === "gap") {
    return {
      color: "#ffe6b7",
      background: "rgba(255,190,92,0.08)",
      border: "1px solid rgba(255,190,92,0.18)",
    };
  }
  return {
    color: "rgba(255,255,255,0.78)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
  };
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

function selectedOption(
  candidate: CompetitorCompareCandidate | undefined,
  selectedOptionId?: string,
): CompetitorCompareOption | undefined {
  if (!candidate) return undefined;
  return (
    candidate.options.find((option) => option.id === selectedOptionId) ||
    candidate.primaryOption
  );
}

function sectionTitle(title: string, subtitle: string) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.64)",
          lineHeight: 1.5,
        }}
      >
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
    selectedOptionId,
    liveResult,
    onSelectCandidate,
    onVerifyCandidate,
    onSelectOption,
  } = props;

  const activeCandidate = selectedCandidate(result, selectedCandidateId);
  const activeOption = selectedOption(activeCandidate, selectedOptionId);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {sectionTitle(
        "Match shortlist",
        "Search partial competitor SKUs, review likely competitor targets, then compare the strongest WyreStorm options side by side.",
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
              <div
                key={question}
                style={{ fontSize: 12, color: "rgba(255,255,255,0.76)" }}
              >
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
            const primary = candidate.primaryOption;

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
                  background: active
                    ? "rgba(92,225,230,0.08)"
                    : "rgba(255,255,255,0.02)",
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
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 800 }}>
                        {candidate.comparison.brand} {candidate.comparison.competitorSku}
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
                          ...chipStyle(
                            candidate.sourceType === "manual" ? "amber" : "gray",
                          ),
                        }}
                      >
                        {candidate.sourceLabel}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                      {candidate.comparison.competitorName || candidate.comparison.summary}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
                      {candidate.comparison.category}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      justifyItems: "end",
                      minWidth: 190,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        opacity: 0.62,
                      }}
                    >
                      Primary WyreStorm path
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#dffcff" }}>
                      {primary?.wyrestormSku || candidate.comparison.wyrestormSku}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.70)",
                        textAlign: "right",
                      }}
                    >
                      {primary?.label || "Current mapping"}
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
              </div>
            );
          })}
        </div>
      )}

      {activeCandidate ? (
        <div
          style={{
            display: "grid",
            gap: 14,
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              WyreStorm options for {activeCandidate.comparison.competitorSku}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.64)",
                lineHeight: 1.5,
              }}
            >
              Compare the strongest replacement paths before you position one to the customer.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {activeCandidate.options.map((option) => {
              const active = option.id === activeOption?.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption?.(activeCandidate, option)}
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 14,
                    textAlign: "left",
                    borderRadius: 14,
                    border: active
                      ? "1px solid rgba(92,225,230,0.28)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "rgba(92,225,230,0.08)"
                      : "rgba(255,255,255,0.03)",
                    color: "#eef5ff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.82 }}>
                      {option.label}
                    </div>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        ...chipStyle(confidenceAccent(option.fitConfidence)),
                      }}
                    >
                      {option.fitConfidence}
                    </span>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 800, color: "#dffcff" }}>
                    {option.wyrestormSku}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.74)" }}>
                    {option.wyrestormName || option.wyrestormCategory}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.58)" }}>
                    Fit score {option.fitScore}/100
                  </div>
                </button>
              );
            })}
          </div>

          {activeOption ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(92,225,230,0.16)",
                  background: "rgba(92,225,230,0.06)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {activeOption.label}: {activeOption.wyrestormSku}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)" }}>
                  {activeOption.reasons.join(" ")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                  {activeOption.positioningSummary}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  Side-by-side matrix
                </div>
                {activeOption.matrix.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gap: 8,
                      gridTemplateColumns: "160px minmax(0, 1fr) minmax(0, 1fr)",
                      alignItems: "start",
                      padding: 10,
                      borderRadius: 12,
                      ...matrixAccent(row.status),
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800 }}>{row.label}</div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 11, opacity: 0.64 }}>Competitor</div>
                      <div style={{ fontSize: 12 }}>{row.competitorValue}</div>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 11, opacity: 0.64 }}>WyreStorm</div>
                      <div style={{ fontSize: 12 }}>{row.wyrestormValue}</div>
                      {row.note ? (
                        <div style={{ fontSize: 11, opacity: 0.76 }}>{row.note}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

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
                <div style={{ fontSize: 14, fontWeight: 800 }}>Sales talk track</div>
                {activeOption.salesStory.map((line) => (
                  <div
                    key={line}
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.72)",
                      lineHeight: 1.5,
                    }}
                  >
                    - {line}
                  </div>
                ))}
                {activeOption.cautions.map((line) => (
                  <div
                    key={line}
                    style={{ fontSize: 12, color: "#ffe6b7", lineHeight: 1.5 }}
                  >
                    - {line}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
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

          <div
            style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.55 }}
          >
            {liveResult.record.brand} {liveResult.record.competitorSku} compares closest to{" "}
            <strong>
              {liveResult.candidate?.primaryOption?.wyrestormSku ||
                liveResult.record.wyrestormSku}
            </strong>
            {liveResult.record.wyrestormName
              ? ` (${liveResult.record.wyrestormName})`
              : ""}.
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
                <div
                  key={warning}
                  style={{ fontSize: 12, color: "#ffe6b7" }}
                >
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
          <div
            key={item}
            style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}
          >
            - {item}
          </div>
        ))}
      </div>
    </div>
  );
}
