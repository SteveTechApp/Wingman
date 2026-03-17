import * as React from "react";
import type { ThemeMode } from "./theme";
import { applyTheme, getSavedTheme, saveTheme, startThemeSync } from "./theme";

function next(mode: ThemeMode): ThemeMode {
  // cycle: system -> dark -> light -> system
  if (mode === "system") return "dark";
  if (mode === "dark") return "light";
  return "system";
}

export default function ThemeToggle() {
  const [mode, setMode] = React.useState<ThemeMode>(() => {
    try { return getSavedTheme(); } catch { return "system"; }
  });

  const label = React.useMemo(() => {
    if (mode === "system") return "Theme: Auto";
    if (mode === "dark") return "Theme: Dark";
    return "Theme: Light";
  }, [mode]);

  React.useEffect(() => {
    try {
      saveTheme(mode);
      const stop = startThemeSync(mode);
      return () => stop();
    } catch {
      // ignore
      applyTheme("dark");
    }
  }, [mode]);

  return (
    <button
      type="button"
      className="wm-btn wm-btn-quiet"
      onClick={() => setMode(m => next(m))}
      title="Cycle theme: Auto –€ â€™ Dark –€ â€™ Light"
      aria-label={label}
    >
      {label}
    </button>
  );
}