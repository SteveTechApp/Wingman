import * as React from "react";

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
  const { signInDemo } = useAuth();

  const content = (
    <>
      {!!title && <div className="wm-h2">{title}</div>}

      {!!subtitle && (
        <div className="wm-p" style={{ marginTop: title ? 6 : 0 }}>
          {subtitle}
        </div>
      )}

      <button
        className="wm-btn wm-btn-primary"
        style={{ marginTop: title || subtitle ? 10 : 0, width: "100%" }}
        onClick={() => signInDemo()}
      >
        Continue to Wingman
      </button>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return <div className="wm-card wm-card-pad">{content}</div>;
}