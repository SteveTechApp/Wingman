import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FileUp,
  LayoutTemplate,
  PanelsTopLeft,
  Search,
  Scale,
  Trash2
} from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
type RouteCard = {
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  eyebrow?: string;
};

const routeCards: RouteCard[] = [
  {
    title: "Discovery",
    description: "Capture the customer requirement and build the AV design brief.",
    route: routeCatalogByKey.discovery.path,
    icon: ClipboardList,
    eyebrow: "Discover"
  },
  {
    title: "Product Finder",
    description: "Match technical requirements to the right WyreStorm product direction.",
    route: routeCatalogByKey.finder.path,
    icon: Search,
    eyebrow: "Find"
  },
  {
    title: "Room Templates",
    description: "Start from a familiar room type and refine the system quickly.",
    route: routeCatalogByKey.templates.path,
    icon: LayoutTemplate,
    eyebrow: "Template"
  },
  {
    title: "Proposal Builder",
    description: "Turn scoped requirements into a customer-ready proposal structure.",
    route: routeCatalogByKey.proposal.path,
    icon: FileText,
    eyebrow: "Output"
  },
  {
    title: "Competitor Compare",
    description: "Position WyreStorm clearly against an alternative product or SKU.",
    route: routeCatalogByKey.compare.path,
    icon: Scale,
    eyebrow: "Compare"
  },
  {
    title: "Videowall Builder",
    description: "Shape LCD, LED, multiview and processor-led wall conversations.",
    route: routeCatalogByKey.videowall.path,
    icon: PanelsTopLeft,
    eyebrow: "Wall"
  },
  {
    title: "Document Ingest",
    description: "Upload customer files and turn them into usable project input.",
    route: routeCatalogByKey.ingest.path,
    icon: FileUp,
    eyebrow: "Import"
  }
];

const clearProjectStorage = (): void => {
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);

    if (!key) {
      continue;
    }

    const normalized = key.toLowerCase();

    if (normalized.includes("wingman") && normalized.includes("project")) {
      keysToRemove.push(key);
      continue;
    }

    if (normalized.includes("discovery") && normalized.includes("handoff")) {
      keysToRemove.push(key);
      continue;
    }

    if (normalized.includes("proposal") && normalized.includes("handoff")) {
      keysToRemove.push(key);
      continue;
    }

    if (normalized.includes("finder") && normalized.includes("history")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent("wingman:project-cleared"));
};

function DashboardCard(props: RouteCard & { onOpen: (route: string) => void }) {
  const { title, description, route, icon: Icon, eyebrow, onOpen } = props;

  return (
    <button
      type="button"
      className="wm-dashboard-refresh__card"
      onClick={() => onOpen(route)}
    >
      <div className="wm-dashboard-refresh__card-icon-wrap">
        <Icon className="wm-dashboard-refresh__card-icon" />
      </div>

      <div className="wm-dashboard-refresh__card-body">
        <div className="wm-dashboard-refresh__card-eyebrow">{eyebrow}</div>
        <div className="wm-dashboard-refresh__card-title">{title}</div>
        <p className="wm-dashboard-refresh__card-description">{description}</p>
      </div>

      <div className="wm-dashboard-refresh__card-link">
        <span>Open</span>
        <ArrowRight size={16} />
      </div>
    </button>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  const handleOpen = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  const handleClearProject = useCallback(() => {
    clearProjectStorage();
  }, []);

  return (
    <div className="wm-dashboard-refresh">
      <section className="wm-dashboard-refresh__hero">
        <div className="wm-dashboard-refresh__hero-copy">
          <div className="wm-dashboard-refresh__eyebrow">Dashboard</div>
          <h1 className="wm-dashboard-refresh__hero-title">
            Start from the sales motion, not the product list.
          </h1>
          <p className="wm-dashboard-refresh__hero-text">
            Choose the best workflow for the conversation: discover the
            requirement, find products, compare a competitor, build a room
            template, or move into proposal output.
          </p>
        </div>

        <div className="wm-dashboard-refresh__hero-actions">
          <button
            type="button"
            className="wm-dashboard-refresh__clear-button"
            onClick={handleClearProject}
          >
            <Trash2 size={15} />
            <span>Clear current project</span>
          </button>
        </div>
      </section>

      <section className="wm-dashboard-refresh__section">
        <div className="wm-dashboard-refresh__section-head">
          <div className="wm-dashboard-refresh__section-kicker">Sales workflows</div>
          <h2 className="wm-dashboard-refresh__section-title">
            Choose where the workflow starts
          </h2>
        </div>

        <div className="wm-dashboard-refresh__grid">
          {routeCards.map((card) => (
            <DashboardCard
              key={card.title}
              {...card}
              onOpen={handleOpen}
            />
          ))}

          <div className="wm-dashboard-refresh__action-card">
            <div className="wm-dashboard-refresh__action-eyebrow">Quick start</div>
            <div className="wm-dashboard-refresh__action-title">
              Start the most common motions
            </div>
            <p className="wm-dashboard-refresh__action-text">
              Use this last tile to launch the two most common starting points
              and balance the 4 x 2 grid.
            </p>

            <div className="wm-dashboard-refresh__action-stack">
              <button
                type="button"
                className="wm-dashboard-refresh__primary-action"
                onClick={() => handleOpen(routeCatalogByKey.discovery.path)}
              >
                <span>Start Discovery</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="wm-dashboard-refresh__secondary-action"
                onClick={() => handleOpen(routeCatalogByKey.finder.path)}
              >
                <span>Open Product Finder</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
