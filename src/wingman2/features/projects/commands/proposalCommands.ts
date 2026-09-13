import { routeCatalogByKey } from "../../../app/routeCatalog";
import type { ProposalVisualAsset, StoredProjectProposal, StoredProposalVisualBlock, StoredRequirementRecord } from "../model/projectTypes";
import { normalizeRequirementRecords } from "../persistence/projectCodecs";
import type { ProjectCommandContext, ProjectLifecycleCommands } from "./projectLifecycle";

function hasProposalChanged(previous: StoredProjectProposal, next: StoredProjectProposal) {
  if (previous.title !== next.title || previous.summary !== next.summary) return true;
  if (previous.assumptions.join("\n") !== next.assumptions.join("\n") || previous.sections.join("\n") !== next.sections.join("\n")) return true;
  const skus = (proposal: StoredProjectProposal) => proposal.products.map((product) => `${product.sku}:${product.quantity ?? 1}`).sort().join(",");
  return skus(previous) !== skus(next);
}

export function createProposalCommands(context: ProjectCommandContext, lifecycle: ProjectLifecycleCommands) {
  const { now, createId, createAuditId } = context;
  const { getCurrentWorkflowProject, upsertStoredProject, updateStoredProject, createWorkflowProject } = lifecycle;
  return {
    saveProjectProposalToProject(proposal: StoredProjectProposal) {
      const timestamp = proposal.updatedAt || now();
      const existing = getCurrentWorkflowProject();
      const workflow = { source: "Proposal Builder", lastStep: "Proposal preview generated", nextRoute: routeCatalogByKey.support.path, updatedAt: timestamp };
      let proposalVersions = existing?.proposalVersions ?? [];
      if (existing?.proposal && hasProposalChanged(existing.proposal, proposal)) {
        const versionNumber = proposalVersions.length + 1;
        const previousSkus = new Set((existing.proposal.products ?? []).map((product) => String(product.sku ?? "").toUpperCase()));
        const nextSkus = new Set((proposal.products ?? []).map((product) => String(product.sku ?? "").toUpperCase()));
        const added = [...nextSkus].filter((sku) => !previousSkus.has(sku));
        const removed = [...previousSkus].filter((sku) => !nextSkus.has(sku));
        const labelParts: string[] = [];
        if (added.length) labelParts.push(`Added ${added.join(", ")}`);
        if (removed.length) labelParts.push(`Removed ${removed.join(", ")}`);
        if (!labelParts.length && existing.proposal.title !== proposal.title) labelParts.push("Title changed");
        if (!labelParts.length && existing.proposal.summary !== proposal.summary) labelParts.push("Summary updated");
        proposalVersions = [...proposalVersions, { id: createId("proposal-version"), versionNumber, savedAt: timestamp, label: labelParts.length ? `v${versionNumber} — ${labelParts.slice(0, 2).join("; ")}` : `v${versionNumber}`, proposal: existing.proposal }];
      }
      const count = (proposal.products ?? []).length;
      const detail = existing?.proposal ? `Proposal updated — ${count} products, readiness ${proposal.readinessScore ?? 0}%` : `Proposal created — ${count} products, readiness ${proposal.readinessScore ?? 0}%`;
      return upsertStoredProject(existing ? { ...existing, stage: "Proposal Builder", status: proposal.assumptions.length ? "alternative" : "recommended", updated: "Just now", resumeTo: routeCatalogByKey.proposal.path, updatedAt: timestamp, proposal, proposalVersions, auditTrail: [{ id: createAuditId?.() ?? createId("audit"), action: "proposal-save", detail, scope: "proposal", severity: "info" as const, actorName: "Wingman user", createdAt: timestamp }, ...(existing.auditTrail ?? [])].slice(0, 50), workflow } : createWorkflowProject({ name: proposal.title, stage: "Proposal Builder", status: proposal.assumptions.length ? "alternative" : "recommended", resumeTo: routeCatalogByKey.proposal.path, proposal, workflow }));
    },
    restoreProposalVersion(versionId: string) {
      const existing = getCurrentWorkflowProject();
      const version = existing?.proposalVersions?.find((item) => item.id === versionId);
      if (!existing || !version) return false;
      upsertStoredProject({ ...existing, proposal: version.proposal, updatedAt: now() });
      return true;
    },
    saveProposalVisualAsset(projectId: string, input: Omit<ProposalVisualAsset, "id" | "projectId" | "revision" | "createdAt" | "updatedAt"> & { id?: string }): ProposalVisualAsset | null {
      const timestamp = now();
      let saved: ProposalVisualAsset | null = null;
      const project = updateStoredProject(projectId, (current) => {
        const previous = input.id ? current.visualAssets?.find((asset) => asset.id === input.id) : undefined;
        saved = { ...input, id: previous?.id ?? input.id ?? createId("proposal-visual"), projectId, revision: (previous?.revision ?? 0) + 1, createdAt: previous?.createdAt ?? timestamp, updatedAt: timestamp };
        const asset = saved as ProposalVisualAsset;
        const visualBlock: StoredProposalVisualBlock = { id: `visual-block-${asset.id}`, assetId: asset.id, kind: asset.kind, title: asset.title, summary: asset.caption, proposalUse: asset.purpose, exportLabel: `Revision ${asset.revision}`, renderSrc: asset.render.svg || asset.render.pngDataUrl || asset.render.thumbnailDataUrl };
        return { ...current, visualAssets: [asset, ...(current.visualAssets ?? []).filter((item) => item.id !== asset.id)], updated: "Just now", updatedAt: timestamp, proposal: current.proposal ? { ...current.proposal, visualBlocks: [visualBlock, ...(current.proposal.visualBlocks ?? []).filter((block) => block.assetId !== asset.id)], updatedAt: timestamp } : current.proposal };
      });
      return project && saved ? saved : null;
    },
    saveDealOutcome(projectId: string, outcome: "won" | "lost" | "deferred" | "", why?: string) {
      const timestamp = now();
      updateStoredProject(projectId, (project) => ({ ...project, updated: "Just now", updatedAt: timestamp, dealOutcome: outcome, dealOutcomeWhy: why ?? project.dealOutcomeWhy ?? "" }));
    },
    saveProjectRequirementsToProject(projectId: string, requirements: StoredRequirementRecord[]) {
      const timestamp = now();
      return updateStoredProject(projectId, (project) => ({ ...project, updated: "Just now", updatedAt: timestamp, requirements: normalizeRequirementRecords(requirements.map((requirement) => ({ ...requirement, updatedAt: timestamp }))), workflow: { source: "Project Requirements", lastStep: "Requirements reviewed", nextRoute: project.resumeTo, updatedAt: timestamp } }));
    },
  };
}
