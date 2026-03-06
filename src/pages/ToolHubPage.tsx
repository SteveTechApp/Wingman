import * as React from "react";
// src/pages/ToolHubPage.tsx

import { Link } from "react-router-dom";
import {
  LayoutGrid,
  Boxes,
  Shuffle,
  FileText,
  Wand2,
  Video,
  GraduationCap,
  ArrowRight,
  ClipboardList,
  FolderPlus,
} from "lucide-react";

type Tool = {
  title: string;
  desc: string;
  tag: string;
  to: string;
  Icon: React.ComponentType<{ size?: string | number }>;
};

const TOOLS: Tool[] = [
  {
    title: "Start New Project",
    desc: "Create a blank project workspace and begin a new design or sales workflow.",
    tag: "Workspace",
    to: "/app/projects/new",
    Icon: FolderPlus,
  },
  {
    title: "Product Catalog",
    desc: "Browse SKUs and families (seed dataset).",
    tag: "Core",
    to: "/app/tools/catalog",
    Icon: Boxes,
  },
  {
    title: "Discovery Wizard",
    desc: "Capture customer requirements before choosing products.",
    tag: "Design",
    to: "/app/tools/discovery",
    Icon: ClipboardList,
  },
  {
    title: "Templates",
    desc: "Tiered starting-point BOMs with guided inputs (Bronze/Silver/Gold).",
    tag: "Design",
    to: "/app/tools/templates",
    Icon: ClipboardList,
  },
  {
    title: "Competitor Compare",
    desc: "Map competitor items to suggested WyreStorm SKUs.",
    tag: "Sales",
    to: "/app/tools/competitor",
    Icon: Shuffle,
  },
  {
    title: "Proposal Builder",
    desc: "Generate Bronze/Silver/Gold style proposals.",
    tag: "Sales",
    to: "/app/tools/proposal",
    Icon: FileText,
  },
  {
    title: "Room Wizard",
    desc: "Guided AV room design intake.",
    tag: "Design",
    to: "/app/tools/room",
    Icon: Wand2,
  },
  {
    title: "Video Wall Planner",
    desc: "LED/LCD planning and layout scaffolds.",
    tag: "Design",
    to: "/app/tools/videowall",
    Icon: Video,
  },
  {
    title: "Training Hub",
    desc: "Sales enablement modules and quick reference.",
    tag: "Enablement",
    to: "/app/tools/training",
    Icon: GraduationCap,
  },
];

function ToolTile({ t }: { t: Tool }) {
  const I = t.Icon;
  return (
    <Link className="wm-tile" to={t.to}>
      <div className="wm-tile__top">
        <div className="wm-tile__icon">
          <I size={20} />
        </div>
        <span className="wm-tile__tag">{t.tag}</span>
      </div>

      <div className="wm-tile__title">{t.title}</div>
      <div className="wm-tile__desc">{t.desc}</div>

      <div className="wm-tile__meta">
        <span className="wm-tile__cta">
          Open <ArrowRight size={16} />
        </span>
        <span style={{ opacity: 0.55, fontSize: 12 }}>Ready</span>
      </div>
    </Link>
  );
}

export default function ToolHubPage() {
  return (
    <div className="wm-shell-body" style={{ display: "flex" }}>
      <div className="wm-sidenav-wrap">
        <aside className="wm-sidenav">
          {/* __WM_MISSION_CONTROL_SHELL_PATCH_V1__ */}
        </aside>
      </div>

      <main className="wm-main">
        <div className="wm-toolhub-head wm-page-toolhub">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LayoutGrid size={18} />
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                Tool Hub
              </div>
            </div>
            <div className="wm-toolhub-kicker">
              Launch tools. Left panel now shows workspace context.
            </div>
          </div>
        </div>

        <div className="wm-tilegrid">
          {TOOLS.map((t) => (
            <ToolTile key={t.to} t={t} />
          ))}
        </div>
      </main>
    </div>
  );
}