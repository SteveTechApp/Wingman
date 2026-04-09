import { type CSSProperties } from "react";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  Database,
  FileText,
  GitCompareArrows,
  GraduationCap,
  LayoutTemplate,
  LucideIcon,
  MonitorUp,
  Network,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";

import { WingmanPageFrame, WingmanSection } from "@/components/wm";
import { useAuth } from "@/context/AuthContext";

type ToolTile = {
  title: string;
  subtitle: string;
  route: string;
  group: "quick" | "workflow" | "support";
  badge: string;
  tooltip: string;
  liveMode: "live" | "hybrid" | "workflow";
  liveLabel: string;
  liveNote: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const tiles: ToolTile[] = [
  {
    title: "Guru",
    subtitle: "Immediate product, sales and technical chat support",
    route: "/app/tools/guru",
    group: "quick",
    badge: "Fast help",
    tooltip: "Use this during a live sales conversation when you need an answer quickly.",
    liveMode: "hybrid",
    liveLabel: "Hybrid workspace",
    liveNote: "Chat-first experience driven by local Wingman knowledge and project context rather than a dedicated live backend.",
    icon: Bot,
  },
  {
    title: "Product Finder",
    subtitle: "Find and narrow the right WyreStorm SKU",
    route: "/app/tools/catalog",
    group: "quick",
    badge: "Quick tool",
    tooltip: "Use this to locate the right family, endpoint type and SKU from the requirement.",
    liveMode: "hybrid",
    liveLabel: "Hybrid data",
    liveNote: "Interactive and useful, but it still leans on curated catalog data and local fallback logic.",
    icon: ScanSearch,
  },
  {
    title: "AV Navigator",
    subtitle: "Architecture and transport guidance",
    route: "/app/tools/navigator",
    group: "quick",
    badge: "Decision aid",
    tooltip: "Use this before product lock-in when the transport choice is still open.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Real guided workflow tied to project state, but not a backend-backed live data feature.",
    icon: Network,
  },
  {
    title: "Competitor Compare",
    subtitle: "Position WyreStorm against competitor references",
    route: "/app/tools/compare",
    group: "quick",
    badge: "Sales support",
    tooltip: "Use this when you need a fast cross-reference or positioning angle.",
    liveMode: "live",
    liveLabel: "Live backend",
    liveNote: "Now calls the running compare resolver against the backend match service.",
    icon: GitCompareArrows,
  },
  {
    title: "Discovery Wizard",
    subtitle: "Capture requirement inputs properly",
    route: "/app/tools/discovery",
    group: "workflow",
    badge: "Stage 1",
    tooltip: "Use this to structure the opportunity before selection or proposal work begins.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Project-aware capture flow that saves real state, but does not depend on a live external service.",
    icon: ClipboardList,
  },
  {
    title: "Room Wizard",
    subtitle: "Shape the room and choose the next design route",
    route: "/app/tools/room-wizard",
    group: "workflow",
    badge: "Scoping",
    tooltip: "Use this when you want a structured room-first definition before locking products.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Interactive project workflow built around room templates and local decision logic.",
    icon: SlidersHorizontal,
  },
  {
    title: "Proposal Builder",
    subtitle: "Create architecture and commercial output",
    route: "/app/tools/proposal",
    group: "workflow",
    badge: "Stage 2",
    tooltip: "Use this when approved selections need to become customer-facing output.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Real output builder, but today it is fed mainly by project and local handoff state.",
    icon: FileText,
  },
  {
    title: "Templates",
    subtitle: "Start from structured reference systems",
    route: "/app/tools/templates",
    group: "workflow",
    badge: "Accelerator",
    tooltip: "Use this when the project matches a known reference design pattern.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Useful starter surface backed by template libraries rather than live backend data.",
    icon: LayoutTemplate,
  },
  {
    title: "Import Intake",
    subtitle: "Bring customer notes into Wingman",
    route: "/app/tools/import-intake",
    group: "workflow",
    badge: "Intake",
    tooltip: "Use this when the customer has already shared notes, a brief or imported documents.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Structured intake experience that persists into project state without calling a live service.",
    icon: Upload,
  },
  {
    title: "Sales Positioning",
    subtitle: "Frame the WyreStorm story for the room and opportunity",
    route: "/app/tools/sales",
    group: "workflow",
    badge: "Messaging",
    tooltip: "Use this when the technical direction is clear and you need the sales angle.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Interactive sales guidance based on local positioning content and catalog context.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Training Hub",
    subtitle: "Open the right lesson, support path, or Guru prompt",
    route: "/app/tools/training",
    group: "workflow",
    badge: "Support",
    tooltip: "Use this when you need enablement, support context, or guided learning.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Real support workspace, but its content is currently local and project-aware rather than service-driven.",
    icon: GraduationCap,
  },
  {
    title: "Video Wall Planner",
    subtitle: "Define the wall, architecture, and BOM path",
    route: "/app/tools/video-wall",
    group: "workflow",
    badge: "Specialist",
    tooltip: "Use this when the opportunity is wall-led and you need a dedicated planning surface.",
    liveMode: "workflow",
    liveLabel: "Workflow surface",
    liveNote: "Project-backed planner with local BOM logic instead of a live backend dependency.",
    icon: MonitorUp,
  },
  {
    title: "Product Intelligence",
    subtitle: "Review and curate the live product intelligence record set",
    route: "/app/tools/product-intelligence",
    group: "support",
    badge: "Admin",
    tooltip: "Use this to inspect and maintain the canonical product intelligence records.",
    liveMode: "live",
    liveLabel: "Live backend",
    liveNote: "Confirmed against the running product intelligence service in this environment.",
    icon: Database,
    adminOnly: true,
  },
  {
    title: "Lookup Diagnostics",
    subtitle: "Inspect competitor lookup health, cache, and runtime events",
    route: "/app/tools/competitor-lookup-diagnostics",
    group: "support",
    badge: "Admin",
    tooltip: "Use this to validate the compare pipeline and inspect diagnostics or cache state.",
    liveMode: "live",
    liveLabel: "Live backend",
    liveNote: "Confirmed against the running diagnostics feed and approval pipeline.",
    icon: ShieldCheck,
    adminOnly: true,
  },
];

function groupToneStyle(group: ToolTile["group"]): CSSProperties {
  if (group === "workflow") {
    return {
      border: "1px solid rgba(67,195,123,0.16)",
      boxShadow: "0 0 0 1px rgba(67,195,123,0.05)",
    };
  }

  if (group === "support") {
    return {
      border: "1px solid rgba(214,139,79,0.18)",
      boxShadow: "0 0 0 1px rgba(214,139,79,0.06)",
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

  if (group === "support") {
    return {
      background: "rgba(214,139,79,0.14)",
      color: "#ffe7d2",
    };
  }

  return {
    background: "rgba(110,168,255,0.12)",
    color: "#dbe9ff",
  };
}

function liveModeStyle(mode: ToolTile["liveMode"]): CSSProperties {
  if (mode === "live") {
    return {
      border: "1px solid rgba(67,195,123,0.24)",
      background: "rgba(67,195,123,0.12)",
      color: "#d7f6e3",
    };
  }

  if (mode === "hybrid") {
    return {
      border: "1px solid rgba(214,139,79,0.24)",
      background: "rgba(214,139,79,0.12)",
      color: "#ffe7d2",
    };
  }

  return {
    border: "1px solid rgba(110,168,255,0.2)",
    background: "rgba(110,168,255,0.1)",
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
        <div style={badgeRowStyle}>
          <span className="wm-workspace-tag">{tile.badge}</span>
          <span style={{ ...livePillStyle, ...liveModeStyle(tile.liveMode) }}>{tile.liveLabel}</span>
        </div>
      </div>

      <div className="wm-stack-xs">
        <h3 style={cardTitleStyle}>{tile.title}</h3>
        <p className="wm-soft">{tile.subtitle}</p>
        <p className="wm-muted" style={supportTextStyle}>
          {tile.tooltip}
        </p>
        <p className="wm-muted" style={runtimeTextStyle}>
          {tile.liveNote}
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
  const auth = useAuth();
  const canAdmin = Boolean(
    auth.permissions.canManageWorkspace ||
      auth.workspaceRole === "admin" ||
      auth.workspaceRole === "owner" ||
      auth.user?.role === "admin",
  );

  const visibleTiles = tiles.filter((tile) => !tile.adminOnly || canAdmin);
  const quickTools = visibleTiles.filter((tile) => tile.group === "quick");
  const workflowTools = visibleTiles.filter((tile) => tile.group === "workflow");
  const supportTools = visibleTiles.filter((tile) => tile.group === "support");
  const liveCount = visibleTiles.filter((tile) => tile.liveMode === "live").length;
  const hybridCount = visibleTiles.filter((tile) => tile.liveMode === "hybrid").length;
  const workflowCount = visibleTiles.filter((tile) => tile.liveMode === "workflow").length;

  return (
    <div className="wm-page">
      <WingmanPageFrame
        eyebrow="Tool Hub"
        title="Choose the right mode of work"
        subtitle="The shell stays fixed across the app. Pick the workspace that matches the current stage of the opportunity, and see clearly which tools are backend-live versus workflow-led."
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
        <WingmanSection
          eyebrow="Wellness"
          title="What Is Actually Live?"
          description="Live backend tools call a running service in this environment. Workflow surfaces are real app features too, but they work primarily from project state, curated content, or local logic."
        >
          <div className="wm-grid wm-grid--3">
            <div className="wm-stat">
              <p className="wm-stat__label">Live Backend</p>
              <p className="wm-stat__value">{liveCount}</p>
              <p className="wm-stat__meta">Backend-backed tools validated during the wellness check.</p>
            </div>
            <div className="wm-stat">
              <p className="wm-stat__label">Hybrid Workspace</p>
              <p className="wm-stat__value">{hybridCount}</p>
              <p className="wm-stat__meta">Interactive tools that blend curated data, local state, and selective live resolution.</p>
            </div>
            <div className="wm-stat">
              <p className="wm-stat__label">Workflow Surface</p>
              <p className="wm-stat__value">{workflowCount}</p>
              <p className="wm-stat__meta">Real working pages that do not depend on a dedicated live backend.</p>
            </div>
          </div>
        </WingmanSection>

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

        {supportTools.length > 0 ? (
          <WingmanSection
            eyebrow="Operations"
            title="Admin and Diagnostics"
            description="These tools are intended for record curation, service validation, and runtime inspection."
          >
            <div className="wm-grid wm-grid--2">
              {supportTools.map((tile) => (
                <ToolCard key={tile.title} tile={tile} />
              ))}
            </div>
          </WingmanSection>
        ) : null}
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

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 8,
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

const runtimeTextStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
};

const livePillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.2,
};

const ctaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
  color: "var(--wm-accent-strong)",
};
