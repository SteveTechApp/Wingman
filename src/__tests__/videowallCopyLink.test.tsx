import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetProjectStore, saveDiscoveryBriefToProject } from "../wingman2/data/projectStore";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { wallLinkFromSearch } from "../wingman2/lib/wallLink";
import { WALL_REVIEW_PASS_KEY } from "../wingman2/lib/wallReviewPass";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

const UI_MODE_KEY = "wingman-ui-mode-v1";

function renderBuilder(entry = "/wingman/videowall") {
  return render(
    <UiModeProvider>
      <MemoryRouter initialEntries={[entry]}>
        <VideoWallPage />
      </MemoryRouter>
    </UiModeProvider>,
  );
}

/** A clipboard that records what the action would paste. */
function stubClipboard(result: "resolve" | "reject" = "resolve") {
  const writeText = vi.fn(() =>
    result === "resolve" ? Promise.resolve() : Promise.reject(new Error("denied")),
  );
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

/** The clipboard carries a sentence ending in the address, so read the address back. */
const copiedUrl = (writeText: ReturnType<typeof vi.fn>) =>
  new URL((writeText.mock.calls[0][0] as string).trim().split(/\s+/).pop()!);

describe("copying a builder link", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetProjectStore();
    // The action sits in the builder's own action bar.
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  it("copies the design and the pass, and says what the link carries", async () => {
    const writeText = stubClipboard();
    window.localStorage.setItem(WALL_REVIEW_PASS_KEY, "transport");

    renderBuilder();
    // The remembered pass reopens on screen, so the rep answers on the design
    // pass and then shares the wiring they were reading.
    fireEvent.click(screen.getByTestId("videowall-review-decision"));
    fireEvent.click(screen.getByRole("button", { name: /One wide picture across two projectors/ }));
    fireEvent.click(screen.getByTestId("videowall-review-transport"));
    fireEvent.click(screen.getByRole("button", { name: /Copy link to the transport and survey pass/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = copiedUrl(writeText);
    // An absolute address, because the paste target is usually chat or email.
    expect(url.origin).toBe(window.location.origin);
    expect(wallLinkFromSearch(url.search)?.projectors).toBe(2);
    expect(new URLSearchParams(url.search).get("pass")).toBe("transport");

    const status = screen.getByText(/Link copied:/).textContent ?? "";
    expect(status).toContain("opening on the transport and survey pass");
    expect(status).toContain("Survey measurements stay with the room");
  });

  it("names the opening pass when the rep is reading the design", async () => {
    const writeText = stubClipboard();

    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = copiedUrl(writeText);
    // The opening pass is left out of the address, so the link stays short.
    expect(new URLSearchParams(url.search).get("pass")).toBeNull();
    expect(screen.getByText(/Link copied:/).textContent).toContain("opening on the design pass");
  });

  it("shares whichever pass the rep moved to, from the pass itself", async () => {
    const writeText = stubClipboard();

    renderBuilder();
    fireEvent.click(screen.getByTestId("videowall-review-wall"));
    fireEvent.click(screen.getByRole("button", { name: /Copy link to the wall pass/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = copiedUrl(writeText);
    expect(new URLSearchParams(url.search).get("pass")).toBe("wall");
    expect(wallLinkFromSearch(url.search)).not.toBeNull();
    expect(screen.getByText(/Link copied:/).textContent).toContain("opening on the wall pass");
  });

  it("copies a line naming the project and the panel beside the address", async () => {
    const writeText = stubClipboard();
    saveDiscoveryBriefToProject({ roomModel: { customer: "Acme", roomType: "Boardroom" }, capturedPercent: 10 });

    renderBuilder();
    fireEvent.click(screen.getByTestId("videowall-review-transport"));
    fireEvent.click(screen.getByRole("button", { name: /Copy link to the transport and survey pass/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = writeText.mock.calls[0][0] as string;
    // A paste into chat explains itself: whose wall it is, the display it is
    // built on, and which panel it opens.
    expect(text).toMatch(/^Acme Boardroom — video wall, 55 in panels \(transport and survey panel\): https?:\/\//);
    const pasted = copiedUrl(writeText);
    expect(new URLSearchParams(pasted.search).get("pass")).toBe("transport");
    expect(wallLinkFromSearch(pasted.search)).not.toBeNull();
  });

  it("says so when the browser refuses the clipboard", async () => {
    stubClipboard("reject");

    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() =>
      expect(screen.getByText(/Could not copy the link/)).toBeTruthy(),
    );
  });
});
