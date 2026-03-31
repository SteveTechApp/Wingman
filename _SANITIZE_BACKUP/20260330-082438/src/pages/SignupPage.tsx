import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, error, isAuthed, status } = useAuth();

  const [name, setName] = useState("Alex Smith");
  const [company, setCompany] = useState("Acme Ltd");
  const [email, setEmail] = useState("alex@acme.com");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status !== "loading" && isAuthed) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [status, isAuthed, navigate]);

  const goHome = useCallback(() => navigate("/", { replace: false }), [navigate]);
  const goLogin = useCallback(() => navigate("/login", { replace: false }), [navigate]);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    try {
      await signUp({ name, company, email, password });
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      console.error("Sign up failed:", err);
    }
  }, [name, company, email, password, signUp, navigate]);

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
              <h1 className="wm-auth-card__title">Create account</h1>
              <p className="wm-auth-card__copy">
                Create a workspace identity and continue into the Wingman design flow.
              </p>
            </div>

            {error ? <div className="wm-auth-error">{String(error)}</div> : null}

            <form className="wm-auth-form" onSubmit={handleSubmit}>
              <div className="wm-auth-grid">
                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-name">Name</label>
                  <input
                    id="wm-signup-name"
                    className="wm-auth-input"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-company">Company</label>
                  <input
                    id="wm-signup-company"
                    className="wm-auth-input"
                    type="text"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </div>

                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-email">Email</label>
                  <input
                    id="wm-signup-email"
                    className="wm-auth-input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-password">Password</label>
                  <input
                    id="wm-signup-password"
                    className="wm-auth-input"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="wm-auth-actions">
                <button type="submit" className="wm-auth-btn wm-auth-btn--primary">
                  Create account
                </button>
              </div>
            </form>

            <div className="wm-auth-meta">
              <button type="button" className="wm-auth-btn wm-auth-btn--ghost" onClick={goHome}>
                Back to home
              </button>
              <button type="button" className="wm-auth-btn wm-auth-btn--ghost" onClick={goLogin}>
                Already have an account?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}