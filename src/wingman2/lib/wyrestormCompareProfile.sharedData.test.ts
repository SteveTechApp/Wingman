import { describe, expect, it } from "vitest";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";

describe("shared governed WyreStorm Compare profile", () => {
  it("uses the same official-tier NHD-120-RX data as Product Pitch", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "NHD-120-RX",
      name: "NetworkHD 120 Series 4K30 4:2:0 Decoder",
      family: "NetworkHD 100",
      category: "AV-over-IP",
      description: "Decoder",
    } as never);

    // NHD-120-RX is human-verified (Steve confirmed its spec-critical fields
    // in the 2026-08 structured review pass), so it renders at the
    // verified-profile tier - never lower.
    expect(profile.sourceTier).toBe("verified-profile");
    expect(profile.readiness).toBe("compare-ready");
    expect(profile.domain).toBe("AVOIP");
    expect(profile.role).toBe("decoder");
    expect(profile.maxResolution).toContain("3840x2160p");
    expect(profile.specs?.hdmiOutputs).toBe(1);
    expect(profile.specs?.networkSpeed).toBe("1GbE");
  });

  it("retains structured official-page facts that are outside the reviewed governance subset", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "EX3-100-EARC",
      name: "100m HDBaseT 3.0 extender kit",
      family: "Extender / HDBaseT",
      category: "HDBaseT extender",
      description: "Uncompressed 18Gbps 4K60 4:4:4 with RS-232, IR and eARC at 100m",
      technicalProfile: {
        io: {
          ports: [
            { count: 1, connector: "HDMI", direction: "input", category: "video" },
            { count: 1, connector: "HDMI", direction: "output", category: "video" },
            { count: 1, connector: "RS-232", direction: "bidirectional", category: "control" },
            { count: 1, connector: "IR", direction: "bidirectional", category: "control" },
          ],
        },
      },
    } as never);

    expect(profile.sourceTier).toBe("verified-profile");
    expect(profile.specs).toMatchObject({
      hdmiInputs: 1,
      hdmiOutputs: 1,
      hdbasetVersion: "HDBaseT 3.0",
      hdbasetDistance: 100,
      rs232: true,
      ir: true,
      earc: true,
    });
  });

  it("recovers typed input and output ports from section-labelled specification evidence", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "TEST-PRESENTATION",
      name: "4-input presentation switcher",
      family: "Presentation / Room Core",
      category: "Presentation switcher",
      role: "Presentation switcher",
      technicalProfile: {
        io: {
          // Simulates an upstream flattened record that lost every input and
          // incorrectly retained only one output family.
          ports: [{ count: 2, connector: "HDBaseT", direction: "output", category: "video" }],
        },
        evidence: {
          technicalLines: [
            "Inputs",
            "1x HDMI In: 19-pin Type A",
            "1x USB-C IN: DP Alt Mode",
            "1x DisplayPort In: DisplayPort 1.3",
            "1x VGA In: 15-pin VGA",
            "Outputs",
            "1x HDMI Out: 19-pin Type A",
            "1x HDBT Out: RJ45",
            "Video Encoding",
          ],
        },
      },
    } as never);

    expect(profile.inputCount).toBe(4);
    expect(profile.outputCount).toBe(2);
    expect(profile.specs).toMatchObject({
      hdmiInputs: 1,
      hdmiOutputs: 1,
      usbCPorts: 1,
      displayPortInputs: 1,
      vgaInputs: 1,
    });
  });
});
