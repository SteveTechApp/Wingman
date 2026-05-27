import { useMemo } from "react";
import { ClipboardList, FileUp, LayoutTemplate, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routeCatalog } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

type QuickAction = {
  key: string;
  title: string;
  summary: string;
  icon: typeof ClipboardList;
  path: string;
};

function getRoutePath(key: string, fallback: string) {
  return routeCatalog.find((route) => route.key === key)?.path ?? fallback;
}

export function DashboardPage() {
  const navigate = useNavigate();

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: "discovery",
        title: "Start Discovery",
        summary: "Guide the conversation from room, workflow, sources, and outputs.",
        icon: ClipboardList,
        path: getRoutePath("discovery", "/wingman/discovery"),
      },
      {
        key: "compare",
        title: "Compare Competitor SKU",
        summary: "Replace competitor products with the right WyreStorm direction.",
        icon: Scale,
        path: getRoutePath("compare", "/wingman/compare"),
      },
      {
        key: "templates",
        title: "Browse Room Templates",
        summary: "Start from a known room archetype and refine from there.",
        icon: LayoutTemplate,
        path: getRoutePath("templates", "/wingman/templates"),
      },
      {
        key: "ingest",
        title: "Upload Customer Files",
        summary: "Bring in customer documents and move them into a usable brief.",
        icon: FileUp,
        path: getRoutePath("ingest", "/wingman/ingest"),
      },
    ],
    []
  );

  return (
    <div className="space-y-4 pb-6">
      <PageHero
        eyebrow="Dashboard"
        title="Start from the sales motion."
        purpose="This workspace helps reps qualify demand, position WyreStorm clearly, and move toward the right recommendation path without hesitation."
        nextMove="Choose the workflow that matches the conversation: Discovery, Compare, Templates, or Upload Customer Files."
        actions={[
          { label: "Open projects", to: getRoutePath("projects", "/wingman/projects") },
          { label: "Open support", to: getRoutePath("support", "/wingman/support"), variant: "secondary" },
        ]}
      />

      <SectionCard title="Choose the next move" subtitle="Start from problem type rather than product taxonomy.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.key}
                type="button"
                onClick={() => navigate(action.path)}
                className="grid min-h-[116px] grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
              >
                <div className="grid gap-2">
                  <p className="text-sm font-semibold leading-5 text-slate-950">{action.title}</p>
                  <p className="line-clamp-2 text-xs leading-5 text-slate-600">{action.summary}</p>
                </div>

                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

export default DashboardPage;
