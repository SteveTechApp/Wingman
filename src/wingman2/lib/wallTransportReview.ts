import type { ProjectAuditEntry } from "../data/projectStore";
import { rowAnchorId } from "./anchorIds";
import type { WallTransportPlan } from "./videowallTransport";

/**
 * The saved wall's transport, as the project page keeps it.
 *
 * The builder's transport pass is where the runs are entered, but the project
 * record has to be readable afterwards: which links the wall has, what each was
 * allowed, what limit it had to stay under, the run recorded on site and the
 * install detail that belongs to that link. The rows are the same physical
 * links the worksheet prints (`wallSurveyRows`), so a link an audit entry names
 * is a row here, under an id an address can name too.
 */
export const WALL_TRANSPORT_REVIEW_ANCHOR = "wall-transport-review";

export function wallTransportReviewRowAnchor(linkId: string) {
  return rowAnchorId(WALL_TRANSPORT_REVIEW_ANCHOR, linkId);
}

/** The audit entries that describe a link's transport, not a decision about it. */
const WALL_TRANSPORT_ACTIONS = new Set(["wall-survey-sheet", "wall-survey-detail", "wall-survey-review"]);

export type WallTransportReviewLink = {
  /** Transport link id, so a caller can match the entry to the row's data id. */
  linkId: string;
  /** The row's own anchor id, which is what a jump scrolls to. */
  rowId: string;
  /** The clause the entry prints, when it prints one, else the link's name. */
  label: string;
  /** What the link opens, so the row is not found by the number alone. */
  title: string;
};

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The transport rows an audit entry names, in the order it names them.
 *
 * The trail records what landed, in words: a sheet import names its runs
 * (`Panel 1: 4.5 m`), the proposal's install cells name the links they filled,
 * and a review names the rows it decided. A reader checking one of those
 * numbers should not have to search the page for the link — each name resolves
 * to the transport row that shows the wall it landed on, labelled with the same
 * clause the entry prints so the two cannot be read as different facts.
 *
 * Names are matched against the plan's own labels, so an entry can only open a
 * link this wall has; an entry that names none draws nothing rather than a
 * pointer at the table it is somewhere inside.
 */
export function wallTransportReviewEntryLinks(
  entry: ProjectAuditEntry,
  plan: WallTransportPlan | null | undefined,
): WallTransportReviewLink[] {
  if (!plan || !WALL_TRANSPORT_ACTIONS.has(entry.action)) return [];
  const detail = String(entry.detail ?? "").trim();
  if (!detail) return [];

  const found = plan.allLinks.flatMap((link) => {
    const label = link.label.trim();
    if (!label) return [];
    const at = detail.search(new RegExp(`\\b${escapeRegExp(label)}\\b`));
    if (at < 0) return [];
    // A sheet entry prints each run as `Panel 1: 4.5 m`, so the clause is the
    // entry's own wording; the other entries name the link without a run.
    const clause = entry.action === "wall-survey-sheet"
      ? new RegExp(`^${escapeRegExp(label)}:\\s*([^;)]+)`).exec(detail.slice(at))?.[1]?.trim()
      : "";
    return [{
      at,
      link: {
        linkId: link.id,
        rowId: wallTransportReviewRowAnchor(link.id),
        label: clause ? `${label}: ${clause}` : label,
        title: `Opens the wall transport in Requirements at ${label}'s row, where the saved wall records that link's run and install detail.`,
      },
    }];
  });

  return found.sort((left, right) => left.at - right.at).map((item) => item.link);
}
