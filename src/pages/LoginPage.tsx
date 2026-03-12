import * as React from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";
import heroLogo from "@/assets/branding/heroLogo.png";

const capabilityCards = [
  {
    title: "Design workflows",
    body: "Jump back into room design, video wall planning, and topology guidance without losing project context.",
    Icon: Boxes,
  },
  {
    title: "Evidence-backed compare",
    body: "Cross-check WyreStorm against competitor products using the richer seeded catalog and structured product data.",
    Icon: Sparkles,
  },
  {
    title: "Proposal output",
    body: "Move from solution design into BOM support, proposal structure, and customer-ready handoff faster.",
    Icon: FileText,
  },
];

const trustPoints = [
  "Workspace-aware projects and saved progress",
  "Demo mode remains available during service outages",
  "Built for sales, pre-sales, and solution design teams",
];

export default function LoginPage() {
  return (
    <main className="wm-login-page">
      <div className="wm-login-page__bg" />
      <div className="wm-login-page__glow wm-login-page__glow--left" />
      <div className="wm-login-page__glow wm-login-page__glow--right" />

      <div className="wm-login-page__inner">
        <header className="wm-login-page__header">
          <Link to="/" className="wm-login-page__brand">
            <img src={heroLogo} alt="WyreStorm Wingman" className="wm-login-page__logo" />
            <div className="wm-login-page__brand-copy">
              <div className="wm-login-page__brand-eyebrow">
                WyreStorm
              </div>
              <div className="wm-login-page__brand-title">Wingman workspace</div>
            </div>
          </Link>

          <div className="wm-login-page__header-actions">
            <Link to="/" className="wm-login-page__header-link">
              Back to site
            </Link>
            <Link to="/signup" className="wm-login-page__header-link wm-login-page__header-link--primary">
              Create account
            </Link>
          </div>
        </header>

        <section className="wm-login-page__layout">
          <div className="wm-login-page__info">
            <div className="wm-login-page__hero">
              <div className="wm-login-page__badge">
                <ShieldCheck size={14} />
                Secure workspace sign in
              </div>

              <div className="wm-login-page__copy-stack">
                <h1 className="wm-login-page__title">
                  Pick up the design exactly where your team left it.
                </h1>
                <p className="wm-login-page__subtitle">
                  Sign in to access dashboards, active projects, competitor comparisons, room workflows, and proposal-ready outputs in one place.
                </p>
              </div>
            </div>

            <div className="wm-login-page__capability-grid">
              {capabilityCards.map(({ title, body, Icon }) => (
                <article key={title} className="wm-login-page__capability-card">
                  <div className="wm-login-page__capability-icon">
                    <Icon size={20} />
                  </div>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </article>
              ))}
            </div>

            <div className="wm-login-page__trust-card">
              <div className="wm-login-page__trust-head">
                <div>
                  <div className="wm-login-page__trust-eyebrow">
                    Why teams use Wingman
                  </div>
                  <div className="wm-login-page__trust-title">
                    Modern AV workflow support, not just a login wall.
                  </div>
                </div>
                <div className="wm-login-page__trust-arrow">
                  <ArrowRight size={24} />
                </div>
              </div>

              <div className="wm-login-page__trust-list">
                {trustPoints.map((point) => (
                  <div key={point} className="wm-login-page__trust-point">
                    <span className="wm-login-page__trust-dot" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="wm-login-page__form">
            <LoginForm
              title="Welcome back"
              subtitle="Sign in to open your workspace, or continue in demo mode while deployment services are unavailable."
              variant="modern"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
