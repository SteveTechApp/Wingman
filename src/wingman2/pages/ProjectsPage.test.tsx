import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { StoredProject } from "../data/projectStore";

const { useProjectStoreMock } = vi.hoisted(() => ({
  useProjectStoreMock: vi.fn(),
}));

function baseProject(overrides: Partial<StoredProject>): StoredProject {
  return {
    id: "project-1",
    name: "Sample Project",
    owner: "Sales",
    stage: "Recommendations",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-08-16T09:00:00.000Z",
    createdAt: "2026-08-16T09:00:00.000Z",
    resumeTo: "/wingman/compare",
    compareRuns: [],
    ...overrides,
  };
}

vi.mock("../data/projectStore", () => ({
  setActiveProjectId: vi.fn(),
  useProjectStore: useProjectStoreMock,
}));

vi.mock("../lib/feedbackInformedGuidance", () => ({
  collectCrossProjectFeedback: vi.fn(() => []),
}));

import { ProjectsPage } from "./ProjectsPage";

function renderProjects(projects: StoredProject[]) {
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

describe("projects list compare confidence badge", () => {
  it("surfaces the stored compare tier per row without opening the project", () => {
    renderProjects([
      baseProject({
        id: "project-with-compare",
        name: "Harbour Retail Signage",
        compareRuns: [
          {
            id: "compare-1",
            createdAt: "2026-08-16T12:00:00.000Z",
            competitorSku: "CLICKSHARE-CX-30",
            wyrestormSku: "SW-640L-TX-W",
            confidence: "Plausible — confirm",
            matchType: "PARTIAL MATCH",
          },
        ],
      }),
      baseProject({ id: "project-without-compare", name: "Westbrook Classroom", stage: "Proposal Builder", compareRuns: [] }),
    ]);

    // The project with a committed comparison shows its tier badge next to the
    // stage, with a title explaining what it is.
    const harbourRow = screen.getByText("Harbour Retail Signage").closest("tr");
    expect(harbourRow).not.toBeNull();
    expect(harbourRow?.textContent).toContain("Plausible — confirm");
    const badge = harbourRow?.querySelector(".wm-projects-compare-tier");
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("title")).toContain("verdict tier");

    // A project with no comparison shows no tier badge (the row's own status
    // chip is a different element).
    const classroomRow = screen.getByText("Westbrook Classroom").closest("tr");
    expect(classroomRow?.querySelector(".wm-projects-compare-tier")).toBeNull();
  });

  it("maps strong to the success variant and no-equivalent to danger", () => {
    renderProjects([
      baseProject({
        id: "project-strong",
        name: "Strong Direction Room",
        compareRuns: [{ id: "c", createdAt: "2026-08-16T13:00:00.000Z", confidence: "Strong direction" }],
      }),
      baseProject({
        id: "project-none",
        name: "No Equivalent Room",
        status: "caution",
        compareRuns: [{ id: "d", createdAt: "2026-08-16T14:00:00.000Z", confidence: "No equivalent" }],
      }),
    ]);

    const strongBadge = screen.getByText("Strong Direction Room").closest("tr")?.querySelector(".wm-projects-compare-tier");
    expect(strongBadge?.className).toContain("wm-status-success");
    const noneBadge = screen.getByText("No Equivalent Room").closest("tr")?.querySelector(".wm-projects-compare-tier");
    expect(noneBadge?.className).toContain("wm-status-danger");
  });
});
