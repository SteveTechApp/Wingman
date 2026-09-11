import { useCallback, useEffect, useState } from "react";
import { normaliseProjectTopology, type ProjectTopology } from "../lib/projectTopology";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  normalizeMultiSkuCompetitorAnalysis,
  type MultiSkuCompetitorAnalysis,
} from "../lib/documentIngest/multiSkuCompetitorIngest";
import type { StatusVariant } from "../types";
import type { DiscoveryEvidence, ProjectEvidenceFoundation } from "../types/productTruth";
import { STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE } from "../lib/strandedBriefQuoteSafety";

export type * from "../features/projects/model/projectTypes";
import type {
  DiscoveryConversationItem,
  LocalProjectStorageMode,
  ProjectAuditEntry,
  ProjectStage,
  ProjectStorageMode,
  RemoteProjectStorageMode,
  ProjectStoreSnapshot,
  ProposalVisualAsset,
  StoredCompareRun,
  StoredDesignProposalRevision,
  StoredDiscoveryBrief,
  StoredGovernedDependency,
  StoredIngestAnalysis,
  StoredIngestVisualAttachment,
  StoredProductFamilyScore,
  StoredProductSelection,
  StoredProject,
  StoredProjectProposal,
  StoredProjectSyncConflict,
  StoredProjectSyncStatus,
  StoredProposalBomRow,
  StoredProposalDraft,
  StoredProposalVisualBlock,
  StoredQuoteSafetyStatus,
  StoredRecommendationEvidence,
  StoredRecommendationFeedback,
  StoredRequirementRecord,
  StoredVideowallSummary,
  StoredWorkflowState,
} from "../features/projects/model/projectTypes";
import { createDefaultProjectStore } from "../features/projects/model/projectDefaults";
import {
  decodeProjectStore,
  decodeStoredProject,
  normalizeProductSelections,
  normalizeRecommendationEvidence,
  normalizeRequirementRecords,
  stringValue,
} from "../features/projects/persistence/projectCodecs";
import { projectRepository } from "../features/projects/persistence/projectRepository";
import { projectSyncService } from "../features/projects/persistence/projectSyncService";
const projectStages: ProjectStage[] = [
  "Discovery",
  "Competitor Compare",
  "Proposal Builder",
  "Recommendations",
  "Templates",
  "Support",
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStore(): ProjectStoreSnapshot {
  return createDefaultProjectStore(nowIso);
}
export function projectBackendSyncEnabled() {
  return projectSyncService.enabled();
}

const normalizeStoredProject = decodeStoredProject;

export function readProjectStore(): ProjectStoreSnapshot {
  return projectRepository.read();
}

export function writeProjectStore(snapshot: ProjectStoreSnapshot, options: { syncBackend?: boolean } = {}) {
  const previousStore = readProjectStore();
  const store = projectSyncService.normalizeForStorage(snapshot);
  if (!projectRepository.write(store)) return;
  if (options.syncBackend !== false) projectSyncService.schedule(store, previousStore);
}

export async function hydrateProjectStoreFromBackend() {
  return projectSyncService.hydrate();
}

export function resetProjectBackendSyncSessionState() {
  projectSyncService.resetSession();
}

/**
 * Restores the built-in starter examples to their pristine defaults without
 * touching any real project or proposal draft. Only entries tagged
 * `isDemo: true` are ever replaced - anything a user actually created is
 * preserved untouched, no matter how stale or edited the demo rows have become.
 */
export function resetProjectStore() {
  const snapshot = readProjectStore();
  const defaults = defaultStore();
  const realProjects = snapshot.projects.filter((project) => !project.isDemo);
  const realDrafts = snapshot.proposalDrafts.filter((draft) => !draft.isDemo);

  writeProjectStore({
    ...defaults,
    projects: [...defaults.projects, ...realProjects],
    proposalDrafts: [...defaults.proposalDrafts, ...realDrafts],
    activeProjectId: snapshot.activeProjectId,
  });
}

export function copyStoredProject(projectId: string) {
  const snapshot = readProjectStore();
  const project = snapshot.projects.find((item) => item.id === projectId);

  if (!project) {
    return;
  }

  const copy: StoredProject = {
    ...project,
    id: createId(project.id),
    name: `${project.name} Copy`,
    updated: "Just now",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.projects.findIndex((item) => item.id === projectId);
  const projects = [...snapshot.projects];
  projects.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: copy.id,
  });
}

export function deleteStoredProject(projectId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    projects: snapshot.projects.filter((project) => project.id !== projectId),
    activeProjectId: snapshot.activeProjectId === projectId ? null : snapshot.activeProjectId,
  });
}

export function copyStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();
  const draft = snapshot.proposalDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return;
  }

  const copy: StoredProposalDraft = {
    ...draft,
    id: createId(draft.id),
    name: `${draft.name} Copy`,
    state: "Copied draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const index = snapshot.proposalDrafts.findIndex((item) => item.id === draftId);
  const proposalDrafts = [...snapshot.proposalDrafts];
  proposalDrafts.splice(index + 1, 0, copy);

  writeProjectStore({
    ...snapshot,
    proposalDrafts,
  });
}

export function deleteStoredProposalDraft(draftId: string) {
  const snapshot = readProjectStore();

  writeProjectStore({
    ...snapshot,
    proposalDrafts: snapshot.proposalDrafts.filter((draft) => draft.id !== draftId),
  });
}

export function getProjectSyncStatus(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return projectSyncService.status(snapshot);
}

export function saveRecommendationFeedback(
  feedback: Omit<StoredRecommendationFeedback, "id" | "createdAt"> & { id?: string; createdAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing) return null;

  const timestamp = feedback.createdAt ?? nowIso();
  const nextFeedback: StoredRecommendationFeedback = {
    id: feedback.id ?? createId("feedback"),
    createdAt: timestamp,
    scope: feedback.scope,
    rating: feedback.rating,
    label: feedback.label,
    note: feedback.note,
    sku: feedback.sku,
  };

  return upsertStoredProject({
    ...existing,
    updated: "Just now",
    updatedAt: timestamp,
    feedback: [nextFeedback, ...(existing.feedback ?? [])].slice(0, 40),
    workflow: {
      source: "Sales Feedback",
      lastStep: `Feedback captured: ${feedback.label}`,
      nextRoute: existing.resumeTo,
      updatedAt: timestamp,
    },
  });
}

export function projectHasWorkflowData(project: StoredProject) {
  return Boolean(
    project.discoveryBrief ||
      project.ingest ||
      project.proposal ||
      project.workflow ||
      project.productSelections?.length ||
      project.compareRuns?.length ||
      project.feedback?.length,
  );
}

export function getActiveProject(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? null;
}

export function getCurrentWorkflowProject(snapshot: ProjectStoreSnapshot = readProjectStore()) {
  return getActiveProject(snapshot) ?? snapshot.projects.find(projectHasWorkflowData) ?? null;
}

export function setActiveProjectId(projectId: string | null) {
  const snapshot = readProjectStore();
  const activeProjectId = projectId && snapshot.projects.some((project) => project.id === projectId) ? projectId : null;
  writeProjectStore({
    ...snapshot,
    activeProjectId,
  });
}

export function clearActiveProject() {
  setActiveProjectId(null);
}

export function upsertStoredProject(project: StoredProject) {
  const snapshot = readProjectStore();
  const normalized = normalizeStoredProject(project) ?? project;
  const projects = [normalized, ...snapshot.projects.filter((item) => item.id !== normalized.id)];

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: normalized.id,
  });

  return normalized;
}

export function updateStoredProject(projectId: string, updater: (project: StoredProject) => StoredProject) {
  const snapshot = readProjectStore();
  let updatedProject: StoredProject | null = null;
  const projects = snapshot.projects.map((project) => {
    if (project.id !== projectId) return project;
    const nextProject = updater(project);
    updatedProject = normalizeStoredProject(nextProject) ?? nextProject;
    return updatedProject;
  });

  if (!updatedProject) return null;

  writeProjectStore({
    ...snapshot,
    projects,
    activeProjectId: projectId,
  });

  return updatedProject;
}

function createWorkflowProject(input: {
  name: string;
  owner?: string;
  stage: ProjectStage;
  status?: StatusVariant;
  resumeTo: string;
  discoveryBrief?: StoredDiscoveryBrief;
  ingest?: StoredIngestAnalysis;
  productSelections?: StoredProductSelection[];
  compareRuns?: StoredCompareRun[];
  compareHistoryView?: { search?: string; filter?: string; sort?: string };
  proposal?: StoredProjectProposal;
  requirements?: StoredRequirementRecord[];
  recommendationEvidence?: StoredRecommendationEvidence;
  videowall?: StoredVideowallSummary;
  workflow: StoredWorkflowState;
  auditTrail?: ProjectAuditEntry[];
}) {
  const timestamp = nowIso();

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
  } satisfies StoredProject;
}

function projectNameFromDiscoveryBrief(brief: StoredDiscoveryBrief) {
  const roomModel = brief.roomModel ?? {};
  const customer = stringValue(roomModel.customer || roomModel.customerName || roomModel.companyName);
  const roomType = stringValue(roomModel.roomType, "Discovery");
  return customer ? `${customer} ${roomType}` : `${roomType} Project`;
}

function projectNameFromIngest(files: string[], intelligence?: MultiSkuCompetitorAnalysis) {
  if (intelligence?.documentType === "multi_sku_competitor_list") {
    const account = intelligence.accountCustomer !== "Not confirmed"
      ? intelligence.accountCustomer
      : intelligence.manufacturer !== "Not confirmed"
        ? intelligence.manufacturer
        : "Competitor";
    return `${account} Multi-SKU Opportunity`;
  }
  if (files.length === 1) return `${files[0]} Requirements`;
  return files.length > 1 ? `${files[0]} + ${files.length - 1} file(s)` : "Imported Requirements";
}

export function saveDiscoveryBriefToProject(brief: StoredDiscoveryBrief, projectId?: string | null) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = projectId === undefined
    ? getCurrentWorkflowProject(snapshot)
    : projectId
      ? snapshot.projects.find((project) => project.id === projectId) ?? null
      : null;
  const workflow: StoredWorkflowState = {
    source: "Discovery",
    lastStep: "Discovery saved",
    nextRoute: routeCatalogByKey.recommendations.path,
    updatedAt: timestamp,
  };

  const capturedPercent = brief.capturedPercent ?? 0;
  const auditDetail = existing?.discoveryBrief
    ? `Discovery updated — ${capturedPercent}% captured`
    : `Discovery created — ${capturedPercent}% captured`;

  const project = existing
    ? {
        ...existing,
        name: existing.discoveryBrief ? existing.name : projectNameFromDiscoveryBrief(brief),
        stage: "Discovery" as const,
        status: "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.recommendations.path,
        updatedAt: timestamp,
        discoveryBrief: brief,
        auditTrail: [
          { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "discovery-save", detail: auditDetail, scope: "discovery", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
          ...(existing.auditTrail ?? []),
        ].slice(0, 50),
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromDiscoveryBrief(brief),
        stage: "Discovery",
        status: "recommended",
        resumeTo: routeCatalogByKey.recommendations.path,
        discoveryBrief: brief,
        auditTrail: [
          { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "discovery-create", detail: auditDetail, scope: "discovery", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
        ],
        workflow,
      });

  return upsertStoredProject(project);
}

function projectNameFromVideowall(wallType: string) {
  if (wallType === "led") return "LED Video Wall Discovery";
  if (wallType === "lcd") return "LCD Video Wall Discovery";
  return "Video Wall Discovery";
}

const VIDEOWALL_PRODUCT_SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

export function productSelectionsFromVideowallSummary(
  summary: Record<string, unknown>,
  savedAt = nowIso(),
): StoredProductSelection[] {
  const recommendation: Record<string, unknown> =
    summary.recommendation && typeof summary.recommendation === "object" && !Array.isArray(summary.recommendation)
      ? summary.recommendation as Record<string, unknown>
      : {};
  const products = Array.isArray(recommendation.products) ? recommendation.products : [];
  const evidence = [recommendation.title, recommendation.rationale]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());

  return [...new Set(products
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => VIDEOWALL_PRODUCT_SKU_PATTERN.test(value)))]
    .map((sku) => ({
      sku,
      title: sku,
      category: "Video Wall",
      status: "recommended" as const,
      tags: ["videowall"],
      addedAt: savedAt,
      source: "Video Wall Builder",
      evidence,
    }));
}

export function saveVideowallToProject(input: { wallType: string; summary: Record<string, unknown> }) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const recommendedProducts = productSelectionsFromVideowallSummary(input.summary, timestamp);
  const recommendedSkus = new Set(recommendedProducts.map((product) => product.sku));
  const productSelections = [
    ...recommendedProducts,
    ...(existing?.productSelections ?? []).filter((product) => !recommendedSkus.has(product.sku)),
  ].slice(0, 20);
  const videowall: StoredVideowallSummary = {
    savedAt: timestamp,
    wallType: input.wallType,
    summary: input.summary,
  };
  const workflow: StoredWorkflowState = {
    source: "Video Wall Builder",
    lastStep: "Video wall discovery saved",
    nextRoute: routeCatalogByKey.discovery.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        updated: "Just now",
        updatedAt: timestamp,
        videowall,
        productSelections,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromVideowall(input.wallType),
        stage: "Discovery",
        status: "recommended",
        resumeTo: routeCatalogByKey.discovery.path,
        videowall,
        productSelections: productSelections.length ? productSelections : undefined,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProductSelectionToProject(projectId: string, selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing: StoredProject =
    snapshot.projects.find((project) => project.id === projectId) ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Recommendations",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.recommendations.path,
      productSelections: [],
      workflow: {
        source: "Recommendations",
        lastStep: "Product selected",
        nextRoute: routeCatalogByKey.projects.path,
        updatedAt: nowIso(),
      },
    });

  const timestamp = nowIso();
  const selected = normalizeProductSelections([selection])[0] ?? selection;
  const productSelections = [
    selected,
    ...(existing.productSelections ?? []).filter((item) => item.sku !== selected.sku),
  ].slice(0, 20);

  // Record audit event for product selection change
  const existingSkus = (existing.productSelections ?? []).map((p) => p.sku);
  const auditDetail = existingSkus.includes(selected.sku)
    ? `Updated product ${selected.sku} (${selected.title || selected.sku})`
    : `Added product ${selected.sku} (${selected.title || selected.sku}) to project`;

  const result = upsertStoredProject({
    ...existing,
    stage: "Recommendations",
    status: selected.status ?? existing.status,
    updated: "Just now",
    resumeTo: routeCatalogByKey.recommendations.path,
    updatedAt: timestamp,
    productSelections,
    omittedProductSkus: (existing.omittedProductSkus ?? []).filter((sku) => sku.toUpperCase() !== selected.sku.toUpperCase()),
    auditTrail: [
      { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "product-selection", detail: auditDetail, scope: "products", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
      ...(existing.auditTrail ?? []),
    ].slice(0, 50),
    workflow: {
      source: "Recommendations",
      lastStep: "Product selected",
      nextRoute: routeCatalogByKey.projects.path,
      updatedAt: timestamp,
    },
  });

  return result;
}

export function saveProductSelectionToCurrentProject(selection: StoredProductSelection) {
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const project =
    existing ??
    createWorkflowProject({
      name: `${selection.sku} Product Selection`,
      stage: "Recommendations",
      status: selection.status ?? "alternative",
      resumeTo: routeCatalogByKey.recommendations.path,
      productSelections: [],
      workflow: {
        source: "Recommendations",
        lastStep: "Product selected",
        nextRoute: routeCatalogByKey.projects.path,
        updatedAt: nowIso(),
      },
    });

  if (!existing) {
    upsertStoredProject(project);
  }

  return saveProductSelectionToProject(project.id, selection);
}


/** Remove a product line from a project and remember the omission. */
export function removeProductSelectionFromProject(projectId: string, sku: string) {
  const snapshot = readProjectStore();
  const existing = snapshot.projects.find((project) => project.id === projectId);
  const targetSku = sku.trim().toUpperCase();
  if (!existing || !targetSku) return null;

  const current = existing.productSelections ?? [];
  const removed = current.find((item) => item.sku.trim().toUpperCase() === targetSku);
  if (!removed) return existing;

  const timestamp = nowIso();
  const omittedProductSkus = Array.from(new Set([
    ...(existing.omittedProductSkus ?? []),
    removed.sku.trim().toUpperCase(),
  ]));

  return upsertStoredProject({
    ...existing,
    productSelections: current.filter((item) => item.sku.trim().toUpperCase() !== targetSku),
    omittedProductSkus,
    updated: "Just now",
    updatedAt: timestamp,
    auditTrail: [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action: "product-selection-remove",
        detail: `Removed product ${removed.sku} (${removed.title || removed.sku}) from project`,
        scope: "products",
        severity: "info" as const,
        actorName: "Wingman user",
        createdAt: timestamp,
      },
      ...(existing.auditTrail ?? []),
    ].slice(0, 50),
  });
}

export function removeProductSelectionFromCurrentProject(sku: string) {
  const existing = getCurrentWorkflowProject();
  return existing ? removeProductSelectionFromProject(existing.id, sku) : null;
}
export function createProjectForProductSelection(name: string, selection: StoredProductSelection) {
  const projectName = name.trim() || `${selection.sku} Product Selection`;
  const normalizedSelection = normalizeProductSelections([selection])[0] ?? selection;
  const project = createWorkflowProject({
    name: projectName,
    stage: "Recommendations",
    status: selection.status ?? "alternative",
    resumeTo: routeCatalogByKey.proposal.path,
    productSelections: [normalizedSelection],
    workflow: {
      source: "Product call cards",
      lastStep: "Product selected",
      nextRoute: routeCatalogByKey.proposal.path,
      updatedAt: nowIso(),
    },
  });

  return upsertStoredProject(project);
}

export function saveRecommendationEvidenceToProject(
  evidence: StoredRecommendationEvidence,
  selection?: StoredProductSelection,
) {
  const timestamp = nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const normalizedSelection = selection ? normalizeProductSelections([selection])[0] ?? selection : null;
  const productSelections = normalizedSelection
    ? [
        normalizedSelection,
        ...((existing?.productSelections ?? []).filter((item) => item.sku !== normalizedSelection.sku)),
      ].slice(0, 20)
    : existing?.productSelections;
  const status: StatusVariant =
    evidence.quoteSafetyStatus === "quote-ready"
      ? "recommended"
      : evidence.quoteSafetyStatus === "do-not-quote-yet"
        ? "caution"
        : "alternative";
  // A stranded discovery brief (a captured answer whose option a later answer
  // hid) already downgraded the brief's quote-safety gate. Carrying a fresh
  // evidence payload over it must not re-derive a safer status from the pitch
  // alone — keep the project at the brief's do-not-quote verdict so the
  // evidence panel colors the same as the brief it overrides.
  const strandedByBrief = existing?.discoveryBrief?.quoteSafetyStatus === "do-not-quote-yet";
  const projectStatus: StatusVariant = strandedByBrief ? "caution" : status;
  const workflow: StoredWorkflowState = {
    source: "Product Pitch",
    lastStep: "Recommendation evidence saved",
    nextRoute: routeCatalogByKey.proposal.path,
    updatedAt: timestamp,
  };
  const normalizedEvidence = normalizeRecommendationEvidence({
    ...evidence,
    updatedAt: timestamp,
    source: evidence.source || "Product Pitch",
  }) ?? evidence;
  const evidenceForProject = strandedByBrief && normalizedEvidence.quoteSafetyStatus !== "do-not-quote-yet"
    ? {
        ...normalizedEvidence,
        quoteSafetyStatus: "do-not-quote-yet" as const,
        quoteSafetyMessage: STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE,
      }
    : normalizedEvidence;

  const project = existing
    ? {
        ...existing,
        stage: "Recommendations" as const,
        status: projectStatus,
        updated: "Just now",
        resumeTo: routeCatalogByKey.productPitch.path,
        updatedAt: timestamp,
        productSelections,
        recommendationEvidence: evidenceForProject,
        workflow,
      }
    : createWorkflowProject({
        name: normalizedSelection
          ? `${normalizedSelection.sku} Product Pitch`
          : evidence.productDirection || "Product Pitch Direction",
        stage: "Recommendations",
        status: projectStatus,
        resumeTo: routeCatalogByKey.productPitch.path,
        productSelections: normalizedSelection ? [normalizedSelection] : undefined,
        recommendationEvidence: evidenceForProject,
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveIngestAnalysisToProject(
  input: Omit<StoredIngestAnalysis, "updatedAt"> & { updatedAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const timestamp = input.updatedAt ?? nowIso();
  const ingest: StoredIngestAnalysis = {
    requirements: input.requirements,
    unknowns: input.unknowns,
    skippedFiles: input.skippedFiles,
    files: input.files,
    multiSkuIntelligence: input.multiSkuIntelligence,
    visualContext: input.visualContext,
    updatedAt: timestamp,
  };
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const isMultiSku = input.multiSkuIntelligence?.documentType === "multi_sku_competitor_list";
  const workflow: StoredWorkflowState = {
    source: "Document Ingest",
    lastStep: isMultiSku ? "Multi-SKU competitor intelligence saved" : "Requirements imported",
    nextRoute: isMultiSku ? routeCatalogByKey.compare.path : routeCatalogByKey.discovery.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: isMultiSku ? "Competitor Compare" as const : "Discovery" as const,
        status: input.unknowns.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path,
        updatedAt: timestamp,
        ingest,
        workflow,
      }
    : createWorkflowProject({
        name: projectNameFromIngest(input.files, input.multiSkuIntelligence),
        owner: input.multiSkuIntelligence?.accountCustomer !== "Not confirmed"
          ? input.multiSkuIntelligence?.accountCustomer
          : undefined,
        stage: isMultiSku ? "Competitor Compare" : "Discovery",
        status: input.unknowns.length ? "alternative" : "recommended",
        resumeTo: isMultiSku ? routeCatalogByKey.ingest.path : routeCatalogByKey.discovery.path,
        ingest,
        workflow,
      });

  return upsertStoredProject(project);
}

export function deleteCompareRunFromProject(runId: string, options: { requireExistingProject?: boolean } = {}) {
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing?.compareRuns?.some((run) => run.id === runId)) return null;

  const updatedProject = {
    ...existing,
    compareRuns: existing.compareRuns.filter((run) => run.id !== runId),
    updated: "Just now",
    updatedAt: nowIso(),
  };

  return upsertStoredProject(updatedProject);
}

export function saveCompareRunToProject(
  run: Omit<StoredCompareRun, "id" | "createdAt"> & { id?: string; createdAt?: string },
  options: { requireExistingProject?: boolean } = {},
) {
  const timestamp = run.createdAt ?? nowIso();
  const snapshot = readProjectStore();
  const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
  if (!existing && options.requireExistingProject) return null;

  const comparisonKey = `${String(run.competitorBrand ?? "").trim().toLowerCase()}::${String(run.competitorSku ?? "").trim().toUpperCase()}`;
  const priorVersions = (existing?.compareRuns ?? []).filter((item) =>
    `${String(item.competitorBrand ?? "").trim().toLowerCase()}::${String(item.competitorSku ?? "").trim().toUpperCase()}` === comparisonKey,
  );
  const compareRun: StoredCompareRun = {
    id: run.id ?? createId("compare-run"),
    createdAt: timestamp,
    version: run.version ?? (priorVersions.reduce((max, item) => Math.max(max, item.version ?? 0), 0) + 1),
    competitorBrand: run.competitorBrand,
    competitorSku: run.competitorSku,
    competitorName: run.competitorName,
    wyrestormSku: run.wyrestormSku,
    wyrestormTitle: run.wyrestormTitle,
    mode: run.mode,
    summary: run.summary,
    warnings: run.warnings ?? [],
    matchScore: run.matchScore,
    confidence: run.confidence,
    matchType: run.matchType,
    wyrestormUrl: run.wyrestormUrl,
    evidence: run.evidence ?? [],
    source: run.source ?? "Competitor Compare",
  };
  const workflow: StoredWorkflowState = {
    source: "Competitor Compare",
    lastStep: "Competitor lookup saved",
    nextRoute: routeCatalogByKey.projects.path,
    updatedAt: timestamp,
  };

  const project = existing
    ? {
        ...existing,
        stage: "Competitor Compare" as const,
        status: "alternative" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.compare.path,
        updatedAt: timestamp,
        compareRuns: [compareRun, ...(existing.compareRuns ?? [])].slice(0, 10),
        workflow,
      }
    : createWorkflowProject({
        name: `${compareRun.competitorSku || "Competitor"} Comparison`,
        stage: "Competitor Compare",
        status: "alternative",
        resumeTo: routeCatalogByKey.compare.path,
        compareRuns: [compareRun],
        workflow,
      });

  return upsertStoredProject(project);
}

export function saveProjectProposalToProject(proposal: StoredProjectProposal) {
  const timestamp = proposal.updatedAt || nowIso();
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  const workflow: StoredWorkflowState = {
    source: "Proposal Builder",
    lastStep: "Proposal preview generated",
    nextRoute: routeCatalogByKey.support.path,
    updatedAt: timestamp,
  };

  // Snapshot the current proposal as a version before overwriting
  let proposalVersions = existing?.proposalVersions ?? [];
  if (existing?.proposal && hasProposalChanged(existing.proposal, proposal)) {
    const versionNumber = proposalVersions.length + 1;
    // Auto-generate a descriptive label from the product diff
    const prevSkuSet = new Set((existing.proposal.products ?? []).map((p) => String(p.sku ?? "").toUpperCase()));
    const nextSkuSet = new Set((proposal.products ?? []).map((p) => String(p.sku ?? "").toUpperCase()));
    const added = [...nextSkuSet].filter((s) => !prevSkuSet.has(s));
    const removed = [...prevSkuSet].filter((s) => !nextSkuSet.has(s));
    const labelParts: string[] = [];
    if (added.length) labelParts.push(`Added ${added.join(", ")}`);
    if (removed.length) labelParts.push(`Removed ${removed.join(", ")}`);
    if (!labelParts.length && existing.proposal.title !== proposal.title) labelParts.push("Title changed");
    if (!labelParts.length && existing.proposal.summary !== proposal.summary) labelParts.push("Summary updated");
    const autoLabel = labelParts.length > 0
      ? `v${versionNumber} — ${labelParts.slice(0, 2).join("; ")}`
      : `v${versionNumber}`;
    proposalVersions = [
      ...proposalVersions,
      {
        id: createId("proposal-version"),
        versionNumber,
        savedAt: timestamp,
        label: autoLabel,
        proposal: existing.proposal,
      },
    ];
  }

  const proposalProductCount = (proposal.products ?? []).length;
  const readinessPct = proposal.readinessScore ?? 0;
  const proposalAuditDetail = existing?.proposal
    ? `Proposal updated — ${proposalProductCount} products, readiness ${readinessPct}%`
    : `Proposal created — ${proposalProductCount} products, readiness ${readinessPct}%`;

  const project = existing
    ? {
        ...existing,
        stage: "Proposal Builder" as const,
        status: proposal.assumptions.length ? "alternative" as const : "recommended" as const,
        updated: "Just now",
        resumeTo: routeCatalogByKey.proposal.path,
        updatedAt: timestamp,
        proposal,
        proposalVersions,
        auditTrail: [
          { id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action: "proposal-save", detail: proposalAuditDetail, scope: "proposal", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp },
          ...(existing.auditTrail ?? []),
        ].slice(0, 50),
        workflow,
      }
    : createWorkflowProject({
        name: proposal.title,
        stage: "Proposal Builder",
        status: proposal.assumptions.length ? "alternative" : "recommended",
        resumeTo: routeCatalogByKey.proposal.path,
        proposal,
        workflow,
      });

  return upsertStoredProject(project);
}

/**
 * Detect whether the proposal content has meaningfully changed.
 * Compares title, summary, products, assumptions and sections to avoid
 * creating trivial version snapshots on every keystroke.
 */
function hasProposalChanged(prev: StoredProjectProposal, next: StoredProjectProposal): boolean {
  if (prev.title !== next.title) return true;
  if (prev.summary !== next.summary) return true;
  if (prev.assumptions.join("\n") !== next.assumptions.join("\n")) return true;
  if (prev.sections.join("\n") !== next.sections.join("\n")) return true;
  const prevSkus = prev.products.map((p) => `${p.sku}:${p.quantity ?? 1}`).sort().join(",");
  const nextSkus = next.products.map((p) => `${p.sku}:${p.quantity ?? 1}`).sort().join(",");
  return prevSkus !== nextSkus;
}

/** Restore a proposal from a saved version snapshot. */
export function restoreProposalVersion(versionId: string): boolean {
  const snapshot = readProjectStore();
  const existing = getCurrentWorkflowProject(snapshot);
  if (!existing?.proposalVersions) return false;
  const version = existing.proposalVersions.find((v) => v.id === versionId);
  if (!version) return false;
  upsertStoredProject({
    ...existing,
    proposal: version.proposal,
    updatedAt: nowIso(),
  });
  return true;
}

export function saveProposalVisualAsset(
  projectId: string,
  input: Omit<ProposalVisualAsset, "id" | "projectId" | "revision" | "createdAt" | "updatedAt"> & { id?: string },
): ProposalVisualAsset | null {
  const timestamp = nowIso();
  let saved: ProposalVisualAsset | null = null;
  const project = updateStoredProject(projectId, (current) => {
    const previous = input.id ? current.visualAssets?.find((asset) => asset.id === input.id) : undefined;
    saved = {
      ...input,
      id: previous?.id ?? input.id ?? createId("proposal-visual"),
      projectId,
      revision: (previous?.revision ?? 0) + 1,
      createdAt: previous?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const visualAssets = [saved, ...(current.visualAssets ?? []).filter((asset) => asset.id !== saved?.id)];
    const visualBlock: StoredProposalVisualBlock = {
      id: `visual-block-${saved.id}`,
      assetId: saved.id,
      kind: saved.kind,
      title: saved.title,
      summary: saved.caption,
      proposalUse: saved.purpose,
      exportLabel: `Revision ${saved.revision}`,
      renderSrc: saved.render.svg || saved.render.pngDataUrl || saved.render.thumbnailDataUrl,
    };
    return {
      ...current,
      visualAssets,
      updated: "Just now",
      updatedAt: timestamp,
      proposal: current.proposal ? {
        ...current.proposal,
        visualBlocks: [visualBlock, ...(current.proposal.visualBlocks ?? []).filter((block) => block.assetId !== saved?.id)],
        updatedAt: timestamp,
      } : current.proposal,
    };
  });
  return project && saved ? (saved as ProposalVisualAsset) : null;
}

export function saveDealOutcome(
  projectId: string,
  outcome: "won" | "lost" | "deferred" | "",
  why?: string,
): void {
  const timestamp = nowIso();
  updateStoredProject(projectId, (project) => ({
    ...project,
    updated: "Just now",
    updatedAt: timestamp,
    dealOutcome: outcome,
    dealOutcomeWhy: why ?? project.dealOutcomeWhy ?? "",
  }));
}

export function saveProjectRequirementsToProject(projectId: string, requirements: StoredRequirementRecord[]) {
  const timestamp = nowIso();

  return updateStoredProject(projectId, (project) => ({
    ...project,
    updated: "Just now",
    updatedAt: timestamp,
    requirements: normalizeRequirementRecords(
      requirements.map((requirement) => ({
        ...requirement,
        updatedAt: timestamp,
      })),
    ),
    workflow: {
      source: "Project Requirements",
      lastStep: "Requirements reviewed",
      nextRoute: project.resumeTo,
      updatedAt: timestamp,
    },
  }));
}

export function useProjectStore() {
  const [snapshot, setSnapshot] = useState<ProjectStoreSnapshot>(() => readProjectStore());

  useEffect(() => {
    function refresh() {
      setSnapshot(readProjectStore());
    }

    hydrateProjectStoreFromBackend().catch((error) => {
      // Local store remains valid when no backend session is available - but this
      // catch also covers genuine unexpected failures, so log for diagnosis.
      console.error("[wingman] projectStore: hydrateProjectStoreFromBackend failed", error);
    });

    return projectRepository.subscribe(refresh);
  }, []);

  const copyProject = useCallback((projectId: string) => {
    copyStoredProject(projectId);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    deleteStoredProject(projectId);
  }, []);

  const copyProposalDraft = useCallback((draftId: string) => {
    copyStoredProposalDraft(draftId);
  }, []);

  const deleteProposalDraft = useCallback((draftId: string) => {
    deleteStoredProposalDraft(draftId);
  }, []);

  const resetStore = useCallback(() => {
    resetProjectStore();
  }, []);

  return {
    projects: snapshot.projects,
    proposalDrafts: snapshot.proposalDrafts,
    activeProjectId: snapshot.activeProjectId ?? null,
    activeProject: getActiveProject(snapshot),
    syncStatus: getProjectSyncStatus(snapshot),
    copyProject,
    deleteProject,
    copyProposalDraft,
    deleteProposalDraft,
    resetStore,
  };
}
