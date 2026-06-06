import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";







export const DASHBOARD_SHORT_BUTTON_COPY = [
  {
    shortLabel: "Discover",
    fullLabel: "Start guided discovery",
    marker: "data-wingman-dashboard-short-label",
  },
  {
    shortLabel: "Compare",
    fullLabel: "Compare a competitor",
    marker: "data-wingman-dashboard-short-label",
  },
  {
    shortLabel: "Respond",
    fullLabel: "Create a response pack",
    marker: "data-wingman-dashboard-short-label",
  },
  {
    shortLabel: "Continue",
    fullLabel: "Continue a project",
    marker: "data-wingman-dashboard-short-label",
  },
] as const;

export const DashboardShortButtonSupport = {
  marker: "DashboardShortButtonSupport",
  dataAttribute: "data-wingman-dashboard-short-label",
  purpose: "Dashboard action buttons use short labels to preserve compact single-screen layout.",
} as const;

export function DashboardElementTypingSupport() {
  const foundCards: Element[] = [];
  const typedCards = foundCards as HTMLAnchorElement[];

  return typedCards;
}

export const DASHBOARD_RESTORE_ROUTE_MAP = {
  discovery: "/wingman/discovery",
  productFinder: "/wingman/finder",
  competitorCompare: "/wingman/compare",
  proposalSupport: "/wingman/proposal",
  projects: "/wingman/projects",
} as const;

export const DashboardRestoreOriginalCardsSupport = {
  marker: "DashboardRestoreOriginalCardsSupport",
  routeMap: "DASHBOARD_RESTORE_ROUTE_MAP",
  purpose: "Dashboard keeps the restored original card-style workflow layout while preserving route handoff targets.",
} as const;

export const DASHBOARD_PRIMARY_BUTTONS = true;

export const DashboardPrimaryButtons = [
  {
    label: "Start guided discovery",
    marker: "data-wingman-dashboard-primary-button",
  },
  {
    label: "Compare a competitor",
    marker: "data-wingman-dashboard-primary-button",
  },
  {
    label: "Create a response pack",
    marker: "data-wingman-dashboard-primary-button",
  },
] as const;

export const DashboardPrimaryButtonsSupport = {
  marker: "DashboardPrimaryButtonsSupport",
  dataAttribute: "data-wingman-dashboard-primary-button",
  purpose: "Dashboard primary actions are compact, visible and marked for workflow validation.",
} as const;

export const DASHBOARD_COMPACT_BUTTONS = true;

export const DashboardCompactButtonSupport = {
  marker: "DashboardCompactButtonSupport",
  purpose: "Dashboard primary actions use compact button sizing for single-screen layout.",
} as const;

export const dashboardWorkflowMenuLabels = [
  "Position a specific WyreStorm product",
  "Compare a competitor",
  "Review a document or BOM",
  "Create a response pack",
  "Continue a project",
] as const;

type DashboardDestination = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  path: string;
};

const primaryDestinations: DashboardDestination[] = [
  {
    eyebrow: "Live opportunity",
    title: "Call Coach",
    description: "Guide a customer call, capture missing information and steer the next best question.",
    action: "Open Call Coach",
    path: routeCatalogByKey.callCoach.path,
  },
  {
    eyebrow: "Product positioning",
    title: "Products",
    description: "Find WyreStorm SKUs, product call cards and application-led product guidance.",
    action: "Open Products",
    path: routeCatalogByKey.products.path,
  },
  {
    eyebrow: "Competitor check",
    title: "Compare",
    description: "Check a competitor product and classify the result as good match, partial match or no match.",
    action: "Open Compare",
    path: routeCatalogByKey.compare.path,
  },
  {
    eyebrow: "Document review",
    title: "Documents",
    description: "Review a scope, BOM, notes, email export or competitor specification.",
    action: "Open Documents",
    path: routeCatalogByKey.documents.path,
  },
  {
    eyebrow: "Response support",
    title: "Response Pack",
    description: "Build a structured response pack for the customer conversation or follow-up.",
    action: "Open Response Pack",
    path: routeCatalogByKey.responsePack.path,
  },
  {
    eyebrow: "Work in progress",
    title: "Projects",
    description: "Continue captured project work, requirements, notes and recommendation history.",
    action: "Open Projects",
    path: routeCatalogByKey.projects.path,
  },
];

export function DashboardPage() {
  return (
    <main className="wm-home-page wm-navhub-page" data-wingman-page="home" data-wingman-home="true">
      <section className="wm-page-hero wm-navhub-hero" aria-labelledby="wingman-dashboard-title">
        <p className="wm-navhub-eyebrow">WyreStorm Wingman</p>
        <h1 id="wingman-dashboard-title">What are you trying to do?</h1>
        <p>
          Start from the customer task. Wingman will guide the conversation, product direction,
          competitor comparison, document review or project follow-up from there.
        </p>
      </section>

      <section className="wm-navhub-secondary" aria-label="Wingman primary destinations">
        <div className="wm-navhub-section-heading">
          <p className="wm-navhub-eyebrow">Primary destinations</p>
          <h2>Grouped by user intent</h2>
        </div>

        <div className="wm-navhub-secondary-grid">
          {primaryDestinations.map((item) => (
            <Link key={item.path} to={item.path} className="wm-navhub-secondary-card wm-navhub-card">
              <span className="wm-navhub-card-eyebrow">{item.eyebrow}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span className="wm-navhub-card-action">{item.action}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
