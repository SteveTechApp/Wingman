import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ComparePageNew from "./ComparePageNew";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

it("offers evidence lookup when no safe WyreStorm match is found", async () => {
  render(
    <MemoryRouter
      initialEntries={[
        "/wingman/compare?brand=Blustream&sku=ZZZ-NOT-A-REAL-SKU-999&source=document-ingest-batch",
      ]}
    >
      <ComparePageNew />
    </MemoryRouter>,
  );

  const cards = await screen.findByLabelText("Compare product cards");
  expect(within(cards).getByLabelText("No WyreStorm product match")).not.toBeNull();
  expect(cards.textContent).toMatch(/No suitable WyreStorm match/i);

  fireEvent.click(screen.getByText("Technical evidence & review"));

  expect(await screen.findByText("Live lookup required")).not.toBeNull();
  expect(screen.getByText("Primary search criteria")).not.toBeNull();
  expect(screen.getByText("SKU / model: ZZZ-NOT-A-REAL-SKU-999")).not.toBeNull();
  expect(screen.getByText("Add evidence for this product")).not.toBeNull();
  expect(screen.getByRole("button", { name: /run live lookup/i })).not.toBeNull();
  expect(screen.getByText(/upload pdf/i)).not.toBeNull();
  expect(screen.getByText(/attach screenshot/i)).not.toBeNull();
});