import type { WallPresetTransport, WallStartPreset } from "./videowallDecision";

/**
 * The wall picker's filter. A rep arrives knowing roughly what the wall does —
 * four windows, two sources, over the network — and the picker holds a card per
 * common wall, so narrowing happens on the facts the cards already print rather
 * than by opening them. The filter narrows only; it never reorders the walls.
 *
 * The chips are a floor, not an equality:
 *
 * - windows and sources read as "carry at least this many", because a nine-
 *   window wall can show four windows and a six-source wall can feed four;
 *   an exact match hid those walls and left a rep looking at one card;
 * - transport reads as the connection the site offers, so choosing 1GbE keeps
 *   the local walls that need no network at all and choosing 10GbE keeps every
 *   wall below it. A wall needing more than the chosen connection is the only
 *   one dropped.
 */

export type WallPresetFilter = {
  windows: number | null;
  sources: number | null;
  transport: WallPresetTransport | null;
};

export const EMPTY_WALL_PRESET_FILTER: WallPresetFilter = { windows: null, sources: null, transport: null };

export const WALL_PRESET_TRANSPORT_ORDER: WallPresetTransport[] = ["local", "1g", "10g"];

/** Local is no network, 1GbE is one step up from it, 10GbE sits above both. */
const WALL_PRESET_TRANSPORT_RANK: Record<WallPresetTransport, number> = { local: 0, "1g": 1, "10g": 2 };

export const wallPresetTransportLabels: Record<WallPresetTransport, string> = {
  local: "Local",
  "1g": "1GbE",
  "10g": "10GbE",
};

/**
 * The windows the drawing shows. A per-panel wall answers `windows: 1`, but the
 * wall itself carries one picture per panel, so its card reads as four windows
 * on a 2 × 2 array rather than as one.
 */
export function wallStartPresetWindowCount(preset: WallStartPreset): number {
  const r = preset.requirements;
  return r.layout === "independent"
    ? Math.max(1, Math.round(Number(r.columns) || 1) * Math.round(Number(r.rows) || 1))
    : Math.max(1, Math.round(Number(r.windows) || 1));
}

export function wallStartPresetSourceCount(preset: WallStartPreset): number {
  return Math.max(1, Math.round(Number(preset.requirements.sources) || 1));
}

/** Only the values the cards actually carry are offered, so no chip is a dead end. */
export function wallPresetFilterOptions(presets: WallStartPreset[]) {
  const windows = new Set<number>();
  const sources = new Set<number>();
  const transports = new Set<WallPresetTransport>();
  for (const preset of presets) {
    windows.add(wallStartPresetWindowCount(preset));
    sources.add(wallStartPresetSourceCount(preset));
    if (preset.transport) transports.add(preset.transport);
  }
  return {
    windows: [...windows].sort((a, b) => a - b),
    sources: [...sources].sort((a, b) => a - b),
    transports: WALL_PRESET_TRANSPORT_ORDER.filter((transport) => transports.has(transport)),
  };
}

export function wallStartPresetMatches(preset: WallStartPreset, filter: WallPresetFilter): boolean {
  if (filter.windows !== null && wallStartPresetWindowCount(preset) < filter.windows) return false;
  if (filter.sources !== null && wallStartPresetSourceCount(preset) < filter.sources) return false;
  if (filter.transport !== null) {
    // A wall with no reachable architecture has no bucket to compare.
    if (!preset.transport) return false;
    if (WALL_PRESET_TRANSPORT_RANK[preset.transport] > WALL_PRESET_TRANSPORT_RANK[filter.transport]) return false;
  }
  return true;
}

/** Groups keep their family heading and order; a family with no match folds away. */
export function filterWallStartPresetGroups<T extends { presets: WallStartPreset[] }>(
  groups: T[],
  filter: WallPresetFilter,
): T[] {
  return groups
    .map((group) => ({ ...group, presets: group.presets.filter((preset) => wallStartPresetMatches(preset, filter)) }))
    .filter((group) => group.presets.length > 0);
}

export function wallPresetFilterCount(groups: { presets: WallStartPreset[] }[]): number {
  return groups.reduce((total, group) => total + group.presets.length, 0);
}

export function wallPresetFilterIsSet(filter: WallPresetFilter): boolean {
  return filter.windows !== null || filter.sources !== null || filter.transport !== null;
}
