import { describe, expect, it } from "vitest";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";

describe("shared governed WyreStorm Compare profile", () => {
  it("uses the same verified NHD-120-RX data as Product Pitch", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "NHD-120-RX",
      name: "NetworkHD 120 Series 4K30 4:2:0 Decoder",
      family: "NetworkHD 100",
      category: "AV-over-IP",
      description: "Decoder",
    } as never);

    expect(profile.sourceTier).toBe("verified-profile");
    expect(profile.readiness).toBe("compare-ready");
    expect(profile.domain).toBe("AVOIP");
    expect(profile.role).toBe("decoder");
    expect(profile.maxResolution).toContain("3840x2160p");
    expect(profile.specs?.hdmiOutputs).toBe(1);
    expect(profile.specs?.networkSpeed).toBe("1GbE");
  });
});
