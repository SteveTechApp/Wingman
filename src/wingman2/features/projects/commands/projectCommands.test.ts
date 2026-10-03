import { describe, expect, it } from "vitest";
import type { ProjectStoreSnapshot, StoredProject } from "../model/projectTypes";
import { createProjectLifecycleCommands, type ProjectCommandContext } from "./projectLifecycle";
import { createDiscoveryCommands } from "./discoveryCommands";
import { createRecommendationCommands } from "./recommendationCommands";
import { createCompareCommands } from "./compareCommands";
import { createProposalCommands } from "./proposalCommands";

const NOW = "2026-09-12T09:00:00.000Z";

function project(overrides: Partial<StoredProject> = {}): StoredProject {
  return { id: "project-1", name: "Project one", owner: "Owner", stage: "Discovery", status: "alternative", updated: "Now", resumeTo: "/wingman/discovery", createdAt: NOW, updatedAt: NOW, ...overrides };
}

function harness(initial: StoredProject[] = []) {
  let snapshot: ProjectStoreSnapshot = { projects: initial, proposalDrafts: [], activeProjectId: initial[0]?.id ?? null };
  let sequence = 0;
  const context: ProjectCommandContext = { read: () => snapshot, write: (next) => { snapshot = next; }, now: () => NOW, createId: (prefix) => `${prefix}-${++sequence}` };
  const lifecycle = createProjectLifecycleCommands(context);
  return { context, lifecycle, discovery: createDiscoveryCommands(context, lifecycle), recommendations: createRecommendationCommands(context, lifecycle), compare: createCompareCommands(context, lifecycle), proposals: createProposalCommands(context, lifecycle), snapshot: () => snapshot };
}

describe("project domain commands", () => {
  it("creates, copies and deletes projects while preserving active-project behavior", () => {
    const commands = harness();
    const created = commands.lifecycle.upsertStoredProject(commands.lifecycle.createWorkflowProject({ name: "Created", stage: "Discovery", resumeTo: "/wingman/discovery", workflow: { source: "Discovery", lastStep: "Saved", nextRoute: "/wingman/recommendations", updatedAt: NOW } }));
    commands.lifecycle.copyStoredProject(created.id);
    expect(commands.snapshot().projects.map((item) => item.name)).toEqual(["Created", "Created Copy"]);
    expect(commands.snapshot().activeProjectId).toBe(commands.snapshot().projects[1].id);
    commands.lifecycle.deleteStoredProject(commands.snapshot().projects[1].id);
    expect(commands.snapshot().activeProjectId).toBeNull();
  });

  it("saves discovery and videowall data with workflow handoffs", () => {
    const commands = harness();
    commands.discovery.saveDiscoveryBriefToProject({ roomModel: { roomType: "Boardroom" }, savedAt: NOW, capturedPercent: 50 }, null);
    expect(commands.snapshot().projects[0]).toMatchObject({ name: "Boardroom Project", stage: "Discovery", resumeTo: "/wingman/recommendations" });
    commands.discovery.saveVideowallToProject({ wallType: "lcd", summary: { recommendation: { products: ["MX-1007-HYB"] } } });
    expect(commands.snapshot().projects[0].productSelections?.[0].sku).toBe("MX-1007-HYB");
  });

  it("adds, removes and records recommendation evidence without losing omission history", () => {
    const commands = harness([project()]);
    commands.recommendations.saveProductSelectionToProject("project-1", { sku: "RX-70-4K", title: "Receiver", addedAt: NOW });
    commands.recommendations.removeProductSelectionFromProject("project-1", "rx-70-4k");
    expect(commands.snapshot().projects[0].omittedProductSkus).toEqual(["RX-70-4K"]);
    commands.recommendations.saveRecommendationEvidenceToProject({ customerRequirement: "Route video", productDirection: "Matrix", systemShape: "One source to one display", whyThisFits: [], evidenceUsed: [], quoteChecks: [], missingInformation: [], requiredDependencies: [], optionalUpgrades: [], alternatives: [], customerSafeWording: [], internalGuidance: [], quoteSafetyStatus: "quote-ready", quoteSafetyMessage: "Ready", confidence: "high", updatedAt: NOW, source: "Test" });
    expect(commands.snapshot().projects[0].recommendationEvidence?.productDirection).toBe("Matrix");
  });

  it("versions compare history for the same competitor product", () => {
    const commands = harness([project()]);
    const run = { competitorBrand: "Acme", competitorSku: "A-1", wyrestormSku: "W-1", mode: "manual" as const, summary: "Match" };
    commands.compare.saveCompareRunToProject(run);
    commands.compare.saveCompareRunToProject(run);
    expect(commands.snapshot().projects[0].compareRuns?.map((item) => item.version)).toEqual([2, 1]);
  });

  it("versions and restores proposals", () => {
    const commands = harness([project({ proposal: { title: "Old", summary: "Summary", assumptions: [], sections: [], products: [], updatedAt: NOW } })]);
    commands.proposals.saveProjectProposalToProject({ title: "New", summary: "Summary", assumptions: [], sections: [], products: [], updatedAt: NOW });
    const version = commands.snapshot().projects[0].proposalVersions?.[0];
    expect(version?.proposal.title).toBe("Old");
    expect(commands.proposals.restoreProposalVersion(version!.id)).toBe(true);
    expect(commands.snapshot().projects[0].proposal?.title).toBe("Old");
  });

  it("saves requirements and deal outcomes through lifecycle updates", () => {
    const commands = harness([project()]);
    commands.proposals.saveProjectRequirementsToProject("project-1", [{ id: "r-1", label: "HDMI input", value: "1", category: "video", source: "Discovery", status: "confirmed", whyItMatters: "Signal input", updatedAt: "old" }]);
    commands.proposals.saveDealOutcome("project-1", "won", "Approved");
    expect(commands.snapshot().projects[0]).toMatchObject({ dealOutcome: "won", dealOutcomeWhy: "Approved", requirements: [{ id: "r-1", updatedAt: NOW }] });
  });
});
