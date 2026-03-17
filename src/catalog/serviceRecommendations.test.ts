import { describe, expect, it } from "vitest";

import {
  getTierSkusForFamily,
  matchSolutionFamiliesForPrompt,
  normalizeSolutionRecommendationFamily,
  recommendSkusForTransport,
} from "./serviceRecommendations";

describe("serviceRecommendations", () => {
  it("normalizes architecture and catalog aliases onto app recommendation families", () => {
    expect(normalizeSolutionRecommendationFamily("Matrix Switching")).toBe("Matrix");
    expect(normalizeSolutionRecommendationFamily("Presentation and UC")).toBe("Apollo");
    expect(normalizeSolutionRecommendationFamily("NetworkHD")).toBe("AVoIP");
  });

  it("uses current catalog-backed tier recommendations instead of stale service SKUs", () => {
    expect(getTierSkusForFamily("AVoIP", "Bronze")).toEqual(
      expect.arrayContaining(["NHD-120-TX", "NHD-120-RX"]),
    );
    expect(getTierSkusForFamily("USB Extension", "Gold")).toContain("NHD-USB-TRX");
  });

  it("maps composite transports onto multiple starter families", () => {
    expect(recommendSkusForTransport("HDBaseT Matrix")).toEqual(
      expect.arrayContaining(["EX-100-H2", "MX-0808-H2A-MK2"]),
    );
  });

  it("matches prompt-led distributed systems onto the AVoIP starter profile", () => {
    const matches = matchSolutionFamiliesForPrompt(
      "Need a distributed encoder and decoder workflow with multicast control across multiple displays.",
      { limit: 1 },
    );

    expect(matches[0]?.family).toBe("AVoIP");
    expect(matches[0]?.skus).toEqual(
      expect.arrayContaining(["NHD-500-TX", "NHD-500-E-RX"]),
    );
  });
});
