import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  BrainCircuit,
  Briefcase,
  ChevronLeft,
  ChevronRight,
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
} from "./missionControlStandard";

const STORAGE_KEY_COLLAPSED = "wingman.missionControl.collapsed";

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

function getItemIcon(item: MissionControlItem): LucideIcon {
  return ICONS[item.id] ?? Boxes;
}

function tooltipText(item: MissionControlItem) {
  return `${item.title}: ${item.description}`;
}

export default function MissionControlNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      const savedCollapsed = window.localStorage.getItem(STORAGE_KEY_COLLAPSED);
      setCollapsed(savedCollapsed == null ? true : savedCollapsed === "true");
    } catch {
      setCollapsed(true);
    }
  }, []);

  const activeItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const stage of MISSION_CONTROL_STAGES) {
      for (const item of stage.items) {
        if (isMissionControlItemActive(item, location.pathname, location.search)) {
          ids.add(item.id);
        }
      }
    }
    return ids;
  }, [location.pathname, location.search]);

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(STORAGE_KEY_COLLAPSED, String(next));
      } catch {
        // ignore local storage failures
      }
      return next;
    });
  }

  return (
    <div className={`wm-nav-rail${collapsed ? " is-collapsed" : ""}`}>
      <div className="wm-nav-rail__toolbar">
        <button
          type="button"
          className="wm-nav-rail__toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="wm-nav-rail__groups" aria-label="Wingman navigation">
        {MISSION_CONTROL_STAGES.map((stage) => (
          <section
            key={stage.id}
            className={`wm-nav-rail__group wm-nav-rail__group--${stage.id}`}
            aria-label={stage.label}
          >
            <div
              className="wm-nav-rail__group-head"
              title={`${stage.label}: ${stage.description}`}
            >
              <span className="wm-nav-rail__group-index">{stage.index}</span>
              {!collapsed ? (
                <span className="wm-nav-rail__group-copy">
                  <strong>{stage.label}</strong>
                  <small>{stage.cue}</small>
                </span>
              ) : null}
            </div>

            <div className="wm-nav-rail__items">
              {stage.items.map((item) => {
                const Icon = getItemIcon(item);
                const active = activeItemIds.has(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`wm-nav-rail__item${active ? " is-active" : ""}`}
                    data-tooltip={tooltipText(item)}
                    title={tooltipText(item)}
                    aria-current={active ? "page" : undefined}
                    aria-label={tooltipText(item)}
                    onClick={() => navigate(item.to)}
                  >
                    <span className="wm-nav-rail__item-icon">
                      <Icon size={17} strokeWidth={1.85} />
                    </span>
                    {!collapsed ? <span className="wm-nav-rail__item-label">{item.title}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </div>
  );
}
