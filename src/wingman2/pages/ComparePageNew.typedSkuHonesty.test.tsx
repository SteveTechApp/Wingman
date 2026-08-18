import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

describe("compare page typed-SKU honesty render", () => {
  it("fails closed for a genuinely unknown typed SKU and offers evidence lookup", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Kramer&sku=ZZZ-NOT-A-REAL-SKU-999",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");
    const competitor = within(cards).getByLabelText("Competitor product card");

    expect(competitor.textContent).toContain("ZZZ-NOT-A-REAL-SKU-999");
    expect(competitor.textContent).toMatch(/Needs confirmation|Not verified locally/i);
    expect(within(cards).getByLabelText("No WyreStorm product match")).not.toBeNull();

    fireEvent.click(screen.getByText("Technical evidence & review"));

    expect(await screen.findByText("Live lookup required")).not.toBeNull();
    expect(screen.queryByText("Recognised locally")).toBeNull();
    expect(screen.getByText("Add evidence for this product")).not.toBeNull();
  });
});