import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { runSpecShowdown, type FieldProvenance, type FieldVerdict, type ShowdownMatch, type SpecClass, type SpecSheet } from "../../lib/compareSpecEngine";
import { buildOnePagerHtml, CompareShowdown } from "./CompareShowdown";

vi.mock("../../lib/compareSpecEngine", () => ({
  runSpecShowdown: vi.fn().mockResolvedValue({
    coverage: "found",
    verified: true,
    competitor: sheet("COMP-1", "Competitor"),
    matches: [match("WS-OPTION-1"), match("WS-OPTION-2")],
    rejected: [],
  }),
}));

function sheet(sku: string, brand = "WyreStorm"): SpecSheet {
  return {
    sku,
    brand,
    name: sku,
    family: "Test family",
    summary: `${sku} summary`,
    specClass: "AVOIP" as SpecClass,
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

function match(sku: string): ShowdownMatch {
  return {
    sheet: sheet(sku),
    decision: "confirmed-equivalent",
    verdicts: [] as FieldVerdict[],
    comparableFields: 4,
    matchedFields: 4,
    exceededFields: 0,
    gapFields: 0,
    rating: 100,
    advantages: [],
    cautions: [],
    provenance: "official" as FieldProvenance,
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

  it("explains each spec row in plain language on the Side-by-side cards", async () => {
    vi.mocked(runSpecShowdown).mockResolvedValueOnce({
      coverage: "found",
      verified: true,
      competitor: sheet("COMP-1", "Competitor"),
      matches: [
        {
          sheet: sheet("WS-OPTION-1"),
          decision: "closest-technical-match",
          verdicts: [
            { field: "transport", label: "Transport / architecture", competitorValue: "Wireless", wyrestormValue: "HDBaseT", verdict: "gap", competitorProvenance: "official", wyrestormProvenance: "official", provenance: "official" },
            { field: "resolution", label: "Max resolution", competitorValue: "4K60", wyrestormValue: "4K60", verdict: "match", competitorProvenance: "official", wyrestormProvenance: "official", provenance: "official" },
            { field: "chroma", label: "Chroma", competitorValue: "4:4:4", wyrestormValue: "4:2:0", verdict: "gap", competitorProvenance: "official", wyrestormProvenance: "official", provenance: "official" },
          ],
          comparableFields: 3,
          matchedFields: 1,
          exceededFields: 0,
          gapFields: 2,
          rating: 33,
          advantages: [],
          cautions: [],
          provenance: "official",
        },
      ],
      rejected: [],
    });

    render(
      <CompareShowdown
        brand="Competitor"
        competitorSku="COMP-1"
        active
        view="cards"
        selectedWyrestormSku="WS-OPTION-1"
      />,
    );

    const wyrestormCard = await screen.findByRole("article", { name: "WyreStorm WS-OPTION-1 product card" });
    const competitorCard = screen.getByRole("article", { name: "Competitor COMP-1 product card" });

    // Every aligned stat row carries a plain-language hint (what the field
    // means) and a matters note (whether the difference matters) on BOTH cards,
    // so the pair reads as one verdict rather than two opaque stat dumps.
    for (const card of [wyrestormCard, competitorCard]) {
      expect(card.querySelectorAll(".wm-battle-card__stat-hint").length).toBeGreaterThan(0);
      expect(card.querySelectorAll(".wm-battle-card__stat-matters").length).toBeGreaterThan(0);
      expect(card.textContent).toMatch(/how the product moves the signal/i);
      expect(card.textContent).toMatch(/the same on both sides/i);
      expect(card.textContent).toMatch(/they differ/i);
    }
  });

  it("carries the Compare verdict's explicit confidence tier in the head-to-head header", async () => {
    render(
      <CompareShowdown
        brand="Competitor"
        competitorSku="COMP-1"
        active
        view="cards"
        selectedWyrestormSku="WS-OPTION-1"
        verdictTier={{ label: "Plausible — confirm", tone: "confirm" }}
      />,
    );

    const header = (await screen.findByRole("article", { name: "WyreStorm WS-OPTION-1 product card" }))
      .closest(".wm-showdown")
      ?.querySelector(".wm-showdown__header");
    expect(header).not.toBeNull();
    expect(header?.querySelector(".compare-confidence-tier")?.textContent).toContain("Plausible — confirm");
    expect(header?.querySelector(".compare-confidence-tier")?.className).toContain(
      "compare-confidence-tier--confirm",
    );
    // The confirm tier carries the "!" glyph so the level reads without colour.
    expect(header?.querySelector(".compare-confidence-tier__glyph")?.textContent).toBe("!");
  });

  it("renders without the tier chip when no verdict tier is supplied", async () => {
    render(
      <CompareShowdown
        brand="Competitor"
        competitorSku="COMP-1"
        active
        view="cards"
        selectedWyrestormSku="WS-OPTION-1"
      />,
    );

    await screen.findByRole("article", { name: "WyreStorm WS-OPTION-1 product card" });
    expect(document.querySelector(".wm-showdown__header .compare-confidence-tier")).toBeNull();
  });

  it("carries the verdict tier (with its colour-blind-safe glyph) into the printed one-pager", () => {
    const html = buildOnePagerHtml(sheet("COMP-1", "Competitor"), match("WS-OPTION-1"), {
      label: "Plausible — confirm",
      tone: "confirm",
    });
    // The tier pill sits beside the decision pill with the same label + glyph
    // the on-screen chip shows, and a print-safe tone class (coloured border
    // + text, never colour-only since the label and glyph are text).
    expect(html).toContain("! Plausible — confirm");
    expect(html).toContain("tier--confirm");
    expect(html).toContain("Confirmed equivalent");
  });

  it("omits the tier pill from the one-pager when no tier is supplied", () => {
    const html = buildOnePagerHtml(sheet("COMP-1", "Competitor"), match("WS-OPTION-1"));
    // The tier pill markup (a decision pill carrying the tier class) only
    // renders when a tier is supplied; the CSS tone rules always exist.
    expect(html).not.toContain('class="decision tier');
  });
});
