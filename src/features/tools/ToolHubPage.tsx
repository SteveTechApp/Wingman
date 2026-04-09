import { type CSSProperties } from "react";
import {
  ArrowRight,
  Bot,
  ClipboardList,
  FileText,
  GitCompareArrows,
  LayoutTemplate,
  LucideIcon,
  Network,
  ScanSearch,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";

import { WingmanPageFrame, WingmanSection } from "@/components/wm";

type ToolTile = {
  title: string;
  subtitle: string;
  route: string;
  group: "quick" | "workflow";
  badge: string;
  tooltip: string;
  icon: LucideIcon;
};

const tiles: ToolTile[] = [
  {
    title: "Guru",
    subtitle: "Immediate product, sales and technical chat support",
    route: "/app/tools/guru",
    group: "quick",
    badge: "Fast help",
    tooltip: "Use this during a live sales conversation when you need an answer quickly.",
    icon: Bot,
  },
  {
    title: "Product Finder",
    subtitle: "Find and narrow the right WyreStorm SKU",
    route: "/app/tools/catalog",
    group: "quick",
    badge: "Quick tool",
    tooltip: "Use this to locate the right family, endpoint type and SKU from the requirement.",
    icon: ScanSearch,
  },
  {
    title: "AV Navigator",
    subtitle: "Architecture and transport guidance",
    route: "/app/tools/navigator",
    group: "quick",
    badge: "Decision aid",
    tooltip: "Use this before product lock-in when the transport choice is still open.",
    icon: Network,
  },
  {
    title: "Competitor Compare",
    subtitle: "Position WyreStorm against competitor references",
    route: "/app/tools/compare",
    group: "quick",
    badge: "Sales support",
    tooltip: "Use this when you need a fast cross-reference or positioning angle.",
    icon: GitCompareArrows,
  },
  {
    title: "Discovery Wizard",
    subtitle: "Capture requirement inputs properly",
    route: "/app/tools/discovery",
    group: "workflow",
    badge: "Stage 1",
    tooltip: "Use this to structure the opportunity before selection or proposal work begins.",
    icon: ClipboardList,
  },
  {
    title: "Proposal Builder",
    subtitle: "Create architecture and commercial output",
    route: "/app/tools/proposal",
    group: "workflow",
    badge: "Stage 2",
    tooltip: "Use this when approved selections need to become customer-facing output.",
    icon: FileText,
  },
  {
    title: "Templates",
    subtitle: "Start from structured reference systems",
    route: "/app/tools/templates",
    group: "workflow",
    badge: "Accelerator",
    tooltip: "Use this when the project matches a known reference design pattern.",
    icon: LayoutTemplate,
  },
  {
    title: "Import Intake",
    subtitle: "Bring customer notes into Wingman",
    route: "/app/tools/import-intake",
    group: "workflow",
    badge: "Intake",
    tooltip: "Use this when the customer has already shared notes, a brief or imported documents.",
    icon: Upload,
  },
];

function groupToneStyle(group: ToolTile["group"]): CSSProperties {
  if (group === "workflow") {
    return {
      border: "1px solid rgba(67,195,123,0.16)",
      boxShadow: "0 0 0 1px rgba(67,195,123,0.05)",
    };
  }

  return {
    border: "1px solid rgba(110,168,255,0.16)",
    boxShadow: "0 0 0 1px rgba(110,168,255,0.05)",
  };
}

function iconToneStyle(group: ToolTile["group"]): CSSProperties {
  if (group === "workflow") {
    return {
      background: "rgba(67,195,123,0.12)",
      color: "#d7f6e3",
    };
  }

  return {
    background: "rgba(110,168,255,0.12)",
    color: "#dbe9ff",
  };
}

function ToolCard({ tile }: { tile: ToolTile }) {
  const Icon = tile.icon;

  return (
    <Link to={tile.route} className="wm-card wm-interactive" style={{ ...cardStyle, ...groupToneStyle(tile.group) }}>
      <div style={cardTopStyle}>
        <div style={{ ...iconWrapStyle, ...iconToneStyle(tile.group) }}>
          <Icon size={18} />
        </div>
        <span className="wm-workspace-tag">{tile.badge}</span>
      </div>

      <div className="wm-stack-xs">
        <h3 style={cardTitleStyle}>{tile.title}</h3>
        <p className="wm-soft">{tile.subtitle}</p>
        <p className="wm-muted" style={supportTextStyle}>
          {tile.tooltip}
        </p>
      </div>

      <span style={ctaStyle}>
        Open tool
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

export default function ToolHubPage() {
  const quickTools = tiles.filter((tile) => tile.group === "quick");
  const workflowTools = tiles.filter((tile) => tile.group === "workflow");

  return (
    <div className="wm-page">
      <WingmanPageFrame
        eyebrow="Tool Hub"
        title="Choose the right mode of work"
        subtitle="The shell stays fixed across the app. Pick the workspace that matches the current stage of the opportunity."
        actions={
          <div className="wm-flex">
            <Link to="/app/dashboard" className="wm-btn wm-btn--secondary">
              Dashboard
            </Link>
            <Link to="/app/projects" className="wm-btn wm-btn--brand">
              Projects
            </Link>
          </div>
        }
      >
        <div className="wm-grid wm-grid--2">
          <WingmanSection
            eyebrow="Quick Reference"
            title="In-the-moment sales tools"
            description="Use these when you need an answer, product direction or competitive support quickly."
          >
            <div className="wm-grid wm-grid--2">
              {quickTools.map((tile) => (
                <ToolCard key={tile.title} tile={tile} />
              ))}
            </div>
          </WingmanSection>

          <WingmanSection
            eyebrow="Structured Workflow"
            title="Design and proposal tools"
            description="Use these when the opportunity needs capture, structure and customer-facing output."
          >
            <div className="wm-grid wm-grid--2">
              {workflowTools.map((tile) => (
                <ToolCard key={tile.title} tile={tile} />
              ))}
            </div>
          </WingmanSection>
        </div>
      </WingmanPageFrame>
    </div>
  );
}

const cardStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  textDecoration: "none",
};

const cardTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const iconWrapStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.15,
};

const supportTextStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
};

const ctaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
  color: "var(--wm-accent-strong)",
};
