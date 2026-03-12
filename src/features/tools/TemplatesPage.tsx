import React from "react";
import { useNavigate } from "react-router-dom";

type TemplateCard = {
  id: string;
  title: string;
  market: string;
  summary: string;
};

const TEMPLATES: TemplateCard[] = [
  {
    id: "corporate-huddle",
    title: "Corporate Huddle Room",
    market: "Corporate",
    summary: "Fast-start room template for small spaces with collaboration and presentation focus.",
  },
  {
    id: "boardroom",
    title: "Executive Boardroom",
    market: "Corporate",
    summary: "Higher-value template with switching, USB, control and premium room experience.",
  },
  {
    id: "classroom",
    title: "Teaching Space",
    market: "Education",
    summary: "Presentation-led design path for education rooms with predictable AV requirements.",
  },
  {
    id: "videowall",
    title: "Reception Video Wall",
    market: "Commercial",
    summary: "Template-led start for digital signage and display wall opportunities.",
  },
];

export default function TemplatesPage() {
  const navigate = useNavigate();

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div className="wm-title-xl">Templates</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Start from proven solution patterns to accelerate design selection and proposal generation.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/discovery")}>
              Back to Discovery
            </button>
            <button type="button" className="wm-btn wm-btn-primary" onClick={() => navigate("/app/tools/proposal")}>
              Proposal Builder
            </button>
          </div>
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Suggested templates</div>
        <div className="wm-grid-cards">
          {TEMPLATES.map((item) => (
            <div key={item.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{item.title}</div>
                  <span className="wm-tag">{item.market}</span>
                </div>

                <div className="wm-body">{item.summary}</div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/room-wizard")}>
                    Use Template
                  </button>
                  <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/catalog")}>
                    View Products
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wm-grid-cards">
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-title-lg">Why templates matter</div>
          <div className="wm-body" style={{ marginTop: 6 }}>
            Templates give non-technical sales users a safe starting point before moving into custom room design.
          </div>
        </div>
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-title-lg">How to use templates</div>
          <div className="wm-body" style={{ marginTop: 6 }}>
            Select a template, adjust for room context, then continue to Product Catalog or Proposal Builder for refinement.
          </div>
        </div>
      </section>
    </div>
  );
}
