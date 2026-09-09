import { useUiMode } from "../data/uiMode";

/**
 * Compact mode toggle for the sidebar footer or topbar.
 * "Guided" = compass icon, streamlined experience.
 * "Full" = grid icon, all features visible.
 */
export function UiModeToggle() {
  const { mode, setMode } = useUiMode();

  return (
    <div
      className="wm-mode-toggle"
      role="group"
      aria-label="Choose interface view"
    >
      <button type="button" className={mode === "guided" ? "is-active" : ""} aria-pressed={mode === "guided"} onClick={() => setMode("guided")}>Guided</button>
      <button type="button" className={mode === "unguided" ? "is-active" : ""} aria-pressed={mode === "unguided"} onClick={() => setMode("unguided")}>Full</button>
    </div>
  );
}
