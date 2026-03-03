
import { useEffect, useMemo, useState } from "react";
import { getAllTools, type ToolLink } from "@/data/toolCategories";

const KEY_RECENT = "wingman_recent_tools_v1";
const KEY_COUNTS = "wingman_tool_counts_v1";
const MAX = 8;

type Stored = { path: string; ts: number };
type Counts = Record<string, number>;

function safeParseRecent(raw: string | null): Stored[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => ({ path: String(x?.path ?? ""), ts: Number(x?.ts ?? 0) }))
      .filter((x) => x.path && !isNaN(x.ts));
  } catch {
    return [];
  }
}

function safeParseCounts(raw: string | null): Counts {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Counts = {};
    for (const k of Object.keys(v)) {
      const n = Number((v as any)[k]);
      if (!isNaN(n) && n >= 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

export function getUsageCounts(): Counts {
  return safeParseCounts(localStorage.getItem(KEY_COUNTS));
}

export function getUsageCount(path: string): number {
  const c = getUsageCounts();
  return Number(c[path] ?? 0) || 0;
}

export function recordToolUse(path: string) {
  const all = getAllTools();
  const exists = all.some((t) => t.path === path);
  if (!exists) return;

  // recent
  const now = Date.now();
  const cur = safeParseRecent(localStorage.getItem(KEY_RECENT));
  const next: Stored[] = [{ path, ts: now }, ...cur.filter((x) => x.path !== path)].slice(0, MAX);
  localStorage.setItem(KEY_RECENT, JSON.stringify(next));

  // counts
  const counts = safeParseCounts(localStorage.getItem(KEY_COUNTS));
  counts[path] = (Number(counts[path] ?? 0) || 0) + 1;
  localStorage.setItem(KEY_COUNTS, JSON.stringify(counts));

  // best-effort notify same-tab
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_RECENT }));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY_COUNTS }));
  } catch {
    // ignore
  }
}

export function useRecentTools(): ToolLink[] {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_RECENT || e.key === KEY_COUNTS) setTick((x) => x + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo(() => {
    const all = getAllTools();
    const map = new Map(all.map((t) => [t.path, t]));
    const cur = safeParseRecent(localStorage.getItem(KEY_RECENT));
    return cur.map((x) => map.get(x.path)).filter(Boolean) as ToolLink[];
  }, [tick]);
}

export function useUsageCounts(): Counts {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_COUNTS) setTick((x) => x + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo(() => getUsageCounts(), [tick]);
}
export function recordRecentTool(toolId: string) {
  try {
    const KEY = "wingman.recentTools.v1";
    const now = Date.now();
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(arr) ? arr : [];
    const filtered = (items as any[]).filter(x => x && x.id !== toolId);
    filtered.unshift({ id: toolId, at: now });
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 12)));
  } catch {
    // no-op
  }
}



