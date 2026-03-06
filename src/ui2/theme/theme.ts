import * as React from "react";

/* __WM_THEME_TOGGLE_V2__ */
export type ThemeMode = "dark" | "light";
const KEY = "wm_theme_mode";

export function getThemeMode(): ThemeMode {
  try {
    const v = (localStorage.getItem(KEY) || "").toLowerCase();
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyThemeMode(mode: ThemeMode) {
  try {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem(KEY, mode);
  } catch {
    // ignore
  }
}

export function toggleThemeMode(): ThemeMode {
  const next: ThemeMode = getThemeMode() === "dark" ? "light" : "dark";
  applyThemeMode(next);
  return next;
}

/** Call once on app startup */
export function initThemeMode() {
  applyThemeMode(getThemeMode());
}