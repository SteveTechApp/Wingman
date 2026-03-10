import React from "react";
import { useNavigate } from "react-router-dom";

type ProjectCard = {
  id: string;
  title: string;
  stage: string;
  customer: string;
  summary: string;
};

const SAMPLE_PROJECTS: ProjectCard[] = [
  {
    id: "proj-1",
    title: "Corporate Boardroom Refresh",
    stage: "Discovery",
    customer: "Example Client",
    summary: "High-value room upgrade with switching, USB and BYOD requirements.",
  },
  {
    id: "proj-2",
    title: "Education Lecture Space",
    stage: "Design",
    customer: "Sample University",
    summary: "Template-led teaching space with presentation, audio and room control needs.",
  },
  {
    id: "proj-3",
    title: "Reception Video Wall",
    stage: "Proposal",
    customer: "Demo Account",
    summary: "Large-format display design requiring video wall planning and proposal output.",
  },
];

export default function ProjectsPage() {
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
            <div className="wm-title-xl">Projects workspace</div>
            <div className="wm-body-sm" style={{ marginTop: 2 }}>
              Track opportunities, continue active work, and jump back into the right workflow.
            </div>
          </div>

          <button
            type="button"
            className="wm-btn wm-btn-primary"
            style={{ padding: "9px 14px", minWidth: 140 }}
            onClick={() => navigate("/app/projects/new")}
          >
            Start New Project
          </button>
        </div>
      </section>

      <section className="wm-grid">
        <div className="wm-section-title">Recent projects</div>
        <div className="wm-grid-cards">
          {SAMPLE_PROJECTS.map((project) => (
            <div key={project.id} className="wm-card">
              <div className="wm-grid" style={{ gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div className="wm-title-lg">{project.title}</div>
                  <span className="wm-tag">{project.stage}</span>
                </div>
                <div className="wm-body"><strong>{project.customer}</strong></div>
                <div className="wm-body">{project.summary}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/discovery")}>
                    Continue
                  </button>
                  <button type="button" className="wm-btn" onClick={() => navigate("/app/tools/proposals")}>
                    Open Proposal Builder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wm-grid-cards">
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-title-lg">Recommended structure</div>
          <div className="wm-body" style={{ marginTop: 6 }}>
            Keep projects as the saved workspace layer, while tools and features remain action layers.
          </div>
        </div>
        <div className="wm-panel" style={{ padding: 12 }}>
          <div className="wm-title-lg">Next enhancement</div>
          <div className="wm-body" style={{ marginTop: 6 }}>
            Wire this page to your real project store so recent, pinned and archived projects are all surfaced consistently.
          </div>
        </div>
      </section>
    </div>
  );
}