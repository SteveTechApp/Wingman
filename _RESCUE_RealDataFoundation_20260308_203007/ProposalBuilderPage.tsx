import React from "react";

const proposalSections = [
  "Executive summary",
  "Customer requirements",
  "System overview",
  "Bill of materials",
  "Commercial notes",
  "Assumptions and exclusions",
];

export default function ProposalBuilderPage() {
  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
          <div>
            <div className="wm-title-xl">Proposal Builder</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Convert project requirements and selected products into a structured customer-ready output.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn">Preview Proposal</button>
            <button type="button" className="wm-btn wm-btn-primary">Generate Proposal Pack</button>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 10 }}>
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-section-title">Proposal content</div>

          <div className="wm-grid" style={{ marginTop: 8 }}>
            {proposalSections.map((section) => (
              <label key={section} className="wm-grid" style={{ gap: 4 }}>
                <span className="wm-body-sm">{section}</span>
                <textarea
                  className="wm-panel-soft"
                  style={{
                    width: "100%",
                    minHeight: 84,
                    padding: 10,
                    color: "var(--wm-text)",
                    background: "rgba(10,22,36,0.55)",
                    border: "1px solid var(--wm-border-soft)",
                    resize: "vertical",
                    outline: "none",
                  }}
                  defaultValue=""
                  placeholder={`Enter ${section.toLowerCase()}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="wm-grid" style={{ gap: 8 }}>
          <div className="wm-panel" style={{ padding: 12 }}>
            <div className="wm-title-lg">Output summary</div>
            <div className="wm-body" style={{ marginTop: 6 }}>
              Proposal Builder should be the final workflow step after Discovery, Templates or Room Designer.
            </div>
          </div>

          <div className="wm-panel" style={{ padding: 12 }}>
            <div className="wm-title-lg">Recommended structure</div>
            <div className="wm-body" style={{ marginTop: 6 }}>
              Keep the content blocks editable while product, pricing and assumptions are injected from the selected design.
            </div>
          </div>

          <div className="wm-panel" style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="wm-btn">Save Draft</button>
              <button type="button" className="wm-btn wm-btn-primary">Export Proposal</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}