import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StartPathCard from "./components/StartPathCard";

/*
  Update these three route constants if your existing app uses different paths.
*/
const ROUTE_NEW_PROJECT = "/app/projects/new";
const ROUTE_IMPORT_BRIEF = "/app/projects/import";
const ROUTE_TEMPLATES = "/app/templates";

type StartPathItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  hints: string[];
  ctaLabel: string;
  accent: "blue" | "purple" | "green";
  featured?: boolean;
  route: string;
  icon: JSX.Element;
};

function HeroButton({
  label,
  onClick,
  variant = "secondary",
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const className =
    variant === "primary"
      ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300 border-cyan-300 shadow-[0_12px_40px_rgba(34,211,238,0.18)]"
      : variant === "ghost"
        ? "bg-transparent text-white border-white/12 hover:bg-white/6 hover:border-white/20"
        : "bg-white/6 text-white border-white/12 hover:bg-white/10 hover:border-white/20";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-full border px-5 py-3",
        "text-sm font-semibold transition-all duration-200",
        "hover:-translate-y-0.5",
        className,
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function GlyphNew() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GlyphImport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 4V14M12 14L8.5 10.5M12 14L15.5 10.5M6 18H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlyphTemplate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 6.5C4 5.672 4.672 5 5.5 5H10.5C11.328 5 12 5.672 12 6.5V10.5C12 11.328 11.328 12 10.5 12H5.5C4.672 12 4 11.328 4 10.5V6.5ZM12 13.5C12 12.672 12.672 12 13.5 12H18.5C19.328 12 20 12.672 20 13.5V17.5C20 18.328 19.328 19 18.5 19H13.5C12.672 19 12 18.328 12 17.5V13.5ZM4 13.5C4 12.672 4.672 12 5.5 12H8.5C9.328 12 10 12.672 10 13.5V17.5C10 18.328 9.328 19 8.5 19H5.5C4.672 19 4 18.328 4 17.5V13.5ZM14 5H20V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const startPaths = useMemo<StartPathItem[]>(
    () => [
      {
        id: "new",
        eyebrow: "Discovery",
        title: "Start a new project",
        description:
          "Best when you are building the design from scratch, scoping a room live, or working from partial information.",
        hints: [
          "Map the room envelope",
          "Capture route distances",
          "Define technology fit",
        ],
        ctaLabel: "Start project",
        accent: "blue",
        featured: true,
        route: ROUTE_NEW_PROJECT,
        icon: <GlyphNew />,
      },
      {
        id: "import",
        eyebrow: "Import",
        title: "Import a brief",
        description:
          "Best when you already have notes, consultant documents, requirements, or source material that should be turned into a workable project start.",
        hints: [
          "Bring source material",
          "Pull key signals",
          "Skip manual setup",
        ],
        ctaLabel: "Import brief",
        accent: "purple",
        route: ROUTE_IMPORT_BRIEF,
        icon: <GlyphImport />,
      },
      {
        id: "templates",
        eyebrow: "Templates",
        title: "Browse architecture starters",
        description:
          "Best for moving quickly with proven room patterns, repeatable standards, and consistent starting structures.",
        hints: [
          "Move faster early",
          "Use tested patterns",
          "Stay consistent",
        ],
        ctaLabel: "Browse templates",
        accent: "green",
        route: ROUTE_TEMPLATES,
        icon: <GlyphTemplate />,
      },
    ],
    []
  );

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_100%)] text-white">
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-5 md:px-6 xl:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:px-8 md:py-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-5%] top-[-20%] h-[280px] w-[280px] rounded-full bg-cyan-400/8 blur-3xl" />
            <div className="absolute right-[-5%] top-[-5%] h-[260px] w-[260px] rounded-full bg-violet-500/8 blur-3xl" />
          </div>

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_380px] lg:items-start">
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/80">
                Start your project
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-white md:text-5xl md:leading-[1.05]">
                Choose the start path that matches the information you already have.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Wingman should guide the user immediately. Keep the first choice clear,
                reduce duplication, and show the best route up front.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <HeroButton
                  label="Start project"
                  onClick={() => navigate(ROUTE_NEW_PROJECT)}
                  variant="primary"
                />
                <HeroButton
                  label="Import brief"
                  onClick={() => navigate(ROUTE_IMPORT_BRIEF)}
                  variant="secondary"
                />
                <HeroButton
                  label="Browse templates"
                  onClick={() => navigate(ROUTE_TEMPLATES)}
                  variant="ghost"
                />
              </div>
            </div>

            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300/75">
                Continue working
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4 shadow-[0_0_24px_rgba(34,211,238,0.07)]">
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">
                  Active project
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Corporate – Divisible Meeting Suite
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-300">
                  Resume the current workflow or jump straight into a new scoped design path.
                </div>

                <div className="mt-4">
                  <HeroButton
                    label="Open project"
                    onClick={() => navigate("/app/projects")}
                    variant="secondary"
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Recommended flow
                  </div>
                  <div className="mt-1 text-sm text-slate-200">
                    Use <span className="font-semibold text-white">Start a new project</span> for live discovery and early room design.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Fastest route
                  </div>
                  <div className="mt-1 text-sm text-slate-200">
                    Use <span className="font-semibold text-white">Templates</span> when the room type is already familiar.
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Guided paths
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Choose the clearest next action
              </h2>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_minmax(0,1fr)]">
            <StartPathCard
              eyebrow={startPaths[0].eyebrow}
              title={startPaths[0].title}
              description={startPaths[0].description}
              hints={startPaths[0].hints}
              ctaLabel={startPaths[0].ctaLabel}
              accent={startPaths[0].accent}
              featured={true}
              icon={startPaths[0].icon}
              onClick={() => navigate(startPaths[0].route)}
            />

            <div className="grid gap-6">
              <StartPathCard
                eyebrow={startPaths[1].eyebrow}
                title={startPaths[1].title}
                description={startPaths[1].description}
                hints={startPaths[1].hints}
                ctaLabel={startPaths[1].ctaLabel}
                accent={startPaths[1].accent}
                icon={startPaths[1].icon}
                onClick={() => navigate(startPaths[1].route)}
              />

              <StartPathCard
                eyebrow={startPaths[2].eyebrow}
                title={startPaths[2].title}
                description={startPaths[2].description}
                hints={startPaths[2].hints}
                ctaLabel={startPaths[2].ctaLabel}
                accent={startPaths[2].accent}
                icon={startPaths[2].icon}
                onClick={() => navigate(startPaths[2].route)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}