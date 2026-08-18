import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

const ALLOWED_BADGES = new Set([
  "Verified governed data",
  "Official data - review required",
  "Inferred data - review before use",
  "Technical data not resolved",
]);

describe("compare page governed-coverage render", () => {
  it("keeps governance evidence behind the collapsed technical review", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Crestron&sku=DMNVX-350&context=1G+AV-over-IP+transceiver",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    await screen.findByLabelText("Compare product cards");

    const summary = screen.getByText("Technical evidence & review");
    const details = summary.closest("details") as HTMLDetailsElement | null;

    expect(details).not.toBeNull();
    expect(details?.open).toBe(false);

    fireEvent.click(summary);

    const badges = Array.from(
      document.querySelectorAll(".compare-native-governance-badge"),
    );

    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((badge) => {
      expect(ALLOWED_BADGES.has((badge.textContent ?? "").trim())).toBe(true);
    });
  });
});