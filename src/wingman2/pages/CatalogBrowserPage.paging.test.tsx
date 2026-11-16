import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import index from "../../../public/product-intelligence-summary.json";

const { getWingmanSession, getWingmanJson } = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
  getWingmanJson: vi.fn(),
}));

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceSummary: vi.fn().mockResolvedValue(index),
}));

vi.mock("../api/wingmanApi", () => ({
  getWingmanSession,
  getWingmanJson,
  postWingmanJson: vi.fn(),
}));

import { CatalogBrowserPage } from "./CatalogBrowserPage";

describe("CatalogBrowserPage result list", () => {
  beforeEach(() => {
    getWingmanSession.mockReset();
    getWingmanJson.mockReset();
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: { workspaceRole: "admin", permissions: { canManageWorkspace: true } },
    });
    getWingmanJson.mockResolvedValue({ ok: true, records: [] });
  });

  // The catalogue summary is large, so this loads in a few seconds; give it a
  // proportionate budget rather than the default timeout.
  it("renders all matching products together without a results pager", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/wingman/catalog-browser"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    await screen.findAllByRole("button", { name: "Edit record" });
    const cardCount = () => container.querySelectorAll(".wm-catalog-product-card").length;
    const resultCount = () => Number(screen.getByText(/^\d+ products?$/).textContent?.match(/\d+/)?.[0] ?? 0);
    const expectAllMatchesRendered = () => expect(cardCount()).toBe(resultCount());

    expect(resultCount()).toBeGreaterThan(8);
    expectAllMatchesRendered();
    expect(screen.queryByRole("navigation", { name: "Results pages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next results" })).not.toBeInTheDocument();

    // Opening an editor does not remove the rest of the scrollable result list.
    fireEvent.click(screen.getAllByRole("button", { name: "Edit record" })[0]);
    const editor = await screen.findByRole("dialog");
    expectAllMatchesRendered();
    fireEvent.click(within(editor).getByRole("button", { name: "Close" }));
    expectAllMatchesRendered();

    fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "NHD-CTL-PRO-V2" } });
    expect(resultCount()).toBeLessThan(8);
    expectAllMatchesRendered();
  }, 60000);
});
