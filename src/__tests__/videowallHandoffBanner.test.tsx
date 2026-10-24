import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UiModeProvider } from "../wingman2/data/uiMode";
import { wallPhysicalSize } from "../wingman2/lib/wallPhysicalSize";
import { seedWallRequirements, writeVideoWallHandoff, type VideoWallHandoff } from "../wingman2/lib/videowallHandoff";
import { VideoWallPage } from "../wingman2/pages/VideowallBuilderPage";

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

function boardroomHandoff(): VideoWallHandoff {
  return {
    source: "template",
    label: "Template: Boardroom",
    requirements: { application: "lcd-direct", columns: 3, rows: 2, windows: 1, sources: 4, customMode: "fixed" },
  };
}

describe("the wall a handoff opened", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // The expert builder is where the note sits above the answers it describes.
    window.localStorage.setItem(UI_MODE_KEY, "unguided");
  });

  it("names the wall in the banner, not only where the answers came from", () => {
    const handoff = boardroomHandoff();
    writeVideoWallHandoff(handoff);

    renderBuilder();

    const banner = screen.getByText(/^Started from Template: Boardroom/);
    // The rep is reading another room's answers, so the banner says what the
    // wall is — the array and the display the proposal would quote — instead of
    // leaving them to open the design to find out.
    expect(banner.textContent).toBe(
      `Started from Template: Boardroom — the 3 × 2 array, ${wallPhysicalSize(seedWallRequirements(handoff)!).basis}. The answers below are taken from that work — adjust anything that differs.`,
    );
    expect(banner.textContent).toContain("the 3 × 2 array, 55 in panels");
  });

  it("names the room a Discovery wall was answered for", () => {
    // A Discovery wall arrives in a builder that serves every room, so the note
    // names the one whose answers these are beside the wall behaviour itself.
    writeVideoWallHandoff({
      source: "discovery",
      label: "Discovery: LCD wall, single canvas",
      projectName: "Boardroom wall",
      requirements: { application: "lcd-loop", layout: "single", columns: 2, rows: 2, windows: 1, sources: 4, customMode: "fixed" },
    });

    renderBuilder();

    expect(screen.getByText(/^Started from Discovery: LCD wall, single canvas \(Boardroom wall\) —/)).toBeTruthy();
  });

  it("quotes the surface the wall is built on rather than calling every wall a panel", () => {
    writeVideoWallHandoff({ ...boardroomHandoff(), requirements: { application: "led", pixelPitchMm: 1.9, columns: 2, rows: 2, windows: 1, sources: 4, customMode: "fixed" } });

    renderBuilder();

    // The same rule as the shared-link banner: an LED canvas reports its pixel
    // pitch, because that is what a reader stands in front of.
    expect(screen.getByText(/^Started from Template: Boardroom/).textContent).toContain("1.9 mm pixel pitch");
  });

  it("names the origin in the guided result, where a handoff opens", () => {
    const handoff = boardroomHandoff();
    writeVideoWallHandoff(handoff);
    // A handoff opens the focused reading on its result, so the note has to sit
    // there: the capture step it used to sit under is never shown to that rep.
    window.localStorage.setItem(UI_MODE_KEY, "guided");

    renderBuilder();

    const result = screen.getByTestId("videowall-wizard-result");
    // The room the answers came from, and the wall they describe, without the
    // rep having to switch readings to find out either.
    expect(result.textContent).toContain(
      `Started from Template: Boardroom — the 3 × 2 array, ${wallPhysicalSize(seedWallRequirements(handoff)!).basis}`,
    );
  });
});
