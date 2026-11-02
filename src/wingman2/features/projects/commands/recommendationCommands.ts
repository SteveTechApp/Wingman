import { routeCatalogByKey } from "../../../app/routeCatalog";
import { STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE } from "../../../lib/strandedBriefQuoteSafety";
import type { StatusVariant } from "../../../types";
import type { StoredProductOmission, StoredProductSelection, StoredRecommendationEvidence, StoredRecommendationFeedback } from "../model/projectTypes";
import { normalizeProductSelections, normalizeRecommendationEvidence } from "../persistence/projectCodecs";
import type { ProjectCommandContext, ProjectLifecycleCommands } from "./projectLifecycle";

function roleKey(value: string | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

/** One spelling per SKU: the omission record is keyed by it, never by display text. */
function skuKey(value: string | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

/**
 * The omission record a write leaves behind: the list as it stands, minus the
 * SKUs this write puts back, plus the ones it takes out at this moment.
 *
 * A removal is written with its time because the merge needs to know which
 * reading came first: a selection added after that moment is the rep putting
 * the product back, while a selection from before it is a copy that never
 * heard of the removal. Two removals of one SKU keep the later moment.
 */
function withProductOmissions(
  existing: readonly StoredProductOmission[] | undefined,
  { restored = [], omitted = [] }: {
    restored?: readonly string[];
    omitted?: ReadonlyArray<{ sku: string; at: string }>;
  },
): StoredProductOmission[] {
  const bySku = new Map<string, StoredProductOmission>();
  for (const entry of existing ?? []) {
    const sku = skuKey(entry.sku);
    if (sku && !bySku.has(sku)) bySku.set(sku, { ...entry, sku });
  }
  for (const sku of restored) bySku.delete(skuKey(sku));
  for (const entry of omitted) {
    const sku = skuKey(entry.sku);
    if (sku) bySku.set(sku, { sku, at: entry.at });
  }
  return Array.from(bySku.values());
}

export function createRecommendationCommands(context: ProjectCommandContext, lifecycle: ProjectLifecycleCommands) {
  const { now, createId, createAuditId, read } = context;
  const { createWorkflowProject, getActiveProject, getCurrentWorkflowProject, upsertStoredProject } = lifecycle;
  /**
   * `roleSiblingSkus` are the other products the role could have been filled
   * with. A selection stored before selections recorded their role still fills
   * the role when it is one of them, so a swap replaces it instead of leaving
   * the room holding two products for the same job.
   */
  const saveProductSelectionToProject = (projectId: string, selection: StoredProductSelection, options: { roleSiblingSkus?: string[] } = {}) => {
    const snapshot = read();
    const existing = snapshot.projects.find((project) => project.id === projectId) ?? createWorkflowProject({ name: `${selection.sku} Product Selection`, stage: "Recommendations", status: selection.status ?? "alternative", resumeTo: routeCatalogByKey.recommendations.path, productSelections: [], workflow: { source: "Recommendations", lastStep: "Product selected", nextRoute: routeCatalogByKey.projects.path, updatedAt: now() } });
    const timestamp = now();
    const selected = normalizeProductSelections([selection])[0] ?? selection;
    const selectedSku = selected.sku.trim().toUpperCase();
    // One role, one product. A selection that names its system role replaces
    // whatever already fills that role, because the alternative a rep picks is
    // the room's product for that job — keeping both would quote one role twice.
    const selectedRole = roleKey(selected.systemRole);
    const previous = existing.productSelections ?? [];
    const siblingSkus = new Set((options.roleSiblingSkus ?? []).map((sku) => sku.trim().toUpperCase()));
    const fillsSelectedRole = (item: StoredProductSelection) => {
      if (!selectedRole) return false;
      if (roleKey(item.systemRole) === selectedRole) return true;
      return !roleKey(item.systemRole) && siblingSkus.has(item.sku.trim().toUpperCase());
    };
    const roleHolder = previous.find((item) => fillsSelectedRole(item) && item.sku.trim().toUpperCase() !== selectedSku);
    const productSelections = [selected, ...previous.filter((item) => item.sku.trim().toUpperCase() !== selectedSku && !fillsSelectedRole(item))].slice(0, 20);
    // A replacement is a removal with an addition on top, and a removal has to
    // be recorded as one: the per-item sync union keeps a stale copy's own
    // products on purpose, so without the omission record the product this
    // swap took out came back from the other browser and the role quoted two
    // products again. The selected SKU's omission goes, because this save is
    // the rep asking for it.
    const replacedSkus = previous
      .filter((item) => item.sku.trim().toUpperCase() !== selectedSku && fillsSelectedRole(item))
      .map((item) => item.sku.trim().toUpperCase());
    const existingSkus = previous.map((product) => product.sku.trim().toUpperCase());
    const detail = existingSkus.includes(selectedSku)
      ? `Updated product ${selected.sku} (${selected.title || selected.sku})`
      : roleHolder
        ? `Replaced ${roleHolder.sku} with ${selected.sku} (${selected.title || selected.sku}) for the ${selected.systemRole} role`
        : `Added product ${selected.sku} (${selected.title || selected.sku}) to project`;
    return upsertStoredProject({ ...existing, stage: "Recommendations", status: selected.status ?? existing.status, updated: "Just now", resumeTo: routeCatalogByKey.recommendations.path, updatedAt: timestamp, productSelections, productOmissions: withProductOmissions(existing.productOmissions, { restored: [selectedSku], omitted: replacedSkus.map((sku) => ({ sku, at: timestamp })) }), auditTrail: [{ id: createAuditId?.() ?? createId("audit"), action: "product-selection", detail, scope: "products", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp }, ...(existing.auditTrail ?? [])].slice(0, 50), workflow: { source: "Recommendations", lastStep: "Product selected", nextRoute: routeCatalogByKey.projects.path, updatedAt: timestamp } });
  };

  const removeProductSelectionFromProject = (projectId: string, sku: string) => {
    const existing = read().projects.find((project) => project.id === projectId);
    const targetSku = sku.trim().toUpperCase();
    if (!existing || !targetSku) return null;
    const current = existing.productSelections ?? [];
    const removed = current.find((item) => item.sku.trim().toUpperCase() === targetSku);
    if (!removed) return existing;
    const timestamp = now();
    return upsertStoredProject({ ...existing, productSelections: current.filter((item) => item.sku.trim().toUpperCase() !== targetSku), productOmissions: withProductOmissions(existing.productOmissions, { omitted: [{ sku: targetSku, at: timestamp }] }), updated: "Just now", updatedAt: timestamp, auditTrail: [{ id: createAuditId?.() ?? createId("audit"), action: "product-selection-remove", detail: `Removed product ${removed.sku} (${removed.title || removed.sku}) from project`, scope: "products", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp }, ...(existing.auditTrail ?? [])].slice(0, 50) });
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
    saveProductSelectionToCurrentProject(selection: StoredProductSelection, options: { roleSiblingSkus?: string[] } = {}) {
      const existing = getCurrentWorkflowProject();
      const project = existing ?? createWorkflowProject({ name: `${selection.sku} Product Selection`, stage: "Recommendations", status: selection.status ?? "alternative", resumeTo: routeCatalogByKey.recommendations.path, productSelections: [], workflow: { source: "Recommendations", lastStep: "Product selected", nextRoute: routeCatalogByKey.projects.path, updatedAt: now() } });
      if (!existing) upsertStoredProject(project);
      return saveProductSelectionToProject(project.id, selection, options);
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
      // Saving evidence for a product is another way of asking for it, so its
      // omission has to go: otherwise the rule below would take the selection
      // out again on the next merge.
      const productOmissions = normalizedSelection
        ? withProductOmissions(existing?.productOmissions, { restored: [normalizedSelection.sku] })
        : existing?.productOmissions;
      const status: StatusVariant = evidence.quoteSafetyStatus === "quote-ready" ? "recommended" : evidence.quoteSafetyStatus === "do-not-quote-yet" ? "caution" : "alternative";
      const strandedByBrief = existing?.discoveryBrief?.quoteSafetyStatus === "do-not-quote-yet";
      const normalizedEvidence = normalizeRecommendationEvidence({ ...evidence, updatedAt: timestamp, source: evidence.source || "Product Pitch" }) ?? evidence;
      const evidenceForProject = strandedByBrief && normalizedEvidence.quoteSafetyStatus !== "do-not-quote-yet" ? { ...normalizedEvidence, quoteSafetyStatus: "do-not-quote-yet" as const, quoteSafetyMessage: STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE } : normalizedEvidence;
      const workflow = { source: "Product Pitch", lastStep: "Recommendation evidence saved", nextRoute: routeCatalogByKey.proposal.path, updatedAt: timestamp };
      return upsertStoredProject(existing ? { ...existing, stage: "Recommendations", status: strandedByBrief ? "caution" : status, updated: "Just now", resumeTo: routeCatalogByKey.productPitch.path, updatedAt: timestamp, productSelections, productOmissions, recommendationEvidence: evidenceForProject, workflow } : createWorkflowProject({ name: normalizedSelection ? `${normalizedSelection.sku} Product Pitch` : evidence.productDirection || "Product Pitch Direction", stage: "Recommendations", status: strandedByBrief ? "caution" : status, resumeTo: routeCatalogByKey.productPitch.path, productSelections: normalizedSelection ? [normalizedSelection] : undefined, recommendationEvidence: evidenceForProject, workflow }));
    },
  };
}
