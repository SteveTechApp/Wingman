import * as React from "react";

function resolveSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  try {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "dark";
  }
}

function setThemeDom(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Primary selector used by wingman-theme.css
  root.dataset.theme = theme;

  // Back-compat selectors (in case older CSS expects these)
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("theme-dark", theme === "dark");
  root.classList.toggle("theme-light", theme === "light");
}
export type ThemeMode = "light" | "dark" | "system";

const KEY = "wingman.theme";

export function getSavedTheme(): ThemeMode {
  const v = (localStorage.getItem(KEY) || "system") as ThemeMode;
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function saveTheme(mode: ThemeMode) {
  localStorage.setItem(KEY, mode);
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  // system
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(mode: ThemeMode) {
  const theme: "dark" | "light" =
    mode === "system" ? resolveSystemTheme() : (mode as "dark" | "light");

  setThemeDom(theme);
}

export function startThemeSync(mode: ThemeMode) {
  applyTheme(mode);
  if (mode !== "system") return () => {};

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => applyTheme("system");

  // Safari support
  if ((mq as any).addEventListener) (mq as any).addEventListener("change", handler);
  else (mq as any).addListener(handler);

  return () => {
    if ((mq as any).removeEventListener) (mq as any).removeEventListener("change", handler);
    else (mq as any).removeListener(handler);
  };
}