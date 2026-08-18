import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";

const { runCompetitorMatchMock } = vi.hoisted(() => ({
  runCompetitorMatchMock: vi.fn(),
}));

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );

  return {
    ...actual,
    fetchApprovedCompetitorDecisions: vi
      .fn()
      .mockResolvedValue({ ok: true, decisions: [] }),
    runCompetitorMatch: runCompetitorMatchMock,
  };
});

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import ComparePageNew from "./ComparePageNew";

describe("compare page typed-SKU honesty render", () => {
  it("researches a genuinely unknown SKU and surfaces a verify-only WyreStorm direction", async () => {
    runCompetitorMatchMock.mockResolvedValue({
      ok: true,
      competitor_lookup_mode: "live",
      competitor_product: {
        manufacturer: "Kramer",
        model: "ZZZ-NOT-A-REAL-SKU-999",
        title: "Researched 1GbE encoder",
        category: "AV-over-IP",
        comparisonDomain: "AVOIP",
        comparisonUseCase: "DISTRIBUTION",
        transport: "AV-over-IP",
        role: "Encoder",
        subtype: "Proprietary",
        summary: "Live source identifies a 1GbE AV-over-IP encoder.",
        resolvedUrl: "https://www.kramerav.com/example",
        technologyProfile: {
          vendorTechnology: "Vendor proprietary AVoIP",
          canonicalTransport: "AV-over-IP",
          networkClass: "1GbE",
          codecName: "Vendor proprietary codec",
        },
      },
      best_match: {
        sku: "NHD-500-TX",
        name: "NHD-500-TX",
        match_type: "CLOSE MATCH",
        confidence_score: 82,
        readiness: {
          status: "review",
          summary: "Architecture and source-side role align; codec implementation requires review.",
          strengths: [
            "1GbE AV-over-IP architecture aligns.",
            "Encoder / transmitter direction aligns.",
          ],
          warnings: ["Codec implementation is not identical."],
          nextActions: ["Review the manufacturer source before quotation."],
          reviewRequired: true,
        },
      },
      alternatives: [],
      resolved_competitor_url: "https://www.kramerav.com/example",
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Kramer&sku=ZZZ-NOT-A-REAL-SKU-999",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(runCompetitorMatchMock).toHaveBeenCalledWith({
        manufacturer: "Kramer",
        model: "ZZZ-NOT-A-REAL-SKU-999",
      });
    });

    expect(
      await screen.findByText("Live research found a WyreStorm direction"),
    ).not.toBeNull();

    const cards = await screen.findByLabelText("Compare product cards");
    expect(cards.textContent).toContain("NHD-500-TX");
    expect(within(cards).queryByLabelText("No WyreStorm product match")).toBeNull();
    expect(cards.textContent).toMatch(/Further checks|required|verify/i);

    fireEvent.click(screen.getByText("Technical evidence & review"));

    expect(
      await screen.findByText("Live researched - review required"),
    ).not.toBeNull();
    expect(screen.getByText("Review before governance approval")).not.toBeNull();
    expect(screen.getByText("Add evidence for this product")).not.toBeNull();
  });
});