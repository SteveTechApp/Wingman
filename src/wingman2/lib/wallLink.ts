import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";
import { startingPointRequirements, wallStartingPointBrief } from "./wallStartingPoints";

/**
 * A builder address names the wall it shows. `?wall=<token>` carries the
 * answers, so a link pasted into a message opens that design on a machine that
 * has never seen it, instead of the recipient's own draft. The review pass
 * (`?pass=transport`) rides beside it, which is what makes a shared pass open
 * the pass *and* the wall it belongs to.
 *
 * The link is a brief, not a recording: `wallStartingPointBrief` strips the
 * survey (measured runs, install cells, the photo review, the surveyed blend),
 * so a link can never carry one room's measurements into another. Those stay on
 * the machine that took them and on the saved wall that quoted them.
 */
export const WALL_LINK_PARAM = "wall";

/** A token from a later build is ignored rather than half-read. */
const WALL_LINK_VERSION = "1";
/** Longer than any brief this builder can produce; anything longer is dropped. */
const WALL_LINK_MAX_LENGTH = 2000;
/** The fields the brief always strips, so they are never encoded. */
const SURVEY_KEYS = new Set<string>(["measuredRuns", "linkDetails", "displayMounts", "surveyReview", "blendOverlapMm"]);

function base64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): string | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Only the answers that differ from the builder's defaults, so the common wall
 * stays short and the token is a statement about the design rather than a dump
 * of every field. Keys are sorted, so the same wall always encodes the same
 * way — the address is rewritten on every edit and a reordered object must not
 * look like a different wall.
 */
function briefDiff(requirements: WallRequirements): Record<string, unknown> {
  const brief = wallStartingPointBrief(requirements);
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(brief).sort()) {
    if (SURVEY_KEYS.has(key)) continue;
    const value = brief[key as keyof WallRequirements];
    if (JSON.stringify(value) !== JSON.stringify(defaultWallRequirements[key as keyof WallRequirements])) {
      diff[key] = value;
    }
  }
  return diff;
}

/** The token that names this wall in a link. */
export function wallLinkToken(requirements: WallRequirements): string {
  return `${WALL_LINK_VERSION}.${base64Url(JSON.stringify(briefDiff(requirements)))}`;
}

/**
 * The wall a token names, or null when it names none this builder could show.
 * The payload is merged onto the defaults and then read through the same rule a
 * saved starting point uses, so a hand-edited token cannot open an impossible
 * design — and cannot carry survey fields the link never promised.
 */
export function wallLinkBrief(token: string | null | undefined): WallRequirements | null {
  if (!token || token.length > WALL_LINK_MAX_LENGTH) return null;
  const split = token.indexOf(".");
  if (split <= 0) return null;
  if (token.slice(0, split) !== WALL_LINK_VERSION) return null;
  const json = fromBase64Url(token.slice(split + 1));
  if (!json) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return startingPointRequirements({ ...defaultWallRequirements, ...(payload as Partial<WallRequirements>) });
}

/** The wall a link asks for; a value that names no wall is ignored. */
export function wallLinkFromSearch(search: URLSearchParams | string): WallRequirements | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return wallLinkBrief(params.get(WALL_LINK_PARAM));
}

/**
 * The builder's search params with this wall on them. The wall is always
 * written — including the default one, which is the whole point: a link that
 * dropped it would open whatever the recipient happened to be working on. Every
 * other param, the pass included, is kept.
 */
export function wallLinkSearch(
  search: URLSearchParams | string,
  requirements: WallRequirements,
): URLSearchParams {
  const next = new URLSearchParams(search);
  next.set(WALL_LINK_PARAM, wallLinkToken(requirements));
  return next;
}
