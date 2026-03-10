import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  LayoutTemplate,
  Boxes,
  FileText,
  MonitorSmartphone,
  Building2,
  GraduationCap,
  Hotel,
  Store,
  FolderOpen,
  PlusCircle,
  History,
} from "lucide-react";

type RecentProject = {
  id: string;
  name: string;
  subtitle?: string;
  updatedAt?: string;
  href?: string;
};

type WorkflowCard = {
  eyebrow: string;
  title: string;
  description: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type UtilityCard = {
  title: string;
  description: string;
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const workflowCards: WorkflowCard[] = [
  {
    eyebrow: "Discovery",
    title: "Capture requirements",
    description:
      "Structure room conditions, displays, source counts, cable distance, USB, control, and audio needs before product selection begins.",
    to: "/app/tools/discovery",
    Icon: ClipboardList,
  },
  {
    eyebrow: "Architecture",
    title: "Choose the right signal path",
    description:
      "Guide users toward HDBaseT, AVoIP, matrix switching, USB extension, or video wall workflows based on the application.",
    to: "/app/tools/templates",
    Icon: LayoutTemplate,
  },
  {
    eyebrow: "Products",
    title: "Build the solution",
    description:
      "Turn the selected architecture into recommended WyreStorm platforms, building blocks, and a starter BOM direction.",
    to: "/app/tools/catalog",
    Icon: Boxes,
  },
  {
    eyebrow: "Proposal",
    title: "Move toward output",
    description:
      "Keep commercial logic, documentation, and proposal readiness aligned to the real project workflow.",
    to: "/app/tools/proposals",
    Icon: FileText,
  },
];

const utilityCards: UtilityCard[] = [
  {
    title: "Video Wall",
    description: "Plan LCD and LED wall workflows, processing, and sizing.",
    to: "/app/tools/video-wall",
    Icon: MonitorSmartphone,
  },
  {
    title: "Corporate",
    description: "Open business meeting room and boardroom starting points.",
    to: "/app/tools/templates?market=corporate",
    Icon: Building2,
  },
  {
    title: "Education",
    description: "Open classroom, lecture, and campus AV design starters.",
    to: "/app/tools/templates?market=education",
    Icon: GraduationCap,
  },
  {
    title: "Hospitality",
    description: "Open hospitality and venue-led room design starters.",
    to: "/app/tools/templates?market=hospitality",
    Icon: Hotel,
  },
  {
    title: "Retail",
    description: "Open signage, display, and customer-facing AV starters.",
    to: "/app/tools/templates?market=retail",
    Icon: Store,
  },
];

function safeReadRecentProjects(): RecentProject[] {
  if (typeof window === "undefined") return [];

  const candidateKeys = [
    "wm_recent_projects",
    "wm_projects_recent",
    "wm_projects",
    "wingman_projects",
  ];

  for (const key of candidateKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      const projects = parsed
        .map((item: any, index: number) => ({
          id: String(item?.id ?? item?.projectId ?? index + 1),
          name: String(
            item?.name ??
              item?.projectName ??
              item?.title ??
              "Untitled project"
          ),
          subtitle: item?.customer
            ? String(item.customer)
            : item?.site
              ? String(item.site)
              : item?.roomName
                ? String(item.roomName)
                : undefined,
          updatedAt: item?.updatedAt
            ? String(item.updatedAt)
            : item?.modifiedAt
              ? String(item.modifiedAt)
              : item?.createdAt
                ? String(item.createdAt)
                : undefined,
          href: item?.href
            ? String(item.href)
            : item?.id || item?.projectId
              ? "/app/projects"
              : "/app/projects",
        }))
        .filter((p: RecentProject) => !!p.name)
        .slice(0, 4);

      if (projects.length > 0) return projects;
    } catch {
      // Ignore malformed localStorage data
    }
  }

  return [];
}

function formatUpdatedAt(value?: string): string {
  if (!value) return "Recently updated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [recentProjects, setRecentProjects] = React.useState<RecentProject[]>([]);

  React.useEffect(() => {
    setRecentProjects(safeReadRecentProjects());
  }, []);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(24,168,196,0.14),transparent_34%),linear-gradient(180deg,#06111f_0%,#081626_55%,#0a1828_100%)] text-slate-100">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-8 lg:px-10">
        <section className="overflow-hidden rounded-[28px] border border-cyan-500/15 bg-slate-950/45 px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur md:px-10 md:py-12">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
              WyreStorm Sales Assistant
            </div>

            <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
              Turn AV requirements into proposal-ready system designs.
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              Wingman helps sales and pre-sales teams capture room requirements,
              select the right WyreStorm architecture, structure a BOM, and move
              projects through a consistent workflow.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => navigate("/app/tools/discovery")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:translate-y-[-1px] hover:bg-cyan-300"
              >
                <PlusCircle className="h-4 w-4" />
                Start New Project
              </button>

              <Link
                to="/app/tools/discovery"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/35 hover:bg-white/10"
              >
                Run Discovery Wizard
              </Link>

              <Link
                to="/app/dashboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/35 hover:bg-white/10"
              >
                Open Mission Control
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[24px] border border-white/8 bg-slate-950/35 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  What Wingman helps you do
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  Core workflow tools for AV sales and design
                </h2>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {workflowCards.map(({ eyebrow, title, description, to, Icon }) => (
                <Link
                  key={title}
                  to={to}
                  className="group rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(8,18,32,0.92))] p-5 transition hover:-translate-y-1 hover:border-cyan-300/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:text-cyan-200" />
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                    {eyebrow}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[24px] border border-white/8 bg-slate-950/35 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/10 p-3 text-cyan-200">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Continue working
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    Recent projects
                  </h2>
                </div>
              </div>

              {recentProjects.length > 0 ? (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={project.href ?? "/app/projects"}
                      className="block rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {project.name}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-400">
                            {project.subtitle ?? "Wingman project"}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            {formatUpdatedAt(project.updatedAt)}
                          </div>
                        </div>
                        <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                      </div>
                    </Link>
                  ))}

                  <Link
                    to="/app/projects"
                    className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                  >
                    Open all projects
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5">
                  <div className="text-sm font-semibold text-white">
                    No recent projects yet
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Start with a discovery-led workflow and Wingman can guide the
                    project toward architecture, products, and proposal output.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/app/tools/discovery")}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Start first project
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-white/8 bg-slate-950/35 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.22)]">
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Quick access
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                  Design starters and specialist tools
                </h2>
              </div>

              <div className="grid gap-3">
                {utilityCards.map(({ title, description, to, Icon }) => (
                  <Link
                    key={title}
                    to={to}
                    className="group flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.05]"
                  >
                    <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/10 p-2.5 text-cyan-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">{title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-400">
                        {description}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-200" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}