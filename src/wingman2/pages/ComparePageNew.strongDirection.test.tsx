import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

vi.mock("../lib/competitorCompareDecision", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/competitorCompareDecision")
  >("../lib/competitorCompareDecision");

  return {
    ...actual,
    classifyCompetitorCompareDecision: (
      input: import("../lib/competitorCompareDecision").CompareDecisionInput,
    ) => {
      const result = actual.classifyCompetitorCompareDecision(input);
      const sku = String(input?.wyrestorm?.sku ?? "").toUpperCase();

      if (sku !== "NHD-500-TX") return result;

      return {
        ...result,
        outcome: "GOOD MATCH" as const,
        confidence: 96,
        matches: [
          "Technology class matches.",
          "Product role matches.",
          "1Gb AV-over-IP endpoint with matching direction.",
        ],
        verify: [],
        gaps: [],
        blockers: [],
        systemRequirements: [],
        summary:
          "NHD-500-TX is a clean technical match for this AV-over-IP endpoint.",
        requirements: [
          { name: "1G AV-over-IP endpoint", essential: true, met: true },
        ],
        solutionType: "direct-replacement",
        evidenceCompleteness: 1,
        nextAction: "Use the matched direction in the project or proposal.",
      };
    },
  };
});

describe("compare page strong-direction render", () => {
  it("renders the clean engine result as Match on the minimum-card surface", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Crestron&sku=DMNVX-350&context=1G+AV-over-IP+transceiver",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");
    const status = within(cards).getByRole("list", {
      name: "Comparison result status",
    });
    const wyrestorm = within(cards).getByLabelText("WyreStorm product card");

    expect(within(status).getByText("Match")).not.toBeNull();
    expect(
      within(cards).getByRole("heading", { name: "Suitable WyreStorm match" }),
    ).not.toBeNull();
    expect(wyrestorm.textContent).toContain("NHD-500-TX");
  });
});