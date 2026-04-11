import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { routeMap } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";

export default function PublicLandingPage() {
  const navigate = useNavigate();
  const { backendHealthy, isAuthenticated, signInDemo, status } = useAuth();
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  async function handleDemoSubmit() {
    setIsDemoSubmitting(true);

    try {
      await signInDemo();
      navigate(routeMap.app.dashboard, { replace: true });
    } finally {
      setIsDemoSubmitting(false);
    }
  }

  if (isAuthenticated && status !== "loading") {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top, rgba(243,140,46,0.12), transparent 26%), var(--wm-bg, #08111b)",
      }}
    >
      <section
        style={{
          width: "min(100%, 820px)",
          borderRadius: "28px",
          padding: "40px",
          background: "rgba(10, 18, 30, 0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          color: "var(--wm-text, #e8edf7)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "64px",
            lineHeight: 0.95,
            maxWidth: "10ch",
            letterSpacing: "-0.04em",
          }}
        >
          Technical sales support for the full project workflow.
        </h1>

        <p
          style={{
            margin: "22px 0 0",
            maxWidth: "56ch",
            opacity: 0.84,
            fontSize: "17px",
            lineHeight: 1.65,
          }}
        >
          Wingman brings product guidance, discovery, proposal support, and project workflow into one workspace for WyreStorm sales and pre-sales activity.
        </p>

        {!backendHealthy ? (
          <div
            role="status"
            style={{
              marginTop: "18px",
              borderRadius: "14px",
              padding: "12px 14px",
              background: "rgba(255, 179, 71, 0.14)",
              border: "1px solid rgba(255, 179, 71, 0.26)",
              color: "#ffe0b3",
              fontSize: "14px",
              maxWidth: "56ch",
            }}
          >
            Live sign-in may be unavailable right now. Demo mode still works for testing.
          </div>
        ) : null}

        {status === "loading" ? (
          <div
            role="status"
            style={{
              marginTop: "18px",
              borderRadius: "14px",
              padding: "12px 14px",
              background: "rgba(99, 149, 255, 0.10)",
              border: "1px solid rgba(99, 149, 255, 0.22)",
              color: "#dbe7ff",
              fontSize: "14px",
              maxWidth: "56ch",
            }}
          >
            Checking saved session... this should only take a moment.
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            marginTop: "28px",
          }}
        >
          <Link
            to="/login"
            style={{
              display: "inline-grid",
              placeItems: "center",
              minWidth: "168px",
              height: "50px",
              padding: "0 18px",
              borderRadius: "14px",
              textDecoration: "none",
              fontWeight: 800,
              color: "#0b1017",
              background: "linear-gradient(135deg, #f38c2e, #ffb267)",
            }}
          >
            Sign in
          </Link>

          <Link
            to="/signup"
            style={{
              display: "inline-grid",
              placeItems: "center",
              minWidth: "168px",
              height: "50px",
              padding: "0 18px",
              borderRadius: "14px",
              textDecoration: "none",
              fontWeight: 700,
              color: "var(--wm-text, #e8edf7)",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            Create account
          </Link>

          <button
            type="button"
            onClick={() => void handleDemoSubmit()}
            disabled={isDemoSubmitting}
            style={{
              display: "inline-grid",
              placeItems: "center",
              minWidth: "168px",
              height: "50px",
              padding: "0 18px",
              borderRadius: "14px",
              fontWeight: 700,
              color: "var(--wm-text, #e8edf7)",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              cursor: isDemoSubmitting ? "default" : "pointer",
              opacity: isDemoSubmitting ? 0.7 : 1,
            }}
          >
            {isDemoSubmitting ? "Opening demo..." : "Demo mode"}
          </button>
        </div>
      </section>
    </div>
  );
}
