import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  ClipboardList,
  Cpu,
  FileText,
  FolderOpen,
  LayoutGrid,
  Monitor,
  Route,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

import WingmanPageFrame, { WingmanPageSection } from "@/components/layout/WingmanPageFrame";

type Tile = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  badge: string;
};

const referenceTiles: Tile[] = [
  {
    title: "Product Finder",
    description: "Dense product lookup for live conversations, feature matching, and SKU narrowing.",
    to: "/app/tools/catalog",
    icon: Boxes,
    badge: "Reference",
  },
  {
    title: "AV Navigator",
    description: "Use guided routing when you already know the broad system direction.",
    to: "/app/tools/navigator",
    icon: Route,
    badge: "Guide",
  },
  {
    title: "Competitor Compare",
    description: "Position the WyreStorm fit without letting competitor data leak into outputs.",
    to: "/app/tools/compare",
    icon: ClipboardList,
    badge: "Match",
  },
  {
    title: "Sales Positioning",
    description: "Shape the conversation around refresh, rollout, or room-fit pressure before the proposal stage.",
    to: "/app/tools/sales",
    icon: BriefcaseBusiness,
    badge: "Sales",
  },
  {
    title: "Product Intelligence",
    description: "Technical support workspace for deeper product understanding and governance.",
    to: "/app/tools/product-intelligence",
    icon: Cpu,
    badge: "Support",
  },
];

const workflowTiles: Tile[] = [
  {
    title: "Discovery Wizard",
    description: "Best first step when the requirement still needs structure.",
    to: "/app/tools/discovery",
    icon: Search,
    badge: "Start",
  },
  {
    title: "Import Intake",
    description: "Turn notes, emails, or pasted briefs into a usable project start.",
    to: "/app/tools/import-intake",
    icon: Upload,
    badge: "Input",
  },
  {
    title: "Templates",
    description: "Start from real room patterns instead of rebuilding known solution shapes.",
    to: "/app/tools/templates",
    icon: LayoutGrid,
    badge: "Pattern",
  },
  {
    title: "Room Wizard",
    description: "Room-led planning for more deliberate system shaping and scope capture.",
    to: "/app/tools/room-wizard",
    icon: Sparkles,
    badge: "Plan",
  },
];

const outputTiles: Tile[] = [
  {
    title: "Proposal Builder",
    description: "Convert the chosen technical path into a concise commercial pack.",
    to: "/app/tools/proposal",
    icon: FileText,
    badge: "Output",
  },
  {
    title: "Projects",
    description: "Return to the live project record and keep decisions attached to context.",
    to: "/app/projects",
    icon: FolderOpen,
    badge: "Project",
  },
  {
    title: "Training Hub",
    description: "Internal enablement and learning paths for technical sales confidence.",
    to: "/app/tools/training",
    icon: BookOpen,
    badge: "Enablement",
  },
  {
    title: "Video Wall Planner",
    description: "Specialist design flow for multi-display wall planning and option shaping.",
    to: "/app/tools/video-wall",
    icon: Monitor,
    badge: "Specialist",
  },
];

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="wm-workspace-tile-grid">
      {tiles.map((tile) => {
        const Icon = tile.icon;

        return (
          <Link key={tile.to} to={tile.to} className="wm-workspace-tile">
            <div className="wm-workspace-tile__top">
              <div className="wm-workspace-tile__icon">
                <Icon size={18} strokeWidth={2} />
              </div>
              <span className="wm-workspace-tile__badge">{tile.badge}</span>
            </div>

            <div className="wm-workspace-tile__title">{tile.title}</div>
            <div className="wm-workspace-tile__description">{tile.description}</div>

            <div className="wm-workspace-tile__footer">
              Open tool
              <ArrowRight size={14} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function ToolHubPage() {
  return (
    <WingmanPageFrame
      className="wm-toolhub-page"
      eyebrow="Workspace matrix"
      title="Choose the lane that matches the job."
      subtitle="Tool Hub now separates live reference, guided workflow, and output surfaces so the user can orient instantly."
      actions={
        <div className="wm-workspace-actions">
          <Link to="/app/projects/new" className="wm-workspace-action">
            New project
          </Link>
          <Link to="/app/tools/import-intake" className="wm-workspace-action">
            Import brief
          </Link>
          <Link to="/app/tools/discovery" className="wm-workspace-action wm-workspace-action--primary">
            Start with discovery
          </Link>
        </div>
      }
      stats={
        <div className="wm-workspace-stats">
          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Reference</div>
            <div className="wm-workspace-stat__value">Fast sales support</div>
            <div className="wm-workspace-stat__meta">Keep live lookups dense, quick, and out of the main build lane.</div>
          </div>

          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Workflow</div>
            <div className="wm-workspace-stat__value">Room-led by default</div>
            <div className="wm-workspace-stat__meta">Discovery, import, and templates now sit as one cohesive working surface.</div>
          </div>

          <div className="wm-workspace-stat">
            <div className="wm-workspace-stat__label">Output</div>
            <div className="wm-workspace-stat__value">Proposal and project handoff</div>
            <div className="wm-workspace-stat__meta">Outputs stay attached to the project instead of becoming isolated tool artifacts.</div>
          </div>
        </div>
      }
      aside={
        <>
          <WingmanPageSection title="Use it well" subtitle="Three routing rules.">
            <ul className="wm-workspace-list wm-workspace-list--plain">
              <li>Open reference tools when the answer needs speed, not process.</li>
              <li>Open workflow tools when the room or brief still needs structure.</li>
              <li>Open output tools only after the design path is already stable.</li>
            </ul>
          </WingmanPageSection>

          <WingmanPageSection title="Fast pivots" subtitle="Common jumps from Tool Hub.">
            <div className="wm-workspace-link-list">
              <Link to="/app/tools/guru" className="wm-workspace-link">
                <span>Open Guru</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/app/tools/proposal" className="wm-workspace-link">
                <span>Open proposal builder</span>
                <ArrowRight size={14} />
              </Link>
              <Link to="/app/projects" className="wm-workspace-link">
                <span>Open projects</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </WingmanPageSection>
        </>
      }
    >
      <WingmanPageSection
        title="Reference tools"
        subtitle="Use these when the conversation is live and the answer needs to land quickly."
      >
        <TileGrid tiles={referenceTiles} />
      </WingmanPageSection>

      <WingmanPageSection
        title="Workflow tools"
        subtitle="These pages should carry most rooms from first brief to narrowed design."
      >
        <TileGrid tiles={workflowTiles} />
      </WingmanPageSection>

      <WingmanPageSection
        title="Output and continuity"
        subtitle="Once the direction is real, move into output and keep the handoff attached to Projects."
      >
        <TileGrid tiles={outputTiles} />
      </WingmanPageSection>
    </WingmanPageFrame>
  );
}
