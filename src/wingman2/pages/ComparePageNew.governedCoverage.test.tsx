import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";

// The real product-intelligence index drives the same real-catalogue candidate
// build the live app uses, so the render matches what a rep sees after the
// governed coverage program reached 100%.
vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

describe("compare page governed-coverage render", () => {
  it("renders a full comparison where every match-card badge reads 'Verified governed data'", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Atlona&sku=AT-UHD-PRO3-88M&context=8x8+4K+HDMI+matrix",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    // The overview renders the main match card plus the shortlist option cards.
    // Wait for the main match (and with it the candidate set) before asserting
    // on the badges so the full comparison has settled.
    await screen.findByLabelText(/Main WyreStorm match:/i);

    const badges = document.querySelectorAll(".compare-native-governance-badge");
    expect(badges.length).toBeGreaterThan(1);

    // Governed-coverage guarantee: with 100% of lead SKUs verified, no match
    // card may fall back to unresolved or review-required data. Every badge
    // must be the green verified tier.
    badges.forEach((badge) => {
      expect(badge.textContent).toContain("Verified governed data");
      expect(badge.className).toContain("is-verified");
    });

    // The coverage strip must agree with the badges it wraps.
    expect(
      await screen.findByText(/100% of product profiles verified/),
    ).not.toBeNull();
    expect(screen.getByLabelText("Governed product data coverage")).not.toBeNull();
  });
});
