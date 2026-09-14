import { useCallback, useEffect, useState } from "react";
import type { ProjectStoreSnapshot } from "./model/projectTypes";
import { projectRepository } from "./persistence/projectRepository";
import { projectSyncService } from "./persistence/projectSyncService";
import { readProjectStore, writeProjectStore } from "./persistence/projectRuntime";
import { createProjectLifecycleCommands, projectHasWorkflowData } from "./commands/projectLifecycle";
import { createDiscoveryCommands } from "./commands/discoveryCommands";
import { createRecommendationCommands } from "./commands/recommendationCommands";
import { createCompareCommands } from "./commands/compareCommands";
import { createProposalCommands } from "./commands/proposalCommands";
export { projectHasWorkflowData, readProjectStore, writeProjectStore };
export function projectBackendSyncEnabled() { return projectSyncService.enabled(); }
export async function hydrateProjectStoreFromBackend() { return projectSyncService.hydrate(); }
export function resetProjectBackendSyncSessionState() { projectSyncService.resetSession(); }
export const projectCommandContext = { read: readProjectStore, write: writeProjectStore, now: () => new Date().toISOString(), createId: (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createAuditId: () => `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
export const projectLifecycle = createProjectLifecycleCommands(projectCommandContext);
const discovery = createDiscoveryCommands(projectCommandContext, projectLifecycle); const recommendations = createRecommendationCommands(projectCommandContext, projectLifecycle); const compare = createCompareCommands(projectCommandContext, projectLifecycle); const proposals = createProposalCommands(projectCommandContext, projectLifecycle);
export const { resetProjectStore, copyStoredProject, deleteStoredProject, copyStoredProposalDraft, deleteStoredProposalDraft, getActiveProject, getCurrentWorkflowProject, setActiveProjectId, upsertStoredProject, updateStoredProject } = projectLifecycle;
export function clearActiveProject() { setActiveProjectId(null); }
export const { saveDiscoveryBriefToProject, productSelectionsFromVideowallSummary, saveVideowallToProject, saveIngestAnalysisToProject } = discovery;
export const { saveRecommendationFeedback, saveProductSelectionToProject, saveProductSelectionToCurrentProject, removeProductSelectionFromProject, removeProductSelectionFromCurrentProject, createProjectForProductSelection, saveRecommendationEvidenceToProject } = recommendations;
export const { deleteCompareRunFromProject, saveCompareRunToProject } = compare;
export const { saveProjectProposalToProject, restoreProposalVersion, saveProposalVisualAsset, saveDealOutcome, saveProjectRequirementsToProject } = proposals;
export function getProjectSyncStatus(snapshot: ProjectStoreSnapshot = readProjectStore()) { return projectSyncService.status(snapshot); }
export function useProjectStore() { const [snapshot, setSnapshot] = useState<ProjectStoreSnapshot>(() => readProjectStore()); useEffect(() => { const refresh = () => setSnapshot(readProjectStore()); hydrateProjectStoreFromBackend().catch((error) => console.error("[wingman] projectStore: hydrateProjectStoreFromBackend failed", error)); return projectRepository.subscribe(refresh); }, []); const copyProject = useCallback((id: string) => copyStoredProject(id), []); const deleteProject = useCallback((id: string) => deleteStoredProject(id), []); const copyProposalDraft = useCallback((id: string) => copyStoredProposalDraft(id), []); const deleteProposalDraft = useCallback((id: string) => deleteStoredProposalDraft(id), []); const resetStore = useCallback(() => resetProjectStore(), []); return { projects: snapshot.projects, proposalDrafts: snapshot.proposalDrafts, activeProjectId: snapshot.activeProjectId ?? null, activeProject: getActiveProject(snapshot), syncStatus: getProjectSyncStatus(snapshot), copyProject, deleteProject, copyProposalDraft, deleteProposalDraft, resetStore }; }
