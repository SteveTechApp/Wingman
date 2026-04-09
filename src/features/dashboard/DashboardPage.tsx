import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";

type HomeAction = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  badge: string;
  tone: "quick" | "workflow" | "assistant";
  tooltip: string;
};

type WorkflowStage = {
  title: string;
  text: string;
};

const quickReferenceTools: HomeAction[] = [
  {
    id: "guru",
    title: "AI Guru Expert",
    subtitle: "Get immediate product help, positioning guidance and technical answers.",
    route: "/app/tools/guru",
    badge: "Fast answer",
    tone: "assistant",
    tooltip: "Use this when a salesperson needs immediate support, such as product explanation, objection handling, technology guidance or a quick technical answer without starting a full project workflow.",
  },
  {
    id: "catalog",
    title: "Product Finder",
    subtitle: "Find the right WyreStorm product, compare options and hand off to next tools.",
    route: "/app/tools/catalog",
    badge: "Single-use tool",
    tone: "quick",
    tooltip: "Use this to narrow the correct WyreStorm SKU from requirement inputs, family filters and endpoint selection, then pass the result into Guru or Proposal Builder.",
  },
  {
    id: "compare",
    title: "Competitor Compare",
    subtitle: "Match competitor references against WyreStorm positioning and alternatives.",
    route: "/app/tools/compare",
    badge: "Sales support",
    tone: "quick",
    tooltip: "Use this when a customer or consultant mentions a competitor part number and you need a WyreStorm alternative, positioning guidance or a commercial response.",
  },
  {
    id: "navigator",
    title: "AV Navigator",
    subtitle: "Use guided architecture thinking to determine the right transport approach.",
    route: "/app/tools/navigator",
    badge: "Decision support",
    tone: "quick",
    tooltip: "Use this early when you need help deciding whether the application suits extender, matrix, AV over IP, video wall or another system architecture.",
  },
];

const formalWorkflows: HomeAction[] = [
  {
    id: "discovery",
    title: "Discovery Wizard",
    subtitle: "Capture room, source, display, USB and control requirements.",
    route: "/app/tools/discovery",
    badge: "Workflow stage 1",
    tone: "workflow",
    tooltip: "Use this to structure the customer requirement properly before product selection. It is the right place for room type, display count, source count, USB, audio and control needs.",
  },
  {
    id: "proposal",
    title: "Proposal Builder",
    subtitle: "Convert selections into a professional architecture and commercial output.",
    route: "/app/tools/proposal",
    badge: "Workflow stage 2",
    tone: "workflow",
    tooltip: "Use this when the opportunity needs a formal proposal output, including executive summary, requirement understanding, architecture, BOM and supporting commercial narrative.",
  },
  {
    id: "templates",
    title: "System Templates",
    subtitle: "Start from structured Bronze, Silver or Gold solution patterns.",
    route: "/app/tools/templates",
    badge: "Workflow accelerator",
    tone: "workflow",
    tooltip: "Use this when you want to begin from a known reference system rather than starting from a blank requirement capture.",
  },
  {
    id: "import",
    title: "Import Intake",
    subtitle: "Turn customer briefs and requirement notes into usable project context.",
    route: "/app/tools/import-intake",
    badge: "Workflow intake",
    tone: "workflow",
    tooltip: "Use this when the customer has already supplied notes, PDFs, a brief or scope text and you want Wingman to convert that into structured project context.",
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
    text: "Generate a customer-ready solution narrative, BOM and visual architecture output.",
  },
];

function getActiveProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "No active project";
}

function getActiveProjectId(): string {
  return localStorage.getItem("wm:activeProjectId") || "";
}

type TooltipCardProps = {
  tool: HomeAction;
  onOpen: (route: string) => void;
  style: CSSProperties;
};

function TooltipCard({ tool, onOpen, style }: TooltipCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      style={style}
      onClick={() => onOpen(tool.route)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div style={cardBadgeStyle}>{tool.badge}</div>
      <div style={cardTitleStyle}>{tool.title}</div>
      <div style={cardBodyStyle}>{tool.subtitle}</div>

      <div style={tooltipWrapStyle}>
        <div
          style={{
            ...tooltipStyle,
            ...(hovered ? tooltipVisibleStyle : tooltipHiddenStyle),
          }}
        >
          {tool.tooltip}
        </div>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const projectName = useMemo(() => getActiveProjectName(), []);
  const hasProject = useMemo(() => Boolean(getActiveProjectId()), []);

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroCopyStyle}>
          <div style={eyebrowStyle}>Wingman Mission Control</div>
          <h1 style={titleStyle}>Two clear ways to use Wingman</h1>
          <div style={bodyStyle}>
            Use quick tools when a salesperson needs immediate help, or move into the structured workflow when the requirement needs a formal design and proposal.
          </div>

          <div style={heroChipRowStyle}>
            <span style={heroChipStyle}>Active project: {projectName}</span>
            <span style={heroChipStyle}>{hasProject ? "Project context loaded" : "General sales mode"}</span>
          </div>
        </div>

        <div style={heroSidebarStyle}>
          <div style={heroMetricGridStyle}>
            <div style={{ ...metricCardStyle, ...metricBlueStyle }}>
              <span style={metricLabelStyle}>Quick Tools</span>
              <strong style={metricValueStyle}>4</strong>
            </div>
            <div style={{ ...metricCardStyle, ...metricOrangeStyle }}>
              <span style={metricLabelStyle}>Formal Flows</span>
              <strong style={metricValueStyle}>4</strong>
            </div>
          </div>

          <button type="button" style={primaryHeroButtonStyle} onClick={() => navigate("/app/tools")}>
            Open Tool Hub
          </button>
        </div>
      </section>

      <div style={splitGridStyle}>
        <section style={quickPanelStyle}>
          <div style={sectionHeadStyle}>
            <div>
              <div style={sectionEyebrowStyle}>Quick Reference / Sales Support</div>
              <div style={sectionTitleStyle}>Single-use helpful tools</div>
            </div>
            <div style={sectionNoteStyle}>Fast answers without forcing a full proposal workflow.</div>
          </div>

          <div style={cardGridStyle}>
            {quickReferenceTools.map((tool) => (
              <TooltipCard
                key={tool.id}
                tool={tool}
                onOpen={(route) => navigate(route)}
                style={{ ...actionCardStyle, ...quickCardStyle(tool.tone) }}
              />
            ))}
          </div>
        </section>

        <section style={workflowPanelStyle}>
          <div style={sectionHeadStyle}>
            <div>
              <div style={sectionEyebrowStyle}>Formal Design / Proposal Workflows</div>
              <div style={sectionTitleStyle}>Structured project delivery</div>
            </div>
            <div style={sectionNoteStyle}>Move from customer requirement through architecture into proposal output.</div>
          </div>

          <div style={cardGridStyle}>
            {formalWorkflows.map((tool) => (
              <TooltipCard
                key={tool.id}
                tool={tool}
                onOpen={(route) => navigate(route)}
                style={{ ...actionCardStyle, ...workflowCardStyle }}
              />
            ))}
          </div>
        </section>
      </div>

      <section style={journeyPanelStyle}>
        <div style={sectionEyebrowStyle}>Preferred Workflow</div>
        <div style={journeyGridStyle}>
          {workflowStages.map((stage, index) => (
            <div key={stage.title} style={journeyCardStyle}>
              <div style={journeyIndexStyle}>0{index + 1}</div>
              <div style={journeyTitleStyle}>{stage.title}</div>
              <div style={cardBodyStyle}>{stage.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function quickCardStyle(tone: HomeAction["tone"]): CSSProperties {
  if (tone === "assistant") {
    return {
      border: "1px solid rgba(249,115,22,0.32)",
      background: "linear-gradient(180deg, rgba(89,36,9,0.82), rgba(33,20,11,0.94))",
    };
  }

  return {
    border: "1px solid rgba(14,165,233,0.24)",
    background: "linear-gradient(180deg, rgba(9,53,72,0.82), rgba(10,25,34,0.94))",
  };
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 12,
  maxWidth: 1720,
  margin: "0 auto",
  color: "var(--wm-text, #e5eef8)",
};

const heroStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 360px",
  gap: 12,
  borderRadius: 18,
  padding: 18,
  border: "1px solid rgba(96,165,250,0.20)",
  background: "linear-gradient(135deg, rgba(15,23,42,0.94), rgba(30,41,59,0.88))",
  boxShadow: "0 18px 40px rgba(2,8,23,0.24)",
};

const heroCopyStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
};

const heroSidebarStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  opacity: 0.74,
  fontWeight: 800,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  lineHeight: 1.05,
  fontWeight: 900,
};

const bodyStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  opacity: 0.88,
};

const heroChipRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const heroChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const heroMetricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const metricCardStyle: CSSProperties = {
  borderRadius: 14,
  padding: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  display: "grid",
  gap: 6,
};

const metricBlueStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(29,78,216,0.34), rgba(15,23,42,0.76))",
};

const metricOrangeStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(234,88,12,0.34), rgba(15,23,42,0.76))",
};

const metricLabelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.9,
  opacity: 0.78,
};

const metricValueStyle: CSSProperties = {
  fontSize: 20,
  lineHeight: 1.2,
  fontWeight: 900,
};

const primaryHeroButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  borderRadius: 12,
  border: "1px solid rgba(249,115,22,0.34)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.88), rgba(194,65,12,0.90))",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "0 14px",
};

const splitGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const basePanelStyle: CSSProperties = {
  borderRadius: 18,
  padding: 14,
  display: "grid",
  gap: 12,
  boxShadow: "0 18px 36px rgba(2,8,23,0.18)",
};

const quickPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(14,165,233,0.24)",
  background: "linear-gradient(180deg, rgba(11,42,63,0.82), rgba(11,24,37,0.94))",
};

const workflowPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(20,184,166,0.24)",
  background: "linear-gradient(180deg, rgba(7,44,46,0.84), rgba(10,27,34,0.94))",
};

const sectionHeadStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: 10,
};

const sectionEyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  opacity: 0.76,
  fontWeight: 800,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.2,
};

const sectionNoteStyle: CSSProperties = {
  maxWidth: 260,
  fontSize: 12,
  lineHeight: 1.45,
  opacity: 0.78,
  textAlign: "right",
};

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const actionCardStyle: CSSProperties = {
  textAlign: "left",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 8,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(2,8,23,0.16)",
  position: "relative",
  overflow: "visible",
};

const workflowCardStyle: CSSProperties = {
  border: "1px solid rgba(34,197,94,0.22)",
  background: "linear-gradient(180deg, rgba(12,61,36,0.84), rgba(9,27,19,0.94))",
};

const cardBadgeStyle: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  lineHeight: 1.2,
};

const cardBodyStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  opacity: 0.88,
};

const tooltipWrapStyle: CSSProperties = {
  position: "relative",
  height: 0,
};

const tooltipStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 10,
  zIndex: 20,
  width: "100%",
  borderRadius: 12,
  padding: 10,
  fontSize: 12,
  lineHeight: 1.45,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(15,23,42,0.98))",
  boxShadow: "0 16px 30px rgba(2,8,23,0.36)",
  pointerEvents: "none",
  transform: "translateY(0)",
};

const tooltipVisibleStyle: CSSProperties = {
  opacity: 1,
};

const tooltipHiddenStyle: CSSProperties = {
  opacity: 0,
};

const journeyPanelStyle: CSSProperties = {
  ...basePanelStyle,
  border: "1px solid rgba(168,85,247,0.24)",
  background: "linear-gradient(180deg, rgba(45,20,75,0.82), rgba(24,14,42,0.94))",
};

const journeyGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const journeyCardStyle: CSSProperties = {
  borderRadius: 16,
  padding: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(19,19,46,0.36), rgba(12,12,28,0.64))",
  display: "grid",
  gap: 8,
};

const journeyIndexStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.74,
};

const journeyTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 900,
};