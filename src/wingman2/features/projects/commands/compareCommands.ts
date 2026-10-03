import { routeCatalogByKey } from "../../../app/routeCatalog";
import type { StoredCompareRun } from "../model/projectTypes";
import type { ProjectCommandContext, ProjectLifecycleCommands } from "./projectLifecycle";

export function createCompareCommands(context: ProjectCommandContext, lifecycle: ProjectLifecycleCommands) {
  const { read, now, createId } = context;
  const { getActiveProject, getCurrentWorkflowProject, upsertStoredProject, createWorkflowProject } = lifecycle;
  return {
    deleteCompareRunFromProject(runId: string, options: { requireExistingProject?: boolean } = {}) {
      const snapshot = read();
      const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
      if (!existing?.compareRuns?.some((run) => run.id === runId)) return null;
      return upsertStoredProject({ ...existing, compareRuns: existing.compareRuns.filter((run) => run.id !== runId), updated: "Just now", updatedAt: now() });
    },
    saveCompareRunToProject(run: Omit<StoredCompareRun, "id" | "createdAt"> & { id?: string; createdAt?: string }, options: { requireExistingProject?: boolean } = {}) {
      const timestamp = run.createdAt ?? now();
      const snapshot = read();
      const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
      if (!existing && options.requireExistingProject) return null;
      const comparisonKey = `${String(run.competitorBrand ?? "").trim().toLowerCase()}::${String(run.competitorSku ?? "").trim().toUpperCase()}`;
      const priorVersions = (existing?.compareRuns ?? []).filter((item) => `${String(item.competitorBrand ?? "").trim().toLowerCase()}::${String(item.competitorSku ?? "").trim().toUpperCase()}` === comparisonKey);
      const compareRun: StoredCompareRun = { id: run.id ?? createId("compare-run"), createdAt: timestamp, version: run.version ?? (priorVersions.reduce((max, item) => Math.max(max, item.version ?? 0), 0) + 1), competitorBrand: run.competitorBrand, competitorSku: run.competitorSku, competitorName: run.competitorName, wyrestormSku: run.wyrestormSku, wyrestormTitle: run.wyrestormTitle, mode: run.mode, summary: run.summary, warnings: run.warnings ?? [], matchScore: run.matchScore, confidence: run.confidence, matchType: run.matchType, wyrestormUrl: run.wyrestormUrl, evidence: run.evidence ?? [], source: run.source ?? "Competitor Compare" };
      const workflow = { source: "Competitor Compare", lastStep: "Competitor lookup saved", nextRoute: routeCatalogByKey.projects.path, updatedAt: timestamp };
      return upsertStoredProject(existing ? { ...existing, stage: "Competitor Compare", status: "alternative", updated: "Just now", resumeTo: routeCatalogByKey.compare.path, updatedAt: timestamp, compareRuns: [compareRun, ...(existing.compareRuns ?? [])].slice(0, 10), workflow } : createWorkflowProject({ name: `${compareRun.competitorSku || "Competitor"} Comparison`, stage: "Competitor Compare", status: "alternative", resumeTo: routeCatalogByKey.compare.path, compareRuns: [compareRun], workflow }));
    },
  };
}
