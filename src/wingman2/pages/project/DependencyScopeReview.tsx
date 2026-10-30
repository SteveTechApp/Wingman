import { updateStoredProject, type StoredProject } from "../../features/projects";
import { DependencyScopeFixes } from "../../components/DependencyScopeFixes";
import {
  DEPENDENCY_SCOPE_ANCHOR,
  dependencyUnquotedProject,
  projectDependencyPrompts,
} from "../../lib/dependencyScope";
import { ProjectPanel } from "./ProjectPanel";

/**
 * The dependency questions this room's response carries instead of quote lines.
 *
 * A `TBC-` dependency is an open question with no catalogue part behind it, so
 * it cannot be priced and the response holds on it. The gate is one place that
 * shows it; this is the other — the record is where a rep reads a saved room
 * before sending it, so sending them into the proposal wizard to answer a
 * question about this room asks them to leave the surface that holds the
 * evidence. Recording one keeps the question in the document's dependency list
 * and takes the unpriced placeholder out of the quotation.
 *
 * The panel reads the saved response rather than rebuilding the package, so it
 * names the placeholders the response actually carries: a project with no saved
 * response has nothing open and renders no panel.
 */
export function DependencyScopeReview({ project }: { project: StoredProject }) {
  const prompts = projectDependencyPrompts(project);
  if (!prompts.length) return null;

  /**
   * Applied against the stored copy rather than the one on screen, so a second
   * tab's edit is carried instead of overwritten. A project this browser no
   * longer stores takes no write, and the action says so rather than closing as
   * though the question were answered.
   */
  function record(sku: string) {
    let applied = false;
    updateStoredProject(project.id, (current) => {
      const next = dependencyUnquotedProject(current, sku);
      if (!next) return current;
      applied = true;
      return next;
    });
    return applied;
  }

  return (
    <ProjectPanel
      projectId={project.id}
      anchorId={DEPENDENCY_SCOPE_ANCHOR}
      title="Dependencies to confirm"
      subtitle="The open questions this response records as dependencies rather than quote lines, and the placeholders they leave in the quotation."
    >
      <div data-testid="dependency-scope-review">
        <DependencyScopeFixes dependencies={prompts} onRecord={record} />
      </div>
    </ProjectPanel>
  );
}
