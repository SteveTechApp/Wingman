import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInDemo, backendHealthy, error, isAuthed, status } = useAuth();

  const [email, setEmail] = useState("name@company.com");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status !== "loading" && isAuthed) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [status, isAuthed, navigate]);

  const goHome = useCallback(() => navigate("/", { replace: false }), [navigate]);
  const goSignup = useCallback(() => navigate("/signup", { replace: false }), [navigate]);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    try {
      await signIn({ email, password });
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  }, [email, password, signIn, navigate]);

  const handleDemoMode = useCallback(async () => {
    try {
      await signInDemo(email);
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      console.error("Demo mode failed:", err);
    }
  }, [email, signInDemo, navigate]);

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
                Access the Wingman workflow, product guidance, and proposal tools.
              </p>
            </div>

            {!backendHealthy ? (
              <div className="wm-auth-status">
                Backend is currently unavailable. Demo or local auth mode may still be available.
              </div>
            ) : null}

            {error ? <div className="wm-auth-error">{String(error)}</div> : null}

            <form className="wm-auth-form" onSubmit={handleSubmit}>
              <div className="wm-auth-field">
                <label className="wm-auth-label" htmlFor="wm-login-email">Email</label>
                <input
                  id="wm-login-email"
                  className="wm-auth-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="wm-auth-field">
                <label className="wm-auth-label" htmlFor="wm-login-password">Password</label>
                <input
                  id="wm-login-password"
                  className="wm-auth-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="wm-auth-actions">
                <button type="submit" className="wm-auth-btn wm-auth-btn--primary">
                  Sign in
                </button>
                <button type="button" className="wm-auth-btn wm-auth-btn--secondary" onClick={handleDemoMode}>
                  Demo mode
                </button>
              </div>
            </form>

            <div className="wm-auth-meta">
              <button type="button" className="wm-auth-btn wm-auth-btn--ghost" onClick={goHome}>
                Back to home
              </button>
              <button type="button" className="wm-auth-btn wm-auth-btn--ghost" onClick={goSignup}>
                Create account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}