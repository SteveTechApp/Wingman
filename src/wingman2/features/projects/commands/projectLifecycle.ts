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

  /**
   * Replace a project where it already sits, leaving the active project alone.
   *
   * An approval decision is about the proposal under review, not about opening
   * the project: deciding one from the queue must not choose what the rep works
   * on next, and must not re-rank the gallery by moving the row to the front.
   * upsertStoredProject does both, which is right for a save that comes from the
   * project itself and wrong for a decision that lands from another screen.
   */
  const replaceStoredProject = (project: StoredProject) => {
    const snapshot = read();
    const normalized = decodeStoredProject(project) ?? project;
    const known = snapshot.projects.some((item) => item.id === normalized.id);
    write({
      ...snapshot,
      // A project the store has never seen is appended rather than promoted, so
      // an approval cannot rearrange a gallery it is not part of.
      projects: known
        ? snapshot.projects.map((item) => (item.id === normalized.id ? normalized : item))
        : [...snapshot.projects, normalized],
    });
    return normalized;
  };

  /**
   * Replace one project where it sits and hand the caller the saved copy.
   *
   * The return type is written out rather than inferred: the update used to be
   * collected in a variable assigned from inside the `map`, and a value set by a
   * callback is not narrowed, so the inferred result read as `null` and a caller
   * that checked it could not read the project it had just saved.
   */
  const updateStoredProject = (
    projectId: string,
    updater: (project: StoredProject) => StoredProject,
  ): StoredProject | null => {
    const snapshot = read();
    const index = snapshot.projects.findIndex((project) => project.id === projectId);
    if (index < 0) return null;
    const nextProject = updater(snapshot.projects[index]);
    const updatedProject = decodeStoredProject(nextProject) ?? nextProject;
    write({
      ...snapshot,
      projects: snapshot.projects.map((project) => (project.id === projectId ? updatedProject : project)),
      activeProjectId: projectId,
    });
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
      const id = createId(project.id);
      const copy: StoredProject = {
        ...project,
        id,
        name: `${project.name} Copy`,
        updated: "Just now",
        createdAt: timestamp,
        updatedAt: timestamp,
        // The copied wall belongs to the copy, not to the project it came from.
        videowall: project.videowall ? { ...project.videowall, projectId: id } : undefined,
      };
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
    replaceStoredProject,
    updateStoredProject,
    createWorkflowProject,
  };
}

export type ProjectLifecycleCommands = ReturnType<typeof createProjectLifecycleCommands>;
