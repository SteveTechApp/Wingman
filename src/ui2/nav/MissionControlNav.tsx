import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  BrainCircuit,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Grid2x2,
  LayoutTemplate,
  Library,
  Network,
  Radar,
  ScanSearch,
  ShieldCheck,
  Trophy,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MISSION_CONTROL_STAGES,
  isMissionControlItemActive,
  type MissionControlItem,
  type MissionControlStage,
} from "./missionControlStandard";

const STORAGE_KEY_COLLAPSED = "wingman.missionControl.collapsed";
const STORAGE_KEY_OPEN_STAGES = "wingman.missionControl.openStages";

const ICONS: Record<string, LucideIcon> = {
  dashboard: Grid2x2,
  projects: FolderKanban,
  "tool-hub": Boxes,

  "guided-project": ScanSearch,
  "room-definition": LayoutTemplate,
  "tech-selection": Radar,
  "products-workflow": Boxes,
  architecture: Network,
  bom: ClipboardList,
  proposal: FileText,

  catalogue: Library,
  competitors: Trophy,
  "video-wall": Network,
  "import-brief": FileSpreadsheet,
  "product-intelligence": ShieldCheck,
  "sales-positioning": Briefcase,
  training: BrainCircuit,
  guru: WandSparkles,
};

type StageOpenState = Record<string, boolean>;

function defaultStageState(): StageOpenState {
  return {
    control: true,
    workflow: true,
    reference: true,
  };
}

function getStageClass(stage: MissionControlStage) {
  return `wm-reference-nav__group wm-reference-nav__group--${stage.tone} wm-reference-nav__group--${stage.id}`;
}

function getItemIcon(item: MissionControlItem): LucideIcon {
  return ICONS[item.id] ?? Boxes;
}

function isToolsStage(stage: MissionControlStage) {
  return stage.id === "reference";
}

function renderStandardItem(
  item: MissionControlItem,
  active: boolean,
  Icon: LucideIcon,
  navigate: ReturnType<typeof useNavigate>,
) {
  return (
    <button
      key={item.id}
      type="button"
      className={`wm-reference-nav__item wm-reference-nav__item--${item.id}${active ? " wm-reference-nav__item--active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={`${item.title} — ${item.description}`}
      onClick={() => navigate(item.to)}
    >
      <span className="wm-reference-nav__item-icon">
        <Icon size={17} strokeWidth={1.8} />
      </span>

      <span className="wm-reference-nav__item-copy">
        <span className="wm-reference-nav__item-label">{item.title}</span>
        <span className="wm-reference-nav__item-description">{item.description}</span>
      </span>

      <span className="wm-reference-nav__item-short">{item.short}</span>
    </button>
  );
}

function renderToolTile(
  item: MissionControlItem,
  active: boolean,
  Icon: LucideIcon,
  navigate: ReturnType<typeof useNavigate>,
) {
  return (
    <button
      key={item.id}
      type="button"
      className={`wm-tool-launcher__tile wm-tool-launcher__tile--${item.id}${active ? " wm-tool-launcher__tile--active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={`${item.title} — ${item.description}`}
      onClick={() => navigate(item.to)}
    >
      <span className="wm-tool-launcher__icon">
        <Icon size={18} strokeWidth={1.9} />
      </span>

      <span className="wm-tool-launcher__title">{item.title}</span>
      <span className="wm-tool-launcher__desc">{item.description}</span>
      <span className="wm-tool-launcher__code">{item.short}</span>
    </button>
  );
}

export default function MissionControlNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [openStages, setOpenStages] = useState<StageOpenState>(defaultStageState());

  useEffect(() => {
    try {
      const savedCollapsed = window.localStorage.getItem(STORAGE_KEY_COLLAPSED);
      setCollapsed(savedCollapsed === "true");

      const savedStages = window.localStorage.getItem(STORAGE_KEY_OPEN_STAGES);
      if (savedStages) {
        const parsed = JSON.parse(savedStages) as StageOpenState;
        setOpenStages({ ...defaultStageState(), ...parsed });
      }
    } catch {
      setCollapsed(false);
      setOpenStages(defaultStageState());
    }
  }, []);

  const activeStageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const stage of MISSION_CONTROL_STAGES) {
      if (stage.items.some((item) => isMissionControlItemActive(item, location.pathname, location.search))) {
        ids.add(stage.id);
      }
    }
    return ids;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (collapsed) return;

    const next = { ...openStages };
    let changed = false;

    for (const stageId of activeStageIds) {
      if (!next[stageId]) {
        next[stageId] = true;
        changed = true;
      }
    }

    if (changed) {
      setOpenStages(next);
      try {
        window.localStorage.setItem(STORAGE_KEY_OPEN_STAGES, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  }, [activeStageIds, collapsed]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY_COLLAPSED, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function toggleStage(stageId: string) {
    setOpenStages((prev) => {
      const next = { ...prev, [stageId]: !prev[stageId] };
      try {
        window.localStorage.setItem(STORAGE_KEY_OPEN_STAGES, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className={`wm-reference-nav-shell${collapsed ? " is-collapsed" : ""}`}>
      <div className="wm-reference-nav-shell__toolbar">
        <button
          type="button"
          className="wm-reference-nav-shell__toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav
        className={`wm-reference-nav wm-reference-nav--stacked${collapsed ? " is-collapsed" : ""}`}
        aria-label="Wingman navigation"
      >
        {MISSION_CONTROL_STAGES.map((stage) => {
          const isOpen = collapsed ? false : !!openStages[stage.id];
          const activeInStage = stage.items.some((item) =>
            isMissionControlItemActive(item, location.pathname, location.search),
          );
          const toolsStage = isToolsStage(stage);

          return (
            <section key={stage.id} className={getStageClass(stage)} aria-label={stage.label}>
              <header className="wm-reference-nav__group-header">
                <div className="wm-reference-nav__group-index">{stage.index}</div>

                <button
                  type="button"
                  className={`wm-reference-nav__group-toggle${activeInStage ? " is-active" : ""}`}
                  onClick={() => toggleStage(stage.id)}
                  aria-expanded={isOpen}
                  title={isOpen ? `Collapse ${stage.label}` : `Expand ${stage.label}`}
                >
                  <span className="wm-reference-nav__group-copy">
                    <span className="wm-reference-nav__group-title">{stage.label}</span>
                    <span className="wm-reference-nav__group-cue">{stage.cue}</span>
                  </span>

                  <span className="wm-reference-nav__group-toggle-icon">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>
              </header>

              {!collapsed && isOpen ? (
                toolsStage ? (
                  <div className="wm-tool-launcher">
                    {stage.items.map((item) => {
                      const active = isMissionControlItemActive(item, location.pathname, location.search);
                      const Icon = getItemIcon(item);
                      return renderToolTile(item, active, Icon, navigate);
                    })}
                  </div>
                ) : (
                  <div className="wm-reference-nav__group-items">
                    {stage.items.map((item) => {
                      const active = isMissionControlItemActive(item, location.pathname, location.search);
                      const Icon = getItemIcon(item);
                      return renderStandardItem(item, active, Icon, navigate);
                    })}
                  </div>
                )
              ) : null}
            </section>
          );
        })}
      </nav>
    </div>
  );
}