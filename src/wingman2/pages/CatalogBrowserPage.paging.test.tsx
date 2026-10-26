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

import { expectResultsWindow, resultsWindow, turnResultsPage } from "../lib/testHelpers/resultsPager";
import { CatalogBrowserPage } from "./CatalogBrowserPage";

describe("CatalogBrowserPage paging reset", () => {
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
  it("returns to the first page on a filter change, and leaves the page alone while a record is edited", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/products/catalog"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    await screen.findAllByRole("button", { name: "Edit record" });
    // Four cards fit a page, so the pager is on screen and the arrow leads to a
    // second page the filter change has to undo.
    const { total } = resultsWindow();
    expect(total).toBeGreaterThan(8);

    turnResultsPage(5, 8, total);

    // Editing a record opens the JSON editor over the list, and the page behind
    // it is still the page the record came from: no filter moved.
    fireEvent.click(screen.getAllByRole("button", { name: "Edit record" })[0]);
    const editor = await screen.findByRole("dialog");
    expectResultsWindow(5, 8, total);
    fireEvent.click(within(editor).getByRole("button", { name: "Close" }));
    expectResultsWindow(5, 8, total);

    // A search is a filter, so it returns the list to its first page.
    fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "NHD" } });
    expect(resultsWindow().from).toBe(1);
  }, 60000);
});
