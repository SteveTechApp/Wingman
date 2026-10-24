import { routeCatalogByKey } from "../app/routeCatalog";

/**
 * A builder address that names the project whose wall it opens.
 *
 * A plain builder link reopens this browser's draft, whichever project wrote
 * it. That is the right answer for "the wall I was just editing", but a project
 * page offering to carry on with *this* wall would then hand the rep a
 * different room's design — so the address says which project it means and the
 * builder honours it.
 */
export const WALL_PROJECT_PARAM = "project";

/** The project a builder address names, or null when it names none. */
export function wallResumeProject(search: { get(name: string): string | null }): string | null {
  const value = (search.get(WALL_PROJECT_PARAM) ?? "").trim();
  return value || null;
}

/** The builder address that reopens one project's own wall. */
export function wallResumeUrl(projectId: string | null | undefined): string {
  const id = (projectId ?? "").trim();
  return id
    ? `${routeCatalogByKey.videowall.path}?${WALL_PROJECT_PARAM}=${encodeURIComponent(id)}`
    : routeCatalogByKey.videowall.path;
}
