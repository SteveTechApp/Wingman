import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { DiscoveryPage } from "@/wingman2/pages/DiscoveryPage";
import { UiModeProvider } from "@/wingman2/data/uiMode";

// The numbered step-pill trail (clickable "1 Opportunity" / "2 Scale" buttons
// with is-active/is-captured classes) was removed in the Discovery redesign
// in favour of strictly linear Previous/Continue stepping with a compact
// "Step N of M" indicator - there is no jump-to-step UI left to test. This
// covers the behaviour that does still exist and matters: selecting a
// single-select answer auto-advances to the next question.
describe("Discovery step progression", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
    window.sessionStorage.clear();
  });

  it("auto-advances to the next question after selecting a single-select answer", async () => {
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

    expect(await screen.findByText(/^Step 1 of \d+$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Meeting room \/ boardroom/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Step 2 of \d+$/)).toBeInTheDocument();
    });
  });

  it("opens the requested Discovery question from a Proposal edit link", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/discovery?edit=signal-standard"]}>
        <UiModeProvider><DiscoveryPage /></UiModeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Other \/ not sure/i }));
    fireEvent.click(screen.getByRole("button", { name: /Describe the environment/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /Describe the customer’s space or situation/i }), {
      target: { value: "A customer room that still needs classification" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue with this environment" }));

    // Expert view opens detailed questions directly.
    expect(screen.queryByTestId("escalation-confirm")).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "How sharp does the picture need to be?" })).toBeInTheDocument();
  });
});
