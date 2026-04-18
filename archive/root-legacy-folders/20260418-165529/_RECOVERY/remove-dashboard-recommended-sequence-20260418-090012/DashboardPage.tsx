import { useMemo, type CSSProperties } from "react";
import {
  ArrowRight,
  Bot,
  ClipboardList,
  FileText,
  GitCompareArrows,
  LayoutTemplate,
  Network,
  ScanSearch,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

type ToolTone = "quick" | "workflow" | "assistant";

type HomeAction = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  badge: string;
  tone: ToolTone;
  icon: LucideIcon;
};

type WorkflowStage = {
  id: string;
  step: string;
  title: string;
  text: string;
};

const quickReferenceTools: HomeAction[] = [
  {
    id: "guru",
    title: "Guru",
    subtitle: "Chat-first product, sales and technical support.",
    route: "/app/tools/guru",
    badge: "Assistant",
    tone: "assistant",
    icon: Bot,
  },
  {
    id: "navigator",
    title: "AV Navigator",
    subtitle: "Pick the right architecture and transport direction.",
    route: "/app/tools/navigator",
    badge: "Decision",
    tone: "quick",
    icon: Network,
  },
  {
    id: "catalog",
    title: "Product Finder",
    subtitle: "Narrow to the correct WyreStorm family and SKU.",
    route: "/app/tools/catalog",
    badge: "Reference",
    tone: "quick",
    icon: ScanSearch,
  },
  {
    id: "compare",
    title: "Competitor Compare",
    subtitle: "Position the closest WyreStorm alternative fast.",
    route: "/app/tools/compare",
    badge: "Sales",
    tone: "quick",
    icon: GitCompareArrows,
  },
];

const workflowTools: HomeAction[] = [
  {
    id: "discovery",
    title: "Discovery Wizard",
    subtitle: "Capture room, source, display, USB and control needs.",
    route: "/app/tools/discovery",
    badge: "Stage 1",
    tone: "workflow",
    icon: ClipboardList,
  },
  {
    id: "templates",
    title: "System Templates",
    subtitle: "Start from structured reference solutions.",
    route: "/app/tools/templates",
    badge: "Accelerator",
    tone: "workflow",
    icon: LayoutTemplate,
  },
  {
    id: "import",
    title: "Import Intake",
    subtitle: "Turn notes and documents into project context.",
    route: "/app/tools/import-intake",
    badge: "Intake",
    tone: "workflow",
    icon: Upload,
  },
  {
    id: "proposal",
    title: "Proposal Builder",
    subtitle: "Create solution narrative, architecture and BOM output.",
    route: "/app/tools/proposal",
    badge: "Stage 2",
    tone: "workflow",
    icon: FileText,
  },
];

const workflowStages: WorkflowStage[] = [
  {
    id: "discover",
    step: "01",
    title: "Discover",
    text: "Define room, source and display requirements.",
  },
  {
    id: "select",
    step: "02",
    title: "Select",
    text: "Choose architecture, family and endpoint mix.",
  },
  {
    id: "propose",
    step: "03",
    title: "Propose",
    text: "Generate the customer-facing output.",
  },
];

function getActiveProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General sales mode";
}

function getActiveProjectId(): string {
  return localStorage.getItem("wm:activeProjectId") || "";
}

function toneCardStyle(tone: ToolTone): CSSProperties {
  if (tone === "workflow") {
    return {
      border: "1px solid rgba(67,195,123,0.16)",
      boxShadow: "0 0 0 1px rgba(67,195,123,0.04)",
    };
  }

  if (tone === "assistant") {
    return {
      border: "1px solid rgba(214,139,79,0.18)",
      boxShadow: "0 0 0 1px rgba(214,139,79,0.04)",
    };
  }

  return {
    border: "1px solid rgba(110,168,255,0.16)",
    boxShadow: "0 0 0 1px rgba(110,168,255,0.04)",
  };
}

function toneIconStyle(tone: ToolTone): CSSProperties {
  if (tone === "workflow") {
    return {
      background: "rgba(67,195,123,0.12)",
      color: "#d7f6e3",
    };
  }

  if (tone === "assistant") {
    return {
      background: "rgba(214,139,79,0.14)",
      color: "#ffdfc2",
    };
  }

  return {
    background: "rgba(110,168,255,0.12)",
    color: "#dbe9ff",
  };
}

function ToolCard({ action }: { action: HomeAction }) {
  const Icon = action.icon;

  return (
    <Link to={action.route} className="wm-card wm-interactive" style={{ ...toolCardStyle, ...toneCardStyle(action.tone) }}>
      <div style={toolCardTopStyle}>
        <div style={{ ...toolIconWrapStyle, ...toneIconStyle(action.tone) }}>
          <Icon size={12} />
        </div>
        <span className="wm-workspace-tag">{action.badge}</span>
      </div>

      <div style={toolCardBodyStyle}>
        <h3 style={toolCardTitleStyle}>{action.title}</h3>
        <p style={toolCardTextStyle}>{action.subtitle}</p>
      </div>

      <div style={toolCardCtaStyle}>
        <span>Open</span>
        <ArrowRight size={10} />
      </div>
    </Link>
  );
}

function StatCard(props: { label: string; value: string; meta: string }) {
  return (
    <div className="wm-card" style={statCardStyle}>
      <div style={statLabelStyle}>{props.label}</div>
      <div style={statValueStyle}>{props.value}</div>
      <div style={statMetaStyle}>{props.meta}</div>
    </div>
  );
}

export default function DashboardPage() {
  const projectName = useMemo(() => getActiveProjectName(), []);
  const hasProject = useMemo(() => Boolean(getActiveProjectId()), []);

  return (
    <div className="wm-page" style={pageStyle}>
      <section className="wm-card" style={heroStyle}>
        <div style={heroMainStyle}>
          <div style={heroEyebrowStyle}>Mission Control</div>
          <h1 style={heroTitleStyle}>Start the next project</h1>
          <p style={heroSubtitleStyle}>
            Quick tools handle live support. Workflow tools build structured design and proposal output.
          </p>
        </div>

        <div style={heroActionsStyle}>
          <Link to="/app/tools" className="wm-btn wm-btn--brand">
            Open tool hub
          </Link>
          <Link to="/app/projects" className="wm-btn wm-btn--secondary">
            View projects
          </Link>
        </div>

        <div style={statsGridStyle}>
          <StatCard
            label="Active project"
            value={projectName}
            meta={hasProject ? "Project context loaded" : "General sales mode"}
          />
          <StatCard
            label="Quick tools"
            value={String(quickReferenceTools.length)}
            meta="Immediate support and reference"
          />
          <StatCard
            label="Workflow tools"
            value={String(workflowTools.length)}
            meta="Discovery, design and proposal delivery"
          />
        </div>
      </section>

      <section style={bodyGridStyle}>
        <div className="wm-card" style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelEyebrowStyle}>Quick Reference</div>
            <h2 style={panelTitleStyle}>Single-use support tools</h2>
          </div>

          <div style={panelGridStyle}>
            {quickReferenceTools.map((tool) => (
              <ToolCard key={tool.id} action={tool} />
            ))}
          </div>
        </div>

        <div className="wm-card" style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={panelEyebrowStyle}>Structured Workflow</div>
            <h2 style={panelTitleStyle}>Project delivery surfaces</h2>
          </div>

          <div style={panelGridStyle}>
            {workflowTools.map((tool) => (
              <ToolCard key={tool.id} action={tool} />
            ))}
          </div>
        </div>
      </section>

      <section className="wm-card" style={sequencePanelStyle}>
        <div style={panelHeaderStyle}>
          <div style={panelEyebrowStyle}>Preferred Workflow</div>
          <h2 style={panelTitleStyle}>Recommended sequence</h2>
        </div>

        <div style={sequenceGridStyle}>
          {workflowStages.map((stage) => (
            <div key={stage.id} style={sequenceCardStyle}>
              <div style={sequenceStepStyle}>{stage.step}</div>
              <div style={sequenceTitleStyle}>{stage.title}</div>
              <div style={sequenceTextStyle}>{stage.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr) auto",
  gap: 10,
  height: "calc(100vh - var(--wm-topbar-h) - 42px)",
  minHeight: "calc(100vh - var(--wm-topbar-h) - 42px)",
  maxHeight: "calc(100vh - var(--wm-topbar-h) - 42px)",
  overflow: "hidden",
};

const heroStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  padding: 12,
  alignItems: "start",
};

const heroMainStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const heroEyebrowStyle: CSSProperties = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "var(--wm-text-muted)",
  fontWeight: 900,
};

const heroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(22px, 2.4vw, 34px)",
  lineHeight: 0.98,
};

const heroSubtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  lineHeight: 1.35,
  color: "var(--wm-text-soft)",
  maxWidth: 620,
};

const heroActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const statsGridStyle: CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const statCardStyle: CSSProperties = {
  display: "grid",
  gap: 2,
  padding: 10,
  minHeight: 64,
};

const statLabelStyle: CSSProperties = {
  fontSize: 8,
  textTransform: "uppercase",
  letterSpacing: 0.9,
  color: "var(--wm-text-muted)",
  fontWeight: 900,
};

const statValueStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.05,
  fontWeight: 900,
  color: "var(--wm-text)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const statMetaStyle: CSSProperties = {
  fontSize: 10,
  lineHeight: 1.25,
  color: "var(--wm-text-soft)",
};

const bodyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  minHeight: 0,
  overflow: "hidden",
};

const panelStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 8,
  padding: 10,
  minHeight: 0,
  overflow: "hidden",
};

const panelHeaderStyle: CSSProperties = {
  display: "grid",
  gap: 2,
};

const panelEyebrowStyle: CSSProperties = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "var(--wm-text-muted)",
  fontWeight: 900,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.05,
};

const panelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  minHeight: 0,
};

const toolCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  gap: 6,
  minHeight: 112,
  padding: 8,
  textDecoration: "none",
};

const toolCardTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const toolIconWrapStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  flex: "0 0 auto",
};

const toolCardBodyStyle: CSSProperties = {
  display: "grid",
  gap: 3,
  alignContent: "start",
};

const toolCardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  lineHeight: 1.08,
};

const toolCardTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 9,
  lineHeight: 1.25,
  color: "var(--wm-text-soft)",
};

const toolCardCtaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 9,
  fontWeight: 800,
  color: "var(--wm-accent-strong)",
};

const sequencePanelStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 10,
};

const sequenceGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const sequenceCardStyle: CSSProperties = {
  display: "grid",
  gap: 2,
  minHeight: 58,
  padding: 8,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.05)",
  background: "rgba(255,255,255,0.02)",
};

const sequenceStepStyle: CSSProperties = {
  fontSize: 8,
  lineHeight: 1,
  fontWeight: 900,
  color: "var(--wm-text-muted)",
  letterSpacing: 0.9,
};

const sequenceTitleStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.05,
  fontWeight: 900,
  color: "var(--wm-text)",
};

const sequenceTextStyle: CSSProperties = {
  fontSize: 9,
  lineHeight: 1.2,
  color: "var(--wm-text-soft)",
};