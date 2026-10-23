import type { WallOption } from "./videowallOptions";

/**
 * A shared wall can carry the architecture the sender chose. Wingman's
 * recommendation is a starting point, not a decision: a rep who reads the field
 * and picks another design is sending *that* wall, so the pick rides in the link
 * beside the answers.
 *
 * It is kept out of the wall token on purpose. The token is the brief — what the
 * wall has to do — while the pick is which catalogue design answers it, and the
 * recipient's own catalogue decides whether the id still names a design that
 * fits. An id that no longer fits is dropped rather than shown, so a link can
 * never open a design the builder would rule out.
 */
export const WALL_PICK_PARAM = "pick";

/** The design a link asks for; blank or missing names the recommendation. */
export function wallPickFromSearch(search: URLSearchParams | string): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const value = params.get(WALL_PICK_PARAM)?.trim();
  return value ? value : null;
}

/**
 * The design a carried pick names, or null when these answers do not reach it.
 * This is the one rule for honouring a pick — the sender's link and the
 * recipient's own selection are read the same way, so a link cannot select a
 * design the picker would refuse.
 */
export function wallPickedOption(options: WallOption[], id: string | null | undefined): WallOption | null {
  if (!id) return null;
  return options.find((option) => option.id === id && option.blockers.length === 0) ?? null;
}

/**
 * The builder's search params with this design on them. The recommendation is
 * the absence of a pick rather than an id, so a link to Wingman's own answer
 * stays short and keeps following the catalogue; every other param is kept.
 */
export function wallPickSearch(
  search: URLSearchParams | string,
  optionId: string | null | undefined,
): URLSearchParams {
  const next = new URLSearchParams(search);
  if (optionId) next.set(WALL_PICK_PARAM, optionId);
  else next.delete(WALL_PICK_PARAM);
  return next;
}
