import React from "react";
import { Link, Outlet } from "react-router-dom";
import mark from "@/assets/branding/wyrestorm-wingman-logo.png";

export default function PublicShell() {
  return (
    <div className="wm-bg wm-shell">
      <header className="wm-topbar">
        <div className="wm-container">
          {/* Symmetrical 3-column header: Left (brand), Center (tagline), Right (CTA) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 12,
              minHeight: 64,
            }}
          >
            {/* Left: Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link to="/" className="wm-link" style={{ display: "inline-flex", alignItems: "center" }}>
                <img
                  src={mark}
                  alt="WyreStorm Wingman"
                  style={{
                    height: 34,
                    width: "auto",
                    objectFit: "contain",
                    filter: "drop-shadow(0 8px 18px rgba(0,0,0,.35))",
                  }}
                />
              </Link>
            </div>

            {/* Center: Tagline */}
            <div style={{ textAlign: "center" }}>
              <div className="wm-p" style={{ margin: 0 }}>
                Sales. Simplified.
              </div>
            </div>

            {/* Right: CTA */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <a className="wm-btn" href="/app/dashboard">Open App</a>
            </div>
          </div>
        </div>
      </header>

      <div className="wm-container" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <Outlet />
      </div>

      <footer>
        <div className="wm-container">
          <div className="wm-divider"></div>
          <div className="wm-spread">
            <span className="wm-p">© {new Date().getFullYear()} WyreStorm</span>
            <span className="wm-p">Commercial Baseline</span>
          </div>
        </div>
      </footer>
    </div>
  );
}