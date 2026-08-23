import { Link } from "react-router-dom";
import { buildLabel } from "../lib/buildInfo";

const urgentActions = [
  {
    title: "Escalate to pre-sales",
    body: "Use this when the opportunity needs technical support, product confirmation or internal review.",
    to: "/wingman/call-coach",
    cta: "Start handoff",
  },
  {
    title: "Request solution review",
    body: "Use this when the system shape is known but you need confidence before sending it to the customer.",
    to: "/wingman/documents",
    cta: "Prepare review",
  },
  {
    title: "Create customer response",
    body: "Use this when you need a clean follow-up email, proposal wording or response pack.",
    to: "/wingman/response-pack",
    cta: "Build response",
  },
] as const;

const menuCards = [
  {
    title: "Live customer conversation",
    body: "Use during a call when the customer is still describing the requirement.",
    bestFor: "Next question, notes, live capture and handoff.",
    to: "/wingman/call-coach",
    cta: "Open Call Coach",
  },
  {
    title: "Product fit",
    body: "Use when you need to identify the right WyreStorm product or product family.",
    bestFor: "SKU choice, product role and application fit.",
    to: "/wingman/products",
    cta: "Open Products",
  },
  {
    title: "Competitor check",
    body: "Use when the customer names a competitor product and you need a WyreStorm alternative.",
    bestFor: "Comparable product class, match gaps and risk checks.",
    to: "/wingman/compare",
    cta: "Open Compare",
  },
  {
    title: "Document output",
    body: "Use when the conversation needs to become a customer-safe written response.",
    bestFor: "Email wording, proposal text and response packs.",
    to: "/wingman/response-pack",
    cta: "Open Response Pack",
  },
  {
    title: "Project workspace",
    body: "Use when the opportunity has multiple rooms, stages or follow-up actions.",
    bestFor: "Saved projects, account notes and project continuity.",
    to: "/wingman/projects",
    cta: "Open Projects",
  },
  {
    title: "Training and reference",
    body: "Use when the salesperson needs to understand terminology, product logic or selling prompts.",
    bestFor: "Glossary, product guidance and sales confidence.",
    to: "/wingman/learn",
    cta: "Open Learn",
  },
] as const;

const confidenceSignals = [
  "The customer has named products, but the required system shape is still unclear.",
  "USB, audio, control, networking or display behaviour may affect the recommendation.",
  "A competitor SKU is being matched without enough evidence.",
  "The customer needs written wording that should be commercially safe.",
] as const;

export function SupportPage() {
  return (
    <main className="wm-support-landing" data-wingman-page="support">
      <section className="wm-support-landing__hero">
        <div>
          <p className="wm-support-landing__eyebrow">Support / handoff</p>
          <h1>Create a clean handoff when confidence drops.</h1>
          <p>
            Choose the support path that matches the situation. This page is a routing menu, not a full feature index.
          </p>
        </div>

        <div className="wm-support-landing__heroActions" aria-label="Primary support actions">
          <Link to="/wingman/call-coach">Open Call Coach</Link>
          <Link to="/wingman/response-pack">Open Response Pack</Link>
        </div>
      </section>

      <section className="wm-support-landing__quick">
        <div className="wm-support-landing__sectionHeader">
          <p className="wm-support-landing__eyebrow">Immediate support</p>
          <h2>What do you need right now?</h2>
        </div>

        <div className="wm-support-landing__quickGrid">
          {urgentActions.map((action) => (
            <article className="wm-support-landing__quickCard" key={action.title}>
              <div>
                <h3>{action.title}</h3>
                <p>{action.body}</p>
              </div>
              <Link to={action.to}>{action.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="wm-support-landing__body">
        <div className="wm-support-landing__menu">
          <div className="wm-support-landing__sectionHeader">
            <p className="wm-support-landing__eyebrow">Choose a path</p>
            <h2>Support menu</h2>
          </div>

          <div className="wm-support-landing__menuGrid">
            {menuCards.map((card) => (
              <article className="wm-support-landing__menuCard" key={card.title}>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <span>{card.bestFor}</span>
                </div>
                <Link to={card.to}>{card.cta}</Link>
              </article>
            ))}
          </div>
        </div>

        <aside className="wm-support-landing__aside">
          <p className="wm-support-landing__eyebrow">When to escalate</p>
          <h2>Confidence signals</h2>
          <ul>
            {confidenceSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
          <Link to="/wingman/call-coach">Start a guided handoff</Link>
        </aside>
      </section>

      <section className="wm-support-landing__build" aria-label="Build information">
        <p>
          Wingman build <strong>{buildLabel}</strong>
        </p>
        <p>Quote this when reporting a problem so the issue can be traced to the exact build.</p>
        <p className="wm-support-landing__legal">
          <Link to="/wingman/terms">Terms &amp; legal disclaimer</Link>
        </p>
      </section>
    </main>
  );
}

export default SupportPage;


