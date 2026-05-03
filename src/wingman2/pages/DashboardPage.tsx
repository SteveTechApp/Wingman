import { useMemo } from "react";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FileUp,
  LayoutTemplate,
  MonitorSmartphone,
  PackageSearch,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routeCatalog } from "../app/routeCatalog";
import "../styles/dashboard-visual-upgrade.css";

type DashboardTile = {
  key: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  path: string;
  group: "primary" | "secondary";
};

function getRoutePath(key: string, fallback: string) {
  return routeCatalog.find((route) => route.key === key)?.path ?? fallback;
}

export function DashboardPage() {
  const navigate = useNavigate();

  const dashboardTiles = useMemo<DashboardTile[]>(
    () => [
      {
        key: "discovery",
        title: "Discovery",
        summary: "Capture the customer requirement and build the AV design brief.",
        icon: ClipboardList,
        path: getRoutePath("discovery", "/wingman/discovery"),
        group: "primary",
      },
      {
        key: "finder",
        title: "Product Finder",
        summary: "Match technical requirements to the right WyreStorm product direction.",
        icon: PackageSearch,
        path: getRoutePath("finder", "/wingman/finder"),
        group: "primary",
      },
      {
        key: "templates",
        title: "Room Templates",
        summary: "Start from a familiar room type and refine the system quickly.",
        icon: LayoutTemplate,
        path: getRoutePath("templates", "/wingman/templates"),
        group: "primary",
      },
      {
        key: "proposal",
        title: "Proposal Builder",
        summary: "Turn scoped requirements into a customer-ready proposal structure.",
        icon: FileText,
        path: getRoutePath("proposal", "/wingman/proposal"),
        group: "primary",
      },
      {
        key: "compare",
        title: "Competitor Compare",
        summary: "Position WyreStorm clearly against an alternative product or SKU.",
        icon: Scale,
        path: getRoutePath("compare", "/wingman/compare"),
        group: "secondary",
      },
      {
        key: "videowall",
        title: "Videowall Builder",
        summary: "Shape LCD, LED, multiview and processor-led wall conversations.",
        icon: MonitorSmartphone,
        path: getRoutePath("videowall", "/wingman/videowall"),
        group: "secondary",
      },
      {
        key: "ingest",
        title: "Document Ingest",
        summary: "Upload customer files and convert them into usable project input.",
        icon: FileUp,
        path: getRoutePath("ingest", "/wingman/ingest"),
        group: "secondary",
      },
    ],
    [],
  );

  const primaryTiles = dashboardTiles.filter((tile) => tile.group === "primary");
  const secondaryTiles = dashboardTiles.filter((tile) => tile.group === "secondary");

  return (
    <div className="wm-dashboard-page">
      <section className="wm-dashboard-hero">
        <div className="wm-dashboard-hero-copy">
          <p className="wm-dashboard-eyebrow">WyreStorm Wingman</p>
          <h1>Start from the sales motion, not the product list.</h1>
          <p>
            Choose the right workflow for the conversation: discover the requirement, find products,
            compare a competitor, build a room template, or move into proposal output.
          </p>
        </div>

        <div className="wm-dashboard-hero-actions">
          <button type="button" onClick={() => navigate(getRoutePath("discovery", "/wingman/discovery"))}>
            Start Discovery
            <ArrowRight size={16} />
          </button>

          <button type="button" onClick={() => navigate(getRoutePath("finder", "/wingman/finder"))}>
            Open Product Finder
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="wm-dashboard-panel">
        <div className="wm-dashboard-section-heading">
          <p>Primary tools</p>
          <h2>Choose where the sales workflow starts</h2>
        </div>

        <div className="wm-dashboard-tile-grid wm-dashboard-tile-grid-primary">
          {primaryTiles.map((tile) => {
            const Icon = tile.icon;

            return (
              <button
                key={tile.key}
                type="button"
                className={`wm-dashboard-tile wm-dashboard-tile-${tile.key}`}
                onClick={() => navigate(tile.path)}
              >
                <span className="wm-dashboard-tile-icon">
                  <Icon size={24} />
                </span>

                <span className="wm-dashboard-tile-copy">
                  <strong>{tile.title}</strong>
                  <span>{tile.summary}</span>
                </span>

                <ArrowRight className="wm-dashboard-tile-arrow" size={18} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="wm-dashboard-panel wm-dashboard-panel-secondary">
        <div className="wm-dashboard-section-heading">
          <p>Supporting tools</p>
          <h2>Use these when the conversation needs deeper support</h2>
        </div>

        <div className="wm-dashboard-tile-grid wm-dashboard-tile-grid-secondary">
          {secondaryTiles.map((tile) => {
            const Icon = tile.icon;

            return (
              <button
                key={tile.key}
                type="button"
                className={`wm-dashboard-tile wm-dashboard-tile-${tile.key}`}
                onClick={() => navigate(tile.path)}
              >
                <span className="wm-dashboard-tile-icon">
                  <Icon size={22} />
                </span>

                <span className="wm-dashboard-tile-copy">
                  <strong>{tile.title}</strong>
                  <span>{tile.summary}</span>
                </span>

                <ArrowRight className="wm-dashboard-tile-arrow" size={18} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;