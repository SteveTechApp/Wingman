import type { StoredProject } from "../data/projectStore";
import { PagedItems } from "./PagedItems";
import { ProjectGalleryCard } from "./ProjectGalleryCard";
import type { ProjectsTeamFilter } from "./ProjectsFilterBar";

/** The sentence an empty gallery prints, chosen by the tab the rep is reading. */
function emptyGalleryText(teamFilter: ProjectsTeamFilter) {
  if (teamFilter === "mine") return "No projects found for you. Create a new project or switch to Team view.";
  if (teamFilter === "team") return "No team projects found. Team members need to create projects in a shared workspace.";
  return "No active projects are currently listed. Use Reset sample store to restore the starter examples.";
}

type ProjectGalleryProps = {
  /** Every project in the store, for the saved-wall status that reads a card's siblings. */
  projects: StoredProject[];
  /** What the tabs, search and survey switch left to show. */
  visibleProjects: StoredProject[];
  activeProjectId: string | null;
  currentUserId?: string | null;
  migratedWalls: number;
  /** The stored room templates, so a card can say which room already has one. */
  templates: readonly { id: string; name: string; sourceProjectId?: string }[];
  teamFilter: ProjectsTeamFilter;
  surveyAttentionOnly: boolean;
  /** Changes with the filters, so paging returns to the first page. */
  resetKey: string;
  getMemberName: (ownerId: string | undefined) => string;
  getMemberInitials: (ownerId: string | undefined) => string;
  onCopy: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  /** Leaves the survey queue from the empty state it produced. */
  onShowAllProjects: () => void;
};

/**
 * The projects gallery: the paged cards, and the empty state that explains the
 * view rather than the store.
 *
 * The page decides which projects are visible and what the tabs count; this
 * component only says what that view looks like, so a filtered-to-nothing list
 * names the filter that emptied it instead of claiming the workspace is empty.
 * The owner's name and initials arrive as resolvers because `useTeamMembers`
 * fetches once for the page — a card that looked them up would fetch per row.
 */
export function ProjectGallery({
  projects,
  visibleProjects,
  activeProjectId,
  currentUserId,
  migratedWalls,
  templates,
  teamFilter,
  surveyAttentionOnly,
  resetKey,
  getMemberName,
  getMemberInitials,
  onCopy,
  onDelete,
  onShowAllProjects,
}: ProjectGalleryProps) {
  return (
    <PagedItems items={visibleProjects} resetKey={resetKey}>
      {(pageItems) => (
        <div className="wm-project-gallery">
          {visibleProjects.length ? (
            pageItems.map((project) => (
              <ProjectGalleryCard
                key={project.id}
                project={project}
                projects={projects}
                activeProjectId={activeProjectId}
                currentUserId={currentUserId}
                ownerName={project.ownerId ? getMemberName(project.ownerId) : project.owner}
                ownerInitials={getMemberInitials(project.ownerId)}
                migratedWalls={migratedWalls}
                templates={templates}
                onCopy={onCopy}
                onDelete={onDelete}
              />
            ))
          ) : surveyAttentionOnly ? (
            <article className="wm-project-gallery-empty">
              <div>
                No projects in this view need survey attention. A survey lands here when a photo review clears a row, or when the last reading is old enough to re-confirm.
                <button type="button" className="wm-project-row-link underline" onClick={onShowAllProjects}>
                  Show all projects
                </button>
              </div>
            </article>
          ) : (
            <article className="wm-project-gallery-empty">
              <div>{emptyGalleryText(teamFilter)}</div>
            </article>
          )}
        </div>
      )}
    </PagedItems>
  );
}
