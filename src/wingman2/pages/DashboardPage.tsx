import {
  ArrowRight,
  ClipboardList,
  FileUp,
  GitCompare,
  LayoutTemplate,
} from "lucide-react";
import { Link } from "react-router-dom";

type DashboardAction = {
  title: string;
  description: string;
  path: string;
  icon: typeof ClipboardList;
  tone: "blue" | "slate" | "violet" | "emerald";
};

const primaryActions: DashboardAction[] = [
  {
    title: "Start Discovery",
    description: "Guide a customer conversation from room, workflow, sources and outputs.",
    path: "/wingman/discovery",
    icon: ClipboardList,
    tone: "blue",
  },
  {
    title: "Compare Competitor SKU",
    description: "Position WyreStorm against a known competitor product.",
    path: "/wingman/compare",
    icon: GitCompare,
    tone: "violet",
  },
  {
    title: "Browse Room Templates",
    description: "Start from a known room type and refine the system design.",
    path: "/wingman/templates",
    icon: LayoutTemplate,
    tone: "emerald",
  },
  {
    title: "Upload Customer Files",
    description: "Bring in customer notes, schedules or documents and turn them into useful project data.",
    path: "/wingman/ingest",
    icon: FileUp,
    tone: "slate",
  },
];

function DashboardCard({ action, compact = false }: { action: DashboardAction; compact?: boolean }) {
  const Icon = action.icon;

  return (
    <Link className={`wm-dashboard-card wm-dashboard-card-${action.tone}`} to={action.path}>
      <span className="wm-dashboard-card-icon">
        <Icon size={compact ? 18 : 22} strokeWidth={1.9} />
      </span>

      <span className="wm-dashboard-card-copy">
        <strong>{action.title}</strong>
        <span>{action.description}</span>
      </span>

      <span className="wm-dashboard-card-arrow">
        <ArrowRight size={18} strokeWidth={1.9} />
      </span>
    </Link>
  );
}

export function DashboardPage() {
  return (
    <main className="wm-dashboard-page">
      <section className="wm-dashboard-hero" aria-labelledby="wingman-dashboard-title">
        <div>
          <p className="wm-dashboard-eyebrow">WyreStorm Wingman</p>
          <h1 id="wingman-dashboard-title">Start from the sales motion.</h1>
          <p>
            Choose the task you need now. Wingman will guide the conversation, capture useful
            requirements and move towards a practical WyreStorm recommendation.
          </p>
        </div>

        <div className="wm-dashboard-hero-actions">
          <Link to="/wingman/discovery">New project</Link>
          <Link to="/wingman/finder">Find product</Link>
        </div>
      </section>

      <section className="wm-dashboard-section" aria-labelledby="wingman-next-move-title">
        <div className="wm-dashboard-section-heading">
          <div>
            <p className="wm-dashboard-eyebrow">Choose the next move</p>
            <h2 id="wingman-next-move-title">What do you want Wingman to help with?</h2>
          </div>
        </div>

        <div className="wm-dashboard-grid">
          {primaryActions.map((action) => (
            <DashboardCard key={action.path} action={action} />
          ))}
        </div>
      </section>

    </main>
  );
}

export default DashboardPage;
