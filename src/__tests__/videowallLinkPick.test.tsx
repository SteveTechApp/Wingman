import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { WALL_PICK_PARAM } from "../wingman2/lib/wallPick";
import { decideVideowall } from "../wingman2/lib/videowallDecision";
import { defaultWallRequirements } from "../wingman2/lib/videowallOptions";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

const UI_MODE_KEY = "wingman-ui-mode-v1";

/** The design the verdict is reading from; the options list has no heading. */
const verdictTitle = () => document.getElementById("wall-selected-title")?.textContent ?? "";

function renderBuilder(entry = "/wingman/videowall") {
  return render(
    <UiModeProvider>
      <MemoryRouter initialEntries={[entry]}>
        <VideoWallPage />
      </MemoryRouter>
    </UiModeProvider>,
  );
}

function stubClipboard() {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

/** The clipboard carries a sentence ending in the address. */
const copiedUrl = (writeText: ReturnType<typeof vi.fn>) =>
  new URL((writeText.mock.calls[0][0] as string).trim().split(/\s+/).pop()!);

/** The design Wingman leads with for the default answers, and the one it offers next. */
const decision = decideVideowall(defaultWallRequirements);
const recommendation = decision.recommended!.option;
const alternative = decision.alternative!.option;

describe("the design a builder link carries", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  it("opens the builder on the design the link names instead of the recommendation", () => {
    renderBuilder(`/wingman/videowall?${WALL_PICK_PARAM}=${alternative.id}`);

    // The recipient reads the architecture the sender chose, and the verdict
    // says it was a choice rather than Wingman's lead.
    expect(verdictTitle()).toBe(alternative.title);
    expect(screen.getByText("Your selection")).toBeTruthy();
    expect(screen.getByText("Not the recommendation")).toBeTruthy();
  });

  it("falls back to the recommendation for a design these answers do not reach", () => {
    renderBuilder(`/wingman/videowall?${WALL_PICK_PARAM}=not-a-design`);

    // A rotted or hand-edited id is ignored rather than emptying the verdict.
    expect(verdictTitle()).toBe(recommendation.title);
    expect(screen.queryByText("Your selection")).toBeNull();
  });

  it("copies the rep's choice as well as the wall and the pass", async () => {
    const writeText = stubClipboard();
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: "Show this design" }));
    expect(verdictTitle()).toBe(alternative.title);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = copiedUrl(writeText);
    expect(new URLSearchParams(url.search).get(WALL_PICK_PARAM)).toBe(alternative.id);
    // The confirmation names the design, so the rep can see what travelled.
    expect(screen.getByText(/Link copied:/).textContent).toContain(
      `carrying ${alternative.title} as the chosen design`,
    );
  });

  it("leaves the recommendation out of the link", async () => {
    const writeText = stubClipboard();
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = copiedUrl(writeText);
    // The recommendation is the absence of a pick: the recipient's own
    // catalogue leads for these answers.
    expect(new URLSearchParams(url.search).get(WALL_PICK_PARAM)).toBeNull();
    expect(screen.getByText(/Link copied:/).textContent).not.toContain("chosen design");
  });
});
