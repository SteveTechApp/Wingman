import { describe, expect, it } from "vitest";
import type { ProjectStoreSnapshot, StoredProject } from "../../projects/model/projectTypes";
import { createProjectLifecycleCommands } from "../../projects/commands/projectLifecycle";
import { createDesignProjectCommands } from "./designProjectCommands";

const now = "2026-09-14T12:00:00.000Z";
describe("Design Project commands", () => {
  it("atomically persists the compatibility revision and audit identity", () => {
    const project: StoredProject = { id: "p1", name: "Room", owner: "Sales", stage: "Proposal Builder", status: "alternative", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/proposal", requirements: [{ id: "r1", label: "Source", value: "Laptop", category: "source", source: "Customer", status: "confirmed", whyItMatters: "Presentation", updatedAt: now }], productSelections: [{ sku: "TX-1", title: "Transmitter", category: "source transport", quantity: 1 }], proposal: { title: "Room", summary: "Draft", sections: [], products: [], assumptions: [], updatedAt: now } };
    let snapshot: ProjectStoreSnapshot = { projects: [project], proposalDrafts: [], activeProjectId: project.id };
    const context = { read: () => snapshot, write: (next: ProjectStoreSnapshot) => { snapshot = next; }, now: () => now, createId: (prefix: string) => `${prefix}-1`, createAuditId: () => "audit-1" };
    const lifecycle = createProjectLifecycleCommands(context);
    const graph = createDesignProjectCommands(context, lifecycle).refreshDesignProject(project.id);
    expect(snapshot.projects[0].designProject).toEqual(graph);
    expect(snapshot.projects[0].proposal?.designRevision?.contentHash).toBe(graph?.decision.contentHash);
    expect(snapshot.projects[0].auditTrail?.[0]).toMatchObject({ action: "design-project-refresh", detail: `Design Project ${graph?.contentHash} compiled` });
  });

  it("persists a graph even when the project has no proposal", () => {
    const project: StoredProject = { id: "p2", name: "New Room", owner: "Sales", stage: "Discovery", status: "alternative", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/discovery" };
    let snapshot: ProjectStoreSnapshot = { projects: [project], proposalDrafts: [], activeProjectId: project.id };
    const context = { read: () => snapshot, write: (next: ProjectStoreSnapshot) => { snapshot = next; }, now: () => now, createId: (prefix: string) => `${prefix}-1` };
    const graph = createDesignProjectCommands(context, createProjectLifecycleCommands(context)).refreshDesignProject(project.id);
    expect(snapshot.projects[0].designProject?.contentHash).toBe(graph?.contentHash);
  });

  it("recalls a pending submission when its compiled revision changes", () => {
    const project: StoredProject = { id: "p3", name: "Changed Room", owner: "Sales", stage: "Proposal Builder", status: "alternative", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/proposal", proposal: { title: "Room", summary: "Draft", sections: [], products: [], assumptions: [], updatedAt: now, approvalStatus: "pending", submittedBy: "Ada", submittedAt: now, submittedRevisionHash: "old-hash" } };
    let snapshot: ProjectStoreSnapshot = { projects: [project], proposalDrafts: [], activeProjectId: project.id };
    const context = { read: () => snapshot, write: (next: ProjectStoreSnapshot) => { snapshot = next; }, now: () => now, createId: (prefix: string) => `${prefix}-1` };
    createDesignProjectCommands(context, createProjectLifecycleCommands(context)).refreshDesignProject(project.id);
    expect(snapshot.projects[0].proposal).toMatchObject({ approvalStatus: "draft", approvalComments: "Submission recalled because the design changed." });
    expect(snapshot.projects[0].proposal?.submittedRevisionHash).toBeUndefined();
  });
});
