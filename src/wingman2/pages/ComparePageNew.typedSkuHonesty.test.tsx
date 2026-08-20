import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  runCompetitorMatchMock.mockReset();
});

describe("compare page typed-SKU honesty render", () => {
  it("renders a current 1x2 splitter match for Atlona AT-HDDA-2", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/compare?brand=Atlona&sku=AT-HDDA-2"]}>
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");
    await waitFor(() => {
      expect(cards.textContent).toMatch(/EXP-SP-0102-(?:H2|8K)/);
    });
    expect(within(cards).queryByLabelText("No WyreStorm product match")).toBeNull();
  });

  it("recalculates an 8x8 matrix instead of applying the stored 8x12 decision", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/compare?brand=Atlona&sku=AT-HDR-H2H-88MA"]}>
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");
    await waitFor(() => {
      expect(cards.textContent).toMatch(/MX(?:V)?-0808/);
    });
    expect(cards.textContent).not.toContain("MX-0812-SCL");
  });

  it("matches a local 4x4 HDMI matrix to the same transport architecture", async () => {
    render(
      <MemoryRouter initialEntries={["/wingman/compare?brand=Atlona&sku=AT-HDR-H2H-44MA"]}>
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");
    await waitFor(() => {
      expect(cards.textContent).toContain("MX-0404-HDMI");
    });
    expect(cards.textContent).not.toContain("MX-0404-KIT");
    expect(await screen.findByRole("heading", { name: "Other technically plausible matrix options" })).not.toBeNull();
    const matrixOptions = screen.getByLabelText("Other technically plausible matrix options");
    expect(matrixOptions.textContent).toContain("MX-0404-SCL");
    expect(matrixOptions.textContent).not.toContain("MX-0804-EDC");
    expect(matrixOptions.textContent).not.toContain("MX-0808-SCL");
  });

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

  it("uses a promoted stored competitor profile as recognised local intelligence", async () => {
    runCompetitorMatchMock.mockResolvedValue({
      ok: true,
      competitor_lookup_mode: "stored-intelligence",
      competitor_product: {
        manufacturer: "Kramer",
        model: "PROMOTED-ENC-1",
        title: "Approved 1GbE encoder",
        category: "AV-over-IP",
        comparisonDomain: "AVOIP",
        comparisonUseCase: "DISTRIBUTION",
        transport: "AV-over-IP",
        role: "Encoder",
        subtype: "Vendor codec",
        summary: "Administrator-approved competitor intelligence.",
        resolvedUrl: "https://www.kramerav.com/example-approved",
        technologyProfile: {
          vendorTechnology: "Approved vendor platform",
          canonicalTransport: "AV-over-IP",
          networkClass: "1GbE",
          codecName: "Vendor codec",
        },
      },
      best_match: {
        sku: "NHD-500-TX",
        name: "NHD-500-TX",
        match_type: "DIRECT MATCH",
        confidence_score: 94,
        readiness: {
          status: "ready",
          summary: "Approved product evidence supports the match direction.",
          strengths: [
            "Canonical transport aligned.",
            "Device role aligned.",
          ],
          warnings: [],
          blockers: [],
          nextActions: [],
          reviewRequired: false,
        },
      },
      alternatives: [],
      resolved_competitor_url: "https://www.kramerav.com/example-approved",
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Kramer&sku=PROMOTED-ENC-1",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Approved competitor intelligence loaded"),
    ).not.toBeNull();

    const cards = await screen.findByLabelText("Compare product cards");
    expect(cards.textContent).toContain("NHD-500-TX");
    expect(cards.textContent).toMatch(/Suitable WyreStorm match|Match/i);

    fireEvent.click(screen.getByText("Technical evidence & review"));

    expect(await screen.findByText("Recognised locally")).not.toBeNull();
    expect(screen.queryByText("Review before governance approval")).toBeNull();
    expect(screen.getByText("Governed match decision")).not.toBeNull();
    expect(screen.queryByText("Add evidence for this product")).toBeNull();
  });
});
