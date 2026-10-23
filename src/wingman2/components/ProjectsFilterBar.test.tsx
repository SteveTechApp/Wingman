import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StoredProject } from "../data/projectStore";
import { ProjectsFilterBar, type ProjectsTeamFilter } from "./ProjectsFilterBar";

const members = [
  { id: "u1", name: "Sam Reed", role: "member", lastSeenAt: null },
  { id: "u2", name: "Alex Morgan", role: "member", lastSeenAt: null },
];

function project(overrides: Partial<StoredProject>): StoredProject {
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
  } as StoredProject;
}

const projects = [
  project({ id: "project-mine", name: "Mine", ownerId: "u1" }),
  project({ id: "project-unowned", name: "Unowned" }),
  project({ id: "project-other", name: "Theirs", ownerId: "u2" }),
];

function renderBar(overrides: Partial<ComponentProps<typeof ProjectsFilterBar>> = {}) {
  const props = {
    projects,
    teamFilter: "mine" as ProjectsTeamFilter,
    memberFilter: null,
    searchQuery: "",
    surveyAttentionOnly: false,
    surveyAttentionCount: 2,
    members,
    currentUserId: "u1",
    onTeamFilterChange: vi.fn(),
    onMemberFilterChange: vi.fn(),
    onSearchChange: vi.fn(),
    onSurveyAttentionToggle: vi.fn(),
    ...overrides,
  };
  render(<ProjectsFilterBar {...props} />);
  return props;
}

describe("ProjectsFilterBar counts", () => {
  it("prints what each tab can show, and the survey count the caller counted", () => {
    renderBar();

    // Mine holds the rep's own work plus the projects nobody owns yet; Team is
    // everything that is not theirs, unowned projects included; All is the
    // store. The survey switch narrows the view the tabs chose, so its number is
    // the caller's, not the store's.
    expect(screen.getByRole("tab", { name: /My projects/ }).textContent).toContain("2");
    expect(screen.getByRole("tab", { name: /Team/ }).textContent).toContain("2");
    expect(screen.getByRole("tab", { name: /All/ }).textContent).toContain("3");
    expect(screen.getByRole("button", { name: /Survey needs attention/ }).textContent).toContain("2");
  });

  it("prints no count for a tab nobody is signed in to promise", () => {
    renderBar({ currentUserId: null });

    expect(screen.getByRole("tab", { name: /My projects/ }).querySelector(".wm-projects-filter-count")).toBeNull();
    // The team tab still prints its number, because it always has one.
    expect(screen.getByRole("tab", { name: /Team/ }).textContent).toContain("0");
  });

  it("marks the view it was handed as selected", () => {
    renderBar({ teamFilter: "team" });

    expect(screen.getByRole("tab", { name: /Team/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /My projects/ }).getAttribute("aria-selected")).toBe("false");
  });
});

describe("ProjectsFilterBar controls", () => {
  it("reports the view, the search text and the survey switch without keeping state", () => {
    const props = renderBar();

    fireEvent.click(screen.getByRole("tab", { name: /All/ }));
    expect(props.onTeamFilterChange).toHaveBeenCalledWith("all");

    fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "boardroom" } });
    expect(props.onSearchChange).toHaveBeenCalledWith("boardroom");

    fireEvent.click(screen.getByRole("button", { name: /Survey needs attention/ }));
    expect(props.onSurveyAttentionToggle).toHaveBeenCalledTimes(1);
  });

  it("mirrors the switch it is handed rather than flipping its own copy", () => {
    renderBar({ surveyAttentionOnly: true });

    expect(screen.getByRole("button", { name: /Survey needs attention/ }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("ProjectsFilterBar member chips", () => {
  it("offers no chips outside the team view", () => {
    renderBar();

    expect(screen.queryByText("Filter by member:")).toBeNull();
  });

  it("offers the other members inside the team view, with their initials", () => {
    renderBar({ teamFilter: "team" });

    // The signed-in rep is not a chip: the team view already excludes their work.
    expect(screen.queryByRole("button", { name: /Sam Reed/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Alex Morgan/ }).textContent).toContain("AM");
  });

  it("offers no chips when the rep is alone in the workspace", () => {
    renderBar({ teamFilter: "team", members: [members[0]] });

    expect(screen.queryByText("Filter by member:")).toBeNull();
  });

  it("reports the member a chip names", () => {
    const props = renderBar({ teamFilter: "team" });

    fireEvent.click(screen.getByRole("button", { name: /Alex Morgan/ }));
    expect(props.onMemberFilterChange).toHaveBeenCalledWith("u2");
  });

  it("clears the narrowing when the chosen chip is pressed again", () => {
    const props = renderBar({ teamFilter: "team", memberFilter: "u2" });

    fireEvent.click(screen.getByRole("button", { name: /Alex Morgan/ }));
    expect(props.onMemberFilterChange).toHaveBeenCalledWith(null);
  });

  it("marks the chosen member, and All when nothing is chosen", () => {
    renderBar({ teamFilter: "team", memberFilter: "u2" });
    expect(screen.getByRole("button", { name: /Alex Morgan/ }).className).toContain("is-active");
    expect(screen.getByRole("button", { name: "All" }).className).not.toContain("is-active");
  });
});
