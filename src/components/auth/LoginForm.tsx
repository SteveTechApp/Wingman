import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/context";

type LoginFormProps = {
  embedded?: boolean;
  title?: string;
  subtitle?: string;
};

export default function LoginForm({
  embedded = false,
  title = "Sign in",
  subtitle,
}: LoginFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInDemo, backendHealthy } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

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
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      {!!title && <div className="wm-h2">{title}</div>}

      {!!subtitle && (
        <div className="wm-p" style={{ marginTop: title ? 2 : 0 }}>
          {subtitle}
        </div>
      )}

      <label className="wm-form-field">
        <span className="wm-form-label">Email</span>
        <input
          className="wm-form-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          required
        />
      </label>

      <label className="wm-form-field">
        <span className="wm-form-label">Password</span>
        <input
          className="wm-form-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
        />
      </label>

      {error ? <div className="wm-body-sm" style={{ color: "#ff9da5" }}>{error}</div> : null}

      <button
        className="wm-btn wm-btn-primary"
        style={{ width: "100%" }}
        type="submit"
        disabled={saving}
      >
        {saving ? "Signing in..." : "Sign in"}
      </button>

      <button
        className="wm-btn"
        type="button"
        onClick={handleDemo}
        disabled={saving}
      >
        Continue in Demo Mode
      </button>

      <div className="wm-body-sm" style={{ opacity: 0.76 }}>
        {backendHealthy
          ? "Backend workspace services are available."
          : "Backend workspace services look unavailable right now. Demo mode will still let you explore the app."}
      </div>

      <div className="wm-body-sm" style={{ opacity: 0.76 }}>
        Need an account? <Link to="/signup">Create workspace</Link>
      </div>
    </form>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return <div className="wm-card wm-card-pad">{content}</div>;
}
