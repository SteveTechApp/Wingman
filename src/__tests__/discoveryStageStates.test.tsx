import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { DiscoveryPage } from "@/wingman2/pages/DiscoveryPage";

describe("Discovery Trail stage states", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("marks the in-progress stage separately from completed stages", async () => {
    render(
      <MemoryRouter>
        <DiscoveryPage />
      </MemoryRouter>,
    );

    const opportunityStage = screen.getByRole("button", { name: /^1\s+Opportunity/i });
    const scaleStage = screen.getByRole("button", { name: /^2\s+Scale/i });

    expect(opportunityStage).toHaveClass("is-active");
    expect(opportunityStage).not.toHaveClass("is-captured");

    fireEvent.click(screen.getByRole("button", { name: /Meeting room \/ boardroom/i }));

    await waitFor(() => {
      expect(scaleStage).toHaveClass("is-active");
    });

    expect(opportunityStage).toHaveClass("is-captured");
    expect(opportunityStage).not.toHaveClass("is-active");
  });
});
