import { Bell, Clock3, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { brand } from "@/branding/brand";
import { useProjectContext } from "@/context/ProjectContext";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferSystemType(project: any): string {
  if (!project) return "In Qualification";
  if (project?.discovery?.videoWall) return "Video Wall Processor";
  if (project?.discovery?.networkReady) return "AVoIP Network";
  return "Matrix Switch";
}

export default function TopBar() {
  const navigate = useNavigate();
  const { projectData } = useProjectContext();
  const project = projectData.activeProject;

  const sourceCount = toNumber(
    project?.discovery?.sources ?? project?.discovery?.sourceCount ?? 0,
  );
  const displayCount = toNumber(
    project?.discovery?.displays ?? project?.discovery?.displayCount ?? 0,
  );
  const distanceM = toNumber(
    project?.discovery?.distanceM ?? project?.discovery?.distance ?? project?.distanceM ?? 0,
  );
  const systemType = inferSystemType(project);

  return (
    <header className="wm-topbar-v4">
      <button
        type="button"
        onClick={() => navigate("/app/dashboard")}
        className="wm-topbar-v4__brand"
        aria-label="Go to dashboard"
      >
        <div className="wm-topbar-v4__brand-mark wm-topbar-v4__brand-mark--free">          
        <img
            src={brand.logo}
            alt={brand.fullName}
            className="wm-topbar-v4__logo"
          />
        </div>
      </button>

      <section className="wm-topbar-v4__section" aria-label="Current project">
        <div className="wm-topbar-v4__label">Current Project</div>
        <div className="wm-topbar-v4__value wm-topbar-v4__value--project">
          {project?.name ?? "Corporate HQ Installation"}
        </div>
      </section>

      <section className="wm-topbar-v4__section" aria-label="System summary">
        <div className="wm-topbar-v4__label">System Summary</div>
        <div className="wm-topbar-v4__value">
          {sourceCount || 4} Sources → {displayCount || 6} Displays → {distanceM || 50}m
        </div>
      </section>

      <section className="wm-topbar-v4__section" aria-label="System type">
        <div className="wm-topbar-v4__label">System Type</div>
        <div className="wm-topbar-v4__value">{systemType}</div>
      </section>

      <div className="wm-topbar-v4__actions" aria-label="Workspace actions">
        <button type="button" className="wm-topbar-v4__icon" aria-label="Notifications">
          <Bell size={17} strokeWidth={1.9} />
        </button>
        <button type="button" className="wm-topbar-v4__icon" aria-label="History">
          <Clock3 size={17} strokeWidth={1.9} />
        </button>
        <button type="button" className="wm-topbar-v4__icon" aria-label="Settings">
          <Settings size={17} strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}