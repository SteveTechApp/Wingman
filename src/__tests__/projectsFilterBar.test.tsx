import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { StoredProject } from "../wingman2/data/projectStore";

const { useProjectStoreMock } = vi.hoisted(() => ({ useProjectStoreMock: vi.fn() }));

function baseProject(overrides: Partial<StoredProject>): StoredProject {
  return {
    id: "project-1",
    name: "Sample Project",
    owner: "Sales",
    stage: "Recommendations",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-10-20T09:00:00.000Z",
    createdAt: "2026-10-20T09:00:00.000Z",
    resumeTo: "/wingman/compare",
    compareRuns: [],
    ...overrides,
  };
}

vi.mock("../wingman2/data/projectStore", () => ({
  setActiveProjectId: vi.fn(),
  reconfirmWallSurveyReview: vi.fn(),
  useProjectStore: useProjectStoreMock,
  projectLaneLabel: (lane: string) =>
    ({ proposal: "Proposal", requirements: "Requirements", discoveryBrief: "Discovery brief" })[lane] ?? lane,
}));

// Two colleagues, one of them the rep: the member chips only exist once the
// workspace has somebody else in it.
vi.mock("../wingman2/data/useTeamMembers", () => ({
  useTeamMembers: () => ({
    members: [
      { id: "u1", name: "Sam Reed", role: "member", lastSeenAt: null },
      { id: "u2", name: "Alex Morgan", role: "member", lastSeenAt: null },
    ],
    currentUserId: "u1",
    loading: false,
    getMemberName: (ownerId: string | undefined) => (ownerId === "u2" ? "Alex Morgan" : ownerId === "u1" ? "Sam Reed" : "Unknown"),
    getMemberInitials: (ownerId: string | undefined) => (ownerId === "u2" ? "AM" : ownerId === "u1" ? "SR" : "?"),
  }),
}));

vi.mock("../wingman2/lib/feedbackInformedGuidance", () => ({
  collectCrossProjectFeedback: vi.fn(() => []),
}));

import { ProjectsPage } from "../wingman2/pages/ProjectsPage";

const projects = [
  baseProject({ id: "project-sam", name: "Sam's Boardroom", ownerId: "u1" }),
  baseProject({ id: "project-alex", name: "Alex's Classroom", ownerId: "u2" }),
];

function renderPage() {
  useProjectStoreMock.mockReturnValue({
    projects,
    proposalDrafts: [],
    activeProjectId: null,
    syncStatus: { state: "local", message: "Saved in this browser." },
    copyProject: vi.fn(),
    deleteProject: vi.fn(),
    copyProposalDraft: vi.fn(),
    deleteProposalDraft: vi.fn(),
    resetStore: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={["/wingman/projects"]}>
      <ProjectsPage />
    </MemoryRouter>,
  );
}

describe("projects page member filter", () => {
  it("narrows the team gallery to the member whose chip is chosen", () => {
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: /Team/ }));
    fireEvent.click(screen.getByRole("button", { name: /Alex Morgan/ }));

    expect(screen.getByText("Alex's Classroom")).toBeTruthy();
    expect(screen.queryByText("Sam's Boardroom")).toBeNull();
  });

  it("forgets the member narrowing when another view is chosen", () => {
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: /Team/ }));
    fireEvent.click(screen.getByRole("button", { name: /Alex Morgan/ }));
    expect(screen.getByRole("button", { name: /Alex Morgan/ }).className).toContain("is-active");

    fireEvent.click(screen.getByRole("tab", { name: /All/ }));
    expect(screen.getByText("Sam's Boardroom")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Team/ }));

    // The whole team view is back, not the one member the chip named: the
    // narrowing belonged to the view it was made in.
    expect(screen.getByRole("button", { name: /Alex Morgan/ }).className).not.toContain("is-active");
    expect(screen.getByText("Alex's Classroom")).toBeTruthy();
    expect(screen.queryByText("Sam's Boardroom")).toBeNull();
  });
});
