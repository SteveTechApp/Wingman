import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import {
  governedProfilesHumanVerifiedExcept,
  governedProfilesWithoutSkus,
} from "../lib/testHelpers/governedProfilesHarness";

// Simulate a governed-coverage regression at the data source: MX-0404-SCL (a
// real matrix option card, normally a governed profile) loses it. The real
// payload runs through the harness filter, so every other product's resolution
// stays real - only this one profile is gone - and every remaining profile is
// marked human-confirmed (`verifiedBy`) so the verified cards in this scenario
// honestly claim the verified tier while the stripped card falls back.
//
// Honest outcome (verified against the real resolver): with the governed
// profile removed, the resolver falls back to the product's official-page
// `technicalProfile` and the card must show the amber "Official data - review
// required" badge - NEVER the verified badge. (The literal "Technical data not
// resolved" copy is reserved for products with no profile AND no official data
// AND no text at all, which real catalogue products cannot reach - pinned at
// the resolver level in governedProfilesHarness.test.ts.)
//
// NOTE: the mock path must be `../../../data/...` from pages/ (project root);
// a shallower `../../data/...` resolves to the nonexistent src/data/... and
// vitest silently registers no mock (see governedProfilesHarness.ts).
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<{ sku: string }> } };
  return {
    default: governedProfilesHumanVerifiedExcept(
      governedProfilesWithoutSkus(actual.default, ["MX-0404-SCL"]),
      ["MX-0404-SCL"],
    ),
  };
});

// The real product-intelligence index drives the same real-catalogue candidate
// build the live app uses.
vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import ComparePageNew from "./ComparePageNew";

describe("compare page governed honesty render", () => {
  it("falls a profile-stripped candidate back to honest review-required data while verified cards stay verified", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Kramer&sku=VS-42H&context=4x2+4K+HDMI+matrix+switcher",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    // The 4x2 matrix comparison renders MX-0404-SCL as an option card; with
    // its profile gone, the rendered badges must tell the honest story.
    await screen.findByLabelText(/Main WyreStorm match:/i);

    await waitFor(
      () => {
        const badges = document.querySelectorAll(".compare-native-governance-badge");
        const fallback = Array.from(badges).find((badge) =>
          (badge.textContent ?? "").includes("review required"),
        );
        expect(fallback, "the profile-stripped card must show the honest fallback badge").toBeTruthy();
      },
      { timeout: 5000 },
    );

    const badges = document.querySelectorAll(".compare-native-governance-badge");
    expect(badges.length).toBeGreaterThan(1);

    // Honesty contract, two ways: the card whose governed profile disappeared
    // shows an honest amber review-required badge (never verified), and every
    // card that still has a profile never leaks that fallback - it either
    // stays verified or honestly downgrades to the missing tier when it
    // surfaces unresolved rows (the weakest-link badge contract).
    const fallbackSkus = new Set<string>();
    for (const badge of badges) {
      const text = badge.textContent ?? "";
      if (text.includes("review required")) {
        expect(text, "fallback badge copy").toBe("Official data - review required");
        expect(badge.className, "fallback badge class").not.toContain("is-verified");
        expect(badge.className, "fallback badge warn styling").toContain("is-warn");
        const card = badge.closest(
          ".compare-native-option-card, .compare-compact-result__product--wyrestorm",
        );
        fallbackSkus.add((card?.textContent ?? "").split("\n")[1]?.trim() || "unknown");
      } else {
        // The review-required fallback must never leak onto governed cards;
        // weakest-link cards may show the missing tier but never the
        // lost-profile fallback.
        expect(text, "governed badge copy").not.toContain("review required");
        expect(
          ["Verified governed data", "Technical data not resolved"].includes(text),
          "governed badge must be verified or the honest weakest-link tier",
        ).toBe(true);
        if (text === "Verified governed data") {
          expect(badge.className, "verified badge class").toContain("is-verified");
        } else {
          expect(badge.className, "missing badge class").toContain("is-warn");
        }
      }
    }

    // Exactly one product lost its profile in this scenario (it may
    // legitimately appear on more than one card surface, e.g. shortlist +
    // evidence panel).
    expect(fallbackSkus.size).toBe(1);
  });
});
