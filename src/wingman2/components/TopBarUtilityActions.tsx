import { LifeBuoy, Settings } from "lucide-react";
import TopBarAudienceSelector from "./TopBarAudienceSelector";

export default function TopBarUtilityActions() {
  return (
    <nav className="wm-fixed-utility-dock" aria-label="Wingman persistent actions">
      <TopBarAudienceSelector />

      <a className="wm-fixed-dock-action" href="/wingman/support">
        <span className="wm-fixed-dock-icon" aria-hidden="true">
          <LifeBuoy size={15} />
        </span>
        <span className="wm-fixed-dock-copy">
          <small>Support</small>
          <strong>Expert handoff</strong>
        </span>
      </a>

      <a className="wm-fixed-dock-action wm-fixed-dock-settings" href="/wingman/profile">
        <span className="wm-fixed-dock-icon" aria-hidden="true">
          <Settings size={15} />
        </span>
        <span className="wm-fixed-dock-copy">
          <small>App</small>
          <strong>Settings</strong>
        </span>
      </a>
    </nav>
  );
}