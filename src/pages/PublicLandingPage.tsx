import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { brand } from "@/branding/brand";

const capabilityPills = [
  "Discovery",
  "Architecture",
  "Products",
  "Proposal",
  "Video Wall",
  "USB",
  "Control",
];

const featureCards = [
  {
    eyebrow: "Discovery",
    title: "Capture requirements",
    body: "Structure room conditions, displays, source counts, cable distance, USB, control, and audio needs before product selection begins.",
  },
  {
    eyebrow: "Architecture",
    title: "Choose the right signal path",
    body: "Guide users toward HDBaseT, AVoIP, matrix switching, USB extension, or video wall workflows based on the application.",
  },
  {
    eyebrow: "Products",
    title: "Build the solution",
    body: "Turn the selected architecture into recommended WyreStorm platforms, building blocks, and a starter BOM direction.",
  },
  {
    eyebrow: "Proposal",
    title: "Move toward output",
    body: "Keep commercial logic, documentation, and proposal readiness aligned to the actual project workflow.",
  },
];

const workflowSteps = [
  "Discovery",
  "Architecture",
  "Products",
  "Proposal",
];

export default function PublicLandingPage() {
  const navigate = useNavigate();

  const startNewProject = () => {
    try {
      localStorage.setItem("wm_force_create_project", "1");
    } catch {}
    navigate("/app/dashboard");
  };

  return (
    <div className="wm-landing-page">
      <section className="wm-landing-hero">
        <div className="wm-landing-hero-inner">
          <div className="wm-landing-hero-panel">
            <div className="wm-landing-brand">
              <img
                src={brand.logo}
                alt={brand.fullName}
                className="wm-landing-logo"
              />

              <div className="wm-landing-brand-copy">
                <div className="wm-landing-kicker">WyreStorm Sales Assistant</div>
                <h1 className="wm-landing-title">
                  Turn AV requirements into proposal-ready system designs.
                </h1>
                <p className="wm-landing-subtitle">
                  Wingman helps sales and pre-sales teams capture room requirements,
                  choose the right WyreStorm architecture, structure a BOM, and move
                  opportunities through a consistent workflow.
                </p>
              </div>
            </div>

            <div className="wm-landing-actions">
              <button type="button" className="wm-btn wm-btn-primary" onClick={startNewProject}>
                Start New Project
              </button>
              <Link to="/app/tools/discovery" className="wm-btn wm-btn-secondary">
                Run Discovery Wizard
              </Link>
              <Link to="/app/dashboard" className="wm-btn wm-btn-secondary">
                Open Mission Control
              </Link>
            </div>

            <div className="wm-landing-pill-row">
              {capabilityPills.map((pill) => (
                <span key={pill} className="wm-badge">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wm-landing-section">
        <div className="wm-landing-workflow-strip wm-card">
          <div className="wm-landing-section-kicker">How Wingman works</div>
          <div className="wm-landing-workflow-row">
            {workflowSteps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="wm-landing-workflow-step">
                  <span className="wm-landing-workflow-index">0{index + 1}</span>
                  <span>{step}</span>
                </div>
                {index < workflowSteps.length - 1 ? (
                  <div className="wm-landing-workflow-arrow">→</div>
                ) : null}
              </React.Fragment>
            ))}
          </div>
          <p className="wm-muted wm-landing-workflow-copy">
            Start with the application, move into architecture, then product selection,
            and only then build the commercial output.
          </p>
        </div>
      </section>

      <section className="wm-landing-section">
        <div className="wm-landing-section-head">
          <div>
            <div className="wm-landing-section-kicker">What Wingman helps you do</div>
            <h2 className="wm-subtitle wm-landing-section-title">
              Core workflow tools for AV sales and design
            </h2>
          </div>
          <p className="wm-muted wm-landing-section-copy">
            Built to guide less technical sales users while still supporting structured
            system design, solution logic, and proposal consistency.
          </p>
        </div>

        <div className="wm-landing-feature-grid">
          {featureCards.map((card) => (
            <article key={card.title} className="wm-card wm-landing-feature-card">
              <div className="wm-landing-card-kicker">{card.eyebrow}</div>
              <h3 className="wm-landing-card-title">{card.title}</h3>
              <p className="wm-muted wm-landing-card-copy">{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}