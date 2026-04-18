import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { normalizeAppRoute, routeMap } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

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
  const { backendHealthy, error: authError, isAuthenticated, signIn, status } = useAuth();

  const locationState = location.state as LoginLocationState | null;

  const [email, setEmail] = useState(locationState?.createdEmail || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const busy = isSubmitting;
  const visibleError = error || authError || "";

  if (isAuthenticated && !busy) {
    return <Navigate to={target} replace />;
  }

  return (
    <div className="wm-auth-shell">
      <div className="wm-auth-shell__root">
        <div className="wm-auth-shell__center">
          <div className="wm-auth-card">
            <div className="wm-auth-card__head">
              <div className="wm-auth-card__eyebrow">
                <span className="wm-auth-card__dot" />
                <span>Wingman Access</span>
              </div>

              <h1 className="wm-auth-card__title">Sign in</h1>

              <p className="wm-auth-card__copy">
                Enter your account details and return to the active Wingman workspace.
              </p>
            </div>

            {successMessage ? (
              <div role="status" className="wm-auth-status">
                {successMessage}
              </div>
            ) : null}

            {!backendHealthy ? (
              <div role="status" className="wm-auth-status">
                Live sign-in may be unavailable right now. Check backend connectivity and try again.
              </div>
            ) : null}

            {status === "loading" ? (
              <div role="status" className="wm-auth-status">
                Checking saved session. This should only take a moment.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate className="wm-auth-form">
              <label className="wm-auth-field">
                <span className="wm-auth-label">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  disabled={busy}
                  className="wm-auth-input"
                />
              </label>

              <label className="wm-auth-field">
                <span className="wm-auth-label">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  disabled={busy}
                  className="wm-auth-input"
                />
              </label>

              {visibleError ? (
                <div role="alert" className="wm-auth-error">
                  {visibleError}
                </div>
              ) : null}

              <div className="wm-auth-actions">
                <button
                  type="submit"
                  disabled={busy || !email.trim() || !password}
                  className="wm-auth-btn wm-auth-btn--primary"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>

            <div className="wm-auth-meta">
              <span>No account yet?</span>
              <Link to={routeMap.public.signup} className="wm-auth-btn wm-auth-btn--ghost">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
