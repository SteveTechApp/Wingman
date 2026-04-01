import { FolderKanban, Library, Network, ScanSearch, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/context/ProjectContext";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./wingman-dashboard.css";

function numberFrom(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferDirection(project: any): string {
  if (!project) return "Choose a path to begin";
  if (project.discovery?.videoWall) return "Video wall workflow";
  if (project.discovery?.networkReady) return "AVoIP workflow";
  if (project.discovery?.recommendedNextTool) return project.discovery.recommendedNextTool;
  return "Guided discovery";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projectData } = useProjectContext();
  const project = projectData.activeProject;
  const projectCount = projectData.projects.length;

  const snapshot = useMemo(() => {
    const sources = numberFrom(project?.discovery?.sources ?? project?.discovery?.sourceCount);
    const displays = numberFrom(project?.discovery?.displays ?? project?.discovery?.displayCount);
    const distance = numberFrom(project?.discovery?.distanceM ?? project?.discovery?.distance);

    return [
      {
        label: "Active project",
        value: project?.name?.trim() || "No active project",
      },
      {
        label: "Stage",
        value: project?.stage?.trim() || "Discovery",
      },
      {
        label: "System snapshot",
        value:
          sources > 0 || displays > 0 || distance > 0
            ? `${sources || 0} src • ${displays || 0} dsp • ${distance || 0}m`
            : "Brief not captured yet",
      },
      {
        label: "Next focus",
        value: inferDirection(project),
      },
    ];
  }, [project]);

  const quickActions = [
    {
      title: "Continue discovery",
      copy: "Capture or refine the project brief without reopening every tool.",
      icon: ScanSearch,
      to: WM_ROUTES.discovery,
      cta: "Open Discovery",
    },
    {
      title: "Review architecture",
      copy: "Go straight into the system architecture and routing workspace.",
      icon: Network,
      to: WM_ROUTES.architecture,
      cta: "Open Architecture",
    },
    {
      title: "Open proposal output",
      copy: "Jump to the proposal surface when the design is ready to present.",
      icon: Sparkles,
      to: WM_ROUTES.proposal,
      cta: "Open Proposal",
    },
  ];

  const launchers = [
    { title: "Projects", to: WM_ROUTES.projects, icon: FolderKanban },
    { title: "Catalogue", to: WM_ROUTES.catalog, icon: Library },
    { title: "Discovery", to: WM_ROUTES.discovery, icon: ScanSearch },
    { title: "Architecture", to: WM_ROUTES.architecture, icon: Network },
  ];

  return (
    <div className="wm-dashboard-overview">
      <section className="wm-dashboard-overview__hero">
        <div className="wm-dashboard-overview__hero-copy">
          <div className="wm-dashboard-overview__eyebrow">Dashboard</div>
          <h1>Workspace overview</h1>
          <p>
            Keep the starting view light. Open the next job, then drop into the tool you actually need.
          </p>
        </div>

        <div className="wm-dashboard-overview__hero-actions">
          <button type="button" className="wm-btn-primary" onClick={() => navigate(WM_ROUTES.projects)}>
            Open projects
          </button>
          <button type="button" className="wm-btn-secondary" onClick={() => navigate(WM_ROUTES.discovery)}>
            Start guided flow
          </button>
        </div>
      </section>

      <section className="wm-dashboard-overview__snapshot">
        {snapshot.map((item) => (
          <article key={item.label} className="wm-dashboard-overview__metric">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="wm-dashboard-overview__grid">
        <div className="wm-dashboard-overview__panel">
          <div className="wm-dashboard-overview__panel-head">
            <h2>Focus now</h2>
            <p>Three likely next steps instead of one oversized landing page.</p>
          </div>

          <div className="wm-dashboard-overview__action-list">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  className="wm-dashboard-overview__action"
                  onClick={() => navigate(item.to)}
                >
                  <span className="wm-dashboard-overview__action-icon">
                    <Icon size={18} strokeWidth={1.9} />
                  </span>
                  <span className="wm-dashboard-overview__action-copy">
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </span>
                  <span className="wm-dashboard-overview__action-cta">{item.cta}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="wm-dashboard-overview__panel">
          <div className="wm-dashboard-overview__panel-head">
            <h2>Workspace status</h2>
            <p>Keep the important context visible without crowding the page.</p>
          </div>

          <div className="wm-dashboard-overview__status-list">
            <div className="wm-dashboard-overview__status-row">
              <span>Saved projects</span>
              <strong>{projectCount}</strong>
            </div>
            <div className="wm-dashboard-overview__status-row">
              <span>Current stage</span>
              <strong>{project?.stage?.trim() || "Discovery"}</strong>
            </div>
            <div className="wm-dashboard-overview__status-row">
              <span>Project status</span>
              <strong>{project?.status?.trim() || "In Qualification"}</strong>
            </div>
            <div className="wm-dashboard-overview__status-row">
              <span>Recommended direction</span>
              <strong>{inferDirection(project)}</strong>
            </div>
          </div>

          <div className="wm-dashboard-overview__launcher-grid">
            {launchers.map((launcher) => {
              const Icon = launcher.icon;
              return (
                <button
                  key={launcher.title}
                  type="button"
                  className="wm-dashboard-overview__launcher"
                  onClick={() => navigate(launcher.to)}
                >
                  <Icon size={16} strokeWidth={1.9} />
                  <span>{launcher.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
