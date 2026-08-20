import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import { loadProductIntelligenceIndex } from "../lib/productIntelligenceIndexCache";
import { governedProfilesWithoutSkus } from "../lib/testHelpers/governedProfilesHarness";
import { normaliseSkuKey } from "../lib/skuAliasResolver";
import { ProductPitchPage } from "./ProductPitchPage";

// The mocked profiles module (MX-0402-MST stripped) is the source of truth for
// the badge tier each selector row must show.
import governedProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";

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
  it("renders technical facts as separate, readable list items", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=MXV-0808-H2A-KIT&source=compare"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("tab", { name: "Technical Overview" }));

    const groups = document.querySelector(".wm-product-spec-groups");
    expect(groups).not.toBeNull();
    expect(groups?.querySelectorAll(".wm-product-spec-group").length).toBeGreaterThan(10);
    expect(groups?.querySelectorAll("dd > ul > li").length).toBeGreaterThan(10);
    expect(groups?.querySelector("dd > span")).toBeNull();

    const ioGroup = Array.from(groups?.querySelectorAll(".wm-product-spec-group") ?? [])
      .find((group) => group.querySelector("dt")?.textContent === "I/O summary");
    expect(ioGroup).toBeDefined();
    expect(ioGroup?.querySelectorAll("li").length).toBeGreaterThan(1);
    expect(ioGroup?.textContent).not.toMatch(/Toslink|IR RX|IR TX|RS-232|Web UI/i);

    const groupText = (label: string) => Array.from(groups?.querySelectorAll(".wm-product-spec-group") ?? [])
      .find((group) => group.querySelector("dt")?.textContent === label)?.textContent ?? "";
    expect(groupText("Audio")).toMatch(/Toslink.*S\/PDIF/i);
    expect(groupText("Control / integration")).toMatch(/IR RX/i);
    expect(groupText("Control / integration")).toMatch(/IR TX/i);
    expect(groupText("Control / integration")).toMatch(/RS-232/i);
    expect(groupText("Network")).toMatch(/LAN.*Web UI/i);
  });

  it("renders selector result rows where every governed badge reads the honest official tier", async () => {
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

    // Machine-transcribed governed profiles must render the official-structured
    // tier, while the profiles the 2026-08-16 review pass human-confirmed must
    // render the verified tier - never the other way round.
    const humanVerifiedSkus = new Set(
      (governedProfiles as { profiles: Array<{ sku: string; status: string; verifiedBy?: string }> }).profiles
        .filter((profile) => profile.status === "verified" && Boolean(profile.verifiedBy?.trim()))
        .map((profile) => normaliseSkuKey(profile.sku)),
    );
    const rows = document.querySelectorAll(".wm-product-pitch-result-card");
    rows.forEach((row) => {
      const sku = normaliseSkuKey(
        row.querySelector(".wm-product-pitch-result-sku")?.textContent ?? "",
      );
      const badge = row.querySelector(".compare-native-governance-badge");
      expect(badge, "every selector row carries a governance badge").not.toBeNull();
      if (humanVerifiedSkus.has(sku)) {
        expect(badge?.textContent, `${sku} badge`).toContain("Verified governed data");
        expect(badge?.className).toContain("is-verified");
      } else {
        expect(badge?.textContent, `${sku} badge`).toContain("Official data - review required");
        expect(badge?.className).toContain("is-warn");
        expect(badge?.className).not.toContain("is-verified");
      }
    });
  });

  it("shows the reviewer trail behind a human-verified workspace badge", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=MX-0808-SCL"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    // MX-0808-SCL was confirmed in the 2026-08-16 review pass, so the
    // workspace hero carries the same reviewer trail as the dashboard list:
    // who confirmed, which fields, and the official source.
    const trail = await screen.findByLabelText("Human confirmation trail");

    expect(trail.textContent).toContain("Confirmed by Steve · 2026-08-16");
    expect(trail.textContent).toContain("Max resolution · Routed I/O · Power");
    const evidenceLink = within(trail).getByRole("link");
    expect(evidenceLink.getAttribute("href")).toBe("https://www.wyrestorm.com/product/mx-0808-scl/");
    expect(evidenceLink.getAttribute("target")).toBe("_blank");

    // The verified badge sits directly above the trail.
    const badge = screen.getByText("Verified governed data");
    expect(badge.className).toContain("is-verified");
  });

  it("renders the reviewer trail on a verified result row with its evidence link", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText("Search products");
    fireEvent.change(input, { target: { value: "MX-0808-SCL" } });

    await waitFor(
      () => {
        expect(document.querySelectorAll(".wm-product-pitch-result-card").length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const row = Array.from(document.querySelectorAll(".wm-product-pitch-result-card")).find((candidate) =>
      candidate.querySelector(".wm-product-pitch-result-sku")?.textContent?.includes("MX-0808-SCL"),
    );
    expect(row).toBeDefined();

    // The row is a non-interactive container (not a button), so the trail's
    // evidence link can live inside it; the product name is the open link.
    expect(row!.tagName.toLowerCase()).toBe("div");
    expect(row!.querySelector("button")).toBeNull();
    const openLink = row!.querySelector("a.wm-product-pitch-result-name");
    expect(openLink?.getAttribute("href")).toContain("sku=MX-0808-SCL");

    // The same reviewer trail as the workspace hero: who, which fields, source.
    const trail = row!.querySelector(".wm-governed-reviewer-trail");
    expect(trail).not.toBeNull();
    expect(trail!.textContent).toContain("Confirmed by Steve · 2026-08-16");
    expect(trail!.textContent).toContain("Max resolution · Routed I/O · Power");
    const evidenceLink = trail!.querySelector("a");
    expect(evidenceLink?.getAttribute("href")).toBe("https://www.wyrestorm.com/product/mx-0808-scl/");
  });

  it("renders the product workspace header badge at the honest official tier", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=HALO-30"]}>
        <ProductPitchPage />
      </MemoryRouter>,
    );

    // HALO-30 has a governed profile that no reviewer has confirmed yet
    // (verified-with-warning, no verifiedBy), so its workspace hero must
    // render the official-structured tier - never the verified badge.
    const badge = await screen.findByText("Official data - review required");
    expect(badge.className).toContain("is-warn");
    expect(badge.className).not.toContain("is-verified");
    // The workspace hero carries the SKU whose profile backs the badge.
    const hero = screen.getAllByRole("heading", { name: "HALO-30" })[0];
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
