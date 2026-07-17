import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockRejectedValue(new Error("network offline")),
}));

import { CatalogBrowserPage } from "./CatalogBrowserPage";

describe("CatalogBrowserPage fetch failure", () => {
  it("shows a distinct error state instead of a plain empty-results message", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/products/catalog"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Catalogue unavailable")).not.toBeNull();
    expect(
      await screen.findByText("The product catalogue could not be loaded. Check your connection and reload the page."),
    ).not.toBeNull();
    expect(screen.queryByText("No products match these filters. Reset filters or broaden the search.")).toBeNull();
  });
});
