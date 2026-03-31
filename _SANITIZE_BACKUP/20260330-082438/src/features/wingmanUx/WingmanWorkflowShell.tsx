import * as React from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { useCommandPalette } from "@/core/wingman/commandPalette/CommandPaletteProvider";
import "./wingman-ux.css";

export type WingmanWorkflowStage =
  | "discovery"
  | "room-definition"
  | "technology"
  | "product-selection"
  | "architecture"
  | "bom"
  | "proposal";

type DensityMode = "comfortable" | "compact" | "pro";

type StageItem = {
  id: WingmanWorkflowStage;
  label: string;
  route?: string;
};

const STAGES: StageItem[] = [
  { id: "discovery", label: "Discovery", route: WM_ROUTES.discovery },
  { id: "room-definition", label: "Room Definition" },
  { id: "technology", label: "Tech Selection" },
  { id: "product-selection", label: "Product Selection", route: WM_ROUTES.catalog },
  { id: "architecture", label: "System Architecture", route: WM_ROUTES.proposal },
  { id: "bom", label: "Bill of Materials", route: WM_ROUTES.proposal },
  { id: "proposal", label: "Proposal Output", route: WM_ROUTES.proposal },
];

const DENSITY_STORAGE_KEY = "wingman-ui-density";

export function WingmanWorkflowShell(props: {
  activeStage: WingmanWorkflowStage;
  projectName?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  systemType?: string;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
  onSave?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenHistory?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}) {
  const {
    activeStage,
    projectName,
    sourceCount = 0,
    displayCount = 0,
    distanceM = 0,
    systemType,
    rightRail,
    children,
    onSave,
    onOpenCommandPalette,
    onOpenHistory,
    onOpenNotifications,
    onOpenSettings,
  } = props;

  const navigate = useNavigate();
  const { open } = useCommandPalette();

  const [density, setDensity] = React.useState<DensityMode>(() => {
    if (typeof window === "undefined") return "pro";
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return stored === "comfortable" || stored === "compact" || stored === "pro"
      ? stored
      : "pro";
  });

  React.useEffect(() => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isMeta && key === "s") {
        event.preventDefault();
        onSave?.();
      }

      if (isMeta && key === "k") {
        event.preventDefault();
        if (onOpenCommandPalette) onOpenCommandPalette();
        else open();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, onOpenCommandPalette, open]);

  return (
    <div className={`wmx-app wmx-density-${density}`}>
      <header className="wmx-topbar">
        <div className="wmx-brand">
          <div className="wmx-brand-logoWrap">
            <div className="wmx-brand-mark">◆</div>
          </div>

          <div className="wmx-brand-copy">
            <div className="wmx-brand-kicker">WYRESTORM</div>
            <div className="wmx-brand-name">Wingman</div>
            <div className="wmx-brand-subtitle">Guided AV design and sales support</div>
          </div>
        </div>

        <div className="wmx-topbar-meta">
          <div className="wmx-topbar-pill">
            <span className="wmx-topbar-label">Project</span>
            <strong>{projectName || "Untitled Project"}</strong>
          </div>

          <div className="wmx-topbar-pill">
            <strong>
              {sourceCount} Sources {"→"} {displayCount} Displays {"→"} {distanceM}m
            </strong>
          </div>

          <div className="wmx-topbar-pill">
            <span className="wmx-topbar-label">System Type</span>
            <strong>{systemType || "In qualification"}</strong>
          </div>
        </div>

        <div className="wmx-topbar-tools">
          <div className="wmx-density-switch" role="group" aria-label="Interface density">
            <button
              type="button"
              className={`wmx-density-btn ${density === "comfortable" ? "is-active" : ""}`}
              onClick={() => setDensity("comfortable")}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={`wmx-density-btn ${density === "compact" ? "is-active" : ""}`}
              onClick={() => setDensity("compact")}
            >
              Compact
            </button>
            <button
              type="button"
              className={`wmx-density-btn ${density === "pro" ? "is-active" : ""}`}
              onClick={() => setDensity("pro")}
            >
              Pro
            </button>
          </div>

          <button
            type="button"
            className="wmx-icon-btn"
            aria-label="Open command palette"
            onClick={onOpenCommandPalette ?? open}
          >
            Cmd+K
          </button>

          <button type="button" className="wmx-icon-btn" onClick={onOpenNotifications}>
            N
          </button>
          <button type="button" className="wmx-icon-btn" onClick={onOpenHistory}>
            H
          </button>
          <button type="button" className="wmx-icon-btn" onClick={onOpenSettings}>
            S
          </button>
        </div>
      </header>

      <div className="wmx-layout">
        <aside className="wmx-sidebar">
          <div className="wmx-sidebar-section">
            <div className="wmx-sidebar-title">Workflow</div>

            {STAGES.map((item) => {
              const active = item.id === activeStage;
              const clickable = Boolean(item.route);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`wmx-nav-item ${active ? "is-active" : ""} ${!clickable ? "is-disabled" : ""}`}
                  onClick={() => {
                    if (item.route) navigate(item.route);
                  }}
                  disabled={!clickable}
                >
                  <span className="wmx-nav-text">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="wmx-sidebar-section">
            <div className="wmx-sidebar-title">Actions</div>
            <button type="button" className="wmx-secondary-btn" onClick={onSave}>
              Save Draft
            </button>
            <button
              type="button"
              className="wmx-secondary-btn"
              onClick={onOpenCommandPalette ?? open}
            >
              Open Command Palette
            </button>
          </div>
        </aside>

        <main className="wmx-main">
          <div className="wmx-page-surface">{children}</div>
        </main>

        <aside className="wmx-rightbar">
          {rightRail ?? (
            <div className="wmx-rightbar-empty">
              <div className="wmx-rightbar-title">Decision Rail</div>
              <div className="wmx-rightbar-copy">
                Contextual guidance, recommendations and risks will appear here.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}