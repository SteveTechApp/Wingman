import { describe, expect, it } from "vitest";
import { discoverySnapshotFromProject } from "./discoverySnapshotFromProject";
import type { StoredProject } from "../../data/projectStore";

describe("project Discovery hydration", () => {
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
