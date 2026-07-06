import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ComparePageNew from "./ComparePageNew";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

it("opens a single-SKU Compare drill-down from document ingest query parameters", async () => {
  render(
    <MemoryRouter initialEntries={["/wingman/compare?brand=Blustream&sku=SP18CS&context=HDMI+splitter+%2F+distribution+amplifier+%7C+8-way+HDMI+splitter+with+smart+scaling&source=document-ingest-batch"]}>
      <ComparePageNew />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Competitor matched against")).not.toBeNull();
  expect(screen.getAllByText(/Blustream SP18CS/i).length).toBeGreaterThan(0);
  expect(screen.getByLabelText(/Main WyreStorm match: SP-0108-SCL/i)).not.toBeNull();
});
