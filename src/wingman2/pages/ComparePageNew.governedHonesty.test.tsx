import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

const ALLOWED_BADGES = [
  "Verified governed data",
  "Official data - review required",
  "Inferred data - review before use",
  "Technical data not resolved",
];

describe("compare page governed honesty render", () => {
  it("never emits a non-canonical governed-data tier in technical review", async () => {
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
    fireEvent.click(screen.getByText("Technical evidence & review"));

    const badges = Array.from(
      document.querySelectorAll(".compare-native-governance-badge"),
    );

    expect(badges.length).toBeGreaterThan(0);

    for (const badge of badges) {
      const text = (badge.textContent ?? "").trim();
      expect(ALLOWED_BADGES).toContain(text);

      if (text === "Verified governed data") {
        expect(badge.className).toContain("is-verified");
      } else {
        expect(badge.className).toContain("is-warn");
      }
    }
  });
});