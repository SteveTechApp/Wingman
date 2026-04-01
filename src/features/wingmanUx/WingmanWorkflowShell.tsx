import type { ReactNode } from "react";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";

type WorkflowStageId =
  | "discovery"
  | "room-definition"
  | "product-selection"
  | "system-architecture"
  | "bom"
  | "proposal";

type WorkflowStage = {
  id: WorkflowStageId;
  label: string;
  route: string;
  description: string;
};

type WingmanWorkflowShellProps = {
  children?: ReactNode;
  activeStage?: string;
  projectName?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  systemType?: string;
  rightRail?: ReactNode;

  onSave?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenHistory?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
};

const STAGES: WorkflowStage[] = [
  {
    id: "discovery",
    label: "Discovery",
    route: WM_ROUTES.discovery,
    description: "Capture project goals, sources, displays, and constraints.",
  },
  {
    id: "room-definition",
    label: "Room Definition",
    route: WM_ROUTES.roomWizard,
    description: "Define the space, layout, and room constraints.",
  },
  {
    id: "product-selection",
    label: "Product Selection",
    route: WM_ROUTES.catalog,
    description: "Review recommended products and compare fit.",
  },
  {
    id: "system-architecture",
    label: "System Architecture",
    route: WM_ROUTES.architecture,
    description: "Validate routing, topology, and system structure.",
  },
  {
    id: "bom",
    label: "Bill of Materials",
    route: WM_ROUTES.bom,
    description: "Review quantities, supporting parts, and commercial scope.",
  },
  {
    id: "proposal",
    label: "Proposal Output",
    route: WM_ROUTES.proposal,
    description: "Prepare the final client-facing proposal output.",
  },
];

function getStageIndexFromRoute(pathname: string, search: string): number {
  const params = new URLSearchParams(search);
  const proposalStage = params.get("stage");

  if (pathname.startsWith(WM_ROUTES.discovery)) return 0;
  if (pathname.startsWith(WM_ROUTES.roomWizard)) return 1;
  if (pathname.startsWith(WM_ROUTES.catalog) || pathname.startsWith(WM_ROUTES.catalogue)) return 2;
  if (pathname === "/app/tools/proposal" && proposalStage === "architecture") return 3;
  if (pathname === "/app/tools/proposal" && proposalStage === "bom") return 4;
  if (pathname === "/app/tools/proposal" && proposalStage === "proposal") return 5;
  if (pathname === "/app/tools/proposal") return 3;
  if (pathname.startsWith(WM_ROUTES.dashboard)) return 0;
  return 0;
}

function getStageIndexFromId(activeStage?: string): number {
  if (!activeStage) return -1;

  const normalized = activeStage.trim().toLowerCase();

  const lookup: Record<string, number> = {
    "discovery": 0,
    "room-definition": 1,
    "room definition": 1,
    "product-selection": 2,
    "product selection": 2,
    "system-architecture": 3,
    "system architecture": 3,
    "architecture": 3,
    "bom": 4,
    "bill-of-materials": 4,
    "bill of materials": 4,
    "proposal": 5,
    "proposal-output": 5,
    "proposal output": 5,
  };

  return lookup[normalized] ?? -1;
}

export function WingmanWorkflowShell({
  children,
  activeStage,
  projectName,
  sourceCount,
  displayCount,
  distanceM,
  systemType,
  rightRail,
}: WingmanWorkflowShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeStageIndex = useMemo(() => {
    const explicitIndex = getStageIndexFromId(activeStage);
    if (explicitIndex >= 0) return explicitIndex;
    return getStageIndexFromRoute(location.pathname, location.search);
  }, [activeStage, location.pathname, location.search]);

  const safeProjectName = projectName || "Active Project";
  const safeSourceCount = sourceCount ?? 0;
  const safeDisplayCount = displayCount ?? 0;
  const safeDistanceM = distanceM ?? 0;
  const safeSystemType = systemType || "System Design";

  return (
    <section className="wmx-workflow-shell">
      <header className="wmx-workflow-shell__header">
        <div className="wmx-workflow-shell__header-left">
          <div className="wmx-workflow-shell__eyebrow">Guided Workflow</div>
          <h2 className="wmx-workflow-shell__title">{safeProjectName}</h2>
          <div className="wmx-workflow-shell__meta">
            <span>{safeSourceCount} Sources</span>
            <span>{safeDisplayCount} Displays</span>
            <span>{safeDistanceM}m</span>
            <span>{safeSystemType}</span>
          </div>
        </div>

        <div className="wmx-workflow-shell__summary">
          Step {activeStageIndex + 1} of {STAGES.length}
        </div>
      </header>

      <div className="wmx-workflow-shell__rail">
        {STAGES.map((stage, index) => {
          const isActive = index === activeStageIndex;
          const isComplete = index < activeStageIndex;

          return (
            <button
              key={stage.id}
              type="button"
              className={[
                "wmx-workflow-shell__stage",
                isActive ? "is-active" : "",
                isComplete ? "is-complete" : "",
              ].join(" ").trim()}
              onClick={() => navigate(stage.route)}
            >
              <span className="wmx-workflow-shell__stage-index">
                {index + 1}
              </span>

              <span className="wmx-workflow-shell__stage-copy">
                <strong>{stage.label}</strong>
                <small>{stage.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="wmx-workflow-shell__body">
        <main className="wmx-workflow-shell__main">
          {children}
        </main>

        {rightRail ? (
          <aside className="wmx-workflow-shell__right-rail">
            {rightRail}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

export default WingmanWorkflowShell;
