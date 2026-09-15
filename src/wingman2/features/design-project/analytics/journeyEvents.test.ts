import { describe, expect, it } from "vitest";
import { compileDesignProject } from "../compileDesignProject";
import { buildDesignProjectExportEvent, buildDesignProjectJourneyEvent } from "./journeyEvents";

describe("Design Project journey evidence", () => {
  it("contains only opaque identity and decision-state fields", () => {
    const graph = compileDesignProject({ id: "p-1", name: "Secret Customer", owner: "person@example.com", stage: "Discovery", status: "alternative", updated: "now", createdAt: "now", updatedAt: "now", resumeTo: "/" }, "2026-09-14");
    const event = buildDesignProjectJourneyEvent(graph);
    expect(event).toMatchObject({ name: "design_project_blocked", projectId: "p-1", graphHash: graph.decision.contentHash, blockerCount: expect.any(Number) });
    expect(event.graphHash).toMatch(/^dp1-/);
    expect(JSON.stringify(event)).not.toContain("Secret Customer");
    expect(JSON.stringify(event)).not.toContain("person@example.com");
  });
  it("builds an export event without proposal content", () => {
    expect(buildDesignProjectExportEvent("p-1", "dp1-safe", "docx")).toEqual({ name: "design_project_exported", projectId: "p-1", graphHash: "dp1-safe", stage: "publication", outcome: "complete", blockerCount: 0, format: "docx" });
  });
  it("records an explicit first compilation as the start of the journey", () => {
    const graph = compileDesignProject({ id: "p-new", name: "New", owner: "Sales", stage: "Discovery", status: "alternative", updated: "now", createdAt: "now", updatedAt: "now", resumeTo: "/" }, "2026-09-14");
    expect(buildDesignProjectJourneyEvent(graph, "started").name).toBe("design_project_started");
  });
});
