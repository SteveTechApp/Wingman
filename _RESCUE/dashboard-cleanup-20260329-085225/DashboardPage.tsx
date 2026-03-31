import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";


type WorkflowStage = "Discovery" | "Design" | "Proposal";

type LaunchTile = {
  title: string;
  description: string;
  route: string;
  icon: string;
  cta: string;
  stage: WorkflowStage;
  accent: string;
};

type QuickTool = {
  title: string;
  route: string;
  icon: string;
};

type OutputItem = {
  title: string;
  description: string;
  status: string;
};

function normaliseStage(input: string): WorkflowStage {
  const value = String(input || "").trim().toLowerCase();

  if (value.includes("proposal")) return "Proposal";
  if (value.includes("design") || value.includes("catalog") || value.includes("system")) return "Design";
  return "Discovery";
}

function stageIndex(stage: WorkflowStage): number {
  if (stage === "Discovery") return 0;
  if (stage === "Design") return 1;
  return 2;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  
  const activeProjectName = "No active project selected";
  const activeProjectId = "Not set";
  const activeProjectStage = "Discovery";

  const resolvedProjectName =
    typeof activeProjectName === "string" && activeProjectName.trim().length > 0
      ? activeProjectName
      : "No active project selected";

  const resolvedProjectId =
    typeof activeProjectId === "string" && activeProjectId.trim().length > 0
      ? activeProjectId
      : "Not set";

  const activeStage: WorkflowStage = normaliseStage(
    typeof activeProjectStage === "string" ? activeProjectStage : "Discovery"
  );

  const workflowStages: WorkflowStage[] = ["Discovery", "Design", "Proposal"];

  const tiles: LaunchTile[] = [
    {
      title: "Start Discovery",
      description:
        "Capture room purpose, sources, displays, USB, control, audio and budget requirements.",
      route: "/app/tools/discovery",
      icon: "🔍",
      cta: "Launch Discovery",
      stage: "Discovery",
      accent: "#0ea5e9",
    },
    {
      title: "Build System Design",
      description:
        "Select the right transport architecture and shape the signal path around the application.",
      route: "/app/tools/video-wall",
      icon: "🧱",
      cta: "Open Design Tools",
      stage: "Design",
      accent: "#8b5cf6",
    },
    {
      title: "Review Product Options",
      description:
        "Compare WyreStorm options and align products to room type, feature need and budget band.",
      route: "/app/tools/catalog",
      icon: "📦",
      cta: "Open Catalogue",
      stage: "Design",
      accent: "#22c55e",
    },
    {
      title: "Generate Proposal",
      description:
        "Prepare BOM structure, system summary and customer-facing proposal output.",
      route: "/app/tools/proposal",
      icon: "📄",
      cta: "Build Proposal",
      stage: "Proposal",
      accent: "#f97316",
    },
  ];

  const quickTools: QuickTool[] = [
    { title: "Video Wall Planner", route: "/app/tools/video-wall", icon: "🖥️" },
    { title: "Catalogue", route: "/app/tools/catalog", icon: "📚" },
    { title: "Templates", route: "/app/tools/templates", icon: "🧩" },
    { title: "Import Intake", route: "/app/tools/import-intake", icon: "⬆️" },
  ];

  const recentOutputs: OutputItem[] = [
    {
      title: "System Summary",
      description: "Customer-facing overview of recommended architecture and technology path.",
      status: "Ready",
    },
    {
      title: "Bill of Materials",
      description: "Structured BOM output for review before proposal issue.",
      status: "Draft",
    },
    {
      title: "Proposal Pack",
      description: "Proposal document and supporting system explanation.",
      status: "Pending",
    },
  ];

  const recommended = useMemo(() => {
    if (activeStage === "Discovery") {
      return {
        title: "Recommended next step",
        action:
          "Complete customer discovery before moving into product-led design.",
        route: "/app/tools/discovery",
        button: "Continue Discovery",
      };
    }

    if (activeStage === "Design") {
      return {
        title: "Recommended next step",
        action:
          "Validate the signal architecture and shortlist the most suitable WyreStorm platform.",
        route: "/app/tools/catalog",
        button: "Review Products",
      };
    }

    return {
      title: "Recommended next step",
      action:
        "The system layout is ready to move into structured output and proposal generation.",
      route: "/app/tools/proposal",
      button: "Open Proposal Builder",
    };
  }, [activeStage]);

  const guruPrompt = useMemo(() => {
    if (activeStage === "Discovery") {
      return "Guru recommendation: confirm source count, display count, signal distances and USB requirements before selecting transport technology.";
    }

    if (activeStage === "Design") {
      return "Guru recommendation: check whether HDMI, HDBaseT, AV over IP or video wall processing best fits the application and expansion needs.";
    }

    return "Guru recommendation: convert the agreed architecture into a clean bill of materials and customer-ready summary.";
  }, [activeStage]);

  const focusPanel = useMemo(() => {
    if (activeStage === "Discovery") {
      return {
        title: "Current focus",
        body: "Gather the design inputs first: room type, quantity of displays, source devices, distances, USB peripherals, control and audio requirements.",
      };
    }

    if (activeStage === "Design") {
      return {
        title: "Current focus",
        body: "Translate requirements into architecture. Decide whether direct HDMI, HDBaseT, AV over IP, matrix switching or dedicated video wall processing is the right fit.",
      };
    }

    return {
      title: "Current focus",
      body: "Turn the selected architecture into a clear commercial output with BOM structure, project summary and customer proposal language.",
    };
  }, [activeStage]);

  return (
    <main className="wm-dashboard-page" style={pageStyle}>
      <section style={heroStyle}>
        <div style={stack10Style}>
          <div style={eyebrowStyle}>Wingman Mission Control</div>
          <h1 style={heroTitleStyle}>Structured AV workflow for sales and pre-sales</h1>
          <p style={heroTextStyle}>
            Move from discovery to design and proposal with a clearer start
            point, better product alignment and less reliance on senior
            engineering support.
          </p>
        </div>
      </section>

      <section style={contextBarStyle}>
        <div style={contextBlockStyle}>
          <div style={contextLabelStyle}>Active project</div>
          <div style={contextValueStyle}>{resolvedProjectName}</div>
        </div>

        <div style={contextBlockStyle}>
          <div style={contextLabelStyle}>Project ID</div>
          <div style={contextValueStyle}>{resolvedProjectId}</div>
        </div>

        <div style={contextBlockStyle}>
          <div style={contextLabelStyle}>Current stage</div>
          <div style={contextStagePillStyle}>{activeStage}</div>
        </div>

        <div style={contextBlockStyle}>
          <div style={contextLabelStyle}>Workflow</div>
          <div style={workflowLineStyle}>Discovery → Design → Proposal</div>
        </div>

        <div style={contextActionWrapStyle}>
          <button
            type="button"
            style={primaryActionStyle}
            onClick={() => navigate(recommended.route)}
          >
            {recommended.button}
          </button>
        </div>
      </section>

      <section style={progressPanelStyle}>
        <div style={stack6Style}>
          <div style={recommendationLabelStyle}>Workflow progress</div>
          <div style={progressRowStyle}>
            {workflowStages.map((stage, index) => {
              const currentIndex = stageIndex(activeStage);
              const isComplete = index < currentIndex;
              const isActive = index === currentIndex;

              const stageStyle: CSSProperties = {
                ...progressStageStyle,
                background: isActive
                  ? "linear-gradient(135deg, rgba(249,115,22,0.26), rgba(234,88,12,0.18))"
                  : isComplete
                  ? "rgba(34,197,94,0.14)"
                  : "rgba(255,255,255,0.04)",
                borderColor: isActive
                  ? "rgba(249,115,22,0.34)"
                  : isComplete
                  ? "rgba(34,197,94,0.28)"
                  : "rgba(255,255,255,0.08)",
              };

              return (
                <div key={stage} style={progressStageWrapStyle}>
                  <div style={stageStyle}>
                    <span style={progressIndexStyle}>{index + 1}</span>
                    <span>{stage}</span>
                  </div>
                  {index < workflowStages.length - 1 ? <div style={progressConnectorStyle} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={recommendationPanelStyle}>
        <div style={stack6Style}>
          <div style={recommendationLabelStyle}>{recommended.title}</div>
          <div style={recommendationTextStyle}>{recommended.action}</div>
        </div>
      </section>

      <section style={dashboardSplitStyle}>
        <div style={leftColumnStyle}>
          <section style={tileGridStyle}>
            {tiles.map((tile) => {
              const tileIconStyle: CSSProperties = {
                ...tileIconWrapStyle,
                background:
                  "linear-gradient(135deg, " +
                  tile.accent +
                  " 0%, rgba(255,255,255,0.12) 100%)",
              };

              return (
                <article key={tile.title} style={cardStyle}>
                  <div style={tileIconStyle}>
                    <span>{tile.icon}</span>
                  </div>

                  <div style={tileStageStyle}>{tile.stage}</div>

                  <h2 style={tileTitleStyle}>{tile.title}</h2>

                  <p style={tileTextStyle}>{tile.description}</p>

                  <button
                    type="button"
                    style={tileButtonStyle}
                    onClick={() => navigate(tile.route)}
                  >
                    {tile.cta}
                  </button>
                </article>
              );
            })}
          </section>

          <section style={quickToolsPanelStyle}>
            <div style={stack10Style}>
              <div style={recommendationLabelStyle}>Quick tools</div>
              <div style={quickToolsGridStyle}>
                {quickTools.map((tool) => (
                  <button
                    key={tool.title}
                    type="button"
                    style={quickToolButtonStyle}
                    onClick={() => navigate(tool.route)}
                  >
                    <span style={quickToolIconStyle}>{tool.icon}</span>
                    <span>{tool.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside style={rightColumnStyle}>
          <section style={sidePanelStyle}>
            <div style={stack6Style}>
              <div style={recommendationLabelStyle}>{focusPanel.title}</div>
              <div style={sidePanelTextStyle}>{focusPanel.body}</div>
            </div>
          </section>

          <section style={guruPanelStyle}>
            <div style={guruPanelIconStyle}>G</div>
            <div style={stack6MinWidthStyle}>
              <div style={guruPanelTitleStyle}>Wingman Guru</div>
              <div style={guruPanelTextStyle}>{guruPrompt}</div>
            </div>
          </section>

          <section style={sidePanelStyle}>
            <div style={stack10Style}>
              <div style={recommendationLabelStyle}>Recent outputs</div>
              <div style={stack10Style}>
                {recentOutputs.map((item) => (
                  <div key={item.title} style={outputRowStyle}>
                    <div style={stack6Style}>
                      <div style={outputTitleStyle}>{item.title}</div>
                      <div style={outputTextStyle}>{item.description}</div>
                    </div>
                    <div style={outputStatusStyle}>{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </section>

      <div
        className="wm-guru"
        role="button"
        tabIndex={0}
        aria-label="Open Wingman Guru"
      >
        <div className="wm-guru__icon">
          <span
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            G
          </span>
        </div>
        <div className="wm-guru__text">
          <div className="wm-guru__eyebrow">Wingman Guru</div>
          <div className="wm-guru__title">Mission control</div>
          <div className="wm-guru__subtitle">Workflow guidance ready</div>
        </div>
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
  padding: "24px",
  width: "100%",
  maxWidth: "1680px",
  margin: "0 auto",
};

const heroStyle: CSSProperties = {
  borderRadius: "22px",
  padding: "26px 28px",
  background:
    "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(8,15,28,0.98) 100%)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.22)",
};

const progressPanelStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "18px 20px",
  background: "rgba(8,15,28,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const stack10Style: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const stack6Style: CSSProperties = {
  display: "grid",
  gap: "6px",
};

const stack6MinWidthStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const dashboardSplitStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
  gap: "20px",
  alignItems: "start",
};

const leftColumnStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
  minWidth: 0,
};

const rightColumnStyle: CSSProperties = {
  display: "grid",
  gap: "20px",
  minWidth: 0,
};

const tileGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
};

const quickToolsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
};

const eyebrowStyle: CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const heroTitleStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "32px",
  lineHeight: 1.08,
  fontWeight: 800,
  margin: 0,
};

const heroTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
  maxWidth: "900px",
};

const contextBarStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  padding: "18px",
  borderRadius: "18px",
  background: "rgba(8,15,28,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const contextBlockStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  alignContent: "start",
};

const contextLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.64)",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const contextValueStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "17px",
  fontWeight: 700,
};

const contextStagePillStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: "999px",
  background: "rgba(249,115,22,0.18)",
  border: "1px solid rgba(249,115,22,0.34)",
};

const workflowLineStyle: CSSProperties = {
  color: "rgba(255,255,255,0.86)",
  fontSize: "14px",
  fontWeight: 600,
};

const contextActionWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
};

const primaryActionStyle: CSSProperties = {
  background: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
  color: "#ffffff",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const recommendationPanelStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "18px 20px",
  background:
    "linear-gradient(180deg, rgba(22,34,54,0.92), rgba(11,20,35,0.96))",
  border: "1px solid rgba(255,255,255,0.08)",
};

const recommendationLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.68)",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const recommendationTextStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "16px",
  lineHeight: 1.5,
  fontWeight: 600,
};

const progressRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
};

const progressStageWrapStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "10px",
  alignItems: "center",
};

const progressStageStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
};

const progressIndexStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  display: "grid",
  placeItems: "center",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.10)",
  fontSize: "12px",
  fontWeight: 800,
};

const progressConnectorStyle: CSSProperties = {
  height: "2px",
  borderRadius: "999px",
  background: "linear-gradient(90deg, rgba(249,115,22,0.40), rgba(255,255,255,0.12))",
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minHeight: "260px",
  padding: "22px",
  borderRadius: "18px",
  background:
    "linear-gradient(180deg, rgba(18,30,48,0.95), rgba(10,18,32,0.98))",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.03)",
};

const quickToolsPanelStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "18px 20px",
  background: "rgba(8,15,28,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const sidePanelStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "18px 20px",
  background: "rgba(8,15,28,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const tileIconWrapStyle: CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  color: "#ffffff",
  fontSize: "24px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
};

const tileStageStyle: CSSProperties = {
  color: "rgba(255,255,255,0.68)",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const tileTitleStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "20px",
  lineHeight: 1.15,
  fontWeight: 800,
  margin: 0,
};

const tileTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  fontSize: "14px",
  lineHeight: 1.6,
  margin: 0,
};

const tileButtonStyle: CSSProperties = {
  marginTop: "auto",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#ffffff",
  padding: "12px 14px",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const quickToolButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "left",
};

const quickToolIconStyle: CSSProperties = {
  width: "30px",
  height: "30px",
  display: "grid",
  placeItems: "center",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.08)",
  flex: "0 0 30px",
};

const guruPanelStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "56px 1fr",
  gap: "14px",
  alignItems: "start",
  padding: "18px 20px",
  borderRadius: "18px",
  background:
    "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(15,23,42,0.96))",
  border: "1px solid rgba(249,115,22,0.28)",
};

const guruPanelIconStyle: CSSProperties = {
  width: "56px",
  height: "56px",
  display: "grid",
  placeItems: "center",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 800,
};

const guruPanelTitleStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: 800,
  lineHeight: 1.1,
};

const guruPanelTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  fontSize: "14px",
  lineHeight: 1.55,
};

const sidePanelTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  fontSize: "14px",
  lineHeight: 1.6,
};

const outputRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "12px",
  alignItems: "start",
  padding: "14px 0",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const outputTitleStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.3,
};

const outputTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.82)",
  fontSize: "13px",
  lineHeight: 1.5,
};

const outputStatusStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 800,
  padding: "6px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
};