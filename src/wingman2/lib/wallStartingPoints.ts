import {
  defaultWallRequirements,
  validateWallRequirements,
  wallApplications,
  type WallRequirements,
} from "./videowallOptions";
import {
  wallStartPresetFrom,
  wallStartPresetGroups,
  type WallStartPreset,
} from "./videowallDecision";

/**
 * A rep's own starting point: the wall they just adjusted, kept so the same
 * brief is one card beside the shipped presets next time.
 *
 * A starting point is a brief, not a design. The survey measurements, the
 * install cells and the last photo review belong to one site, so saving strips
 * them: two walls that differ only in those fields are the same starting point,
 * and a card must never re-apply another room's measured runs.
 */
export const SAVED_WALL_STARTING_POINTS_KEY = "wingman:videowall-starting-points:v1";
/** How many of a rep's own walls the picker keeps, newest first. */
export const SAVED_WALL_STARTING_POINT_LIMIT = 6;

const SAVED_DETAIL = "Your own answers — picking it sets the whole brief.";
const LAYOUTS = ["single", "split", "quad", "nine", "custom", "independent"];
const LOCATIONS = ["local", "distributed"];
const SOURCE_RESOLUTIONS = ["1080p", "4k30", "4k60"];
const NETWORKS = ["any", "none", "1g", "10g"];
const ORIENTATIONS = ["portrait", "landscape"];
const MAPPINGS = ["fit", "fill"];

/**
 * The brief a starting point keeps: the answers, without the site's survey.
 *
 * Both the save path and the load path go through this shape, so a card's key
 * cannot change between the moment it was saved and the next visit. The survey
 * fields become empty maps rather than absent keys for the same reason.
 */
export function wallStartingPointBrief(requirements: WallRequirements): WallRequirements {
  const {
    measuredRuns: _measuredRuns,
    linkDetails: _linkDetails,
    displayMounts: _displayMounts,
    surveyReview: _surveyReview,
    // The overlap is what the installers measured on that screen, like a cable
    // run: another room's blend does not travel with the brief.
    blendOverlapMm: _blendOverlapMm,
    ...answers
  } = requirements;
  const brief: WallRequirements = { ...answers, measuredRuns: {}, linkDetails: {}, displayMounts: {} };
  // The placement mode only exists on a custom layout; a wall that moved to a
  // fixed layout must not keep the floating mode it had before, or the same
  // brief would key differently after a reload.
  brief.customMode = brief.layout === "custom" && brief.customMode === "floating" ? "floating" : "fixed";
  return brief;
}

/** What the card is called before the rep has renamed it. */
export function wallStartingPointName(requirements: WallRequirements): string {
  const wall = requirements.application === "led"
    ? `LED ${requirements.ledCanvasWidth} × ${requirements.ledCanvasHeight}`
    : requirements.application === "projection"
      ? `${requirements.panelDiagonalInches ?? 55} in screen`
      : `LCD ${requirements.columns} × ${requirements.rows}`;
  const content = requirements.layout === "independent"
    ? "one source per panel"
    : `${requirements.windows} window${requirements.windows === 1 ? "" : "s"}`;
  return `${wall} · ${content}`;
}

/**
 * A stable key for a brief, so the same wall cannot be saved twice and a card
 * keeps its id across reloads.
 */
export function wallStartingPointKey(requirements: WallRequirements): string {
  const text = stable(wallStartingPointBrief(requirements));
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `saved-${hash.toString(36)}`;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * The card for a brief. The lead label and the family are read from the
 * decision engine, so a saved card groups and reads exactly like a shipped one.
 */
export function wallStartingPoint(requirements: WallRequirements): WallStartPreset {
  const brief = wallStartingPointBrief(requirements);
  return wallStartPresetFrom(brief, {
    key: wallStartingPointKey(brief),
    label: wallStartingPointName(brief),
    detail: SAVED_DETAIL,
  });
}

/** The rep's saved walls, newest first; nothing usable means no cards. */
export function savedWallStartingPoints(): WallStartPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_WALL_STARTING_POINTS_KEY);
    if (!raw) return [];
    return normalizeSavedStartingPoints(JSON.parse(raw));
  } catch {
    return [];
  }
}

// One in-memory copy of the list, so the picker and the save action share it.
// The snapshot keeps its identity between writes because useSyncExternalStore
// re-renders forever if a reader returns a new array every time.
let cache: WallStartPreset[] | null = null;
const listeners = new Set<() => void>();

/** Subscribe to saved-wall changes; the shape a React store expects. */
export function subscribeWallStartingPoints(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function wallStartingPointsSnapshot(): WallStartPreset[] {
  if (cache === null) cache = savedWallStartingPoints();
  return cache;
}

/** Drop the in-memory copy so the next read comes from storage. */
export function resetWallStartingPointsCache() {
  cache = null;
  listeners.forEach((listener) => listener());
}

function normalizeSavedStartingPoints(value: unknown): WallStartPreset[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const presets: WallStartPreset[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const requirements = startingPointRequirements(record.requirements);
    if (!requirements) continue;
    const preset = wallStartingPoint(requirements);
    // One card per brief: a stored duplicate is the same starting point.
    if (seen.has(preset.key)) continue;
    seen.add(preset.key);
    const label = typeof record.label === "string" ? record.label.trim().slice(0, 60) : "";
    presets.push(label ? { ...preset, label } : preset);
    if (presets.length >= SAVED_WALL_STARTING_POINT_LIMIT) break;
  }
  return presets;
}

/**
 * A stored brief has to be one the builder could have produced: an unknown
 * application or a failed limit would otherwise become a card that cannot be
 * picked back into a design. Exported because a card a design started from is
 * stored the same way, and both reads have to accept exactly the same shapes.
 */
export function startingPointRequirements(value: unknown): WallRequirements | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!wallApplications.some((application) => application.value === record.application)) return null;
  if (!LAYOUTS.includes(String(record.layout))) return null;
  if (!LOCATIONS.includes(String(record.sourceLocation))) return null;
  if (!SOURCE_RESOLUTIONS.includes(String(record.sourceResolution))) return null;
  if (!NETWORKS.includes(String(record.network))) return null;
  if (!ORIENTATIONS.includes(String(record.orientation))) return null;
  if (record.customMode !== undefined && record.customMode !== "fixed" && record.customMode !== "floating") return null;
  if (record.displayResolution !== undefined && record.displayResolution !== "1080p" && record.displayResolution !== "4k") return null;
  if (record.displayCustom !== undefined && typeof record.displayCustom !== "boolean") return null;
  if (record.sourceCustom !== undefined && typeof record.sourceCustom !== "boolean") return null;
  if (record.mapping !== undefined && !MAPPINGS.includes(String(record.mapping))) return null;
  const requirements: WallRequirements = { ...defaultWallRequirements, ...(record as Partial<WallRequirements>) };
  if (validateWallRequirements(requirements).length) return null;
  return wallStartingPointBrief(requirements);
}

function write(presets: WallStartPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SAVED_WALL_STARTING_POINTS_KEY,
      JSON.stringify(presets.map((preset) => ({ label: preset.label, requirements: wallStartingPointBrief(preset.requirements) }))),
    );
  } catch {
    // Storage may be disabled; the card still appears for this visit.
  }
}

function publish(next: WallStartPreset[]) {
  cache = next;
  write(next);
  listeners.forEach((listener) => listener());
  return next;
}

/** Save the wall the rep is looking at and return the list the picker shows. */
export function saveWallStartingPoint(requirements: WallRequirements): WallStartPreset[] {
  const preset = wallStartingPoint(requirements);
  return publish([preset, ...wallStartingPointsSnapshot().filter((entry) => entry.key !== preset.key)]
    .slice(0, SAVED_WALL_STARTING_POINT_LIMIT));
}

/** Forget one saved wall; the shipped presets are untouched. */
export function removeWallStartingPoint(key: string): WallStartPreset[] {
  return publish(wallStartingPointsSnapshot().filter((preset) => preset.key !== key));
}

/**
 * The picker's groups with the rep's own walls first in their family, so a
 * saved wall reads beside the shipped walls it was adjusted from.
 */
export function wallStartPresetGroupsWithSaved(saved: WallStartPreset[]) {
  return wallStartPresetGroups.map((group) => {
    const mine = saved.filter((preset) => preset.family === group.family);
    return mine.length ? { ...group, presets: [...mine, ...group.presets] } : group;
  });
}
