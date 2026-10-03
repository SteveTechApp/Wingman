import { describe, expect, it } from "vitest";

import { findKnownWyrestormCompareProfile, hydrateWyrestormCompareProfile } from "./knownWyrestormCompareProfiles";

describe("known WyreStorm compare profiles", () => {
  it("keeps MXV-0404-H2A-KIT as a fixed HDBaseT matrix and not an NDI product", () => {
    const profile = findKnownWyrestormCompareProfile("MXV-0404-H2A-KIT");
    const hydrated = hydrateWyrestormCompareProfile({ sku: "MXV-0404-H2A-KIT" });

    expect(profile).toBeDefined();
    expect(profile?.routedInputCount).toBe(4);
    expect(profile?.routedOutputCount).toBe(4);
    expect(profile?.routedOutputTypes).toEqual(["HDBaseT"]);
    expect(profile?.technologyFamily).toMatch(/HDBaseT Matrix Kit/i);
    expect(JSON.stringify(profile)).not.toMatch(/\bNDI\b/i);
    expect(hydrated.outputTransport).toBe("HDBaseT");
  });

  it("distinguishes routed HDBaseT zones from mirrored HDMI outputs on MXV-0404-H2A-KIT-V2", () => {
    const profile = findKnownWyrestormCompareProfile("MXV-0404-H2A-KIT-V2");

    expect(profile).toBeDefined();
    expect(profile?.routedOutputCount).toBe(4);
    expect(profile?.routedOutputTypes).toEqual(["HDBaseT"]);
    expect(profile?.mirroredOutputCount).toBe(1);
    expect(profile?.mirroredOutputTypes).toEqual(["HDMI"]);
    expect(profile?.comparisonNotes.join(" ")).toMatch(/Mirrored HDMI is not a fifth routed matrix output/i);
  });
});
