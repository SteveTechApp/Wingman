import type { ProjectStoreSnapshot } from "../model/projectTypes";
import { getCurrentWorkflowProjectFromSnapshot } from "../model/projectSelectors";
import { projectRepository } from "./projectRepository";
import { projectSyncService } from "./projectSyncService";

export function readProjectStore(): ProjectStoreSnapshot { return projectRepository.read(); }

export function writeProjectStore(snapshot: ProjectStoreSnapshot, options: { syncBackend?: boolean } = {}) {
  const previousStore = readProjectStore();
  const store = projectSyncService.normalizeForStorage(snapshot);
  if (!projectRepository.write(store)) return;
  if (options.syncBackend !== false) projectSyncService.schedule(store, previousStore);
}

export function getCurrentWorkflowProject(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return getCurrentWorkflowProjectFromSnapshot(snapshot);
}

export function clearActiveProject() {
  const snapshot = readProjectStore();
  writeProjectStore({ ...snapshot, activeProjectId: null });
}
