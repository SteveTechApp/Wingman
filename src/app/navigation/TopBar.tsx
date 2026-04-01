import { Bell, Clock3, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { brand } from "@/branding/brand";
import { useProjectContext } from "@/context/ProjectContext";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferSystemType(project: any): string {
  if (!project) return "Workspace overview";
  if (project?.discovery?.videoWall) return "Video Wall";
  if (project?.discovery?.networkReady) return "AVoIP";
  return "Matrix";
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

  const summaryBits = [
    inferSystemType(project),
    sourceCount > 0 ? `${sourceCount} src` : "",
    displayCount > 0 ? `${displayCount} dsp` : "",
    distanceM > 0 ? `${distanceM}m` : "",
  ].filter(Boolean);

  return (
    <header className="wm-topbar-lite">
      <button
        type="button"
        onClick={() => navigate("/app/dashboard")}
        className="wm-topbar-lite__brand"
        aria-label="Go to dashboard"
      >
        <img
          src={brand.logo}
          alt={brand.fullName}
          className="wm-topbar-lite__logo"
        />
      </button>

      <div className="wm-topbar-lite__context">
        <div className="wm-topbar-lite__title">
          {project?.name?.trim() || "Wingman workspace"}
        </div>
        <div className="wm-topbar-lite__meta">
          {summaryBits.join(" • ") || "Ready to start a new project"}
        </div>
      </div>

      <div className="wm-topbar-lite__status" title="Current project status">
        {project?.status?.trim() || "In Qualification"}
      </div>

      <div className="wm-topbar-lite__actions" aria-label="Workspace actions">
        <button type="button" className="wm-topbar-lite__icon" aria-label="Notifications" title="Notifications">
          <Bell size={16} strokeWidth={1.9} />
        </button>
        <button type="button" className="wm-topbar-lite__icon" aria-label="History" title="Recent activity">
          <Clock3 size={16} strokeWidth={1.9} />
        </button>
        <button type="button" className="wm-topbar-lite__icon" aria-label="Settings" title="Settings">
          <Settings size={16} strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}
