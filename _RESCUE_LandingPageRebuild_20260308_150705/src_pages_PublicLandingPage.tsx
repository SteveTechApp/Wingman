import * as React from "react";
import { Link } from "react-router-dom";
import heroLogo from "@/assets/branding/wyrestorm-wingman-logo.png";

const tags = ["Apollo", "NetworkHD", "HDBaseT", "Video Wall", "USB", "Control"];

const cards = [
  {
    tag: "Discovery",
    title: "Capture Requirements",
    body: "Structure customer needs, room conditions, distances, source/display counts, and key AV constraints before product selection begins.",
  },
  {
    tag: "Design",
    title: "Build System Logic",
    body: "Guide users towards suitable WyreStorm architectures for HDBaseT, AVoIP, video wall, USB extension, and control-led applications.",
  },
  {
    tag: "Proposal",
    title: "Generate Outputs",
    body: "Support proposal-ready thinking with clearer solution framing, BOM structure, and consistent project documentation.",
  },
  {
    tag: "Compare",
    title: "Position WyreStorm",
    body: "Help sales teams compare product approaches, understand feature fit, and present stronger recommendations with confidence.",
  },
];

export default function PublicLandingPage() {
  return (
    <main className="wm-landingPage">
      <section className="wm-landingHero">
        <div className="wm-landingHero__panel">
          <div className="wm-landing__logoWrap">
            <img
              src={heroLogo}
              alt="WyreStorm Wingman"
              className="wm-landing__logo"
            />
          </div>

          <div className="wm-landingHero__eyebrow">WyreStorm Sales Assistant</div>

          <h1 className="wm-landingHero__title">AV sales. Simplified.</h1>

          <p className="wm-landingHero__copy">
            Design systems, select the right WyreStorm products, compare solutions,
            and generate proposal-ready outputs with greater speed and consistency.
          </p>

          <div className="wm-landingHero__actions">
            <Link to="/app/dashboard">
              <button className="wm-btn-primary">Enter Workspace</button>
            </Link>

            <Link to="/app/tools">
              <button className="wm-btn-secondary">Explore Tools</button>
            </Link>
          </div>

          <div className="wm-landingHero__tags">
            {tags.map((tag) => (
              <span key={tag} className="wm-landingHero__tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="wm-landingSection">
        <div className="wm-landingSection__head">
          <div>
            <div className="wm-landingSection__eyebrow">What Wingman helps you do</div>
            <h2 className="wm-landingSection__title">Core workflow tools for AV sales and design</h2>
          </div>

          <p className="wm-landingSection__copy">
            Built to guide less technical sales users while still supporting structured design,
            BOM thinking, and proposal consistency.
          </p>
        </div>

        <div className="wm-landingCards">
          {cards.map((card) => (
            <article key={card.title} className="wm-landingCard">
              <div className="wm-landingCard__tag">{card.tag}</div>
              <h3 className="wm-landingCard__title">{card.title}</h3>
              <p className="wm-landingCard__body">{card.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}