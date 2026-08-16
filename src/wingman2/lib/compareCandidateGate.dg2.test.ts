import { describe, expect, it } from "vitest";
import { gateCompareCandidate } from "./compareCandidateGate";

const dg2 = {
  sku: "APO-DG2",
  title: "Apollo wireless casting dongle",
  role: "wireless casting dongle",
  category: "Wireless Presentation",
  tags: ["wireless", "casting", "dongle"],
};

describe("APO-DG2 Compare business rule", () => {
  it("allows APO-DG2 as the lead candidate for an explicit casting-dongle comparison", () => {
    const result = gateCompareCandidate(dg2, {
      competitorClass: "WIRELESS_PRESENTATION",
      competitorRole: "wireless casting dongle",
      applicationContext: "Customer expressly requires a casting dongle",
    });

    expect(result.allowed).toBe(true);
    expect(result.candidateClass).toBe("WIRELESS_PRESENTATION");
    expect(result.evidence).toContain(
      "APO-DG2 requires a compatible WyreStorm wireless presentation switcher or UC soundbar.",
    );
  });

  it("does not allow APO-DG2 to match an unrelated AV-over-IP competitor", () => {
    const result = gateCompareCandidate(dg2, {
      competitorClass: "AVOIP",
      competitorRole: "encoder",
    });

    expect(result.allowed).toBe(false);
  });
});