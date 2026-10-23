import { wallReviewStages, type WallReviewStageKey } from "./videowallWizard";

/**
 * The design-review pass is view state, not design evidence: a rep who was
 * reading the transport table should land back on it after saving, reloading or
 * coming back from the proposal. It is kept beside the wall draft rather than
 * inside the design, so a saved wall never claims which pass was on screen.
 */

export const WALL_REVIEW_PASS_KEY = "wingman:videowall-builder:pass:v1";

/**
 * The pass also rides in the builder's URL (`?pass=transport`), so a reload
 * reopens it and a link pasted into a message opens the same reading on another
 * machine, where the local draft and its stored pass do not exist.
 */
export const WALL_REVIEW_PASS_PARAM = "pass";

export const DEFAULT_WALL_REVIEW_PASS: WallReviewStageKey = "decision";

/** A stored pass that no longer names a stage falls back rather than sticking. */
export function wallReviewPassFrom(value: unknown): WallReviewStageKey | null {
  return wallReviewStages.some((stage) => stage.key === value)
    ? value as WallReviewStageKey
    : null;
}

/** The pass a link asks for; a hand-edited value that names no stage is ignored. */
export function wallReviewPassFromSearch(search: URLSearchParams | string): WallReviewStageKey | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return wallReviewPassFrom(params.get(WALL_REVIEW_PASS_PARAM));
}

/**
 * The builder's search params with this pass on them. The opening pass is
 * dropped rather than written, so the common link stays `/wingman/videowall`
 * instead of carrying a default nobody chose; every other param is kept.
 */
export function wallReviewPassSearch(
  search: URLSearchParams | string,
  stage: WallReviewStageKey,
): URLSearchParams {
  const next = new URLSearchParams(search);
  if (stage === DEFAULT_WALL_REVIEW_PASS) next.delete(WALL_REVIEW_PASS_PARAM);
  else next.set(WALL_REVIEW_PASS_PARAM, stage);
  return next;
}

export function readWallReviewPass(): WallReviewStageKey {
  try {
    return wallReviewPassFrom(window.localStorage.getItem(WALL_REVIEW_PASS_KEY)) ?? DEFAULT_WALL_REVIEW_PASS;
  } catch {
    return DEFAULT_WALL_REVIEW_PASS;
  }
}

export function rememberWallReviewPass(stage: WallReviewStageKey): void {
  try {
    window.localStorage.setItem(WALL_REVIEW_PASS_KEY, stage);
  } catch {
    // Storage can be unavailable in a private window; reading a pass is not
    // worth failing the click that changed it.
  }
}
