import { describe, expect, it } from "vitest";
import { wallDraftStatus } from "./wallDraftStatus";

describe("wallDraftStatus", () => {
  it("says the project copy is behind when an edit is newer than the saved wall", () => {
    const status = wallDraftStatus({
      draftSavedAt: "2026-10-20T11:00:00.000Z",
      projectSavedAt: "2026-10-20T10:00:00.000Z",
    });

    expect(status?.state).toBe("draft-ahead");
    // Both facts the rep needs, in the one line: the work is safe here, and the
    // project has not caught up.
    expect(status?.text).toContain("A reload is safe");
    expect(status?.text).toContain("the project copy is behind");
  });

  it("says nothing once the project holds the same work", () => {
    expect(wallDraftStatus({
      draftSavedAt: "2026-10-20T10:00:00.000Z",
      projectSavedAt: "2026-10-20T10:00:00.000Z",
    })).toBeNull();
    // Another device can save ahead of this browser's draft; that is not a
    // draft waiting to be saved, so it earns no line either.
    expect(wallDraftStatus({
      draftSavedAt: "2026-10-20T09:00:00.000Z",
      projectSavedAt: "2026-10-20T12:00:00.000Z",
    })).toBeNull();
  });

  it("names a project that has no wall of its own yet", () => {
    const status = wallDraftStatus({ draftSavedAt: "2026-10-20T11:00:00.000Z", projectSavedAt: null });

    expect(status?.state).toBe("draft-only");
    expect(status?.text).toContain("the project has no copy yet");
    expect(status?.text).toContain("save to add it to the project");
  });

  it("has nothing to say without a draft to reopen", () => {
    expect(wallDraftStatus({ draftSavedAt: null, projectSavedAt: "2026-10-20T10:00:00.000Z" })).toBeNull();
    expect(wallDraftStatus({ draftSavedAt: "not a date", projectSavedAt: null })).toBeNull();
  });

  it("speaks for a named project only when the draft belongs to it", () => {
    const draft = { draftSavedAt: "2026-10-20T11:00:00.000Z", projectSavedAt: "2026-10-20T10:00:00.000Z" };

    // The project's own wall in progress is what it says is behind.
    expect(wallDraftStatus({ ...draft, projectId: "project-1", draftProjectId: "project-1" })?.state).toBe("draft-ahead");
    // Another project's draft is not this project falling behind, and a draft
    // that names nobody cannot be claimed by a project it never belonged to.
    expect(wallDraftStatus({ ...draft, projectId: "project-1", draftProjectId: "project-2" })).toBeNull();
    expect(wallDraftStatus({ ...draft, projectId: "project-1", draftProjectId: null })).toBeNull();
  });
});
