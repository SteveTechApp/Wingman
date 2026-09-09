import { describe, expect, it } from "vitest";
import { buildProjectPushPlan } from "./projectSyncConflict";
import type { StoredProject } from "./projectStore";

const project = (id: string, revision?: number, name = id): StoredProject => ({
  id,
  syncRevision: revision,
  name,
  owner: "Tester",
  stage: "Discovery",
  status: "recommended",
  updated: "Just now",
  resumeTo: "/wingman/discovery",
  createdAt: "2026-09-09T05:00:00.000Z",
  updatedAt: "2026-09-09T05:00:00.000Z",
});

describe("buildProjectPushPlan", () => {
  it("uses one revisioned PUT for one edited project without serializing its siblings", () => {
    const before = [project("alpha", 3), project("beta", 7)];
    const after = [project("alpha", 3, "Alpha revised"), project("beta", 7)];

    expect(buildProjectPushPlan(before, after)).toEqual({
      kind: "projects",
      projects: [{ ...after[0], baseRevision: 3 }],
    });
  });

  it("uses the whole-store fallback when a project was deleted", () => {
    expect(buildProjectPushPlan([project("alpha", 1), project("beta", 2)], [project("alpha", 1)])).toEqual({ kind: "snapshot" });
  });

  it("uploads an unsynced project even when the local write is otherwise unchanged", () => {
    const unsynced = project("draft", undefined, "Draft");
    expect(buildProjectPushPlan([unsynced], [unsynced])).toEqual({
      kind: "projects",
      projects: [{ ...unsynced, baseRevision: 0 }],
    });
  });

  it("resends a conflict-marked project so a matching response can clear the mark", () => {
    const flagged = { ...project("alpha", 4), syncConflict: { fields: ["proposal"], detectedAt: "2026-09-09T05:01:00.000Z" } };
    expect(buildProjectPushPlan([flagged], [flagged])).toEqual({
      kind: "projects",
      projects: [{ ...flagged, baseRevision: 4 }],
    });
  });
});
