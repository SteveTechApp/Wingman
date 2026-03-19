import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/context";

type LoginFormProps = {
  embedded?: boolean;
  title?: string;
  subtitle?: string;
  variant?: "default" | "modern";
};

export default function LoginForm({
  embedded = false,
  title = "Sign in",
  subtitle,
  variant = "default",
}: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInDemo, backendHealthy } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const isModern = variant === "modern";

  const nextPath = (location.state as { from?: string } | null)?.from || "/app/dashboard";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await signIn({ email, password });
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDemo() {
    setSaving(true);
    setError("");
    try {
      await signInDemo(email || undefined);
      navigate(nextPath, { replace: true });
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <form
      onSubmit={handleSubmit}
      className={isModern ? "wm-login-form" : undefined}
      style={isModern ? undefined : { display: "grid", gap: 12 }}
    >
      {!!title && (
        <div className={isModern ? "wm-login-form__title-group" : undefined}>
          <div className={isModern ? "wm-login-form__eyebrow" : undefined}>
            Account access
          </div>
          <div className={isModern ? "wm-login-form__title" : "wm-h2"}>
            {title}
          </div>
        </div>
      )}

      {!!subtitle && (
        <div
          className={isModern ? "wm-login-form__subtitle" : "wm-p"}
          style={isModern ? undefined : { marginTop: title ? 2 : 0 }}
        >
          {subtitle}
        </div>
      )}

      <label className={isModern ? "wm-login-form__field" : "wm-form-field"}>
        <span className={isModern ? "wm-login-form__label" : "wm-form-label"}>
          Email
        </span>
        <input
          className={
            isModern
              ? "wm-login-form__input"
              : "wm-form-input"
          }
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          autoComplete="email"
          inputMode="email"
          required
        />
      </label>

      <label className={isModern ? "wm-login-form__field" : "wm-form-field"}>
        <span className={isModern ? "wm-login-form__label" : "wm-form-label"}>
          Password
        </span>
        <input
          className={
            isModern
              ? "wm-login-form__input"
              : "wm-form-input"
          }
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </label>

      {error ? (
        isModern ? (
          <div className="wm-login-form__error">
            {error}
          </div>
        ) : (
          <div className="wm-body-sm" style={{ color: "#ff9da5" }}>
            {error}
          </div>
        )
      ) : null}

      <button
        className={
          isModern
            ? "wm-login-form__btn wm-login-form__btn--primary"
            : "wm-btn wm-btn-primary"
        }
        style={isModern ? undefined : { width: "100%" }}
        type="submit"
        disabled={saving}
      >
        {saving ? "Signing in..." : "Sign in"}
      </button>

      <button
        className={
          isModern
            ? "wm-login-form__btn wm-login-form__btn--secondary"
            : "wm-btn"
        }
        type="button"
        onClick={handleDemo}
        disabled={saving}
      >
        Continue in Demo Mode
      </button>

      {isModern ? (
        <div className="wm-login-form__status-card">
          <div className="wm-login-form__status-title">Service status</div>
          <div className="wm-login-form__status-copy">
            {backendHealthy
              ? "Backend services are available and ready for live sign-in."
              : "Backend services look unavailable right now. Demo mode will still let you explore the app."}
          </div>
        </div>
      ) : (
        <div className="wm-body-sm" style={{ opacity: 0.76 }}>
          {backendHealthy
            ? "Backend services are available."
            : "Backend services look unavailable right now. Demo mode will still let you explore the app."}
        </div>
      )}

      <div className={isModern ? "wm-login-form__footer" : "wm-body-sm"} style={isModern ? undefined : { opacity: 0.76 }}>
        Need an account?{" "}
        <Link className={isModern ? "wm-login-form__footer-link" : undefined} to="/signup">
          Create account
        </Link>
      </div>
    </form>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  if (isModern) {
    return (
      <div className="wm-login-form-shell">
        <div className="wm-login-form-shell__glow" />
        <div className="wm-login-form-shell__body">{content}</div>
      </div>
    );
  }

  return <div className="wm-card wm-card-pad">{content}</div>;
}
