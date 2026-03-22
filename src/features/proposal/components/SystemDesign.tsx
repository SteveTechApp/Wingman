import React, { useState } from "react";
import type { ProposalViewModel } from "../proposalModel";

type Props = {
  model: ProposalViewModel;
};

type SectionProps = {
  title: string;
  summary: string;
  bullets: string[];
  defaultOpen?: boolean;
};

function DesignSection({ title, summary, bullets, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          minHeight: 52,
          padding: "0 16px",
          border: 0,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 14,
          fontWeight: 900,
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        <span style={{ opacity: 0.7 }}>{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div style={{ padding: "0 16px 16px", display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.86 }}>
            {summary}
          </div>

          {bullets.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {bullets.map((bullet) => (
                <div
                  key={bullet}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 13,
                    lineHeight: 1.45,
                    opacity: 0.84,
                  }}
                >
                  <span style={{ opacity: 0.8 }}>•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function SystemDesign({ model }: Props) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      {model.designSections.map((section, index) => (
        <DesignSection
          key={section.title}
          title={section.title}
          summary={section.summary}
          bullets={section.bullets}
          defaultOpen={index === 0}
        />
      ))}
    </section>
  );
}