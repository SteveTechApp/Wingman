import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FolderKanban,
  Headphones,
  MessageSquareText,
  PackageSearch,
  Scale,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

type WorkflowAction = {
  title: string;
  helper: string;
  path: string;
  icon: LucideIcon;
  tag: string;
  mode: "primary" | "standard";
};

const workflowActions: WorkflowAction[] = [
  {
    title: "Start a customer call",
    helper: "Use Live Call Cards to listen, capture, ask the next question and hand off to Discovery.",
    path: routeCatalogByKey.callCards.path,
    icon: Headphones,
    tag: "Best live start",
    mode: "primary",
  },
  {
    title: "Paste notes or transcript",
    helper: "Use Discovery when you already have notes, an email, a tender extract or a call summary.",
    path: routeCatalogByKey.discovery.path,
    icon: MessageSquareText,
    tag: "Interpret notes",
    mode: "primary",
  },
  {
    title: "Build the AV requirement",
    helper: "Capture room purpose, sources, displays, USB, audio, control and installation gaps.",
    path: routeCatalogByKey.discovery.path,
    icon: ClipboardList,
    tag: "Discovery",
    mode: "standard",
  },
  {
    title: "Find a product direction",
    helper: "Move from requirement to WyreStorm architecture, product family and shortlist.",
    path: routeCatalogByKey.finder.path,
    icon: PackageSearch,
    tag: "Finder",
    mode: "standard",
  },
  {
    title: "Compare a competitor",
    helper: "Translate competitor or legacy-system mentions into a WyreStorm-fit conversation.",
    path: routeCatalogByKey.compare.path,
    icon: Scale,
    tag: "Compare",
    mode: "standard",
  },
  {
    title: "Create customer follow-up",
    helper: "Generate proposal-safe wording, missing questions and next-step customer language.",
    path: routeCatalogByKey.proposal.path,
    icon: FileText,
    tag: "Proposal",
    mode: "standard",
  },
  {
    title: "Open existing opportunity",
    helper: "Return to saved projects and continue from the latest evidence or next action.",
    path: routeCatalogByKey.projects.path,
    icon: FolderKanban,
    tag: "Projects",
    mode: "standard",
  },
];

function WorkflowCard({ action }: { action: WorkflowAction }) {
  const Icon = action.icon;

  return (
    <Link to={action.path} className={`wm-dashboard-workflow-card is-${action.mode}`}>
      <span className="wm-dashboard-workflow-tag">{action.tag}</span>
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
  const primaryActions = workflowActions.filter((action) => action.mode === "primary");
  const nextActions = workflowActions.filter((action) => action.mode !== "primary");

  return (
    <main className="wm-dashboard-page wm-workflow-dashboard-page" data-wingman-dashboard-menu="true">
      <section className="wm-workflow-dashboard-shell" aria-labelledby="wingman-dashboard-title">
        <header className="wm-workflow-dashboard-hero">
          <p className="wm-dashboard-eyebrow">WyreStorm Wingman</p>
          <h1 id="wingman-dashboard-title">What are you trying to do?</h1>
          <p>
            Start with the customer conversation. Wingman will help capture the requirement, ask the next question,
            interpret the AV design and move you to the right workflow.
          </p>
        </header>

        <section className="wm-dashboard-menu-section is-primary" aria-label="Start here">
          <div className="wm-dashboard-menu-heading">
            <span>Start here</span>
            <strong>Choose the route that matches the conversation in front of you.</strong>
          </div>

          <div className="wm-dashboard-workflow-panel">
            {primaryActions.map((action) => (
              <WorkflowCard key={action.title} action={action} />
            ))}
          </div>
        </section>

        <section className="wm-dashboard-menu-section" aria-label="Continue workflow">
          <div className="wm-dashboard-menu-heading">
            <span>Continue workflow</span>
            <strong>Move to the right tool when the requirement becomes clearer.</strong>
          </div>

          <div className="wm-dashboard-workflow-panel is-secondary">
            {nextActions.map((action) => (
              <WorkflowCard key={action.title} action={action} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;