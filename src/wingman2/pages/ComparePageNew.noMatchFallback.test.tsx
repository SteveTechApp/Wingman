import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ComparePageNew from "./ComparePageNew";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

it("offers the evidence panel (URL / upload / manual entry) when no WyreStorm match is found", async () => {
  render(
    <MemoryRouter initialEntries={["/wingman/compare?brand=Blustream&sku=ZZZ-NOT-A-REAL-SKU-999&source=document-ingest-batch"]}>
      <ComparePageNew />
    </MemoryRouter>,
  );

  expect(await screen.findByText("No suitable WyreStorm match found from the current data")).not.toBeNull();
  expect(screen.getByText("Add evidence for this product")).not.toBeNull();
  expect(screen.getByRole("button", { name: /run live lookup/i })).not.toBeNull();
  expect(screen.getByText(/upload pdf/i)).not.toBeNull();
  expect(screen.getByText(/attach screenshot/i)).not.toBeNull();
});
