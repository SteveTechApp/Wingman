import { routeCatalogByKey } from "../app/routeCatalog";
import { rowAnchorId, rowIdFromAnchor } from "./anchorIds";
import { WALL_SURVEY_REVIEW_ANCHOR } from "./wallSurveyReview";
import { WALL_TRANSPORT_REVIEW_ANCHOR } from "./wallTransportReview";

/**
 * The project page's address, as one contract: `?view=<section>` names the
 * section on screen, and `#<anchor>` names a panel inside it.
 *
 * A link into a project almost never means "this project's first screen" — it
 * means "the survey rows", "the evidence trace", "the audit log". So the two
 * halves are kept together here rather than discovered by each caller: a link
 * builds its address with `projectAnchorHref`, the page reads it back with
 * `projectAnchorFromHash` and opens the section the anchor belongs to. Nothing
 * else has to know which section a panel hides in.
 *
 * Every section has a panel anchor (`projectSectionAnchor`), which is what lets
 * the same mechanism serve any panel rather than one privileged panel, and what
 * a test can hold the registry to as sections are added.
 *
 * A panel that lists rows can be addressed more precisely than the panel: a
 * hash may also name `#<panel>-row-<row id>`, which lands the reader on that
 * row. The row is not registered here — rows come from a project's own data, so
 * a registry of them would have to keep up with every save — the hash is parsed
 * against the panel it belongs to instead.
 */
export type ProjectAnchor = {
  /** DOM id and URL hash of the panel. */
  id: string;
  /** The workflow section that renders the panel. */
  section: string;
  /** What the panel is called, for a link that has to name its destination. */
  label: string;
};

/** The sections the project page shows, in the order its navigator lists them. */
export const projectDetailSections: readonly { id: string; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "confirm", label: "Requirements" },
  { id: "products", label: "Equipment" },
  { id: "decide", label: "Product fit" },
  { id: "capture", label: "Evidence" },
  { id: "conversation", label: "Answers" },
  { id: "history", label: "Saved work" },
  { id: "handoff", label: "Handoff" },
  { id: "audit", label: "Activity" },
];

/**
 * The panels a link can name, and the section each is rendered in. The first
 * entry for a section is that section's own anchor, so a section link lands on
 * the panel a reader would call the section rather than on whatever happens to
 * be listed first in markup.
 */
export const projectAnchors: readonly ProjectAnchor[] = [
  { id: "project-current-result", section: "overview", label: "Current result" },
  { id: "project-requirements", section: "confirm", label: "Requirements" },
  // The wall's transport and its survey review live in the Requirements
  // section but are their own panels: an audit entry opens the row it names,
  // not the section's top.
  { id: WALL_TRANSPORT_REVIEW_ANCHOR, section: "confirm", label: "Wall transport" },
  { id: WALL_SURVEY_REVIEW_ANCHOR, section: "confirm", label: "Site survey photo review" },
  { id: "project-equipment", section: "products", label: "Equipment" },
  { id: "project-recommendation-evidence", section: "decide", label: "Recommendation evidence" },
  { id: "project-evidence", section: "capture", label: "Evidence trace" },
  { id: "project-discovery-conversation", section: "conversation", label: "Captured answers" },
  { id: "project-saved-work", section: "history", label: "Saved comparisons" },
  { id: "project-response-versions", section: "history", label: "Response versions" },
  { id: "project-handoff", section: "handoff", label: "Response handoff" },
  { id: "project-ready-to-send", section: "handoff", label: "Ready to send?" },
  { id: "project-activity", section: "audit", label: "Audit log" },
];

/** The hash's id, decoded and stripped, or "" when the address has no hash. */
function anchorIdFromHash(hash: string) {
  const raw = String(hash ?? "").trim();
  if (!raw.startsWith("#")) return "";
  const id = raw.slice(1);
  try {
    return decodeURIComponent(id).trim();
  } catch {
    // A hash that is not valid percent-encoding is still worth comparing as it
    // was written: a reader can paste an id with a stray % in it.
    return id.trim();
  }
}

/** A hash's panel, and the row inside it when the hash names one. */
export type ProjectAnchorTarget = {
  anchor: ProjectAnchor;
  /** The row the hash names, or absent for the panel itself. */
  rowId?: string;
};

/**
 * The panel a hash names — and the row, when it names one — or null when this
 * page renders no such panel. An unknown hash is ignored rather than guessed
 * at: it may belong to another route, or to a panel a saved address used to
 * reach.
 */
export function projectAnchorTargetFromHash(hash: string): ProjectAnchorTarget | null {
  const id = anchorIdFromHash(hash);
  if (!id) return null;
  const exact = projectAnchors.find((anchor) => anchor.id === id);
  if (exact) return { anchor: exact };
  // The longest matching panel wins, so a row under a panel whose id is a
  // prefix of another panel's still resolves to the panel it was written for.
  const owner = projectAnchors
    .filter((anchor) => rowIdFromAnchor(anchor.id, id))
    .sort((a, b) => b.id.length - a.id.length)[0];
  if (!owner) return null;
  return { anchor: owner, rowId: rowIdFromAnchor(owner.id, id) };
}

/** The panel a hash names, whether or not the hash also names one of its rows. */
export function projectAnchorFromHash(hash: string): ProjectAnchor | null {
  return projectAnchorTargetFromHash(hash)?.anchor ?? null;
}

/** The panel a section opens on, which is the anchor a section link uses. */
export function projectSectionAnchor(section: string): ProjectAnchor | null {
  return projectAnchors.find((anchor) => anchor.section === section) ?? null;
}

/**
 * The address of one panel of one project: the section in the query, the panel
 * in the hash, and the row inside it when the caller names one. Null for an
 * anchor this page does not render, so a caller cannot ship a link that lands
 * somewhere else.
 */
export function projectAnchorHref(projectId: string, anchorId: string, rowId?: string | null): string | null {
  const anchor = projectAnchors.find((item) => item.id === anchorId);
  if (!anchor) return null;
  const row = String(rowId ?? "").trim();
  const hash = row ? rowAnchorId(anchor.id, encodeURIComponent(row)) : anchor.id;
  return `${routeCatalogByKey.projects.path}/${encodeURIComponent(projectId)}?view=${anchor.section}#${hash}`;
}

/**
 * A section's address: the section in the query, its own panel in the hash.
 *
 * This is what makes the project's navigator a list of destinations rather than
 * a set of buttons — a reader can open Equipment in a new tab with the project
 * already on that section, and following the link in this one lands on the
 * panel the section opens on instead of at the top of a long page. A section
 * this page does not render has no address, so a caller cannot offer a link
 * that quietly lands on the overview.
 */
export function projectSectionHref(projectId: string, section: string): string | null {
  const anchor = projectSectionAnchor(section);
  return anchor ? projectAnchorHref(projectId, anchor.id) : null;
}
