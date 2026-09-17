import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canonicalWorkflowForRoute,
  createWorkflowTelemetry,
  sanitizeWorkflowMetadata,
} from "./workflowTelemetry";

describe("workflow telemetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T09:00:00.000Z"));
  });

  it("maps overlapping routes to stable canonical workflow ids", () => {
    expect(canonicalWorkflowForRoute("callCoach")).toBe("sales-conversation");
    expect(canonicalWorkflowForRoute("salesHelper")).toBe("sales-conversation");
    expect(canonicalWorkflowForRoute("callCards")).toBe("sales-conversation");
    expect(canonicalWorkflowForRoute("productCallCards")).toBe("sales-conversation");
    expect(canonicalWorkflowForRoute("documents")).toBe("response-authoring");
    expect(canonicalWorkflowForRoute("responsePack")).toBe("response-authoring");
    expect(canonicalWorkflowForRoute("proposal")).toBe("response-authoring");
  });

  it("keeps only bounded operational metadata", () => {
    expect(sanitizeWorkflowMetadata({
      entryRoute: "callCoach",
      destinationRoute: "salesHelper",
      source: "hub-card",
      customerNarrative: "private customer detail",
      huge: "x".repeat(200),
      extra: "not allowed",
    })).toEqual({
      entryRoute: "callCoach",
      destinationRoute: "salesHelper",
      source: "hub-card",
    });
  });

  it("sends abandonment with the unload-safe transport", () => {
    const publish = vi.fn();
    const publishOnUnload = vi.fn(() => true);
    const telemetry = createWorkflowTelemetry({ publish, publishOnUnload });

    telemetry.start("sales-conversation", { entryRoute: "callCoach" });
    vi.advanceTimersByTime(1_500);
    telemetry.abandonOnUnload();

    expect(publishOnUnload).toHaveBeenCalledWith(expect.objectContaining({
      kind: "workflow_abandoned",
      workflowId: "sales-conversation",
      elapsedMs: 1_500,
      metadata: { entryRoute: "callCoach" },
    }));
    expect(publish).not.toHaveBeenCalledWith(expect.objectContaining({ kind: "workflow_abandoned" }));
  });

  it("records handoffs and completion without customer content", () => {
    const publish = vi.fn();
    const telemetry = createWorkflowTelemetry({ publish, publishOnUnload: vi.fn() });

    telemetry.start("response-authoring", { entryRoute: "documents" });
    telemetry.handoff("response-authoring", {
      destinationRoute: "proposal",
      source: "hub-card",
      customerNarrative: "must not leave the browser",
    });
    telemetry.complete("response-authoring", { completion: "proposal-opened" });

    expect(publish).toHaveBeenCalledWith(expect.objectContaining({
      kind: "handoff_selected",
      metadata: { destinationRoute: "proposal", source: "hub-card" },
    }));
    expect(JSON.stringify(publish.mock.calls)).not.toContain("must not leave the browser");
  });
});
