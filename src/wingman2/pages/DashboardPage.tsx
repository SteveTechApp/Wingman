import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderKanban,
  Heart,
  Handshake,
  HelpCircle,
  LayoutTemplate,
  MoreHorizontal,
  PanelsTopLeft,
  RefreshCw,
  Search,
  Scale,
  TrendingUp,
} from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";

type SalesModeId = "warm" | "problem" | "value" | "expert";

type SalesModeCard = {
  id: SalesModeId;
  title: string;
  summary: string;
  Icon: LucideIcon;
};

type WorkflowCard = {
  title: string;
  summary: string;
  route: string;
  Icon: LucideIcon;
};

type RecentProject = {
  name: string;
  note: string;
  type: string;
  updated: string;
  owner: string;
  status: "In progress" | "Draft";
};

const SALES_MODE_STORAGE_KEY = "wingman:sales-mode";

const salesModeCards: SalesModeCard[] = [
  { id: "warm", title: "Warm", summary: "Build rapport and explore", Icon: Heart },
  { id: "problem", title: "Problem", summary: "Uncover challenges", Icon: HelpCircle },
  { id: "value", title: "Value", summary: "Show impact and value", Icon: TrendingUp },
  { id: "expert", title: "Expert handoff", summary: "Bring in WyreStorm", Icon: Handshake },
];

const workflowCards: WorkflowCard[] = [
  {
    title: "Discovery",
    summary: "Ask the right questions",
    route: routeCatalogByKey.discovery.path,
    Icon: ClipboardList,
  },
  {
    title: "Product Finder",
    summary: "Find the right fit",
    route: routeCatalogByKey.finder.path,
    Icon: Search,
  },
  {
    title: "Room Templates",
    summary: "Start from a proven room",
    route: routeCatalogByKey.templates.path,
    Icon: LayoutTemplate,
  },
  {
    title: "Competitor Compare",
    summary: "Win with confidence",
    route: routeCatalogByKey.compare.path,
    Icon: Scale,
  },
  {
    title: "Video Wall",
    summary: "Design and visualize",
    route: routeCatalogByKey.videowall.path,
    Icon: PanelsTopLeft,
  },
  {
    title: "Sales Language",
    summary: "Talk the right way",
    route: routeCatalogByKey.salesHelper.path,
    Icon: FileText,
  },
  {
    title: "Proposal",
    summary: "Create and share",
    route: routeCatalogByKey.proposal.path,
    Icon: FileText,
  },
  {
    title: "Projects",
    summary: "Manage opportunities",
    route: routeCatalogByKey.projects.path,
    Icon: FolderKanban,
  },
];

const recentProjects: RecentProject[] = [
  {
    name: "Acme Corp - Executive Briefing Center",
    note: "RFP due May 28",
    type: "Proposal",
    updated: "May 16, 2025 10:42 AM",
    owner: "AP",
    status: "In progress",
  },
  {
    name: "Northwind - Training Rooms (3)",
    note: "Initial discovery",
    type: "Discovery",
    updated: "May 15, 2025 4:18 PM",
    owner: "AP",
    status: "In progress",
  },
  {
    name: "Global Finance HQ - Boardroom",
    note: "Solution review",
    type: "Room Template",
    updated: "May 14, 2025 9:05 AM",
    owner: "KH",
    status: "Draft",
  },
  {
    name: "TechCore - All Hands Space",
    note: "Video wall design",
    type: "Video Wall",
    updated: "May 12, 2025 2:33 PM",
    owner: "AP",
    status: "In progress",
  },
];

function getInitialSalesMode(): SalesModeId {
  if (typeof window === "undefined") {
    return "warm";
  }

  const saved = window.localStorage.getItem(SALES_MODE_STORAGE_KEY);

  if (saved === "problem" || saved === "value" || saved === "expert") {
    return saved;
  }

  return "warm";
}

function requestSalesMode(mode: SalesModeId) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("wingman:sales-mode-request", { detail: { mode } }));
  window.localStorage.setItem(SALES_MODE_STORAGE_KEY, mode);
}

function workflowTypeClass(type: string) {
  return `wm-command-dashboard__project-type wm-command-dashboard__project-type-${type
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<SalesModeId>(() => getInitialSalesMode());

  const activeSalesMode = useMemo(() => {
    return salesModeCards.find((mode) => mode.id === activeMode) ?? salesModeCards[0];
  }, [activeMode]);

  const handleSalesMode = useCallback((mode: SalesModeId) => {
    setActiveMode(mode);
    requestSalesMode(mode);
  }, []);

  const handleOpen = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate],
  );

  return (
    <div className="wm-command-dashboard">
      <div className="wm-command-dashboard__main">
        <section className="wm-command-panel wm-command-dashboard__tone">
          <div className="wm-command-panel__header">
            <div>
              <h1>Start the conversation</h1>
              <p>Choose the tone before opening the customer discussion.</p>
            </div>
            <button type="button" className="wm-command-button wm-command-button--quiet" onClick={() => handleSalesMode("warm")}>
              <RefreshCw className="h-4 w-4" />
              Reset tone
            </button>
          </div>

          <div className="wm-command-dashboard__tone-grid">
            {salesModeCards.map(({ id, title, summary, Icon }) => (
              <button
                key={id}
                type="button"
                className={`wm-command-dashboard__tone-card ${activeMode === id ? "is-active" : ""}`}
                onClick={() => handleSalesMode(id)}
                aria-pressed={activeMode === id}
              >
                <Icon className="wm-command-dashboard__tone-icon" />
                <span>
                  <strong>{title}</strong>
                  <small>{summary}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="wm-command-panel">
          <div className="wm-command-panel__header">
            <div>
              <h2>Your workflow</h2>
              <p>Start from the application, then move into products and proposal output.</p>
            </div>
          </div>

          <div className="wm-command-dashboard__workflow-grid">
            {workflowCards.map(({ title, summary, route, Icon }) => (
              <button
                key={title}
                type="button"
                className="wm-command-dashboard__workflow-card"
                onClick={() => handleOpen(route)}
              >
                <Icon className="wm-command-dashboard__workflow-icon" />
                <span>
                  <strong>{title}</strong>
                  <small>{summary}</small>
                </span>
                <ArrowRight className="wm-command-dashboard__workflow-arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="wm-command-panel wm-command-dashboard__recent">
          <div className="wm-command-panel__header">
            <div>
              <h2>Recent work</h2>
              <p>Proposal, discovery and design work ready to resume.</p>
            </div>
            <button type="button" className="wm-command-button wm-command-button--link" onClick={() => handleOpen(routeCatalogByKey.projects.path)}>
              View all projects
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="wm-command-dashboard__table" role="table" aria-label="Recent Wingman work">
            <div className="wm-command-dashboard__table-row wm-command-dashboard__table-head" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Type</span>
              <span role="columnheader">Last updated</span>
              <span role="columnheader">Owner</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Actions</span>
            </div>

            {recentProjects.map((project) => (
              <div key={project.name} className="wm-command-dashboard__table-row" role="row">
                <span className="wm-command-dashboard__project-name" role="cell">
                  <Building2 className="wm-command-dashboard__project-icon" />
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.note}</small>
                  </span>
                </span>
                <span role="cell">
                  <em className={workflowTypeClass(project.type)}>{project.type}</em>
                </span>
                <span role="cell">{project.updated}</span>
                <span role="cell">
                  <i className="wm-command-dashboard__owner-avatar">{project.owner}</i>
                </span>
                <span role="cell">
                  <em className={`wm-command-dashboard__status wm-command-dashboard__status-${project.status.toLowerCase().replace(" ", "-")}`}>
                    {project.status}
                  </em>
                </span>
                <span className="wm-command-dashboard__row-actions" role="cell">
                  <button type="button" aria-label={`Open ${project.name}`}>
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label={`More actions for ${project.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="wm-command-dashboard__guidance">
        <section className="wm-command-panel wm-command-dashboard__guidance-panel">
          <div className="wm-command-panel__header">
            <div>
              <h2>Wingman guidance</h2>
              <p>{activeSalesMode.title} tone selected.</p>
            </div>
          </div>

          <article className="wm-command-dashboard__guidance-card">
            <Heart className="wm-command-dashboard__guidance-icon is-warm" />
            <div>
              <h3>Conversation opener</h3>
              <p>"What is most important for this space to accomplish?"</p>
              <button type="button" className="wm-command-button wm-command-button--secondary">Use opener</button>
            </div>
          </article>

          <article className="wm-command-dashboard__guidance-card">
            <HelpCircle className="wm-command-dashboard__guidance-icon is-question" />
            <div>
              <h3>Follow-up question</h3>
              <p>"What challenges have you faced with your current AV setup?"</p>
              <button type="button" className="wm-command-button wm-command-button--cyan">Use question</button>
            </div>
          </article>

          <article className="wm-command-dashboard__guidance-card">
            <Handshake className="wm-command-dashboard__guidance-icon is-handoff" />
            <div>
              <h3>Handoff note</h3>
              <p>When ready, connect the requirement to a WyreStorm expert for validation.</p>
              <button type="button" className="wm-command-button wm-command-button--secondary">Request expert handoff</button>
            </div>
          </article>

          <article className="wm-command-dashboard__active-project">
            <span>Active project</span>
            <strong>Acme Corp - Executive Briefing Center</strong>
            <small>Proposal</small>
            <div className="wm-command-dashboard__progress" aria-label="Project progress">
              <i className="is-done" />
              <i className="is-done" />
              <i className="is-active" />
              <i />
            </div>
            <button type="button" className="wm-command-button wm-command-button--secondary" onClick={() => handleOpen(routeCatalogByKey.projects.path)}>
              Open project
              <ExternalLink className="h-4 w-4" />
            </button>
          </article>
        </section>
      </aside>
    </div>
  );
}

export default DashboardPage;
