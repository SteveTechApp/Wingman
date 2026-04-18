import * as React from "react";
import { Link, Navigate } from "react-router-dom";

import { routeMap } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";

import "./wingman-public-landing.css";

const JOURNEY_CARDS = [
  {
    step: "01",
    title: "Capture the brief",
    copy:
      "Start with room type, source and display counts, transport distances, USB needs, and the commercial constraints that shape the system.",
  },
  {
    step: "02",
    title: "Shape the architecture",
    copy:
      "Move from discovery to signal transport, switching, control, and product-family fit without jumping straight into SKU dumping.",
  },
  {
    step: "03",
    title: "Finish proposal-ready",
    copy:
      "Turn the recommendation into a BOM, customer-safe wording, and an internal handoff that sales and design can both work from.",
  },
];

export default function PublicLandingPage() {
  const { backendHealthy, isAuthenticated, status } = useAuth();

  React.useEffect(() => {
    document.documentElement.setAttribute("data-wm-public-landing-page", "true");
    document.body.setAttribute("data-wm-public-landing-page", "true");

    return () => {
      document.documentElement.removeAttribute("data-wm-public-landing-page");
      document.body.removeAttribute("data-wm-public-landing-page");
    };
  }, []);

  if (isAuthenticated && status !== "loading") {
    return <Navigate to={routeMap.app.dashboard} replace />;
  }

  return (
    <div className="wm-public-landing">
      <main className="wm-public-landing__main">
        <header className="wm-public-landing__brand">
          <div className="wm-public-landing__brand-mark">
            <span className="wm-public-landing__brand-wyrestorm">WyreStorm</span>
            <span className="wm-public-landing__brand-wingman">Wingman</span>
          </div>
        </header>

        <section className="wm-public-landing__hero">
          <h1 className="wm-public-landing__title">
            One operating surface for AV discovery, architecture, BOM, and proposal work.
          </h1>

          <p className="wm-public-landing__summary">
            Wingman helps WyreStorm sales and pre-sales teams move from customer
            requirements to system design and proposal-ready output without losing the
            project thread.
          </p>

          {!backendHealthy ? (
            <div className="wm-public-landing__notice wm-public-landing__notice--warn" role="status">
              Live sign-in may be unavailable right now. Check backend connectivity and try again.
            </div>
          ) : null}

          {status === "loading" ? (
            <div className="wm-public-landing__notice wm-public-landing__notice--info" role="status">
              Checking saved session and restoring the last workspace state.
            </div>
          ) : null}

          <div className="wm-public-landing__actions">
            <Link
              to={routeMap.public.login}
              className="wm-public-landing__button wm-public-landing__button--primary"
            >
              Sign In
            </Link>

            <Link
              to={routeMap.public.signup}
              className="wm-public-landing__button wm-public-landing__button--ghost"
            >
              Create Account
            </Link>
          </div>
        </section>

        <section className="wm-public-landing__journey" aria-label="Wingman workflow">
          {JOURNEY_CARDS.map((card) => (
            <article key={card.step} className="wm-public-landing__card">
              <span className="wm-public-landing__step">{card.step}</span>
              <h2 className="wm-public-landing__card-title">{card.title}</h2>
              <p className="wm-public-landing__card-copy">{card.copy}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
