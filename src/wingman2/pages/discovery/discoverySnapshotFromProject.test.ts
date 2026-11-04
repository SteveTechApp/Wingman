import { describe, expect, it } from "vitest";
import { discoverySnapshotFromProject } from "./discoverySnapshotFromProject";
import type { StoredProject } from "../../data/projectStore";

describe("project Discovery hydration", () => {
  it("restores exact saved answer values before falling back to labels", () => {
    const project = { id: "selected", name: "Boardroom", owner: "Customer", stage: "Discovery", status: "recommended", updated: "Today", resumeTo: "/wingman/discovery", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", discoveryBrief: {
      discoveryAnswers: { opportunity: "meeting-room", "uc-purpose": ["video-conferencing", "present-locally"] },
      discoveryNotes: { opportunity: "12 seats" },
      discoveryConversation: [
        { stepId: "opportunity", question: "Room", answer: "Meeting room / boardroom", note: "12 seats", confirmed: true },
      ],
    } } as StoredProject;
    const snapshot = discoverySnapshotFromProject(project);
    expect(snapshot.state.answers).toEqual({ opportunity: "meeting-room", "uc-purpose": ["video-conferencing", "present-locally"] });
    expect(snapshot.state.notes).toEqual({ opportunity: "12 seats" });
    expect(snapshot.state.confirmed).toEqual({ opportunity: true });
  });

  it("restores original choices and keeps unmatched customer wording", () => {
    const project = { id: "selected", name: "Boardroom", owner: "Customer", discoveryBrief: { discoveryConversation: [
      { stepId: "opportunity", question: "Room", answer: "Meeting room / boardroom", note: "12 seats", confirmed: true },
      { stepId: "displays", question: "Outputs", answer: "Six portrait displays", note: "Lobby", confirmed: true },
    ] } } as StoredProject;
    const snapshot = discoverySnapshotFromProject(project);
    expect(snapshot.projectId).toBe("selected");
    expect(snapshot.state.answers).toMatchObject({ opportunity: "meeting-room" });
    expect(snapshot.state.notes).toMatchObject({ opportunity: "12 seats", displays: "Six portrait displays\nLobby" });
    expect(snapshot.state.confirmed).toMatchObject({ opportunity: true, displays: false });
  });
});
