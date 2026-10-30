import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { DiscoveryPage } from "@/wingman2/pages/DiscoveryPage";
import { UiModeProvider } from "@/wingman2/data/uiMode";

describe("Expert room design workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
    window.sessionStorage.clear();
  });

  it("organizes technical discovery into independently navigable room sections", async () => {
    render(
      <MemoryRouter>
        <UiModeProvider><DiscoveryPage /></UiModeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Other \/ not sure/i }));
    fireEvent.click(screen.getByRole("button", { name: /Describe the environment/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /Describe the customer’s space or situation/i }), {
      target: { value: "A customer room that still needs classification" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue with this environment" }));

    expect(await screen.findByRole("heading", { name: "Build the room section by section" })).toBeInTheDocument();
    const sections = screen.getByRole("navigation", { name: "Room design sections" });
    fireEvent.click(within(sections).getByRole("button", { name: /Sources/ }));
    expect(screen.getByRole("region", { name: "Expert room design" })).toHaveAttribute("data-expert-section", "sources");
    expect(screen.getByRole("heading", { name: "Devices, user connections and source positions" })).toBeInTheDocument();
  });

  it("opens the requested technical section from a Proposal edit link, ahead of the market lead-in", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/discovery?edit=signal-standard"]}>
        <UiModeProvider><DiscoveryPage /></UiModeProvider>
      </MemoryRouter>,
    );

    // The link names one answer, so the room-positioning lead-in does not stand
    // in front of it — a rep who clicked a row lands on that row.
    expect(screen.queryByRole("button", { name: /Describe the environment/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("escalation-confirm")).not.toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Expert room design" })).toHaveAttribute("data-expert-section", "outputs");
    expect(screen.getByRole("heading", { name: "How sharp does the picture need to be?" })).toBeInTheDocument();
  });

  it("keeps the market lead-in when the link names a question this room cannot show", async () => {
    render(
      // A UC question the saved answers hide until a conferencing workflow is
      // chosen: landing on it would leave the rep at the top of the builder, so
      // the lead-in — the step that can put it back on screen — stays first.
      <MemoryRouter initialEntries={["/wingman/discovery?edit=mtr-av-integration"]}>
        <UiModeProvider><DiscoveryPage /></UiModeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /Describe the environment/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Expert room design" })).not.toBeInTheDocument();
  });
});
