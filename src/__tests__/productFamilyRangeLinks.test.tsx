import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadProductIntelligenceIndex } from "@/wingman2/lib/productIntelligenceIndexCache";
import { ProductFamilyPage } from "@/wingman2/pages/ProductFamilyPage";
import ProductPitchPage from "@/wingman2/pages/ProductPitchPage";

vi.mock("@/wingman2/lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn(),
}));

vi.mock("@/wingman2/data/productMedia", () => ({
  loadProductMediaIndex: vi.fn().mockResolvedValue(null),
  getProductMediaBySku: vi.fn().mockReturnValue(null),
}));

function mockIndex(skus: string[]) {
  vi.mocked(loadProductIntelligenceIndex).mockResolvedValue({
    products: skus.map((sku) => ({
      sku,
      name: `${sku} product`,
      family: "NetworkHD 100",
      category: "AV over IP",
      description: "Test product record.",
    })),
  });
}

describe("Product Families 'Pitch this range' + SKU card wiring", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(loadProductIntelligenceIndex).mockReset();
  });

  it("points 'Pitch this range' at the first index-present SKU and hides phantom SKU cards", async () => {
    // NetworkHD 100 (default family) lists NHD-110-TX first, but the catalogue
    // here only has NHD-120-TX and NHD-150-RX - the representative should skip
    // the absent lead and the phantom cards should not render.
    mockIndex(["NHD-120-TX", "NHD-150-RX"]);

    render(
      <MemoryRouter initialEntries={["/wingman/product-families/networkhd-100"]}>
        <Routes>
          <Route path="/wingman/product-families/:familyId" element={<ProductFamilyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const rangeLink = await screen.findByRole("link", { name: "Pitch this range" });

    await waitFor(() => {
      expect(rangeLink.getAttribute("href")).toContain("sku=NHD-120-TX");
    });
    expect(rangeLink.getAttribute("href")).toContain("q=NetworkHD");

    // Phantom SKUs (not in the catalogue) must not be clickable dead-ends.
    await waitFor(() => {
      expect(screen.queryByText("NHD-110-TX")).not.toBeInTheDocument();
    });
    expect(screen.getByText("NHD-120-TX")).toBeInTheDocument();
    expect(screen.getByText("NHD-150-RX")).toBeInTheDocument();
  });

  it("falls back to a range query link when no family SKU is in the catalogue", async () => {
    mockIndex(["SOME-OTHER-SKU"]);

    render(
      <MemoryRouter initialEntries={["/wingman/product-families/networkhd-100"]}>
        <Routes>
          <Route path="/wingman/product-families/:familyId" element={<ProductFamilyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const rangeLink = await screen.findByRole("link", { name: "Pitch this range" });

    await waitFor(() => {
      expect(rangeLink.getAttribute("href")).not.toContain("sku=");
    });
    expect(rangeLink.getAttribute("href")).toContain("q=NetworkHD");
    expect(
      screen.getByText(/No selectable catalogue SKUs for this family yet/i),
    ).toBeInTheDocument();
  });
});

describe("Product Positioning range/query handling", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.mocked(loadProductIntelligenceIndex).mockReset();
    mockIndex(["NHD-120-TX", "NHD-150-RX"]);
  });

  it("pre-fills the picker search from a ?q= range link instead of a blank search", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?q=NetworkHD 100"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    const search = await screen.findByRole("searchbox");
    expect(search).toHaveValue("NetworkHD 100");
  });

  it("recovers to the range-filtered picker when a range SKU is not in the catalogue", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=PHANTOM-LEAD&q=NetworkHD 100"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Find the right product workspace")).toBeInTheDocument();
    expect(screen.queryByText(/No product workspace found for/i)).not.toBeInTheDocument();
  });
});
