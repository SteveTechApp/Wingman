import type { ProjectStoreSnapshot, StoredProject } from "./projectTypes";

export function projectHasWorkflowData(project: StoredProject) {
  return Boolean(
    project.discoveryBrief || project.ingest || project.proposal || project.workflow
      || project.productSelections?.length || project.compareRuns?.length || project.feedback?.length,
  );
}

/**
 * A room is still in progress until its deal has an outcome. The focused home's
 * strip is headed "In progress" and prints three rooms, so it orders by this
 * rather than by recency alone: a room that was closed yesterday and touched
 * today would otherwise push open work off the only page a rep opens first.
 */
export function projectIsOpen(project: StoredProject) {
  return !project.dealOutcome;
}

export function getActiveProjectFromSnapshot(snapshot: ProjectStoreSnapshot) {
  return snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? null;
}

export function getCurrentWorkflowProjectFromSnapshot(snapshot: ProjectStoreSnapshot) {
  return getActiveProjectFromSnapshot(snapshot) ?? snapshot.projects.find(projectHasWorkflowData) ?? null;
}
