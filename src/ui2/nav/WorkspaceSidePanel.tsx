import * as React from "react";
/* __WM_WORKSPACE_NAV_V2__
   Workspace-centric side panel (context + stage + pinned + recent).
   NOT the primary tool list (that lives in MissionControlNav).
*/

import { Link, useLocation } from "react-router-dom";
import {
  SALES_STAGES,
  getStage,
  setStage,
  getPinnedTools,
  getRecent,
  addRecent,
  type SalesStage,
} from "./workspaceNavModel";

type Props = {
  showInternalToggle?: boolean;
  onToggleInternal?: () => void;
  internalEnabled?: boolean;
  currentProjectName?: string;
};

function chipClass(active: boolean) {
  return [
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
    active ? "bg-white/15 text-white" : "bg-white/5 text-white/70 hover:bg-white/10",
  ].join(" ");
}

export default function WorkspaceSidePanel(props: Props) {
  const loc = useLocation();
  const [stage, setStageState] = React.useState<SalesStage>(() => getStage());
  const [pinned] = React.useState(() => getPinnedTools());
  const [recent, setRecent] = React.useState(() => getRecent());

  React.useEffect(() => {
    const p = loc.pathname;
    const label =
      p.startsWith("/app/tools/room") ? "Room Wizard" :
      p.startsWith("/app/tools/proposal") ? "Proposal Builder" :
      p.startsWith("/app/tools/competitor") ? "Competitor Compare" :
      p.startsWith("/app/tools/catalog") ? "Product Catalog" :
      p.startsWith("/app/tools/videowall") ? "Video Wall Planner" :
      p.startsWith("/app/tools/training") ? "Training Hub" :
      p.startsWith("/app/tools/guru") ? "Guru" :
      p.startsWith("/app/survey-import") ? "Survey Import" :
      p.startsWith("/app/projects") ? "Projects" :
      p.startsWith("/app/dashboard") ? "Dashboard" :
      "";

    if (label) {
      addRecent(label, p);
      setRecent(getRecent());
    }
  }, [loc.pathname]);

  function onStageClick(s: SalesStage) {
    setStageState(s);
    setStage(s);
  }

  return (
    <aside className="wm-sidepanel">
      <div className="wm-sidepanel__section">
        <div className="wm-sidepanel__title">Workspace</div>

        <nav className="wm-sidepanel__nav">
          <Link className={loc.pathname.startsWith("/app/dashboard") ? "wm-navitem is-active" : "wm-navitem"} to="/app/dashboard">
            Dashboard
          </Link>
          <Link className={loc.pathname.startsWith("/app/projects") ? "wm-navitem is-active" : "wm-navitem"} to="/app/projects">
            Projects
          </Link>
          <Link className={loc.pathname.startsWith("/app/survey-import") ? "wm-navitem is-active" : "wm-navitem"} to="/app/survey-import">
            Survey Import
          </Link>
        </nav>

        <div className="wm-sidepanel__card">
          <div className="wm-sidepanel__cardRow">
            <div className="wm-sidepanel__muted">Current project</div>
            <div className="wm-sidepanel__value">{props.currentProjectName ?? "None selected"}</div>
          </div>
        </div>

        <div className="wm-sidepanel__subtitle">Sales stage</div>
        <div className="wm-sidepanel__chips">
          {SALES_STAGES.map((s) => (
            <button key={s} type="button" className={chipClass(s === stage)} onClick={() => onStageClick(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="wm-sidepanel__section">
        <div className="wm-sidepanel__title">Pinned tools</div>
        <div className="wm-sidepanel__muted">Quick launch (not a full duplicate list).</div>
        <div className="wm-sidepanel__list">
          {pinned.map((t) => (
            <Link key={t.id} className="wm-linkrow" to={t.path}>
              <span className="wm-linkrow__label">{t.label}</span>
              <span className="wm-linkrow__tag">{t.group}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="wm-sidepanel__section">
        <div className="wm-sidepanel__title">Recent</div>
        <div className="wm-sidepanel__list">
          {recent.length === 0 ? <div className="wm-sidepanel__muted">No recent activity yet.</div> : null}
          {recent.map((r) => (
            <Link key={r.path} className="wm-linkrow" to={r.path}>
              <span className="wm-linkrow__label">{r.label}</span>
              <span className="wm-linkrow__tag">{new Date(r.ts).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      </div>

      {props.showInternalToggle ? (
        <div className="wm-sidepanel__section">
          <div className="wm-sidepanel__title">Internal</div>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={props.onToggleInternal}>
            {props.internalEnabled ? "Internal: On" : "Internal: Off"}
          </button>
        </div>
      ) : null}
    </aside>
  );
}