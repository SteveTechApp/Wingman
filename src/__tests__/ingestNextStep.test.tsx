import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { IngestPage } from "@/wingman2/pages/IngestPage";

describe("Request Decoder next step", () => {
  it("sends a bulk competitor list directly to Proposal without unrelated workflow choices", () => {
    render(
      <MemoryRouter>
        <IngestPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Request type" }), {
      target: { value: "BOM / competitor list" },
    });

    const proposalLinks = screen.getAllByRole("link", { name: "Next: build proposal" });
    expect(proposalLinks.length).toBeGreaterThan(0);
    proposalLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/wingman/proposal");
    });

    expect(screen.queryByRole("link", { name: "Open Discovery" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Recommendations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Compare competitor items" })).not.toBeInTheDocument();
  });
});
