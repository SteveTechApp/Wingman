import { describe, expect, it } from "vitest";
import type { ProjectStoreSnapshot, StoredProject } from "./projectStore";
import { resolveDiscoverySnapshotProject, type DiscoverySnapshot } from "./workflowHandoff";

const project = (id: string, name: string, customer: string): StoredProject => ({
  id,
  name,
  owner: "Test",
  stage: "Discovery",
  status: "recommended",
  updated: "Just now",
  resumeTo: "/discovery",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  discoveryBrief: { capturedPercent: 25, roomModel: { customer } },
});

const store = (projects: StoredProject[], activeProjectId: string | null): ProjectStoreSnapshot => ({
  projects,
  proposalDrafts: [],
  activeProjectId,
});

const snapshot = (overrides: Partial<DiscoverySnapshot> = {}): DiscoverySnapshot => ({
  activeStepIndex: 3,
  state: { clientName: "Customer A" },
  brief: { capturedPercent: 42, roomModel: { customer: "Customer A" } },
  savedAt: "2026-01-02T00:00:00.000Z",
  ...overrides,
});

describe("Discovery snapshot project identity", () => {
  it("resolves Project A by id even while Project B is active", () => {
    const projectA = project("a", "Project A", "Customer A");
    const projectB = project("b", "Project B", "Customer B");
    const result = resolveDiscoverySnapshotProject(
      snapshot({ projectId: "a", projectName: "Project A" }),
      store([projectA, projectB], "b"),
    );
    expect(result?.name).toBe("Project A");
    expect(result?.name).not.toBe("Project B");
  });

  it("safely matches a legacy snapshot and never falls back to an unrelated active project", () => {
    const projectA = project("a", "Project A", "Customer A");
    const projectB = project("b", "Project B", "Customer B");
    expect(resolveDiscoverySnapshotProject(snapshot(), store([projectA, projectB], "b"))?.id).toBe("a");
    expect(resolveDiscoverySnapshotProject(
      snapshot({ state: { clientName: "Unknown" }, brief: { capturedPercent: 42 } }),
      store([projectA, projectB], "b"),
    )).toBeNull();
  });
});
