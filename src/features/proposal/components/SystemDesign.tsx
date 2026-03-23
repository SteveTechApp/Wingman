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
    <div className={`wm-proposal-design__section${open ? " is-open" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="wm-proposal-design__toggle"
      >
        <span>{title}</span>
        <span className="wm-proposal-design__toggle-mark">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="wm-proposal-design__body">
          <div className="wm-proposal-design__summary">{summary}</div>

          {bullets.length ? (
            <div className="wm-proposal-design__bullet-list">
              {bullets.map((bullet) => (
                <div key={bullet} className="wm-proposal-design__bullet">
                  <span className="wm-proposal-design__bullet-mark">/</span>
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
    <section className="wm-proposal-design">
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
