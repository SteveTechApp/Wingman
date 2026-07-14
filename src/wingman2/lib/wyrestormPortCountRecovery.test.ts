import { describe, expect, it } from "vitest";
import { buildWyrestormCompareProfile } from "./wyrestormCompareProfile";

describe("NHD-500-TX exact physical and routed I/O", () => {
  it("keeps routed I/O separate from the local HDMI loop output", () => {
    const profile = buildWyrestormCompareProfile({
      sku: "NHD-500-TX",
      name: "NetworkHD 500 encoder",
      family: "NetworkHD 500",
      category: "AV-over-IP",
      role: "Encoder",
      description: "4K60 4:4:4 1GbE encoder",
    } as never);

    expect(profile.sourceTier).toBe("verified-profile");
    expect(profile.inputCount).toBe(1);
    expect(profile.outputCount).toBe(1);
    expect(profile.specs?.hdmiInputs).toBe(1);
    expect(profile.specs?.hdmiOutputs).toBe(1);
    expect(profile.specs?.hdmiLoopOutputs).toBe(1);
    expect(profile.specs?.usbHostPorts).toBe(1);
    expect(profile.specs?.usbDevicePorts).toBe(0);
    expect(profile.specs?.usbTotalPorts).toBe(1);
    expect(profile.specs?.networkPorts).toBe(2);
    expect(profile.specs?.controlPorts).toBe(3);
    expect(profile.specs?.networkSpeed).toBe("1GbE");
  });
});
