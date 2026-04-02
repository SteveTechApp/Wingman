import { Search, Bell, Sparkles } from "lucide-react";

export default function TopBar() {
  return (
    <header className="wm-topbar">
      <div className="wm-topbar__left">
        <div className="wm-brand">
          <div className="wm-brand__mark">W</div>
          <div className="wm-brand__copy">
            <span className="wm-brand__eyebrow">WyreStorm</span>
            <strong className="wm-brand__title">Wingman</strong>
          </div>
        </div>
      </div>

      <div className="wm-topbar__center">
        <div className="wm-topbar__search">
          <Search size={16} />
          <span>Search tools, products, workflows</span>
        </div>
      </div>

      <div className="wm-topbar__right">
        <div className="wm-topbar__status">
          <Sparkles size={14} />
          <span>Sales Engineering Workspace</span>
        </div>

        <button type="button" className="wm-topbar__iconButton" aria-label="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}