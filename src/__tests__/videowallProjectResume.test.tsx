import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { PROJECT_STORE_KEY } from "../wingman2/features/projects/persistence/projectRepository";
import { wallLinkFromSearch } from "../wingman2/lib/wallLink";
import { defaultWallRequirements } from "../wingman2/lib/videowallOptions";
import { VIDEO_WALL_DRAFT_KEY } from "../wingman2/lib/videowallDraft";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

const UI_MODE_KEY = "wingman-ui-mode-v1";

/** Reads what a copied address bar would say, which is what a shared link is. */
function AddressBar() {
  const location = useLocation();
  return <p data-testid="address-bar">{`${location.pathname}${location.search}`}</p>;
}

const addressParams = () =>
  new URLSearchParams((screen.getByTestId("address-bar").textContent ?? "").split("?")[1] ?? "");

/**
 * Two projects in this browser, each with a saved wall: the one the record page
 * is about, and another the rep was working on afterwards.
 */
function seedProjects() {
  window.localStorage.setItem(PROJECT_STORE_KEY, JSON.stringify({
    projects: [
      {
        id: "project-1",
        name: "Boardroom wall",
        owner: "Northbridge",
        stage: "Proposal",
        status: "recommended",
        updated: "Today",
        resumeTo: "/wingman/projects",
        createdAt: "2026-10-20T09:00:00.000Z",
        updatedAt: "2026-10-20T14:12:00.000Z",
        videowall: {
          wallType: "lcd",
          savedAt: "2026-10-20T14:12:00.000Z",
          summary: {
            version: 2,
            requirements: { ...defaultWallRequirements, columns: 4, rows: 1, sources: 2 },
            updatedAt: "2026-10-20T14:12:00.000Z",
          },
        },
      },
      {
        id: "project-2",
        name: "Lobby wall",
        owner: "Northbridge",
        stage: "Design",
        status: "alternative",
        updated: "Today",
        resumeTo: "/wingman/projects",
        createdAt: "2026-10-20T09:00:00.000Z",
        updatedAt: "2026-10-20T16:00:00.000Z",
        videowall: {
          wallType: "lcd",
          savedAt: "2026-10-20T16:00:00.000Z",
          summary: {
            version: 2,
            requirements: { ...defaultWallRequirements, columns: 2, rows: 2, sources: 4 },
            updatedAt: "2026-10-20T16:00:00.000Z",
          },
        },
      },
    ],
    proposalDrafts: [],
    activeProjectId: "project-1",
  }));
}

describe("the builder's project-scoped address", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  function renderBuilder(entry: string) {
    return render(
      <UiModeProvider>
        <MemoryRouter initialEntries={[entry]}>
          <AddressBar />
          <VideoWallPage />
        </MemoryRouter>
      </UiModeProvider>,
    );
  }

  it("opens the project's own wall when another project's draft is newer here", async () => {
    seedProjects();
    // The rep's last edit in this browser was the other room, and it is newer
    // than the wall the record page is about.
    window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
      version: 2,
      requirements: { ...defaultWallRequirements, columns: 2, rows: 2, sources: 4 },
      selectedId: "",
      projectId: "project-2",
      updatedAt: "2026-10-20T18:00:00.000Z",
    }));

    renderBuilder("/wingman/videowall?project=project-1");

    // The builder puts the wall it has open in the address, so the address is
    // the honest answer to "which wall did that link open".
    await waitFor(() => expect(addressParams().get("wall")).toBeTruthy());
    const opened = wallLinkFromSearch(addressParams());
    expect(opened?.columns).toBe(4);
    expect(opened?.rows).toBe(1);
    // The scope rides beside the wall, so the reload a rep does mid-edit keeps
    // landing on this project rather than drifting to the newer draft.
    expect(addressParams().get("project")).toBe("project-1");
  });

  it("still resumes the project's own unsaved edits", async () => {
    seedProjects();
    window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
      version: 2,
      requirements: { ...defaultWallRequirements, columns: 6, rows: 1, sources: 2 },
      selectedId: "",
      projectId: "project-1",
      updatedAt: "2026-10-20T18:00:00.000Z",
    }));

    renderBuilder("/wingman/videowall?project=project-1");

    await waitFor(() => expect(addressParams().get("wall")).toBeTruthy());
    expect(wallLinkFromSearch(addressParams())?.columns).toBe(6);
  });

  it("opens the plain draft when the address names no project", async () => {
    seedProjects();
    window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
      version: 2,
      requirements: { ...defaultWallRequirements, columns: 2, rows: 2, sources: 4 },
      selectedId: "",
      projectId: "project-2",
      updatedAt: "2026-10-20T18:00:00.000Z",
    }));

    // The dashboard card and the Copy link action still open whatever this
    // browser holds, which is what a rep asking for "the wall I was editing" means.
    renderBuilder("/wingman/videowall");

    await waitFor(() => expect(addressParams().get("wall")).toBeTruthy());
    expect(wallLinkFromSearch(addressParams())?.columns).toBe(2);
  });
});
