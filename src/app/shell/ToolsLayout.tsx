import * as React from "react";

import { NavLink, Outlet } from "react-router-dom";

const TOOL_LINKS = [
  { to: "/app/tools/discovery", label: "Discovery Wizard" },
  { to: "/app/tools/catalog", label: "Product Catalog" },
  { to: "/app/tools/competitor", label: "Competitor Compare" },
  { to: "/app/tools/proposal", label: "Proposal Builder" },
  { to: "/app/tools/room", label: "Room Wizard" },
  { to: "/app/tools/videowall", label: "Video Wall Planner" },
  { to: "/app/tools/training", label: "Training Hub" },
  { to: "/app/tools/guru", label: "Guru" },
];

export default function ToolsLayout() {
  return (
    <div className="wm-tools-layout" style={{ display: "flex", gap: 16, width: "100%" }}>
      <aside className="wm-tools-nav wm-card" style={{ width: 300, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Tools</div>

        <div style={{ display: "grid", gap: 8 }}>
          {TOOL_LINKS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className="wm-pill wm-pill--btn"
              style={({ isActive }) => ({
                display: "block",
                textDecoration: "none",
                opacity: isActive ? 1 : 0.88,
                borderColor: isActive ? "rgba(34,193,184,.55)" : undefined,
              })}
            >
              {t.label}
            </NavLink>
          ))}
        </div>

        {/* Optional: put Active Opportunity / Pinned Tools here (sidebar-only) */}
      </aside>

      <main className="wm-tools-main" style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}