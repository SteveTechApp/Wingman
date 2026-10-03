import { UI_MODE_PRESENTATION, useUiMode } from "../data/uiMode";

/**
 * Compact mode toggle for the sidebar footer or topbar.
 * Internal guided/unguided values remain stable for stored preferences.
 */
export function UiModeToggle() {
  const { mode, setMode } = useUiMode();

  return (
    <div
      className="wm-mode-toggle"
      role="group"
      aria-label="Choose interface view"
    >
      <button type="button" className={mode === "guided" ? "is-active" : ""} aria-pressed={mode === "guided"} aria-label={`${UI_MODE_PRESENTATION.guided.label}: ${UI_MODE_PRESENTATION.guided.description}`} onClick={() => setMode("guided")}>{UI_MODE_PRESENTATION.guided.label}</button>
      <button type="button" className={mode === "unguided" ? "is-active" : ""} aria-pressed={mode === "unguided"} aria-label={`${UI_MODE_PRESENTATION.unguided.label}: ${UI_MODE_PRESENTATION.unguided.description}`} onClick={() => setMode("unguided")}>{UI_MODE_PRESENTATION.unguided.label}</button>
    </div>
  );
}
