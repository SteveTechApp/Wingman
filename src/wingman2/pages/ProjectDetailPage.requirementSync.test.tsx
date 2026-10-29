import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectDetailPage } from "./ProjectDetailPage";
import {
  readProjectStore,
  resetProjectStore,
  saveDealOutcome,
  saveProjectRequirementsToProject,
  upsertStoredProject,
} from "../features/projects";

/**
 * The Requirements panel follows the project record.
 *
 * The page keeps the rows in state so an edit it makes itself is on screen at
 * once, so the state has to be re-seated from the record when the record moves —
 * a snapshot row can no longer be the only copy of what the room answered.
 * `ProjectDetailPage.test.tsx` mocks the store, which cannot re-render under a
 * write, so the refresh is pinned here against the real one.
 */

function row(id: string, label: string, value: string, status: "confirmed" | "review" | "unknown") {
  return {
    id,
    label,
    value,
    category: "Application",
    source: "Discovery",
    status,
    whyItMatters: `${label} drives the design.`,
    updatedAt: "2026-10-26T09:00:00.000Z",
  };
}

function seedProject(requirements: ReturnType<typeof row>[]) {
  return upsertStoredProject({
    id: "project-sync",
    name: "Sync Room",
    owner: "Northbridge",
    stage: "Discovery",
    status: "recommended",
    updated: "Today",
    resumeTo: "/wingman/discovery",
    createdAt: "2026-10-26T09:00:00.000Z",
    updatedAt: "2026-10-26T09:00:00.000Z",
    requirements,
  } as never);
}

function renderRecord(projectId: string, query = "?view=confirm") {
  return render(
    <MemoryRouter initialEntries={[`/wingman/projects/${projectId}${query}`]}>
      <Routes>
        <Route path="/wingman/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Project record requirements follow the saved rows", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetProjectStore();
  });

  it("shows a requirement saved from outside the page without a reload", async () => {
    const project = seedProject([row("application", "Application / room type", "Boardroom", "confirmed")]);
    renderRecord(project.id);

    const list = await screen.findByTestId("project-requirement-list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);

    // Discovery in another tab, a teammate's save, a sync — all of them land in
    // the record rather than in this page's state.
    saveProjectRequirementsToProject(project.id, [
      row("application", "Application / room type", "Boardroom", "confirmed"),
      row("source-count", "Source count", "4 laptops", "review"),
    ]);

    await waitFor(() =>
      expect(
        within(screen.getByTestId("project-requirement-list")).getAllByRole("listitem"),
      ).toHaveLength(2),
    );
    // The count line is the new record's, not the one the page opened on.
    expect(screen.getByTestId("project-requirement-summary").textContent)
      .toBe("2 requirements: 1 confirmed · 1 needs review.");
  });

  it("keeps the sentence the rep is reading when the record is written around it", async () => {
    const project = seedProject([
      row("application", "Application / room type", "Boardroom", "confirmed"),
      row("source-count", "Source count", "4 laptops", "review"),
    ]);
    renderRecord(project.id, "?view=confirm&edit=true");

    // A confirmation this page produced, from an action that writes nothing.
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Save project/ }));
    expect(screen.getByTestId("project-detail-message").textContent).toContain(
      "Project name is required.",
    );

    // The record is written around the rep: a deal outcome recorded in another
    // panel. The rows may move with the record; the sentence may not vanish.
    saveDealOutcome(project.id, "won", "Verbal approval");
    await waitFor(() => expect(readProjectStore().projects[0].dealOutcome).toBe("won"));

    expect(screen.getByTestId("project-detail-message").textContent).toContain(
      "Project name is required.",
    );
    expect(
      within(screen.getByTestId("project-requirement-list")).getAllByRole("listitem"),
    ).toHaveLength(2);
  });
});
