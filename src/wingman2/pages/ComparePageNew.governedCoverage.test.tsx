import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import governedProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import ComparePageNew from "./ComparePageNew";

// "Verified" requires a human: the 2026-08-16 review pass confirmed a subset of
// the governed profiles (status verified + verifiedBy recorded). Those cards
// must render the verified tier; the rest stay at the official-structured tier.
const governedProfilesList = (governedProfiles as {
  profiles: Array<{ sku: string; status: string; verifiedBy?: string }>;
}).profiles;

const humanVerifiedSkus = new Set(
  governedProfilesList
    .filter((profile) => profile.status === "verified" && Boolean(profile.verifiedBy?.trim()))
    .map((profile) => normaliseSkuKey(profile.sku)),
);

// The real product-intelligence index drives the same real-catalogue candidate
// build the live app uses, so the render matches what a rep sees.
vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

describe("compare page governed-coverage render", () => {
  it("renders a full comparison where every badge is the weakest link over its surfaced fields", async () => {
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

    // Honest weakest-link contract: the main card surfaces comparison rows
    // whose values are not resolved on either side (e.g. USB, other video I/O,
    // network class), so its badge must NOT claim a stronger tier even though
    // the profile exists - the card itself shows the gaps.
    const mainBadge = document.querySelector(
      ".compare-native-best-card .compare-native-governance-badge",
    );
    expect(mainBadge).not.toBeNull();
    expect(mainBadge?.textContent).toContain("Technical data not resolved");
    expect(mainBadge?.className).toContain("is-warn");

    // Option cards surface only resolved governed facts, so they honestly show
    // the governed tier: human-confirmed profiles render verified, machine-
    // transcribed profiles render the official-structured tier - never stronger.
    const optionBadges = Array.from(
      document.querySelectorAll(".compare-native-option-card .compare-native-governance-badge"),
    );
    expect(optionBadges.length).toBeGreaterThan(0);
    optionBadges.forEach((badge) => {
      const card = badge.closest(".compare-native-option-card");
      const sku = normaliseSkuKey(card?.querySelector("h3.wm-ui-title")?.textContent ?? "");
      if (humanVerifiedSkus.has(sku)) {
        expect(badge.textContent, `${sku} badge`).toContain("Verified governed data");
        expect(badge.className).toContain("is-verified");
      } else {
        expect(badge.textContent, `${sku} badge`).toContain("Official data - review required");
        expect(badge.className).toContain("is-warn");
        expect(badge.className).not.toContain("is-verified");
      }
    });

    // No badge anywhere on the page may overclaim: every governance badge must
    // be one of the four canonical tiers (nothing stronger than the data).
    const allBadges = document.querySelectorAll(".compare-native-governance-badge");
    expect(allBadges.length).toBeGreaterThan(1);
    allBadges.forEach((badge) => {
      const text = (badge.textContent ?? "").trim();
      expect(
        ["Verified governed data", "Official data - review required", "Inferred data - review before use", "Technical data not resolved"].includes(text),
      ).toBe(true);
    });

    // The coverage strip must agree with the badges it wraps: the same
    // human-verified count the page derives from the governed profiles (the
    // 2026-08-16 review pass confirmed a batch, so the percent is derived from
    // the live data rather than pinned).
    const verifiedPct = Math.round((humanVerifiedSkus.size / governedProfilesList.length) * 100);
    expect(
      await screen.findByText(new RegExp(`${verifiedPct}% of WyreStorm product data is human-checked`)),
    ).not.toBeNull();
    expect(screen.getByLabelText("Product data trust note")).not.toBeNull();
  });
});
