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
    expect(snapshot.projects[0].proposal?.designRevision?.contentHash).toBe(graph?.decision.contentHash);
    expect(snapshot.projects[0].auditTrail?.[0]).toMatchObject({ action: "design-project-refresh", detail: `Design Project ${graph?.contentHash} compiled` });
  });
});
