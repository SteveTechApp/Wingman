import React from "react";
import { useNavigate } from "react-router-dom";
import { WINGMAN_FEATURES, WINGMAN_TOOLS } from "@/features/tools/toolFeatureModel";

export default function DashboardPage() {
  const navigate = useNavigate();

  const quickFeatures = WINGMAN_FEATURES.filter((x) =>
    ["start-project", "discovery", "templates", "proposal-builder"].includes(x.id),
  );

  const quickTools = WINGMAN_TOOLS.filter((x) =>
    ["guru", "catalogue", "competitor-compare"].includes(x.id),
  );

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.9fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div className="wm-grid" style={{ gap: 6 }}>
            <div className="wm-title-xl">Mission Control</div>
            <div className="wm-body-sm">
              Start projects quickly, launch the right workflow, and keep tools close while building proposals.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{ padding: "9px 14px", minWidth: 140 }}
                onClick={() => navigate("/app/projects/new")}
              >
                Start New Project
              </button>
              <button
                type="button"
                className="wm-btn"
                style={{ padding: "9px 14px" }}
                onClick={() => navigate("/app/tools/discovery")}
              >
                Open Discovery Wizard
              </button>
            </div>
          </div>

          <div className="wm-grid-cards" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div className="wm-card wm-card--primary">
              <div className="wm-title-lg">Projects</div>
              <div className="wm-body" style={{ marginTop: 4 }}>Manage active opportunities and saved workspaces.</div>
            </div>
            <div className="wm-card">
              <div className="wm-title-lg">Proposal Path</div>
              <div className="wm-body" style={{ marginTop: 4 }}>Move from requirements to BOM and proposal pack.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Popular workflows</div>
        <div className="wm-grid-cards">
          {quickFeatures.map((item) => (
            <div key={item.id} className={`wm-card${item.id === "start-project" ? " wm-card--primary" : ""}`}>
              <div className="wm-grid" style={{ gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{item.title}</div>
                  {item.tag ? <span className="wm-tag">{item.tag}</span> : null}
                </div>
                <div className="wm-body">{item.description}</div>
                <div>
                  <button
                    type="button"
                    className={`wm-btn${item.id === "start-project" ? " wm-btn-primary" : ""}`}
                    onClick={() => navigate(item.to)}
                  >
                    Open {item.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Useful tools</div>
        <div className="wm-grid-cards">
          {quickTools.map((item) => (
            <div key={item.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{item.title}</div>
                  {item.tag ? <span className="wm-tag">{item.tag}</span> : null}
                </div>
                <div className="wm-body">{item.description}</div>
                <div>
                  <button type="button" className="wm-btn" onClick={() => navigate(item.to)}>
                    Open {item.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wm-grid-cards">
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-title-lg">Suggested next step</div>
          <div className="wm-body" style={{ marginTop: 6 }}>
            For new opportunities, begin with Discovery Wizard or a template. Use Guru and the Product Catalogue during selection.
          </div>
        </div>
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-title-lg">Platform direction</div>
          <div className="wm-body" style={{ marginTop: 6 }}>
            Features create outputs. Tools support decisions. Keeping that distinction consistent will make the app clearer.
          </div>
        </div>
      </section>
    </div>
  );
}