import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { PROJECT_STORE_KEY } from "../wingman2/features/projects/persistence/projectRepository";
import { VIDEO_WALL_DRAFT_KEY } from "../wingman2/lib/videowallDraft";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

/**
 * What pressing Save on the wall builder leaves in this browser.
 *
 * The design has exactly two homes and they are read by different surfaces: the
 * draft is what a reload reopens, and the project is what the gallery, the
 * proposal and the export read. A third store written with the same summary — the
 * `wingman:video-wall-last-summary` copy that lived here — was written on every
 * save and read by nothing, so it was storage a rep paid for and never saw, and
 * the next reader could not tell which of the three copies was current.
 *
 * The reading is the set of keys a save writes rather than the absence of that
 * one key: a future save that writes a fourth store fails here the same way.
 */

const UI_MODE_KEY = "wingman-ui-mode-v1";

function renderBuilder() {
  return render(
    <UiModeProvider>
      <MemoryRouter initialEntries={["/wingman/videowall"]}>
        <VideoWallPage />
      </MemoryRouter>
    </UiModeProvider>,
  );
}

/** The save that writes the design, after opening the wall as a pre-survey draft where it must. */
function saveTheDesign() {
  const save = screen.getByRole("button", { name: "Save to project" }) as HTMLButtonElement;
  // A wall whose installation cells are still blank only saves as a pre-survey
  // draft, which is the flow that writes a design from a fresh room.
  if (save.disabled) {
    fireEvent.click(screen.getByRole("checkbox", { name: /Save as a pre-survey draft/ }));
  }
  const written = vi.spyOn(Storage.prototype, "setItem");
  fireEvent.click(screen.getByRole("button", { name: "Save to project" }));
  const keys = written.mock.calls.map(([key]) => String(key));
  written.mockRestore();
  return keys;
}

describe("saving a video wall design", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the draft and the project, and nothing else", () => {
    renderBuilder();

    const written = saveTheDesign();

    expect(screen.getByText(/Design direction saved to /)).toBeTruthy();
    expect([...new Set(written)].sort()).toEqual([PROJECT_STORE_KEY, VIDEO_WALL_DRAFT_KEY].sort());
  });

  it("leaves both copies holding the design, so neither store is a receipt for the other", () => {
    renderBuilder();

    saveTheDesign();

    const draft = JSON.parse(window.localStorage.getItem(VIDEO_WALL_DRAFT_KEY) ?? "null");
    const store = JSON.parse(window.localStorage.getItem(PROJECT_STORE_KEY) ?? "null");
    const saved = store?.projects?.find((project: { videowall?: unknown }) => Boolean(project.videowall));
    // The draft is what a reload reopens, the project is what the gallery reads;
    // a save that wrote one of them and not the other would leave the two
    // readings of this design disagreeing about it.
    expect(draft?.requirements).toBeTruthy();
    expect(saved?.videowall?.summary).toEqual(draft);
  });
});
