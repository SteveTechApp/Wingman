import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { governedProfilesWithoutSkus } from "../lib/testHelpers/governedProfilesHarness";
import { ProductPitchPage } from "./ProductPitchPage";

// The real product-intelligence index drives the same hydration the live app
// uses (hydrateProductSpecWithTechnicalData), so the badge on every result row
// and workspace header reflects the governed data behind the card.
vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

// Simulate a coverage loss at the data source for MX-0402-MST (see the harness
// JSDoc for the mock-path depth rule): its governed profile disappears, so its
// card must honestly downgrade instead of claiming verified data. The one-shot
// index mock in the text-inferred test strips the official-page technicalProfile
// too, leaving only marketing text and catalogue evidence.
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<{ sku: string }> } };
  return { default: governedProfilesWithoutSkus(actual.default, ["MX-0402-MST"]) };
});

describe("product pitch governed-coverage render", () => {
  it("renders selector result rows where every badge reads 'Verified governed data'", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    // Drive a lead-SKU search so the selector surfaces governed products.
    const input = await screen.findByLabelText("Search products");
    fireEvent.change(input, { target: { value: "SW-6" } });

    await waitFor(
      () => {
        expect(document.querySelectorAll(".wm-product-pitch-result-card").length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const rows = document.querySelectorAll(".wm-product-pitch-result-card");
    rows.forEach((row) => {
      const badge = row.querySelector(".compare-native-governance-badge");
      expect(badge, "every selector row carries a governance badge").not.toBeNull();
      expect(badge?.textContent).toContain("Verified governed data");
      expect(badge?.className).toContain("is-verified");
    });
  });

  it("renders the product workspace header badge as verified", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=SW-620-TX-W"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    const badge = await screen.findByText("Verified governed data");
    expect(badge.className).toContain("is-verified");
    // The workspace hero carries the SKU whose profile backs the badge.
    const hero = screen.getAllByRole("heading", { name: "SW-620-TX-W" })[0];
    expect(hero).not.toBeNull();
  });

  it("honestly shows the review-required badge for an unprofiled accessory and never claims verified data", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=APO-COM-MIC"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    // APO-COM-MIC has no governed profile, so its card must not claim verified
    // data. With official-page technicalProfile remaining in the catalogue the
    // honest tier is official-structured (amber review badge); the literal
    // "Technical data not resolved" copy is pinned at the shared badge and
    // resolver level (GovernedDataBadge.test.tsx, governedProfilesHarness.test.ts).
    const badge = await screen.findByText("Official data - review required");
    expect(badge.className).toContain("is-warn");
    expect(badge.className).not.toContain("is-verified");
  });

  it("honestly shows the inferred-data badge in the selector when a governed profile is lost", async () => {
    // MX-0402-MST loses BOTH its governed profile (JSON mock above) and its
    // official-page technicalProfile (one-shot index mock below), so only
    // marketing text and catalogue evidence remain - the resolver must land on
    // text-inferred, one rung down from official-structured on the ladder.
    const indexWithoutProfile = {
      ...index,
      products: index.products.map((p) =>
        p.sku === "MX-0402-MST" ? { ...p, technicalProfile: undefined } : p,
      ),
    } as typeof index;
    vi.mocked(loadProductIntelligenceIndex).mockResolvedValueOnce(indexWithoutProfile);

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText("Search products");
    fireEvent.change(input, { target: { value: "MX-0402" } });

    // Wait for the MX-0402-MST row specifically: the selector also renders
    // "Recently viewed" / "Suggested from project" prelude cards with the same
    // result-card class (and those persist across tests), so waiting for any
    // card can pass before the debounced search results arrive.
    await waitFor(
      () => {
        expect(
          Array.from(document.querySelectorAll(".wm-product-pitch-result-card")).some((el) =>
            el.textContent?.includes("MX-0402-MST"),
          ),
        ).toBe(true);
      },
      { timeout: 5000 },
    );

    const row = Array.from(document.querySelectorAll(".wm-product-pitch-result-card")).find((el) =>
      el.textContent?.includes("MX-0402-MST"),
    );
    expect(row, "the profile-stripped matrix row is present in the selector results").toBeTruthy();
    const badge = row?.querySelector(".compare-native-governance-badge");
    expect(badge?.textContent).toContain("Inferred data - review before use");
    expect(badge?.className).toContain("is-warn");
    expect(badge?.className).not.toContain("is-verified");
  });
});
