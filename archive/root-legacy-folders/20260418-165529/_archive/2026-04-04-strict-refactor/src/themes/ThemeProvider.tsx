import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "wingman-theme-mode";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode());
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };

    handler();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  const resolvedTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    document.body.setAttribute("data-theme", resolvedTheme);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, resolvedTheme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((current) => {
      const active = current === "system" ? getSystemTheme() : current;
      return active === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      toggleTheme,
    }),
    [mode, resolvedTheme, setMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}