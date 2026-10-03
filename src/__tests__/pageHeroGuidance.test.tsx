import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PageHero } from "@/wingman2/components/PageHero";

describe("PageHero guidance", () => {
  it("keeps guidance available on request and the next action visible", () => {
    render(
      <MemoryRouter>
        <PageHero
          eyebrow="Product workflow"
          title="Choose the right direction"
          purpose="Review the current result before moving forward."
          nextMove="Continue to proposal with the selected SKU."
          actions={[{ label: "Continue", to: "/wingman/proposal" }]}
        />
      </MemoryRouter>,
    );

    const summary = screen.getByText("About this page");
    const guidance = summary.closest("details")!;
    expect(guidance.open).toBe(false);
    fireEvent.click(summary);
    expect(guidance.open).toBe(true);
    expect(guidance).toHaveTextContent("Continue to proposal with the selected SKU.");
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/wingman/proposal");
  });
});
