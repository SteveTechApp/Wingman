import { useTheme } from "./WingmanThemeProvider";
import type { ThemeMode } from "./WingmanThemeProvider";

export default function WingmanThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="wm-theme-toggle">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeMode)}
        aria-label="Theme mode"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
