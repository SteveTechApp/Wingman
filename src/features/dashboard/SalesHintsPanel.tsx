import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
  SALES_HINT_CARDS,
  type SalesHintCard,
  type SalesHintTone,
} from "./salesGuidance";

type SalesHintsPanelProps = {
  title?: string;
  subtitle?: string;
  cards?: SalesHintCard[];
};

function toneStyles(tone: SalesHintTone): React.CSSProperties {
  switch (tone) {
    case "amber":
      return {
        border: "1px solid rgba(251,191,36,0.22)",
        background:
          "linear-gradient(135deg, rgba(92,56,8,0.24), rgba(255,255,255,0.02))",
      };
    case "green":
      return {
        border: "1px solid rgba(74,222,128,0.22)",
        background:
          "linear-gradient(135deg, rgba(10,62,30,0.26), rgba(255,255,255,0.02))",
      };
    default:
      return {
        border: "1px solid rgba(103,232,249,0.22)",
        background:
          "linear-gradient(135deg, rgba(10,56,72,0.30), rgba(255,255,255,0.02))",
      };
  }
}

export default function SalesHintsPanel({
  title = "Sales hints",
  subtitle = "Short flash cards to help the rep steer the conversation with confidence.",
  cards = SALES_HINT_CARDS,
}: SalesHintsPanelProps) {
  const navigate = useNavigate();

  return (
    <section
      className="wm-card"
      style={{
        padding: 12,
        borderRadius: 18,
        display: "grid",
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 13, opacity: 0.76, marginTop: 4, lineHeight: 1.4 }}>
          {subtitle}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {cards.map((card) => (
          <article
            key={card.id}
            style={{
              ...toneStyles(card.tone),
              padding: 14,
              borderRadius: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {card.title}
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.86 }}>
              {card.promptLabel}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 700 }}>
              {card.prompt}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.74 }}>
              {card.guidance}
            </div>
            <button
              type="button"
              className="wm-btn-nav"
              onClick={() => navigate(card.to)}
              style={{
                justifySelf: "start",
                minHeight: 34,
                padding: "0 12px",
                borderRadius: 10,
              }}
            >
              {card.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
