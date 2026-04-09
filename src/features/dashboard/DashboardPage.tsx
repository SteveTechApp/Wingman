import { useMemo, type CSSProperties } from "react";
import {
  Bot,
  ClipboardList,
  FileText,
  GitCompareArrows,
  LayoutTemplate,
  LucideIcon,
  Network,
  ScanSearch,
  Sparkles,
  Upload,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  WingmanPageFrame,
  WingmanSection,
  WingmanStatStrip,
  type WingmanStatItem,
} from "@/components/wm";

type HomeAction = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  badge: string;
  tone: "quick" | "workflow" | "assistant";
  tooltip: string;
  icon: LucideIcon;
};

type WorkflowStage = {
  title: string;
  text: string;
};

const quickReferenceTools: HomeAction[] = [
  {
    id: "guru",
    title: "Guru",
    subtitle: "Open a chat-first assistant for product, sales and technical help.",
    route: "/app/tools/guru",
    badge: "Fast answer",
    tone: "assistant",
    tooltip: "Best when a salesperson needs immediate support without starting a full proposal flow.",
    icon: Bot,
  },
  {
    id: "catalog",
    title: "Product Finder",
    subtitle: "Find the right WyreStorm product and carry the result into the next tool.",
    route: "/app/tools/catalog",
    badge: "Single-use tool",
    tone: "quick",
    tooltip: "Use this to narrow the correct family, endpoint type and SKU from requirement inputs.",
    icon: ScanSearch,
  },
  {
    id: "compare",
    title: "Competitor Compare",
    subtitle: "Position the closest WyreStorm option against a competitor reference.",
    route: "/app/tools/compare",
    badge: "Sales support",
    tone: "quick",
    tooltip: "Use this when a customer mentions a competitor part number or asks for an alternative.",
    icon: GitCompareArrows,
  },
  {
    id: "navigator",
    title: "AV Navigator",
    subtitle: "Choose the right transport and system direction before locking products.",
    route: "/app/tools/navigator",
    badge: "Decision support",
    tone: "quick",
    tooltip: "Use this when you need help deciding whether the application suits extender, matrix or AVoIP.",
    icon: Network,
  },
];

const formalWorkflows: HomeAction[] = [
  {
    id: "discovery",
    title: "Discovery Wizard",
    subtitle: "Capture room, source, display, USB and control requirements correctly.",
    route: "/app/tools/discovery",
    badge: "Workflow stage 1",
    tone: "workflow",
    tooltip: "Use this to structure the opportunity before product selection starts.",
    icon: ClipboardList,
  },
  {
    id: "proposal",
    title: "Proposal Builder",
    subtitle: "Convert selections into a customer-facing architecture and BOM.",
    route: "/app/tools/proposal",
    badge: "Workflow stage 2",
    tone: "workflow",
    tooltip: "Use this when the opportunity needs formal output and commercial narrative.",
    icon: FileText,
  },
  {
    id: "templates",
    title: "System Templates",
    subtitle: "Start from structured reference systems instead of a blank canvas.",
    route: "/app/tools/templates",
    badge: "Workflow accelerator",
    tone: "workflow",
    tooltip: "Use this when the application matches a known pattern and you want to accelerate the design.",
    icon: LayoutTemplate,
  },
  {
    id: "import",
    title: "Import Intake",
    subtitle: "Turn customer notes, briefs or PDFs into usable project context.",
    route: "/app/tools/import-intake",
    badge: "Workflow intake",
    tone: "workflow",
    tooltip: "Use this when the customer has already supplied notes or source documents.",
    icon: Upload,
  },
];

const workflowStages: WorkflowStage[] = [
  {
    title: "Discover",
    text: "Capture the application, room type, source count, display count and user expectations.",
  },
  {
    title: "Select",
    text: "Choose the right architecture, then narrow to the correct WyreStorm family and endpoint mix.",
  },
  {
    title: "Propose",
    text: "Generate the customer-ready summary, BOM and architecture output inside the same shell.",
  },
];

function getActiveProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General sales mode";
}

function getActiveProjectId(): string {
  return localStorage.getItem("wm:activeProjectId") || "";
}

function cardToneStyle(tone: HomeAction["tone"]): CSSProperties {
  if (tone === "workflow") {
    return {
      border: "1px solid rgba(67,195,123,0.16)",
      boxShadow: "0 0 0 1px rgba(67,195,123,0.05)",
    };
  }

  if (tone === "assistant") {
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

function iconToneStyle(tone: HomeAction["tone"]): CSSProperties {
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

function WorkspaceCard({ action }: { action: HomeAction }) {
  const Icon = action.icon;

  return (
    <Link to={action.route} className="wm-card wm-interactive" style={{ ...cardStyle, ...cardToneStyle(action.tone) }}>
      <div style={cardTopStyle}>
        <div style={{ ...iconWrapStyle, ...iconToneStyle(action.tone) }}>
          <Icon size={18} />
        </div>
        <span className="wm-workspace-tag">{action.badge}</span>
      </div>

      <div className="wm-stack-xs">
        <h3 style={cardTitleStyle}>{action.title}</h3>
        <p className="wm-soft">{action.subtitle}</p>
        <p className="wm-muted" style={supportTextStyle}>
          {action.tooltip}
        </p>
      </div>

      <span style={ctaStyle}>
        Open workspace
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const projectName = useMemo(() => getActiveProjectName(), []);
  const hasProject = useMemo(() => Boolean(getActiveProjectId()), []);

  const statItems = useMemo<WingmanStatItem[]>(
    () => [
      {
        label: "Active project",
        value: projectName,
        meta: hasProject ? "Project context loaded into the shell" : "Working in general sales mode",
      },
      {
        label: "Quick tools",
        value: String(quickReferenceTools.length),
        meta: "Immediate guidance and reference support",
      },
      {
        label: "Structured flows",
        value: String(formalWorkflows.length),
        meta: "Discovery, design and proposal delivery",
      },
    ],
    [hasProject, projectName],
  );

  return (
    <div className="wm-page">
      <WingmanPageFrame
        eyebrow="Mission Control"
        title="Two clear ways to use Wingman"
        subtitle="Keep the shell familiar across the app. Use quick tools for live conversations, then move into the structured workflow when the opportunity needs a fuller design and proposal path."
        actions={
          <div className="wm-flex">
            <Link to="/app/tools" className="wm-btn wm-btn--brand">
              Open tool hub
            </Link>
            <Link to="/app/projects" className="wm-btn wm-btn--secondary">
              View projects
            </Link>
          </div>
        }
        toolbar={
          <div className="wm-between" style={{ width: "100%" }}>
            <div className="wm-soft">The outer shell stays fixed. Only the workspace inside it changes from feature to feature.</div>
            <div className="wm-page-inline-list">
              <span className="wm-workspace-tag">{projectName}</span>
              <span className="wm-workspace-tag">{hasProject ? "Project context loaded" : "General sales mode"}</span>
            </div>
          </div>
        }
      >
        <WingmanStatStrip items={statItems} />

        <div className="wm-grid wm-grid--2">
          <WingmanSection
            eyebrow="Quick Reference"
            title="Single-use helpful tools"
            description="Fast answers and product direction without forcing the full workflow."
          >
            <div className="wm-grid wm-grid--2">
              {quickReferenceTools.map((tool) => (
                <WorkspaceCard key={tool.id} action={tool} />
              ))}
            </div>
          </WingmanSection>

          <WingmanSection
            eyebrow="Structured Workflow"
            title="Project delivery surfaces"
            description="Move from discovery into architecture and customer-facing output without leaving the shared shell."
          >
            <div className="wm-grid wm-grid--2">
              {formalWorkflows.map((tool) => (
                <WorkspaceCard key={tool.id} action={tool} />
              ))}
            </div>
          </WingmanSection>
        </div>

        <WingmanSection
          eyebrow="Preferred Workflow"
          title="Recommended sequence"
          description="Use the same layout scaffolding throughout the opportunity, then swap the working surface as the job matures."
        >
          <div className="wm-grid wm-grid--3">
            {workflowStages.map((stage, index) => (
              <div key={stage.title} className="wm-stat">
                <p className="wm-stat__label">0{index + 1}</p>
                <p className="wm-stat__value" style={sequenceTitleStyle}>
                  {stage.title}
                </p>
                <p className="wm-stat__meta">{stage.text}</p>
              </div>
            ))}
          </div>
        </WingmanSection>
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

const sequenceTitleStyle: CSSProperties = {
  fontSize: 20,
};
