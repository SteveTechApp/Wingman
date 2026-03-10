import { Link, useNavigate } from "react-router-dom";
import { brand } from "@/branding/brand";

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
          </div>
        </div>
      </section>
    </div>
  );
}
