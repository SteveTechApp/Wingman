import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/context";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await signUp({ name, company, email, password });
      navigate("/app/projects/new", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the workspace.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md p-6 pt-10">
        <form onSubmit={onSubmit} className="wm-card wm-card-pad" style={{ display: "grid", gap: 12 }}>
          <div className="wm-h2">Create workspace</div>
          <div className="wm-p">
            Start a real Wingman workspace with isolated projects, audit history, and customer-ready collaboration.
          </div>

          <label className="wm-form-field">
            <span className="wm-form-label">Name</span>
            <input className="wm-form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Smith" required />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Company</span>
            <input className="wm-form-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Ltd" required />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Email</span>
            <input className="wm-form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@acme.com" required />
          </label>

          <label className="wm-form-field">
            <span className="wm-form-label">Password</span>
            <input className="wm-form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required />
          </label>

          {error ? <div className="wm-body-sm" style={{ color: "#ff9da5" }}>{error}</div> : null}

          <button className="wm-btn wm-btn-primary" type="submit" disabled={saving}>
            {saving ? "Creating workspace..." : "Create workspace"}
          </button>

          <div className="wm-body-sm" style={{ opacity: 0.76 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
