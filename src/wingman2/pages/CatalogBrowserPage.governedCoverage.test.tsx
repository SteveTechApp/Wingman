import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import governedProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import { CatalogBrowserPage } from "./CatalogBrowserPage";

// The real product-intelligence index drives the same catalogue build and
// governed-tier resolution the live app uses.
vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

vi.mock("../api/wingmanApi", () => ({
  getWingmanSession: vi.fn().mockResolvedValue({
    ok: true,
    session: { workspaceRole: "sales", permissions: { canManageWorkspace: false } },
  }),
  getWingmanJson: vi.fn(),
  postWingmanJson: vi.fn(),
}));

const governedSkus = new Set(
  (governedProfiles as { profiles: Array<{ sku: string; status: string }> }).profiles
    .filter((profile) => profile.status.startsWith("verified"))
    .map((profile) => normaliseSkuKey(profile.sku)),
);

describe("catalog browser governed-coverage render", () => {
  it("shows a verified badge on every card for a governed profile", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/catalog-browser"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(document.querySelectorAll(".wm-catalog-product-card").length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const cards = document.querySelectorAll(".wm-catalog-product-card");
    expect(cards.length).toBeGreaterThan(0);

    let verifiedCards = 0;
    for (const card of cards) {
      const sku = normaliseSkuKey(
        card.querySelector(".wm-catalog-product-sku")?.textContent ?? "",
      );
      const badge = card.querySelector(".compare-native-governance-badge");
      expect(badge, `card ${sku} carries a governance badge`).not.toBeNull();

      if (governedSkus.has(sku)) {
        // Governed-coverage guarantee: a card backed by a verified governed
        // profile must never fall back to the unresolved or review-required
        // badge. Unprofiled accessories/cables honestly show the fallback.
        expect(badge?.textContent, `${sku} badge`).toContain("Verified governed data");
        expect(badge?.className, `${sku} badge class`).toContain("is-verified");
        verifiedCards += 1;
      } else {
        expect(badge?.textContent, `${sku} badge`).toContain("Technical data not resolved");
        expect(badge?.className, `${sku} badge class`).not.toContain("is-verified");
      }
    }

    // Sanity: the grid actually surfaces governed leads, so the guarantee is
    // not vacuous.
    expect(verifiedCards).toBeGreaterThan(0);
  });
});
