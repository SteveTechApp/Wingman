import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  resetWallStartingPointsCache,
  SAVED_WALL_STARTING_POINTS_KEY,
  savedWallStartingPoints,
} from "../wingman2/lib/wallStartingPoints";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

describe("saved wall starting points on the builder", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetWallStartingPointsCache();
    // The wall picker is the expert builder's start panel, not the focused
    // wizard's first question.
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
  });

  it("saves the wall the rep adjusted and offers it at the start next time", () => {
    const first = render(
      <UiModeProvider>
        <MemoryRouter>
          <VideoWallPage />
        </MemoryRouter>
      </UiModeProvider>,
    );

    // Pick a shipped wall, which lands on the guided result.
    fireEvent.click(screen.getByTestId("videowall-preset-led-ribbon"));
    fireEvent.click(screen.getByTestId("videowall-save-starting-point"));

    expect(screen.getByText(/Saved as a starting point/).textContent).toContain("Saved as a starting point");
    const saved = savedWallStartingPoints();
    expect(saved).toHaveLength(1);

    // Starting again returns to the picker, which now carries the rep's wall.
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByTestId(`videowall-preset-${saved[0].key}`).textContent).toContain("Saved ·");

    // And it is still there when the builder is opened again.
    first.unmount();
    render(
      <UiModeProvider>
        <MemoryRouter>
          <VideoWallPage />
        </MemoryRouter>
      </UiModeProvider>,
    );
    expect(screen.getByTestId(`videowall-preset-${saved[0].key}`).textContent).toContain("Saved ·");
  });

  it("marks the card the answers started on until the rep starts again", () => {
    render(
      <UiModeProvider>
        <MemoryRouter>
          <VideoWallPage />
        </MemoryRouter>
      </UiModeProvider>,
    );

    fireEvent.click(screen.getByTestId("videowall-preset-led-ribbon"));

    // Coming back to the start names the wall this design came from, which is a
    // different fact from the answers still matching it exactly.
    const picked = screen.getByTestId("videowall-preset-led-ribbon");
    expect(picked.getAttribute("data-started")).toBe("true");
    expect(picked.textContent).toContain("Started here · ");
    expect(picked.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("videowall-preset-nine-feeds").getAttribute("data-started")).toBeNull();

    // Another card moves the origin rather than adding a second one.
    fireEvent.click(screen.getByTestId("videowall-preset-nine-feeds"));
    expect(screen.getByTestId("videowall-preset-nine-feeds").getAttribute("data-started")).toBe("true");
    expect(screen.getByTestId("videowall-preset-led-ribbon").getAttribute("data-started")).toBeNull();

    // A wall answered from scratch started on nothing.
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByTestId("videowall-preset-nine-feeds").getAttribute("data-started")).toBeNull();
  });

  it("forgets a saved wall from the picker", () => {
    render(
      <UiModeProvider>
        <MemoryRouter>
          <VideoWallPage />
        </MemoryRouter>
      </UiModeProvider>,
    );
    fireEvent.click(screen.getByTestId("videowall-preset-led-ribbon"));
    fireEvent.click(screen.getByTestId("videowall-save-starting-point"));
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));

    const key = savedWallStartingPoints()[0].key;
    fireEvent.click(screen.getByRole("button", { name: /Remove starting point/ }));

    expect(screen.queryByTestId(`videowall-preset-${key}`)).toBeNull();
    expect(window.localStorage.getItem(SAVED_WALL_STARTING_POINTS_KEY)).toBe("[]");
  });
});
