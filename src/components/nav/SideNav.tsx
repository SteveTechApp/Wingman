import React from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@/app/routing/routes";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="wm-kicker" style={{ marginBottom: 8 }}>{title}</div>
      <div className="wm-grid" style={{ gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

export default function SideNav() {
  const workspace = ROUTES.filter(r => r.nav && r.group === "Workspace");
  const tools = ROUTES.filter(r => r.nav && r.group === "Tools");

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--wm-border)",
    background: isActive ? "rgba(31,224,163,0.14)" : "rgba(255,255,255,0.05)",
    textDecoration: "none",
    color: "var(--wm-text)",
    display: "block",
  });

  return (
    <nav>
      <Section title="Workspace">
        {workspace.map(r => (
          <NavLink key={r.path} to={r.path} style={linkStyle}>{r.label}</NavLink>
        ))}
      </Section>

      <Section title="Tools">
        {tools.map(r => (
          <NavLink key={r.path} to={r.path} style={linkStyle}>{r.label}</NavLink>
        ))}
      </Section>
    </nav>
  );
}