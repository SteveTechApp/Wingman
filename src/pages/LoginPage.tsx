import { FormEvent, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeAppRoute, routeMap } from "@/core/wingman/routeMap";
import "@/styles/wm-auth-public.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = normalizeAppRoute(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
      routeMap.app.dashboard,
  );

  const goHome = useCallback(() => {
    navigate("/", { replace: false });
  }, [navigate]);

  const goSignup = useCallback(() => {
    navigate("/signup", { replace: false });
  }, [navigate]);

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    navigate(redirectTo, { replace: true });
  }

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
                    placeholder="name@company.com"
                    defaultValue="alex@acme.com"
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
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="wm-auth-actions">
                <button type="submit" className="wm-auth-btn wm-auth-btn--primary">
                  Sign in
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