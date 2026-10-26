import { wallStartPresets, type WallStartPreset } from "./videowallDecision";

/**
 * A rep's own shortlist: the curated walls their rooms keep coming back to,
 * pinned so the guided first step leads with them.
 *
 * The curated list is Wingman's idea of the walls a rep starts from — one per
 * job, with a family's order decided by the brief list. A rep quoting the same
 * three rooms a month has a different few, so a pin is stored per browser,
 * beside the wall draft and the starting points, rather than in the catalogue.
 *
 * A pin is a key, not a brief: pinning a wall never copies its answers, so the
 * card keeps following the shipped brief. That is also why an unknown key is
 * dropped on the way in — a renamed or retired wall must not leave a pin that
 * reorders a band around nothing.
 */
export const PINNED_WALL_PRESETS_KEY = "wingman:videowall-pinned-presets:v1";
/** How many walls a rep can pin; newest first, against the guided step's six. */
export const PINNED_WALL_PRESET_LIMIT = 6;

function shippedKeys(): Set<string> {
  return new Set(wallStartPresets.map((preset) => preset.key));
}

/** The stored pins that still name a shipped wall, newest first. */
export function pinnedWallPresetKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINNED_WALL_PRESETS_KEY);
    if (!raw) return [];
    return normalizePinnedKeys(JSON.parse(raw));
  } catch {
    return [];
  }
}

function normalizePinnedKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const shipped = shippedKeys();
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const key = entry.trim();
    if (!key || !shipped.has(key) || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
    if (keys.length >= PINNED_WALL_PRESET_LIMIT) break;
  }
  return keys;
}

// One in-memory copy, so the picker and the pin control share it. The snapshot
// keeps its identity between writes because useSyncExternalStore re-renders
// forever if a reader returns a new array every time.
let cache: string[] | null = null;
const listeners = new Set<() => void>();

/** Subscribe to pin changes; the shape a React store expects. */
export function subscribePinnedWallPresets(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pinnedWallPresetsSnapshot(): string[] {
  if (cache === null) cache = pinnedWallPresetKeys();
  return cache;
}

/** Drop the in-memory copy so the next read comes from storage. */
export function resetPinnedWallPresetsCache() {
  cache = null;
  listeners.forEach((listener) => listener());
}

function publish(next: string[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PINNED_WALL_PRESETS_KEY, JSON.stringify(next));
    } catch {
      // Storage may be disabled; the pin still holds for this visit.
    }
  }
  listeners.forEach((listener) => listener());
  return next;
}

/**
 * Pin a wall to the rep's shortlist, or unpin it. A key that names no shipped
 * wall changes nothing, so a stale control cannot invent a pin.
 *
 * The newest pin goes to the front: the wall a rep just reached for is the one
 * they are most likely to reach for next.
 */
export function togglePinnedWallPreset(key: string): string[] {
  const current = pinnedWallPresetsSnapshot();
  if (current.includes(key)) return publish(current.filter((entry) => entry !== key));
  if (!shippedKeys().has(key)) return current;
  return publish([key, ...current].slice(0, PINNED_WALL_PRESET_LIMIT));
}

/**
 * The catalogue with the rep's pins at the head of their family, in pin order.
 *
 * It reorders rows and hides nothing: a family keeps its band and its count,
 * and the wall a rep pinned is still the one card it always was — the pin only
 * says which rows lead.
 */
export function wallStartPresetGroupsWithPins<T extends { presets: WallStartPreset[] }>(
  groups: T[],
  pinnedKeys: readonly string[],
): T[] {
  if (!pinnedKeys.length) return groups;
  const rank = new Map(pinnedKeys.map((key, index) => [key, index]));
  return groups.map((group) => {
    const pinned = group.presets
      .filter((preset) => rank.has(preset.key))
      .sort((a, b) => rank.get(a.key)! - rank.get(b.key)!);
    if (!pinned.length) return group;
    return { ...group, presets: [...pinned, ...group.presets.filter((preset) => !rank.has(preset.key))] };
  });
}
