import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import heroLogo from "../../assets/branding/wyrestorm-wingman-logo.png";

export type TopBarProps = {
  collapsed?: boolean;
  onToggleNav?: () => void;
};

function tabClass(active: boolean): string {
  return active ? "wm-topbar__tab is-active" : "wm-topbar__tab";
}

export default function TopBar({
  collapsed = false,
  onToggleNav,
}: TopBarProps) {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <header className="wm-topbar">
      <div className="wm-topbar__left">
        <button
          type="button"
          className="wm-topbar__brand wm-topbar__brand--logoonly"
          onClick={() => nav("/app/dashboard")}
          title="Go to Dashboard"
        >
          <img
            src={heroLogo}
            alt="WyreStorm Wingman"
            className="wm-topbar__logo"
          />
        </button>
      </div>

      <nav className="wm-topbar__center" aria-label="Primary">
        <button
          type="button"
          className={tabClass(loc.pathname.startsWith("/app/dashboard"))}
          onClick={() => nav("/app/dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={tabClass(loc.pathname.startsWith("/app/projects"))}
          onClick={() => nav("/app/projects")}
        >
          Projects
        </button>
        <button
          type="button"
          className={tabClass(loc.pathname.startsWith("/app/tools"))}
          onClick={() => nav("/app/tools")}
        >
          Tools
        </button>
      </nav>

      <div className="wm-topbar__right">
        <button
          type="button"
          className="wm-topbar__ghost"
          onClick={() => nav("/")}
        >
          Home
        </button>
        <button
          type="button"
          className="wm-topbar__ghost"
          onClick={() => nav(-1)}
        >
          Back
        </button>
      </div>
    </header>
  );
}