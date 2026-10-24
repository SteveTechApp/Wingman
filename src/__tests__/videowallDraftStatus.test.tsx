import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { setActiveProjectId, writeProjectStore } from "../wingman2/data/projectStore";
import { VIDEO_WALL_DRAFT_KEY } from "../wingman2/lib/videowallDraft";
import { defaultWallRequirements } from "../wingman2/lib/videowallOptions";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

const UI_MODE_KEY = "wingman-ui-mode-v1";
const PROJECT_ID = "project-boardroom";
const SAVED_AT = "2026-10-20T10:00:00.000Z";

function seedProject(savedAt = SAVED_AT) {
  writeProjectStore({
    projects: [{
      id: PROJECT_ID,
      name: "Boardroom",
      owner: "Sales",
      stage: "Proposal Builder",
      status: "recommended",
      updated: "Today",
      updatedAt: SAVED_AT,
      createdAt: "2026-10-18T09:00:00.000Z",
      resumeTo: "/wingman/videowall",
      compareRuns: [],
      videowall: {
        savedAt,
        wallType: "lcd",
        summary: { version: 2, requirements: defaultWallRequirements, selectedId: "" },
      },
    }],
    proposalDrafts: [],
    activeProjectId: PROJECT_ID,
  }, { syncBackend: false });
  setActiveProjectId(PROJECT_ID);
}

function seedDraft(updatedAt: string) {
  window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
    version: 2,
    requirements: defaultWallRequirements,
    selectedId: "",
    updatedAt,
  }));
}

function renderBuilder() {
  return render(
    <UiModeProvider>
      <MemoryRouter initialEntries={["/wingman/videowall"]}>
        <VideoWallPage />
      </MemoryRouter>
    </UiModeProvider>,
  );
}

const draftStatus = () => screen.queryByTestId("videowall-draft-status");

describe("the builder's draft status", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // The rail is the expert reading; the note sits above it there too.
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  it("says the draft is ahead once an edit outruns the project's saved wall", () => {
    seedProject(SAVED_AT);
    seedDraft("2026-10-20T11:00:00.000Z");

    renderBuilder();

    // The draft is what a reload would reopen, and it is newer than the copy the
    // project holds, so the rep is told both facts without opening anything.
    expect(draftStatus()?.getAttribute("data-draft-status")).toBe("draft-ahead");
    expect(draftStatus()?.textContent).toContain("the project copy is behind");
    expect(draftStatus()?.textContent).toContain("A reload is safe");
  });

  it("says nothing when the project already holds everything the draft does", () => {
    seedProject("2026-10-20T11:00:00.000Z");
    seedDraft(SAVED_AT);

    renderBuilder();

    expect(draftStatus()).toBeNull();
  });

  it("carries the same line into the focused reading", () => {
    window.localStorage.setItem(UI_MODE_KEY, "guided");
    seedProject(SAVED_AT);
    seedDraft("2026-10-20T11:00:00.000Z");

    renderBuilder();

    // Both readings mount the note, so a rep who switches view does not lose the
    // one place that says which copy of the wall is current.
    expect(draftStatus()?.getAttribute("data-draft-status")).toBe("draft-ahead");
  });

  it("appears as soon as the rep edits a wall the project already has", async () => {
    seedProject("2026-10-20T11:00:00.000Z");
    seedDraft(SAVED_AT);
    renderBuilder();
    expect(draftStatus()).toBeNull();

    // Start again is an edit like any other: the builder keeps it as a draft,
    // which is what makes it ahead of the project as soon as it lands.
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));

    await waitFor(() => expect(draftStatus()?.getAttribute("data-draft-status")).toBe("draft-ahead"));
  });
});
