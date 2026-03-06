import * as React from "react";

import heroLogo from "@/assets/branding/hero-logo.png";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  collapsed?: boolean;
  onToggleNav?: () => void;
};

function btnStyle(disabled?: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "var(--wm-text, rgba(255,255,255,0.92))",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
    opacity: disabled ? 0.45 : 1,
    userSelect: "none",
  };
}

export default function TopBar({ collapsed = false, onToggleNav }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack =
    location.pathname !== "/" &&
    location.pathname !== "/app" &&
    location.pathname !== "/app/dashboard";

  return (
    <header className="wm-topbar" role="banner">
      <div className="wm-topbar__inner">
        <div className="wm-topbar__left">
          <button
            type="button"
            onClick={() => onToggleNav?.()}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            style={btnStyle(false)}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>☰</span>
          </button>

          <button
            type="button"
            className="wm-topbar__brand"
            onClick={() => navigate("/app/dashboard")}
            title="Open dashboard"
            aria-label="Open dashboard"
          >
            <img className="wm-topbar__logo" src={heroLogo} alt="WyreStorm Wingman" />
          </button>
        </div>

        <div className="wm-topbar__right">
          <button
            type="button"
            onClick={() => navigate("/app/dashboard")}
            title="Go to dashboard"
            style={btnStyle(false)}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={!canGoBack}
            title="Go back"
            style={btnStyle(!canGoBack)}
          >
            Back
          </button>
        </div>
      </div>
    </header>
  );
}