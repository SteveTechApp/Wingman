import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function topBtnStyle(active: boolean): React.CSSProperties {
  return {
    appearance: "none",
    border: active ? "1px solid rgba(101,232,255,0.28)" : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "linear-gradient(90deg, rgba(27,91,146,0.96), rgba(42,118,188,0.96))"
      : "rgba(9,17,28,0.72)",
    color: "#eef6ff",
    borderRadius: 12,
    height: 34,
    padding: "0 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Home", to: "/app/dashboard" },
    { label: "Projects", to: "/app/projects" },
    { label: "Tools", to: "/app/tools" },
  ];

  return (
    <header
      style={{
        height: 54,
        minHeight: 54,
        display: "grid",
        gridTemplateColumns: "96px minmax(260px, 1fr) auto",
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
        onClick={() => navigate("/app/dashboard")}
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
        }}
        title="Go to Dashboard"
      >
        <img
          src="/wyrestorm-logo.png"
          alt="WyreStorm Wingman"
          style={{
            display: "block",
            width: "auto",
            height: 28,
            objectFit: "contain",
          }}
        />
      </button>

      <div
        style={{
          height: 38,
          display: "flex",
          alignItems: "center",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,22,36,0.76)",
          color: "#eef6ff",
          fontSize: 12.5,
          fontWeight: 700,
          padding: "0 14px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        Active Project - No active project
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <button key={item.to} type="button" onClick={() => navigate(item.to)} style={topBtnStyle(active)}>
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate("/app/projects/new")}
          style={{
            appearance: "none",
            border: "1px solid rgba(101,232,255,0.22)",
            background: "rgba(12,27,46,0.96)",
            color: "#eef6ff",
            borderRadius: 12,
            height: 34,
            padding: "0 14px",
            fontSize: 12,
            fontWeight: 800,
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