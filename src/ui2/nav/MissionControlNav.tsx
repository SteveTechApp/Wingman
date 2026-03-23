import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  getMissionControlStage,
  isMissionControlItemActive,
  MISSION_CONTROL_STAGES,
  type MissionControlItem,
  type MissionControlStage,
} from "@/ui2/nav/missionControlStandard";
import {
  getActiveProject,
  subscribeProjects,
} from "@/features/projects/projectStore";

type MissionControlNavProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function toMonogram(name: string | null | undefined): string {
  const source = (name || "").trim();
  if (!source) return "--";

  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || source.slice(0, 2).toUpperCase();
}

function resolveFocusItem(
  stage: MissionControlStage,
  pathname: string,
  search: string,
): MissionControlItem {
  return (
    stage.items.find((item) => isMissionControlItemActive(item, pathname, search))
    ?? stage.items[0]
  );
}

export default function MissionControlNav({
  collapsed = false,
  onToggleCollapse,
}: MissionControlNavProps) {
  const location = useLocation();
  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );

  const currentStage = React.useMemo(
    () => getMissionControlStage(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const focusItem = React.useMemo(
    () => resolveFocusItem(currentStage, location.pathname, location.search),
    [currentStage, location.pathname, location.search],
  );
  const isControlDashboard =
    location.pathname === "/app/dashboard"
    && currentStage.id === "control"
    && searchParams.get("panel") !== "architecture";

  const activeProjectName = activeProject?.name ?? "No active project";
  const projectMonogram = React.useMemo(() => toMonogram(activeProject?.name), [activeProject?.name]);

  return (
    <aside className={`wm-nav wm-nav-standard${collapsed ? " is-collapsed" : ""}`}>
      <div className="wm-nav-standard__header">
        {!collapsed ? (
          <div className="wm-nav-standard__brand-copy">
            <div className="wm-nav-standard__eyebrow">Mission Control</div>
            {!isControlDashboard ? (
              <div className="wm-nav-standard__title">Workspace Rail</div>
            ) : null}
          </div>
        ) : (
          <span className="wm-nav-standard__collapsed-mark" aria-hidden="true">
            MC
          </span>
        )}

        {onToggleCollapse ? (
          <button
            type="button"
            className="wm-nav-standard__collapse"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        ) : null}
      </div>

      {!collapsed && !isControlDashboard ? (
        <div className="wm-nav-standard__status" data-tone={currentStage.tone}>
          <div className="wm-nav-standard__status-head">
            <span className="wm-nav-standard__status-stage-pill">
              {currentStage.index} {currentStage.label}
            </span>
            <span className="wm-nav-standard__focus-pill">{focusItem.title}</span>
          </div>

          <div className="wm-nav-standard__status-project">
            <span className="wm-nav-standard__project-badge">{projectMonogram}</span>

            <div className="wm-nav-standard__status-copy">
              <span className="wm-nav-standard__project-name">{activeProjectName}</span>
              <span className="wm-nav-standard__project-meta">{currentStage.description}</span>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="wm-nav-standard__stages" aria-label="Mission Control navigation">
        {MISSION_CONTROL_STAGES.map((stage) => {
          const isCurrent = stage.id === currentStage.id;

          return (
            <section
              key={stage.id}
              className={`wm-nav-stage${isCurrent ? " is-current" : ""}`}
              data-tone={stage.tone}
            >
              {!collapsed ? (
                <div className="wm-nav-stage__summary">
                  <span className="wm-nav-stage__index">{stage.index}</span>
                  <span className="wm-nav-stage__summary-copy">
                    <span className="wm-nav-stage__label">{stage.label}</span>
                  </span>
                </div>
              ) : (
                <div className="wm-nav-stage__collapsed-head">{stage.index}</div>
              )}

              {collapsed ? (
                <div className="wm-nav-stage__collapsed-links">
                  {stage.items.map((item) => {
                    const isActive = isMissionControlItemActive(item, location.pathname, location.search);

                    return (
                      <Link
                        key={item.id}
                        to={item.to}
                        className={`wm-nav-stage__icon-link${isActive ? " is-active" : ""}`}
                        title={item.title}
                        aria-label={item.title}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {item.short}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="wm-nav-stage__body">
                  <div className="wm-nav-stage__links">
                    {stage.items.map((item) => {
                      const isActive = isMissionControlItemActive(item, location.pathname, location.search);

                      return (
                        <Link
                          key={item.id}
                          to={item.to}
                          className={`wm-nav-stage__link${isActive ? " is-active" : ""}`}
                          aria-current={isActive ? "page" : undefined}
                          title={item.description}
                        >
                          <span className="wm-nav-stage__link-badge">{item.short}</span>

                          <span className="wm-nav-stage__link-copy">
                            <span className="wm-nav-stage__link-title">{item.title}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </nav>

    </aside>
  );
}
