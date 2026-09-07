import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";

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
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import ComparePageNew from "./ComparePageNew";

describe("Atlona AT-HDDA-4 compare regression", () => {
  it("returns the correctly sized WyreStorm 1x4 HDMI distribution match", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Atlona&sku=AT-HDDA-4",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");

    await waitFor(() => {
      expect(
        within(cards).queryByLabelText("No WyreStorm product match"),
      ).toBeNull();
    });

    const wyrestorm = within(cards).getByLabelText("WyreStorm product card");
    expect(wyrestorm.textContent).toMatch(/SP-0104-H2|EXP-SP-0104-H2/);
    expect(cards.textContent).not.toMatch(/No suitable WyreStorm match/i);

    // This SKU is already in governed local competitor data, so the page must
    // not need web research just to find the obvious distribution equivalent.
    expect(runCompetitorMatchMock).not.toHaveBeenCalled();
  });
});
