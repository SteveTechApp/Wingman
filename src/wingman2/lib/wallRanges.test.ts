import { describe, expect, it } from "vitest";
import { assessVideowallOptions, defaultWallRequirements } from "./videowallOptions";
import { wallOptionRange, wallOptionRangeKey, wallProductRanges, wallRangesInPlay } from "./wallRanges";

describe("wall product ranges", () => {
  it("names each NetworkHD design by its series", () => {
    expect(wallOptionRange("nhd150").label).toBe("100 series");
    expect(wallOptionRange("nhd500").label).toBe("500 series");
    expect(wallOptionRange("nhd600").label).toBe("600 series");
    // The 500 + multiview stage is still a 500-series source network.
    expect(wallOptionRange("nhd500-multiview").label).toBe("500 series");
    expect(wallOptionRange("mx-0404-scl").label).toBe("Local HDMI");
  });

  it("does not file a networked design under the local range", () => {
    for (const option of assessVideowallOptions(defaultWallRequirements)) {
      // An encoder or receiver from the 100/500/600 series is the AV network; a
      // NHD-0401-MV is an HDMI multiviewer in the rack, which is a local design.
      const networked = option.equipment.some((item) => /^NHD-[156]\d/.test(item.sku));
      if (networked) expect(wallOptionRangeKey(option.id)).not.toBe("local");
    }
  });

  it("keys only the ranges the field in front of the rep covers", () => {
    expect(wallRangesInPlay(["mx-0404-scl", "nhd600"]).map((range) => range.key)).toEqual(["local", "600"]);
    expect(wallRangesInPlay([])).toEqual([]);
  });

  it("says what a range is for rather than naming a part number", () => {
    for (const range of wallProductRanges) {
      expect(range.suits.length).toBeGreaterThan(40);
      expect(range.suits).not.toMatch(/NHD-|MX-/);
    }
  });
});
