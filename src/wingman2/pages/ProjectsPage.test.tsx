import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { setActiveProjectId, type StoredProject } from "../data/projectStore";

const { useProjectStoreMock, reconfirmWallSurveyReviewMock } = vi.hoisted(() => ({
  useProjectStoreMock: vi.fn(),
  reconfirmWallSurveyReviewMock: vi.fn(),
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
  reconfirmWallSurveyReview: reconfirmWallSurveyReviewMock,
  useProjectStore: useProjectStoreMock,
  // Real label behaviour is pinned by projectStore unit tests; the page test
  // only needs the lane names it renders.
  projectLaneLabel: (lane: string) =>
    ({ proposal: "Proposal", requirements: "Requirements", discoveryBrief: "Discovery brief" })[lane] ?? lane,
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

describe("projects list card actions", () => {
  it("arms one card's delete on a first click, and blur alone disarms it", () => {
    renderProjects([
      baseProject({ id: "project-alpha", name: "Alpha Room" }),
      baseProject({ id: "project-beta", name: "Beta Room" }),
    ]);

    // The confirmation belongs to the card that was clicked, so arming one does
    // not arm its neighbour.
    fireEvent.click(screen.getByRole("button", { name: "Delete Alpha Room" }));
    const armed = screen.getByRole("button", { name: "Confirm delete Alpha Room" });
    expect(screen.getByRole("button", { name: "Delete Beta Room" })).toBeTruthy();

    // Looking away is not a delete.
    fireEvent.blur(armed);
    expect(screen.getByRole("button", { name: "Delete Alpha Room" })).toBeTruthy();
  });
});

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

    expect(screen.getByRole("link", { name: "Open response" }).getAttribute("href")).toBe("/wingman/responses");

    // The project with a committed comparison shows its tier badge next to the
    // stage, with a title explaining what it is.
    const harbourRow = screen.getByText("Harbour Retail Signage").closest("article");
    expect(harbourRow).not.toBeNull();
    expect(harbourRow?.textContent).toContain("Plausible — confirm");
    const badge = harbourRow?.querySelector(".wm-projects-compare-tier");
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("title")).toContain("verdict tier");

    // A project with no comparison shows no tier badge (the row's own status
    // chip is a different element).
    const classroomRow = screen.getByText("Westbrook Classroom").closest("article");
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

    const strongBadge = screen.getByText("Strong Direction Room").closest("article")?.querySelector(".wm-projects-compare-tier");
    expect(strongBadge?.className).toContain("wm-status-success");
    const noneBadge = screen.getByText("No Equivalent Room").closest("article")?.querySelector(".wm-projects-compare-tier");
    expect(noneBadge?.className).toContain("wm-status-danger");
  });
});

describe("projects list survey review flag", () => {
  const reviewedAt = "2026-10-20T14:12:00.000Z";
  function wallWithReview(decisions: Array<"accepted" | "rejected">) {
    return {
      savedAt: reviewedAt,
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt,
            photoCount: 1,
            confidence: 0.8,
            rows: decisions.map((decision, index) => ({
              id: `display-${index + 1}`,
              label: `Panel ${index + 1}`,
              metres: 4,
              confidence: 0.9,
              decision,
            })),
          },
        },
      },
    };
  }

  it("marks the project whose last review cleared rows", () => {
    renderProjects([
      baseProject({
        id: "project-cleared",
        name: "Cleared Survey Project",
        videowall: wallWithReview(["accepted", "rejected", "rejected"]),
      }),
      baseProject({
        id: "project-accepted",
        name: "Accepted Survey Project",
        videowall: wallWithReview(["accepted", "accepted"]),
      }),
      baseProject({ id: "project-no-wall", name: "No Wall Project" }),
    ]);

    const clearedRow = screen.getByText("Cleared Survey Project").closest("article");
    const flag = clearedRow?.querySelector(".wm-projects-survey-review");
    expect(flag).not.toBeNull();
    expect(flag?.textContent).toContain("2 survey rows cleared");
    expect(flag?.getAttribute("data-survey-review")).toBe("cleared");
    expect(flag?.getAttribute("title")).toContain("cleared 2 of 3 rows");
    expect(flag?.getAttribute("title")).toContain("Requirements section");
    // The flag is the way into the rows it counts: the project's Requirements
    // section, the photo review panel, and the first cleared row inside it.
    expect(flag?.getAttribute("href")).toBe(
      "/wingman/projects/project-cleared?view=confirm#wall-survey-review-row-display-2",
    );
    expect(flag?.getAttribute("data-survey-review-row")).toBe("display-2");
    // Opening the flag opens that project, the way the card's own Detail action does.
    fireEvent.click(flag!);
    expect(vi.mocked(setActiveProjectId)).toHaveBeenCalledWith("project-cleared");
  });

  it("marks a review that kept every row more quietly than a cleared one", () => {
    renderProjects([
      baseProject({
        id: "project-cleared",
        name: "Cleared Survey Project",
        videowall: wallWithReview(["accepted", "rejected"]),
      }),
      baseProject({
        id: "project-reviewed",
        name: "Clean Survey Project",
        videowall: wallWithReview(["accepted", "accepted"]),
      }),
      baseProject({ id: "project-no-wall", name: "No Wall Project" }),
    ]);

    // A clean review is a fact worth showing: the row would otherwise look like
    // a room nobody has surveyed.
    const reviewed = screen.getByText("Clean Survey Project").closest("article")?.querySelector(".wm-projects-survey-review");
    expect(reviewed).not.toBeNull();
    expect(reviewed?.textContent).toContain("Survey reviewed");
    expect(reviewed?.getAttribute("data-survey-review")).toBe("reviewed");
    expect(reviewed?.getAttribute("title")).toContain("kept all 2 rows");
    expect(reviewed?.getAttribute("href")).toBe("/wingman/projects/project-reviewed?view=confirm#wall-survey-review");

    // Quieter, not louder: the clean review does not borrow the warning tone the
    // cleared rows need, and it never counts rows that were not cleared.
    expect(reviewed?.className).toContain("wm-status-neutral");
    expect(reviewed?.className).not.toContain("wm-status-warning");
    expect(reviewed?.textContent).not.toMatch(/cleared/);

    expect(
      screen.getByText("Cleared Survey Project").closest("article")?.querySelector(".wm-status-warning"),
    ).not.toBeNull();

    // Neither flag stands in for a survey that was never read.
    expect(
      screen.getByText("No Wall Project").closest("article")?.querySelector(".wm-projects-survey-review"),
    ).toBeNull();
  });
});

describe("projects list survey attention filter", () => {
  const DAY_MS = 86_400_000;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();
  function wallReviewedAt(reviewedAt: string, decisions: Array<"accepted" | "rejected">) {
    return {
      savedAt: reviewedAt,
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt,
            photoCount: 1,
            confidence: 0.8,
            rows: decisions.map((decision, index) => ({
              id: `display-${index + 1}`,
              label: `Panel ${index + 1}`,
              metres: 4,
              confidence: 0.9,
              decision,
            })),
          },
        },
      },
    };
  }

  function attentionProjects() {
    return [
      baseProject({
        id: "project-cleared",
        name: "Cleared Survey Project",
        videowall: wallReviewedAt(daysAgo(2), ["accepted", "rejected"]),
      }),
      baseProject({
        id: "project-old",
        name: "Old Survey Project",
        videowall: wallReviewedAt(daysAgo(200), ["accepted"]),
      }),
      baseProject({
        id: "project-recent",
        name: "Recent Survey Project",
        videowall: wallReviewedAt(daysAgo(1), ["accepted"]),
      }),
      baseProject({ id: "project-none", name: "No Survey Project" }),
    ];
  }

  it("keeps only the cards whose survey still needs a rep", () => {
    renderProjects(attentionProjects());

    // The filter is a switch over the whole list, not a fourth ownership tab,
    // and its count is the number the current view can show.
    const toggle = screen.getByRole("button", { name: /Survey needs attention/ });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.textContent).toContain("2");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    // Rows a review cleared, and a reading old enough that the room may have
    // moved on: both are work. This week's review and the unsurveyed room are not.
    expect(screen.getByText("Cleared Survey Project")).toBeTruthy();
    expect(screen.getByText("Old Survey Project")).toBeTruthy();
    expect(screen.queryByText("Recent Survey Project")).toBeNull();
    expect(screen.queryByText("No Survey Project")).toBeNull();

    // A card kept by the queue also says why it is in it: the cleared review
    // counts its rows, and the old clean one reads as stale rather than as this
    // week's tick, so the filter never hides the reason it kept a card.
    const clearedFlag = screen
      .getByText("Cleared Survey Project")
      .closest("article")
      ?.querySelector(".wm-projects-survey-review");
    expect(clearedFlag?.getAttribute("data-survey-review")).toBe("cleared");
    const oldFlag = screen
      .getByText("Old Survey Project")
      .closest("article")
      ?.querySelector(".wm-projects-survey-review");
    expect(oldFlag?.getAttribute("data-survey-review")).toBe("reviewed");
    expect(oldFlag?.getAttribute("data-survey-review-age")).toBe("stale");

    fireEvent.click(toggle);

    // Off means the whole list again, not the two that matched.
    expect(screen.getByText("Recent Survey Project")).toBeTruthy();
    expect(screen.getByText("No Survey Project")).toBeTruthy();
  });

  it("says the filter found nothing rather than looking like an empty store", () => {
    renderProjects([
      baseProject({
        id: "project-recent",
        name: "Recent Survey Project",
        videowall: wallReviewedAt(daysAgo(1), ["accepted"]),
      }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Survey needs attention/ }));

    expect(screen.getByText(/No projects in this view need survey attention/)).toBeTruthy();
  });

  it("narrows the search result instead of replacing it, and counts only what that view holds", () => {
    renderProjects(attentionProjects());

    // The queue is what is left of the view the rep already narrowed, so a
    // search for this week's review leaves nothing for the filter to keep.
    fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "Recent" } });
    const toggle = screen.getByRole("button", { name: /Survey needs attention/ });
    expect(toggle.textContent).toContain("0");

    fireEvent.click(toggle);
    expect(screen.getByText(/No projects in this view need survey attention/)).toBeTruthy();
    expect(screen.queryByText("Cleared Survey Project")).toBeNull();

    // Clearing the search fills the same queue rather than switching the filter off.
    fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "" } });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Cleared Survey Project")).toBeTruthy();
    expect(screen.getByText("Old Survey Project")).toBeTruthy();
  });
});

describe("projects list team-change conflict badge", () => {
  it("marks a project another member changed with the changed lane labels", () => {
    renderProjects([
      baseProject({
        id: "project-with-conflict",
        name: "Conflicted Project",
        syncConflict: { fields: ["proposal", "requirements"], detectedAt: "2026-08-16T15:00:00.000Z" },
      }),
      baseProject({ id: "project-clean", name: "Clean Project" }),
    ]);

    const conflictedRow = screen.getByText("Conflicted Project").closest("article");
    expect(conflictedRow).not.toBeNull();
    expect(conflictedRow?.textContent).toContain("Team changed:");
    expect(conflictedRow?.textContent).toContain("Proposal");
    expect(conflictedRow?.textContent).toContain("Requirements");
    expect(conflictedRow?.querySelector(".wm-status-warning")).not.toBeNull();

    // A project with no conflict shows no badge.
    const cleanRow = screen.getByText("Clean Project").closest("article");
    expect(cleanRow?.textContent).not.toContain("Team changed:");
  });
});

describe("projects list survey re-confirm", () => {
  const DAY_MS = 86_400_000;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();
  function wallReviewedAt(reviewedAt: string, decisions: Array<"accepted" | "rejected">) {
    return {
      savedAt: reviewedAt,
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt,
            photoCount: 1,
            confidence: 0.8,
            rows: decisions.map((decision, index) => ({
              id: `display-${index + 1}`,
              label: `Panel ${index + 1}`,
              metres: 4,
              confidence: 0.9,
              decision,
            })),
          },
        },
      },
    };
  }

  it("renews a clean reading from the card, and offers it nowhere else", () => {
    renderProjects([
      baseProject({ id: "project-stale", name: "Stale Survey Project", videowall: wallReviewedAt(daysAgo(200), ["accepted"]) }),
      baseProject({ id: "project-fresh", name: "Fresh Survey Project", videowall: wallReviewedAt(daysAgo(2), ["accepted"]) }),
      baseProject({
        id: "project-cleared",
        name: "Cleared Survey Project",
        videowall: wallReviewedAt(daysAgo(200), ["accepted", "rejected"]),
      }),
    ]);

    const stale = screen.getByText("Stale Survey Project").closest("article")!;
    fireEvent.click(within(stale).getByRole("button", { name: "Re-confirm the survey for Stale Survey Project" }));
    // The action records the date on the saved wall; it does not open the builder.
    expect(reconfirmWallSurveyReviewMock).toHaveBeenCalledWith({ projectId: "project-stale" });

    // A reading taken this week has no date to renew, and a cleared one has rows
    // to work rather than a room to check again.
    expect(within(screen.getByText("Fresh Survey Project").closest("article")!).queryByRole("button", { name: /Re-confirm/ })).toBeNull();
    expect(within(screen.getByText("Cleared Survey Project").closest("article")!).queryByRole("button", { name: /Re-confirm/ })).toBeNull();
  });
});
