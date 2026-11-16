import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-summary.json";
import { CatalogBrowserPage } from "./CatalogBrowserPage";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceSummary: vi.fn().mockResolvedValue(index),
}));

vi.mock("../api/wingmanApi", () => ({
  getWingmanSession: vi.fn().mockResolvedValue({
    ok: true,
    session: { workspaceRole: "sales", permissions: { canManageWorkspace: false } },
  }),
  getWingmanJson: vi.fn(),
  postWingmanJson: vi.fn(),
}));

describe("catalog browser compact cards", () => {
  it("keeps product cards focused on the product and the plain-language help link", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/wingman/catalog-browser"]}>
        <CatalogBrowserPage />
      </MemoryRouter>,
    );

    await waitFor(
      () => {
        expect(container.querySelectorAll(".wm-catalog-product-card").length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const cards = [...container.querySelectorAll(".wm-catalog-product-card")];
    expect(cards.length).toBeGreaterThan(0);

    const alphabetically = (labels: string[]) => [...labels].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }),
    );
    for (const group of container.querySelectorAll(".wm-catalog-facet-group")) {
      const labels = [...group.querySelectorAll(".wm-catalog-chip")].map((chip) => chip.textContent?.trim() ?? "");
      expect(labels).toEqual(alphabetically(labels));
    }
    const featureGroup = [...container.querySelectorAll(".wm-catalog-facet-group")]
      .find((group) => group.querySelector(".wm-catalog-facet-label")?.textContent === "Features & connections");
    const featureLabels = [...(featureGroup?.querySelectorAll(".wm-catalog-chip") ?? [])]
      .map((chip) => chip.textContent?.trim() ?? "");
    expect(featureLabels).toContain("KVM (support)");
    expect(featureLabels).toContain("1GbE");
    expect(featureLabels).toContain("USB 2.0");
    expect(featureLabels).toContain("USB 3.0");
    expect(featureLabels).toContain("HDMI 2.0");
    expect(featureLabels).toContain("HDBaseT 3.0");
    expect(featureLabels).not.toContain("USB");

    const toggleLabels = [...container.querySelectorAll(".wm-catalog-toggle-row .wm-catalog-chip")]
      .map((chip) => (chip.textContent ?? "").replace(/^\s*✓\s*/, "").trim());
    expect(toggleLabels).toEqual(alphabetically(toggleLabels));

    const washByGroup = new Map<string, string>();
    const washClasses = new Set<string>();
    for (const card of cards) {
      const group = card.getAttribute("data-catalog-group");
      const washClass = [...card.classList].find((className) => className.startsWith("wm-catalog-group-wash-"));
      expect(group).toBeTruthy();
      expect(washClass).toBeTruthy();
      const priorWash = washByGroup.get(group!);
      if (priorWash) expect(washClass).toBe(priorWash);
      washByGroup.set(group!, washClass!);
      washClasses.add(washClass!);

      expect(card.querySelector(".wm-catalog-product-sku")).not.toBeNull();
      expect(card.querySelector(".wm-catalog-product-name")).not.toBeNull();
      expect(card.querySelector(".wm-product-why-trigger")).not.toBeNull();
      expect(card.querySelector(".wm-catalog-product-summary")).toBeNull();
      expect(card.querySelector('[aria-label$=" governed spec evidence"]')).toBeNull();
      expect(card.querySelector(".compare-native-governance-badge")).toBeNull();
      expect(card.querySelector(".wm-catalog-badge-row")).toBeNull();
      expect(card.querySelector(".wm-catalog-reasons")).toBeNull();
      expect(card.querySelector(".wm-catalog-suppressed")).toBeNull();
      expect(card.querySelector(".wm-governed-reviewer-trail")).toBeNull();
    }
    expect(washClasses.size).toBeGreaterThan(1);
  });
});
