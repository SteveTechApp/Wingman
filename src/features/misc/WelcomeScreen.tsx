// src/features/misc/WelcomeScreen.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function WelcomeScreen() {
  const nav = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        color: "var(--wm-fg, #eaf2ff)",
        background:
          "radial-gradient(1200px 620px at 18% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0) 58%), radial-gradient(900px 520px at 80% 20%, rgba(255,255,255,0.04), rgba(0,0,0,0) 52%), linear-gradient(180deg, rgba(10,12,18,1), rgba(6,7,10,1))",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div style={{ width: "min(860px, 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <img src="/heroLogo.png" alt="WyreStorm Wingman" style={{ width: 170, height: "auto", opacity: 0.92 }} />
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "0.04em", fontSize: 18 }}>Wingman</div>
            <div style={{ fontSize: 12, opacity: 0.72 }}>No-login workspace · UK-first defaults · Tiered outputs</div>
          </div>
        </div>

        <h1 style={{ fontSize: "clamp(30px, 4vw, 54px)", lineHeight: 1.05, margin: "0 0 10px", fontWeight: 850 }}>
          Welcome.
        </h1>

        <p style={{ margin: "0 0 18px", opacity: 0.82, lineHeight: 1.6, fontSize: 16 }}>
          Wingman is a sales enablement and system design workspace. Start with Templates, then refine with tools to generate a
          proposal-ready BOM.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => nav("/app")}
            style={{
              borderRadius: 999,
              padding: "11px 18px",
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.12)",
              color: "var(--wm-fg, #eaf2ff)",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            Open Workspace
          </button>

          <button
            type="button"
            onClick={() => nav("/app/templates")}
            style={{
              borderRadius: 999,
              padding: "11px 18px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--wm-fg, #eaf2ff)",
              cursor: "pointer",
            }}
          >
            View Templates
          </button>
        </div>
      </div>
    </div>
  );
}