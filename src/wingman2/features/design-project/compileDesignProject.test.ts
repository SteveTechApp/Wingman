import { describe, expect, it } from "vitest";
import type { StoredProject } from "../projects/model/projectTypes";
import { compileDesignProject } from "./compileDesignProject";

const now = "2026-09-14T10:00:00.000Z";
const project: StoredProject = { id: "p1", name: "Blind brief", owner: "Sales", stage: "Recommendations", status: "recommended", updated: now, createdAt: now, updatedAt: now, resumeTo: "/wingman/recommendations", requirements: [{ id: "source", label: "Source", value: "HDMI laptop", category: "source", source: "Customer", status: "confirmed", whyItMatters: "Presentation", updatedAt: now }], productSelections: [{ sku: "TX-1", title: "HDMI transmitter", category: "source transport", quantity: 1 }] };

describe("Design Project decision graph", () => {
  it("compiles one deterministic graph from evidence through publication", () => {
    const first = compileDesignProject(project, now);
    const second = compileDesignProject(project, "2026-09-15T10:00:00.000Z");
    expect(first.stages.map((stage) => stage.id)).toEqual(["evidence", "topology", "recommendation", "validation", "publication"]);
    expect(first.contentHash).toMatch(/^dpg1-/);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.publication.canIssue).toBe(false);
  });
});
