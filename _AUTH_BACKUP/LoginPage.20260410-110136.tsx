import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeAppRoute, routeMap } from "@/core/wingman/routeMap";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInDemo, error, isAuthed, status, backendHealthy } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = normalizeAppRoute(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
      routeMap.app.dashboard,
  );

  useEffect(() => {
    if (status !== "loading" && isAuthed) {
      navigate(redirectTo, { replace: true });
    }
  }, [status, isAuthed, navigate, redirectTo]);

  const goHome = useCallback(() => {
    navigate("/", { replace: false });
  }, [navigate]);

  const goSignup = useCallback(() => {
    navigate("/signup", { replace: false });
  }, [navigate]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    const nextEmail = email.trim();
    if (!nextEmail) return;
    if (!password) return;

    setSubmitting(true)

    try {
      await signIn({
        email: nextEmail,
        password,
      })
      navigate(redirectTo, { replace: true })
      return
    } catch {
    }

    setSubmitting(false)
  }

  async function handleDemoSignIn() {
    setSubmitting(true)

    try {
      await signInDemo(email.trim() || undefined)
      navigate(redirectTo, { replace: true })
      return
    } catch {
    }

    setSubmitting(false)
  }

  const busy = submitting || status === "loading";

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
                Backend health check failed. You can still try sign-in, or use demo mode to access the UI.
              </div>
            ) : null}

            {error ? <div className="wm-auth-error">{String(error)}</div> : null}

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
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    disabled={busy}
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
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="wm-auth-actions">
                <button type="submit" className="wm-auth-btn wm-auth-btn--primary" disabled={busy}>
                  {busy ? "Signing in..." : "Sign in"}
                </button>

                <button
                  type="button"
                  className="wm-auth-btn wm-auth-btn--secondary"
                  onClick={handleDemoSignIn}
                  disabled={busy}
                >
                  Open demo mode
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