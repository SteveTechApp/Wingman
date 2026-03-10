import React from "react";
import { useNavigate } from "react-router-dom";
import { getWingmanFeatures, getWingmanTools } from "@/core/wingman/wingmanData";

export default function ToolHubPage() {
  const navigate = useNavigate();
  const tools = getWingmanTools();
  const features = getWingmanFeatures();
  const startProject = features.find((x) => x.id === "start-project");

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div>
            <div className="wm-title-xl">Tools help you decide. Features help you build.</div>
            <div className="wm-body-sm wm-page-subtitle">
              Use tools during design and sales conversations. Use features to create designs, BOMs, and proposals.
            </div>
          </div>

          {startProject ? (
            <div className="wm-actions-row">
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={() => navigate(startProject.to)}
              >
                Start New Project
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="wm-split-columns">
        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Tools</h2>
              <p>Reference and utility experiences used throughout the project cycle.</p>
            </div>
          </div>

          <div className="wm-grid-cards">
            {tools.map((item) => (
              <article key={item.id} className="wm-work-card">
                <div className="wm-work-card__head">
                  <div className="wm-title-lg">{item.title}</div>
                  {item.tag ? <span className="wm-tag">{item.tag}</span> : null}
                </div>

                <div className="wm-body">{item.description}</div>

                <div>
                  <button type="button" className="wm-btn" onClick={() => navigate(item.to)}>
                    Open {item.title}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="wm-section">
          <div className="wm-section__head">
            <div className="wm-section__titles">
              <h2>Features</h2>
              <p>Workflow experiences for project creation, requirements capture, and outputs.</p>
            </div>
          </div>

          <div className="wm-grid-cards">
            {features.map((item) => (
              <article key={item.id} className={`wm-work-card${item.id === "start-project" ? " wm-work-card--primary" : ""}`}>
                <div className="wm-work-card__head">
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
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
