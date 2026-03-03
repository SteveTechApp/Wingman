import React from "react";
import { useNavigate } from "react-router-dom";

type SalesStatus = "Draft" | "Review Needed" | "Commercial Ready" | "Engineering Review Required";

type ActionItem = {
  id: string;
  label: string;
  salesLabel: string;
  description: string;
  status: SalesStatus;
  to: string;
  why: string;
};

function badgeStyle(status: SalesStatus): React.CSSProperties {
  switch (status) {
    case "Commercial Ready":
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(16,185,129,0.45)",
        background: "rgba(16,185,129,0.10)",
        color: "inherit",
      };
    case "Engineering Review Required":
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(244,63,94,0.45)",
        background: "rgba(244,63,94,0.10)",
        color: "inherit",
      };
    case "Review Needed":
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(245,158,11,0.45)",
        background: "rgba(245,158,11,0.10)",
        color: "inherit",
      };
    default:
      return {
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid rgba(148,163,184,0.45)",
        background: "rgba(148,163,184,0.10)",
        color: "inherit",
      };
  }
}

export default function SalesActionStrip() {
  const navigate = useNavigate();

  const items: ActionItem[] = [
    {
      id: "new-opportunity",
      label: "Start New Opportunity",
      salesLabel: "Capture the customer need",
      description: "Collect the minimum information needed before choosing products.",
      status: "Draft",
      to: "/survey-import",
      why: "Best for first conversations and early qualification.",
    },
    {
      id: "competitor-match",
      label: "Match Competitor SKU",
      salesLabel: "Find a like-for-like starting point",
      description: "Translate a competing part number into a practical Wingman-aligned direction.",
      status: "Review Needed",
      to: "/tools/competitor",
      why: "Best when the customer already has a competing part in mind.",
    },
    {
      id: "build-room",
      label: "Build Room System",
      salesLabel: "Create a guided room solution",
      description: "Use templates to build a working first-pass design without deep technical steps.",
      status: "Commercial Ready",
      to: "/templates",
      why: "Best for meeting rooms, learning spaces, and repeatable designs.",
    },
    {
      id: "quote-pack",
      label: "Create Quote Pack",
      salesLabel: "Prepare a customer-safe summary",
      description: "Move from design intent to BOM summary, assumptions, and exclusions.",
      status: "Engineering Review Required",
      to: "/tools/proposal",
      why: "Best before sending anything externally or for internal pricing handoff.",
    },
    {
      id: "ask-wingman",
      label: "Ask Wingman",
      salesLabel: "Get guided sales help",
      description: "Use the assistant for product direction, positioning, and confidence checks.",
      status: "Review Needed",
      to: "/tools/guru",
      why: "Best when you need a plain-English second opinion.",
    },
  ];

  return (
    <section
      data-wm-sales-strip="1"
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
          <div style={{ fontSize: 18, fontWeight: 700 }}>Start with the outcome</div>
          <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4 }}>
            Designed for non-technical sales users: choose the customer task first, then let Wingman guide the detail.
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Sales-safe confidence labels are shown on each action.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.to)}
            style={{
              textAlign: "left",
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer",
            }}
            title={item.description}
            aria-label={item.label}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{item.label}</div>
              <span style={badgeStyle(item.status)}>{item.status}</span>
            </div>

            <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>{item.salesLabel}</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 10 }}>{item.description}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>{item.why}</div>
          </button>
        ))}
      </div>
    </section>
  );
}