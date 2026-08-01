import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import index from "../../../public/product-intelligence-index.json";

const { getWingmanSession, getWingmanJson } = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
  getWingmanJson: vi.fn(),
}));

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

vi.mock("../api/wingmanApi", () => ({
  getWingmanSession,
  getWingmanJson,
  postWingmanJson: vi.fn(),
}));

import { CatalogBrowserPage } from "./CatalogBrowserPage";

describe("CatalogBrowserPage admin record editing", () => {
  beforeEach(() => {
    getWingmanSession.mockReset();
  });

  it("shows Edit record actions to a workspace administrator", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: {
        workspaceRole: "admin",
        permissions: { canManageWorkspace: true },
      },
    });

    render(
      <MemoryRouter initialEntries={["/wingman/products/catalog"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    expect((await screen.findAllByRole("button", { name: "Edit record" })).length).toBeGreaterThan(0);

    getWingmanJson.mockResolvedValue({ ok: true, records: [{ vendorType: "wyrestorm", brand: "WyreStorm", sku: "AMP-2120", status: "draft" }] });
    fireEvent.click((await screen.findAllByRole("button", { name: "Edit record" }))[0]);
    expect(await screen.findByRole("button", { name: "Allow product" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove product" })).toBeTruthy();
  });

  it("does not expose Edit record actions to a non-admin user", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: {
        workspaceRole: "sales",
        permissions: { canManageWorkspace: false },
      },
    });

    render(
      <MemoryRouter initialEntries={["/wingman/products/catalog"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    await screen.findByText(/\d+ products?/);
    expect(screen.queryByRole("button", { name: "Edit record" })).toBeNull();
  });
});
