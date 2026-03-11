import { describe, expect, it } from "vitest";

import { getProjectResumeAction } from "@/features/projects/projectProductivity";
import type { StoredProject } from "@/features/projects/projectStore";

function makeProject(partial?: Partial<StoredProject>): StoredProject {
  return {
    id: "proj-1",
    name: "Boardroom Refresh",
    customer: "Acme Ltd",
    site: "London HQ",
    roomName: "Boardroom",
    stage: "Discovery",
    status: "Draft",
    notes: "",
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
    ...partial,
  };
}

describe("projectProductivity", () => {
  it("routes proposal-stage work back to the proposal builder", () => {
    const action = getProjectResumeAction(
      makeProject({
        stage: "Proposal",
        proposal: { title: "Boardroom AV Refresh" },
      }),
    );

    expect(action.shortLabel).toBe("Proposal");
    expect(action.to).toBe("/app/tools/proposal");
  });

  it("routes commercial-ready work to the completion gate", () => {
    const action = getProjectResumeAction(
      makeProject({
        status: "Commercial Ready",
      }),
    );

    expect(action.shortLabel).toBe("Completion");
    expect(action.to).toBe("/app/projects/proj-1/completion");
  });
});
