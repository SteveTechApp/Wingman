import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "@/styles/wm-auth-public.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, error, isAuthed, status, backendHealthy } = useAuth();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "loading" && isAuthed) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [status, isAuthed, navigate]);

  const goHome = useCallback(() => navigate("/", { replace: false }), [navigate]);
  const goLogin = useCallback(() => navigate("/login", { replace: false }), [navigate]);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();

    const nextName = name.trim();
    const nextCompany = company.trim();
    const nextEmail = email.trim();

    if (!nextName) return;
    if (!nextCompany) return;
    if (!nextEmail) return;
    if (!password) return;

    setSubmitting(true)

    try {
      await signUp({ name: nextName, company: nextCompany, email: nextEmail, password })
      navigate("/app/dashboard", { replace: true })
      return
    } catch {
    }

    setSubmitting(false)
  }, [name, company, email, password, signUp, navigate]);

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
              <h1 className="wm-auth-card__title">Create account</h1>
              <p className="wm-auth-card__copy">
                Create a workspace identity and continue into the Wingman design flow.
              </p>
            </div>

            {!backendHealthy ? (
              <div className="wm-auth-status">
                Backend health check failed. Account creation may not complete until the API is running.
              </div>
            ) : null}

            {error ? <div className="wm-auth-error">{String(error)}</div> : null}

            <form className="wm-auth-form" onSubmit={handleSubmit}>
              <div className="wm-auth-grid">
                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-name">Name</label>
                  <input
                    id="wm-signup-name"
                    className="wm-auth-input"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy}
                  />
                </div>

                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-company">Company</label>
                  <input
                    id="wm-signup-company"
                    className="wm-auth-input"
                    type="text"
                    autoComplete="organization"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    disabled={busy}
                  />
                </div>

                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-email">Email</label>
                  <input
                    id="wm-signup-email"
                    className="wm-auth-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={busy}
                  />
                </div>

                <div className="wm-auth-field">
                  <label className="wm-auth-label" htmlFor="wm-signup-password">Password</label>
                  <input
                    id="wm-signup-password"
                    className="wm-auth-input"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="wm-auth-actions">
                <button type="submit" className="wm-auth-btn wm-auth-btn--primary" disabled={busy}>
                  {busy ? "Creating account..." : "Create account"}
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