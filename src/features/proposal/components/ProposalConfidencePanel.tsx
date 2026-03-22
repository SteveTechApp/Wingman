import React from "react";
import type { ProposalViewModel } from "../proposalModel";

type Props = {
  model: ProposalViewModel;
};

export default function ProposalConfidencePanel({ model }: Props) {
  const tone =
    model.confidence.level === "HIGH"
      ? "rgba(0,160,120,0.18)"
      : model.confidence.level === "MEDIUM"
      ? "rgba(245,158,11,0.18)"
      : "rgba(239,68,68,0.18)";

  return (
    <section
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>Design Confidence</div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 24,
            padding: "0 10px",
            borderRadius: 999,
            background: tone,
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 11,
            fontWeight: 900,
          }}
        >
          {model.confidence.level}
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {model.confidence.checks.map((check) => (
          <div key={check} style={{ display: "flex", gap: 10, fontSize: 13, opacity: 0.86 }}>
            <span>✓</span>
            <span>{check}</span>
          </div>
        ))}
      </div>

      {model.confidence.warnings.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Warnings</div>
          {model.confidence.warnings.map((warning) => (
            <div key={warning} style={{ display: "flex", gap: 10, fontSize: 13, opacity: 0.82 }}>
              <span>!</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}