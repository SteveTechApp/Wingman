import * as React from "react";
import { useNavigate } from "react-router-dom";

type StageKey = "discovery" | "design" | "proposal";

type QuickTool = {
  title: string;
  desc: string;
  tag: string;
  route: string;
  icon: string;
  featured?: boolean;
};

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

type ActionCardProps = QuickTool & {
  onOpen: (route: string) => void;
};

const ROUTES = {
  projects: "/app/projects",
  discovery: "/app/tools/discovery",
  catalog: "/app/tools/catalog",
  proposal: "/app/tools/proposal",
  templates: "/app/tools/templates",
  competitors: "/app/tools/competitors",
  roomWizard: "/app/tools/room-wizard",
  toolhub: "/app/tools",
  newProject: "/app/projects/new",
};

function getProjectsTick(): string {
  try {
    return localStorage.getItem("wm_projects_tick") || "";
  } catch {
    return "";
  }
}

function readActiveProject(): any | null {
  const keys = [
    "wm_active_project",
    "wingman_active_project",
    "wm_current_project",
    "wm_project_active",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
    }
  }

  return null;
}

function readProjectList(): any[] {
  const keys = [
    "wm_projects",
    "wingman_projects",
    "wm_project_list",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }

  return [];
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function inferStage(project: any): StageKey {
  const proposal =
    safeText(project?.proposalState, "") ||
    safeText(project?.proposal?.status, "");

  const skuCount =
    Number(project?.skuCount) ||
    Number(project?.products?.length) ||
    Number(project?.skus?.length) ||
    0;

  const discoveryComplete =
    !!project?.discoveryComplete ||
    !!project?.discovery?.completed ||
    !!project?.discovery?.customer ||
    !!project?.customer;

  if (proposal && proposal.toLowerCase() !== "none") return "proposal";
  if (skuCount > 0 || discoveryComplete) return "design";
  return "discovery";
}

function formatUpdated(project: any): string {
  const raw =
    project?.updatedAt ||
    project?.modifiedAt ||
    project?.lastUpdated ||
    project?.createdAt;

  if (!raw) return "No recent activity";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return safeText(raw, "No recent activity");

  return d.toLocaleString();
}

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "18px 18px 16px",
        minHeight: 126,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(12,30,58,0.82), rgba(8,21,40,0.88))",
        boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          color: "rgba(148,179,221,0.76)",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#f6fbff",
          fontSize: 24,
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          marginBottom: 10,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "rgba(218,231,255,0.72)",
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {hint || "—"}
      </div>
    </div>
  );
}

function StagePill({
  index,
  title,
  state,
  active,
  onClick,
}: {
  index: number;
  title: string;
  state: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        minHeight: 72,
        borderRadius: 16,
        padding: "14px 16px",
        cursor: "pointer",
        border: active
          ? "1px solid rgba(90,231,255,0.28)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active
          ? "linear-gradient(90deg, rgba(22,166,203,0.26), rgba(31,95,184,0.20))"
          : "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))",
        color: "#f5fbff",
        textAlign: "left",
        boxShadow: active ? "0 12px 28px rgba(34,163,255,0.16)" : "none",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          fontSize: 14,
          fontWeight: 900,
          color: active ? "#041221" : "#dbe9ff",
          background: active
            ? "linear-gradient(90deg, #4ae7ff, #75a5ff)"
            : "rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        {index}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 4,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "rgba(216,229,255,0.72)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {state}
        </div>
      </div>
    </button>
  );
}

function ActionCard({ title, desc, tag, route, icon, featured, onOpen }: ActionCardProps) {
  return (
    <button
      onClick={() => onOpen(route)}
      style={{
        width: "100%",
        minHeight: 138,
        borderRadius: 18,
        padding: "18px 18px 16px",
        textAlign: "left",
        cursor: "pointer",
        border: featured
          ? "1px solid rgba(79,232,255,0.22)"
          : "1px solid rgba(255,255,255,0.08)",
        background: featured
          ? "linear-gradient(135deg, rgba(15,124,156,0.48), rgba(11,45,84,0.92))"
          : "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))",
        boxShadow: featured ? "0 18px 46px rgba(16,150,183,0.18)" : "0 10px 30px rgba(0,0,0,0.10)",
        color: "#f6fbff",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 14,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 9px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: featured ? "#92f2ff" : "#9bb8e8",
          background: featured ? "rgba(77,224,255,0.10)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 10,
        }}
      >
        {tag}
      </div>

      <div
        style={{
          fontSize: 21,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "rgba(220,232,255,0.78)",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {desc}
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [tick, setTick] = React.useState<string>(() => getProjectsTick());

  React.useEffect(() => {
    const onStorage = () => setTick(getProjectsTick());
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(() => setTick(getProjectsTick()), 1500);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  const projects = React.useMemo(() => readProjectList(), [tick]);
  const activeProject = React.useMemo(() => readActiveProject(), [tick]);

  const activeName = safeText(
    activeProject?.name || activeProject?.projectName || activeProject?.title,
    "No active project"
  );

  const roomName = safeText(
    activeProject?.roomName || activeProject?.room || activeProject?.spaceType,
    "Room not defined"
  );

  const customerName = safeText(
    activeProject?.customer || activeProject?.client || activeProject?.company,
    "Customer not defined"
  );

  const systemType = safeText(
    activeProject?.systemType ||
      activeProject?.architecture ||
      activeProject?.solutionType,
    "System architecture not defined"
  );

  const tier = safeText(
    activeProject?.tier || activeProject?.systemTier || activeProject?.designTier,
    "Not assigned"
  );

  const proposalState = safeText(
    activeProject?.proposalState || activeProject?.proposal?.status,
    "None"
  );

  const skuCount = String(
    Number(activeProject?.skuCount) ||
      Number(activeProject?.products?.length) ||
      Number(activeProject?.skus?.length) ||
      0
  );

  const displayCount = String(
    Number(activeProject?.displayCount) ||
      Number(activeProject?.displays) ||
      0
  );

  const sourceCount = String(
    Number(activeProject?.sourceCount) ||
      Number(activeProject?.sources) ||
      0
  );

  const stage = inferStage(activeProject || {});
  const updatedText = formatUpdated(activeProject || {});

  const stageCopy: Record<StageKey, string> = {
    discovery: "Capture project requirements before selecting products.",
    design: "Build the system logic and shortlist product options.",
    proposal: "Prepare BOM output and customer-facing proposal content.",
  };

  const stageRoutes: Record<StageKey, string> = {
    discovery: ROUTES.discovery,
    design: ROUTES.catalog,
    proposal: ROUTES.proposal,
  };

  const quickTools: QuickTool[] = [
    {
      title: "Discovery",
      desc: "Capture customer requirements, room details, display counts, distances, and constraints.",
      tag: "Primary",
      route: ROUTES.discovery,
      icon: "⌕",
      featured: true,
    },
    {
      title: "Product Catalog",
      desc: "Browse WyreStorm products and begin assembling a suitable architecture.",
      tag: "Design",
      route: ROUTES.catalog,
      icon: "◫",
    },
    {
      title: "Proposal Builder",
      desc: "Create BOM structure and proposal-ready outputs for the active opportunity.",
      tag: "Output",
      route: ROUTES.proposal,
      icon: "▤",
      featured: true,
    },
    {
      title: "Competitor Compare",
      desc: "Position WyreStorm against alternative approaches and competing products.",
      tag: "Product",
      route: ROUTES.competitors,
      icon: "◎",
    },
    {
      title: "Templates",
      desc: "Start from repeatable room and market baselines to reduce design time.",
      tag: "Design",
      route: ROUTES.templates,
      icon: "▣",
    },
    {
      title: "Projects",
      desc: "Open saved workspaces, review progress, and continue active opportunities.",
      tag: "Workspace",
      route: ROUTES.projects,
      icon: "▱",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        padding: "8px 6px 0",
        color: "#eef5ff",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.7fr) minmax(300px, 0.85fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section
          style={{
            borderRadius: 22,
            padding: "18px 18px 16px",
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(7,23,48,0.78), rgba(5,18,35,0.86))",
            boxShadow: "0 22px 60px rgba(0,0,0,0.14)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  color: "#f4f8ff",
                  fontSize: 42,
                  lineHeight: 0.98,
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  marginBottom: 6,
                }}
              >
                Dashboard
              </div>
              <div
                style={{
                  color: "rgba(216,229,255,0.72)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  maxWidth: 700,
                }}
              >
                Resume the active opportunity, review the current design stage, and launch the next recommended tool.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => navigate(ROUTES.projects)}
                style={{
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#eef5ff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Projects
              </button>
              <button
                onClick={() => navigate(ROUTES.newProject)}
                style={{
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(101,232,255,0.18)",
                  background: "linear-gradient(90deg, rgba(26,176,205,0.88), rgba(28,122,198,0.88))",
                  color: "#04111f",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 12px 28px rgba(31,133,224,0.18)",
                }}
              >
                + Start New Project
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              padding: "16px",
              marginBottom: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(10,30,57,0.74), rgba(8,21,40,0.82))",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.25fr) minmax(300px, 0.95fr)",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  {[
                    "Project: " + activeName,
                    "Stage: " + stage.charAt(0).toUpperCase() + stage.slice(1),
                    "SKUs: " + skuCount,
                    "Proposal: " + proposalState,
                    "Updated: " + updatedText,
                  ].map((item) => (
                    <span
                      key={item}
                      style={{
                        fontSize: 12,
                        color: "rgba(228,238,255,0.84)",
                        padding: "5px 8px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    color: "#f8fbff",
                    fontSize: 27,
                    lineHeight: 1.05,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    marginBottom: 8,
                  }}
                >
                  {activeName}
                </div>

                <div
                  style={{
                    color: "rgba(219,231,255,0.76)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 16,
                    maxWidth: 720,
                  }}
                >
                  {stageCopy[stage]}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {[
                    { label: "Customer", value: customerName },
                    { label: "Room", value: roomName },
                    { label: "System", value: systemType },
                    { label: "Tier", value: tier },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        borderRadius: 14,
                        padding: "12px 12px 11px",
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div
                        style={{
                          color: "rgba(154,180,221,0.72)",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          color: "#f7fbff",
                          fontSize: 15,
                          lineHeight: 1.35,
                          fontWeight: 700,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  padding: "14px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    color: "#90eaff",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Next recommended action
                </div>

                <div
                  style={{
                    color: "#f5fbff",
                    fontSize: 24,
                    lineHeight: 1.05,
                    fontWeight: 850,
                    letterSpacing: "-0.03em",
                    marginBottom: 8,
                  }}
                >
                  {stage === "discovery"
                    ? "Complete Discovery"
                    : stage === "design"
                    ? "Continue System Design"
                    : "Open Proposal Builder"}
                </div>

                <div
                  style={{
                    color: "rgba(220,232,255,0.76)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 14,
                  }}
                >
                  {stage === "discovery"
                    ? "Capture the customer, room, and system requirements before selecting the final architecture."
                    : stage === "design"
                    ? "Refine the product shortlist and confirm the architecture before preparing the customer-facing output."
                    : "Review BOM structure and finalise the proposal-ready documentation."}
                </div>

                <button
                  onClick={() => navigate(stageRoutes[stage])}
                  style={{
                    width: "100%",
                    height: 46,
                    borderRadius: 12,
                    border: "1px solid rgba(92,234,255,0.18)",
                    background: "linear-gradient(90deg, rgba(23,183,211,0.92), rgba(41,132,223,0.92))",
                    color: "#03111f",
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: "pointer",
                    marginBottom: 12,
                  }}
                >
                  {stage === "discovery"
                    ? "Resume Discovery"
                    : stage === "design"
                    ? "Open System Design"
                    : "Resume Proposal"}
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      padding: "10px 11px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        color: "rgba(154,180,221,0.72)",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Displays
                    </div>
                    <div
                      style={{
                        color: "#f7fbff",
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                    >
                      {displayCount}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 12,
                      padding: "10px 11px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        color: "rgba(154,180,221,0.72)",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Sources
                    </div>
                    <div
                      style={{
                        color: "#f7fbff",
                        fontSize: 18,
                        fontWeight: 800,
                      }}
                    >
                      {sourceCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <StagePill
              index={1}
              title="Discovery"
              state="Capture requirements and define the opportunity."
              active={stage === "discovery"}
              onClick={() => navigate(ROUTES.discovery)}
            />
            <StagePill
              index={2}
              title="System Design"
              state="Select architecture and shortlist product fit."
              active={stage === "design"}
              onClick={() => navigate(ROUTES.catalog)}
            />
            <StagePill
              index={3}
              title="Proposal"
              state="Prepare BOM and customer-facing outputs."
              active={stage === "proposal"}
              onClick={() => navigate(ROUTES.proposal)}
            />
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          <MetricCard
            label="Active project"
            value={activeProject ? activeName : "None"}
            hint={activeProject ? "Current workspace ready to continue." : "Open a project or start a new opportunity."}
          />
          <MetricCard
            label="Current SKUs"
            value={skuCount}
            hint="Products currently attached to the active workspace."
          />
          <MetricCard
            label="Proposal state"
            value={proposalState}
            hint="Useful for tracking sales readiness."
          />
          <MetricCard
            label="Projects saved"
            value={String(projects.length)}
            hint="Total workspaces currently detected in local storage."
          />
        </section>
      </div>

      <section
        style={{
          marginTop: 16,
          borderRadius: 22,
          padding: "16px 16px 14px",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(7,23,48,0.74), rgba(5,18,35,0.82))",
          boxShadow: "0 20px 56px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                color: "#f5fbff",
                fontSize: 36,
                lineHeight: 0.98,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                marginBottom: 4,
              }}
            >
              Quick Actions
            </div>
            <div
              style={{
                color: "rgba(216,229,255,0.72)",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              Common next steps for sales and pre-sales workflow.
            </div>
          </div>

          <button
            onClick={() => navigate(ROUTES.toolhub)}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "#86f2ff",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Open ToolHub →
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {quickTools.map((tool) => (
            <ActionCard
              key={tool.title}
              {...tool}
              onOpen={(route) => navigate(route)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}