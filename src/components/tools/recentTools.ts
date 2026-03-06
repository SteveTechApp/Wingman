import * as React from "react";

export type ToolLink = {
  path: string;
  label: string;
};

const STORAGE_KEY = "wm_recent_tools_v1";

function titleFromPath(path: string): string {
  const last = path.split("/").filter(Boolean).pop() || path;
  return last
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normaliseTool(path: string): ToolLink | undefined {
  if (!path || typeof path !== "string") return undefined;
  if (!path.startsWith("/")) return undefined;

  return {
    path,
    label: titleFromPath(path),
  };
}

function readRecent(): ToolLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const rec = item as Record<string, unknown>;
        const path = typeof rec.path === "string" ? rec.path : "";
        const label = typeof rec.label === "string" ? rec.label : titleFromPath(path);
        return normaliseTool(path) ? { path, label } : undefined;
      })
      .filter((v): v is ToolLink => !!v);
  } catch {
    return [];
  }
}

function writeRecent(items: ToolLink[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items, null, 2));
  } catch {}
}

export function getAllTools(): ToolLink[] {
  return readRecent();
}

export function getToolByPath(path: string): ToolLink | undefined {
  const stored = readRecent().find((tool) => tool.path === path);
  return stored ?? normaliseTool(path);
}

export function noteRecentTool(path: string): void {
  const tool = normaliseTool(path);
  if (!tool) return;

  const next = [tool, ...readRecent().filter((t) => t.path !== tool.path)].slice(0, 8);
  writeRecent(next);
}

export function getRecentTools(limit = 6): ToolLink[] {
  return readRecent().slice(0, limit);
}

export function addRecentTool(path: string): void {
  noteRecentTool(path);
}

export function clearRecentTools(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}