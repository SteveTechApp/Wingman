import * as React from "react";

import type {
  CommercialReadinessCheck,
  CommercialReadinessStatus,
} from "@/features/readiness/commercialReadiness";

type ProposalHandoffPanelProps = {
  status: CommercialReadinessStatus;
  score: number;
  checks: CommercialReadinessCheck[];
  nextStep: string;
};

function statusStyle(status: CommercialReadinessStatus): React.CSSProperties {
  switch (status) {
    case "Commercial Ready":
      return {
        border: "1px solid rgba(16,185,129,0.45)",
        background: "rgba(16,185,129,0.12)",
      };
    case "Engineering Review Required":
      return {
        border: "1px solid rgba(244,63,94,0.45)",
        background: "rgba(244,63,94,0.12)",
      };
    case "Review Needed":
      return {
        border: "1px solid rgba(245,158,11,0.45)",
        background: "rgba(245,158,11,0.12)",
      };
    default:
      return {
        border: "1px solid rgba(148,163,184,0.45)",
        background: "rgba(148,163,184,0.12)",
      };
  }
}

export default function ProposalHandoffPanel(props: ProposalHandoffPanelProps) {
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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Quote pack handoff</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            Use this as a commercial readiness gate before sharing proposal outputs.
          </div>
        </div>

        <div
          style={{
            ...statusStyle(props.status),
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {props.status} ({props.score}%)
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: 8,
          borderRadius: 999,
          marginTop: 12,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${props.score}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(14,165,233,0.8), rgba(16,185,129,0.8))",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {props.checks.map((item) => (
          <div
            key={item.id}
            style={{
              padding: 12,
              borderRadius: 12,
              border: item.complete
                ? "1px solid rgba(16,185,129,0.35)"
                : "1px solid rgba(245,158,11,0.28)",
              background: item.complete
                ? "rgba(16,185,129,0.08)"
                : "rgba(245,158,11,0.07)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontWeight: 700 }}>{item.complete ? "Ready" : "Pending"}</div>
            <div style={{ marginTop: 4 }}>{item.label}</div>
            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>{item.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.82 }}>
        Next step: {props.nextStep}
      </div>
    </section>
  );
}