import React from "react";
import { useNavigate } from "react-router-dom";

export default function PublicLandingPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #0f1f2f 0%, #020617 80%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          textAlign: "center",
          padding: "56px 48px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(6px)",
        }}
      >
        <img
          src="/assets/branding/hero-logo.png"
          style={{ width: 380, marginBottom: 20 }}
        />

        <h1 style={{ fontSize: 40, margin: "12px 0" }}>
          AV sales. Simplified.
        </h1>

        <p style={{ opacity: 0.8, marginBottom: 28 }}>
          Design systems, select the right WyreStorm products,
          and generate consistent proposal-ready outputs.
        </p>

        <button
          onClick={() => navigate("/app")}
          style={{
            padding: "12px 28px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.08)",
            cursor: "pointer",
          }}
        >
          Enter Workspace
        </button>
      </div>
    </div>
  );
}