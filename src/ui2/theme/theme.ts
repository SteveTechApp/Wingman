import {
  getSavedTheme,
  saveTheme,
  resolveTheme,
  applyTheme,
  startThemeSync,
} from "@/app/theme/theme";

export type ThemeMode = "light" | "dark" | "system";

export {
  getSavedTheme,
  saveTheme,
  resolveTheme,
  applyTheme,
  startThemeSync,
};

export function getThemeMode(): "light" | "dark" {
  return resolveTheme(getSavedTheme());
}

export function applyThemeMode(mode: "light" | "dark") {
  saveTheme(mode);
  applyTheme(mode);
}

export function toggleThemeMode(): "light" | "dark" {
  const next = getThemeMode() === "dark" ? "light" : "dark";
  applyThemeMode(next);
  return next;
}

export function initThemeMode() {
  applyTheme(getSavedTheme());
}