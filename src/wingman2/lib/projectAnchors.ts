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
 * the same mechanism serve any panel rather than one privileged panel — and it
 * is the only section list there is: `projectDetailSections` is derived from
 * the registry below, so a section and the panel that renders it are one entry,
 * not two lists to keep in step.
 *
 * A panel that lists rows can be addressed more precisely than the panel: a
 * hash may also name `#<panel>-row-<row id>`, which lands the reader on that
 * row. The row is not registered here — rows come from a project's own data, so
 * a registry of them would have to keep up with every save — the hash is parsed
 * against the panel it belongs to instead.
 */
/**
 * The panels a link can name, and the section each is rendered in. The first
 * entry for a section is that section's own anchor, so a section link lands on
 * the panel a reader would call the section rather than on whatever happens to
 * be listed first in markup.
 *
 * Adding a panel in a new section is what adds the section: there is no second
 * list to update, and none to forget. The ids stay literal here rather than
 * widening to `string`, because they are where the page's two id types come
 * from — see `ProjectSectionId` below.
 */
const projectAnchorEntries = [
  { id: "project-current-result", section: "overview", label: "Current result", sectionLabel: "Overview" },
  { id: "project-requirements", section: "confirm", label: "Requirements" },
  // The wall's transport and its survey review live in the Requirements
  // section but are their own panels: an audit entry opens the row it names,
  // not the section's top.
  { id: WALL_TRANSPORT_REVIEW_ANCHOR, section: "confirm", label: "Wall transport" },
  { id: WALL_SURVEY_REVIEW_ANCHOR, section: "confirm", label: "Site survey photo review" },
  { id: "project-equipment", section: "products", label: "Equipment" },
  { id: "project-recommendation-evidence", section: "decide", label: "Recommendation evidence", sectionLabel: "Product fit" },
  { id: "project-evidence", section: "capture", label: "Evidence trace", sectionLabel: "Evidence" },
  { id: "project-discovery-conversation", section: "conversation", label: "Captured answers", sectionLabel: "Answers" },
  { id: "project-saved-work", section: "history", label: "Saved comparisons", sectionLabel: "Saved work" },
  { id: "project-response-versions", section: "history", label: "Response versions" },
  { id: "project-handoff", section: "handoff", label: "Response handoff", sectionLabel: "Handoff" },
  { id: "project-ready-to-send", section: "handoff", label: "Ready to send?" },
  { id: "project-activity", section: "audit", label: "Audit log", sectionLabel: "Activity" },
] as const;

/** The id of a panel a link can name. */
export type ProjectAnchorId = (typeof projectAnchorEntries)[number]["id"];

/**
 * The id of a section the project page can be on.
 *
 * This is derived from the registry rather than declared, so it cannot list a
 * section the page has no panel for: `?view=<section>` — read back as this type
 * by `useWorkflowPage` — and every `activeSection === "…"` branch are checked
 * against the panels that actually render. A branch naming a section nobody
 * renders is a type error instead of a screen a reader never reaches.
 */
export type ProjectSectionId = (typeof projectAnchorEntries)[number]["section"];

export type ProjectAnchor = {
  /** DOM id and URL hash of the panel. */
  id: ProjectAnchorId;
  /** The workflow section that renders the panel. */
  section: ProjectSectionId;
  /** What the panel is called, for a link that has to name its destination. */
  label: string;
  /**
   * What the navigator calls the section, on the panel the section opens on.
   * Only where the two readings differ: most sections are named exactly like the
   * panel they open on, and the navigator falls back to the panel's own name.
   */
  sectionLabel?: string;
};

/** The registry itself, at the id types above rather than the wider `string`. */
export const projectAnchors: readonly ProjectAnchor[] = projectAnchorEntries;

/**
 * One section of the project page, as the page's navigator lists it. Generic so
 * `projectSectionsFrom` can be exercised with a registry of its own, while the
 * page's own list is `ProjectSectionId`.
 */
export type ProjectSection<Id extends string = ProjectSectionId> = { id: Id; label: string };

/**
 * The sections a registry names, in the order its panels first name them — one
 * entry per `section`, labelled by the panel that opens it.
 *
 * This is the rule the project page's navigator reads, and it is total: a
 * section exists because a panel says it does, so the two cannot diverge.
 */
export function projectSectionsFrom<Id extends string>(
  anchors: readonly { id: string; section: Id; label: string; sectionLabel?: string }[],
): readonly ProjectSection<Id>[] {
  const sections: ProjectSection<Id>[] = [];
  for (const anchor of anchors) {
    if (sections.some((section) => section.id === anchor.section)) continue;
    sections.push({ id: anchor.section, label: anchor.sectionLabel ?? anchor.label });
  }
  return sections;
}

/** The sections the project page shows, in the order its navigator lists them. */
export const projectDetailSections: readonly ProjectSection[] = projectSectionsFrom(projectAnchors);

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
export function projectSectionAnchor(section: ProjectSectionId): ProjectAnchor | null {
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
export function projectSectionHref(projectId: string, section: ProjectSectionId): string | null {
  const anchor = projectSectionAnchor(section);
  return anchor ? projectAnchorHref(projectId, anchor.id) : null;
}
