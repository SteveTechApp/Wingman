import React from "react";
import { Link } from "react-router-dom";

type Tile = { title: string; desc: string; to: string; tag?: string };

function SectionHeader(props: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-sm font-bold tracking-wide text-white/80 uppercase">{props.title}</h2>
        {props.subtitle ? <p className="text-xs text-white/55 mt-1">{props.subtitle}</p> : null}
      </div>
    </div>
  );
}

function TileGrid(props: { items: Tile[] }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {props.items.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition
                     p-4 flex flex-col gap-2 min-h-[108px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-base font-extrabold text-white/90 leading-tight">{t.title}</div>
            {t.tag ? (
              <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-white/60 bg-black/20">
                {t.tag}
              </span>
            ) : null}
          </div>
          <div className="text-sm text-white/65 leading-snug">{t.desc}</div>
          <div className="mt-auto text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
            Open â†’
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const userName =
    (typeof window !== "undefined" && localStorage.getItem("wingman_user_name")) || "AV Professional";

  const design: Tile[] = [
    { title: "Room Wizard", desc: "Design AV rooms quickly with guided inputs.", to: "/app/tools/room", tag: "Design" },
    { title: "Video Wall", desc: "Plan LED/LCD walls and outputs cleanly.", to: "/app/tools/videowall", tag: "Design" },
    { title: "Templates", desc: "Start from proven vertical templates.", to: "/app/tools/templates", tag: "Library" },
  ];

  const sales: Tile[] = [
    { title: "Competitor Compare", desc: "Match SKUs and position WyreStorm alternatives.", to: "/app/tools/competitor-compare", tag: "Sales" },
    { title: "Proposal", desc: "Generate a proposal pack from your project.", to: "/app/tools/proposal", tag: "Docs" },
    { title: "Compare", desc: "Compare solutions and configurations.", to: "/app/tools/compare", tag: "Tools" },
  ];

  const support: Tile[] = [
    { title: "Tool Hub", desc: "All tools in one place (utilities + helpers).", to: "/app/toolhub", tag: "Hub" },
    { title: "Training Hub", desc: "Sales + technical learning modules.", to: "/app/tools/training", tag: "Learn" },
    { title: "Ask Wingman", desc: "Quick questions, guidance and recommendations.", to: "/app/tools/ask", tag: "AI" },
  ];

  return (
    <div className="w-full">
      {/* Top header */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white/95">Dashboard</h1>
            <p className="text-sm text-white/60 mt-1">
              Welcome, <span className="text-white/85 font-semibold">{userName}</span>. Pick an action or open a tool.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/projects"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold shadow-lg"
            >
              New / Open Project
            </Link>
            <Link
              to="/app/import"
              className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-white/85 font-bold"
            >
              Import
            </Link>
            <Link
              to="/app/toolhub"
              className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-white/70 font-semibold"
            >
              Tool Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        {/* Left: Tools */}
        <div className="space-y-5">
          <div>
            <SectionHeader title="Design tools" subtitle="Start building the technical shape of the project." />
            <TileGrid items={design} />
          </div>

          <div>
            <SectionHeader title="Sales tools" subtitle="Position, compare, and produce outputs for customers." />
            <TileGrid items={sales} />
          </div>

          <div>
            <SectionHeader title="Support" subtitle="Fast answers and enablement." />
            <TileGrid items={support} />
          </div>
        </div>

        {/* Right: Project context */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm font-extrabold text-white/90">Project context</div>
            <p className="text-sm text-white/60 mt-1">
              Select an active project to unlock proposal + design workflows.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                to="/app/projects"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/85 font-bold text-sm"
              >
                Open Projects
              </Link>
              <Link
                to="/app/projects"
                className="px-3 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-white/70 font-semibold text-sm"
              >
                Create New
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm font-extrabold text-white/90">Quick links</div>
            <div className="mt-3 grid gap-2">
              <Link className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80" to="/app/dashboard">
                Dashboard
              </Link>
              <Link className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80" to="/app/projects">
                Projects
              </Link>
              <Link className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80" to="/app/import">
                Import Intake
              </Link>
              <Link className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80" to="/app/toolhub">
                Tool Hub
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm font-extrabold text-white/90">Tip</div>
            <p className="text-sm text-white/60 mt-1">
              Keep the flow: Create/Open Project â†’ Design â†’ Compare â†’ Proposal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


