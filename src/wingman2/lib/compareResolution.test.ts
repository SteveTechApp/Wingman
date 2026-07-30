import { describe, expect, it } from "vitest";
import { resolutionRank, chromaRank } from "./compareResolution";

describe("shared resolutionRank", () => {
  it("orders the tiers correctly", () => {
    expect(resolutionRank("8K60")).toBeGreaterThan(resolutionRank("4K120 4:4:4"));
    expect(resolutionRank("4K120 4:4:4")).toBeGreaterThan(resolutionRank("4K60 4:4:4"));
    expect(resolutionRank("4K60 4:4:4")).toBeGreaterThan(resolutionRank("4K60"));
    expect(resolutionRank("4K60")).toBeGreaterThan(resolutionRank("4K30"));
    expect(resolutionRank("4K30")).toBeGreaterThan(resolutionRank("1080p60"));
    expect(resolutionRank("1080p60")).toBeGreaterThan(resolutionRank("720p"));
    expect(resolutionRank("")).toBe(0);
  });

  it("reads the WxH @Hz notation the governed profiles use (the fragility that mis-blocked splitters)", () => {
    // These previously ranked as 0 or HD in the decision engine and hard-blocked
    // otherwise-valid 4K60 candidates.
    expect(resolutionRank("4096x2160p @60Hz 4:4:4")).toBeGreaterThanOrEqual(4);
    expect(resolutionRank("3840x2160p @60Hz 8bit 4:4:4")).toBeGreaterThanOrEqual(4);
    expect(resolutionRank("7680x4320p @60Hz")).toBe(7);
  });

  it("reads the HIGHEST tier from a multi-resolution list (does not get dragged down by a trailing 1080p)", () => {
    // The exact SP-0104-H2 case: 4K60 top line with a 1080p60 fallback listed.
    expect(resolutionRank("4096x2160p @60Hz 4:4:4 (24bit at 4K); 1080p60")).toBeGreaterThanOrEqual(4);
    expect(resolutionRank("3840x2160p @60Hz 4:4:4; 4096x2160p (DCI); 1080p60")).toBeGreaterThanOrEqual(4);
  });

  it("ranks chroma", () => {
    expect(chromaRank("4:4:4")).toBeGreaterThan(chromaRank("4:2:2"));
    expect(chromaRank("4:2:2")).toBeGreaterThan(chromaRank("4:2:0"));
    expect(chromaRank("4:2:0")).toBe(1);
    expect(chromaRank("unknown")).toBe(0);
  });
});
