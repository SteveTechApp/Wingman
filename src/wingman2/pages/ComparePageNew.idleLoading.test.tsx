import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { hydrate } = vi.hoisted(() => ({ hydrate: vi.fn().mockResolvedValue({ products: [] }) }));
vi.mock("../lib/productIntelligenceIndexCache", async () => ({
  ...await vi.importActual("../lib/productIntelligenceIndexCache"),
  loadProductIntelligenceDetailRecords: hydrate,
}));
import ComparePageNew from "./ComparePageNew";

beforeEach(() => hydrate.mockClear());

describe("Compare catalogue delivery", () => {
  it("does not hydrate every product when opening an empty comparison", () => {
    render(<MemoryRouter initialEntries={["/wingman/compare"]}><ComparePageNew /></MemoryRouter>);
    expect(hydrate).not.toHaveBeenCalled();
  });

  it("hydrates complete technical evidence for a direct comparison link", async () => {
    render(<MemoryRouter initialEntries={["/wingman/compare?brand=Atlona&sku=AT-HDDA-2"]}><ComparePageNew /></MemoryRouter>);
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
  });
});
