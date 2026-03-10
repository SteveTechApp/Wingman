import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import heroLogo from "@/assets/branding/heroLogo.png";

function topBtnStyle(disabled?: boolean): React.CSSProperties {
  return {
    height: 44,
    minWidth: 40,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)",
    color: disabled ? "rgba(255,255,255,0.35)" : "#eef5ff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    whiteSpace: "nowrap",
  };
}

function navBtnStyle(active?: boolean): React.CSSProperties {
  return {
    height: 44,
    padding: "0 18px",
    borderRadius: 12,
    border: active
      ? "1px solid rgba(93,230,255,0.18)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "linear-gradient(90deg, rgba(21,170,201,0.20), rgba(23,103,191,0.18))"
      : "rgba(255,255,255,0.04)",
    color: "#eef5ff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/app" || location.pathname === "/app/dashboard";
  const isProjects = location.pathname.startsWith("/app/projects");

  return (
    <header
      className="wm-topbar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: 76,
        minheight: 76,
        display: "grid",
        gridTemplateColumns: "280px minmax(320px, 520px) 1fr auto",
        alignItems: "center",
        gap: 16,
        padding: "0 14px 0 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(4,14,28,0.98), rgba(5,18,35,0.96))",
        backdropFilter: "blur(10px)",
      }}
    >
      <button
        onClick={() => navigate("/app/dashboard")}
        aria-label="Go to dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: 62,
          width: "fit-content",
          padding: "0 14px 0 10px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#eef5ff",
        }}
      >
        <img
          src={heroLogo}
          alt="WyreStorm Wingman"
          style={{
            height: 48,
            width: "auto",
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.28))",
          }}
        />
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "#eef5ff",
            whiteSpace: "nowrap",
          }}
        >
          Wingman
        </span>
      </button>

      <div
        style={{
          height: 44,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          color: "#eef5ff",
          overflow: "hidden",
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.85 }}>âŒ•</span>
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(166,187,222,0.78)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Active project
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#f5fbff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            No active project
          </div>
        </div>
      </div>

      <div />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button onClick={() => window.history.back()} style={topBtnStyle()} aria-label="Back">
          â†
        </button>

        <button onClick={() => window.history.forward()} style={topBtnStyle()} aria-label="Forward">
          â†’
        </button>

        <button onClick={() => navigate("/app/dashboard")} style={navBtnStyle(isHome)}>
          âŒ‚ <span>Home</span>
        </button>

        <button onClick={() => navigate("/app/projects")} style={navBtnStyle(isProjects)}>
          â˜ <span>Projects</span>
        </button>

        <button
          onClick={() => navigate("/app/projects/new")}
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 12,
            border: "1px solid rgba(101,232,255,0.16)",
            background: "linear-gradient(90deg, rgba(25,182,211,0.96), rgba(28,121,198,0.96))",
            color: "#04111f",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + New Project
        </button>
      </div>
    </header>
  );
}