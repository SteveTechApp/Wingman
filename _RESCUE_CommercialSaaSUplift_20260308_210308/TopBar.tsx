import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { useBoundActiveProjectName } from "@/core/wingman/storeBridge";

function LogoMark() {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div style={{ display: "grid", gap: 1, lineHeight: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#65e8ff", letterSpacing: -0.4 }}>
          WyreStorm
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#eaf6ff", opacity: 0.9 }}>
          Wingman
        </div>
      </div>
    );
  }

  return (
    <img
      src="/wyrestorm-logo.png"
      alt="WyreStorm Wingman"
      onError={() => setFailed(true)}
      style={{
        display: "block",
        width: "auto",
        height: 28,
        objectFit: "contain",
      }}
    />
  );
}

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProjectName = useBoundActiveProjectName();

  const navItems = [
    { label: "Home", to: WM_ROUTES.dashboard },
    { label: "Projects", to: WM_ROUTES.projects },
    { label: "Tools", to: WM_ROUTES.tools },
  ];

  return (
    <header
      style={{
        height: "var(--wm-topbar-h)",
        minHeight: "var(--wm-topbar-h)",
        display: "grid",
        gridTemplateColumns: "112px minmax(260px, 1fr) auto",
        alignItems: "center",
        gap: 12,
        padding: "0 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(5,12,21,0.98), rgba(7,14,24,0.96))",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <button
        type="button"
        onClick={() => navigate(WM_ROUTES.dashboard)}
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          minWidth: 0,
        }}
        title="Go to Dashboard"
      >
        <LogoMark />
      </button>

      <div className="wm-input-shell">
        Active Project - {activeProjectName}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={`wm-btn-nav${active ? " is-active" : ""}`}
            >
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate(WM_ROUTES.newProject)}
          className="wm-btn-nav"
          style={{
            border: "1px solid rgba(101,232,255,0.22)",
            background: "rgba(12,27,46,0.96)",
          }}
        >
          + New Project
        </button>
      </div>
    </header>
  );
}