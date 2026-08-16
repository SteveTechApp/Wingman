import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import governedProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import { specCriticalFieldLabel } from "../lib/governedConfirmationBacklog";
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

const governedProfilesList = (governedProfiles as {
  profiles: Array<{ sku: string; status: string; verifiedBy?: string }>;
}).profiles;

const governedSkus = new Set(
  governedProfilesList
    .filter((profile) => profile.status.startsWith("verified"))
    .map((profile) => normaliseSkuKey(profile.sku)),
);

// "Verified" requires a human: only profiles with status verified AND a
// recorded verifiedBy render the verified tier (the 2026-08-16 review pass
// confirmed a subset of the governed profiles).
const humanVerifiedSkus = new Set(
  governedProfilesList
    .filter((profile) => profile.status === "verified" && Boolean(profile.verifiedBy?.trim()))
    .map((profile) => normaliseSkuKey(profile.sku)),
);

// The trail's field pill must equal exactly the reviewer's confirmed set, so
// the expected pill is derived per SKU from the same governed data the page
// renders with (review passes confirm whatever fields were readable - e.g. a
// wireless dongle may carry only power).
const confirmedFieldsBySku = new Map(
  governedProfilesList
    .filter((profile) => profile.status === "verified" && Boolean(profile.verifiedBy?.trim()))
    .map((profile) => [
      normaliseSkuKey(profile.sku),
      ((profile as { confirmedFields?: string[] }).confirmedFields ?? []) as string[],
    ]),
);

describe("catalog browser governed-coverage render", () => {
  it("shows the honest governed tier on every card backed by a governed profile", async () => {
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

    let governedCards = 0;
    for (const card of cards) {
      const sku = normaliseSkuKey(
        card.querySelector(".wm-catalog-product-sku")?.textContent ?? "",
      );
      const badge = card.querySelector(".compare-native-governance-badge");
      expect(badge, `card ${sku} carries a governance badge`).not.toBeNull();

      if (governedSkus.has(sku)) {
        // Governed-coverage guarantee: a card backed by a governed profile must
        // never fall back to the unresolved badge, and must never claim the
        // verified tier unless a human confirmed it (verifiedBy recorded).
        if (humanVerifiedSkus.has(sku)) {
          expect(badge?.textContent, `${sku} badge`).toContain("Verified governed data");
          expect(badge?.className, `${sku} badge class`).toContain("is-verified");
        } else {
          expect(badge?.textContent, `${sku} badge`).toContain("Official data - review required");
          expect(badge?.className, `${sku} badge class`).toContain("is-warn");
          expect(badge?.className, `${sku} badge class`).not.toContain("is-verified");
        }
        governedCards += 1;
      } else {
        expect(badge?.textContent, `${sku} badge`).toContain("Technical data not resolved");
        expect(badge?.className, `${sku} badge class`).not.toContain("is-verified");
      }
    }

    // Sanity: the grid actually surfaces governed leads, so the guarantee is
    // not vacuous.
    expect(governedCards).toBeGreaterThan(0);
  });

  it("shows the reviewer trail only on human-verified cards", async () => {
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
    let verifiedCards = 0;
    for (const card of cards) {
      const sku = normaliseSkuKey(card.querySelector(".wm-catalog-product-sku")?.textContent ?? "");
      const badge = card.querySelector(".compare-native-governance-badge");
      const trail = card.querySelector(".wm-governed-reviewer-trail");
      if (badge?.className.includes("is-verified")) {
        verifiedCards += 1;
        // The same reviewer trail as the dashboard and Product Pitch: who
        // confirmed, the exact confirmed field set, and the official source.
        expect(trail, `verified card ${sku} carries the reviewer trail`).not.toBeNull();
        expect(trail!.textContent).toContain("Confirmed by");
        const confirmedFields = confirmedFieldsBySku.get(sku) ?? [];
        if (confirmedFields.length > 0) {
          const expectedPill = confirmedFields
            .map((field) => specCriticalFieldLabel(field as "max-resolution" | "routed-io" | "power"))
            .join(" · ");
          expect(trail!.textContent, `verified card ${sku} field pill`).toContain(expectedPill);
        }
        const evidenceLink = trail!.querySelector("a");
        const evidenceHref = evidenceLink?.getAttribute("href") ?? "";
        // Official WyreStorm evidence pages may carry a locale prefix (e.g.
        // /global/product/...), so accept any live wyrestorm.com product page.
        expect(evidenceHref, `verified card ${sku} evidence link`).toContain("wyrestorm.com/");
        expect(evidenceHref, `verified card ${sku} evidence link`).toContain("/product/");
      } else {
        expect(trail, `unverified card ${sku} never claims a reviewer trail`).toBeNull();
      }
    }
    // The grid actually surfaces human-verified leads, so the guarantee is not
    // vacuous.
    expect(verifiedCards).toBeGreaterThan(0);
  });
});
