import React from "react";

const checks = [
  "BOM summary is visible",
  "Commercial assumptions are stated",
  "Scope exclusions are explicit",
  "Internal review path is clear",
  "The next customer-safe step is obvious",
];

export default function ProposalHandoffPanel() {
  return (
    <section
      data-wm-proposal-handoff="1"
      style={{
        margin: "0 0 18px 0",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>Quote pack handoff</div>
      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
        Use this section as a commercial readiness gate before sending or pricing.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {checks.map((item) => (
          <div
            key={item}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}