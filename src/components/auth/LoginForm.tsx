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
      className={isModern ? "grid gap-5" : undefined}
      style={isModern ? undefined : { display: "grid", gap: 12 }}
    >
      {!!title && (
        <div className={isModern ? "space-y-2" : undefined}>
          <div className={isModern ? "text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/78" : undefined}>
            Workspace access
          </div>
          <div className={isModern ? "text-3xl font-black tracking-[-0.04em] text-white sm:text-[2.15rem]" : "wm-h2"}>
            {title}
          </div>
        </div>
      )}

      {!!subtitle && (
        <div
          className={isModern ? "text-sm leading-6 text-slate-300" : "wm-p"}
          style={isModern ? undefined : { marginTop: title ? 2 : 0 }}
        >
          {subtitle}
        </div>
      )}

      <label className={isModern ? "grid gap-2" : "wm-form-field"}>
        <span className={isModern ? "text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300" : "wm-form-label"}>
          Email
        </span>
        <input
          className={
            isModern
              ? "min-h-12 rounded-2xl border border-white/12 bg-slate-950/55 px-4 text-[15px] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/45 focus:bg-slate-950/70 focus:ring-4 focus:ring-cyan-400/10"
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

      <label className={isModern ? "grid gap-2" : "wm-form-field"}>
        <span className={isModern ? "text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300" : "wm-form-label"}>
          Password
        </span>
        <input
          className={
            isModern
              ? "min-h-12 rounded-2xl border border-white/12 bg-slate-950/55 px-4 text-[15px] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/45 focus:bg-slate-950/70 focus:ring-4 focus:ring-cyan-400/10"
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
          <div className="rounded-2xl border border-rose-300/18 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
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
            ? "inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#63ece7_0%,#2ec8dc_58%,#4f9cff_100%)] px-5 text-sm font-bold text-slate-950 shadow-[0_18px_44px_rgba(37,174,214,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(37,174,214,0.32)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
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
            ? "inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-5 text-sm font-semibold text-white/86 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-65"
            : "wm-btn"
        }
        type="button"
        onClick={handleDemo}
        disabled={saving}
      >
        Continue in Demo Mode
      </button>

      {isModern ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
          <div className="font-semibold text-white/92">Workspace services</div>
          <div className="mt-1 leading-6">
            {backendHealthy
              ? "Backend workspace services are available and ready for live sign-in."
              : "Backend workspace services look unavailable right now. Demo mode will still let you explore the app."}
          </div>
        </div>
      ) : (
        <div className="wm-body-sm" style={{ opacity: 0.76 }}>
          {backendHealthy
            ? "Backend workspace services are available."
            : "Backend workspace services look unavailable right now. Demo mode will still let you explore the app."}
        </div>
      )}

      <div className={isModern ? "text-sm text-slate-300" : "wm-body-sm"} style={isModern ? undefined : { opacity: 0.76 }}>
        Need an account?{" "}
        <Link className={isModern ? "font-semibold text-cyan-200 transition hover:text-white" : undefined} to="/signup">
          Create workspace
        </Link>
      </div>
    </form>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  if (isModern) {
    return (
      <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,26,46,0.96),rgba(6,12,24,0.96))] p-6 shadow-[0_32px_110px_rgba(2,8,20,0.48)] sm:p-7">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-28 rounded-full bg-[radial-gradient(circle_at_top,rgba(99,236,231,0.22),transparent_72%)] blur-2xl" />
        <div className="relative">{content}</div>
      </div>
    );
  }

  return <div className="wm-card wm-card-pad">{content}</div>;
}
