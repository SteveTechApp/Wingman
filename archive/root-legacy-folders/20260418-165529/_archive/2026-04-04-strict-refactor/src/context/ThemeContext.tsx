import * as React from "react";
import { wingmanActions } from "@/state/useWingman";
import { createStrictContext } from "./createStrictContext";
import type { ThemeMode } from "@/utils/types/api";

export type ResolvedTheme = Exclude<ThemeMode, "system">;

const STORAGE_KEY = "wingman-theme-mode";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const DEFAULT_THEME_MODE: ThemeMode = "dark";
const DEFAULT_RESOLVED_THEME: ResolvedTheme = "dark";

type ThemeContextType = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const [ThemeContext, useThemeContext] = createStrictContext<ThemeContextType>("Theme");

export { useThemeContext };

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return DEFAULT_RESOLVED_THEME;
  }

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_MODE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === "light" ? "light" : (mode === "system" ? DEFAULT_RESOLVED_THEME : mode);
}

function applyThemeToDocument(mode: ThemeMode, resolvedTheme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.setAttribute("data-theme", resolvedTheme);
  root.setAttribute("data-theme-mode", mode);
  root.style.colorScheme = resolvedTheme;
}

function persistThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore local storage failures and keep the current session theme.
  }
}

export function ThemeProvider(props: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>(() => readStoredThemeMode());
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme = React.useMemo(
    () => resolveTheme(mode, systemTheme),
    [mode, systemTheme],
  );

  React.useEffect(() => {
    applyThemeToDocument(mode, resolvedTheme);
    persistThemeMode(mode);
    wingmanActions.updateUserProfile({ theme: mode });
  }, [mode, resolvedTheme]);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia(DARK_MEDIA_QUERY);
    const updateSystemTheme = (matchesDark: boolean) => {
      React.startTransition(() => {
        setSystemTheme(matchesDark ? "dark" : "light");
      });
    };

    updateSystemTheme(media.matches);

    if (typeof media.addEventListener === "function") {
      const handleChange = (event: MediaQueryListEvent) => updateSystemTheme(event.matches);
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    const legacyHandleChange = (event: MediaQueryListEvent) => updateSystemTheme(event.matches);
    media.addListener(legacyHandleChange);
    return () => media.removeListener(legacyHandleChange);
  }, []);

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    React.startTransition(() => {
      setModeState(nextMode);
    });
  }, []);

  const toggleTheme = React.useCallback(() => {
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setMode]);

  const value = React.useMemo<ThemeContextType>(() => ({
    mode,
    resolvedTheme,
    setMode,
    toggleTheme,
  }), [mode, resolvedTheme, setMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
}

