import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";

type NavItem = { to: string; label: string; desc?: string };

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Section(props: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-4">
      <div className="px-3 pt-3 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-emerald-100/50">
        {props.title}
      </div>

      <div className="px-2">
        {props.items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cx(
                "block rounded-xl px-3 py-2 border",
                isActive
                  ? "bg-emerald-500/10 border-emerald-200/15"
                  : "bg-black/10 border-white/5 hover:bg-black/20 hover:border-white/10"
              )
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{it.label}</div>
            </div>
            {it.desc ? <div className="mt-0.5 text-xs text-emerald-100/60">{it.desc}</div> : null}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function SideNav() {
  const loc = useLocation();

  const sections = useMemo(() => {
    const workspace: NavItem[] = [
      { to: "/app/dashboard", label: "Dashboard", desc: "Overview + quick access" },
      { to: "/app/projects", label: "Projects", desc: "Create, open, manage projects" },
    ];

    const project: NavItem[] = [
      { to: "/app/import", label: "Import Intake", desc: "Bring in requirements / files" },
    ];

    const tools: NavItem[] = [
      { to: "/app/toolhub", label: "Tool Hub", desc: "All tools in one place" },
      { to: "/app/tools/competitor-compare", label: "Competitor Compare", desc: "Match SKUs + alternatives" },
    ];

    return { workspace, project, tools };
  }, []);

  const showProjectHint = useMemo(() => {
    // Only show a hint on pages that usually need an active project
    const p = loc.pathname.toLowerCase();
    return p.startsWith("/app/import") || p.startsWith("/app/toolhub") || p.startsWith("/app/tools/competitor-compare");
  }, [loc.pathname]);

  return (
    <aside className="wm-sidenav border-r border-white/10 bg-slate-950/40 min-h-0 overflow-auto">
      <div className="p-2">
        {/* Project status placeholder (doesn't require store; prevents â€œblankâ€ feel) */}
        {showProjectHint ? (
          <div className="mx-2 mt-2 mb-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-100/50">
              Project Context
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              No active project detected
            </div>
            <div className="mt-1 text-xs text-emerald-100/60">
              Open a project to enable Import / Tool Hub features.
            </div>
            <div className="mt-3 flex gap-2">
              <NavLink
                to="/app/projects"
                className="inline-flex items-center rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white hover:bg-black/30"
              >
                Open Projects
              </NavLink>
            </div>
          </div>
        ) : null}

        <Section title="Workspace" items={sections.workspace} />
        <Section title="Project" items={sections.project} />
        <Section title="Tools" items={sections.tools} />

        <div className="mx-2 mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs font-extrabold uppercase tracking-widest text-emerald-100/50">
            Wingman
          </div>
          <div className="mt-1 text-xs text-emerald-100/60">
            Consistent layout mode enabled (Tailwind v4).
          </div>
        </div>

        <div className="h-3" />
      </div>
    </aside>
  );
}



