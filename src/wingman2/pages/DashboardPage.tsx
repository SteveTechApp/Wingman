import type { LucideIcon } from "lucide-react";
import { ArrowRight, ClipboardList, FileText, FolderKanban, PackageSearch, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { JourneyProgress } from "../components/WingmanSalesIntelligence";

type WorkflowAction = {
  title: string;
  helper: string;
  path: string;
  icon: LucideIcon;
  step: string;
};

const workflowActions: WorkflowAction[] = [
  {
    title: "Start discovery",
    helper: "Capture the room, workflow, sources, displays and blockers.",
    path: routeCatalogByKey.discovery.path,
    icon: ClipboardList,
    step: "1",
  },
  {
    title: "Find product path",
    helper: "Convert the brief into a WyreStorm architecture and shortlist.",
    path: routeCatalogByKey.finder.path,
    icon: PackageSearch,
    step: "2",
  },
  {
    title: "Compare alternative",
    helper: "Position WyreStorm against a competitor SKU or known option.",
    path: routeCatalogByKey.compare.path,
    icon: Scale,
    step: "3",
  },
  {
    title: "Write proposal",
    helper: "Package the recommendation with assumptions and risks visible.",
    path: routeCatalogByKey.proposal.path,
    icon: FileText,
    step: "4",
  },
  {
    title: "Resume projects",
    helper: "Pick up active opportunities and continue the next action.",
    path: routeCatalogByKey.projects.path,
    icon: FolderKanban,
    step: "5",
  },
];

function WorkflowCard({ action }: { action: WorkflowAction }) {
  const Icon = action.icon;

  return (
    <Link to={action.path} className="wm-dashboard-workflow-card">
      <span className="wm-dashboard-workflow-step">{action.step}</span>
      <span className="wm-dashboard-workflow-icon">
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <span className="wm-dashboard-workflow-copy">
        <strong>{action.title}</strong>
        <span>{action.helper}</span>
      </span>
      <ArrowRight className="wm-dashboard-workflow-arrow" size={18} strokeWidth={2} />
    </Link>
  );
}

export function DashboardPage() {
  return (
    <main className="wm-dashboard-page wm-workflow-dashboard-page">
      <section className="wm-workflow-dashboard-shell" aria-labelledby="wingman-dashboard-title">
        <header className="wm-workflow-dashboard-hero">
          <p className="wm-dashboard-eyebrow">WyreStorm Wingman</p>
          <h1 id="wingman-dashboard-title">Choose the next sales move.</h1>
          <p>
            Work from customer evidence to product direction, comparison, proposal and project follow-up. Start with
            the step that matches the conversation in front of you.
          </p>
        </header>

        <JourneyProgress activeStage="Discovery" compact />

        <section className="wm-dashboard-workflow-panel" aria-label="Wingman workflow actions">
          {workflowActions.map((action) => (
            <WorkflowCard key={action.path} action={action} />
          ))}
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;
