import { useMemo } from "react";
import { ClipboardList, FileUp, LayoutTemplate, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routeCatalog } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { WorkflowActionCard } from "../components/WorkflowActionCard";

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
    <div className="wm-dashboard-simple pb-10">
      <PageHero
        eyebrow="Dashboard"
        title="Start from the sales motion, not the product list."
        purpose="Wingman helps distributor reps qualify demand, position WyreStorm clearly, and move toward the right recommendation path without hesitation."
        nextMove="Choose the workflow that matches the conversation: Discovery, Competitor Product Check, Room Templates, or Upload Customer Files."
        actions={[
          { label: "Open projects", to: getRoutePath("projects", "/wingman/projects") },
          { label: "Open support", to: getRoutePath("support", "/wingman/support"), variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Choose a workflow"
        subtitle="Start from the customer problem type, then move into the workflow that produces the next useful output."
      >
        <div className="wm-dashboard-action-grid">
          {quickActions.map((action) => (
            <WorkflowActionCard
              key={action.key}
              title={action.title}
              summary={action.summary}
              Icon={action.icon}
              onClick={() => navigate(action.path)}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export default DashboardPage;
