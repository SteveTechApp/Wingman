import { describe, expect, it } from "vitest";
import {
  isRx3ReceiverPairConfirmed,
  recommendationCandidateAllowed,
  shouldShowRecommendationAlternatives,
} from "./recommendationSafety";

describe("recommendation safety", () => {
  it("does not treat RX3-100 as a generic extender", () => {
    expect(recommendationCandidateAllowed({ sku: "RX3-100" }, "extension", ["25m HDMI route"])).toBe(false);
  });

  it("allows RX3-100 only when the paired transmitter path is explicit", () => {
    expect(isRx3ReceiverPairConfirmed(["SW-120-TX3", "4K60 HDBaseT 3.0"])).toBe(true);
    expect(recommendationCandidateAllowed({ sku: "RX3-100" }, "extension", ["SW-120-TX3", "4K60 HDBaseT 3.0"])).toBe(true);
  });

  it("does not allow RX3-100 in an unrelated slot", () => {
    expect(recommendationCandidateAllowed({ sku: "RX3-100" }, "avoip-decoder", ["SW-120-TX3"])).toBe(false);
  });

  it("keeps alternatives opt-in", () => {
    expect(shouldShowRecommendationAlternatives(false)).toBe(false);
    expect(shouldShowRecommendationAlternatives(true)).toBe(true);
  });
});