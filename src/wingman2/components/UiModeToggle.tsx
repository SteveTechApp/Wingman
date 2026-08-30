import { Compass, LayoutGrid } from "lucide-react";
import { useUiMode } from "../data/uiMode";

/**
 * Compact mode toggle for the sidebar footer or topbar.
 * "Guided" = compass icon, streamlined experience.
 * "Full" = grid icon, all features visible.
 */
export function UiModeToggle() {
  const { mode, toggleMode, isGuided } = useUiMode();

  return (
    <button
      type="button"
      className="wm-mode-toggle"
      onClick={toggleMode}
      title={
        isGuided
          ? "Switch to full view — all features and admin tools"
          : "Switch to guided view — simplified for new users"
      }
      aria-label={`Currently ${mode} mode. Click to switch to ${isGuided ? "full" : "guided"} mode.`}
    >
      {isGuided ? (
        <>
          <Compass size={14} />
          <span>Guided</span>
        </>
      ) : (
        <>
          <LayoutGrid size={14} />
          <span>Full</span>
        </>
      )}
    </button>
  );
}
