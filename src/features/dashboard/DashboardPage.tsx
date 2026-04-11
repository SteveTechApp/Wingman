import * as React from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Boxes,
  ClipboardList,
  FileText,
  FolderOpen,
  Monitor,
  Route,
} from "lucide-react";

import WingmanPageFrame, { WingmanPageSection } from "@/components/layout/WingmanPageFrame";
import { buildCustomerSafeSummary } from "@/features/projects/customerSummary";
import { getProjectResumeAction } from "@/features/projects/projectProductivity";
import {
  getActiveProject,
  loadProjects,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import "./wingman-dashboard.css";

type FlowCard = {
  index: string;
  title: string;
  copy: string;
  to: string;
};

type ToolCard = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  badge: string;
};

const primaryFlow: FlowCard[] = [
  {
    index: "01",
    title: "Discovery",
    copy: "Discovery and Import Intake should reduce the brief to the few decisions that change design.",
    to: "/app/tools/discovery",
  },
  {
    index: "02",
    title: "Design",
    copy: "Use Product Finder, Navigator, and templates only after the direction is clear.",
    to: "/app/tools/catalog",
  },
  {
    index: "03",
    title: "Proposal",
    copy: "Move into Proposal Builder once the technical path is stable and project-linked.",
    to: "/app/tools/proposal",
  },
];

const quickTools: ToolCard[] = [
  {
    title: "Discovery Wizard",
    description: "Best first step when the room and technical scope are still moving.",
    to: "/app/tools/discovery",
    icon: ClipboardList,
    badge: "Start",
  },
  {
    title: "Product Finder",
    description: "Dense product lookup for live sales work and design narrowing.",
    to: "/app/tools/catalog",
    icon: Boxes,
    badge: "Reference",
  },
  {
    title: "AV Navigator",
    description: "Guided architecture direction when you already know the broad system category.",
    to: "/app/tools/navigator",
    icon: Route,
    badge: "Guide",
  },
  {
    title: "Proposal Builder",
    description: "Convert the selected path into a sharper commercial output pack.",
    to: "/app/tools/proposal",
    icon: FileText,
    badge: "Output",
  },
];

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function lower(value: string | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function formatDateTime(value?: string): string {
  if (!value) return "No recent activity";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function projectSummaryLine(project: StoredProject): string {
  return (
    [tidy(project.customer), tidy(project.roomName) || tidy(project.discovery?.applicationType), tidy(project.site)]
      .filter(Boolean)
      .join(" / ") || "Customer, room, and site details are still being captured."
  );
}

function isDiscoveryProject(project: StoredProject): boolean {
  const stage = lower(project.stage);
  return stage.length === 0 || stage.includes("discovery");
}

function isProposalProject(project: StoredProject): boolean {
  return Boolean(
    tidy(project.proposal?.title) ||
      tidy(project.proposal?.notes) ||
      lower(project.stage).includes("proposal"),
  );
}

function isCommercialReady(project: StoredProject): boolean {
  return lower(project.status).includes("commercial ready");
}

export default function DashboardPage() {
  const projects = React.useSyncExternalStore(subscribeProjects, loadProjects, () => []);
  const activeProject = React.useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);

  const projectInFocus = activeProject ?? projects[0] ?? null;
  const resumeAction = React.useMemo(
    () => (projectInFocus ? getProjectResumeAction(projectInFocus) : null),
    [projectInFocus],
  );
  const discoveryCount = React.useMemo(
    () => projects.filter(isDiscoveryProject).length,
    [projects],
  );
  const proposalCount = React.useMemo(
    () => projects.filter(isProposalProject).length,
    [projects],
  );
  const readyCount = React.useMemo(
    () => projects.filter(isCommercialReady).length,
    [projects],
  );
  const shareCount = React.useMemo(
    () => projects.reduce((total, project) => total + (project.shares?.length ?? 0), 0),
    [projects],
  );
  const recentProjects = React.useMemo(() => projects.slice(0, 3), [projects]);
  const focusSummary = React.useMemo(() => {
    if (!projectInFocus) return null;
    return projectInFocus.customerSummary ?? buildCustomerSafeSummary(projectInFocus);
  }, [projectInFocus]);

  const primaryActionLabel = resumeAction?.label ?? "Start discovery";
  const primaryActionTo = resumeAction?.to ?? "/app/tools/discovery";

  return (
    <WingmanPageFrame
      className="wm-dashboard-page"
      eyebrow="Mission control"
      title={projectInFocus ? `Pick up ${projectInFocus.name}` : "Start the next project"}
      subtitle={
        projectInFocus
          ? "Dashboard now reads the live project and surfaces the next unfinished lane instead of acting like a static landing page."
          : "Create or open a project first so Wingman can keep the workflow centred on one live record."
      }
      actions={
        <div className="wm-workspace-actions">
          <Link to="/app/projects/new" className="wm-workspace-action">
            New project
          </Link>
          <Link to={projects.length > 0 ? "/app/projects" : "/app/tools/import-intake"} className="wm-workspace-action">
            {projects.length > 0 ? "Open projects" : "Import brief"}
          </Link>
          <Link to={primaryActionTo} className="wm-workspace-action wm-workspace-action--primary">
            {primaryActionLabel}
          </Link>
        </div>
      }
      stats={
        <div className="wm-workspace-stats">
          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Project in focus</div>
            <div className="wm-workspace-stat__value">{projectInFocus?.name ?? "No active project"}</div>
            <div className="wm-workspace-stat__meta">
              {projectInFocus
                ? `${projectSummaryLine(projectInFocus)} / Next: ${resumeAction?.shortLabel ?? "Discovery"}`
                : "Create or open a project so Dashboard can point to the next real action."}
            </div>
          </div>

          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Pipeline</div>
            <div className="wm-workspace-stat__value">{projects.length} live project(s)</div>
            <div className="wm-workspace-stat__meta">
              Discovery: {discoveryCount} / Proposal: {proposalCount}
            </div>
          </div>

          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Handoff readiness</div>
            <div className="wm-workspace-stat__value">{readyCount} commercial-ready</div>
            <div className="wm-workspace-stat__meta">
              Share packs: {shareCount} / Last update: {formatDateTime(projectInFocus?.updatedAt)}
            </div>
          </div>
        </div>
      }
      aside={
        <>
          <WingmanPageSection title="Focus rules" subtitle="Keep the live project moving forward.">
            <ul className="wm-workspace-list wm-workspace-list--plain">
              <li>
                {projectInFocus
                  ? `Resume ${projectInFocus.name} in ${resumeAction?.shortLabel ?? "Discovery"} before opening a disconnected lane.`
                  : "Start from a project or imported brief so every next step stays attached to one record."}
              </li>
              <li>Use Discovery or Import Intake to sharpen the brief before narrowing products.</li>
              <li>Save proposal output back into the project before preparing anything customer-facing.</li>
            </ul>
          </WingmanPageSection>

          <WingmanPageSection title="Fast access" subtitle="Jump straight to the live workspace touchpoints.">
            <div className="wm-workspace-link-list">
              <Link
                to={projectInFocus ? `/app/projects/${encodeURIComponent(projectInFocus.id)}` : "/app/projects"}
                className="wm-workspace-link"
              >
                <span>{projectInFocus ? "Project overview" : "Open projects"}</span>
                <FolderOpen size={14} />
              </Link>
              <Link to="/app/tools/guru" className="wm-workspace-link">
                <span>Ask Guru</span>
                <Bot size={14} />
              </Link>
              <Link to="/app/tools/video-wall" className="wm-workspace-link">
                <span>Video wall planner</span>
                <Monitor size={14} />
              </Link>
            </div>
          </WingmanPageSection>
        </>
      }
    >
      <WingmanPageSection
        title="Primary flow"
        subtitle={
          projectInFocus
            ? `Current resume point: ${resumeAction?.label ?? "Open discovery"} for ${projectInFocus.name}.`
            : "The intended working line: brief in, design narrowed, proposal out."
        }
      >
        <div className="wm-workspace-stage-grid">
          {primaryFlow.map((step) => (
            <Link key={step.index} to={step.to} className="wm-workspace-stage">
              <span className="wm-workspace-stage__index">{step.index}</span>
              <div className="wm-workspace-stage__title">{step.title}</div>
              <div className="wm-workspace-stage__copy">{step.copy}</div>
            </Link>
          ))}
        </div>
      </WingmanPageSection>

      <WingmanPageSection
        title="Quick lanes"
        subtitle="Fast entry points when you already know which part of the workflow needs attention."
      >
        <div className="wm-workspace-tile-grid">
          {quickTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link key={tool.to} to={tool.to} className="wm-workspace-tile">
                <div className="wm-workspace-tile__top">
                  <div className="wm-workspace-tile__icon">
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <span className="wm-workspace-tile__badge">{tool.badge}</span>
                </div>

                <div className="wm-workspace-tile__title">{tool.title}</div>
                <div className="wm-workspace-tile__description">{tool.description}</div>
                <div className="wm-workspace-tile__footer">
                  Open workspace
                  <ArrowRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </WingmanPageSection>

      <WingmanPageSection
        title="Projects in play"
        subtitle="Most recent project records, with their next useful action."
      >
        {recentProjects.length > 0 ? (
          <div className="wm-workspace-link-list">
            {recentProjects.map((project) => {
              const projectAction = getProjectResumeAction(project);
              const summary = project.customerSummary ?? buildCustomerSafeSummary(project);

              return (
                <Link
                  key={project.id}
                  to={`/app/projects/${encodeURIComponent(project.id)}`}
                  className="wm-workspace-link wm-dashboard-page__project-link"
                >
                  <div className="wm-dashboard-page__project-copy">
                    <strong>{project.name}</strong>
                    <div className="wm-dashboard-page__project-summary">
                      {summary.headline || "Project summary is still being assembled."}
                    </div>
                    <div className="wm-dashboard-page__project-meta">
                      {projectSummaryLine(project)} / Next: {projectAction.shortLabel} / Updated {formatDateTime(project.updatedAt)}
                    </div>
                  </div>
                  <ArrowRight size={14} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Command deck</div>
            <strong>Start from one project so Dashboard has something real to drive.</strong>
            <div className="wm-workspace-note">
              Once a project exists, this screen can surface the active record, the next unfinished lane, and the latest workspace activity without relying on placeholders.
            </div>
          </div>
        )}
      </WingmanPageSection>

      {focusSummary ? (
        <WingmanPageSection
          title="Operator note"
          subtitle="What the current project is already communicating back to the workspace."
        >
          <div className="wm-workspace-note-block">
            <div className="wm-workspace-kicker">Live summary</div>
            <strong>{focusSummary.headline}</strong>
            <div className="wm-workspace-note">{focusSummary.overview}</div>
          </div>
        </WingmanPageSection>
      ) : null}
    </WingmanPageFrame>
  );
}
