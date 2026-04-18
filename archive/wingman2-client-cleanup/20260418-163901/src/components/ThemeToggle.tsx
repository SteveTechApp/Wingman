import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/theme/ThemeProvider";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="wm-theme-toggle"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
