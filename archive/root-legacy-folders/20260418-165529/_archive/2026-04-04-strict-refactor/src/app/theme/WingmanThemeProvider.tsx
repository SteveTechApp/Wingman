import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextType = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "wingman-theme-mode";
const LEGACY_STORAGE_KEY = "wingman-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const primary = window.localStorage.getItem(STORAGE_KEY);
  if (isThemeMode(primary)) return primary;

  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (isThemeMode(legacy)) return legacy;

  return "system";
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const resolved = mode === "system" ? getSystemTheme() : mode;

  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-mode", mode);
  root.style.colorScheme = resolved;
}

function persistTheme(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, mode);
  window.localStorage.setItem(LEGACY_STORAGE_KEY, mode);
}

export function WingmanThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());

  function setTheme(mode: ThemeMode) {
    setThemeState(mode);
    persistTheme(mode);
    applyTheme(mode);
  }

  useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    media.addListener(handler);
    return () => media.removeListener(handler);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within WingmanThemeProvider");
  return ctx;
}
