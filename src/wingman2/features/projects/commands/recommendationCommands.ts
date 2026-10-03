import { routeCatalogByKey } from "../../../app/routeCatalog";
import { STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE } from "../../../lib/strandedBriefQuoteSafety";
import type { StatusVariant } from "../../../types";
import type { StoredProductSelection, StoredRecommendationEvidence, StoredRecommendationFeedback } from "../model/projectTypes";
import { normalizeProductSelections, normalizeRecommendationEvidence } from "../persistence/projectCodecs";
import type { ProjectCommandContext, ProjectLifecycleCommands } from "./projectLifecycle";

export function createRecommendationCommands(context: ProjectCommandContext, lifecycle: ProjectLifecycleCommands) {
  const { now, createId, createAuditId, read } = context;
  const { createWorkflowProject, getActiveProject, getCurrentWorkflowProject, upsertStoredProject } = lifecycle;
  const saveProductSelectionToProject = (projectId: string, selection: StoredProductSelection) => {
    const snapshot = read();
    const existing = snapshot.projects.find((project) => project.id === projectId) ?? createWorkflowProject({ name: `${selection.sku} Product Selection`, stage: "Recommendations", status: selection.status ?? "alternative", resumeTo: routeCatalogByKey.recommendations.path, productSelections: [], workflow: { source: "Recommendations", lastStep: "Product selected", nextRoute: routeCatalogByKey.projects.path, updatedAt: now() } });
    const timestamp = now();
    const selected = normalizeProductSelections([selection])[0] ?? selection;
    const productSelections = [selected, ...(existing.productSelections ?? []).filter((item) => item.sku !== selected.sku)].slice(0, 20);
    const existingSkus = (existing.productSelections ?? []).map((product) => product.sku);
    const detail = existingSkus.includes(selected.sku) ? `Updated product ${selected.sku} (${selected.title || selected.sku})` : `Added product ${selected.sku} (${selected.title || selected.sku}) to project`;
    return upsertStoredProject({ ...existing, stage: "Recommendations", status: selected.status ?? existing.status, updated: "Just now", resumeTo: routeCatalogByKey.recommendations.path, updatedAt: timestamp, productSelections, omittedProductSkus: (existing.omittedProductSkus ?? []).filter((sku) => sku.toUpperCase() !== selected.sku.toUpperCase()), auditTrail: [{ id: createAuditId?.() ?? createId("audit"), action: "product-selection", detail, scope: "products", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp }, ...(existing.auditTrail ?? [])].slice(0, 50), workflow: { source: "Recommendations", lastStep: "Product selected", nextRoute: routeCatalogByKey.projects.path, updatedAt: timestamp } });
  };

  const removeProductSelectionFromProject = (projectId: string, sku: string) => {
    const existing = read().projects.find((project) => project.id === projectId);
    const targetSku = sku.trim().toUpperCase();
    if (!existing || !targetSku) return null;
    const current = existing.productSelections ?? [];
    const removed = current.find((item) => item.sku.trim().toUpperCase() === targetSku);
    if (!removed) return existing;
    const timestamp = now();
    return upsertStoredProject({ ...existing, productSelections: current.filter((item) => item.sku.trim().toUpperCase() !== targetSku), omittedProductSkus: Array.from(new Set([...(existing.omittedProductSkus ?? []), removed.sku.trim().toUpperCase()])), updated: "Just now", updatedAt: timestamp, auditTrail: [{ id: createAuditId?.() ?? createId("audit"), action: "product-selection-remove", detail: `Removed product ${removed.sku} (${removed.title || removed.sku}) from project`, scope: "products", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp }, ...(existing.auditTrail ?? [])].slice(0, 50) });
  };

  return {
    saveRecommendationFeedback(feedback: Omit<StoredRecommendationFeedback, "id" | "createdAt"> & { id?: string; createdAt?: string }, options: { requireExistingProject?: boolean } = {}) {
      const snapshot = read();
      const existing = options.requireExistingProject ? getActiveProject(snapshot) : getCurrentWorkflowProject(snapshot);
      if (!existing) return null;
      const timestamp = feedback.createdAt ?? now();
      const nextFeedback: StoredRecommendationFeedback = { id: feedback.id ?? createId("feedback"), createdAt: timestamp, scope: feedback.scope, rating: feedback.rating, label: feedback.label, note: feedback.note, sku: feedback.sku };
      return upsertStoredProject({ ...existing, updated: "Just now", updatedAt: timestamp, feedback: [nextFeedback, ...(existing.feedback ?? [])].slice(0, 40), workflow: { source: "Sales Feedback", lastStep: `Feedback captured: ${feedback.label}`, nextRoute: existing.resumeTo, updatedAt: timestamp } });
    },
    saveProductSelectionToProject,
    saveProductSelectionToCurrentProject(selection: StoredProductSelection) {
      const existing = getCurrentWorkflowProject();
      const project = existing ?? createWorkflowProject({ name: `${selection.sku} Product Selection`, stage: "Recommendations", status: selection.status ?? "alternative", resumeTo: routeCatalogByKey.recommendations.path, productSelections: [], workflow: { source: "Recommendations", lastStep: "Product selected", nextRoute: routeCatalogByKey.projects.path, updatedAt: now() } });
      if (!existing) upsertStoredProject(project);
      return saveProductSelectionToProject(project.id, selection);
    },
    removeProductSelectionFromProject,
    removeProductSelectionFromCurrentProject(sku: string) {
      const existing = getCurrentWorkflowProject();
      return existing ? removeProductSelectionFromProject(existing.id, sku) : null;
    },
    createProjectForProductSelection(name: string, selection: StoredProductSelection) {
      const normalizedSelection = normalizeProductSelections([selection])[0] ?? selection;
      return upsertStoredProject(createWorkflowProject({ name: name.trim() || `${selection.sku} Product Selection`, stage: "Recommendations", status: selection.status ?? "alternative", resumeTo: routeCatalogByKey.proposal.path, productSelections: [normalizedSelection], workflow: { source: "Product call cards", lastStep: "Product selected", nextRoute: routeCatalogByKey.proposal.path, updatedAt: now() } }));
    },
    saveRecommendationEvidenceToProject(evidence: StoredRecommendationEvidence, selection?: StoredProductSelection) {
      const timestamp = now();
      const existing = getCurrentWorkflowProject();
      const normalizedSelection = selection ? normalizeProductSelections([selection])[0] ?? selection : null;
      const productSelections = normalizedSelection ? [normalizedSelection, ...((existing?.productSelections ?? []).filter((item) => item.sku !== normalizedSelection.sku))].slice(0, 20) : existing?.productSelections;
      const status: StatusVariant = evidence.quoteSafetyStatus === "quote-ready" ? "recommended" : evidence.quoteSafetyStatus === "do-not-quote-yet" ? "caution" : "alternative";
      const strandedByBrief = existing?.discoveryBrief?.quoteSafetyStatus === "do-not-quote-yet";
      const normalizedEvidence = normalizeRecommendationEvidence({ ...evidence, updatedAt: timestamp, source: evidence.source || "Product Pitch" }) ?? evidence;
      const evidenceForProject = strandedByBrief && normalizedEvidence.quoteSafetyStatus !== "do-not-quote-yet" ? { ...normalizedEvidence, quoteSafetyStatus: "do-not-quote-yet" as const, quoteSafetyMessage: STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE } : normalizedEvidence;
      const workflow = { source: "Product Pitch", lastStep: "Recommendation evidence saved", nextRoute: routeCatalogByKey.proposal.path, updatedAt: timestamp };
      return upsertStoredProject(existing ? { ...existing, stage: "Recommendations", status: strandedByBrief ? "caution" : status, updated: "Just now", resumeTo: routeCatalogByKey.productPitch.path, updatedAt: timestamp, productSelections, recommendationEvidence: evidenceForProject, workflow } : createWorkflowProject({ name: normalizedSelection ? `${normalizedSelection.sku} Product Pitch` : evidence.productDirection || "Product Pitch Direction", stage: "Recommendations", status: strandedByBrief ? "caution" : status, resumeTo: routeCatalogByKey.productPitch.path, productSelections: normalizedSelection ? [normalizedSelection] : undefined, recommendationEvidence: evidenceForProject, workflow }));
    },
  };
}
