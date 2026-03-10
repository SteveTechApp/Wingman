import React from "react";
import { useNavigate } from "react-router-dom";
import { WINGMAN_FEATURES, WINGMAN_TOOLS } from "./toolFeatureModel";

export default function ToolHubPage() {
  const navigate = useNavigate();
  const startProject = WINGMAN_FEATURES.find((x) => x.id === "start-project");

  return (
    <div
      className="wm-page"
      style={{
        gridTemplateRows: "auto auto 1fr",
        gap: 8,
        padding: "2px 2px 4px",
        minHeight: "100%",
      }}
    >
      <section className="wm-hero">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="wm-title-xl">
              Tools help you decide. Features help you build.
            </div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Use tools during design and sales conversations. Use features to create designs, BOMs and proposals.
            </div>
          </div>

          {startProject ? (
            <button
              type="button"
              className="wm-btn wm-btn-primary"
              style={{ padding: "9px 14px", minWidth: 134 }}
              onClick={() => navigate(startProject.to)}
            >
              Start New Project
            </button>
          ) : null}
        </div>
      </section>

      <div className="wm-grid">
        <section className="wm-grid">
          <div className="wm-section-title">Tools</div>
          <div className="wm-grid-cards">
            {WINGMAN_TOOLS.map((item) => (
              <div key={item.id} className="wm-card">
                <div className="wm-grid" style={{ gap: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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

        <section className="wm-grid">
          <div className="wm-section-title">Features</div>
          <div className="wm-grid-cards">
            {WINGMAN_FEATURES.map((item) => (
              <div key={item.id} className={`wm-card${item.id === "start-project" ? " wm-card--primary" : ""}`}>
                <div className="wm-grid" style={{ gap: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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
      </div>

      <div className="wm-panel-soft" />
    </div>
  );
}