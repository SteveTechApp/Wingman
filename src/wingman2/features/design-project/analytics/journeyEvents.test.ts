import { describe, expect, it } from "vitest";
import { compileDesignProject } from "../compileDesignProject";
import { buildDesignProjectExportEvent, buildDesignProjectJourneyEvent, buildOperationalJourneyEvent, summarizeOperationalJourneyEvents } from "./journeyEvents";

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
  it("creates bounded operational events without accepting narrative fields", () => {
    expect(buildOperationalJourneyEvent("journey_failed", { journeyId: "design-project", stage: "publication", reason: "validation" })).toEqual({
      name: "journey_failed", journeyId: "design-project", stage: "publication", reason: "validation",
    });
  });
  it("reports no observation window until production events exist", () => {
    expect(summarizeOperationalJourneyEvents([])).toEqual({ observationWindow: null, started: 0, completed: 0, failed: 0, degraded: 0, publicationBlocked: 0 });
  });
  it("counts operational outcomes and derives the observation window", () => {
    const summary = summarizeOperationalJourneyEvents([
      { feature: "journey_started", timestamp: "2026-09-15T10:00:00Z" },
      { feature: "stage_completed", timestamp: "2026-09-15T11:00:00Z" },
      { feature: "journey_failed", timestamp: "2026-09-16T12:00:00Z" },
      { feature: "sync_degraded", timestamp: "2026-09-16T13:00:00Z" },
      { feature: "publication_blocked", timestamp: "2026-09-16T14:00:00Z" },
    ]);
    expect(summary).toMatchObject({ started: 1, completed: 1, failed: 1, degraded: 1, publicationBlocked: 1, observationWindow: { from: "2026-09-15T10:00:00.000Z", to: "2026-09-16T14:00:00.000Z" } });
  });
});
