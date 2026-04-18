import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeAppRoute, routeMap } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

type RedirectState =
  | {
      from?: string | { pathname?: string; search?: string; hash?: string };
    }
  | null
  | undefined;

function resolveRedirectPath(state: RedirectState): string {
  const from = state?.from;
  if (typeof from === "string") return from;
  if (!from || typeof from !== "object") return routeMap.app.dashboard;
  return `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { backendHealthy, error, isAuthed, signIn, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = useMemo(
    () => normalizeAppRoute(resolveRedirectPath(location.state as RedirectState)),
    [location.state],
  );

  useEffect(() => {
    if (status !== "loading" && isAuthed) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthed, navigate, redirectTo, status]);

  const goHome = useCallback(() => {
    navigate("/", { replace: false });
  }, [navigate]);

  const goSignup = useCallback(() => {
    navigate("/signup", { replace: false });
  }, [navigate]);

  const handleLogin = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch {
    } finally {
      setSubmitting(false);
    }
  }, [email, navigate, password, redirectTo, signIn]);

  return (
    <div className="wm-auth-shell">
      <div className="wm-auth-shell__root">
        <div className="wm-auth-shell__center">
          <div className="wm-auth-card">
            <div className="wm-auth-card__head">
              <div className="wm-auth-card__eyebrow">
                <span className="wm-auth-card__dot" />
                <span>WyreStorm Wingman</span>
              </div>

              <h1 className="wm-auth-card__title">Sign in</h1>

              <p className="wm-auth-card__copy">
                Re-enter your workspace and continue from the correct Wingman flow.
              </p>
            </div>

            {!backendHealthy ? (
              <div className="wm-auth-status">
                The Wingman backend looks unavailable right now. Sign-in will only work once the deployment API is reachable.
              </div>
            ) : null}

            {error ? <div className="wm-auth-error">{error}</div> : null}

            <form className="wm-auth-form" onSubmit={handleLogin}>
              <div className="wm-auth-grid">
                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-login-email">
                    Email
                  </label>
                  <input
                    id="wm-login-email"
                    className="wm-auth-input"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-login-password">
                    Password
                  </label>
                  <input
                    id="wm-login-password"
                    className="wm-auth-input"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="wm-auth-actions">
                <button
                  type="submit"
                  className="wm-auth-btn wm-auth-btn--primary"
                  disabled={submitting || status === "loading" || !email.trim() || !password}
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>

            <div className="wm-auth-meta">
              <button
                type="button"
                className="wm-auth-btn wm-auth-btn--ghost"
                onClick={goHome}
              >
                Back to home
              </button>

              <button
                type="button"
                className="wm-auth-btn wm-auth-btn--ghost"
                onClick={goSignup}
              >
                Create account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
