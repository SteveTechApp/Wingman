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
    <header className="wm-reference-topbar">
      <button
        type="button"
        onClick={() => navigate("/app/dashboard")}
        className="wm-reference-topbar__brand"
      >
        <img
          src={brand.logo}
          alt={brand.fullName}
          className="wm-reference-topbar__brand-logo"
        />
      </button>

      <div className="wm-reference-topbar__meta" aria-label="Project summary">
        <div className="wm-reference-topbar__meta-item">
          <span className="wm-reference-topbar__meta-label">Project:</span>
          <strong>{project?.name ?? "Corporate HQ Installation"}</strong>
        </div>

        <div className="wm-reference-topbar__meta-item">
          <strong>
            {sourceCount || 4} Sources {"→"} {displayCount || 6} Displays {"→"} {distanceM || 50}m
            {" "}
            Distance
          </strong>
        </div>

        <div className="wm-reference-topbar__meta-item">
          <span className="wm-reference-topbar__meta-label">System Type:</span>
          <strong>{systemType}</strong>
        </div>
      </div>

      <div className="wm-reference-topbar__actions" aria-label="Workspace actions">
        <button type="button" className="wm-reference-icon-button" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.9} />
        </button>
        <button type="button" className="wm-reference-icon-button" aria-label="History">
          <Clock3 size={18} strokeWidth={1.9} />
        </button>
        <button type="button" className="wm-reference-icon-button" aria-label="Settings">
          <Settings size={18} strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}
