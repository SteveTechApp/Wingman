import { wallLinkSearch } from "./wallLink";
import { wallPickSearch } from "./wallPick";
import { wallReviewPassSearch } from "./wallReviewPass";
import { wallPhysicalSize } from "./wallPhysicalSize";
import type { WallRequirements } from "./videowallOptions";
import { wallReviewStages, type WallReviewStageKey } from "./videowallWizard";

/**
 * The address of the wall on screen, pass and chosen design included.
 *
 * The builder already puts the design in the address as the rep works, so this
 * mostly composes the rules that own each half: `wallLinkSearch` writes the wall
 * (with the room's survey stripped), `wallReviewPassSearch` writes the pass,
 * dropping the opening pass so a link to the default reading stays short, and
 * `wallPickSearch` writes the architecture the rep chose over Wingman's
 * recommendation. The action exists because the address bar is not a place a
 * rep thinks to copy from, and a link sent without the wall would open the
 * recipient's own draft.
 */
export function wallShareSearch(
  search: URLSearchParams | string,
  requirements: WallRequirements,
  pass: WallReviewStageKey,
  pickId?: string | null,
): URLSearchParams {
  return wallPickSearch(wallReviewPassSearch(wallLinkSearch(search, requirements), pass), pickId);
}

/**
 * The pass in prose. The stage labels are written for a rail ("The wall"), so a
 * sentence needs them lowercased and without the article.
 */
export function wallSharePassName(pass: WallReviewStageKey) {
  const label = wallReviewStages.find((stage) => stage.key === pass)?.label ?? "The design";
  return label.replace(/^The\s+/i, "").toLowerCase();
}

/**
 * What the copied link carries, said in the builder's own words.
 *
 * A confirmation that only says "link copied" leaves the rep guessing whether
 * the survey travelled, which pass the recipient will land on, or whether the
 * design they picked over the recommendation went with it. So it names the wall
 * by its array and sources, names the pass, names the chosen design when there
 * is one, and says the measurements stay behind — the link is a brief, not a
 * recording.
 */
export function wallShareNote(
  requirements: WallRequirements,
  pass: WallReviewStageKey,
  pickTitle?: string | null,
) {
  const sources = `${requirements.sources} source${requirements.sources === 1 ? "" : "s"}`;
  const pick = pickTitle ? `, carrying ${pickTitle} as the chosen design` : "";
  return `Link copied: the ${requirements.columns} × ${requirements.rows} array with ${sources}, opening on the ${wallSharePassName(pass)} pass${pick}. Survey measurements stay with the room.`;
}

/**
 * The line that goes on the clipboard with the address.
 *
 * A bare URL pasted into chat says nothing until someone opens it — who the
 * wall is for, what the reader would be standing in front of, and which panel of
 * the review it lands on are exactly what they need before deciding to click. So
 * the copy action sends a sentence: the project the wall belongs to, the display
 * the design is built on, the panel the link opens, then the address. A wall that
 * has not been saved to a project yet says so instead of naming one.
 *
 * The display is `wallPhysicalSize(...).basis`, the same phrase the proposal's
 * mounting line quotes, so the sentence names "55 in panels" on an LCD array, the
 * pixel pitch on an LED canvas and the image size on a projection screen rather
 * than calling every wall a panel.
 */
export function wallShareClipboard({
  project,
  requirements,
  pass,
  address,
}: {
  /** The project whose wall is being shared, when it has one. */
  project?: string | null;
  /** The wall on screen, so the line names the display it is built on. */
  requirements: WallRequirements;
  pass: WallReviewStageKey;
  /** The absolute address, so the line stands alone wherever it is pasted. */
  address: string;
}) {
  const named = project?.trim();
  const subject = named ? `${named} — video wall` : "New video wall";
  return `${subject}, ${wallPhysicalSize(requirements).basis} (${wallSharePassName(pass)} panel): ${address}`;
}

/** The failure in the words the builder's status line can print. */
export const WALL_SHARE_COPY_FAILED =
  "Could not copy the link. Clipboard access is unavailable in this browser.";
