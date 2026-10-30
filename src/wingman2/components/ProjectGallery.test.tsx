import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StoredProject } from "../data/projectStore";

// The gallery's job is the list and the empty state, not the card itself; the
// card's own flags and actions are covered by the page test.
vi.mock("./ProjectGalleryCard", () => ({
  ProjectGalleryCard: ({ project }: { project: StoredProject }) => (
    <article aria-label={project.name}>
      <h3>{project.name}</h3>
    </article>
  ),
}));

import { ProjectGallery } from "./ProjectGallery";

type GalleryProps = Parameters<typeof ProjectGallery>[0];

function project(id: string, name: string): StoredProject {
  return {
    id,
    name,
    owner: "Sales",
    stage: "Recommendations",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-08-16T09:00:00.000Z",
    createdAt: "2026-08-16T09:00:00.000Z",
    resumeTo: "/wingman/compare",
    compareRuns: [],
  };
}

function galleryProps(overrides: Partial<GalleryProps> = {}): GalleryProps {
  return {
    projects: [],
    visibleProjects: [],
    activeProjectId: null,
    currentUserId: null,
    migratedWalls: 0,
    templates: [],
    teamFilter: "mine",
    surveyAttentionOnly: false,
    resetKey: "",
    getMemberName: () => "Team member",
    getMemberInitials: () => "TM",
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onShowAllProjects: vi.fn(),
    ...overrides,
  };
}

function renderGallery(overrides: Partial<GalleryProps> = {}) {
  return render(<ProjectGallery {...galleryProps(overrides)} />);
}

describe("project gallery", () => {
  it("renders the visible view, not the whole store", () => {
    renderGallery({
      projects: [project("one", "First Project"), project("two", "Second Project")],
      visibleProjects: [project("two", "Second Project")],
    });

    // A filtered view shows the row that matched while the card still receives
    // the whole store for the facts it reads across projects.
    expect(screen.getByRole("article", { name: "Second Project" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "First Project" })).toBeNull();
  });

  it("names the tab that emptied the gallery instead of claiming an empty store", () => {
    const { rerender } = renderGallery({ teamFilter: "mine" });
    expect(screen.getByText(/No projects found for you/)).toBeTruthy();

    rerender(<ProjectGallery {...galleryProps({ teamFilter: "team" })} />);
    expect(screen.getByText(/No team projects found/)).toBeTruthy();

    rerender(<ProjectGallery {...galleryProps({ teamFilter: "all" })} />);
    expect(screen.getByText(/No active projects are currently listed/)).toBeTruthy();
  });

  it("offers a way out of the survey queue's own empty state", () => {
    const onShowAllProjects = vi.fn();
    renderGallery({ surveyAttentionOnly: true, onShowAllProjects });

    expect(screen.getByText(/No projects in this view need survey attention/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show all projects" }));

    expect(onShowAllProjects).toHaveBeenCalledTimes(1);
  });
});
