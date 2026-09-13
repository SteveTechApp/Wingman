import { useCallback, useEffect, useState } from "react";
import type { ProjectStoreSnapshot } from "../features/projects/model/projectTypes";
import { projectRepository } from "../features/projects/persistence/projectRepository";
import { projectSyncService } from "../features/projects/persistence/projectSyncService";
import { readProjectStore, writeProjectStore } from "../features/projects/persistence/projectRuntime";
import { createProjectLifecycleCommands, projectHasWorkflowData } from "../features/projects/commands/projectLifecycle";
import { createDiscoveryCommands } from "../features/projects/commands/discoveryCommands";
import { createRecommendationCommands } from "../features/projects/commands/recommendationCommands";
import { createCompareCommands } from "../features/projects/commands/compareCommands";
import { createProposalCommands } from "../features/projects/commands/proposalCommands";

export type * from "../features/projects/model/projectTypes";
export { projectHasWorkflowData };

export function projectBackendSyncEnabled() { return projectSyncService.enabled(); }
export { readProjectStore, writeProjectStore };
export async function hydrateProjectStoreFromBackend() { return projectSyncService.hydrate(); }
export function resetProjectBackendSyncSessionState() { projectSyncService.resetSession(); }

const commandContext = {
  read: readProjectStore,
  write: writeProjectStore,
  now: () => new Date().toISOString(),
  createId: (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createAuditId: () => `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
};
const lifecycle = createProjectLifecycleCommands(commandContext);
const discovery = createDiscoveryCommands(commandContext, lifecycle);
const recommendations = createRecommendationCommands(commandContext, lifecycle);
const compare = createCompareCommands(commandContext, lifecycle);
const proposals = createProposalCommands(commandContext, lifecycle);

export const { resetProjectStore, copyStoredProject, deleteStoredProject, copyStoredProposalDraft, deleteStoredProposalDraft, getActiveProject, getCurrentWorkflowProject, setActiveProjectId, upsertStoredProject, updateStoredProject } = lifecycle;
export function clearActiveProject() { setActiveProjectId(null); }
export const { saveDiscoveryBriefToProject, productSelectionsFromVideowallSummary, saveVideowallToProject, saveIngestAnalysisToProject } = discovery;
export const { saveRecommendationFeedback, saveProductSelectionToProject, saveProductSelectionToCurrentProject, removeProductSelectionFromProject, removeProductSelectionFromCurrentProject, createProjectForProductSelection, saveRecommendationEvidenceToProject } = recommendations;
export const { deleteCompareRunFromProject, saveCompareRunToProject } = compare;
export const { saveProjectProposalToProject, restoreProposalVersion, saveProposalVisualAsset, saveDealOutcome, saveProjectRequirementsToProject } = proposals;

export function getProjectSyncStatus(snapshot: ProjectStoreSnapshot = readProjectStore()) { return projectSyncService.status(snapshot); }

export function useProjectStore() {
  const [snapshot, setSnapshot] = useState<ProjectStoreSnapshot>(() => readProjectStore());
  useEffect(() => {
    function refresh() { setSnapshot(readProjectStore()); }
    hydrateProjectStoreFromBackend().catch((error) => console.error("[wingman] projectStore: hydrateProjectStoreFromBackend failed", error));
    return projectRepository.subscribe(refresh);
  }, []);
  const copyProject = useCallback((projectId: string) => copyStoredProject(projectId), []);
  const deleteProject = useCallback((projectId: string) => deleteStoredProject(projectId), []);
  const copyProposalDraft = useCallback((draftId: string) => copyStoredProposalDraft(draftId), []);
  const deleteProposalDraft = useCallback((draftId: string) => deleteStoredProposalDraft(draftId), []);
  const resetStore = useCallback(() => resetProjectStore(), []);
  return { projects: snapshot.projects, proposalDrafts: snapshot.proposalDrafts, activeProjectId: snapshot.activeProjectId ?? null, activeProject: getActiveProject(snapshot), syncStatus: getProjectSyncStatus(snapshot), copyProject, deleteProject, copyProposalDraft, deleteProposalDraft, resetStore };
}
