import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";

// The real product-intelligence index drives the same real-catalogue candidate
// build the live app uses, so the render matches what a rep sees after typing
// an unrecognized competitor SKU.
vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

describe("compare page typed-SKU honesty render", () => {
  it("shows 'Live lookup required' and unknown-input advisories for an unrecognized typed SKU", async () => {
    render(
      <MemoryRouter
        initialEntries={["/wingman/compare?brand=Kramer&sku=VS-42H"]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    // Wait for the main match (and with it the candidate set) before
    // asserting, so the full comparison has settled.
    await screen.findByLabelText(/Main WyreStorm match:/i);

    // The unrecognized SKU must not claim local recognition: the honest badge
    // tells the rep a live lookup is required instead.
    expect(screen.getByText("Live lookup required")).not.toBeNull();
    expect(screen.queryByText("Recognised locally")).toBeNull();

    // The engine must not fabricate competitor counts: with the competitor's
    // I/O unknown, the advisories say so plainly on the result cards.
    expect(
      screen.getAllByText(/Competitor inputs unknown; WyreStorm candidate provides/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Competitor outputs unknown; WyreStorm candidate provides/i).length,
    ).toBeGreaterThan(0);
  });
});
