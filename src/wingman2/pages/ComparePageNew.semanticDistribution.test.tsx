import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import fixture from "../lib/__fixtures__/productIntelligenceIndexSample.json";

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );

  return {
    ...actual,
    fetchApprovedCompetitorDecisions: vi
      .fn()
      .mockResolvedValue({ ok: true, decisions: [] }),
    runCompetitorMatch: vi.fn(),
  };
});

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(fixture),
}));

import ComparePageNew from "./ComparePageNew";

describe("semantic Compare distribution render", () => {
  it("renders a real 1x4 WyreStorm distribution direction for Atlona AT-HDDA-4", async () => {
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

      const wyrestorm = within(cards).getByLabelText("WyreStorm product card");
      expect(wyrestorm.textContent).toMatch(/SP-0104-H2/i);
    });

    expect(cards.textContent).toContain(
      "One source to mirrored display outputs",
    );
  });
});
