import * as React from "react";

import { useNavigate } from "react-router-dom";
import heroLogo from "@/assets/branding/hero-logo.png";
import { useAuth } from "@/context";

export default function PublicLandingPage() {
  const nav = useNavigate();
  const { signInDemo } = useAuth();

  function enterWorkspace() {
    signInDemo();
    nav("/app/dashboard");
  }

  return (
    <div className="wm-page" style={{ display: "grid", placeItems: "center" }}>
      <section
        className="wm-card"
        style={{
          width: "min(980px, 100%)",
          textAlign: "center",
          padding: "16px",
        }}
      >
        <div style={{ padding: "14px 10px 16px" }}>
          <img
            src={heroLogo}
            alt="WyreStorm Wingman"
            style={{
              width: "min(520px, 88%)",
              height: "auto",
              objectFit: "contain",
              margin: "0 auto 10px",
              filter: "drop-shadow(0 12px 28px rgba(0,0,0,.38))",
            }}
          />

          <div className="wm-h1" style={{ marginTop: 2, fontSize: 42, fontWeight: 800 }}>
            AV sales. Simplified.
          </div>

          <p className="wm-p" style={{ margin: "12px auto 0", maxWidth: 700, fontSize: 18 }}>
            Design systems, select the right WyreStorm products, and generate consistent proposal-ready outputs.
          </p>

          <div className="wm-row" style={{ justifyContent: "center", marginTop: 20 }}>
            <button className="wm-btn wm-btn-primary" onClick={enterWorkspace} style={{ minWidth: 220, fontWeight: 700 }}>
              Enter Workspace
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
