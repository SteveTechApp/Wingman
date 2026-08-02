import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { DiscoveryPage } from "@/wingman2/pages/DiscoveryPage";

// The numbered step-pill trail (clickable "1 Opportunity" / "2 Scale" buttons
// with is-active/is-captured classes) was removed in the Discovery redesign
// in favour of strictly linear Previous/Continue stepping with a compact
// "Step N of M" indicator - there is no jump-to-step UI left to test. This
// covers the behaviour that does still exist and matters: selecting a
// single-select answer auto-advances to the next question.
describe("Discovery step progression", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("auto-advances to the next question after selecting a single-select answer", async () => {
    render(
      <MemoryRouter>
        <DiscoveryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/^Step 1 of \d+$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Meeting room \/ boardroom/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Step 2 of \d+$/)).toBeInTheDocument();
    });
  });

  it("opens the requested Discovery question from a Proposal edit link", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/discovery?edit=signal-standard"]}>
        <DiscoveryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "How sharp does the picture need to be?" })).toBeInTheDocument();
  });
});
