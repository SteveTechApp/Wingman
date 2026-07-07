import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PageHero } from "@/wingman2/components/PageHero";

describe("PageHero guidance", () => {
  it("shows the recommended next step as visible page guidance", () => {
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

    const guidance = screen.getByRole("note", { name: "Recommended next step" });
    expect(guidance).toHaveTextContent("Next step");
    expect(guidance).toHaveTextContent("Continue to proposal with the selected SKU.");
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/wingman/proposal");
  });
});
