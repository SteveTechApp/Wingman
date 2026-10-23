/**
 * How an anchor names one row of its panel: `#<panel>-row-<row id>`.
 *
 * The project page's address names a panel in the hash, and a panel that lists
 * rows can be more specific than that — a survey flag that says "2 rows cleared"
 * means the cleared rows, not the table they sit in. The rule lives here because
 * two modules write it and the page reads it back: the project anchor registry
 * resolves the hash, the survey review names its table rows with it, and a
 * second copy of the separator would be a link that lands nowhere.
 */
export const ROW_ANCHOR_SEPARATOR = "-row-";

/** The DOM id (and hash) of one row inside a panel. */
export function rowAnchorId(panelId: string, rowId: string) {
  return `${panelId}${ROW_ANCHOR_SEPARATOR}${rowId}`;
}

/** The row id a panel-row anchor names, or "" when the id is not one. */
export function rowIdFromAnchor(panelId: string, anchorId: string) {
  const prefix = `${panelId}${ROW_ANCHOR_SEPARATOR}`;
  if (!anchorId.startsWith(prefix)) return "";
  return anchorId.slice(prefix.length).trim();
}
