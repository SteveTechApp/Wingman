import { describe, expect, it } from "vitest";

import { maxResolutionDrift, resolutionFamily } from "./review-governed-profile-drift.mjs";

function storeWithResolution(...maxResolutions) {
  return { technicalProfile: { video: { maxResolutions } } };
}

describe("governed profile resolution drift", () => {
  it.each([
    ["3840x2160p @60Hz", "4K60-3840"],
    ["3840x2160p at 60Hz, 4:4:4 8-bit", "4K60-3840"],
    ["Maximum USB-C video format: 3840x2160p at 30Hz", "4K30-3840"],
    ["1920x1080p @60Hz", "1080p60"],
    ["1920x1080p at 60Hz", "1080p60"],
  ])("normalizes %s as %s", (value, expected) => {
    expect(resolutionFamily(value)).toBe(expected);
  });

  it("does not report drift when canonical evidence uses the word 'at'", () => {
    expect(
      maxResolutionDrift(
        { sku: "APO-210-UC", maxResolution: "4K30 4:4:4" },
        storeWithResolution("Maximum USB-C video format: 3840x2160p at 30Hz, 8-bit 4:4:4"),
      ),
    ).toMatchObject({ status: "agree" });

    expect(
      maxResolutionDrift(
        { sku: "MX-0402-MST", maxResolution: "4K60 4:4:4" },
        storeWithResolution("Maximum standard 16:9 format: 3840x2160p at 60Hz, 4:4:4 8-bit"),
      ),
    ).toMatchObject({ status: "agree" });
  });
});
