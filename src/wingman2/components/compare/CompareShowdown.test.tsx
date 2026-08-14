import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompareShowdown } from "./CompareShowdown";

vi.mock("../../lib/compareSpecEngine", () => ({
  runSpecShowdown: vi.fn().mockResolvedValue({
    coverage: "found",
    verified: true,
    competitor: sheet("COMP-1", "Competitor"),
    matches: [match("WS-OPTION-1"), match("WS-OPTION-2")],
    rejected: [],
  }),
}));

function sheet(sku: string, brand = "WyreStorm") {
  return {
    sku,
    brand,
    name: sku,
    family: "Test family",
    summary: `${sku} summary`,
    specClass: "AVOIP",
    role: "transceiver",
    transport: "avoip-1g",
    transportLabel: "1Gb AV-over-IP",
    maxResolutionLabel: "4K60",
    resolutionRank: 4,
    chroma: "4:4:4",
    chromaRank: 4,
    hdr: true,
    bandwidthGbps: 1,
    hdmiIn: 1,
    hdmiOut: 1,
    routedIn: 1,
    routedOut: 1,
    usbVersion: "USB 2.0",
    usbRank: 2,
    audioOptions: [],
    controlOptions: [],
    distanceM: 100,
    poe: "PoE",
    citations: [],
  };
}

function match(sku: string) {
  return {
    sheet: sheet(sku),
    decision: "confirmed-equivalent",
    verdicts: [],
    comparableFields: 4,
    matchedFields: 4,
    exceededFields: 0,
    gapFields: 0,
    rating: 100,
    advantages: [],
    cautions: [],
  };
}

describe("CompareShowdown selected candidate synchronisation", () => {
  it("renders evidence for the candidate selected by the parent workflow", async () => {
    const { rerender } = render(
      <CompareShowdown
        brand="Competitor"
        competitorSku="COMP-1"
        active
        view="cards"
        selectedWyrestormSku="WS-OPTION-2"
      />,
    );

    expect(await screen.findByRole("article", { name: "WyreStorm WS-OPTION-2 product card" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "WyreStorm WS-OPTION-1 product card" })).toBeNull();

    rerender(
      <CompareShowdown
        brand="Competitor"
        competitorSku="COMP-1"
        active
        view="cards"
        selectedWyrestormSku="WS-OPTION-1"
      />,
    );

    expect(await screen.findByRole("article", { name: "WyreStorm WS-OPTION-1 product card" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "WyreStorm WS-OPTION-2 product card" })).toBeNull();
  });
});
