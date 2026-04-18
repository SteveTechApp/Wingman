import { Link } from "react-router-dom";
import { FolderKanban, LayoutGrid, Sparkles } from "lucide-react";

import type { WorkspaceMeta } from "@/app/navigation/workspaceMeta";
import WingmanBrand from "@/components/branding/WingmanBrand";
import ThemeToggle from "@/components/ThemeToggle";

function getProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General sales mode";
}

type TopBarProps = {
  meta: WorkspaceMeta;
};

export default function TopBar({ meta }: TopBarProps) {
  const projectName = getProjectName();

  return (
    <header className="wm-topbar" data-wm-topbar>
      <div className="wm-topbar__brand">
        <Link to="/app/dashboard" className="wm-topbar__brand-link">
          <WingmanBrand size="md" showText />
        </Link>

        <div className="wm-topbar__mode">
          <span className="wm-topbar__mode-badge">{meta.label}</span>
          <p className="wm-topbar__mode-copy">{meta.description}</p>
        </div>
      </div>

      <div className="wm-topbar__actions">
        <div className="wm-topbar__status-card">
          <span className="wm-topbar__status-icon">
            <FolderKanban size={14} />
          </span>
          <div className="wm-topbar__status-copy">
            <span className="wm-topbar__status-label">Active Project</span>
            <strong className="wm-topbar__status-value">{projectName}</strong>
          </div>
        </div>

        <Link to="/app/tools" className="wm-topbar__link">
          <LayoutGrid size={14} />
          <span>All tools</span>
        </Link>

        <Link to="/app/tools/guru" className="wm-topbar__link wm-topbar__link--accent">
          <Sparkles size={14} />
          <span>Guru</span>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
