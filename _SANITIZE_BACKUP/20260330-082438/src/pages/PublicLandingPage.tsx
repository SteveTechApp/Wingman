import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { brand } from "@/branding/brand";
import "@/styles/wm-public-landing.css";

export default function PublicLandingPage() {
  const navigate = useNavigate();

  const goLogin = useCallback(() => navigate("/login"), [navigate]);
  const goSignup = useCallback(() => navigate("/signup"), [navigate]);

  return (
    <div className="wm-public-landing-page">
      <div className="wm-public-landing-page__shell">
        <div className="wm-public-landing-page__layout">
          <section className="wm-public-landing-page__panel">
            <div className="wm-public-landing-page__brand">
              <img
                className="wm-public-landing-page__brand-logo"
                src={brand.logo}
                alt={brand.fullName}
              />
            </div>

            <h1 className="wm-public-landing-page__title">
              AV sales enablement built to fit real-world projects.
            </h1>

            <p className="wm-public-landing-page__copy">
              Wingman helps sales and pre-sales teams qualify applications, recommend the right
              WyreStorm products, and move from discovery to proposal with less friction.
            </p>

            <div className="wm-public-landing-page__actions">
              <button
                type="button"
                className="wm-public-landing-page__button wm-public-landing-page__button--primary"
                onClick={goLogin}
              >
                Sign in
              </button>

              <button
                type="button"
                className="wm-public-landing-page__button wm-public-landing-page__button--secondary"
                onClick={goSignup}
              >
                Create account
              </button>
            </div>

            <div className="wm-public-landing-page__feature-grid">
              <article className="wm-public-landing-page__feature">
                <h2 className="wm-public-landing-page__feature-title">Guide sales conversations</h2>
                <p className="wm-public-landing-page__feature-copy">
                  Help sales teams move from requirement to the right WyreStorm approach faster.
                </p>
              </article>

              <article className="wm-public-landing-page__feature">
                <h2 className="wm-public-landing-page__feature-title">Build system confidence</h2>
                <p className="wm-public-landing-page__feature-copy">
                  Turn application detail into practical recommendation logic and cleaner outputs.
                </p>
              </article>

              <article className="wm-public-landing-page__feature">
                <h2 className="wm-public-landing-page__feature-title">Reduce dependency</h2>
                <p className="wm-public-landing-page__feature-copy">
                  Give less technical users a more self-serve path without losing structure.
                </p>
              </article>
            </div>
          </section>

          <aside className="wm-public-landing-page__panel">
            <div className="wm-public-landing-page__eyebrow">Why Wingman</div>

            <h2 className="wm-public-landing-page__side-title">
              A cleaner route from requirement to recommendation.
            </h2>

            <p className="wm-public-landing-page__side-copy">
              Built for teams that need better technical consistency without forcing every user to
              be an integration specialist.
            </p>

            <div className="wm-public-landing-page__steps">
              <article className="wm-public-landing-page__step">
                <div className="wm-public-landing-page__step-index">01</div>
                <div>
                  <h3 className="wm-public-landing-page__step-title">Discover</h3>
                  <p className="wm-public-landing-page__step-copy">
                    Capture the application clearly and structure the brief.
                  </p>
                </div>
              </article>

              <article className="wm-public-landing-page__step">
                <div className="wm-public-landing-page__step-index">02</div>
                <div>
                  <h3 className="wm-public-landing-page__step-title">Recommend</h3>
                  <p className="wm-public-landing-page__step-copy">
                    Match topology, features, and products with more confidence.
                  </p>
                </div>
              </article>

              <article className="wm-public-landing-page__step">
                <div className="wm-public-landing-page__step-index">03</div>
                <div>
                  <h3 className="wm-public-landing-page__step-title">Deliver</h3>
                  <p className="wm-public-landing-page__step-copy">
                    Support proposal-ready output with less internal back-and-forth.
                  </p>
                </div>
              </article>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}