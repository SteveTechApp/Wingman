import * as React from "react";

export type RecentTool = { title: string; href: string; ts?: number };
export type UsageCounts = Record<string, number>;

const RECENT_KEY = "wingman.recentTools.v1";
const USAGE_KEY  = "wingman.usageCounts.v1";

/** --- internal event bus (in-memory) so hooks refresh instantly --- */
type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { for (const fn of Array.from(listeners)) { try { fn(); } catch {} } }
export function subscribeRecentTools(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value, null, 2)); } catch {}
}

/** --- non-hook APIs (can be used elsewhere) --- */
export function getRecentTools(limit = 6): RecentTool[] {
  const arr = readJson<any>(RECENT_KEY, []);
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, limit);
}

export function pushRecentTool(tool: RecentTool, limit = 12) {
  const items = getRecentTools(100).filter(t => t && t.href !== tool.href);
  items.unshift({ ...tool, ts: tool.ts ?? Date.now() });
  writeJson(RECENT_KEY, items.slice(0, limit));
  emit();
}

export function getUsageCounts(): UsageCounts {
  const obj = readJson<any>(USAGE_KEY, {});
  return (obj && typeof obj === "object") ? obj as UsageCounts : {};
}

export function bumpUsage(href: string) {
  if (!href) return;
  const counts = getUsageCounts();
  counts[href] = (counts[href] ?? 0) + 1;
  writeJson(USAGE_KEY, counts);
  emit();
}

/** --- hooks expected by src/components/tools/ToolGrid.tsx --- */
export function useRecentTools(limit = 6): RecentTool[] {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const unsub = subscribeRecentTools(() => setTick(t => t + 1));

    // also respond to storage updates from other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENT_KEY || e.key === USAGE_KEY) setTick(t => t + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => { unsub(); window.removeEventListener("storage", onStorage); };
  }, []);

  return getRecentTools(limit);
}

export function useUsageCounts(): UsageCounts {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const unsub = subscribeRecentTools(() => setTick(t => t + 1));
    const onStorage = (e: StorageEvent) => {
      if (e.key === RECENT_KEY || e.key === USAGE_KEY) setTick(t => t + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => { unsub(); window.removeEventListener("storage", onStorage); };
  }, []);

  return getUsageCounts();
}

export default {
  getRecentTools,
  pushRecentTool,
  getUsageCounts,
  bumpUsage,
  useRecentTools,
  useUsageCounts
};

