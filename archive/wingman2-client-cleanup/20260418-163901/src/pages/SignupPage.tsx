import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { normalizeAppRoute, routeMap } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

type SignupLocationState = {
  from?: string | {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

function resolveRedirectPath(state: SignupLocationState | null): string {
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

  if (value === "/app" || value === "/app/" || value === "/login" || value === "/signup" || value === "/") {
    return routeMap.app.dashboard;
  }

  if (value === "/app/toolhub" || value === "/app/toolhub/") {
    return routeMap.app.tools;
  }

  if (value.startsWith("/wingman/")) {
    return normalizeAppRoute(value);
  }

  if (value.startsWith("/app")) {
    return value;
  }

  return routeMap.app.dashboard;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    backendHealthy,
    error: authError,
    isAuthenticated,
    signUp,
    status,
  } = useAuth();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const state = location.state as SignupLocationState | null;
    return normaliseRedirectPath(resolveRedirectPath(state));
  }, [location.state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signUp({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        password,
      });

      navigate(redirectTo, { replace: true });
    } catch (reason) {
      if (reason instanceof Error) {
        setError(reason.message);
      }

      if (!(reason instanceof Error)) {
        setError("Unable to reach the sign-up service.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isSubmitting;
  const visibleError = error || authError || "";

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
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

              <h1 className="wm-auth-card__title">Create account</h1>

              <p className="wm-auth-card__copy">
                Create your Wingman login and continue directly into the workspace.
              </p>
            </div>

            {!backendHealthy ? (
              <div role="status" className="wm-auth-status">
                Live sign-up may be unavailable right now. Check backend connectivity and try again.
              </div>
            ) : null}

            {status === "loading" ? (
              <div role="status" className="wm-auth-status">
                Checking saved session. This should only take a moment.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate className="wm-auth-form">
              <div className="wm-auth-grid">
                <label className="wm-auth-field">
                  <span className="wm-auth-label">Name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    disabled={busy}
                    className="wm-auth-input"
                  />
                </label>

                <label className="wm-auth-field">
                  <span className="wm-auth-label">Company</span>
                  <input
                    type="text"
                    autoComplete="organization"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="Company name"
                    disabled={busy}
                    className="wm-auth-input"
                  />
                </label>

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
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                    disabled={busy}
                    className="wm-auth-input"
                  />
                </label>
              </div>

              {visibleError ? (
                <div role="alert" className="wm-auth-error">
                  {visibleError}
                </div>
              ) : null}

              <div className="wm-auth-actions">
                <button
                  type="submit"
                  disabled={busy || !name.trim() || !company.trim() || !email.trim() || !password}
                  className="wm-auth-btn wm-auth-btn--primary"
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>

            <div className="wm-auth-meta">
              <span>Already have an account?</span>
              <Link to={routeMap.public.login} className="wm-auth-btn wm-auth-btn--ghost">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
