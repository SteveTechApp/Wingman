import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";

const { runCompetitorMatchMock } = vi.hoisted(() => ({
  runCompetitorMatchMock: vi.fn(),
}));

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );

  return {
    ...actual,
    fetchApprovedCompetitorDecisions: vi
      .fn()
      .mockResolvedValue({ ok: true, decisions: [] }),
    runCompetitorMatch: runCompetitorMatchMock,
  };
});

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

import ComparePageNew from "./ComparePageNew";

it("keeps an honest no-match after automatic live research finds no safe WyreStorm candidate", async () => {
  runCompetitorMatchMock.mockResolvedValue({
    ok: true,
    competitor_lookup_mode: "live",
    competitor_product: {
      manufacturer: "Blustream",
      model: "ZZZ-NOT-A-REAL-SKU-999",
      title: "Unknown researched product",
      summary: "A product page was found but no safe WyreStorm coverage was established.",
      resolvedUrl: "https://www.blustream.co.uk/example",
    },
    best_match: null,
    alternatives: [],
    resolved_competitor_url: "https://www.blustream.co.uk/example",
  });

  render(
    <MemoryRouter
      initialEntries={[
        "/wingman/compare?brand=Blustream&sku=ZZZ-NOT-A-REAL-SKU-999&source=document-ingest-batch",
      ]}
    >
      <ComparePageNew />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(runCompetitorMatchMock).toHaveBeenCalled();
  });

  expect(
    await screen.findByText("Live research found no safe WyreStorm direction"),
  ).not.toBeNull();

  const cards = await screen.findByLabelText("Compare product cards");
  expect(within(cards).getByLabelText("No WyreStorm product match")).not.toBeNull();
  expect(cards.textContent).toMatch(/No suitable WyreStorm match/i);

  fireEvent.click(screen.getByText("Technical evidence & review"));

  expect(
    await screen.findByText("Live researched - review required"),
  ).not.toBeNull();
  expect(screen.getByText("Primary search criteria")).not.toBeNull();
  expect(screen.getByText("SKU / model: ZZZ-NOT-A-REAL-SKU-999")).not.toBeNull();
  expect(screen.getByText("Add evidence for this product")).not.toBeNull();
  expect(screen.getByRole("button", { name: /run live lookup/i })).not.toBeNull();
  expect(screen.getByText(/upload pdf/i)).not.toBeNull();
  expect(screen.getByText(/attach screenshot/i)).not.toBeNull();
});