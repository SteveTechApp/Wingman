import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { normalizeAppRoute, routeMap } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";

type LoginLocationState = {
  message?: string;
  createdEmail?: string;
  from?: string | { pathname?: string; search?: string; hash?: string };
};

function resolveRedirectPath(state: LoginLocationState | null): string {
  const from = state?.from;

  if (typeof from === "string") {
    return from;
  }

  if (!from || typeof from !== "object") {
    return routeMap.app.dashboard;
  }

  return `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`;
}

function normaliseRedirectPath(rawPath?: string): string {
  const value = typeof rawPath === "string" ? rawPath.trim() : "";

  if (!value) {
    return routeMap.app.dashboard;
  }

  if (value === "/app/toolhub" || value === "/app/toolhub/") {
    return routeMap.app.tools;
  }

  if (value === "/app" || value === "/app/" || value === "/login" || value === "/signup" || value === "/") {
    return routeMap.app.dashboard;
  }

  if (value.startsWith("/wingman/")) {
    return normalizeAppRoute(value);
  }

  if (value.startsWith("/app")) {
    return value;
  }

  return routeMap.app.dashboard;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { backendHealthy, error: authError, isAuthenticated, signIn, signInDemo, status } = useAuth();

  const locationState = location.state as LoginLocationState | null;

  const [email, setEmail] = useState(locationState?.createdEmail || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  const successMessage = locationState?.message || "";
  const target = useMemo(
    () => normaliseRedirectPath(resolveRedirectPath(locationState)),
    [locationState],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      navigate(target, { replace: true });
      return;
    } catch (reason) {
      if (reason instanceof Error) {
        setError(reason.message);
      }

      if (!(reason instanceof Error)) {
        setError("Sign-in failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoSubmit() {
    setError("");
    setIsDemoSubmitting(true);

    try {
      await signInDemo(email.trim() || undefined);
      navigate(routeMap.app.dashboard, { replace: true });
    } catch (reason) {
      if (reason instanceof Error) {
        setError(reason.message);
      }

      if (!(reason instanceof Error)) {
        setError("Demo mode could not be opened.");
      }
    } finally {
      setIsDemoSubmitting(false);
    }
  }

  const busy = isSubmitting || isDemoSubmitting;
  const visibleError = error || authError || "";

  if (isAuthenticated && !busy) {
    return <Navigate to={target} replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "radial-gradient(circle at top, rgba(243,140,46,0.12), transparent 26%), var(--wm-bg, #08111b)",
      }}
    >
      <div
        style={{
          width: "min(100%, 440px)",
          borderRadius: "24px",
          padding: "30px",
          background: "rgba(10, 18, 30, 0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          color: "var(--wm-text, #e8edf7)",
        }}
      >
        <div style={{ marginBottom: "22px" }}>
          <h1 style={{ margin: 0, fontSize: "30px", lineHeight: 1.08 }}>
            Sign in
          </h1>

          <p style={{ margin: "10px 0 0", opacity: 0.78 }}>
            Enter your account details to continue.
          </p>
        </div>

        {successMessage ? (
          <div
            role="status"
            style={{
              marginBottom: "14px",
              borderRadius: "12px",
              padding: "12px 14px",
              background: "rgba(84, 196, 127, 0.14)",
              border: "1px solid rgba(84, 196, 127, 0.28)",
              color: "#d8ffe2",
              fontSize: "14px",
            }}
          >
            {successMessage}
          </div>
        ) : null}

        {!backendHealthy ? (
          <div
            role="status"
            style={{
              marginBottom: "14px",
              borderRadius: "12px",
              padding: "12px 14px",
              background: "rgba(255, 179, 71, 0.14)",
              border: "1px solid rgba(255, 179, 71, 0.26)",
              color: "#ffe0b3",
              fontSize: "14px",
            }}
          >
            Live sign-in may be unavailable right now. Demo mode still works for testing.
          </div>
        ) : null}

        {status === "loading" ? (
          <div
            role="status"
            style={{
              marginBottom: "14px",
              borderRadius: "12px",
              padding: "12px 14px",
              background: "rgba(99, 149, 255, 0.10)",
              border: "1px solid rgba(99, 149, 255, 0.22)",
              color: "#dbe7ff",
              fontSize: "14px",
            }}
          >
            Checking saved session... this should only take a moment.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <label style={{ display: "block", marginBottom: "14px" }}>
            <span style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              disabled={busy}
              style={{
                width: "100%",
                height: "48px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
                padding: "0 14px",
                boxSizing: "border-box",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "16px" }}>
            <span style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              disabled={busy}
              style={{
                width: "100%",
                height: "48px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
                padding: "0 14px",
                boxSizing: "border-box",
              }}
            />
          </label>

          {visibleError ? (
            <div
              role="alert"
              style={{
                marginBottom: "14px",
                borderRadius: "12px",
                padding: "12px 14px",
                background: "rgba(255, 99, 99, 0.12)",
                border: "1px solid rgba(255, 99, 99, 0.26)",
                color: "#ffd0d0",
                fontSize: "14px",
              }}
            >
              {visibleError}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: "12px" }}>
            <button
              type="submit"
              disabled={busy || !email.trim() || !password}
              style={{
                width: "100%",
                height: "50px",
                border: 0,
                borderRadius: "12px",
                cursor: busy ? "default" : "pointer",
                fontWeight: 800,
                color: "#0b1017",
                background: "linear-gradient(135deg, #f38c2e, #ffb267)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => void handleDemoSubmit()}
              disabled={busy}
              style={{
                width: "100%",
                height: "48px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.03)",
                color: "inherit",
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
                fontWeight: 700,
              }}
            >
              {isDemoSubmitting ? "Opening demo..." : "Demo mode"}
            </button>
          </div>
        </form>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            marginTop: "16px",
            fontSize: "14px",
            opacity: 0.86,
            flexWrap: "wrap",
          }}
        >
          <span>No account yet?</span>
          <Link to="/signup" style={{ color: "#ffb267" }}>
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
