import React from "react";
import { Link, useNavigate } from "react-router-dom";
import heroLogo from "@/assets/branding/heroLogo.png";
import { useAuth } from "@/auth/AuthContext";

export default function PublicLandingPage() {
  const nav = useNavigate();
  const { signInDemo } = useAuth();

  function enterWorkspace() {
    // Immediate remedy: make the button work even when not logged in
    signInDemo("demo@wingman.local");
    nav("/app/dashboard");
  }

  return (
    <div className="wm-page" style={{ display: "grid", placeItems: "center" }}>
      <section
        className="wm-card"
        style={{
          width: "min(980px, 100%)",
          textAlign: "center",
          padding: "14px 14px",      // reduced
        }}
      >
        <div style={{ padding: "10px 10px 12px" }}>
          <img
            src={heroLogo}
            alt="WyreStorm Wingman"
            style={{
              width: "min(520px, 88%)", // reduced logo size
              height: "auto",
              objectFit: "contain",
              margin: "0 auto 8px",     // reduced spacing
              filter: "drop-shadow(0 12px 28px rgba(0,0,0,.38))",
            }}
          />

          <div className="wm-h1" style={{ marginTop: 2, fontSize: 28 }}>
            AV sales. Simplified.
          </div>

          <p className="wm-p" style={{ margin: "8px auto 0", maxWidth: 700, fontSize: 14 }}>
            Design systems, select the right WyreStorm products, and generate consistent proposal-ready outputs.
          </p>

          <div className="wm-row" style={{ justifyContent: "center", marginTop: 12 }}>
            <button className="wm-btn wm-btn-primary" onClick={enterWorkspace}>
              Enter Workspace
            </button>
            <Link className="wm-btn" to="/tools">
              Tool Hub
            </Link>
          </div>

          <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="wm-chip">Room Wizard</span>
            <span className="wm-chip">Video Walls</span>
            <span className="wm-chip">Competitor Compare</span>
            <span className="wm-chip">Proposals</span>
            <span className="wm-chip">Training</span>
          </div>
        </div>
      </section>
    </div>
  );
}