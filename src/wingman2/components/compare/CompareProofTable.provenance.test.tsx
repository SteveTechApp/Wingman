import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ShowdownMatch, SpecSheet } from "../../lib/compareSpecEngine";
import { CompareProofTable } from "./CompareProofTable";

function sheet(sku: string, brand: string): SpecSheet {
  return {
    sku,
    brand,
    name: sku,
    family: "Test family",
    summary: `${sku} summary`,
    specClass: "MATRIX",
    role: "matrix",
    transport: "hdbaset",
    transportLabel: "HDBaseT",
    maxResolutionLabel: "4K60",
    resolutionRank: 4,
    chroma: "4:4:4",
    chromaRank: 4,
    hdr: true,
    bandwidthGbps: 18,
    hdmiIn: 8,
    hdmiOut: 8,
    routedIn: 8,
    routedOut: 8,
    usbVersion: "USB 2.0",
    usbRank: 2,
    audioOptions: [],
    controlOptions: [],
    distanceM: 70,
    poe: "PoE",
    citations: [],
  };
}

function match(): ShowdownMatch {
  return {
    sheet: sheet("WS-MX-8", "WyreStorm"),
    decision: "confirmed-equivalent",
    verdicts: [
      {
        field: "resolution",
        label: "Max resolution",
        competitorValue: "4K60",
        wyrestormValue: "4K60",
        verdict: "match",
        competitorProvenance: "official",
        wyrestormProvenance: "verified",
        provenance: "official",
      },
      {
        field: "usb",
        label: "USB",
        competitorValue: "Needs verification",
        wyrestormValue: "Needs verification",
        verdict: "unverified",
        competitorProvenance: "unverified",
        wyrestormProvenance: "unverified",
        provenance: "unverified",
      },
      {
        field: "transport",
        label: "Transport",
        competitorValue: "HDBaseT",
        wyrestormValue: "HDBaseT (read from marketing text)",
        verdict: "match",
        competitorProvenance: "verified",
        wyrestormProvenance: "inferred",
        provenance: "inferred",
      },
    ],
    comparableFields: 3,
    matchedFields: 2,
    exceededFields: 0,
    gapFields: 0,
    rating: 67,
    advantages: [],
    cautions: [],
    provenance: "unverified",
  };
}

describe("CompareProofTable per-field provenance", () => {
  it("links the WyreStorm verified tag to the reviewer's official evidence source", () => {
    const showdown = match();
    // The engine emits both the reviewer trail and the matching citation, so
    // the fixture mirrors that pair.
    showdown.sheet = {
      ...showdown.sheet,
      reviewerEvidence: {
        url: "https://www.wyrestorm.com/product/mx-0808-scl/",
        reviewer: "Steve",
        reviewedOn: "2026-08-16",
      },
      citations: [
        {
          label: "WyreStorm human-reviewed source",
          url: "https://www.wyrestorm.com/product/mx-0808-scl/",
          detail: "Reviewed 2026-08-16 · Steve",
        },
      ],
    };
    render(<CompareProofTable competitor={sheet("COMP-8", "Atlona")} match={showdown} />);

    // Only the WyreStorm resolution row is verified in this fixture, so
    // exactly one provenance tag becomes a link to the reviewer's source.
    const verifiedLinks = Array.from(document.querySelectorAll("a.wm-proof__provenance--verified"));
    expect(verifiedLinks.length).toBe(1);
    expect(verifiedLinks[0].getAttribute("href")).toBe("https://www.wyrestorm.com/product/mx-0808-scl/");
    expect(verifiedLinks[0].getAttribute("target")).toBe("_blank");
    expect(verifiedLinks[0].getAttribute("title")).toContain("Human-confirmed by Steve on 2026-08-16");
    expect((verifiedLinks[0].textContent ?? "").trim()).toBe("Verified");

    // The reviewer citation also lands in the evidence-sources list.
    const sources = screen.getByLabelText("Evidence sources");
    const reviewerLink = within(sources).getByRole("link", { name: "WyreStorm human-reviewed source" });
    expect(reviewerLink.getAttribute("href")).toBe("https://www.wyrestorm.com/product/mx-0808-scl/");
    expect(sources.textContent).toContain("Reviewed 2026-08-16 · Steve");
  });

  it("renders a per-side provenance tag on every row and the weakest-tier summary", () => {
    render(<CompareProofTable competitor={sheet("COMP-8", "Atlona")} match={match()} />);

    // Per-side tags: competitor column carries its own provenance, the
    // WyreStorm column carries its own, and both read honestly per field.
    // Scoped to the table so the legend's ladder chips do not count.
    const tags = Array.from(document.querySelectorAll(".wm-proof__table .wm-proof__provenance")).map(
      (tag) => (tag.textContent ?? "").trim(),
    );
    expect(tags).toEqual([
      "Official", // competitor resolution
      "Verified", // WyreStorm resolution
      "Unverified", // competitor USB
      "Unverified", // WyreStorm USB
      "Verified", // competitor transport
      "Inferred", // WyreStorm transport
    ]);

    // The weakest tier across every field (both sides) is summarized in the
    // header so a rep sees the overall honesty floor at a glance.
    expect(screen.getByText("Weakest data tier: Unverified")).not.toBeNull();

    // The legend explains the ladder.
    expect(screen.getByLabelText("Data provenance legend")).not.toBeNull();
    expect(screen.getByText("Verified = human-reviewed governed data · Official = structured source, review required · Inferred = read from text · Unverified = no value resolved.")).not.toBeNull();
  });
});
