import React from "react";
import { useAuth } from "@/auth/AuthContext";

export default function LoginForm({
  embedded,
  title = "Sign in",
  subtitle,
}: {
  embedded?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const { signInDemo } = useAuth();
  return (
    <div className={embedded ? "wm-card wm-card-pad" : undefined}>
      <div className="wm-h2">{title}</div>
      {subtitle && <div className="wm-p" style={{ marginTop: 6 }}>{subtitle}</div>}
      <button className="wm-btn wm-btn-primary" style={{ marginTop: 10 }} onClick={() => signInDemo()}>
        Sign in as Demo User
      </button>
    </div>
  );
}
