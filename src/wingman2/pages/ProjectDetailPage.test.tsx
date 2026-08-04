import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteProject, updateStoredProject, storedProject } = vi.hoisted(() => ({
  deleteProject: vi.fn(),
  updateStoredProject: vi.fn(),
  storedProject: {
    id: "project-1",
    name: "Meeting Room Refresh",
    owner: "Northbridge",
    stage: "Discovery",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-08-04T09:00:00.000Z",
    resumeTo: "/wingman/discovery",
    requirements: [],
    productSelections: [],
    compareRuns: [],
    recommendationEvidence: {
      productDirection: "Presentation / UC",
      systemShape: "Meeting room presentation system",
      quoteSafetyStatus: "do-not-quote",
      quoteSafetyMessage: "Confirm the USB path.",
      nextBestQuestion: "Who owns the USB host?",
      missingInformation: ["USB host ownership"],
      productFamilyScores: [],
      evidenceUsed: [],
      requiredDependencies: [],
    },
  },
}));

vi.mock("../data/projectStore", () => ({
  setActiveProjectId: vi.fn(),
  saveProjectRequirementsToProject: vi.fn(),
  updateStoredProject: (...args: unknown[]) => updateStoredProject(...args),
  useProjectStore: () => ({
    projects: [storedProject],
    syncStatus: { state: "local", message: "Saved in this browser." },
    deleteProject,
  }),
}));

import { ProjectDetailPage } from "./ProjectDetailPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/wingman/projects/project-1"]}>
      <Routes>
        <Route path="/wingman/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/wingman/projects" element={<div>Projects list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Project Detail review controls", () => {
  beforeEach(() => {
    deleteProject.mockClear();
    updateStoredProject.mockClear();
  });

  it("renders persistent review navigation and edits project metadata", () => {
    renderPage();

    expect(screen.getByRole("navigation", { name: "Project review navigation" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Requirements" }).getAttribute("href")).toBe("#project-requirements");
    expect(screen.getByRole("link", { name: "Evidence" }).getAttribute("href")).toBe("#project-evidence");

    fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Updated Boardroom" } });
    fireEvent.change(screen.getByLabelText("Owner / customer"), { target: { value: "Apex Group" } });
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    expect(updateStoredProject).toHaveBeenCalledWith("project-1", expect.any(Function));
    const updater = updateStoredProject.mock.calls[0][1];
    expect(updater({ name: "Old", owner: "Old owner" })).toMatchObject({
      name: "Updated Boardroom",
      owner: "Apex Group",
      updated: "Just now",
    });
  });

  it("requires confirmation before deleting and returns to Projects", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteProject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(deleteProject).toHaveBeenCalledWith("project-1");
    expect(screen.getByText("Projects list")).not.toBeNull();
  });

  it("walks the user through proposal blockers before routing to the fixing workflow", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Review .* project blocker/ }));

    expect(screen.getByRole("region", { name: "Proposal blocker walkthrough" })).not.toBeNull();
    expect(screen.getByText(/Blocker 1 of/)).not.toBeNull();
    expect(screen.getByText("USB host ownership")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Resolve in Discovery" }).getAttribute("href")).toBe("/wingman/discovery");
  });
});
