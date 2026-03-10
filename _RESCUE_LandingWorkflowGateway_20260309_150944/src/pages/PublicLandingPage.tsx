import * as React from "react";
import { Link } from "react-router-dom";
import { brand } from "@/branding/brand";

const capabilityPills = [
  "Discovery",
  "Templates",
  "HDBaseT",
  "AVoIP",
  "Video Wall",
  "USB",
  "Control",
];

const workflowCards = [
  {
    eyebrow: "Discovery",
    title: "Capture requirements",
    body: "Structure customer needs, room conditions, displays, source counts, and key AV constraints before product selection begins.",
  },
  {
    eyebrow: "Design",
    title: "Build system logic",
    body: "Guide users toward suitable WyreStorm architectures for HDBaseT, AVoIP, video wall, USB extension, and control-led applications.",
  },
  {
    eyebrow: "Proposal",
    title: "Generate outputs",
    body: "Support proposal-ready thinking with clearer solution framing, BOM structure, and consistent project documentation.",
  },
  {
    eyebrow: "Compare",
    title: "Position WyreStorm",
    body: "Help sales teams compare product approaches, understand feature fit, and present stronger recommendations with confidence.",
  },
];

const journeyItems = [
  "Start with the customer application, not the product.",
  "Move from discovery into architecture and product selection.",
  "Keep BOM, proposal logic, and commercial outputs aligned.",
];

export default function PublicLandingPage() {
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
                <h1 className="wm-landing-title">AV sales. Simplified.</h1>
                <p className="wm-landing-subtitle">
                  Design systems, select the right WyreStorm products, compare
                  solutions, and generate proposal-ready outputs with greater
                  speed and consistency.
                </p>
              </div>
            </div>

            <div className="wm-landing-actions">
              <Link to="/login" className="wm-btn wm-btn-primary">
                Enter Workspace
              </Link>
              <Link to="/app/tools" className="wm-btn wm-btn-secondary">
                Explore Tools
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
        <div className="wm-landing-section-head">
          <div>
            <div className="wm-landing-section-kicker">What Wingman helps you do</div>
            <h2 className="wm-subtitle wm-landing-section-title">
              Core workflow tools for AV sales and design
            </h2>
          </div>
          <p className="wm-muted wm-landing-section-copy">
            Built to guide less technical sales users while still supporting
            structured design, BOM thinking, and proposal consistency.
          </p>
        </div>

        <div className="wm-landing-feature-grid">
          {workflowCards.map((card) => (
            <article key={card.title} className="wm-card wm-landing-feature-card">
              <div className="wm-landing-card-kicker">{card.eyebrow}</div>
              <h3 className="wm-landing-card-title">{card.title}</h3>
              <p className="wm-muted wm-landing-card-copy">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wm-landing-section">
        <div className="wm-landing-journey wm-card">
          <div className="wm-landing-journey-copy">
            <div className="wm-landing-section-kicker">Commercial logic</div>
            <h2 className="wm-subtitle wm-landing-section-title">
              Built around a real AV workflow
            </h2>
            <p className="wm-muted">
              Wingman should feel like a working sales and pre-sales platform,
              not a product catalogue with extra screens. The structure below
              keeps user actions aligned to how AV opportunities actually move.
            </p>
          </div>

          <div className="wm-landing-journey-list">
            {journeyItems.map((item, idx) => (
              <div key={item} className="wm-list-row wm-landing-journey-row">
                <div className="wm-landing-step">
                  <span className="wm-landing-step-index">0{idx + 1}</span>
                  <span>{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}