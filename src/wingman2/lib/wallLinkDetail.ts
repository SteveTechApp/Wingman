/**
 * What a surveyor writes beside a link on site, beside its measured run: the
 * housing at the display, the termination there and the point the run enters.
 * Mounting is recorded once per display in `displayMounts`, because a mount
 * belongs to the screen rather than each cable that reaches it.
 *
 * `enclosure` is the display housing — the enclosure the screen sits in — and
 * keeps that stored key because saved walls and priced installation lines are
 * filed under it. `entry` is a cell of its own: where the run enters the room
 * or the position (a wall plate, a floor box, a ceiling void). One cell used to
 * ask both questions, so a surveyor wrote one answer into it and an installer
 * had to guess the other. `entry` is last so a sheet printed before it existed
 * still imports its install cells at the same positions.
 *
 * The cells and the functions that clean and merge them live here, apart from
 * the wall's option catalogue and transport model: the command that records a
 * cell from the proposal is part of the shell's eager project core, so it can
 * read this module but not the catalogue behind it.
 */
export const WALL_LINK_DETAIL_FIELDS = ["enclosure", "termination", "entry"] as const;
export type WallLinkDetailField = (typeof WALL_LINK_DETAIL_FIELDS)[number];
/** `mount` is accepted only while reading older saved rows; current writes use displayMounts. */
export type WallLinkDetail = Partial<Record<WallLinkDetailField, string>> & { mount?: string };

/** Longest install note kept from a sheet or a typed cell, in characters. */
export const DETAIL_TEXT_LIMIT = 60;

/** One install cell as stored: single line, trimmed, capped. */
export function cleanDetailText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, DETAIL_TEXT_LIMIT);
}

/** Only the fields that hold text; empty strings are dropped rather than saved. */
export function normalizeWallLinkDetail(value: WallLinkDetail | null | undefined): WallLinkDetail {
  const detail: WallLinkDetail = {};
  for (const field of WALL_LINK_DETAIL_FIELDS) {
    const text = cleanDetailText(value?.[field]);
    if (text) detail[field] = text;
  }
  return detail;
}

export function hasWallLinkDetail(value: WallLinkDetail | null | undefined) {
  return WALL_LINK_DETAIL_FIELDS.some((field) => Boolean(cleanDetailText(value?.[field])));
}

/**
 * Merge install detail into the saved map for one link. A field present in the
 * patch replaces what was recorded, and a blank field removes it, so a rep can
 * correct a wrong housing without retyping the other cells. A link left with no
 * fields drops out of the map entirely.
 */
export function withWallLinkDetail(
  linkDetails: Record<string, WallLinkDetail> | undefined,
  id: string,
  patch: WallLinkDetail,
) {
  const merged: WallLinkDetail = { ...(linkDetails?.[id] ?? {}) };
  for (const field of WALL_LINK_DETAIL_FIELDS) {
    if (!(field in patch)) continue;
    const text = cleanDetailText(patch[field]);
    if (text) merged[field] = text;
    else delete merged[field];
  }
  const next = { ...(linkDetails ?? {}) };
  if (hasWallLinkDetail(merged)) next[id] = merged;
  else delete next[id];
  return next;
}

/** Apply one install patch to every link a folded row covers. */
export function withWallLinkDetails(
  linkDetails: Record<string, WallLinkDetail> | undefined,
  ids: string[],
  patch: WallLinkDetail,
) {
  return ids.reduce<Record<string, WallLinkDetail> | undefined>(
    (next, id) => withWallLinkDetail(next, id, patch),
    linkDetails,
  );
}

/** Read a saved map back without trusting it: unknown keys and junk are dropped. */
export function normalizeLinkDetails(value: unknown): Record<string, WallLinkDetail> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const details: Record<string, WallLinkDetail> = {};
  for (const [id, detail] of Object.entries(value as Record<string, WallLinkDetail>)) {
    const cleaned = normalizeWallLinkDetail(detail);
    if (id && hasWallLinkDetail(cleaned)) details[id] = cleaned;
  }
  return Object.keys(details).length ? details : undefined;
}

/** The display-end detail shown beside a link, including its inherited mount. */
export function wallLinkDetailText(value: WallLinkDetail | null | undefined, mount?: string) {
  return [
    ...WALL_LINK_DETAIL_FIELDS.map((field) => cleanDetailText(value?.[field])).filter(Boolean),
    mount ? `Mount: ${cleanDetailText(mount)}` : "",
  ].filter(Boolean).join(" · ");
}

