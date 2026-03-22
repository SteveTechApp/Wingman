import React from "react";
import type { ProposalViewModel } from "../proposalModel";

type Props = {
  model: ProposalViewModel;
};

export default function ExecutiveSummary({ model }: Props) {
  return (
    <section
      style={{
        padding: 20,
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(11,18,32,0.94), rgba(15,23,42,0.94))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", opacity: 0.65 }}>
          Proposal Summary
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>
          {model.projectName}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 26,
              padding: "0 10px",
              borderRadius: 999,
              background: "rgba(0,160,120,0.16)",
              border: "1px solid rgba(0,160,120,0.28)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {model.systemType}
          </span>
          {model.customerName ? (
            <span style={{ fontSize: 12, opacity: 0.72 }}>
              Customer: {model.customerName}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>
        {model.summaryText}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {model.metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              borderRadius: 14,
              padding: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              display: "grid",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.65, textTransform: "uppercase" }}>
              {metric.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>Key Benefits</div>
        <div style={{ display: "grid", gap: 8 }}>
          {model.keyBenefits.map((benefit) => (
            <div
              key={benefit}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                fontSize: 14,
                lineHeight: 1.45,
                opacity: 0.92,
              }}
            >
              <span style={{ fontWeight: 900, opacity: 0.9 }}>✓</span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}