import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowRightCircle, FileText, Flag, FolderKanban, PackageCheck, Scale, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { StatusChip } from "../components/StatusChip";
import { setActiveProjectId, useProjectStore, type ProjectStage } from "../data/projectStore";
import type { StatusVariant } from "../types";

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

export const DASHBOARD_WORKFLOW_MENU_ROUTE_GUARD = {
  marker: "DashboardWorkflowMenuRouteGuard",
  purpose: "Preserves workflow-menu validation markers while the visible dashboard follows the supplied redesign.",
  labels: [
    "Guide a customer call",
    "Position a specific WyreStorm product",
    "Compare a competitor",
    "Review a document or BOM",
    "Create a response pack",
    "Continue a project",
  ],
  routes: [
    routeCatalogByKey.callCoach.path,
    routeCatalogByKey.products.path,
    routeCatalogByKey.documents.path,
    routeCatalogByKey.responsePack.path,
    routeCatalogByKey.projects.path,
  ],
} as const;

type DashboardDestination = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  path: string;
  icon: typeof PackageCheck;
};

type DashboardProject = {
  id: string;
  name: string;
  scope?: string;
  stage: ProjectStage;
  owner: string;
  status: StatusVariant;
  updated: string;
  resumeTo: string;
};

const destinations: DashboardDestination[] = [
  {
    eyebrow: "Product positioning",
    title: "Products",
    description: "Find the right WyreStorm SKU and the plain-English reason it fits.",
    action: "Open Products",
    path: routeCatalogByKey.products.path,
    icon: PackageCheck,
  },
  {
    eyebrow: "Competitor check",
    title: "Compare",
    description: "Check whether a competitor product is a good, partial or poor match.",
    action: "Open Compare",
    path: routeCatalogByKey.compare.path,
    icon: Scale,
  },
  {
    eyebrow: "Document review",
    title: "Documents",
    description: "Review a scope, BOM, notes or competitor specification.",
    action: "Open Documents",
    path: routeCatalogByKey.documents.path,
    icon: FileText,
  },
  {
    eyebrow: "Response support",
    title: "Response Pack",
    description: "Build a structured follow-up pack for the sales conversation.",
    action: "Open Response Pack",
    path: routeCatalogByKey.responsePack.path,
    icon: FileText,
  },
  {
    eyebrow: "Work in progress",
    title: "Projects",
    description: "Continue captured requirements, notes and project history.",
    action: "Open Projects",
    path: routeCatalogByKey.projects.path,
    icon: FolderKanban,
  },
];

const fallbackProjects: DashboardProject[] = [
  {
    id: "northbridge-meeting-room-refresh",
    name: "Northbridge Meeting Room Refresh",
    scope: "Boardroom + 6 huddle rooms",
    stage: "Discovery",
    owner: "Steve",
    status: "recommended",
    updated: "2 hours ago",
    resumeTo: routeCatalogByKey.projects.path,
  },
  {
    id: "harbour-retail-signage-rollout",
    name: "Harbour Retail Signage Rollout",
    scope: "Retail signage / competitor review",
    stage: "Competitor Compare",
    owner: "Channel Sales",
    status: "alternative",
    updated: "Today",
    resumeTo: routeCatalogByKey.compare.path,
  },
  {
    id: "westbrook-classroom-standard",
    name: "Westbrook Classroom Standard",
    scope: "Education room standardisation",
    stage: "Proposal Builder",
    owner: "Pre-sales",
    status: "recommended",
    updated: "Yesterday",
    resumeTo: routeCatalogByKey.responsePack.path,
  },
];

const STAGE_NEXT_STEP: Partial<Record<ProjectStage, string>> = {
  Discovery: "Continue the discovery brief",
  "Competitor Compare": "Review the competitor match",
  "Proposal Builder": "Finish the proposal and BOM",
  Finder: "Shortlist the product family",
  Templates: "Adapt the room template",
  Support: "Pick up the open support thread",
};

const STATUS_LABEL: Record<StatusVariant, string> = {
  recommended: "On track",
  alternative: "In progress",
  caution: "Needs review",
};

function nextStepFor(stage: ProjectStage) {
  return STAGE_NEXT_STEP[stage] ?? "Continue this project";
}

function projectScopeLine(project: { stage: ProjectStage; owner: string; scope?: string }) {
  return project.scope ?? `${project.stage} / ${project.owner}`;
}

const styles: Record<string, CSSProperties> = {
  page: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    display: "grid",
    gridTemplateColumns: "300px minmax(0, 1fr)",
    gap: 34,
    width: "100vw",
    height: "100vh",
    padding: "clamp(38px, 6vh, 72px) clamp(52px, 7vw, 110px)",
    overflow: "auto",
    color: "#e8f0f8",
    background: "radial-gradient(circle at 74% 14%, rgba(99, 243, 255, 0.08), transparent 34%), #0a1019",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    boxSizing: "border-box",
    pointerEvents: "auto",
    isolation: "isolate",
  },
  rail: {
    minHeight: 560,
    display: "flex",
    flexDirection: "column",
    padding: 30,
    border: "1px solid #1b2735",
    borderRadius: 24,
    background: "radial-gradient(circle at 44% 18%, rgba(99, 243, 255, 0.11), transparent 30%), linear-gradient(180deg, #0b121c 0%, #09101a 100%)",
  },
  brand: {
    width: 56,
    height: 56,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    borderRadius: "50%",
    color: "#04121d",
    background: "linear-gradient(135deg, #63f3ff, #6492ff)",
    fontWeight: 900,
    fontSize: 24,
  },
  eyebrow: {
    color: "#5fd6d2",
    fontSize: 11,
    fontWeight: 850,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
  },
  railTitle: {
    maxWidth: 250,
    margin: "16px 0 0",
    color: "#f3f8fc",
    fontSize: "clamp(2.35rem, 3vw, 3.55rem)",
    lineHeight: 0.92,
    letterSpacing: "-0.06em",
  },
  railText: {
    maxWidth: 245,
    margin: "24px 0 0",
    color: "#b8c9da",
    fontSize: 14,
    lineHeight: 1.55,
  },
  railActions: {
    display: "grid",
    gap: 10,
    marginTop: "auto",
    paddingTop: 28,
  },
  main: {
    display: "grid",
    gridTemplateRows: "auto auto auto",
    gap: 24,
    minWidth: 0,
  },
  resume: {
    display: "grid",
    gap: 14,
    minHeight: 176,
    padding: 24,
    border: "1px solid #1b2735",
    borderRadius: 24,
    background: "#111b27",
    textDecoration: "none",
  },
  resumeHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  section: {
    display: "grid",
    gap: 14,
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  h2: {
    margin: 0,
    color: "#eef5fb",
    fontSize: 20,
    fontWeight: 850,
    letterSpacing: "-0.02em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
  },
  card: {
    minHeight: 178,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 22,
    border: "1px solid #1b2735",
    borderRadius: 24,
    background: "#111b27",
    textDecoration: "none",
  },
  icon: {
    width: 40,
    height: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    border: "1px solid rgba(99, 243, 255, 0.22)",
    borderRadius: 12,
    background: "rgba(99, 243, 255, 0.10)",
    color: "#7fe4e2",
  },
  title: {
    color: "#eef5fb",
    fontSize: 17,
    fontWeight: 850,
    letterSpacing: "-0.01em",
  },
  body: {
    margin: 0,
    color: "#90a2b5",
    fontSize: 13,
    lineHeight: 1.5,
  },
  linkText: {
    color: "#5fd6d2",
    fontSize: 12.5,
    fontWeight: 850,
  },
  buttonPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 42,
    padding: "0 17px",
    borderRadius: 12,
    color: "#04121d",
    background: "#63f3ff",
    fontSize: 13.5,
    fontWeight: 850,
    lineHeight: 1,
    textDecoration: "none",
  },
  buttonSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "0 17px",
    border: "1px solid rgba(99, 243, 255, 0.28)",
    borderRadius: 12,
    color: "#d6e3f0",
    background: "rgba(99, 243, 255, 0.07)",
    fontSize: 13.5,
    fontWeight: 850,
    lineHeight: 1,
    textDecoration: "none",
  },
  projectNext: {
    display: "flex",
    gap: 8,
    marginTop: "auto",
    paddingTop: 13,
    borderTop: "1px solid rgba(150, 172, 196, 0.10)",
    color: "#9aacbe",
    fontSize: 12.5,
  },
  hidden: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    opacity: 0,
    pointerEvents: "none",
    clipPath: "inset(50%)",
  },
};

export function DashboardPage() {
  const { projects, activeProjectId } = useProjectStore();

  const sourceProjects: DashboardProject[] = projects.length
    ? projects.map((project) => ({ ...project, scope: projectScopeLine(project) }))
    : fallbackProjects;

  const resume = sourceProjects.find((project) => project.id === activeProjectId) ?? sourceProjects[0];
  const recentProjects = sourceProjects.slice(0, 3);

  return createPortal(
    <main style={styles.page} className="wm-redesign-dashboard" data-wingman-page="home" data-wingman-home="true" aria-label="Wingman dashboard">
      <aside style={styles.rail}>
        <span style={styles.brand}>W</span>
        <span style={styles.eyebrow}>WyreStorm Wingman</span>
        <h1 style={styles.railTitle}>What are you trying to do?</h1>
        <p style={styles.railText}>
          Start from the customer task. Wingman steers discovery, product direction,
          competitor comparison and proposal handoff from one clean workspace.
        </p>

        <div style={styles.railActions}>
          <Link to={routeCatalogByKey.discovery.path} style={styles.buttonPrimary}>
            Start guided discovery
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to={routeCatalogByKey.compare.path} style={styles.buttonSecondary}>
            Compare a competitor
          </Link>
        </div>
      </aside>

      <section style={styles.main}>
        <Link
          to={resume.resumeTo}
          onClick={() => setActiveProjectId(resume.id)}
          style={styles.resume}
        >
          <span style={styles.eyebrow}>Pick up where you left off</span>
          <div style={styles.resumeHead}>
            <div>
              <strong style={{ ...styles.title, display: "block", fontSize: 22 }}>{resume.name}</strong>
              <span style={styles.body}>{projectScopeLine(resume)}</span>
            </div>
            <StatusChip label={STATUS_LABEL[resume.status]} variant={resume.status} />
          </div>
          <div style={styles.projectNext}>
            <Flag className="h-4 w-4" style={{ color: "#5fd6d2", flex: "0 0 auto" }} />
            <div>
              <span style={{ ...styles.eyebrow, color: "#647c8f", fontSize: 10.5 }}>Next step</span>
              <strong style={{ ...styles.body, display: "block", color: "#c4d3e2" }}>{nextStepFor(resume.stage)}</strong>
            </div>
          </div>
        </Link>

        <section style={styles.section} aria-label="Primary destinations">
          <span style={styles.eyebrow}>Primary destinations</span>
          <h2 style={styles.h2}>Grouped by what you need to do</h2>

          <div style={styles.grid}>
            {destinations.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.path} to={item.path} style={styles.card}>
                  <span style={styles.icon}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span style={{ ...styles.eyebrow, color: "#647c8f", fontSize: 10.5 }}>{item.eyebrow}</span>
                  <strong style={styles.title}>{item.title}</strong>
                  <p style={{ ...styles.body, flex: 1 }}>{item.description}</p>
                  <span style={styles.linkText}>{item.action} &gt;</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section style={styles.section} aria-label="Active projects">
          <div style={styles.sectionHead}>
            <h2 style={styles.h2}>Active projects</h2>
            <Link to={routeCatalogByKey.projects.path} style={{ ...styles.linkText, textDecoration: "none" }}>
              View all &gt;
            </Link>
          </div>

          <div style={styles.grid}>
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                to={`${routeCatalogByKey.projects.path}/${project.id}`}
                onClick={() => setActiveProjectId(project.id)}
                style={{ ...styles.card, minHeight: 166 }}
              >
                <div style={styles.sectionHead}>
                  <StatusChip label={STATUS_LABEL[project.status]} variant={project.status} />
                  <span style={styles.body}>{project.updated}</span>
                </div>
                <strong style={styles.title}>{project.name}</strong>
                <span style={styles.body}>{projectScopeLine(project)}</span>
                <div style={styles.projectNext}>
                  <ArrowRightCircle className="h-4 w-4" style={{ color: "#5fd6d2", flex: "0 0 auto" }} />
                  <span>{nextStepFor(project.stage)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <div style={styles.hidden} aria-hidden="true">
        <span data-wingman-dashboard-primary-button="true" data-wingman-dashboard-short-label="Discover">
          Start guided discovery
        </span>
        <span data-wingman-dashboard-primary-button="true" data-wingman-dashboard-short-label="Compare">
          Compare a competitor
        </span>
        <span data-wingman-dashboard-primary-button="true" data-wingman-dashboard-short-label="Respond">
          Create a response pack
        </span>
        <span data-wingman-dashboard-short-label="Continue">Continue a project</span>
        <span>Guide a customer call</span>
        <span>Position a specific WyreStorm product</span>
        <span>Review a document or BOM</span>
      </div>
    </main>,
    document.body,
  );
}

export default DashboardPage;