import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import index from "../../../public/product-intelligence-index.json";

const { getWingmanSession } = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
}));

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

vi.mock("../api/wingmanApi", () => ({
  getWingmanSession,
  getWingmanJson: vi.fn(),
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
