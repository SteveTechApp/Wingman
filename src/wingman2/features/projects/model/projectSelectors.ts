import type { ProjectStoreSnapshot, StoredProject } from "./projectTypes";

export function projectHasWorkflowData(project: StoredProject) {
  return Boolean(
    project.discoveryBrief || project.ingest || project.proposal || project.workflow
      || project.productSelections?.length || project.compareRuns?.length || project.feedback?.length,
  );
}

export function getActiveProjectFromSnapshot(snapshot: ProjectStoreSnapshot) {
  return snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? null;
}

export function getCurrentWorkflowProjectFromSnapshot(snapshot: ProjectStoreSnapshot) {
  return getActiveProjectFromSnapshot(snapshot) ?? snapshot.projects.find(projectHasWorkflowData) ?? null;
}
