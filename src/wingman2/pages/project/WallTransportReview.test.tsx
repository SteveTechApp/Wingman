import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { routeCatalogByKey } from "../../app/routeCatalog";
import { beforeEach, describe, expect, it } from "vitest";
import type { StoredProject } from "../../features/projects";
import { wallStartPresets } from "../../lib/videowallDecision";
import { wallStartingPointOrigin } from "../../lib/wallStartingPointOrigin";
import type { WallRequirements } from "../../lib/videowallOptions";
import { VIDEO_WALL_DRAFT_KEY } from "../../lib/videowallDraft";
import { WallTransportReview } from "./WallTransportReview";

const preset = wallStartPresets.find((entry) => entry.key === "two-up")!;

/** A saved wall for these answers, carrying the card it started on. */
function project(requirements: WallRequirements, startingPoint?: ReturnType<typeof wallStartingPointOrigin>): StoredProject {
  return {
    id: "project-1",
    name: "Boardroom wall",
    owner: "Northbridge",
    stage: "Proposal",
    status: "recommended",
    updated: "Today",
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T14:12:00.000Z",
    resumeTo: "/wingman/projects",
    videowall: {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: { version: 2, requirements, ...(startingPoint ? { startingPoint } : {}) },
    },
  } as unknown as StoredProject;
}

function renderPanel(value: StoredProject) {
  return render(
    <MemoryRouter>
      <WallTransportReview project={value} />
    </MemoryRouter>,
  );
}

/** This browser's draft of a wall, stamped and owned like the builder writes it. */
function seedDraft(updatedAt: string, projectId: string | null) {
  window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
    version: 2,
    requirements: preset.requirements,
    selectedId: "",
    projectId,
    updatedAt,
  }));
}

describe("WallTransportReview draft status", () => {
  beforeEach(() => window.localStorage.clear());

  it("says the builder holds newer work than the wall this project saved", () => {
    seedDraft("2026-10-20T16:00:00.000Z", "project-1");
    renderPanel(project(preset.requirements));

    const note = screen.getByTestId("wall-transport-draft-status");
    // The same sentence the builder prints, because it is one fact about one
    // pair of copies rather than a second opinion.
    expect(note.getAttribute("data-draft-status")).toBe("draft-ahead");
    expect(note.textContent).toContain("the project copy is behind");
    expect(note.textContent).toContain("A reload is safe");
    // The note leads into the builder the rep has to open to save that work, so
    // picking it back up is the next thing offered rather than a page to hunt for.
    const link = screen.getByRole("link", { name: "Continue in the wall builder" });
    expect(note.contains(link)).toBe(true);
    // The link names this project, because a bare builder address would reopen
    // whichever wall in this browser was edited last.
    expect(link.getAttribute("href")).toBe(`${routeCatalogByKey.videowall.path}?project=project-1`);
  });

  it("leads into the builder from the state with no project copy yet", () => {
    seedDraft("2026-10-20T16:00:00.000Z", "project-1");
    const saved = project(preset.requirements);
    const unsaved = { ...saved, videowall: { ...saved.videowall!, savedAt: "" } } as StoredProject;
    renderPanel(unsaved);

    const note = screen.getByTestId("wall-transport-draft-status");
    expect(note.getAttribute("data-draft-status")).toBe("draft-only");
    // The draft is still the work, so the same way back is offered.
    expect(screen.getByRole("link", { name: "Continue in the wall builder" }).getAttribute("href"))
      .toBe(`${routeCatalogByKey.videowall.path}?project=project-1`);
  });

  it("leaves another project's draft out of this record", () => {
    // The rep is building a second wall; this project's record has not moved.
    seedDraft("2026-10-20T16:00:00.000Z", "project-2");
    renderPanel(project(preset.requirements));

    expect(screen.queryByTestId("wall-transport-draft-status")).toBeNull();
  });

  it("says nothing for a draft that names no project", () => {
    seedDraft("2026-10-20T16:00:00.000Z", null);
    renderPanel(project(preset.requirements));

    expect(screen.queryByTestId("wall-transport-draft-status")).toBeNull();
  });

  it("says nothing when the saved wall already holds the draft's work", () => {
    seedDraft("2026-10-20T09:00:00.000Z", "project-1");
    renderPanel(project(preset.requirements));

    expect(screen.queryByTestId("wall-transport-draft-status")).toBeNull();
    // Nothing to resume, so the panel offers no way to resume it.
    expect(screen.queryByTestId("wall-transport-draft-link")).toBeNull();
  });
});

describe("WallTransportReview starting point", () => {
  it("names the card a saved wall started on and the answers the room changed", () => {
    const origin = wallStartingPointOrigin(preset);
    renderPanel(project({ ...preset.requirements, sources: preset.requirements.sources + 1 }, origin));

    expect(screen.getByTestId("wall-starting-point").textContent).toBe(
      `Started from ${preset.label}. 1 answer changed: Sources: ${preset.requirements.sources} → ${preset.requirements.sources + 1}.`,
    );
    // The record says which card, so a reader can find it in the picker again.
    expect(document.querySelector(`[data-wall-starting-point="${preset.key}"]`)).not.toBeNull();
  });

  it("says a wall still holding the card's answers has not moved", () => {
    renderPanel(project(preset.requirements, wallStartingPointOrigin(preset)));

    expect(screen.getByTestId("wall-starting-point").textContent).toBe(
      `Started from ${preset.label}. No answers changed from the card.`,
    );
  });

  it("renders no starting point for a wall built from scratch", () => {
    renderPanel(project(preset.requirements));

    expect(screen.queryByTestId("wall-starting-point")).toBeNull();
    // The panel itself still reads the design.
    expect(screen.getByTestId("wall-transport-review")).not.toBeNull();
  });
});
