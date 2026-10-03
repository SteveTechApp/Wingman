import type { StatusVariant } from "../../../types";
import type {
  ProjectAuditEntry,
  ProjectStage,
  ProjectStoreSnapshot,
  StoredCompareRun,
  StoredDiscoveryBrief,
  StoredIngestAnalysis,
  StoredProductSelection,
  StoredProject,
  StoredProjectProposal,
  StoredProposalDraft,
  StoredRecommendationEvidence,
  StoredRequirementRecord,
  StoredVideowallSummary,
  StoredWorkflowState,
} from "../model/projectTypes";
import { createDefaultProjectStore } from "../model/projectDefaults";
import { getActiveProjectFromSnapshot, getCurrentWorkflowProjectFromSnapshot } from "../model/projectSelectors";
import { decodeStoredProject } from "../persistence/projectCodecs";

export { projectHasWorkflowData } from "../model/projectSelectors";

export type ProjectCommandContext = {
  read(): ProjectStoreSnapshot;
  write(snapshot: ProjectStoreSnapshot): void;
  now(): string;
  createId(prefix: string): string;
  createAuditId?(): string;
};

export type WorkflowProjectInput = {
  name: string;
  owner?: string;
  stage: ProjectStage;
  status?: StatusVariant;
  resumeTo: string;
  discoveryBrief?: StoredDiscoveryBrief;
  ingest?: StoredIngestAnalysis;
  productSelections?: StoredProductSelection[];
  compareRuns?: StoredCompareRun[];
  proposal?: StoredProjectProposal;
  requirements?: StoredRequirementRecord[];
  recommendationEvidence?: StoredRecommendationEvidence;
  videowall?: StoredVideowallSummary;
  workflow: StoredWorkflowState;
  auditTrail?: ProjectAuditEntry[];
};

export function createProjectLifecycleCommands(context: ProjectCommandContext) {
  const { read, write, now, createId } = context;
  const getActiveProject = (snapshot: ProjectStoreSnapshot = read()) => getActiveProjectFromSnapshot(snapshot);
  const getCurrentWorkflowProject = (snapshot: ProjectStoreSnapshot = read()) => getCurrentWorkflowProjectFromSnapshot(snapshot);

  const upsertStoredProject = (project: StoredProject) => {
    const snapshot = read();
    const normalized = decodeStoredProject(project) ?? project;
    write({
      ...snapshot,
      projects: [normalized, ...snapshot.projects.filter((item) => item.id !== normalized.id)],
      activeProjectId: normalized.id,
    });
    return normalized;
  };

  const updateStoredProject = (projectId: string, updater: (project: StoredProject) => StoredProject) => {
    const snapshot = read();
    let updatedProject: StoredProject | null = null;
    const projects = snapshot.projects.map((project) => {
      if (project.id !== projectId) return project;
      const nextProject = updater(project);
      updatedProject = decodeStoredProject(nextProject) ?? nextProject;
      return updatedProject;
    });
    if (!updatedProject) return null;
    write({ ...snapshot, projects, activeProjectId: projectId });
    return updatedProject;
  };

  const createWorkflowProject = (input: WorkflowProjectInput): StoredProject => {
    const timestamp = now();
    return {
      id: createId("wingman-project"),
      name: input.name,
      owner: input.owner || "Wingman user",
      stage: input.stage,
      status: input.status ?? "alternative",
      updated: "Just now",
      resumeTo: input.resumeTo,
      createdAt: timestamp,
      updatedAt: timestamp,
      discoveryBrief: input.discoveryBrief,
      ingest: input.ingest,
      productSelections: input.productSelections,
      compareRuns: input.compareRuns,
      proposal: input.proposal,
      requirements: input.requirements,
      recommendationEvidence: input.recommendationEvidence,
      videowall: input.videowall,
      workflow: input.workflow,
      auditTrail: input.auditTrail,
    };
  };

  return {
    resetProjectStore() {
      const snapshot = read();
      const defaults = createDefaultProjectStore(now);
      write({
        ...defaults,
        projects: [...defaults.projects, ...snapshot.projects.filter((project) => !project.isDemo)],
        proposalDrafts: [...defaults.proposalDrafts, ...snapshot.proposalDrafts.filter((draft) => !draft.isDemo)],
        activeProjectId: snapshot.activeProjectId,
      });
    },
    copyStoredProject(projectId: string) {
      const snapshot = read();
      const project = snapshot.projects.find((item) => item.id === projectId);
      if (!project) return;
      const timestamp = now();
      const copy: StoredProject = { ...project, id: createId(project.id), name: `${project.name} Copy`, updated: "Just now", createdAt: timestamp, updatedAt: timestamp };
      const projects = [...snapshot.projects];
      projects.splice(snapshot.projects.findIndex((item) => item.id === projectId) + 1, 0, copy);
      write({ ...snapshot, projects, activeProjectId: copy.id });
    },
    deleteStoredProject(projectId: string) {
      const snapshot = read();
      write({ ...snapshot, projects: snapshot.projects.filter((project) => project.id !== projectId), activeProjectId: snapshot.activeProjectId === projectId ? null : snapshot.activeProjectId });
    },
    copyStoredProposalDraft(draftId: string) {
      const snapshot = read();
      const draft = snapshot.proposalDrafts.find((item) => item.id === draftId);
      if (!draft) return;
      const timestamp = now();
      const copy: StoredProposalDraft = { ...draft, id: createId(draft.id), name: `${draft.name} Copy`, state: "Copied draft", createdAt: timestamp, updatedAt: timestamp };
      const proposalDrafts = [...snapshot.proposalDrafts];
      proposalDrafts.splice(snapshot.proposalDrafts.findIndex((item) => item.id === draftId) + 1, 0, copy);
      write({ ...snapshot, proposalDrafts });
    },
    deleteStoredProposalDraft(draftId: string) {
      const snapshot = read();
      write({ ...snapshot, proposalDrafts: snapshot.proposalDrafts.filter((draft) => draft.id !== draftId) });
    },
    getActiveProject,
    getCurrentWorkflowProject,
    setActiveProjectId(projectId: string | null) {
      const snapshot = read();
      write({ ...snapshot, activeProjectId: projectId && snapshot.projects.some((project) => project.id === projectId) ? projectId : null });
    },
    upsertStoredProject,
    updateStoredProject,
    createWorkflowProject,
  };
}

export type ProjectLifecycleCommands = ReturnType<typeof createProjectLifecycleCommands>;
