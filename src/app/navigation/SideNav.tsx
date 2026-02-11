import React from "react";
import { NavLink } from "react-router-dom";

function cls(isActive: boolean) {
  return "wm-snav-item" + (isActive ? " wm-snav-item-active" : "");
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="wm-snav-section">
      <div className="wm-snav-title">{props.title}</div>
      <div className="wm-snav-list">{props.children}</div>
    </div>
  );
}

export default function SideNav() {
  return (
    <aside className="wm-leftnav">
      <div className="wm-leftnav-scroll">
        <Section title="Workspace">
          <NavLink to="/app/dashboard" className={({ isActive }) => cls(isActive)}>
            <div className="wm-snav-label">Dashboard</div>
            <div className="wm-snav-sub">Overview + quick access</div>
          </NavLink>

          <NavLink to="/app/projects" className={({ isActive }) => cls(isActive)}>
            <div className="wm-snav-label">Projects</div>
            <div className="wm-snav-sub">Create, open, manage projects</div>
          </NavLink>
        </Section>

        <Section title="Project">
          <NavLink to="/app/import" className={({ isActive }) => cls(isActive)}>
            <div className="wm-snav-label">Import Intake</div>
            <div className="wm-snav-sub">Bring in requirements / files</div>
          </NavLink>
        </Section>

        <Section title="Tools">
          <NavLink to="/app/toolhub" className={({ isActive }) => cls(isActive)}>
            <div className="wm-snav-label">Tool Hub</div>
            <div className="wm-snav-sub">All tools in one place</div>
          </NavLink>

          <NavLink to="/app/tools/competitor-compare" className={({ isActive }) => cls(isActive)}>
            <div className="wm-snav-label">Competitor Compare</div>
            <div className="wm-snav-sub">Match SKUs + alternatives</div>
          </NavLink>
        </Section>

        <div className="wm-snav-note wm-card">
          <div className="wm-snav-note-title">Wingman</div>
          <div className="wm-snav-note-sub">Consistent layout mode enabled (Tailwind v4).</div>
        </div>
      </div>
    </aside>
  );
}


